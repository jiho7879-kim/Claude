from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver


@receiver(pre_save, sender="tasks.Task")
def _capture_old_task(sender, instance, **kwargs):
    if instance.pk:
        try:
            old = sender.objects.get(pk=instance.pk)
            instance._pre_save_snapshot = {
                "status": old.status,
                "priority": old.priority,
                "assignee": old.assignee_id,
            }
        except sender.DoesNotExist:
            instance._pre_save_snapshot = None
    else:
        instance._pre_save_snapshot = None


@receiver(post_save, sender="tasks.Task")
def _run_automation_rules(sender, instance, created, **kwargs):
    from .executor import _reentrant_guard, run_rules

    # Do not re-enter when _execute saves the task — the direct
    # run_rules call from _execute already handles cascading.
    if getattr(_reentrant_guard, "active", False):
        return

    changed = {}
    if created:
        changed["_created"] = True
    else:
        snap = getattr(instance, "_pre_save_snapshot", None) or {}
        if snap.get("status") != instance.status:
            changed["status"] = {"old": snap.get("status"), "new": instance.status}
        if snap.get("priority") != instance.priority:
            changed["priority"] = {"old": snap.get("priority"), "new": instance.priority}
        if snap.get("assignee") != instance.assignee_id:
            changed["assignee"] = {"old": snap.get("assignee"), "new": instance.assignee_id}

    if changed:
        run_rules(instance, changed)
