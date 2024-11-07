// Define default settings (should match the ones in popup.js)
const DEFAULT_SETTINGS = {
    lengthThreshold: 5000,
    openDelimiter: '```',
    closeDelimiter: '```',
    useDelimiters: true,
    escapeDelimiters: true,
    forceDelimiters: false,
    multilineOnly: true,
    autoRecover: true,
    recoveryInterval: 1000
};

async function injectInterceptor() {
    try {
        // Get the extension's URL for interceptor.js
        const interceptorUrl = chrome.runtime.getURL('interceptor.js');
        
        // Create and inject the script
        const script = document.createElement('script');
        script.src = interceptorUrl;
        script.type = 'text/javascript';
        
        // Wait for the script to load
        await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
            (document.head || document.documentElement).appendChild(script);
        });

        // Initialize with settings using postMessage
        window.postMessage({
            type: 'INTERCEPTOR_SETTINGS',
            settings: DEFAULT_SETTINGS
        }, '*');

    } catch (error) {
        console.error('Failed to inject interceptor:', error);
    }
}

// Initialize when the page is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(injectInterceptor, 1000);
    });
} else {
    setTimeout(injectInterceptor, 1000);
}

// Handle settings updates
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'settingsUpdated') {
        // Use postMessage instead of inline script
        window.postMessage({
            type: 'INTERCEPTOR_SETTINGS',
            settings: message.settings
        }, '*');
    }
});