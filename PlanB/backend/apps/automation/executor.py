from .models import Rule, RuleLog


def run_rules(task, changed_fields: dict, depth: int = 0) -> None:
    if depth >= 3:
        return

    rules = Rule.objects.filter(project=task.project, is_active=True)
    for rule in rules:
        if _matches(rule, task, changed_fields):
            _execute(rule, task, depth)


def _matches(rule: Rule, task, changed_fields: dict) -> bool:
    t = rule.trigger
    tv = rule.trigger_val or {}

    if t == Rule.Trigger.STATUS_CHANGED:
        if "status" not in changed_fields:
            return False
        from_val = tv.get("from")
        to_val   = tv.get("to")
        if from_val and changed_fields["status"]["old"] != from_val:
            return False
        if to_val and changed_fields["status"]["new"] != to_val:
            return False
        return True

    if t == Rule.Trigger.PRIORITY_CHANGED:
        if "priority" not in changed_fields:
            return False
        from_val = tv.get("from")
        to_val   = tv.get("to")
        if from_val and changed_fields["priority"]["old"] != from_val:
            return False
        if to_val and changed_fields["priority"]["new"] != to_val:
            return False
        return True

    if t == Rule.Trigger.TASK_CREATED:
        return changed_fields.get("_created", False)

    if t == Rule.Trigger.ASSIGNED:
        return "assignee" in changed_fields

    return False


def _execute(rule: Rule, task, depth: int) -> None:
    av = rule.action_val or {}
    action_desc = ""
    try:
        if rule.action == Rule.Action.CHANGE_STATUS:
            new_status = av.get("status")
            if new_status and task.status != new_status:
                old_status = task.status
                task.status = new_status
                task.save(update_fields=["status"])
                action_desc = f"status: {old_status} → {new_status}"
                run_rules(task, {"status": {"old": old_status, "new": new_status}}, depth + 1)

        elif rule.action == Rule.Action.CHANGE_PRIORITY:
            new_priority = av.get("priority")
            if new_priority and task.priority != new_priority:
                old_priority = task.priority
                task.priority = new_priority
                task.save(update_fields=["priority"])
                action_desc = f"priority: {old_priority} → {new_priority}"

        elif rule.action == Rule.Action.ASSIGN_TO:
            user_id = av.get("user_id")
            if user_id:
                from django.contrib.auth import get_user_model
                User = get_user_model()
                try:
                    user = User.objects.get(id=user_id)
                    task.assignee = user
                    task.save(update_fields=["assignee"])
                    action_desc = f"assigned to user {user_id}"
                except User.DoesNotExist:
                    pass

        elif rule.action == Rule.Action.NOTIFY_ASSIGNEE:
            action_desc = f"notify assignee (task={task.id})"

        RuleLog.objects.create(rule=rule, task=task, action_taken=action_desc, success=True)
    except Exception as exc:
        RuleLog.objects.create(rule=rule, task=task, action_taken=str(exc), success=False)
