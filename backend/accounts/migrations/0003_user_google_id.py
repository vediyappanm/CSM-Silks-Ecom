from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0002_address_email"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="google_id",
            field=models.CharField(blank=True, db_index=True, max_length=64, null=True, unique=True),
        ),
    ]
