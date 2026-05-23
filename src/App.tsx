import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Layers,
  Sparkles,
  Download,
  Code,
  Layout,
  Plus,
  Trash2,
  Settings,
  ArrowUp,
  ArrowDown,
  Info,
  Check,
  RotateCcw,
  Volume2,
  FolderLock,
  ChevronRight,
  MonitorPlay,
  Hammer,
  FileCode,
  Lightbulb,
  ExternalLink,
  HelpCircle,
  GripVertical,
  Star,
  Map,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  ChevronDown,
  Github,
  GitFork,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AndroidProject, AndroidScreen, AndroidComponent, ComponentType } from './types';
import { templates } from './templates';
import { exportProjectZip } from './utils/projectExporter';
import { parseGithubUrl, pullProjectFromGithub } from './utils/githubPuller';
import {
  generateScreenKotlin,
  generateStateManagerKotlin,
  generateMainActivityKotlin,
  generateThemeKotlin
} from './utils/kotlinGen';

export default function App() {
  // Application active designs state
  const [project, setProject] = useState<AndroidProject>({
    appName: "Fitness Hub",
    packageName: "com.android.fitnesshub",
    themeColor: "#6366f1", // Indigo
    initialScreenId: "dashboard",
    screens: templates[0].project.screens,
    variables: templates[0].project.variables,
    databaseTables: [
      {
        id: "tasks_db",
        name: "tasks",
        columns: [
          { name: "id", type: "INTEGER", isPrimaryKey: true },
          { name: "title", type: "TEXT" },
          { name: "completed", type: "INTEGER" }
        ],
        simulatedRows: [
          { id: 1, title: "Cardio morning interval routine", completed: 1 },
          { id: 2, title: "Heavy squats set x5", completed: 0 },
          { id: 3, title: "Post workout hydration recovery", completed: 0 }
        ]
      },
      {
        id: "expenses_db",
        name: "expenses",
        columns: [
          { name: "id", type: "INTEGER", isPrimaryKey: true },
          { name: "category", type: "TEXT" },
          { name: "amount", type: "REAL" }
        ],
        simulatedRows: [
          { id: 1, category: "Energy Drinks", amount: 12.5 },
          { id: 2, category: "Gym Protein Shake", amount: 6.99 },
          { id: 3, category: "Lifting Straps", amount: 24.5 }
        ]
      }
    ]
  });

  // Editor states
  const [activeScreenId, setActiveScreenId] = useState<string>("home_screen");
  const [selectedCompId, setSelectedCompId] = useState<string | null>(null);
  const [isPlayMode, setIsPlayMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'canvas' | 'code' | 'apk'>('canvas');
  const [selectedKotlinFile, setSelectedKotlinFile] = useState<string>('Screen.kt');
  const [mobileActivePanel, setMobileActivePanel] = useState<'left' | 'center' | 'right'>('center');

  // Touch Drag-and-drop states (mobile friendly)
  const [touchDragIdx, setTouchDragIdx] = useState<number | null>(null);
  const [touchDragOverIdx, setTouchDragOverIdx] = useState<number | null>(null);

  // Library active category Tab
  const [libraryTab, setLibraryTab] = useState<'widgets' | 'presets' | 'database'>('widgets');

  // Play Mode active states (running in memory)
  const [simulatedState, setSimulatedState] = useState<Record<string, string>>({});
  const [simulatedToasts, setSimulatedToasts] = useState<string[]>([]);
  const [simulatedBackStack, setSimulatedBackStack] = useState<string[]>([]);

  // Local helper alerts
  const [activeAlert, setActiveAlert] = useState<string | null>(null);

  // New Project creator modal states
  const [showNewProjectModal, setShowNewProjectModal] = useState<boolean>(false);
  const [newProjectName, setNewProjectName] = useState<string>("My Awesome App");
  const [newProjectPkg, setNewProjectPkg] = useState<string>("com.example.awesomeapp");
  const [newProjectColor, setNewProjectColor] = useState<string>("#6366f1");

  // GitHub Puller modal and loading states
  const [showGithubPullModal, setShowGithubPullModal] = useState<boolean>(false);
  const [githubUrlInput, setGithubUrlInput] = useState<string>("");
  const [githubTokenInput, setGithubTokenInput] = useState<string>("");
  const [isGithubPulling, setIsGithubPulling] = useState<boolean>(false);
  const [githubPullError, setGithubPullError] = useState<string | null>(null);

  const startNewProject = () => {
    const freshProj: AndroidProject = {
      appName: newProjectName.trim() || 'Untitled App',
      packageName: newProjectPkg.trim().toLowerCase() || 'com.example.untitledapp',
      themeColor: newProjectColor,
      initialScreenId: 'home_screen',
      variables: [],
      screens: [
        {
          id: 'home_screen',
          name: 'Home Screen',
          components: [
            {
              id: 'welcome_label',
              type: 'text',
              properties: {
                text: `Welcome to ${newProjectName.trim() || 'your new app'}!`,
                style: 'h1',
                textColor: '#1e293b',
                fontSize: 24,
                margin: 16
              }
            },
            {
              id: 'sub_label',
              type: 'text',
              properties: {
                text: 'This is a totally fresh design canvas. Start dragging UI components or layout presets from the library tab on the left to build matching Jetpack Compose layout trees.',
                style: 'body',
                textColor: '#64748b',
                fontSize: 13,
                margin: 8
              }
            }
          ]
        }
      ]
    };

    setProject(freshProj);
    setActiveScreenId('home_screen');
    setSelectedCompId(null);
    setIsPlayMode(false);
    setActiveTab('canvas');
    setSimulatedBackStack([]);
    setSimulatedState({});
    setSimulatedToasts(prev => [...prev, "Cleared active design. Started a fresh project! All compile/build inputs cleaned."]);
    setShowNewProjectModal(false);
  };

  const handleGithubPull = async () => {
    setGithubPullError(null);
    const parsed = parseGithubUrl(githubUrlInput);
    if (!parsed) {
      setGithubPullError("Invalid URL syntax. Please enter standard formats like 'owner/repo' or standard https link.");
      return;
    }

    setIsGithubPulling(true);
    try {
      const res = await pullProjectFromGithub(parsed, githubTokenInput);
      setProject(res.project);
      setActiveScreenId(res.project.initialScreenId || res.project.screens[0]?.id || "home_screen");
      setSelectedCompId(null);
      setIsPlayMode(false);
      setShowGithubPullModal(false);
      setSimulatedBackStack([]);
      setSimulatedState({});
      
      const fileCount = res.sourceFilesParsed.length;
      if (res.isNativeReconstructed) {
        setSimulatedToasts(prev => [
          ...prev, 
          `Pulled ${parsed.repo}! Reconstructed ${res.project.screens.length} layout views 🚀`
        ]);
        alert(`Successfully pulled from GitHub!\n\nOwner: ${parsed.owner}\nRepository: ${parsed.repo}\n\nProcessed ${fileCount} Java/Kotlin references to bootstrap interactive Compose design elements & state properties!`);
      } else {
        setSimulatedToasts(prev => [
          ...prev, 
          `AppForge project configuration synchronized! 📂`
        ]);
        alert(`Successfully found and initialized direct AppForge workspace configuration from repository! All interactive screens, memory scopes, and database tables are now live.`);
      }
    } catch (err: any) {
      console.error("Error pulling repository: ", err);
      setGithubPullError(err.message || "Failed to contact GitHub API or parse repository contents.");
    } finally {
      setIsGithubPulling(false);
    }
  };

  // Synchronize simulatedState whenever templates are loaded or variables change
  useEffect(() => {
    const defaultState: Record<string, string> = {};
    project.variables.forEach(v => {
      defaultState[v.name] = v.defaultValue;
    });
    setSimulatedState(defaultState);
  }, [project.variables]);

  // Synchronize activeScreenId if it doesn't exist on load
  useEffect(() => {
    if (project.screens.length > 0) {
      const exists = project.screens.some(s => s.id === activeScreenId);
      if (!exists) {
        setActiveScreenId(project.screens[0].id);
      }
    }
  }, [project.screens, activeScreenId]);

  const activeScreen = project.screens.find(s => s.id === activeScreenId) || project.screens[0];

  // Variables utilities
  const addVariable = () => {
    const name = `var_${Math.floor(Math.random() * 1000)}`;
    const newVar = { name, type: 'string' as const, defaultValue: 'Value' };
    setProject({
      ...project,
      variables: [...project.variables, newVar]
    });
  };

  const updateVariable = (index: number, field: string, value: string) => {
    const updated = [...project.variables];
    updated[index] = { ...updated[index], [field]: value };
    setProject({ ...project, variables: updated });
  };

  const deleteVariable = (index: number) => {
    const updated = project.variables.filter((_, i) => i !== index);
    setProject({ ...project, variables: updated });
  };

  // Screen utilities
  const addScreen = () => {
    const screenId = `screen_${Math.floor(Math.random() * 1000)}`;
    const screenName = `New Screen ${project.screens.length + 1}`;
    const newScreen: AndroidScreen = {
      id: screenId,
      name: screenName,
      components: [
        {
          id: `title_${Math.floor(Math.random() * 1000)}`,
          type: 'text',
          properties: {
            text: screenName,
            style: 'h1',
            textColor: '#0f172a',
            fontSize: 24,
            margin: 12
          }
        }
      ]
    };
    setProject({
      ...project,
      screens: [...project.screens, newScreen]
    });
    setActiveScreenId(screenId);
  };

  const updateScreenName = (id: string, name: string) => {
    const updated = project.screens.map(s => {
      if (s.id === id) {
        return { ...s, name };
      }
      return s;
    });
    setProject({ ...project, screens: updated });
  };

  const deleteScreen = (id: string) => {
    if (project.screens.length <= 1) {
      alert("At least one screen is required in the application.");
      return;
    }
    const updated = project.screens.filter(s => s.id !== id);
    setProject({ ...project, screens: updated });
    // Fall back to first screen if deleting active
    if (activeScreenId === id) {
      setActiveScreenId(updated[0].id);
    }
  };

  const getPresetConfig = (presetKey: string) => {
    switch (presetKey) {
      case 'search_bar':
        return {
          type: 'textinput' as ComponentType,
          label: 'Search Bar Widget',
          properties: { placeholder: 'Search for courses, products, coffee...', bindState: 'search_query', margin: 12 }
        };
      case 'promo_coupon':
        return {
          type: 'card' as ComponentType,
          label: 'Promo Offer Banner',
          properties: { text: '🎉 Caramel Macchiato: Buy 1 Get 1 Free!', placeholder: 'Order a grande cold brew or macchiato beverage on mobile today and claim yours.', backgroundColor: '#fef08a', margin: 12 }
        };
      case 'action_buy':
        return {
          type: 'button' as ComponentType,
          label: 'Brand Action Button',
          properties: { text: 'Confirm & Order ($4.95)', actionType: 'toast', actionValue: 'Order confirming in real-time... ☕', margin: 12 }
        };
      case 'user_badge':
        return {
          type: 'listitem' as ComponentType,
          label: 'User Account Profile Item',
          properties: { text: 'Premium Guest Account', placeholder: 'lucidogeqr@gmail.com • 420 VP Rewards', style: 'M3', margin: 8 }
        };
      case 'theme_toggle':
        return {
          type: 'switch' as ComponentType,
          label: 'Settings Switch Item',
          properties: { text: 'Enable Dark Mode Interface', bindState: 'dark_mode', margin: 8 }
        };
      case 'intensity_filter':
        return {
          type: 'slider' as ComponentType,
          label: 'Design Range Slider',
          properties: { text: 'Selected Coffee Strength', bindState: 'strength', margin: 8 }
        };
      case 'rewards_track':
        return {
          type: 'progressbar' as ComponentType,
          label: 'Visual Rewards Progress',
          properties: { textColor: '#10b981', bindState: 'loyalty_progress', margin: 12 }
        };
      case 'map_directions':
        return {
          type: 'listitem' as ComponentType,
          label: 'Google Map Row Item',
          properties: { text: 'Navigate To Café', placeholder: 'Get instant route directions to 450 AppForge Ave.', style: 'M3', actionType: 'toast', actionValue: 'Navigating to cafe...' }
        };
      case 'booking_calendar':
        return {
          type: 'calendar' as ComponentType,
          label: 'Material Smart Date Picker',
          properties: { text: 'Choose Booking Appointment', bindState: 'selected_date', margin: 12 }
        };
      case 'terms_checkbox':
        return {
          type: 'checkbox' as ComponentType,
          label: 'Material Terms Agreement',
          properties: { text: "I certify that all details above are correct & accept local storage guidelines", bindState: 'terms_agreed', margin: 8 }
        };
      case 'fitness_tracker_chart':
        return {
          type: 'chart' as ComponentType,
          label: 'Responsive Live Metrics Chart',
          properties: { text: 'Monthly Dynamic Analytics Tracking', bindState: 'analytics_metric', margin: 12 }
        };
      case 'meditation_timer':
        return {
          type: 'timer' as ComponentType,
          label: 'Modular Countdown Timer Clock',
          properties: { text: 'Task Countdown Duration', placeholder: '300', bindState: 'countdown_seconds', margin: 12 }
        };
      default:
        return null;
    }
  };

  // Component management library
  const addComponentToActiveScreen = (type: ComponentType) => {
    const newComp: AndroidComponent = {
      id: `${type}_${Math.floor(Math.random() * 10000)}`,
      type,
      properties: getDefaultProperties(type)
    };
    
    const updated = project.screens.map(s => {
      if (s.id === activeScreenId) {
        return {
          ...s,
          components: [...s.components, newComp]
        };
      }
      return s;
    });

    setProject({ ...project, screens: updated });
    // Auto-select newly added element
    setSelectedCompId(newComp.id);

    // Switch to simulator view on mobile for convenient confirmation & toast feedback
    if (window.innerWidth < 1280) {
      setMobileActivePanel('center');
    }
    setSimulatedToasts(prev => [...prev, `Added visual ${type.toUpperCase()} label to simulator layout.`]);
  };

  const addComponentPresetToActiveScreen = (type: ComponentType, customProps: any, labelName: string) => {
    const defaultProps = getDefaultProperties(type);
    const newComp: AndroidComponent = {
      id: `${type}_${Math.floor(Math.random() * 10000)}`,
      type,
      properties: { ...defaultProps, ...customProps }
    };

    const updated = project.screens.map(s => {
      if (s.id === activeScreenId) {
        return {
          ...s,
          components: [...s.components, newComp]
        };
      }
      return s;
    });

    setProject({ ...project, screens: updated });
    setSelectedCompId(newComp.id);

    if (window.innerWidth < 1280) {
      setMobileActivePanel('center');
    }
    setSimulatedToasts(prev => [...prev, `Added visual preset: ${labelName}`]);
  };

  const insertComponentPresetToActiveScreen = (type: ComponentType, customProps: any, index: number, labelName: string) => {
    const defaultProps = getDefaultProperties(type);
    const newComp: AndroidComponent = {
      id: `${type}_${Math.floor(Math.random() * 10000)}`,
      type,
      properties: { ...defaultProps, ...customProps }
    };

    const updated = project.screens.map(s => {
      if (s.id === activeScreenId) {
        const comps = [...s.components];
        const targetIdx = Math.max(0, Math.min(comps.length, index));
        comps.splice(targetIdx, 0, newComp);
        return {
          ...s,
          components: comps
        };
      }
      return s;
    });

    setProject({ ...project, screens: updated });
    setSelectedCompId(newComp.id);

    if (window.innerWidth < 1280) {
      setMobileActivePanel('center');
    }
    setSimulatedToasts(prev => [...prev, `Inserted visual preset: ${labelName}`]);
  };

  const insertComponentToActiveScreen = (type: ComponentType, index: number) => {
    const newComp: AndroidComponent = {
      id: `${type}_${Math.floor(Math.random() * 10000)}`,
      type,
      properties: getDefaultProperties(type)
    };

    const updated = project.screens.map(s => {
      if (s.id === activeScreenId) {
        const comps = [...s.components];
        const targetIdx = Math.max(0, Math.min(comps.length, index));
        comps.splice(targetIdx, 0, newComp);
        return {
          ...s,
          components: comps
        };
      }
      return s;
    });

    setProject({ ...project, screens: updated });
    setSelectedCompId(newComp.id);

    if (window.innerWidth < 1280) {
      setMobileActivePanel('center');
    }
    setSimulatedToasts(prev => [...prev, `Inserted ${type.toUpperCase()} at requested drop layout position.`]);
  };

  const moveComponentToPosition = (fromIndex: number, toIndex: number) => {
    if (!activeScreen) return;
    const comps = [...activeScreen.components];
    if (fromIndex < 0 || fromIndex >= comps.length) return;
    if (toIndex < 0 || toIndex >= comps.length) return;

    const [moved] = comps.splice(fromIndex, 1);
    comps.splice(toIndex, 0, moved);

    const updated = project.screens.map(s => {
      if (s.id === activeScreenId) {
        return { ...s, components: comps };
      }
      return s;
    });
    setProject({ ...project, screens: updated });
  };

  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    if (isPlayMode) return;
    setTouchDragIdx(index);
    setTouchDragOverIdx(index);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchDragIdx === null) return;
    
    const clientY = e.touches[0].clientY;
    const container = document.getElementById("simulator_components_list");
    if (!container) return;

    const children = Array.from(container.children);
    let targetIdx = -1;

    for (let i = 0; i < children.length; i++) {
      const rect = children[i].getBoundingClientRect();
      if (clientY >= rect.top && clientY <= rect.bottom) {
        targetIdx = i;
        break;
      }
    }

    if (targetIdx !== -1 && targetIdx !== touchDragOverIdx) {
      setTouchDragOverIdx(targetIdx);
    }
  };

  const handleTouchEnd = () => {
    if (touchDragIdx !== null && touchDragOverIdx !== null && touchDragIdx !== touchDragOverIdx) {
      moveComponentToPosition(touchDragIdx, touchDragOverIdx);
    }
    setTouchDragIdx(null);
    setTouchDragOverIdx(null);
  };

  const getDefaultProperties = (type: ComponentType): any => {
    switch (type) {
      case 'text':
        return { text: "Editable TextView Label", style: "body", textColor: "#1e293b", fontSize: 16, margin: 8 };
      case 'button':
        return { text: "Action Button", style: "filled", backgroundColor: project.themeColor, fontSize: 16, margin: 8, actionType: "toast", actionValue: "Button pressed!" };
      case 'textinput':
        return { placeholder: "Write value here...", bindState: project.variables[0]?.name || "username", margin: 8 };
      case 'card':
        return { text: "Card Header Title", placeholder: "This is secondary body summary detail content nested nicely inside an styled Material 3 card container.", backgroundColor: "#f8fafc", margin: 8 };
      case 'image':
        return { src: "workspace", height: 160, margin: 8 };
      case 'switch':
        return { text: "Task Toggle Reminders", bindState: project.variables[0]?.name || "isToggled", margin: 8 };
      case 'slider':
        return { text: "Numeric Range Index", bindState: project.variables[0]?.name || "progress", margin: 8 };
      case 'listitem':
        return { text: "Custom Row Item", placeholder: "Compact details, clicking can navigate/notify", style: "M3", actionType: "none", margin: 8 };
      case 'progressbar':
        return { margin: 8 };
      case 'divider':
        return { margin: 8 };
      case 'spacer':
        return { height: 18 };
      case 'calendar':
        return { text: "Choose Appointment Date", bindState: "selected_date", margin: 8 };
      case 'checkbox':
        return { text: "Accept guidelines & conditions", bindState: "accepted_agreements", margin: 8 };
      case 'chart':
        return { text: "Performance Track Analysis", style: "spline", margin: 12 };
      case 'timer':
        return { text: "Activity Practice Clock", placeholder: "300", bindState: "activity_timer", margin: 8 };
      case 'map':
        return { text: "interactive GPS Location Map", placeholder: "San Francisco, CA", height: 160, margin: 12 };
      case 'rating':
        return { text: "Star Rating Feedback Indicator", placeholder: "5", bindState: "user_rating", margin: 8 };
      case 'chip':
        return { text: "All,Featured,Hot,Trending,Latest", bindState: "active_filter", margin: 8 };
      case 'audio':
        return { text: "Calm Acoustic Playlist", placeholder: "Track 04 • Morning Sunrise Mix", bindState: "is_playing", margin: 12 };
      case 'dropdown':
        return { text: "Select Service Category", placeholder: "Dine In,Takeaway,Delivery,Drive-Thru", bindState: "service_type", margin: 8 };
      case 'datatable':
        return { text: "Room Db Table View", bindState: "tasks", margin: 12 };
    }
  };

  const updateSelectedCompProperty = (propertyKey: string, value: any) => {
    if (!selectedCompId) return;
    const updated = project.screens.map(s => {
      if (s.id === activeScreenId) {
        return {
          ...s,
          components: s.components.map(c => {
            if (c.id === selectedCompId) {
              return {
                ...c,
                properties: { ...(c.properties || {}), [propertyKey]: value }
              };
            }
            return c;
          })
        };
      }
      return s;
    });
    setProject({ ...project, screens: updated });
  };

  const deleteComponent = (compId: string) => {
    const updated = project.screens.map(s => {
      if (s.id === activeScreenId) {
        return {
          ...s,
          components: s.components.filter(c => c.id !== compId)
        };
      }
      return s;
    });
    setProject({ ...project, screens: updated });
    if (selectedCompId === compId) {
      setSelectedCompId(null);
    }
  };

  const moveComponent = (index: number, direction: 'up' | 'down') => {
    if (!activeScreen) return;
    const comps = [...activeScreen.components];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= comps.length) return;

    // Swap
    const temp = comps[index];
    comps[index] = comps[targetIdx];
    comps[targetIdx] = temp;

    const updated = project.screens.map(s => {
      if (s.id === activeScreenId) {
        return { ...s, components: comps };
      }
      return s;
    });
    setProject({ ...project, screens: updated });
  };

  // Run/Play Mode Action interpreter
  const executePlayAction = (comp: AndroidComponent) => {
    if (!isPlayMode || !comp) return;
    const props = comp.properties || {};

    if (props.actionType === 'toast') {
      const msg = interpolateSimulatedText(props.actionValue || "Action activated!");
      setSimulatedToasts(prev => [...prev, msg]);
      setTimeout(() => {
        setSimulatedToasts(prev => prev.slice(1));
      }, 3500);
    } 
    else if (props.actionType === 'navigate') {
      if (props.actionValue) {
        setSimulatedBackStack(prev => [...prev, activeScreenId]);
        setActiveScreenId(props.actionValue);
      }
    } 
    else if (props.actionType === 'state_increment') {
      const varName = props.actionValue;
      if (varName && simulatedState[varName] !== undefined) {
        const parsed = parseFloat(simulatedState[varName]) || 0;
        setSimulatedState(prev => ({
          ...prev,
          [varName]: String(parsed + 1)
        }));
      }
    } 
    else if (props.actionType === 'state_decrement') {
      const varName = props.actionValue;
      if (varName && simulatedState[varName] !== undefined) {
        const parsed = parseFloat(simulatedState[varName]) || 0;
        setSimulatedState(prev => ({
          ...prev,
          [varName]: String(parsed - 1)
        }));
      }
    } 
    else if (props.actionType === 'dialog') {
      setActiveAlert("Popup Dialog: action trigger activated from interactive click.");
    } 
    else if (props.actionType === 'link') {
      window.open(props.actionValue || "https://google.com", "_blank");
    }
  };

  // Helper replacing {var} templates in UI strings inside simulator
  const interpolateSimulatedText = (str: string | undefined): string => {
    if (!str) return '';
    let formatted = str;
    const matches = formatted.match(/\{([a-zA-Z0-9_]+)\}/g);
    if (matches) {
      matches.forEach(m => {
        const varName = m.substring(1, m.length - 1);
        if (simulatedState[varName] !== undefined) {
          formatted = formatted.replace(m, simulatedState[varName]);
        }
      });
    }
    return formatted;
  };

  // Download project workspace zip triggers
  const downloadWorkspaceZip = async () => {
    try {
      const binaryBlob = await exportProjectZip(project);
      const url = URL.createObjectURL(binaryBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${project.appName.replace(/\s+/g, '')}-Workspace.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate ZIP workspace: ", err);
      alert("Error packaging source files folder.");
    }
  };

  // Get current Kotlin source code for display
  const getKotlinEditorContent = () => {
    switch (selectedKotlinFile) {
      case 'Screen.kt':
        return generateScreenKotlin(activeScreen, project);
      case 'StateManager.kt':
        return generateStateManagerKotlin(project);
      case 'MainActivity.kt':
        return generateMainActivityKotlin(project);
      case 'Theme.kt':
        return generateThemeKotlin(project);
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-600 selection:text-white" id="main_wrapper">
      
      {/* HEADER: Studio Branding and Main Toolbar */}
      <header className="px-3 sm:px-6 py-2.5 sm:py-3 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-40 shadow-xs" id="header_pane">
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shrink-0 shadow-sm shadow-indigo-100">
            <Smartphone size={16} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold leading-none text-slate-800">AppForge Studio</span>
            <span className="hidden md:inline text-[9px] text-slate-400 font-mono uppercase tracking-widest font-bold mt-0.5">coffee_delivery_v2.apk</span>
          </div>
          <div className="hidden md:block h-6 w-[1px] bg-slate-200 mx-2"></div>
          <div className="hidden md:flex gap-1.5">
            <button className="px-2.5 py-1 text-xs hover:bg-slate-100 rounded text-slate-600 font-semibold cursor-pointer transition-colors">File</button>
            <button className="px-2.5 py-1 text-xs hover:bg-slate-100 rounded text-slate-600 font-semibold cursor-pointer transition-colors">Edit</button>
            <button className="px-2.5 py-1 text-xs hover:bg-slate-100 rounded text-slate-600 font-semibold cursor-pointer transition-colors">View</button>
          </div>
        </div>

        {/* Templates short selector */}
        <div className="hidden lg:flex items-center gap-1.5 p-1 bg-slate-50 border border-slate-200 rounded-xl">
          <span className="text-[11px] text-slate-500 px-2 font-bold uppercase tracking-wider font-mono">Quick Templates:</span>
          {templates.map((tpl, idx) => (
            <button
              key={idx}
              onClick={() => {
                setProject({
                  ...tpl.project,
                  screens: tpl.project.screens,
                  variables: tpl.project.variables
                });
                setActiveScreenId(tpl.project.screens[0].id);
                setSelectedCompId(null);
                setIsPlayMode(false);
              }}
              className="text-xs px-2.5 py-1 hover:bg-slate-100 bg-white border border-slate-250 hover:border-slate-300 text-slate-600 hover:text-slate-900 rounded-lg transition-all flex items-center gap-1 cursor-pointer font-bold shadow-2xs animate-in fade-in duration-300"
            >
              <span>{tpl.icon}</span>
              <span>{tpl.name}</span>
            </button>
          ))}
        </div>

        {/* Main Exporter / Action Bar */}
        <div className="flex items-center gap-1.5 sm:gap-2.5" id="header_actions">
          <button
            onClick={() => {
              setGithubUrlInput("");
              setGithubTokenInput("");
              setGithubPullError(null);
              setShowGithubPullModal(true);
            }}
            className="px-2.5 py-1.5 sm:px-3 bg-slate-900 border border-slate-950 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all select-none cursor-pointer shadow-3xs"
            title="Import/Pull project from GitHub URL"
          >
            <Github size={13} className="text-white shrink-0" />
            <span>
              <span className="hidden sm:inline">GitHub Pull</span>
              <span className="inline sm:hidden">GitHub</span>
            </span>
          </button>

          <button
            onClick={() => {
              setNewProjectName("My Awesome App");
              setNewProjectPkg("com.example.awesomeapp");
              setNewProjectColor("#6366f1");
              setShowNewProjectModal(true);
            }}
            className="px-2.5 py-1.5 sm:px-3 bg-white border border-slate-250 hover:border-slate-300 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all select-none cursor-pointer shadow-3xs"
            title="Start totally new app project"
          >
            <Plus size={13} className="text-emerald-600" />
            <span>
              <span className="hidden sm:inline">New Project</span>
              <span className="inline sm:hidden">New</span>
            </span>
          </button>

          <button
            onClick={() => {
              setIsPlayMode(!isPlayMode);
              setSimulatedBackStack([]);
            }}
            className={`px-2.5 py-1.5 sm:px-3.5 sm:py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 sm:gap-1.5 border transition-all duration-200 select-none cursor-pointer ${
              isPlayMode 
                ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 animate-bounce-subtle shadow-2xs' 
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {isPlayMode ? <Hammer size={13} /> : <MonitorPlay size={13} />}
            <span>
              <span className="hidden sm:inline">{isPlayMode ? "Designer Mode" : "Run Live Preview"}</span>
              <span className="inline sm:hidden">{isPlayMode ? "Designer" : "Live"}</span>
            </span>
          </button>

          <button
            onClick={downloadWorkspaceZip}
            className="px-2.5 py-1.5 sm:px-4 sm:py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 sm:gap-1.5 shadow-xs shadow-indigo-100 hover:shadow-indigo-200/50 transition-all cursor-pointer"
          >
            <Download size={13} />
            <span className="hidden sm:inline">Export ZIP</span>
          </button>
        </div>
      </header>

      {/* MOBILE PANEL CONTROLLER DOCK */}
      <div className="xl:hidden bg-white border-b border-slate-200 flex items-center justify-around py-2 px-3 shrink-0 z-30 shadow-2xs" id="mobile_panel_controller">
        <button
          onClick={() => setMobileActivePanel('left')}
          className={`px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer select-none ${
            mobileActivePanel === 'left'
              ? 'bg-indigo-50 border border-indigo-100 text-indigo-750 text-indigo-700 font-extrabold shadow-3xs'
              : 'text-slate-650 hover:text-slate-900 hover:bg-slate-50 font-semibold'
          }`}
        >
          <Layers size={13} />
          <span>Library & Nav</span>
        </button>

        <button
          onClick={() => setMobileActivePanel('center')}
          className={`px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer select-none ${
            mobileActivePanel === 'center'
              ? 'bg-indigo-50 border border-indigo-100 text-indigo-750 text-indigo-700 font-extrabold shadow-3xs'
              : 'text-slate-650 hover:text-slate-900 hover:bg-slate-50 font-semibold'
          }`}
        >
          <Smartphone size={13} />
          <span>Device Preview</span>
        </button>

        <button
          onClick={() => setMobileActivePanel('right')}
          className={`px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer select-none ${
            mobileActivePanel === 'right'
              ? 'bg-indigo-50 border border-indigo-100 text-indigo-750 text-indigo-700 font-extrabold shadow-3xs'
              : 'text-slate-650 hover:text-slate-900 hover:bg-slate-50 font-semibold'
          }`}
        >
          <Settings size={13} />
          <span>Attributes</span>
        </button>
      </div>

      {/* CORE WORKSPACE COLUMN LAYOUT */}
      <div className="flex-1 flex flex-col xl:flex-row overflow-hidden max-h-[calc(100vh-57px)]" id="workspace_viewport">
        
        {/* PANEL LEVEL 1: Left Navigation Sidebar (Screen Architect & Templates) */}
        <aside className={`${mobileActivePanel === 'left' ? 'flex flex-1' : 'hidden'} xl:flex xl:w-80 xl:shrink-0 bg-white border-r border-slate-200 flex-col overflow-y-auto`} id="side_panel_left">
          
          {/* Screen Architecture list */}
          <div className="p-4 border-b border-slate-200 flex-1 bg-white">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-bold tracking-widest text-slate-400 font-mono uppercase flex items-center gap-1.5">
                <Layers size={12} className="text-slate-405" />
                <span>Screen Navigator</span>
              </h3>
              <button 
                onClick={addScreen}
                className="p-1 hover:bg-slate-100 rounded-lg text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
                title="Add Screen"
              >
                <Plus size={15} />
              </button>
            </div>

            <div className="space-y-1">
              {project.screens.map((sc) => {
                const isActive = activeScreenId === sc.id;
                return (
                  <div 
                    key={sc.id}
                    className={`group flex items-center justify-between p-2 rounded-xl border text-xs transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-indigo-50/60 border-indigo-100 text-indigo-700 font-semibold' 
                        : 'bg-transparent border-transparent hover:bg-slate-50 text-slate-650'
                    }`}
                    onClick={() => {
                      setActiveScreenId(sc.id);
                      setSelectedCompId(null);
                    }}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Smartphone size={13} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
                      {isActive ? (
                        <input
                          type="text"
                          value={sc.name}
                          onChange={(e) => updateScreenName(sc.id, e.target.value)}
                          className="bg-transparent border-0 border-b border-indigo-200 focus:border-indigo-500 focus:outline-none w-36 text-indigo-900 font-bold text-xs py-0"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="truncate font-medium">{sc.name}</span>
                      )}
                    </div>
                    
                    {project.screens.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteScreen(sc.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 hover:text-rose-600 rounded-lg transition-all text-slate-400 cursor-pointer"
                        title="Delete Screen"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Draggable Component Chest (Click to Add Library) */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/40">
            <h3 className="text-[10px] font-bold tracking-widest text-slate-400 font-mono uppercase mb-3 flex items-center gap-1.5">
              <Layout size={12} className="text-indigo-600" />
              <span>Component Library</span>
            </h3>

            {/* Sub-tab selection with beautiful interactive states */}
            <div className="flex bg-slate-100 p-1 rounded-xl mb-3 text-[10px] font-bold">
              <button 
                type="button"
                onClick={() => setLibraryTab('widgets')}
                className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${libraryTab === 'widgets' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Core Widgets
              </button>
              <button 
                type="button"
                onClick={() => setLibraryTab('presets')}
                className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${libraryTab === 'presets' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Presets
              </button>
              <button 
                type="button"
                onClick={() => setLibraryTab('database')}
                className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${libraryTab === 'database' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
              >
                🔌 Local DB
              </button>
            </div>
            
            {libraryTab === 'widgets' && (
              <div className="grid grid-cols-2 gap-2 max-h-[460px] overflow-y-auto pr-1">
                <button
                  onClick={() => addComponentToActiveScreen('text')}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", "comp_type:text")}
                  className="p-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-lg text-left text-xs transition-all flex flex-col gap-1 text-slate-600 hover:text-slate-900 cursor-grab active:cursor-grabbing shadow-2xs"
                >
                  <div className="text-indigo-600 font-bold font-mono text-center w-full bg-slate-50 rounded py-0.5 border border-dashed border-slate-200 text-[9px] uppercase">TextView</div>
                  <div className="font-semibold text-[10px] truncate w-full text-center">TextView Label</div>
                </button>

                <button
                  onClick={() => addComponentToActiveScreen('button')}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", "comp_type:button")}
                  className="p-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-lg text-left text-xs transition-all flex flex-col gap-1 text-slate-600 hover:text-slate-900 cursor-grab active:cursor-grabbing shadow-2xs"
                >
                  <div className="w-full bg-indigo-600 h-5 rounded flex items-center justify-center text-white text-[9px] font-bold">Button</div>
                  <div className="font-semibold text-[10px] truncate w-full text-center">M3 Button</div>
                </button>

                <button
                  onClick={() => addComponentToActiveScreen('textinput')}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", "comp_type:textinput")}
                  className="p-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-lg text-left text-xs transition-all flex flex-col gap-1 text-slate-600 hover:text-slate-900 cursor-grab active:cursor-grabbing shadow-2xs"
                >
                  <div className="border border-slate-200 border-dashed h-5 w-full rounded bg-slate-50 flex items-center justify-center text-slate-400 text-[9px] font-mono">[ Input ]</div>
                  <div className="font-semibold text-[10px] truncate w-full text-center">TextField Input</div>
                </button>

                <button
                  onClick={() => addComponentToActiveScreen('card')}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", "comp_type:card")}
                  className="p-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-lg text-left text-xs transition-all flex flex-col gap-1 text-slate-600 hover:text-slate-900 cursor-grab active:cursor-grabbing shadow-2xs"
                >
                  <div className="bg-slate-50 border border-slate-200 h-5 w-full rounded flex items-center justify-center text-xs">🗂️</div>
                  <div className="font-semibold text-[10px] truncate w-full text-center">Material Card</div>
                </button>

                <button
                  onClick={() => addComponentToActiveScreen('image')}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", "comp_type:image")}
                  className="p-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-lg text-left text-xs transition-all flex flex-col gap-1 text-slate-600 hover:text-slate-900 cursor-grab active:cursor-grabbing shadow-2xs"
                >
                  <div className="bg-slate-50 border border-slate-200 h-5 w-full rounded flex items-center justify-center text-xs">📷</div>
                  <div className="font-semibold text-[10px] truncate w-full text-center">Vector Image</div>
                </button>

                <button
                  onClick={() => addComponentToActiveScreen('switch')}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", "comp_type:switch")}
                  className="p-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-lg text-left text-xs transition-all flex flex-col gap-1 text-slate-600 hover:text-slate-900 cursor-grab active:cursor-grabbing shadow-2xs"
                >
                  <div className="bg-slate-50 border border-slate-200 rounded-full w-full h-5 relative flex items-center px-1"><div className="w-2.5 h-2.5 rounded-full bg-slate-350 absolute right-1"></div><div className="text-[8px] text-slate-450 font-mono scale-[0.95]">Off</div></div>
                  <div className="font-semibold text-[10px] truncate w-full text-center">Switch Toggle</div>
                </button>

                <button
                  onClick={() => addComponentToActiveScreen('slider')}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", "comp_type:slider")}
                  className="p-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-lg text-left text-xs transition-all flex flex-col gap-1 text-slate-600 hover:text-slate-900 cursor-grab active:cursor-grabbing shadow-2xs"
                >
                  <div className="w-full bg-slate-50 h-5 rounded border border-slate-200 flex items-center px-2"><div className="w-full bg-slate-200 h-0.5 relative"><div className="absolute left-1.5 -top-1 w-2 h-2 bg-indigo-600 rounded-full"></div></div></div>
                  <div className="font-semibold text-[10px] truncate w-full text-center">Range Slider</div>
                </button>

                <button
                  onClick={() => addComponentToActiveScreen('listitem')}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", "comp_type:listitem")}
                  className="p-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-lg text-left text-xs transition-all flex flex-col gap-1 text-slate-600 hover:text-slate-900 cursor-grab active:cursor-grabbing shadow-2xs"
                >
                  <div className="w-full h-5 bg-slate-50 rounded border border-slate-200 flex flex-col gap-0.5 justify-center px-1.5"><div className="bg-slate-400 h-0.5 w-full"></div><div className="bg-slate-300 h-0.5 w-2/3"></div></div>
                  <div className="font-semibold text-[10px] truncate w-full text-center">List Row Item</div>
                </button>

                <button
                  onClick={() => addComponentToActiveScreen('progressbar')}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", "comp_type:progressbar")}
                  className="p-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-lg text-left text-xs transition-all flex flex-col gap-1 text-slate-600 hover:text-slate-900 cursor-grab active:cursor-grabbing shadow-2xs"
                >
                  <div className="w-full bg-slate-100 h-5 rounded border border-slate-200 flex items-center px-2"><div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden"><div className="bg-indigo-600 h-full w-1/3"></div></div></div>
                  <div className="font-semibold text-[10px] truncate w-full text-center">Progress Meter</div>
                </button>

                <button
                  onClick={() => addComponentToActiveScreen('divider')}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", "comp_type:divider")}
                  className="p-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-lg text-left text-xs transition-all flex flex-col gap-1 text-slate-600 hover:text-slate-900 cursor-grab active:cursor-grabbing shadow-2xs"
                >
                  <div className="w-full bg-slate-50 h-5 rounded border border-slate-200 flex items-center justify-center"><div className="w-2/3 border-b border-dashed border-slate-300"></div></div>
                  <div className="font-semibold text-[10px] truncate w-full text-center">Visual Divider</div>
                </button>

                <button
                  onClick={() => addComponentToActiveScreen('calendar')}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", "comp_type:calendar")}
                  className="p-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-lg text-left text-xs transition-all flex flex-col gap-1 text-slate-600 hover:text-slate-900 cursor-grab active:cursor-grabbing shadow-2xs"
                >
                  <div className="bg-slate-50 border border-slate-200 h-5 w-full rounded flex items-center justify-center text-[9px] text-slate-500 font-mono">📅 MAY 2026</div>
                  <div className="font-semibold text-[10px] truncate w-full text-center">Calendar Picker</div>
                </button>

                <button
                  onClick={() => addComponentToActiveScreen('checkbox')}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", "comp_type:checkbox")}
                  className="p-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-lg text-left text-xs transition-all flex flex-col gap-1 text-slate-600 hover:text-slate-900 cursor-grab active:cursor-grabbing shadow-2xs"
                >
                  <div className="w-full bg-slate-50 h-5 rounded border border-slate-200 flex items-center px-1.5"><div className="w-2.5 h-2.5 rounded border border-slate-350 flex items-center justify-center bg-white"><span className="text-[7px] text-indigo-600 font-bold">✓</span></div><span className="text-[7px] text-slate-450 font-mono pl-1 scale-[0.9]">Checked</span></div>
                  <div className="font-semibold text-[10px] truncate w-full text-center">Checkbox Input</div>
                </button>

                <button
                  onClick={() => addComponentToActiveScreen('chart')}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", "comp_type:chart")}
                  className="p-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-lg text-left text-xs transition-all flex flex-col gap-1 text-slate-600 hover:text-slate-900 cursor-grab active:cursor-grabbing shadow-2xs"
                >
                  <div className="bg-slate-50 border border-slate-200 h-5 w-full rounded flex items-end justify-center px-1 pb-0.5 gap-0.5"><div className="w-1 bg-slate-200 h-1.5 rounded-t"></div><div className="w-1 bg-indigo-500 h-3 rounded-t"></div><div className="w-1 bg-slate-300 h-2 rounded-t"></div><div className="w-1 bg-indigo-400 h-4 rounded-t"></div></div>
                  <div className="font-semibold text-[10px] truncate w-full text-center">Spline Chart</div>
                </button>

                <button
                  onClick={() => addComponentToActiveScreen('timer')}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", "comp_type:timer")}
                  className="p-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-lg text-left text-xs transition-all flex flex-col gap-1 text-slate-600 hover:text-slate-900 cursor-grab active:cursor-grabbing shadow-2xs"
                >
                  <div className="bg-slate-50 border border-slate-200 h-5 w-full rounded flex items-center justify-center text-[9px] font-mono text-indigo-600">⏱️ 05:00</div>
                  <div className="font-semibold text-[10px] truncate w-full text-center">Timer Clock</div>
                </button>

                <button
                  onClick={() => addComponentToActiveScreen('map')}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", "comp_type:map")}
                  className="p-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-lg text-left text-xs transition-all flex flex-col gap-1 text-slate-600 hover:text-slate-900 cursor-grab active:cursor-grabbing shadow-2xs"
                >
                  <div className="bg-slate-50 border border-slate-200 h-5 w-full rounded flex items-center justify-center text-[9px] font-mono text-indigo-600">🗺️ MAP PREVIEW</div>
                  <div className="font-semibold text-[10px] truncate w-full text-center">Interactive Map</div>
                </button>

                <button
                  onClick={() => addComponentToActiveScreen('rating')}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", "comp_type:rating")}
                  className="p-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-lg text-left text-xs transition-all flex flex-col gap-1 text-slate-600 hover:text-slate-900 cursor-grab active:cursor-grabbing shadow-2xs"
                >
                  <div className="bg-slate-50 border border-slate-200 h-5 w-full rounded flex items-center justify-center text-[9px] font-mono text-amber-500">★★★★★</div>
                  <div className="font-semibold text-[10px] truncate w-full text-center">Star Ratings</div>
                </button>

                <button
                  onClick={() => addComponentToActiveScreen('chip')}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", "comp_type:chip")}
                  className="p-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-lg text-left text-xs transition-all flex flex-col gap-1 text-slate-600 hover:text-slate-900 cursor-grab active:cursor-grabbing shadow-2xs"
                >
                  <div className="bg-slate-50 border border-slate-200 h-5 w-full rounded flex items-center justify-center gap-1 px-1">
                    <span className="bg-indigo-100 text-[7px] text-indigo-700 px-1 rounded-full scale-[0.9]">All</span>
                    <span className="bg-slate-100 text-[7px] text-slate-550 px-1 rounded-full scale-[0.9]">Hub</span>
                  </div>
                  <div className="font-semibold text-[10px] truncate w-full text-center">Pill Chips</div>
                </button>

                <button
                  onClick={() => addComponentToActiveScreen('audio')}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", "comp_type:audio")}
                  className="p-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-lg text-left text-xs transition-all flex flex-col gap-1 text-slate-600 hover:text-slate-900 cursor-grab active:cursor-grabbing shadow-2xs"
                >
                  <div className="bg-slate-50 border border-slate-200 h-5 w-full rounded flex items-center justify-center text-[9px] font-mono text-indigo-650">🎵 MEDIA PLAYER</div>
                  <div className="font-semibold text-[10px] truncate w-full text-center">Audio Player</div>
                </button>

                <button
                  onClick={() => addComponentToActiveScreen('dropdown')}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", "comp_type:dropdown")}
                  className="p-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-lg text-left text-xs transition-all flex flex-col gap-1 text-slate-600 hover:text-slate-900 cursor-grab active:cursor-grabbing shadow-2xs"
                >
                  <div className="bg-slate-50 border border-slate-200 h-5 w-full rounded flex items-center justify-center text-[9px] font-mono text-slate-550">🔻 SPINNER</div>
                  <div className="font-semibold text-[10px] truncate w-full text-center">Spinner Dropdown</div>
                </button>

                <button
                  onClick={() => addComponentToActiveScreen('spacer')}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", "comp_type:spacer")}
                  className="p-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-lg text-left text-xs transition-all flex flex-col gap-1 text-slate-600 hover:text-slate-900 cursor-grab active:cursor-grabbing shadow-2xs col-span-2"
                >
                  <div className="w-full bg-slate-50 h-5 rounded border border-slate-200 flex items-center justify-center gap-1"><span className="text-slate-450 text-[10px]">↕</span><div className="w-16 border-t border-slate-350"></div><span className="text-slate-450 text-[10px]">↕</span></div>
                  <div className="font-semibold text-[10px] truncate w-full text-center">Layout Spacer Block</div>
                </button>
              </div>
            )}

            {libraryTab === 'presets' && (
              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                <p className="text-[10px] text-slate-450 font-medium px-1 mb-1">Preloaded layouts matching production apps. Tap or drag to insert.</p>
                
                <button
                  onClick={() => {
                    const cfg = getPresetConfig('search_bar');
                    if (cfg) addComponentPresetToActiveScreen(cfg.type, cfg.properties, cfg.label);
                  }}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", "preset_comp:search_bar")}
                  className="w-full p-2 bg-white hover:bg-indigo-50/20 border border-slate-250 hover:border-indigo-250 rounded-xl text-left transition-all flex items-center justify-between cursor-grab group shadow-3xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-sm">🔍</span>
                    <div className="flex flex-col truncate">
                      <span className="font-bold text-[11px] text-slate-800">Search Material Input</span>
                      <span className="text-[9px] text-slate-400">Reactive input, search placeholder hints</span>
                    </div>
                  </div>
                  <span className="text-slate-300 group-hover:text-indigo-600 font-bold font-mono text-xs pr-1">→</span>
                </button>

                <button
                  onClick={() => {
                    const cfg = getPresetConfig('promo_coupon');
                    if (cfg) addComponentPresetToActiveScreen(cfg.type, cfg.properties, cfg.label);
                  }}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", "preset_comp:promo_coupon")}
                  className="w-full p-2 bg-white hover:bg-indigo-50/20 border border-slate-250 hover:border-indigo-250 rounded-xl text-left transition-all flex items-center justify-between cursor-grab group shadow-3xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-sm">🎉</span>
                    <div className="flex flex-col truncate">
                      <span className="font-bold text-[11px] text-slate-800">Coupon Promo Banner</span>
                      <span className="text-[9px] text-slate-400">Accent highlight container, rich description</span>
                    </div>
                  </div>
                  <span className="text-slate-300 group-hover:text-indigo-600 font-bold font-mono text-xs pr-1">→</span>
                </button>

                <button
                  onClick={() => {
                    const cfg = getPresetConfig('action_buy');
                    if (cfg) addComponentPresetToActiveScreen(cfg.type, cfg.properties, cfg.label);
                  }}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", "preset_comp:action_buy")}
                  className="w-full p-2 bg-white hover:bg-indigo-50/20 border border-slate-250 hover:border-indigo-250 rounded-xl text-left transition-all flex items-center justify-between cursor-grab group shadow-3xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-sm">💳</span>
                    <div className="flex flex-col truncate">
                      <span className="font-bold text-[11px] text-slate-800">CTA Purchase Action</span>
                      <span className="text-[9px] text-slate-400">Thick bottom CTA button, predefined checkout toast</span>
                    </div>
                  </div>
                  <span className="text-slate-300 group-hover:text-indigo-600 font-bold font-mono text-xs pr-1">→</span>
                </button>

                <button
                  onClick={() => {
                    const cfg = getPresetConfig('user_badge');
                    if (cfg) addComponentPresetToActiveScreen(cfg.type, cfg.properties, cfg.label);
                  }}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", "preset_comp:user_badge")}
                  className="w-full p-2 bg-white hover:bg-indigo-50/20 border border-slate-250 hover:border-indigo-250 rounded-xl text-left transition-all flex items-center justify-between cursor-grab group shadow-3xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-sm">👤</span>
                    <div className="flex flex-col truncate">
                      <span className="font-bold text-[11px] text-slate-800">User Session Profile</span>
                      <span className="text-[9px] text-slate-400">Preset avatar grid, username, email summary</span>
                    </div>
                  </div>
                  <span className="text-slate-300 group-hover:text-indigo-600 font-bold font-mono text-xs pr-1">→</span>
                </button>

                <button
                  onClick={() => {
                    const cfg = getPresetConfig('theme_toggle');
                    if (cfg) addComponentPresetToActiveScreen(cfg.type, cfg.properties, cfg.label);
                  }}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", "preset_comp:theme_toggle")}
                  className="w-full p-2 bg-white hover:bg-indigo-50/20 border border-slate-250 hover:border-indigo-250 rounded-xl text-left transition-all flex items-center justify-between cursor-grab group shadow-3xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-sm">⚙️</span>
                    <div className="flex flex-col truncate">
                      <span className="font-bold text-[11px] text-slate-800">System Amoled Switch</span>
                      <span className="text-[9px] text-slate-400">Settings title with right toggle integration</span>
                    </div>
                  </div>
                  <span className="text-slate-300 group-hover:text-indigo-600 font-bold font-mono text-xs pr-1">→</span>
                </button>

                <button
                  onClick={() => {
                    const cfg = getPresetConfig('intensity_filter');
                    if (cfg) addComponentPresetToActiveScreen(cfg.type, cfg.properties, cfg.label);
                  }}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", "preset_comp:intensity_filter")}
                  className="w-full p-2 bg-white hover:bg-indigo-50/20 border border-slate-250 hover:border-indigo-250 rounded-xl text-left transition-all flex items-center justify-between cursor-grab group shadow-3xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-sm">🎚️</span>
                    <div className="flex flex-col truncate">
                      <span className="font-bold text-[11px] text-slate-800">Strength Control Slider</span>
                      <span className="text-[9px] text-slate-400">Interactive live % counter slider bar</span>
                    </div>
                  </div>
                  <span className="text-slate-300 group-hover:text-indigo-600 font-bold font-mono text-xs pr-1">→</span>
                </button>

                <button
                  onClick={() => {
                    const cfg = getPresetConfig('rewards_track');
                    if (cfg) addComponentPresetToActiveScreen(cfg.type, cfg.properties, cfg.label);
                  }}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", "preset_comp:rewards_track")}
                  className="w-full p-2 bg-white hover:bg-indigo-50/20 border border-slate-250 hover:border-indigo-250 rounded-xl text-left transition-all flex items-center justify-between cursor-grab group shadow-3xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-sm">🟢</span>
                    <div className="flex flex-col truncate">
                      <span className="font-bold text-[11px] text-slate-800">Emerald Rewards Tracker</span>
                      <span className="text-[9px] text-slate-400">Smooth state-bound tracker progress-bar</span>
                    </div>
                  </div>
                  <span className="text-slate-300 group-hover:text-indigo-600 font-bold font-mono text-xs pr-1">→</span>
                </button>

                <button
                  onClick={() => {
                    const cfg = getPresetConfig('map_directions');
                    if (cfg) addComponentPresetToActiveScreen(cfg.type, cfg.properties, cfg.label);
                  }}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", "preset_comp:map_directions")}
                  className="w-full p-2 bg-white hover:bg-indigo-50/20 border border-slate-250 hover:border-indigo-250 rounded-xl text-left transition-all flex items-center justify-between cursor-grab group shadow-3xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-sm">📍</span>
                    <div className="flex flex-col truncate">
                      <span className="font-bold text-[11px] text-slate-800">Map Directions Card</span>
                      <span className="text-[9px] text-slate-400">M3 directions item with simulated toast alert</span>
                    </div>
                  </div>
                  <span className="text-slate-300 group-hover:text-indigo-600 font-bold font-mono text-xs pr-1">→</span>
                </button>

                <button
                  onClick={() => {
                    const cfg = getPresetConfig('booking_calendar');
                    if (cfg) addComponentPresetToActiveScreen(cfg.type, cfg.properties, cfg.label);
                  }}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", "preset_comp:booking_calendar")}
                  className="w-full p-2 bg-white hover:bg-indigo-50/20 border border-slate-250 hover:border-indigo-250 rounded-xl text-left transition-all flex items-center justify-between cursor-grab group shadow-3xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-sm">📅</span>
                    <div className="flex flex-col truncate">
                      <span className="font-bold text-[11px] text-slate-800">Booking Appointment Calendar</span>
                      <span className="text-[9px] text-slate-400">Material grid day picker slot</span>
                    </div>
                  </div>
                  <span className="text-slate-300 group-hover:text-indigo-600 font-bold font-mono text-xs pr-1">→</span>
                </button>

                <button
                  onClick={() => {
                    const cfg = getPresetConfig('terms_checkbox');
                    if (cfg) addComponentPresetToActiveScreen(cfg.type, cfg.properties, cfg.label);
                  }}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", "preset_comp:terms_checkbox")}
                  className="w-full p-2 bg-white hover:bg-indigo-50/20 border border-slate-250 hover:border-indigo-250 rounded-xl text-left transition-all flex items-center justify-between cursor-grab group shadow-3xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-sm">☑️</span>
                    <div className="flex flex-col truncate">
                      <span className="font-bold text-[11px] text-slate-800">Policy Terms Agreement Checkbox</span>
                      <span className="text-[9px] text-slate-400">Interactive checkbox tick state toggle</span>
                    </div>
                  </div>
                  <span className="text-slate-300 group-hover:text-indigo-600 font-bold font-mono text-xs pr-1">→</span>
                </button>

                <button
                  onClick={() => {
                    const cfg = getPresetConfig('fitness_tracker_chart');
                    if (cfg) addComponentPresetToActiveScreen(cfg.type, cfg.properties, cfg.label);
                  }}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", "preset_comp:fitness_tracker_chart")}
                  className="w-full p-2 bg-white hover:bg-indigo-50/20 border border-slate-250 hover:border-indigo-250 rounded-xl text-left transition-all flex items-center justify-between cursor-grab group shadow-3xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-sm">📊</span>
                    <div className="flex flex-col truncate">
                      <span className="font-bold text-[11px] text-slate-800">Responsive Live Performance Chart</span>
                      <span className="text-[9px] text-slate-400">Monthly progress spline graph visuals</span>
                    </div>
                  </div>
                  <span className="text-slate-300 group-hover:text-indigo-600 font-bold font-mono text-xs pr-1">→</span>
                </button>

                <button
                  onClick={() => {
                    const cfg = getPresetConfig('meditation_timer');
                    if (cfg) addComponentPresetToActiveScreen(cfg.type, cfg.properties, cfg.label);
                  }}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", "preset_comp:meditation_timer")}
                  className="w-full p-2 bg-white hover:bg-indigo-50/20 border border-slate-250 hover:border-indigo-250 rounded-xl text-left transition-all flex items-center justify-between cursor-grab group shadow-3xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-sm">⏱️</span>
                    <div className="flex flex-col truncate">
                      <span className="font-bold text-[11px] text-slate-800">Interval Practice countdown Clock</span>
                      <span className="text-[9px] text-slate-400">Live timer counter with status checks</span>
                    </div>
                  </div>
                  <span className="text-slate-300 group-hover:text-indigo-600 font-bold font-mono text-xs pr-1">→</span>
                </button>
              </div>
            )}

            {/* NEW ROOM DB MANAGEMENT VIEW */}
            {libraryTab === 'database' && (
              <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 p-3 rounded-xl shadow-3xs space-y-2">
                  <h4 className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1.5">
                    <span>🗄️ Android Room SQLite Engine</span>
                  </h4>
                  <p className="text-[9.5px] leading-relaxed text-slate-500">
                    Define Room entities, insert simulated records, and drag database table views onto screens.
                  </p>
                </div>

                {/* DB Create Table Section */}
                <div className="border border-slate-200 bg-white p-3 rounded-xl space-y-2.5">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Create SQLite Table</span>
                  <div className="flex flex-col gap-1.5">
                    <input
                      type="text"
                      id="new-table-name"
                      placeholder="e.g. coffee_log"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <input
                      type="text"
                      id="new-table-columns"
                      placeholder="columns: title:TEXT, rating:INTEGER"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const nameEl = document.getElementById('new-table-name') as HTMLInputElement;
                        const colsEl = document.getElementById('new-table-columns') as HTMLInputElement;
                        if (!nameEl || !colsEl || !nameEl.value.trim()) return;

                        const name = nameEl.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
                        if (project.databaseTables?.some(t => t.name === name)) {
                          alert(`Table "${name}" already exists!`);
                          return;
                        }

                        // parse columns
                        const rawCols = colsEl.value.split(',');
                        const parsedColumns: any[] = [
                          { name: 'id', type: 'INTEGER', isPrimaryKey: true }
                        ];

                        rawCols.forEach(colField => {
                          const parts = colField.split(':');
                          const cName = parts[0]?.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
                          if (!cName || cName === 'id') return;
                          
                          let cType: 'TEXT' | 'INTEGER' | 'REAL' = 'TEXT';
                          const specType = parts[1]?.trim().toUpperCase();
                          if (specType === 'INTEGER') cType = 'INTEGER';
                          else if (specType === 'REAL' || specType === 'DOUBLE') cType = 'REAL';

                          parsedColumns.push({ name: cName, type: cType });
                        });

                        const newTable: any = {
                          id: `${name}_db`,
                          name,
                          columns: parsedColumns,
                          simulatedRows: [
                            { id: 1, ...parsedColumns.reduce((acc, c) => (c.isPrimaryKey ? acc : { ...acc, [c.name]: c.type === 'INTEGER' ? 1 : c.type === 'REAL' ? 9.99 : 'Sample Record' }), {}) }
                          ]
                        };

                        setProject(prev => ({
                          ...prev,
                          databaseTables: [...(prev.databaseTables || []), newTable]
                        }));

                        nameEl.value = '';
                        colsEl.value = '';
                        setSimulatedToasts(prev => [...prev, `Created Local SQLite Table '${name}' 📂`]);
                      }}
                      className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10.5px] rounded-lg transition-all text-center"
                    >
                      + Create Table Entity
                    </button>
                  </div>
                </div>

                {/* List Existing Tables */}
                <div className="space-y-2">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider px-1">Active SQLite Entities</span>
                  
                  {(!project.databaseTables || project.databaseTables.length === 0) ? (
                    <div className="text-center py-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                      <p className="text-xs text-slate-400 font-medium">No database table entities defined yet</p>
                    </div>
                  ) : (
                    project.databaseTables.map((table) => (
                      <div key={table.id} className="border border-slate-200 bg-white p-3 rounded-xl space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                          <div className="flex flex-col">
                            <span className="font-bold text-xs text-slate-800 font-mono">📁 {table.name}</span>
                            <span className="text-[9px] text-slate-400">{table.columns.length} columns, {table.simulatedRows.length} rows</span>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => {
                              const updated = project.databaseTables?.filter(t => t.id !== table.id);
                              setProject(prev => ({ ...prev, databaseTables: updated }));
                              setSimulatedToasts(prev => [...prev, `Dropped Table '${table.name}' 💥`]);
                            }}
                            className="text-red-500 hover:text-red-700 p-1 text-[10px]"
                            title="Drop Table"
                          >
                            ❌
                          </button>
                        </div>

                        {/* Schema list */}
                        <div className="flex flex-wrap gap-1">
                          {table.columns.map((c, i) => (
                            <span key={i} className="text-[8px] font-mono font-bold bg-slate-100 border border-slate-200 text-slate-600 rounded px-1.5 py-0.5">
                              {c.name} {c.isPrimaryKey ? '★PK' : `(${c.type})`}
                            </span>
                          ))}
                        </div>

                        {/* Draggable Component view for the Table */}
                        <div className="pt-1.5">
                          <button
                            onClick={() => {
                              // Add a datatable component dynamically mapped to this SQLite entity
                              const newComp: AndroidComponent = {
                                id: `datatable_${Math.floor(Math.random() * 10000)}`,
                                type: 'datatable',
                                properties: {
                                  text: `${table.name.charAt(0).toUpperCase() + table.name.slice(1)} Record Log`,
                                  bindState: table.name,
                                  margin: 12
                                }
                              };
                              const updatedScreens = project.screens.map(s => {
                                if (s.id === activeScreenId) {
                                  return { ...s, components: [...s.components, newComp] };
                                }
                                return s;
                              });
                              setProject(prev => ({ ...prev, screens: updatedScreens }));
                              setSelectedCompId(newComp.id);
                              setSimulatedToasts(prev => [...prev, `Mapped datatable view to simulate SQLite!`]);
                            }}
                            className="w-full text-center border border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/20 hover:bg-indigo-50/50 py-1.5 rounded-lg text-[10px] text-indigo-700 font-bold transition-all cursor-pointer"
                          >
                            📱 Place Grid Component Visualizer
                          </button>
                        </div>

                        {/* Insert Quick Row Section */}
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 space-y-1.5 text-left">
                          <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Insert Row Records</span>
                          <div className="flex flex-col gap-1.5">
                            {table.columns.filter(c => !c.isPrimaryKey).map(c => (
                              <div key={c.name} className="flex items-center gap-1 justify-between">
                                <span className="text-[9px] font-mono font-medium text-slate-500">{c.name}:</span>
                                <input
                                  type="text"
                                  id={`ins-${table.id}-${c.name}`}
                                  placeholder={c.type === 'INTEGER' ? 'boolean 0/1' : c.type === 'REAL' ? 'value, e.g. 19.9' : 'text detail'}
                                  className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px] w-24 focus:outline-none"
                                />
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                const newObj: Record<string, any> = {};
                                const nextId = Math.max(...table.simulatedRows.map((r: any) => Number(r.id) || 0), 0) + 1;
                                newObj.id = nextId;

                                table.columns.forEach(c => {
                                  if (c.isPrimaryKey) return;
                                  const el = document.getElementById(`ins-${table.id}-${c.name}`) as HTMLInputElement;
                                  const val = el ? el.value.trim() : '';
                                  
                                  if (c.type === 'INTEGER') {
                                    newObj[c.name] = parseInt(val) || 0;
                                  } else if (c.type === 'REAL') {
                                    newObj[c.name] = parseFloat(val) || 0.0;
                                  } else {
                                    newObj[c.name] = val || 'Record Entry';
                                  }

                                  if (el) el.value = '';
                                });

                                const updated = project.databaseTables?.map(t => {
                                  if (t.id === table.id) {
                                    return {
                                      ...t,
                                      simulatedRows: [...t.simulatedRows, newObj]
                                    };
                                  }
                                  return t;
                                });

                                setProject(prev => ({ ...prev, databaseTables: updated }));
                                setSimulatedToasts(prev => [...prev, `INSERT SUCCESS: Table '${table.name}'`]);
                              }}
                              className="w-full py-1 bg-slate-200 hover:bg-slate-300 rounded font-bold text-[9px] text-slate-700 transition"
                            >
                              Execute SQL INSERT
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

          </div>
        </aside>

        {/* PANEL LEVEL 2: Main Workspace Canvas & Code Workspace Area */}
        <main className={`${mobileActivePanel === 'center' ? 'flex flex-1' : 'hidden'} xl:flex xl:flex-1 bg-slate-100 flex-col relative`} id="canvas_and_tabs">
          
          {/* Subheader: Switch tab modes */}
          <div className="px-3 sm:px-6 py-2 sm:py-2.5 bg-white border-b border-slate-200 flex flex-col sm:flex-row gap-2 sm:gap-0 sm:items-center sm:justify-between z-10 shadow-3xs">
            <div className="flex items-center gap-1 bg-slate-50 p-1 border border-slate-200 rounded-xl overflow-x-auto">
              <button
                onClick={() => setActiveTab('canvas')}
                className={`px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'canvas' 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Smartphone size={13} />
                <span><span className="hidden md:inline font-bold">Pixel 8 </span>Simulator</span>
              </button>

              <button
                onClick={() => setActiveTab('code')}
                className={`px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'code' 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Code size={13} />
                <span><span className="hidden md:inline font-bold">Kotlin Compose </span>Code</span>
              </button>

              <button
                onClick={() => setActiveTab('apk')}
                className={`px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'apk' 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <FolderLock size={13} />
                <span>APK Guide</span>
              </button>
            </div>

            {/* Simulated Variable state badge list in simulator mode */}
            {isPlayMode && (
              <div className="hidden md:flex items-center gap-1.5 overflow-x-auto max-w-[50%]">
                <span className="text-[9px] font-bold text-amber-600 font-mono tracking-wider uppercase shrink-0">State Scope:</span>
                {Object.keys(simulatedState).map((k) => (
                  <span key={k} className="text-[10px] font-mono bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 rounded-lg truncate max-w-[120px]" title={`${k}=${simulatedState[k]}`}>
                    {k}: <span className="text-indigo-600 font-bold">{simulatedState[k]}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* MAIN PREVIEW AND EDITOR VIEWER SPLIT */}
          <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto min-h-0 bg-slate-50">
            
            {/* VIEW MODE 1: Interactive Canvas Phone Mockup */}
            {activeTab === 'canvas' && (
              <div className="relative flex flex-col items-center justify-center py-4 w-full h-full max-h-[820px]">
                
                {/* Visual Emulator container */}
                <div className="relative w-full max-w-[360px] h-[640px] sm:h-[720px] bg-slate-950 rounded-[40px] sm:rounded-[48px] p-2.5 sm:p-3 shadow-2xl border-4 sm:border-6 border-slate-900 flex flex-col justify-between overflow-hidden shrink-0">
                  
                  {/* Phone Notch/Camera punchhole */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 w-4 h-4 bg-black rounded-full z-50"></div>

                  {/* Android Operating system top status bar */}
                  <div className="px-5 pt-1.5 pb-1 flex justify-between items-center text-[10px] font-mono text-slate-400 bg-slate-950 select-none shrink-0 font-bold">
                    <span>14:15</span>
                    <div className="flex items-center gap-1.5">
                      <span>📶 5G</span>
                      <span>🔋 96%</span>
                    </div>
                  </div>

                  {/* INNER PHYSICAL SCREEN VIEW */}
                  <div className="flex-1 bg-white flex flex-col relative overflow-hidden text-slate-900 rounded-3xl">
                    
                    {/* Simulated App Tool/Action bar with theme coloring */}
                    <div 
                      className="px-4 py-3.5 flex items-center justify-between text-white shadow-xs shrink-0"
                      style={{ backgroundColor: project.themeColor }}
                    >
                      <div className="flex items-center gap-2.5">
                        {simulatedBackStack.length > 0 && isPlayMode && (
                          <button
                            onClick={() => {
                              const stack = [...simulatedBackStack];
                              const prev = stack.pop();
                              if (prev) {
                                setSimulatedBackStack(stack);
                                setActiveScreenId(prev);
                              }
                            }}
                            className="text-white hover:opacity-80 transition-opacity bg-white/10 p-1 rounded-lg"
                          >
                            ←
                          </button>
                        )}
                        <span className="font-semibold text-base font-sans leading-none">{activeScreen ? activeScreen.name : "Android Application"}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm bg-black/10 px-2 py-0.5 rounded-full font-mono text-[10px]">
                        {activeScreen ? `.ui/${activeScreen.id}` : ''}
                      </div>
                    </div>

                    {/* VIRTUAL SCREEN BODY CONTAINER */}
                    <div 
                      id="simulator_components_list"
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      onDragOver={(e) => { if (!isPlayMode) e.preventDefault(); }}
                      onDrop={(e) => {
                        if (isPlayMode) return;
                        e.preventDefault();
                        const data = e.dataTransfer.getData("text/plain");
                        if (data) {
                          if (data.startsWith("comp_type:")) {
                            const type = data.replace("comp_type:", "") as ComponentType;
                            addComponentToActiveScreen(type);
                          } else if (data.startsWith("preset_comp:")) {
                            const key = data.replace("preset_comp:", "");
                            const cfg = getPresetConfig(key);
                            if (cfg) {
                              addComponentPresetToActiveScreen(cfg.type, cfg.properties, cfg.label);
                            }
                          }
                        }
                      }}
                      className="flex-1 p-3 overflow-y-auto flex flex-col gap-2 bg-slate-50 relative"
                    >
                      
                      {activeScreen && activeScreen.components.length === 0 ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                          <Layout size={32} className="stroke-1 text-slate-300 mb-2" />
                          <p className="text-xs font-semibold">Empty Screen</p>
                          <p className="text-[10px] text-slate-400 mt-1 max-w-[180px]">Add visual widgets from the side Chest to start designing this screen layout.</p>
                        </div>
                      ) : (
                        activeScreen?.components.map((comp, idx) => {
                          const isSelected = selectedCompId === comp.id && !isPlayMode;
                          const isDraggingThis = touchDragIdx === idx;
                          const isOverThis = touchDragOverIdx === idx && touchDragIdx !== null && touchDragIdx !== idx;
                          const reorderBorderClass = isOverThis
                            ? (touchDragOverIdx < touchDragIdx ? 'border-t-4 border-indigo-500 pt-1' : 'border-b-4 border-indigo-500 pb-1')
                            : '';

                          return (
                            <div
                              key={comp.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isPlayMode) {
                                  setSelectedCompId(comp.id);
                                } else {
                                  executePlayAction(comp);
                                }
                              }}
                              draggable={!isPlayMode}
                              onDragStart={(e) => {
                                if (isPlayMode) return;
                                e.dataTransfer.setData("text/plain", `reorder_idx:${idx}`);
                              }}
                              onDragOver={(e) => {
                                if (!isPlayMode) e.preventDefault();
                              }}
                              onDrop={(e) => {
                                if (isPlayMode) return;
                                e.preventDefault();
                                const data = e.dataTransfer.getData("text/plain");
                                if (!data) return;
                                if (data.startsWith("comp_type:")) {
                                  const type = data.replace("comp_type:", "") as ComponentType;
                                  insertComponentToActiveScreen(type, idx);
                                } else if (data.startsWith("preset_comp:")) {
                                  const key = data.replace("preset_comp:", "");
                                  const cfg = getPresetConfig(key);
                                  if (cfg) {
                                    insertComponentPresetToActiveScreen(cfg.type, cfg.properties, idx, cfg.label);
                                  }
                                } else if (data.startsWith("reorder_idx:")) {
                                  const fromIdx = parseInt(data.replace("reorder_idx:", ""), 10);
                                  if (!isNaN(fromIdx) && fromIdx !== idx) {
                                    moveComponentToPosition(fromIdx, idx);
                                  }
                                }
                              }}
                              className={`relative group rounded-md transition-all ${
                                isPlayMode ? 'cursor-pointer active:scale-[0.98]' : 'hover:outline hover:outline-2 hover:outline-dashed hover:outline-slate-400/80 cursor-grab active:cursor-grabbing'
                              } ${
                                isSelected ? 'ring-2 ring-indigo-500 bg-indigo-50/20' : ''
                              } ${
                                isDraggingThis ? 'opacity-40 ring-2 ring-dashed ring-indigo-400 scale-[0.97] bg-indigo-50/10' : ''
                              } ${reorderBorderClass}`}
                            >
                              {/* Design Controls Hover & Selection banner */}
                              {!isPlayMode && (
                                <div className={`absolute top-0 right-0 z-20 ${isSelected ? 'flex' : 'hidden group-hover:flex'} items-center gap-1 bg-slate-800 text-white rounded-bl-lg px-2 py-1 text-[10px] font-mono shadow-sm`}>
                                  <span className="font-sans mr-1 font-bold text-[9px] uppercase tracking-wide opacity-80">{comp.type}</span>
                                  
                                  {/* Grip Touch Drag handle */}
                                  <div
                                    onTouchStart={(e) => handleTouchStart(e, idx)}
                                    className="p-1 hover:bg-slate-700 text-slate-300 hover:text-white rounded cursor-grab active:cursor-grabbing"
                                    title="Touch & drag vertical reorder"
                                  >
                                    <GripVertical size={11} />
                                  </div>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      moveComponent(idx, 'up');
                                    }}
                                    disabled={idx === 0}
                                    className="p-0.5 hover:bg-slate-700 disabled:opacity-30 rounded text-slate-300"
                                    title="Move Up"
                                  >
                                    <ArrowUp size={8} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      moveComponent(idx, 'down');
                                    }}
                                    disabled={idx === activeScreen.components.length - 1}
                                    className="p-0.5 hover:bg-slate-700 disabled:opacity-30 rounded text-slate-300"
                                    title="Move Down"
                                  >
                                    <ArrowDown size={8} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteComponent(comp.id);
                                    }}
                                    className="p-0.5 hover:bg-red-950 text-rose-400 rounded"
                                    title="Delete"
                                  >
                                    <Trash2 size={8} />
                                  </button>
                                </div>
                              )}

                              {/* CANVAS ELEMENT PARSER RENDERING */}
                              <div className="w-full">
                                {renderSimulatedComponent(comp)}
                              </div>

                              {/* INLINE TEXT QUICK-EDITOR */}
                              {isSelected && (
                                <div 
                                  className="mt-1 px-3 py-2 bg-slate-900 border border-slate-750 shadow-2xl rounded-lg text-slate-100 space-y-2 select-none"
                                  onClick={(e) => e.stopPropagation()}
                                  onDragStart={(e) => e.stopPropagation()}
                                  draggable={false}
                                >
                                  <div className="flex items-center justify-between border-b border-slate-800 pb-1 text-[10px] text-indigo-400 font-bold font-mono tracking-tight">
                                    <span>QUICK WIDGET PROPERTY EDITOR</span>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); setSelectedCompId(null); }}
                                      className="hover:text-white px-1 font-sans"
                                      title="Close quick values editor"
                                    >
                                      ✕
                                    </button>
                                  </div>

                                  {comp.properties.text !== undefined && (
                                    <div className="space-y-0.5">
                                      <label className="text-[9px] text-slate-400 font-bold block">Widget Label / Value text:</label>
                                      <input
                                        type="text"
                                        value={comp.properties.text}
                                        onChange={(e) => updateSelectedCompProperty('text', e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 text-white rounded px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-505 focus:outline-none focus:border-indigo-550 font-sans tracking-wide"
                                        placeholder="Type layout text label..."
                                      />
                                    </div>
                                  )}

                                  {comp.properties.placeholder !== undefined && (
                                    <div className="space-y-0.5">
                                      <label className="text-[9px] text-slate-400 font-bold block">
                                        {comp.type === 'textinput' ? 'Placeholder hint text:' : 'Subtitle/Description text:'}
                                      </label>
                                      <input
                                        type="text"
                                        value={comp.properties.placeholder}
                                        onChange={(e) => updateSelectedCompProperty('placeholder', e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 text-white rounded px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-505 focus:outline-none focus:border-indigo-550 font-sans tracking-wide"
                                        placeholder="Type description content..."
                                      />
                                    </div>
                                  )}

                                  {comp.type === 'button' && comp.properties.actionValue !== undefined && (
                                    <div className="space-y-0.5">
                                      <label className="text-[9px] text-slate-400 font-bold block">Toast alert notification on tap:</label>
                                      <input
                                        type="text"
                                        value={comp.properties.actionValue}
                                        onChange={(e) => updateSelectedCompProperty('actionValue', e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 text-white rounded px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-505 focus:outline-none focus:border-indigo-550 font-sans tracking-wide"
                                        placeholder="e.g. Action processed!"
                                      />
                                    </div>
                                  )}

                                  <div className="flex items-center justify-between text-[9px] text-slate-400 font-medium">
                                    <span>Material attributes are in the right sidebar</span>
                                    <span className="font-mono text-slate-300 bg-slate-800 px-1 py-0.2 rounded border border-slate-700">{comp.id}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}

                    </div>

                    {/* INTERACTIVE ALERTS/TOAST SLIDER POPUPS IN EMULATOR */}
                    <AnimatePresence>
                      {simulatedToasts.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 20 }}
                          className="absolute bottom-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-slate-100 text-[11px] font-bold py-1.5 px-4 rounded-full shadow-lg max-w-[85%] text-center tracking-wide"
                        >
                          {simulatedToasts[simulatedToasts.length - 1]}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* PHYSICAL EMULATOR SYSTEM BOTTOM BUTTONS BAR */}
                    <div className="px-10 py-2.5 bg-slate-950 text-slate-500 flex justify-between items-center text-xs shrink-0 select-none">
                      <button 
                        onClick={() => {
                          if (isPlayMode && simulatedBackStack.length > 0) {
                            const stack = [...simulatedBackStack];
                            const prev = stack.pop();
                            if (prev) {
                              setSimulatedBackStack(stack);
                              setActiveScreenId(prev);
                            }
                          }
                        }}
                        className="hover:text-slate-200 transition-colors cursor-pointer"
                        title="Back Button"
                      >
                        ◀
                      </button>
                      <button 
                        onClick={() => {
                          if (isPlayMode) {
                            setActiveScreenId(project.screens[0].id);
                            setSimulatedBackStack([]);
                          }
                        }}
                        className="hover:text-slate-200 cursor-pointer"
                        title="Home Button"
                      >
                        ●
                      </button>
                      <button 
                        className="hover:text-slate-200 cursor-pointer"
                        title="Recents Menu"
                      >
                        ■
                      </button>
                    </div>

                  </div>
                </div>

                {/* Info Tip badge */}
                <div className="mt-4 flex items-center gap-2 bg-white border border-slate-200 p-2.5 rounded-xl max-w-sm text-[10px] text-slate-500 shadow-2xs font-medium">
                  <Lightbulb size={13} className="text-amber-500 shrink-0" />
                  <span>
                    {!isPlayMode 
                      ? "DESIGNER MODE: Click workspace widgets on the phone screen to customize their Material attributes and binding states."
                      : "LIVE PREVIEW: Interactive mode. Clicking elements simulates reactive states, navigation flows, and custom toasts on a device."}
                  </span>
                </div>

              </div>
            )}

            {/* VIEW MODE 2: Code Export & Jetpack Compose inspection Panel */}
            {activeTab === 'code' && (
              <div className="w-full h-full flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm" id="code_viewer">
                {/* File tab selectors */}
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 overflow-x-auto">
                    {[
                      { key: 'Screen.kt', label: `${activeScreen.name.replace(/\s+/g, '')}Screen.kt`, icon: '📱' },
                      { key: 'StateManager.kt', label: 'GlobalStateManager.kt', icon: '⚙️' },
                      { key: 'MainActivity.kt', label: 'MainActivity.kt', icon: '💻' },
                      { key: 'Theme.kt', label: 'Theme.kt', icon: '🎨' }
                    ].map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setSelectedKotlinFile(f.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          selectedKotlinFile === f.key 
                            ? 'bg-indigo-650 bg-indigo-600 text-white shadow-xs' 
                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <span>{f.icon}</span>
                        <span>{f.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                    <Check size={12} className="text-emerald-600" />
                    <span>STABLE SYSTEM: KOMLING</span>
                  </div>
                </div>

                {/* Screen source code terminal output */}
                <div className="flex-1 p-4 overflow-auto bg-slate-950 font-mono text-[11px] text-slate-300 leading-relaxed max-h-[580px]" id="kotlin_source_editor">
                  <pre className="whitespace-pre">
                    {getKotlinEditorContent()}
                  </pre>
                </div>
              </div>
            )}

            {/* VIEW MODE 3: Detailed Step-by-Step Native Compilation Setup */}
            {activeTab === 'apk' && (
              <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 overflow-y-auto max-h-[660px]" id="step_by_step_apk">
                
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <FolderLock size={20} className="text-indigo-600" />
                  <span>Build APK & Run on Real Android Devices</span>
                </h2>

                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl space-y-3">
                  <h3 className="text-xs font-bold text-indigo-800 flex items-center gap-1.5">
                    <Smartphone size={13} className="text-indigo-600" />
                    <span>1. Dynamic Simulator Companion Preview</span>
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Rather than installing heavy SDK tools, you can preview your custom applications directly on your physical Android phone using our **Dynamic Companion APK installer**. 
                  </p>
                  <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                    <div className="bg-white p-3 rounded-lg w-28 h-28 shrink-0 flex items-center justify-center border-2 border-indigo-200 font-mono text-[9px] text-center text-slate-800 font-bold select-none leading-normal shadow-sm">
                      AI STUDIO SYNC QR
                    </div>
                    <div className="space-y-2">
                      <p className="text-[11px] text-slate-500 font-bold">
                        Scan this dynamic sync route inside the preview companion, or type coordinate sync URL in:
                      </p>
                      <code className="block text-xs font-mono bg-slate-50 px-3 py-1 text-indigo-700 select-all border border-indigo-100 rounded-lg">
                        https://ais-pre-dsltd7j2bik2frcdjgxjk3-477084327677.asia-southeast1.run.app/api/assets/companion.apk
                      </code>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 border border-slate-205 rounded-xl space-y-2.5">
                    <h3 className="text-xs font-bold font-mono text-indigo-700 flex items-center gap-1.5">
                      <FileCode size={13} />
                      <span>Kotlin Project Structure</span>
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Our compiler exports clean source folders with **libs.versions.toml version catalogs**, matching standard gradle structures recommended by Gradle team.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-205 rounded-xl space-y-2.5">
                    <h3 className="text-xs font-bold font-mono text-purple-700 flex items-center gap-1.5">
                      <Settings size={13} />
                      <span>One-Click Android Studio Import</span>
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Download the project zip workspace, unzip, launch standard Android Studio compile sequences, and build clean APK output directories with zero config setups.
                    </p>
                  </div>
                </div>

                {/* Exporter triggers */}
                <div className="flex justify-end p-2">
                  <button
                    onClick={downloadWorkspaceZip}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Download size={14} />
                    <span>Download Project ZIP & Start Compiling</span>
                  </button>
                </div>

              </div>
            )}

          </div>
        </main>

        {/* PANEL LEVEL 3: Right Inspector (Attributes editing / variable state maps) */}
        <aside className={`${mobileActivePanel === 'right' ? 'flex flex-1' : 'hidden'} xl:flex xl:w-80 xl:shrink-0 bg-white border-l border-slate-200 flex-col overflow-y-auto`} id="side_panel_right">
          
          {/* Active Screen configurations */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/40">
            <h3 className="text-[10px] font-bold tracking-widest text-slate-400 font-mono uppercase mb-3 flex items-center gap-1.5">
              <Settings size={12} className="text-slate-400" />
              <span>Project Options</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Android App Name</label>
                <input
                  type="text"
                  value={project.appName}
                  onChange={(e) => setProject({ ...project, appName: e.target.value })}
                  className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none font-medium shadow-2xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Target Package Name</label>
                <input
                  type="text"
                  value={project.packageName}
                  onChange={(e) => setProject({ ...project, packageName: e.target.value })}
                  className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none font-mono shadow-2xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">M3 Brand Accent Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={project.themeColor}
                    onChange={(e) => setProject({ ...project, themeColor: e.target.value })}
                    className="w-8 h-8 bg-white border border-slate-200 rounded-lg overflow-hidden cursor-pointer shrink-0"
                  />
                  <input
                    type="text"
                    value={project.themeColor}
                    onChange={(e) => setProject({ ...project, themeColor: e.target.value })}
                    className="flex-1 bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none font-mono uppercase font-bold shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Android Home Screen</label>
                <select
                  value={project.initialScreenId}
                  onChange={(e) => setProject({ ...project, initialScreenId: e.target.value })}
                  className="w-full bg-white border border-slate-200 cursor-pointer rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none font-medium shadow-2xs"
                >
                  {project.screens.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ATTRIBUTE INSPECTOR BLOCK FOR SELECTED CANVAS ELEMENT */}
          <div className="p-4 border-b border-slate-200 flex-1 bg-white">
            <h3 className="text-[10px] font-bold tracking-widest text-slate-400 font-mono uppercase mb-3 flex items-center gap-1.5">
              <Layers size={12} className="text-indigo-600" />
              <span>Attributes Inspector</span>
            </h3>

            {selectedCompId && activeScreen ? (
              (() => {
                const selectedComp = activeScreen.components.find(c => c.id === selectedCompId);
                if (!selectedComp) return <p className="text-xs text-slate-500">No element selected</p>;

                const props = selectedComp.properties || {};

                return (
                  <div className="space-y-4 text-xs">
                    <div className="p-2.5 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-center justify-between shadow-2xs">
                      <span className="font-mono text-indigo-700 font-extrabold uppercase text-[9px]">{selectedComp.type} Widget</span>
                      <span className="font-mono text-[9px] text-slate-400 font-semibold">{selectedComp.id}</span>
                    </div>

                    {/* Generic configurations */}
                    {props.text !== undefined && (
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Widget Label Text</label>
                        <input
                          type="text"
                          value={props.text}
                          onChange={(e) => updateSelectedCompProperty('text', e.target.value)}
                          className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none font-medium shadow-2xs"
                          placeholder="Supports {var} logic interpolations"
                        />
                      </div>
                    )}

                    {props.placeholder !== undefined && (
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Body Text / Placeholder</label>
                        <textarea
                          value={props.placeholder}
                          onChange={(e) => updateSelectedCompProperty('placeholder', e.target.value)}
                          className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none h-16 resize-none font-medium shadow-2xs"
                        />
                      </div>
                    )}

                    {props.fontSize !== undefined && (
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Font Size sp ({props.fontSize}sp)</label>
                        <input
                          type="range"
                          min={10}
                          max={36}
                          value={props.fontSize}
                          onChange={(e) => updateSelectedCompProperty('fontSize', parseInt(e.target.value))}
                          className="w-full accent-indigo-600 bg-slate-100 rounded-lg appearance-none h-1 cursor-pointer"
                        />
                      </div>
                    )}

                    {props.textColor !== undefined && (
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Text Color Hex</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={props.textColor}
                            onChange={(e) => updateSelectedCompProperty('textColor', e.target.value)}
                            className="bg-transparent w-7 h-7 rounded overflow-hidden shadow-2xs shrink-0"
                          />
                          <input
                            type="text"
                            value={props.textColor}
                            onChange={(e) => updateSelectedCompProperty('textColor', e.target.value)}
                            className="flex-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-mono focus:outline-none shadow-2xs"
                          />
                        </div>
                      </div>
                    )}

                    {props.backgroundColor !== undefined && (
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Widget Background Hex</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={props.backgroundColor}
                            onChange={(e) => updateSelectedCompProperty('backgroundColor', e.target.value)}
                            className="bg-transparent w-7 h-7 rounded overflow-hidden shadow-2xs shrink-0"
                          />
                          <input
                            type="text"
                            value={props.backgroundColor}
                            onChange={(e) => updateSelectedCompProperty('backgroundColor', e.target.value)}
                            className="flex-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-mono focus:outline-none shadow-2xs"
                          />
                        </div>
                      </div>
                    )}

                    {props.margin !== undefined && (
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Outer boundary Margin dp ({props.margin}dp)</label>
                        <input
                          type="range"
                          min={0}
                          max={32}
                          step={4}
                          value={props.margin}
                          onChange={(e) => updateSelectedCompProperty('margin', parseInt(e.target.value))}
                          className="w-full accent-indigo-600 bg-slate-100 h-1 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    )}

                    {props.height !== undefined && (
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Height Override dp ({props.height === 0 ? "wrap_content" : `${props.height}dp`})</label>
                        <input
                          type="range"
                          min={0}
                          max={300}
                          step={10}
                          value={props.height || 0}
                          onChange={(e) => updateSelectedCompProperty('height', parseInt(e.target.value))}
                          className="w-full accent-indigo-600 bg-slate-100 h-1 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    )}

                    {props.style !== undefined && selectedComp.type === 'text' && (
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Text variant style</label>
                        <select
                          value={props.style}
                          onChange={(e) => updateSelectedCompProperty('style', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none text-xs text-slate-800 font-medium cursor-pointer shadow-2xs"
                        >
                          <option value="h1">Display Title (h1)</option>
                          <option value="h2">Section Title (h2)</option>
                          <option value="body">Standard Body Text (body)</option>
                          <option value="caption">Indicator Badge caption</option>
                        </select>
                      </div>
                    )}

                    {/* Variable Reactives model bindings */}
                    {props.bindState !== undefined && (
                      <div>
                        <label className="text-[10px] font-bold text-indigo-700 font-mono uppercase block">Reactive Bind Variable</label>
                        <select
                          value={props.bindState}
                          onChange={(e) => updateSelectedCompProperty('bindState', e.target.value)}
                          className="w-full bg-white border border-indigo-200 rounded-xl px-2.5 py-1.5 focus:outline-none text-xs text-indigo-900 font-bold cursor-pointer shadow-2xs"
                        >
                          <option value="">-- No reactive connection --</option>
                          {project.variables.map(v => (
                            <option key={v.name} value={v.name}>{v.name} ({v.type})</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Button Action configurations */}
                    {props.actionType !== undefined && (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3 shadow-2xs">
                        <label className="text-[10px] font-bold text-amber-600 font-mono uppercase tracking-wider block">OnClick Action Behavior</label>
                        
                        <div>
                          <label className="text-[9px] text-slate-400 font-bold block mb-1">Action Type</label>
                          <select
                            value={props.actionType}
                            onChange={(e) => updateSelectedCompProperty('actionType', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 cursor-pointer focus:outline-none font-semibold"
                          >
                            <option value="none">No Action Callback</option>
                            <option value="toast">Show simulated Toast popup</option>
                            <option value="navigate">Navigate route onto Screen</option>
                            <option value="dialog">Show popup alert Dialog</option>
                            <option value="state_increment">Increment state counter (+1)</option>
                            <option value="state_decrement">Decrement state counter (-1)</option>
                            <option value="link">Open static Web url link</option>
                          </select>
                        </div>

                        {props.actionType !== 'none' && (
                          <div>
                            <label className="text-[9px] text-slate-400 font-bold block mb-1">
                              {props.actionType === 'navigate' ? 'Select Destination Screen' :
                               props.actionType === 'state_increment' || props.actionType === 'state_decrement' ? 'Select Target Variable' :
                               'Action Data payload string'}
                            </label>
                            
                            {props.actionType === 'navigate' ? (
                              <select
                                value={props.actionValue}
                                onChange={(e) => updateSelectedCompProperty('actionValue', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 font-semibold cursor-pointer focus:outline-none"
                              >
                                {project.screens.map(s => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                              </select>
                            ) : props.actionType === 'state_increment' || props.actionType === 'state_decrement' ? (
                              <select
                                value={props.actionValue}
                                onChange={(e) => updateSelectedCompProperty('actionValue', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 font-semibold cursor-pointer focus:outline-none"
                              >
                                {project.variables.filter(v => v.type === 'number').map(v => (
                                  <option key={v.name} value={v.name}>{v.name}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                value={props.actionValue}
                                onChange={(e) => updateSelectedCompProperty('actionValue', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 font-semibold focus:outline-none"
                                placeholder={props.actionType === 'toast' ? 'Enter toast alert text' : 'Data string...'}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Delete button */}
                    <button
                      onClick={() => deleteComponent(selectedComp.id)}
                      className="w-full py-1.5 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-600 font-bold rounded-xl transition flex items-center justify-center gap-1 cursor-pointer text-xs"
                    >
                      <Trash2 size={12} />
                      <span>Remove Component Widget</span>
                    </button>

                  </div>
                );
              })()
            ) : (
              <div className="py-12 text-center text-slate-450 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 p-4">
                <Smartphone size={20} className="mx-auto text-slate-350 mb-2 stroke-1" />
                <p className="text-xs font-bold text-slate-500">No element selected</p>
                <p className="text-[10px] text-slate-400 mt-1">Select any component widget on the device screen model to configure its custom Material Design fields.</p>
              </div>
            )}
          </div>

          {/* GLOBAL VARIABLE/STATE DECLARATOR */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/40">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-bold tracking-widest text-slate-400 font-mono uppercase flex items-center gap-1.5">
                <FolderLock size={12} className="text-slate-400" />
                <span>Global State variables</span>
              </h3>
              <button
                onClick={addVariable}
                className="p-1 hover:bg-slate-100 rounded-lg text-indigo-600 hover:text-indigo-700 transition cursor-pointer"
                title="Add Variable"
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {project.variables.length === 0 ? (
                <p className="text-[10px] text-slate-400 italic">No variables declared yet.</p>
              ) : (
                project.variables.map((v, idx) => (
                  <div key={idx} className="p-2 border border-slate-200 bg-white rounded-xl flex flex-col gap-1.5 shadow-2xs">
                    <div className="flex items-center justify-between gap-1.5">
                      <input
                        type="text"
                        value={v.name}
                        onChange={(e) => updateVariable(idx, 'name', e.target.value)}
                        className="bg-transparent text-[11px] text-slate-800 border-0 border-b border-indigo-100 focus:border-indigo-400 focus:outline-none font-mono font-bold w-24"
                        placeholder="State name"
                      />
                      
                      <select
                        value={v.type}
                        onChange={(e) => updateVariable(idx, 'type', e.target.value as any)}
                        className="bg-white border border-slate-200 rounded text-[9px] text-indigo-600 font-bold focus:outline-none cursor-pointer"
                      >
                        <option value="string">String</option>
                        <option value="number">Number</option>
                        <option value="boolean">Boolean</option>
                      </select>

                      <button
                        onClick={() => deleteVariable(idx)}
                        className="p-0.5 hover:bg-slate-100 text-slate-400 hover:text-rose-600 rounded transition"
                        title="Delete variable"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] text-slate-400 font-bold font-mono">Default:</span>
                      <input
                        type="text"
                        value={v.defaultValue}
                        onChange={(e) => updateVariable(idx, 'defaultValue', e.target.value)}
                        className="bg-slate-50 px-1.5 py-0.5 text-[9px] rounded text-slate-700 border border-slate-200 hover:border-slate-300 focus:outline-none font-mono flex-1"
                        placeholder="Default state value"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </aside>

      </div>

      {/* ALERT DIALOG MODAL IF TRIGGERED */}
      {activeAlert && (
        <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Info size={16} className="text-indigo-600" />
              <span>Developer Workspace Alert</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed font-sans font-medium">{activeAlert}</p>
            <div className="flex justify-end pt-1">
              <button
                onClick={() => setActiveAlert(null)}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Dismiss / Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW PROJECT GENERATION DIALOG MODAL */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-slate-900/55 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="p-2 bg-rose-50 rounded-xl text-rose-600">
                <Trash2 size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-905 text-slate-900 font-sans">Start Totally New Project</h3>
                <p className="text-[10px] text-slate-400 font-medium">This will clear all active workspace designs and initial APK screens.</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Alert note */}
              <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-2xl text-[11px] text-slate-700 leading-relaxed font-medium">
                ⚠️ <span className="font-bold text-amber-900">Warning:</span> Resetting erases the current work canvas. It cleans up all generated files, component schemas, state variables, and restarts with a totally custom blank app.
              </div>

              {/* App properties form */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider block">1. Application Title</label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => {
                      setNewProjectName(e.target.value);
                      const slug = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '');
                      setNewProjectPkg(`com.example.${slug || 'customapp'}`);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl px-3 py-2 text-xs focus:outline-none transition-all font-sans text-slate-800"
                    placeholder="e.g. Daily Coffee Hub, Task Master"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider block">2. Android Package Namespace</label>
                  <input
                    type="text"
                    value={newProjectPkg}
                    onChange={(e) => setNewProjectPkg(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl px-3 py-2 text-xs focus:outline-none transition-all font-mono text-slate-800 text-[11px]"
                    placeholder="e.g. com.example.coffeehub"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider block">3. Brand Accent M3 Theme Color</label>
                  <div className="grid grid-cols-6 gap-2 pt-1">
                    {[
                      { hex: "#6366f1", label: "Indigo" },
                      { hex: "#06b6d4", label: "Sky" },
                      { hex: "#10b981", label: "Emerald" },
                      { hex: "#eab308", label: "Amber" },
                      { hex: "#f43f5e", label: "Rose" },
                      { hex: "#1e293b", label: "Charcoal" }
                    ].map((col) => (
                      <button
                        type="button"
                        key={col.hex}
                        onClick={() => setNewProjectColor(col.hex)}
                        className={`group relative h-10 rounded-xl cursor-pointer transition-all border ${
                          newProjectColor === col.hex 
                            ? 'border-indigo-600 ring-2 ring-indigo-120 scale-105 shadow-sm' 
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                        style={{ backgroundColor: col.hex }}
                        title={col.label}
                      >
                        {newProjectColor === col.hex && (
                          <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold drop-shadow-sm">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowNewProjectModal(false)}
                className="px-4 py-2 hover:bg-slate-100 text-slate-500 hover:text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel / Back
              </button>
              <button
                type="button"
                onClick={startNewProject}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-100 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 size={13} />
                <span>Erase & Create App</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GITHUB PULL DIALOG MODAL */}
      {showGithubPullModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header branding */}
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="p-2 bg-slate-900 rounded-xl text-white">
                <Github size={18} />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-bold text-slate-900 font-sans">Pull Project from GitHub</h3>
                <p className="text-[10px] text-slate-400 font-medium font-mono uppercase">REPOSITORY SYNC GATEWAY</p>
              </div>
            </div>

            <div className="space-y-4 text-left">
              <p className="text-xs text-slate-600 leading-relaxed font-sans font-medium">
                Sync and visual-edit any public Jetpack Compose/Android project directly using our dynamic AST code interpreter.
              </p>

              {/* Error Alert Box */}
              {githubPullError && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl text-[10.5px] text-rose-700 font-medium leading-normal animate-pulse-subtle">
                  ⚠️ <span className="font-bold">Sync Failed:</span> {githubPullError}
                </div>
              )}

              {/* Form Input fields */}
              <div className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[9.5px] font-bold text-slate-450 uppercase font-mono tracking-wider block">GitHub Repository URL / Path</label>
                  <input
                    type="text"
                    disabled={isGithubPulling}
                    value={githubUrlInput}
                    onChange={(e) => setGithubUrlInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none transition-all font-mono text-slate-800 text-[11.5px]"
                    placeholder="e.g. android/architecture-samples"
                  />
                  <span className="text-[9px] text-slate-400 block font-medium">Supports complete browser URLs or simple owner/repo shorthand formats.</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[9.5px] font-bold text-slate-450 uppercase font-mono tracking-wider block flex items-center justify-between">
                    <span>GitHub Personal Token (Optional)</span>
                    <span className="text-[8px] bg-indigo-50 text-indigo-650 px-1.5 py-0.2 rounded-sm lowercase font-bold font-sans">rate limit booster</span>
                  </label>
                  <input
                    type="password"
                    disabled={isGithubPulling}
                    value={githubTokenInput}
                    onChange={(e) => setGithubTokenInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none transition-all font-mono text-slate-800 text-[11.5px]"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxx"
                  />
                  <span className="text-[9px] text-slate-400 block font-medium">Required only for highly restricted private repositories or to bypass standard anonymous API quota limit.</span>
                </div>
              </div>

              {/* Preset Click-to-Fill Helpers */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 space-y-2">
                <span className="text-[8px] font-bold uppercase text-slate-400 tracking-wider block font-mono">Popular Sample Test Repositories</span>
                <div className="flex flex-col gap-1.5">
                  {[
                    { path: "android/architecture-samples", label: "Architecture Samples (M3 Setup)" },
                    { path: "google/accompanist", label: "Accompanist Library App" },
                    { path: "skydoves/DisneyCompose", label: "Disney Composed Studio Showcase" }
                  ].map((preset) => (
                    <button
                      key={preset.path}
                      type="button"
                      disabled={isGithubPulling}
                      onClick={() => {
                        setGithubUrlInput(preset.path);
                        setGithubPullError(null);
                      }}
                      className="w-full text-left hover:bg-white border border-transparent hover:border-slate-200 hover:text-indigo-600 px-2 py-1 rounded-lg text-[10px] text-slate-600 transition-all font-mono font-bold flex justify-between items-center"
                    >
                      <span>💡 {preset.path}</span>
                      <span className="text-[9px] text-slate-400 font-sans font-medium">{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Actively Loading display panel */}
              {isGithubPulling && (
                <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex items-center gap-3 animate-in fade-in duration-200">
                  <Loader2 className="text-indigo-600 animate-spin shrink-0" size={20} />
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-800 block">Connecting Github Service...</span>
                    <span className="text-[10px] text-slate-500 block leading-normal">Parsing trees, resolving Kotlin files, and analyzing Room SQL columns. Please hold on.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isGithubPulling}
                onClick={() => setShowGithubPullModal(false)}
                className="px-4 py-2 hover:bg-slate-100 text-slate-500 hover:text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Close Gateway
              </button>
              <button
                type="button"
                disabled={isGithubPulling || !githubUrlInput.trim()}
                onClick={handleGithubPull}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isGithubPulling ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Synchronizing...</span>
                  </>
                ) : (
                  <>
                    <GitFork size={13} />
                    <span>Pull Code Workspace</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );

  // SIMULATOR COMPONENT PARSER FUNCTION
  function renderSimulatedComponent(comp: AndroidComponent) {
    if (!comp) return null;
    const props = comp.properties || {};
    const paddingVal = props.margin !== undefined ? `${props.margin}px` : '8px';
    const inlineHeight = props.height && props.height > 0 ? `${props.height}px` : 'auto';
    const inlineStyle: React.CSSProperties = {
      padding: paddingVal,
      height: inlineHeight
    };

    switch (comp.type) {
      case 'text': {
        const fontName = props.style === 'h1' ? 'font-bold text-slate-900 leading-tight font-sans text-xl' :
                        props.style === 'h2' ? 'font-semibold text-slate-800 font-sans text-base' :
                        props.style === 'caption' ? 'text-slate-500 font-sans text-xs italic tracking-tight' :
                        'text-slate-600 font-sans text-sm';
                        
        const inlineFont: React.CSSProperties = {
          ...inlineStyle,
          color: props.textColor || undefined,
          fontSize: props.fontSize ? `${props.fontSize}px` : undefined,
          textAlign: 'left'
        };

        return (
          <div className={`${fontName} w-full text-left`} style={inlineFont}>
            {isPlayMode ? interpolateSimulatedText(props.text) : (props.text || "TextView Label")}
          </div>
        );
      }

      case 'button': {
        const isOutlined = props.style === 'outlined';
        const buttonClass = isOutlined 
          ? 'border border-indigo-600 text-indigo-600 hover:bg-indigo-50' 
          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm';

        const customBg = props.backgroundColor && !isOutlined ? { backgroundColor: props.backgroundColor } : {};
        const inlineBtn: React.CSSProperties = {
          ...inlineStyle,
          ...customBg,
          fontSize: props.fontSize ? `${props.fontSize}px` : undefined,
          borderRadius: '12px'
        };

        return (
          <div className="w-full text-center" style={{ padding: paddingVal }}>
            <button
               className={`w-full py-2.5 font-semibold text-xs tracking-wide transition-all select-none ${buttonClass}`}
               style={inlineBtn}
               disabled={!isPlayMode}
            >
              {props.text || "Button Action"}
            </button>
          </div>
        );
      }

      case 'textinput': {
        const boundValue = props.bindState ? (simulatedState[props.bindState] || "") : "";
        return (
          <div className="w-full" style={inlineStyle}>
            <div className="flex flex-col gap-1 w-full bg-transparent">
              {props.placeholder && <span className="text-[10px] text-slate-400 font-medium tracking-tight font-sans text-left">{props.placeholder}</span>}
              <input
                type="text"
                placeholder={props.placeholder || "Enter value..."}
                value={isPlayMode ? boundValue : ""}
                disabled={!isPlayMode}
                onChange={(e) => {
                  if (props.bindState) {
                    setSimulatedState(prev => ({
                      ...prev,
                      [props.bindState!]: e.target.value
                    }));
                  }
                }}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white shadow-inner focus:ring-1 focus:ring-indigo-500 focus:outline-none font-sans text-left"
              />
            </div>
          </div>
        );
      }

      case 'card': {
        const cardBg = props.backgroundColor ? { backgroundColor: props.backgroundColor } : { backgroundColor: '#ffffff' };
        return (
          <div className="w-full" style={inlineStyle}>
            <div 
              className="w-full rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col gap-1.5 focus:scale-[0.99]"
              style={cardBg}
            >
              <h4 className="text-sm font-bold text-slate-950 font-sans tracking-tight text-left">
                {isPlayMode ? interpolateSimulatedText(props.text) : (props.text || 'Card Title')}
              </h4>
              <p className="text-xs text-slate-500 leading-normal font-sans text-left">
                {isPlayMode ? interpolateSimulatedText(props.placeholder) : (props.placeholder || 'Card subtitle summary text logs.')}
              </p>
            </div>
          </div>
        );
      }

      case 'image': {
        const category = props.src || 'workspace';
        let imageUrl = "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400"; // default code placeholder
        if (category === 'nutrition') imageUrl = "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400";
        if (category === 'profile') imageUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400";
        if (category === 'analytics') imageUrl = "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=400";

        return (
          <div className="w-full overflow-hidden flex justify-center items-center" style={inlineStyle}>
            <div 
              className="w-full rounded-2xl bg-neutral-200 flex flex-col justify-center items-center shadow-inner text-slate-400 overflow-hidden relative"
              style={{ height: props.height ? `${props.height}px` : '140px' }}
            >
              <img 
                src={imageUrl} 
                alt={category} 
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover opacity-90 hover:scale-105 duration-500 transition-all cursor-crosshair"
              />
              <div className="absolute inset-x-0 bottom-0 bg-slate-900/60 backdrop-blur-xs py-1 px-3 flex justify-between items-center text-[10px] text-white select-none">
                <span className="font-mono">drawable/{category}</span>
                <span>🖼️</span>
              </div>
            </div>
          </div>
        );
      }

      case 'switch': {
        const boundValue = props.bindState ? (simulatedState[props.bindState] === 'true') : false;
        return (
          <div className="w-full" style={inlineStyle}>
            <div className="flex items-center justify-between bg-white border border-slate-200/60 rounded-xl px-4 py-2.5 shadow-xs w-full">
              <span className="text-xs font-semibold text-slate-800 font-sans text-left">{props.text || "Switch Settings"}</span>
              <button
                disabled={!isPlayMode}
                onClick={() => {
                  if (props.bindState) {
                    setSimulatedState(prev => ({
                      ...prev,
                      [props.bindState!]: String(!boundValue)
                    }));
                  }
                }}
                className={`w-9 h-5 rounded-full relative transition-all duration-300 ${
                  boundValue ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
              >
                <div 
                  className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[3.2px] transition-all ${
                    boundValue ? 'right-[4px]' : 'left-[4.2px]'
                  }`}
                />
              </button>
            </div>
          </div>
        );
      }

      case 'slider': {
        const boundValue = props.bindState ? (parseFloat(simulatedState[props.bindState]) || 50) : 50;
        return (
          <div className="w-full" style={inlineStyle}>
            <div className="w-full bg-white border border-slate-200/60 p-3.5 rounded-xl shadow-xs flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs text-slate-800 font-sans font-semibold">
                <span>{props.text || "Slider Level"}</span>
                <span className="font-mono text-indigo-500 font-extrabold">{Math.floor(boundValue)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={boundValue}
                disabled={!isPlayMode}
                onChange={(e) => {
                  if (props.bindState) {
                    setSimulatedState(prev => ({
                      ...prev,
                      [props.bindState!]: e.target.value
                    }));
                  }
                }}
                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>
          </div>
        );
      }

      case 'listitem': {
        const titleText = props.text || "Row Title Header";
        const subtitleText = props.placeholder || "Subtext compact content";
        const badgeLabel = props.style || "";

        return (
          <div className="w-full" style={inlineStyle}>
            <div className="w-full bg-white hover:bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 shadow-xs flex items-center justify-between transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-sm">
                  💡
                </div>
                <div className="flex flex-col gap-0.5 max-w-[190px]">
                  <h5 className="text-xs font-bold text-slate-900 truncate tracking-tight text-left">{titleText}</h5>
                  <p className="text-[10px] text-slate-500 truncate leading-none text-left">{subtitleText}</p>
                </div>
              </div>

              {badgeLabel && (
                <span className="text-[9px] font-bold px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 font-sans rounded-full uppercase tracking-tighter shrink-0 select-none">
                  {badgeLabel}
                </span>
              )}
            </div>
          </div>
        );
      }

      case 'progressbar': {
        const boundValue = props.bindState ? (parseFloat(simulatedState[props.bindState]) || 0) : null;
        const progressHex = props.textColor || '#6366f1';

        return (
          <div className="w-full" style={inlineStyle}>
            {boundValue === null ? (
              <div className="flex justify-center py-2">
                <div 
                  className="w-8 h-8 rounded-full border-[3px] border-slate-200 border-t-indigo-600 animate-spin"
                  style={{ borderTopColor: progressHex }}
                />
              </div>
            ) : (
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden shadow-inner">
                <div 
                  className="bg-indigo-600 h-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, boundValue))}%`, backgroundColor: progressHex }}
                />
              </div>
            )}
          </div>
        );
      }

      case 'divider': {
        return (
          <div className="w-full py-1.5" style={{ padding: paddingVal }}>
            <div className="w-full border-b border-dashed border-slate-200" />
          </div>
        );
      }

      case 'spacer': {
        const spaceHeight = props.height || 18;
        return (
          <div className="w-full" style={{ height: `${spaceHeight}px` }} />
        );
      }

      case 'calendar': {
        const selectedDate = props.bindState ? (simulatedState[props.bindState] || "May 23, 2026") : "May 23, 2026";
        const days = Array.from({ length: 31 }, (_, i) => i + 1);
        const weekdays = ["S", "M", "T", "W", "T", "F", "S"];
        return (
          <div className="w-full text-left" style={inlineStyle}>
            <div className="w-full bg-white border border-slate-200 p-4 rounded-2xl shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-800 font-sans tracking-tight">{props.text || "Select Date"}</span>
                <span className="text-[10px] font-mono font-bold bg-indigo-50 border border-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full select-none">
                  {selectedDate}
                </span>
              </div>
              
              <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-bold text-slate-400 font-mono">
                {weekdays.map((w, idx) => (
                  <span key={idx} className="block text-center">{w}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] pb-1">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={`empty-${idx}`} />
                ))}
                {days.slice(0, 24).map((day) => {
                  const dayStr = `May ${day}, 2026`;
                  const isCurSelected = selectedDate === dayStr;
                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={!isPlayMode}
                      onClick={() => {
                        if (props.bindState) {
                          setSimulatedState(prev => ({
                            ...prev,
                            [props.bindState!]: dayStr
                          }));
                          setSimulatedToasts(prev => [...prev, `Booking slot scheduled for ${dayStr} 📅`]);
                        }
                      }}
                      className={`h-6 w-6 mx-auto rounded-full flex items-center justify-center font-semibold font-sans transition-all duration-150 relative cursor-pointer ${
                        isCurSelected 
                          ? 'bg-indigo-600 text-white font-extrabold shadow-xs scale-105' 
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {day}
                      {day === 23 && !isCurSelected && (
                        <span className="absolute bottom-0.5 w-1 h-1 bg-indigo-500 rounded-full animate-ping" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      }

      case 'checkbox': {
        const boundValue = props.bindState ? (simulatedState[props.bindState] === 'true') : false;
        return (
          <div className="w-full text-left" style={inlineStyle}>
            <button
              type="button"
              disabled={!isPlayMode}
              onClick={() => {
                if (props.bindState) {
                  const newValue = !boundValue;
                  setSimulatedState(prev => ({
                    ...prev,
                    [props.bindState!]: String(newValue)
                  }));
                  setSimulatedToasts(prev => [...prev, newValue ? "Signed & certified! ☑️" : "Contract agreement waived."]);
                }
              }}
              className="w-full flex items-start gap-3 bg-white border border-slate-200/60 rounded-xl px-4 py-3 shadow-xs text-left cursor-pointer transition-all duration-200 hover:bg-slate-50/50"
            >
              <div 
                className={`mt-0.5 w-4 h-4 rounded border transition-all duration-200 flex items-center justify-center shrink-0 ${
                  boundValue 
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs animate-in zoom-in-50' 
                    : 'bg-white border-slate-300 hover:border-slate-400'
                }`}
              >
                {boundValue && (
                  <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 20 20">
                    <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
                  </svg>
                )}
              </div>
              <span className="text-[11px] font-medium text-slate-600 leading-normal font-sans">
                {props.text || "Check selection label checkbox"}
              </span>
            </button>
          </div>
        );
      }

      case 'chart': {
        const accentHex = project.themeColor || '#6366f1';
        return (
          <div className="w-full text-left" style={inlineStyle}>
            <div className="w-full bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex flex-col gap-1.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-800 font-sans tracking-tight">{props.text || "Metrics Trend"}</span>
                <span className="text-[9px] font-mono text-indigo-500 font-extrabold bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                  COMPOSE INTERACTIVE GRAPH
                </span>
              </div>
              <div className="h-28 w-full bg-slate-50/50 border border-slate-100 rounded-xl relative overflow-hidden flex flex-col justify-end px-1 pb-1">
                <svg className="absolute inset-0 w-full h-full p-2" preserveAspectRatio="none" viewBox="0 0 100 50">
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={accentHex} stopOpacity="0.2"/>
                      <stop offset="100%" stopColor={accentHex} stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  <line x1="0" y1="12" x2="100" y2="12" stroke="#f1f5f9" strokeWidth="0.5" />
                  <line x1="0" y1="25" x2="100" y2="25" stroke="#f1f5f9" strokeWidth="0.5" />
                  <line x1="0" y1="37" x2="100" y2="37" stroke="#f1f5f9" strokeWidth="0.5" />
                  
                  <path 
                    d="M 5,42 Q 22,12 40,32 T 75,8 T 95,22 l 0,28 l -90,0 Z" 
                    fill="url(#chartGrad)" 
                  />
                  <path 
                    d="M 5,42 Q 22,12 40,32 T 75,8 T 95,22" 
                    fill="none" 
                    stroke={accentHex} 
                    strokeWidth="2.5" 
                    strokeLinecap="round"
                  />
                  
                  <circle cx="75" cy="8" r="3.5" fill="#ffffff" stroke={accentHex} strokeWidth="2.5" />
                  <circle cx="40" cy="32" r="2.5" fill="#ffffff" stroke={accentHex} strokeWidth="2" />
                </svg>
                <div className="w-full flex justify-between px-2 text-[8px] font-mono text-slate-400 select-none z-10">
                  <span>WEEK 1</span>
                  <span>WEEK 2</span>
                  <span>WEEK 3</span>
                  <span>WEEK 4</span>
                </div>
              </div>
            </div>
          </div>
        );
      }

      case 'timer': {
        const boundValue = props.bindState ? (parseInt(simulatedState[props.bindState], 10) || 300) : 300;
        const minutes = Math.floor(boundValue / 60);
        const seconds = boundValue % 60;
        const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        return (
          <div className="w-full text-center" style={inlineStyle}>
            <div className="w-full bg-slate-900 border border-slate-800 text-slate-100 p-4 rounded-2xl shadow-xl flex flex-col items-center justify-center gap-2.5">
              <span className="text-[10px] uppercase font-bold text-indigo-400 font-mono tracking-widest">{props.text || "Countdown Session"}</span>
              
              <div className="text-3xl font-black font-mono tracking-widest text-white border border-slate-800 bg-slate-950/80 px-6 py-2 rounded-2xl shadow-inner min-w-[140px] text-center select-none">
                {timeFormatted}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={!isPlayMode}
                  onClick={() => {
                    if (props.bindState) {
                      const decremented = Math.max(0, boundValue - 30);
                      setSimulatedState(prev => ({
                        ...prev,
                        [props.bindState!]: String(decremented)
                      }));
                      setSimulatedToasts(prev => [...prev, "Timer decremented past -30s ⏱️"]);
                    }
                  }}
                  className="w-7 h-7 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 text-[10px] rounded-full flex items-center justify-center cursor-pointer transition-all border border-slate-700"
                  title="Minus 30 seconds"
                >
                  -30s
                </button>

                <button
                  type="button"
                  disabled={!isPlayMode}
                  onClick={() => {
                    if (props.bindState) {
                      setSimulatedToasts(prev => [...prev, "Workout practice countdown started! 🔥⏱️"]);
                    }
                  }}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-[10px] text-white uppercase font-bold rounded-lg flex items-center gap-1 cursor-pointer shadow-md select-none transition-all"
                >
                  ▶ START
                </button>

                <button
                  type="button"
                  disabled={!isPlayMode}
                  onClick={() => {
                    if (props.bindState) {
                      const incremented = boundValue + 30;
                      setSimulatedState(prev => ({
                        ...prev,
                        [props.bindState!]: String(incremented)
                      }));
                      setSimulatedToasts(prev => [...prev, "Timer incremented +30s ⏱️"]);
                    }
                  }}
                  className="w-7 h-7 bg-slate-800 hover:bg-slate-705 active:scale-95 text-slate-300 text-[10px] rounded-full flex items-center justify-center cursor-pointer transition-all border border-slate-700"
                  title="Add 30 seconds"
                >
                  +30s
                </button>
              </div>
            </div>
          </div>
        );
      }

      case 'map': {
        const coordinateText = props.placeholder || "San Francisco, CA";
        const mapTitle = props.text || "Interactive GPS Map";
        const mapHeight = props.height || 160;
        return (
          <div className="w-full text-left" style={inlineStyle}>
            <div className="w-full bg-white border border-slate-200 p-3 rounded-2xl shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 font-sans tracking-tight">{mapTitle}</span>
                <span className="text-[9px] font-mono bg-indigo-50 border border-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-bold">GPS ACTIVE</span>
              </div>
              <div 
                className="w-full bg-slate-100 rounded-xl relative overflow-hidden border border-slate-150 flex flex-col justify-between p-3"
                style={{ height: `${mapHeight}px` }}
              >
                <div className="absolute inset-0 opacity-20 pointer-events-none select-none">
                  <div className="w-full h-full bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:16px_16px]" />
                  <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-400 transform -rotate-12" />
                  <div className="absolute top-0 left-1/3 w-1 h-full bg-slate-400 transform rotate-12" />
                  <div className="absolute top-1/4 left-1/2 w-8 h-8 rounded-full border border-indigo-550 bg-indigo-200" />
                </div>

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                  <div className="h-5 px-2 bg-slate-900 text-[8px] text-white font-bold rounded-md shadow-lg flex items-center justify-center border border-slate-800 whitespace-nowrap animate-bounce">
                     📍 {coordinateText}
                  </div>
                  <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full ring-4 ring-indigo-200" />
                </div>
                
                <div className="z-10 flex justify-between items-end w-full mt-auto">
                  <button 
                    disabled={!isPlayMode}
                    onClick={() => setSimulatedToasts(prev => [...prev, `Centered GPS target on ${coordinateText} 🗺️`])}
                    className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-[9px] font-bold text-slate-700 flex items-center gap-1 cursor-pointer shadow-3xs"
                  >
                    <Map size={10} className="text-indigo-600" />
                    <span>Recenter</span>
                  </button>
                  <div className="flex flex-col gap-1">
                    <button 
                      disabled={!isPlayMode}
                      type="button"
                      onClick={() => setSimulatedToasts(prev => [...prev, "Map zoomed in"])}
                      className="w-5 h-5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 flex items-center justify-center cursor-pointer shadow-3xs"
                    >
                      +
                    </button>
                    <button 
                      disabled={!isPlayMode}
                      type="button"
                      onClick={() => setSimulatedToasts(prev => [...prev, "Map zoomed out"])}
                      className="w-5 h-5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 flex items-center justify-center cursor-pointer shadow-3xs"
                    >
                      -
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }

      case 'rating': {
        const boundValue = props.bindState ? (parseInt(simulatedState[props.bindState], 10) || 5) : 5;
        const starTitle = props.text || "Experience Rating";
        return (
          <div className="w-full text-left" style={inlineStyle}>
            <div className="w-full bg-white border border-slate-200 p-3 rounded-2xl shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 font-sans tracking-tight">{starTitle}</span>
                <span className="text-[9.5px] font-mono font-bold text-amber-500 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-100">
                  ★ {boundValue}.0 / 5
                </span>
              </div>
              <div className="flex items-center gap-1 py-1">
                {[1, 2, 3, 4, 5].map((starIdx) => {
                  const isActive = starIdx <= boundValue;
                  return (
                    <button
                      key={starIdx}
                      type="button"
                      disabled={!isPlayMode}
                      onClick={() => {
                        if (props.bindState) {
                          setSimulatedState(prev => ({
                            ...prev,
                            [props.bindState!]: String(starIdx)
                          }));
                          setSimulatedToasts(prev => [...prev, `Feedback submitted: ${starIdx} Star rating! ★`]);
                        }
                      }}
                      className="group transition-transform active:scale-90 cursor-pointer p-0.5"
                    >
                      <Star 
                        size={20} 
                        className={`transition-colors duration-150 ${
                          isActive 
                            ? 'fill-amber-400 text-amber-400 drop-shadow-3xs' 
                            : 'text-slate-200 hover:text-amber-200'
                        }`} 
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      }

      case 'chip': {
        const itemsList = (props.text || "All,Hot,New").split(',').map(s => s.trim()).filter(Boolean);
        const activeChip = props.bindState ? (simulatedState[props.bindState] || itemsList[0] || "") : (itemsList[0] || "");
        const accentHex = project.themeColor || '#6366f1';
        return (
          <div className="w-full text-left" style={inlineStyle}>
            <div className="w-full py-1">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin select-none">
                {itemsList.map((item, idx) => {
                  const isSelected = activeChip === item;
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={!isPlayMode}
                      onClick={() => {
                        if (props.bindState) {
                          setSimulatedState(prev => ({
                            ...prev,
                            [props.bindState!]: item
                          }));
                          setSimulatedToasts(prev => [...prev, `Filtered view by tag: "${item}" 🏷️`]);
                        }
                      }}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all duration-150 shrink-0 cursor-pointer border ${
                        isSelected 
                          ? 'text-white border-transparent' 
                          : 'bg-white hover:bg-slate-50 text-slate-650 border-slate-200 hover:border-slate-300'
                      }`}
                      style={isSelected ? { backgroundColor: accentHex } : {}}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      }

      case 'audio': {
        const isPlaying = props.bindState ? (simulatedState[props.bindState] === 'true') : false;
        const audioTitle = props.text || "Now Playing";
        const subtitle = props.placeholder || "Subtext details...";
        return (
          <div className="w-full text-left" style={inlineStyle}>
            <div className="w-full bg-white border border-slate-200 p-3.5 rounded-2xl shadow-xs space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-gradient-to-tr from-slate-800 to-indigo-600 rounded-xl flex items-center justify-center text-white text-base shadow-sm shrink-0">
                  🎵
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs font-bold text-slate-800 font-sans truncate">{audioTitle}</span>
                  <span className="text-[10px] text-slate-400 font-medium truncate">{subtitle}</span>
                </div>
                {isPlaying && (
                  <div className="flex items-end gap-0.5 h-4 px-1 pb-1">
                    <div className="w-0.5 bg-indigo-500 h-2 animate-bounce" />
                    <div className="w-0.5 bg-indigo-505 h-3.5 animate-bounce [animation-delay:0.15s]" />
                    <div className="w-0.5 bg-indigo-500 h-1.5 animate-bounce [animation-delay:0.3s]" />
                    <div className="w-0.5 bg-indigo-505 h-2.5 animate-bounce [animation-delay:0.45s]" />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden relative">
                  <div className={`h-full bg-indigo-600 rounded-full ${isPlaying ? 'w-1/3 transition-[width] duration-3000' : 'w-1/4'}`} />
                </div>
                <div className="flex justify-between items-center text-[8px] font-mono text-slate-400 select-none">
                  <span>01:15</span>
                  <span>03:45</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-5 pt-1">
                <button
                  type="button"
                  disabled={!isPlayMode}
                  onClick={() => setSimulatedToasts(prev => [...prev, "Previous audio track"])}
                  className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 active:scale-95 transition-all rounded-full cursor-pointer"
                >
                  <SkipBack size={14} />
                </button>

                <button
                  type="button"
                  disabled={!isPlayMode}
                  onClick={() => {
                    if (props.bindState) {
                      const nextPlaying = !isPlaying;
                      setSimulatedState(prev => ({
                        ...prev,
                        [props.bindState!]: String(nextPlaying)
                      }));
                      setSimulatedToasts(prev => [...prev, nextPlaying ? "Media streaming resumed 🎧" : "Media streaming paused."]);
                    }
                  }}
                  className="w-8 h-8 bg-indigo-600 hover:bg-indigo-700 active:scale-90 text-white rounded-full flex items-center justify-center cursor-pointer transition-all shadow-md"
                >
                  {isPlaying ? <Pause size={14} className="fill-white" /> : <Play size={14} className="fill-white translate-x-0.5" />}
                </button>

                <button
                  type="button"
                  disabled={!isPlayMode}
                  onClick={() => setSimulatedToasts(prev => [...prev, "Skipped to next audio track"])}
                  className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 active:scale-95 transition-all rounded-full cursor-pointer"
                >
                  <SkipForward size={14} />
                </button>
              </div>
            </div>
          </div>
        );
      }

      case 'dropdown': {
        const optionsList = (props.placeholder || "Option A,Option B").split(',').map(s => s.trim()).filter(Boolean);
        const selectedVal = props.bindState ? (simulatedState[props.bindState] || optionsList[0] || "") : (optionsList[0] || "");
        return (
          <div className="w-full text-left relative" style={inlineStyle}>
            <div className="space-y-1">
              <label className="text-[9.5px] text-slate-400 font-bold block uppercase tracking-wider">{props.text || "Choose Option"}</label>
              
              <select
                disabled={!isPlayMode}
                value={selectedVal}
                onChange={(e) => {
                  if (props.bindState) {
                    setSimulatedState(prev => ({ ...prev, [props.bindState!]: e.target.value }));
                    setSimulatedToasts(prev => [...prev, `Option updated: "${e.target.value}" ⚙️`]);
                  }
                }}
                className="w-full flex items-center justify-between bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-semibold cursor-pointer hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all duration-150"
              >
                {optionsList.map((option, idx) => (
                  <option key={idx} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>
        );
      }

      case 'datatable': {
        const targetTableName = props.bindState || 'tasks';
        const table = project.databaseTables?.find(t => t.name.toLowerCase() === targetTableName.toLowerCase() || t.id === targetTableName) || project.databaseTables?.[0];
        
        // Form states to insert row to SQLite DB in simulated play mode
        const firstColName = table?.columns.find(c => !c.isPrimaryKey)?.name || 'title';
        const [tempInput, setTempInput] = useState<string>('');

        return (
          <div className="w-full text-left" style={inlineStyle}>
            <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 font-sans tracking-tight">{props.text || "Room Table View"}</h4>
                  <span className="text-[9px] font-mono font-bold text-slate-400 uppercase">
                    📁 Table: {table?.name || targetTableName}
                  </span>
                </div>
                <div className="text-[9px] font-mono font-bold bg-indigo-50 border border-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
                  SQLITE / ROOM
                </div>
              </div>

              {!table ? (
                <div className="text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-[10px] text-slate-400">No active SQLite table mapped to &quot;{targetTableName}&quot;</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Table headers */}
                  <div className="grid grid-cols-12 gap-1 bg-slate-50 border border-slate-100 p-1.5 rounded-lg text-[9px] font-bold text-slate-500 font-mono">
                    <div className="col-span-2">ID</div>
                    <div className="col-span-10 text-right uppercase">
                      {table.columns.map(c => c.name).filter(n => n !== 'id').join(' | ')}
                    </div>
                  </div>

                  {/* Rows */}
                  <div className="divide-y divide-slate-100 max-h-[160px] overflow-y-auto">
                    {table.simulatedRows.length === 0 ? (
                      <p className="text-center py-3 text-[10px] text-slate-400 italic">No records in SQLite database</p>
                    ) : (
                      table.simulatedRows.map((row: any, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-1 py-1.5 text-[10.5px] items-center text-slate-700 font-mono">
                          <span className="col-span-2 text-slate-400 font-bold">#{row.id}</span>
                          <span className="col-span-10 text-right truncate font-medium">
                            {Object.entries(row)
                              .filter(([k]) => k !== 'id')
                              .map(([k, v]) => `${v}`)
                              .join(' | ')}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* In-app action input (Insert to SQL Room Db in real-time) */}
                  {isPlayMode && (
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-bold tracking-wider text-slate-400 font-mono uppercase">Room SQL Insert Helper</span>
                        <span className="text-[8px] text-indigo-500">Active Field: {firstColName}</span>
                      </div>
                      <div className="flex gap-1">
                        <input
                          type="text"
                          placeholder={`New row ${firstColName}...`}
                          value={tempInput}
                          onChange={(e) => setTempInput(e.target.value)}
                          className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!tempInput.trim()) return;
                            const nextId = Math.max(...table.simulatedRows.map((r: any) => Number(r.id) || 0), 0) + 1;
                            const newObj: Record<string, any> = { id: nextId };
                            
                            // populate columns
                            table.columns.forEach(col => {
                              if (col.isPrimaryKey) return;
                              if (col.type === 'INTEGER') {
                                newObj[col.name] = Math.random() > 0.5 ? 1 : 0; // default boolean/int simulation
                              } else if (col.type === 'REAL') {
                                newObj[col.name] = Number((Math.random() * 50).toFixed(2));
                              } else {
                                newObj[col.name] = tempInput;
                              }
                            });

                            // update project state databaseTables
                            const updatedTables = project.databaseTables?.map(t => {
                              if (t.id === table.id) {
                                return {
                                  ...t,
                                  simulatedRows: [...t.simulatedRows, newObj]
                                };
                              }
                              return t;
                            });

                            setProject(prev => ({
                              ...prev,
                              databaseTables: updatedTables
                            }));
                            setTempInput('');
                            setSimulatedToasts(prev => [...prev, `INSERT INTO ${table.name} VALUES (#${nextId}) ✅`]);
                          }}
                          className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-[9px] px-2.5 py-1 rounded-lg transition-all shadow-3xs"
                        >
                          exec SQL
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      }

      default:
        return <div className="text-xs text-slate-400 italic">Preview block placeholder</div>;
    }
  }

}
