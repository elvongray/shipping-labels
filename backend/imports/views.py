import structlog
from celery import chain
from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.utils import timezone
from rest_framework import status
from rest_framework.generics import GenericAPIView
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from imports.models import ImportJob
from imports.serializers import ImportJobSerializer, ImportUploadSerializer
from imports.tasks import (
    task_finalize_import,
    task_parse_csv,
    task_validate_shipments,
    task_verify_addresses,
)

logger = structlog.get_logger(__name__)


class ImportUploadView(GenericAPIView):
    parser_classes = [MultiPartParser, FormParser]
    serializer_class = ImportUploadSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        upload = serializer.validated_data["file"]
        if upload is None:
            return Response(
                {"error": {"code": "MISSING_FILE", "message": "file is required"}},
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
            task_verify_addresses.si(import_job_id=str(job.id)),
            task_finalize_import.si(import_job_id=str(job.id)),
        ).delay()

        serializer = ImportJobSerializer(job)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
