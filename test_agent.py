# teaching_agent_with_vscode.py
import os
from pyagentspec.llms import OpenAiCompatibleConfig
from pyagentspec.llms.llmgenerationconfig import LlmGenerationConfig
from pyagentspec.agent import Agent
from pyagentspec.tools.remotetool import RemoteTool
from pyagentspec.property import StringProperty
from wayflowcore.agentspec import AgentSpecLoader
from wayflowcore import MessageType

os.environ["OPENAI_API_KEY"] = "tgp_v1_vW09RC97sOgr4CxmYdfF9OF9LlY_ED73B8QFP4gzaA8"

llm_config = OpenAiCompatibleConfig(
    name="Together Model",
    model_id="meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
    url="https://api.together.xyz/v1",
    default_generation_parameters=LlmGenerationConfig(
        max_tokens=512,
        temperature=0.7,
        top_p=0.95,
    )
)

# RemoteTool - simplified (parameters become query params or are inferred)
vscode_popup_tool = RemoteTool(
    name="show_vscode_popup",
    description="Show a popup message in VS Code with teaching guidance. Provide the message text, type (question/hint/code), and hint_level (0-3).",
    url="http://localhost:3000/popup?message={{message}}&type={{type}}&hint_level={{hint_level}}",
    http_method="GET",
    inputs=[
        StringProperty(title="message", description="The hint or guidance to show"),
        StringProperty(title="type", description="Type: question, hint, or code"),
        StringProperty(title="hint_level", description="Hint progression level 0-3"),
    ],
    outputs=[
        StringProperty(title="result", description="Confirmation that popup was shown")
    ]
)

# Agent without tools (for testing)
teaching_agent = Agent(
    name="Socratic Teaching Assistant",
    llm_config=llm_config,
    tools=[],  # Empty tools list
    system_prompt="""You are a Socratic teaching assistant for CS students.

Rules:
1. NEVER give complete solutions directly
2. Ask guiding questions first
3. Provide progressive hints
4. Always start with questions, then hints, then code snippets if needed

Keep responses concise and focused.""",
)

# Load with WayFlow
print("Loading agent...")
executable_agent = AgentSpecLoader().load_component(teaching_agent)
conversation = executable_agent.start_conversation()
message_idx = -1

print("\n🎓 Teaching Assistant with VS Code Integration")
print("=" * 60)
print("Hints will appear as popups in VS Code!")
print("=" * 60 + "\n")

while True:
    conversation.execute()
    messages = conversation.get_messages()
    
    for message in messages[message_idx + 1:]:
        if message.message_type == MessageType.TOOL_REQUEST:
            print(f"\n🔧 Tool call: {message.tool_requests}")
        else:
            print(f"\n🤖 Assistant: {message.content}")
    
    message_idx = len(messages)
    
    user_input = input(f"\n{'=' * 60}\n👤 You: ").strip()
    
    if user_input.lower() in {"quit", "exit"}:
        print("\n👋 Bye!\n")
        break
    
    if not user_input:
        continue
    
    conversation.append_user_message(user_input)