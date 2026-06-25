import uuid

from django.conf import settings
from django.db import models

from apps.projects.models import Project
from apps.workspaces.models import Workspace


class ResearchNote(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="notes")
    date = models.DateField()
    content = models.TextField(blank=True)
    tags = models.JSONField(default=list, blank=True)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="research_notes",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-created_at"]

    def __str__(self) -> str:
        return f"{self.project.name} / {self.date}"


class Dataset(models.Model):
    class DataStatus(models.TextChoices):
        RAW = "raw", "Raw"
        PROCESSED = "processed", "Processed"
        ARCHIVED = "archived", "Archived"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="datasets")
    name = models.CharField(max_length=200)
    version = models.CharField(max_length=50, blank=True, default="")
    source_url = models.URLField(blank=True, default="")
    size_mb = models.FloatField(null=True, blank=True)
    data_status = models.CharField(
        max_length=15, choices=DataStatus.choices, default=DataStatus.RAW
    )
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="datasets",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.project.name} / {self.name}"


class Reference(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="references"
    )
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="references", null=True, blank=True
    )
    doi = models.CharField(max_length=200, blank=True, default="")
    url = models.URLField(blank=True, default="")
    title = models.CharField(max_length=500)
    authors = models.JSONField(default=list, blank=True)
    year = models.IntegerField(null=True, blank=True)
    journal = models.CharField(max_length=300, blank=True, default="")
    abstract = models.TextField(blank=True)
    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="references",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.title
