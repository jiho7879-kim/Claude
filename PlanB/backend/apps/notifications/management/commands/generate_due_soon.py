from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.notifications.models import Notification


class Command(BaseCommand):
    help = "Create due_soon notifications for tasks approaching their deadline."

    def handle(self, *args, **options):
        from apps.tasks.models import Task

        today = timezone.localdate()
        soon = today + timedelta(days=2)
        created = 0

        for task in Task.objects.select_related("project__workspace").filter(
            due_date__isnull=False,
            status__in=("todo", "in_progress"),
        ):
            if not task.assignee_id:
                continue
            if task.due_date < today:
                message = f'"{task.title}" 마감일이 지났습니다'
                sub = f"{task.project.name} · {task.due_date}"
            elif task.due_date <= soon:
                message = f'"{task.title}" 마감이 2일 이내입니다'
                sub = f"{task.project.name} · {task.due_date}"
            else:
                continue

            _, is_new = Notification.objects.get_or_create(
                user=task.assignee,
                workspace=task.project.workspace,
                notification_type=Notification.Type.DUE_SOON,
                message=message,
                is_read=False,
                defaults={
                    "title": "마감 임박",
                    "sub": sub,
                    "related_object_type": "task",
                    "related_object_id": task.id,
                },
            )
            if is_new:
                created += 1

        self.stdout.write(self.style.SUCCESS(f"Created {created} due_soon notification(s)."))
