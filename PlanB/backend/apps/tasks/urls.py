from django.urls import path

from .views import (AnalyticsView, ChecklistItemDetailView,
                    ChecklistListCreateView, SprintDetailView,
                    SprintListCreateView, SprintStatsView, TaskActivityView,
                    TaskCommentListCreateView, TaskDetailView,
                    TaskListCreateView, TaskRelationDeleteView,
                    TaskRelationListCreateView, TimeEntryDetailView,
                    TimeEntryListCreateView)

urlpatterns = [
    path("analytics/",                        AnalyticsView.as_view(),          name="analytics"),
    path("sprints/",                          SprintListCreateView.as_view(),   name="sprint-list"),
    path("sprints/<uuid:sprint_id>/",         SprintDetailView.as_view(),       name="sprint-detail"),
    path("sprints/<uuid:sprint_id>/stats/",   SprintStatsView.as_view(),        name="sprint-stats"),
    path("",                                  TaskListCreateView.as_view(),     name="task-list"),
    path("<uuid:task_id>/",                   TaskDetailView.as_view(),         name="task-detail"),
    path("<uuid:task_id>/comments/",          TaskCommentListCreateView.as_view(), name="task-comments"),
    path("<uuid:task_id>/activity/",          TaskActivityView.as_view(),       name="task-activity"),
    path("<uuid:task_id>/checklist/",         ChecklistListCreateView.as_view(), name="task-checklist"),
    path("<uuid:task_id>/checklist/<uuid:item_id>/", ChecklistItemDetailView.as_view(), name="task-checklist-item"),
    path("<uuid:task_id>/relations/",         TaskRelationListCreateView.as_view(), name="task-relations"),
    path("<uuid:task_id>/relations/<uuid:relation_id>/", TaskRelationDeleteView.as_view(), name="task-relation-detail"),
    path("<uuid:task_id>/time-entries/",                 TimeEntryListCreateView.as_view(), name="time-entry-list"),
    path("<uuid:task_id>/time-entries/<uuid:entry_id>/", TimeEntryDetailView.as_view(),     name="time-entry-detail"),
]
