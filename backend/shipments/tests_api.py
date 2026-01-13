import pytest
from rest_framework.test import APIClient

from imports.models import ImportJob
from shipments.models import SavedAddressPreset, Shipment


@pytest.mark.django_db
def test_import_shipments_list_filters():
    client = APIClient()
    job = ImportJob.objects.create(original_filename="test.csv")
    Shipment.objects.create(
        import_job=job,
        row_number=1,
        to_name="Alice",
        validation_status=Shipment.ValidationStatus.READY,
    )
    Shipment.objects.create(
        import_job=job,
        row_number=2,
        to_name="Bob",
        validation_status=Shipment.ValidationStatus.NEEDS_INFO,
    )

    response = client.get(f"/api/v1/imports/{job.id}/shipments/?status=READY")

    assert response.status_code == 200
    assert response.json()["count"] == 1


@pytest.mark.django_db
def test_bulk_delete_shipments():
    client = APIClient()
    job = ImportJob.objects.create(original_filename="test.csv")
    shipment = Shipment.objects.create(import_job=job, row_number=1)

    response = client.post(
        f"/api/v1/imports/{job.id}/shipments/bulk/",
        {"shipment_ids": [str(shipment.id)], "action": "delete", "payload": {}},
        format="json",
    )

    assert response.status_code == 200
    assert response.json()["deleted_count"] == 1


@pytest.mark.django_db
def test_create_address_preset():
    client = APIClient()
    initial_count = SavedAddressPreset.objects.count()
    response = client.post(
        "/api/v1/presets/addresses/",
        {
            "name": "Warehouse",
            "contact_name": "Warehouse",
            "street1": "123 Main",
            "street2": "",
            "city": "Los Angeles",
            "state": "CA",
            "postal_code": "90001",
            "country": "US",
        },
        format="json",
    )

    assert response.status_code == 201
    assert SavedAddressPreset.objects.count() == initial_count + 1
