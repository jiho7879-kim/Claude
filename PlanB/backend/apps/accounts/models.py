from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    avatar_url = models.URLField(blank=True)
    github_username = models.CharField(max_length=100, blank=True)
    bio = models.TextField(blank=True)

    def __str__(self) -> str:
        return self.username
