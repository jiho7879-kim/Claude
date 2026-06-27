from django.urls import path
from . import views

urlpatterns = [
    path("", views.note_list, name="note-list"),
    path("<uuid:note_id>/", views.note_detail, name="note-detail"),
    path("folders/", views.folder_list, name="note-folder-list"),
    path("folders/<uuid:folder_id>/", views.folder_detail, name="note-folder-detail"),
]
