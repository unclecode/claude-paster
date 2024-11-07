// Debug logger helper
const debugLog = (message, data = '') => {
    console.log(`%c[Interceptor] ${message}`, 'color: #00c853', data);
};


class ContentInterceptor {
    constructor(selector, events = ['paste'], options = {}) {
        this.editorSelector = selector;
        this.editor = null;
        this.events = new Set(events);
        this.options = {
            enabled: true,
            allowDefault: false,
            lengthThreshold: 5000,
            openDelimiter: '```',
            closeDelimiter: null,
            useDelimiters: true,
            escapeDelimiters: true,
            forceDelimiters: false,     // If true, always use delimiters regardless of content
            multilineOnly: true,        // If true, only use delimiters for multiline content
            autoRecover: true,          // Whether to attempt auto-recovery of lost editor
            recoveryInterval: 1000,     // How often to check for editor existence (ms)
            ...options
        };
        
        if (!this.options.closeDelimiter) {
            this.options.closeDelimiter = this.options.openDelimiter;
        }

        this.recoveryTimer = null;
        debugLog('Interceptor initialized with options:', this.options);
        this.init();
    }

    init() {
        debugLog('Starting initialization...');
        this.waitForEditor().then(() => {
            debugLog('Editor found!');
            this.setupEventListeners();
            if (this.options.autoRecover) {
                this.startEditorMonitoring();
            }
        });
    }

    startEditorMonitoring() {
        this.stopEditorMonitoring(); // Clear any existing timer
        
        this.recoveryTimer = setInterval(() => {
            const currentEditor = document.querySelector(this.editorSelector);
            
            // Check if editor exists and has the expected properties
            if (!currentEditor?.editor || currentEditor !== this.editor) {
                debugLog('Editor lost or changed, attempting recovery...');
                this.handleEditorLoss();
            }
        }, this.options.recoveryInterval);

        debugLog('Editor monitoring started');
    }

    stopEditorMonitoring() {
        if (this.recoveryTimer) {
            clearInterval(this.recoveryTimer);
            this.recoveryTimer = null;
            debugLog('Editor monitoring stopped');
        }
    }

    handleEditorLoss() {
        debugLog('Handling editor loss...');
        this.destroy(false); // Clean up but don't stop monitoring
        this.init();        // Reinitialize
    }

    waitForEditor() {
        return new Promise(resolve => {
            const check = () => {
                const editorEl = document.querySelector(this.editorSelector);
                if (editorEl?.editor) {
                    this.editor = editorEl;
                    resolve();
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }

    shouldUseDelimiters(content) {
        if (!this.options.useDelimiters) return false;
        if (this.options.forceDelimiters) return true;
        if (this.options.multilineOnly) {
            // Count actual newlines in the content
            const newlineCount = (content.match(/\n/g) || []).length;
            return newlineCount > 0 || content.length > this.options.lengthThreshold * 0.7;
        }
        return true;
    }

    setupEventListeners() {
        const pasteHandler = (e) => {
            if (!this.options.enabled) {
                return; // Exit early if disabled
            }

            if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
                debugLog('Paste shortcut detected');
                
                // Only prevent default if we don't want default behavior
                if (!this.options.allowDefault) {
                    e.preventDefault();
                }
                
                this.handleCustomPaste().then(() => {
                    // If allowDefault is true, trigger a native paste event
                    if (this.options.allowDefault) {
                        // Create and dispatch a new paste event
                        const pasteEvent = new ClipboardEvent('paste', {
                            bubbles: true,
                            cancelable: true,
                            // Pass through any clipboard data if available
                            clipboardData: e.clipboardData
                        });
                        this.editor.dispatchEvent(pasteEvent);
                    }
                });
            }
        };

        this.editor.addEventListener('keydown', pasteHandler);
        this._pasteHandler = pasteHandler;
    }

    async handleCustomPaste() {
        try {
            const text = await navigator.clipboard.readText();
            debugLog('Clipboard content length:', text.length);
            
            if (text.length > this.options.lengthThreshold) {
                this.handleLargePaste(text);
            } else {
                this.handleSmallPaste(text);
            }
        } catch (err) {
            debugLog('Clipboard access error:', err);
        }
    }

    escapeSpecialChars(text) {
        return text.replace(/[<>&'"]/g, char => {
            const escapeMap = {
                '<': '&lt;',
                '>': '&gt;',
                '&': '&amp;',
                "'": '&apos;',
                '"': '&quot;'
            };
            return escapeMap[char];
        });
    }

    wrapWithDelimiters(content) {
        if (!this.shouldUseDelimiters(content)) {
            debugLog('Skipping delimiters');
            return content;
        }

        const { openDelimiter, closeDelimiter, escapeDelimiters } = this.options;
        const open = escapeDelimiters ? this.escapeSpecialChars(openDelimiter) : openDelimiter;
        const close = escapeDelimiters ? this.escapeSpecialChars(closeDelimiter) : closeDelimiter;

        debugLog('Wrapping content with delimiters:', { open, close });
        return `${open}\n${content}\n${close}`;
    }

    insertContentUsingProseMirror(content) {
        try {
            const editorInstance = this.editor.editor;
            const view = editorInstance.view;
            const { state } = view;
            const { from } = state.selection;
            
            debugLog('Initial selection position:', from);
            
            const wrappedContent = this.wrapWithDelimiters(content);
            const tr = state.tr;
            tr.insertText(wrappedContent, from);
            
            view.dispatch(tr);
            debugLog('Content inserted using ProseMirror');
            return true;
        } catch (err) {
            debugLog('Error in primary insertion method:', err);
            return false;
        }
    }

    insertContentAltMethod(content) {
        try {
            const editorInstance = this.editor.editor;
            const view = editorInstance.view;
            const { state } = view;
            const { from } = state.selection;
            
            const wrappedContent = this.wrapWithDelimiters(content);
            const text = state.schema.text(wrappedContent);
            const tr = state.tr.insert(from, text);
            
            view.dispatch(tr);
            debugLog('Content inserted using alternative method');
            return true;
        } catch (err) {
            debugLog('Error in alternative insertion method:', err);
            return false;
        }
    }

    insertContentFallback(content) {
        try {
            const wrappedContent = this.wrapWithDelimiters(content);
            document.execCommand('insertText', false, wrappedContent);
            debugLog('Content inserted using fallback method');
            return true;
        } catch (err) {
            debugLog('All insertion methods failed:', err);
            return false;
        }
    }

    handleSmallPaste(content) {
        debugLog('Processing small paste');
        const processed = this.processSmallContent(content);
        
        // Try all methods in sequence until one succeeds
        if (!this.insertContentUsingProseMirror(processed) &&
            !this.insertContentAltMethod(processed)) {
            this.insertContentFallback(processed);
        }
    }

    handleLargePaste(content) {
        debugLog('Processing large paste');
        const processed = this.processLargeContent(content);
        
        if (!this.insertContentUsingProseMirror(processed) &&
            !this.insertContentAltMethod(processed)) {
            this.insertContentFallback(processed);
        }
    }

    detectIfCode(content) {
        const codeIndicators = [
            /^(const|let|var|function|class|import|if|for|while)\b/m,
            /^def\s|^class\s|^import\s/m,
            /[{}\[\]()];/,
            /\b(public|private|protected)\b/,
            /^\s*[a-zA-Z_][a-zA-Z0-9_]*\s*[=:]/m
        ];
        return codeIndicators.some(pattern => pattern.test(content));
    }

    processSmallContent(content) {
        return content;
    }

    processLargeContent(content) {
        return content;
    }

    destroy(stopMonitoring = true) {
        if (stopMonitoring) {
            this.stopEditorMonitoring();
        }
        
        if (this.editor && this._pasteHandler) {
            this.editor.removeEventListener('keydown', this._pasteHandler);
        }
        
        debugLog('Interceptor cleanup completed');
    }
}


// Add this at the end of interceptor.js
window.__initializeInterceptor = function(settings) {
    if (window._interceptor) {
        window._interceptor.destroy();
    }
    window._interceptor = new ContentInterceptor(
        'div[contenteditable="true"]',
        ['paste'],
        settings
    );
};

// Listen for messages from the content script
window.addEventListener('message', function(event) {
    // Make sure the message is from our extension
    if (event.data.type === 'INTERCEPTOR_SETTINGS') {
        window.__initializeInterceptor(event.data.settings);
    }
});