from __future__ import annotations

import httpx

from addresses.providers.base import (
    AddressInput,
    AddressNormalized,
    AddressProviderError,
    AddressVerificationResult,
)


class SmartyProvider:
    name = "smarty"

    def __init__(self, auth_id: str | None, auth_token: str | None):
        self.auth_id = auth_id
        self.auth_token = auth_token

    def verify(self, address: AddressInput) -> AddressVerificationResult:
        if not self.auth_id or not self.auth_token:
            raise AddressProviderError("Smarty credentials missing", retryable=True)

        params = {
            "auth-id": self.auth_id,
            "auth-token": self.auth_token,
            "street": address.street1,
            "street2": address.street2,
            "city": address.city,
            "state": address.state,
            "zipcode": address.postal_code,
            "candidates": 1,
        }

        try:
            response = httpx.get(
                "https://us-street.api.smarty.com/street-address",
                params=params,
                timeout=5.0,
            )
        except httpx.TimeoutException as exc:
            raise AddressProviderError("Smarty timeout", retryable=True) from exc
        except httpx.RequestError as exc:
            raise AddressProviderError("Smarty request error", retryable=True) from exc

        if response.status_code == 429 or response.status_code >= 500:
            raise AddressProviderError(
                f"Smarty service unavailable ({response.status_code})",
                retryable=True,
            )

        if response.status_code >= 400:
            raise AddressProviderError(
                f"Smarty request rejected ({response.status_code})",
                retryable=response.status_code in {401, 403},
            )

        payload = response.json()
        if not payload:
            return AddressVerificationResult(
                is_valid=False,
                is_corrected=False,
                suggested_address=None,
                messages=["No match found"],
                raw={"response": payload},
            )

        candidate = payload[0]
        components = candidate.get("components", {})
        postal_code = components.get("zipcode", "")
        plus4 = components.get("plus4_code") or ""
        if plus4:
            postal_code = f"{postal_code}-{plus4}"

        suggested = AddressNormalized(
            street1=candidate.get("delivery_line_1", ""),
            street2=candidate.get("delivery_line_2", ""),
            city=components.get("city_name", ""),
            state=components.get("state_abbreviation", ""),
            postal_code=postal_code,
            country="US",
        )

        return AddressVerificationResult(
            is_valid=True,
            is_corrected=not _addresses_match(address, suggested),
            suggested_address=suggested,
            messages=[],
            raw={"response": payload},
        )


def _addresses_match(original: AddressInput, normalized: AddressNormalized) -> bool:
    def _clean(value: str) -> str:
        return value.strip().lower()

    return (
        _clean(original.street1) == _clean(normalized.street1)
        and _clean(original.street2) == _clean(normalized.street2)
        and _clean(original.city) == _clean(normalized.city)
        and _clean(original.state) == _clean(normalized.state)
        and _clean(original.postal_code) == _clean(normalized.postal_code)
    )
