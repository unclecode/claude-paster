// types.d.ts

// Main interceptor options interface
interface InterceptorOptions {
    lengthThreshold: number;
    openDelimiter: string;
    closeDelimiter: string | null;
    useDelimiters: boolean;
    escapeDelimiters: boolean;
    forceDelimiters: boolean;
    multilineOnly: boolean;
    autoRecover: boolean;
    recoveryInterval: number;
    debugMode?: boolean;
}

// Editor interface (for ProseMirror integration)
interface EditorView {
    state: EditorState;
    dispatch: (tr: Transaction) => void;
}

interface EditorState {
    schema: Schema;
    tr: Transaction;
    selection: Selection;
}

interface Schema {
    text: (content: string) => Text;
}

interface Selection {
    from: number;
    to: number;
}

interface Transaction {
    insertText: (text: string, pos: number) => Transaction;
    insert: (pos: number, content: any) => Transaction;
}

interface Text {
    type: string;
    text: string;
}

// Main ContentInterceptor class interface
interface ContentInterceptor {
    editorSelector: string;
    editor: HTMLElement | null;
    events: Set<string>;
    options: InterceptorOptions;
    recoveryTimer: number | null;
    _pasteHandler: ((e: KeyboardEvent) => void) | null;

    // Core methods
    init(): void;
    destroy(stopMonitoring?: boolean): void;
    waitForEditor(): Promise<void>;

    // Event handling
    setupEventListeners(): void;
    handleCustomPaste(): Promise<void>;
    handleSmallPaste(content: string): void;
    handleLargePaste(content: string): void;

    // Content processing
    processSmallContent(content: string): string;
    processLargeContent(content: string): string;
    detectIfCode(content: string): boolean;
    escapeSpecialChars(text: string): string;
    wrapWithDelimiters(content: string): string;
    shouldUseDelimiters(content: string): boolean;

    // Content insertion methods
    insertContentUsingProseMirror(content: string): boolean;
    insertContentAltMethod(content: string): boolean;
    insertContentFallback(content: string): boolean;

    // Editor recovery methods
    startEditorMonitoring(): void;
    stopEditorMonitoring(): void;
    handleEditorLoss(): void;

    // Debug logging
    debugLog(message: string, data?: any): void;
}

// Storage related types
interface StorageChange {
    oldValue?: any;
    newValue?: any;
}

interface StorageChanges {
    [key: string]: StorageChange;
}

// Message types for communication between components
type MessageType = 'settingsUpdated' | 'debugLog' | 'editorStatus';

interface Message {
    type: MessageType;
    settings?: InterceptorOptions;
    debugInfo?: {
        message: string;
        data?: any;
    };
    editorStatus?: {
        found: boolean;
        selector: string;
    };
}

// Chrome extension specific types
interface ChromeStorageSync {
    get(keys: string | string[] | Object | null): Promise<any>;
    set(items: Object): Promise<void>;
    remove(keys: string | string[]): Promise<void>;
    clear(): Promise<void>;
}

interface ChromeRuntime {
    onMessage: {
        addListener: (
            callback: (
                message: Message,
                sender: chrome.runtime.MessageSender,
                sendResponse: (response?: any) => void
            ) => void | boolean
        ) => void;
    };
    sendMessage: (message: Message) => Promise<any>;
}

// Declare global window properties
declare global {
    interface Window {
        _interceptor: ContentInterceptor;
        chrome: {
            storage: {
                sync: ChromeStorageSync;
            };
            runtime: ChromeRuntime;
        };
    }
}

// Export to make this a module
export {};