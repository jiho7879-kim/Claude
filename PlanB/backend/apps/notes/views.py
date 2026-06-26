from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

from apps.workspaces.models import Workspace
from .models import Note
from .serializers import NoteSerializer


def _workspace(slug, user):
    return get_object_or_404(Workspace, slug=slug, members__user=user)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def note_list(request, workspace_slug):
    ws = _workspace(workspace_slug, request.user)

    if request.method == "GET":
        q = request.query_params.get("q", "").strip()
        qs = Note.objects.filter(workspace=ws, user=request.user)
        if q:
            qs = qs.filter(content__icontains=q) | qs.filter(title__icontains=q)
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
