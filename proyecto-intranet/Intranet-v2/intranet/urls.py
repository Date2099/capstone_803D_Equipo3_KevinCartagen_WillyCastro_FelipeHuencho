
from django.contrib import admin
from django.urls import path, include
from django.contrib.auth.views import LoginView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('inicioSesion/', include('inicioSesion.urls')),
    path('', LoginView.as_view(template_name='inicioSesion/login.html'), name='login'),
    path('studentView/', include('studentView.urls')),
    path('adminview/', include('adminView.urls')),
    path('profesorView/', include('profesorView.urls')),
    path("finance/", include("finance.urls")),

]
