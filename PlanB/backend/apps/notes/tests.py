"""Tests for apps.notes — Note / NoteFolder / Backlinks / Search.

Covers: CRUD for notes and folders (function-based @api_view), folder hierarchy,
WikiLink [[title]] backlinks, full-text search across title/content/tags,
and workspace-scoped isolation.
"""

import pytest
from django.urls import reverse


pytestmark = pytest.mark.django_db


# ── Note ───────────────────────────────────────────────────────────────────────

class TestNoteListCreate:
    URL_NAME = "note-list"

    def test_list_empty(self, api_client, workspace):
        resp = api_client.get(reverse(self.URL_NAME, args=[workspace.slug]))
        assert resp.status_code == 200
        assert resp.json() == []

    def test_create_note(self, api_client, workspace):
        resp = api_client.post(
            reverse(self.URL_NAME, args=[workspace.slug]),
            {"title": "My Note", "content": "# Hello\nWorld", "tags": ["test"]},
            format="json",
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "My Note"
        assert data["content"] == "# Hello\nWorld"
        assert data["tags"] == ["test"]
        assert data["is_pinned"] is False
        assert data["folder"] is None

    def test_create_with_folder(self, api_client, workspace):
        from apps.notes.models import NoteFolder

        folder = NoteFolder.objects.create(workspace=workspace, user=api_client.handler._force_user, name="Dev")
        resp = api_client.post(
            reverse(self.URL_NAME, args=[workspace.slug]),
            {"title": "In Folder", "folder": str(folder.id)},
            format="json",
        )
        assert resp.status_code == 201
        assert resp.json()["folder"] == str(folder.id)

    def test_list_filter_by_folder(self, api_client, workspace):
        from apps.notes.models import NoteFolder

        user = api_client.handler._force_user
        folder = NoteFolder.objects.create(workspace=workspace, user=user, name="Dev")
        api_client.post(reverse(self.URL_NAME, args=[workspace.slug]), {"title": "Root note"}, format="json")
        api_client.post(
            reverse(self.URL_NAME, args=[workspace.slug]),
            {"title": "Folder note", "folder": str(folder.id)},
            format="json",
        )

        resp = api_client.get(reverse(self.URL_NAME, args=[workspace.slug]), {"folder": "root"})
        assert len(resp.json()) == 1
        assert resp.json()[0]["title"] == "Root note"

        resp = api_client.get(reverse(self.URL_NAME, args=[workspace.slug]), {"folder": str(folder.id)})
        assert len(resp.json()) == 1
        assert resp.json()[0]["title"] == "Folder note"

    def test_search(self, api_client, workspace):
        api_client.post(
            reverse(self.URL_NAME, args=[workspace.slug]),
            {"title": "Meeting", "content": "Discuss Q3 roadmap"},
            format="json",
        )
        api_client.post(
            reverse(self.URL_NAME, args=[workspace.slug]),
            {"title": "Shopping", "content": "Buy milk"},
            format="json",
        )
        # Search by content
        resp = api_client.get(reverse(self.URL_NAME, args=[workspace.slug]), {"q": "roadmap"})
        assert len(resp.json()) == 1
        assert resp.json()[0]["title"] == "Meeting"

    def test_workspace_isolation(self, api_client, user):
        from apps.workspaces.models import Workspace

        ws1 = Workspace.objects.create(name="WS1", slug="ws1", owner=user)
        ws2 = Workspace.objects.create(name="WS2", slug="ws2", owner=user)
        from apps.workspaces.models import WorkspaceMember
        WorkspaceMember.objects.create(workspace=ws1, user=user, role=WorkspaceMember.Role.OWNER)
        WorkspaceMember.objects.create(workspace=ws2, user=user, role=WorkspaceMember.Role.OWNER)

        api_client.post(reverse(self.URL_NAME, args=["ws1"]), {"title": "WS1 Note"}, format="json")
        api_client.post(reverse(self.URL_NAME, args=["ws2"]), {"title": "WS2 Note"}, format="json")

        resp = api_client.get(reverse(self.URL_NAME, args=["ws1"]))
        titles = [n["title"] for n in resp.json()]
        assert "WS1 Note" in titles
        assert "WS2 Note" not in titles


class TestNoteDetail:
    URL_NAME = "note-detail"

    @pytest.fixture
    def note(self, api_client, workspace):
        resp = api_client.post(
            reverse("note-list", args=[workspace.slug]),
            {"title": "Detail", "content": "Test"},
            format="json",
        )
        return resp.json()

    def test_get(self, api_client, workspace, note):
        resp = api_client.get(reverse(self.URL_NAME, args=[workspace.slug, note["id"]]))
        assert resp.status_code == 200
        assert resp.json()["title"] == "Detail"

    def test_patch(self, api_client, workspace, note):
        resp = api_client.patch(
            reverse(self.URL_NAME, args=[workspace.slug, note["id"]]),
            {"title": "Updated", "is_pinned": True},
            format="json",
        )
        assert resp.status_code == 200
        assert resp.json()["title"] == "Updated"
        assert resp.json()["is_pinned"] is True

    def test_delete(self, api_client, workspace, note):
        resp = api_client.delete(reverse(self.URL_NAME, args=[workspace.slug, note["id"]]))
        assert resp.status_code == 204


# ── NoteFolder ─────────────────────────────────────────────────────────────────

class TestFolder:
    LIST_URL = "note-folder-list"
    DETAIL_URL = "note-folder-detail"

    def test_create_and_list(self, api_client, workspace):
        resp = api_client.post(
            reverse(self.LIST_URL, args=[workspace.slug]),
            {"name": "Research"},
            format="json",
        )
        assert resp.status_code == 201
        assert resp.json()["name"] == "Research"

        resp = api_client.get(reverse(self.LIST_URL, args=[workspace.slug]))
        assert len(resp.json()) == 1

    def test_nested_folder(self, api_client, workspace):
        parent_resp = api_client.post(
            reverse(self.LIST_URL, args=[workspace.slug]),
            {"name": "Parent"},
            format="json",
        )
        parent_id = parent_resp.json()["id"]
        resp = api_client.post(
            reverse(self.LIST_URL, args=[workspace.slug]),
            {"name": "Child", "parent": parent_id},
            format="json",
        )
        assert resp.status_code == 201
        assert resp.json()["parent"] == parent_id

    def test_rename_folder(self, api_client, workspace):
        create = api_client.post(reverse(self.LIST_URL, args=[workspace.slug]), {"name": "Old"}, format="json")
        fid = create.json()["id"]
        resp = api_client.patch(
            reverse(self.DETAIL_URL, args=[workspace.slug, fid]),
            {"name": "Renamed"},
            format="json",
        )
        assert resp.json()["name"] == "Renamed"

    def test_delete_folder(self, api_client, workspace):
        create = api_client.post(reverse(self.LIST_URL, args=[workspace.slug]), {"name": "Temp"}, format="json")
        fid = create.json()["id"]
        resp = api_client.delete(reverse(self.DETAIL_URL, args=[workspace.slug, fid]))
        assert resp.status_code == 204


# ── Backlinks ──────────────────────────────────────────────────────────────────

class TestBacklinks:
    URL_NAME = "note-backlinks"

    @pytest.fixture
    def notes(self, api_client, workspace):
        """Create a note with a title, and another note that [[links to it]]."""
        source = api_client.post(
            reverse("note-list", args=[workspace.slug]),
            {"title": "Target Note", "content": "This is the target"},
            format="json",
        ).json()
        api_client.post(
            reverse("note-list", args=[workspace.slug]),
            {"title": "Referrer", "content": "See [[Target Note]] for details"},
            format="json",
        )
        return source

    def test_backlinks_found(self, api_client, workspace, notes):
        resp = api_client.get(reverse(self.URL_NAME, args=[workspace.slug, notes["id"]]))
        assert resp.status_code == 200
        assert len(resp.json()) == 1
        assert resp.json()[0]["title"] == "Referrer"
        assert "Target Note" in resp.json()[0]["excerpt"]

    def test_no_backlinks(self, api_client, workspace):
        from apps.notes.models import Note

        user = api_client.handler._force_user
        note = Note.objects.create(workspace=workspace, user=user, title="Orphan", content="Alone")
        resp = api_client.get(reverse(self.URL_NAME, args=[workspace.slug, note.id]))
        assert resp.json() == []

    def test_requires_auth(self, workspace):
        from rest_framework.test import APIClient

        resp = APIClient().get(reverse(self.URL_NAME, args=[workspace.slug, "00000000-0000-0000-0000-000000000000"]))
        assert resp.status_code in (401, 403)
