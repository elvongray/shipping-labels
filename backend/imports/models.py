import uuid

from django.db import models


class ImportJob(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PROCESSING = "PROCESSING", "Processing"
        COMPLETED = "COMPLETED", "Completed"
        FAILED = "FAILED", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    original_filename = models.CharField(max_length=255)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    progress_total = models.IntegerField(default=0)
    progress_done = models.IntegerField(default=0)
    error_summary = models.TextField(blank=True, null=True)
    meta = models.JSONField(default=dict, blank=True)

    def __str__(self) -> str:
        return f"ImportJob {self.id} ({self.status})"
