# studentView/views.py

from django.shortcuts import render
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from core.models import (
    Enrollment,
    GuardianRelation,
    Subject,
    SubjectSchedule,
    Evaluation,
    GradeResult,
    Payment,
    UploadedPaymentProof,
)


# ============================
# DASHBOARD DEL ALUMNO
# ============================
@login_required
def dashboard(request):
    user = request.user

    enrollment = (
        Enrollment.objects
        .select_related("class_group__grade")
        .filter(student=user, active_status="active")
        .first()
    )

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


# ============================
# PERFIL DEL ALUMNO
# ============================
@login_required
def perfil_data(request):
    user = request.user

    if user.role != "student":
        return JsonResponse({"error": "Solo alumnos pueden acceder a este perfil."}, status=403)

    enrollment = (
        Enrollment.objects.filter(student=user, active_status="active")
        .select_related("class_group__grade")
        .first()
    )

    curso = enrollment.class_group.grade.curso_nombre if enrollment else "--"

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

    data = {
        "nombre": f"{user.first_name} {user.last_name}",
        "username": user.first_name.lower(),
        "email": user.email or "--",
        "rut": user.rut or "--",
        "curso": curso,
        "telefono": user.phone or "--",
        **apoderado_data,
    }

    return JsonResponse(data)


# ============================
# MIS ASIGNATURAS (CON HORARIOS)
# ============================
@login_required
def mis_asignaturas(request):
    user = request.user

    enrollment = (
        Enrollment.objects
        .select_related("class_group")
        .filter(student=user, active_status="active")
        .first()
    )

    if not enrollment:
        return JsonResponse({"asignaturas": [], "detalle": "Sin curso asignado"}, status=200)

    class_group = enrollment.class_group

    subjects = (
        Subject.objects
        .filter(class_group=class_group)
        .order_by("name")
    )

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


# ============================
# EVALUACIONES (CALENDARIO)
# ============================
@login_required
def evaluaciones_mias(request):
    alumno = request.user

    class_ids = (
        Enrollment.objects
        .filter(student=alumno, active_status="active")
        .values_list("class_group_id", flat=True)
    )

    evals = (
        Evaluation.objects
        .filter(class_group_id__in=class_ids)
        .select_related("subject", "class_group", "evaluation_type", "class_group__grade")
        .order_by("date")
    )

    data = []
    for ev in evals:
        curso_nombre = ""
        if ev.class_group and ev.class_group.grade:
            curso_nombre = f"{ev.class_group.grade.curso_nombre} {ev.class_group.year}"

        data.append({
            "id": ev.id,
            "title": f"{ev.subject.name} - {ev.description}",
            "start": ev.date.isoformat(),
            "allDay": True,
            "curso": curso_nombre,
            "tipo": getattr(ev.evaluation_type, "name", ""),
        })

    return JsonResponse(data, safe=False)


# ============================
# MIS NOTAS
# ============================
@login_required
def mis_notas(request):
    user = request.user

    resultados = (
        GradeResult.objects
        .select_related("evaluation", "evaluation__subject")
        .filter(student=user)
        .order_by("evaluation__subject__name", "evaluation__date")
    )

    materias = {}
    for gr in resultados:
        ev = gr.evaluation
        nombre_asig = ev.subject.name

        materias.setdefault(nombre_asig, []).append({
            "score": float(gr.score),
            "description": ev.description,
            "date": ev.date.isoformat() if ev.date else None,
        })

    data = [
        {"asignatura": nombre, "notas": notas}
        for nombre, notas in materias.items()
    ]

    return JsonResponse({"notas": data})


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


# ============================
# VALIDAR PIN APODERADO
# ============================
@login_required
@csrf_exempt
def validar_pin(request):
    if request.method != "POST":
        return JsonResponse({"error": "Método no permitido"}, status=405)

    pin = request.POST.get("pin")

    if not pin:
        return JsonResponse({"success": False, "message": "PIN requerido"})

    alumno = request.user

    if alumno.role != "student":
        return JsonResponse({"success": False, "message": "Solo estudiantes pueden usar este portal"})

    guardianes = GuardianRelation.objects.filter(student=alumno).select_related("guardian")

    for g in guardianes:
        if g.guardian.guardian_payment_pin == pin:
            request.session["pagos_autorizados"] = True
            return JsonResponse({"success": True})

    return JsonResponse({"success": False, "message": "PIN incorrecto"})


# ============================
# OBTENER PAGOS DEL ALUMNO (PORTAL APODERADO)
# ============================
@login_required
def obtener_pagos(request):
    student = request.user

    if not request.session.get("pagos_autorizados", False):
        return JsonResponse({"error": "Acceso no autorizado"}, status=403)

    relation = GuardianRelation.objects.filter(student=student).select_related("guardian").first()
    if not relation:
        return JsonResponse({"error": "No se encontró apoderado asociado"}, status=400)

    guardian = relation.guardian

    pagos = Payment.objects.filter(student=student).order_by("due_date")

    data = [{
        "id": p.id,
        "concept": p.concept,
        "amount": float(p.amount),
        "due_date": p.due_date.strftime("%d-%m-%Y") if p.due_date else None,
        "status": p.status,
    } for p in pagos]

    return JsonResponse({
        "apoderado": f"{guardian.first_name} {guardian.last_name}",
        "alumno": f"{student.first_name} {student.last_name}",
        "pagos": data,
    })


# ============================
# CERRAR ACCESO DE APODERADO
# ============================
@login_required
@csrf_exempt
def close_pin(request):
    if "pagos_autorizados" in request.session:
        del request.session["pagos_autorizados"]

    return JsonResponse({"success": True})


# ============================
# SUBIR COMPROBANTE
# ============================
@login_required
@require_POST
def subir_comprobante(request, payment_id):

    if not request.session.get("pagos_autorizados", False):
        return JsonResponse({"error": "Acceso no autorizado"}, status=403)

    student = request.user
    file = request.FILES.get("comprobante")

    if not file:
        return JsonResponse({"error": "Debes subir un archivo"}, status=400)

    try:
        payment = Payment.objects.get(id=payment_id, student=student)
    except Payment.DoesNotExist:
        return JsonResponse({"error": "Pago no encontrado"}, status=404)

    # Reemplazar comprobantes previos (pendiente o rechazado)
    UploadedPaymentProof.objects.filter(
        student=student,
        payment=payment,
        estado__in=["pendiente", "rechazado"]
    ).delete()

    UploadedPaymentProof.objects.create(
        student=student,
        payment=payment,
        mes=payment.concept,
        monto=payment.amount,
        comprobante=file,
        estado="pendiente"
    )

    payment.status = "pending_review"
    payment.save()

    return JsonResponse({"success": True, "message": "Comprobante enviado correctamente"})
