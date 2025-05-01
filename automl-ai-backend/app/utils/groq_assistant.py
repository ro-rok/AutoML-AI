import aiohttp
import asyncio
from typing import AsyncGenerator

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama3-8b-8192" 

def build_prompt(step: str, metadata: dict) -> list:
    system_message = {
        "role": "system",
        "content": f"You are an AI assistant helping users build supervised ML pipelines. Provide expert suggestions at the '{step}' step."
    }

    user_message = {
        "role": "user",
        "content": f"Here is the data summary for '{step}' step:\n\n{metadata}\n\nPlease provide recommendations."
    }

    return [system_message, user_message]

async def stream_groq_response(api_key: str, messages: list) -> AsyncGenerator[str, None]:
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": GROQ_MODEL,
        "messages": messages,
        "stream": True,
        "temperature": 0.6
    }

    async with aiohttp.ClientSession() as session:
        async with session.post(GROQ_API_URL, json=payload, headers=headers) as resp:
            async for line in resp.content:
                if line:
                    text = line.decode("utf-8").replace("data: ", "").strip()
                    if text and text != "[DONE]":
                        try:
                            import json
                            content = json.loads(text)["choices"][0]["delta"].get("content")
                            if content:
                                yield content
                        except Exception:
                            continue
