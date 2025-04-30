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
  RGBValue, 
  ModeMap
} from './types';

// Only keep the extended interface
interface ModeDataWithId extends ModeData {
  modeId: string;
}

figma.showUI(__html__, { width: 400, height: 600 });

// Initial load of collections
(async () => {
  try {
    const collections = await getAllVariableCollections();
    console.log('Initial collections loaded:', collections);
    figma.ui.postMessage({ type: 'collections', collections });
  } catch (error) {
    console.error('Error loading initial collections:', error);
    figma.ui.postMessage({ 
      type: 'error',
      error: error instanceof Error ? error.message : 'Failed to load collections'
    });
  }
})();

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
async function getAllVariableCollections(): Promise<Collection[]> {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const collectionsWithVariables = await Promise.all(collections.map(async collection => ({
    id: collection.id,
    name: collection.name,
    variableCount: collection.variableIds.length,
    variables: await Promise.all(
      collection.variableIds.map(id => figma.variables.getVariableByIdAsync(id))
    ).then(vars => vars.filter((v): v is Variable => v !== null))
  })));
  return collectionsWithVariables;
}

// Function to find a variable by name in a collection
async function findVariableInCollection(collection: VariableCollection, variableName: string): Promise<Variable | null> {
  const variables = await Promise.all(
    collection.variableIds.map(id => figma.variables.getVariableByIdAsync(id))
  );
  return variables.find(v => v?.name === variableName) || null;
}

// Function to check if a collection exists
async function collectionExists(name: string): Promise<boolean> {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
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
    const collections: CollectionsMap = new Map();
    const modeMap: CollectionModesMap = new Map();
    let totalVariables = 0;

    // First, get all existing collections
    const existingCollections = await figma.variables.getLocalVariableCollectionsAsync();
    for (const collection of existingCollections) {
      collections.set(collection.name, collection);
      modeMap.set(collection.name, new Map());
      for (const mode of collection.modes) {
        modeMap.get(collection.name)?.set(mode.name, mode.modeId);
      }
    }

    // First pass: Create all collections and modes
    for (const collectionData of sortedCollections) {
      console.log(`Creating collection: ${collectionData.name}`);
      // Create or get collection
      if (!collections.has(collectionData.name)) {
        const newCollection = figma.variables.createVariableCollection(collectionData.name);
        collections.set(collectionData.name, newCollection);
        modeMap.set(collectionData.name, new Map());

        // Get the default mode (Mode 1)
        const defaultMode = newCollection.modes.find(m => m.name === 'Mode 1');
        if (defaultMode) {
          // If the first mode in our data is not "Mode 1", rename the default mode
          if (collectionData.modes[0] !== 'Mode 1') {
            newCollection.renameMode(defaultMode.modeId, collectionData.modes[0]);
            modeMap.get(collectionData.name)?.set(collectionData.modes[0], defaultMode.modeId);
          } else {
            modeMap.get(collectionData.name)?.set('Mode 1', defaultMode.modeId);
          }
        }

        // Create additional modes if needed
        for (const modeName of collectionData.modes.slice(1)) {
          const modeId = newCollection.addMode(modeName);
          modeMap.get(collectionData.name)?.set(modeName, modeId);
        }
      } else {
        // For existing collections, ensure all modes exist
        const collection = collections.get(collectionData.name);
        if (collection) {
          for (const modeName of collectionData.modes) {
            if (!modeMap.get(collectionData.name)?.has(modeName)) {
              const modeId = collection.addMode(modeName);
              modeMap.get(collectionData.name)?.set(modeName, modeId);
            }
          }
        }
      }
    }

    // Second pass: Create all non-alias variables and set their values
    for (const collectionData of sortedCollections) {
      const collection = collections.get(collectionData.name);
      if (!collection) continue;

      console.log(`Processing non-alias variables for collection: ${collectionData.name}`);

      // Create variables
      for (const variableData of collectionData.variables) {
        // Skip alias variables for now
        if (variableData.type === 'ALIAS') continue;

        console.log(`Creating non-alias variable: ${variableData.name}`);
        let variable = await findVariableInCollection(collection, variableData.name);

        if (!variable) {
          variable = figma.variables.createVariable(
            variableData.name,
            collection,
            variableData.type as VariableResolvedDataType
          );
          totalVariables++;
        }

        if (variable) {
          // Set scopes if provided
          if (variableData.scopes) {
            variable.scopes = variableData.scopes;
          }

          // Set values for each mode
          if (variableData.valuesByMode) {
            for (const [modeName, value] of Object.entries(variableData.valuesByMode)) {
              const modeId = modeMap.get(collectionData.name)?.get(modeName);
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
                    const aliasValue = value as AliasValue;
                    const targetCollection = collections.get(aliasValue.value.collection);
                    if (targetCollection) {
                      const targetVariable = await findVariableInCollection(targetCollection, aliasValue.value.variable);
                      if (targetVariable) {
                        variable.setValueForMode(modeId, {
                          type: 'VARIABLE_ALIAS',
                          id: targetVariable.id
                        });
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
    }

    // Third pass: Create alias variables only after all non-alias variables exist
    for (const collectionData of sortedCollections) {
      const collection = collections.get(collectionData.name);
      if (!collection) continue;

      console.log(`Processing alias variables for collection: ${collectionData.name}`);

      // Create variables
      for (const variableData of collectionData.variables) {
        // Only process alias variables
        if (variableData.type !== 'ALIAS') continue;

        console.log(`Creating alias variable: ${variableData.name}`);
        let variable = await findVariableInCollection(collection, variableData.name);

        if (!variable) {
          variable = figma.variables.createVariable(
            variableData.name,
            collection,
            'COLOR' // Default to COLOR type for aliases
          );
          totalVariables++;
        }

        if (variable) {
          // Set scopes if provided
          if (variableData.scopes) {
            variable.scopes = variableData.scopes;
          }

          // Set values for each mode
          if (variableData.valuesByMode) {
            for (const [modeName, value] of Object.entries(variableData.valuesByMode)) {
              const modeId = modeMap.get(collectionData.name)?.get(modeName);
              if (modeId && typeof value === 'object' && value !== null && 'type' in value && value.type === 'ALIAS') {
                const aliasValue = value as AliasValue;
                console.log(`Looking for target collection: ${aliasValue.value.collection}`);
                const targetCollection = collections.get(aliasValue.value.collection);
                if (targetCollection) {
                  console.log(`Found target collection: ${targetCollection.name}`);
                  console.log(`Looking for target variable: ${aliasValue.value.variable}`);
                  const targetVariable = await findVariableInCollection(targetCollection, aliasValue.value.variable);
                  if (targetVariable) {
                    console.log(`Found target variable: ${targetVariable.name} (${targetVariable.id})`);
                    variable.setValueForMode(modeId, {
                      type: 'VARIABLE_ALIAS',
                      id: targetVariable.id
                    });
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
async function convertVariablesToTemplate(
  collections: VariableCollection[],
  modes: { name: string; modeId: string }[],
  variables: Variable[],
  useHexRef: boolean = true
): Promise<TemplateData> {
  // Get all collections to properly handle aliases
  const allCollections = await figma.variables.getLocalVariableCollectionsAsync();
  const variableMap = new Map<string, Variable>();
  
  // First, map all variables for alias resolution
  for (const variable of variables) {
    variableMap.set(variable.id, variable);
  }

  // Sort collections to ensure aliases are processed after their referenced collections
  const sortedCollections = [...collections].sort((a, b) => {
    const aHasAliases = variables.some(v => 
      v.variableCollectionId === a.id && 
      (Object.values(v.valuesByMode).some(value => 
        typeof value === 'object' && value !== null && 'type' in value && value.type === 'VARIABLE_ALIAS'
      ))
    );
    const bHasAliases = variables.some(v => 
      v.variableCollectionId === b.id && 
      (Object.values(v.valuesByMode).some(value => 
        typeof value === 'object' && value !== null && 'type' in value && value.type === 'VARIABLE_ALIAS'
      ))
    );
    if (aHasAliases && !bHasAliases) return 1;
    if (!aHasAliases && bHasAliases) return -1;
    return 0;
  });

  return {
    collections: sortedCollections.map(collection => {
      const collectionVariables = variables.filter(v => v.variableCollectionId === collection.id);
      return {
        name: collection.name,
        modes: collection.modes.map(m => m.name),
        variables: collectionVariables.map(variable => {
          const valuesByMode: Record<string, any> = {};
          
          // Process each mode's value
          for (const [modeId, value] of Object.entries(variable.valuesByMode)) {
            const mode = collection.modes.find(m => m.modeId === modeId);
            if (mode) {
              if (typeof value === 'object' && value !== null && 'type' in value && value.type === 'VARIABLE_ALIAS') {
                // Handle alias values
                const aliasVariable = variableMap.get(value.id);
                if (aliasVariable) {
                  const aliasCollection = allCollections.find(c => c.id === aliasVariable.variableCollectionId);
                  if (aliasCollection) {
                    // Get the mode name from the alias collection
                    const aliasMode = aliasCollection.modes.find(m => m.modeId === modeId);
                    valuesByMode[mode.name] = {
                      type: 'ALIAS',
                      value: {
                        collection: aliasCollection.name,
                        mode: aliasMode?.name || mode.name,
                        variable: aliasVariable.name
                      }
                    };
                  }
                }
              } else if (useHexRef && typeof value === 'object' && value !== null && 'r' in value && 'g' in value && 'b' in value) {
                // Convert RGB to hex if hexref is enabled
                valuesByMode[mode.name] = rgbToHex(value.r, value.g, value.b);
              } else {
                // Handle regular values
                valuesByMode[mode.name] = value;
              }
            }
          }

          return {
            name: variable.name,
            type: variable.resolvedType,
            valuesByMode
          };
        })
      };
    })
  };
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
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
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
        console.log('Fetching collections...');
        const collections = await getAllVariableCollections();
        console.log('Collections fetched:', collections);
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
          const allCollections = await figma.variables.getLocalVariableCollectionsAsync();
          // Filter collections based on selected IDs
          const selectedCollectionIds = msg.selectedCollections.map(c => c.id);
          const collections = allCollections.filter(c => selectedCollectionIds.includes(c.id));
          
          // Get all variables from all collections to properly handle aliases
          const allVariables = await Promise.all(
            allCollections.flatMap(c => c.variableIds)
              .map(id => figma.variables.getVariableByIdAsync(id))
          ).then(vars => vars.filter((v): v is Variable => v !== null));
          
          // Get modes and variables only from selected collections
          const modes = collections.flatMap(c => c.modes);
          const variables = allVariables.filter(v => selectedCollectionIds.includes(v.variableCollectionId));
          
          const template = await convertVariablesToTemplate(
            collections,
            modes,
            allVariables, // Pass all variables to handle aliases properly
            msg.useHexRef // Pass the hexref option
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