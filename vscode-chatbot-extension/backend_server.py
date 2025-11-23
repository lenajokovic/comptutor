"""
Flask API server for the Autonomous Teaching Agent
Provides REST API for VS Code extension to communicate with the agent
"""
import os
import warnings
from flask import Flask, request, jsonify
from flask_cors import CORS

warnings.filterwarnings('ignore')

# Import from parent directory
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from autonomous_mentor import create_teaching_agent, TeachingTools
from wayflowcore.agentspec import AgentSpecLoader
from wayflowcore import MessageType

# TEMPORARY: Set API key if not already in environment
# TODO: Remove this before committing - use system environment variable instead
if not os.environ.get('OPENAI_API_KEY'):
    os.environ['OPENAI_API_KEY'] = 'tgp_v1_vW09RC97sOgr4CxmYdfF9OF9LlY_ED73B8QFP4gzaA8'

app = Flask(__name__)
CORS(app)  # Enable CORS for VS Code extension

# Global agent state
agent_instance = None
conversation_instance = None
tools_registry = None
message_index = -1


def initialize_agent():
    """Initialize the teaching agent and conversation."""
    global agent_instance, conversation_instance, tools_registry, message_index

    # Create agent
    agent_instance = create_teaching_agent()

    # Create tool registry
    tools = TeachingTools()
    tools_registry = {
        "analyze_code": tools.analyze_code,
        "run_code": tools.run_code,
        "generate_hint": tools.generate_hint,
        "check_understanding": tools.check_understanding,
        "detect_completion": tools.detect_completion,
        "end_session": tools.end_session,
    }

    # Load agent and start conversation
    executable_agent = AgentSpecLoader(tools_registry).load_component(agent_instance)
    conversation_instance = executable_agent.start_conversation()
    message_index = -1

    return True


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'agent_initialized': conversation_instance is not None
    })


@app.route('/init', methods=['POST'])
def init_agent():
    """Initialize or reset the agent."""
    try:
        initialize_agent()
        return jsonify({
            'success': True,
            'message': 'Agent initialized successfully'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/chat', methods=['POST'])
def chat():
    """
    Send a message to the agent and get response.

    Request body:
    {
        "message": "student's message",
        "file_context": [optional] {
            "fileName": "example.py",
            "content": "code content...",
            "languageId": "python"
        }
    }
    """
    global conversation_instance, message_index

    if conversation_instance is None:
        initialize_agent()

    try:
        data = request.json
        user_message = data.get('message', '')
        file_context = data.get('file_context', None)

        # Add file context to message if provided
        if file_context:
            context_message = f"\n\n[Current file: {file_context.get('fileName', 'unknown')}]\n"
            if 'content' in file_context:
                context_message += f"```{file_context.get('languageId', '')}\n{file_context['content']}\n```"
            user_message = user_message + context_message

        # Send user message to agent
        conversation_instance.append_user_message(user_message)

        # Execute conversation
        conversation_instance.execute()
        messages = conversation_instance.get_messages()

        # Collect new messages - only get ASSISTANT messages for response
        responses = []
        tool_actions = []
        assistant_messages = []

        for message in messages[message_index + 1:]:
            # Track tool usage
            if message.message_type == MessageType.TOOL_REQUEST:
                # Extract tool names - try different attribute names
                tool_names = []
                for req in message.tool_requests:
                    if hasattr(req, 'name'):
                        tool_names.append(req.name)
                    elif hasattr(req, 'tool_name'):
                        tool_names.append(req.tool_name)
                    elif hasattr(req, 'tool'):
                        tool_names.append(req.tool)
                    else:
                        tool_names.append(str(req))

                if tool_names:
                    tool_actions.append({
                        'type': 'tool_use',
                        'tools': tool_names
                    })

            # Skip tool-related messages (tool results, etc)
            elif hasattr(message, 'tool_requests') and message.tool_requests:
                continue

            # Collect assistant responses (has content but no tool_requests)
            elif hasattr(message, 'content') and message.content:
                # Skip user messages - only collect assistant responses
                # User messages were already added via append_user_message, so we skip them here
                message_str = str(message.message_type) if hasattr(message, 'message_type') else ''
                if 'USER' not in message_str.upper():
                    # Ensure content is a string
                    content = str(message.content) if not isinstance(message.content, str) else message.content
                    assistant_messages.append(content)

        # Consolidate all assistant messages into one response
        if assistant_messages:
            # Join multiple messages with double newline
            consolidated_response = '\n\n'.join(assistant_messages)
            responses.append({
                'type': 'text',
                'content': consolidated_response
            })

        # Debug logging
        print(f"[DEBUG] Processed {len(messages[message_index + 1:])} new messages")
        print(f"[DEBUG] Tool actions: {len(tool_actions)}")
        print(f"[DEBUG] Assistant messages: {len(assistant_messages)}")
        if responses:
            print(f"[DEBUG] Sending response length: {len(responses[0]['content'])} chars")

        message_index = len(messages) - 1

        return jsonify({
            'success': True,
            'responses': responses,
            'tool_actions': tool_actions,
            'message_count': len(messages)
        })

    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"ERROR in /chat endpoint:\n{error_details}")
        return jsonify({
            'success': False,
            'error': str(e),
            'details': 'Check server logs for full traceback'
        }), 500


@app.route('/reset', methods=['POST'])
def reset_conversation():
    """Reset the conversation to start fresh."""
    try:
        initialize_agent()
        return jsonify({
            'success': True,
            'message': 'Conversation reset successfully'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/analyze', methods=['POST'])
def analyze_code():
    """
    Analyze code directly without agent conversation.

    Request body:
    {
        "code": "code to analyze"
    }
    """
    try:
        data = request.json
        code = data.get('code', '')

        if not code:
            return jsonify({
                'success': False,
                'error': 'No code provided'
            }), 400

        tools = TeachingTools()
        analysis = tools.analyze_code(code)

        return jsonify({
            'success': True,
            'analysis': analysis
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/run', methods=['POST'])
def run_code():
    """
    Execute code directly without agent conversation.

    Request body:
    {
        "code": "code to run",
        "test_input": "optional test input"
    }
    """
    try:
        data = request.json
        code = data.get('code', '')
        test_input = data.get('test_input', '')

        if not code:
            return jsonify({
                'success': False,
                'error': 'No code provided'
            }), 400

        tools = TeachingTools()
        output, error = tools.run_code(code, test_input)

        return jsonify({
            'success': True,
            'output': output,
            'error': error,
            'has_error': bool(error)
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


if __name__ == '__main__':
    print("=" * 60)
    print("AUTONOMOUS TEACHING AGENT - API SERVER")
    print("=" * 60)
    print("Starting Flask server on http://localhost:5000")
    print("Endpoints:")
    print("  POST /init      - Initialize agent")
    print("  POST /chat      - Send message to agent")
    print("  POST /reset     - Reset conversation")
    print("  POST /analyze   - Analyze code")
    print("  POST /run       - Execute code")
    print("  GET  /health    - Health check")
    print("=" * 60)

    # Initialize agent on startup
    initialize_agent()

    app.run(host='localhost', port=5000, debug=True, use_reloader=False)
