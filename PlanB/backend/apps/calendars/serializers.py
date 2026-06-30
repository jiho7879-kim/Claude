from rest_framework import serializers

from apps.accounts.serializers import UserSerializer

from .crypto import encrypt_password
from .models import CalendarEvent, TimeTreeIntegration


class CalendarEventSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)

    class Meta:
        model = CalendarEvent
        fields = (
            "id", "workspace", "title", "description",
            "start_at", "end_at", "is_all_day",
            "visibility", "color", "created_by", "created_at", "updated_at",
        )
        read_only_fields = ("id", "workspace", "created_by", "created_at", "updated_at")


class CalendarEventCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CalendarEvent
        fields = ("title", "description", "start_at", "end_at", "is_all_day", "visibility", "color")


class TimeTreeIntegrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    events_synced = serializers.SerializerMethodField()

    class Meta:
        model = TimeTreeIntegration
        fields = (
            "id", "workspace", "label", "timetree_email", "password",
            "calendar_code", "is_active", "last_synced_at",
            "last_status", "last_error", "events_synced",
            "created_at", "updated_at",
        )
        read_only_fields = (
            "id", "workspace", "last_synced_at",
            "last_status", "last_error", "events_synced",
            "created_at", "updated_at",
        )

    def get_events_synced(self, obj) -> int:
        return CalendarEvent.objects.filter(
            workspace=obj.workspace, external_source="timetree"
        ).count()

    def create(self, validated_data):
        password = validated_data.pop("password", "")
        if password:
            validated_data["encrypted_password"] = encrypt_password(password)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        if password:
            instance.encrypted_password = encrypt_password(password)
        return super().update(instance, validated_data)
