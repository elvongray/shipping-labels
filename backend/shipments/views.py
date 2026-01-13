import structlog
from django.db.models import Q
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status, viewsets
from rest_framework.generics import ListAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from addresses.tasks import verify_shipments_task
from imports.serializers import ImportBulkResponseSerializer
from shipments.models import SavedAddressPreset, SavedPackagePreset, Shipment
from shipments.serializers import (
    SavedAddressPresetSerializer,
    SavedPackagePresetSerializer,
    ShipmentSerializer,
    ShipmentUpdateSerializer,
)
from shipments.services.validation import validate_shipment

logger = structlog.get_logger(__name__)


class ShipmentPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = "page_size"


class ImportShipmentListView(ListAPIView):
    serializer_class = ShipmentSerializer
    pagination_class = ShipmentPagination

    def get_queryset(self):
        queryset = Shipment.objects.filter(import_job_id=self.kwargs["import_id"])
        status_param = self.request.query_params.get("status")
        search = self.request.query_params.get("search")
        if status_param:
            queryset = queryset.filter(validation_status=status_param)
        if search:
            queryset = queryset.filter(
                Q(external_order_number__icontains=search)
                | Q(to_name__icontains=search)
                | Q(to_street1__icontains=search)
                | Q(to_city__icontains=search)
                | Q(to_postal_code__icontains=search)
            )
        return queryset.order_by("row_number")


class ShipmentDetailView(RetrieveUpdateDestroyAPIView):
    queryset = Shipment.objects.all()
    serializer_class = ShipmentSerializer

    def get_serializer_class(self):
        if self.request.method in {"PATCH", "PUT"}:
            return ShipmentUpdateSerializer
        return ShipmentSerializer

    def perform_update(self, serializer):
        shipment = serializer.save()
        result = validate_shipment(shipment)
        shipment.validation_status = result["status"]
        shipment.validation_errors = result["errors"]
        shipment.save(update_fields=["validation_status", "validation_errors"])


class ImportShipmentBulkView(APIView):
    @extend_schema(
        responses={
            200: OpenApiResponse(response=ImportBulkResponseSerializer),
            400: OpenApiResponse(description="Invalid bulk action"),
        }
    )
    def post(self, request, import_id):
        action = request.data.get("action")
        shipment_ids = request.data.get("shipment_ids", [])
        payload = request.data.get("payload", {}) or {}

        shipments = Shipment.objects.filter(
            import_job_id=import_id, id__in=shipment_ids
        )
        updated_count = 0
        deleted_count = 0
        errors = []

        if action == "apply_saved_address":
            preset_id = payload.get("preset_id")
            if preset_id:
                preset = SavedAddressPreset.objects.filter(id=preset_id).first()
                if not preset:
                    return Response(
                        {
                            "error": {
                                "code": "PRESET_NOT_FOUND",
                                "message": "Preset not found",
                            }
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                update_data = {
                    "from_name": preset.contact_name,
                    "from_company": preset.company,
                    "from_street1": preset.street1,
                    "from_street2": preset.street2,
                    "from_city": preset.city,
                    "from_state": preset.state,
                    "from_postal_code": preset.postal_code,
                    "from_country": preset.country,
                }
            else:
                update_data = payload

            for shipment in shipments:
                for key, value in update_data.items():
                    if hasattr(shipment, key):
                        setattr(shipment, key, value)
                result = validate_shipment(shipment)
                shipment.validation_status = result["status"]
                shipment.validation_errors = result["errors"]
                shipment.save()
                updated_count += 1

        elif action == "apply_saved_package":
            preset_id = payload.get("preset_id")
            if preset_id:
                preset = SavedPackagePreset.objects.filter(id=preset_id).first()
                if not preset:
                    return Response(
                        {
                            "error": {
                                "code": "PRESET_NOT_FOUND",
                                "message": "Preset not found",
                            }
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                update_data = {
                    "weight_oz": preset.weight_oz,
                    "length_in": preset.length_in,
                    "width_in": preset.width_in,
                    "height_in": preset.height_in,
                }
            else:
                update_data = payload

            for shipment in shipments:
                for key, value in update_data.items():
                    if hasattr(shipment, key):
                        setattr(shipment, key, value)
                result = validate_shipment(shipment)
                shipment.validation_status = result["status"]
                shipment.validation_errors = result["errors"]
                shipment.save()
                updated_count += 1

        elif action == "delete":
            deleted_count = shipments.count()
            shipments.delete()

        elif action == "set_shipping_service":
            service = payload.get("service")
            price_cents = payload.get("price_cents")
            if not service:
                return Response(
                    {
                        "error": {
                            "code": "MISSING_SERVICE",
                            "message": "service is required",
                        }
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            updated_count = shipments.update(
                selected_service=service, selected_service_price_cents=price_cents
            )

        elif action == "verify_addresses":
            verify_shipments_task.delay([str(s.id) for s in shipments])
            updated_count = shipments.count()

        else:
            errors.append({"code": "INVALID_ACTION", "message": "Unsupported action"})

        return Response(
            {
                "updated_count": updated_count,
                "deleted_count": deleted_count,
                "errors": errors,
            }
        )


class SavedAddressPresetViewSet(viewsets.ModelViewSet):
    queryset = SavedAddressPreset.objects.all()
    serializer_class = SavedAddressPresetSerializer


class SavedPackagePresetViewSet(viewsets.ModelViewSet):
    queryset = SavedPackagePreset.objects.all()
    serializer_class = SavedPackagePresetSerializer
