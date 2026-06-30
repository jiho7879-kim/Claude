from django.urls import path

from .views import FileDetailView, FileListView, FileUploadView

urlpatterns = [
    path("upload/", FileUploadView.as_view(), name="file-upload"),
    path("files/", FileListView.as_view(), name="file-list"),
    path("files/<uuid:file_id>/", FileDetailView.as_view(), name="file-detail"),
]
