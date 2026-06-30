"""Tests for apps.calendars — CalendarEvent CRUD + presentation view."""

import pytest
from django.urls import reverse

pytestmark = pytest.mark.django_db


class TestEventList:
    URL_NAME = "event-list"

    def test_list_empty(self, api_client, workspace):
        resp = api_client.get(reverse(self.URL_NAME, args=[workspace.slug]))
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_after_create(self, api_client, workspace):
        from rest_framework.test import APIClient
        from apps.calendars.models import CalendarEvent

        CalendarEvent.objects.create(
            workspace=workspace,
            title="Standup",
            start_at="2026-07-01T09:00:00Z",
            end_at="2026-07-01T09:30:00Z",
            created_by=api_client.handler._force_user,
        )
        resp = api_client.get(reverse(self.URL_NAME, args=[workspace.slug]))
        assert resp.status_code == 200
        assert any(e["title"] == "Standup" for e in resp.json())


class TestEventCreate:
    URL_NAME = "event-list"

    def test_create_basic(self, api_client, workspace):
        resp = api_client.post(
            reverse(self.URL_NAME, args=[workspace.slug]),
            {
                "title": "Meeting",
                "start_at": "2026-07-01T10:00:00Z",
                "end_at": "2026-07-01T11:00:00Z",
            },
            format="json",
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "Meeting"
        assert data["created_by"]["username"] == "testuser"

    def test_create_requires_title(self, api_client, workspace):
        resp = api_client.post(
            reverse(self.URL_NAME, args=[workspace.slug]),
            {"start_at": "2026-07-01T10:00:00Z", "end_at": "2026-07-01T11:00:00Z"},
            format="json",
        )
        assert resp.status_code == 400

    def test_create_all_day(self, api_client, workspace):
        resp = api_client.post(
            reverse(self.URL_NAME, args=[workspace.slug]),
            {
                "title": "Holiday",
                "start_at": "2026-07-04T00:00:00Z",
                "end_at": "2026-07-04T23:59:00Z",
                "is_all_day": True,
            },
            format="json",
        )
        assert resp.status_code == 201
        assert resp.json()["is_all_day"] is True


class TestEventDetail:
    URL_NAME = "event-detail"

    def test_get(self, api_client, workspace):
        from apps.calendars.models import CalendarEvent

        event = CalendarEvent.objects.create(
            workspace=workspace,
            title="Review",
            start_at="2026-07-02T14:00:00Z",
            end_at="2026-07-02T15:00:00Z",
            created_by=api_client.handler._force_user,
        )
        resp = api_client.get(
            reverse(self.URL_NAME, args=[workspace.slug, event.id]),
        )
        assert resp.status_code == 200
        assert resp.json()["title"] == "Review"

    def test_patch(self, api_client, workspace):
        from apps.calendars.models import CalendarEvent

        event = CalendarEvent.objects.create(
            workspace=workspace,
            title="Old",
            start_at="2026-07-02T14:00:00Z",
            end_at="2026-07-02T15:00:00Z",
            created_by=api_client.handler._force_user,
        )
        resp = api_client.patch(
            reverse(self.URL_NAME, args=[workspace.slug, event.id]),
            {"title": "Updated"},
            format="json",
        )
        assert resp.status_code == 200
        assert resp.json()["title"] == "Updated"

    def test_delete(self, api_client, workspace):
        from apps.calendars.models import CalendarEvent

        event = CalendarEvent.objects.create(
            workspace=workspace,
            title="Delete me",
            start_at="2026-07-02T14:00:00Z",
            end_at="2026-07-02T15:00:00Z",
            created_by=api_client.handler._force_user,
        )
        resp = api_client.delete(
            reverse(self.URL_NAME, args=[workspace.slug, event.id]),
        )
        assert resp.status_code == 204

    def test_non_creator_cannot_edit(self, api_client, workspace):
        from django.contrib.auth import get_user_model
        from apps.calendars.models import CalendarEvent
        from apps.workspaces.models import WorkspaceMember

        other = get_user_model().objects.create_user(
            username="other", email="o@e.test", password="pass",
        )
        WorkspaceMember.objects.create(
            workspace=workspace, user=other, role=WorkspaceMember.Role.MEMBER,
        )
        event = CalendarEvent.objects.create(
            workspace=workspace,
            title="Mine",
            start_at="2026-07-02T14:00:00Z",
            end_at="2026-07-02T15:00:00Z",
            created_by=api_client.handler._force_user,
        )
        api_client.force_authenticate(user=other)
        resp = api_client.patch(
            reverse(self.URL_NAME, args=[workspace.slug, event.id]),
            {"title": "Hacked"},
            format="json",
        )
        assert resp.status_code == 403

    def test_404(self, api_client, workspace):
        resp = api_client.get(
            reverse(
                self.URL_NAME,
                args=[workspace.slug, "00000000-0000-0000-0000-000000000000"],
            ),
        )
        assert resp.status_code == 404

    def test_requires_auth(self, api_client, workspace):
        from apps.calendars.models import CalendarEvent

        event = CalendarEvent.objects.create(
            workspace=workspace,
            title="Secured",
            start_at="2026-07-02T14:00:00Z",
            end_at="2026-07-02T15:00:00Z",
            created_by=api_client.handler._force_user,
        )
        api_client.force_authenticate(user=None)
        resp = api_client.get(
            reverse(self.URL_NAME, args=[workspace.slug, event.id]),
        )
        assert resp.status_code == 401


# ── Presentation (public) ────────────────────────────────────────────────────


class TestPresentationView:
    URL_NAME = "present-event-list"

    def test_public_events_visible(self, api_client, workspace):
        from apps.calendars.models import CalendarEvent

        CalendarEvent.objects.create(
            workspace=workspace,
            title="Public Event",
            start_at="2026-07-02T14:00:00Z",
            end_at="2026-07-02T15:00:00Z",
            visibility=CalendarEvent.Visibility.PUBLIC,
            created_by=api_client.handler._force_user,
        )
        CalendarEvent.objects.create(
            workspace=workspace,
            title="Private Event",
            start_at="2026-07-02T14:00:00Z",
            end_at="2026-07-02T15:00:00Z",
            visibility=CalendarEvent.Visibility.PRIVATE,
            created_by=api_client.handler._force_user,
        )
        # No auth → public only
        resp = api_client.get(reverse(self.URL_NAME, args=[workspace.slug]))
        assert resp.status_code == 200
        titles = [e["title"] for e in resp.json()]
        assert "Public Event" in titles
        assert "Private Event" not in titles
