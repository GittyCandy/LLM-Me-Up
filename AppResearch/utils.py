import json
import os
import subprocess
from typing import List, Dict, Any


def run_ollama_model(model: str, prompt: str, context: str = "") -> str:
    """Run an Ollama model with the given prompt and optional context."""
    try:
        command = ["ollama", "run", model, prompt]
        if context:
            command.extend(["--context", context])

        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"Error running Ollama model {model}: {e.stderr}")
        raise


def save_intermediate_result(data: Dict[str, Any], temp_dir: str, filename: str):
    """Save intermediate result to a JSON file in the temp directory."""
    filepath = os.path.join(temp_dir, filename)
    with open(filepath, 'w') as f:
        json.dump(data, f)


def load_intermediate_result(temp_dir: str, filename: str) -> Dict[str, Any]:
    """Load intermediate result from a JSON file."""
    filepath = os.path.join(temp_dir, filename)
    with open(filepath, 'r') as f:
        return json.load(f)


def send_progress_update(agent: str, status: str, progress: int, message: str):
    """Send a progress update to the client."""
    update = {
        "agent": agent,
        "status": status,
        "progress": progress,
        "message": message
    }
    print(json.dumps(update))


def send_content_update(content: str):
    """Send a content update to the client."""
    update = {
        "content": content
    }
    print(json.dumps(update))