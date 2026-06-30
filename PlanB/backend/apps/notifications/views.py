from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.workspaces.models import Workspace

from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(APIView):
    """List and create notifications for the current user in a workspace."""

    permission_classes = [IsAuthenticated]

    def get(self, request, workspace_slug):
        get_object_or_404(Workspace, slug=workspace_slug, members__user=request.user)
        notifications = Notification.objects.filter(
            user=request.user,
            workspace__slug=workspace_slug,
        ).order_by("-created_at")
        return Response(NotificationSerializer(notifications, many=True).data)

    def post(self, request, workspace_slug):
        workspace = get_object_or_404(
            Workspace, slug=workspace_slug, members__user=request.user
        )
    @staticmethod
    def _find_duplicate(user, workspace, data):
        filters = dict(
            user=user,
            workspace=workspace,
            notification_type=data.get("notification_type"),
            is_read=False,
        )
        related_id = data.get("related_object_id")
        if related_id:
            filters["related_object_id"] = related_id
            return Notification.objects.filter(**filters).first()
        filters["message"] = data.get("message", "")
        return Notification.objects.filter(**filters).first()

    def post(self, request, workspace_slug):
        workspace = get_object_or_404(
            Workspace, slug=workspace_slug, members__user=request.user
        )
        serializer = NotificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        existing = self._find_duplicate(request.user, workspace, serializer.validated_data)
        if existing:
            return Response(NotificationSerializer(existing).data, status=status.HTTP_200_OK)

        notification = serializer.save(user=request.user, workspace=workspace)
        return Response(
            NotificationSerializer(notification).data, status=status.HTTP_201_CREATED
        )


class NotificationUnreadCountView(APIView):
    """Return the count of unread notifications."""

    permission_classes = [IsAuthenticated]

    def get(self, request, workspace_slug):
        get_object_or_404(Workspace, slug=workspace_slug, members__user=request.user)
        count = Notification.objects.filter(
            user=request.user,
            workspace__slug=workspace_slug,
            is_read=False,
        ).count()
        return Response({"unread_count": count})


class NotificationReadAllView(APIView):
    """Mark all notifications as read for the current user in a workspace."""

    permission_classes = [IsAuthenticated]

    def post(self, request, workspace_slug):
        get_object_or_404(Workspace, slug=workspace_slug, members__user=request.user)
        updated = Notification.objects.filter(
            user=request.user,
            workspace__slug=workspace_slug,
            is_read=False,
        ).update(is_read=True)
        return Response({"updated": updated})


class NotificationDetailView(APIView):
    """Mark a single notification as read (PATCH only)."""

    permission_classes = [IsAuthenticated]

    def patch(self, request, workspace_slug, notification_id):
        get_object_or_404(Workspace, slug=workspace_slug, members__user=request.user)
        notification = get_object_or_404(
            Notification,
            id=notification_id,
            user=request.user,
            workspace__slug=workspace_slug,
        )
        notification.is_read = True
        notification.save(update_fields=["is_read"])
        return Response(NotificationSerializer(notification).data)
