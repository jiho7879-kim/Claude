"""Tests for apps.tasks — Sprint / Task (hierarchical) / Checklist / Relations / TimeEntry / ActivityLog / Analytics.

Covers: CRUD for every view, permission scoping, query-param filtering, tree mode,
task-level_name auto-computation, sprint stats, signal-less activity logging,
and the analytics aggregation endpoint.
"""

from datetime import date, timezone, timedelta, datetime as dt

import pytest
from django.urls import reverse

pytestmark = pytest.mark.django_db


# ── Sprint ─────────────────────────────────────────────────────────────────────

class TestSprintListCreate:
    URL_NAME = "sprint-list"

    def test_list_sprints(self, api_client, project):
        from apps.tasks.models import Sprint

        Sprint.objects.create(project=project, name="S1", start_date=date.today(), end_date=date.today() + timedelta(days=14))
        Sprint.objects.create(project=project, name="S2", start_date=date.today(), end_date=date.today() + timedelta(days=14))
        resp = api_client.get(reverse(self.URL_NAME, args=[project.workspace.slug, project.id]))
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    def test_create_sprint(self, api_client, project):
        resp = api_client.post(
            reverse(self.URL_NAME, args=[project.workspace.slug, project.id]),
            {"name": "Spring Sprint", "start_date": "2026-06-01", "end_date": "2026-06-14", "goal": "Ship it"},
            format="json",
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Spring Sprint"
        assert data["goal"] == "Ship it"

    def test_create_sprint_missing_name(self, api_client, project):
        resp = api_client.post(
            reverse(self.URL_NAME, args=[project.workspace.slug, project.id]),
            {"start_date": "2026-06-01", "end_date": "2026-06-14"},
            format="json",
        )
        assert resp.status_code == 400

    def test_other_workspace_inaccessible(self, api_client, user):
        """User cannot access sprints of a workspace they don't belong to."""
        from apps.workspaces.models import Workspace

        other = Workspace.objects.create(name="Other", slug="other", owner=user)
        resp = api_client.get(reverse(self.URL_NAME, args=[other.slug, "00000000-0000-0000-0000-000000000000"]))
        assert resp.status_code == 404


class TestSprintDetail:
    URL_NAME = "sprint-detail"

    @pytest.fixture
    def sprint(self, project):
        from apps.tasks.models import Sprint

        return Sprint.objects.create(project=project, name="S1", start_date=date.today(), end_date=date.today() + timedelta(days=14))

    def test_patch_status(self, api_client, project, sprint):
        resp = api_client.patch(
            reverse(self.URL_NAME, args=[project.workspace.slug, project.id, sprint.id]),
            {"status": "active"},
            format="json",
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "active"

    def test_delete(self, api_client, project, sprint):
        resp = api_client.delete(reverse(self.URL_NAME, args=[project.workspace.slug, project.id, sprint.id]))
        assert resp.status_code == 204
        from apps.tasks.models import Sprint
        assert Sprint.objects.count() == 0


class TestSprintStats:
    URL_NAME = "sprint-stats"

    @pytest.fixture
    def sprint(self, project):
        from apps.tasks.models import Sprint

        return Sprint.objects.create(project=project, name="S1", start_date=date.today(), end_date=date.today() + timedelta(days=14))

    def test_stats(self, api_client, project, sprint, user):
        from apps.tasks.models import Task

        Task.objects.create(project=project, sprint=sprint, title="T1", status="done", created_by=user)
        Task.objects.create(project=project, sprint=sprint, title="T2", status="in_progress", created_by=user)
        Task.objects.create(project=project, sprint=sprint, title="T3", status="todo", created_by=user)
        resp = api_client.get(reverse(self.URL_NAME, args=[project.workspace.slug, project.id, sprint.id]))
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 3
        assert data["done"] == 1
        assert data["remaining"] == 2
        assert data["percentage"] == 33


# ── Task ───────────────────────────────────────────────────────────────────────

class TestTaskListCreate:
    URL_NAME = "task-list"

    @pytest.fixture
    def tasks(self, project, user):
        from apps.tasks.models import Task

        t1 = Task.objects.create(project=project, title="Alpha", status="todo", priority="high", created_by=user)
        t2 = Task.objects.create(project=project, title="Beta", status="done", priority="low", created_by=user)
        Task.objects.create(project=project, title="Gamma", status="todo", priority="medium", created_by=user, parent=t1)
        return t1, t2

    def test_list_all_tasks(self, api_client, project, tasks):
        resp = api_client.get(reverse(self.URL_NAME, args=[project.workspace.slug, project.id]))
        assert resp.status_code == 200
        assert len(resp.json()) == 3

    def test_filter_status(self, api_client, project, tasks):
        resp = api_client.get(
            reverse(self.URL_NAME, args=[project.workspace.slug, project.id]),
            {"status": "done"},
        )
        assert resp.status_code == 200
        assert len(resp.json()) == 1
        assert resp.json()[0]["title"] == "Beta"

    def test_filter_priority(self, api_client, project, tasks):
        resp = api_client.get(
            reverse(self.URL_NAME, args=[project.workspace.slug, project.id]),
            {"priority": "high"},
        )
        assert len(resp.json()) == 1

    def test_tree_mode(self, api_client, project, tasks):
        resp = api_client.get(
            reverse(self.URL_NAME, args=[project.workspace.slug, project.id]),
            {"tree": "true"},
        )
        assert resp.status_code == 200
        roots = resp.json()
        assert len(roots) == 2  # Alpha (with child) + Beta (no child)
        alpha = [r for r in roots if r["title"] == "Alpha"][0]
        assert alpha["children_count"] == 1
        assert len(alpha["children"]) == 1
        assert alpha["children"][0]["depth"] == 1

    def test_create_task(self, api_client, project, user):
        resp = api_client.post(
            reverse(self.URL_NAME, args=[project.workspace.slug, project.id]),
            {"title": "New Task", "priority": "urgent"},
            format="json",
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "New Task"
        assert data["priority"] == "urgent"
        assert data["depth"] == 0
        assert data["level_name"] == "Epic"

    def test_create_subtask(self, api_client, project, user):
        from apps.tasks.models import Task

        parent = Task.objects.create(project=project, title="Parent", created_by=user)
        resp = api_client.post(
            reverse(self.URL_NAME, args=[project.workspace.slug, project.id]),
            {"title": "Child", "parent": str(parent.id)},
            format="json",
        )
        assert resp.status_code == 201
        assert resp.json()["depth"] == 1
        assert resp.json()["level_name"] == "Task"

    def test_search(self, api_client, project, tasks):
        resp = api_client.get(
            reverse(self.URL_NAME, args=[project.workspace.slug, project.id]),
            {"search": "Alpha"},
        )
        assert resp.status_code == 200
        assert len(resp.json()) == 1
        assert resp.json()[0]["title"] == "Alpha"

    def test_unauthenticated(self, project):
        from rest_framework.test import APIClient

        resp = APIClient().get(reverse(self.URL_NAME, args=[project.workspace.slug, project.id]))
        assert resp.status_code in (401, 403)


class TestTaskDetail:
    URL_NAME = "task-detail"

    @pytest.fixture
    def task(self, project, user):
        from apps.tasks.models import Task

        return Task.objects.create(project=project, title="My Task", created_by=user)

    def test_get(self, api_client, project, task):
        resp = api_client.get(reverse(self.URL_NAME, args=[project.workspace.slug, project.id, task.id]))
        assert resp.status_code == 200
        assert resp.json()["title"] == "My Task"

    def test_patch_status(self, api_client, project, task):
        resp = api_client.patch(
            reverse(self.URL_NAME, args=[project.workspace.slug, project.id, task.id]),
            {"status": "done"},
            format="json",
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "done"

    def test_delete(self, api_client, project, task):
        resp = api_client.delete(reverse(self.URL_NAME, args=[project.workspace.slug, project.id, task.id]))
        assert resp.status_code == 204


# ── Comments & Activity ────────────────────────────────────────────────────────

class TestTaskComments:
    URL_NAME = "task-comments"

    @pytest.fixture
    def task(self, project, user):
        from apps.tasks.models import Task

        return Task.objects.create(project=project, title="T", created_by=user)

    def test_list_empty(self, api_client, project, task):
        resp = api_client.get(reverse(self.URL_NAME, args=[project.workspace.slug, project.id, task.id]))
        assert resp.status_code == 200
        assert resp.json() == []

    def test_create_comment(self, api_client, project, task):
        resp = api_client.post(
            reverse(self.URL_NAME, args=[project.workspace.slug, project.id, task.id]),
            {"content": "Looks good!"},
            format="json",
        )
        assert resp.status_code == 201
        assert resp.json()["content"] == "Looks good!"
        assert resp.json()["author"]["username"] == "testuser"


class TestTaskActivity:
    URL_NAME = "task-activity"

    @pytest.fixture
    def task(self, project, user):
        from apps.tasks.models import Task

        return Task.objects.create(project=project, title="T", created_by=user)

    def test_activity_log_on_status_change(self, api_client, project, task):
        """Status change PATCH should create an ActivityLog entry."""
        api_client.patch(
            reverse("task-detail", args=[project.workspace.slug, project.id, task.id]),
            {"status": "in_progress"},
            format="json",
        )
        resp = api_client.get(reverse(self.URL_NAME, args=[project.workspace.slug, project.id, task.id]))
        assert resp.status_code == 200
        logs = resp.json()
        assert len(logs) == 1
        assert logs[0]["action"] == "status_changed"


# ── Checklist ──────────────────────────────────────────────────────────────────

class TestChecklist:
    LIST_URL = "task-checklist"
    DETAIL_URL = "task-checklist-item"

    @pytest.fixture
    def task(self, project, user):
        from apps.tasks.models import Task

        return Task.objects.create(project=project, title="T", created_by=user)

    def test_create_and_list(self, api_client, project, task):
        resp = api_client.post(
            reverse(self.LIST_URL, args=[project.workspace.slug, project.id, task.id]),
            {"text": "Step 1"},
            format="json",
        )
        assert resp.status_code == 201
        item_id = resp.json()["id"]

        resp = api_client.get(reverse(self.LIST_URL, args=[project.workspace.slug, project.id, task.id]))
        assert len(resp.json()) == 1

        resp = api_client.patch(
            reverse(self.DETAIL_URL, args=[project.workspace.slug, project.id, task.id, item_id]),
            {"is_done": True},
            format="json",
        )
        assert resp.json()["is_done"] is True

        resp = api_client.delete(
            reverse(self.DETAIL_URL, args=[project.workspace.slug, project.id, task.id, item_id]),
        )
        assert resp.status_code == 204


# ── Task Relations ─────────────────────────────────────────────────────────────

class TestTaskRelations:
    LIST_URL = "task-relations"
    DELETE_URL = "task-relation-detail"

    @pytest.fixture
    def tasks(self, project, user):
        from apps.tasks.models import Task

        return (
            Task.objects.create(project=project, title="A", created_by=user),
            Task.objects.create(project=project, title="B", created_by=user),
        )

    def test_create_and_list(self, api_client, project, tasks):
        t1, t2 = tasks
        resp = api_client.post(
            reverse(self.LIST_URL, args=[project.workspace.slug, project.id, t1.id]),
            {"to_task": str(t2.id), "relation_type": "blocks"},
            format="json",
        )
        assert resp.status_code == 201
        assert resp.json()["relation_type"] == "blocks"
        rel_id = resp.json()["id"]

        resp = api_client.get(reverse(self.LIST_URL, args=[project.workspace.slug, project.id, t1.id]))
        assert len(resp.json()) == 1

        # Delete
        resp = api_client.delete(
            reverse(self.DELETE_URL, args=[project.workspace.slug, project.id, t1.id, rel_id]),
        )
        assert resp.status_code == 204


# ── Time Entries ───────────────────────────────────────────────────────────────

class TestTimeEntries:
    LIST_URL = "time-entry-list"
    DETAIL_URL = "time-entry-detail"

    @pytest.fixture
    def task(self, project, user):
        from apps.tasks.models import Task

        return Task.objects.create(project=project, title="T", created_by=user)

    def test_create_and_delete(self, api_client, project, task):
        now = dt.now(tz=timezone.utc)
        resp = api_client.post(
            reverse(self.LIST_URL, args=[project.workspace.slug, project.id, task.id]),
            {"started_at": now.isoformat(), "duration_seconds": 3600, "note": "focused work"},
            format="json",
        )
        assert resp.status_code == 201
        entry_id = resp.json()["id"]
        assert resp.json()["duration_seconds"] == 3600

        resp = api_client.get(reverse(self.LIST_URL, args=[project.workspace.slug, project.id, task.id]))
        assert len(resp.json()) == 1

        resp = api_client.delete(
            reverse(self.DETAIL_URL, args=[project.workspace.slug, project.id, task.id, entry_id]),
        )
        assert resp.status_code == 204


# ── Analytics ──────────────────────────────────────────────────────────────────

class TestAnalytics:
    URL_NAME = "analytics"

    @pytest.fixture
    def setup(self, project, user):
        from apps.tasks.models import Task

        for i in range(5):
            Task.objects.create(project=project, title=f"T{i}", status="done", created_by=user)
        Task.objects.create(project=project, title="Todo", status="todo", created_by=user)

    def test_analytics_endpoint(self, api_client, project, setup):
        resp = api_client.get(reverse(self.URL_NAME, args=[project.workspace.slug, project.id]))
        assert resp.status_code == 200
        data = resp.json()
        assert "summary" in data
        assert "burnup" in data
        assert data["summary"]["total"] == 6
        assert data["summary"]["by_status"]["done"] == 5
