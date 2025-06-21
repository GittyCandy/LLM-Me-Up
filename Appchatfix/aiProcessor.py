import sys
import json
from langchain_ollama import OllamaLLM
from typing import List, Dict


def main():
    if len(sys.argv) < 2:
        print("Usage: python aiProcessor.py <json_data>")
        sys.exit(1)

    try:
        data = json.loads(sys.argv[1])
        prompt = data.get('prompt', '')
        model = data.get('model', 'dolphin-llama3:8b')
        conversation_history = data.get('conversationHistory', [])
        document_content = data.get('documentContent', '')

        llm = OllamaLLM(
            model=model,
            temperature=0.7,  # Default, can be overridden
            top_k=40,
            top_p=0.9,
            repeat_penalty=1.1
        )

        # Build the full prompt with context if provided
        full_prompt = build_prompt(prompt, conversation_history, document_content)

        # Stream the response for real-time updates
        response = llm.stream(full_prompt)

        for chunk in response:
            print(chunk, end='', flush=True)

    except Exception as e:
        print(f"Error processing AI request: {str(e)}")
        sys.exit(1)


def build_prompt(prompt: str, conversation_history: List[Dict], document_content: str = '') -> str:
    prompt_parts = []

    # Add document content if provided
    if document_content:
        prompt_parts.append(f"Document content:\n{document_content}\n")

    # Add conversation history
    if conversation_history:
        prompt_parts.append("Conversation history:")
        for msg in conversation_history:
            role = "User" if msg['role'] == 'user' else 'Assistant'
            content = msg['content']

            # Include document reference if present
            if 'documentId' in msg:
                content += f"\n[Referencing uploaded document: {msg['documentId']}]"

            prompt_parts.append(f"{role}: {content}")

    # Add the current prompt
    prompt_parts.append(f"User: {prompt}")
    prompt_parts.append("Assistant:")

    return "\n".join(prompt_parts)


if __name__ == "__main__":
    main()