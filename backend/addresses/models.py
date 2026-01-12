import uuid

from django.db import models

from shipments.models import Shipment


class VerificationAttempt(models.Model):
    class Status(models.TextChoices):
        SUCCESS = "SUCCESS", "Success"
        FAILURE = "FAILURE", "Failure"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    shipment = models.ForeignKey(
        Shipment, on_delete=models.CASCADE, related_name="verification_attempts"
    )
    provider = models.CharField(max_length=100)
    status = models.CharField(max_length=10, choices=Status.choices)
    request_payload = models.JSONField(default=dict, blank=True)
    response_payload = models.JSONField(default=dict, blank=True)
    error = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.provider} - {self.status}"
