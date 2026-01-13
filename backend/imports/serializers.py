from rest_framework import serializers

from imports.models import ImportJob


class ImportJobSerializer(serializers.ModelSerializer):
    import_job_id = serializers.UUIDField(source="id", read_only=True)

    class Meta:
        model = ImportJob
        fields = ("import_job_id", "status")


class ImportUploadSerializer(serializers.Serializer):
    file = serializers.FileField()


class ImportJobDetailSerializer(serializers.ModelSerializer):
    total_rows = serializers.IntegerField(read_only=True)
    ready_count = serializers.IntegerField(read_only=True)
    needs_info_count = serializers.IntegerField(read_only=True)
    invalid_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = ImportJob
        fields = (
            "id",
            "status",
            "progress_total",
            "progress_done",
            "error_summary",
            "total_rows",
            "ready_count",
            "needs_info_count",
            "invalid_count",
        )


class ImportPurchaseResponseSerializer(serializers.Serializer):
    purchase_id = serializers.UUIDField()
    label_format = serializers.CharField()
    label_download_url = serializers.URLField()


class ImportBulkResponseSerializer(serializers.Serializer):
    updated_count = serializers.IntegerField()
    deleted_count = serializers.IntegerField()
    errors = serializers.ListField(child=serializers.DictField())  # type: ignore[assignment]
