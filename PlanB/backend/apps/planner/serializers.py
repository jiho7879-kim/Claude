from rest_framework import serializers

from .models import DailyEntry, Habit, HabitLog, TimeBlock, WeeklyReview


class TimeBlockSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimeBlock
        fields = ("id", "title", "start_time", "end_time", "category", "is_done", "order")


class TimeBlockCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimeBlock
        fields = ("title", "start_time", "end_time", "category", "is_done", "order")


class DailyEntrySerializer(serializers.ModelSerializer):
    time_blocks = TimeBlockSerializer(many=True, read_only=True)

    class Meta:
        model = DailyEntry
        fields = (
            "id", "date", "journal", "mood", "energy",
            "emotion_tags", "gratitude", "one_liner",
            "time_blocks", "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class DailyEntryCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyEntry
        fields = ("date", "journal", "mood", "energy", "emotion_tags", "gratitude", "one_liner")


class HabitSerializer(serializers.ModelSerializer):
    streak = serializers.SerializerMethodField()
    logged_today = serializers.SerializerMethodField()

    class Meta:
        model = Habit
        fields = ("id", "name", "color", "emoji", "is_active", "order", "streak", "logged_today", "created_at")
        read_only_fields = ("id", "created_at")

    def get_streak(self, obj):
        from datetime import date, timedelta
        today = date.today()
        streak = 0
        d = today
        while True:
            if obj.logs.filter(date=d, is_done=True).exists():
                streak += 1
                d -= timedelta(days=1)
            else:
                break
        return streak

    def get_logged_today(self, obj):
        from datetime import date
        return obj.logs.filter(date=date.today(), is_done=True).exists()


class HabitCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Habit
        fields = ("name", "color", "emoji", "order")


class HabitLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = HabitLog
        fields = ("id", "habit", "date", "is_done")
        read_only_fields = ("id",)


class WeeklyReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = WeeklyReview
        fields = ("id", "year", "week", "went_well", "to_improve", "next_focus", "mit1", "mit2", "mit3", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")


class WeeklyReviewCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = WeeklyReview
        fields = ("year", "week", "went_well", "to_improve", "next_focus", "mit1", "mit2", "mit3")
