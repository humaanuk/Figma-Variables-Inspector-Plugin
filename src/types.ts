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
  name: string;
  modeId: string;
}

export interface VariableData {
  name: string;
  type: VariableResolvedDataType | 'ALIAS';
  description?: string;
  scopes?: VariableScope[];
  valuesByMode: { [key: string]: any };
}

export interface CollectionData {
  name: string;
  modes: string[];
  variables: VariableData[];
}

export interface TemplateData {
  collections: CollectionData[];
}

export interface AliasValue {
  type: 'ALIAS';
  value: {
    collection: string;
    variable: string;
  };
}

export type VariableValue = string | number | RGB | RGBA | AliasValue;

export type VariableMap = Map<string, Variable>;

export type CollectionsMap = Map<string, VariableCollection>;

export type CollectionModesMap = Map<string, Map<string, string>>;

export interface SelectedCollection {
  id: string;
  name: string;
}

export interface PluginMessage {
  type: string;
  collections?: Collection[];
  selectedCollections?: SelectedCollection[];
  jsonData?: string;
  collectionId?: string;
  modeId?: string;
  data?: string;
  useHexRef?: boolean;
}

// Re-export Figma types we use
export type VariableResolvedDataType = 'BOOLEAN' | 'COLOR' | 'FLOAT' | 'STRING';
export type VariableScope = 'ALL_SCOPES' | 'TEXT_CONTENT' | 'CORNER_RADIUS' | 'WIDTH_HEIGHT' | 'GAP';

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

export interface RGBValue {
  r: number;
  g: number;
  b: number;
}

export interface RGBAValue extends RGBValue {
  a: number;
}

export interface ModeData {
  name: string;
  variables: VariableData[];
}

export interface ModeData {
  name: string;
  variables: VariableData[];
}

export interface ModeData {
  name: string;
  variables: VariableData[];
}

export interface ModeData {
  name: string;
  variables: VariableData[];
} 