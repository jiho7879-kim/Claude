from django.urls import path

from .views import (
    CrossrefLookupView,
    DatasetDetailView,
    DatasetListCreateView,
    ReferenceDetailView,
    ReferenceListCreateView,
    ResearchNoteDetailView,
    ResearchNoteListCreateView,
)

urlpatterns = [
    path("notes/", ResearchNoteListCreateView.as_view()),
    path("notes/<uuid:note_id>/", ResearchNoteDetailView.as_view()),
    path("datasets/", DatasetListCreateView.as_view()),
    path("datasets/<uuid:dataset_id>/", DatasetDetailView.as_view()),
    path("refs/doi-lookup/", CrossrefLookupView.as_view()),
    path("refs/", ReferenceListCreateView.as_view()),
    path("refs/<uuid:ref_id>/", ReferenceDetailView.as_view()),
]
