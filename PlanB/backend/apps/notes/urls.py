from django.urls import path
from . import views

urlpatterns = [
    path("", views.note_list, name="note-list"),
    path("<uuid:note_id>/", views.note_detail, name="note-detail"),
]
