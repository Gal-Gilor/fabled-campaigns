/**
 * Gallery management functionality
 * Handles map filtering, gallery display, and map cards
 */

// Gallery filtering state
const activeFilters = {
  setting: 'all',
  terrain: 'all', 
  size: 'all'
};

/**
 * Initialize gallery filtering functionality
 */
function initGalleryFiltering() {
  const filterDropdowns = document.querySelectorAll('.filter-dropdown');
    
  filterDropdowns.forEach(dropdown => {
    dropdown.addEventListener('change', function() {
      const filterType = this.dataset.type;
      const filterValue = this.value;
            
      activeFilters[filterType] = filterValue;
      filterMaps();
    });
  });
}

/**
 * Filters the map gallery based on active filter selections
 * Shows/hides map cards that match the current filter criteria
 */
function filterMaps() {
  const mapCards = document.querySelectorAll('.map-card');
    
  mapCards.forEach(card => {
    const cardSetting = card.dataset.setting;
    const cardTerrain = card.dataset.terrain;
    const cardSize = card.dataset.size;
        
    const matchesSetting = activeFilters.setting === 'all' || cardSetting === activeFilters.setting;
    const matchesTerrain = activeFilters.terrain === 'all' || cardTerrain === activeFilters.terrain;
    const matchesSize = activeFilters.size === 'all' || cardSize === activeFilters.size;
        
    if (matchesSetting && matchesTerrain && matchesSize) {
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  });
}

/**
 * Adds a newly generated map to the gallery section
 * @param {Object} mapData - The map data to add to the gallery
 */
function addMapToGallery(mapData) {
  const mapsGrid = document.getElementById('mapsGrid');
  const newCard = document.createElement('div');
  newCard.className = 'map-card';
  newCard.dataset.setting = mapData.setting || 'terrain';
  newCard.dataset.terrain = mapData.terrain;
  newCard.dataset.size = mapData.size || 'auto';
    
  // Handle null values for terrain-only maps
  const displayName = mapData.name || 'Unnamed Terrain';
  const settingTag = mapData.setting 
    ? `<span class="map-tag setting ${mapData.setting}">${mapData.setting.charAt(0).toUpperCase() + mapData.setting.slice(1)}</span>`
    : '';
  const sizeTag = mapData.size 
    ? `<span class="map-tag size ${mapData.size}">${mapData.size.replace('size-', '')}</span>`
    : '<span class="map-tag size auto">Auto Grid</span>';
    
  newCard.innerHTML = `
        <button class="delete-btn" onclick="showDeleteConfirmation(this, event)">×</button>
        <div class="map-thumbnail"></div>
        <div class="map-info">
            <h3>${displayName}</h3>
            <div class="map-tags">
                ${settingTag}
                <span class="map-tag terrain ${mapData.terrain}">${mapData.terrain.charAt(0).toUpperCase() + mapData.terrain.slice(1)}</span>
                ${sizeTag}
            </div>
            <p class="map-description">${mapData.description.substring(0, 100)}...</p>
            <div class="map-meta">
                <span>Just now</span>
            </div>
        </div>
    `;
    
  mapsGrid.insertBefore(newCard, mapsGrid.firstChild);
}

/**
 * Shows a confirmation dialog before deleting a map
 * @param {HTMLElement} button - The delete button that was clicked
 * @param {Event} event - The click event
 */
function showDeleteConfirmation(button, event) {
  event.stopPropagation();
    
  const mapCard = button.closest('.map-card');
  const mapName = mapCard.querySelector('h3').textContent;
    
  const confirmationDiv = document.createElement('div');
  confirmationDiv.className = 'delete-confirmation';
  confirmationDiv.innerHTML = `
        <p>Delete "${mapName}"?<br>This action cannot be undone.</p>
        <div class="confirmation-buttons">
            <button class="confirm-btn" onclick="confirmDelete(this)">Delete</button>
            <button class="cancel-btn" onclick="cancelDelete(this)">Cancel</button>
        </div>
    `;
    
  mapCard.appendChild(confirmationDiv);
}

/**
 * Confirms and executes map deletion with animation
 * @param {HTMLElement} button - The confirm button that was clicked
 */
function confirmDelete(button) {
  const mapCard = button.closest('.map-card');
    
  mapCard.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
  mapCard.style.opacity = '0';
  mapCard.style.transform = 'scale(0.95)';
    
  setTimeout(() => {
    mapCard.remove();
  }, 300);
}

/**
 * Cancels the deletion process and removes the confirmation dialog
 * @param {HTMLElement} button - The cancel button that was clicked
 */
function cancelDelete(button) {
  const confirmationDiv = button.closest('.delete-confirmation');
  confirmationDiv.remove();
}

// Expose functions to global scope for inline onclick handlers and HTML initialization
window.initGalleryFiltering = initGalleryFiltering;
window.addMapToGallery = addMapToGallery;
window.showDeleteConfirmation = showDeleteConfirmation;
window.confirmDelete = confirmDelete;
window.cancelDelete = cancelDelete;