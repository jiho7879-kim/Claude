from rest_framework import serializers

from .models import Note, NoteFolder


class NoteFolderSerializer(serializers.ModelSerializer):
    class Meta:
        model = NoteFolder
        fields = ["id", "name", "parent", "order", "created_at"]
        read_only_fields = ["id", "created_at"]


class NoteSerializer(serializers.ModelSerializer):
    folder_name = serializers.SerializerMethodField()

    class Meta:
        model = Note
        fields = ["id", "folder", "folder_name", "title", "content", "tags", "is_pinned", "created_at", "updated_at"]
        read_only_fields = ["id", "folder_name", "created_at", "updated_at"]

    def get_folder_name(self, obj):
        return obj.folder.name if obj.folder_id else None
