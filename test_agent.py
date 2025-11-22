import os
import warnings
warnings.filterwarnings('ignore')
from pyagentspec.llms import OpenAiCompatibleConfig
from pyagentspec.llms.llmgenerationconfig import LlmGenerationConfig
from pyagentspec.agent import Agent
from wayflowcore.agentspec import AgentSpecLoader

# Set API key
os.environ["OPENAI_API_KEY"] = "tgp_v1_vW09RC97sOgr4CxmYdfF9OF9LlY_ED73B8QFP4gzaA8"

# Configure Together.ai LLM
llm_config = OpenAiCompatibleConfig(
    name="Together AI",
    model_id="openai/gpt-oss-20b",
    url="https://api.together.xyz/v1",
    default_generation_parameters=LlmGenerationConfig(
        max_tokens=512,
        temperature=0.7,
        top_p=0.95,
    )
)

# Create your teaching agent
agent = Agent(
    name="SocraticTeacher",
    description="Teaching assistant that guides students",
    system_prompt="""
    You are a Socratic teaching assistant for CS students.
    
    Rules:
    1. NEVER give complete solutions directly
    2. Ask guiding questions first
    3. Provide progressive hints
    
    Student's question: {question}
    Student's code: {code}
    Hint level: {hint_level}
    """,
    llm_config=llm_config
)

# Load and execute
executable_agent = AgentSpecLoader().load_component(agent)
conversation = executable_agent.start_conversation()

conversation.append_user_message("Explain the concept of recursion in programming.")
conversation.execute()

messages = conversation.get_messages()
print(f"Response: {messages[-1].content}")