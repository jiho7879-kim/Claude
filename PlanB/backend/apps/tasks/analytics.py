from datetime import date, datetime, timedelta

from django.db.models import Count
from django.db.models.functions import TruncDate, TruncWeek

from .models import Task


def _d(val) -> date:
    return val.date() if isinstance(val, datetime) else val


def velocity(project_id: str, weeks: int = 8) -> list[dict]:
    today = date.today()
    since = today - timedelta(weeks=weeks)
    rows = {
        _d(r["week"]): r["done"]
        for r in (
            Task.objects
            .filter(project_id=project_id, status="done", updated_at__date__gte=since)
            .annotate(week=TruncWeek("updated_at"))
            .values("week")
            .annotate(done=Count("id"))
        )
    }
    result = []
    for i in range(weeks):
        week_start = since + timedelta(weeks=i)
        result.append({"week": week_start.isoformat(), "done": rows.get(week_start, 0)})
    return result


def burnup(project_id: str, days: int = 30) -> list[dict]:
    today = date.today()
    start = today - timedelta(days=days - 1)

    created_by_day = {
        _d(r["day"]): r["count"]
        for r in (
            Task.objects
            .filter(project_id=project_id, created_at__date__gte=start)
            .annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(count=Count("id"))
        )
    }
    done_by_day = {
        _d(r["day"]): r["count"]
        for r in (
            Task.objects
            .filter(project_id=project_id, status="done", updated_at__date__gte=start)
            .annotate(day=TruncDate("updated_at"))
            .values("day")
            .annotate(count=Count("id"))
        )
    }

    base_total = Task.objects.filter(project_id=project_id, created_at__date__lt=start).count()
    base_done = Task.objects.filter(project_id=project_id, status="done", updated_at__date__lt=start).count()

    result = []
    cum_total = base_total
    cum_done = base_done
    for i in range(days):
        d = start + timedelta(days=i)
        cum_total += created_by_day.get(d, 0)
        cum_done += done_by_day.get(d, 0)
        result.append({"date": d.isoformat(), "total": cum_total, "done": cum_done})
    return result


def lead_time(project_id: str) -> list[dict]:
    tasks = (
        Task.objects
        .filter(project_id=project_id, status="done")
        .values("created_at", "updated_at")
    )
    buckets: dict[int, int] = {}
    for t in tasks:
        delta = max(0, (_d(t["updated_at"]) - _d(t["created_at"])).days)
        buckets[delta] = buckets.get(delta, 0) + 1
    return [{"days": d, "count": c} for d, c in sorted(buckets.items())]


def throughput(project_id: str, days: int = 30) -> list[dict]:
    today = date.today()
    since = today - timedelta(days=days - 1)
    rows = {
        _d(r["day"]): r["done"]
        for r in (
            Task.objects
            .filter(project_id=project_id, status="done", updated_at__date__gte=since)
            .annotate(day=TruncDate("updated_at"))
            .values("day")
            .annotate(done=Count("id"))
        )
    }
    return [
        {"date": (since + timedelta(days=i)).isoformat(), "done": rows.get(since + timedelta(days=i), 0)}
        for i in range(days)
    ]


def summary(project_id: str) -> dict:
    qs = Task.objects.filter(project_id=project_id)
    total = qs.count()
    by_status = dict(qs.values_list("status").annotate(c=Count("id")).values_list("status", "c"))
    by_priority = dict(qs.values_list("priority").annotate(c=Count("id")).values_list("priority", "c"))
    return {"total": total, "by_status": by_status, "by_priority": by_priority}
