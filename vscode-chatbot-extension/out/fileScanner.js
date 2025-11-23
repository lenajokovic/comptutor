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
exports.FileScanner = void 0;
const vscode = __importStar(require("vscode"));
class FileScanner {
    /**
     * Scans all currently open text editors
     */
    static scanOpenFiles() {
        const openFiles = [];
        // Get all visible text editors
        const visibleEditors = vscode.window.visibleTextEditors;
        // Get all tab groups to find all open files (not just visible ones)
        const tabGroups = vscode.window.tabGroups.all;
        const openDocuments = new Set();
        // Collect all open file URIs
        tabGroups.forEach(group => {
            group.tabs.forEach(tab => {
                if (tab.input instanceof vscode.TabInputText) {
                    openDocuments.add(tab.input.uri.toString());
                }
            });
        });
        // Process visible editors first
        visibleEditors.forEach(editor => {
            const document = editor.document;
            openFiles.push(this.extractFileInfo(document));
            openDocuments.delete(document.uri.toString());
        });
        // Process remaining open documents
        vscode.workspace.textDocuments.forEach(document => {
            if (openDocuments.has(document.uri.toString())) {
                openFiles.push(this.extractFileInfo(document));
            }
        });
        return openFiles;
    }
    /**
     * Gets the currently active file
     */
    static getActiveFile() {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            return null;
        }
        return this.extractFileInfo(activeEditor.document);
    }
    /**
     * Extracts file information from a TextDocument
     */
    static extractFileInfo(document) {
        return {
            fileName: this.getFileName(document.uri),
            filePath: document.uri.fsPath,
            languageId: document.languageId,
            lineCount: document.lineCount,
            content: document.getText(),
            isDirty: document.isDirty
        };
    }
    /**
     * Gets just the file name from a URI
     */
    static getFileName(uri) {
        const pathParts = uri.fsPath.split(/[\\/]/);
        return pathParts[pathParts.length - 1];
    }
    /**
     * Gets a summary of open files
     */
    static getOpenFilesSummary() {
        const files = this.scanOpenFiles();
        if (files.length === 0) {
            return "No files are currently open.";
        }
        let summary = `Found ${files.length} open file(s):\n\n`;
        files.forEach((file, index) => {
            summary += `${index + 1}. ${file.fileName} (${file.languageId})\n`;
            summary += `   Path: ${file.filePath}\n`;
            summary += `   Lines: ${file.lineCount}\n`;
            summary += `   Modified: ${file.isDirty ? 'Yes' : 'No'}\n\n`;
        });
        return summary;
    }
    /**
     * Searches for a pattern in all open files
     */
    static searchInOpenFiles(pattern) {
        const files = this.scanOpenFiles();
        const results = [];
        const regex = new RegExp(pattern, 'gi');
        files.forEach(file => {
            const lines = file.content.split('\n');
            const matchingLines = [];
            let totalMatches = 0;
            lines.forEach((line, index) => {
                const matches = line.match(regex);
                if (matches) {
                    matchingLines.push(index + 1);
                    totalMatches += matches.length;
                }
            });
            if (totalMatches > 0) {
                results.push({
                    file,
                    matches: totalMatches,
                    lines: matchingLines
                });
            }
        });
        return results;
    }
}
exports.FileScanner = FileScanner;
//# sourceMappingURL=fileScanner.js.map