from django.db import models
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import SavedView, Workspace, WorkspaceMember
from .serializers import SavedViewCreateSerializer, SavedViewSerializer, WorkspaceCreateSerializer, WorkspaceMemberSerializer, WorkspaceSerializer


class WorkspaceListCreateView(APIView):
    def get(self, request: Request) -> Response:
        workspaces = Workspace.objects.filter(members__user=request.user)
        serializer = WorkspaceSerializer(workspaces, many=True)
        return Response(serializer.data)

    def post(self, request: Request) -> Response:
        serializer = WorkspaceCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        workspace = serializer.save(owner=request.user)
        WorkspaceMember.objects.create(
            workspace=workspace, user=request.user, role=WorkspaceMember.Role.OWNER
        )
        return Response(WorkspaceSerializer(workspace).data, status=status.HTTP_201_CREATED)


class WorkspaceDetailView(APIView):
    def _get_workspace(self, slug: str, user) -> Workspace:
        return get_object_or_404(Workspace, slug=slug, members__user=user)

    def get(self, request: Request, slug: str) -> Response:
        workspace = self._get_workspace(slug, request.user)
        return Response(WorkspaceSerializer(workspace).data)

    def patch(self, request: Request, slug: str) -> Response:
        workspace = self._get_workspace(slug, request.user)
        self._require_admin(workspace, request.user)
        serializer = WorkspaceCreateSerializer(workspace, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(WorkspaceSerializer(workspace).data)

    def delete(self, request: Request, slug: str) -> Response:
        workspace = self._get_workspace(slug, request.user)
        if workspace.owner != request.user:
            return Response({"detail": "Only owner can delete workspace."}, status=status.HTTP_403_FORBIDDEN)
        workspace.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def _require_admin(self, workspace: Workspace, user) -> None:
        member = get_object_or_404(WorkspaceMember, workspace=workspace, user=user)
        if member.role not in (WorkspaceMember.Role.OWNER, WorkspaceMember.Role.ADMIN):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Admin or owner role required.")


class WorkspaceMemberListView(APIView):
    def get(self, request: Request, slug: str) -> Response:
        workspace = get_object_or_404(Workspace, slug=slug, members__user=request.user)
        members = workspace.members.select_related("user")
        return Response(WorkspaceMemberSerializer(members, many=True).data)


class WorkspaceMemberDetailView(APIView):
    def delete(self, request: Request, slug: str, user_id: int) -> Response:
        workspace = get_object_or_404(Workspace, slug=slug, members__user=request.user)
        requesting_member = get_object_or_404(WorkspaceMember, workspace=workspace, user=request.user)
        if requesting_member.role not in (WorkspaceMember.Role.OWNER, WorkspaceMember.Role.ADMIN):
            return Response({"detail": "Admin or owner role required."}, status=status.HTTP_403_FORBIDDEN)
        member = get_object_or_404(WorkspaceMember, workspace=workspace, user_id=user_id)
        if member.role == WorkspaceMember.Role.OWNER:
            return Response({"detail": "Cannot remove workspace owner."}, status=status.HTTP_400_BAD_REQUEST)
        member.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SavedViewListCreateView(APIView):
    def get(self, request: Request, slug: str, project_id: str) -> Response:
        workspace = get_object_or_404(Workspace, slug=slug, members__user=request.user)
        views = SavedView.objects.filter(workspace=workspace, project_id=project_id).filter(
            models.Q(owner=request.user) | models.Q(is_shared=True)
        ).select_related("owner")
        return Response(SavedViewSerializer(views, many=True).data)

    def post(self, request: Request, slug: str, project_id: str) -> Response:
        workspace = get_object_or_404(Workspace, slug=slug, members__user=request.user)
        serializer = SavedViewCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        view = serializer.save(workspace=workspace, project_id=project_id, owner=request.user)
        return Response(SavedViewSerializer(view).data, status=status.HTTP_201_CREATED)


class SavedViewDetailView(APIView):
    def delete(self, request: Request, slug: str, project_id: str, view_id: str) -> Response:
        workspace = get_object_or_404(Workspace, slug=slug, members__user=request.user)
        saved_view = get_object_or_404(SavedView, id=view_id, workspace=workspace, project_id=project_id)
        if saved_view.owner != request.user:
            return Response({"detail": "Only owner can delete this view."}, status=status.HTTP_403_FORBIDDEN)
        saved_view.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
