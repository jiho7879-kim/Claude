"""Signal handlers for the tasks application.

Creates notifications when task due dates are approaching or overdue.
"""

from datetime import timedelta

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from apps.notifications.models import Notification
from apps.tasks.models import Task


@receiver(post_save, sender=Task)
def notify_task_due_date(_sender, instance, _created, **_kwargs) -> None:
    """Create a DUE_SOON notification when a task is overdue or due within 2 days."""
    if not instance.due_date:
        return

    if instance.status in ("done", "cancelled"):
        return

    user = instance.assignee or instance.created_by
    if not user:
        return

    today = timezone.now().date()
    due = instance.due_date
    project_name = instance.project.name

    if due < today:
        message = f'"{instance.title}" 마감일이 지났습니다'
        sub = f"{project_name} · {due}"
    elif due <= today + timedelta(days=2):
        message = f'"{instance.title}" 마감이 2일 이내입니다'
        sub = f"{project_name} · {due}"
    else:
        return

    Notification.objects.get_or_create(
        user=user,
        workspace=instance.project.workspace,
        notification_type=Notification.Type.DUE_SOON,
        message=message,
        is_read=False,
        defaults={
            "title": f"마감 임박: {instance.title}",
            "sub": sub,
            "related_object_type": "task",
            "related_object_id": instance.id,
            "link": (
                f"/workspaces/{instance.project.workspace.slug}"
                f"/projects/{instance.project.id}/tasks/{instance.id}"
            ),
        },
    )
