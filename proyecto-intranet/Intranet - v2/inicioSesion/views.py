from django.urls import reverse
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login



#Funcion de cierre de sesion
def logout_view(request):
    from django.contrib.auth import logout
    logout(request)
    return redirect(reverse('inicio_sesion'))  # Redirige a la página de inicio de sesión después de cerrar sesión
#registro de usuario
# inicioSesion/views.py

def registro(request):
    return render(request, "inicioSesion/registro.html")

