import uuid

import structlog
from celery import chain
from django.conf import settings
from django.core.files.storage import FileSystemStorage
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
    task_parse_csv,
    task_validate_shipments,
)
from shipments.models import Shipment

logger = structlog.get_logger(__name__)


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

        chain(
            task_parse_csv.si(import_job_id=str(job.id)),
            task_validate_shipments.si(import_job_id=str(job.id)),
            # task_verify_addresses.si(import_job_id=str(job.id)),
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

        missing_ready = shipments.exclude(
            validation_status=Shipment.ValidationStatus.READY
        ).exists()
        missing_service = shipments.filter(selected_service="").exists()
        if missing_ready or missing_service:
            return Response(
                {
                    "error": {
                        "code": "NOT_READY",
                        "message": "All shipments must be READY and have a service",
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        purchase_id = str(uuid.uuid4())
        for shipment in shipments:
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
            }
        )
