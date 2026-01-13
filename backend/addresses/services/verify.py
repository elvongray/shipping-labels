from __future__ import annotations

from dataclasses import asdict

import structlog
from django.conf import settings

from addresses.models import VerificationAttempt
from addresses.providers.base import AddressInput, AddressProviderError
from addresses.providers.google import GoogleAddressProvider
from addresses.providers.smarty import SmartyProvider
from shipments.models import Shipment

logger = structlog.get_logger(__name__)


def get_providers():
    return [
        GoogleAddressProvider(getattr(settings, "GOOGLE_ADDRESS_API_KEY", None)),
        SmartyProvider(
            getattr(settings, "SMARTY_AUTH_ID", None),
            getattr(settings, "SMARTY_AUTH_TOKEN", None),
        ),
    ]


def should_verify(shipment: Shipment) -> bool:
    required = [
        shipment.to_name,
        shipment.to_street1,
        shipment.to_city,
        shipment.to_state,
        shipment.to_postal_code,
    ]
    return all(value and str(value).strip() for value in required)


def _address_from_shipment(shipment: Shipment) -> AddressInput:
    return AddressInput(
        name=shipment.to_name,
        street1=shipment.to_street1,
        street2=shipment.to_street2,
        city=shipment.to_city,
        state=shipment.to_state,
        postal_code=shipment.to_postal_code,
        country=shipment.to_country or "US",
    )


def verify_shipment_address(shipment: Shipment) -> tuple[str, dict]:
    address = _address_from_shipment(shipment)
    providers = get_providers()
    last_error = None

    for provider in providers:
        try:
            result = provider.verify(address)
        except AddressProviderError as exc:
            last_error = exc
            VerificationAttempt.objects.create(
                shipment=shipment,
                provider=provider.name,
                status=VerificationAttempt.Status.FAILURE,
                request_payload=asdict(address),
                response_payload={},
                error=str(exc),
            )
            if exc.retryable:
                logger.info(
                    "address.verify.fallback_attempt",
                    shipment_id=str(shipment.id),
                    provider=provider.name,
                )
                continue
            break

        VerificationAttempt.objects.create(
            shipment=shipment,
            provider=provider.name,
            status=VerificationAttempt.Status.SUCCESS,
            request_payload=asdict(address),
            response_payload=result.raw,
        )

        if result.is_corrected:
            status = Shipment.AddressVerificationStatus.CORRECTED
        elif result.is_valid:
            status = Shipment.AddressVerificationStatus.VALID
        else:
            status = Shipment.AddressVerificationStatus.INVALID

        details = {
            "provider": provider.name,
            "messages": result.messages,
            "suggested_address": asdict(result.suggested_address)
            if result.suggested_address
            else None,
            "raw": result.raw,
        }
        return status, details

    logger.error(
        "address.verify.failure",
        shipment_id=str(shipment.id),
        error=str(last_error) if last_error else "No providers configured",
    )
    return (
        Shipment.AddressVerificationStatus.FAILED,
        {"error": str(last_error) if last_error else "No providers configured"},
    )
