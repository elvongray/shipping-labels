from django.db import migrations


def seed_presets(apps, _):
    SavedAddressPreset = apps.get_model("shipments", "SavedAddressPreset")
    SavedPackagePreset = apps.get_model("shipments", "SavedPackagePreset")

    address_rows = [
        {
            "name": "Print TTS",
            "contact_name": "Print TTS",
            "street1": "502 W Arrow Hwy",
            "street2": "STE P",
            "city": "San Dimas",
            "state": "CA",
            "postal_code": "91773",
            "country": "US",
        },
        {
            "name": "Print TTS",
            "contact_name": "Print TTS",
            "street1": "500 W Foothill Blvd",
            "street2": "STE P",
            "city": "Claremont",
            "state": "CA",
            "postal_code": "91711",
            "country": "US",
        },
        {
            "name": "Print TTS",
            "contact_name": "Print TTS",
            "street1": "1170 Grove Ave",
            "street2": "",
            "city": "Ontario",
            "state": "CA",
            "postal_code": "91764",
            "country": "US",
        },
    ]

    package_rows = [
        {
            "name": "Light Package",
            "weight_oz": 16,
            "length_in": 6,
            "width_in": 6,
            "height_in": 6,
        },
        {
            "name": "8 Oz Item",
            "weight_oz": 8,
            "length_in": 4,
            "width_in": 4,
            "height_in": 4,
        },
        {
            "name": "Standard Box",
            "weight_oz": 32,
            "length_in": 12,
            "width_in": 12,
            "height_in": 12,
        },
    ]

    SavedAddressPreset.objects.bulk_create(
        [SavedAddressPreset(**row) for row in address_rows]
    )
    SavedPackagePreset.objects.bulk_create(
        [SavedPackagePreset(**row) for row in package_rows]
    )


def unseed_presets(apps, _):
    SavedAddressPreset = apps.get_model("shipments", "SavedAddressPreset")
    SavedPackagePreset = apps.get_model("shipments", "SavedPackagePreset")

    SavedAddressPreset.objects.filter(name="Print TTS", state="CA").delete()
    SavedPackagePreset.objects.filter(
        name__in=["Light Package", "8 Oz Item", "Standard Box"]
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("shipments", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_presets, reverse_code=unseed_presets),
    ]
