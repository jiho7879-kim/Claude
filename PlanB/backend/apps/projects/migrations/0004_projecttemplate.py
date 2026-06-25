from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("projects", "0003_add_research_fields"),
    ]

    operations = [
        migrations.CreateModel(
            name="ProjectTemplate",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=100)),
                ("description", models.TextField(blank=True)),
                ("category", models.CharField(default="general", max_length=30)),
                ("icon", models.CharField(default="📋", max_length=10)),
                ("tasks", models.JSONField(default=list)),
                ("order", models.PositiveSmallIntegerField(default=0)),
            ],
            options={
                "ordering": ["order", "name"],
            },
        ),
    ]
