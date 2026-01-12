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


@pytest.mark.django_db
def test_validate_shipment_invalid_state_and_zip():
    job = ImportJob.objects.create(original_filename="test.csv")
    shipment = Shipment(
        import_job=job,
        row_number=1,
        to_name="Jane Doe",
        to_street1="123 Main St",
        to_city="Los Angeles",
        to_state="ZZ",
        to_postal_code="ABCDE",
        from_name="Warehouse",
        from_street1="500 Market St",
        from_city="San Francisco",
        from_state="YY",
        from_postal_code="123",
        weight_oz=16,
    )

    result = validate_shipment(shipment)

    assert result["status"] == Shipment.ValidationStatus.INVALID
    codes = {error["code"] for error in result["errors"]}
    assert "invalid_state" in codes
    assert "invalid_postal_code" in codes


@pytest.mark.django_db
def test_validate_shipment_incomplete_dimensions():
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
        length_in=10,
    )

    result = validate_shipment(shipment)

    assert result["status"] == Shipment.ValidationStatus.NEEDS_INFO
    assert any(error["code"] == "incomplete_dimensions" for error in result["errors"])


@pytest.mark.django_db
def test_validate_shipment_address_verification_invalid():
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
        address_verification_status=Shipment.AddressVerificationStatus.INVALID,
    )

    result = validate_shipment(shipment)

    assert result["status"] == Shipment.ValidationStatus.INVALID
    assert any(error["code"] == "address_invalid" for error in result["errors"])
