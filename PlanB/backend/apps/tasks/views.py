from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.projects.models import Project

from . import analytics as analytics_module
from .models import ActivityLog, ChecklistItem, Sprint, Task, TaskRelation, TimeEntry
from .serializers import (
    ActivityLogSerializer,
    ChecklistItemCreateSerializer,
    ChecklistItemSerializer,
    SprintCreateSerializer,
    SprintSerializer,
    TaskCommentSerializer,
    TaskCreateSerializer,
    TaskRelationCreateSerializer,
    TaskRelationSerializer,
    TaskSerializer,
    TaskTreeSerializer,
    TimeEntrySerializer,
)


def _log(task, actor, action, detail=None):
    ActivityLog.objects.create(task=task, actor=actor, action=action, detail=detail or {})


# ── Sprint ──────────────────────────────────────────────────────────────────


class SprintListCreateView(APIView):
    def _project(self, slug, pid, user):
        return get_object_or_404(Project, id=pid, workspace__slug=slug, members__user=user)

    def get(self, request, workspace_slug, project_id):
        project = self._project(workspace_slug, project_id, request.user)
        return Response(SprintSerializer(project.sprints.all(), many=True).data)

    def post(self, request, workspace_slug, project_id):
        project = self._project(workspace_slug, project_id, request.user)
        s = SprintCreateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        sprint = s.save(project=project)
        return Response(SprintSerializer(sprint).data, status=status.HTTP_201_CREATED)


class SprintDetailView(APIView):
    def _sprint(self, slug, pid, sid, user):
        return get_object_or_404(
            Sprint,
            id=sid,
            project__id=pid,
            project__workspace__slug=slug,
            project__members__user=user,
        )

    def patch(self, request, workspace_slug, project_id, sprint_id):
        sprint = self._sprint(workspace_slug, project_id, sprint_id, request.user)
        s = SprintCreateSerializer(sprint, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        return Response(SprintSerializer(sprint).data)

    def delete(self, request, workspace_slug, project_id, sprint_id):
        sprint = self._sprint(workspace_slug, project_id, sprint_id, request.user)
        sprint.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SprintStatsView(APIView):
    def get(self, request, workspace_slug, project_id, sprint_id):
        sprint = get_object_or_404(
            Sprint,
            id=sprint_id,
            project__id=project_id,
            project__workspace__slug=workspace_slug,
            project__members__user=request.user,
        )
        tasks = sprint.tasks.all()
        total = tasks.count()
        done = tasks.filter(status="done").count()
        remaining = total - done
        return Response(
            {
                "total": total,
                "done": done,
                "remaining": remaining,
                "percentage": round(done / total * 100) if total else 0,
            }
        )


# ── Task ─────────────────────────────────────────────────────────────────────


class TaskPagination(PageNumberPagination):
    page_size = 100
    page_size_query_param = "page_size"
    max_page_size = 500


class TaskListCreateView(APIView):
    def _project(self, slug, pid, user):
        return get_object_or_404(Project, id=pid, workspace__slug=slug, members__user=user)

    def _task_qs(self, request, workspace_slug, project_id):
        project = self._project(workspace_slug, project_id, request.user)
        qs = project.tasks.select_related("assignee", "created_by", "sprint").prefetch_related(
            "attachments"
        )
        q = request.query_params
        if q.get("status"):
            qs = qs.filter(status__in=q["status"].split(","))
        if q.get("priority"):
            qs = qs.filter(priority__in=q["priority"].split(","))
        if q.get("assignee"):
            qs = qs.filter(assignee__id=q["assignee"])
        if q.get("sprint"):
            qs = qs.filter(sprint__id=q["sprint"])
        if q.get("search"):
            qs = qs.filter(title__icontains=q["search"])
        return qs

    def get(self, request, workspace_slug, project_id):
        qs = self._task_qs(request, workspace_slug, project_id)
        q = request.query_params
        if q.get("tree", "false").lower() == "true":
            roots = qs.filter(parent__isnull=True).prefetch_related("children__children")
            return Response(TaskTreeSerializer(roots, many=True).data)
        paginator = TaskPagination()
        page = paginator.paginate_queryset(qs, request)
        if page is not None:
            return paginator.get_paginated_response(TaskSerializer(page, many=True).data)
        return Response(TaskSerializer(qs, many=True).data)

    def post(self, request, workspace_slug, project_id):
        project = self._project(workspace_slug, project_id, request.user)
        s = TaskCreateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        task = s.save(project=project, created_by=request.user)
        _log(task, request.user, "created", {"title": task.title})
        return Response(TaskSerializer(task).data, status=status.HTTP_201_CREATED)


class TaskDetailView(APIView):
    def _task(self, slug, pid, tid, user):
        return get_object_or_404(
            Task.objects.prefetch_related("attachments"),
            id=tid,
            project__id=pid,
            project__workspace__slug=slug,
            project__members__user=user,
        )

    def get(self, request, workspace_slug, project_id, task_id):
        return Response(
            TaskSerializer(self._task(workspace_slug, project_id, task_id, request.user)).data
        )

    def patch(self, request, workspace_slug, project_id, task_id):
        task = self._task(workspace_slug, project_id, task_id, request.user)
        old_status = task.status
        s = TaskCreateSerializer(task, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        task.refresh_from_db()
        if "status" in request.data and request.data["status"] != old_status:
            _log(task, request.user, "status_changed", {"from": old_status, "to": task.status})
        return Response(TaskSerializer(task).data)

    def delete(self, request, workspace_slug, project_id, task_id):
        task = self._task(workspace_slug, project_id, task_id, request.user)
        task.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Comments & Activity ───────────────────────────────────────────────────────


class TaskCommentListCreateView(APIView):
    def _task(self, slug, pid, tid, user):
        return get_object_or_404(
            Task,
            id=tid,
            project__id=pid,
            project__workspace__slug=slug,
            project__members__user=user,
        )

    def get(self, request, workspace_slug, project_id, task_id):
        task = self._task(workspace_slug, project_id, task_id, request.user)
        return Response(
            TaskCommentSerializer(task.comments.select_related("author"), many=True).data
        )

    def post(self, request, workspace_slug, project_id, task_id):
        task = self._task(workspace_slug, project_id, task_id, request.user)
        s = TaskCommentSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        comment = s.save(task=task, author=request.user)
        _log(task, request.user, "comment_added", {"content": comment.content[:80]})
        return Response(TaskCommentSerializer(comment).data, status=status.HTTP_201_CREATED)


class TaskActivityView(APIView):
    def get(self, request, workspace_slug, project_id, task_id):
        task = get_object_or_404(
            Task,
            id=task_id,
            project__id=project_id,
            project__workspace__slug=workspace_slug,
            project__members__user=request.user,
        )
        return Response(
            ActivityLogSerializer(task.activity.select_related("actor")[:30], many=True).data
        )


# ── Checklist ─────────────────────────────────────────────────────────────────


class ChecklistListCreateView(APIView):
    def _task(self, slug, pid, tid, user):
        return get_object_or_404(
            Task,
            id=tid,
            project__id=pid,
            project__workspace__slug=slug,
            project__members__user=user,
        )

    def get(self, request, workspace_slug, project_id, task_id):
        task = self._task(workspace_slug, project_id, task_id, request.user)
        return Response(ChecklistItemSerializer(task.checklist_items.all(), many=True).data)

    def post(self, request, workspace_slug, project_id, task_id):
        task = self._task(workspace_slug, project_id, task_id, request.user)
        s = ChecklistItemCreateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        item = s.save(task=task)
        return Response(ChecklistItemSerializer(item).data, status=status.HTTP_201_CREATED)


class ChecklistItemDetailView(APIView):
    def _item(self, slug, pid, tid, iid, user):
        return get_object_or_404(
            ChecklistItem,
            id=iid,
            task__id=tid,
            task__project__id=pid,
            task__project__workspace__slug=slug,
            task__project__members__user=user,
        )

    def patch(self, request, workspace_slug, project_id, task_id, item_id):
        item = self._item(workspace_slug, project_id, task_id, item_id, request.user)
        s = ChecklistItemSerializer(item, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        return Response(ChecklistItemSerializer(item).data)

    def delete(self, request, workspace_slug, project_id, task_id, item_id):
        item = self._item(workspace_slug, project_id, task_id, item_id, request.user)
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Task Relations ─────────────────────────────────────────────────────────────


class TaskRelationListCreateView(APIView):
    def _task(self, slug, pid, tid, user):
        return get_object_or_404(
            Task,
            id=tid,
            project__id=pid,
            project__workspace__slug=slug,
            project__members__user=user,
        )

    def get(self, request, workspace_slug, project_id, task_id):
        task = self._task(workspace_slug, project_id, task_id, request.user)
        qs = list(task.relations_from.select_related("from_task", "to_task")) + list(
            task.relations_to.select_related("from_task", "to_task")
        )
        return Response(TaskRelationSerializer(qs, many=True).data)

    def post(self, request, workspace_slug, project_id, task_id):
        from_task = self._task(workspace_slug, project_id, task_id, request.user)
        s = TaskRelationCreateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        relation = s.save(from_task=from_task)
        return Response(TaskRelationSerializer(relation).data, status=status.HTTP_201_CREATED)


class TaskRelationDeleteView(APIView):
    def delete(self, request, workspace_slug, project_id, task_id, relation_id):
        relation = get_object_or_404(
            TaskRelation,
            id=relation_id,
            from_task__project__workspace__slug=workspace_slug,
            from_task__project__members__user=request.user,
        )
        relation.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Time Entries ──────────────────────────────────────────────────────────────


class TimeEntryListCreateView(APIView):
    def _task(self, slug, pid, tid, user):
        return get_object_or_404(
            Task,
            id=tid,
            project__id=pid,
            project__workspace__slug=slug,
            project__members__user=user,
        )

    def get(self, request, workspace_slug, project_id, task_id):
        task = self._task(workspace_slug, project_id, task_id, request.user)
        qs = task.time_entries.select_related("user")
        return Response(TimeEntrySerializer(qs, many=True).data)

    def post(self, request, workspace_slug, project_id, task_id):
        task = self._task(workspace_slug, project_id, task_id, request.user)
        s = TimeEntrySerializer(data=request.data)
        s.is_valid(raise_exception=True)
        entry = s.save(task=task, user=request.user)
        return Response(TimeEntrySerializer(entry).data, status=status.HTTP_201_CREATED)


class TimeEntryDetailView(APIView):
    def delete(self, request, workspace_slug, project_id, task_id, entry_id):
        entry = get_object_or_404(
            TimeEntry,
            id=entry_id,
            task__id=task_id,
            task__project__id=project_id,
            task__project__workspace__slug=workspace_slug,
            user=request.user,
        )
        entry.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Analytics ──────────────────────────────────────────────────────────────────


class AnalyticsView(APIView):
    def get(self, request, workspace_slug, project_id):
        get_object_or_404(
            Project, id=project_id, workspace__slug=workspace_slug, members__user=request.user
        )
        pid = str(project_id)
        return Response(
            {
                "summary": analytics_module.summary(pid),
                "burnup": analytics_module.burnup(pid),
                "velocity": analytics_module.velocity(pid),
                "lead_time": analytics_module.lead_time(pid),
                "throughput": analytics_module.throughput(pid),
            }
        )
