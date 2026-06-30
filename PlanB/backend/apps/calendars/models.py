import uuid

from django.conf import settings
from django.db import models

from apps.workspaces.models import Workspace


class TimeTreeIntegration(models.Model):
    """Stores TimeTree credential + calendar mapping per workspace."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="timetree_integrations"
    )
    label = models.CharField(max_length=100, default="TimeTree")
    timetree_email = models.EmailField()
    encrypted_password = models.TextField(blank=True, default="")
    calendar_code = models.CharField(max_length=50)
    is_active = models.BooleanField(default=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)
    last_status = models.CharField(
        max_length=10,
        choices=[("success", "Success"), ("error", "Error")],
        blank=True,
        default="",
    )
    last_error = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.label} ({self.timetree_email})"


class CalendarEvent(models.Model):
    class Visibility(models.TextChoices):
        PUBLIC = "public", "Public"
        PRIVATE = "private", "Private"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="events"
    )
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    start_at = models.DateTimeField()
    end_at = models.DateTimeField()
    is_all_day = models.BooleanField(default=False)
    visibility = models.CharField(
        max_length=10, choices=Visibility.choices, default=Visibility.PRIVATE
    )
    color = models.CharField(max_length=7, blank=True, default="#6366f1")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_events",
    )
    external_id = models.CharField(max_length=255, blank=True, default="")
    external_source = models.CharField(max_length=50, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["start_at"]
        indexes = [
            models.Index(fields=["external_source", "external_id"]),
        ]

    def __str__(self) -> str:
        return f"{self.title} ({self.start_at:%Y-%m-%d})"
