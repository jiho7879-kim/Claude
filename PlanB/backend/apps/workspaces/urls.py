from django.urls import path

from apps.projects.views import ProjectFromTemplateView, TemplateListView

from .views import SavedViewDetailView, SavedViewListCreateView, WorkspaceDetailView, WorkspaceListCreateView, WorkspaceMemberDetailView, WorkspaceMemberListView

urlpatterns = [
    path("", WorkspaceListCreateView.as_view(), name="workspace-list"),
    path("<slug:slug>/", WorkspaceDetailView.as_view(), name="workspace-detail"),
    path("<slug:slug>/members/", WorkspaceMemberListView.as_view(), name="workspace-members"),
    path("<slug:slug>/members/<int:user_id>/", WorkspaceMemberDetailView.as_view(), name="workspace-member-detail"),
    path("<slug:slug>/templates/", TemplateListView.as_view(), name="template-list"),
    path("<slug:slug>/templates/<int:template_id>/apply/", ProjectFromTemplateView.as_view(), name="template-apply"),
    path("<slug:slug>/projects/<uuid:project_id>/saved-views/", SavedViewListCreateView.as_view(), name="saved-view-list"),
    path("<slug:slug>/projects/<uuid:project_id>/saved-views/<uuid:view_id>/", SavedViewDetailView.as_view(), name="saved-view-detail"),
]
