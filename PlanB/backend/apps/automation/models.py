import uuid

from django.db import models


class Rule(models.Model):
    class Trigger(models.TextChoices):
        STATUS_CHANGED   = "status_changed",   "상태 변경"
        PRIORITY_CHANGED = "priority_changed", "우선순위 변경"
        TASK_CREATED     = "task_created",     "태스크 생성"
        ASSIGNED         = "assigned",         "담당자 배정"
        DUE_DATE_PASSED  = "due_date_passed",  "마감일 초과"

    class Action(models.TextChoices):
        CHANGE_STATUS   = "change_status",   "상태 변경"
        CHANGE_PRIORITY = "change_priority", "우선순위 변경"
        ASSIGN_TO       = "assign_to",       "담당자 변경"
        NOTIFY_ASSIGNEE = "notify_assignee", "담당자 알림"

    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project     = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="rules")
    name        = models.CharField(max_length=100)
    trigger     = models.CharField(max_length=30, choices=Trigger.choices)
    trigger_val = models.JSONField(default=dict, blank=True)
    action      = models.CharField(max_length=30, choices=Action.choices)
    action_val  = models.JSONField(default=dict, blank=True)
    is_active   = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"{self.name} ({self.project})"


class RuleLog(models.Model):
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    rule         = models.ForeignKey(Rule, on_delete=models.CASCADE, related_name="logs")
    task         = models.ForeignKey("tasks.Task", on_delete=models.CASCADE, related_name="rule_logs", null=True)
    triggered_at = models.DateTimeField(auto_now_add=True)
    action_taken = models.CharField(max_length=200, blank=True)
    success      = models.BooleanField(default=True)

    class Meta:
        ordering = ["-triggered_at"]
