import pytest

from imports.models import ImportJob
from shipments.models import Shipment
from shipments.services.validation import validate_shipment


@pytest.mark.django_db
def test_validate_shipment_needs_info_when_missing_fields():
    job = ImportJob.objects.create(original_filename="test.csv")
    shipment = Shipment(import_job=job, row_number=1)

    result = validate_shipment(shipment)

    assert result["status"] == Shipment.ValidationStatus.NEEDS_INFO
    assert any(error["field"] == "to_name" for error in result["errors"])


@pytest.mark.django_db
def test_validate_shipment_ready_when_required_fields_present():
    job = ImportJob.objects.create(original_filename="test.csv")
    shipment = Shipment(
        import_job=job,
        row_number=1,
        to_name="Jane Doe",
        to_street1="123 Main St",
        to_city="Los Angeles",
        to_state="CA",
        to_postal_code="90001",
        from_name="Warehouse",
        from_street1="500 Market St",
        from_city="San Francisco",
        from_state="CA",
        from_postal_code="94105",
        weight_oz=16,
    )

    result = validate_shipment(shipment)

    assert result["status"] == Shipment.ValidationStatus.READY
    assert result["errors"] == []
