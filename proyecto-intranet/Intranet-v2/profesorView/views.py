from django.shortcuts import render

# Create your views here.

def profesor_dashboard(request):
    return render(request, 'profesorView/teacher.html')                   
