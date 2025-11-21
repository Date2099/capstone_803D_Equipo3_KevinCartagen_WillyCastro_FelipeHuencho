<<<<<<< HEAD
# administrador/urls.py
from django.urls import path
from . import views

app_name = "administrador"   # 👈 IMPORTANTE
=======
from django.urls import path
from . import views

app_name = "administrador"   
>>>>>>> feature/admin-view

urlpatterns = [
    path("", views.admin_dashboard, name="admin_dashboard"),
    path("usuarios/", views.users_list, name="users"),
    path("pagos/", views.payments, name="payments"),
    
]
