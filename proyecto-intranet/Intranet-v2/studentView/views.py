from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from core.models import Enrollment, GuardianRelation



@login_required
def dashboard(request):
    user = request.user

    # Buscar matrícula activa (Enrollment)
    enrollment = (
        Enrollment.objects
        .select_related("class_group__grade")
        .filter(student=user, active_status="active")
        .first()
    )

    # Si existe, obtener el curso, si no, mostrar texto por defecto
    curso = enrollment.class_group.grade.curso_nombre if enrollment else "Sin curso asignado"

    context = {
        "nombre": f"{user.first_name} {user.last_name}",
        "rut": user.rut,
        "email": user.email,
        "rol": user.get_role_display(),
        "estado": user.active_status,
        "curso": curso,
    }

    return render(request, "studentView/student.html", context)

@login_required
def perfil_data(request):
    user = request.user

    if user.role != "student":
        return JsonResponse({"error": "Solo alumnos pueden acceder a este perfil."}, status=403)

    # Buscar curso actual
    enrollment = (
        Enrollment.objects.filter(student=user, active_status="active")
        .select_related("class_group__grade")
        .first()
    )

    curso = None
    if enrollment:
        curso = enrollment.class_group.grade.curso_nombre

    # Buscar apoderado
    relation = GuardianRelation.objects.filter(student=user).select_related("guardian").first()
    apoderado_data = {}
    if relation:
        apoderado = relation.guardian
        apoderado_data = {
            "apoderado_nombre": f"{apoderado.first_name} {apoderado.last_name}",
            "apoderado_parentesco": getattr(apoderado, "relationship", "--"),
            "apoderado_telefono": apoderado.phone or "--",
            "apoderado_correo": apoderado.email or "--",
        }

    # Estructura final del JSON
    data = {
        "nombre": f"{user.first_name} {user.last_name}",
        "username": user.first_name.lower(),
        "email": user.email or "--",
        "rut": user.rut or "--",
        "curso": curso or "--",
        "telefono": user.phone or "--",
        **apoderado_data,  # mezcla los campos del apoderado
    }

    return JsonResponse(data)


