from django.urls import path

from .views import (
    CalendarEventDetailView,
    CalendarEventListCreateView,
    PresentationCalendarView,
    TimeTreeIntegrationDetailView,
    TimeTreeIntegrationListCreateView,
    TimeTreeIntegrationSyncView,
)

urlpatterns = [
    path("", CalendarEventListCreateView.as_view(), name="event-list"),
    path("<uuid:event_id>/", CalendarEventDetailView.as_view(), name="event-detail"),
]

# TimeTree integration endpoints (included under /calendar/ in root urls.py)
integration_urlpatterns = [
    path("integrations/", TimeTreeIntegrationListCreateView.as_view(), name="timetree-integration-list"),
    path("integrations/<uuid:integration_id>/", TimeTreeIntegrationDetailView.as_view(), name="timetree-integration-detail"),
    path("integrations/<uuid:integration_id>/sync/", TimeTreeIntegrationSyncView.as_view(), name="timetree-integration-sync"),
]

presentation_urlpatterns = [
    path("", PresentationCalendarView.as_view(), name="present-event-list"),
]
