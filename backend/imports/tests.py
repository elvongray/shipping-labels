from pathlib import Path
from unittest import mock

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, override_settings

from imports.models import ImportJob


def _sample_csv() -> bytes:
    content = (
        "From,,,,,,,To,,,,,,,weight*,weight*,Dimensions*,Dimensions*,Dimensions*,,,,\n"
        "First name*,Last name,Address*,Address2,City*,ZIP/Postal code*,Abbreviation*,"
        "First name*,Last name,Address*,Address2,City*,ZIP/Postal code*,Abbreviation*,"
        "lbs,oz,Length,width,Height,phone num1,phone num2,order no,Item-sku\n"
        ",,,,,,,Salina,Dixon,61 Sunny Trail Rd,Apt 10885,Wallace,28466-9087,NC,"
        ",,,,,"  # weight and dimensions empty
        "\n"
    )
    return content.encode("utf-8")


@pytest.mark.django_db
def test_import_upload_creates_job_and_file(tmp_path: Path):
    client = Client()
    upload = SimpleUploadedFile("template.csv", _sample_csv(), content_type="text/csv")

    with override_settings(MEDIA_ROOT=tmp_path):
        with mock.patch("imports.views.chain") as chain_mock:
            chain_mock.return_value.delay.return_value = None
            response = client.post("/api/v1/imports/", {"file": upload})

    assert response.status_code == 201
    payload = response.json()
    assert "import_job_id" in payload

    job = ImportJob.objects.get(id=payload["import_job_id"])
    stored_path = job.meta.get("stored_path")
    assert stored_path
    assert (tmp_path / stored_path).exists()
