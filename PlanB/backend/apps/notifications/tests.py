"""Tests for apps.notifications — Notification model + API views.

Covers: list (empty / with data), mark-read, read-all, unread-count,
workspace isolation, auth requirements, and signal auto-creation.
"""

import io

import pytest
from django.urls import reverse
from PIL import Image

pytestmark = pytest.mark.django_db


class TestNotificationList:
    URL_NAME = "notification-list"

    def test_list_empty(self, api_client, workspace):
        resp = api_client.get(reverse(self.URL_NAME, args=[workspace.slug]))
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_with_data(self, api_client, workspace, user):
        from apps.notifications.models import Notification

        Notification.objects.create(user=user, workspace=workspace, notification_type="system", title="N1")
        Notification.objects.create(user=user, workspace=workspace, notification_type="mention", title="N2")
        resp = api_client.get(reverse(self.URL_NAME, args=[workspace.slug]))
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        # Most recent first (ordering = ["-created_at"])
        assert data[0]["title"] == "N2"

    def test_requires_auth(self, workspace):
        from rest_framework.test import APIClient

        resp = APIClient().get(reverse(self.URL_NAME, args=[workspace.slug]))
        assert resp.status_code in (401, 403)


class TestNotificationDetail:
    URL_NAME = "notification-detail"

    def test_mark_read(self, api_client, workspace, user):
        from apps.notifications.models import Notification

        notification = Notification.objects.create(
            user=user, workspace=workspace, notification_type="system", title="Read me",
        )
        assert notification.is_read is False

        resp = api_client.patch(
            reverse(self.URL_NAME, args=[workspace.slug, notification.id]),
            format="json",
        )
        assert resp.status_code == 200
        assert resp.json()["is_read"] is True

        # Verify DB
        notification.refresh_from_db()
        assert notification.is_read is True


class TestNotificationReadAll:
    URL_NAME = "notification-read-all"

    def test_read_all(self, api_client, workspace, user):
        from apps.notifications.models import Notification

        Notification.objects.create(user=user, workspace=workspace, notification_type="system", title="A")
        Notification.objects.create(user=user, workspace=workspace, notification_type="system", title="B")
        assert Notification.objects.filter(is_read=False).count() == 2

        resp = api_client.post(reverse(self.URL_NAME, args=[workspace.slug]), format="json")
        assert resp.status_code == 200
        assert resp.json()["updated"] == 2
        assert Notification.objects.filter(is_read=False).count() == 0


class TestNotificationUnreadCount:
    URL_NAME = "notification-unread-count"

    def test_unread_count(self, api_client, workspace, user):
        from apps.notifications.models import Notification

        Notification.objects.create(user=user, workspace=workspace, notification_type="system", title="Unread 1")
        Notification.objects.create(user=user, workspace=workspace, notification_type="system", title="Unread 2")
        Notification.objects.create(
            user=user, workspace=workspace, notification_type="system", title="Read", is_read=True,
        )

        resp = api_client.get(reverse(self.URL_NAME, args=[workspace.slug]))
        assert resp.status_code == 200
        assert resp.json()["unread_count"] == 2


class TestWorkspaceIsolation:
    """Ensure users cannot access notifications across workspace boundaries."""

    def test_other_workspace_not_member(self, api_client, user, workspace):
        """Accessing a workspace the user does not belong to returns 404."""
        from apps.workspaces.models import Workspace

        other = Workspace.objects.create(name="Other", slug="other-isolation", owner=user)
        resp = api_client.get(reverse("notification-list", args=[other.slug]))
        assert resp.status_code == 404

    def test_other_user_cannot_see(self, api_client, user, workspace):
        """User B cannot access notifications belonging to User A's workspace."""
        from django.contrib.auth import get_user_model
        from rest_framework.test import APIClient
        from apps.notifications.models import Notification
        from apps.workspaces.models import Workspace, WorkspaceMember

        other_user = get_user_model().objects.create_user(
            username="other-isolation", email="other@isolation.test", password="pass",
        )
        other_ws = Workspace.objects.create(name="Other WS", slug="other-ws", owner=other_user)
        WorkspaceMember.objects.create(workspace=other_ws, user=other_user, role=WorkspaceMember.Role.OWNER)

        # User A creates a notification in their workspace
        Notification.objects.create(
            user=user, workspace=workspace, notification_type="system", title="Secret",
        )

        # User B tries to access User A's workspace
        client = APIClient()
        client.force_authenticate(user=other_user)
        resp = client.get(reverse("notification-list", args=[workspace.slug]))
        assert resp.status_code == 404


class TestSignalFileAttached:
    """Auto-create Notification when FileAttachment is linked to a task."""

    def test_file_attached_to_task_notifies_assignee(self, api_client, workspace):
        from apps.tasks.models import Task, Project

        project = Project.objects.create(workspace=workspace, name="Test")
        user2 = type(api_client.handler._force_user).objects.create_user(
            username="assignee", email="a@b.test", password="pass",
        )
        task = Task.objects.create(
            project=project, title="Test task", assignee=user2,
        )
        png = io.BytesIO()
        Image.new("RGB", (1, 1), color="blue").save(png, format="PNG")
        png.seek(0)
        resp = api_client.post(
            reverse("file-upload", args=[workspace.slug]),
            {"file": png, "format": "png", "task_id": task.id},
            format="multipart",
        )
        assert resp.status_code == 201

        from apps.notifications.models import Notification
        notif = Notification.objects.filter(user=user2).first()
        assert notif is not None
        assert notif.notification_type == Notification.Type.FILE_ATTACHED
        assert str(notif.related_object_id) == str(task.id)

    def test_file_attached_to_note_notifies_note_owner(self, api_client, workspace):
        from apps.notes.models import Note
        from apps.workspaces.models import WorkspaceMember

        user2 = type(api_client.handler._force_user).objects.create_user(
            username="note-owner", email="n@o.test", password="pass",
        )
        WorkspaceMember.objects.create(
            workspace=workspace, user=user2, role=WorkspaceMember.Role.MEMBER,
        )
        note = Note.objects.create(workspace=workspace, user=user2, title="Test note")

        api_client.force_authenticate(user=user2)
        png = io.BytesIO()
        Image.new("RGB", (1, 1), color="green").save(png, format="PNG")
        png.seek(0)
        resp = api_client.post(
            reverse("file-upload", args=[workspace.slug]),
            {"file": png, "format": "png", "note_id": note.id},
            format="multipart",
        )
        assert resp.status_code == 201

        from apps.notifications.models import Notification
        notif = Notification.objects.filter(user=user2).first()
        assert notif is not None
        assert notif.notification_type == Notification.Type.FILE_ATTACHED
        assert str(notif.related_object_id) == str(note.id)
