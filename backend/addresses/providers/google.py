from __future__ import annotations

import httpx

from addresses.providers.base import (
    AddressInput,
    AddressNormalized,
    AddressProviderError,
    AddressVerificationResult,
)


class GoogleAddressProvider:
    name = "google"

    def __init__(self, api_key: str | None):
        self.api_key = api_key

    def verify(self, address: AddressInput) -> AddressVerificationResult:
        if not self.api_key:
            raise AddressProviderError("Google API key missing", retryable=True)

        payload = {
            "address": {
                "addressLines": [address.street1, address.street2],
                "locality": address.city,
                "administrativeArea": address.state,
                "postalCode": address.postal_code,
                "regionCode": address.country or "US",
            },
            "enableUspsCass": True,
        }

        try:
            response = httpx.post(
                "https://addressvalidation.googleapis.com/v1:validateAddress",
                params={"key": self.api_key},
                json=payload,
                timeout=5.0,
            )
        except httpx.TimeoutException as exc:
            raise AddressProviderError("Google timeout", retryable=True) from exc
        except httpx.RequestError as exc:
            raise AddressProviderError("Google request error", retryable=True) from exc

        if response.status_code == 429 or response.status_code >= 500:
            raise AddressProviderError(
                f"Google service unavailable ({response.status_code})",
                retryable=True,
            )

        if response.status_code >= 400:
            raise AddressProviderError(
                f"Google request rejected ({response.status_code})",
                retryable=response.status_code in {401, 403},
            )

        payload = response.json()
        verdict = payload.get("result", {}).get("verdict", {})
        address_result = payload.get("result", {}).get("address", {})
        postal = address_result.get("postalAddress", {})

        suggested = AddressNormalized(
            street1=postal.get("addressLines", [""])[0]
            if postal.get("addressLines")
            else "",
            street2=postal.get("addressLines", ["", ""])[1]
            if postal.get("addressLines") and len(postal.get("addressLines")) > 1
            else "",
            city=postal.get("locality", ""),
            state=postal.get("administrativeArea", ""),
            postal_code=postal.get("postalCode", ""),
            country=postal.get("regionCode", "US"),
        )

        is_valid = verdict.get("addressComplete", False)
        is_corrected = not _addresses_match(address, suggested)
        messages = []
        if not is_valid:
            messages.append("Address validation failed")

        return AddressVerificationResult(
            is_valid=is_valid,
            is_corrected=is_corrected,
            suggested_address=suggested if is_valid else None,
            messages=messages,
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
