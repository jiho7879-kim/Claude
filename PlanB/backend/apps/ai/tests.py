"""Tests for apps.ai — AI views and utilities.

Covers: _extract_json, AI fallback chain (_gemini → _try_gemini → _try_deepseek),
error handling (402/429/503), chat action execution, and each view endpoint.
"""

import json
from unittest.mock import patch

import pytest
from django.urls import reverse


# ── _extract_json (pure function, no DB) ──────────────────────────────────────

class TestExtractJson:
    """_extract_json robustly extracts JSON objects from raw LLM output."""

    def test_plain_json_object(self):
        from apps.ai.views import _extract_json

        result = _extract_json('{"title": "hello", "count": 3}')
        assert result == {"title": "hello", "count": 3}

    def test_markdown_code_fence(self):
        from apps.ai.views import _extract_json

        raw = "```\n{\"title\": \"test\"}\n```"
        assert _extract_json(raw) == {"title": "test"}

    def test_markdown_fence_with_json_lang(self):
        from apps.ai.views import _extract_json

        raw = "```json\n{\"key\": \"value\"}\n```"
        assert _extract_json(raw) == {"key": "value"}

    def test_embedded_in_surrounding_text(self):
        from apps.ai.views import _extract_json

        raw = "Here is the result:\n{\"status\": \"ok\"}\n\nRegards."
        assert _extract_json(raw) == {"status": "ok"}

    def test_array_json_returns_list(self):
        """_extract_json returns a list when the input is a valid JSON array.
        The caller (chat view) checks isinstance(result, dict) and falls back gracefully."""
        from apps.ai.views import _extract_json

        assert _extract_json("[1, 2, 3]") == [1, 2, 3]

    def test_invalid_json_returns_none(self):
        from apps.ai.views import _extract_json

        assert _extract_json("not json at all") is None

    def test_empty_string_returns_none(self):
        from apps.ai.views import _extract_json

        assert _extract_json("") is None

    def test_extract_first_object_when_multiple(self):
        """When there are multiple {} blocks, return the first complete one (non-greedy match)."""
        from apps.ai.views import _extract_json

        raw = '{"first": 1} discarded {"second": 2}'
        assert _extract_json(raw) == {"first": 1}


# ── AI fallback chain (_gemini → _try_gemini → _try_deepseek) ────────────────

class TestGeminiFallback:
    """_gemini chains Gemini → DeepSeek with require_json passthrough."""

    def test_gemini_succeeds_deepseek_not_called(self):
        """When Gemini succeeds, DeepSeek should never be called."""
        from apps.ai.views import _gemini

        with (
            patch("apps.ai.views._try_gemini", return_value=("text", "gemini-3.5-flash")) as mock_g,
            patch("apps.ai.views._try_deepseek") as mock_d,
        ):
            result, label = _gemini("hello")

        assert result == "text"
        assert "Gemini" in label
        mock_g.assert_called_once()
        mock_d.assert_not_called()

    def test_gemini_fails_deepseek_fallback(self):
        """When Gemini raises, DeepSeek should be called as fallback."""
        from apps.ai.views import _gemini

        with (
            patch("apps.ai.views._try_gemini", side_effect=RuntimeError("Gemini down")) as mock_g,
            patch("apps.ai.views._try_deepseek", return_value=("ds text", "deepseek-v4-flash")) as mock_d,
        ):
            result, label = _gemini("hello")

        assert result == "ds text"
        assert label == "DeepSeek V4 Flash"
        mock_g.assert_called_once()
        mock_d.assert_called_once()

    def test_both_fail_raises_runtime_error(self):
        """When both Gemini and DeepSeek fail, should raise RuntimeError."""
        from apps.ai.views import _gemini

        with (
            patch("apps.ai.views._try_gemini", side_effect=RuntimeError("G err")),
            patch("apps.ai.views._try_deepseek", side_effect=RuntimeError("DS err")),
        ):
            with pytest.raises(RuntimeError) as exc:
                _gemini("hello")

        assert "G err" in str(exc.value)
        assert "DS err" in str(exc.value)

    def test_require_json_passed_to_gemini(self):
        """require_json=True should be forwarded to _try_gemini."""
        from apps.ai.views import _gemini

        with patch("apps.ai.views._try_gemini", return_value=("{}", "gemini-3.5-flash")) as mock_g:
            _gemini("hello", require_json=True)

        _call = mock_g.call_args
        # _try_gemini is called with (prompt, system, require_json=True)
        assert _call[1].get("require_json") is True

    def test_require_json_passed_to_deepseek_on_fallback(self):
        """require_json=True should be forwarded to _try_deepseek during fallback."""
        from apps.ai.views import _gemini

        with (
            patch("apps.ai.views._try_gemini", side_effect=RuntimeError("G err")),
            patch("apps.ai.views._try_deepseek", return_value=("{}", "deepseek-v4-flash")) as mock_d,
        ):
            _gemini("hello", require_json=True)

        assert mock_d.call_args[1].get("require_json") is True


# ── DeepSeek error handling (patch at import source, not module attr) ────────

class TestDeepSeekErrorHandling:
    """_try_deepseek should produce user-friendly messages for known error codes."""

    # _try_deepseek imports OpenAI lazily inside the function, so we patch
    # the openai module before calling the function.
    DEEPSEEK_PATCH = "openai.OpenAI"

    def _run_with_error(self, error_message: str) -> str:
        """Helper: run _try_deepseek with a simulated OpenAI error and return the error string."""
        from apps.ai.views import _try_deepseek

        with (
            patch(self.DEEPSEEK_PATCH) as mock_openai,
            patch("apps.ai.views.os.environ.get", return_value="sk-test-key"),
        ):
            client_instance = mock_openai.return_value
            client_instance.chat.completions.create.side_effect = RuntimeError(error_message)

            with pytest.raises(RuntimeError) as exc:
                _try_deepseek("prompt", "system")
            return str(exc.value)

    def test_402_insufficient_balance(self):
        """402 error should mention '요금이 부족' in Korean."""
        err_msg = self._run_with_error(
            "Error code: 402 - {'error': {'message': 'Insufficient Balance'}}"
        )
        assert "요금이 부족" in err_msg

    def test_429_rate_limit(self):
        """429 error should mention 'Rate Limit' in the message."""
        err_msg = self._run_with_error("429 Too Many Requests")
        assert "Rate Limit" in err_msg

    def test_generic_error_fallback(self):
        """Non-402/429 errors should produce 'DeepSeek API 오류' message."""
        err_msg = self._run_with_error("Connection refused")
        assert "DeepSeek API 오류" in err_msg

    def test_no_api_key(self):
        """Missing API key should raise early with clear message."""
        from apps.ai.views import _try_deepseek

        with patch("apps.ai.views.os.environ.get", return_value=""):
            with pytest.raises(ValueError, match="DEEPSEEK_API_KEY"):
                _try_deepseek("prompt", "system")


# ── Gemini error handling (patch at import source, not module attr) ──────────

class TestGeminiErrorHandling:
    """_try_gemini should handle 503 like 429 (skip remaining models)."""

    GEMINI_PATCH = "google.genai.Client"

    def test_503_skips_remaining_models(self):
        """503 should break the model loop, same as 429, and raise the last error."""
        from apps.ai.views import _try_gemini

        with (
            patch(self.GEMINI_PATCH) as mock_client_cls,
            patch("apps.ai.views.os.environ.get", return_value="test-key"),
        ):
            client_instance = mock_client_cls.return_value
            client_instance.models.generate_content.side_effect = [
                RuntimeError("503 UNAVAILABLE. Model is overloaded."),
            ]

            with pytest.raises(RuntimeError):
                _try_gemini("prompt", "system")

            # Only one model attempt because 503 breaks the loop
            assert client_instance.models.generate_content.call_count == 1

    def test_no_api_key(self):
        """Missing API key should raise early."""
        from apps.ai.views import _try_gemini

        with patch("apps.ai.views.os.environ.get", return_value=""):
            with pytest.raises(ValueError, match="GEMINI_API_KEY"):
                _try_gemini("prompt", "system")


# ── Chat action execution ────────────────────────────────────────────────────

class TestChatActions:
    """Chat view should execute actions returned by the AI."""

    CHAT_URL = "ai-chat"

    @pytest.fixture
    def mock_gemini(self):
        """Patch execute_agent to return a canned JSON response with the given actions."""
        def _make_response(action_list):
            payload = json.dumps({"reply": "Done.", "actions": action_list}, default=str)
            return patch("apps.ai.views.execute_agent", return_value=(payload, "Gemini 3 5 Flash"))
        return _make_response

    def test_create_task(self, api_client, workspace, project, mock_gemini):
        with mock_gemini([
            {"type": "create_task", "project_id": str(project.id), "title": "New Task", "priority": "high"},
        ]):
            resp = api_client.post(
                reverse(self.CHAT_URL, args=[workspace.slug]),
                {"message": "Add a task"},
                format="json",
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["model"] == "Gemini 3 5 Flash"
        assert len(data["actions"]) == 1
        assert data["actions"][0]["type"] == "create_task"
        assert "New Task" in data["actions"][0]["label"]

    def test_create_note(self, api_client, workspace, mock_gemini):
        with mock_gemini([
            {"type": "create_note", "title": "Test Note", "content": "# Hello", "tags": ["test"]},
        ]):
            resp = api_client.post(
                reverse(self.CHAT_URL, args=[workspace.slug]),
                {"message": "Save a note"},
                format="json",
            )

        assert resp.status_code == 200
        data = resp.json()
        assert len(data["actions"]) == 1
        assert data["actions"][0]["type"] == "create_note"

    def test_create_time_block(self, api_client, workspace, mock_gemini):
        with mock_gemini([
            {"type": "create_time_block", "title": "Meeting", "category": "work"},
        ]):
            resp = api_client.post(
                reverse(self.CHAT_URL, args=[workspace.slug]),
                {"message": "Add to planner"},
                format="json",
            )

        assert resp.status_code == 200
        data = resp.json()
        assert len(data["actions"]) == 1
        assert data["actions"][0]["type"] == "create_time_block"

    def test_create_event(self, api_client, workspace, mock_gemini):
        """Real DB create — no patching needed, just like test_create_time_block."""
        with mock_gemini([
            {"type": "create_event", "title": "Team Sync",
             "start_at": "2026-07-01T09:00:00", "end_at": "2026-07-01T10:00:00"},
        ]):
            resp = api_client.post(
                reverse(self.CHAT_URL, args=[workspace.slug]),
                {"message": "Schedule a meeting"},
                format="json",
            )

        assert resp.status_code == 200
        data = resp.json()
        assert len(data["actions"]) == 1
        assert data["actions"][0]["type"] == "create_event"

    def test_update_note(self, api_client, workspace, mock_gemini):
        from apps.notes.models import Note

        note = Note.objects.create(
            workspace=workspace,
            user=api_client.handler._force_user,
            title="Old Title",
            content="Old content",
        )
        with mock_gemini([
            {"type": "update_note", "note_id": str(note.id), "title": "New Title", "content": "New content"},
        ]):
            resp = api_client.post(
                reverse(self.CHAT_URL, args=[workspace.slug]),
                {"message": "Update the note"},
                format="json",
            )

        assert resp.status_code == 200
        data = resp.json()
        assert len(data["actions"]) == 1
        assert data["actions"][0]["type"] == "update_note"
        note.refresh_from_db()
        assert note.title == "New Title"

    def test_nonexistent_note_update_ignored(self, api_client, workspace, mock_gemini):
        """Updating a non-existent note should be silently ignored (no crash)."""
        with mock_gemini([
            {"type": "update_note", "note_id": "00000000-0000-0000-0000-000000000000"},
        ]):
            resp = api_client.post(
                reverse(self.CHAT_URL, args=[workspace.slug]),
                {"message": "Update missing note"},
                format="json",
            )

        assert resp.status_code == 200
        data = resp.json()
        assert len(data["actions"]) == 0  # action silently skipped

    def test_ai_returns_non_json(self, api_client, workspace):
        """When AI returns non-JSON, the chat view should fall back to raw reply."""
        with patch("apps.ai.views.execute_agent", return_value=("Plain text response.", "Gemini 3 5 Flash")):
            resp = api_client.post(
                reverse(self.CHAT_URL, args=[workspace.slug]),
                {"message": "Hi"},
                format="json",
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["reply"] == "Plain text response."
        assert data["actions"] == []


# ── View endpoint tests ───────────────────────────────────────────────────────

class TestChatEndpoint:
    """Basic HTTP-level tests for chat endpoint."""

    def test_unauthenticated(self, workspace):
        resp = _anon_client().post(
            reverse("ai-chat", args=[workspace.slug]),
            {"message": "hello"},
            format="json",
        )
        assert resp.status_code in (401, 403)

    def test_missing_message(self, api_client, workspace):
        resp = api_client.post(
            reverse("ai-chat", args=[workspace.slug]),
            {"message": ""},
            format="json",
        )
        assert resp.status_code == 400
        assert "error" in resp.json()

    def test_nonexistent_workspace(self, api_client):
        resp = api_client.post(
            reverse("ai-chat", args=["no-such-workspace"]),
            {"message": "hello"},
            format="json",
        )
        assert resp.status_code == 404


class TestNlTaskEndpoint:
    """Natural language → task parsing endpoint."""

    URL_NAME = "ai-nl-task"

    def test_missing_text(self, api_client, workspace):
        resp = api_client.post(
            reverse(self.URL_NAME, args=[workspace.slug]),
            {"text": ""},
            format="json",
        )
        assert resp.status_code == 400

    def test_success_path(self, api_client, workspace):
        with patch("apps.ai.views.execute_agent", return_value=(
            '{"title": "Buy milk", "priority": "medium", "due_date": null, "notes": ""}',
            "Gemini 3 5 Flash",
        )):
            resp = api_client.post(
                reverse(self.URL_NAME, args=[workspace.slug]),
                {"text": "Buy milk"},
                format="json",
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["task"]["title"] == "Buy milk"
        assert data["task"]["priority"] == "medium"


class TestWeeklySummaryEndpoint:
    """Weekly summary generation endpoint."""

    def test_success(self, api_client, workspace):
        with patch("apps.ai.views.execute_agent", return_value=("It was a good week.", "Gemini 3 5 Flash")):
            resp = api_client.get(
                reverse("ai-weekly-summary", args=[workspace.slug]),
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["summary"] == "It was a good week."
        assert "stats" in data

    def test_gemini_failure_fallback(self, api_client, workspace):
        """When Gemini returns empty, fallback to computed stats."""
        with patch("apps.ai.views.execute_agent", return_value=("", "Gemini 3 5 Flash")):
            resp = api_client.get(
                reverse("ai-weekly-summary", args=[workspace.slug]),
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["summary"]  # fallback summary (not empty)
        assert "stats" in data


class TestDailyInsightEndpoint:
    """Daily insight endpoint."""

    def test_success(self, api_client, workspace):
        with patch("apps.ai.views.execute_agent", return_value=("Today's insight", "Gemini 3 5 Flash")):
            resp = api_client.get(
                reverse("ai-daily-insight", args=[workspace.slug]),
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["insight"] == "Today's insight"


class TestNoteAiAction:
    """Note AI action endpoint (organize / expand / suggest_tags)."""

    @pytest.fixture
    def note(self, workspace, user, db):
        from apps.notes.models import Note

        return Note.objects.create(
            workspace=workspace,
            user=user,
            title="Test Note",
            content="Some content here.",
        )

    def test_organize(self, api_client, workspace, note):
        with patch("apps.ai.views.execute_agent", return_value=("## Organized\nContent", "Gemini 3 5 Flash")):
            resp = api_client.post(
                reverse("ai-note-action", args=[workspace.slug, note.id]),
                {"action": "organize"},
                format="json",
            )

        assert resp.status_code == 200
        assert resp.json()["content"] == "## Organized\nContent"

    def test_suggest_tags_with_require_json(self, api_client, workspace, note):
        """suggest_tags should call execute_agent with agent='classify'."""
        with patch("apps.ai.views.execute_agent", return_value=('["tag1", "tag2"]', "Gemini 3 5 Flash")) as mock_g:
            resp = api_client.post(
                reverse("ai-note-action", args=[workspace.slug, note.id]),
                {"action": "suggest_tags"},
                format="json",
            )

        assert resp.status_code == 200
        assert resp.json()["tags"] == ["tag1", "tag2"]
        # Verify classify agent was used (handles require_json internally)
        assert mock_g.call_args[0][0] == "classify"

    def test_suggest_tags_parse_failure(self, api_client, workspace, note):
        """When Gemini returns unparseable output for suggest_tags, return empty list."""
        with patch("apps.ai.views.execute_agent", return_value=("not json", "Gemini 3 5 Flash")):
            resp = api_client.post(
                reverse("ai-note-action", args=[workspace.slug, note.id]),
                {"action": "suggest_tags"},
                format="json",
            )

        assert resp.status_code == 200
        assert resp.json()["tags"] == []


# ── Helper ────────────────────────────────────────────────────────────────────

def _anon_client():
    from rest_framework.test import APIClient
    return APIClient()
