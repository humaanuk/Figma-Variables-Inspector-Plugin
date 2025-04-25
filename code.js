figma.showUI(__html__, { width: 400, height: 600 });

// Template data
const templateData = {
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
function getAllVariableCollections() {
  const collections = figma.variables.getLocalVariableCollections();
  return collections.map(collection => ({
    id: collection.id,
    name: collection.name,
    variableCount: collection.variableIds.length
  }));
}

// Function to find a variable by name in a collection
function findVariableInCollection(collection, variableName) {
  for (const varId of collection.variableIds) {
    const variable = figma.variables.getVariableById(varId);
    if (variable.name === variableName) {
      return variable;
    }
  }
  return null;
}

// Function to create variables from JSON
async function createVariablesFromJSON(jsonData) {
  try {
    const data = JSON.parse(jsonData);
    
    if (!data.collections || !Array.isArray(data.collections)) {
      throw new Error('Invalid format: collections array is required');
    }

    // First pass: Create all collections and modes
    const collections = {};
    for (const collection of data.collections) {
      if (!collection.name || !collection.modes || !Array.isArray(collection.modes)) {
        throw new Error('Invalid collection format: name and modes array are required');
      }

      // Create collection
      const newCollection = figma.variables.createVariableCollection(collection.name);
      collections[collection.name] = newCollection;
      
      // Create all modes
      const modeIds = {};
      for (const mode of collection.modes) {
        console.log('Creating mode:', mode.name);
        const newMode = newCollection.addMode(mode.name);
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Verify the mode was created
        const createdMode = newCollection.modes.find(m => m.name === mode.name);
        if (!createdMode) {
          throw new Error(`Failed to create mode: ${mode.name}`);
        }
        
        console.log('Created mode:', createdMode.name, 'with ID:', createdMode.modeId);
        modeIds[mode.name] = createdMode.modeId;
      }

      // Remove the default mode if it exists
      const defaultMode = newCollection.modes.find(m => m.name === 'Mode 1');
      if (defaultMode) {
        console.log('Removing default mode');
        newCollection.removeMode(defaultMode.modeId);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Second pass: Create variables and set values
    for (const collection of data.collections) {
      const newCollection = collections[collection.name];
      
      for (const mode of collection.modes) {
        if (!mode.variables || !Array.isArray(mode.variables)) {
          throw new Error('Invalid mode format: variables array is required');
        }

        for (const variableData of mode.variables) {
          if (!variableData.name || !variableData.type || variableData.value === undefined) {
            throw new Error('Invalid variable format: name, type, and value are required');
          }

          // Check if variable already exists
          let existingVariable = findVariableInCollection(newCollection, variableData.name);

          // Create variable if it doesn't exist
          if (!existingVariable) {
            let variableType;
            switch (variableData.type.toUpperCase()) {
              case 'COLOR':
                variableType = 'COLOR';
                break;
              case 'FLOAT':
                variableType = 'FLOAT';
                break;
              case 'STRING':
                variableType = 'STRING';
                break;
              case 'BOOLEAN':
                variableType = 'BOOLEAN';
                break;
              case 'ALIAS':
                // For aliases, we need to determine the type based on the referenced variable
                const { collection: refCollection, variable: refVariable } = variableData.value;
                const targetCollection = collections[refCollection];
                if (!targetCollection) {
                  throw new Error(`Reference collection not found: ${refCollection}`);
                }
                const targetVariable = findVariableInCollection(targetCollection, refVariable);
                if (!targetVariable) {
                  throw new Error(`Reference variable not found: ${refVariable}`);
                }
                variableType = targetVariable.resolvedType;
                break;
              default:
                throw new Error(`Unsupported variable type: ${variableData.type}`);
            }

            existingVariable = figma.variables.createVariable(
              variableData.name,
              newCollection,
              variableType
            );
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          // Get the current mode ID first
          const currentMode = newCollection.modes.find(m => m.name === mode.name);
          const currentModeId = currentMode ? currentMode.modeId : null;
          console.log('Mode assignment:', {
            variable: variableData.name,
            mode: mode.name,
            modeId: currentModeId
          });
          
          if (!currentModeId) {
            throw new Error(`Mode ID not found for mode: ${mode.name}`);
          }

          // Set value for this mode
          let value;
          if (variableData.type.toUpperCase() === 'ALIAS') {
            // Handle alias type
            const { collection: refCollection, mode: refMode, variable: refVariable } = variableData.value;
            const targetCollection = collections[refCollection];
            if (!targetCollection) {
              throw new Error(`Reference collection not found: ${refCollection}`);
            }
            
            const targetVariable = findVariableInCollection(targetCollection, refVariable);
            if (!targetVariable) {
              throw new Error(`Reference variable not found: ${refVariable}`);
            }

            // Get the target mode ID
            const targetMode = targetCollection.modes.find(m => m.name === refMode);
            if (!targetMode) {
              throw new Error(`Target mode not found: ${refMode}`);
            }

            // Set the alias value
            try {
              existingVariable.setValueForMode(currentModeId, {
                type: 'VARIABLE_ALIAS',
                id: targetVariable.id
              });
              console.log(`Successfully set alias for ${variableData.name} to ${refVariable} in mode ${mode.name}`);
              await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
              console.error(`Failed to set alias for ${variableData.name}:`, error);
              throw error;
            }
          } else {
            // Handle regular types
            switch (variableData.type.toUpperCase()) {
              case 'COLOR':
                const hex = variableData.value.replace('#', '');
                value = {
                  r: parseInt(hex.substr(0, 2), 16) / 255,
                  g: parseInt(hex.substr(2, 2), 16) / 255,
                  b: parseInt(hex.substr(4, 2), 16) / 255
                };
                console.log(`Setting COLOR value for ${variableData.name}:`, {
                  original: variableData.value,
                  converted: value
                });
                break;
              case 'FLOAT':
                value = variableData.value;
                console.log(`Setting FLOAT value for ${variableData.name}:`, value);
                break;
              case 'STRING':
                value = variableData.value;
                console.log(`Setting STRING value for ${variableData.name}:`, value);
                break;
              case 'BOOLEAN':
                value = variableData.value;
                console.log(`Setting BOOLEAN value for ${variableData.name}:`, value);
                break;
            }

            // Set the value for this specific mode
            try {
              existingVariable.setValueForMode(currentModeId, value);
              console.log(`Successfully set value for ${variableData.name} in mode ${mode.name}`);
              await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
              console.error(`Failed to set value for ${variableData.name} in mode ${mode.name}:`, error);
              throw error;
            }
          }
        }
      }
    }

    return true;
  } catch (error) {
    throw error;
  }
}

// Function to convert RGB to hex
function rgbToHex(r, g, b) {
  const toHex = (n) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Function to convert variables to template format
function convertVariablesToTemplate() {
  console.log('Starting variable conversion');
  const collections = figma.variables.getLocalVariableCollections();
  console.log('Found collections:', collections.length);
  
  const templateData = {
    collections: []
  };

  for (const collection of collections) {
    console.log('Processing collection:', collection.name);
    console.log('Collection modes:', collection.modes.map(m => m.name));
    console.log('Collection variables:', collection.variableIds.length);
    
    const collectionData = {
      name: collection.name,
      modes: []
    };

    for (const mode of collection.modes) {
      console.log('Processing mode:', mode.name);
      console.log('Mode ID:', mode.modeId);
      
      const modeData = {
        name: mode.name,
        variables: []
      };

      for (const varId of collection.variableIds) {
        const variable = figma.variables.getVariableById(varId);
        console.log('Processing variable:', variable.name);
        console.log('Variable type:', variable.resolvedType);
        console.log('Variable values by mode:', variable.valuesByMode);
        
        const value = variable.valuesByMode[mode.modeId];
        console.log('Value for mode:', value);
        
        if (value === undefined) {
          console.log('Skipping undefined value for variable:', variable.name);
          continue;
        }

        const variableData = {
          name: variable.name,
          type: variable.resolvedType,
          value: value
        };

        // Handle alias type
        if (value.type === 'VARIABLE_ALIAS') {
          console.log('Processing alias variable:', variable.name);
          console.log('Alias value:', value);
          
          const aliasVariable = figma.variables.getVariableById(value.id);
          console.log('Alias variable found:', aliasVariable ? aliasVariable.name : 'not found');
          
          const aliasCollection = collections.find(c => c.variableIds.includes(value.id));
          console.log('Alias collection found:', aliasCollection ? aliasCollection.name : 'not found');
          
          // Find the mode where this alias is defined
          let aliasMode = null;
          for (const m of aliasCollection.modes) {
            const modeValue = aliasVariable.valuesByMode[m.modeId];
            console.log('Checking mode:', m.name, 'value:', modeValue);
            // Check if this is the mode where the alias is defined
            if (modeValue && modeValue.type === 'VARIABLE_ALIAS' && modeValue.id === value.id) {
              aliasMode = m;
              break;
            }
          }

          if (!aliasMode) {
            // If we can't find the exact mode, use the first mode as a fallback
            console.log('Using first mode as fallback for variable:', variable.name);
            aliasMode = aliasCollection.modes[0];
          }

          variableData.type = 'ALIAS';
          variableData.value = {
            collection: aliasCollection.name,
            mode: aliasMode.name,
            variable: aliasVariable.name
          };
        } else if (variable.resolvedType === 'COLOR') {
          // Convert RGB to hex for color values
          variableData.value = rgbToHex(value.r, value.g, value.b);
        }

        modeData.variables.push(variableData);
        console.log('Added variable to mode:', variable.name);
      }

      collectionData.modes.push(modeData);
      console.log('Mode variables count:', modeData.variables.length);
    }

    templateData.collections.push(collectionData);
    console.log('Collection complete:', collection.name);
  }

  console.log('Finished converting variables');
  return templateData;
}

// Listen for messages from the UI
figma.ui.onmessage = async msg => {
  console.log('Received message:', msg.type);
  
  if (msg.type === 'get-collections') {
    const collections = getAllVariableCollections();
    figma.ui.postMessage({ 
      type: 'collections-data', 
      collections: collections 
    });
  } else if (msg.type === 'download-template') {
    figma.ui.postMessage({ 
      type: 'template-data', 
      data: JSON.stringify(templateData, null, 2)
    });
  } else if (msg.type === 'export-variables') {
    console.log('Starting export process');
    try {
      const exportData = convertVariablesToTemplate();
      console.log('Export data created:', exportData);
      figma.ui.postMessage({ 
        type: 'export-data', 
        data: JSON.stringify(exportData, null, 2)
      });
      console.log('Export data sent to UI');
    } catch (error) {
      console.error('Export error:', error);
      figma.ui.postMessage({ 
        type: 'import-error', 
        error: error.message 
      });
    }
  } else if (msg.type === 'create-variables') {
    try {
      await createVariablesFromJSON(msg.data);
      figma.ui.postMessage({ type: 'import-success' });
    } catch (error) {
      figma.ui.postMessage({ 
        type: 'import-error', 
        error: error.message 
      });
    }
  }
};

// Keep the plugin running
figma.on('close', () => {
  // This prevents the plugin from closing automatically
  return false;
}); 