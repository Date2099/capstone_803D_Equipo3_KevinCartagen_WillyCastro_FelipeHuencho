from django.shortcuts import render
from django.http import JsonResponse, Http404
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST

from core.models import (
    User, Class, Subject, Enrollment,
    Evaluation, EvaluationType, GradeResult
)


# =========================================================
# SPA: Panel + Perfil
# =========================================================
@login_required
def dashboard(request):
    """
    Renderiza el panel del profesor (SPA), igual que studentView pero versión profe.
    """
    u = request.user
    ctx = {
        "nombre": f"{u.first_name} {u.last_name}",
        "rut": getattr(u, "rut", ""),
        "email": u.email,
        "rol": getattr(u, "role", ""),
    }
    return render(request, "profesorView/teacher.html", ctx)

@login_required
def perfil_data(request):
    """
    Devuelve info básica del profesor (para la sección Perfil).
    """
    u = request.user
    data = {
        "nombre": f"{u.first_name} {u.last_name}",
        "email": u.email or "--",
        "rut": getattr(u, "rut", "--"),
        "telefono": getattr(u, "phone", "--"),
        "rol": getattr(u, "role", "--"),
    }
    return JsonResponse(data)


# =========================================================
# Cursos del docente (por asignaturas que imparte)
# =========================================================
@login_required
def cursos_docente(request):
    """
    Lista los cursos donde el profesor imparte asignaturas.
    (No depende de que Class.teacher esté seteado)
    """
    profesor = request.user

    cursos = (
        Subject.objects
        .filter(teacher=profesor)
        .values(
            "class_group_id",
            "class_group__grade__curso_nombre",
            "class_group__year",
        )
        .distinct()
    )

    data = [
        {
            "id": c["class_group_id"],
            "nombre": f'{c["class_group__grade__curso_nombre"]} {c["class_group__year"]}',
        }
        for c in cursos
    ]
    return JsonResponse(data, safe=False)


# =========================================================
# Alumnos por curso (validado por docencia del profesor)
# =========================================================
@login_required
def alumnos_por_curso(request, class_id: int):
    """
    Lista alumnos de un curso (class_group) SOLO si el profesor
    imparte al menos una asignatura en ese curso.
    """
    profesor = request.user

    # 1) validar que el profesor enseña en este course (class_id)
    enseña = Subject.objects.filter(class_group_id=class_id, teacher=profesor).exists()
    if not enseña:
        # Si ni siquiera existe el curso, lanza 404; si existe pero no enseña, 403
        if not Class.objects.filter(id=class_id).exists():
            raise Http404("Curso no encontrado")
        return JsonResponse({"error": "No autorizado"}, status=403)

    # 2) listar matrículas del curso
    qs = (
        Enrollment.objects
        .select_related("student", "class_group__grade")
        .filter(class_group_id=class_id)
    )
    alumnos = [
        {
            "id": e.student.id,
            "nombre": f"{e.student.first_name} {e.student.last_name}",
            "rut": getattr(e.student, "rut", "--"),
        }
        for e in qs
    ]

    # Si el curso existe pero no tiene matrículas, devolvemos lista vacía (200)
    # Solo 404 si ni siquiera existe el curso (lo validamos arriba).
    return JsonResponse(alumnos, safe=False)





# =========================================================
# Evaluaciones: guardar notas
# =========================================================
from decimal import Decimal, InvalidOperation
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
from core.models import User, Evaluation, GradeResult


@login_required
@require_POST
def guardar_notas(request, eval_id: int):
    profe = request.user

    # 1. la evaluación tiene que ser de este profe
    try:
        evaluacion = Evaluation.objects.get(id=eval_id, teacher=profe)
    except Evaluation.DoesNotExist:
        return JsonResponse({"error": "No autorizado"}, status=403)

    notas_guardadas = 0

    # 2. recorrer todo lo que vino del formulario
    for key, value in request.POST.items():
        # saltar el csrf
        if key == "csrfmiddlewaretoken":
            continue

        # aceptamos 2 nombres de campo:
        #  a) "23"
        #  b) "nota-23"
        if key.isdigit():
            student_id = key
        elif key.startswith("nota-") and key[5:].isdigit():
            student_id = key[5:]
        else:
            # no es un campo de nota
            continue

        if value == "":
            # input vacío, no guardar
            continue

        # 3. buscar el alumno
        try:
            student = User.objects.get(id=int(student_id), role="student")
        except User.DoesNotExist:
            continue

        # 4. convertir la nota a número
        try:
            score = Decimal(value)
        except InvalidOperation:
            continue

        # 5. crear o actualizar
        GradeResult.objects.update_or_create(
            evaluation=evaluacion,
            student=student,
            defaults={"score": score},
        )
        notas_guardadas += 1

    return JsonResponse({"success": True, "notas_guardadas": notas_guardadas})



# profesorView/views.py
from django.shortcuts import render
from django.http import JsonResponse, Http404
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST

from core.models import (
    User,
    Class,
    Subject,
    Enrollment,
    Evaluation,
    EvaluationType,
    GradeResult,
)

# ... tus otras vistas (dashboard, perfil_data, cursos_docente, alumnos_por_curso) ...


@login_required
def asignaturas_por_curso(request, class_id: int):
    """Devuelve las asignaturas que ESTE profesor imparte en ese curso."""
    profe = request.user
    asignaturas = (
        Subject.objects
        .filter(class_group_id=class_id, teacher=profe)
        .values("id", "name")
    )
    return JsonResponse(list(asignaturas), safe=False)


@login_required
def evaluation_types(request):
    """Por ahora solo devuelve lo que haya en la tabla. Si está vacía, devuelve []."""
    tipos = EvaluationType.objects.all().values("id", "name")
    return JsonResponse(list(tipos), safe=False)


# profesorView/views.py
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
from django.http import JsonResponse
from core.models import Class, Subject, Evaluation, EvaluationType

@login_required
@require_POST
def crear_evaluacion(request):
    profe = request.user

    class_id = request.POST.get("class_id")
    subject_id = request.POST.get("subject_id")
    description = request.POST.get("description") or ""
    date = request.POST.get("date")
    weight = request.POST.get("weight") or 1

    # 👇 esto viene del input de texto del profe
    type_name = (request.POST.get("evaluation_type_name") or "").strip()

    # 1) validar curso
    try:
        class_group = Class.objects.get(pk=class_id)
    except Class.DoesNotExist:
        return JsonResponse({"error": "Curso no existe"}, status=400)

    # 2) validar asignatura del profe en ese curso
    try:
        subject = Subject.objects.get(
            pk=subject_id,
            class_group=class_group,
            teacher=profe,
        )
    except Subject.DoesNotExist:
        return JsonResponse({"error": "No puedes crear evaluación para esa asignatura"}, status=400)

    # 3) asegurarnos de tener SIEMPRE un EvaluationType
    if not type_name:
      # si el profe no escribió nada, usamos un nombre genérico
      type_name = "Evaluación"

    eval_type, _ = EvaluationType.objects.get_or_create(
        name=type_name,
        defaults={"description": type_name},
    )

    # 4) crear la evaluación
    ev = Evaluation.objects.create(
        class_group=class_group,
        subject=subject,
        teacher=profe,
        evaluation_type=eval_type,   # 👈 ahora NUNCA es None
        date=date,
        description=description,
        weight=weight,
    )

    return JsonResponse({"success": True, "evaluation_id": ev.id})




# para las notas

from core.models import Evaluation, Subject

@login_required
def evaluaciones_por_curso(request, class_id: int):
    profe = request.user
    # evaluaciones de ese curso creadas por este profe
    qs = (
        Evaluation.objects
        .select_related("subject", "evaluation_type")
        .filter(class_group_id=class_id, teacher=profe)
        .order_by("-date")
    )
    data = [
        {
            "id": ev.id,
            "description": ev.description,
            "date": ev.date.isoformat(),
            "subject": ev.subject.name if ev.subject else "",
            "type": ev.evaluation_type.name if ev.evaluation_type else "",
        }
        for ev in qs
    ]
    return JsonResponse(data, safe=False)






# profesorView/views.py
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from core.models import Subject, Enrollment, Evaluation, GradeResult

@login_required
def mis_cursos_y_notas(request):
    profe = request.user

    # asignaturas que imparte este profe
    subjects = Subject.objects.filter(teacher=profe).select_related("class_group")

    cursos_data = []

    for s in subjects:
        # alumnos del curso de esa asignatura
        enrollments = (
            Enrollment.objects
            .filter(class_group=s.class_group)
            .select_related("student")
        )

        # evaluaciones de esa asignatura
        evaluations = Evaluation.objects.filter(subject=s)

        alumnos_data = []
        for en in enrollments:
            student = en.student
            notas = []
            for ev in evaluations:
                gr = GradeResult.objects.filter(evaluation=ev, student=student).first()
                notas.append({
                    "evaluacion": ev.description,      # o ev.evaluation_type.name si prefieres
                    "nota": gr.score if gr else None,  # 👈 AQUÍ estaba el error
                })

            alumnos_data.append({
                "nombre": f"{student.first_name} {student.last_name}",
                "rut": getattr(student, "rut", ""),
                "notas": notas,
            })

        cursos_data.append({
            "asignatura": s.name,
            "curso": str(s.class_group),
            "alumnos": alumnos_data,
        })

    return JsonResponse({"cursos": cursos_data})



