import threading
from typing import Any

from .models import Rule, RuleLog

# Guard against reentrant rule execution via signals.
# When _execute calls task.save(), post_save fires and would re-enter run_rules
# at depth=0 (bypassing the recursion depth limit).  This flag prevents that.
_reentrant_guard = threading.local()


def run_rules(task, changed_fields: dict, depth: int = 0) -> None:
    if depth >= 3:
        return

    rules = Rule.objects.filter(project=task.project, is_active=True)
    for rule in rules:
        if _matches(rule, task, changed_fields):
            _execute(rule, task, depth)


# ── Condition helpers ─────────────────────────────────────────────────────────

# Keys that STATUS_CHANGED / PRIORITY_CHANGED consume for their own matching
# and must be excluded from the generic field-level condition check.
_TRIGGER_SPECIFIC_KEYS = frozenset({"from", "to"})


def _check_conditions(tv: dict[str, Any], task) -> bool:
    """Evaluate generic condition filters from *trigger_val* against *task*.

    Each remaining key in *tv* (after skipping trigger-specific keys like
    ``from`` / ``to``) is treated as a task field name whose value must
    match ``getattr(task, field)``.
    """
    for field, expected in tv.items():
        if field in _TRIGGER_SPECIFIC_KEYS:
            continue
        actual = getattr(task, field, _SENTINEL)
        if actual is _SENTINEL:
            return False  # field does not exist on the model
        if actual != expected:
            return False
    return True


_SENTINEL = object()


# ── Matching ───────────────────────────────────────────────────────────────────


def _matches(rule: Rule, task, changed_fields: dict) -> bool:
    t = rule.trigger
    tv = rule.trigger_val or {}

    if t == Rule.Trigger.STATUS_CHANGED:
        if "status" not in changed_fields:
            return False
        from_val = tv.get("from")
        to_val = tv.get("to")
        if from_val and changed_fields["status"]["old"] != from_val:
            return False
        if to_val and changed_fields["status"]["new"] != to_val:
            return False
        return True

    if t == Rule.Trigger.PRIORITY_CHANGED:
        if "priority" not in changed_fields:
            return False
        from_val = tv.get("from")
        to_val = tv.get("to")
        if from_val and changed_fields["priority"]["old"] != from_val:
            return False
        if to_val and changed_fields["priority"]["new"] != to_val:
            return False
        return True

    if t == Rule.Trigger.TASK_CREATED:
        if not changed_fields.get("_created", False):
            return False
        return _check_conditions(tv, task)

    if t == Rule.Trigger.ASSIGNED:
        if "assignee" not in changed_fields:
            return False
        return _check_conditions(tv, task)

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
                _safely_save(task, update_fields=["status"])
                action_desc = f"status: {old_status} → {new_status}"
                run_rules(task, {"status": {"old": old_status, "new": new_status}}, depth + 1)

        elif rule.action == Rule.Action.CHANGE_PRIORITY:
            new_priority = av.get("priority")
            if new_priority and task.priority != new_priority:
                old_priority = task.priority
                task.priority = new_priority
                _safely_save(task, update_fields=["priority"])
                action_desc = f"priority: {old_priority} → {new_priority}"

        elif rule.action == Rule.Action.ASSIGN_TO:
            user_id = av.get("user_id")
            if user_id:
                from django.contrib.auth import get_user_model

                User = get_user_model()
                try:
                    user = User.objects.get(id=user_id)
                    task.assignee = user
                    _safely_save(task, update_fields=["assignee"])
                    action_desc = f"assigned to user {user_id}"
                except User.DoesNotExist:
                    pass

        elif rule.action == Rule.Action.NOTIFY_ASSIGNEE:
            action_desc = f"notify assignee (task={task.id})"

        RuleLog.objects.create(rule=rule, task=task, action_taken=action_desc, success=True)
    except Exception as exc:
        RuleLog.objects.create(rule=rule, task=task, action_taken=str(exc), success=False)


def _safely_save(task, **kwargs) -> None:
    """Save *task* while suppressing reentrant rule execution.

    Calling ``task.save()`` from inside ``_execute`` triggers the
    ``post_save`` signal again, which would call ``run_rules`` at
    depth=0 — bypassing the depth-guard and potentially causing
    unbounded cascading (or infinite loops with mutually-triggering
    rules).  This helper sets a thread-local flag that the signal
    handler checks before re-entering.
    """
    if getattr(_reentrant_guard, "active", False):
        task.save(**kwargs)
        return
    _reentrant_guard.active = True
    try:
        task.save(**kwargs)
    finally:
        _reentrant_guard.active = False
