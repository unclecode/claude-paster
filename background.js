chrome.runtime.onInstalled.addListener(() => {
    // Initialize default settings if they don't exist
    const DEFAULT_SETTINGS = {
        lengthThreshold: 3999,
        openDelimiter: '```',
        closeDelimiter: '```',
        useDelimiters: true,
        escapeDelimiters: true,
        forceDelimiters: false,
        multilineOnly: true,
        autoRecover: true,
        recoveryInterval: 1000
    };

    chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
        chrome.storage.sync.set(settings, () => {
            console.log('Settings initialized:', settings);
        });
    });
});