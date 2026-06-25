from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("calendars", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="calendarevent",
            name="color",
            field=models.CharField(blank=True, default="#6366f1", max_length=7),
        ),
    ]
