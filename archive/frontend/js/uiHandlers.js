/**
 * UI Handler functions for maps page
 * Handles tab switching, form population, and UI interactions
 */

/**
 * Populates all setting dropdowns from a single source of truth.
 */
function populateSettingDropdowns() {
  const settingTabSelect = document.getElementById('settingLocationType');
  const advancedTabSelect = document.getElementById('locationType');
  const filterSelect = document.querySelector('.filter-dropdown[data-type="setting"]');

  // Clear any existing options except the "All Settings" in the filter
  settingTabSelect.innerHTML = '';
  advancedTabSelect.innerHTML = '';
  const firstFilterOption = filterSelect.options[0];
  filterSelect.innerHTML = '';
  filterSelect.appendChild(firstFilterOption);

  SETTING_OPTIONS.forEach(opt => {
    // Create option for Setting Tab
    const option1 = new Option(opt.label, opt.value);
    if (opt.selected) {
      option1.selected = true;
    }
    settingTabSelect.add(option1);

    // Create option for Advanced Tab
    const option2 = new Option(opt.label, opt.value);
    advancedTabSelect.add(option2);

    // Create option for Filter Dropdown
    const option3 = new Option(opt.label, opt.value);
    filterSelect.add(option3);
  });
}

/**
 * Preserves map state when switching between tabs
 * @returns {Object} State object containing map preservation data
 */
function preserveMapStateForTabSwitch() {
  const hasCurrentMap = currentMapData !== null;
  const mapPreviewHasContent = document
    .getElementById('mapPreview')
    .classList.contains('has-map');
  
  return { hasCurrentMap, mapPreviewHasContent };
}

/**
 * Restores map preview state after tab switch if conditions are met
 * @param {Object} mapState - State object from preserveMapStateForTabSwitch
 */
function restoreMapStateAfterTabSwitch(mapState) {
  if (mapState.hasCurrentMap && mapState.mapPreviewHasContent) {
    showMapPreview(currentMapData);
  }
}

/**
 * Initialize tab switching functionality
 * Handles switching between different form tabs (terrain, setting, advanced)
 */
function initTabSwitching() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  console.log(
    'Tab switching initialized. Found buttons:',
    tabButtons.length,
    'contents:',
    tabContents.length
  );

  tabButtons.forEach(button => {
    button.addEventListener('click', function () {
      const targetTab = this.dataset.tab;
      console.log('Tab clicked:', targetTab);

      // Preserve current map state before switching
      const mapState = preserveMapStateForTabSwitch();

      // Remove active class from all tabs and buttons
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));

      // Add active class to clicked button and corresponding content
      this.classList.add('active');
      const targetContent = document.getElementById(targetTab + 'Tab');
      if (targetContent) {
        targetContent.classList.add('active');
        console.log('Tab switched to:', targetTab);

        // Restore map preview if conditions are met
        restoreMapStateAfterTabSwitch(mapState);
      } else {
        console.error('Tab content not found for:', targetTab + 'Tab');
      }
    });
  });
}

/**
 * Initialize smooth scrolling for anchor links
 */
function initSmoothScrolling() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}

/**
 * Initialize Floating Action Button (FAB) functionality
 */
function initFAB() {
  document.querySelector('.fab').addEventListener('click', function () {
    // Switch to terrain tab
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document
      .querySelectorAll('.tab-content')
      .forEach(content => content.classList.remove('active'));

    document.querySelector('.tab-btn[data-tab="terrain"]').classList.add('active');
    document.getElementById('terrainTab').classList.add('active');

    // Scroll to form and focus
    document.querySelector('.map-creator').scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => {
      document.getElementById('terrainTypeSimple').focus();
    }, 500);
  });
}

/**
 * Shows a temporary success notification when a map is downloaded
 */
function showDownloadFeedback() {
  const feedback = document.createElement('div');
  feedback.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--success-color);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        z-index: 1001;
        font-family: 'Roboto', sans-serif;
        font-weight: 500;
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
  feedback.textContent = '✅ Map downloaded successfully!';

  document.body.appendChild(feedback);

  // Animate in
  setTimeout(() => {
    feedback.style.transform = 'translateX(0)';
  }, 100);

  // Remove after 3 seconds
  setTimeout(() => {
    feedback.style.transform = 'translateX(100%)';
    setTimeout(() => {
      document.body.removeChild(feedback);
    }, 300);
  }, 3000);
}

/**
 * Show map preview without affecting currentMapData
 * Ensures the map preview stays visible regardless of active tab
 */
function showMapPreview(mapData) {
  if (!mapData) return;

  const mapPreview = document.getElementById('mapPreview');
  mapPreview.classList.add('has-map');
  mapPreview.innerHTML = `
    <div style="text-align: center; width: 100%;">
      <h3 style="color: var(--primary-blue); margin-bottom: 1rem; font-family: 'Cinzel', serif;">Ready to Play!</h3>
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
        Model may output inaccurate or offensive content that doesn't represent Fabled Campaigns's views
      </p>
    </div>
  `;
}

/**
 * Initialize all UI handlers - called from main HTML
 */
function initUIHandlers() {
  populateSettingDropdowns();
  initTabSwitching();
  initSmoothScrolling();
  initFAB();
}

// Expose functions to global scope for HTML initialization
window.populateSettingDropdowns = populateSettingDropdowns;
window.initTabSwitching = initTabSwitching;
window.initSmoothScrolling = initSmoothScrolling;
window.initFAB = initFAB;
window.initUIHandlers = initUIHandlers;
window.showDownloadFeedback = showDownloadFeedback;
window.showMapPreview = showMapPreview;
