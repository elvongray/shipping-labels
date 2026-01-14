from rest_framework import serializers

from shipments.models import SavedAddressPreset, SavedPackagePreset, Shipment


class ShipmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shipment
        fields = "__all__"


class ShipmentUpdateSerializer(serializers.ModelSerializer):
    from_company = serializers.CharField(
        required=False, allow_blank=True, allow_null=True
    )
    from_street2 = serializers.CharField(
        required=False, allow_blank=True, allow_null=True
    )
    to_company = serializers.CharField(
        required=False, allow_blank=True, allow_null=True
    )
    to_street2 = serializers.CharField(
        required=False, allow_blank=True, allow_null=True
    )

    def validate(self, attrs):
        for field in ("from_company", "from_street2", "to_company", "to_street2"):
            if field in attrs and attrs[field] is None:
                attrs[field] = ""
        return attrs

    class Meta:
        model = Shipment
        fields = (
            "from_name",
            "from_company",
            "from_street1",
            "from_street2",
            "from_city",
            "from_state",
            "from_postal_code",
            "from_country",
            "to_name",
            "to_company",
            "to_street1",
            "to_street2",
            "to_city",
            "to_state",
            "to_postal_code",
            "to_country",
            "weight_oz",
            "length_in",
            "width_in",
            "height_in",
            "selected_service",
            "selected_service_price_cents",
        )


class SavedAddressPresetSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedAddressPreset
        fields = "__all__"


class SavedPackagePresetSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedPackagePreset
        fields = "__all__"
