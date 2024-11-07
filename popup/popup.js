// popup/popup.js
const DEFAULT_SETTINGS = {
    lengthThreshold: 3999,
    openDelimiter: '```',
    closeDelimiter: '```',
    useDelimiters: true,
    escapeDelimiters: true,
    forceDelimiters: false,
    multilineOnly: true,
    autoRecover: true,
    recoveryInterval: 1000,
    enabled: true,            // Added: Global extension toggle
    allowDefault: false       // Added: Allow default paste behavior
};

// Load settings from storage
function loadSettings() {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
        // Load new toggles
        document.getElementById('extensionEnabled').checked = settings.enabled;
        document.getElementById('allowDefault').checked = settings.allowDefault;
        
        // Load existing settings
        document.getElementById('useDelimiters').checked = settings.useDelimiters;
        document.getElementById('openDelimiter').value = settings.openDelimiter;
        document.getElementById('closeDelimiter').value = settings.closeDelimiter;
        document.getElementById('escapeDelimiters').checked = settings.escapeDelimiters;
        document.getElementById('forceDelimiters').checked = settings.forceDelimiters;
        document.getElementById('multilineOnly').checked = settings.multilineOnly;
        document.getElementById('lengthThreshold').value = settings.lengthThreshold;
        document.getElementById('autoRecover').checked = settings.autoRecover;
        document.getElementById('recoveryInterval').value = settings.recoveryInterval;
    });
}

// Save settings to storage
function saveSettings() {
    const settings = {
        // New settings
        enabled: document.getElementById('extensionEnabled').checked,
        allowDefault: document.getElementById('allowDefault').checked,
        
        // Existing settings
        useDelimiters: document.getElementById('useDelimiters').checked,
        openDelimiter: document.getElementById('openDelimiter').value,
        closeDelimiter: document.getElementById('closeDelimiter').value,
        escapeDelimiters: document.getElementById('escapeDelimiters').checked,
        forceDelimiters: document.getElementById('forceDelimiters').checked,
        multilineOnly: document.getElementById('multilineOnly').checked,
        lengthThreshold: parseInt(document.getElementById('lengthThreshold').value),
        autoRecover: document.getElementById('autoRecover').checked,
        recoveryInterval: parseInt(document.getElementById('recoveryInterval').value)
    };

    chrome.storage.sync.set(settings, () => {
        // Show save confirmation
        const saveButton = document.getElementById('saveSettings');
        const originalText = saveButton.textContent;
        saveButton.textContent = 'Saved!';
        setTimeout(() => {
            saveButton.textContent = originalText;
        }, 1500);

        // Notify content script of settings change
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
                type: 'settingsUpdated',
                settings: settings
            });
        });
    });
}

// Reset settings to defaults
function resetDefaults() {
    chrome.storage.sync.set(DEFAULT_SETTINGS, () => {
        loadSettings();
        // Notify content script
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
                type: 'settingsUpdated',
                settings: DEFAULT_SETTINGS
            });
        });
    });
}

// Handle individual setting changes
function handleSettingChange(settingId) {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
        const element = document.getElementById(settingId);
        const value = element.type === 'checkbox' ? element.checked : element.value;
        
        settings[settingId] = element.type === 'number' ? parseInt(value) : value;
        
        chrome.storage.sync.set(settings);
        
        // Notify content script
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
                type: 'settingsUpdated',
                settings: settings
            });
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    
    // Add listeners for new toggles
    document.getElementById('extensionEnabled').addEventListener('change', () => {
        handleSettingChange('enabled');
    });
    
    document.getElementById('allowDefault').addEventListener('change', () => {
        handleSettingChange('allowDefault');
    });
    
    // Existing listeners
    document.getElementById('saveSettings').addEventListener('click', saveSettings);
    document.getElementById('resetDefaults').addEventListener('click', resetDefaults);
});