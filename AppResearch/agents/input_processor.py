from utils import run_ollama_model, send_progress_update


def process_input(topic: str, temp_dir: str):
    """Process and clean the user input."""
    send_progress_update("input", "active", 10, "Processing input topic...")

    prompt = f"""Please clean and refine the following research topic, ensuring it's clear, focused, and researchable. 
    Remove any unnecessary words or vagueness. Return only the refined topic, no additional commentary.

    Original topic: {topic}

    Refined topic:"""

    try:
        refined_topic = run_ollama_model("dolphin-llama3:8b", prompt)
        send_progress_update("input", "success", 20, "Input processed successfully")
        return refined_topic.strip('"').strip()
    except Exception as e:
        send_progress_update("input", "error", 0, f"Input processing failed: {str(e)}")
        raise