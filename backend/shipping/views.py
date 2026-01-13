from drf_spectacular.utils import extend_schema
from rest_framework.response import Response
from rest_framework.views import APIView

from shipments.models import Shipment
from shipping.serializers import (
    ShippingQuoteListResponseSerializer,
    ShippingQuoteRequestSerializer,
)
from shipping.services import quote_for_weight


class ShippingQuoteView(APIView):
    @extend_schema(
        request=ShippingQuoteRequestSerializer,
        responses={200: ShippingQuoteListResponseSerializer},
    )
    def post(self, request):
        serializer = ShippingQuoteRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        import_id = serializer.validated_data.get("import_id")
        shipment_ids = serializer.validated_data.get("shipment_ids")

        if import_id:
            shipments = Shipment.objects.filter(import_job_id=import_id)
        else:
            shipments = Shipment.objects.filter(id__in=shipment_ids)

        results = []
        for shipment in shipments:
            quotes = quote_for_weight(shipment.weight_oz)
            results.append(
                {
                    "shipment_id": str(shipment.id),
                    "quotes": quotes,
                }
            )

        return Response({"results": results})
