from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ("username", "email", "github_username", "is_staff")
    fieldsets = UserAdmin.fieldsets + (
        ("Profile", {"fields": ("avatar_url", "github_username", "bio")}),
    )
