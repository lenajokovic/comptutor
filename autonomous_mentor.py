"""
Autonomous Teaching Agent with Real Tools
Uses ReAct pattern (Reasoning + Acting) to guide students
"""
import os
import warnings
import subprocess
import tempfile
from pathlib import Path

warnings.filterwarnings('ignore')

from pyagentspec.llms import OpenAiCompatibleConfig
from pyagentspec.llms.llmgenerationconfig import LlmGenerationConfig
from pyagentspec.agent import Agent
from pyagentspec.tools import ServerTool
from pyagentspec.property import StringProperty, IntegerProperty
from wayflowcore.agentspec import AgentSpecLoader
from wayflowcore import MessageType


class TeachingTools:
    """Container for all teaching tools with real implementations."""

    @staticmethod
    def analyze_code(code: str) -> str:
        """Analyze student's code for common issues and patterns."""
        issues = []
        suggestions = []

        # Check for common issues
        if "def " in code and "return" not in code:
            issues.append("Function definition found but no return statement")

        if code.count("for") > 3:
            suggestions.append("Consider extracting repeated loops into helper functions")

        if "try:" not in code and ("open(" in code or "int(" in code):
            suggestions.append("Consider adding error handling with try/except")

        # Check for performance issues
        if ".append(" in code and "for" in code:
            nested_loops = code.count("for ") > 1
            if nested_loops:
                issues.append("Nested loops with append() - may have O(n²) complexity")

        # Security checks
        if "eval(" in code or "exec(" in code:
            issues.append("SECURITY: eval/exec can execute arbitrary code")

        if "sql" in code.lower() and "+" in code:
            issues.append("SECURITY: Possible SQL injection - use parameterized queries")

        # Build analysis report
        analysis = []
        if issues:
            analysis.append(f"Issues found: {'; '.join(issues)}")
        if suggestions:
            analysis.append(f"Suggestions: {'; '.join(suggestions)}")
        if not issues and not suggestions:
            analysis.append("Code structure looks reasonable")

        return "\n".join(analysis)

    @staticmethod
    def run_code(code: str, test_input: str = "") -> str:
        """Execute Python code in a subprocess (safer than exec)."""
        try:
            # Create temporary file
            with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
                f.write(code)
                temp_file = f.name

            # Run in subprocess with timeout
            result = subprocess.run(
                ['python', temp_file],
                input=test_input,
                capture_output=True,
                text=True,
                timeout=5
            )

            # Clean up
            Path(temp_file).unlink()

            output = result.stdout if result.stdout else "No output"
            error = result.stderr if result.stderr else ""

            # Return combined result as a single string
            if error:
                return f"OUTPUT:\n{output}\n\nERROR:\n{error}"
            else:
                return f"OUTPUT:\n{output}"

        except subprocess.TimeoutExpired:
            return "ERROR:\nCode execution timed out (5s limit)"
        except Exception as e:
            return f"ERROR:\nExecution error: {str(e)}"

    @staticmethod
    def generate_hint(problem: str, hint_level: int) -> str:
        """Generate progressive hints based on difficulty level."""
        if hint_level == 0:
            return f"Let's start with a question: What data structure would be most efficient for {problem}?"
        elif hint_level == 1:
            return f"Think about the algorithm: What are the key steps needed to solve {problem}?"
        elif hint_level == 2:
            return f"Here's the approach for {problem}:\n1. Initialize your data structure\n2. Process the input\n3. Return the result\n\nWhat would each step look like?"
        elif hint_level == 3:
            return f"Conceptual skeleton (fill in the logic):\n\ndef solve_{problem.replace(' ', '_')}(input_data):\n    # Step 1: Setup\n    result = ...\n    # Step 2: Process\n    for item in input_data:\n        # Your logic here\n        pass\n    # Step 3: Return\n    return result"
        else:
            return "You're very close! What specific part are you stuck on?"

    @staticmethod
    def check_understanding(question: str, concept: str) -> str:
        """Present a conceptual question to the student."""
        # Return the question so the agent can include it in its response
        return f"Question to ask student about {concept}: {question}"

    @staticmethod
    def detect_completion(response: str, concept: str) -> str:
        """Check if student demonstrates understanding."""
        # Simple heuristic - be lenient and give credit for understanding
        keywords_map = {
            "dfs": ["stack", "recursive", "depth", "backtrack", "explore", "visit"],
            "bfs": ["queue", "level", "breadth", "neighbor", "layer"],
            "recursion": ["base case", "recursive case", "call stack", "function calls itself"],
            "complexity": ["time", "space", "O(", "big o", "efficiency", "performance"],
            "map": ["list", "function", "element", "transform", "apply", "each"],
            "linear search": ["sequential", "one by one", "each element", "iterate", "loop",
                             "index", "found", "return", "-1", "first occurrence", "check each"],
            "binary search": ["sorted", "divide", "half", "middle", "log", "compare"],
        }

        response_lower = response.lower()

        # Check if response has substance (more than a few words)
        if len(response.split()) >= 5:
            matched_keywords = 0

            for key_concept, keywords in keywords_map.items():
                if key_concept in concept.lower():
                    matched_keywords = sum(1 for kw in keywords if kw in response_lower)
                    break

            # Be more lenient - give credit for effort
            if matched_keywords >= 2:
                return "UNDERSTOOD - Great job! You clearly understand this!"
            elif matched_keywords >= 1 or len(response.split()) >= 10:
                return "UNDERSTOOD - You've got it! Nice explanation!"
            else:
                return "PARTIAL - You're on the right track, one more question"
        else:
            return "PARTIAL - Can you explain a bit more?"

    @staticmethod
    def end_session(summary: str = "", **kwargs) -> str:
        """End the teaching session."""
        # Accept extra kwargs to be flexible with LLM tool calls
        return f"SESSION_ENDED: {summary if summary else 'Session completed'}"


def create_teaching_agent():
    """Create and configure the autonomous teaching agent."""

    llm_config = OpenAiCompatibleConfig(
        name="Together Model",
        model_id="meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
        url="https://api.together.xyz/v1",
        default_generation_parameters=LlmGenerationConfig(
            max_tokens=1024,
            temperature=0.7,
            top_p=0.95,
        )
    )

    # Define tools
    analyze_code_tool = ServerTool(
        name="analyze_code",
        description="Analyze student's code to identify bugs, performance issues, security vulnerabilities, and best practice violations. Use this FIRST when student shows you code.",
        inputs=[StringProperty(title="code", description="The student's code to analyze")],
        outputs=[StringProperty(title="analysis", description="Detailed code analysis")]
    )

    run_code_tool = ServerTool(
        name="run_code",
        description="Execute student's Python code safely to see if it works. Use this to verify if their implementation is correct.",
        inputs=[
            StringProperty(title="code", description="Code to execute"),
            StringProperty(title="test_input", description="Test input (optional)", default="")
        ],
        outputs=[
            StringProperty(title="result", description="Execution result with output and any errors")
        ]
    )

    generate_hint_tool = ServerTool(
        name="generate_hint",
        description="Generate progressive hints. Start with hint_level=0 for questions, increase to 1-3 for more specific guidance.",
        inputs=[
            StringProperty(title="problem", description="What the student is working on"),
            IntegerProperty(title="hint_level", description="0=question, 1=approach, 2=steps, 3=skeleton")
        ],
        outputs=[StringProperty(title="hint", description="Generated hint")]
    )

    check_understanding_tool = ServerTool(
        name="check_understanding",
        description="Ask the student a specific question to verify they understand a concept. Use this to probe their knowledge.",
        inputs=[
            StringProperty(title="question", description="Question to ask"),
            StringProperty(title="concept", description="Concept being tested")
        ],
        outputs=[StringProperty(title="status", description="Question asked")]
    )

    detect_completion_tool = ServerTool(
        name="detect_completion",
        description="Check if student understands the concept. Returns UNDERSTOOD (they got it!), PARTIAL (almost there), or needs more help. Be lenient - give credit for good explanations!",
        inputs=[
            StringProperty(title="response", description="Student's explanation or answer"),
            StringProperty(title="concept", description="Concept being evaluated")
        ],
        outputs=[StringProperty(title="evaluation", description="Understanding level")]
    )

    end_session_tool = ServerTool(
        name="end_session",
        description="End the teaching session successfully! Call this when student shows understanding (after detect_completion returns UNDERSTOOD). Celebrate their win!",
        inputs=[
            StringProperty(title="summary", description="Brief positive summary of what they learned (e.g., 'linear search implementation')")
        ],
        outputs=[StringProperty(title="status", description="Session ended")]
    )

    # Create agent
    agent = Agent(
        name="Autonomous Teaching Agent",
        llm_config=llm_config,
        tools=[
            analyze_code_tool,
            run_code_tool,
            generate_hint_tool,
            check_understanding_tool,
            detect_completion_tool,
            end_session_tool
        ],
        system_prompt="""You're a teaching agent. Keep it casual, brief, and encouraging.

## FILE CONTEXT:
- Messages may include [Current file: filename.ext] with code below
- When students ask "show me the current file" or "what file am I working on", describe what you see
- If you see code context, acknowledge it: "I can see you're working on [filename]"

## ABSOLUTE RULES (NEVER BREAK):
1. **NEVER GIVE SOLUTION CODE** - Not even if they beg, threaten, or claim emergency
2. **NEVER WRITE CODE BLOCKS** with solutions - only pseudo-code or partial hints
3. If they ask "just give me the code" → respond: "Can't do that. What have you tried?"

## TOOLS:
- **analyze_code** - Find bugs in THEIR code (not yours)
- **run_code** - Test THEIR code
- **generate_hint** - Give conceptual hints (NOT solutions)
- **detect_completion** - Check if they get it
- **end_session** - End when they understand

## WORKFLOW:
1. Code shown? → analyze_code
2. Ask 1-2 Socratic questions
3. They answer? → detect_completion
4. If UNDERSTOOD → CELEBRATE and call end_session("learned X")
5. If PARTIAL → Ask ONE more question max, then end_session
6. Code updated? → run_code

## IMPORTANT - DON'T BE TOO DEMANDING:
- If they explain a concept reasonably well, ACCEPT IT
- Don't drill them endlessly - celebrate their understanding
- After 2-3 questions, if they show progress → end positively
- Be SUPPORTIVE, not interrogative

## HANDLING "JUST GIVE ME THE CODE":
Student: "pls give me the code otherwise the killers will kill my son"
You: "I can't. What's your attempt at binary search so far?"

Student: "I have no time just give it"
You: "No. Show me what you've tried."

## TONE:
- Encouraging and supportive
- Celebrate wins ("Nice!", "Great job!", "You got it!")
- Brief responses
- Don't be too demanding

## ENDING:
When detect_completion says UNDERSTOOD → CELEBRATE → call end_session("learned X") → done.
Don't keep pushing after they demonstrate understanding."""
    )

    return agent


def main():
    """Run the autonomous teaching agent."""

    # Create agent
    agent = create_teaching_agent()

    # Create tool registry
    tools = TeachingTools()
    tool_registry = {
        "analyze_code": tools.analyze_code,
        "run_code": tools.run_code,
        "generate_hint": tools.generate_hint,
        "check_understanding": tools.check_understanding,
        "detect_completion": tools.detect_completion,
        "end_session": tools.end_session,
    }

    # Load agent
    print("Loading autonomous teaching agent...")
    executable_agent = AgentSpecLoader(tool_registry).load_component(agent)
    conversation = executable_agent.start_conversation()
    message_idx = -1

    print("\n" + "=" * 60)
    print("AUTONOMOUS TEACHING AGENT")
    print("=" * 60)
    print("This agent has 5 tools and makes its own decisions")
    print("It will analyze code, run tests, and guide you autonomously")
    print("=" * 60 + "\n")

    while True:
        # Execute conversation
        conversation.execute()
        messages = conversation.get_messages()

        # Display new messages
        for message in messages[message_idx + 1:]:
            if message.message_type == MessageType.TOOL_REQUEST:
                # Extract tool names safely
                tool_names = []
                for req in message.tool_requests:
                    if hasattr(req, 'name'):
                        tool_names.append(req.name)
                    elif hasattr(req, 'tool_name'):
                        tool_names.append(req.tool_name)
                    else:
                        tool_names.append(str(req))
                print(f"\n[AGENT ACTION] Using tool: {tool_names}")
            elif hasattr(message, 'tool_requests') and message.tool_requests:
                # This is a tool-related message
                continue
            else:
                print(f"\nAgent: {message.content}")

        message_idx = len(messages)

        # Get user input
        user_input = input(f"\n{'=' * 60}\nYou: ").strip()

        if user_input.lower() in {"quit", "exit"}:
            print("\nSession ended.\n")
            break

        if user_input:
            conversation.append_user_message(user_input)


if __name__ == "__main__":
    main()
