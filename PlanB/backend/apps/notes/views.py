from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

from apps.workspaces.models import Workspace
from .models import Note, NoteFolder
from .serializers import NoteSerializer, NoteFolderSerializer


def _workspace(slug, user):
    return get_object_or_404(Workspace, slug=slug, members__user=user)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def note_list(request, workspace_slug):
    ws = _workspace(workspace_slug, request.user)

    if request.method == "GET":
        q = request.query_params.get("q", "").strip()
        folder_param = request.query_params.get("folder", None)
        qs = Note.objects.filter(workspace=ws, user=request.user)
        if q:
            qs = qs.filter(content__icontains=q) | qs.filter(title__icontains=q)
        elif folder_param == "root":
            qs = qs.filter(folder__isnull=True)
        elif folder_param:
            qs = qs.filter(folder_id=folder_param)
        return Response(NoteSerializer(qs.distinct(), many=True).data)

    serializer = NoteSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save(workspace=ws, user=request.user)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def note_detail(request, workspace_slug, note_id):
    ws = _workspace(workspace_slug, request.user)
    note = get_object_or_404(Note, id=note_id, workspace=ws, user=request.user)

    if request.method == "GET":
        return Response(NoteSerializer(note).data)
    if request.method == "PATCH":
        serializer = NoteSerializer(note, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    note.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def folder_list(request, workspace_slug):
    ws = _workspace(workspace_slug, request.user)

    if request.method == "GET":
        folders = NoteFolder.objects.filter(workspace=ws, user=request.user)
        return Response(NoteFolderSerializer(folders, many=True).data)

    serializer = NoteFolderSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save(workspace=ws, user=request.user)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def folder_detail(request, workspace_slug, folder_id):
    ws = _workspace(workspace_slug, request.user)
    folder = get_object_or_404(NoteFolder, id=folder_id, workspace=ws, user=request.user)

    if request.method == "PATCH":
        serializer = NoteFolderSerializer(folder, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    folder.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
