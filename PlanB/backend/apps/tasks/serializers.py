from datetime import timedelta

from rest_framework import serializers

from apps.accounts.serializers import UserSerializer

from .models import ActivityLog, ChecklistItem, Sprint, Task, TaskComment, TaskRelation, TimeEntry


class SprintSerializer(serializers.ModelSerializer):
    tasks_count    = serializers.SerializerMethodField()
    completed_count = serializers.SerializerMethodField()

    class Meta:
        model  = Sprint
        fields = ("id", "project", "name", "status", "start_date", "end_date", "goal",
                  "tasks_count", "completed_count", "created_at")
        read_only_fields = ("id", "project", "created_at")

    def get_tasks_count(self, obj):    return obj.tasks.count()
    def get_completed_count(self, obj): return obj.tasks.filter(status="done").count()


class SprintCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Sprint
        fields = ("name", "status", "start_date", "end_date", "goal")


class TaskSerializer(serializers.ModelSerializer):
    assignee       = UserSerializer(read_only=True)
    created_by     = UserSerializer(read_only=True)
    level_name     = serializers.CharField(read_only=True)
    children_count = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    sprint_name    = serializers.SerializerMethodField()

    class Meta:
        model  = Task
        fields = ("id", "project", "sprint", "sprint_name", "parent", "title", "description",
                  "status", "priority", "assignee", "created_by",
                  "start_date", "due_date", "is_milestone", "depth", "level_name", "order",
                  "children_count", "comments_count", "created_at", "updated_at")
        read_only_fields = ("id", "project", "depth", "created_by", "created_at", "updated_at")

    def get_children_count(self, obj): return obj.children.count()
    def get_comments_count(self, obj): return obj.comments.count()
    def get_sprint_name(self, obj):    return obj.sprint.name if obj.sprint else None


class TaskCreateSerializer(serializers.ModelSerializer):
    assignee_id = serializers.IntegerField(required=False, allow_null=True)
    sprint_id   = serializers.UUIDField(required=False, allow_null=True)

    class Meta:
        model  = Task
        fields = ("parent", "sprint_id", "title", "description", "status", "priority",
                  "assignee_id", "start_date", "due_date", "is_milestone", "order")

    def _resolve_relations(self, validated_data):
        from django.contrib.auth import get_user_model
        from apps.tasks.models import Sprint
        User = get_user_model()
        assignee_id = validated_data.pop("assignee_id", -1)
        sprint_id   = validated_data.pop("sprint_id", -1)
        if assignee_id != -1:
            validated_data["assignee"] = User.objects.filter(pk=assignee_id).first() if assignee_id else None
        if sprint_id != -1:
            validated_data["sprint"] = Sprint.objects.filter(pk=sprint_id).first() if sprint_id else None
        return validated_data

    def create(self, validated_data):
        return super().create(self._resolve_relations(validated_data))

    def update(self, instance, validated_data):
        return super().update(instance, self._resolve_relations(validated_data))


class TaskTreeSerializer(TaskSerializer):
    children = serializers.SerializerMethodField()

    class Meta(TaskSerializer.Meta):
        fields = TaskSerializer.Meta.fields + ("children",)

    def get_children(self, obj):
        return TaskTreeSerializer(obj.children.all(), many=True).data


class TaskCommentSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)

    class Meta:
        model  = TaskComment
        fields = ("id", "task", "author", "content", "created_at", "updated_at")
        read_only_fields = ("id", "task", "author", "created_at", "updated_at")


class TaskRelationSerializer(serializers.ModelSerializer):
    from_task_title = serializers.CharField(source="from_task.title", read_only=True)
    to_task_title   = serializers.CharField(source="to_task.title", read_only=True)

    class Meta:
        model  = TaskRelation
        fields = ("id", "from_task", "from_task_title", "to_task", "to_task_title", "relation_type", "created_at")
        read_only_fields = ("id", "from_task", "created_at")


class TaskRelationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = TaskRelation
        fields = ("to_task", "relation_type")


class ChecklistItemSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ChecklistItem
        fields = ("id", "task", "text", "is_done", "order", "created_at")
        read_only_fields = ("id", "task", "created_at")


class ChecklistItemCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ChecklistItem
        fields = ("text", "order")


class TimeEntrySerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model  = TimeEntry
        fields = ("id", "user", "started_at", "ended_at", "duration_seconds", "note", "created_at")
        read_only_fields = ("id", "user", "created_at")


class ActivityLogSerializer(serializers.ModelSerializer):
    actor = UserSerializer(read_only=True)

    class Meta:
        model  = ActivityLog
        fields = ("id", "task", "actor", "action", "detail", "created_at")
        read_only_fields = ("id", "task", "actor", "created_at")
