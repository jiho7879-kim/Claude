from rest_framework import serializers

from apps.accounts.serializers import UserSerializer

from .models import Project, ProjectMember, ProjectTemplate


class ProjectMemberSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = ProjectMember
        fields = ("id", "user", "role", "joined_at")
        read_only_fields = ("id", "joined_at")


class ProjectSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    effective_max_task_depth = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = (
            "id", "workspace", "name", "description", "status", "color",
            "max_task_depth", "effective_max_task_depth",
            "project_type", "publication_status", "target_journal",
            "submission_date", "acceptance_date", "pub_doi",
            "created_by", "created_at", "updated_at",
        )
        read_only_fields = ("id", "workspace", "created_by", "created_at", "updated_at")

    def get_effective_max_task_depth(self, obj: Project) -> int:
        return obj.get_effective_max_task_depth()


class ProjectCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = (
            "name", "description", "status", "color", "max_task_depth",
            "project_type", "publication_status", "target_journal",
            "submission_date", "acceptance_date", "pub_doi",
        )


class TemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectTemplate
        fields = ("id", "name", "description", "category", "icon", "tasks", "order")
