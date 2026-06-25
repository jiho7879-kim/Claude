from django.contrib import admin

from .models import ActivityLog, Task, TaskComment

admin.site.register(Task)
admin.site.register(TaskComment)
admin.site.register(ActivityLog)

from .models import Sprint
admin.site.register(Sprint)
