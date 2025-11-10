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





from core.models import Enrollment, GuardianRelation, Subject, SubjectSchedule  # importa Subject y SubjectSchedule si no estaban

@login_required
def mis_asignaturas(request):
    user = request.user

    # 1. buscar la matrícula activa del alumno
    enrollment = (
        Enrollment.objects
        .select_related("class_group")
        .filter(student=user, active_status="active")
        .first()
    )

    if not enrollment:
        return JsonResponse({"asignaturas": [], "detalle": "Sin curso asignado"}, status=200)

    class_group = enrollment.class_group

    # 2. traer las asignaturas de ese curso
    # tu Subject tenía algo así como: name, class_group = ForeignKey(Class, ...)
    subjects = (
        Subject.objects
        .filter(class_group=class_group)
        .order_by("name")
    )

    # 3. opcional: traer el horario de cada asignatura
    # si tienes el modelo SubjectSchedule como en tus consultas SQL
    data = []
    for sub in subjects:
        horarios = list(
            SubjectSchedule.objects
            .filter(subject=sub)
            .values("day_of_week", "start_time", "end_time")
            .order_by("day_of_week", "start_time")
        )
        data.append({
            "id": sub.id,
            "nombre": sub.name,
            "profesor": f"{sub.teacher.first_name} {sub.teacher.last_name}" if sub.teacher else "--",
            "horarios": horarios,
        })

    return JsonResponse({"asignaturas": data})



#esto es del willy

# studentView/views.py
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from core.models import Enrollment, Evaluation

@login_required
def evaluaciones_alumno(request):
    alumno = request.user

    # 1) cursos donde está matriculado
    # Enrollment.class_group -> ese es el mismo que usa el profe
    enrolls = Enrollment.objects.filter(student=alumno).select_related("class_group")

    class_ids = [e.class_group_id for e in enrolls]

    # 2) evaluaciones de esos cursos
    evals = (
        Evaluation.objects
        .filter(class_group_id__in=class_ids)
        .select_related("subject", "evaluation_type", "class_group__grade")
        .order_by("date")
    )

    # 3) formatear para FullCalendar
    data = []
    for ev in evals:
      # nombre del curso bonito
      curso_nombre = ""
      if ev.class_group and ev.class_group.grade:
          curso_nombre = f"{ev.class_group.grade.curso_nombre} {ev.class_group.year}"

      data.append({
          "id": ev.id,
          "title": f"{ev.subject.name} - {ev.description}",
          "start": ev.date.isoformat(),   # 👈 IMPORTANTÍSIMO
          "allDay": True,
          # extras para el alert()
          "curso": curso_nombre,
          "tipo": getattr(ev.evaluation_type, "name", ""),
      })

    return JsonResponse(data, safe=False)



# studentView/views.py
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from core.models import Enrollment, Evaluation

@login_required
def evaluaciones_mias(request):
    alumno = request.user

    # cursos donde estoy matriculado
    class_ids = (
        Enrollment.objects
        .filter(student=alumno, active_status="active")
        .values_list("class_group_id", flat=True)
    )

    evals = (
        Evaluation.objects
        .filter(class_group_id__in=class_ids)
        .select_related("subject", "class_group", "evaluation_type")
        .order_by("date")
    )

    data = []
    for ev in evals:
        data.append({
            "id": ev.id,
            "title": f"{ev.subject.name} - {ev.description}",
            "start": ev.date.isoformat(),
            "allDay": True,
            "curso": str(ev.class_group),
            "tipo": getattr(ev.evaluation_type, "name", ""),
        })

    return JsonResponse(data, safe=False)


#notas

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from core.models import GradeResult


@login_required
def mis_notas(request):
    user = request.user

    # traemos todas las notas de ese alumno
    resultados = (
        GradeResult.objects
        .select_related("evaluation", "evaluation__subject")
        .filter(student=user)
        .order_by("evaluation__subject__name", "evaluation__date")
    )

    materias = {}
    for gr in resultados:
        ev = gr.evaluation
        nombre_asig = ev.subject.name  # "Inglés"

        materias.setdefault(nombre_asig, []).append({
            "score": float(gr.score),
            "description": ev.description,
            "date": ev.date.isoformat() if ev.date else None,
        })

    # lo convertimos al formato que tu tabla usa
    data = [
      {
        "asignatura": nombre,
        "notas": notas
      }
      for nombre, notas in materias.items()
    ]

    return JsonResponse({"notas": data})



# SOLO PARA PROBAR qué ve Django
@login_required
def mis_notas_debug(request):
    """Devuelve TODO lo que Django ve de GradeResult para este usuario, sin agrupar."""
    user = request.user
    qs = (
        GradeResult.objects
        .select_related("evaluation", "evaluation__subject")
        .filter(student=user)
        .order_by("evaluation__date")
    )

    raw = []
    for gr in qs:
        raw.append({
            "id": gr.id,
            "score": float(gr.score),
            "evaluation_id": gr.evaluation_id,
            "evaluation_description": gr.evaluation.description,
            "subject": gr.evaluation.subject.name,
            "date": gr.evaluation.date.isoformat() if gr.evaluation.date else None,
        })

    return JsonResponse({"raw": raw}, safe=True)
