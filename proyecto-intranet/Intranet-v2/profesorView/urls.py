
from django.contrib import admin
from django.urls import path, include
from .views import profesor_dashboard


urlpatterns = [
    path('admin/', admin.site.urls),
    path('teacher/', profesor_dashboard, name='teacher'),

]
