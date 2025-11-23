import * as vscode from 'vscode';
import { FileScanner, FileInfo } from './fileScanner';
import * as http from 'http';

interface BackendResponse {
    success: boolean;
    responses?: Array<{ type: string; content: string }>;
    tool_actions?: Array<{ type: string; tools: string[] }>;
    error?: string;
}

export class ChatbotViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'chatbotView';
    private _view?: vscode.WebviewView;
    private _conversationHistory: Array<{ role: 'user' | 'bot'; message: string }> = [];
    private _backendUrl = 'http://localhost:5000';
    private _backendConnected = false;
    private _statusCallback?: (connected: boolean) => void;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        statusCallback?: (connected: boolean) => void
    ) {
        this._statusCallback = statusCallback;
        this._checkBackendConnection();
    }

    private async _checkBackendConnection(): Promise<void> {
        try {
            const response = await this._makeRequest('/health', 'GET');
            if (response.success !== false) {
                this._backendConnected = true;
                console.log('Connected to teaching agent backend');
                this._statusCallback?.(true);
            }
        } catch (error) {
            this._backendConnected = false;
            console.log('Teaching agent backend not available, using local mode');
            this._statusCallback?.(false);
        }
    }

    public async recheckConnection(): Promise<void> {
        await this._checkBackendConnection();
        // Update the greeting if view is active
        if (this._view) {
            const greeting = this._backendConnected
                ? "🎓 **Teaching Agent Connected!**\n\nI can now help you learn by:\n- Analyzing your code\n- Running tests\n- Giving progressive hints\n- Asking Socratic questions\n\nTry: 'Analyze my code' or 'Help'"
                : "⚠️ **Teaching Agent Offline**\n\nClick the status bar to start the backend, or use local features:\n- File scanning\n- Pattern searching";

            this._sendBotMessage(greeting);
        }
    }

    private async _makeRequest(endpoint: string, method: string = 'POST', data?: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const url = new URL(endpoint, this._backendUrl);
            const options = {
                hostname: url.hostname,
                port: url.port,
                path: url.pathname,
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                }
            };

            const req = http.request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => body += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(body));
                    } catch (e) {
                        resolve({ success: false, error: 'Invalid response' });
                    }
                });
            });

            req.on('error', (e) => {
                reject(e);
            });

            if (data) {
                req.write(JSON.stringify(data));
            }
            req.end();
        });
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async data => {
            switch (data.type) {
                case 'userMessage':
                    await this._handleUserMessage(data.message);
                    break;
                case 'scanFiles':
                    this._scanOpenFiles();
                    break;
                case 'resetAgent':
                    await this._resetAgent();
                    break;
                case 'recheckConnection':
                    await this.recheckConnection();
                    break;
                case 'startBackend':
                    vscode.commands.executeCommand('file-scanner-chatbot.startBackend');
                    setTimeout(() => this.recheckConnection(), 3000);
                    break;
                case 'saveConversation':
                    await this._saveConversation(data.title);
                    break;
                case 'loadConversations':
                    await this._loadConversationsList();
                    break;
                case 'loadConversation':
                    await this._loadConversation(data.conversationId);
                    break;
                case 'deleteConversation':
                    await this._deleteConversation(data.conversationId);
                    break;
            }
        });

        // Send initial greeting
        const greeting = this._backendConnected
            ? "Hello! I'm your autonomous teaching agent. I can help you learn programming by:\n- Analyzing your code\n- Running and testing code\n- Giving hints (never solutions!)\n- Asking Socratic questions\n\nShow me some code or ask a question!"
            : "Hello! Teaching agent backend is not running. I can still scan files and provide basic help.\n\nTo enable full features, run: python backend_server.py";

        this._sendBotMessage(greeting);
    }

    private async _handleUserMessage(userMessage: string) {
        this._conversationHistory.push({ role: 'user', message: userMessage });

        // Get current file context
        const activeFile = FileScanner.getActiveFile();
        const fileContext = activeFile ? {
            fileName: activeFile.fileName,
            content: activeFile.content,
            languageId: activeFile.languageId
        } : undefined;

        // Debug: Show when no file is active
        if (!activeFile && (userMessage.toLowerCase().includes('current file') || userMessage.toLowerCase().includes('show me'))) {
            this._sendSystemMessage('ℹ️ No file is currently active. Open a file in the editor first.');
        }

        // If backend is connected, use the teaching agent
        if (this._backendConnected) {
            try {
                const response: BackendResponse = await this._makeRequest('/chat', 'POST', {
                    message: userMessage,
                    file_context: fileContext
                });

                if (response.success && response.responses) {
                    // Show tool actions if any
                    if (response.tool_actions && response.tool_actions.length > 0) {
                        response.tool_actions.forEach(action => {
                            this._sendSystemMessage(`🔧 Agent using tools: ${action.tools.join(', ')}`);
                        });
                    }

                    // Show agent responses
                    response.responses.forEach(resp => {
                        if (resp.type === 'text' && resp.content) {
                            this._sendBotMessage(resp.content);
                        }
                    });

                    if (response.responses.length === 0) {
                        this._sendBotMessage('Agent is processing... (no response yet)');
                    }
                } else {
                    this._sendBotMessage(`Error: ${response.error || 'Unknown error'}`);
                }
            } catch (error) {
                this._backendConnected = false;
                this._sendBotMessage('Lost connection to teaching agent. Falling back to local mode.');
                await this._handleLocalMessage(userMessage);
            }
        } else {
            // Use local simple chatbot
            await this._handleLocalMessage(userMessage);
        }
    }

    private async _handleLocalMessage(userMessage: string) {
        const lowerMessage = userMessage.toLowerCase();
        let response = '';

        if (lowerMessage.includes('what files') || lowerMessage.includes('show files') || lowerMessage.includes('list files')) {
            response = this._getOpenFilesList();
        } else if (lowerMessage.includes('scan') || lowerMessage.includes('analyze')) {
            response = this._scanAndAnalyzeFiles();
        } else if (lowerMessage.includes('search') || lowerMessage.includes('find')) {
            const pattern = this._extractSearchPattern(userMessage);
            if (pattern) {
                response = this._searchInFiles(pattern);
            } else {
                response = 'Please specify what you want to search for. Example: "Search for function in files"';
            }
        } else if (lowerMessage.includes('active file') || lowerMessage.includes('current file')) {
            response = this._getActiveFileInfo();
        } else if (lowerMessage.includes('help')) {
            response = this._getHelpMessage();
        } else {
            response = 'Teaching agent backend not connected. I can help with:\n- "What files are open?"\n- "Scan files"\n- "Search for [pattern]"\n\nOr start the backend with: python backend_server.py';
        }

        this._sendBotMessage(response);
    }

    private async _resetAgent() {
        if (!this._backendConnected) {
            this._sendBotMessage('Backend not connected. Cannot reset agent.');
            return;
        }

        try {
            const response = await this._makeRequest('/reset', 'POST');
            if (response.success) {
                this._conversationHistory = [];
                // Clear the UI
                if (this._view) {
                    this._view.webview.postMessage({ type: 'clearMessages' });
                }
                this._sendSystemMessage('🔄 Agent conversation reset');
                this._sendBotMessage('Hi! Starting fresh. What would you like to learn?');
            } else {
                this._sendBotMessage(`Failed to reset: ${response.error}`);
            }
        } catch (error) {
            this._sendBotMessage('Error resetting agent');
        }
    }

    private async _saveConversation(title?: string) {
        if (!this._backendConnected) {
            this._sendBotMessage('Backend not connected. Cannot save conversation.');
            return;
        }

        try {
            const activeFile = FileScanner.getActiveFile();
            const fileContext = activeFile ? {
                fileName: activeFile.fileName,
                content: activeFile.content,
                languageId: activeFile.languageId
            } : undefined;

            const response = await this._makeRequest('/save', 'POST', {
                title: title || `Conversation ${new Date().toLocaleString()}`,
                file_context: fileContext
            });

            if (response.success) {
                this._sendSystemMessage(`💾 Conversation saved: ${response.conversation_id}`);
            } else {
                this._sendBotMessage(`Failed to save: ${response.error}`);
            }
        } catch (error) {
            this._sendBotMessage('Error saving conversation');
        }
    }

    private async _loadConversationsList() {
        if (!this._backendConnected) {
            this._sendBotMessage('Backend not connected. Cannot load conversations.');
            return;
        }

        try {
            const response = await this._makeRequest('/conversations', 'GET');

            if (response.success && this._view) {
                this._view.webview.postMessage({
                    type: 'showConversations',
                    conversations: response.conversations
                });
            } else {
                this._sendBotMessage(`Failed to load conversations: ${response.error}`);
            }
        } catch (error) {
            this._sendBotMessage('Error loading conversations');
        }
    }

    private async _loadConversation(conversationId: string) {
        if (!this._backendConnected) {
            this._sendBotMessage('Backend not connected. Cannot load conversation.');
            return;
        }

        try {
            const response = await this._makeRequest(`/conversation/${conversationId}`, 'GET');

            if (response.success && response.conversation && this._view) {
                // Clear current conversation
                this._conversationHistory = [];
                this._view.webview.postMessage({ type: 'clearMessages' });

                // Load messages from saved conversation
                const conversation = response.conversation;
                this._sendSystemMessage(`📂 Loaded: ${conversation.title}`);

                if (conversation.file_context) {
                    this._sendSystemMessage(`📄 File context: ${conversation.file_context.fileName}`);
                }

                // Display messages
                for (const msg of conversation.messages) {
                    if (msg.type.toLowerCase().includes('user')) {
                        this._view.webview.postMessage({
                            type: 'addUserMessage',
                            message: msg.content
                        });
                    } else if (msg.content && !msg.type.toLowerCase().includes('tool')) {
                        this._sendBotMessage(msg.content);
                    }
                }
            } else {
                this._sendBotMessage(`Failed to load conversation: ${response.error}`);
            }
        } catch (error) {
            this._sendBotMessage('Error loading conversation');
        }
    }

    private async _deleteConversation(conversationId: string) {
        if (!this._backendConnected) {
            this._sendBotMessage('Backend not connected. Cannot delete conversation.');
            return;
        }

        try {
            const response = await this._makeRequest(`/conversation/${conversationId}`, 'DELETE');

            if (response.success) {
                this._sendSystemMessage('🗑️ Conversation deleted');
                // Refresh the list
                await this._loadConversationsList();
            } else {
                this._sendBotMessage(`Failed to delete: ${response.error}`);
            }
        } catch (error) {
            this._sendBotMessage('Error deleting conversation');
        }
    }

    private _getOpenFilesList(): string {
        const files = FileScanner.scanOpenFiles();

        if (files.length === 0) {
            return 'No files are currently open.';
        }

        let message = `I found ${files.length} open file(s):\n\n`;
        files.forEach((file, index) => {
            message += `${index + 1}. **${file.fileName}** (${file.languageId})\n`;
            message += `   📄 ${file.lineCount} lines${file.isDirty ? ' • Modified' : ''}\n\n`;
        });

        return message;
    }

    private _scanAndAnalyzeFiles(): string {
        const files = FileScanner.scanOpenFiles();

        if (files.length === 0) {
            return 'No files to scan. Please open some files first.';
        }

        let analysis = `## File Scan Results\n\n`;
        analysis += `Total files open: ${files.length}\n\n`;

        const languageStats: { [key: string]: number } = {};
        let totalLines = 0;
        let modifiedFiles = 0;

        files.forEach(file => {
            languageStats[file.languageId] = (languageStats[file.languageId] || 0) + 1;
            totalLines += file.lineCount;
            if (file.isDirty) {
                modifiedFiles++;
            }
        });

        analysis += `### Statistics\n`;
        analysis += `- Total lines: ${totalLines}\n`;
        analysis += `- Modified files: ${modifiedFiles}\n\n`;

        analysis += `### Languages\n`;
        Object.entries(languageStats).forEach(([lang, count]) => {
            analysis += `- ${lang}: ${count} file(s)\n`;
        });

        return analysis;
    }

    private _searchInFiles(pattern: string): string {
        const results = FileScanner.searchInOpenFiles(pattern);

        if (results.length === 0) {
            return `No matches found for "${pattern}" in open files.`;
        }

        let message = `Found matches for "${pattern}" in ${results.length} file(s):\n\n`;

        results.forEach(result => {
            message += `**${result.file.fileName}**\n`;
            message += `- ${result.matches} match(es) on line(s): ${result.lines.join(', ')}\n\n`;
        });

        return message;
    }

    private _getActiveFileInfo(): string {
        const activeFile = FileScanner.getActiveFile();

        if (!activeFile) {
            return 'No file is currently active.';
        }

        let info = `## Currently Active File\n\n`;
        info += `**${activeFile.fileName}**\n\n`;
        info += `- Language: ${activeFile.languageId}\n`;
        info += `- Lines: ${activeFile.lineCount}\n`;
        info += `- Status: ${activeFile.isDirty ? '⚠️ Modified' : '✓ Saved'}\n`;
        info += `- Path: ${activeFile.filePath}\n`;

        return info;
    }

    private _extractSearchPattern(message: string): string | null {
        const searchMatch = message.match(/search\s+(?:for\s+)?["']?([^"']+)["']?/i) ||
                           message.match(/find\s+["']?([^"']+)["']?/i);
        return searchMatch ? searchMatch[1].trim() : null;
    }

    private _getHelpMessage(): string {
        if (this._backendConnected) {
            return `## Teaching Agent Active! 🎓\n\n` +
                   `I'm here to help you learn (not do your work!):\n\n` +
                   `**What I can do:**\n` +
                   `- Analyze your code for issues\n` +
                   `- Run and test your code\n` +
                   `- Give progressive hints\n` +
                   `- Ask Socratic questions\n` +
                   `- Check your understanding\n\n` +
                   `**What I WON'T do:**\n` +
                   `- Give you solution code\n` +
                   `- Write your homework\n\n` +
                   `Show me code or ask a question!`;
        } else {
            return `## Available Commands\n\n` +
                   `- "What files are open?" - List all open files\n` +
                   `- "Scan files" - Analyze all open files\n` +
                   `- "Search for [pattern]" - Search in open files\n` +
                   `- "Active file" - Info about current file\n\n` +
                   `**To enable teaching agent:**\n` +
                   `Run: python backend_server.py`;
        }
    }

    private _sendSystemMessage(message: string) {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'systemMessage',
                message: message
            });
        }
    }

    private _sendBotMessage(message: string) {
        this._conversationHistory.push({ role: 'bot', message });

        if (this._view) {
            this._view.webview.postMessage({
                type: 'botMessage',
                message: message
            });
        }
    }

    private _scanOpenFiles() {
        const summary = FileScanner.getOpenFilesSummary();
        this._sendBotMessage(summary);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Teaching Agent Chatbot</title>
    <style>
        body {
            padding: 10px;
            color: var(--vscode-foreground);
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
        }

        #chatContainer {
            display: flex;
            flex-direction: column;
            height: 100vh;
        }

        #messages {
            flex-grow: 1;
            overflow-y: auto;
            padding: 10px;
            margin-bottom: 10px;
        }

        .message {
            margin-bottom: 15px;
            padding: 10px;
            border-radius: 5px;
            line-height: 1.4;
        }

        .user-message {
            background-color: var(--vscode-input-background);
            border-left: 3px solid var(--vscode-focusBorder);
        }

        .bot-message {
            background-color: var(--vscode-editor-background);
            border-left: 3px solid var(--vscode-charts-green);
            white-space: pre-wrap;
        }

        .system-message {
            background-color: var(--vscode-editor-background);
            border-left: 3px solid var(--vscode-charts-orange);
            font-size: 0.9em;
            opacity: 0.9;
            font-style: italic;
        }

        .message-header {
            font-weight: bold;
            margin-bottom: 5px;
            font-size: 0.9em;
            opacity: 0.8;
        }

        #inputContainer {
            display: flex;
            gap: 5px;
            padding: 10px;
            background-color: var(--vscode-editor-background);
            border-top: 1px solid var(--vscode-panel-border);
        }

        #userInput {
            flex-grow: 1;
            padding: 8px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 3px;
        }

        button {
            padding: 8px 15px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 3px;
            cursor: pointer;
        }

        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        #quickActions {
            display: flex;
            gap: 5px;
            margin-bottom: 10px;
            flex-wrap: wrap;
        }

        .quick-action {
            padding: 5px 10px;
            font-size: 0.85em;
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }

        .quick-action:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }

        .reset-button {
            background-color: var(--vscode-errorForeground);
            opacity: 0.8;
        }

        #connectionBar {
            padding: 10px;
            background-color: var(--vscode-inputValidation-warningBackground);
            border: 1px solid var(--vscode-inputValidation-warningBorder);
            border-radius: 5px;
            margin-bottom: 10px;
            text-align: center;
        }

        #startBackendBtn {
            padding: 10px 20px;
            font-size: 1em;
            background-color: var(--vscode-button-background);
            width: 100%;
        }

        #conversationsModal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 1000;
        }

        .modal-content {
            background-color: var(--vscode-editor-background);
            margin: 10% auto;
            padding: 20px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 5px;
            width: 90%;
            max-width: 600px;
            max-height: 70vh;
            overflow-y: auto;
        }

        .conversation-item {
            padding: 10px;
            margin: 5px 0;
            background-color: var(--vscode-input-background);
            border-radius: 3px;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .conversation-item:hover {
            background-color: var(--vscode-list-hoverBackground);
        }

        .conversation-info {
            flex-grow: 1;
        }

        .conversation-title {
            font-weight: bold;
            margin-bottom: 3px;
        }

        .conversation-meta {
            font-size: 0.85em;
            opacity: 0.8;
        }

        .delete-btn {
            padding: 5px 10px;
            font-size: 0.8em;
            background-color: var(--vscode-errorForeground);
            color: white;
            margin-left: 10px;
        }

        .close-modal {
            float: right;
            font-size: 1.5em;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div id="chatContainer">
        <div id="quickActions">
            <button class="quick-action" onclick="sendQuickMessage('Show me the current file')">📄 Current File</button>
            <button class="quick-action" onclick="sendQuickMessage('Analyze my code')">🔍 Analyze Code</button>
            <button class="quick-action" onclick="sendQuickMessage('Help')">❓ Help</button>
            <button class="quick-action" onclick="saveConversation()">💾 Save</button>
            <button class="quick-action" onclick="loadConversations()">📂 Load</button>
            <button class="quick-action" onclick="reconnect()">🔄 Reconnect</button>
            <button class="quick-action reset-button" onclick="resetAgent()">🗑️ Reset</button>
        </div>
        <div id="connectionBar" style="display: none;">
            <button id="startBackendBtn" onclick="startBackend()">🚀 Start Teaching Agent Backend</button>
        </div>
        <div id="messages"></div>
        <div id="inputContainer">
            <input type="text" id="userInput" placeholder="Ask me about code or show me what you're working on..." />
            <button onclick="sendMessage()">Send</button>
        </div>
    </div>

    <!-- Conversations Modal -->
    <div id="conversationsModal">
        <div class="modal-content">
            <span class="close-modal" onclick="closeConversationsModal()">&times;</span>
            <h3>Saved Conversations</h3>
            <div id="conversationsList"></div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const messagesDiv = document.getElementById('messages');
        const userInput = document.getElementById('userInput');

        function addMessage(role, message) {
            const messageDiv = document.createElement('div');
            let className = 'message ';
            let headerText = '';

            if (role === 'user') {
                className += 'user-message';
                headerText = 'You';
            } else if (role === 'system') {
                className += 'system-message';
                headerText = 'System';
            } else {
                className += 'bot-message';
                headerText = '🎓 Teaching Agent';
            }

            messageDiv.className = className;

            const header = document.createElement('div');
            header.className = 'message-header';
            header.textContent = headerText;

            const content = document.createElement('div');
            content.textContent = message;

            messageDiv.appendChild(header);
            messageDiv.appendChild(content);
            messagesDiv.appendChild(messageDiv);

            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        function sendMessage() {
            const message = userInput.value.trim();
            if (message) {
                addMessage('user', message);
                vscode.postMessage({
                    type: 'userMessage',
                    message: message
                });
                userInput.value = '';
            }
        }

        function sendQuickMessage(message) {
            addMessage('user', message);
            vscode.postMessage({
                type: 'userMessage',
                message: message
            });
        }

        function resetAgent() {
            if (confirm('Reset the conversation? This will clear all history.')) {
                vscode.postMessage({
                    type: 'resetAgent'
                });
            }
        }

        function reconnect() {
            vscode.postMessage({
                type: 'recheckConnection'
            });
            addMessage('system', 'Checking connection to backend...');
        }

        function startBackend() {
            vscode.postMessage({
                type: 'startBackend'
            });
            addMessage('system', 'Starting backend server...');
        }

        function saveConversation() {
            const title = prompt('Enter a title for this conversation (optional):');
            vscode.postMessage({
                type: 'saveConversation',
                title: title || undefined
            });
        }

        function loadConversations() {
            vscode.postMessage({
                type: 'loadConversations'
            });
        }

        function closeConversationsModal() {
            document.getElementById('conversationsModal').style.display = 'none';
        }

        function loadConversation(conversationId) {
            vscode.postMessage({
                type: 'loadConversation',
                conversationId: conversationId
            });
            closeConversationsModal();
        }

        function deleteConversation(event, conversationId) {
            event.stopPropagation();
            if (confirm('Delete this conversation?')) {
                vscode.postMessage({
                    type: 'deleteConversation',
                    conversationId: conversationId
                });
            }
        }

        userInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });

        window.addEventListener('message', event => {
            const message = event.data;
            if (message.type === 'botMessage') {
                addMessage('bot', message.message);
                // Check if message indicates offline status
                if (message.message.includes('Teaching Agent Offline') || message.message.includes('backend not connected')) {
                    document.getElementById('connectionBar').style.display = 'block';
                } else if (message.message.includes('Teaching Agent Connected')) {
                    document.getElementById('connectionBar').style.display = 'none';
                }
            } else if (message.type === 'systemMessage') {
                addMessage('system', message.message);
            } else if (message.type === 'clearMessages') {
                // Clear all messages from the UI
                messagesDiv.innerHTML = '';
            } else if (message.type === 'showConversations') {
                // Display conversations in modal
                const conversationsList = document.getElementById('conversationsList');
                conversationsList.innerHTML = '';

                if (message.conversations && message.conversations.length > 0) {
                    message.conversations.forEach(conv => {
                        const item = document.createElement('div');
                        item.className = 'conversation-item';
                        item.onclick = () => loadConversation(conv.id);

                        const info = document.createElement('div');
                        info.className = 'conversation-info';

                        const title = document.createElement('div');
                        title.className = 'conversation-title';
                        title.textContent = conv.title;

                        const meta = document.createElement('div');
                        meta.className = 'conversation-meta';
                        const date = new Date(conv.timestamp);
                        meta.textContent = date.toLocaleString() + ' • ' + conv.message_count + ' messages';
                        if (conv.file_context) {
                            meta.textContent += ' • ' + conv.file_context.fileName;
                        }

                        info.appendChild(title);
                        info.appendChild(meta);

                        const deleteBtn = document.createElement('button');
                        deleteBtn.className = 'delete-btn';
                        deleteBtn.textContent = '🗑️ Delete';
                        deleteBtn.onclick = (e) => deleteConversation(e, conv.id);

                        item.appendChild(info);
                        item.appendChild(deleteBtn);
                        conversationsList.appendChild(item);
                    });
                } else {
                    conversationsList.innerHTML = '<p>No saved conversations yet.</p>';
                }

                document.getElementById('conversationsModal').style.display = 'block';
            } else if (message.type === 'addUserMessage') {
                addMessage('user', message.message);
            }
        });
    </script>
</body>
</html>`;
    }
}
