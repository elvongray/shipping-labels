import pytest
from rest_framework.test import APIClient

from imports.models import ImportJob
from shipments.models import Shipment


@pytest.mark.django_db
def test_shipping_quote_by_import_id():
    client = APIClient()
    job = ImportJob.objects.create(original_filename="test.csv")
    Shipment.objects.create(import_job=job, row_number=1, weight_oz=16)

    response = client.post(
        "/api/v1/shipping/quote/",
        {"import_id": str(job.id)},
        format="json",
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["results"][0]["quotes"]
