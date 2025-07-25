/**
 * Map Generation functionality
 * Handles form processing, API calls, and map display
 */

/**
 * Initialize map generation functionality
 */
function initMapGeneration() {
  const generateBtn = document.getElementById('generate-btn');
  const mapPreview = document.getElementById('mapPreview');

  if (!generateBtn) {
    console.error('Generate button not found!');
    return;
  }

  console.log('Map generation initialized, button found:', generateBtn);

  generateBtn.addEventListener('click', async function() {
    // Prevent any potential double-clicks or rapid clicking
    if (generateBtn.classList.contains('loading')) {
      console.log('Generation already in progress, ignoring click');
      return;
    }
        
    console.log('Generate button clicked'); // Debug log
        
    // Determine which tab is active and get form data accordingly
    const activeTab = document.querySelector('.tab-content.active').id;
    let mapData;

    if (activeTab === 'terrainTab') {
      mapData = await processTerrainTab(generateBtn);
    } else if (activeTab === 'settingTab') {
      mapData = await processSettingTab(generateBtn);
    } else {
      mapData = await processAdvancedTab(generateBtn);
    }

    if (!mapData) return; // Error occurred during processing

    // Show loading state
    generateBtn.disabled = true;
    generateBtn.classList.add('loading');
        
    // Reset preview area to loading state
    mapPreview.classList.remove('has-map');
    mapPreview.innerHTML = `
            <div class="preview-placeholder">
                <p>Generating your epic battle map...</p>
                <div class="loading-spinner"></div>
            </div>
        `;
        
    try {
      // Call the real AI image generation API
      const result = await generateMap(mapData);
            
      // Store the generated map data
      currentMapData = {
        id: result.mapId,
        name: mapData.name || null, // Explicitly null instead of undefined
        description: mapData.description,
        terrain: mapData.terrain,
        setting: mapData.setting,
        size: mapData.size,
        generationMode: mapData.generationMode,
        imageUrl: result.imageUrl,
        createdAt: result.metadata?.generatedAt || new Date().toISOString(),
        fallback: result.fallback || false
      };
            
      showMapSuccess(currentMapData);
            
    } catch (error) {
      console.error('Map generation failed:', error);
            
      // Show more specific error message
      let errorMessage = 'Failed to generate map. Please try again.';
      if (error.message.includes('Rate limit')) {
        errorMessage = 'Too many requests. Please wait a moment before trying again.';
      } else if (error.message.includes('Invalid parameters')) {
        errorMessage = 'Please check your input and try again.';
      }
            
      alert(errorMessage);
    } finally {
      // Reset button
      generateBtn.disabled = false;
      generateBtn.classList.remove('loading');
      generateBtn.innerHTML = '<span>Roll to Quest</span>';
      console.log('Button reset completed');
    }
  });
}

/**
 * Process terrain tab form data
 */
async function processTerrainTab(generateBtn) {
  const terrainType = document.getElementById('terrainTypeSimple').value;
  const mapDescription = document.getElementById('terrainDescription').value || generateDefaultDescription(terrainType);
    
  // Update button to show map creation is starting
  generateBtn.innerHTML = '<span>Charting unknown lands...</span>';
    
  // For terrain-only maps, don't generate names - these are unnamed wilderness encounters
  return {
    description: mapDescription,
    terrain: terrainType,
    // No setting for pure terrain maps
    // No size - let AI determine optimal grid size
    generationMode: 'quick'
  };
}

/**
 * Process setting tab form data
 */
async function processSettingTab(generateBtn) {
  let mapName = document.getElementById('settingName').value.trim();
  const locationType = document.getElementById('settingLocationType').value;
  const mapDescription = document.getElementById('settingDescription').value || generateDefaultDescription(locationType);
    
  // If name is empty, generate one using the API
  if (!mapName) {
    try {
      generateBtn.innerHTML = '<span class="spinner"></span><span>Legends whisper a name...</span>';
            
      const nameResult = await generateName({
        setting: locationType,
        terrain: getDefaultTerrain(locationType)
      });
            
      mapName = nameResult.name;
      document.getElementById('settingName').value = mapName;
      generateBtn.innerHTML = '<span>Scrolls unfurl... Your world awakens.</span>';
            
    } catch (error) {
      console.error('Name generation failed:', error);
      mapName = generateRandomName();
      document.getElementById('settingName').value = mapName;
      generateBtn.innerHTML = '<span>Charting unknown lands...</span>';
    }
  } else {
    generateBtn.innerHTML = '<span>Charting unknown lands...</span>';
  }
    
  return {
    name: mapName,
    description: mapDescription,
    terrain: getDefaultTerrain(locationType),
    setting: locationType,
    // No size - let AI determine optimal grid size
    generationMode: 'quick'
  };
}

/**
 * Process advanced tab form data
 */
async function processAdvancedTab(generateBtn) {
  let mapName = document.getElementById('mapName').value.trim();
  const mapDescription = document.getElementById('mapDescription').value.trim();
  const terrainType = document.getElementById('terrainType').value;
  const locationType = document.getElementById('locationType').value;
  const mapSize = document.getElementById('mapSize').value;
    
  if (!mapDescription) {
    alert('Please fill in the description field');
    return null;
  }
    
  // If name is empty, generate one using the API
  if (!mapName) {
    try {
      generateBtn.innerHTML = '<span class="spinner"></span><span>Legends whisper a name...</span>';

      const nameResult = await generateName({
        terrain: terrainType,
        setting: locationType,
        description: mapDescription
      });
            
      mapName = nameResult.name;
      document.getElementById('mapName').value = mapName;
      generateBtn.innerHTML = '<span>Scrolls unfurl... Your world awakens.</span>';

    } catch (error) {
      console.error('Name generation failed:', error);
      mapName = generateRandomName();
      document.getElementById('mapName').value = mapName;
      generateBtn.innerHTML = '<span>Charting unknown lands...</span>';
    }
  } else {
    generateBtn.innerHTML = '<span>Charting unknown lands...</span>';
  }

  return {
    name: mapName,
    description: mapDescription,
    terrain: terrainType,
    setting: locationType,
    size: mapSize,
    generationMode: 'detailed'
  };
}

/**
 * Displays the successfully generated map in the preview area
 */
function showMapSuccess(mapData) {
  try {
    console.log('Showing map success with data:', mapData);
    const mapPreview = document.getElementById('mapPreview');
    mapPreview.classList.add('has-map');
  mapPreview.innerHTML = `
        <div style="text-align: center; width: 100%;">
            <h3 style="color: var(--primary-blue); margin-bottom: 1rem; font-family: 'Cinzel', serif;">Map Created Successfully!</h3>
            <p style="color: var(--neutral-600);">${mapData.name ? `"${mapData.name}" is ready for your next session` : 'Your terrain map is ready for your next session'}</p>
            
            <!-- Map preview image with hover download -->
            <div style="margin: 2rem 0;">
                <div class="map-image-container" onclick="downloadMap('${mapData.id}')">
                    <img src="${mapData.imageUrl}" alt="${mapData.name || 'Generated terrain map'}" 
                         style="width: 100%; height: auto; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); cursor: pointer;">
                </div>
            </div>
            
            <!-- Action buttons -->
            <div class="map-actions">
                <button onclick="downloadMap('${mapData.id}')" class="action-btn download-btn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 15.577l-3.539-3.538.707-.707L12 14.164l2.832-2.832.707.707L12 15.577zM6 20c-.552 0-1-.448-1-1s.448-1 1-1h12c.552 0 1 .448 1 1s-.448 1-1 1H6z"/>
                        <path d="M12 3v9h-1V3h1z"/>
                    </svg>
                    Download Map
                </button>
                <button onclick="createNewMap()" class="action-btn generate-btn" style="margin: 0;">
                    Reroll
                </button>
            </div>
            
            <p style="color: var(--neutral-600); margin-top: 2rem; font-style: italic; font-size: 0.9rem;">
                Model may output inaccurate or offensive content that doesn't represent Fabled Tale's views
            </p>
        </div>
    `;
    
    // Add to gallery
    addMapToGallery(mapData);
    console.log('Map success display completed');
  } catch (error) {
    console.error('Error in showMapSuccess:', error);
    throw error; // Re-throw to trigger the catch block in the main generation function
  }
}

/**
 * Creates a new map or rerolls the current one
 */
async function createNewMap() {
  const mapPreview = document.getElementById('mapPreview');
    
  // If we have current map data, reroll with same parameters
  if (currentMapData) {
    // Show loading state
    mapPreview.classList.remove('has-map');
    mapPreview.innerHTML = `
            <div class="preview-placeholder">
                <p>Rerolling "${currentMapData.name}"...</p>
                <div class="loading-spinner"></div>
            </div>
        `;
        
    try {
      // Generate new map with same parameters
      const result = await generateMap({
        name: currentMapData.name,
        description: currentMapData.description,
        terrain: currentMapData.terrain,
        setting: currentMapData.setting,
        size: currentMapData.size,
        generationMode: currentMapData.generationMode || 'detailed'
      });
            
      // Update current map data with new result
      currentMapData = {
        ...currentMapData,
        id: result.mapId,
        imageUrl: result.imageUrl,
        createdAt: result.metadata.generatedAt,
        fallback: result.fallback || false
      };
            
      // Show the new map
      showMapSuccess(currentMapData);
            
    } catch (error) {
      console.error('Reroll failed:', error);
            
      // Show error state
      mapPreview.innerHTML = `
                <div class="preview-placeholder">
                    <p>Reroll failed. Please try again.</p>
                    <button onclick="createNewMap()" class="action-btn generate-btn" style="margin-top: 1rem;">
                        Try Again
                    </button>
                </div>
            `;
    }
  } else {
    // No current map data - start fresh
    resetForm();
  }
}

/**
 * Reset all form fields to default state
 */
function resetForm() {
  // Reset all form tabs
  document.getElementById('terrainTypeSimple').selectedIndex = 0;
  document.getElementById('terrainDescription').value = '';
    
  document.getElementById('settingName').value = '';
  document.getElementById('settingLocationType').selectedIndex = 3; // Default to Temple
  document.getElementById('settingDescription').value = '';

  document.getElementById('mapName').value = '';
  document.getElementById('terrainType').selectedIndex = 0;
  document.getElementById('locationType').selectedIndex = 0;
  document.getElementById('mapSize').selectedIndex = 1; // Default to 30x30
  document.getElementById('mapDescription').value = '';
    
  // Reset preview
  const mapPreview = document.getElementById('mapPreview');
  mapPreview.classList.remove('has-map');
  mapPreview.innerHTML = `
        <div class="preview-placeholder">
            <p>Your map will appear here once generated</p>
        </div>
    `;
    
  // Clear current map data
  currentMapData = null;
    
  // Switch back to terrain tab
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
  document.querySelector('.tab-btn[data-tab="terrain"]').classList.add('active');
  document.getElementById('terrainTab').classList.add('active');
    
  // Scroll to form and focus
  document.querySelector('.map-creator').scrollIntoView({ behavior: 'smooth' });
  setTimeout(() => {
    document.getElementById('terrainTypeSimple').focus();
  }, 500);
}

// Expose functions to global scope for inline onclick handlers and HTML initialization
window.initMapGeneration = initMapGeneration;
window.createNewMap = createNewMap;