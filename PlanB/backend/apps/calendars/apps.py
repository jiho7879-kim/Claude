import logging
import os
import threading

from django.apps import AppConfig
from django.conf import settings

logger = logging.getLogger("planb.calendars.auto_sync")


def _sync_all_integrations():
    """Run sync_timetree for every active TimeTreeIntegration."""
    from io import StringIO

    from django.core.management import call_command
    from django.utils import timezone

    from .crypto import decrypt_password
    from .models import TimeTreeIntegration

    integrations = TimeTreeIntegration.objects.filter(is_active=True)
    if not integrations:
        return

    for integration in integrations:
        buf = StringIO()
        try:
            password = (
                decrypt_password(integration.encrypted_password)
                if integration.encrypted_password
                else ""
            )
            call_command(
                "sync_timetree",
                workspace_slug=integration.workspace.slug,
                timetree_email=integration.timetree_email,
                timetree_password=password,
                calendar_code=integration.calendar_code,
                stdout=buf,
                stderr=buf,
            )
            integration.last_status = "success"
            integration.last_error = ""
            logger.info("Auto-sync OK: %s (%s)", integration.label, integration.timetree_email)
        except Exception as exc:
            integration.last_status = "error"
            integration.last_error = str(exc)
            logger.warning("Auto-sync FAIL: %s — %s", integration.label, exc)
        finally:
            integration.last_synced_at = timezone.now()
            integration.save(update_fields=["last_status", "last_error", "last_synced_at"])


def _scheduler_loop(interval_minutes: int) -> None:
    """One-shot: sync, then re-schedule. Runs as a daemon thread."""
    try:
        _sync_all_integrations()
    except Exception as exc:
        logger.error("Auto-sync scheduler error: %s", exc)
    # Re-schedule
    threading.Timer(interval_minutes * 60, _scheduler_loop, [interval_minutes]).start()


class CalendarsConfig(AppConfig):
    name = "apps.calendars"

    def ready(self):
        # RUN_MAIN guards against the autoreloader calling ready() twice
        # Only the reloader child (the actual dev server) reaches here.
        # In production (gunicorn etc.) RUN_MAIN is not set, so it runs once.
        if os.environ.get("RUN_MAIN", ""):
            interval = getattr(settings, "TIMETREE_SYNC_INTERVAL_MINUTES", 30)
            # Start after a short delay so the DB / server is ready
            threading.Timer(10, _scheduler_loop, [interval]).start()
            logger.info("Auto-sync scheduler started (interval=%s min)", interval)
