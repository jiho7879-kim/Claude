from django.urls import path

from .views import ProjectDetailView, ProjectListCreateView, ProjectMemberListView

urlpatterns = [
    path("", ProjectListCreateView.as_view(), name="project-list"),
    path("<uuid:project_id>/", ProjectDetailView.as_view(), name="project-detail"),
    path("<uuid:project_id>/members/", ProjectMemberListView.as_view(), name="project-members"),
]
