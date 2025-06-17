from utils import run_ollama_model, send_progress_update, send_content_update


def summarize_research(topic: str, research_draft: str, temp_dir: str):
    """Summarize and reflect on the research findings."""
    send_progress_update("summary", "active", 75, "Summarizing research findings...")

    try:
        prompt = f"""Please summarize the following research draft, highlighting the key points and insights. 
        Also provide critical reflection on the findings, noting any gaps or areas needing further investigation.

        Research topic: {topic}
        Research draft: {research_draft}

        Summary and reflection:"""

        summary = run_ollama_model("dolphin-llama3:8b", prompt)
        send_content_update("\n\n## Summary and Reflection\n\n" + summary)

        send_progress_update("summary", "success", 85, "Summary completed")
        return summary
    except Exception as e:
        send_progress_update("summary", "error", 75, f"Summarization failed: {str(e)}")
        raise