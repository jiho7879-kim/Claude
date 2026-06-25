from rest_framework import serializers

from apps.accounts.serializers import UserSerializer

from .models import CalendarEvent


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
