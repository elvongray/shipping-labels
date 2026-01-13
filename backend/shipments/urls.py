from django.urls import include, path
from rest_framework.routers import DefaultRouter

from shipments.views import (
    ImportShipmentListView,
    SavedAddressPresetViewSet,
    SavedPackagePresetViewSet,
    ShipmentDetailView,
)

router = DefaultRouter()
router.register(
    "presets/addresses", SavedAddressPresetViewSet, basename="address-preset"
)
router.register(
    "presets/packages", SavedPackagePresetViewSet, basename="package-preset"
)

urlpatterns = [
    path("imports/<uuid:import_id>/shipments/", ImportShipmentListView.as_view()),
    path("shipments/<uuid:pk>/", ShipmentDetailView.as_view()),
    path("", include(router.urls)),
]
