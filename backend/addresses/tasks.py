import structlog
from celery import shared_task

from addresses.services.verify import (
    should_verify_from,
    should_verify_to,
    verify_shipment_address,
)
from shipments.models import Shipment
from shipments.services.validation import validate_shipment

logger = structlog.get_logger(__name__)


@shared_task
def verify_shipments_task(shipment_ids: list[str]) -> None:
    shipments = Shipment.objects.filter(id__in=shipment_ids)
    for shipment in shipments:
        if not should_verify_to(shipment):
            shipment.address_verification_status = (
                Shipment.AddressVerificationStatus.NOT_STARTED
            )
            shipment.address_verification_details = {}
        else:
            status, details = verify_shipment_address(shipment, "to")
            shipment.address_verification_status = status
            shipment.address_verification_details = details

        if not should_verify_from(shipment):
            shipment.from_address_verification_status = (
                Shipment.AddressVerificationStatus.NOT_STARTED
            )
            shipment.from_address_verification_details = {}
        else:
            from_status, from_details = verify_shipment_address(shipment, "from")
            shipment.from_address_verification_status = from_status
            shipment.from_address_verification_details = from_details

        validation = validate_shipment(shipment)
        shipment.validation_status = validation["status"]
        shipment.validation_errors = validation["errors"]

        shipment.save(
            update_fields=[
                "address_verification_status",
                "address_verification_details",
                "from_address_verification_status",
                "from_address_verification_details",
                "validation_status",
                "validation_errors",
            ]
        )

    logger.info("address.verify.completed", shipment_count=shipments.count())
