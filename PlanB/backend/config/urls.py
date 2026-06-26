from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from rest_framework_simplejwt.views import TokenRefreshView


def debug_check(request):
    import traceback as tb
    import django
    result = {"django_version": django.__version__}
    try:
        from django.contrib.sites.models import Site
        s = Site.objects.get(id=1)
        result["site"] = s.domain
    except Exception as e:
        result["site_error"] = str(e)
    try:
        from django.conf import settings
        app = settings.SOCIALACCOUNT_PROVIDERS.get("github", {}).get("APP", {})
        result["github_client_id"] = repr(app.get("client_id", "NOT SET"))
        result["github_secret_set"] = bool(app.get("secret", ""))
    except Exception as e:
        result["provider_error"] = str(e)
    try:
        from allauth.socialaccount.models import SocialApp
        apps = list(SocialApp.objects.filter(provider="github").values("id", "client_id"))
        result["db_social_apps"] = apps
    except Exception as e:
        result["db_social_apps_error"] = str(e)
    try:
        from allauth.socialaccount.providers.github.views import oauth2_login
        return oauth2_login(request)
    except Exception as e:
        result["login_error"] = str(e)
        result["login_traceback"] = tb.format_exc()
    return JsonResponse(result)

from apps.ai.urls import project_urlpatterns as ai_project_urlpatterns
from apps.calendars.urls import presentation_urlpatterns

urlpatterns = [
    path("debug-check/", debug_check),
    path("admin/", admin.site.urls),
    path("accounts/", include("allauth.urls")),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("api/workspaces/", include("apps.workspaces.urls")),
    path(
        "api/workspaces/<slug:workspace_slug>/projects/",
        include("apps.projects.urls"),
    ),
    path(
        "api/workspaces/<slug:workspace_slug>/projects/<uuid:project_id>/tasks/",
        include("apps.tasks.urls"),
    ),
    # Sprints: direct path (frontend calls /projects/<id>/sprints/)
    path(
        "api/workspaces/<slug:workspace_slug>/projects/<uuid:project_id>/sprints/",
        include("apps.tasks.sprint_urls"),
    ),
    path(
        "api/workspaces/<slug:workspace_slug>/events/",
        include("apps.calendars.urls"),
    ),
    path("api/present/<slug:workspace_slug>/events/", include(presentation_urlpatterns)),
    path(
        "api/workspaces/<slug:workspace_slug>/planner/",
        include("apps.planner.urls"),
    ),
    path(
        "api/workspaces/<slug:workspace_slug>/projects/<uuid:project_id>/",
        include("apps.research.urls"),
    ),
    path("api/workspaces/<slug:workspace_slug>/ai/", include("apps.ai.urls")),
    path("api/workspaces/<slug:workspace_slug>/notes/", include("apps.notes.urls")),
    path(
        "api/workspaces/<slug:workspace_slug>/projects/<uuid:project_id>/",
        include(ai_project_urlpatterns),
    ),
    path(
        "api/workspaces/<slug:workspace_slug>/projects/<uuid:project_id>/",
        include("apps.automation.urls"),
    ),
]
