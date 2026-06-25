from django.urls import path
from .views import SprintDetailView, SprintListCreateView, SprintStatsView

urlpatterns = [
    path("",                             SprintListCreateView.as_view(), name="sprint-list"),
    path("<uuid:sprint_id>/",            SprintDetailView.as_view(),     name="sprint-detail"),
    path("<uuid:sprint_id>/stats/",      SprintStatsView.as_view(),      name="sprint-stats"),
]
