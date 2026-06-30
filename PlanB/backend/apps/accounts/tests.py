"""Tests for apps.accounts — User profile (MeView)."""

import pytest
from django.urls import reverse

pytestmark = pytest.mark.django_db


class TestMeView:
    URL_NAME = "me"

    def test_get_profile(self, api_client):
        resp = api_client.get(reverse(self.URL_NAME))
        assert resp.status_code == 200
        data = resp.json()
        assert data["username"] == "testuser"
        assert data["email"] == "test@planb.app"

    def test_patch_profile(self, api_client):
        resp = api_client.patch(
            reverse(self.URL_NAME),
            {"bio": "Hello, PlanB!"},
            format="json",
        )
        assert resp.status_code == 200
        assert resp.json()["bio"] == "Hello, PlanB!"

    def test_patch_read_only_fields_ignored(self, api_client):
        resp = api_client.patch(
            reverse(self.URL_NAME),
            {"username": "hacker"},
            format="json",
        )
        assert resp.status_code == 200
        assert resp.json()["username"] == "testuser"  # unchanged

    def test_requires_auth(self, api_client):
        api_client.force_authenticate(user=None)
        resp = api_client.get(reverse(self.URL_NAME))
        assert resp.status_code == 401
