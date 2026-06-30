from django.shortcuts import get_object_or_404
from django.http import FileResponse
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.notes.models import Note
from apps.tasks.models import Task
from apps.workspaces.models import Workspace

from .models import FileAttachment
from .serializers import FileAttachmentSerializer


class FileUploadView(APIView):
    """Upload one or more files. Multipart POST with 'file' field(s)."""

    parser_classes = [FormParser, MultiPartParser]
    permission_classes = [IsAuthenticated]

    def post(self, request, workspace_slug: str):
        get_object_or_404(Workspace, slug=workspace_slug, members__user=request.user)
        files = request.FILES.getlist("file") or [request.FILES.get("file")]
        files = [f for f in files if f]

        if not files:
            return Response({"error": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)

        note_id = request.data.get("note_id")
        task_id = request.data.get("task_id")
        note = None
        task = None

        if note_id:
            note = get_object_or_404(Note, id=note_id, workspace__slug=workspace_slug, user=request.user)
        if task_id:
            task = get_object_or_404(Task, id=task_id, project__workspace__slug=workspace_slug)

        created = []
        for f in files:
            attachment = FileAttachment(
                file=f,
                original_name=f.name,
                content_type=f.content_type or "",
                size_bytes=f.size,
                uploaded_by=request.user,
                note=note,
                task=task,
            )
            attachment.save()
            created.append(attachment)

        return Response(
            FileAttachmentSerializer(created, many=True).data,
            status=status.HTTP_201_CREATED,
        )


class FileDetailView(APIView):
    """Download (GET) or delete (DELETE) a file attachment."""

    permission_classes = [IsAuthenticated]

    def get(self, request, workspace_slug: str, file_id: str):
        attachment = get_object_or_404(
            FileAttachment, id=file_id, uploaded_by=request.user,
        )
        if not attachment.file:
            return Response({"error": "File not found."}, status=status.HTTP_404_NOT_FOUND)

        response = FileResponse(
            attachment.file.open("rb"),
            content_type=attachment.content_type or "application/octet-stream",
        )
        response["Content-Disposition"] = f'inline; filename="{attachment.original_name}"'
        return response

    def delete(self, request, workspace_slug: str, file_id: str):
        attachment = get_object_or_404(
            FileAttachment, id=file_id, uploaded_by=request.user,
        )
        attachment.file.delete(save=False)
        attachment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class FileListView(APIView):
    """List files uploaded by the current user."""

    permission_classes = [IsAuthenticated]

    def get(self, request, workspace_slug: str):
        get_object_or_404(Workspace, slug=workspace_slug, members__user=request.user)
        files = FileAttachment.objects.filter(uploaded_by=request.user).select_related("uploaded_by")
        return Response(FileAttachmentSerializer(files, many=True).data)
