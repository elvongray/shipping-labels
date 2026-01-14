import uuid

from django.db import models

from imports.models import ImportJob


class Shipment(models.Model):
    class ValidationStatus(models.TextChoices):
        NEEDS_INFO = "NEEDS_INFO", "Needs info"
        INVALID = "INVALID", "Invalid"
        READY = "READY", "Ready"

    class AddressVerificationStatus(models.TextChoices):
        NOT_STARTED = "NOT_STARTED", "Not started"
        VALID = "VALID", "Valid"
        CORRECTED = "CORRECTED", "Corrected"
        INVALID = "INVALID", "Invalid"
        FAILED = "FAILED", "Failed"

    class LabelStatus(models.TextChoices):
        NOT_PURCHASED = "NOT_PURCHASED", "Not purchased"
        PURCHASED = "PURCHASED", "Purchased"
        FAILED = "FAILED", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    import_job = models.ForeignKey(
        ImportJob, on_delete=models.CASCADE, related_name="shipments"
    )
    row_number = models.IntegerField()
    external_order_number = models.CharField(max_length=100, blank=True)
    sku = models.CharField(max_length=100, blank=True)

    from_name = models.CharField(max_length=200, blank=True)
    from_company = models.CharField(max_length=200, blank=True)
    from_street1 = models.CharField(max_length=200, blank=True)
    from_street2 = models.CharField(max_length=200, blank=True)
    from_city = models.CharField(max_length=100, blank=True)
    from_state = models.CharField(max_length=2, blank=True)
    from_postal_code = models.CharField(max_length=20, blank=True)
    from_country = models.CharField(max_length=2, default="US", blank=True)

    to_name = models.CharField(max_length=200, blank=True)
    to_company = models.CharField(max_length=200, blank=True)
    to_street1 = models.CharField(max_length=200, blank=True)
    to_street2 = models.CharField(max_length=200, blank=True)
    to_city = models.CharField(max_length=100, blank=True)
    to_state = models.CharField(max_length=2, blank=True)
    to_postal_code = models.CharField(max_length=20, blank=True)
    to_country = models.CharField(max_length=2, default="US", blank=True)

    weight_oz = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True
    )
    length_in = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True
    )
    width_in = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True
    )
    height_in = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True
    )

    validation_status = models.CharField(
        max_length=20,
        choices=ValidationStatus.choices,
        default=ValidationStatus.NEEDS_INFO,
    )
    validation_errors = models.JSONField(default=list, blank=True)
    address_verification_status = models.CharField(
        max_length=20,
        choices=AddressVerificationStatus.choices,
        default=AddressVerificationStatus.NOT_STARTED,
    )
    address_verification_details = models.JSONField(default=dict, blank=True)
    from_address_verification_status = models.CharField(
        max_length=20,
        choices=AddressVerificationStatus.choices,
        default=AddressVerificationStatus.NOT_STARTED,
    )
    from_address_verification_details = models.JSONField(default=dict, blank=True)
    from_address_is_preset = models.BooleanField(default=False)

    selected_service = models.CharField(max_length=100, blank=True)
    selected_service_price_cents = models.IntegerField(null=True, blank=True)

    label_status = models.CharField(
        max_length=20, choices=LabelStatus.choices, default=LabelStatus.NOT_PURCHASED
    )
    label_url = models.URLField(blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["import_job", "row_number"]),
            models.Index(fields=["import_job", "validation_status"]),
        ]

    def __str__(self) -> str:
        return f"Shipment {self.id}"


class SavedAddressPreset(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    contact_name = models.CharField(max_length=200, blank=True)
    company = models.CharField(max_length=200, blank=True)
    street1 = models.CharField(max_length=200)
    street2 = models.CharField(max_length=200, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=2)
    postal_code = models.CharField(max_length=20)
    country = models.CharField(max_length=2, default="US")

    def __str__(self) -> str:
        return self.name


class SavedPackagePreset(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    weight_oz = models.DecimalField(max_digits=8, decimal_places=2)
    length_in = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True
    )
    width_in = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True
    )
    height_in = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True
    )

    def __str__(self) -> str:
        return self.name
