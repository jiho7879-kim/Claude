import json
import os

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.projects.models import Project
from apps.tasks.models import Task
from apps.workspaces.models import Workspace


def _gemini(prompt: str, system: str = "") -> str:
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        return ""
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            system_instruction=system or "당신은 친절한 프로젝트 관리 어시스턴트입니다. 항상 한국어로 답변하세요.",
        )
        response = model.generate_content(prompt)
        return response.text
    except Exception:
        return ""


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
