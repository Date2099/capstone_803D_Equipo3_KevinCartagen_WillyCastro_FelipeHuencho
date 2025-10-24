from django.urls import path
from . import views

app_name = "studentView"

urlpatterns = [
    path('', views.dashboard, name='dashboard'),
    path("perfil-data/", views.perfil_data, name="perfil_data"),
]
