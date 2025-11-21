from django.contrib import admin
from django.urls import path, include
from django.contrib.auth.views import LoginView
from django.contrib.auth import views as auth_views

urlpatterns = [
    path("admin/", admin.site.urls),  # 👈 cambia aquí        # panel Django
    path('inicioSesion/', include('inicioSesion.urls')),
    path('', LoginView.as_view(template_name='inicioSesion/login.html'), name='login'),
    path('studentView/', include('studentView.urls')),
    path('adminview/', include('adminView.urls')), # tu portal administrador
    path('profesorView/', include('profesorView.urls')),
    path('logout/', auth_views.LogoutView.as_view(next_page='/'), name='logout'),
]