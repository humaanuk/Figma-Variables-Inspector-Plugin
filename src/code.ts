/// <reference types="@figma/plugin-typings" />

import { 
  Collection, 
  Mode, 
  FigmaVariable,
  VariableData, 
  ModeData, 
  CollectionData, 
  TemplateData, 
  AliasValue, 
  VariableMap, 
  CollectionsMap, 
  CollectionModesMap, 
  SelectedCollection, 
  PluginMessage,
  VariableValue,
  VariableResolvedDataType, 
  VariableAlias, 
  RGBValue, 
  ModeMap
} from './types';

// Only keep the extended interface
interface ModeDataWithId extends ModeData {
  modeId: string;
}

figma.showUI(__html__, { width: 400, height: 600 });

// Template data
const templateData: TemplateData = {
  "collections": [
    {
      "name": "Base Colors",
      "modes": ["Light", "Dark"],
      "variables": [
        {
          "name": "Primary Color",
          "type": "COLOR",
          "valuesByMode": {
            "Light": "#18A0FB",
            "Dark": "#0D8DE3"
          }
        },
        {
          "name": "Secondary Color",
          "type": "COLOR",
          "valuesByMode": {
            "Light": "#0D8DE3",
            "Dark": "#18A0FB"
          }
        },
        {
          "name": "Text Size",
          "type": "FLOAT",
          "valuesByMode": {
            "Light": 16,
            "Dark": 16
          }
        }
      ]
    },
    {
      "name": "Alias Tokens",
      "modes": ["Light", "Dark"],
      "variables": [
        {
          "name": "Button Background",
          "type": "COLOR",
          "valuesByMode": {
            "Light": {
              "type": "ALIAS",
              "value": {
                "collection": "Base Colors",
                "mode": "Light",
                "variable": "Primary Color"
              }
            },
            "Dark": {
              "type": "ALIAS",
              "value": {
                "collection": "Base Colors",
                "mode": "Dark",
                "variable": "Primary Color"
              }
            }
          }
        },
        {
          "name": "Button Text",
          "type": "COLOR",
          "valuesByMode": {
            "Light": {
              "type": "ALIAS",
              "value": {
                "collection": "Base Colors",
                "mode": "Light",
                "variable": "Secondary Color"
              }
            },
            "Dark": {
              "type": "ALIAS",
              "value": {
                "collection": "Base Colors",
                "mode": "Dark",
                "variable": "Secondary Color"
              }
            }
          }
        },
        {
          "name": "Button Text Size",
          "type": "FLOAT",
          "valuesByMode": {
            "Light": {
              "type": "ALIAS",
              "value": {
                "collection": "Base Colors",
                "mode": "Light",
                "variable": "Text Size"
              }
            },
            "Dark": {
              "type": "ALIAS",
              "value": {
                "collection": "Base Colors",
                "mode": "Dark",
                "variable": "Text Size"
              }
            }
          }
        }
      ]
    },
    {
      "name": "Responsive",
      "modes": ["Desktop", "Tablet", "Mobile"],
      "variables": [
        {
          "name": "Container Width",
          "type": "FLOAT",
          "valuesByMode": {
            "Desktop": 1200,
            "Tablet": 768,
            "Mobile": 375
          }
        },
        {
          "name": "Spacing",
          "type": "FLOAT",
          "valuesByMode": {
            "Desktop": 24,
            "Tablet": 16,
            "Mobile": 12
          }
        },
        {
          "name": "Border Radius",
          "type": "FLOAT",
          "valuesByMode": {
            "Desktop": 8,
            "Tablet": 6,
            "Mobile": 4
          }
        }
      ]
    }
  ]
};

// Function to get all variable collections
function getAllVariableCollections(): Collection[] {
  return figma.variables.getLocalVariableCollections().map(collection => ({
    id: collection.id,
    name: collection.name,
    variableCount: collection.variableIds.length,
    variables: collection.variableIds
      .map(id => figma.variables.getVariableById(id))
      .filter((v): v is Variable => v !== null)
  }));
}

// Function to find a variable by name in a collection
function findVariableInCollection(collection: VariableCollection, variableName: string): Variable | null {
  return collection.variableIds
    .map(id => figma.variables.getVariableById(id))
    .find(v => v?.name === variableName) || null;
}

// Function to check if a collection exists
function collectionExists(name: string): boolean {
  const collections = figma.variables.getLocalVariableCollections();
  return collections.some(collection => collection.name === name);
}

// Function to create variables from JSON
async function createVariablesFromJSON(jsonData: string): Promise<{ success: boolean; variableCount: number }> {
  try {
    const data = JSON.parse(jsonData) as { collections: CollectionData[] };
    
    if (!data.collections || !Array.isArray(data.collections)) {
      throw new Error('Invalid format: collections array is required');
    }

    // Sort collections to process non-alias collections first
    const sortedCollections = [...data.collections].sort((a, b) => {
      const aHasAliases = a.variables.some(v => 
        v.type === 'ALIAS' || 
        (v.valuesByMode && Object.values(v.valuesByMode).some(value => 
          typeof value === 'object' && value !== null && 'type' in value && value.type === 'ALIAS'
        ))
      );
      const bHasAliases = b.variables.some(v => 
        v.type === 'ALIAS' || 
        (v.valuesByMode && Object.values(v.valuesByMode).some(value => 
          typeof value === 'object' && value !== null && 'type' in value && value.type === 'ALIAS'
        ))
      );
      if (aHasAliases && !bHasAliases) return 1;
      if (!aHasAliases && bHasAliases) return -1;
      return 0;
    });

    console.log('Sorted collections:', sortedCollections.map(c => c.name));

    // Create collections and their modes first
    const collections: CollectionsMap = {};
    const modeMap: CollectionModesMap = {};
    let totalVariables = 0;

    // First, get all existing collections
    const existingCollections = figma.variables.getLocalVariableCollections();
    for (const collection of existingCollections) {
      collections[collection.name] = collection;
      modeMap[collection.name] = {};
      for (const mode of collection.modes) {
        modeMap[collection.name][mode.name] = mode.modeId;
      }
    }

    // First pass: Create all collections and modes
    for (const collectionData of sortedCollections) {
      console.log(`Creating collection: ${collectionData.name}`);
      // Create or get collection
      if (!collections[collectionData.name]) {
        collections[collectionData.name] = figma.variables.createVariableCollection(collectionData.name);
        modeMap[collectionData.name] = {};

        // Get the default mode (Mode 1)
        const defaultMode = collections[collectionData.name].modes.find(m => m.name === 'Mode 1');
        if (defaultMode) {
          // If the first mode in our data is not "Mode 1", rename the default mode
          if (collectionData.modes[0] !== 'Mode 1') {
            collections[collectionData.name].renameMode(defaultMode.modeId, collectionData.modes[0]);
            modeMap[collectionData.name][collectionData.modes[0]] = defaultMode.modeId;
          } else {
            modeMap[collectionData.name]['Mode 1'] = defaultMode.modeId;
          }
        }

        // Create additional modes if needed
        for (const modeName of collectionData.modes.slice(1)) {
          const modeId = collections[collectionData.name].addMode(modeName);
          modeMap[collectionData.name][modeName] = modeId;
        }
      } else {
        // For existing collections, ensure all modes exist
        const collection = collections[collectionData.name];
        for (const modeName of collectionData.modes) {
          if (!modeMap[collectionData.name][modeName]) {
            const modeId = collection.addMode(modeName);
            modeMap[collectionData.name][modeName] = modeId;
          }
        }
      }
    }

    // Second pass: Create all non-alias variables and set their values
    for (const collectionData of sortedCollections) {
      const collection = collections[collectionData.name];
      console.log(`Processing non-alias variables for collection: ${collectionData.name}`);

      // Create variables
      for (const variableData of collectionData.variables) {
        // Skip alias variables for now
        if (variableData.type === 'ALIAS') continue;

        console.log(`Creating non-alias variable: ${variableData.name}`);
        let variable = findVariableInCollection(collection, variableData.name);

        if (!variable) {
          variable = figma.variables.createVariable(
            variableData.name,
            collection,
            variableData.type as VariableResolvedDataType
          );
          totalVariables++;
        }

        // Set scopes if provided
        if (variableData.scopes) {
          variable.scopes = variableData.scopes as VariableScope[];
        }

        // Set values for each mode
        if (variableData.valuesByMode) {
          for (const [modeName, value] of Object.entries(variableData.valuesByMode)) {
            const modeId = modeMap[collectionData.name][modeName];
            if (modeId) {
              if (typeof value === 'string' && value.startsWith('#')) {
                // Convert hex to RGB
                const r = parseInt(value.slice(1, 3), 16) / 255;
                const g = parseInt(value.slice(3, 5), 16) / 255;
                const b = parseInt(value.slice(5, 7), 16) / 255;
                variable.setValueForMode(modeId, { r, g, b });
              } else if (typeof value === 'number') {
                // Handle number values
                variable.setValueForMode(modeId, value);
              } else if (typeof value === 'object' && value !== null) {
                if ('type' in value && value.type === 'ALIAS') {
                  // Handle alias values
                  const aliasValue = value as { type: 'ALIAS'; value: { collection: string; variable: string } };
                  const targetCollection = collections[aliasValue.value.collection];
                  if (targetCollection) {
                    const targetVariable = findVariableInCollection(targetCollection, aliasValue.value.variable);
                    if (targetVariable) {
                      // Create a proper variable alias reference using Figma's API format
                      const aliasRef: VariableAlias = {
                        type: 'VARIABLE_ALIAS',
                        id: targetVariable.id
                      };
                      variable.setValueForMode(modeId, aliasRef);
                    }
                  }
                } else {
                  // Handle other object values
                  variable.setValueForMode(modeId, value);
                }
              } else {
                // Handle primitive values
                variable.setValueForMode(modeId, value);
              }
            }
          }
        }
      }
    }

    // Third pass: Create alias variables only after all non-alias variables exist
    for (const collectionData of sortedCollections) {
      const collection = collections[collectionData.name];
      console.log(`Processing alias variables for collection: ${collectionData.name}`);

      // Create variables
      for (const variableData of collectionData.variables) {
        // Only process alias variables
        if (variableData.type !== 'ALIAS') continue;

        console.log(`Creating alias variable: ${variableData.name}`);
        let variable = findVariableInCollection(collection, variableData.name);

        if (!variable) {
          variable = figma.variables.createVariable(
            variableData.name,
            collection,
            'COLOR' // Default to COLOR type for aliases
          );
          totalVariables++;
        }

        // Set scopes if provided
        if (variableData.scopes) {
          variable.scopes = variableData.scopes as VariableScope[];
        }

        // Set values for each mode
        if (variableData.valuesByMode) {
          for (const [modeName, value] of Object.entries(variableData.valuesByMode)) {
            const modeId = modeMap[collectionData.name][modeName];
            if (modeId && typeof value === 'object' && value !== null && 'type' in value && value.type === 'ALIAS') {
              const aliasValue = value as { type: 'ALIAS'; value: { collection: string; variable: string } };
              console.log(`Looking for target collection: ${aliasValue.value.collection}`);
              const targetCollection = collections[aliasValue.value.collection];
              if (targetCollection) {
                console.log(`Found target collection: ${targetCollection.name}`);
                console.log(`Looking for target variable: ${aliasValue.value.variable}`);
                const targetVariable = findVariableInCollection(targetCollection, aliasValue.value.variable);
                if (targetVariable) {
                  console.log(`Found target variable: ${targetVariable.name} (${targetVariable.id})`);
                  // Create a proper variable alias reference using Figma's API format
                  const aliasRef: VariableAlias = {
                    type: 'VARIABLE_ALIAS',
                    id: targetVariable.id
                  };
                  console.log(`Setting alias reference:`, aliasRef);
                  variable.setValueForMode(modeId, aliasRef);
                } else {
                  console.warn(`Target variable ${aliasValue.value.variable} not found in collection ${aliasValue.value.collection}`);
                }
              } else {
                console.warn(`Target collection ${aliasValue.value.collection} not found for alias`);
              }
            }
          }
        }
      }
    }

    return { success: true, variableCount: totalVariables };
  } catch (error) {
    console.error('Error creating variables:', error);
    return { success: false, variableCount: 0 };
  }
}

// Helper function to convert RGB values to hex
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number): string => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Function to convert variables to template format
export function convertVariablesToTemplate(
  collections: VariableCollection[],
  modes: Mode[],
  variables: Variable[]
): any {
  // Get all collections to properly handle aliases
  const allCollections = figma.variables.getLocalVariableCollections();
  const variableMap = new Map<string, Variable>();
  
  // First, map all variables from all collections to handle aliases properly
  allCollections.forEach(collection => {
    collection.variableIds.forEach(id => {
      const variable = figma.variables.getVariableById(id);
      if (variable) {
        variableMap.set(variable.id, variable);
      }
    });
  });

  // Sort collections to put those with aliases after their referenced collections
  const sortedCollections = [...collections].sort((a, b) => {
    const aVariables = variables.filter(v => v.variableCollectionId === a.id);
    const bVariables = variables.filter(v => v.variableCollectionId === b.id);
    
    const aHasAliases = aVariables.some(v => 
      Object.values(v.valuesByMode).some(modeValue => 
        typeof modeValue === 'object' && modeValue !== null && 'type' in modeValue && modeValue.type === 'VARIABLE_ALIAS'
      )
    );
    const bHasAliases = bVariables.some(v => 
      Object.values(v.valuesByMode).some(modeValue => 
        typeof modeValue === 'object' && modeValue !== null && 'type' in modeValue && modeValue.type === 'VARIABLE_ALIAS'
      )
    );

    if (aHasAliases && !bHasAliases) return 1;
    if (!aHasAliases && bHasAliases) return -1;
    return 0;
  });

  const processedCollections = sortedCollections.map(collection => {
    const processedModes = modes
      .filter(mode => collection.modes.some(m => m.modeId === mode.modeId))
      .map(mode => ({
        modeId: mode.modeId,
        name: mode.name
      }));

    const processedVariables = variables
      .filter(variable => variable.variableCollectionId === collection.id)
      .map(variable => {
        const variableData: {
          name: string;
          type: string;
          description?: string;
          scopes?: string[];
          valuesByMode: { [key: string]: any };
        } = {
          name: variable.name,
          type: variable.resolvedType,
          description: variable.description || undefined,
          scopes: variable.scopes,
          valuesByMode: {}
        };

        // Process values for each mode
        processedModes.forEach(mode => {
          const modeValue = variable.valuesByMode[mode.modeId];
          if (modeValue !== undefined) {
            if (typeof modeValue === 'object' && modeValue !== null) {
              if ('type' in modeValue && modeValue.type === 'VARIABLE_ALIAS') {
                const aliasVariable = variableMap.get(modeValue.id);
                if (aliasVariable) {
                  // Find the collection for the alias variable
                  const aliasCollection = allCollections.find(c => 
                    c.variableIds.includes(aliasVariable.id)
                  );
                  if (aliasCollection) {
                    variableData.valuesByMode[mode.name] = {
                      type: 'ALIAS',
                      value: {
                        collection: aliasCollection.name,
                        mode: mode.name,
                        variable: aliasVariable.name
                      }
                    };
                  }
                }
              } else if ('r' in modeValue && 'g' in modeValue && 'b' in modeValue) {
                variableData.valuesByMode[mode.name] = rgbToHex(
                  modeValue.r,
                  modeValue.g,
                  modeValue.b
                );
              } else {
                variableData.valuesByMode[mode.name] = modeValue;
              }
            } else {
              variableData.valuesByMode[mode.name] = modeValue;
            }
          }
        });

        return variableData;
      });

    return {
      name: collection.name,
      modes: processedModes.map(mode => mode.name),
      variables: processedVariables
    };
  });

  return { collections: processedCollections };
}

// Function to get modes for a collection
function getCollectionModes(collectionId: string): Mode[] {
  const collection = figma.variables.getVariableCollectionById(collectionId);
  if (!collection) return [];

  return collection.modes.map(mode => ({
    name: mode.name,
    modeId: mode.modeId
  }));
}

// Function to resolve color value
function resolveColorValue(value: any, modeId: string): RGB | RGBA {
  if (typeof value === 'object' && value !== null && value.type === 'VARIABLE_ALIAS' && value.id) {
    const aliasVariable = figma.variables.getVariableById(value.id);
    if (!aliasVariable) {
      throw new Error(`Alias variable not found: ${value.id}`);
    }

    const aliasValue = aliasVariable.valuesByMode[modeId];
    return resolveColorValue(aliasValue, modeId);
  }

  if (typeof value === 'object' && value !== null && 'r' in value && 'g' in value && 'b' in value) {
    if ('a' in value) {
      return value as RGBA;
    }
    return value as RGB;
  }

  throw new Error(`Invalid color value: ${JSON.stringify(value)}`);
}

// Function to create a frame with variable mode
async function createFrameWithVariableMode(collectionId: string, modeId: string) {
  const collection = figma.variables.getVariableCollectionById(collectionId);
  if (!collection) {
    throw new Error(`Collection not found: ${collectionId}`);
  }

  const variables = collection.variableIds
    .map(id => figma.variables.getVariableById(id))
    .filter((v): v is Variable => v !== null && v.resolvedType === 'COLOR');

  const frame = figma.createFrame();
  frame.name = `${collection.name} - ${collection.modes.find(m => m.modeId === modeId)?.name || 'Unknown Mode'}`;
  frame.resize(400, variables.length * 50 + 20);
  frame.x = figma.viewport.center.x - 200;
  frame.y = figma.viewport.center.y - frame.height / 2;

  let yOffset = 10;

  for (const variable of variables) {
    const rectangle = figma.createRectangle();
    rectangle.name = variable.name;
    rectangle.x = 10;
    rectangle.y = yOffset;
    rectangle.resize(30, 30);

    const value = variable.valuesByMode[modeId];
    const colorValue = resolveColorValue(value, modeId);

    rectangle.fills = [{
      type: 'SOLID',
      color: colorValue
    }];

    frame.appendChild(rectangle);

    const text = figma.createText();
    text.characters = variable.name;
    text.x = 50;
    text.y = yOffset + 7;
    frame.appendChild(text);

    yOffset += 50;
  }

  figma.currentPage.selection = [frame];
  figma.viewport.scrollAndZoomIntoView([frame]);

  return frame;
}

// Function to delete all collections
async function deleteAllCollections(): Promise<boolean> {
  try {
    const collections = figma.variables.getLocalVariableCollections();
    for (const collection of collections) {
      collection.remove();
    }
    return true;
  } catch (error) {
    console.error('Error deleting collections:', error);
    return false;
  }
}

// Add helper function to resolve alias variables
function resolveAliasVariable(value: any, variableMap: Map<string, { collection: VariableCollection; variable: Variable | null }>): { variable: Variable | null; value: any } {
  let targetVariable: Variable | null = null;
  let targetValue: any = null;

  if (typeof value === 'object' && value !== null && 'type' in value && value.type === 'VARIABLE_ALIAS') {
    targetVariable = figma.variables.getVariableById(value.id);
    if (targetVariable) {
      const modeIds = Object.keys(targetVariable.valuesByMode);
      if (modeIds.length > 0) {
        targetValue = targetVariable.valuesByMode[modeIds[0]];
      }
    }
  }

  return { variable: targetVariable, value: targetValue };
}

// Message handling
figma.ui.onmessage = async (msg: PluginMessage) => {
  try {
    switch (msg.type) {
      case 'get-collections':
        const collections = getAllVariableCollections();
        figma.ui.postMessage({ type: 'collections', collections });
        break;

      case 'get-modes':
        if (msg.collectionId) {
          const modes = getCollectionModes(msg.collectionId);
          figma.ui.postMessage({ type: 'modes', modes });
        }
        break;

      case 'create-frame':
        if (msg.collectionId && msg.modeId) {
          const frame = await createFrameWithVariableMode(msg.collectionId, msg.modeId);
          figma.ui.postMessage({ type: 'frame-created', frameId: frame.id });
        }
        break;

      case 'import-variables':
        if (msg.data) {
          console.log('Importing variables from JSON:', msg.data);
          const result = await createVariablesFromJSON(msg.data);
          console.log('Import result:', result);
          figma.ui.postMessage({ 
            type: 'import-complete',
            variableCount: result.variableCount
          });
        }
        break;

      case 'export-variables':
        if (msg.selectedCollections) {
          const allCollections = figma.variables.getLocalVariableCollections();
          // Filter collections based on selected IDs
          const selectedCollectionIds = msg.selectedCollections.map(c => c.id);
          const collections = allCollections.filter(c => selectedCollectionIds.includes(c.id));
          
          // Get modes and variables only from selected collections
          const modes = collections.flatMap(c => c.modes);
          const variables = collections.flatMap(c => 
            c.variableIds.map(id => figma.variables.getVariableById(id))
          ).filter((v): v is Variable => v !== null);
          
          const template = convertVariablesToTemplate(
            collections,
            modes,
            variables
          );
          figma.ui.postMessage({ 
            type: 'export-data',
            data: JSON.stringify(template, null, 2)
          });
        }
        break;

      case 'delete-collections':
        const success = await deleteAllCollections();
        figma.ui.postMessage({ type: 'delete-complete', success });
        break;

      case 'download-template':
        figma.ui.postMessage({ 
          type: 'template-data',
          data: JSON.stringify(templateData, null, 2)
        });
        break;
    }
  } catch (error) {
    console.error('Error handling message:', error);
    figma.ui.postMessage({ 
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Keep the plugin running
figma.on('close', () => {
  // This prevents the plugin from closing automatically
  return false;
}); 