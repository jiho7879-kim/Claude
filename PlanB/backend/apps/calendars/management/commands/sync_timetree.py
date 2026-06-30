import os
import subprocess
import tempfile
from datetime import datetime

from dateutil import parser as dateparser
from django.core.management.base import BaseCommand, CommandError

from apps.calendars.models import CalendarEvent
from apps.workspaces.models import Workspace


class Command(BaseCommand):
    help = "Sync TimeTree calendar events into PlanB (one-way, read-only)."

    def add_arguments(self, parser):
        parser.add_argument("--workspace-slug", required=True, help="PlanB workspace slug")
        parser.add_argument("--timetree-email", help="TimeTree account email (default: $TIMETREE_EMAIL)")
        parser.add_argument("--timetree-password", help="TimeTree account password (default: $TIMETREE_PASSWORD)")
        parser.add_argument("--calendar-code", help="TimeTree calendar code (omit to select interactively)")
        parser.add_argument("--ics-file", help="Skip export, import from existing .ics file instead")
        parser.add_argument("--dry-run", action="store_true", help="Print what would be done without saving")

    def handle(self, *args, **options):
        slug = options["workspace_slug"]
        workspace = Workspace.objects.filter(slug=slug).first()
        if not workspace:
            raise CommandError(f"Workspace '{slug}' not found.")

        timetree_email = options.get("timetree_email") or os.environ.get("TIMETREE_EMAIL")
        timetree_password = options.get("timetree_password") or os.environ.get("TIMETREE_PASSWORD")
        dry_run = options["dry_run"]

        ics_path = options.get("ics_file")

        if not ics_path:
            if not timetree_email:
                raise CommandError("TimeTree email required via --timetree-email or $TIMETREE_EMAIL")
            ics_path = self._export_ics(timetree_email, timetree_password, options.get("calendar_code"))

        self._import_ics(ics_path, workspace, dry_run)

        if not options.get("ics_file") and os.path.exists(ics_path):
            os.remove(ics_path)

        self.stdout.write(self.style.SUCCESS("Sync complete."))

    def _export_ics(self, email, password, calendar_code):
        args = ["timetree-exporter", "-o", tmp := os.path.join(tempfile.gettempdir(), f"timetree_{datetime.now():%Y%m%d%H%M%S}.ics"), "-e", email]
        if calendar_code:
            args += ["-c", calendar_code]
        env = os.environ.copy()
        if password:
            env["TIMETREE_PASSWORD"] = password
        self.stdout.write(f"Exporting TimeTree calendar for {email} ...")
        result = subprocess.run(args, env=env, capture_output=True, text=True, timeout=120)
        if result.returncode != 0:
            raise CommandError(f"timetree-exporter failed:\n{result.stderr}")
        self.stdout.write(result.stdout)
        return tmp

    def _import_ics(self, ics_path, workspace, dry_run):
        from icalendar import Calendar

        with open(ics_path, "rb") as f:
            cal = Calendar.from_ical(f.read())

        stats = dict(created=0, updated=0, skipped=0)
        now = datetime.now()

        for component in cal.walk():
            if component.name != "VEVENT":
                continue

            uid = str(component.get("UID", ""))
            title = str(component.get("SUMMARY", "(no title)"))
            description = str(component.get("DESCRIPTION", ""))
            dtstart = component.get("DTSTART").dt if component.get("DTSTART") else None
            dtend = component.get("DTEND").dt if component.get("DTEND") else None

            if not dtstart:
                stats["skipped"] += 1
                continue

            is_all_day = not isinstance(dtstart, datetime)
            if isinstance(dtstart, datetime):
                start_at = dtstart
            else:
                start_at = datetime.combine(dtstart, datetime.min.time())
            if dtend:
                if isinstance(dtend, datetime):
                    end_at = dtend
                else:
                    end_at = datetime.combine(dtend, datetime.min.time())
            else:
                end_at = start_at

            existing = CalendarEvent.objects.filter(
                external_source="timetree", external_id=uid, workspace=workspace
            ).first()

            defaults = dict(
                title=title[:300],
                description=description,
                start_at=start_at,
                end_at=end_at,
                is_all_day=is_all_day,
                visibility=CalendarEvent.Visibility.PUBLIC,
                color="#6366f1",
            )

            if existing:
                changed = any(
                    getattr(existing, k) != v
                    for k, v in defaults.items()
                    if k not in ("visibility", "color")
                )
                if not changed:
                    stats["skipped"] += 1
                    continue
                if not dry_run:
                    for k, v in defaults.items():
                        setattr(existing, k, v)
                    existing.save(update_fields=list(defaults.keys()))
                stats["updated"] += 1
                self.stdout.write(f"  UPD {title[:60]}")
            else:
                if not dry_run:
                    CalendarEvent.objects.create(
                        workspace=workspace,
                        external_source="timetree",
                        external_id=uid,
                        **defaults,
                    )
                stats["created"] += 1
                self.stdout.write(f"  NEW {title[:60]}")

        self.stdout.write(
            f"\nResults: {stats['created']} created, {stats['updated']} updated, {stats['skipped']} skipped"
        )
