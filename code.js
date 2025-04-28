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

// Function to check if a collection exists
function collectionExists(name) {
  const collections = figma.variables.getLocalVariableCollections();
  return collections.some(collection => collection.name === name);
}

// Function to create variables from JSON
async function createVariablesFromJSON(jsonData) {
  try {
    const data = JSON.parse(jsonData);
    
    if (!data.collections || !Array.isArray(data.collections)) {
      throw new Error('Invalid format: collections array is required');
    }

    // First, identify all collections that are referenced in aliases
    const referencedCollections = new Set();
    for (const collection of data.collections) {
      for (const mode of collection.modes) {
        for (const variable of mode.variables) {
          if (variable.type.toUpperCase() === 'ALIAS') {
            referencedCollections.add(variable.value.collection);
          }
        }
      }
    }
    console.log('Referenced collections:', Array.from(referencedCollections));

    // Check for existing collections
    const existingCollections = figma.variables.getLocalVariableCollections();
    const existingCollectionMap = new Map(existingCollections.map(c => [c.name, c]));

    // Verify all referenced collections exist
    for (const refCollection of referencedCollections) {
      if (!existingCollectionMap.has(refCollection)) {
        throw new Error(`Referenced collection "${refCollection}" does not exist. Please create it first.`);
      }
    }

    // Create a map of all collections we need to create
    const collectionsToCreate = new Map();
    for (const collection of data.collections) {
      // Skip if collection already exists
      if (existingCollectionMap.has(collection.name)) {
        console.log(`Collection "${collection.name}" already exists, skipping creation`);
        continue;
      }
      collectionsToCreate.set(collection.name, collection);
    }

    // First pass: Create all collections and modes
    const collections = {};
    const collectionModes = {};
    
    // Add existing collections to our maps
    for (const [name, collection] of existingCollectionMap) {
      collections[name] = collection;
      collectionModes[name] = {};
      for (const mode of collection.modes) {
        collectionModes[name][mode.name] = mode.modeId;
      }
    }
    
    // Create new collections
    for (const [collectionName, collection] of collectionsToCreate) {
      console.log(`Creating collection: ${collectionName}`);
      const newCollection = figma.variables.createVariableCollection(collectionName);
      collections[collectionName] = newCollection;
      collectionModes[collectionName] = {};
      
      // Create all modes
      for (const mode of collection.modes) {
        console.log('Creating mode:', mode.name);
        const newMode = newCollection.addMode(mode.name);
        // Add a shorter delay between mode creations
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Verify the mode was created
        const createdMode = newCollection.modes.find(m => m.name === mode.name);
        if (!createdMode) {
          throw new Error(`Failed to create mode: ${mode.name}`);
        }
        
        console.log('Created mode:', createdMode.name, 'with ID:', createdMode.modeId);
        collectionModes[collectionName][mode.name] = createdMode.modeId;
      }

      // Remove the default mode if it exists
      const defaultMode = newCollection.modes.find(m => m.name === 'Mode 1');
      if (defaultMode) {
        console.log('Removing default mode');
        newCollection.removeMode(defaultMode.modeId);
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    // Create a map of all variables by collection and name
    const variableMap = {};
    for (const [collectionName, collection] of collectionsToCreate) {
      variableMap[collectionName] = {};
      for (const mode of collection.modes) {
        for (const variable of mode.variables) {
          if (!variableMap[collectionName][variable.name]) {
            variableMap[collectionName][variable.name] = {
              collection: collections[collectionName],
              variable: null // Will be set when we create the variable
            };
          }
        }
      }
    }

    // Count total variables to be created
    let totalVariables = 0;
    const uniqueVariables = new Set();
    for (const [collectionName, collection] of collectionsToCreate) {
      for (const mode of collection.modes) {
        for (const variable of mode.variables) {
          // Create a unique key for each variable
          const variableKey = `${collectionName}/${variable.name}`;
          if (!uniqueVariables.has(variableKey)) {
            uniqueVariables.add(variableKey);
            totalVariables++;
          }
        }
      }
    }
    console.log(`Found ${totalVariables} unique variables to create`);

    // First pass: Create all non-alias variables
    for (const [collectionName, collection] of collectionsToCreate) {
      console.log(`Starting to process collection: ${collectionName}`);
      const newCollection = collections[collectionName];
      
      // Process each mode in the collection
      for (const mode of collection.modes) {
        if (!mode.variables || !Array.isArray(mode.variables)) {
          throw new Error('Invalid mode format: variables array is required');
        }

        console.log(`Processing mode: ${mode.name} with ${mode.variables.length} variables`);

        // Process variables in larger batches
        const batchSize = 10;
        for (let i = 0; i < mode.variables.length; i += batchSize) {
          const batch = mode.variables.slice(i, i + batchSize);
          console.log(`Processing batch ${i/batchSize + 1} of ${Math.ceil(mode.variables.length/batchSize)}`);
          
          // Process each variable in the batch
          for (const variableData of batch) {
            if (!variableData.name || !variableData.type || variableData.value === undefined) {
              throw new Error('Invalid variable format: name, type, and value are required');
            }

            // Skip alias variables in the first pass
            if (variableData.type.toUpperCase() === 'ALIAS') {
              console.log(`Skipping alias variable ${variableData.name} for now`);
              continue;
            }

            console.log(`Processing variable: ${variableData.name} of type ${variableData.type}`);

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
                default:
                  throw new Error(`Unsupported variable type: ${variableData.type}`);
              }

              existingVariable = figma.variables.createVariable(
                variableData.name,
                newCollection,
                variableType
              );
              // Store the variable in our map
              variableMap[collectionName][variableData.name].variable = existingVariable;
              console.log(`Created variable: ${variableData.name} with type ${variableType}`);
              // Add a shorter delay after creating each variable
              await new Promise(resolve => setTimeout(resolve, 50));
            }

            // Get the current mode ID first
            const currentMode = newCollection.modes.find(m => m.name === mode.name);
            const currentModeId = currentMode ? currentMode.modeId : null;
            
            if (!currentModeId) {
              throw new Error(`Mode ID not found for mode: ${mode.name}`);
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

            // Set the value for this specific mode
            try {
              existingVariable.setValueForMode(currentModeId, value);
              console.log(`Successfully set value for ${variableData.name} in mode ${mode.name}`);
              await new Promise(resolve => setTimeout(resolve, 50));
            } catch (error) {
              console.error(`Failed to set value for ${variableData.name} in mode ${mode.name}:`, error);
              throw error;
            }
          }
          
          // Add a shorter delay between batches
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }

    // Second pass: Create and set up alias variables
    console.log('Starting second pass: Creating alias variables');
    for (const [collectionName, collection] of collectionsToCreate) {
      console.log(`Processing aliases for collection: ${collectionName}`);
      const newCollection = collections[collectionName];
      
      for (const mode of collection.modes) {
        if (!mode.variables || !Array.isArray(mode.variables)) {
          continue;
        }

        // Filter for only alias variables
        const aliasVariables = mode.variables.filter(v => v.type.toUpperCase() === 'ALIAS');
        console.log(`Found ${aliasVariables.length} alias variables in mode ${mode.name}`);

        for (const variableData of aliasVariables) {
          console.log(`Processing alias variable: ${variableData.name}`);
          
          // Get the current mode ID
          const currentMode = newCollection.modes.find(m => m.name === mode.name);
          const currentModeId = currentMode ? currentMode.modeId : null;
          
          if (!currentModeId) {
            throw new Error(`Mode ID not found for mode: ${mode.name}`);
          }

          // Get the referenced collection and variable
          const { collection: refCollection, mode: refMode, variable: refVariable } = variableData.value;
          console.log(`Alias references: ${refVariable} in mode ${refMode} of collection ${refCollection}`);
          
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

          // Create the alias variable if it doesn't exist
          let existingVariable = findVariableInCollection(newCollection, variableData.name);
          if (!existingVariable) {
            existingVariable = figma.variables.createVariable(
              variableData.name,
              newCollection,
              targetVariable.resolvedType
            );
            console.log(`Created alias variable: ${variableData.name} with type ${targetVariable.resolvedType}`);
            await new Promise(resolve => setTimeout(resolve, 50));
          }

          // Set the alias value
          try {
            // Get the value from the target variable in the specified mode
            const targetValue = targetVariable.valuesByMode[targetMode.modeId];
            console.log('Target value:', targetValue);

            if (targetValue && targetValue.type === 'VARIABLE_ALIAS') {
              // If the target is already an alias, use its ID
              const aliasValue = {
                type: 'VARIABLE_ALIAS',
                id: targetValue.id
              };
              console.log('Setting alias value to existing alias:', aliasValue);
              existingVariable.setValueForMode(currentModeId, aliasValue);
            } else {
              // If the target is a direct value, create a new alias to the target variable
              const aliasValue = {
                type: 'VARIABLE_ALIAS',
                id: targetVariable.id
              };
              console.log('Setting alias value to variable:', aliasValue);
              existingVariable.setValueForMode(currentModeId, aliasValue);
            }
            
            console.log(`Successfully set alias for ${variableData.name} to ${refVariable} in mode ${mode.name}`);
            await new Promise(resolve => setTimeout(resolve, 50));
          } catch (error) {
            console.error(`Failed to set alias for ${variableData.name}:`, error);
            throw error;
          }
        }
      }
    }

    return { success: true, variableCount: totalVariables };
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
function convertVariablesToTemplate(selectedCollections) {
  console.log('Starting variable conversion');
  const collections = figma.variables.getLocalVariableCollections();
  console.log('Found collections:', collections.length);
  
  const templateData = {
    collections: []
  };

  for (const collection of collections) {
    // Skip if not in selected collections
    if (selectedCollections && !selectedCollections.some(c => c.id === collection.id)) {
      console.log('Skipping collection:', collection.name);
      continue;
    }

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

// Function to get modes for a collection
function getCollectionModes(collectionId) {
  const collection = figma.variables.getVariableCollectionById(collectionId);
  if (!collection) {
    throw new Error('Collection not found');
  }
  return collection.modes.map(mode => ({
    modeId: mode.modeId,
    name: mode.name
  }));
}

// Function to resolve a color value, handling aliases
function resolveColorValue(value, modeId) {
  if (value.type === 'VARIABLE_ALIAS') {
    const aliasVariable = figma.variables.getVariableById(value.id);
    if (!aliasVariable) {
      throw new Error('Alias variable not found');
    }
    console.log('Found alias variable:', {
      name: aliasVariable.name,
      type: aliasVariable.resolvedType,
      valuesByMode: aliasVariable.valuesByMode
    });
    
    // Get the collection for this variable
    const collections = figma.variables.getLocalVariableCollections();
    const collection = collections.find(c => c.variableIds.includes(aliasVariable.id));
    if (!collection) {
      throw new Error('Collection not found for alias variable');
    }
    console.log('Found collection for alias:', collection.name);
    
    // Get the first mode from the collection
    const firstMode = collection.modes[0];
    if (!firstMode) {
      throw new Error('No modes found in collection');
    }
    console.log('Using first mode:', firstMode.name);
    
    // Get the value for the first mode
    const modeValue = aliasVariable.valuesByMode[firstMode.modeId];
    if (!modeValue) {
      throw new Error('No value found for first mode');
    }
    console.log('Mode value:', modeValue);
    
    // If the mode value is also an alias, resolve it recursively
    if (modeValue.type === 'VARIABLE_ALIAS') {
      return resolveColorValue(modeValue, firstMode.modeId);
    }
    return modeValue;
  }
  return value;
}

// Function to create a frame with selected variable mode
async function createFrameWithVariableMode(collectionId, modeId) {
  try {
    console.log('Starting frame creation with mode:', { collectionId, modeId });
    
    // Get the collection and mode
    const collection = figma.variables.getVariableCollectionById(collectionId);
    if (!collection) {
      throw new Error('Collection not found');
    }
    console.log('Found collection:', collection.name);
    
    const mode = collection.modes.find(m => m.modeId === modeId);
    if (!mode) {
      throw new Error('Mode not found');
    }
    console.log('Found mode:', mode.name);
    
    // Find the first color variable in the collection
    let colorVariable = null;
    for (const varId of collection.variableIds) {
      const variable = figma.variables.getVariableById(varId);
      if (variable.resolvedType === 'COLOR') {
        colorVariable = variable;
        break;
      }
    }
    
    if (!colorVariable) {
      throw new Error('No color variables found in the collection');
    }
    console.log('Found color variable:', colorVariable.name);
    
    // Create a new frame first
    const frame = figma.createFrame();
    const frameId = frame.id;
    console.log('Created frame with ID:', frameId);
    
    frame.name = "Variable Mode Frame";
    frame.resize(24, 24);
    console.log('Set frame properties:', { name: frame.name, size: { width: frame.width, height: frame.height } });
    
    // Apply the mode to the frame
    frame.setPluginData('variableMode', mode.modeId);
    console.log('Applied mode to frame:', mode.modeId);
    
    // Add the frame to the canvas
    figma.currentPage.appendChild(frame);
    console.log('Added frame to canvas');
    
    // Get a fresh reference to the frame
    const frameRef = figma.getNodeById(frameId);
    if (!frameRef) {
      throw new Error('Failed to get frame reference');
    }
    console.log('Got fresh frame reference:', frameRef.id);
    
    // Create a rectangle as a child of the frame
    const rectangle = figma.createRectangle();
    rectangle.resize(24, 24);
    console.log('Created rectangle with size:', { width: rectangle.width, height: rectangle.height });
    
    // Get the color value for the current mode
    const colorValue = colorVariable.valuesByMode[modeId];
    console.log('Color value for mode:', colorValue);
    
    // Set the fill color
    rectangle.fills = [{
      type: 'SOLID',
      color: colorValue
    }];
    console.log('Set rectangle fill color');
    
    // Add the rectangle to the frame using the fresh reference
    frameRef.appendChild(rectangle);
    console.log('Added rectangle to frame');
    
    // Position the rectangle at (0,0) relative to the frame
    rectangle.x = 0;
    rectangle.y = 0;
    console.log('Positioned rectangle at:', { x: rectangle.x, y: rectangle.y });
    
    // Select the new frame
    figma.currentPage.selection = [frameRef];
    console.log('Selected frame');
    
    return frameRef;
  } catch (error) {
    console.error('Error creating frame with variable mode:', error);
    throw error;
  }
}

// Function to delete all collections
async function deleteAllCollections() {
  try {
    const collections = figma.variables.getLocalVariableCollections();
    console.log(`Found ${collections.length} collections to delete`);
    
    for (const collection of collections) {
      console.log(`Deleting collection: ${collection.name}`);
      collection.remove();
      // Add a small delay between deletions
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting collections:', error);
    throw error;
  }
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
  } else if (msg.type === 'get-collection-modes') {
    try {
      const modes = getCollectionModes(msg.collectionId);
      figma.ui.postMessage({ 
        type: 'collection-modes', 
        modes: modes 
      });
    } catch (error) {
      figma.ui.postMessage({ 
        type: 'error',
        error: error.message 
      });
    }
  } else if (msg.type === 'delete-collections') {
    try {
      await deleteAllCollections();
      figma.ui.postMessage({ type: 'delete-success' });
    } catch (error) {
      figma.ui.postMessage({ 
        type: 'delete-error',
        error: error.message 
      });
    }
  } else if (msg.type === 'download-template') {
    figma.ui.postMessage({ 
      type: 'template-data', 
      data: JSON.stringify(templateData, null, 2)
    });
  } else if (msg.type === 'export-variables') {
    console.log('Starting export process');
    try {
      const exportData = convertVariablesToTemplate(msg.selectedCollections);
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
      const result = await createVariablesFromJSON(msg.data);
      figma.ui.postMessage({ 
        type: 'import-success',
        variableCount: result.variableCount
      });
    } catch (error) {
      figma.ui.postMessage({ 
        type: 'import-error', 
        error: error.message 
      });
    }
  } else if (msg.type === 'create-frame-with-mode') {
    try {
      const frame = await createFrameWithVariableMode(msg.collectionId, msg.modeId);
      figma.ui.postMessage({ 
        type: 'frame-created',
        frameId: frame.id
      });
    } catch (error) {
      figma.ui.postMessage({ 
        type: 'error',
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