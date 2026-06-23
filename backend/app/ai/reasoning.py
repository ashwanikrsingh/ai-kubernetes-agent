import json
import httpx
from typing import Dict, Any
from loguru import logger

from app.core.config import settings


OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = "openai/gpt-4o-mini"

SYSTEM_PROMPT = """You are a Senior Kubernetes SRE (Site Reliability Engineer) with 10+ years of experience troubleshooting production Kubernetes clusters.

You will receive Kubernetes investigation data including pod statuses, container logs, events, deployment configs, and network info.

Your job:
1. Analyze the evidence carefully and correlate signals across pods, logs, events, and deployments
2. Identify the single most likely root cause
3. Suggest a specific, actionable fix with real kubectl commands
4. Score your confidence based on how clear and conclusive the evidence is

Respond ONLY with a valid JSON object — no markdown, no code fences, no explanation outside JSON:

{
  "root_cause": "One clear sentence describing the root cause",
  "explanation": "2-3 sentences explaining why this is failing and what evidence points to it",
  "fix": "Step-by-step fix instructions, beginner friendly",
  "kubectl_command": "The exact kubectl command(s) to diagnose or fix the issue",
  "prevention": "One sentence on how to prevent this in the future",
  "confidence": 85
}

Rules:
- Reference actual pod names, error messages, or event reasons from the evidence
- kubectl_command must be a real, working command (not a placeholder)
- confidence is an integer 0–100 reflecting how conclusive the evidence is
- If no issues are found, state that clearly with confidence 100"""


def _build_prompt(investigation: Dict[str, Any]) -> str:
    sections = []

    pods = investigation.get("pods", {})
    if pods:
        problematic = pods.get("problematic_pods", [])
        sections.append(
            f"## Pod Status\n"
            f"Healthy: {pods.get('healthy', True)}\n"
            f"Total Pods: {pods.get('total_pods', 0)}\n"
            f"Problematic Pods:\n{json.dumps(problematic, indent=2)}"
        )

    logs = investigation.get("logs", {})
    if logs:
        sections.append(f"## Container Logs\n{json.dumps(logs, indent=2)}")

    events = investigation.get("events", {})
    if events:
        sections.append(f"## Kubernetes Events\n{json.dumps(events, indent=2)}")

    deployments = investigation.get("deployments", {})
    if deployments:
        sections.append(f"## Deployment Health\n{json.dumps(deployments, indent=2)}")

    network = investigation.get("network", {})
    if network:
        sections.append(f"## Network Findings\n{json.dumps(network, indent=2)}")

    return (
        "Analyze the following Kubernetes investigation data and diagnose the issue:\n\n"
        + "\n\n".join(sections)
        + "\n\nRespond with the JSON diagnosis object only."
    )


def _parse_response(content: str) -> Dict[str, Any]:
    content = content.strip()
    # strip markdown code fences if the model wraps the JSON anyway
    if content.startswith("```"):
        lines = content.splitlines()
        content = "\n".join(
            line for line in lines if not line.startswith("```")
        ).strip()
    return json.loads(content)


async def _call_llm(user_prompt: str) -> Dict[str, Any]:
    if not settings.OPENROUTER_API_KEY:
        raise ValueError("OPENROUTER_API_KEY is not configured")

    model = settings.OPENROUTER_MODEL or DEFAULT_MODEL
    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/ai-kubernetes-agent",
    }
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.1,
        "max_tokens": 1000,
    }

    last_error: Exception = None
    for attempt in range(1, 4):
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(OPENROUTER_URL, json=payload, headers=headers)
                response.raise_for_status()
                content = response.json()["choices"][0]["message"]["content"]
                return _parse_response(content)
        except httpx.TimeoutException as e:
            logger.warning(f"LLM request timed out (attempt {attempt}/3)")
            last_error = e
        except httpx.HTTPStatusError as e:
            logger.error(f"LLM API error {e.response.status_code}: {e.response.text}")
            raise
        except json.JSONDecodeError as e:
            logger.error(f"LLM returned non-JSON response: {content!r}")
            raise ValueError(f"LLM returned invalid JSON: {e}") from e

    raise RuntimeError("LLM request failed after 3 attempts") from last_error


def _fallback_diagnosis(error: Exception) -> Dict[str, Any]:
    return {
        "root_cause": "AI analysis unavailable",
        "explanation": f"The AI reasoning engine encountered an error: {error}",
        "fix": "Review the investigation data manually and check pod logs and events.",
        "kubectl_command": "kubectl get pods -A && kubectl get events -A",
        "prevention": "Ensure OPENROUTER_API_KEY and OPENROUTER_MODEL are set in .env",
        "confidence": 0,
    }


async def analyze(investigation: Dict[str, Any]) -> Dict[str, Any]:
    logger.info("Starting AI reasoning on investigation data")
    try:
        user_prompt = _build_prompt(investigation)
        diagnosis = await _call_llm(user_prompt)
        logger.info(f"AI diagnosis complete — confidence: {diagnosis.get('confidence')}%")
        return diagnosis
    except Exception as e:
        logger.error(f"AI reasoning failed: {e}")
        return _fallback_diagnosis(e)
