from django.urls import path
from . import views

app_name = "inicioSesion" 

urlpatterns = [
    path("", views.login_view, name="login"),
    path("post_login/", views.post_login, name="post_login"),
    path("logout/", views.logout_view, name="logout"),
]
