import pytest
from rest_framework.test import APIClient

from imports.models import ImportJob
from shipments.models import Shipment


@pytest.mark.django_db
def test_import_detail_returns_counts():
    client = APIClient()
    job = ImportJob.objects.create(original_filename="test.csv")
    Shipment.objects.create(
        import_job=job,
        row_number=1,
        validation_status=Shipment.ValidationStatus.READY,
    )
    Shipment.objects.create(
        import_job=job,
        row_number=2,
        validation_status=Shipment.ValidationStatus.NEEDS_INFO,
    )

    response = client.get(f"/api/v1/imports/{job.id}/")

    assert response.status_code == 200
    payload = response.json()
    assert payload["total_rows"] == 2
    assert payload["ready_count"] == 1
    assert payload["needs_info_count"] == 1


@pytest.mark.django_db
def test_purchase_requires_ready_and_service():
    client = APIClient()
    job = ImportJob.objects.create(original_filename="test.csv")
    Shipment.objects.create(
        import_job=job,
        row_number=1,
        validation_status=Shipment.ValidationStatus.READY,
        selected_service="priority_mail",
    )
    Shipment.objects.create(
        import_job=job,
        row_number=2,
        validation_status=Shipment.ValidationStatus.NEEDS_INFO,
    )

    response = client.post(
        f"/api/v1/imports/{job.id}/purchase/",
        {"label_format": "LETTER", "agree_to_terms": True},
        format="json",
    )

    assert response.status_code == 400


@pytest.mark.django_db
def test_purchase_success_sets_labels():
    client = APIClient()
    job = ImportJob.objects.create(original_filename="test.csv")
    shipment = Shipment.objects.create(
        import_job=job,
        row_number=1,
        validation_status=Shipment.ValidationStatus.READY,
        selected_service="priority_mail",
    )

    response = client.post(
        f"/api/v1/imports/{job.id}/purchase/",
        {"label_format": "LABEL_4X6", "agree_to_terms": True},
        format="json",
    )

    assert response.status_code == 200
    shipment.refresh_from_db()
    assert shipment.label_status == Shipment.LabelStatus.PURCHASED
    assert shipment.label_url
