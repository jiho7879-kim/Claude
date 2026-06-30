from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.workspaces.models import Workspace

from .crypto import decrypt_password
from .models import CalendarEvent, TimeTreeIntegration
from .serializers import (
    CalendarEventCreateSerializer,
    CalendarEventSerializer,
    TimeTreeIntegrationSerializer,
)


class CalendarEventListCreateView(APIView):
    def get(self, request: Request, workspace_slug: str) -> Response:
        workspace = get_object_or_404(Workspace, slug=workspace_slug, members__user=request.user)
        events = workspace.events.select_related("created_by")
        return Response(CalendarEventSerializer(events, many=True).data)

    def post(self, request: Request, workspace_slug: str) -> Response:
        workspace = get_object_or_404(Workspace, slug=workspace_slug, members__user=request.user)
        serializer = CalendarEventCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        event = serializer.save(workspace=workspace, created_by=request.user)
        return Response(CalendarEventSerializer(event).data, status=status.HTTP_201_CREATED)


class CalendarEventDetailView(APIView):
    def _get_event(self, workspace_slug: str, event_id: str, user) -> CalendarEvent:
        return get_object_or_404(
            CalendarEvent, id=event_id, workspace__slug=workspace_slug, workspace__members__user=user
        )

    def get(self, request: Request, workspace_slug: str, event_id: str) -> Response:
        event = self._get_event(workspace_slug, event_id, request.user)
        return Response(CalendarEventSerializer(event).data)

    def patch(self, request: Request, workspace_slug: str, event_id: str) -> Response:
        event = self._get_event(workspace_slug, event_id, request.user)
        if event.created_by != request.user:
            return Response({"detail": "Only creator can edit this event."}, status=status.HTTP_403_FORBIDDEN)
        serializer = CalendarEventCreateSerializer(event, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(CalendarEventSerializer(event).data)

    def delete(self, request: Request, workspace_slug: str, event_id: str) -> Response:
        event = self._get_event(workspace_slug, event_id, request.user)
        if event.created_by != request.user:
            return Response({"detail": "Only creator can delete this event."}, status=status.HTTP_403_FORBIDDEN)
        event.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PresentationCalendarView(APIView):
    """Presentation mode: public events only, no login required."""

    permission_classes = [AllowAny]

    def get(self, request: Request, workspace_slug: str) -> Response:
        workspace = get_object_or_404(Workspace, slug=workspace_slug)
        events = workspace.events.filter(
            visibility=CalendarEvent.Visibility.PUBLIC
        ).select_related("created_by")
        return Response(CalendarEventSerializer(events, many=True).data)


# ─── TimeTree Integration ───────────────────────────────────────────────────


class TimeTreeIntegrationListCreateView(APIView):
    def get(self, request: Request, workspace_slug: str) -> Response:
        workspace = get_object_or_404(Workspace, slug=workspace_slug, members__user=request.user)
        qs = workspace.timetree_integrations.all()
        return Response(TimeTreeIntegrationSerializer(qs, many=True).data)

    def post(self, request: Request, workspace_slug: str) -> Response:
        workspace = get_object_or_404(Workspace, slug=workspace_slug, members__user=request.user)
        serializer = TimeTreeIntegrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        integration = serializer.save(workspace=workspace)
        return Response(TimeTreeIntegrationSerializer(integration).data, status=status.HTTP_201_CREATED)


class TimeTreeIntegrationDetailView(APIView):
    def _get(self, workspace_slug: str, integration_id: str, user):
        return get_object_or_404(
            TimeTreeIntegration,
            id=integration_id,
            workspace__slug=workspace_slug,
            workspace__members__user=user,
        )

    def get(self, request: Request, workspace_slug: str, integration_id: str) -> Response:
        integration = self._get(workspace_slug, integration_id, request.user)
        return Response(TimeTreeIntegrationSerializer(integration).data)

    def patch(self, request: Request, workspace_slug: str, integration_id: str) -> Response:
        integration = self._get(workspace_slug, integration_id, request.user)
        serializer = TimeTreeIntegrationSerializer(integration, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(TimeTreeIntegrationSerializer(integration).data)

    def delete(self, request: Request, workspace_slug: str, integration_id: str) -> Response:
        integration = self._get(workspace_slug, integration_id, request.user)
        integration.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class TimeTreeIntegrationSyncView(APIView):
    def _get(self, workspace_slug: str, integration_id: str, user):
        return get_object_or_404(
            TimeTreeIntegration,
            id=integration_id,
            workspace__slug=workspace_slug,
            workspace__members__user=user,
        )

    def post(self, request: Request, workspace_slug: str, integration_id: str) -> Response:
        integration = self._get(workspace_slug, integration_id, request.user)

        from django.core.management import call_command
        from io import StringIO

        buf = StringIO()
        try:
            password = decrypt_password(integration.encrypted_password) if integration.encrypted_password else ""
            call_command(
                "sync_timetree",
                workspace_slug=workspace_slug,
                timetree_email=integration.timetree_email,
                timetree_password=password,
                calendar_code=integration.calendar_code,
                stdout=buf,
                stderr=buf,
            )
            integration.last_status = "success"
            integration.last_error = ""
            from django.utils import timezone
            integration.last_synced_at = timezone.now()
            integration.save(update_fields=["last_status", "last_error", "last_synced_at"])
            return Response({"status": "ok", "output": buf.getvalue()})
        except Exception as e:
            integration.last_status = "error"
            integration.last_error = str(e)
            from django.utils import timezone
            integration.last_synced_at = timezone.now()
            integration.save(update_fields=["last_status", "last_error", "last_synced_at"])
            return Response(
                {"status": "error", "detail": str(e), "output": buf.getvalue()},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
