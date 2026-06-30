from django.contrib import admin

from .models import FileAttachment


@admin.register(FileAttachment)
class FileAttachmentAdmin(admin.ModelAdmin):
    list_display = ("original_name", "content_type", "size_bytes", "uploaded_by", "created_at")
    search_fields = ("original_name",)
