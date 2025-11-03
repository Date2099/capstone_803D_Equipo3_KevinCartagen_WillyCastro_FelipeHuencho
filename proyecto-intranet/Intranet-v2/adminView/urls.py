# adminView/urls.py
from django.urls import path
from adminView import views  

app_name = "administrador"

urlpatterns = [
    # --- Dashboard principal ---
    path("", views.admin_dashboard, name="admin_dashboard"),

    # --- Sección de usuarios ---
    path("usuarios/", views.users_list, name="users_list"),  

    # --- Sección de pagos ---
    path("pagos/", views.payments, name="payments"),

    # --- Profesores ---
    path("api/profesores/", views.api_ver_profesores, name="api_ver_profesores"),
    path("api/profesores/crear/", views.api_crear_profesor, name="api_crear_profesor"),
    path("api/profesores/<int:id>/actualizar/", views.api_actualizar_profesor, name="api_actualizar_profesor"),
    path("api/profesores/<int:id>/eliminar/", views.api_eliminar_profesor, name="api_eliminar_profesor"),

    # --- Cursos y alumnos ---
    path("api/cursos/", views.api_ver_cursos, name="api_ver_cursos"),
    path("api/alumnos/registrar/", views.api_registrar_alumno, name="api_registrar_alumno"),

    # --- Pagos ---
    path("api/pagos/", views.api_ver_pagos, name="api_ver_pagos"),

    # --- Comunicados y apoderados ---
    path("api/comunicados/enviar/", views.enviar_comunicado, name="api_enviar_comunicado"),
    path("api/apoderados/", views.api_listar_apoderados, name="api_listar_apoderados"),
]
