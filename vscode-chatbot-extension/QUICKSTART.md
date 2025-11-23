# Quick Start Guide

Get the VS Code Teaching Agent Extension running in 3 steps!

## Step 1: Start the Backend Server

Open a terminal in the `vscode-chatbot-extension` folder and run:

**Windows:**
```bash
start_backend.bat
```

**Mac/Linux:**
```bash
python backend_server.py
```

You should see:
```
============================================================
AUTONOMOUS TEACHING AGENT - API SERVER
============================================================
Starting Flask server on http://localhost:5000
...
```

**Keep this terminal open!** The backend must stay running.

## Step 2: Install the Extension

### Option A: Debug Mode (Recommended for Development)

1. Open the `vscode-chatbot-extension` folder in VS Code
2. Press `F5` (or Run → Start Debugging)
3. A new VS Code window will open with the extension loaded

### Option B: Install VSIX Package

The VSIX file is already created! Just install it:

1. In VS Code, press `Ctrl+Shift+X` (Extensions view)
2. Click the `...` menu at the top
3. Select "Install from VSIX..."
4. Navigate to: `vscode-chatbot-extension/file-scanner-chatbot-0.0.1.vsix`
5. Click Install

## Step 3: Use the Extension

1. Look for the **chatbot icon** in the Activity Bar (left sidebar)
2. Click it to open the chat panel
3. You should see: **"Hello! I'm your autonomous teaching agent..."**

If you see "Teaching agent backend is not running":
- Check that the Python server from Step 1 is still running
- Try refreshing: Reload the window (`Ctrl+R` / `Cmd+R`)

## Try It Out!

### Test 1: Ask for Help
Type in the chat:
```
Help
```

You should see the agent's capabilities.

### Test 2: Show Current File
Open a Python file, then type:
```
Show me the current file
```

The agent will see your file and can analyze it.

### Test 3: Analyze Code
Type:
```
Analyze my code
```

The agent will use the `analyze_code` tool and give feedback.

## Quick Actions

Use the buttons at the top of the chat:
- **Current File** - Get info about the active file
- **Analyze Code** - Run code analysis
- **Help** - Show capabilities
- **Reset** - Start a new conversation

## Example Conversation

**You:** "I'm trying to write a function that finds duplicates in a list"

**Agent:**
- 🔧 Agent using tools: generate_hint
- "Great problem! Let's think about this step by step. What data structure could help you keep track of elements you've already seen?"

**You:** "A set?"

**Agent:**
- 🔧 Agent using tools: check_understanding
- "Exactly! Now, how would you use a set to detect duplicates as you iterate through the list?"

## What Makes This Different?

This teaching agent **NEVER gives you the solution code**. Instead it:
- ✅ Asks Socratic questions
- ✅ Gives progressive hints
- ✅ Analyzes YOUR code
- ✅ Runs YOUR code to test it
- ✅ Checks if you truly understand

It **WON'T**:
- ❌ Write your homework
- ❌ Give you the answer
- ❌ Let you copy-paste solutions

## Troubleshooting

### "Backend not connected"

**Fix:**
1. Make sure Step 1 (Python server) is running
2. Check no other program uses port 5000
3. Restart the server

### "Module not found" error in Python

**Fix:**
```bash
pip install flask flask-cors
cd ..
pip install -r requirements-web.txt
```

### Extension not visible

**Fix:**
1. Make sure you compiled: `npm run compile`
2. Reload the window: `Ctrl+R` / `Cmd+R`
3. Check for errors in: View → Output → Extension Host

## Architecture Overview

```
┌───────────────────────┐
│  VS Code Extension    │
│  (Your chat UI)       │
└──────────┬────────────┘
           │ HTTP
           ↓
┌───────────────────────┐
│  Flask API Server     │
│  (backend_server.py)  │
└──────────┬────────────┘
           │
           ↓
┌───────────────────────┐
│  Teaching Agent       │
│  (autonomous_mentor)  │
│  - Analyzes code      │
│  - Gives hints        │
│  - Runs code          │
│  - Checks learning    │
└───────────────────────┘
```

## Next Steps

- Read [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) for detailed documentation
- Check [README.md](README.md) for all features
- Open [autonomous_mentor.py](../autonomous_mentor.py) to see the agent logic

## Common Use Cases

### Learning Python
1. Write code in a .py file
2. Ask agent: "Can you review my code?"
3. Agent analyzes and asks guiding questions

### Debugging
1. Have buggy code open
2. Ask: "Why isn't this working?"
3. Agent guides you to find the bug yourself

### Understanding Concepts
1. Ask: "How does recursion work?"
2. Agent asks YOU questions to check understanding
3. Provides hints, not solutions

Happy Learning! 🎓
