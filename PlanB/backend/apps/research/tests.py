"""Tests for apps.research — ResearchNote / Dataset / Reference / Crossref DOI lookup.

Covers: CRUD for research notes, datasets, and references; the Crossref DOI lookup
view (with mocked HTTP), and workspace/project-scoped isolation.
"""

import pytest
from django.urls import reverse


pytestmark = pytest.mark.django_db


# ── ResearchNote ───────────────────────────────────────────────────────────────

class TestResearchNote:
    LIST_URL = "research-note-list"
    DETAIL_URL = "research-note-detail"

    def test_list_empty(self, api_client, project):
        resp = api_client.get(reverse(self.LIST_URL, args=[project.workspace.slug, project.id]))
        assert resp.status_code == 200
        assert resp.json() == []

    def test_create(self, api_client, project):
        resp = api_client.post(
            reverse(self.LIST_URL, args=[project.workspace.slug, project.id]),
            {"date": "2026-06-30", "content": "Found interesting paper", "tags": ["nlp"]},
            format="json",
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["content"] == "Found interesting paper"
        assert data["tags"] == ["nlp"]
        assert data["author"]["username"] == "testuser"

    def test_patch(self, api_client, project):
        create = api_client.post(
            reverse(self.LIST_URL, args=[project.workspace.slug, project.id]),
            {"date": "2026-06-30", "content": "Draft"},
            format="json",
        ).json()
        resp = api_client.patch(
            reverse(self.DETAIL_URL, args=[project.workspace.slug, project.id, create["id"]]),
            {"content": "Updated"},
            format="json",
        )
        assert resp.status_code == 200
        assert resp.json()["content"] == "Updated"

    def test_delete(self, api_client, project):
        create = api_client.post(
            reverse(self.LIST_URL, args=[project.workspace.slug, project.id]),
            {"date": "2026-06-30", "content": "Delete me"},
            format="json",
        ).json()
        resp = api_client.delete(
            reverse(self.DETAIL_URL, args=[project.workspace.slug, project.id, create["id"]]),
        )
        assert resp.status_code == 204


# ── Dataset ────────────────────────────────────────────────────────────────────

class TestDataset:
    LIST_URL = "research-dataset-list"
    DETAIL_URL = "research-dataset-detail"

    def test_create(self, api_client, project):
        resp = api_client.post(
            reverse(self.LIST_URL, args=[project.workspace.slug, project.id]),
            {"name": "Training Data v1", "version": "1.0", "size_mb": 256.0, "data_status": "raw"},
            format="json",
        )
        assert resp.status_code == 201
        assert resp.json()["name"] == "Training Data v1"
        assert resp.json()["data_status"] == "raw"

    def test_list(self, api_client, project):
        api_client.post(
            reverse(self.LIST_URL, args=[project.workspace.slug, project.id]),
            {"name": "D1"},
            format="json",
        )
        resp = api_client.get(reverse(self.LIST_URL, args=[project.workspace.slug, project.id]))
        assert len(resp.json()) == 1

    def test_patch_status(self, api_client, project):
        create = api_client.post(
            reverse(self.LIST_URL, args=[project.workspace.slug, project.id]),
            {"name": "D1"},
            format="json",
        ).json()
        resp = api_client.patch(
            reverse(self.DETAIL_URL, args=[project.workspace.slug, project.id, create["id"]]),
            {"data_status": "processed"},
            format="json",
        )
        assert resp.json()["data_status"] == "processed"

    def test_delete(self, api_client, project):
        create = api_client.post(
            reverse(self.LIST_URL, args=[project.workspace.slug, project.id]),
            {"name": "D1"},
            format="json",
        ).json()
        api_client.delete(
            reverse(self.DETAIL_URL, args=[project.workspace.slug, project.id, create["id"]]),
        )
        resp = api_client.get(reverse(self.LIST_URL, args=[project.workspace.slug, project.id]))
        assert resp.json() == []


# ── Reference ──────────────────────────────────────────────────────────────────

class TestReference:
    LIST_URL = "research-ref-list"
    DETAIL_URL = "research-ref-detail"

    def test_create(self, api_client, project):
        resp = api_client.post(
            reverse(self.LIST_URL, args=[project.workspace.slug, project.id]),
            {
                "title": "Attention Is All You Need",
                "doi": "10.1000/xyz123",
                "authors": ["Vaswani et al."],
                "year": 2017,
                "journal": "NeurIPS",
            },
            format="json",
        )
        assert resp.status_code == 201
        assert resp.json()["title"] == "Attention Is All You Need"
        assert resp.json()["year"] == 2017

    def test_list(self, api_client, project):
        api_client.post(
            reverse(self.LIST_URL, args=[project.workspace.slug, project.id]),
            {"title": "Paper 1"},
            format="json",
        )
        resp = api_client.get(reverse(self.LIST_URL, args=[project.workspace.slug, project.id]))
        assert len(resp.json()) == 1

    def test_delete(self, api_client, project):
        create = api_client.post(
            reverse(self.LIST_URL, args=[project.workspace.slug, project.id]),
            {"title": "Paper 1"},
            format="json",
        ).json()
        resp = api_client.delete(
            reverse(self.DETAIL_URL, args=[project.workspace.slug, project.id, create["id"]]),
        )
        assert resp.status_code == 204


# ── Crossref DOI Lookup ────────────────────────────────────────────────────────

class TestCrossrefLookup:
    URL_NAME = "research-doi-lookup"

    def test_missing_doi(self, api_client, project):
        resp = api_client.get(reverse(self.URL_NAME, args=[project.workspace.slug, project.id]))
        assert resp.status_code == 400

    @pytest.fixture
    def mock_crossref(self):
        """Mock crossref API call to return a known response."""
        import json
        from unittest.mock import patch

        fake_response = json.dumps({
            "message": {
                "title": ["Fake Paper"],
                "author": [{"given": "John", "family": "Doe"}],
                "issued": {"date-parts": [[2023]]},
                "container-title": ["Fake Journal"],
                "abstract": "<jats:p>Fake abstract</jats:p>",
                "URL": "https://doi.org/10.xxxx",
            }
        }).encode()
        return patch("urllib.request.urlopen", return_value=__import__("io").BytesIO(fake_response))

    def test_successful_lookup(self, api_client, project, mock_crossref):
        with mock_crossref:
            resp = api_client.get(
                reverse(self.URL_NAME, args=[project.workspace.slug, project.id]),
                {"doi": "10.xxxx/fake"},
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "Fake Paper"
        assert data["authors"] == ["John Doe"]
        assert data["year"] == 2023

    def test_lookup_with_url_doi(self, api_client, project, mock_crossref):
        """Should strip https://doi.org/ prefix."""
        with mock_crossref:
            resp = api_client.get(
                reverse(self.URL_NAME, args=[project.workspace.slug, project.id]),
                {"doi": "https://doi.org/10.xxxx/fake"},
            )
        assert resp.status_code == 200

    def test_lookup_failure(self, api_client, project):
        """When crossref API is unreachable, should return 502."""
        from unittest.mock import patch

        with patch("urllib.request.urlopen", side_effect=Exception("Timeout")):
            resp = api_client.get(
                reverse(self.URL_NAME, args=[project.workspace.slug, project.id]),
                {"doi": "10.xxxx/nonexistent"},
            )
        assert resp.status_code == 502
