from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import TokenRefreshView

from apps.ai.urls import project_urlpatterns as ai_project_urlpatterns
from apps.calendars.urls import presentation_urlpatterns

urlpatterns = [
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
    path(
        "api/workspaces/<slug:workspace_slug>/projects/<uuid:project_id>/",
        include(ai_project_urlpatterns),
    ),
    path(
        "api/workspaces/<slug:workspace_slug>/projects/<uuid:project_id>/",
        include("apps.automation.urls"),
    ),
]
