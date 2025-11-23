# VS Code Extension + Autonomous Teaching Agent Integration

This extension now integrates with the autonomous teaching agent from `autonomous_mentor.py`. The extension provides a chat interface in VS Code, while the Python backend provides the intelligent teaching agent.

## Architecture

```
┌─────────────────────────────────────┐
│   VS Code Extension (TypeScript)    │
│  ┌──────────────────────────────┐   │
│  │  Chatbot UI (Webview)        │   │
│  │  - Chat interface            │   │
│  │  - File scanner              │   │
│  │  - Quick actions             │   │
│  └──────────────────────────────┘   │
│            ↓ HTTP (localhost:5000)  │
└─────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────┐
│   Python Backend (Flask API)        │
│  ┌──────────────────────────────┐   │
│  │  Autonomous Teaching Agent   │   │
│  │  - Code analysis             │   │
│  │  - Code execution            │   │
│  │  - Hint generation           │   │
│  │  - Understanding checks      │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

## Features

### 🎓 Teaching Agent Capabilities

When connected to the backend, the extension can:

1. **Analyze Student Code**
   - Detect bugs and security issues
   - Identify performance problems
   - Suggest best practices

2. **Run Code Safely**
   - Execute Python code in isolated subprocess
   - Provide output and error messages
   - 5-second timeout for safety

3. **Progressive Hints**
   - Level 0: Guiding questions
   - Level 1: Algorithmic approach
   - Level 2: Step-by-step breakdown
   - Level 3: Code skeleton (no solutions!)

4. **Socratic Teaching**
   - Ask questions to check understanding
   - Never give direct solutions
   - Guide students to discover answers

5. **File Scanning**
   - Automatically includes current file context
   - Scans all open files
   - Searches across files

### 🔌 Dual Mode Operation

The extension works in two modes:

**1. Connected Mode** (Backend Running)
- Full teaching agent with LLM
- Code analysis and execution
- Intelligent conversations
- Tool usage visible to user

**2. Local Mode** (Backend Offline)
- Basic file scanning
- Pattern searching
- File statistics
- Simple responses

## Setup Instructions

### Step 1: Install Extension

Option A - Debug Mode:
```bash
cd vscode-chatbot-extension
npm install
npm run compile
# Then press F5 in VS Code
```

Option B - Install VSIX:
```bash
cd vscode-chatbot-extension
npm install
vsce package
# Install the .vsix file through VS Code Extensions menu
```

### Step 2: Start Backend Server

**Windows:**
```bash
cd vscode-chatbot-extension
start_backend.bat
```

**Mac/Linux:**
```bash
cd vscode-chatbot-extension
python backend_server.py
```

The server will start on `http://localhost:5000`

### Step 3: Open Extension in VS Code

1. Look for the chatbot icon in the Activity Bar (left sidebar)
2. Click it to open the chat panel
3. You should see: "Hello! I'm your autonomous teaching agent..."

If you see "Teaching agent backend is not running", check that:
- Python server is running on port 5000
- No firewall blocking localhost
- Check console for errors

## API Endpoints

The backend provides these REST endpoints:

### `GET /health`
Health check - returns backend status

### `POST /init`
Initialize or reinitialize the agent
```json
Response: { "success": true, "message": "..." }
```

### `POST /chat`
Send message to agent
```json
Request: {
  "message": "student's message",
  "file_context": {  // optional
    "fileName": "example.py",
    "content": "code...",
    "languageId": "python"
  }
}

Response: {
  "success": true,
  "responses": [{ "type": "text", "content": "..." }],
  "tool_actions": [{ "type": "tool_use", "tools": ["analyze_code"] }]
}
```

### `POST /reset`
Reset conversation history
```json
Response: { "success": true, "message": "..." }
```

### `POST /analyze`
Analyze code directly (no conversation)
```json
Request: { "code": "code to analyze" }
Response: { "success": true, "analysis": "..." }
```

### `POST /run`
Execute code directly (no conversation)
```json
Request: { "code": "code to run", "test_input": "..." }
Response: {
  "success": true,
  "output": "...",
  "error": "...",
  "has_error": false
}
```

## Usage Examples

### Example 1: Code Analysis

**Student:** "Can you check my code?"

*Extension automatically sends current file content*

**Agent:**
- 🔧 Agent using tools: analyze_code
- "I found a few issues:
  1. Missing error handling
  2. Variable naming could be clearer

  What do you think might happen if the input is invalid?"

### Example 2: Getting Hints

**Student:** "I'm stuck on implementing binary search"

**Agent:**
- 🔧 Agent using tools: generate_hint
- "Let's think about this. What property of a sorted array makes binary search possible? How can you use this to eliminate half the array each time?"

### Example 3: File Scanning

**Student:** "What files are open?"

**Agent:** "I found 3 open files:
1. main.py (75 lines) - Modified
2. test.py (20 lines) - Saved
3. utils.py (45 lines) - Saved"

## How It Works

### 1. Extension Side (TypeScript)

```typescript
// chatbotProvider.ts
private async _handleUserMessage(userMessage: string) {
    // Get current file context
    const activeFile = FileScanner.getActiveFile();

    // Send to backend
    const response = await this._makeRequest('/chat', 'POST', {
        message: userMessage,
        file_context: activeFile
    });

    // Display responses
    response.responses.forEach(r => {
        this._sendBotMessage(r.content);
    });
}
```

### 2. Backend Side (Python)

```python
# backend_server.py
@app.route('/chat', methods=['POST'])
def chat():
    user_message = request.json['message']
    file_context = request.json.get('file_context')

    # Add file context if provided
    if file_context:
        user_message += f"\n[File: {file_context['fileName']}]\n{file_context['content']}"

    # Send to agent
    conversation_instance.append_user_message(user_message)
    conversation_instance.execute()

    # Return responses
    return jsonify({ 'success': True, 'responses': [...] })
```

### 3. Agent Side (autonomous_mentor.py)

The agent uses ReAct pattern:
1. **Reason** about the student's question
2. **Act** by calling tools (analyze_code, run_code, etc.)
3. **Respond** with guidance (never solutions!)

## Troubleshooting

### Backend Won't Start

**Error:** `ModuleNotFoundError: No module named 'pyagentspec'`

**Solution:**
```bash
pip install -r requirements-web.txt
```

### Extension Can't Connect

**Symptom:** "Teaching agent backend is not running"

**Checks:**
1. Is Python server running?
   ```bash
   curl http://localhost:5000/health
   ```

2. Check server logs for errors

3. Try restarting VS Code

### Agent Not Responding

**Check:**
1. LLM API key is set in `autonomous_mentor.py`
2. Network connection for API calls
3. Backend logs for errors

### File Context Not Sent

**Check:**
1. Is a file open and active?
2. Extension has permission to read file content
3. Check browser console (Help → Toggle Developer Tools)

## Development

### Modify Agent Behavior

Edit [autonomous_mentor.py](../autonomous_mentor.py):
- Change system prompt (lines 238-272)
- Modify tool implementations in `TeachingTools` class
- Adjust hint generation logic

### Modify Extension UI

Edit [src/chatbotProvider.ts](src/chatbotProvider.ts):
- Update HTML/CSS in `_getHtmlForWebview()`
- Add new quick action buttons
- Modify message handling

### Add New API Endpoints

Edit [backend_server.py](backend_server.py):
```python
@app.route('/new_endpoint', methods=['POST'])
def new_endpoint():
    # Your logic here
    return jsonify({'success': True})
```

Then update extension to call it:
```typescript
const response = await this._makeRequest('/new_endpoint', 'POST', data);
```

## Configuration

### Change Backend Port

**backend_server.py:**
```python
app.run(host='localhost', port=5001)  # Change port
```

**src/chatbotProvider.ts:**
```typescript
private _backendUrl = 'http://localhost:5001';  // Update port
```

### Change LLM Model

**autonomous_mentor.py:**
```python
llm_config = OpenAiCompatibleConfig(
    model_id="meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",  # Different model
    # ...
)
```

## Security Notes

1. **Code Execution:** Uses subprocess with 5-second timeout
2. **API Key:** Never exposed to client (stays on server)
3. **Local Only:** Server binds to localhost (not accessible externally)
4. **Input Validation:** Basic validation on all endpoints

## Next Steps

Consider adding:
- [ ] Conversation history persistence
- [ ] Multi-language support (not just Python)
- [ ] Code diff visualization
- [ ] Test case generation
- [ ] Progress tracking per student
- [ ] Custom teaching strategies
- [ ] Integration with online judges (LeetCode, etc.)

## License

MIT
