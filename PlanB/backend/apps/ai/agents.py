"""Sub-agent registry, router, and execution engine.

Architecture:
  User Request → Router Agent → Sub-agent (chat/json/classify/creative/summary) → Response
"""

import logging
import os
import re
from dataclasses import dataclass, field

from .prompts import CHAT_SYSTEM, NOTE_AI_SYSTEMS, ROUTER_SYSTEM, SUMMARY_SYSTEM

logger = logging.getLogger("planb.ai")


# ── Agent Configuration ─────────────────────────────────────────────────────


@dataclass
class AgentConfig:
    name: str
    description: str
    model_priority: list[str]
    system_prompt: str
    temperature: float = 0.3
    require_json: bool = False
    fallback_agents: list[str] = None
    context_hint: str = "full"  # full | minimal | stats | none

    def __post_init__(self):
        if self.fallback_agents is None:
            self.fallback_agents = []


AGENT_REGISTRY: dict[str, AgentConfig] = {
    "router": AgentConfig(
        name="Router",
        description="Request classifier — analyzes input and selects the best sub-agent",
        model_priority=["gemini-3.1-flash-lite"],
        system_prompt=ROUTER_SYSTEM,
        temperature=0.1,
        require_json=True,
        context_hint="none",
    ),
    "chat": AgentConfig(
        name="Chat Assistant",
        description="General conversation, Q&A, complex reasoning, action execution",
        model_priority=["gemini-3.5-flash", "gemini-2.5-flash", "deepseek-v4-flash"],
        system_prompt=CHAT_SYSTEM,
        temperature=0.7,
        require_json=True,
        context_hint="full",
        fallback_agents=[],
    ),
    "json": AgentConfig(
        name="JSON Extractor",
        description="Natural language → structured JSON (nl-task, epic-breakdown)",
        model_priority=["deepseek-v4-flash", "gemini-3.5-flash"],
        system_prompt="You are a structured data extractor. Respond ONLY with valid JSON matching the requested schema.",
        temperature=0.1,
        require_json=True,
        context_hint="minimal",
    ),
    "classify": AgentConfig(
        name="Classifier",
        description="Tag recommendation, category classification, simple judgments",
        model_priority=["gemini-3.1-flash-lite", "gemini-2.5-flash"],
        system_prompt=NOTE_AI_SYSTEMS["suggest_tags"],
        temperature=0.2,
        require_json=True,
        context_hint="none",
    ),
    "creative": AgentConfig(
        name="Creative Writer",
        description="Note expansion, creative writing, structuring",
        model_priority=["gemini-3.5-flash", "deepseek-v4-flash"],
        system_prompt=NOTE_AI_SYSTEMS["expand"],
        temperature=0.8,
        context_hint="none",
    ),
    "summary": AgentConfig(
        name="Summarizer",
        description="Weekly summaries, insight extraction — concise and accurate",
        model_priority=["gemini-3.1-flash-lite", "gemini-2.5-flash"],
        system_prompt=SUMMARY_SYSTEM,
        temperature=0.3,
        context_hint="stats",
    ),
}


def get_agent(name: str) -> AgentConfig:
    agent = AGENT_REGISTRY.get(name)
    if not agent:
        raise KeyError(f"Unknown agent: {name}. Available: {list(AGENT_REGISTRY.keys())}")
    return agent


# ── Router ───────────────────────────────────────────────────────────────────


def route_request(user_input: str, context: dict = None) -> str:
    """Classify user input into the most appropriate sub-agent name.

    Uses rule-based fast-path first, falls back to LLM classification.
    """
    text = user_input.lower()

    # Rule-based fast-path
    if re.search(r"태그|분류|카테고리|classif", text):
        return "classify"
    if re.search(r"요약|한줄|간략|summary|insight", text):
        return "summary"
    if re.search(r"(초안|작성|확장|글|내용).*(작성|써줘|만들어줘)", text):
        return "creative"
    if re.search(r"(태스크|일정|노트|할\s?일|프로젝트|이벤트|등록|추가|생성|만들|잡아|수정|삭제)", text):
        return "chat"
    if re.search(r"(안녕|도움|뭐|무엇|어떻|알려|찾아|검색|질문|물어)", text):
        return "chat"

    # LLM-based fallback
    if context:
        return _router_llm_classify(user_input, context)
    return "chat"


def _router_llm_classify(user_input: str, context: dict) -> str:
    """Fallback: use a lightweight model to classify ambiguous input."""
    from .views import _gemini

    prompt = f"""Classify this user request into one agent:
- chat: general conversation, task/event/note creation, queries
- json: structured data extraction (NL → JSON)
- classify: tags, categories, classification
- creative: writing, expansion, drafting
- summary: summarization, insights

User: {user_input}
Agent:"""
    try:
        raw, _ = _gemini(prompt, ROUTER_SYSTEM, require_json=True)
        import json

        parsed = json.loads(raw)
        agent = parsed.get("agent", "chat")
        if agent in AGENT_REGISTRY:
            return agent
    except Exception:
        pass
    return "chat"


# ── Execution Engine ─────────────────────────────────────────────────────────


def _call_model(
    model_name: str,
    prompt: str,
    system_prompt: str,
    temperature: float = 0.3,
    require_json: bool = False,
) -> tuple[str, str]:
    """Route a model call to the appropriate provider."""
    if model_name.startswith("gemini-"):
        from .views import _try_gemini

        return _try_gemini(prompt, system_prompt, require_json=require_json, model=model_name)
    if model_name.startswith("deepseek-"):
        from .views import _try_deepseek

        return _try_deepseek(prompt, system_prompt, require_json=require_json)
    if model_name.startswith("llama-"):
        from .views import _try_groq

        return _try_groq(prompt, system_prompt, require_json=require_json)
    raise ValueError(f"Unknown model prefix: {model_name}")


def execute_agent(
    agent_name: str,
    prompt: str,
    system_prompt_override: str = None,
) -> tuple[str, str]:
    """Execute a sub-agent by name.

    Returns (response_text, model_label).
    Tries model_priority in order, then fallback_agents.
    """
    config = get_agent(agent_name)
    system = system_prompt_override or config.system_prompt
    errors = []

    for model in config.model_priority:
        try:
            logger.info("[AGENT:%s] Trying model=%s", agent_name, model)
            text, model_name = _call_model(
                model,
                prompt,
                system,
                temperature=config.temperature,
                require_json=config.require_json,
            )
            logger.info("[AGENT:%s] Success model=%s", agent_name, model_name)
            return text, model_name
        except Exception as e:
            logger.warning("[AGENT:%s] Model %s failed: %s", agent_name, model, str(e)[:200])
            errors.append(f"{model}: {str(e)[:100]}")

    for fallback in config.fallback_agents:
        try:
            logger.info("[AGENT:%s] Falling back to agent=%s", agent_name, fallback)
            return execute_agent(fallback, prompt, system_prompt_override)
        except Exception as e:
            errors.append(f"fallback({fallback}): {str(e)[:100]}")

    raise RuntimeError(f"Agent '{agent_name}' all models failed: {' | '.join(errors)}")
