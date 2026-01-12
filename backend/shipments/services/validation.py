from __future__ import annotations

import re
from decimal import Decimal
from typing import Any

from shipments.models import Shipment

US_STATES = {
    "AL",
    "AK",
    "AZ",
    "AR",
    "CA",
    "CO",
    "CT",
    "DE",
    "FL",
    "GA",
    "HI",
    "ID",
    "IL",
    "IN",
    "IA",
    "KS",
    "KY",
    "LA",
    "ME",
    "MD",
    "MA",
    "MI",
    "MN",
    "MS",
    "MO",
    "MT",
    "NE",
    "NV",
    "NH",
    "NJ",
    "NM",
    "NY",
    "NC",
    "ND",
    "OH",
    "OK",
    "OR",
    "PA",
    "RI",
    "SC",
    "SD",
    "TN",
    "TX",
    "UT",
    "VT",
    "VA",
    "WA",
    "WV",
    "WI",
    "WY",
    "PR",
    "DC",
}

ZIP_RE = re.compile(r"^\d{5}(-\d{4})?$")
MAX_WEIGHT_OZ = Decimal("2000")


def _missing(value: Any) -> bool:
    return value is None or str(value).strip() == ""


def _is_positive_number(value: Any) -> bool:
    try:
        return Decimal(str(value)) > 0
    except Exception:
        return False


def validate_shipment(shipment: Shipment) -> dict:
    errors = []

    required_fields = {
        "to_name": shipment.to_name,
        "to_street1": shipment.to_street1,
        "to_city": shipment.to_city,
        "to_state": shipment.to_state,
        "to_postal_code": shipment.to_postal_code,
        "from_name": shipment.from_name,
        "from_street1": shipment.from_street1,
        "from_city": shipment.from_city,
        "from_state": shipment.from_state,
        "from_postal_code": shipment.from_postal_code,
        "weight_oz": shipment.weight_oz,
    }

    for field, value in required_fields.items():
        if _missing(value):
            errors.append(
                {
                    "field": field,
                    "code": "required",
                    "message": f"{field} is required",
                }
            )

    for field_value, field_name in (
        (shipment.to_state, "to_state"),
        (shipment.from_state, "from_state"),
    ):
        if not _missing(field_value) and field_value.upper() not in US_STATES:
            errors.append(
                {
                    "field": field_name,
                    "code": "invalid_state",
                    "message": f"{field_name} must be a valid US state",
                }
            )

    for field_value, field_name in (
        (shipment.to_postal_code, "to_postal_code"),
        (shipment.from_postal_code, "from_postal_code"),
    ):
        if not _missing(field_value) and not ZIP_RE.match(str(field_value).strip()):
            errors.append(
                {
                    "field": field_name,
                    "code": "invalid_postal_code",
                    "message": f"{field_name} must be a valid ZIP code",
                }
            )

    if not _missing(shipment.weight_oz):
        if not _is_positive_number(shipment.weight_oz):
            errors.append(
                {
                    "field": "weight_oz",
                    "code": "invalid_weight",
                    "message": "weight_oz must be a positive number",
                }
            )
        elif Decimal(str(shipment.weight_oz)) > MAX_WEIGHT_OZ:
            errors.append(
                {
                    "field": "weight_oz",
                    "code": "invalid_weight",
                    "message": "weight_oz exceeds maximum allowed",
                }
            )

    dims = [shipment.length_in, shipment.width_in, shipment.height_in]
    if any(not _missing(value) for value in dims):
        if any(_missing(value) for value in dims):
            errors.append(
                {
                    "field": "dimensions",
                    "code": "incomplete_dimensions",
                    "message": "length, width, and height are required together",
                }
            )
        else:
            for value, field_name in (
                (shipment.length_in, "length_in"),
                (shipment.width_in, "width_in"),
                (shipment.height_in, "height_in"),
            ):
                if not _is_positive_number(value):
                    errors.append(
                        {
                            "field": field_name,
                            "code": "invalid_dimension",
                            "message": f"{field_name} must be a positive number",
                        }
                    )

    if (
        shipment.address_verification_status
        == Shipment.AddressVerificationStatus.INVALID
    ):
        errors.append(
            {
                "field": "address_verification_status",
                "code": "address_invalid",
                "message": "address verification failed",
            }
        )
    elif (
        shipment.address_verification_status
        == Shipment.AddressVerificationStatus.FAILED
    ):
        errors.append(
            {
                "field": "address_verification_status",
                "code": "address_verification_failed",
                "message": "address verification unavailable; please retry",
            }
        )

    has_invalid = any(
        error["code"]
        in {
            "invalid_state",
            "invalid_postal_code",
            "invalid_weight",
            "invalid_dimension",
            "address_invalid",
        }
        for error in errors
    )
    if has_invalid:
        status = Shipment.ValidationStatus.INVALID
    else:
        status = (
            Shipment.ValidationStatus.READY
            if not errors
            else Shipment.ValidationStatus.NEEDS_INFO
        )

    return {"status": status, "errors": errors}
