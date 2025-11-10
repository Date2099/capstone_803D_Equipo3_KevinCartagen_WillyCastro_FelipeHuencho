from django.urls import path
from . import views

app_name = "finanzas"

urlpatterns = [
    path("", views.dashboard_finanzas, name="dashboard_finanzas"),

    # API SPA
    path("api/comprobantes/", views.api_comprobantes, name="api_comprobantes"),
    path("comprobante/<int:pk>/aprobar/", views.aprobar_comprobante, name="aprobar_comprobante"),
    path("comprobante/<int:pk>/rechazar/", views.rechazar_comprobante, name="rechazar_comprobante"),
    path("api/cuotas-pendientes/", views.cuotas_pendientes, name="cuotas_pendientes"),
    path("ver-comprobante/<int:pk>", views.ver_comprobante, name="ver_comprobante"),





]
