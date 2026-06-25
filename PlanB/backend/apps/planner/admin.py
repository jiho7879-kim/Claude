from django.contrib import admin

from .models import DailyEntry, Habit, HabitLog, TimeBlock

admin.site.register(DailyEntry)
admin.site.register(TimeBlock)
admin.site.register(Habit)
admin.site.register(HabitLog)
