from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("ai", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="tryonsession",
            name="model_used",
            field=models.CharField(default="anthropic", max_length=80),
        ),
    ]
