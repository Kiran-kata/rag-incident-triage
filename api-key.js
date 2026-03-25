/**
 * API Key Management Module
 * Handles provider selection, API key validation, and secure retrieval
 */

const ApiKeyManager = {
  /**
   * Get the currently selected provider ID
   * @returns {string}
   */
  getProvider() {
    const sel = document.getElementById('providerSelect');
    return sel ? sel.value : 'anthropic';
  },

  /**
   * Get the full config object for the currently selected provider
   * For 'custom', merges in user-entered baseUrl and model
   * @returns {object}
   */
  getProviderConfig() {
    const provider = this.getProvider();
    const config = { ...PROVIDERS[provider] };

    if (provider === 'custom') {
      config.baseUrl = (document.getElementById('customBaseUrl')?.value || '').trim();
      config.model   = (document.getElementById('customModel')?.value || '').trim();
    }

    return config;
  },

  /**
   * Get the current API key from the input field
   * @returns {string}
   */
  getApiKey() {
    const input = document.getElementById('apiKeyInput');
    return input ? input.value.trim() : '';
  },

  /**
   * Set the API key in the input field
   * @param {string} key
   */
  setApiKey(key) {
    const input = document.getElementById('apiKeyInput');
    if (input) input.value = key;
  },

  /**
   * Clear the API key from memory and input field
   */
  clearApiKey() {
    const input = document.getElementById('apiKeyInput');
    if (input) input.value = '';
  },

  /**
   * Check if an API key is currently set
   * @returns {boolean}
   */
  isSet() {
    return this.getApiKey().length > 0;
  },

  /**
   * Validate the current API key and provider configuration
   * @returns {{ isValid: boolean, message: string }}
   */
  validate() {
    const apiKey = this.getApiKey();
    const config = this.getProviderConfig();
    const provider = this.getProvider();

    if (!apiKey) {
      return { isValid: false, message: ERROR_MESSAGES.NO_API_KEY };
    }

    if (apiKey.length < 10) {
      return { isValid: false, message: 'API key appears to be too short. Please verify it is correct.' };
    }

    if (provider === 'custom') {
      if (!config.baseUrl) {
        return { isValid: false, message: 'Please enter the custom base URL for your API endpoint.' };
      }
      if (!config.model) {
        return { isValid: false, message: 'Please enter the model name for your custom provider.' };
      }
      try {
        new URL(config.baseUrl);
      } catch {
        return { isValid: false, message: 'Custom base URL is not a valid URL.' };
      }
    }

    return { isValid: true, message: 'Configuration is valid.' };
  },

  /**
   * Get the API key (and config) after validation.
   * Throws if invalid.
   * @returns {string} - Valid API key
   */
  getValidated() {
    const validation = this.validate();
    if (!validation.isValid) {
      throw new Error(validation.message);
    }
    return this.getApiKey();
  },

  /**
   * Return a masked version of the key for safe logging
   * @returns {string}
   */
  getMaskedKey() {
    const apiKey = this.getApiKey();
    if (!apiKey || apiKey.length < 12) return apiKey;
    return `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}`;
  },

  /**
   * Called when the provider dropdown changes.
   * Updates the hint text and shows/hides custom fields.
   */
  onProviderChange() {
    const provider = this.getProvider();
    const config = PROVIDERS[provider];

    // Show/hide custom provider fields
    const customFields = document.getElementById('customProviderFields');
    if (customFields) {
      customFields.style.display = provider === 'custom' ? 'block' : 'none';
    }

    // Update the hint link
    const hintEl = document.getElementById('providerHint');
    if (hintEl && config.hint) {
      hintEl.innerHTML = config.hint;
    }

    // Reset visual state of key input
    const input = document.getElementById('apiKeyInput');
    if (input) {
      input.placeholder = `Enter your ${config.label} API key...`;
      input.style.borderColor = 'var(--border)';
    }
  },

  /**
   * Initialize UI elements and event listeners on page load
   */
  init() {
    const input = document.getElementById('apiKeyInput');
    if (!input) return;

    // Visual feedback on key entry
    input.addEventListener('input', () => {
      input.style.borderColor = this.isSet() ? 'var(--success)' : 'var(--border)';
    });

    // Set up show/hide toggle
    this.setupPasswordToggle();

    // Populate hint for the default provider
    this.onProviderChange();
  },

  /**
   * Add a show/hide password toggle button next to the API key input
   */
  setupPasswordToggle() {
    const input = document.getElementById('apiKeyInput');
    if (!input || !input.parentElement) return;

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:relative; display:flex; align-items:center;';

    input.parentElement.insertBefore(wrapper, input);
    wrapper.appendChild(input);
    input.style.width = '100%';
    input.style.paddingRight = '36px';

    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.textContent = '👁️';
    toggleBtn.title = 'Toggle API key visibility';
    toggleBtn.style.cssText = `
      position: absolute;
      right: 6px;
      background: none;
      border: none;
      color: var(--muted);
      cursor: pointer;
      font-size: 13px;
      padding: 4px;
      line-height: 1;
      transition: color 0.2s;
    `;
    toggleBtn.addEventListener('mouseover', () => { toggleBtn.style.color = 'var(--accent)'; });
    toggleBtn.addEventListener('mouseout',  () => { toggleBtn.style.color = 'var(--muted)'; });
    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const isPw = input.type === 'password';
      input.type = isPw ? 'text' : 'password';
      toggleBtn.textContent = isPw ? '🙈' : '👁️';
    });

    wrapper.appendChild(toggleBtn);
  }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  ApiKeyManager.init();
});

  /**
   * Get the current API key from the input field
   * @returns {string} - The API key (empty string if not provided)
   */
  getApiKey() {
    const input = document.getElementById('apiKeyInput');
    return input ? input.value.trim() : '';
  },

  /**
   * Set the API key in the input field
   * @param {string} key - The API key to set
   */
  setApiKey(key) {
    const input = document.getElementById('apiKeyInput');
    if (input) {
      input.value = key;
    }
  },

  /**
   * Clear the API key from memory and input field
   */
  clearApiKey() {
    const input = document.getElementById('apiKeyInput');
    if (input) {
      input.value = '';
    }
  },

  /**
   * Validate that API key is present and meets minimum requirements
   * @returns {object} - { isValid: boolean, message: string }
   */
  validate() {
    const apiKey = this.getApiKey();

    if (!apiKey) {
      return {
        isValid: false,
        message: ERROR_MESSAGES.NO_API_KEY
      };
    }

    if (apiKey.length < 20) {
      return {
        isValid: false,
        message: 'API key appears to be too short. Please verify it\'s correct.'
      };
    }

    if (!apiKey.startsWith('sk-')) {
      return {
        isValid: false,
        message: 'API key should start with "sk-". Please verify it\'s a valid Anthropic key.'
      };
    }

    return {
      isValid: true,
      message: 'API key is valid'
    };
  },

  /**
   * Try to load API key from localStorage (if opted in)
   * Note: By default, we don't persist API keys for security
   * @returns {boolean} - Whether an API key was loaded
   */
  loadFromStorage() {
    try {
      const stored = localStorage.getItem('rag_assistant_api_key_temp');
      if (stored) {
        this.setApiKey(stored);
        return true;
      }
    } catch (err) {
      console.warn('Could not load API key from storage:', err);
    }
    return false;
  },

  /**
   * Save API key to localStorage temporarily (session only)
   * WARNING: Only do this if user explicitly opts in
   */
  saveToStorage() {
    try {
      const apiKey = this.getApiKey();
      if (apiKey) {
        localStorage.setItem('rag_assistant_api_key_temp', apiKey);
        console.log('API key saved temporarily');
      }
    } catch (err) {
      console.warn('Could not save API key to storage:', err);
    }
  },

  /**
   * Clear API key from localStorage
   */
  clearFromStorage() {
    try {
      localStorage.removeItem('rag_assistant_api_key_temp');
      console.log('API key cleared from storage');
    } catch (err) {
      console.warn('Could not clear API key from storage:', err);
    }
  },

  /**
   * Format API key for display (show first 8 and last 4 chars)
   * @returns {string} - Masked API key
   */
  getMaskedKey() {
    const apiKey = this.getApiKey();
    if (!apiKey || apiKey.length < 12) {
      return apiKey;
    }
    const start = apiKey.substring(0, 8);
    const end = apiKey.substring(apiKey.length - 4);
    return `${start}...${end}`;
  },

  /**
   * Check if an API key is currently set
   * @returns {boolean}
   */
  isSet() {
    return this.getApiKey().length > 0;
  },

  /**
   * Get the API key with validation
   * Throws an error if validation fails
   * @returns {string} - Valid API key
   * @throws {Error} - If API key is invalid
   */
  getValidated() {
    const validation = this.validate();
    if (!validation.isValid) {
      throw new Error(validation.message);
    }
    return this.getApiKey();
  },

  /**
   * Initialize API key UI elements and event listeners
   */
  init() {
    const input = document.getElementById('apiKeyInput');
    if (!input) return;

    // Add visual feedback when API key is entered
    input.addEventListener('change', () => {
      if (this.isSet()) {
        input.style.borderColor = 'var(--success)';
        console.log(`API key set (${this.getMaskedKey()})`);
      } else {
        input.style.borderColor = 'var(--border)';
      }
    });

    // Show/hide password toggle
    this.setupPasswordToggle();

    // Optional: Attempt to load previous session key if user enabled persistence
    // Commented out by default for security
    // this.loadFromStorage();
  },

  /**
   * Setup show/hide password toggle for API key input
   */
  setupPasswordToggle() {
    const input = document.getElementById('apiKeyInput');
    if (!input) return;

    const container = input.parentElement;
    if (!container) return;

    // Create toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'api-key-toggle';
    toggleBtn.textContent = '👁️';
    toggleBtn.title = 'Toggle API key visibility';
    toggleBtn.style.cssText = `
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: var(--muted);
      cursor: pointer;
      font-size: 14px;
      padding: 4px 8px;
      transition: color 0.2s;
    `;

    toggleBtn.addEventListener('mouseover', () => {
      toggleBtn.style.color = 'var(--accent)';
    });

    toggleBtn.addEventListener('mouseout', () => {
      toggleBtn.style.color = 'var(--muted)';
    });

    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      toggleBtn.textContent = isPassword ? '🙈' : '👁️';
    });

    // Style the input container as relative
    container.style.position = 'relative';
    container.style.paddingRight = '40px';
    
    // Insert toggle button after input
    input.parentElement.appendChild(toggleBtn);
  }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  ApiKeyManager.init();
});
