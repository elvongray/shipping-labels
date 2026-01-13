from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass
class AddressInput:
    name: str
    street1: str
    street2: str
    city: str
    state: str
    postal_code: str
    country: str = "US"


@dataclass
class AddressNormalized:
    street1: str
    street2: str
    city: str
    state: str
    postal_code: str
    country: str = "US"


@dataclass
class AddressVerificationResult:
    is_valid: bool
    is_corrected: bool
    suggested_address: AddressNormalized | None
    messages: list[str]
    raw: dict


class AddressProviderError(Exception):
    def __init__(self, message: str, retryable: bool = False):
        super().__init__(message)
        self.retryable = retryable


class AddressProvider(Protocol):
    name: str

    def verify(self, address: AddressInput) -> AddressVerificationResult:
        raise NotImplementedError
