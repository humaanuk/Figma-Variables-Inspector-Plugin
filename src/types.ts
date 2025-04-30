/// <reference types="@figma/plugin-typings" />

// Types for Figma Variables API
export type FigmaVariable = Variable;

export interface Collection {
  id: string;
  name: string;
  variableCount: number;
  variables: Variable[];
}

export interface Mode {
  modeId: string;
  name: string;
}

export interface VariableCodeSyntax {
  WEB?: string;
  ANDROID?: string;
  iOS?: string;
}

export interface VariableValue {
  type: string;
  value?: any;
  id?: string;
}

export interface VariableAlias {
  type: 'VARIABLE_ALIAS';
  id: string;
}

export interface SelectedCollection {
  id: string;
  name: string;
  selected: boolean;
}

export interface PluginMessage {
  type: string;
  collections?: Collection[];
  selectedCollections?: SelectedCollection[];
  jsonData?: string;
  collectionId?: string;
  modeId?: string;
  data?: string;
}

// Re-export Figma types we use
export type VariableResolvedDataType = 'BOOLEAN' | 'COLOR' | 'FLOAT' | 'STRING';
export type VariableScope = 'ALL_SCOPES' | 'TEXT_CONTENT' | 'CORNER_RADIUS' | 'WIDTH_HEIGHT' | 'GAP';

export interface VariableMap {
  [collectionName: string]: {
    [variableName: string]: {
      collection: VariableCollection;
      variable: Variable | null;
    };
  };
}

export interface ModeMap {
  [collectionName: string]: {
    [modeName: string]: string;
  };
}

export interface ColorValue {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface AliasValue {
  type: 'VARIABLE_ALIAS';
  id: string;
  collection?: string;
  mode?: string;
  variable?: string;
}

export interface RGBValue {
  r: number;
  g: number;
  b: number;
}

export interface RGBAValue extends RGBValue {
  a: number;
}

export interface VariableData {
  name: string;
  type: VariableResolvedDataType | 'ALIAS';
  value?: any;
  description?: string;
  scopes?: string[];
  valuesByMode?: { [modeName: string]: any };
}

export interface ModeData {
  name: string;
  variables: VariableData[];
}

export interface CollectionData {
  name: string;
  modes: string[];
  variables: VariableData[];
}

export interface TemplateData {
  collections: CollectionData[];
}

export interface CollectionsMap {
  [key: string]: VariableCollection;
}

export interface CollectionModesMap {
  [key: string]: {
    [key: string]: string;
  };
} 