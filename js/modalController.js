/**
 * Modal Controller for Map Preview
 * Handles the map preview modal with Save, Edit, and Reroll functionality
 */

/**
 * Module-level state management
 * Tracks pending map data and generation parameters
 */
let pendingMapData = null;  // Stores generated map before user decision
let generationParams = null; // Stores original params for reroll functionality
let modalMode = 'new'; // Tracks modal mode: 'new' (just generated) or 'existing' (from gallery)

/**
 * Shows the map preview modal after successful generation
 * @param {Object} mapData - The generated map data
 * @param {Object} params - Original generation parameters for reroll
 * @param {string} mode - Modal mode: 'new' (just generated) or 'existing' (from gallery)
 */
function showMapPreviewModal(mapData, params, mode = 'new') {
  console.log('Showing map preview modal with data:', mapData, 'mode:', mode);

  // STEP 1: Store pending data and mode in module scope
  pendingMapData = mapData;
  generationParams = params;
  modalMode = mode;

  // STEP 2: Get DOM element references
  const modalImage = document.getElementById('modalMapImage');
  const modalName = document.getElementById('modalMapName');
  const modalDescription = document.getElementById('modalMapDescription');
  const modalHeader = document.querySelector('.modal-header h3');
  const saveBtn = document.getElementById('modalSaveBtn');

  // STEP 3: Populate basic modal content
  modalImage.src = mapData.imageUrl;
  modalImage.alt = mapData.name || 'Generated terrain map';
  modalName.textContent = mapData.name || 'Unnamed Terrain';
  modalDescription.textContent = mapData.description;

  // STEP 4: Update UI elements based on mode
  if (mode === 'existing') {
    // EXISTING MAP MODE: Change header and button
    modalHeader.textContent = mapData.name || 'Map Preview';

    saveBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 15.577l-3.539-3.538.707-.707L12 14.164l2.832-2.832.707.707L12 15.577zM6 20c-.552 0-1-.448-1-1s.448-1 1-1h12c.552 0 1 .448 1 1s-.448 1-1 1H6z"/>
        <path d="M12 3v9h-1V3h1z"/>
      </svg>
      Download Map
    `;
  } else {
    // NEW MAP MODE: Reset to defaults
    modalHeader.textContent = 'Your Map is Ready!';
    saveBtn.textContent = 'Save to Collections';
  }

  // STEP 5: Show modal with animation
  const modal = document.getElementById('mapPreviewModal');
  modal.style.display = 'flex';

  // STEP 6: Setup event listeners for buttons
  setupModalListeners();
}

/**
 * Sets up event listeners for modal buttons
 * Uses clone and replace technique to prevent duplicate listeners
 */
function setupModalListeners() {
  // Get button references
  const saveBtn = document.getElementById('modalSaveBtn');
  const editBtn = document.getElementById('modalEditBtn');
  const rerollBtn = document.getElementById('modalRerollBtn');
  const closeBtn = document.getElementById('modalCloseBtn');
  const overlay = document.getElementById('mapPreviewModal');

  // Clone and replace to remove old event listeners (prevents duplicates)
  const newSaveBtn = saveBtn.cloneNode(true);
  const newEditBtn = editBtn.cloneNode(true);
  const newRerollBtn = rerollBtn.cloneNode(true);
  const newCloseBtn = closeBtn.cloneNode(true);

  saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
  editBtn.parentNode.replaceChild(newEditBtn, editBtn);
  rerollBtn.parentNode.replaceChild(newRerollBtn, rerollBtn);
  closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);

  // Attach new event listeners
  newSaveBtn.addEventListener('click', handleSave);
  newEditBtn.addEventListener('click', handleEdit);
  newRerollBtn.addEventListener('click', handleReroll);
  newCloseBtn.addEventListener('click', handleClose);

  // Close modal when clicking outside (on overlay)
  overlay.addEventListener('click', handleOverlayClick);
}

/**
 * Handles clicks on the modal overlay
 * Closes modal if clicking directly on overlay, not on modal content
 */
function handleOverlayClick(event) {
  if (event.target.id === 'mapPreviewModal') {
    // User clicked outside modal - close it
    handleClose();
  }
}

/**
 * Handles the close button click or escape actions
 * Closes the modal and clears pending data
 */
function handleClose() {
  console.log('Modal close requested');

  // Close the modal
  closeModal();

  // Clear pending data
  pendingMapData = null;
  generationParams = null;
  modalMode = 'new';

  console.log('Modal closed, pending data cleared');
}

/**
 * Handles the Save/Download button click
 * Behavior changes based on modal mode:
 * - 'new' mode: Saves to Collections
 * - 'existing' mode: Downloads the map file
 */
function handleSave() {
  console.log('Save/Download button clicked, mode:', modalMode);

  if (!pendingMapData) {
    console.error('No pending map data to save/download');
    return;
  }

  if (modalMode === 'new') {
    // ============================================
    // NEW MAP MODE: Save to Collections
    // ============================================

    console.log('Saving new map to Collections');

    // STEP 1: Add to gallery (visible collection)
    window.addMapToGallery(pendingMapData);
    console.log('Map added to gallery');

    // STEP 2: Update currentMapData for download functionality
    window.setCurrentMapData(pendingMapData);

    // STEP 3: Close modal
    closeModal();

    // STEP 4: Show success feedback in preview area
    window.showMapSuccess(pendingMapData);

    console.log('Map saved successfully to Collections');

  } else if (modalMode === 'existing') {
    // ============================================
    // EXISTING MAP MODE: Download file
    // ============================================

    console.log('Downloading existing map');

    // STEP 1: Trigger download
    window.downloadMap(pendingMapData.id);

    // STEP 2: Close modal
    closeModal();

    // STEP 3: Show download feedback
    window.showDownloadFeedback();

    console.log('Map download triggered');
  }

  // CLEANUP: Clear pending data and reset mode
  pendingMapData = null;
  generationParams = null;
  modalMode = 'new'; // Reset to default
}

/**
 * Handles the Edit button click
 * Placeholder for future map editing functionality
 */
function handleEdit() {
  console.log('Edit button clicked');

  // TODO: Implement map editing functionality
  // This will be developed in a future iteration
  // Expected features:
  // - Adjust terrain features
  // - Add custom markers
  // - Modify grid overlay
  // - Fine-tune map details

  alert(
    'Map editing feature coming soon.\n\n' +
    'Stay tuned for updates!'
  );

  // Keep modal open for now
  // In the future, this would:
  // openMapEditor(pendingMapData);
  // closeModal();
}

/**
 * Handles the Reroll button click
 * Regenerates the map with the same parameters
 * IMPORTANT: Always shows rerolled maps in 'new' mode
 */
async function handleReroll() {
  console.log('Reroll button clicked, current mode:', modalMode);

  if (!generationParams) {
    console.error('No generation parameters available for reroll');
    alert('Unable to reroll. Generation parameters not found.');
    return;
  }

  // STEP 1: Close modal
  closeModal();

  // STEP 2: Show loading state in preview area
  const mapPreview = document.getElementById('mapPreview');
  mapPreview.classList.remove('has-map');
  mapPreview.innerHTML = `
    <div class="preview-placeholder">
      <p>Rerolling your map...</p>
      <div class="loading-spinner"></div>
    </div>
  `;

  try {
    // STEP 3: Call generateMap API with same parameters
    console.log('Generating new map with params:', generationParams);
    const result = await window.generateMap(generationParams);

    // STEP 4: Create new map data object
    const newMapData = {
      id: result.mapId,
      name: generationParams.name || null,
      description: generationParams.description,
      terrain: generationParams.terrain,
      setting: generationParams.setting,
      size: generationParams.size,
      generationMode: generationParams.generationMode,
      imageUrl: result.imageUrl,
      createdAt: result.metadata?.generatedAt || new Date().toISOString(),
      fallback: result.fallback || false
    };

    console.log('Reroll successful, showing new map in modal');

    // STEP 5: Show modal in NEW mode (always, even if rerolling from existing)
    // User must explicitly Save to add rerolled map to Collections
    showMapPreviewModal(newMapData, generationParams, 'new');

    console.log('Showing rerolled map as NEW map (requires Save)');

  } catch (error) {
    console.error('Reroll failed:', error);

    // STEP 6: Show error with retry option
    let errorMessage = 'Failed to reroll map. Please try again.';
    if (error.message && error.message.includes('Rate limit')) {
      errorMessage = 'Too many requests. Please wait a moment before rerolling.';
    } else if (error.message && error.message.includes('network')) {
      errorMessage = 'Network error. Please check your connection and try again.';
    }

    mapPreview.innerHTML = `
      <div class="preview-placeholder">
        <p style="color: var(--danger-color); margin-bottom: 1rem;">${errorMessage}</p>
        <button onclick="handleReroll()" class="action-btn generate-btn">
          Try Again
        </button>
      </div>
    `;
  }
}

/**
 * Closes the modal
 * Hides the modal overlay with animation
 */
function closeModal() {
  const modal = document.getElementById('mapPreviewModal');
  modal.style.display = 'none';
  console.log('Modal closed');
}

/**
 * Clears pending modal data
 * Useful for resetting state when needed
 */
function clearPendingData() {
  pendingMapData = null;
  generationParams = null;
  modalMode = 'new';
  console.log('Pending modal data cleared');
}

/**
 * Shows the modal for an existing map from the gallery
 * Called when user clicks on a map card in Collections
 * @param {string} mapId - The ID of the map to show
 */
function showExistingMapModal(mapId) {
  console.log('Opening existing map modal for ID:', mapId);

  // STEP 1: Retrieve map data from storage
  const mapData = window.getMapDataById(mapId);

  // VALIDATION: Check if map exists
  if (!mapData) {
    console.error('Map not found in storage:', mapId);
    alert('Map data not found. Please try refreshing the page.');
    return;
  }

  console.log('Found map data:', mapData);

  // STEP 2: Reconstruct generation parameters from map data
  // These params are needed for the Reroll functionality
  const params = {
    name: mapData.name,
    description: mapData.description,
    terrain: mapData.terrain,
    setting: mapData.setting,
    size: mapData.size,
    generationMode: mapData.generationMode || 'detailed'
  };

  console.log('Reconstructed params for reroll:', params);

  // STEP 3: Show modal in 'existing' mode
  // This will display "Download Map" button instead of "Save to Collections"
  showMapPreviewModal(mapData, params, 'existing');

  console.log('Existing map modal displayed');
}

// Expose functions to global scope for HTML initialization and cross-module usage
window.showMapPreviewModal = showMapPreviewModal;
window.closeModal = closeModal;
window.clearPendingData = clearPendingData;
window.handleSave = handleSave;
window.handleEdit = handleEdit;
window.handleReroll = handleReroll;
window.handleClose = handleClose;
window.showExistingMapModal = showExistingMapModal;
