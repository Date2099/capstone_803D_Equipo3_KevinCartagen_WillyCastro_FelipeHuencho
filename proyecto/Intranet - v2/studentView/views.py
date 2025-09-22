from django.shortcuts import render

# Create your views here.


def student(request):
    return render(request, "studentView/student.html")