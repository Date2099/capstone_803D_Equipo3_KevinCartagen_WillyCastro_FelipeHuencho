from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from core.models import Enrollment, GuardianRelation, Payment
from django.views.decorators.http import require_POST
from core.models import UploadedPaymentProof, Payment
from django.core.files.storage import default_storage

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
    student = request.user  # el que está logeado

    # validar PIN en sesión
    if not request.session.get("pagos_autorizados", False):
        return JsonResponse({"error": "Acceso no autorizado"}, status=403)

    # encontrar apoderado
    relation = GuardianRelation.objects.filter(student=student).select_related("guardian").first()
    if not relation:
        return JsonResponse({"error": "No se encontró apoderado asociado"}, status=400)

    guardian = relation.guardian

    # cuotas del estudiante
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

    # Guardar comprobante en tabla aparte
    UploadedPaymentProof.objects.create(
        student=student,
        payment=payment,
        mes=payment.concept,
        monto=payment.amount,
        comprobante=file,
        estado="pendiente"  # para revisión manual
    )

    # Cambiar estado del pago a "en revisión"
    payment.status = "pending_review"  # 👈 nuevo estado
    payment.save()

    return JsonResponse({"success": True, "message": "Comprobante enviado correctamente"})
