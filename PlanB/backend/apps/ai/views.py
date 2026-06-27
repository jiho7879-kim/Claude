import json
import os
import re
import datetime

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.calendars.models import CalendarEvent
from apps.notes.models import Note
from apps.planner.models import DailyEntry, TimeBlock
from apps.projects.models import Project
from apps.tasks.models import Task
from apps.workspaces.models import Workspace


_GEMINI_MODELS = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-8b"]
_GROQ_MODELS = ["llama-3.3-70b-versatile", "llama3-8b-8192"]


def _try_gemini(prompt: str, system: str) -> tuple[str, str]:
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
            return response.text, model_name
        except Exception as e:
            last_exc = e
            if "429" not in str(e) and "404" not in str(e):
                raise
    raise last_exc


def _try_groq(prompt: str, system: str) -> tuple[str, str]:
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
                temperature=0.3,
                response_format={"type": "json_object"},
            )
            return resp.choices[0].message.content, model_name
        except Exception as e:
            last_exc = e
            err_str = str(e)
            if "429" not in err_str and "404" not in err_str and "model_not_found" not in err_str:
                raise
    raise last_exc


def _gemini(prompt: str, system: str = "") -> tuple[str, str]:
    """Returns (text, model_label). model_label e.g. 'Gemini 2.0 Flash' or 'Groq LLaMA 3.3'."""
    system_text = system or "당신은 친절한 프로젝트 관리 어시스턴트입니다. 항상 한국어로 답변하세요."
    errors = []
    try:
        text, model = _try_gemini(prompt, system_text)
        label = model.replace("gemini-", "Gemini ").replace("-", " ").title()
        return text, label
    except Exception as e:
        errors.append(f"Gemini: {str(e)[:80]}")
    try:
        text, model = _try_groq(prompt, system_text)
        label = "Groq " + model.split("-")[0].capitalize()
        return text, label
    except Exception as e:
        errors.append(f"Groq: {str(e)[:80]}")
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
    match = re.search(r'\{[\s\S]*\}', text)
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
    raw, _ = _gemini(text, system)
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
    raw, _ = _gemini(prompt, system)

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

    summary, _ = _gemini(prompt)
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

    lines.append("")
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

    return "\n".join(lines), projects


CHAT_SYSTEM = """당신은 PlanB 생산성 앱의 AI 비서입니다. 항상 한국어로 답변하세요.

## PlanB 앱 구조
PlanB는 다음 5가지 핵심 기능을 가진 프로젝트 관리 앱입니다:
1. **프로젝트/태스크**: 업무를 프로젝트 단위로 관리. 태스크에는 제목, 우선순위(urgent/high/medium/low), 마감일, 상태(todo/in_progress/done) 있음
2. **캘린더**: 일정(이벤트) 관리. 시작/종료 시각 있음
3. **플래너(일간)**: 오늘 할 일 목록(TimeBlock). 제목, 시간대, 카테고리(work/personal/health/learning/other) 있음
4. **플래너(주간)**: 주간 리뷰 및 습관 관리
5. **노트**: 자유형식 메모. Obsidian처럼 자유롭게 작성. 제목·내용·태그(#해시태그) 있음

## 사용자 발화 → 액션 매핑 (반드시 암기)
| 사용자가 이렇게 말하면 | 이 액션을 사용 |
|---|---|
| "플래너에 OOO 등록해줘" / "오늘 할 일에 OOO 추가" / "오늘 플래너에 OOO" | create_time_block |
| "캘린더에 OOO 일정 잡아줘" / "OOO 일정 등록해줘" / "OO월 OO일 OOO" | create_event |
| "OOO 프로젝트에 태스크 추가" / "OOO 업무 등록해줘" / "태스크 만들어줘" | create_task |
| "노트에 OOO 적어줘" / "메모해줘: OOO" / "OOO 노트 저장해줘" | create_note (내용 있는 경우) |
| "OOO 초안 작성해줘" / "OOO 노트 내용 써줘" / "OOO에 대해 정리해서 노트 만들어줘" / "OOO 노트 만들어줘" | create_note (AI가 내용 직접 작성) |
| "OOO 노트 정리해줘" / "OOO 노트 구조화해줘" / "OOO 노트 업데이트해줘" / "OOO 노트 수정해줘" | update_note |
| "OOO 노트 찾아줘" / "OOO 관련 노트 있어?" / "OOO 메모 뭐라고 했지?" | 노트 컨텍스트 검색 후 reply만 |
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

### create_note (노트 생성 - 내용 포함 필수)
{"type": "create_note", "title": "노트 제목", "content": "마크다운 형식의 상세한 노트 내용 (절대 비워두지 말 것)", "tags": ["태그1", "태그2"]}

### update_note (기존 노트 수정/정리)
{"type": "update_note", "note_id": "<UUID>", "title": "노트 제목", "content": "마크다운 형식으로 구조화된 전체 내용", "tags": ["태그1", "태그2"]}

## 노트 작성 규칙 (매우 중요)
- **"초안 작성", "노트 만들어줘", "내용 써줘", "정리해줘"** 등의 요청은 반드시 create_note 액션을 사용하고 content 필드를 실제 내용으로 채울 것
- content 필드는 절대 빈 문자열("")로 두지 말 것. 예: 제목이 "카레만들기"라면 카레 레시피 전체를 content에 작성
- 노트 content는 마크다운 형식으로 작성: 섹션 제목(##), 목록(-), 강조(**) 등 적극 활용
- 주제에 맞는 구체적이고 실용적인 내용을 충분히(최소 300자 이상) 작성할 것
- **"OOO 노트 정리해줘"** 요청 시: 컨텍스트 [노트] 섹션에서 해당 노트 ID를 찾아 update_note 사용
- update_note에서도 content는 반드시 구조화된 전체 내용으로 채울 것

## 날짜·시간 변환 규칙 (반드시 준수)
컨텍스트 첫 줄 "오늘 날짜: YYYY-MM-DD (Weekday)"를 기준으로 절대 날짜를 계산한다.

**요일 번호**: 월=1, 화=2, 수=3, 목=4, 금=5, 토=6, 일=7 (ISO 기준, 월요일 시작)

**날짜 표현 변환 예시** (오늘이 2026-06-27 Saturday 기준):
- "오늘" → 2026-06-27
- "내일" → 2026-06-28
- "이번주 월요일" → 2026-06-22 (이미 지난 경우 그냥 계산)
- "다음주 월요일" → 2026-06-29 (다음 주 첫 번째 날)
- "다음주 수요일" → 2026-07-01
- "다음주 금요일" → 2026-07-03
- 오늘이 토요일이면: 다음 월요일 = 오늘+2일, 다음 주 월요일 = 오늘+9일

**계산 방법**:
1. 오늘 요일의 ISO 번호 파악 (월=1…일=7)
2. "다음주 N요일": (7 - 오늘요일번호 + N요일번호) % 7 + 7 일 후 (최소 7일 후)
3. 단, "다음주 월요일" 표현은 한국에서 보통 "다음 주 첫 번째 월요일"을 의미
4. 오늘이 토요일(6)이면: 다음주 월요일(1) = 오늘 + (7-6+1) = 오늘 + 2일

**시간 표현**:
- "18시30분", "오후 6시 30분" → "18:30"
- "오전 9시" → "09:00"
- "정오" → "12:00"
- 종료 시간 명시 없으면: 시작 시간 + 1시간

## 일반 규칙
- actions가 없으면 반드시 []
- 프로젝트 언급 없이 태스크 추가 요청 시: 첫 번째 프로젝트 사용
- 시간 언급 없는 플래너 항목: start_time/end_time null
- 카테고리 추론: 업무/회의/개발 → work, 운동/건강 → health, 독서/공부 → learning, 개인 용무 → personal, 학습/연수/세미나 → learning
- 노트 검색: 컨텍스트의 [노트] 섹션에서 제목·내용 전체 탐색 후 관련 내용 인용해서 답변
- 조회 요청은 컨텍스트 데이터를 정확히 참조해서 답변 (없으면 "없다"고 정직하게)
- **응답은 반드시 유효한 JSON 하나만 출력. 추가 텍스트 절대 금지.**
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
        raw, model_label = _gemini(prompt, CHAT_SYSTEM)
    except ValueError as e:
        return Response({"reply": str(e), "actions": [], "model": None})
    except Exception as e:
        err = str(e)
        if "429" in err:
            return Response({"reply": "⚠️ Gemini API 무료 쿼터를 초과했습니다.\n\n**해결 방법:**\n1. aistudio.google.com → API 키 발급 (AI Studio 전용 키 사용)\n2. 또는 잠시 후 다시 시도해주세요 (분당 제한 초과 시 1분 대기)", "actions": [], "model": None})
        return Response({"reply": f"AI 오류: {err}", "actions": [], "model": None})

    # 견고한 JSON 파싱
    result = _extract_json(raw)
    if result and isinstance(result, dict):
        reply = result.get("reply", "")
        actions = result.get("actions", [])
        if not reply:
            reply = "완료했습니다."
    else:
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
        except Exception:
            pass

    return Response({"reply": reply, "actions": executed, "model": model_label})


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
        insight, _ = _gemini(prompt, system)
    except Exception as e:
        insight = None

    return Response({"insight": insight})


NOTE_AI_SYSTEMS = {
    "organize": (
        "당신은 노트 정리 전문가입니다. 입력된 노트 내용을 마크다운 형식으로 구조화하세요.\n"
        "## 섹션 제목, - 목록, **강조** 등을 활용해 읽기 좋게 정리하세요.\n"
        "정리된 내용만 출력하고 다른 설명은 하지 마세요."
    ),
    "expand": (
        "당신은 창의적인 글쓰기 보조입니다. 입력된 노트 내용을 기반으로 더 풍부하고 상세한 내용을 추가하세요.\n"
        "기존 내용을 유지하면서 추가 정보, 예시, 관련 내용을 덧붙여 확장하세요.\n"
        "마크다운 형식으로 작성하고 확장된 전체 내용만 출력하세요."
    ),
    "suggest_tags": (
        "당신은 태그 추천 전문가입니다. 노트 내용을 분석하여 적절한 태그를 추천하세요.\n"
        "JSON 배열 형식으로만 응답하세요: [\"태그1\", \"태그2\", \"태그3\"]\n"
        "태그는 짧고 명확하게, 최대 5개까지만 추천하세요."
    ),
}


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

    try:
        result, _ = _gemini(prompt, system)
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
