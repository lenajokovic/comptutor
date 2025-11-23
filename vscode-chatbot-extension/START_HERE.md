# 🚀 Getting Started with Teaching Agent

Super simple setup in 2 steps!

## Step 1: Install the Extension

**Option A - Quick Test (Recommended)**
1. Open this folder (`vscode-chatbot-extension`) in VS Code
2. Press **F5**
3. A new window opens → Skip to Step 2!

**Option B - Permanent Install**
1. Press `Ctrl+Shift+X` (Extensions)
2. Click `...` → "Install from VSIX..."
3. Select `file-scanner-chatbot-0.0.1.vsix`

## Step 2: Start Using It!

### Look for These Signs:

1. **Chatbot Icon** 🤖 - Click it in the left sidebar
2. **Status Bar** (bottom right) - Shows connection status:
   - ✓ Teaching Agent = Connected ✅
   - ✗ Teaching Agent = Click to start backend 🚀

### First Time Setup:

When you open the chat, you'll see a message about the backend.

**Just click the big button:**
```
🚀 Start Teaching Agent Backend
```

Or click the status bar (bottom right) to start/stop anytime!

## That's It! 🎉

The extension will:
- ✅ Automatically find your code
- ✅ Start the AI agent
- ✅ Show connection status
- ✅ Guide you with hints (never solutions!)

## Using the Agent

### Quick Actions (Top of Chat):
- 📄 **Current File** - Shows active file info
- 🔍 **Analyze Code** - Checks your code for issues
- ❓ **Help** - Shows what the agent can do
- 🔄 **Reconnect** - Refresh connection
- 🗑️ **Reset** - Start new conversation

### Just Talk Naturally!

**Examples:**
```
"Can you check my code?"
"Why isn't this working?"
"Help me with recursion"
"Run my code"
```

The agent will:
- 🧐 Ask Socratic questions
- 🔧 Analyze and run your code
- 💡 Give progressive hints
- ❌ **NEVER** give you the answer

## Status Indicators

### Status Bar (Bottom Right):
- **$(check) Teaching Agent** = All good! 🟢
- **$(x) Teaching Agent** = Click to start 🟠

### In Chat:
- Green message = Agent connected
- Orange message = Not connected (shows start button)

## Troubleshooting

### "Backend not connecting"
1. Click status bar to start backend
2. Wait 5 seconds
3. Click 🔄 Reconnect button

### "Python not found"
Make sure Python is installed and in PATH:
```bash
python --version
```

### Still stuck?
Check [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) for detailed help.

## What Makes This Special?

This isn't just a chatbot - it's a **teaching agent** that:

✅ Helps you **learn** (not just get answers)
✅ Asks **questions** to make you think
✅ **Never** gives you solution code
✅ **Analyzes** your code for bugs
✅ **Runs** your code safely
✅ Gives **progressive hints**

Perfect for:
- 🎓 Learning to code
- 🐛 Debugging
- 📚 Understanding concepts
- 💪 Building problem-solving skills

## Tips

1. **Always have a file open** - The agent can see it!
2. **Ask specific questions** - "Why does this crash?" not "Help me"
3. **Try before asking** - The agent wants to see YOUR attempt first
4. **Explain back** - The agent will check if you really understand

## Commands

Press `Ctrl+Shift+P` to access:
- **Teaching Agent: Open Chat**
- **Teaching Agent: Start Backend Server**
- **Teaching Agent: Stop Backend Server**
- **Teaching Agent: Scan All Open Files**

---

**Ready to learn?** Open the chat and say hi! 👋
