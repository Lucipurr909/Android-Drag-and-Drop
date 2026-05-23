import { AndroidProject, AndroidScreen, AndroidComponent, ComponentType, DatabaseTable } from '../types';

export interface GithubRepoInfo {
  owner: string;
  repo: string;
  path?: string;
  branch?: string;
}

/**
 * Parses various Github URL formats:
 * - https://github.com/owner/repo
 * - owner/repo
 * - https://github.com/owner/repo/tree/branch-name
 */
export function parseGithubUrl(inp: string): GithubRepoInfo | null {
  const clean = inp.trim().replace(/\/$/, "");
  if (!clean) return null;

  try {
    // Check if it's full url
    if (clean.startsWith("http://") || clean.startsWith("https://")) {
      const url = new URL(clean);
      if (url.hostname !== "github.com") return null;
      
      const parts = url.pathname.split("/").filter(Boolean); // ["owner", "repo", "tree", "main", ...]
      if (parts.length < 2) return null;

      const owner = parts[0];
      const repo = parts[1];
      
      let branch = "main";
      if (parts[2] === "tree" && parts[3]) {
        branch = parts[3];
      }

      return { owner, repo, branch };
    } else {
      // Expect owner/repo
      const parts = clean.split("/").filter(Boolean);
      if (parts.length >= 2) {
        return { owner: parts[0], repo: parts[1], branch: "main" };
      }
    }
  } catch (e) {
    console.error("Error parsing github url: ", e);
  }
  return null;
}

/**
 * Main function to fetch and reconstruct an AndroidProject from Github
 * It first searches for a project.json (AppForge project representation).
 * If that fails, it scans the repository's java/kotlin structures and parses it 
 * to intellectually bootstrap screen structures & state variables.
 */
export async function pullProjectFromGithub(
  info: GithubRepoInfo, 
  token?: string
): Promise<{ project: AndroidProject; isNativeReconstructed: boolean; sourceFilesParsed: string[] }> {
  
  const headers: HeadersInit = {
    "Accept": "application/vnd.github.v3+json"
  };
  
  if (token && token.trim()) {
    headers["Authorization"] = `token ${token.trim()}`;
  }

  const { owner, repo, branch = "main" } = info;
  
  // 1. Try to find an AppForge or direct Android design JSON file anywhere in root
  const rootApiUrl = `https://api.github.com/repos/${owner}/${repo}/contents?ref=${branch}`;
  
  let rootFiles: any[] = [];
  try {
    const res = await fetch(rootApiUrl, { headers });
    if (res.ok) {
      rootFiles = await res.json();
    } else if (res.status === 404) {
      // Try master if main failed
      if (branch === "main") {
        return pullProjectFromGithub({ ...info, branch: "master" }, token);
      }
      throw new Error(`Repository or branch "${branch}" not found.`);
    } else {
      throw new Error(`Github API returned status ${res.status}: ${res.statusText}`);
    }
  } catch (err: any) {
    throw new Error(err.message || "Failed to reach GitHub API. Check credentials or internet connection.");
  }

  // Look for project JSON files
  const projectJsonFile = rootFiles.find(f => 
    f.name === "appforge-project.json" || 
    f.name === "project.json" || 
    f.name === "android-project.json"
  );

  if (projectJsonFile) {
    try {
      const fileRes = await fetch(projectJsonFile.download_url, { headers });
      if (fileRes.ok) {
        const rawJson = await fileRes.json();
        // Validation check for AndroidProject fields
        if (rawJson && typeof rawJson === "object" && rawJson.appName && Array.isArray(rawJson.screens)) {
          return {
            project: rawJson as AndroidProject,
            isNativeReconstructed: false,
            sourceFilesParsed: [projectJsonFile.name]
          };
        }
      }
    } catch (e) {
      console.warn("Found project files but failed to parse/download: ", e);
    }
  }

  // 2. If no project json, let's look for kotlin files to intelligently reconstruct!
  // We will perform a search or recursively scan for code files.
  // To avoid hitting API rate limits or deep trees, we fetch GitHub's repository recursive tree:
  const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
  
  let treeNodes: any[] = [];
  try {
    const treeRes = await fetch(treeUrl, { headers });
    if (treeRes.ok) {
      const treeData = await treeRes.json();
      if (treeData && Array.isArray(treeData.tree)) {
        treeNodes = treeData.tree;
      }
    }
  } catch (e) {
    console.warn("Failed to fetch recursive tree, falling back to basic analysis: ", e);
  }

  // Find any appforge/android configuration in subfolders
  const nestedConfig = treeNodes.find(n => 
    n.path.endsWith("/appforge-project.json") || 
    n.path.endsWith("/android-project.json") ||
    n.path.endsWith("/project.json")
  );

  if (nestedConfig) {
    try {
      const directUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${nestedConfig.path}`;
      const resVal = await fetch(directUrl, { headers });
      if (resVal.ok) {
        const rawJson = await resVal.json();
        if (rawJson && typeof rawJson === "object" && rawJson.appName && Array.isArray(rawJson.screens)) {
          return {
            project: rawJson as AndroidProject,
            isNativeReconstructed: false,
            sourceFilesParsed: [nestedConfig.path]
          };
        }
      }
    } catch (e) {
      console.warn("Found nested project config but failed loading: ", e);
    }
  }

  // If no project descriptor, perform elegant jetpack compose files analysis & code extraction! Scoped to standard files
  const ktFiles = treeNodes.filter(n => n.type === "blob" && n.path.endsWith(".kt"));
  
  if (ktFiles.length === 0) {
    // Absolute fallback: Setup default empty sandbox named after the Repository
    return {
      project: {
        appName: repo.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
        packageName: `com.github.${owner.toLowerCase().replace(/[^a-z0-9]/g, "")}.${repo.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
        themeColor: "#6366f1",
        initialScreenId: "dashboard",
        screens: [
          {
            id: "dashboard",
            name: "Main App Screen",
            components: [
              {
                id: "title_comp",
                type: "text",
                properties: {
                  text: `${repo} App Workspace`,
                  style: "h1",
                  fontSize: 24,
                  margin: 16
                }
              },
              {
                id: "desc_comp",
                type: "text",
                properties: {
                  text: `An Android app codebase scanned from github.com/${owner}/${repo}. No explicit workspace configurations were identified, so a fresh visual design suite was prepared!`,
                  style: "body",
                  fontSize: 14,
                  margin: 12
                }
              },
              {
                id: "empty_info",
                type: "card",
                properties: {
                  text: "🔌 Jetpack Compose & SQLite Room Stack",
                  placeholder: "Add layouts, forms, buttons below. When done, tap Export ZIP to generate complete production source code.",
                  margin: 12
                }
              }
            ]
          }
        ],
        variables: []
      },
      isNativeReconstructed: true,
      sourceFilesParsed: []
    };
  }

  // We parse up to 5 significant Jetpack Compose / Screen Kotlin files to construct high fidelity screens
  const screensList: AndroidScreen[] = [];
  const globalVariables: any[] = [];
  const parsedFiles: string[] = [];
  const dbTables: DatabaseTable[] = [];

  // Limit processing to prevent hitting call boundaries
  const targetKtFiles = ktFiles
    .filter(f => 
      f.path.toLowerCase().includes("screen") || 
      f.path.toLowerCase().includes("view") || 
      f.path.toLowerCase().includes("activity") || 
      f.path.toLowerCase().includes("dao") || 
      f.path.toLowerCase().includes("entity")
    )
    .slice(0, 6);

  const finalFilesToFetch = targetKtFiles.length > 0 ? targetKtFiles : ktFiles.slice(0, 5);

  for (const file of finalFilesToFetch) {
    try {
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file.path}`;
      const codeRes = await fetch(rawUrl, { headers });
      if (!codeRes.ok) continue;

      const codeText = await codeRes.text();
      parsedFiles.push(file.path);

      // Check if it's a Room Entity or SQLite representation
      if (codeText.includes("@Entity") || codeText.includes("interface ") && codeText.toLowerCase().includes("dao")) {
        const tableNameMatch = codeText.match(/tableName\s*=\s*"([^"]+)"/) || codeText.match(/@Entity$$tableName\s*=\s*"([^"]+)"$$/) || codeText.match(/class\s+(\w+)/);
        const nameRaw = tableNameMatch ? tableNameMatch[1] : file.path.split("/").pop()?.replace(/\.kt$/, "").toLowerCase();
        
        if (nameRaw) {
          const tableName = nameRaw.toLowerCase().replace("entity", "");
          
          if (!dbTables.some(t => t.name === tableName)) {
            // parse columns
            const columns: any[] = [{ name: "id", type: "INTEGER", isPrimaryKey: true }];
            const fieldMatches = codeText.matchAll(/(?:val|var)\s+(\w+)\s*:\s*(\w+)/g);
            for (const m of fieldMatches) {
              const fName = m[1];
              const fType = m[2];
              if (fName === "id" || fName === "uid") continue;
              
              let colType: "TEXT" | "INTEGER" | "REAL" = "TEXT";
              if (fType === "Int" || fType === "Long" || fType === "Boolean") colType = "INTEGER";
              if (fType === "Double" || fType === "Float") colType = "REAL";

              columns.push({ name: fName, type: colType });
            }

            dbTables.push({
              id: `${tableName}_db`,
              name: tableName,
              columns,
              simulatedRows: [
                { id: 1, ...columns.reduce((acc, c) => (c.isPrimaryKey ? acc : { ...acc, [c.name]: c.type === "INTEGER" ? 1 : c.type === "REAL" ? 4.95 : "Pushed Record" }), {}) }
              ]
            });
          }
        }
        continue; // Handled database, skip screen composition
      }

      // Reconstruct UI views by analyzing Compose function calls & strings
      const fileName = file.path.split("/").pop()?.replace(/\.kt$/, "") || "Main";
      const screenId = fileName.toLowerCase().replace(/[^a-z0-0]/g, "_") + "_screen";
      const screenName = fileName.replace(/([A-Z])/g, ' $1').trim();

      const components: AndroidComponent[] = [];

      // Scan file text for basic features to construct interactive mockups
      const lines = codeText.split("\n");
      let textCount = 0;
      let btnCount = 0;
      let cardCount = 0;

      // Scan strings to use as mock values
      const stringLiterals = Array.from(codeText.matchAll(/"([^"]{3,60})"/g)).map(m => m[1]);
      
      // Basic composable discovery
      if (codeText.includes("Text(")) {
        const textVal = stringLiterals.find(s => !s.includes(".") && s.length > 5 && s.length < 40) || `Overview logs for ${screenName}`;
        components.push({
          id: `text_${screenId}_${++textCount}`,
          type: "text",
          properties: {
            text: textVal,
            style: "h1",
            fontSize: 22,
            margin: 12
          }
        });
      }

      if (codeText.includes("Card") || codeText.includes("Box") && codeText.includes("background")) {
        const msg = stringLiterals.find(s => s.length > 20 && s.length < 120) || `Real-time activity stats mapped from ${fileName}.kt`;
        components.push({
          id: `card_${screenId}_${++cardCount}`,
          type: "card",
          properties: {
            text: `System State Sync: ${fileName}`,
            placeholder: msg,
            margin: 12
          }
        });
      }

      if (codeText.includes("Button") || codeText.includes("IconButton")) {
        const btnLabel = stringLiterals.find(s => s.length >= 3 && s.length < 15) || `Action ${fileName}`;
        components.push({
          id: `btn_${screenId}_${++btnCount}`,
          type: "button",
          properties: {
            text: btnLabel,
            style: "filled",
            actionType: "toast",
            actionValue: `Successfully triggered action: ${btnLabel}!`,
            margin: 10
          }
        });
      }

      if (codeText.includes("TextField") || codeText.includes("OutlinedTextField")) {
        components.push({
          id: `input_${screenId}`,
          type: "textinput",
          properties: {
            text: `Search / Filter ${fileName}`,
            placeholder: "Type keywords to search Database...",
            bindState: `${screenId}_input_query`,
            margin: 10
          }
        });
        
        if (!globalVariables.some(v => v.name === `${screenId}_input_query`)) {
          globalVariables.push({
            name: `${screenId}_input_query`,
            type: "string",
            defaultValue: ""
          });
        }
      }

      if (codeText.includes("Switch")) {
        components.push({
          id: `switch_${screenId}`,
          type: "switch",
          properties: {
            text: `Enable real-time synchronization`,
            bindState: `${screenId}_toggle_status`,
            margin: 12
          }
        });

        if (!globalVariables.some(v => v.name === `${screenId}_toggle_status`)) {
          globalVariables.push({
            name: `${screenId}_toggle_status`,
            type: "boolean",
            defaultValue: "true"
          });
        }
      }

      // Add a spacer block at the end
      components.push({
        id: `spacer_${screenId}`,
        type: "spacer",
        properties: { height: 16 }
      });

      // Avoid putting screens with absolutely no components to keep UX clean
      if (components.length > 0) {
        screensList.push({
          id: screenId,
          name: screenName,
          components
        });
      }

    } catch (e) {
      console.warn("Failed parsing file " + file.path + ": ", e);
    }
  }

  // Absolute baseline sanity check in case reconstruction resulted in empty screens
  if (screensList.length === 0) {
    screensList.push({
      id: "splash_screen",
      name: "Gateway Screen",
      components: [
        {
          id: "welcome_fallback",
          type: "text",
          properties: {
            text: repo.toUpperCase(),
            style: "h1",
            fontSize: 26,
            margin: 16
          }
        },
        {
          id: "card_fallback",
          type: "card",
          properties: {
            text: `Connected Repository Successfully!`,
            placeholder: `Identified ${parsedFiles.length} Kotlin resources. Click around to customize the screens, variables, or database tables.`,
            margin: 12
          }
        }
      ]
    });
  }

  // Deduplicate variables & auto-ensure ID references
  const initialScreenId = screensList[0]?.id || "dashboard";

  return {
    project: {
      appName: repo.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
      packageName: `com.github.${owner.toLowerCase().replace(/[^a-z0-9]/g, "")}.${repo.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
      themeColor: "#6366f1", // Match primary indigo
      initialScreenId,
      screens: screensList,
      variables: globalVariables,
      databaseTables: dbTables.length > 0 ? dbTables : undefined
    },
    isNativeReconstructed: true,
    sourceFilesParsed: parsedFiles
  };
}
