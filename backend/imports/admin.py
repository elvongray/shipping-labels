from django.contrib import admin

from imports.models import ImportJob


@admin.register(ImportJob)
class ImportJobAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "status",
        "original_filename",
        "progress_done",
        "progress_total",
    )
    list_filter = ("status",)
