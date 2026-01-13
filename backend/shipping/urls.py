from django.urls import path

from shipping.views import ShippingQuoteView

urlpatterns = [
    path("shipping/quote/", ShippingQuoteView.as_view(), name="shipping_quote"),
]
