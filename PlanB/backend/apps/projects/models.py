import uuid

from django.conf import settings
from django.db import models

from apps.workspaces.models import Workspace


class Project(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        ARCHIVED = "archived", "Archived"

    class ProjectType(models.TextChoices):
        STANDARD = "standard", "Standard"
        RESEARCH = "research", "Research"

    class PublicationStatus(models.TextChoices):
        WRITING = "writing", "Writing"
        SUBMITTED = "submitted", "Submitted"
        UNDER_REVIEW = "under_review", "Under Review"
        REVISION = "revision", "Revision"
        ACCEPTED = "accepted", "Accepted"
        PUBLISHED = "published", "Published"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="projects"
    )
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)
    max_task_depth = models.PositiveSmallIntegerField(null=True, blank=True)
    color = models.CharField(max_length=7, blank=True, default='')
    project_type = models.CharField(
        max_length=10, choices=ProjectType.choices, default=ProjectType.STANDARD
    )
    publication_status = models.CharField(
        max_length=15, choices=PublicationStatus.choices, blank=True, default=''
    )
    target_journal = models.CharField(max_length=200, blank=True, default='')
    submission_date = models.DateField(null=True, blank=True)
    acceptance_date = models.DateField(null=True, blank=True)
    pub_doi = models.CharField(max_length=100, blank=True, default='')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_projects",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"{self.workspace.name} / {self.name}"

    def get_effective_max_task_depth(self) -> int:
        if self.max_task_depth is not None:
            return self.max_task_depth
        return self.workspace.max_task_depth


class ProjectTemplate(models.Model):
    name        = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    category    = models.CharField(max_length=30, default="general")
    icon        = models.CharField(max_length=10, default="📋")
    tasks       = models.JSONField(default=list)
    order       = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["order", "name"]

    def __str__(self) -> str:
        return self.name


class ProjectMember(models.Model):
    class Role(models.TextChoices):
        MANAGER = "manager", "Manager"
        CONTRIBUTOR = "contributor", "Contributor"
        VIEWER = "viewer", "Viewer"

    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="members"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="project_memberships",
    )
    role = models.CharField(max_length=15, choices=Role.choices, default=Role.CONTRIBUTOR)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("project", "user")

    def __str__(self) -> str:
        return f"{self.user} @ {self.project} ({self.role})"
