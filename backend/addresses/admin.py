from django.contrib import admin

from addresses.models import VerificationAttempt


@admin.register(VerificationAttempt)
class VerificationAttemptAdmin(admin.ModelAdmin):
    list_display = ("id", "shipment", "provider", "status", "created_at")
    list_filter = ("status", "provider")
