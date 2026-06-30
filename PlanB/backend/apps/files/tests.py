"""Tests for apps.files — FileAttachment upload / download / delete / list."""

import io

import pytest
from django.urls import reverse
from PIL import Image


pytestmark = pytest.mark.django_db


def _png_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (1, 1), color="red").save(buf, format="PNG")
    return buf.getvalue()


class TestFileUpload:
    URL_NAME = "file-upload"

    def test_upload_image(self, api_client, workspace):
        png = _png_bytes()
        resp = api_client.post(
            reverse(self.URL_NAME, args=[workspace.slug]),
            {"file": io.BytesIO(png), "format": "png"},
            format="multipart",
        )
        assert resp.status_code == 201
        data = resp.json()
        assert len(data) == 1
        assert data[0]["size_bytes"] == len(png)
        assert data[0]["uploaded_by_name"] == "testuser"

    def test_upload_multiple_files(self, api_client, workspace):
        resp = api_client.post(
            reverse(self.URL_NAME, args=[workspace.slug]),
            {"file": [io.BytesIO(b"file1"), io.BytesIO(b"file2")]},
            format="multipart",
        )
        assert resp.status_code == 201
        assert len(resp.json()) == 2

    def test_upload_no_file(self, api_client, workspace):
        resp = api_client.post(reverse(self.URL_NAME, args=[workspace.slug]), {}, format="multipart")
        assert resp.status_code == 400

    def test_upload_requires_auth(self, workspace):
        from rest_framework.test import APIClient

        resp = APIClient().post(
            reverse(self.URL_NAME, args=[workspace.slug]),
            {"file": io.BytesIO(b"test")},
            format="multipart",
        )
        assert resp.status_code in (401, 403)

    def test_upload_wrong_workspace(self, api_client):
        resp = api_client.post(
            reverse(self.URL_NAME, args=["nonexistent"]),
            {"file": io.BytesIO(b"test")},
            format="multipart",
        )
        assert resp.status_code == 404


class TestFileDetail:
    URL_NAME = "file-upload"
    DETAIL_URL = "file-detail"

    @pytest.fixture
    def uploaded(self, api_client, workspace):
        resp = api_client.post(
            reverse(self.URL_NAME, args=[workspace.slug]),
            {"file": io.BytesIO(b"content")},
            format="multipart",
        )
        return resp.json()[0]

    def test_download(self, api_client, workspace, uploaded):
        resp = api_client.get(reverse(self.DETAIL_URL, args=[workspace.slug, uploaded["id"]]))
        assert resp.status_code == 200
        assert resp["Content-Disposition"]

    def test_delete(self, api_client, workspace, uploaded):
        resp = api_client.delete(reverse(self.DETAIL_URL, args=[workspace.slug, uploaded["id"]]))
        assert resp.status_code == 204

    def test_download_other_users_file_404(self, api_client, workspace, uploaded):
        from django.contrib.auth import get_user_model
        from rest_framework.test import APIClient

        other = get_user_model().objects.create_user(username="other", password="p@ss")
        other_client = APIClient()
        other_client.force_authenticate(user=other)
        resp = other_client.get(reverse(self.DETAIL_URL, args=[workspace.slug, uploaded["id"]]))
        assert resp.status_code == 404


class TestFileList:
    URL_NAME = "file-upload"
    LIST_URL = "file-list"

    def test_list_empty(self, api_client, workspace):
        resp = api_client.get(reverse(self.LIST_URL, args=[workspace.slug]))
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_after_upload(self, api_client, workspace):
        post_resp = api_client.post(
            reverse(self.URL_NAME, args=[workspace.slug]),
            {"file": io.BytesIO(b"content")},
            format="multipart",
        )
        post_resp.close()
        resp = api_client.get(reverse(self.LIST_URL, args=[workspace.slug]))
        assert len(resp.json()) == 1
