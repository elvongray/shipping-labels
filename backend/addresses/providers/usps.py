from __future__ import annotations

import xml.etree.ElementTree as ET
from dataclasses import asdict

import httpx

from addresses.providers.base import (
    AddressInput,
    AddressNormalized,
    AddressProviderError,
    AddressVerificationResult,
)


class USPSProvider:
    name = "usps"

    def __init__(self, user_id: str | None):
        self.user_id = user_id

    def verify(self, address: AddressInput) -> AddressVerificationResult:
        if not self.user_id:
            raise AddressProviderError("USPS user ID missing", retryable=True)

        zip5, zip4 = _split_zip(address.postal_code)
        xml_request = (
            f'<AddressValidateRequest USERID="{self.user_id}">'
            '<Address ID="0">'
            f"<Address1>{_xml_escape(address.street2)}</Address1>"
            f"<Address2>{_xml_escape(address.street1)}</Address2>"
            f"<City>{_xml_escape(address.city)}</City>"
            f"<State>{_xml_escape(address.state)}</State>"
            f"<Zip5>{_xml_escape(zip5)}</Zip5>"
            f"<Zip4>{_xml_escape(zip4)}</Zip4>"
            "</Address>"
            "</AddressValidateRequest>"
        )

        try:
            response = httpx.get(
                "https://secure.shippingapis.com/ShippingAPI.dll",
                params={"API": "Verify", "XML": xml_request},
                timeout=5.0,
            )
        except httpx.TimeoutException as exc:
            raise AddressProviderError("USPS timeout", retryable=True) from exc
        except httpx.RequestError as exc:
            raise AddressProviderError("USPS request error", retryable=True) from exc

        if response.status_code == 429 or response.status_code >= 500:
            raise AddressProviderError(
                f"USPS service unavailable ({response.status_code})",
                retryable=True,
            )

        if response.status_code >= 400:
            raise AddressProviderError(
                f"USPS request rejected ({response.status_code})",
                retryable=response.status_code in {401, 403},
            )

        parsed = _parse_usps_response(response.text, address)
        return AddressVerificationResult(
            is_valid=parsed["is_valid"],
            is_corrected=parsed["is_corrected"],
            suggested_address=parsed["suggested_address"],
            messages=parsed["messages"],
            raw={"response": parsed["raw"]},
        )


def _split_zip(postal_code: str) -> tuple[str, str]:
    if "-" in postal_code:
        parts = postal_code.split("-", maxsplit=1)
        return parts[0], parts[1]
    return postal_code, ""


def _parse_usps_response(xml_text: str, original: AddressInput) -> dict:
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return {
            "is_valid": False,
            "is_corrected": False,
            "suggested_address": None,
            "messages": ["USPS response parse error"],
            "raw": {"xml": xml_text},
        }

    error = root.find(".//Error")
    if error is not None:
        description = error.findtext("Description") or "USPS error"
        return {
            "is_valid": False,
            "is_corrected": False,
            "suggested_address": None,
            "messages": [description],
            "raw": {"xml": xml_text},
        }

    address_node = root.find(".//Address")
    if address_node is None:
        return {
            "is_valid": False,
            "is_corrected": False,
            "suggested_address": None,
            "messages": ["USPS response missing address"],
            "raw": {"xml": xml_text},
        }

    street1 = address_node.findtext("Address2") or ""
    street2 = address_node.findtext("Address1") or ""
    city = address_node.findtext("City") or ""
    state = address_node.findtext("State") or ""
    zip5 = address_node.findtext("Zip5") or ""
    zip4 = address_node.findtext("Zip4") or ""
    postal_code = f"{zip5}-{zip4}" if zip4 else zip5

    suggested = AddressNormalized(
        street1=street1,
        street2=street2,
        city=city,
        state=state,
        postal_code=postal_code,
        country="US",
    )

    is_corrected = not _addresses_match(original, suggested)

    return {
        "is_valid": True,
        "is_corrected": is_corrected,
        "suggested_address": suggested,
        "messages": [],
        "raw": {"address": asdict(suggested), "xml": xml_text},
    }


def _xml_escape(value: str | None) -> str:
    safe_value = str(value or "")
    return (
        safe_value.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
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
