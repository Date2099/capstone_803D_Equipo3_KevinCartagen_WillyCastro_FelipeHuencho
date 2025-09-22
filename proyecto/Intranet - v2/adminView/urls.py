from django.urls import path
from . import views

urlpatterns = [
    path('', views.admins_view, name='admins'),  # ruta principal de la app
]
