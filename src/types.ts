export type ComponentType =
  | 'text'
  | 'button'
  | 'textinput'
  | 'card'
  | 'image'
  | 'switch'
  | 'slider'
  | 'listitem'
  | 'progressbar'
  | 'divider'
  | 'spacer'
  | 'calendar'
  | 'checkbox'
  | 'chart'
  | 'timer'
  | 'map'
  | 'rating'
  | 'chip'
  | 'audio'
  | 'dropdown'
  | 'datatable';

export interface ComponentProperties {
  text?: string;
  placeholder?: string;
  style?: string; // variant (e.g. text: h1|h2|body|caption, button: filled|outlined)
  textColor?: string;
  backgroundColor?: string;
  fontSize?: number;
  margin?: number;
  height?: number;
  src?: string;
  actionType?: 'toast' | 'dialog' | 'link' | 'navigate' | 'state_increment' | 'state_decrement' | 'none';
  actionValue?: string; // e.g. custom toast msg, screen_id, custom counter target, url
  bindState?: string; // state key updating on typing/slide/toggle
}

export interface AndroidComponent {
  id: string;
  type: ComponentType;
  properties: ComponentProperties;
}

export interface AndroidScreen {
  id: string;
  name: string;
  components: AndroidComponent[];
}

export interface AndroidVariable {
  name: string;
  type: 'string' | 'number' | 'boolean';
  defaultValue: string;
}

export interface DatabaseColumn {
  name: string;
  type: 'TEXT' | 'INTEGER' | 'REAL';
  isPrimaryKey?: boolean;
}

export interface DatabaseTable {
  id: string;
  name: string;
  columns: DatabaseColumn[];
  simulatedRows: Record<string, string | number | boolean>[];
}

export interface AndroidProject {
  appName: string;
  packageName: string;
  themeColor: string; // Hex color (M3 theme)
  screens: AndroidScreen[];
  variables: AndroidVariable[];
  initialScreenId: string;
  databaseTables?: DatabaseTable[];
}

// Predefined template options
export interface AppTemplate {
  name: string;
  description: string;
  project: AndroidProject;
}
