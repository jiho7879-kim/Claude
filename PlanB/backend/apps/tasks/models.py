import uuid

from django.conf import settings
from django.db import models

from apps.projects.models import Project


class Sprint(models.Model):
    class Status(models.TextChoices):
        PLANNED   = "planned",   "Planned"
        ACTIVE    = "active",    "Active"
        COMPLETED = "completed", "Completed"

    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project    = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="sprints")
    name       = models.CharField(max_length=100)
    status     = models.CharField(max_length=12, choices=Status.choices, default=Status.PLANNED)
    start_date = models.DateField()
    end_date   = models.DateField()
    goal       = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-start_date"]

    def __str__(self) -> str:
        return self.name


class Task(models.Model):
    class Status(models.TextChoices):
        TODO        = "todo",        "Todo"
        IN_PROGRESS = "in_progress", "In Progress"
        DONE        = "done",        "Done"
        CANCELLED   = "cancelled",   "Cancelled"

    class Priority(models.TextChoices):
        LOW    = "low",    "Low"
        MEDIUM = "medium", "Medium"
        HIGH   = "high",   "High"
        URGENT = "urgent", "Urgent"

    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project    = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="tasks")
    sprint     = models.ForeignKey(Sprint, on_delete=models.SET_NULL, null=True, blank=True, related_name="tasks")
    parent     = models.ForeignKey("self", on_delete=models.CASCADE, null=True, blank=True, related_name="children")
    title      = models.CharField(max_length=500)
    description = models.TextField(blank=True)
    status     = models.CharField(max_length=15, choices=Status.choices, default=Status.TODO)
    priority   = models.CharField(max_length=10, choices=Priority.choices, default=Priority.MEDIUM)
    assignee   = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="assigned_tasks")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="created_tasks")
    start_date   = models.DateField(null=True, blank=True)
    due_date     = models.DateField(null=True, blank=True)
    is_milestone = models.BooleanField(default=False)
    depth      = models.PositiveSmallIntegerField(default=0)
    order      = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "created_at"]

    def __str__(self) -> str:
        return self.title

    @property
    def level_name(self) -> str:
        return {0: "Epic", 1: "Task", 2: "Subtask"}.get(self.depth, f"Level {self.depth}")

    def save(self, *args, **kwargs) -> None:
        self.depth = self.parent.depth + 1 if self.parent else 0
        super().save(*args, **kwargs)


class ChecklistItem(models.Model):
    id       = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task     = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="checklist_items")
    text     = models.CharField(max_length=500)
    is_done  = models.BooleanField(default=False)
    order    = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "created_at"]

    def __str__(self) -> str:
        return f"[{'x' if self.is_done else ' '}] {self.text}"


class TaskRelation(models.Model):
    class Type(models.TextChoices):
        BLOCKS     = "blocks",     "Blocks"
        BLOCKED_BY = "blocked_by", "Blocked by"

    id            = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    from_task     = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="relations_from")
    to_task       = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="relations_to")
    relation_type = models.CharField(max_length=12, choices=Type.choices)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [["from_task", "to_task", "relation_type"]]

    def __str__(self) -> str:
        return f"{self.from_task} {self.relation_type} {self.to_task}"


class TaskComment(models.Model):
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task       = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="comments")
    author     = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="task_comments")
    content    = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]


class TimeEntry(models.Model):
    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task             = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="time_entries")
    user             = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="time_entries")
    started_at       = models.DateTimeField()
    ended_at         = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.PositiveIntegerField(default=0)
    note             = models.CharField(max_length=200, blank=True)
    created_at       = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-started_at"]


class ActivityLog(models.Model):
    task       = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="activity")
    actor      = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="activity_logs")
    action     = models.CharField(max_length=50)
    detail     = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
