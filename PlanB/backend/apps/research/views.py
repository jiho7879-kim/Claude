import urllib.request
import json

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.projects.models import Project
from apps.workspaces.models import Workspace

from .models import Dataset, Reference, ResearchNote
from .serializers import DatasetSerializer, ReferenceSerializer, ResearchNoteSerializer


def _get_project(workspace_slug: str, project_id: str, user) -> Project:
    return get_object_or_404(
        Project,
        id=project_id,
        workspace__slug=workspace_slug,
        members__user=user,
    )


class ResearchNoteListCreateView(APIView):
    def get(self, request: Request, workspace_slug: str, project_id: str) -> Response:
        project = _get_project(workspace_slug, project_id, request.user)
        notes = project.notes.select_related("author")
        return Response(ResearchNoteSerializer(notes, many=True).data)

    def post(self, request: Request, workspace_slug: str, project_id: str) -> Response:
        project = _get_project(workspace_slug, project_id, request.user)
        serializer = ResearchNoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        note = serializer.save(project=project, author=request.user)
        return Response(ResearchNoteSerializer(note).data, status=status.HTTP_201_CREATED)


class ResearchNoteDetailView(APIView):
    def _get_note(self, project_id, note_id):
        return get_object_or_404(ResearchNote, id=note_id, project_id=project_id)

    def patch(self, request: Request, workspace_slug: str, project_id: str, note_id: str) -> Response:
        _get_project(workspace_slug, project_id, request.user)
        note = self._get_note(project_id, note_id)
        serializer = ResearchNoteSerializer(note, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ResearchNoteSerializer(note).data)

    def delete(self, request: Request, workspace_slug: str, project_id: str, note_id: str) -> Response:
        _get_project(workspace_slug, project_id, request.user)
        note = self._get_note(project_id, note_id)
        note.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class DatasetListCreateView(APIView):
    def get(self, request: Request, workspace_slug: str, project_id: str) -> Response:
        project = _get_project(workspace_slug, project_id, request.user)
        datasets = project.datasets.select_related("created_by")
        return Response(DatasetSerializer(datasets, many=True).data)

    def post(self, request: Request, workspace_slug: str, project_id: str) -> Response:
        project = _get_project(workspace_slug, project_id, request.user)
        serializer = DatasetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        dataset = serializer.save(project=project, created_by=request.user)
        return Response(DatasetSerializer(dataset).data, status=status.HTTP_201_CREATED)


class DatasetDetailView(APIView):
    def _get_dataset(self, project_id, dataset_id):
        return get_object_or_404(Dataset, id=dataset_id, project_id=project_id)

    def patch(self, request: Request, workspace_slug: str, project_id: str, dataset_id: str) -> Response:
        _get_project(workspace_slug, project_id, request.user)
        dataset = self._get_dataset(project_id, dataset_id)
        serializer = DatasetSerializer(dataset, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(DatasetSerializer(dataset).data)

    def delete(self, request: Request, workspace_slug: str, project_id: str, dataset_id: str) -> Response:
        _get_project(workspace_slug, project_id, request.user)
        dataset = self._get_dataset(project_id, dataset_id)
        dataset.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ReferenceListCreateView(APIView):
    def get(self, request: Request, workspace_slug: str, project_id: str) -> Response:
        _get_project(workspace_slug, project_id, request.user)
        refs = Reference.objects.filter(project_id=project_id).select_related("added_by")
        return Response(ReferenceSerializer(refs, many=True).data)

    def post(self, request: Request, workspace_slug: str, project_id: str) -> Response:
        project = _get_project(workspace_slug, project_id, request.user)
        workspace = get_object_or_404(Workspace, slug=workspace_slug)
        serializer = ReferenceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ref = serializer.save(workspace=workspace, project=project, added_by=request.user)
        return Response(ReferenceSerializer(ref).data, status=status.HTTP_201_CREATED)


class ReferenceDetailView(APIView):
    def delete(self, request: Request, workspace_slug: str, project_id: str, ref_id: str) -> Response:
        _get_project(workspace_slug, project_id, request.user)
        ref = get_object_or_404(Reference, id=ref_id, project_id=project_id)
        ref.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CrossrefLookupView(APIView):
    def get(self, request: Request, workspace_slug: str, project_id: str) -> Response:
        _get_project(workspace_slug, project_id, request.user)
        doi = request.query_params.get("doi", "").strip()
        if not doi:
            return Response({"error": "doi required"}, status=status.HTTP_400_BAD_REQUEST)
        doi_clean = doi.replace("https://doi.org/", "").replace("http://doi.org/", "")
        try:
            url = f"https://api.crossref.org/works/{doi_clean}"
            req = urllib.request.Request(url, headers={"User-Agent": "PlanB/1.0 (mailto:admin@example.com)"})
            with urllib.request.urlopen(req, timeout=8) as resp:
                data = json.loads(resp.read())["message"]
            authors = [
                f"{a.get('given','')} {a.get('family','')}".strip()
                for a in data.get("author", [])
            ]
            year = None
            issued = data.get("issued", {}).get("date-parts", [[]])
            if issued and issued[0]:
                year = issued[0][0]
            title_list = data.get("title", [])
            journal_list = data.get("container-title", [])
            return Response({
                "doi": doi_clean,
                "title": title_list[0] if title_list else "",
                "authors": authors,
                "year": year,
                "journal": journal_list[0] if journal_list else "",
                "abstract": data.get("abstract", ""),
                "url": data.get("URL", ""),
            })
        except Exception:
            return Response({"error": "DOI lookup failed"}, status=status.HTTP_502_BAD_GATEWAY)
