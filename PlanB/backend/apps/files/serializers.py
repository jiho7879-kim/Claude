from rest_framework import serializers

from .models import FileAttachment


class FileUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
    note_id = serializers.UUIDField(required=False, allow_null=True)
    task_id = serializers.UUIDField(required=False, allow_null=True)


class FileAttachmentSerializer(serializers.ModelSerializer):
    url = serializers.CharField(read_only=True)
    uploaded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = FileAttachment
        fields = (
            "id", "url", "original_name", "content_type", "size_bytes",
            "uploaded_by", "uploaded_by_name", "note", "task", "created_at",
        )
        read_only_fields = (
            "id", "url", "original_name", "content_type", "size_bytes",
            "uploaded_by", "created_at",
        )

    def get_uploaded_by_name(self, obj):
        return obj.uploaded_by.username if obj.uploaded_by else None
