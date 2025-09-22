
from django.contrib import admin
from django.urls import path, include
from django.contrib.auth.views import LoginView
from .views import student

urlpatterns = [
    path('admin/', admin.site.urls),
    path('student/', student, name='student'),
]
