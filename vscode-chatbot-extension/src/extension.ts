import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as path from 'path';
import { ChatbotViewProvider } from './chatbotProvider';
import { FileScanner } from './fileScanner';

let backendProcess: child_process.ChildProcess | null = null;
let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
    console.log('Teaching Agent Extension is now active!');

    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'file-scanner-chatbot.toggleBackend';
    updateStatusBar(false);
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Register the chatbot view provider
    const provider = new ChatbotViewProvider(context.extensionUri, (connected: boolean) => {
        updateStatusBar(connected);
    });

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            ChatbotViewProvider.viewType,
            provider
        )
    );

    // Register command to open the chat
    const openChatCommand = vscode.commands.registerCommand(
        'file-scanner-chatbot.openChat',
        () => {
            vscode.commands.executeCommand('workbench.view.extension.chatbot-sidebar');
            vscode.window.showInformationMessage('File Scanner Chatbot opened!');
        }
    );

    // Register command to scan open files
    const scanFilesCommand = vscode.commands.registerCommand(
        'file-scanner-chatbot.scanOpenFiles',
        () => {
            const summary = FileScanner.getOpenFilesSummary();
            vscode.window.showInformationMessage(
                `Scanned Files: ${FileScanner.scanOpenFiles().length} files found`
            );

            // Show detailed output in output channel
            const outputChannel = vscode.window.createOutputChannel('File Scanner');
            outputChannel.clear();
            outputChannel.appendLine('=== File Scan Results ===\n');
            outputChannel.appendLine(summary);
            outputChannel.show();
        }
    );

    // Monitor file open/close events
    const onDidOpenTextDocument = vscode.workspace.onDidOpenTextDocument((document) => {
        console.log(`File opened: ${document.fileName}`);
    });

    const onDidCloseTextDocument = vscode.workspace.onDidCloseTextDocument((document) => {
        console.log(`File closed: ${document.fileName}`);
    });

    // Monitor active editor changes
    const onDidChangeActiveTextEditor = vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
            console.log(`Active editor changed to: ${editor.document.fileName}`);
        }
    });

    // Register command to start backend
    const startBackendCommand = vscode.commands.registerCommand(
        'file-scanner-chatbot.startBackend',
        async () => {
            await startBackend(context);
        }
    );

    // Register command to stop backend
    const stopBackendCommand = vscode.commands.registerCommand(
        'file-scanner-chatbot.stopBackend',
        () => {
            stopBackend();
        }
    );

    // Register command to toggle backend
    const toggleBackendCommand = vscode.commands.registerCommand(
        'file-scanner-chatbot.toggleBackend',
        async () => {
            if (backendProcess) {
                stopBackend();
            } else {
                await startBackend(context);
            }
        }
    );

    context.subscriptions.push(
        openChatCommand,
        scanFilesCommand,
        startBackendCommand,
        stopBackendCommand,
        toggleBackendCommand,
        onDidOpenTextDocument,
        onDidCloseTextDocument,
        onDidChangeActiveTextEditor
    );
}

function updateStatusBar(connected: boolean) {
    if (connected) {
        statusBarItem.text = "$(check) Teaching Agent";
        statusBarItem.tooltip = "Teaching Agent: Connected\nClick to stop backend";
        statusBarItem.backgroundColor = undefined;
    } else {
        statusBarItem.text = "$(x) Teaching Agent";
        statusBarItem.tooltip = "Teaching Agent: Not Connected\nClick to start backend";
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    }
}

async function startBackend(context: vscode.ExtensionContext): Promise<void> {
    if (backendProcess) {
        vscode.window.showInformationMessage('Backend is already running');
        return;
    }

    try {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        // Try to find backend_server.py
        const backendPath = path.join(workspaceFolders[0].uri.fsPath, 'vscode-chatbot-extension', 'backend_server.py');

        vscode.window.showInformationMessage('Starting Teaching Agent backend...');

        // Start Python backend with environment variables
        backendProcess = child_process.spawn('python', [backendPath], {
            cwd: path.dirname(backendPath),
            env: {
                ...process.env,  // Inherit all environment variables
                OPENAI_API_KEY: process.env.OPENAI_API_KEY || ''
            }
        });

        backendProcess.stdout?.on('data', (data) => {
            console.log(`Backend: ${data}`);
        });

        backendProcess.stderr?.on('data', (data) => {
            console.error(`Backend Error: ${data}`);
        });

        backendProcess.on('close', (code) => {
            console.log(`Backend process exited with code ${code}`);
            backendProcess = null;
            updateStatusBar(false);
        });

        // Wait a bit for backend to start
        await new Promise(resolve => setTimeout(resolve, 2000));

        vscode.window.showInformationMessage('Teaching Agent backend started! Refresh the chat to connect.');
        updateStatusBar(true);

    } catch (error) {
        vscode.window.showErrorMessage(`Failed to start backend: ${error}`);
        backendProcess = null;
        updateStatusBar(false);
    }
}

function stopBackend() {
    if (backendProcess) {
        backendProcess.kill();
        backendProcess = null;
        updateStatusBar(false);
        vscode.window.showInformationMessage('Teaching Agent backend stopped');
    } else {
        vscode.window.showInformationMessage('Backend is not running');
    }
}

export function deactivate() {
    console.log('Teaching Agent Extension has been deactivated');
    stopBackend();
}
