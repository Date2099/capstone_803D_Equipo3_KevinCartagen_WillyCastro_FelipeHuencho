<<<<<<< HEAD
# core/urls.py
from django.urls import path

urlpatterns = [
    
=======
from django.urls import path
from . import views
from django.contrib import admin

urlpatterns = [
    path('admin/', admin.site.urls),
>>>>>>> feature/admin-view
]
