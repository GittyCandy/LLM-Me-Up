from utils import run_ollama_model, send_progress_update, send_content_update
import os


def format_report(topic: str, research_draft: str, summary: str, temp_dir: str):
    """Format the final research report with citations and structure."""
    send_progress_update("format", "active", 90, "Formatting final report...")

    try:
        # Check for any uploaded files that could be used as references
        references = []
        for filename in os.listdir(temp_dir):
            if filename.endswith(('.pdf', '.doc', '.docx')):
                references.append(filename)

        prompt = f"""Create a well-formatted research report based on the following information. 
        Include appropriate sections, headings, and if there are reference files ({references}), 
        incorporate citations to them where relevant.

        Research topic: {topic}
        Research draft: {research_draft}
        Summary: {summary}

        Formatted research report:"""

        report = run_ollama_model("deepseek-r1:8b", prompt)
        send_content_update("\n\n# Final Research Report\n\n" + report)

        send_progress_update("format", "success", 100, "Report formatting completed")
        return report
    except Exception as e:
        send_progress_update("format", "error", 90, f"Formatting failed: {str(e)}")
        raise