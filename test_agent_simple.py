import os
import warnings
warnings.filterwarnings('ignore')
from pyagentspec.llms import OpenAiCompatibleConfig
from pyagentspec.llms.llmgenerationconfig import LlmGenerationConfig
from pyagentspec.agent import Agent
from pyagentspec.tools import ServerTool
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

# Flag to track if session should end
session_complete = {"done": False}

# Tool for agent to signal completion
end_session_tool = ServerTool(
    name="end_teaching_session",
    description="Call this when the student has demonstrated clear understanding and the learning objective is achieved. Use this to end the session gracefully.",
    inputs=[
        StringProperty(title="reason", description="Brief reason why the student succeeded (e.g., 'Student correctly implemented DFS')")
    ],
    outputs=[
        StringProperty(title="status", description="Confirmation message")
    ]
)

# Teaching agent with completion tool
teaching_agent = Agent(
    name="Socratic Teaching Assistant",
    llm_config=llm_config,
    tools=[end_session_tool],
    system_prompt="""You are a Socratic teaching assistant for CS students.

Rules:
1. NEVER give complete solutions directly
2. Ask guiding questions first
3. Provide progressive hints
4. Always start with questions, then hints, then code snippets if needed
5. When the student demonstrates clear understanding (correct implementation, explains the concept well, or solves the problem), congratulate them briefly and IMMEDIATELY call the end_teaching_session tool.

Keep responses concise and focused.""",
)

# Function that gets called when agent ends session
def end_teaching_session(reason="Session complete"):
    session_complete["done"] = True
    return f"Session ended: {reason}"

# Tool registry
tool_registry = {
    "end_teaching_session": end_teaching_session,
}

# Load with WayFlow
print("Loading agent...")
executable_agent = AgentSpecLoader(tool_registry).load_component(teaching_agent)
conversation = executable_agent.start_conversation()
message_idx = -1

print("\n🎓 Socratic Teaching Assistant")
print("=" * 60)
print("I'll help guide you through CS concepts!")
print("=" * 60 + "\n")

while True:
    conversation.execute()
    messages = conversation.get_messages()

    for message in messages[message_idx + 1:]:
        if message.message_type == MessageType.TOOL_REQUEST:
            print(f"\n🔧 [Agent detected student understanding]")
        else:
            print(f"\n🤖 Assistant: {message.content}")

    message_idx = len(messages)

    # Check if agent ended the session
    if session_complete["done"]:
        print("\n✅ Session complete! You've demonstrated understanding.")
        print("👋 Great work! Keep learning!\n")
        break

    user_input = input(f"\n{'=' * 60}\n👤 You: ").strip()

    if user_input.lower() in {"quit", "exit"}:
        print("\n👋 Goodbye!\n")
        break

    if not user_input:
        continue

    conversation.append_user_message(user_input)
