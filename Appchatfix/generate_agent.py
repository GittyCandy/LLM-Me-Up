import sys
import requests
import json
from datetime import datetime
import os


def generate_response(input_data):
    prompt = input_data.get('prompt', '')
    agent_type = input_data.get('agent_type', 'generate')
    mode = input_data.get('mode', 'standard')
    intensity = input_data.get('intensity', 3)
    role = input_data.get('role', '')
    ollama_url = "http://localhost:11434/api/generate"

    # Determine which model to use based on mode
    model = "deepseek-r1:8b" if mode == "deep" else "dolphin-llama3:8b"

    agent_prompts = {
        "generate": {
            "standard": f"""You are a professional Research Generation Agent. Create a comprehensive research document based on the user's prompt.

            User Prompt: {prompt}

            Structure:
            1. [📌 Core Thesis] - 2 sentence central claim
            2. [🔍 Key Evidence] - 3 bullet points (max 15 words each)
            3. [🤔 Counterpoints] - 1-2 notable objections
            4. [💡 Implications] - Why this matters now
            5. [📚 Critical Analysis] - Strengths and weaknesses of current research - Conflicting perspectives"

            Guidelines:
                - Maintain academic rigor but avoid jargon
                - Balance conciseness with completeness
                - Highlight practical applications""",

            "quick": f"""[GenZ Mode Activated] Create a quick snackable research bite about: {prompt}

            Format:
            🔥 Hot Take: [1 emoji + 3-word headline]
            🎯 3 Quick Facts:
            • [5 words max]
            • [5 words max]
            • [5 words max]
            📌 Why Care?: [1 Insta-story style sentence]
            💡 Pro Tip: [1 actionable insight]
            ⏱️ Read Time: <30 secs

            Rules:
            - No fluff, only hype
            - Use emojis as bullet points
            - If it wouldn't fit in a TikTok caption, rewrite it""",

            "deep": f"""You are an Advanced Research Agent specializing in deep, comprehensive analysis. Conduct an in-depth research report on:

            Topic: {prompt}
            Research Intensity Level: {intensity}/5

            Required Sections:
            [📜 Historiography] - Detailed background context and Historical evolution with key milestones
            [⚖️ Debate Map] - Key researchers and institutions
            [🔬 Critical Evaluation] - Methodological strengths/weaknesses Critics
            [🔬 Methodology Review] - How knowledge is produced in this field
            [💎 Key Studies] - {intensity} seminal works with critique
            [🌐 Real-World Impact] - Real-world applications with examples and Industry adoption and challenges
            [🚧 Knowledge Frontiers] - {intensity} burning questions in the field

            Rules:
            - Depth and precision are prioritized over brevity"""
        },

        "search": {
            "standard": f"""As a Search Query Specialist, Research Query Blueprint on: {prompt}

            Generate 5 precise search strings:
            1. [Broad conceptual search] site:.edu
            2. [Specific term] + [application]
            3. [Controversy/debate] + "review"
            4. [Appropriate terminology]
            5. [Recent developments] + after:2020

            Guidelines:
            - Each query must stand alone
            - Include domain/filetype operators where helpful
            - Balance recall and precision""",

            "quick": f"""Generate 3 lightning-fast search queries about: {prompt}

            Format:
            1. [3-word concrete noun phrase]
            2. [3-word question format]
            3. [4-word "vs" comparison]

            Rules:
            - No complete sentences
            - Use only keywords
            - Prioritize recent sources (add "2020..2023" if relevant)""",

            "deep": f"""🧪 Precision Search on: {prompt}

            Create {intensity + 2} targeted queries:
            1. [Meta-analysis] - "systematic review" OR "meta-analysis"
            2. [Methodology] - "research design" OR "method* approach"
            3. [Critiques] - "limitations" OR "criticism"
            4. [Emerging] - "new findings" OR "breakthrough"

            Requirements:
            - Do not include thoughts or any commentary
            - Each query must stand alone string"""
        },

        "local-research": {
            "standard": f"""You are a Knowledge Synthesis Agent. Provide comprehensive research using only your existing knowledge:

            Topic: {prompt}

            Create a detailed report with:
            1. Introduction
                - Definition and scope
                - Background context
            2. Core Knowledge
                - Key facts and information
                - Important theories
                - Relevant data points
            3. Limitations
                - Knowledge gaps
                - Potential inaccuracies
                - Areas needing verification
            4. Recommendations
                - Suggested external sources
                - Key questions for further research

                Guidelines:
                - Cite training cutoff when relevant
                - Distinguish between:
                  • Well-established facts
                  • Probable interpretations
                  • Speculative theories""",

            "quick": f"""Instant Knowledge Drop: {prompt}

            Format:
            ✅ Known Facts:
            • [1] [5-word statement]
            • [2] [5-word statement]
            🚫 Unknowns:
            - [1 key gap]
            - [1 potential bias]
            📱 Next Steps: 
            [1] Search for [concrete term]
            [2] Verify [specific claim]

            Rules:
            - Present information as bullet points
            - Never say "I think" or "in my knowledge"
            - Flag uncertainties explicitly""",

            "deep": f"""As a Knowledge Synthesis Expert, provide the most comprehensive analysis possible using only your existing knowledge:
            Topic: {prompt}

            Required Elements:
            [📐 Foundational Concepts] - {intensity} bedrock principles
            [⚡ Live Controversies] - {intensity} unresolved debates
            [🕳️ Knowledge Gaps] - {intensity} critical unknowns
            [🔮 Projected Developments] - Expected near-future advances

            Methodology:
            - Map relationships between concepts
            - Identify {intensity} most vulnerable assumptions

            Presentation:
            Use MITRE ATT&CK-style matrix showing:
            • Confidence levels
            • Contradictory evidence

            Conclude the research in an in-depth report format including:
            1. Comprehensive Introduction
            2. Core Knowledge Base
            3. Critical Limitations
            4. Research Recommendations"""
        },

        "web": {
            "standard": f"""Source Synthesis: {prompt}

            Provide a professional analysis that:
            1. Summarizes key findings
            2. Identifies patterns/trends
            3. Highlights most relevant information

            Structure your response while maintaining academic rigor.""",

            "quick": f"""Web Snapshot:{prompt}

            Format:
            🏆 Most Relevant: [URL domain]
            - [3-word summary]
            💯 Confidence: [High/Med/Low]
            🚩 Red Flags: [1 if any]
            🔄 Alternate View: [Opposing source if exists]

            Rules:
            - Process in <10 seconds
            - Extract concrete data only
            - Skip narrative explanations""",

            "deep": f"""Perform an analysis of these search results:

            Original Query: {prompt.split('Results:')[0].strip()}
            Research Intensity: {intensity}/5

            Results:
            {prompt.split('Results:')[1] if 'Results:' in prompt else prompt}

            Provide a comprehensive analysis with:

           Investigation Protocol:
            1. Lineage Analysis:
               - Citation trail
               - Original data source
               - Funding disclosures
            2. Methodology Audit:
               - Sample sizes
               - Control groups
               - Statistical significance
            3. Network Mapping:
               - Institutional connections
               - Author collaborations
               - Opposition research
            4. Critical Commentary
                - Strengths/weaknesses of findings
                - {intensity} most significant insights
                - Recommendations for further investigation

            Output:
            Graded evidence quality report (A-F) with:
            • {intensity} key strengths
            • {intensity} critical weaknesses."""
        },

        "analyze": {
            "standard": f"""Research Evaluation: {prompt}

            Provide a professional analysis that:
            1. Identifies key themes
            2. Evaluates evidence quality
            3. Compares/contrasts findings
            4. Assesses implications
            5. Highlights knowledge gaps

            Use clear section headings and maintain an objective, evidence-based tone.""",

            "quick": f"""Instant Analysis: {prompt}

            Format:
            🧠 Main Idea: [3 words]
            📊 Best Evidence: [1 stat/fact]
            🤔 Biggest Hole: [1 limitation]
            🎯 Practical Use: [1 application]

            Constraints:
            - Each element ≤8 words
            - No complete sentences
            - Emoji as bullet points""",

            "deep": f"""Critical Dissection: {prompt}

            Forensic Examination:
            1. Epistemic Foundations:
               - Underlying assumptions
               - Paradigm dependencies
               - Measurement validity
            2. Argument Structure:
               - Logical coherence
               - Inference strength
               - Failure modes
            3. Impact Assessment:
               - Field disruption potential
               - Adjacent domain effects
               - Long-term consequences

            Deliverable:
            Triangulated critique with:
            • {intensity} supporting arguments
            • {intensity} undermining factors
            • {intensity} alternative interpretations"""
        },

        "reflect": {
            "standard": f"""📄 Executive Brief: {prompt}

            Structure:
            ▸ Purpose: [1 sentence]
            ▸ Findings: [3 bullet points]
            ▸ Implications: [2 scenarios]
            ▸ Actions: [1 recommended]
            ▸ Risks: [1 contingency]""",

            "quick": f"""One-Screen Report: {prompt}

            Template:
            [📌] HEADLINE (5 words)
            [📊] KEY CHART: Describe as "Type showing X vs Y"
            [❗] MAIN WARNING: 1 caveat
            [✅] ACTION ITEM: 1 concrete step""",

            "deep": f"""in-depth reflections on: {prompt}
            Reflection Depth: {intensity}/5

            Generate {intensity} comprehensive reflections covering:
            1. Methodological Critique
            2. Bias Analysis
            3. Evidence Assessment
            4. Alternative Perspectives
            5. Future Research

            Each reflection should be substantial (3-5 sentences) with specific examples."""
        },

        "report": {
            "standard": f"""Compile this research: {prompt}

            Create a comprehensive final report with:
            1. Executive Summary
            2. Introduction
            3. Methodology
            4. Findings
            5. Analysis
            6. Conclusions
            7. Recommendations
            8. References (if any)""",

            "quick": f"""Create a quick report from: {prompt}

            Format:
            📝 TL;DR Report
            • [3 key bullet points]
            • [1 main takeaway]
            • [1 confidence rating: Low/Medium/High]""",

            "deep": f"""Compile an exhaustive final report from: {prompt}
            Report Depth: {intensity}/5

            Structure the report with these sections:
            1. Detailed Executive Summary (1-2 paragraphs)
            2. Comprehensive Introduction
                - Background and context
                - Research objectives
                - Significance of study
            3. Methodology
                - Research approach
                - Data collection methods
                - Analysis techniques
            4. Findings
                - Organized by theme/category
                - Key results highlighted
                - Supporting data presented
            5. In-Depth Analysis
                - Interpretation of findings
                - Patterns and relationships
                - Surprising/disconfirming evidence
            6. Conclusions
                - Summary of key insights
                - Theoretical implications
                - Practical consequences
            7. Recommendations
                - For practitioners
                - For policymakers
                - For future research
            8. References (if any)
                - Proper citations
                - Additional resources"""
        },

        "quickread": {
            "standard": f"""Create a concise version of: {prompt}

            Provide a professional summary that:
            - Captures key points
            - Maintains accuracy
            - Uses clear, concise language
            - Preserves important details
            - Is approximately 1/3 the length of original""",

            "quick": f"""Create a GenZ-friendly summary of: {prompt}

            Format:
            🎯 Key Points:
            • [emoji] [point 1 in 5 words]
            • [emoji] [point 2 in 5 words]
            • [emoji] [point 3 in 10 words]

            💡 What Matters:
            [1 line impact statement]

            📌 Remember:
            [1 surprising fact]""",

            "deep": f"""Create a comprehensive yet concise summary of: {prompt}

            The summary should:
            - Preserve all critical information
            - Maintain academic rigor
            - Highlight key insights
            - Note important caveats
            - Be about 50% the length of original

            Structure:
            1. Core Findings
                - Key results
                - Significant data points
            2. Critical Analysis
                - Most important interpretations
                - Notable patterns
            3. Implications
                - Theoretical consequences
                - Practical applications
            4. Limitations
                - Key caveats
                - Important context"""
        }
    }

    if agent_type in agent_prompts:
        if isinstance(agent_prompts[agent_type], dict):
            final_prompt = agent_prompts[agent_type].get(mode, agent_prompts[agent_type]["standard"])
        else:
            final_prompt = agent_prompts[agent_type]
    else:
        final_prompt = agent_prompts["generate"]["standard"]

    # Adjust parameters based on mode and agent type
    temperature = 0.7 if mode == "quick" or agent_type in ["generate", "web"] else 0.3
    top_p = 0.9 if mode == "standard" else 0.7

    # Special adjustments for deep mode
    if mode == "deep":
        temperature = max(0.3, min(0.7, 0.3 + (intensity * 0.08)))  # Scale with intensity
        top_p = 0.85
        if agent_type in ["analyze", "reflect"]:
            temperature = max(0.2, min(0.6, 0.2 + (intensity * 0.08)))

    payload = {
        "model": model,
        "prompt": final_prompt,
        "stream": False,
        "options": {
            "temperature": temperature,
            "top_p": top_p,
            "num_ctx": 8192  # Increased context window for better research
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
                "model": model,
                "intensity": intensity if mode == "deep" else None,
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
    if len(sys.argv) < 2:
        print("Usage: python generate_agent.py <input_file>")
        sys.exit(1)

    input_file = sys.argv[1]

    try:
        with open(input_file, 'r') as f:
            input_data = json.load(f)

        result = generate_response(input_data)
        print(result)
    except Exception as e:
        error_result = {
            "error": str(e),
            "metadata": {
                "timestamp": datetime.now().isoformat()
            }
        }
        print(json.dumps(error_result))