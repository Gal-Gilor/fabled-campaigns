/**
 * Quest Generator Module
 * Handles functionality for the Define the Journey page
 */

/**
 * Populate genre dropdown with options from constants
 */
function populateGenreDropdown() {
  const genreSelect = document.getElementById('genreSelect');
  if (!genreSelect) {
    console.error('Genre select element not found');
    return;
  }

  // Clear existing options
  genreSelect.innerHTML = '';

  // Add options from GENRE_OPTIONS
  if (window.GENRE_OPTIONS) {
    window.GENRE_OPTIONS.forEach(option => {
      const optionElement = document.createElement('option');
      optionElement.value = option.value;
      optionElement.textContent = option.label;
      if (option.selected) {
        optionElement.selected = true;
      }
      genreSelect.appendChild(optionElement);
    });
  } else {
    console.error('GENRE_OPTIONS not found in global scope');
  }
}

/**
 * Populate campaign type dropdown with options from constants
 */
function populateCampaignTypeDropdown() {
  const campaignTypeSelect = document.getElementById('campaignTypeSelect');
  if (!campaignTypeSelect) {
    console.error('Campaign type select element not found');
    return;
  }

  // Clear existing options
  campaignTypeSelect.innerHTML = '';

  // Add options from CAMPAIGN_TYPE_OPTIONS
  if (window.CAMPAIGN_TYPE_OPTIONS) {
    window.CAMPAIGN_TYPE_OPTIONS.forEach(option => {
      const optionElement = document.createElement('option');
      optionElement.value = option.value;
      optionElement.textContent = option.label;
      if (option.selected) {
        optionElement.selected = true;
      }
      campaignTypeSelect.appendChild(optionElement);
    });
  } else {
    console.error('CAMPAIGN_TYPE_OPTIONS not found in global scope');
  }
}

/**
 * Initialize quest form event listeners
 */
function initQuestForm() {
  const questForm = document.getElementById('questForm');
  const rollToQuestBtn = document.getElementById('rollToQuestBtn');
  const rollForLuckBtn = document.getElementById('rollForLuckBtn');

  if (!questForm || !rollToQuestBtn || !rollForLuckBtn) {
    console.error('Quest form elements not found');
    return;
  }

  // Add event listener for Roll to Quest button
  rollToQuestBtn.addEventListener('click', handleRollToQuest);

  // Add event listener for Roll for Luck button (placeholder for now)
  rollForLuckBtn.addEventListener('click', handleRollForLuck);

  // Prevent form submission
  questForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleRollToQuest();
  });
}

/**
 * Handle Roll to Quest button click
 */
function handleRollToQuest() {
  console.log('Roll to Quest clicked');

  // Get form values
  const formData = getQuestFormData();
  
  // Validate required fields
  if (!validateQuestForm(formData)) {
    return;
  }

  // Show lore section
  showLoreSection();
  
  // TODO: Replace with API call to generate lore based on form data
  console.log('Quest form data:', formData);
}

/**
 * Handle Roll for Luck button click (placeholder)
 */
function handleRollForLuck() {
  console.log('Roll for Luck clicked - feature coming soon!');
  // TODO: Implement luck rolling functionality
}

/**
 * Get form data from quest form
 */
function getQuestFormData() {
  const campaignName = document.getElementById('campaignName')?.value || '';
  const genre = document.getElementById('genreSelect')?.value || '';
  const campaignType = document.getElementById('campaignTypeSelect')?.value || '';
  const description = document.getElementById('questDescription')?.value || '';

  return {
    campaignName: campaignName.trim(),
    genre,
    campaignType,
    description: description.trim()
  };
}

/**
 * Validate quest form data
 */
function validateQuestForm(formData) {
  const errors = [];

  if (!formData.campaignName) {
    errors.push('Campaign name is required');
  }

  if (!formData.genre) {
    errors.push('Genre selection is required');
  }

  if (!formData.campaignType) {
    errors.push('Campaign type selection is required');
  }

  if (errors.length > 0) {
    showFormError('Please fill in all required fields:\n' + errors.join('\n'));
    return false;
  }

  clearFormErrors();
  return true;
}

/**
 * Show form validation error
 */
function showFormError(message) {
  alert(message); // Simple alert for now
  // TODO: Implement more elegant error display
}

/**
 * Clear form validation errors
 */
function clearFormErrors() {
  // TODO: Implement error clearing when proper error display is added
}

/**
 * Show lore section with smooth animation
 */
function showLoreSection() {
  const loreSection = document.getElementById('loreSection');
  if (!loreSection) {
    console.error('Lore section element not found');
    return;
  }

  // Show the section
  loreSection.style.display = 'block';
  
  // Force reflow to ensure the display change takes effect
  loreSection.offsetHeight;
  
  // Add visible class for animation
  loreSection.classList.add('visible');
  
  // Scroll to lore section smoothly
  loreSection.scrollIntoView({ 
    behavior: 'smooth', 
    block: 'center' 
  });
}

/**
 * Initialize hamburger menu functionality
 */
function initHamburgerMenu() {
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const navMenu = document.getElementById('navMenu');

  if (!hamburgerBtn || !navMenu) {
    console.error('Hamburger menu elements not found');
    return;
  }

  // Toggle menu on hamburger button click
  hamburgerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    hamburgerBtn.classList.toggle('active');
    navMenu.classList.toggle('active');
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!navMenu.contains(e.target) && !hamburgerBtn.contains(e.target)) {
      hamburgerBtn.classList.remove('active');
      navMenu.classList.remove('active');
    }
  });

  // Close menu when clicking on a nav link
  const navLinks = navMenu.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      hamburgerBtn.classList.remove('active');
      navMenu.classList.remove('active');
    });
  });
}

/**
 * Initialize quest page functionality
 */
function initQuestPage() {
  console.log('Initializing quest page components...');
  
  try {
    // Populate dropdowns from constants
    populateGenreDropdown();
    populateCampaignTypeDropdown();
    
    // Initialize form handling
    initQuestForm();
    
    // Initialize hamburger menu
    initHamburgerMenu();
    
    console.log('Quest page initialization complete');
  } catch (error) {
    console.error('Error initializing quest page:', error);
    throw error;
  }
}

// Expose functions to global scope for browser usage
window.populateGenreDropdown = populateGenreDropdown;
window.populateCampaignTypeDropdown = populateCampaignTypeDropdown;
window.initQuestForm = initQuestForm;
window.handleRollToQuest = handleRollToQuest;
window.handleRollForLuck = handleRollForLuck;
window.showLoreSection = showLoreSection;
window.initHamburgerMenu = initHamburgerMenu;
window.initQuestPage = initQuestPage;

// Export for module usage (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    populateGenreDropdown,
    populateCampaignTypeDropdown,
    initQuestForm,
    handleRollToQuest,
    handleRollForLuck,
    showLoreSection,
    initHamburgerMenu,
    initQuestPage
  };
}