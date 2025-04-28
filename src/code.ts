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
  VariableValue
} from './types';

figma.showUI(__html__, { width: 400, height: 600 });

// Template data
const templateData: TemplateData = {
  "collections": [
    {
      "name": "Base Colors",
      "modes": [
        {
          "name": "Light",
          "variables": [
            {
              "name": "Primary Color",
              "type": "COLOR",
              "value": "#18A0FB"
            },
            {
              "name": "Secondary Color",
              "type": "COLOR",
              "value": "#0D8DE3"
            },
            {
              "name": "Text Size",
              "type": "FLOAT",
              "value": 16
            }
          ]
        },
        {
          "name": "Dark",
          "variables": [
            {
              "name": "Primary Color",
              "type": "COLOR",
              "value": "#0D8DE3"
            },
            {
              "name": "Secondary Color",
              "type": "COLOR",
              "value": "#18A0FB"
            },
            {
              "name": "Text Size",
              "type": "FLOAT",
              "value": 16
            }
          ]
        }
      ]
    },
    {
      "name": "Alias Tokens",
      "modes": [
        {
          "name": "Light",
          "variables": [
            {
              "name": "Button Background",
              "type": "ALIAS",
              "value": {
                "collection": "Base Colors",
                "mode": "Light",
                "variable": "Primary Color"
              }
            },
            {
              "name": "Button Text",
              "type": "ALIAS",
              "value": {
                "collection": "Base Colors",
                "mode": "Light",
                "variable": "Secondary Color"
              }
            },
            {
              "name": "Button Text Size",
              "type": "ALIAS",
              "value": {
                "collection": "Base Colors",
                "mode": "Light",
                "variable": "Text Size"
              }
            }
          ]
        },
        {
          "name": "Dark",
          "variables": [
            {
              "name": "Button Background",
              "type": "ALIAS",
              "value": {
                "collection": "Base Colors",
                "mode": "Dark",
                "variable": "Primary Color"
              }
            },
            {
              "name": "Button Text",
              "type": "ALIAS",
              "value": {
                "collection": "Base Colors",
                "mode": "Dark",
                "variable": "Secondary Color"
              }
            },
            {
              "name": "Button Text Size",
              "type": "ALIAS",
              "value": {
                "collection": "Base Colors",
                "mode": "Dark",
                "variable": "Text Size"
              }
            }
          ]
        }
      ]
    },
    {
      "name": "Responsive",
      "modes": [
        {
          "name": "Desktop",
          "variables": [
            {
              "name": "Container Width",
              "type": "FLOAT",
              "value": 1200
            },
            {
              "name": "Spacing",
              "type": "FLOAT",
              "value": 24
            },
            {
              "name": "Border Radius",
              "type": "FLOAT",
              "value": 8
            }
          ]
        },
        {
          "name": "Tablet",
          "variables": [
            {
              "name": "Container Width",
              "type": "FLOAT",
              "value": 768
            },
            {
              "name": "Spacing",
              "type": "FLOAT",
              "value": 16
            },
            {
              "name": "Border Radius",
              "type": "FLOAT",
              "value": 6
            }
          ]
        },
        {
          "name": "Mobile",
          "variables": [
            {
              "name": "Container Width",
              "type": "FLOAT",
              "value": 375
            },
            {
              "name": "Spacing",
              "type": "FLOAT",
              "value": 12
            },
            {
              "name": "Border Radius",
              "type": "FLOAT",
              "value": 4
            }
          ]
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
  const variable = collection.variableIds
    .map(id => figma.variables.getVariableById(id))
    .find(v => v?.name === variableName);
  return variable || null;
}

// Function to check if a collection exists
function collectionExists(name: string): boolean {
  const collections = figma.variables.getLocalVariableCollections();
  return collections.some(collection => collection.name === name);
}

// Function to create variables from JSON
async function createVariablesFromJSON(jsonData: string): Promise<{ success: boolean; variableCount: number }> {
  try {
    const data = JSON.parse(jsonData) as TemplateData;
    
    if (!data.collections || !Array.isArray(data.collections)) {
      throw new Error('Invalid format: collections array is required');
    }

    // First, identify all collections that are referenced in aliases
    const referencedCollections = new Set<string>();
    for (const collection of data.collections) {
      for (const mode of collection.modes) {
        for (const variable of mode.variables) {
          if (variable.type === 'COLOR' && variable.value?.collection) {
            referencedCollections.add(variable.value.collection);
          }
        }
      }
    }

    // Create collections and their modes first
    const collections: CollectionsMap = {};
    const modeMap: CollectionModesMap = {};

    // First, get all existing collections
    const existingCollections = figma.variables.getLocalVariableCollections();
    for (const collection of existingCollections) {
      collections[collection.name] = collection;
      modeMap[collection.name] = {};
      for (const mode of collection.modes) {
        modeMap[collection.name][mode.name] = mode.modeId;
      }
    }

    // Then create any new collections from the import
    for (const collectionData of data.collections) {
      if (!collections[collectionData.name]) {
        collections[collectionData.name] = figma.variables.createVariableCollection(collectionData.name);
        modeMap[collectionData.name] = {};
      }

      const collection = collections[collectionData.name];

      // Create modes for the collection
      for (const modeData of collectionData.modes) {
        let modeId = collection.modes.find(m => m.name === modeData.name)?.modeId;
        
        if (!modeId) {
          modeId = collection.addMode(modeData.name);
        }

        if (modeId) {
          modeMap[collectionData.name][modeData.name] = modeId;
        }
      }
    }

    // Create non-alias variables first
    const variableMap: VariableMap = {};
    let totalVariables = 0;

    for (const collectionData of data.collections) {
      const collection = collections[collectionData.name];
      variableMap[collectionData.name] = {};

      for (const mode of collectionData.modes) {
        const modeId = modeMap[collectionData.name][mode.name];

        for (const variableData of mode.variables) {
          if (!variableData.name || !variableData.type || variableData.value === undefined) {
            console.warn(`Skipping invalid variable data: ${JSON.stringify(variableData)}`);
            continue;
          }

          // Skip alias variables for now
          if (variableData.type === 'COLOR' && typeof variableData.value === 'object' && 'collection' in variableData.value) {
            continue;
          }

          console.log(`Processing variable: ${variableData.name} of type ${variableData.type}`);

          let variable = findVariableInCollection(collection, variableData.name);

          if (!variable) {
            if (variableData.type === 'ALIAS') continue;
            variable = figma.variables.createVariable(
              variableData.name,
              collection.id,
              variableData.type
            );
            totalVariables++;
          }

          variableMap[collectionData.name][variableData.name] = {
            collection,
            variable
          };

          // Set the value for this mode
          let value: any;

          switch (variableData.type) {
            case 'COLOR':
              const hex = (variableData.value as string).replace('#', '');
              const r = parseInt(hex.substring(0, 2), 16) / 255;
              const g = parseInt(hex.substring(2, 4), 16) / 255;
              const b = parseInt(hex.substring(4, 6), 16) / 255;

              value = {
                r,
                g,
                b
              };
              break;

            case 'FLOAT':
              value = variableData.value as number;
              break;

            case 'STRING':
              value = variableData.value as string;
              break;

            case 'BOOLEAN':
              value = variableData.value as boolean;
              break;

            default:
              throw new Error(`Unsupported variable type: ${variableData.type}`);
          }

          if (variable) {
            variable.setValueForMode(modeId, value);
          }
        }
      }
    }

    // Now create alias variables
    for (const collectionData of data.collections) {
      const collection = collections[collectionData.name];

      for (const mode of collectionData.modes) {
        const currentModeId = modeMap[collectionData.name][mode.name];
        const aliasVariables = mode.variables.filter(v => v.type === 'COLOR' && typeof v.value === 'object' && 'collection' in v.value);

        for (const variableData of aliasVariables) {
          console.log(`Processing alias variable: ${variableData.name}`);

          let variable = findVariableInCollection(collection, variableData.name);

          if (!variable) {
            variable = figma.variables.createVariable(
              variableData.name,
              collection.id,
              'COLOR'
            );
            totalVariables++;
          }

          const aliasValue = variableData.value as AliasValue;
          if (!aliasValue.collection || !aliasValue.mode || !aliasValue.variable) {
            console.warn(`Invalid alias value for ${variableData.name}`);
            continue;
          }

          // Find the target collection (it might be an existing one)
          const targetCollection = collections[aliasValue.collection];
          if (!targetCollection) {
            console.warn(`Target collection ${aliasValue.collection} not found for alias ${variableData.name}`);
            continue;
          }

          // Find the target variable in the collection
          const targetVariable = findVariableInCollection(targetCollection, aliasValue.variable);
          if (!targetVariable) {
            console.warn(`Target variable ${aliasValue.variable} not found in collection ${aliasValue.collection}`);
            continue;
          }

          // Find the target mode
          const targetMode = targetCollection.modes.find(m => m.name === aliasValue.mode);
          if (!targetMode) {
            console.warn(`Target mode ${aliasValue.mode} not found in collection ${aliasValue.collection}`);
            continue;
          }

          // Get the target mode ID
          const targetModeId = modeMap[aliasValue.collection][aliasValue.mode];
          if (!targetModeId) {
            console.warn(`Target mode ID not found for ${aliasValue.mode} in collection ${aliasValue.collection}`);
            continue;
          }

          // Get the target value
          const targetValue = targetVariable.valuesByMode[targetModeId];
          if (!targetValue) {
            console.warn(`Target value not found for variable ${aliasValue.variable} in mode ${aliasValue.mode}`);
            continue;
          }

          // Set the alias value
          if (variable) {
            variable.setValueForMode(currentModeId, {
              type: 'VARIABLE_ALIAS',
              id: targetVariable.id
            });
          }

          variableMap[collectionData.name][variableData.name] = {
            collection,
            variable
          };
        }
      }
    }

    return { success: true, variableCount: totalVariables };
  } catch (error) {
    console.error('Error creating variables:', error);
    throw error;
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
function convertVariablesToTemplate(selectedCollections: SelectedCollection[]): TemplateData {
  const template: TemplateData = {
    collections: []
  };

  for (const selected of selectedCollections) {
    const collection = figma.variables.getVariableCollectionById(selected.id);
    if (!collection) continue;

    const collectionData: CollectionData = {
      name: collection.name,
      modes: []
    };

    // Process each mode
    for (const mode of collection.modes) {
      const modeData: ModeData = {
        name: mode.name,
        variables: []
      };

      // Get all variables for this collection
      const variables = collection.variableIds.map(id => figma.variables.getVariableById(id)!);

      // Process each variable
      for (const variable of variables) {
        const value = variable.valuesByMode[mode.modeId];
        const variableData: VariableData = {
          name: variable.name,
          type: variable.resolvedType,
          value: undefined
        };

        if (typeof value === 'object' && value !== null && 'type' in value && value.type === 'VARIABLE_ALIAS') {
          const aliasVariable = figma.variables.getVariableById(value.id);
          if (!aliasVariable) continue;

          const aliasCollection = figma.variables.getVariableCollectionById(aliasVariable.variableCollectionId);
          if (!aliasCollection) continue;

          // Find the mode name that matches the current value
          let aliasModeName = '';
          for (const [modeId, modeValue] of Object.entries(aliasVariable.valuesByMode)) {
            if (modeValue && typeof modeValue === 'object' && 'type' in modeValue && modeValue.type === 'VARIABLE_ALIAS' && modeValue.id === value.id) {
              aliasModeName = aliasCollection.modes.find(m => m.modeId === modeId)?.name || '';
              break;
            }
          }

          if (aliasModeName) {
            variableData.type = 'COLOR';
            variableData.value = {
              collection: aliasCollection.name,
              mode: aliasModeName,
              variable: aliasVariable.name
            };
          }
        } else if (variable.resolvedType === 'COLOR' && typeof value === 'object' && value !== null && 'r' in value && 'g' in value && 'b' in value) {
          // Convert RGB values to hex
          variableData.value = rgbToHex(value.r, value.g, value.b);
        } else {
          variableData.value = value;
        }

        if (variableData.value !== undefined) {
          modeData.variables.push(variableData);
        }
      }

      collectionData.modes.push(modeData);
    }

    template.collections.push(collectionData);
  }

  return template;
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
          const template = convertVariablesToTemplate(msg.selectedCollections);
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