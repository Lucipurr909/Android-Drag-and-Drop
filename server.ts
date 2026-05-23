import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini client on the server
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("GEMINI_API_KEY is not defined in environment variables. Gemini generated layout features will be offline.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key || "MOCK_KEY",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// API: Health probe
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// API: Generate fully interactive Android App schemas using Gemini
app.post("/api/gemini/generate", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Missing or invalid prompt parameter." });
  }

  try {
    const ai = getGeminiClient();
    
    // Detailed prompt to design the app layout components, variables, and actions
    const systemInstruction = 
      "You are a master Android UI designer and Jetpack Compose expert developer. " +
      "The user wants you to generate a multi-screen Android application layout and state variables matching their prompt. " +
      "You MUST generate appropriate Material 3 layout structures, components, and state configurations. " +
      "Keep screens realistic, highly polished, with actual user-friendly component flows. " +
      "Verify that components like buttons have active workflows (e.g. Navigating to another screen, inflating Toast messages, or incrementing state counters). " +
      "Variables must declare standard defaultValue strings. If a Slider is used or Switch is used, associate bindState with a declared variable. " +
      "Only return a single clean JSON adhering to the specified response schema.";

    const contents = `Generate an Android layout specification for: "${prompt}"`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.9,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            screens: {
              type: Type.ARRAY,
              description: "Array of interactive Screens in the application",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "Unique snake_case screen identifier (e.g., 'main_screen', 'form_screen', 'details_screen')" },
                  name: { type: Type.STRING, description: "Readable screen heading" },
                  components: {
                    type: Type.ARRAY,
                    description: "Visual widgets nested on the screen in vertical layout",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING, description: "Unique widget identifier" },
                        type: { 
                          type: Type.STRING, 
                          description: "Visual widget type: 'text', 'button', 'textinput', 'card', 'image', 'switch', 'slider', 'listitem', 'progressbar', 'divider', 'spacer'" 
                        },
                        properties: {
                          type: Type.OBJECT,
                          properties: {
                            text: { type: Type.STRING, description: "Label content. If it reads state, bracket it, e.g. 'Count: {counter}'" },
                            placeholder: { type: Type.STRING, description: "Text input placeholder" },
                            style: { type: Type.STRING, description: "Variant style (for text: 'h1', 'h2', 'body', 'caption'; for button: 'filled', 'outlined')" },
                            textColor: { type: Type.STRING, description: "Hex colors (e.g., '#0284c7')" },
                            backgroundColor: { type: Type.STRING, description: "Hex backgrounds (e.g., '#f8fafc')" },
                            fontSize: { type: Type.NUMBER, description: "Font size in sp (e.g. 14, 16, 20, 24)" },
                            margin: { type: Type.NUMBER, description: "Outer component spacing in dp (e.g., 4, 8, 12, 16, 24)" },
                            height: { type: Type.NUMBER, description: "Display bounding height override in dp (or 0 for automatic wrap)" },
                            src: { type: Type.STRING, description: "Placeholder image context/keywords (e.g., 'workspace', 'profile', 'nutrition', 'analytics')" },
                            actionType: { type: Type.STRING, description: "Interactive callback behaviors: 'toast', 'dialog', 'link', 'navigate', 'state_increment', 'state_decrement', 'none'" },
                            actionValue: { type: Type.STRING, description: "Behavior target, e.g. toast text, another screen ID to navigate to, state variable name to increment, or web URL" },
                            bindState: { type: Type.STRING, description: "The state variable name binded to the value of this Switch, Slider, or TextField" }
                          }
                        }
                      }
                    }
                  }
                },
                required: ["id", "name", "components"]
              }
            },
            variables: {
              type: Type.ARRAY,
              description: "State keys initialized with defaultValue so components can reactive-update",
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Variable state name, e.g., 'counter'" },
                  type: { type: Type.STRING, description: "Value type: 'string', 'number', 'boolean'" },
                  defaultValue: { type: Type.STRING, description: "Must be string representation, e.g. '0', 'true', 'Joe'" }
                },
                required: ["name", "type", "defaultValue"]
              }
            }
          },
          required: ["screens", "variables"]
        }
      }
    });

    const specText = response.text;
    if (!specText) {
      throw new Error("Empty content returned from Gemini");
    }

    try {
      const parsedData = JSON.parse(specText);
      return res.json(parsedData);
    } catch (parseErr) {
      console.error("Gemini output parsing failure. Output: ", specText);
      return res.status(500).json({ error: "Failed to parse layout JSON generated by Gemini.", rawText: specText });
    }

  } catch (error: any) {
    console.error("Gemini content generation error:", error);
    return res.status(500).json({ error: error.message || "Internal generation error." });
  }
});

// Setup development or production bundlers
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite dev middleware mounted.");
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log("Production static build routers mounted.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Android App Maker server running on http://0.0.0.0:${PORT}`);
  });
}

setupVite();
