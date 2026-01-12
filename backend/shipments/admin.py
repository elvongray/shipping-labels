from django.contrib import admin

from shipments.models import SavedAddressPreset, SavedPackagePreset, Shipment


@admin.register(Shipment)
class ShipmentAdmin(admin.ModelAdmin):
    list_display = ("id", "import_job", "row_number", "validation_status")
    list_filter = ("validation_status",)
    search_fields = ("external_order_number", "to_name", "to_postal_code")


@admin.register(SavedAddressPreset)
class SavedAddressPresetAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "city", "state", "postal_code")


@admin.register(SavedPackagePreset)
class SavedPackagePresetAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "weight_oz")
