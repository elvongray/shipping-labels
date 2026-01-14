from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("shipments", "0002_seed_presets"),
    ]

    operations = [
        migrations.AddField(
            model_name="shipment",
            name="from_address_verification_status",
            field=models.CharField(
                choices=[
                    ("NOT_STARTED", "Not started"),
                    ("VALID", "Valid"),
                    ("CORRECTED", "Corrected"),
                    ("INVALID", "Invalid"),
                    ("FAILED", "Failed"),
                ],
                default="NOT_STARTED",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="shipment",
            name="from_address_verification_details",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="shipment",
            name="from_address_is_preset",
            field=models.BooleanField(default=False),
        ),
    ]
