from django.core.management.base import BaseCommand
from decouple import config


class Command(BaseCommand):
    help = "Production setup: update Site domain and GitHub SocialApp"

    def handle(self, *args, **options):
        self._setup_site()
        self._setup_github_app()

    def _setup_site(self):
        from django.contrib.sites.models import Site

        allowed_hosts = config("ALLOWED_HOSTS", default="")
        domain = allowed_hosts.split(",")[0].strip()
        if not domain:
            self.stdout.write(self.style.WARNING("ALLOWED_HOSTS not set, skipping site setup"))
            return

        site, _ = Site.objects.get_or_create(id=1)
        site.domain = domain
        site.name = "PlanB"
        site.save()
        self.stdout.write(self.style.SUCCESS(f"Site domain set to: {domain}"))

    def _setup_github_app(self):
        from allauth.socialaccount.models import SocialApp
        from django.contrib.sites.models import Site

        client_id = config("GITHUB_CLIENT_ID", default="")
        secret = config("GITHUB_CLIENT_SECRET", default="")
        if not client_id or not secret:
            self.stdout.write(self.style.WARNING("GitHub OAuth credentials not set, skipping"))
            return

        app, created = SocialApp.objects.get_or_create(
            provider="github",
            defaults={"name": "GitHub", "client_id": client_id, "secret": secret},
        )
        if not created:
            app.client_id = client_id
            app.secret = secret
            app.save()

        site = Site.objects.get(id=1)
        app.sites.add(site)
        self.stdout.write(self.style.SUCCESS("GitHub SocialApp configured"))
