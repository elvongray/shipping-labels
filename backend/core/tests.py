import pytest
from django.test import Client


@pytest.mark.django_db
def test_health_check_includes_request_id():
    client = Client()
    response = client.get("/api/v1/health/")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert response.headers.get("X-Request-ID")
