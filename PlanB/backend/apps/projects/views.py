from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.workspaces.models import Workspace
from .models import Project, ProjectMember, ProjectTemplate
from .serializers import (ProjectCreateSerializer, ProjectMemberSerializer,
                          ProjectSerializer, TemplateSerializer)


class ProjectListCreateView(APIView):
    def get(self, request: Request, workspace_slug: str) -> Response:
        workspace = get_object_or_404(Workspace, slug=workspace_slug, members__user=request.user)
        projects = workspace.projects.filter(
            members__user=request.user
        ).select_related("created_by", "workspace")
        return Response(ProjectSerializer(projects, many=True).data)

    def post(self, request: Request, workspace_slug: str) -> Response:
        workspace = get_object_or_404(Workspace, slug=workspace_slug, members__user=request.user)
        serializer = ProjectCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        project = serializer.save(workspace=workspace, created_by=request.user)
        ProjectMember.objects.create(project=project, user=request.user, role=ProjectMember.Role.MANAGER)
        return Response(ProjectSerializer(project).data, status=status.HTTP_201_CREATED)


class ProjectDetailView(APIView):
    def _get_project(self, workspace_slug: str, project_id: str, user) -> Project:
        return get_object_or_404(
            Project,
            id=project_id,
            workspace__slug=workspace_slug,
            members__user=user,
        )

    def get(self, request: Request, workspace_slug: str, project_id: str) -> Response:
        project = self._get_project(workspace_slug, project_id, request.user)
        return Response(ProjectSerializer(project).data)

    def patch(self, request: Request, workspace_slug: str, project_id: str) -> Response:
        project = self._get_project(workspace_slug, project_id, request.user)
        self._require_manager(project, request.user)
        serializer = ProjectCreateSerializer(project, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ProjectSerializer(project).data)

    def delete(self, request: Request, workspace_slug: str, project_id: str) -> Response:
        project = self._get_project(workspace_slug, project_id, request.user)
        self._require_manager(project, request.user)
        project.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def _require_manager(self, project: Project, user) -> None:
        member = get_object_or_404(ProjectMember, project=project, user=user)
        if member.role != ProjectMember.Role.MANAGER:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Manager role required.")


class ProjectMemberListView(APIView):
    def get(self, request: Request, workspace_slug: str, project_id: str) -> Response:
        project = get_object_or_404(
            Project, id=project_id, workspace__slug=workspace_slug, members__user=request.user
        )
        members = project.members.select_related("user")
        return Response(ProjectMemberSerializer(members, many=True).data)


# ── Templates ────────────────────────────────────────────────────────────────

class TemplateListView(APIView):
    def get(self, request: Request, slug: str) -> Response:
        get_object_or_404(Workspace, slug=slug, members__user=request.user)
        return Response(TemplateSerializer(ProjectTemplate.objects.all(), many=True).data)


class ProjectFromTemplateView(APIView):
    def post(self, request: Request, slug: str, template_id: int) -> Response:
        from apps.tasks.models import Task
        workspace = get_object_or_404(Workspace, slug=slug, members__user=request.user)
        template  = get_object_or_404(ProjectTemplate, id=template_id)
        name = request.data.get("name", template.name)
        project = Project.objects.create(
            workspace=workspace, name=name,
            description=request.data.get("description", ""),
            created_by=request.user,
        )
        ProjectMember.objects.create(project=project, user=request.user, role=ProjectMember.Role.MANAGER)
        for i, t in enumerate(template.tasks):
            Task.objects.create(
                project=project,
                title=t.get("title", ""),
                status=t.get("status", "todo"),
                priority=t.get("priority", "medium"),
                order=i,
                created_by=request.user,
            )
        return Response(ProjectSerializer(project).data, status=status.HTTP_201_CREATED)
