from datetime import date

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.workspaces.models import Workspace

from .models import DailyEntry, Habit, HabitLog, TimeBlock, WeeklyReview
from .serializers import (
    DailyEntryCreateSerializer,
    DailyEntrySerializer,
    HabitCreateSerializer,
    HabitSerializer,
    WeeklyReviewCreateSerializer,
    WeeklyReviewSerializer,
    TimeBlockCreateSerializer,
    TimeBlockSerializer,
)


def _get_workspace(slug, user):
    return get_object_or_404(Workspace, slug=slug, members__user=user)


class DailyEntryListCreateView(APIView):
    def get(self, request, workspace_slug):
        ws = _get_workspace(workspace_slug, request.user)
        entries = DailyEntry.objects.filter(user=request.user, workspace=ws).prefetch_related("time_blocks")
        return Response(DailyEntrySerializer(entries, many=True).data)

    def post(self, request, workspace_slug):
        ws = _get_workspace(workspace_slug, request.user)
        serializer = DailyEntryCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        entry, created = DailyEntry.objects.get_or_create(
            user=request.user,
            workspace=ws,
            date=serializer.validated_data["date"],
            defaults=serializer.validated_data,
        )
        if not created:
            for field, value in serializer.validated_data.items():
                setattr(entry, field, value)
            entry.save()
        return Response(DailyEntrySerializer(entry).data, status=status.HTTP_201_CREATED)


class DailyEntryDetailView(APIView):
    def get(self, request, workspace_slug, entry_date):
        ws = _get_workspace(workspace_slug, request.user)
        entry = get_object_or_404(DailyEntry, user=request.user, workspace=ws, date=entry_date)
        return Response(DailyEntrySerializer(entry).data)

    def patch(self, request, workspace_slug, entry_date):
        ws = _get_workspace(workspace_slug, request.user)
        entry, _ = DailyEntry.objects.get_or_create(user=request.user, workspace=ws, date=entry_date)
        serializer = DailyEntryCreateSerializer(entry, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(DailyEntrySerializer(entry).data)


class TimeBlockListCreateView(APIView):
    def _get_entry(self, workspace_slug, entry_date, user):
        ws = _get_workspace(workspace_slug, user)
        entry, _ = DailyEntry.objects.get_or_create(user=user, workspace=ws, date=entry_date)
        return entry

    def get(self, request, workspace_slug, entry_date):
        entry = self._get_entry(workspace_slug, entry_date, request.user)
        return Response(TimeBlockSerializer(entry.time_blocks.all(), many=True).data)

    def post(self, request, workspace_slug, entry_date):
        entry = self._get_entry(workspace_slug, entry_date, request.user)
        serializer = TimeBlockCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        block = serializer.save(daily_entry=entry)
        return Response(TimeBlockSerializer(block).data, status=status.HTTP_201_CREATED)


class TimeBlockDetailView(APIView):
    def patch(self, request, workspace_slug, entry_date, block_id):
        ws = _get_workspace(workspace_slug, request.user)
        block = get_object_or_404(
            TimeBlock, id=block_id, daily_entry__user=request.user,
            daily_entry__workspace=ws, daily_entry__date=entry_date
        )
        serializer = TimeBlockCreateSerializer(block, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(TimeBlockSerializer(block).data)

    def delete(self, request, workspace_slug, entry_date, block_id):
        ws = _get_workspace(workspace_slug, request.user)
        block = get_object_or_404(
            TimeBlock, id=block_id, daily_entry__user=request.user,
            daily_entry__workspace=ws, daily_entry__date=entry_date
        )
        block.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class HabitListCreateView(APIView):
    def get(self, request, workspace_slug):
        ws = _get_workspace(workspace_slug, request.user)
        habits = Habit.objects.filter(user=request.user, workspace=ws, is_active=True).prefetch_related("logs")
        return Response(HabitSerializer(habits, many=True).data)

    def post(self, request, workspace_slug):
        ws = _get_workspace(workspace_slug, request.user)
        serializer = HabitCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        habit = serializer.save(user=request.user, workspace=ws)
        return Response(HabitSerializer(habit).data, status=status.HTTP_201_CREATED)


class HabitDetailView(APIView):
    def patch(self, request, workspace_slug, habit_id):
        ws = _get_workspace(workspace_slug, request.user)
        habit = get_object_or_404(Habit, id=habit_id, user=request.user, workspace=ws)
        serializer = HabitCreateSerializer(habit, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(HabitSerializer(habit).data)

    def delete(self, request, workspace_slug, habit_id):
        ws = _get_workspace(workspace_slug, request.user)
        habit = get_object_or_404(Habit, id=habit_id, user=request.user, workspace=ws)
        habit.is_active = False
        habit.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


class HabitLogToggleView(APIView):
    def post(self, request, workspace_slug, habit_id):
        ws = _get_workspace(workspace_slug, request.user)
        habit = get_object_or_404(Habit, id=habit_id, user=request.user, workspace=ws)
        log_date = request.data.get("date", str(date.today()))
        log, created = HabitLog.objects.get_or_create(habit=habit, date=log_date)
        if not created:
            log.delete()
            return Response({"logged": False})
        return Response({"logged": True})


class HabitLogsRangeView(APIView):
    """Return HabitLog dates for a habit within a date range."""
    def get(self, request, workspace_slug, habit_id):
        ws = _get_workspace(workspace_slug, request.user)
        habit = get_object_or_404(Habit, id=habit_id, user=request.user, workspace=ws)
        start = request.query_params.get("start")
        end   = request.query_params.get("end")
        qs = habit.logs.filter(is_done=True)
        if start:
            qs = qs.filter(date__gte=start)
        if end:
            qs = qs.filter(date__lte=end)
        return Response(list(qs.values_list("date", flat=True)))


class WeekEntriesView(APIView):
    """Return all DailyEntry records for a given ISO year/week, plus habit logs."""
    def get(self, request, workspace_slug, year, week):
        from datetime import timedelta
        import datetime as dt
        ws = _get_workspace(workspace_slug, request.user)
        # ISO week Monday
        monday = dt.date.fromisocalendar(int(year), int(week), 1)
        sunday = monday + timedelta(days=6)
        entries = DailyEntry.objects.filter(
            user=request.user, workspace=ws,
            date__gte=monday, date__lte=sunday
        ).prefetch_related("time_blocks")
        return Response(DailyEntrySerializer(entries, many=True).data)


class WeeklyReviewDetailView(APIView):
    def get(self, request, workspace_slug, year, week):
        ws = _get_workspace(workspace_slug, request.user)
        review = WeeklyReview.objects.filter(user=request.user, workspace=ws, year=year, week=week).first()
        if not review:
            return Response({})
        return Response(WeeklyReviewSerializer(review).data)

    def patch(self, request, workspace_slug, year, week):
        ws = _get_workspace(workspace_slug, request.user)
        review, _ = WeeklyReview.objects.get_or_create(
            user=request.user, workspace=ws, year=int(year), week=int(week)
        )
        serializer = WeeklyReviewCreateSerializer(review, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(WeeklyReviewSerializer(review).data)
