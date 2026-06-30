"""Tests for apps.workspaces — Workspace + member + saved-view CRUD."""

import pytest
from django.urls import reverse

pytestmark = pytest.mark.django_db


# ── Workspace ─────────────────────────────────────────────────────────────────


class TestWorkspaceList:
    URL_NAME = "workspace-list"

    def test_list_empty(self, api_client):
        resp = api_client.get(reverse(self.URL_NAME))
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_owned(self, api_client, workspace):
        resp = api_client.get(reverse(self.URL_NAME))
        assert resp.status_code == 200
        data = resp.json()
        assert any(ws["slug"] == workspace.slug for ws in data)

    def test_list_other_user_not_visible(self, api_client):
        from django.contrib.auth import get_user_model

        other = get_user_model().objects.create_user(
            username="other", email="other@test.test", password="pass",
        )
        api_client.force_authenticate(user=other)
        resp = api_client.get(reverse(self.URL_NAME))
        assert resp.status_code == 200
        assert resp.json() == []

    def test_requires_auth(self, api_client):
        api_client.force_authenticate(user=None)
        resp = api_client.get(reverse(self.URL_NAME))
        assert resp.status_code == 401


class TestWorkspaceCreate:
    URL_NAME = "workspace-list"

    def test_create(self, api_client):
        resp = api_client.post(
            reverse(self.URL_NAME),
            {"name": "New WS", "slug": "new-ws"},
            format="json",
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "New WS"
        assert data["slug"] == "new-ws"
        assert data["owner"]["username"] == "testuser"

    def test_create_duplicate_slug(self, api_client, workspace):
        resp = api_client.post(
            reverse(self.URL_NAME),
            {"name": "Dup", "slug": workspace.slug},
            format="json",
        )
        assert resp.status_code == 400


class TestWorkspaceDetail:
    URL_NAME = "workspace-detail"

    def test_get(self, api_client, workspace):
        resp = api_client.get(reverse(self.URL_NAME, args=[workspace.slug]))
        assert resp.status_code == 200
        assert resp.json()["slug"] == workspace.slug

    def test_patch(self, api_client, workspace):
        resp = api_client.patch(
            reverse(self.URL_NAME, args=[workspace.slug]),
            {"description": "Updated"},
            format="json",
        )
        assert resp.status_code == 200
        assert resp.json()["description"] == "Updated"

    def test_delete_by_owner(self, api_client, workspace):
        resp = api_client.delete(reverse(self.URL_NAME, args=[workspace.slug]))
        assert resp.status_code == 204

    def test_delete_by_non_owner(self, api_client, workspace):
        from django.contrib.auth import get_user_model
        from apps.workspaces.models import WorkspaceMember

        other = get_user_model().objects.create_user(
            username="other", email="other@test.test", password="pass",
        )
        WorkspaceMember.objects.create(
            workspace=workspace, user=other, role=WorkspaceMember.Role.MEMBER,
        )
        api_client.force_authenticate(user=other)
        resp = api_client.delete(reverse(self.URL_NAME, args=[workspace.slug]))
        assert resp.status_code == 403

    def test_get_other_workspace_404(self, api_client, workspace):
        resp = api_client.get(reverse(self.URL_NAME, args=["nonexistent"]))
        assert resp.status_code == 404


# ── Workspace Members ────────────────────────────────────────────────────────


class TestWorkspaceMemberList:
    URL_NAME = "workspace-members"

    def test_list(self, api_client, workspace):
        resp = api_client.get(reverse(self.URL_NAME, args=[workspace.slug]))
        assert resp.status_code == 200
        data = resp.json()
        assert any(m["user"]["username"] == "testuser" for m in data)

    def test_other_workspace_404(self, api_client):
        resp = api_client.get(reverse(self.URL_NAME, args=["nope"]))
        assert resp.status_code == 404


class TestWorkspaceMemberDelete:
    URL_NAME = "workspace-member-detail"

    def test_remove_member(self, api_client, workspace):
        from django.contrib.auth import get_user_model
        from apps.workspaces.models import WorkspaceMember

        other = get_user_model().objects.create_user(
            username="removee", email="r@r.test", password="pass",
        )
        WorkspaceMember.objects.create(
            workspace=workspace, user=other, role=WorkspaceMember.Role.MEMBER,
        )
        resp = api_client.delete(
            reverse(self.URL_NAME, args=[workspace.slug, other.id]),
        )
        assert resp.status_code == 204

    def test_cannot_remove_owner(self, api_client, workspace, user):
        resp = api_client.delete(
            reverse(self.URL_NAME, args=[workspace.slug, user.id]),
        )
        assert resp.status_code == 400

    def test_member_cannot_remove_others(self, api_client, workspace):
        from django.contrib.auth import get_user_model
        from apps.workspaces.models import WorkspaceMember

        other = get_user_model().objects.create_user(
            username="non-admin", email="na@t.test", password="pass",
        )
        member2 = get_user_model().objects.create_user(
            username="target", email="t@t.test", password="pass",
        )
        WorkspaceMember.objects.create(
            workspace=workspace, user=other, role=WorkspaceMember.Role.MEMBER,
        )
        WorkspaceMember.objects.create(
            workspace=workspace, user=member2, role=WorkspaceMember.Role.MEMBER,
        )
        api_client.force_authenticate(user=other)
        resp = api_client.delete(
            reverse(self.URL_NAME, args=[workspace.slug, member2.id]),
        )
        assert resp.status_code == 403


# ── Saved Views ──────────────────────────────────────────────────────────────


class TestSavedViewListCreate:
    URL_NAME = "saved-view-list"

    def test_list_empty(self, api_client, workspace, project):
        resp = api_client.get(
            reverse(self.URL_NAME, args=[workspace.slug, project.id]),
        )
        assert resp.status_code == 200
        assert resp.json() == []

    def test_create_and_list(self, api_client, workspace, project):
        resp = api_client.post(
            reverse(self.URL_NAME, args=[workspace.slug, project.id]),
            {"name": "My View", "filters": {"status": "todo"}, "view_type": "list"},
            format="json",
        )
        assert resp.status_code == 201
        view_id = resp.json()["id"]

        resp2 = api_client.get(
            reverse(self.URL_NAME, args=[workspace.slug, project.id]),
        )
        assert len(resp2.json()) == 1
        assert resp2.json()[0]["id"] == view_id

    def test_other_workspace_404(self, api_client, project):
        resp = api_client.get(
            reverse(self.URL_NAME, args=["nope", project.id]),
        )
        assert resp.status_code == 404

    def test_requires_auth(self, api_client, workspace, project):
        api_client.force_authenticate(user=None)
        resp = api_client.get(
            reverse(self.URL_NAME, args=[workspace.slug, project.id]),
        )
        assert resp.status_code == 401
