from django.urls import path

from .views import (
    NotificationDetailView,
    NotificationListView,
    NotificationReadAllView,
    NotificationUnreadCountView,
)

urlpatterns = [
    path("", NotificationListView.as_view(), name="notification-list"),
    path("unread-count/", NotificationUnreadCountView.as_view(), name="notification-unread-count"),
    path("read-all/", NotificationReadAllView.as_view(), name="notification-read-all"),
    path("<uuid:notification_id>/", NotificationDetailView.as_view(), name="notification-detail"),
]
