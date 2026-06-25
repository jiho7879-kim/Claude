import uuid

from django.conf import settings
from django.db import models

from apps.workspaces.models import Workspace


class DailyEntry(models.Model):
    class Mood(models.TextChoices):
        GREAT   = "great",   "😄 Great"
        GOOD    = "good",    "🙂 Good"
        NEUTRAL = "neutral", "😐 Neutral"
        BAD     = "bad",     "😕 Bad"
        AWFUL   = "awful",   "😣 Awful"

    id        = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user      = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="daily_entries")
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="daily_entries")
    date          = models.DateField()
    journal       = models.TextField(blank=True)
    mood          = models.CharField(max_length=10, choices=Mood.choices, blank=True)
    energy        = models.PositiveSmallIntegerField(null=True, blank=True)
    emotion_tags  = models.JSONField(default=list, blank=True)
    gratitude     = models.JSONField(default=list, blank=True)
    one_liner     = models.TextField(blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "workspace", "date")
        ordering = ["-date"]

    def __str__(self):
        return f"{self.user} — {self.date}"


class TimeBlock(models.Model):
    class Category(models.TextChoices):
        WORK     = "work",     "Work"
        PERSONAL = "personal", "Personal"
        HEALTH   = "health",   "Health"
        LEARNING = "learning", "Learning"
        OTHER    = "other",    "Other"

    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    daily_entry = models.ForeignKey(DailyEntry, on_delete=models.CASCADE, related_name="time_blocks")
    title       = models.CharField(max_length=200)
    start_time  = models.TimeField(null=True, blank=True)
    end_time    = models.TimeField(null=True, blank=True)
    category    = models.CharField(max_length=12, choices=Category.choices, default=Category.WORK)
    is_done     = models.BooleanField(default=False)
    order       = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["order", "start_time"]

    def __str__(self):
        return self.title


class Habit(models.Model):
    id        = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user      = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="habits")
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="habits")
    name      = models.CharField(max_length=100)
    color     = models.CharField(max_length=7, default="#6366f1")
    emoji     = models.CharField(max_length=8, blank=True)
    is_active = models.BooleanField(default=True)
    order     = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "created_at"]

    def __str__(self):
        return self.name


class WeeklyReview(models.Model):
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user         = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="weekly_reviews")
    workspace    = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="weekly_reviews")
    year         = models.PositiveSmallIntegerField()
    week         = models.PositiveSmallIntegerField()   # ISO week number
    went_well    = models.TextField(blank=True)
    to_improve   = models.TextField(blank=True)
    next_focus   = models.TextField(blank=True)
    mit1         = models.CharField(max_length=200, blank=True)
    mit2         = models.CharField(max_length=200, blank=True)
    mit3         = models.CharField(max_length=200, blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "workspace", "year", "week")
        ordering = ["-year", "-week"]

    def __str__(self):
        return f"{self.user} — {self.year}W{self.week:02d}"


class HabitLog(models.Model):
    id      = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    habit   = models.ForeignKey(Habit, on_delete=models.CASCADE, related_name="logs")
    date    = models.DateField()
    is_done = models.BooleanField(default=True)

    class Meta:
        unique_together = ("habit", "date")
        ordering = ["-date"]

    def __str__(self):
        return f"{self.habit.name} — {self.date}"
