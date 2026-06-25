from django.urls import path

from .views import RuleDetailView, RuleListCreateView, RuleLogListView

urlpatterns = [
    path("rules/", RuleListCreateView.as_view(), name="rule-list"),
    path("rules/<uuid:rule_id>/", RuleDetailView.as_view(), name="rule-detail"),
    path("rules/<uuid:rule_id>/logs/", RuleLogListView.as_view(), name="rule-logs"),
]
