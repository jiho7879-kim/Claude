import django.db.models.deletion
import uuid

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("tasks", "0003_sprint_task_sprint"),
    ]

    operations = [
        migrations.AddField(
            model_name="task",
            name="is_milestone",
            field=models.BooleanField(default=False),
        ),
        migrations.CreateModel(
            name="TaskRelation",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("relation_type", models.CharField(choices=[("blocks", "Blocks"), ("blocked_by", "Blocked by")], max_length=12)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("from_task", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="relations_from", to="tasks.task")),
                ("to_task", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="relations_to", to="tasks.task")),
            ],
            options={"unique_together": {("from_task", "to_task", "relation_type")}},
        ),
    ]
