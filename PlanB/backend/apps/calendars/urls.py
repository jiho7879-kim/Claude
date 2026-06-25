from django.urls import path

from .views import CalendarEventDetailView, CalendarEventListCreateView, PresentationCalendarView

urlpatterns = [
    path("", CalendarEventListCreateView.as_view(), name="event-list"),
    path("<uuid:event_id>/", CalendarEventDetailView.as_view(), name="event-detail"),
]

presentation_urlpatterns = [
    path("", PresentationCalendarView.as_view(), name="present-event-list"),
]
