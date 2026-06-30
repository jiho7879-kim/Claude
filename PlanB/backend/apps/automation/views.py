from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.projects.models import Project
from apps.workspaces.models import Workspace

from .models import Rule, RuleLog
from .serializers import RuleLogSerializer, RuleSerializer


class RuleListCreateView(APIView):
    def _get_project(self, workspace_slug: str, project_id: str, user):
        workspace = get_object_or_404(Workspace, slug=workspace_slug, members__user=user)
        return get_object_or_404(Project, id=project_id, workspace=workspace)

    def get(self, request: Request, workspace_slug: str, project_id: str) -> Response:
        project = self._get_project(workspace_slug, project_id, request.user)
        rules = project.rules.all()
        return Response(RuleSerializer(rules, many=True).data)

    def post(self, request: Request, workspace_slug: str, project_id: str) -> Response:
        project = self._get_project(workspace_slug, project_id, request.user)
        serializer = RuleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        rule = serializer.save(project=project)
        return Response(RuleSerializer(rule).data, status=status.HTTP_201_CREATED)


class RuleDetailView(APIView):
    def _get_rule(self, workspace_slug: str, project_id: str, rule_id: str, user):
        workspace = get_object_or_404(Workspace, slug=workspace_slug, members__user=user)
        project = get_object_or_404(Project, id=project_id, workspace=workspace)
        return get_object_or_404(Rule, id=rule_id, project=project)

    def patch(self, request: Request, workspace_slug: str, project_id: str, rule_id: str) -> Response:
        rule = self._get_rule(workspace_slug, project_id, rule_id, request.user)
        serializer = RuleSerializer(rule, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(RuleSerializer(rule).data)

    def delete(self, request: Request, workspace_slug: str, project_id: str, rule_id: str) -> Response:
        rule = self._get_rule(workspace_slug, project_id, rule_id, request.user)
        rule.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class RuleLogListView(APIView):
    def get(self, request: Request, workspace_slug: str, project_id: str, rule_id: str) -> Response:
        workspace = get_object_or_404(Workspace, slug=workspace_slug, members__user=request.user)
        project = get_object_or_404(Project, id=project_id, workspace=workspace)
        rule = get_object_or_404(Rule, id=rule_id, project=project)
        logs = rule.logs.select_related("task")[:50]
        return Response(RuleLogSerializer(logs, many=True).data)
