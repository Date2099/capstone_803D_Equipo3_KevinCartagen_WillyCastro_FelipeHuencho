# profesorView/urls.py
from django.urls import path
from . import views

app_name = "profesorView"

urlpatterns = [
    path("", views.dashboard, name="dashboard"),
    path("perfil-data/", views.perfil_data, name="perfil-data"),
    path("cursos/", views.cursos_docente, name="cursos"),
    path("curso/<int:class_id>/alumnos/", views.alumnos_por_curso, name="alumnos-curso"),

    # 👇 para llenar el select de asignaturas en ese curso
    path("curso/<int:class_id>/asignaturas/", views.asignaturas_por_curso, name="asignaturas-curso"),

    # 👇 si quieres listar tipos (opcional, por si después los creas fijos)
    path("evaluation-types/", views.evaluation_types, name="evaluation-types"),

    # 👇 ESTA es la que tu JS está llamando
    path("crear-evaluacion/", views.crear_evaluacion, name="crear-evaluacion"),

    # guardar notas
    path("evaluacion/<int:eval_id>/notas/guardar/", views.guardar_notas, name="guardar-notas"),

    path("curso/<int:class_id>/evaluaciones/", views.evaluaciones_por_curso, name="evaluaciones-curso"),

]
