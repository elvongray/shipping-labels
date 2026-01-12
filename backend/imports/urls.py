from django.urls import path

from imports.views import ImportUploadView

urlpatterns = [
    path("imports/", ImportUploadView.as_view(), name="import_upload"),
]
