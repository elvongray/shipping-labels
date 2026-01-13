from __future__ import annotations

import csv
from pathlib import Path

import structlog
from celery import shared_task
from django.conf import settings
from django.db import transaction

from addresses.services.verify import should_verify, verify_shipment_address
from imports.models import ImportJob
from shipments.models import Shipment
from shipments.services.validation import validate_shipment

logger = structlog.get_logger(__name__)


def _get_csv_path(job: ImportJob) -> Path:
    stored_path = job.meta.get("stored_path")
    return Path(settings.MEDIA_ROOT) / stored_path


@shared_task
def task_parse_csv(import_job_id: str) -> None:
    job = ImportJob.objects.get(id=import_job_id)
    csv_path = _get_csv_path(job)

    if not csv_path.exists():
        job.status = ImportJob.Status.FAILED
        job.error_summary = "CSV file not found."
        job.save(update_fields=["status", "error_summary"])
        logger.error("import.parse.failed", import_job_id=import_job_id)
        return

    logger.info("import.parse.started", import_job_id=import_job_id)

    with csv_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.reader(handle)
        rows = list(reader)

    if len(rows) < 3:
        job.status = ImportJob.Status.FAILED
        job.error_summary = "CSV file is missing data rows."
        job.save(update_fields=["status", "error_summary"])
        logger.error("import.parse.failed", import_job_id=import_job_id)
        return

    data_rows = rows[2:]
    shipments = []
    for index, row in enumerate(data_rows, start=3):
        row = row + [""] * (23 - len(row))
        from_name = " ".join([row[0], row[1]]).strip()
        to_name = " ".join([row[7], row[8]]).strip()

        try:
            lbs = float(row[14] or 0)
            oz = float(row[15] or 0)
        except ValueError:
            lbs = 0
            oz = 0

        weight_oz = (lbs * 16) + oz if lbs or oz else None

        shipments.append(
            Shipment(
                import_job=job,
                row_number=index,
                external_order_number=row[21],
                sku=row[22],
                from_name=from_name,
                from_street1=row[2],
                from_street2=row[3],
                from_city=row[4],
                from_postal_code=row[5],
                from_state=row[6],
                from_country="US",
                to_name=to_name,
                to_street1=row[9],
                to_street2=row[10],
                to_city=row[11],
                to_postal_code=row[12],
                to_state=row[13],
                to_country="US",
                weight_oz=weight_oz,
                length_in=row[16] or None,
                width_in=row[17] or None,
                height_in=row[18] or None,
            )
        )

    with transaction.atomic():
        Shipment.objects.filter(import_job=job).delete()
        Shipment.objects.bulk_create(shipments)
        job.progress_total = len(shipments)
        job.progress_done = 0
        job.save(update_fields=["progress_total", "progress_done"])

    logger.info("import.parse.completed", import_job_id=import_job_id)


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
