import uuid

from django.conf import settings
from django.db import models


class Workspace(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owned_workspaces",
    )
    color = models.CharField(max_length=7, blank=True, default='')
    max_task_depth = models.PositiveSmallIntegerField(default=3)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return self.name


class WorkspaceMember(models.Model):
    class Role(models.TextChoices):
        OWNER = "owner", "Owner"
        ADMIN = "admin", "Admin"
        MEMBER = "member", "Member"

    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="members"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="workspace_memberships",
    )
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.MEMBER)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("workspace", "user")

    def __str__(self) -> str:
        return f"{self.user} @ {self.workspace} ({self.role})"


class SavedView(models.Model):
    class ViewType(models.TextChoices):
        LIST  = "list",  "List"
        BOARD = "board", "Board"

    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace  = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="saved_views")
    project    = models.ForeignKey(
        "projects.Project", on_delete=models.CASCADE, related_name="saved_views", null=True, blank=True
    )
    owner      = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="saved_views"
    )
    name       = models.CharField(max_length=100)
    filters    = models.JSONField(default=dict, blank=True)
    view_type  = models.CharField(max_length=10, choices=ViewType.choices, default=ViewType.LIST)
    is_shared  = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"{self.name} ({self.workspace})"
