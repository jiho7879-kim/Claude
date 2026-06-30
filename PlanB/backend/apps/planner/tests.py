"""Tests for apps.planner — DailyEntry / TimeBlock / Habit / HabitLog / WeeklyReview.

Covers: CRUD for every view, date-based get-or-create, unique-together constraints,
habit streak/logged_today serialized fields, week-scoped entry queries,
and toggle-style habit logging.
"""

from datetime import date, timedelta

import pytest
from django.urls import reverse


pytestmark = pytest.mark.django_db


# ── DailyEntry ─────────────────────────────────────────────────────────────────

class TestDailyEntryListCreate:
    URL_NAME = "planner-entry-list"

    def test_list_empty(self, api_client, workspace):
        resp = api_client.get(reverse(self.URL_NAME, args=[workspace.slug]))
        assert resp.status_code == 200
        assert resp.json() == []

    def test_create_with_date(self, api_client, workspace):
        resp = api_client.post(
            reverse(self.URL_NAME, args=[workspace.slug]),
            {"date": str(date.today()), "mood": "good", "energy": 7},
            format="json",
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["mood"] == "good"
        assert data["energy"] == 7

    def test_get_or_create_idempotent(self, api_client, workspace):
        url = reverse(self.URL_NAME, args=[workspace.slug])
        data = {"date": str(date.today()), "mood": "great", "energy": 9}
        api_client.post(url, data, format="json")
        resp = api_client.post(url, {"date": str(date.today()), "journal": "Updated"}, format="json")
        assert resp.status_code == 201
        assert resp.json()["journal"] == "Updated"
        assert resp.json()["mood"] == "great"  # original value preserved (get_or_create uses defaults only once)

    def test_create_with_emotion_tags_and_gratitude(self, api_client, workspace):
        resp = api_client.post(
            reverse(self.URL_NAME, args=[workspace.slug]),
            {"date": str(date.today()), "emotion_tags": ["happy", "tired"], "gratitude": ["family", "health"]},
            format="json",
        )
        assert resp.status_code == 201
        assert resp.json()["emotion_tags"] == ["happy", "tired"]
        assert resp.json()["gratitude"] == ["family", "health"]


class TestDailyEntryDetail:
    URL_NAME = "planner-entry-detail"
    LIST_URL = "planner-entry-list"

    def test_get_by_date(self, api_client, workspace):
        api_client.post(
            reverse(self.LIST_URL, args=[workspace.slug]),
            {"date": str(date.today()), "journal": "Hello"},
            format="json",
        )
        resp = api_client.get(reverse(self.URL_NAME, args=[workspace.slug, str(date.today())]))
        assert resp.status_code == 200
        assert resp.json()["journal"] == "Hello"

    def test_get_or_create_on_patch(self, api_client, workspace):
        resp = api_client.patch(
            reverse(self.URL_NAME, args=[workspace.slug, str(date.today())]),
            {"mood": "great"},
            format="json",
        )
        assert resp.status_code == 200
        assert resp.json()["mood"] == "great"

    def test_404_for_nonexistent(self, api_client, workspace):
        resp = api_client.get(reverse(self.URL_NAME, args=[workspace.slug, "2099-12-31"]))
        assert resp.status_code == 404


# ── TimeBlock ──────────────────────────────────────────────────────────────────

class TestTimeBlock:
    LIST_URL = "planner-block-list"
    DETAIL_URL = "planner-block-detail"

    def test_create_and_list(self, api_client, workspace):
        today_str = str(date.today())
        resp = api_client.post(
            reverse(self.LIST_URL, args=[workspace.slug, today_str]),
            {"title": "Deep work", "category": "work", "start_time": "09:00", "end_time": "11:00"},
            format="json",
        )
        assert resp.status_code == 201
        assert resp.json()["title"] == "Deep work"

        resp = api_client.get(reverse(self.LIST_URL, args=[workspace.slug, today_str]))
        assert len(resp.json()) == 1

    def test_order_default(self, api_client, workspace):
        today_str = str(date.today())
        api_client.post(reverse(self.LIST_URL, args=[workspace.slug, today_str]), {"title": "A"}, format="json")
        api_client.post(reverse(self.LIST_URL, args=[workspace.slug, today_str]), {"title": "B"}, format="json")
        resp = api_client.get(reverse(self.LIST_URL, args=[workspace.slug, today_str]))
        assert len(resp.json()) == 2

    def test_patch_done(self, api_client, workspace):
        today_str = str(date.today())
        create_resp = api_client.post(
            reverse(self.LIST_URL, args=[workspace.slug, today_str]),
            {"title": "Read"},
            format="json",
        )
        block_id = create_resp.json()["id"]
        resp = api_client.patch(
            reverse(self.DETAIL_URL, args=[workspace.slug, today_str, block_id]),
            {"is_done": True},
            format="json",
        )
        assert resp.json()["is_done"] is True

    def test_delete(self, api_client, workspace):
        today_str = str(date.today())
        create_resp = api_client.post(
            reverse(self.LIST_URL, args=[workspace.slug, today_str]),
            {"title": "Delete me"},
            format="json",
        )
        block_id = create_resp.json()["id"]
        resp = api_client.delete(reverse(self.DETAIL_URL, args=[workspace.slug, today_str, block_id]))
        assert resp.status_code == 204


# ── Habit ──────────────────────────────────────────────────────────────────────

class TestHabit:
    LIST_URL = "planner-habit-list"
    DETAIL_URL = "planner-habit-detail"

    def test_create_and_list(self, api_client, workspace, user):
        resp = api_client.post(
            reverse(self.LIST_URL, args=[workspace.slug]),
            {"name": "Morning run", "color": "#ff6600"},
            format="json",
        )
        assert resp.status_code == 201
        assert resp.json()["name"] == "Morning run"
        assert resp.json()["streak"] == 0
        assert resp.json()["logged_today"] is False

        resp = api_client.get(reverse(self.LIST_URL, args=[workspace.slug]))
        assert len(resp.json()) == 1

    def test_soft_delete(self, api_client, workspace):
        create_resp = api_client.post(
            reverse(self.LIST_URL, args=[workspace.slug]),
            {"name": "Read"},
            format="json",
        )
        hid = create_resp.json()["id"]
        api_client.delete(reverse(self.DETAIL_URL, args=[workspace.slug, hid]))
        # Should be soft-deleted (is_active=False)
        from apps.planner.models import Habit
        assert Habit.objects.filter(id=hid, is_active=False).exists()

    def test_streak_calculation(self, api_client, workspace, user):
        from apps.planner.models import Habit, HabitLog

        create_resp = api_client.post(
            reverse(self.LIST_URL, args=[workspace.slug]),
            {"name": "Write"},
            format="json",
        )
        hid = create_resp.json()["id"]
        habit = Habit.objects.get(id=hid)
        for i in range(3):
            d = date.today() - timedelta(days=i)
            HabitLog.objects.create(habit=habit, date=d, is_done=True)

        resp = api_client.get(reverse(self.LIST_URL, args=[workspace.slug]))
        habit_data = [h for h in resp.json() if h["name"] == "Write"][0]
        assert habit_data["streak"] >= 3


# ── HabitLog ───────────────────────────────────────────────────────────────────

class TestHabitLog:
    TOGGLE_URL = "planner-habit-log"
    RANGE_URL = "planner-habit-logs"

    @pytest.fixture
    def habit(self, api_client, workspace):
        resp = api_client.post(
            reverse("planner-habit-list", args=[workspace.slug]),
            {"name": "Exercise"},
            format="json",
        )
        return resp.json()

    def test_toggle_on(self, api_client, workspace, habit):
        resp = api_client.post(
            reverse(self.TOGGLE_URL, args=[workspace.slug, habit["id"]]),
            {"date": str(date.today())},
            format="json",
        )
        assert resp.status_code == 200
        assert resp.json()["logged"] is True

    def test_toggle_off(self, api_client, workspace, habit):
        url = reverse(self.TOGGLE_URL, args=[workspace.slug, habit["id"]])
        api_client.post(url, {"date": str(date.today())}, format="json")
        resp = api_client.post(url, {"date": str(date.today())}, format="json")
        assert resp.json()["logged"] is False

    def test_log_range(self, api_client, workspace, habit):
        url = reverse(self.TOGGLE_URL, args=[workspace.slug, habit["id"]])
        for i in range(5):
            api_client.post(url, {"date": str(date.today() - timedelta(days=i))}, format="json")
        resp = api_client.get(
            reverse(self.RANGE_URL, args=[workspace.slug, habit["id"]]),
            {"start": str(date.today() - timedelta(days=2)), "end": str(date.today())},
        )
        assert len(resp.json()) >= 3


# ── Week Entries ───────────────────────────────────────────────────────────────

class TestWeekEntries:
    URL_NAME = "planner-week-entries"

    def test_week_entries(self, api_client, workspace, user):
        from apps.planner.models import DailyEntry

        monday = date(2026, 6, 29)
        DailyEntry.objects.create(user=user, workspace=workspace, date=monday, journal="Week start")
        DailyEntry.objects.create(user=user, workspace=workspace, date=monday + timedelta(days=2), journal="Midweek")
        resp = api_client.get(
            reverse(self.URL_NAME, args=[workspace.slug, 2026, 27]),
        )
        assert resp.status_code == 200
        assert len(resp.json()) == 2


class TestWeeklyReview:
    URL_NAME = "planner-week-review"

    def test_get_empty(self, api_client, workspace):
        resp = api_client.get(reverse(self.URL_NAME, args=[workspace.slug, 2026, 27]))
        assert resp.status_code == 200
        assert resp.json() == {}

    def test_create_on_patch(self, api_client, workspace):
        resp = api_client.patch(
            reverse(self.URL_NAME, args=[workspace.slug, 2026, 27]),
            {"went_well": "Completed project", "next_focus": "Review"},
            format="json",
        )
        assert resp.status_code == 200
        assert resp.json()["went_well"] == "Completed project"

    def test_unique_per_user_workspace_week(self, api_client, workspace):
        """Patching same year/week twice should upsert, not duplicate."""
        url = reverse(self.URL_NAME, args=[workspace.slug, 2026, 27])
        api_client.patch(url, {"went_well": "A"}, format="json")
        api_client.patch(url, {"went_well": "B"}, format="json")
        from apps.planner.models import WeeklyReview
        assert WeeklyReview.objects.filter(year=2026, week=27).count() == 1
