import json
import logging
import os
import re
import uuid
import datetime

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone

from .agents import execute_agent, route_request
from .prompts import CHAT_SYSTEM, NOTE_AI_SYSTEMS

logger = logging.getLogger("planb.ai")

from apps.calendars.models import CalendarEvent
from apps.notes.models import Note
from apps.planner.models import DailyEntry, TimeBlock
from apps.projects.models import Project
from apps.tasks.models import Task
from apps.workspaces.models import Workspace


# Priority: stable models first, preview models excluded for production reliability.
# gemini-3.5-flash: best balance (speed/cost/agentic) — primary
# gemini-3.1-flash-lite: ultra-fast cost-efficient stable fallback
# gemini-2.5-flash: previous-gen stable, last resort before Groq
_GEMINI_MODELS = [
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-2.5-flash",
]
def _try_gemini(prompt: str, system: str, require_json: bool = False) -> tuple[str, str]:
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    key_hint = (api_key[:6] + "..." + api_key[-4:]) if len(api_key) > 10 else "(short/empty)"
    logger.info("[GEMINI] API key hint: %s (len=%d) json=%s", key_hint, len(api_key), require_json)
    if not api_key:
        raise ValueError("GEMINI_API_KEY 없음")
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        raise RuntimeError("google-genai 패키지 미설치")
    client = genai.Client(api_key=api_key)
    last_exc = None
    for model_name in _GEMINI_MODELS:
        try:
            logger.info("[GEMINI] Trying model: %s", model_name)
            config = types.GenerateContentConfig(system_instruction=system)
            if require_json:
                config.response_mime_type = "application/json"
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=config,
            )
            logger.info("[GEMINI] Success with model: %s", model_name)
            return response.text, model_name
        except Exception as e:
            err_str = str(e)
            logger.warning("[GEMINI] Model %s failed: %s", model_name, err_str[:200])
            last_exc = e
            if "429" in err_str or "503" in err_str:
                # All Gemini models share the same quota/backend — no point trying others
                logger.warning("[GEMINI] 429/503 quota/exhaustion hit, skipping remaining Gemini models")
                break
            if "404" not in err_str:
                raise
    raise last_exc


def _try_deepseek(prompt: str, system: str, require_json: bool = False) -> tuple[str, str]:
    api_key = os.environ.get("DEEPSEEK_API_KEY", "").strip()
    logger.info("[DEEPSEEK] API key present: %s (len=%d)", bool(api_key), len(api_key))
    if not api_key:
        raise ValueError("DEEPSEEK_API_KEY 없음 — Render 환경변수에 등록 필요")
    try:
        from openai import OpenAI
    except ImportError:
        raise RuntimeError("openai 패키지 미설치 (pip install openai>=1.30.0)")
    client = OpenAI(api_key=api_key, base_url="https://api.deepseek.com")
    kwargs = {
        "model": "deepseek-v4-flash",
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.3,
    }
    if require_json:
        kwargs["response_format"] = {"type": "json_object"}
    try:
        logger.info("[DEEPSEEK] Calling deepseek-v4-flash (json=%s)", require_json)
        resp = client.chat.completions.create(**kwargs)
        logger.info("[DEEPSEEK] Success")
        return resp.choices[0].message.content, "deepseek-v4-flash"
    except Exception as e:
        err_str = str(e)
        logger.warning("[DEEPSEEK] Failed: %s", err_str[:200])
        if "402" in err_str or "Insufficient Balance" in err_str:
            raise RuntimeError(
                "DeepSeek API 요금이 부족합니다. https://platform.deepseek.com 에서 충전 후 "
                "DEEPSEEK_API_KEY를 확인하세요."
            ) from e
        if "429" in err_str:
            raise RuntimeError("DeepSeek API Rate Limit 초과. 잠시 후 다시 시도해주세요.") from e
        raise RuntimeError(f"DeepSeek API 오류: {err_str[:300]}") from e


def _try_groq(prompt: str, system: str, require_json: bool = False) -> tuple[str, str]:
    api_key = os.environ.get("GROQ_API_KEY", "").strip()
    logger.info("[GROQ] API key present: %s (len=%d)", bool(api_key), len(api_key))
    if not api_key:
        raise ValueError("GROQ_API_KEY 없음 — Render 환경변수에 등록 필요")
    try:
        from openai import OpenAI
    except ImportError:
        raise RuntimeError("openai 패키지 미설치 (pip install openai>=1.30.0)")
    client = OpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1")
    models = [
        "llama-4-scout-17b-16e-instruct",
        "llama-4-maverick-17b-128e-instruct",
    ]
    last_exc = None
    for model in models:
        try:
            kwargs = {
                "model": model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.3,
            }
            if require_json:
                kwargs["response_format"] = {"type": "json_object"}
            logger.info("[GROQ] Calling %s (json=%s)", model, require_json)
            resp = client.chat.completions.create(**kwargs)
            logger.info("[GROQ] Success with model: %s", model)
            return resp.choices[0].message.content, f"Groq {model}"
        except Exception as e:
            err_str = str(e)
            logger.warning("[GROQ] Model %s failed: %s", model, err_str[:200])
            last_exc = e
            if "429" in err_str:
                break
    raise last_exc or RuntimeError("Groq: no models available")


def _gemini(prompt: str, system: str = "", require_json: bool = False) -> tuple[str, str]:
    """Returns (text, model_label).

    AI 호출 체인: Gemini → DeepSeek → Groq (fallback)
    require_json=True 시 Gemini response_mime_type=application/json +
    DeepSeek/Groq response_format=json_object 적용.
    """
    system_text = system or "당신은 친절한 프로젝트 관리 어시스턴트입니다. 항상 한국어로 답변하세요."
    errors = []
    try:
        text, model = _try_gemini(prompt, system_text, require_json=require_json)
        label = model.replace("gemini-", "Gemini ").replace("-", " ").title()
        return text, label
    except Exception as e:
        errors.append(f"Gemini: {str(e)[:120]}")
        logger.warning("[AI] Gemini failed, falling back to DeepSeek. Error: %s", str(e)[:200])
    try:
        text, model = _try_deepseek(prompt, system_text, require_json=require_json)
        label = "DeepSeek V4 Flash"
        return text, label
    except Exception as e:
        errors.append(f"DeepSeek: {str(e)[:120]}")
        logger.warning("[AI] DeepSeek failed, falling back to Groq. Error: %s", str(e)[:200])
    try:
        text, model = _try_groq(prompt, system_text, require_json=require_json)
        label = f"Groq {model.split()[-1]}"
        return text, label
    except Exception as e:
        errors.append(f"Groq: {str(e)[:120]}")
        logger.error("[AI] All providers failed: %s", " | ".join(errors))
    raise RuntimeError(" | ".join(errors))


def _extract_json(raw: str) -> dict | None:
    """Robustly extract a JSON object from raw LLM output."""
    text = raw.strip()
    # Strip markdown code fences
    if text.startswith("```"):
        text = re.sub(r'^```(?:json)?\s*', '', text)
        text = re.sub(r'\s*```\s*$', '', text)
        text = text.strip()
    # Try direct parse
    try:
        return json.loads(text)
    except Exception:
        pass
    # Find the first complete {...} block
    match = re.search(r'\{[\s\S]*?\}', text)
    if match:
        try:
            return json.loads(match.group())
        except Exception:
            pass
    return None


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def nl_task(request, workspace_slug: str):
    text = request.data.get("text", "").strip()
    if not text:
        return Response({"error": "text is required"}, status=400)

    system = (
        "You are a project management assistant. Parse the user's natural language input "
        "into a structured task. Respond ONLY with valid JSON:\n"
        '{"title":"<title>","priority":"urgent|high|medium|low","due_date":"YYYY-MM-DD or null","notes":""}'
    )
    raw, _ = execute_agent("json", text, system)
    try:
        parsed = json.loads(raw)
    except Exception:
        parsed = {"title": text, "priority": "medium", "due_date": None, "notes": ""}

    return Response({"task": parsed})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def epic_breakdown(request, workspace_slug: str, project_id: str):
    title = request.data.get("title", "").strip()
    description = request.data.get("description", "").strip()
    if not title:
        return Response({"error": "title is required"}, status=400)

    system = (
        "You are an agile project management assistant. Break down the given epic into "
        "5-8 concrete, actionable tasks. Respond ONLY with valid JSON array:\n"
        '[{"title":"<task title>","priority":"urgent|high|medium|low","notes":""}]'
    )
    prompt = f"Epic: {title}\n{('Description: ' + description) if description else ''}"
    raw, _ = execute_agent("json", prompt, system)

    try:
        tasks = json.loads(raw)
        if not isinstance(tasks, list):
            raise ValueError
    except Exception:
        tasks = [
            {"title": f"{title} - 요구사항 분석", "priority": "high", "notes": ""},
            {"title": f"{title} - 설계", "priority": "high", "notes": ""},
            {"title": f"{title} - 구현", "priority": "medium", "notes": ""},
            {"title": f"{title} - 테스트", "priority": "medium", "notes": ""},
            {"title": f"{title} - 배포", "priority": "low", "notes": ""},
        ]

    return Response({"tasks": tasks})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def weekly_summary(request, workspace_slug: str):
    try:
        workspace = Workspace.objects.get(slug=workspace_slug)
    except Workspace.DoesNotExist:
        return Response({"error": "workspace not found"}, status=404)

    import datetime
    projects = Project.objects.filter(workspace=workspace)
    task_qs = Task.objects.filter(project__workspace=workspace)
    total = task_qs.count()
    done = task_qs.filter(status="done").count()
    in_progress = task_qs.filter(status="in_progress").count()
    overdue = task_qs.filter(
        status__in=["todo", "in_progress"],
        due_date__lt=datetime.date.today(),
    ).count()

    prompt = (
        f"워크스페이스: {workspace.name}\n"
        f"프로젝트 수: {projects.count()}, 전체 태스크: {total}, 완료: {done}, 진행 중: {in_progress}, 기한 초과: {overdue}\n"
        "3-4문장으로 동기부여가 되는 주간 요약을 한국어로 작성해주세요."
    )

    summary, _ = execute_agent("summary", prompt)
    if not summary:
        pct = round(done / total * 100) if total > 0 else 0
        summary = (
            f"이번 주 전체 {total}개 태스크 중 {done}개({pct}%)를 완료했습니다. "
            + (f"{in_progress}개가 진행 중" + (f"이며 {overdue}개가 기한을 초과했습니다." if overdue else "입니다."))
            + " 꾸준한 노력이 빛을 발하고 있어요! 🚀"
        )

    return Response({
        "summary": summary,
        "stats": {"total": total, "done": done, "in_progress": in_progress, "overdue": overdue},
    })


_INTENT_KEYWORDS = {
    "task": ["태스크", "작업", "업무", "할 일", "마감", "프로젝트", "진행", "todo", "task"],
    "planner": ["플래너", "오늘", "일간", "루틴", "습관", "타임블록", "timeblock"],
    "calendar": ["캘린더", "일정", "이벤트", "약속", "미팅", "회의", "schedule", "event"],
    "note": ["노트", "메모", "노트정리", "기록", "문서", "초안", "note", "memo"],
}


def _detect_intent(message: str) -> set:
    """Classify user message into one or more intents based on keywords."""
    msg = message.lower()
    matched = set()
    for intent, keywords in _INTENT_KEYWORDS.items():
        if any(kw in msg for kw in keywords):
            matched.add(intent)
    return matched or {"general"}


_CONTEXT_SECTIONS = {
    "projects": "projects",
    "tasks": "tasks",
    "calendar": "calendar",
    "planner": "planner",
    "notes": "notes",
}

_INTENT_SECTIONS = {
    "task": ["projects", "tasks"],
    "planner": ["planner"],
    "calendar": ["calendar"],
    "note": ["notes"],
    "general": ["projects", "tasks", "calendar", "planner", "notes"],
}


def _build_workspace_context(workspace, user, message=""):
    """Build context based on detected intent to reduce token usage."""
    today = datetime.date.today()
    intents = _detect_intent(message) if message else {"general"}
    sections = set()
    for intent in intents:
        sections.update(_INTENT_SECTIONS.get(intent, ["general"]))
    lines = [f"오늘 날짜: {today.isoformat()} ({today.strftime('%A')})", ""]

    if "projects" in sections:
        projects = list(Project.objects.filter(workspace=workspace).values("id", "name", "status"))
        lines.append(f"[프로젝트 목록] ({len(projects)}개)")
        for p in projects:
            lines.append(f"  - ID:{p['id']} 이름:{p['name']} 상태:{p['status']}")
        lines.append("")
    else:
        projects = []

    if "tasks" in sections:
        tasks = list(
            Task.objects.filter(project__workspace=workspace)
            .exclude(status="done")
            .order_by("due_date")[:60]
            .values("id", "title", "status", "priority", "due_date", "project__id", "project__name")
        )
        lines.append(f"[진행 중인 태스크] ({len(tasks)}개)")
        for t in tasks:
            due = t["due_date"] or "미정"
            flag = " ⚠️마감초과" if t["due_date"] and t["due_date"] < today else ""
            lines.append(f"  - ID:{t['id']} [{t['project__name']}] {t['title']} | {t['status']} | 우선순위:{t['priority']} | 마감:{due}{flag}")
        lines.append("")

    if "calendar" in sections:
        events = list(
            CalendarEvent.objects.filter(workspace=workspace, start_at__date__gte=today)
            .order_by("start_at")[:20]
            .values("id", "title", "start_at", "end_at")
        )
        lines.append(f"[예정 일정] ({len(events)}개)")
        for e in events:
            lines.append(f"  - ID:{e['id']} {e['title']} | {e['start_at'].strftime('%Y-%m-%d %H:%M')}~{e['end_at'].strftime('%H:%M')}")
        lines.append("")

    if "planner" in sections:
        blocks = list(
            TimeBlock.objects.filter(
                daily_entry__user=user,
                daily_entry__workspace=workspace,
                daily_entry__date=today,
            ).values("id", "title", "start_time", "end_time", "category", "is_done", "order")
        )
        lines.append(f"[오늘 플래너 할일] ({len(blocks)}개) - 오늘 날짜:{today.isoformat()}")
        for b in blocks:
            done = "✓" if b["is_done"] else "○"
            time_str = f" {b['start_time']}~{b['end_time']}" if b["start_time"] else ""
            lines.append(f"  - ID:{b['id']} {done} {b['title']}{time_str} [{b['category']}]")
        lines.append("")

    if "notes" in sections:
        notes = list(
            Note.objects.filter(workspace=workspace, user=user)
            .order_by("-updated_at")[:30]
            .values("id", "title", "content", "tags", "updated_at")
        )
        lines.append(f"[노트] ({len(notes)}개)")
        for n in notes:
            preview = n["content"][:120].replace("\n", " ")
            tags_str = " ".join(f"#{t}" for t in (n["tags"] or []))
            lines.append(f"  - ID:{n['id']} 제목:{n['title'] or '제목없음'} | {preview}{(' ' + tags_str) if tags_str else ''}")
        lines.append("")

    return "\n".join(lines).strip(), projects


# CHAT_SYSTEM and NOTE_AI_SYSTEMS moved to prompts.py


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def chat(request, workspace_slug: str):
    req_id = str(uuid.uuid4())[:8]
    message = request.data.get("message", "").strip()
    history = request.data.get("history", [])
    if not message:
        return Response({"error": "message is required"}, status=400)

    logger.info("[CHAT:%s] user=%s slug=%s msg=%r", req_id, request.user, workspace_slug, message[:80])

    try:
        workspace = Workspace.objects.get(slug=workspace_slug, members__user=request.user)
    except Workspace.DoesNotExist:
        return Response({"error": "workspace not found"}, status=404)

    context_text, projects = _build_workspace_context(workspace, request.user, message)

    history_text = ""
    for h in history[-6:]:
        role = "사용자" if h.get("role") == "user" else "비서"
        history_text += f"{role}: {h.get('content', '')}\n"

    prompt = f"""=== 워크스페이스 데이터 ===
{context_text}

=== 대화 히스토리 ===
{history_text}
=== 현재 질문 ===
사용자: {message}"""

    try:
        agent = route_request(message)
        raw, model_label = execute_agent(agent, prompt, CHAT_SYSTEM)
        logger.info("[CHAT:%s] agent=%s model=%s raw_len=%d", req_id, agent, model_label, len(raw))
    except ValueError as e:
        logger.error("[CHAT:%s] ValueError: %s", req_id, e)
        return Response({"reply": str(e), "actions": [], "model": None})
    except Exception as e:
        err = str(e)
        logger.error("[CHAT:%s] AI error: %s", req_id, err[:300])
        if "429" in err:
            return Response({"reply": "⚠️ AI 서비스 할당량이 초과되었습니다. 잠시 후 다시 시도해주세요.", "actions": [], "model": None})
        if "503" in err:
            return Response({"reply": "⚠️ AI 서비스가 현재 혼잡합니다. 잠시 후 다시 시도해주세요.", "actions": [], "model": None})
        if "요금이 부족" in err:
            return Response({"reply": f"⚠️ {err}", "actions": [], "model": None})
        if "Rate Limit" in err:
            return Response({"reply": f"⚠️ {err}", "actions": [], "model": None})
        return Response({"reply": f"AI 오류: {err}", "actions": [], "model": None})

    # 견고한 JSON 파싱
    result = _extract_json(raw)
    logger.info("[CHAT:%s] parsed_ok=%s", req_id, result is not None)
    if result and isinstance(result, dict):
        reply = result.get("reply", "")
        actions = result.get("actions", [])
        logger.info("[CHAT:%s] actions_from_ai=%s", req_id, [a.get("type") for a in actions])
        if not reply:
            reply = "완료했습니다."
    else:
        logger.warning("[CHAT:%s] JSON parse failed, raw=%r", req_id, raw[:300])
        reply = raw or "죄송합니다, 응답을 처리하는 중 오류가 발생했습니다."
        actions = []

    # 액션 실행
    executed = []
    for action in actions:
        logger.info("[CHAT:%s] executing action type=%s", req_id, action.get("type"))
        try:
            if action.get("type") == "create_task":
                project = Project.objects.get(id=action["project_id"], workspace=workspace)
                task = Task.objects.create(
                    project=project,
                    title=action.get("title", "새 태스크"),
                    priority=action.get("priority", "medium"),
                    due_date=action.get("due_date") or None,
                    created_by=request.user,
                    status="todo",
                )
                executed.append({
                    "type": "create_task",
                    "label": f"태스크 생성됨: [{project.name}] {task.title}",
                    "id": task.id,
                    "project_id": project.id,
                })
            elif action.get("type") == "create_note":
                note = Note.objects.create(
                    workspace=workspace,
                    user=request.user,
                    title=action.get("title", ""),
                    content=action.get("content", ""),
                    tags=action.get("tags", []),
                )
                executed.append({
                    "type": "create_note",
                    "label": f"노트 저장됨: {note.title or '제목 없음'}",
                    "id": str(note.id),
                })
            elif action.get("type") == "create_time_block":
                entry, _ = DailyEntry.objects.get_or_create(
                    user=request.user, workspace=workspace, date=datetime.date.today()
                )
                last_order = entry.time_blocks.count()
                block = TimeBlock.objects.create(
                    daily_entry=entry,
                    title=action.get("title", "새 할 일"),
                    category=action.get("category", "work"),
                    start_time=action.get("start_time") or None,
                    end_time=action.get("end_time") or None,
                    order=last_order,
                )
                executed.append({
                    "type": "create_time_block",
                    "label": f"플래너 등록됨: {block.title}",
                    "id": str(block.id),
                })
            elif action.get("type") == "create_event":
                def _parse_dt(val):
                    if isinstance(val, datetime.datetime):
                        dt = val
                    else:
                        dt = datetime.datetime.fromisoformat(str(val))
                    return dt if timezone.is_aware(dt) else timezone.make_aware(dt)
                event = CalendarEvent.objects.create(
                    workspace=workspace,
                    title=action.get("title", "새 일정"),
                    start_at=_parse_dt(action.get("start_at")),
                    end_at=_parse_dt(action.get("end_at")),
                    description=action.get("description", ""),
                    created_by=request.user,
                )
                executed.append({
                    "type": "create_event",
                    "label": f"일정 등록됨: {event.title} ({event.start_at.strftime('%m/%d %H:%M')})",
                    "id": event.id,
                })
            elif action.get("type") == "update_note":
                try:
                    note = Note.objects.get(
                        id=action["note_id"], workspace=workspace, user=request.user
                    )
                    if action.get("title"):
                        note.title = action["title"]
                    if action.get("content"):
                        note.content = action["content"]
                    if action.get("tags") is not None:
                        note.tags = action["tags"]
                    note.save()
                    executed.append({
                        "type": "update_note",
                        "label": f"노트 수정됨: {note.title or '제목 없음'}",
                        "id": str(note.id),
                    })
                except Note.DoesNotExist:
                    pass
        except Exception as exc:
            logger.warning("[CHAT:%s] action %s failed: %s", req_id, action.get("type"), exc)

    logger.info("[CHAT:%s] executed=%s model=%s", req_id, [a.get("type") for a in executed], model_label)
    return Response({"reply": reply, "actions": executed, "model": model_label, "req_id": req_id})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def daily_insight(request, workspace_slug: str):
    try:
        workspace = Workspace.objects.get(slug=workspace_slug, members__user=request.user)
    except Workspace.DoesNotExist:
        return Response({"error": "workspace not found"}, status=404)

    context_text, _ = _build_workspace_context(workspace, request.user)

    system = (
        "당신은 생산성 코치입니다. 워크스페이스 데이터를 분석하여 오늘의 핵심 인사이트 3가지를 작성하세요.\n"
        "각 인사이트는 한 줄씩, 이모지로 시작하세요. 예:\n"
        "🚨 마감 임박: ...\n"
        "💡 추천: ...\n"
        "📈 현황: ...\n"
        "JSON 없이 순수 텍스트로 3줄만 출력하세요."
    )
    prompt = f"=== 워크스페이스 현황 ===\n{context_text}\n\n오늘의 인사이트 3가지를 작성하세요."

    try:
        insight, _ = execute_agent("summary", prompt, system)
    except Exception as e:
        insight = None

    return Response({"insight": insight})


# NOTE_AI_SYSTEMS imported from prompts.py


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def note_ai_action(request, workspace_slug, note_id):
    try:
        workspace = Workspace.objects.get(slug=workspace_slug, members__user=request.user)
    except Workspace.DoesNotExist:
        return Response({"error": "workspace not found"}, status=404)

    try:
        note = Note.objects.get(id=note_id, workspace=workspace, user=request.user)
    except Note.DoesNotExist:
        return Response({"error": "note not found"}, status=404)

    action = request.data.get("action", "organize")
    system = NOTE_AI_SYSTEMS.get(action, NOTE_AI_SYSTEMS["organize"])
    prompt = f"제목: {note.title or '제목 없음'}\n\n내용:\n{note.content or '(내용 없음)'}"
    agent = "classify" if action == "suggest_tags" else "creative"

    try:
        result, _ = execute_agent(agent, prompt, system)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

    if action == "suggest_tags":
        try:
            clean = result.strip()
            if clean.startswith("```"):
                clean = clean.split("```")[1]
                if clean.startswith("json"):
                    clean = clean[4:]
            tags = json.loads(clean.strip())
            if not isinstance(tags, list):
                raise ValueError
        except Exception:
            tags = []
        return Response({"tags": tags})

    return Response({"content": result})
