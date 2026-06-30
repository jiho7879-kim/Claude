"""Shared fixtures for PlanB app tests."""

import pytest
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        username="testuser",
        email="test@planb.app",
        password="testpass123",
    )


@pytest.fixture
def api_client(user):
    from rest_framework.test import APIClient

    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def workspace(user, db):
    from apps.workspaces.models import Workspace, WorkspaceMember

    ws = Workspace.objects.create(
        name="Test Workspace",
        slug="test-workspace",
        owner=user,
    )
    WorkspaceMember.objects.create(
        workspace=ws,
        user=user,
        role=WorkspaceMember.Role.OWNER,
    )
    return ws


@pytest.fixture
def project(workspace, user, db):
    from apps.projects.models import Project, ProjectMember

    project = Project.objects.create(
        name="Test Project",
        workspace=workspace,
        status="active",
        created_by=user,
    )
    ProjectMember.objects.create(
        project=project,
        user=user,
        role=ProjectMember.Role.MANAGER,
    )
    return project
