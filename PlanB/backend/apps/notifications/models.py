import uuid

from django.conf import settings
from django.db import models


class Notification(models.Model):
    class Type(models.TextChoices):
        TASK_ASSIGNED = "task_assigned", "Task Assigned"
        TASK_UPDATED = "task_updated", "Task Updated"
        COMMENT_ADDED = "comment_added", "Comment Added"
        MENTION = "mention", "Mention"
        STATUS_CHANGED = "status_changed", "Status Changed"
        FILE_ATTACHED = "file_attached", "File Attached"
        DUE_SOON = "due_soon", "Due Soon"
        SPRINT_STARTED = "sprint_started", "Sprint Started"
        INFO = "info", "Info"
        SYSTEM = "system", "System"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    workspace = models.ForeignKey(
        "workspaces.Workspace",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="notifications",
    )
    notification_type = models.CharField(
        max_length=20,
        choices=Type.choices,
    )
    title = models.CharField(max_length=255)
    message = models.TextField(blank=True, default="")
    related_object_type = models.CharField(max_length=50, blank=True, default="")
    related_object_id = models.UUIDField(null=True, blank=True)
    sub = models.CharField(max_length=255, blank=True, default="")
    link = models.CharField(max_length=500, blank=True, default="")
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.title
