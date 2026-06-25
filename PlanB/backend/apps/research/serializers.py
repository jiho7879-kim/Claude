from rest_framework import serializers

from apps.accounts.serializers import UserSerializer

from .models import Dataset, Reference, ResearchNote


class ResearchNoteSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)

    class Meta:
        model = ResearchNote
        fields = ("id", "project", "date", "content", "tags", "author", "created_at", "updated_at")
        read_only_fields = ("id", "project", "author", "created_at", "updated_at")


class DatasetSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)

    class Meta:
        model = Dataset
        fields = (
            "id", "project", "name", "version", "source_url",
            "size_mb", "data_status", "description", "created_by", "created_at", "updated_at",
        )
        read_only_fields = ("id", "project", "created_by", "created_at", "updated_at")


class ReferenceSerializer(serializers.ModelSerializer):
    added_by = UserSerializer(read_only=True)

    class Meta:
        model = Reference
        fields = (
            "id", "workspace", "project", "doi", "url", "title",
            "authors", "year", "journal", "abstract", "added_by", "created_at",
        )
        read_only_fields = ("id", "workspace", "added_by", "created_at")
