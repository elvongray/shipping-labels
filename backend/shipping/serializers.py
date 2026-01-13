from rest_framework import serializers


class ShippingQuoteRequestSerializer(serializers.Serializer):
    import_id = serializers.UUIDField(required=False)
    shipment_ids = serializers.ListField(
        child=serializers.UUIDField(), required=False, allow_empty=False
    )  # type: ignore[assignment]

    def validate(self, attrs):
        if not attrs.get("import_id") and not attrs.get("shipment_ids"):
            raise serializers.ValidationError(
                "Either import_id or shipment_ids is required."
            )
        return attrs


class ShippingQuoteItemSerializer(serializers.Serializer):
    service = serializers.CharField()
    name = serializers.CharField()
    price_cents = serializers.IntegerField()


class ShippingQuoteResponseSerializer(serializers.Serializer):
    shipment_id = serializers.UUIDField()
    quotes = ShippingQuoteItemSerializer(many=True)


class ShippingQuoteListResponseSerializer(serializers.Serializer):
    results = ShippingQuoteResponseSerializer(many=True)
