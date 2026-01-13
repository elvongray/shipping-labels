from django.urls import path

from imports.views import ImportJobDetailView, ImportPurchaseView, ImportUploadView
from shipments.views import ImportShipmentBulkView

urlpatterns = [
    path("imports/", ImportUploadView.as_view(), name="import_upload"),
    path(
        "imports/<uuid:import_id>/", ImportJobDetailView.as_view(), name="import_detail"
    ),
    path(
        "imports/<uuid:import_id>/shipments/bulk/",
        ImportShipmentBulkView.as_view(),
        name="import_bulk",
    ),
    path(
        "imports/<uuid:import_id>/purchase/",
        ImportPurchaseView.as_view(),
        name="import_purchase",
    ),
]
