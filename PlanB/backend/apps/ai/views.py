import json
import os
import datetime

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.calendars.models import CalendarEvent
from apps.planner.models import DailyEntry, TimeBlock
from apps.projects.models import Project
from apps.tasks.models import Task
from apps.workspaces.models import Workspace


_GEMINI_MODELS = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-8b"]
_GROQ_MODELS = ["llama-3.3-70b-versatile", "llama3-8b-8192"]


def _try_gemini(prompt: str, system: str) -> str:
    api_key = os.environ.get("GEMINI_API_KEY", "")
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
    try:
        from groq import Groq
    except ImportError:
        raise RuntimeError("groq 패키지 미설치")
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
    today = datetime.date.today()
    lines = [f"오늘 날짜: {today.isoformat()} ({today.strftime('%A')})", ""]

    projects = list(Project.objects.filter(workspace=workspace).values("id", "name", "status"))
    lines.append(f"[프로젝트 목록] ({len(projects)}개)")
    for p in projects:
        lines.append(f"  - ID:{p['id']} 이름:{p['name']} 상태:{p['status']}")

    lines.append("")
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
    events = list(
        CalendarEvent.objects.filter(workspace=workspace, start_at__date__gte=today)
        .order_by("start_at")[:20]
        .values("id", "title", "start_at", "end_at")
    )
    lines.append(f"[예정 일정] ({len(events)}개)")
    for e in events:
        lines.append(f"  - ID:{e['id']} {e['title']} | {e['start_at'].strftime('%Y-%m-%d %H:%M')}~{e['end_at'].strftime('%H:%M')}")

    lines.append("")
    try:
        entry = DailyEntry.objects.get(user=user, workspace=workspace, date=today)
        blocks = list(entry.time_blocks.values("id", "title", "start_time", "end_time", "category", "is_done", "order"))
    except DailyEntry.DoesNotExist:
        blocks = []
    lines.append(f"[오늘 플래너 할일] ({len(blocks)}개) - 오늘 날짜:{today.isoformat()}")
    for b in blocks:
        done = "✓" if b["is_done"] else "○"
        time_str = f" {b['start_time']}~{b['end_time']}" if b["start_time"] else ""
        lines.append(f"  - ID:{b['id']} {done} {b['title']}{time_str} [{b['category']}]")

    return "\n".join(lines), projects


CHAT_SYSTEM = """당신은 PlanB 생산성 앱의 AI 비서입니다. 항상 한국어로 답변하세요.

## PlanB 앱 구조
PlanB는 다음 4가지 핵심 기능을 가진 프로젝트 관리 앱입니다:
1. **프로젝트/태스크**: 업무를 프로젝트 단위로 관리. 태스크에는 제목, 우선순위(urgent/high/medium/low), 마감일, 상태(todo/in_progress/done) 있음
2. **캘린더**: 일정(이벤트) 관리. 시작/종료 시각 있음
3. **플래너(일간)**: 오늘 할 일 목록(TimeBlock). 제목, 시간대, 카테고리(work/personal/health/learning/other) 있음
4. **플래너(주간)**: 주간 리뷰 및 습관 관리

## 사용자 발화 → 액션 매핑 (반드시 암기)
| 사용자가 이렇게 말하면 | 이 액션을 사용 |
|---|---|
| "플래너에 OOO 등록해줘" / "오늘 할 일에 OOO 추가" / "오늘 플래너에 OOO" / "일간 플래너에 OOO" | create_time_block |
| "캘린더에 OOO 일정 잡아줘" / "OOO 일정 등록해줘" / "OO월 OO일 OOO 일정" | create_event |
| "OOO 프로젝트에 태스크 추가" / "OOO 업무 등록해줘" / "태스크 만들어줘" | create_task |
| "OOO 언제 마감이야?" / "진행 중인 태스크 알려줘" / "OOO 일정 있어?" | 조회 후 reply만 |

## 응답 형식 (코드블록 없이 순수 JSON만)
{"reply": "자연스러운 한국어 답변", "actions": [...]}

## actions 스키마

### create_time_block (플래너 오늘 할 일)
{"type": "create_time_block", "title": "할 일 제목", "category": "work|personal|health|learning|other", "start_time": "HH:MM or null", "end_time": "HH:MM or null"}

### create_task (프로젝트 태스크)
{"type": "create_task", "project_id": <int>, "project_name": "프로젝트명", "title": "태스크 제목", "priority": "urgent|high|medium|low", "due_date": "YYYY-MM-DD or null"}

### create_event (캘린더 일정)
{"type": "create_event", "title": "일정 제목", "start_at": "YYYY-MM-DDTHH:MM:00", "end_at": "YYYY-MM-DDTHH:MM:00", "description": ""}

## 규칙
- actions가 없으면 반드시 []
- 프로젝트 언급 없이 태스크 추가 요청 시: 첫 번째 프로젝트 사용
- 시간 언급 없는 플래너 항목: start_time/end_time null
- "오늘", "지금", "내일" 등 상대적 날짜는 컨텍스트의 오늘 날짜 기준으로 계산
- 카테고리 추론: 업무/회의/개발 → work, 운동/건강 → health, 독서/공부 → learning, 개인 용무 → personal
- 조회 요청은 컨텍스트 데이터를 정확히 참조해서 답변 (없으면 "없다"고 정직하게)
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
