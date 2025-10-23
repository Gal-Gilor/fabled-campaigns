const js = require('@eslint/js');

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 12,
      sourceType: 'commonjs',
      globals: {
        // Node.js globals
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        require: 'readonly',
        module: 'writable',
        exports: 'writable',
        Buffer: 'readonly',
        console: 'readonly',

        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        fetch: 'readonly',
        alert: 'readonly',
        setTimeout: 'readonly',
        Option: 'readonly',

        // Frontend globals
        currentMapData: 'writable',
        SETTING_OPTIONS: 'readonly',
        SETTING_ICONS: 'readonly',

        // API functions
        generateName: 'readonly',
        generateMap: 'readonly',

        // UI functions
        populateSettingDropdowns: 'readonly',
        initMapGeneration: 'readonly',
        initGalleryFiltering: 'readonly',
        showDownloadFeedback: 'readonly',
        downloadMap: 'readonly',
        createNewMap: 'readonly',
        addMapToGallery: 'readonly',
        showDeleteConfirmation: 'readonly',
        confirmDelete: 'readonly',
        cancelDelete: 'readonly',
        downloadSampleMap: 'readonly',

        // Utility functions
        generateRandomName: 'readonly',
        generateDefaultDescription: 'readonly'
      }
    },
    rules: {
      // Code Quality
      'no-unused-vars': 'warn',
      'no-console': 'off',
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
    }
  }
];
