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

// Function to create variables from JSON
async function createVariablesFromJSON(jsonData) {
  try {
    const data = JSON.parse(jsonData);
    
    if (!data.collections || !Array.isArray(data.collections)) {
      throw new Error('Invalid format: collections array is required');
    }

    for (const collection of data.collections) {
      if (!collection.name || !collection.modes || !Array.isArray(collection.modes)) {
        throw new Error('Invalid collection format: name and modes array are required');
      }

      // Create collection
      const newCollection = figma.variables.createVariableCollection(collection.name);
      
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

      // Create variables for each mode
      for (const mode of collection.modes) {
        if (!mode.variables || !Array.isArray(mode.variables)) {
          throw new Error('Invalid mode format: variables array is required');
        }

        for (const variableData of mode.variables) {
          if (!variableData.name || !variableData.type || variableData.value === undefined) {
            throw new Error('Invalid variable format: name, type, and value are required');
          }

          // Check if variable already exists
          let existingVariable = null;
          for (const varId of newCollection.variableIds) {
            const currentVar = figma.variables.getVariableById(varId);
            if (currentVar.name === variableData.name) {
              existingVariable = currentVar;
              break;
            }
          }

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

          // Set value for this mode
          let value;
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

          // Get the current mode ID
          const currentMode = newCollection.modes.find(m => m.name === mode.name);
          const currentModeId = currentMode ? currentMode.modeId : null;
          console.log('Mode assignment:', {
            variable: variableData.name,
            mode: mode.name,
            modeId: currentModeId,
            value: value
          });
          
          if (!currentModeId) {
            throw new Error(`Mode ID not found for mode: ${mode.name}`);
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

    return true;
  } catch (error) {
    throw error;
  }
}

// Listen for messages from the UI
figma.ui.onmessage = async msg => {
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