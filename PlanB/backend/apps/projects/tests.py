"""Tests for apps.projects — Project + member + template CRUD."""

import pytest
from django.urls import reverse

pytestmark = pytest.mark.django_db


# ── Project ───────────────────────────────────────────────────────────────────


class TestProjectList:
    URL_NAME = "project-list"

    def test_list_empty(self, api_client, workspace):
        resp = api_client.get(reverse(self.URL_NAME, args=[workspace.slug]))
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_after_create(self, api_client, workspace, project):
        resp = api_client.get(reverse(self.URL_NAME, args=[workspace.slug]))
        assert resp.status_code == 200
        assert any(p["name"] == project.name for p in resp.json())

    def test_other_workspace_404(self, api_client):
        resp = api_client.get(reverse(self.URL_NAME, args=["nope"]))
        assert resp.status_code == 404

    def test_requires_auth(self, api_client, workspace):
        api_client.force_authenticate(user=None)
        resp = api_client.get(reverse(self.URL_NAME, args=[workspace.slug]))
        assert resp.status_code == 401


class TestProjectCreate:
    URL_NAME = "project-list"

    def test_create(self, api_client, workspace):
        resp = api_client.post(
            reverse(self.URL_NAME, args=[workspace.slug]),
            {"name": "New Project"},
            format="json",
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "New Project"
        assert data["created_by"]["username"] == "testuser"

    def test_create_with_full_fields(self, api_client, workspace):
        resp = api_client.post(
            reverse(self.URL_NAME, args=[workspace.slug]),
            {
                "name": "Research",
                "description": "A research project",
                "project_type": "research",
                "status": "active",
            },
            format="json",
        )
        assert resp.status_code == 201
        assert resp.json()["project_type"] == "research"


class TestProjectDetail:
    URL_NAME = "project-detail"

    def test_get(self, api_client, workspace, project):
        resp = api_client.get(
            reverse(self.URL_NAME, args=[workspace.slug, project.id]),
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == project.name

    def test_patch(self, api_client, workspace, project):
        resp = api_client.patch(
            reverse(self.URL_NAME, args=[workspace.slug, project.id]),
            {"description": "Updated desc"},
            format="json",
        )
        assert resp.status_code == 200
        assert resp.json()["description"] == "Updated desc"

    def test_delete(self, api_client, workspace, project):
        resp = api_client.delete(
            reverse(self.URL_NAME, args=[workspace.slug, project.id]),
        )
        assert resp.status_code == 204

    def test_get_404(self, api_client, workspace):
        resp = api_client.get(
            reverse(self.URL_NAME, args=[workspace.slug, "00000000-0000-0000-0000-000000000000"]),
        )
        assert resp.status_code == 404

    def test_non_member_cannot_access(self, api_client, workspace, project):
        from django.contrib.auth import get_user_model
        from apps.workspaces.models import WorkspaceMember

        other = get_user_model().objects.create_user(
            username="outsider", email="o@o.test", password="pass",
        )
        WorkspaceMember.objects.create(
            workspace=workspace, user=other, role=WorkspaceMember.Role.MEMBER,
        )
        api_client.force_authenticate(user=other)
        resp = api_client.get(
            reverse(self.URL_NAME, args=[workspace.slug, project.id]),
        )
        assert resp.status_code == 404  # not a project member


# ── Project Members ───────────────────────────────────────────────────────────


class TestProjectMemberList:
    URL_NAME = "project-members"

    def test_list(self, api_client, workspace, project):
        resp = api_client.get(
            reverse(self.URL_NAME, args=[workspace.slug, project.id]),
        )
        assert resp.status_code == 200
        assert any(m["user"]["username"] == "testuser" for m in resp.json())

    def test_other_workspace_404(self, api_client, project):
        resp = api_client.get(
            reverse(self.URL_NAME, args=["nope", project.id]),
        )
        assert resp.status_code == 404


# ── Templates ─────────────────────────────────────────────────────────────────


class TestTemplateList:
    URL_NAME = "template-list"

    def test_list(self, api_client, workspace):
        from apps.projects.models import ProjectTemplate

        ProjectTemplate.objects.create(name="Sprint", tasks=[{"title": "Task 1"}])
        resp = api_client.get(reverse(self.URL_NAME, args=[workspace.slug]))
        assert resp.status_code == 200
        assert any(t["name"] == "Sprint" for t in resp.json())

    def test_requires_auth(self, api_client, workspace):
        api_client.force_authenticate(user=None)
        resp = api_client.get(reverse(self.URL_NAME, args=[workspace.slug]))
        assert resp.status_code == 401


class TestProjectFromTemplate:
    URL_NAME = "template-apply"

    def test_apply(self, api_client, workspace):
        from apps.projects.models import ProjectTemplate

        tpl = ProjectTemplate.objects.create(
            name="Bug Fix", tasks=[{"title": "Reproduce"}, {"title": "Fix"}],
        )
        resp = api_client.post(
            reverse(self.URL_NAME, args=[workspace.slug, tpl.id]),
            {"name": "Sprint 1"},
            format="json",
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Sprint 1"
