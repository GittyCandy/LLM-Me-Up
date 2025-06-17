import sys
import requests
import json
from datetime import datetime

def generate_response(prompt, agent_type="generate", mode="standard"):
    ollama_url = "http://localhost:11434/api/generate"

    agent_prompts = {
        "generate": {
            "standard": f"""You are a Generation Agent. Your role is to create in-depth research content based on the user's prompt.

            User Prompt: {prompt}

            Generate comprehensive research material that includes:
            - Detailed background information with historical context
            - Key concepts and definitions with examples
            - Current state of knowledge with recent developments
            - Important theories or frameworks with applications
            - Multiple perspectives on the topic
            - Potential future directions

            Structure your response with clear headings and sections:
            1. Introduction and Background
            2. Core Concepts
            3. Current State
            4. Theoretical Frameworks
            5. Critical Perspectives
            6. Future Outlook""",

            "quick": f"""You are a Generation Agent. Your role is to create concise research content for users with short attention spans.

            User Prompt: {prompt}

            Generate brief but informative research material that includes:
            - 1-2 sentence background
            - 3 key points max
            - Simple definitions
            - Only most relevant info

            Format:
            🚀 [Main point in 5 words max]
            • [Brief explanation in 1 line]
            • [Another brief point if needed]"""
        },

        "search": {
            "standard": f"""You are a Search Query Agent. Your role is to generate optimal search queries for research purposes.

            Research Topic: {prompt}

            Generate 5 high-quality search queries that would help research this topic. Format each query on a separate line preceded by a number:
            1. First search query
            2. Second search query
            etc.""",

            "quick": f"""Generate 3 short search queries about: {prompt}

            Format:
            1. [3-5 word query]
            2. [3-5 word query]
            3. [3-5 word query]"""
        },

        # Add this to your agent_prompts dictionary in generate_agent.py
        "local-research": {
            "standard": f"""You are a Knowledge Synthesis Agent. Your role is to provide comprehensive research using only your existing knowledge.

        Research Topic: {prompt}

        Provide a detailed research report that includes:
        - Background and context
        - Key concepts and theories
        - Current understanding
        - Limitations of this knowledge
        - Potential areas for further research

        Structure your response with clear sections:
        1. Introduction
        2. Key Concepts
        3. Current Understanding
        4. Knowledge Gaps
        5. Recommendations""",

            "quick": f"""You are a Quick Knowledge Agent. Provide key facts about: {prompt}

        Format:
        🧠 What I Know:
        • [Fact 1]
        • [Fact 2]
        • [Fact 3]

        ⚠️ Limitations:
        • [What might be missing]
        • [Suggestions for further research]"""
        },

        "web": {
            "standard": f"""You are a Web Research Agent. Analyze the following web search results for the query:

            Query: {prompt}

            Analyze these results and provide:
            - Key information found
            - Most relevant insights
            - Reliability assessment
            - Summary of findings

            Structure your response with clear sections:""",

            "quick": f"""Analyze these web results for: {prompt}

            Format:
            🔍 [Main finding in 5 words]
            • [1 sentence summary]
            💡 [1 key fact or stat]"""
        },

        "analyze": {
            "standard": f"""You are an Analysis Agent. Your role is to synthesize research findings into coherent analysis.

            Research Content: {prompt}

            Analyze this content and provide:
            - Key findings and insights
            - Patterns or trends identified
            - Contradictions or gaps in knowledge
            - Potential implications
            - Relationships to other fields

            Structure your analysis with clear sections:""",

            "quick": f"""Analyze this quickly: {prompt}

            Format:
            🔎 [Main insight in 5 words]
            • [1 line explanation]
            📊 [1 relevant number if available]"""
        },

        "reflect": {
            "standard": f"""You are a Reflection Agent. Your role is to provide critical reflections on research findings.

            Research Analysis: {prompt}

            Provide 3-5 critical reflections that:
            - Assess the quality of evidence
            - Identify potential biases
            - Suggest limitations
            - Propose areas for further research
            - Consider ethical implications

            Number each reflection separately:""",

            "quick": f"""Give 2 quick reflections on: {prompt}

            Format:
            🤔 [Emoji] [1 sentence reflection]
            🧐 [Emoji] [1 sentence reflection]"""
        },

        "report": {
            "standard": f"""You are a Report Agent. Your role is to compile research into a final report.

            Research Content: {prompt}

            Create a comprehensive final report that includes:
            1. Introduction and background
            2. Research methodology
            3. Key findings
            4. Analysis and interpretation
            5. Conclusions
            6. References

            Use professional academic formatting:""",

            "quick": f"""Create a quick summary of: {prompt}

            Format:
            📝 TL;DR Report
            • [3 bullet points max]
            • [1 key takeaway]
            • [1 emoji rating of confidence]"""
        },

        "quickread": f"""You are a QuickRead Agent specialized for Gen Z and Alpha users. Convert this content for short attention spans:

            Content: {prompt}

            Transform this into:
            - Maximum 3 bullet points
            - Each point under 10 words
            - Use emojis to highlight key ideas
            - Include 1 surprising fact if possible
            - Add a "What this means for you" 1-liner

            Format:
            🎯 Key Points:
            • [emoji] [point 1]
            • [emoji] [point 2]
            • [emoji] [point 3]

            💡 What this means for you: [1 line]"""
    }

    if agent_type == "quickread":
        final_prompt = agent_prompts["quickread"]
    else:
        final_prompt = agent_prompts.get(agent_type, {}).get(mode, agent_prompts["generate"]["standard"])

    payload = {
        "model": "dolphin-llama3:8b",
        "prompt": final_prompt,
        "stream": False,
        "options": {
            "temperature": 0.7 if agent_type in ["generate", "web"] or mode == "quick" else 0.3,
            "top_p": 0.9 if mode == "standard" else 0.7
        }
    }

    try:
        response = requests.post(ollama_url, json=payload)
        response.raise_for_status()

        result = {
            "response": response.json()["response"],
            "metadata": {
                "agent": agent_type,
                "mode": mode,
                "timestamp": datetime.now().isoformat(),
                "prompt": prompt[:200] + "..." if len(prompt) > 200 else prompt
            }
        }

        return json.dumps(result)
    except Exception as e:
        error_result = {
            "error": str(e),
            "metadata": {
                "agent": agent_type,
                "timestamp": datetime.now().isoformat()
            }
        }
        return json.dumps(error_result)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python generate_agent.py <prompt> <agent_type> [mode]")
        sys.exit(1)

    prompt = sys.argv[1]
    agent_type = sys.argv[2]
    mode = sys.argv[3] if len(sys.argv) > 3 else "standard"
    result = generate_response(prompt, agent_type, mode)
    print(result)
