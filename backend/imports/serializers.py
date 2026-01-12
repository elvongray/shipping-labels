from rest_framework import serializers

from imports.models import ImportJob


class ImportJobSerializer(serializers.ModelSerializer):
    import_job_id = serializers.UUIDField(source="id", read_only=True)

    class Meta:
        model = ImportJob
        fields = ("import_job_id", "status")


class ImportUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
