from rest_framework import serializers

from .models import Rule, RuleLog


class RuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rule
        fields = ("id", "name", "trigger", "trigger_val", "action", "action_val", "is_active", "created_at")
        read_only_fields = ("id", "created_at")


class RuleLogSerializer(serializers.ModelSerializer):
    rule_name = serializers.CharField(source="rule.name", read_only=True)
    task_title = serializers.CharField(source="task.title", read_only=True, default="")

    class Meta:
        model = RuleLog
        fields = ("id", "rule_name", "task_title", "triggered_at", "action_taken", "success")
        read_only_fields = fields
