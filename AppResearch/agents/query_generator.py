from utils import run_ollama_model, send_progress_update


def generate_queries(topic: str, temp_dir: str):
    """Generate search queries for the research topic."""
    send_progress_update("query", "active", 25, "Generating search queries...")

    prompt = f"""Based on the following research topic, generate 5-7 specific search queries that would help gather 
    comprehensive information. Present them as a numbered list with no additional commentary.

    Research topic: {topic}

    Search queries:"""

    try:
        queries_output = run_ollama_model("dolphin-llama3:8b", prompt)

        # Parse the numbered list into individual queries
        queries = [q.strip() for q in queries_output.split('\n') if q.strip()]
        queries = [q.split('. ')[1] if '. ' in q else q for q in queries]

        send_progress_update("query", "success", 35, "Search queries generated")
        return queries
    except Exception as e:
        send_progress_update("query", "error", 25, f"Query generation failed: {str(e)}")
        raise