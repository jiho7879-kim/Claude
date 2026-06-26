import json
import os
import datetime

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.calendars.models import CalendarEvent
from apps.projects.models import Project
from apps.tasks.models import Task
from apps.workspaces.models import Workspace


_GEMINI_MODELS = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-8b"]
_GROQ_MODELS = ["llama-3.3-70b-versatile", "llama3-8b-8192"]


def _try_gemini(prompt: str, system: str) -> str:
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        raise ValueError("GEMINI_API_KEY 없음")
    from google import genai
    from google.genai import types
    client = genai.Client(api_key=api_key)
    last_exc = None
    for model_name in _GEMINI_MODELS:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(system_instruction=system),
            )
            return response.text
        except Exception as e:
            last_exc = e
            if "429" not in str(e) and "404" not in str(e):
                raise
    raise last_exc


def _try_groq(prompt: str, system: str) -> str:
    api_key = os.environ.get("GROQ_API_KEY", "")
    if not api_key:
        raise ValueError("GROQ_API_KEY 없음")
    from groq import Groq
    client = Groq(api_key=api_key)
    last_exc = None
    for model_name in _GROQ_MODELS:
        try:
            resp = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.7,
            )
            return resp.choices[0].message.content
        except Exception as e:
            last_exc = e
            if "429" not in str(e) and "404" not in str(e) and "model_not_found" not in str(e):
                raise
    raise last_exc


def _gemini(prompt: str, system: str = "") -> str:
    system_text = system or "당신은 친절한 프로젝트 관리 어시스턴트입니다. 항상 한국어로 답변하세요."
    errors = []
    # 1순위: Gemini
    try:
        return _try_gemini(prompt, system_text)
    except Exception as e:
        errors.append(f"Gemini: {str(e)[:80]}")
    # 2순위: Groq (자동 전환)
    try:
        return _try_groq(prompt, system_text)
    except Exception as e:
        errors.append(f"Groq: {str(e)[:80]}")
    raise RuntimeError(" | ".join(errors))


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
    raw = _gemini(text, system)
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
    raw = _gemini(prompt, system)

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

    summary = _gemini(prompt)
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


def _build_workspace_context(workspace, user):
    """사용자의 프로젝트·태스크·일정을 텍스트 컨텍스트로 변환"""
    today = datetime.date.today()
    lines = [f"오늘 날짜: {today.isoformat()}", ""]

    projects = list(Project.objects.filter(workspace=workspace).values("id", "name", "status", "description"))
    lines.append(f"[프로젝트 목록] ({len(projects)}개)")
    for p in projects:
        lines.append(f"  - ID:{p['id']} 이름:{p['name']} 상태:{p['status']}")

    lines.append("")
    tasks = list(
        Task.objects.filter(project__workspace=workspace)
        .exclude(status="done")
        .select_related("project", "assignee")
        .order_by("due_date")[:60]
        .values("id", "title", "status", "priority", "due_date", "project__id", "project__name", "assignee__username")
    )
    lines.append(f"[진행 중인 태스크] ({len(tasks)}개, 완료 제외)")
    for t in tasks:
        due = t["due_date"] or "미정"
        overdue = " ⚠️초과" if t["due_date"] and t["due_date"] < today else ""
        lines.append(
            f"  - ID:{t['id']} [{t['project__name']}] {t['title']} | 상태:{t['status']} 우선순위:{t['priority']} 마감:{due}{overdue}"
        )

    lines.append("")
    events = list(
        CalendarEvent.objects.filter(workspace=workspace, start_at__date__gte=today)
        .order_by("start_at")[:20]
        .values("id", "title", "start_at", "end_at", "description")
    )
    lines.append(f"[예정된 일정] ({len(events)}개)")
    for e in events:
        lines.append(f"  - ID:{e['id']} {e['title']} | {e['start_at'].strftime('%Y-%m-%d %H:%M')} ~ {e['end_at'].strftime('%H:%M')}")

    return "\n".join(lines), projects


CHAT_SYSTEM = """당신은 PlanB 프로젝트 관리 AI 비서입니다. 한국어로 답변하세요.

사용자의 질문에 답하거나 요청한 작업을 수행할 수 있습니다.
- 태스크/일정 조회: 컨텍스트 데이터를 기반으로 정확하게 답변
- 태스크 생성: 사용자가 특정 프로젝트에 태스크를 추가하라고 하면 actions에 포함
- 일정 생성: 사용자가 일정을 등록하라고 하면 actions에 포함

반드시 다음 JSON 형식으로만 응답하세요 (마크다운 코드블록 없이):
{
  "reply": "사용자에게 보여줄 자연스러운 답변 텍스트",
  "actions": [
    {
      "type": "create_task",
      "project_id": <int>,
      "project_name": "<프로젝트 이름>",
      "title": "<태스크 제목>",
      "priority": "urgent|high|medium|low",
      "due_date": "YYYY-MM-DD or null"
    },
    {
      "type": "create_event",
      "title": "<일정 제목>",
      "start_at": "YYYY-MM-DDTHH:MM:00",
      "end_at": "YYYY-MM-DDTHH:MM:00",
      "description": ""
    }
  ]
}

actions가 없으면 빈 배열 []로 설정하세요.
태스크 생성 시 project_id는 컨텍스트에 있는 ID를 사용하세요.
날짜·시간을 모르면 합리적으로 추정하세요(오늘 기준 +1일, 1시간 단위).
"""


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def chat(request, workspace_slug: str):
    message = request.data.get("message", "").strip()
    history = request.data.get("history", [])  # [{role, content}]
    if not message:
        return Response({"error": "message is required"}, status=400)

    try:
        workspace = Workspace.objects.get(slug=workspace_slug, members__user=request.user)
    except Workspace.DoesNotExist:
        return Response({"error": "workspace not found"}, status=404)

    context_text, projects = _build_workspace_context(workspace, request.user)

    # 대화 히스토리 포맷
    history_text = ""
    for h in history[-6:]:  # 최근 6턴만 포함
        role = "사용자" if h.get("role") == "user" else "비서"
        history_text += f"{role}: {h.get('content', '')}\n"

    prompt = f"""=== 워크스페이스 데이터 ===
{context_text}

=== 대화 히스토리 ===
{history_text}
=== 현재 질문 ===
사용자: {message}"""

    try:
        raw = _gemini(prompt, CHAT_SYSTEM)
    except ValueError as e:
        return Response({"reply": str(e), "actions": []})
    except Exception as e:
        err = str(e)
        if "429" in err:
            return Response({"reply": "⚠️ Gemini API 무료 쿼터를 초과했습니다.\n\n**해결 방법:**\n1. aistudio.google.com → API 키 발급 (AI Studio 전용 키 사용)\n2. 또는 잠시 후 다시 시도해주세요 (분당 제한 초과 시 1분 대기)", "actions": []})
        return Response({"reply": f"Gemini API 오류: {err}", "actions": []})

    # JSON 파싱 시도
    try:
        # 코드블록 제거
        clean = raw.strip()
        if clean.startswith("```"):
            clean = clean.split("```")[1]
            if clean.startswith("json"):
                clean = clean[4:]
        result = json.loads(clean.strip())
        reply = result.get("reply", raw)
        actions = result.get("actions", [])
    except Exception:
        reply = raw or "죄송합니다, 응답을 처리하는 중 오류가 발생했습니다."
        actions = []

    # 액션 실행
    executed = []
    for action in actions:
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
            elif action.get("type") == "create_event":
                event = CalendarEvent.objects.create(
                    workspace=workspace,
                    title=action.get("title", "새 일정"),
                    start_at=action.get("start_at"),
                    end_at=action.get("end_at"),
                    description=action.get("description", ""),
                    created_by=request.user,
                )
                executed.append({
                    "type": "create_event",
                    "label": f"일정 등록됨: {event.title} ({event.start_at.strftime('%m/%d %H:%M')})",
                    "id": event.id,
                })
        except Exception:
            pass

    return Response({"reply": reply, "actions": executed})
