import { AndroidProject } from './types';

export const templates: { name: string; description: string; icon: string; project: AndroidProject }[] = [
  {
    name: "Weight Tracker",
    description: "Multi-screen health tracker with state metrics, visual progress cards, and data log pages.",
    icon: "🏃‍♂️",
    project: {
      appName: "Weight Tracker",
      packageName: "com.android.weighttracker",
      themeColor: "#0284c7", // Sky blue
      initialScreenId: "home_screen",
      variables: [
        { name: "weightInput", type: "string", defaultValue: "72.5" },
        { name: "latestWeight", type: "string", defaultValue: "72.5" },
        { name: "targetWeight", type: "string", defaultValue: "68.0" },
        { name: "statusMsg", type: "string", defaultValue: "Off to a strong start! Maintain regular workouts." },
        { name: "logsCount", type: "number", defaultValue: "3" }
      ],
      screens: [
        {
          id: "home_screen",
          name: "Dashboard",
          components: [
            {
              id: "dash_title",
              type: "text",
              properties: {
                text: "My Weight Tracker",
                style: "h1",
                textColor: "#0c4a6e",
                fontSize: 26,
                margin: 12
              }
            },
            {
              id: "hero_card",
              type: "card",
              properties: {
                text: "Latest Reading: {latestWeight} kg",
                placeholder: "Target Goal: {targetWeight} kg. Maintain a healthy calorie deficit! Weekly loss: -0.4 kg.",
                backgroundColor: "#e0f2fe",
                margin: 12
              }
            },
            {
              id: "info_text",
              type: "text",
              properties: {
                text: "💡 Stat Check: {statusMsg}",
                style: "caption",
                textColor: "#0369a1",
                fontSize: 14,
                margin: 8
              }
            },
            {
              id: "progress_headline",
              type: "text",
              properties: {
                text: "Goal Progress Indicator",
                style: "h2",
                textColor: "#1e293b",
                fontSize: 18,
                margin: 8
              }
            },
            {
              id: "weight_progress",
              type: "progressbar",
              properties: {
                bindState: "weightInput", // dummy bound
                textColor: "#0284c7",
                margin: 12
              }
            },
            {
              id: "action_nav_logs",
              type: "button",
              properties: {
                text: "View Saved Weight Logs ({logsCount})",
                style: "filled",
                backgroundColor: "#0284c7",
                actionType: "navigate",
                actionValue: "logs_screen",
                margin: 12
              }
            },
            {
              id: "spacer_inner",
              type: "spacer",
              properties: {
                height: 16
              }
            },
            {
              id: "shortcut_card",
              type: "button",
              properties: {
                text: "Quick Log Weight Entry",
                style: "outlined",
                actionType: "navigate",
                actionValue: "log_entry_screen",
                margin: 12
              }
            }
          ]
        },
        {
          id: "log_entry_screen",
          name: "Log Daily Weight",
          components: [
            {
              id: "entry_desc",
              type: "text",
              properties: {
                text: "Add Daily Weight Entry",
                style: "h1",
                textColor: "#0f172a",
                fontSize: 22,
                margin: 12
              }
            },
            {
              id: "desc_sub",
              type: "text",
              properties: {
                text: "Input your actual scale readout in kilograms to instantly recalculate targets.",
                style: "body",
                textColor: "#64748b",
                fontSize: 15,
                margin: 8
              }
            },
            {
              id: "input_weight",
              type: "textinput",
              properties: {
                placeholder: "Scale Weight (kg)",
                bindState: "weightInput",
                margin: 12
              }
            },
            {
              id: "save_btn",
              type: "button",
              properties: {
                text: "Save & Commit Log Entry",
                style: "filled",
                backgroundColor: "#0284c7",
                actionType: "toast",
                actionValue: "Weight log saved successfully! Recalculating dashboard values.",
                margin: 12
              }
            },
            {
              id: "cancel_btn",
              type: "button",
              properties: {
                text: "Return to Dashboard",
                style: "outlined",
                actionType: "navigate",
                actionValue: "home_screen",
                margin: 12
              }
            }
          ]
        },
        {
          id: "logs_screen",
          name: "Historical Weight Logs",
          components: [
            {
              id: "logs_title",
              type: "text",
              properties: {
                text: "Log History",
                style: "h1",
                textColor: "#0f172a",
                fontSize: 22,
                margin: 12
              }
            },
            {
              id: "log_1",
              type: "listitem",
              properties: {
                text: "Today's log: 72.5 kg",
                placeholder: "Slight decrease from yesterday. Hydrated.",
                style: "Current",
                margin: 12
              }
            },
            {
              id: "log_2",
              type: "listitem",
              properties: {
                text: "2 days ago: 73.1 kg",
                placeholder: "Log after early morning jogging.",
                style: "-0.6kg",
                margin: 12
              }
            },
            {
              id: "log_3",
              type: "listitem",
              properties: {
                text: "4 days ago: 73.3 kg",
                placeholder: "First reading of the model sprint.",
                style: "-0.8kg",
                margin: 12
              }
            },
            {
              id: "back_btn",
              type: "button",
              properties: {
                text: "Back to Home",
                style: "filled",
                backgroundColor: "#0f172a",
                actionType: "navigate",
                actionValue: "home_screen",
                margin: 12
              }
            }
          ]
        }
      ]
    }
  },
  {
    name: "Interactive To-Do List",
    description: "An offline tasks planner utilizing click-triggers to change state or notify completion.",
    icon: "📋",
    project: {
      appName: "Swift To-Do",
      packageName: "com.swift.todoapp",
      themeColor: "#10b981", // Emerald green
      initialScreenId: "todo_home",
      variables: [
        { name: "newTaskTitle", type: "string", defaultValue: "Draft budget pitch" },
        { name: "activeTasksCount", type: "number", defaultValue: "2" },
        { name: "notificationToggled", type: "boolean", defaultValue: "true" }
      ],
      screens: [
        {
          id: "todo_home",
          name: "Active Tasks",
          components: [
            {
              id: "logo",
              type: "image",
              properties: {
                src: "workspace",
                height: 140,
                margin: 12
              }
            },
            {
              id: "title",
              type: "text",
              properties: {
                text: "My Task Planner",
                style: "h1",
                textColor: "#065f46",
                fontSize: 24,
                margin: 12
              }
            },
            {
              id: "count_bar",
              type: "card",
              properties: {
                text: "You have active tasks!",
                placeholder: "Total remaining tasks: {activeTasksCount}. Make sure to enable notifications for hourly briefs.",
                backgroundColor: "#ecfdf5",
                margin: 12
              }
            },
            {
              id: "todo_items_list",
              type: "listitem",
              properties: {
                text: "Draft business plan presentation",
                placeholder: "Due today by 5:00 PM. Review with CEO.",
                style: "Urgent",
                margin: 12
              }
            },
            {
              id: "todo_item_2",
              type: "listitem",
              properties: {
                text: "Purchase birthday greeting cards",
                placeholder: "Family gift box contribution.",
                style: "Personal",
                margin: 12
              }
            },
            {
              id: "settings_toggle",
              type: "switch",
              properties: {
                text: "Enable Push Reminder Alerts",
                bindState: "notificationToggled",
                margin: 12
              }
            },
            {
              id: "create_trigger",
              type: "button",
              properties: {
                text: "➕ Add New Task Input",
                style: "filled",
                backgroundColor: "#10b981",
                actionType: "navigate",
                actionValue: "add_task_screen",
                margin: 12
              }
            }
          ]
        },
        {
          id: "add_task_screen",
          name: "Add Task Screen",
          components: [
            {
              id: "editor_title",
              type: "text",
              properties: {
                text: "Create Task",
                style: "h1",
                textColor: "#0f172a",
                fontSize: 22,
                margin: 12
              }
            },
            {
              id: "input_task_title",
              type: "textinput",
              properties: {
                placeholder: "Task title descriptor",
                bindState: "newTaskTitle",
                margin: 12
              }
            },
            {
              id: "notify_toast",
              type: "button",
              properties: {
                text: "Save New Task To List",
                style: "filled",
                backgroundColor: "#10b981",
                actionType: "toast",
                actionValue: "Task saved successfully!",
                margin: 12
              }
            },
            {
              id: "cancel",
              type: "button",
              properties: {
                text: "Cancel and Go Back",
                style: "outlined",
                actionType: "navigate",
                actionValue: "todo_home",
                margin: 12
              }
            }
          ]
        }
      ]
    }
  },
  {
    name: "Classic Calculator",
    description: "A gorgeous single-view calculator mockup visualizing screen values and operation counters.",
    icon: "🧮",
    project: {
      appName: "Retro Calculator",
      packageName: "com.calc.retro",
      themeColor: "#f59e0b", // Amber yellow
      initialScreenId: "calc_screen",
      variables: [
        { name: "calcDisplay", type: "string", defaultValue: "42.0" },
        { name: "operationsLogged", type: "number", defaultValue: "1" }
      ],
      screens: [
        {
          id: "calc_screen",
          name: "Retro Calculator",
          components: [
            {
              id: "calc_title",
              type: "text",
              properties: {
                text: "Retro Calculator Mockup",
                style: "h1",
                textColor: "#78350f",
                fontSize: 24,
                margin: 12
              }
            },
            {
              id: "calc_readout",
              type: "card",
              properties: {
                text: "{calcDisplay}",
                placeholder: "Memory registers OK. Total operations triggered: {operationsLogged}",
                backgroundColor: "#fef3c7",
                margin: 12
              }
            },
            {
              id: "row_numbers",
              type: "text",
              properties: {
                text: "Quick Controls (Preview Actions)",
                style: "h2",
                textColor: "#1e293b",
                fontSize: 16,
                margin: 12
              }
            },
            {
              id: "add_btn",
              type: "button",
              properties: {
                text: "Increment (+ 1)",
                style: "filled",
                backgroundColor: "#f59e0b",
                actionType: "state_increment",
                actionValue: "operationsLogged",
                margin: 12
              }
            },
            {
              id: "sub_btn",
              type: "button",
              properties: {
                text: "Decrement (- 1)",
                style: "filled",
                backgroundColor: "#d97706",
                actionType: "state_decrement",
                actionValue: "operationsLogged",
                margin: 12
              }
            },
            {
              id: "test_toast",
              type: "button",
              properties: {
                text: "Clear Memory Register (CE)",
                style: "outlined",
                actionType: "toast",
                actionValue: "Memory register and history cache flushed.",
                margin: 12
              }
            }
          ]
        }
      ]
    }
  }
];
