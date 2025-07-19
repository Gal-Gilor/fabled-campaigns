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
 * Initialize tab switching functionality
 */
function initTabSwitching() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  console.log('Tab switching initialized. Found buttons:', tabButtons.length, 'contents:', tabContents.length);

  tabButtons.forEach(button => {
    button.addEventListener('click', function() {
      const targetTab = this.dataset.tab;
      console.log('Tab clicked:', targetTab);
            
      // Remove active class from all tabs and buttons
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
            
      // Add active class to clicked button and corresponding content
      this.classList.add('active');
      const targetContent = document.getElementById(targetTab + 'Tab');
      if (targetContent) {
        targetContent.classList.add('active');
        console.log('Tab switched to:', targetTab);
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
  document.querySelector('.fab').addEventListener('click', function() {
    // Switch to terrain tab
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
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