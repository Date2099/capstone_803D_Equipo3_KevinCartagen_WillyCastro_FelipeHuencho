# studentView/urls.py
from django.urls import path
from . import views

app_name = "studentView"

urlpatterns = [
    # ========================
    # Vistas originales alumno
    # ========================
    path("", views.dashboard, name="dashboard"),
    path("perfil-data/", views.perfil_data, name="perfil_data"),
    path("mis-asignaturas/", views.mis_asignaturas, name="mis_asignaturas"),

    # Mantengo la URL del primer código, pero apunto a evaluaciones_mias
    path("evaluaciones/", views.evaluaciones_mias, name="evaluaciones-alumno"),

    path("mis-notas/", views.mis_notas, name="mis-notas"),
    path("mis-notas-debug/", views.mis_notas_debug, name="mis-notas-debug"),

    # ========================
    # Portal apoderado / pagos
    # ========================
    path("validar-pin/", views.validar_pin, name="validar_pin"),
    path("obtener-pagos/", views.obtener_pagos, name="obtener_pagos"),
    path("close-pin/", views.close_pin, name="close_pin"),
    path(
        "subir-comprobante/<int:payment_id>/",
        views.subir_comprobante,
        name="subir_comprobante",
    ),
]
