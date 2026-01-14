import structlog
from celery import shared_task

from addresses.services.verify import should_verify, verify_shipment_address
from imports.models import ImportJob
from shipments.models import Shipment
from shipments.services.validation import validate_shipment

logger = structlog.get_logger(__name__)


@shared_task
def task_validate_shipments(import_job_id: str) -> None:
    job = ImportJob.objects.get(id=import_job_id)
    logger.info("import.validate.started", import_job_id=import_job_id)

    shipments = Shipment.objects.filter(import_job=job)
    for shipment in shipments:
        result = validate_shipment(shipment)
        shipment.validation_status = result["status"]
        shipment.validation_errors = result["errors"]
        shipment.save(update_fields=["validation_status", "validation_errors"])
        job.progress_done = min(job.progress_total, job.progress_done + 1)
        job.save(update_fields=["progress_done"])

    logger.info("import.validate.completed", import_job_id=import_job_id)


@shared_task
def task_verify_addresses(import_job_id: str) -> None:
    logger.info("address.verify.started", import_job_id=import_job_id)
    shipments = Shipment.objects.filter(import_job_id=import_job_id)
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

    logger.info("address.verify.completed", import_job_id=import_job_id)


@shared_task
def task_finalize_import(import_job_id: str) -> None:
    job = ImportJob.objects.get(id=import_job_id)
    if job.status != ImportJob.Status.FAILED:
        job.status = ImportJob.Status.COMPLETED
        job.save(update_fields=["status"])
    logger.info("import.finalize.completed", import_job_id=import_job_id)
