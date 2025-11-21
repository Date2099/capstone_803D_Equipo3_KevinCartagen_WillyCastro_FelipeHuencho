# studentView/urls.py
from django.urls import path
from . import views

app_name = "studentView"

urlpatterns = [
    path("", views.dashboard, name="dashboard"),
    path("perfil-data/", views.perfil_data, name="perfil_data"),
    path("mis-asignaturas/", views.mis_asignaturas, name="mis_asignaturas"),
    path("evaluaciones/", views.evaluaciones_alumno, name="evaluaciones-alumno"),
    path("mis-notas/", views.mis_notas, name="mis-notas"),
    path("mis-notas-debug/", views.mis_notas_debug, name="mis-notas-debug"),  # 👈 nuevo
]
