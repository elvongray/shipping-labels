import csv
import uuid
from pathlib import Path

import structlog
from celery import chain
from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.generics import GenericAPIView
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from imports.models import ImportJob
from imports.serializers import (
    ImportJobDetailSerializer,
    ImportJobSerializer,
    ImportPurchaseResponseSerializer,
    ImportUploadSerializer,
)
from imports.tasks import (
    task_finalize_import,
    task_validate_shipments,
    task_verify_addresses,
)
from shipments.models import Shipment

logger = structlog.get_logger(__name__)


def _parse_csv(job: ImportJob) -> str | None:
    stored_path = job.meta.get("stored_path")
    if not stored_path:
        return "CSV file not found."

    csv_path = Path(settings.MEDIA_ROOT) / stored_path
    if not csv_path.exists():
        return "CSV file not found."

    with csv_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.reader(handle)
        rows = list(reader)

    if len(rows) < 3:
        return "CSV file is missing data rows."

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

    return None


class ImportUploadView(GenericAPIView):
    parser_classes = [MultiPartParser, FormParser]
    serializer_class = ImportUploadSerializer

    @extend_schema(
        request=ImportUploadSerializer,
        responses={201: ImportJobSerializer},
    )
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        upload = serializer.validated_data["file"]
        if upload is None:
            return Response(
                {"error": {"code": "MISSING_FILE", "message": "file is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not upload.name.lower().endswith(".csv"):
            return Response(
                {"error": {"code": "INVALID_FILE", "message": "file must be a CSV"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        content_type = upload.content_type or ""
        if content_type not in {
            "text/csv",
            "application/vnd.ms-excel",
            "application/csv",
        }:
            return Response(
                {
                    "error": {
                        "code": "INVALID_CONTENT_TYPE",
                        "message": "invalid file type",
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        job = ImportJob.objects.create(
            original_filename=upload.name,
            status=ImportJob.Status.PENDING,
        )

        storage = FileSystemStorage(location=settings.MEDIA_ROOT)
        filename = f"imports/{job.id}.csv"
        storage.save(filename, upload)

        job.meta = {
            "stored_path": filename,
            "uploaded_at": timezone.now().isoformat(),
        }
        job.status = ImportJob.Status.PROCESSING
        job.save(update_fields=["meta", "status"])

        logger.info("import.upload.received", import_job_id=str(job.id))

        parse_error = _parse_csv(job)
        if parse_error:
            job.status = ImportJob.Status.FAILED
            job.error_summary = parse_error
            job.save(update_fields=["status", "error_summary"])
            return Response(
                {"error": {"code": "INVALID_FILE", "message": parse_error}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        chain(
            task_validate_shipments.si(import_job_id=str(job.id)),
            task_verify_addresses.si(import_job_id=str(job.id)),
            task_finalize_import.si(import_job_id=str(job.id)),
        ).delay()

        serializer = ImportJobSerializer(job)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ImportJobDetailView(APIView):
    @extend_schema(responses={200: ImportJobDetailSerializer})
    def get(self, request, import_id):
        job = (
            ImportJob.objects.filter(id=import_id)
            .annotate(
                total_rows=Count("shipments"),
                ready_count=Count(
                    "shipments",
                    filter=Q(
                        shipments__validation_status=Shipment.ValidationStatus.READY
                    ),
                ),
                needs_info_count=Count(
                    "shipments",
                    filter=Q(
                        shipments__validation_status=Shipment.ValidationStatus.NEEDS_INFO
                    ),
                ),
                invalid_count=Count(
                    "shipments",
                    filter=Q(
                        shipments__validation_status=Shipment.ValidationStatus.INVALID
                    ),
                ),
                address_unverified_count=Count(
                    "shipments",
                    filter=Q(
                        shipments__validation_status=Shipment.ValidationStatus.READY
                    )
                    & ~Q(
                        shipments__address_verification_status__in=[
                            Shipment.AddressVerificationStatus.VALID,
                            Shipment.AddressVerificationStatus.CORRECTED,
                        ]
                    ),
                ),
                ready_with_service_count=Count(
                    "shipments",
                    filter=Q(
                        shipments__validation_status=Shipment.ValidationStatus.READY
                    )
                    & ~Q(shipments__selected_service="")
                    & Q(shipments__selected_service__isnull=False),
                ),
                purchasable_count=Count(
                    "shipments",
                    filter=Q(
                        shipments__validation_status=Shipment.ValidationStatus.READY
                    )
                    & ~Q(shipments__selected_service="")
                    & Q(shipments__selected_service__isnull=False)
                    & Q(
                        shipments__address_verification_status__in=[
                            Shipment.AddressVerificationStatus.VALID,
                            Shipment.AddressVerificationStatus.CORRECTED,
                        ]
                    ),
                ),
            )
            .first()
        )
        if not job:
            return Response(
                {"error": {"code": "NOT_FOUND", "message": "Import job not found"}},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = ImportJobDetailSerializer(job)
        return Response(serializer.data)


class ImportPurchaseView(APIView):
    @extend_schema(
        responses={
            200: ImportPurchaseResponseSerializer,
            400: OpenApiResponse(description="Not ready or terms not accepted"),
        }
    )
    def post(self, request, import_id):
        label_format = request.data.get("label_format")
        agree = request.data.get("agree_to_terms")
        if not agree:
            return Response(
                {
                    "error": {
                        "code": "TERMS_REQUIRED",
                        "message": "Terms must be accepted",
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        shipments = Shipment.objects.filter(import_job_id=import_id)
        if not shipments.exists():
            return Response(
                {"error": {"code": "EMPTY_IMPORT", "message": "No shipments found"}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        eligible_shipments = (
            shipments.filter(
                validation_status=Shipment.ValidationStatus.READY,
                selected_service__isnull=False,
            )
            .exclude(selected_service="")
            .filter(
                address_verification_status__in=[
                    Shipment.AddressVerificationStatus.VALID,
                    Shipment.AddressVerificationStatus.CORRECTED,
                ]
            )
        )
        if not eligible_shipments.exists():
            return Response(
                {
                    "error": {
                        "code": "NOT_READY",
                        "message": "No READY shipments with verified addresses and services",
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        purchase_id = str(uuid.uuid4())
        for shipment in eligible_shipments:
            shipment.label_status = Shipment.LabelStatus.PURCHASED
            shipment.label_url = (
                f"https://example.com/labels/{purchase_id}/{shipment.id}.pdf"
            )
            shipment.save(update_fields=["label_status", "label_url"])

        return Response(
            {
                "purchase_id": purchase_id,
                "label_format": label_format,
                "label_download_url": f"https://example.com/labels/{purchase_id}.pdf",
                "purchased_count": eligible_shipments.count(),
                "skipped_count": shipments.count() - eligible_shipments.count(),
            }
        )
