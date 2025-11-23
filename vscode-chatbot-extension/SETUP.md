# Setup and Installation Guide

## Quick Start

Follow these steps to install and run the File Scanner Chatbot extension:

### 1. Install Dependencies

Navigate to the extension directory and install required packages:

```bash
cd vscode-chatbot-extension
npm install
```

### 2. Compile TypeScript

Compile the TypeScript source code:

```bash
npm run compile
```

Or run in watch mode for development:

```bash
npm run watch
```

### 3. Test the Extension

#### Option A: Debug Mode (Recommended for Development)

1. Open the `vscode-chatbot-extension` folder in VS Code
2. Press `F5` or go to Run > Start Debugging
3. A new VS Code window (Extension Development Host) will open with your extension loaded
4. Look for the chatbot icon in the activity bar (left sidebar)

#### Option B: Install as VSIX Package

1. Install the VSCE packaging tool:
   ```bash
   npm install -g @vscode/vsce
   ```

2. Package the extension:
   ```bash
   vsce package
   ```

3. Install the generated `.vsix` file:
   - In VS Code, go to Extensions view (Ctrl+Shift+X)
   - Click the "..." menu at the top
   - Select "Install from VSIX..."
   - Choose the generated `.vsix` file

## Using the Extension

### Opening the Chatbot

1. **Via Activity Bar**: Click the chatbot icon in the left sidebar
2. **Via Command Palette**:
   - Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
   - Type "Open File Scanner Chatbot"
   - Press Enter

### Interacting with the Chatbot

Once the chatbot panel is open, you can:

1. **Use Quick Actions**: Click the buttons at the top for common tasks
2. **Type Natural Commands**: Ask questions like:
   - "What files are open?"
   - "Scan my files"
   - "Search for function in files"
   - "Show active file"

3. **Press Enter** or click "Send" to submit your message

### Testing the File Scanner

1. Open several files in VS Code (different file types work best)
2. Ask the chatbot: "What files are open?"
3. Try: "Scan files" to get detailed statistics
4. Test search: "Search for import" (or any keyword)

## Project Structure

```
vscode-chatbot-extension/
├── src/
│   ├── extension.ts          # Main extension entry point
│   ├── chatbotProvider.ts    # Webview chat interface
│   └── fileScanner.ts        # File scanning logic
├── media/
│   └── chatbot-icon.svg      # Extension icon
├── out/                      # Compiled JavaScript (generated)
├── package.json              # Extension manifest
├── tsconfig.json             # TypeScript configuration
├── README.md                 # User documentation
└── SETUP.md                  # This file

```

## Development Workflow

### Making Changes

1. Edit the TypeScript files in `src/`
2. The code will auto-compile if you're running `npm run watch`
3. Reload the Extension Development Host window:
   - Press `Ctrl+R` (Windows/Linux) or `Cmd+R` (Mac)
   - Or click the reload button in the debug toolbar

### Adding Features

- **File Scanner**: Edit `src/fileScanner.ts`
- **Chatbot Logic**: Edit `src/chatbotProvider.ts`
- **Commands**: Edit `src/extension.ts`

### Debugging

1. Set breakpoints in your TypeScript code
2. Press F5 to start debugging
3. Use the Debug Console to inspect variables

## Troubleshooting

### Extension Not Appearing

- Make sure you compiled the code: `npm run compile`
- Check the Output panel (View > Output) and select "Extension Host"
- Reload the window: `Ctrl+R` / `Cmd+R`

### Compilation Errors

- Ensure TypeScript is installed: `npm install -g typescript`
- Delete `node_modules` and run `npm install` again
- Check for syntax errors in `.ts` files

### Chatbot Not Responding

- Check the Developer Console: Help > Toggle Developer Tools
- Look for JavaScript errors
- Ensure webview scripts are enabled (should be by default)

## Customization

### Changing the Icon

Replace `media/chatbot-icon.svg` with your own SVG icon

### Modifying Chatbot Responses

Edit the response logic in `src/chatbotProvider.ts`:
- `_handleUserMessage()` - Main message router
- `_getDefaultResponse()` - Fallback responses
- Add new command patterns and handlers

### Adding New Commands

1. Add command to `package.json` under `contributes.commands`
2. Register command in `src/extension.ts` using `vscode.commands.registerCommand`
3. Implement command logic

## Publishing (Optional)

To publish to the VS Code Marketplace:

1. Create a publisher account at https://marketplace.visualstudio.com
2. Get a Personal Access Token
3. Login: `vsce login <publisher-name>`
4. Publish: `vsce publish`

## Requirements

- Node.js (v18 or higher recommended)
- npm (comes with Node.js)
- VS Code 1.85.0 or higher

## Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Webview API Guide](https://code.visualstudio.com/api/extension-guides/webview)
- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)

## Support

If you encounter issues:
1. Check the console for errors (Help > Toggle Developer Tools)
2. Review the Extension Host output
3. Ensure all dependencies are installed
4. Try cleaning and rebuilding: `rm -rf out node_modules && npm install && npm run compile`
