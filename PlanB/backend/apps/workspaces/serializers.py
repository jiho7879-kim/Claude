from rest_framework import serializers

from apps.accounts.serializers import UserSerializer

from .models import SavedView, Workspace, WorkspaceMember


class WorkspaceMemberSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = WorkspaceMember
        fields = ("id", "user", "role", "joined_at")
        read_only_fields = ("id", "joined_at")


class WorkspaceSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Workspace
        fields = ("id", "name", "slug", "description", "color", "owner", "max_task_depth", "member_count", "created_at")
        read_only_fields = ("id", "owner", "created_at")

    def get_member_count(self, obj: Workspace) -> int:
        return obj.members.count()


class WorkspaceCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workspace
        fields = ("name", "slug", "description", "color", "max_task_depth")


class SavedViewSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source="owner.display_name", read_only=True, default="")

    class Meta:
        model = SavedView
        fields = ("id", "name", "filters", "view_type", "is_shared", "owner_name", "created_at")
        read_only_fields = ("id", "owner_name", "created_at")


class SavedViewCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedView
        fields = ("name", "filters", "view_type", "is_shared")
