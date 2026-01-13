import structlog
from celery import shared_task

from addresses.services.verify import should_verify, verify_shipment_address
from shipments.models import Shipment
from shipments.services.validation import validate_shipment

logger = structlog.get_logger(__name__)


@shared_task
def verify_shipments_task(shipment_ids: list[str]) -> None:
    shipments = Shipment.objects.filter(id__in=shipment_ids)
    for shipment in shipments:
        if not should_verify(shipment):
            shipment.address_verification_status = (
                Shipment.AddressVerificationStatus.NOT_STARTED
            )
            shipment.address_verification_details = {}
            shipment.save(
                update_fields=[
                    "address_verification_status",
                    "address_verification_details",
                ]
            )
            continue

        status, details = verify_shipment_address(shipment)
        shipment.address_verification_status = status
        shipment.address_verification_details = details

        validation = validate_shipment(shipment)
        shipment.validation_status = validation["status"]
        shipment.validation_errors = validation["errors"]

        shipment.save(
            update_fields=[
                "address_verification_status",
                "address_verification_details",
                "validation_status",
                "validation_errors",
            ]
        )

    logger.info("address.verify.completed", shipment_count=shipments.count())
