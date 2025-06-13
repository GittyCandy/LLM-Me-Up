import sys
import json
from langchain_ollama import OllamaLLM


def main():
    if len(sys.argv) < 2:
        print("Usage: python aiProcessor.py <prompt> [model] [context]")
        sys.exit(1)

    prompt = sys.argv[1]
    model = sys.argv[2] if len(sys.argv) > 2 else "dolphin-llama3:8b"
    context = json.loads(sys.argv[3]) if len(sys.argv) > 3 else []

    try:
        llm = OllamaLLM(model=model)

        # Build the full prompt with context if provided
        full_prompt = build_prompt(prompt, context)

        response = llm.invoke(full_prompt)
        print(response)
    except Exception as e:
        print(f"Error processing AI request: {str(e)}")
        sys.exit(1)


def build_prompt(prompt, context):
    if not context:
        return prompt

    # Build a conversation history from context
    conversation = []
    for msg in context:
        role = "User" if msg['role'] == 'user' else 'Assistant'
        conversation.append(f"{role}: {msg['content']}")

    # Add the new prompt
    conversation.append(f"User: {prompt}")
    conversation.append("Assistant:")

    return "\n".join(conversation)


if __name__ == "__main__":
    main()