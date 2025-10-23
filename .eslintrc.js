module.exports = {
  env: {
    browser: true,
    node: true,
    es2021: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module'
  },
  rules: {
    // Code Quality
    'no-unused-vars': 'warn',
    'no-console': 'off', // Allow console for debugging
    'prefer-const': 'error',
    'no-var': 'error',
    
    // Code Style
    'indent': ['error', 2],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'never'],
    
    // Best Practices
    'eqeqeq': 'error',
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    
    // Security
    'no-unsafe-finally': 'error',
    'no-unsafe-negation': 'error'
  },
  globals: {
    // Frontend globals
    'currentMapData': 'writable',
    'SETTING_OPTIONS': 'readonly',
    'SETTING_ICONS': 'readonly',
    
    // API functions
    'generateName': 'readonly',
    'generateMap': 'readonly',
    
    // UI functions
    'populateSettingDropdowns': 'readonly',
    'initMapGeneration': 'readonly',
    'initGalleryFiltering': 'readonly',
    'showDownloadFeedback': 'readonly',
    'downloadMap': 'readonly',
    'createNewMap': 'readonly',
    'addMapToGallery': 'readonly',
    'showDeleteConfirmation': 'readonly',
    'confirmDelete': 'readonly',
    'cancelDelete': 'readonly',
    'downloadSampleMap': 'readonly',
    
    // Utility functions
    'generateRandomName': 'readonly',
    'generateDefaultDescription': 'readonly'
  }
};