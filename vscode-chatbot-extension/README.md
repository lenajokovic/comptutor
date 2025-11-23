# Teaching Agent - AI Programming Tutor 🎓

An intelligent VS Code extension that helps you learn programming through Socratic questioning, never giving you the answer but guiding you to discover it yourself.

**🚀 [Click here to get started in 2 minutes →](START_HERE.md)**

## What It Does

This is **not** your typical coding assistant that writes code for you. Instead, it:

- ✅ **Asks questions** to make you think
- ✅ **Analyzes your code** for bugs and issues
- ✅ **Runs your code** safely to test it
- ✅ **Gives progressive hints** (never solutions!)
- ✅ **Checks understanding** before moving on
- ❌ **Never gives you the answer**

Perfect for students, bootcamp learners, and anyone who wants to truly understand programming!

## Quick Start

1. **Install**: Press F5 or install the VSIX file
2. **Start**: Click the chatbot icon in sidebar
3. **Chat**: Ask questions or show your code!

The extension will guide you through starting the backend automatically.

## Key Features

### 🧠 Intelligent Teaching
- Uses AI to understand your learning needs
- Adapts difficulty based on your responses
- Verifies you actually understand before proceeding

### 🔍 Code Analysis
- Detects bugs, security issues, performance problems
- Explains WHY something is wrong, not just WHAT
- Helps you develop good coding habits

### 🏃 Safe Code Execution
- Runs Python code in isolated environment
- 5-second timeout for safety
- Shows both output and errors

### 💡 Progressive Hints
- Level 0: Guiding questions
- Level 1: Conceptual approach
- Level 2: Step-by-step breakdown
- Level 3: Code skeleton (still no solution!)

### 📊 File Scanning
- Automatically detects open files
- Sends current file context to agent
- Searches across all open files

## How It's Different

| Traditional AI | Teaching Agent |
|----------------|----------------|
| Writes code for you | Asks you questions |
| Gives answers | Gives hints |
| Fast but shallow | Slower but deeper learning |
| You copy-paste | You understand |

## Status Indicators

**Status Bar (bottom right):**
- ✓ Teaching Agent = Backend connected, ready to help!
- ✗ Teaching Agent = Click to start backend

**In Chat:**
- Green messages = Connected to AI agent
- Orange warning = Backend offline (click start button)
- System messages = Extension actions

## Example Conversation

**You:** "I'm trying to write a function to find duplicates"

**Agent:** "Great problem! What data structure could help you track elements you've already seen?"

**You:** "Maybe a list?"

**Agent:** "Lists can work, but think about lookup speed. What if you need to check 'have I seen this before?' many times?"

**You:** "Oh, a set would be O(1) lookup!"

**Agent:** "Exactly! Now how would you use a set to detect duplicates?"

This continues until you truly understand, not just copy code!

## Installation

### Option 1: Debug Mode (Testing)
```bash
cd vscode-chatbot-extension
npm install
npm run compile
# Press F5 in VS Code
```

### Option 2: Install VSIX
1. Extensions view (`Ctrl+Shift+X`)
2. Click `...` menu
3. "Install from VSIX..."
4. Select `file-scanner-chatbot-0.1.0.vsix`

## Commands

Access via Command Palette (`Ctrl+Shift+P`):
- `Teaching Agent: Open Chat`
- `Teaching Agent: Start Backend Server`
- `Teaching Agent: Stop Backend Server`
- `Teaching Agent: Scan All Open Files`

Or just click the status bar to start/stop!

## Requirements

- VS Code 1.85.0+
- Python 3.8+
- Internet connection (for AI model)

## Architecture

```
VS Code Extension (TypeScript)
        ↓
Flask API Server (Python)
        ↓
Teaching Agent (AI)
        ↓
Tool System (Code Analysis, Execution, Hints)
```

## Documentation

- **[START_HERE.md](START_HERE.md)** - Quick 2-minute setup guide
- **[QUICKSTART.md](QUICKSTART.md)** - Detailed getting started
- **[INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)** - Technical documentation
- **[SETUP.md](SETUP.md)** - Development setup

## FAQ

**Q: Will it do my homework?**
A: No! It will help you learn HOW to do it yourself.

**Q: Can I just get the code?**
A: Nope. The agent is programmed to refuse, even if you beg!

**Q: Why is it asking me questions?**
A: Because that's how you actually learn! (Socratic method)

**Q: How do I start the backend?**
A: Click the status bar (bottom right) or the "Start Backend" button in chat.

**Q: Can I use it offline?**
A: Partially. File scanning works offline, but AI teaching needs internet.

## Contributing

This is an educational tool. Contributions that enhance learning (not just coding) are welcome!

## License

MIT

---

**Remember:** The best way to learn is to struggle a bit, think hard, and discover the answer yourself. This extension helps you do exactly that! 🚀

**[→ Get Started Now](START_HERE.md)**
