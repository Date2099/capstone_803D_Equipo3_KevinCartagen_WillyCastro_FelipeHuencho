from django.urls import path
from . import views  # asegúrate que esta línea exista
from .views import subir_comprobante

app_name = "studentView"

urlpatterns = [
    path("", views.dashboard, name="dashboard"),
    path("perfil-data/", views.perfil_data, name="perfil_data"),
    path("validar-pin/", views.validar_pin, name="validar_pin"),  
    path("obtener-pagos/", views.obtener_pagos, name="obtener_pagos"),
    path("close-pin/", views.close_pin, name="close_pin"),
    path("subir-comprobante/<int:payment_id>/", subir_comprobante, name="subir_comprobante"),


]
