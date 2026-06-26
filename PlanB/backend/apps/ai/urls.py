from django.urls import path
from . import views

urlpatterns = [
    path("nl-task/", views.nl_task, name="ai-nl-task"),
    path("weekly-summary/", views.weekly_summary, name="ai-weekly-summary"),
    path("chat/", views.chat, name="ai-chat"),
]

project_urlpatterns = [
    path("ai/breakdown/", views.epic_breakdown, name="ai-epic-breakdown"),
]
