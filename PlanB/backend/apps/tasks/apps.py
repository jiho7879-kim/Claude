"""App configuration for the tasks app."""

from django.apps import AppConfig


class TasksConfig(AppConfig):
    """Configuration for the tasks Django application."""

    name = "apps.tasks"

    def ready(self) -> None:
        """Register signal handlers for the tasks application."""
