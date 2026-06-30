import os
import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.text import slugify


def _upload_to(instance, filename: str) -> str:
    """Store files under files/<year>/<month>/<uuid>_<slugified_name>.

    Called during field pre-save before ``created_at`` is set on new records,
    so we fall back to ``timezone.now()`` when the field is ``None``.
    """
    ts = instance.created_at if instance.created_at is not None else timezone.now()
    ext = os.path.splitext(filename)[1]
    basename = os.path.splitext(filename)[0][:60]
    safe = slugify(basename) or "untitled"
    return f"files/{ts.strftime('%Y/%m')}/{uuid.uuid4().hex}_{safe}{ext}"


class FileAttachment(models.Model):
    """A generic file / image attachment that can be linked to tasks or notes."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    file = models.FileField(upload_to=_upload_to)
    original_name = models.CharField(max_length=500)
    content_type = models.CharField(max_length=200, blank=True, default="")
    size_bytes = models.PositiveIntegerField(default=0)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="file_uploads",
    )
    note = models.ForeignKey(
        "notes.Note", on_delete=models.SET_NULL, null=True, blank=True, related_name="attachments"
    )
    task = models.ForeignKey(
        "tasks.Task", on_delete=models.SET_NULL, null=True, blank=True, related_name="attachments"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.original_name

    def save(self, *args, **kwargs) -> None:
        if not self.original_name:
            self.original_name = os.path.basename(self.file.name)
        if not self.content_type and self.file:
            ctype = getattr(self.file, "content_type", "")
            self.content_type = ctype or ""
        if not self.size_bytes and self.file:
            try:
                self.size_bytes = self.file.size
            except (OSError, AttributeError):
                pass
        super().save(*args, **kwargs)

    @property
    def url(self) -> str:
        return self.file.url if self.file else ""
