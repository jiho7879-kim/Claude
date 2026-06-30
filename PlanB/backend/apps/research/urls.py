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
    path("notes/", ResearchNoteListCreateView.as_view(), name="research-note-list"),
    path("notes/<uuid:note_id>/", ResearchNoteDetailView.as_view(), name="research-note-detail"),
    path("datasets/", DatasetListCreateView.as_view(), name="research-dataset-list"),
    path("datasets/<uuid:dataset_id>/", DatasetDetailView.as_view(), name="research-dataset-detail"),
    path("refs/doi-lookup/", CrossrefLookupView.as_view(), name="research-doi-lookup"),
    path("refs/", ReferenceListCreateView.as_view(), name="research-ref-list"),
    path("refs/<uuid:ref_id>/", ReferenceDetailView.as_view(), name="research-ref-detail"),
]
