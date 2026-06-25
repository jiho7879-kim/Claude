from django.contrib import admin

from .models import CalendarEvent


@admin.register(CalendarEvent)
class CalendarEventAdmin(admin.ModelAdmin):
    list_display = ("title", "workspace", "visibility", "start_at", "end_at", "created_by")
    list_filter = ("visibility", "is_all_day")
    search_fields = ("title",)
