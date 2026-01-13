from pathlib import Path

import pytest
from django.test import override_settings

from imports.models import ImportJob
from imports.tasks import task_parse_csv
from shipments.models import Shipment


def _sample_csv() -> str:
    return (
        "From,,,,,,,To,,,,,,,weight*,weight*,Dimensions*,Dimensions*,Dimensions*,,,,\n"
        "First name*,Last name,Address*,Address2,City*,ZIP/Postal code*,Abbreviation*,"
        "First name*,Last name,Address*,Address2,City*,ZIP/Postal code*,Abbreviation*,"
        "lbs,oz,Length,width,Height,phone num1,phone num2,order no,Item-sku\n"
        "John,Doe,1 Main St,,Town,12345,CA,Jane,Doe,2 Main St,,City,67890,NY,"
        "1,8,10,11,12,,,ORDER123,SKU1\n"
    )


@pytest.mark.django_db
def test_task_parse_csv_creates_shipments(tmp_path: Path):
    job = ImportJob.objects.create(original_filename="test.csv")
    stored_path = "imports/test.csv"
    job.meta = {"stored_path": stored_path}
    job.save(update_fields=["meta"])

    csv_path = tmp_path / stored_path
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    csv_path.write_text(_sample_csv(), encoding="utf-8")

    with override_settings(MEDIA_ROOT=tmp_path):
        task_parse_csv(import_job_id=str(job.id))

    shipment = Shipment.objects.get(import_job=job)
    assert shipment.row_number == 3
    assert shipment.to_name == "Jane Doe"
    assert shipment.weight_oz == 24
