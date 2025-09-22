
from django.shortcuts import render

def admins_view(request):
    return render(request, 'adminView/admins.html')  # incluye la carpeta de la app
