from __future__ import annotations

from typing import Any

from shipments.models import Shipment


def _missing(value: Any) -> bool:
    return value is None or str(value).strip() == ""


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

    status = (
        Shipment.ValidationStatus.READY
        if not errors
        else Shipment.ValidationStatus.NEEDS_INFO
    )
    return {"status": status, "errors": errors}
