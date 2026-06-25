from django.urls import path

from .views import (
    DailyEntryDetailView,
    DailyEntryListCreateView,
    HabitDetailView,
    HabitListCreateView,
    HabitLogToggleView,
    HabitLogsRangeView,
    TimeBlockDetailView,
    TimeBlockListCreateView,
    WeekEntriesView,
    WeeklyReviewDetailView,
)

urlpatterns = [
    path("entries/",                                         DailyEntryListCreateView.as_view(),  name="planner-entry-list"),
    path("entries/<str:entry_date>/",                        DailyEntryDetailView.as_view(),      name="planner-entry-detail"),
    path("entries/<str:entry_date>/blocks/",                 TimeBlockListCreateView.as_view(),    name="planner-block-list"),
    path("entries/<str:entry_date>/blocks/<uuid:block_id>/", TimeBlockDetailView.as_view(),       name="planner-block-detail"),
    path("habits/",                                          HabitListCreateView.as_view(),       name="planner-habit-list"),
    path("habits/<uuid:habit_id>/",                          HabitDetailView.as_view(),           name="planner-habit-detail"),
    path("habits/<uuid:habit_id>/log/",                      HabitLogToggleView.as_view(),        name="planner-habit-log"),
    path("habits/<uuid:habit_id>/logs/",                     HabitLogsRangeView.as_view(),        name="planner-habit-logs"),
    path("weeks/<int:year>/<int:week>/entries/",             WeekEntriesView.as_view(),           name="planner-week-entries"),
    path("weeks/<int:year>/<int:week>/review/",              WeeklyReviewDetailView.as_view(),    name="planner-week-review"),
]
