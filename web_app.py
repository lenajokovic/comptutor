"""
Web interface for the Autonomous Teaching Agent with real tools.
Features: code analysis, execution, progressive hints, understanding checks.
"""
from flask import Flask, render_template, request, jsonify, session
from flask_session import Session
import secrets
from datetime import datetime
from autonomous_mentor import create_teaching_agent, TeachingTools
from wayflowcore.agentspec import AgentSpecLoader
from wayflowcore import MessageType

app = Flask(__name__)
app.config['SECRET_KEY'] = secrets.token_hex(16)
app.config['SESSION_TYPE'] = 'filesystem'
Session(app)

# Store active agent sessions
active_sessions = {}


class WebAgentSession:
    """Manages an autonomous agent session for web interface."""

    def __init__(self, session_id: str):
        self.session_id = session_id
        self.messages = []
        self.message_idx = -1

        # Create agent with tools
        self.agent = create_teaching_agent()
        self.tools = TeachingTools()
        self.session_ended = False
        self.tool_registry = {
            "analyze_code": self.tools.analyze_code,
            "run_code": self.tools.run_code,
            "generate_hint": self.tools.generate_hint,
            "check_understanding": self.tools.check_understanding,
            "detect_completion": self.tools.detect_completion,
            "end_session": self._end_session_wrapper,
        }

        # Load and start conversation
        executable_agent = AgentSpecLoader(self.tool_registry).load_component(self.agent)
        self.conversation = executable_agent.start_conversation()

    def add_message(self, role: str, content: str):
        """Add a message to session history."""
        self.messages.append({
            'role': role,
            'content': content,
            'timestamp': datetime.now().isoformat()
        })

    def _end_session_wrapper(self, summary: str) -> str:
        """Wrapper for end_session that sets flag."""
        self.session_ended = True
        return f"SESSION_ENDED: {summary}"

    def process_user_message(self, user_message: str):
        """Process user message and get agent response."""
        # Add user message
        self.conversation.append_user_message(user_message)
        self.add_message('user', user_message)

        # Execute conversation
        self.conversation.execute()

        # Get new messages
        messages = self.conversation.get_messages()
        new_messages = messages[self.message_idx + 1:]
        self.message_idx = len(messages)

        # Process response
        response_text = ""
        tools_used = []

        for message in new_messages:
            if message.message_type == MessageType.TOOL_REQUEST:
                # Extract tool names
                for tool_req in message.tool_requests:
                    # Try different attribute names
                    tool_name = getattr(tool_req, 'tool_name', None) or getattr(tool_req, 'name', str(tool_req))
                    tools_used.append(tool_name)
            elif hasattr(message, 'tool_requests') and message.tool_requests:
                # Skip tool-related messages
                continue
            else:
                # This is the agent's response
                response_text = message.content
                self.add_message('assistant', response_text)

        return {
            'response': response_text,
            'tools_used': tools_used,
            'session_ended': self.session_ended,
        }


def get_or_create_session(session_id: str) -> WebAgentSession:
    """Get existing session or create new one."""
    if session_id not in active_sessions:
        active_sessions[session_id] = WebAgentSession(session_id)
    return active_sessions[session_id]


@app.route('/')
def index():
    """Render the main chat interface."""
    if 'session_id' not in session:
        session['session_id'] = secrets.token_hex(16)
    return render_template('index.html')


@app.route('/chat', methods=['POST'])
def chat():
    """Handle chat messages from the user."""
    try:
        data = request.json
        user_message = data.get('message', '').strip()

        if not user_message:
            return jsonify({'error': 'Empty message'}), 400

        session_id = session.get('session_id')
        if not session_id:
            return jsonify({'error': 'No session'}), 400

        # Get agent session
        agent_session = get_or_create_session(session_id)

        # Process message
        result = agent_session.process_user_message(user_message)

        return jsonify(result)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/reset', methods=['POST'])
def reset():
    """Reset the current session."""
    try:
        session_id = session.get('session_id')
        if session_id and session_id in active_sessions:
            del active_sessions[session_id]

        # Create new session ID
        session['session_id'] = secrets.token_hex(16)

        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/history', methods=['GET'])
def history():
    """Get chat history for current session."""
    try:
        session_id = session.get('session_id')
        if not session_id or session_id not in active_sessions:
            return jsonify({'messages': []})

        agent_session = active_sessions[session_id]
        return jsonify({'messages': agent_session.messages})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5001)
