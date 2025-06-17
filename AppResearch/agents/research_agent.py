from utils import run_ollama_model, send_progress_update, send_content_update


def conduct_research(topic: str, search_results: list, temp_dir: str):
    """Conduct in-depth research on the topic using the search results."""
    send_progress_update("research", "active", 55, "Conducting in-depth research...")

    try:
        # Prepare context for the research
        context = f"Research topic: {topic}\n\nSearch results:\n"
        for result in search_results:
            context += f"Query: {result['query']}\n"
            for item in result['results']:
                context += f"- {item['title']}: {item['snippet']}\n"
            context += "\n"

        prompt = f"""Using the following research topic and search results, analyze and synthesize the information 
        into a comprehensive research draft. Focus on key findings, relevant data, and important insights. 
        Organize the information logically with clear sections.

        {context}

        Research draft:"""

        research_draft = run_ollama_model("deepseek-r1:8b", prompt)
        send_content_update("\n\n## Research Draft\n\n" + research_draft)

        send_progress_update("research", "success", 70, "Research completed")
        return research_draft
    except Exception as e:
        send_progress_update("research", "error", 55, f"Research failed: {str(e)}")
        raise