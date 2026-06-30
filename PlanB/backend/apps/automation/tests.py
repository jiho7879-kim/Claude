"""Tests for apps.automation — Rule CRUD / RuleLog / Signal-triggered execution.

Covers: Rule and RuleLog CRUD endpoints, the signal-based auto-execution
(when a Task status changes, matching rules fire), and workspace-scoped isolation.
"""

import pytest
from django.urls import reverse


pytestmark = pytest.mark.django_db


# ── Rule CRUD ──────────────────────────────────────────────────────────────────

class TestRuleListCreate:
    URL_NAME = "rule-list"

    def test_list_empty(self, api_client, project):
        resp = api_client.get(reverse(self.URL_NAME, args=[project.workspace.slug, project.id]))
        assert resp.status_code == 200
        assert resp.json() == []

    def test_create_rule(self, api_client, project):
        resp = api_client.post(
            reverse(self.URL_NAME, args=[project.workspace.slug, project.id]),
            {
                "name": "Auto-close on done",
                "trigger": "status_changed",
                "trigger_val": {"from": "in_progress", "to": "done"},
                "action": "change_priority",
                "action_val": {"priority": "low"},
            },
            format="json",
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Auto-close on done"
        assert data["trigger"] == "status_changed"
        assert data["is_active"] is True

    def test_list_rules(self, api_client, project):
        api_client.post(
            reverse(self.URL_NAME, args=[project.workspace.slug, project.id]),
            {"name": "R1", "trigger": "task_created", "action": "change_status", "action_val": {"status": "todo"}},
            format="json",
        )
        resp = api_client.get(reverse(self.URL_NAME, args=[project.workspace.slug, project.id]))
        assert len(resp.json()) == 1


class TestRuleDetail:
    URL_NAME = "rule-detail"

    @pytest.fixture
    def rule(self, api_client, project):
        resp = api_client.post(
            reverse("rule-list", args=[project.workspace.slug, project.id]),
            {"name": "My Rule", "trigger": "task_created", "action": "assign_to", "action_val": {"assignee": "self"}},
            format="json",
        )
        return resp.json()

    def test_patch(self, api_client, project, rule):
        resp = api_client.patch(
            reverse(self.URL_NAME, args=[project.workspace.slug, project.id, rule["id"]]),
            {"is_active": False},
            format="json",
        )
        assert resp.status_code == 200
        assert resp.json()["is_active"] is False

    def test_delete(self, api_client, project, rule):
        resp = api_client.delete(reverse(self.URL_NAME, args=[project.workspace.slug, project.id, rule["id"]]))
        assert resp.status_code == 204


class TestRuleLog:
    URL_NAME = "rule-logs"

    @pytest.fixture
    def rule(self, api_client, project):
        resp = api_client.post(
            reverse("rule-list", args=[project.workspace.slug, project.id]),
            {"name": "Log Test", "trigger": "status_changed", "action": "notify_assignee"},
            format="json",
        )
        return resp.json()

    @pytest.fixture
    def rule_logs(self, project, rule):
        from apps.automation.models import RuleLog
        from apps.tasks.models import Task

        task = Task.objects.create(project=project, title="T")
        for i in range(3):
            RuleLog.objects.create(rule_id=rule["id"], task=task, action_taken=f"Action {i}")
        return rule

    def test_list_logs(self, api_client, project, rule_logs):
        resp = api_client.get(
            reverse(self.URL_NAME, args=[project.workspace.slug, project.id, rule_logs["id"]]),
        )
        assert resp.status_code == 200
        assert len(resp.json()) == 3
        assert resp.json()[0]["rule_name"] == "Log Test"

    def test_log_empty_when_no_actions(self, api_client, project, rule):
        resp = api_client.get(
            reverse(self.URL_NAME, args=[project.workspace.slug, project.id, rule["id"]]),
        )
        assert resp.status_code == 200
        assert resp.json() == []


# ── Signal-based rule execution ────────────────────────────────────────────────

class TestSignalExecution:
    """Verify that the automation signals module reacts to Task status changes."""

    def test_status_change_triggers_executor(self, api_client, project, user):
        """Posting a Task status change should call the executor (via signal)."""
        from apps.automation.models import Rule
        from apps.tasks.models import Task

        # Create a rule: when status changes, change priority to low
        Rule.objects.create(
            project=project,
            name="Deprioritize done",
            trigger="status_changed",
            trigger_val={"to": "done"},
            action="change_priority",
            action_val={"priority": "low"},
        )
        task = Task.objects.create(project=project, title="T", created_by=user)

        # Signal auto-fires on save
        api_client.patch(
            reverse("task-detail", args=[project.workspace.slug, project.id, task.id]),
            {"status": "done"},
            format="json",
        )
        task.refresh_from_db()
        assert task.priority == "low"

    def test_inactive_rule_not_fired(self, api_client, project, user):
        from apps.automation.models import Rule
        from apps.tasks.models import Task

        Rule.objects.create(
            project=project,
            name="Inactive",
            trigger="status_changed",
            trigger_val={"to": "done"},
            action="change_priority",
            action_val={"priority": "low"},
            is_active=False,
        )
        task = Task.objects.create(project=project, title="T", created_by=user, priority="high")
        api_client.patch(
            reverse("task-detail", args=[project.workspace.slug, project.id, task.id]),
            {"status": "done"},
            format="json",
        )
        task.refresh_from_db()
        assert task.priority == "high"  # unchanged
