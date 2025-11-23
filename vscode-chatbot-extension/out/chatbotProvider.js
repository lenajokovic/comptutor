"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatbotViewProvider = void 0;
const vscode = __importStar(require("vscode"));
const fileScanner_1 = require("./fileScanner");
const http = __importStar(require("http"));
class ChatbotViewProvider {
    constructor(_extensionUri, statusCallback) {
        this._extensionUri = _extensionUri;
        this._conversationHistory = [];
        this._backendUrl = 'http://localhost:5000';
        this._backendConnected = false;
        this._statusCallback = statusCallback;
        this._checkBackendConnection();
    }
    async _checkBackendConnection() {
        try {
            const response = await this._makeRequest('/health', 'GET');
            if (response.success !== false) {
                this._backendConnected = true;
                console.log('Connected to teaching agent backend');
                this._statusCallback?.(true);
            }
        }
        catch (error) {
            this._backendConnected = false;
            console.log('Teaching agent backend not available, using local mode');
            this._statusCallback?.(false);
        }
    }
    async recheckConnection() {
        await this._checkBackendConnection();
        // Update the greeting if view is active
        if (this._view) {
            const greeting = this._backendConnected
                ? "🎓 **Teaching Agent Connected!**\n\nI can now help you learn by:\n- Analyzing your code\n- Running tests\n- Giving progressive hints\n- Asking Socratic questions\n\nTry: 'Analyze my code' or 'Help'"
                : "⚠️ **Teaching Agent Offline**\n\nClick the status bar to start the backend, or use local features:\n- File scanning\n- Pattern searching";
            this._sendBotMessage(greeting);
        }
    }
    async _makeRequest(endpoint, method = 'POST', data) {
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
                    }
                    catch (e) {
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
    resolveWebviewView(webviewView, context, _token) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        webviewView.webview.onDidReceiveMessage(async (data) => {
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
            }
        });
        // Send initial greeting
        const greeting = this._backendConnected
            ? "Hello! I'm your autonomous teaching agent. I can help you learn programming by:\n- Analyzing your code\n- Running and testing code\n- Giving hints (never solutions!)\n- Asking Socratic questions\n\nShow me some code or ask a question!"
            : "Hello! Teaching agent backend is not running. I can still scan files and provide basic help.\n\nTo enable full features, run: python backend_server.py";
        this._sendBotMessage(greeting);
    }
    async _handleUserMessage(userMessage) {
        this._conversationHistory.push({ role: 'user', message: userMessage });
        // Get current file context
        const activeFile = fileScanner_1.FileScanner.getActiveFile();
        const fileContext = activeFile ? {
            fileName: activeFile.fileName,
            content: activeFile.content,
            languageId: activeFile.languageId
        } : undefined;
        // If backend is connected, use the teaching agent
        if (this._backendConnected) {
            try {
                const response = await this._makeRequest('/chat', 'POST', {
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
                }
                else {
                    this._sendBotMessage(`Error: ${response.error || 'Unknown error'}`);
                }
            }
            catch (error) {
                this._backendConnected = false;
                this._sendBotMessage('Lost connection to teaching agent. Falling back to local mode.');
                await this._handleLocalMessage(userMessage);
            }
        }
        else {
            // Use local simple chatbot
            await this._handleLocalMessage(userMessage);
        }
    }
    async _handleLocalMessage(userMessage) {
        const lowerMessage = userMessage.toLowerCase();
        let response = '';
        if (lowerMessage.includes('what files') || lowerMessage.includes('show files') || lowerMessage.includes('list files')) {
            response = this._getOpenFilesList();
        }
        else if (lowerMessage.includes('scan') || lowerMessage.includes('analyze')) {
            response = this._scanAndAnalyzeFiles();
        }
        else if (lowerMessage.includes('search') || lowerMessage.includes('find')) {
            const pattern = this._extractSearchPattern(userMessage);
            if (pattern) {
                response = this._searchInFiles(pattern);
            }
            else {
                response = 'Please specify what you want to search for. Example: "Search for function in files"';
            }
        }
        else if (lowerMessage.includes('active file') || lowerMessage.includes('current file')) {
            response = this._getActiveFileInfo();
        }
        else if (lowerMessage.includes('help')) {
            response = this._getHelpMessage();
        }
        else {
            response = 'Teaching agent backend not connected. I can help with:\n- "What files are open?"\n- "Scan files"\n- "Search for [pattern]"\n\nOr start the backend with: python backend_server.py';
        }
        this._sendBotMessage(response);
    }
    async _resetAgent() {
        if (!this._backendConnected) {
            this._sendBotMessage('Backend not connected. Cannot reset agent.');
            return;
        }
        try {
            const response = await this._makeRequest('/reset', 'POST');
            if (response.success) {
                this._conversationHistory = [];
                this._sendSystemMessage('🔄 Agent conversation reset');
                this._sendBotMessage('Hi! Starting fresh. What would you like to learn?');
            }
            else {
                this._sendBotMessage(`Failed to reset: ${response.error}`);
            }
        }
        catch (error) {
            this._sendBotMessage('Error resetting agent');
        }
    }
    _getOpenFilesList() {
        const files = fileScanner_1.FileScanner.scanOpenFiles();
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
    _scanAndAnalyzeFiles() {
        const files = fileScanner_1.FileScanner.scanOpenFiles();
        if (files.length === 0) {
            return 'No files to scan. Please open some files first.';
        }
        let analysis = `## File Scan Results\n\n`;
        analysis += `Total files open: ${files.length}\n\n`;
        const languageStats = {};
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
    _searchInFiles(pattern) {
        const results = fileScanner_1.FileScanner.searchInOpenFiles(pattern);
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
    _getActiveFileInfo() {
        const activeFile = fileScanner_1.FileScanner.getActiveFile();
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
    _extractSearchPattern(message) {
        const searchMatch = message.match(/search\s+(?:for\s+)?["']?([^"']+)["']?/i) ||
            message.match(/find\s+["']?([^"']+)["']?/i);
        return searchMatch ? searchMatch[1].trim() : null;
    }
    _getHelpMessage() {
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
        }
        else {
            return `## Available Commands\n\n` +
                `- "What files are open?" - List all open files\n` +
                `- "Scan files" - Analyze all open files\n` +
                `- "Search for [pattern]" - Search in open files\n` +
                `- "Active file" - Info about current file\n\n` +
                `**To enable teaching agent:**\n` +
                `Run: python backend_server.py`;
        }
    }
    _sendSystemMessage(message) {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'systemMessage',
                message: message
            });
        }
    }
    _sendBotMessage(message) {
        this._conversationHistory.push({ role: 'bot', message });
        if (this._view) {
            this._view.webview.postMessage({
                type: 'botMessage',
                message: message
            });
        }
    }
    _scanOpenFiles() {
        const summary = fileScanner_1.FileScanner.getOpenFilesSummary();
        this._sendBotMessage(summary);
    }
    _getHtmlForWebview(webview) {
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
    </style>
</head>
<body>
    <div id="chatContainer">
        <div id="quickActions">
            <button class="quick-action" onclick="sendQuickMessage('Show me the current file')">📄 Current File</button>
            <button class="quick-action" onclick="sendQuickMessage('Analyze my code')">🔍 Analyze Code</button>
            <button class="quick-action" onclick="sendQuickMessage('Help')">❓ Help</button>
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
            }
        });
    </script>
</body>
</html>`;
    }
}
exports.ChatbotViewProvider = ChatbotViewProvider;
ChatbotViewProvider.viewType = 'chatbotView';
//# sourceMappingURL=chatbotProvider.js.map