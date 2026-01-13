import pytest

from addresses.models import VerificationAttempt
from addresses.providers.base import AddressProviderError, AddressVerificationResult
from addresses.services import verify as verify_service
from imports.models import ImportJob
from shipments.models import Shipment


class _FailingProvider:
    name = "primary"

    def verify(self, address):
        raise AddressProviderError("primary failed", retryable=True)


class _SuccessProvider:
    name = "secondary"

    def verify(self, address):
        return AddressVerificationResult(
            is_valid=True,
            is_corrected=False,
            suggested_address=None,
            messages=[],
            raw={"provider": "secondary"},
        )


@pytest.mark.django_db
def test_verify_fallback_creates_attempts(monkeypatch):
    job = ImportJob.objects.create(original_filename="test.csv")
    shipment = Shipment.objects.create(
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

    monkeypatch.setattr(
        verify_service,
        "get_providers",
        lambda: [_FailingProvider(), _SuccessProvider()],
    )

    status, details = verify_service.verify_shipment_address(shipment)

    assert status == Shipment.AddressVerificationStatus.VALID
    assert details["provider"] == "secondary"
    assert VerificationAttempt.objects.filter(shipment=shipment).count() == 2
