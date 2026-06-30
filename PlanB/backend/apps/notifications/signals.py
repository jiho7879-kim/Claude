from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.files.models import FileAttachment
from apps.notifications.models import Notification


@receiver(post_save, sender=FileAttachment)
def notify_file_attached(sender, instance, created, **kwargs):
    if not created:
        return

    user = None
    obj_type = ""
    obj_id = None

    if instance.task_id is not None:
        task = instance.task
        if task and task.assignee_id:
            user = task.assignee
            obj_type = "task"
            obj_id = instance.task_id
    elif instance.note_id is not None:
        note = instance.note
        if note and note.user_id:
            user = note.user
            obj_type = "note"
            obj_id = instance.note_id

    if user is None:
        return

    Notification.objects.create(
        user=user,
        notification_type=Notification.Type.FILE_ATTACHED,
        title=f"파일 첨부: {instance.original_name}",
        message=f"파일이 첨부되었습니다",
        related_object_type=obj_type,
        related_object_id=obj_id,
    )
