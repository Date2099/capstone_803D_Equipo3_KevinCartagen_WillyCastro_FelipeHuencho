
from django.contrib import admin
from django.urls import path, include
from inicioSesion.views import *
from django.contrib.auth.views import LoginView, LogoutView
from django.conf.urls.static import static
from .views import registro

urlpatterns = [
    path('admin/', admin.site.urls),
    path('login/', LoginView.as_view(template_name='inicioSesion/login.html'), name='login'),
    path('logout/', LogoutView.as_view(next_page='login'), name='logout'),
    path('registro/', registro, name='registro'),
    

]
