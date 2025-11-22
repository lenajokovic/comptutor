import os
import warnings
warnings.filterwarnings('ignore')
from pyagentspec.llms import OpenAiCompatibleConfig
from pyagentspec.llms.llmgenerationconfig import LlmGenerationConfig
from pyagentspec.agent import Agent
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

# Simple teaching agent without tools
teaching_agent = Agent(
    name="Socratic Teaching Assistant",
    llm_config=llm_config,
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

print("\n🎓 Socratic Teaching Assistant")
print("=" * 60)
print("I'll help guide you through CS concepts!")
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
