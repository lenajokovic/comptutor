import * as vscode from 'vscode';

export interface FileInfo {
    fileName: string;
    filePath: string;
    languageId: string;
    lineCount: number;
    content: string;
    isDirty: boolean;
}

export class FileScanner {
    /**
     * Scans all currently open text editors
     */
    public static scanOpenFiles(): FileInfo[] {
        const openFiles: FileInfo[] = [];

        // Get all visible text editors
        const visibleEditors = vscode.window.visibleTextEditors;

        // Get all tab groups to find all open files (not just visible ones)
        const tabGroups = vscode.window.tabGroups.all;
        const openDocuments = new Set<string>();

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
    public static getActiveFile(): FileInfo | null {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            return null;
        }

        return this.extractFileInfo(activeEditor.document);
    }

    /**
     * Extracts file information from a TextDocument
     */
    private static extractFileInfo(document: vscode.TextDocument): FileInfo {
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
    private static getFileName(uri: vscode.Uri): string {
        const pathParts = uri.fsPath.split(/[\\/]/);
        return pathParts[pathParts.length - 1];
    }

    /**
     * Gets a summary of open files
     */
    public static getOpenFilesSummary(): string {
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
    public static searchInOpenFiles(pattern: string): { file: FileInfo; matches: number; lines: number[] }[] {
        const files = this.scanOpenFiles();
        const results: { file: FileInfo; matches: number; lines: number[] }[] = [];

        const regex = new RegExp(pattern, 'gi');

        files.forEach(file => {
            const lines = file.content.split('\n');
            const matchingLines: number[] = [];
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
