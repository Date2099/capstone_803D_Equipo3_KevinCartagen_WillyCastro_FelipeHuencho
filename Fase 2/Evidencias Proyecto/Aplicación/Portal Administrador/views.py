import json
from datetime import datetime
from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods, require_POST
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib.auth.hashers import make_password
from django.core.mail import send_mail
from django.conf import settings
from django.utils.timezone import localtime

# Importamos desde core (tu modelo actual)
from core.models import (
    User, Payment, Class, Grade,
    Subject, Enrollment, GuardianRelation
)

# =====================================================
#  FUNCIONES AUXILIARES
# =====================================================

def is_admin(user):
    """Permite acceso solo a usuarios con rol admin o finance_admin."""
    return user.is_authenticated and user.role in ["admin", "finance_admin"]

# =====================================================
#  DASHBOARD PRINCIPAL
# =====================================================

@login_required
@user_passes_test(is_admin)
def admin_dashboard(request):
    total_students = User.objects.filter(role="student").count()
    total_teachers = User.objects.filter(role="teacher").count()
    total_guardians = User.objects.filter(role="guardian").count()
    total_payments = Payment.objects.count()

    return render(request, "adminView/admins.html", {  # ✅ ruta corregida
        "usuario": request.user,
        "total_students": total_students,
        "total_teachers": total_teachers,
        "total_guardians": total_guardians,
        "total_payments": total_payments,
    })

# =====================================================
#  USUARIOS Y LISTADOS
# =====================================================

@login_required
@user_passes_test(is_admin)
def users_list(request):
    users = User.objects.all().order_by("role", "first_name")
    return render(request, "adminView/users.html", {"users": users})  # ✅ ruta corregida

# =====================================================
#  PAGOS
# =====================================================

@login_required
@user_passes_test(is_admin)
def payments(request):
    pagos = Payment.objects.all().order_by("-issue_date")
    return render(request, "adminView/payments.html", {"pagos": pagos})  # ✅ ruta corregida


@login_required
@user_passes_test(is_admin)
def api_ver_pagos(request):
    """Agrupa pagos por estado y mes."""
    pagos = Payment.objects.select_related("student").order_by("-issue_date")

    status_map = {
        "pending": "pendientes",
        "paid": "pagados",
        "failed": "fallidos",
        "refunded": "reembolsados",
    }

    buckets = {v: {} for v in status_map.values()}

    for p in pagos:
        estado = status_map.get(p.status, "pendientes")
        dt = localtime(p.issue_date or p.created_at)
        mes = dt.strftime("%B %Y").capitalize()

        buckets[estado].setdefault(mes, []).append({
            "alumno": f"{p.student.first_name} {p.student.last_name}",
            "concepto": p.concept or "—",
            "monto": f"${p.amount:,.0f}".replace(",", "."),
            "fecha": dt.strftime("%d-%m-%Y"),
        })

    return JsonResponse(buckets)

# =====================================================
#  CURSOS Y PROFESORES
# =====================================================

@login_required
@user_passes_test(is_admin)
def ver_cursos(request):
    clases = (
        Class.objects
        .select_related("grade", "teacher")
        .prefetch_related("enrollment_set__student")
        .order_by("year", "grade__curso_nombre")
    )

    cursos_data = []
    for c in clases:
        alumnos = [e.student for e in c.enrollment_set.all() if e.active_status == "active"]
        cursos_data.append({
            "curso": c.grade.curso_nombre,
            "year": c.year,
            "profesor": f"{c.teacher.first_name} {c.teacher.last_name}" if c.teacher else "Sin asignar",
            "alumnos": alumnos,
        })

    return render(request, "adminView/ver_cursos.html", {  # ✅ ruta corregida
        "usuario": request.user,
        "cursos_data": cursos_data
    })


@login_required
@user_passes_test(is_admin)
def api_ver_cursos(request):
    clases = Class.objects.select_related("grade", "teacher").all()
    data = []

    for c in clases:
        alumnos = Enrollment.objects.filter(class_group=c).select_related("student")
        data.append({
            "curso": c.grade.curso_nombre,
            "year": c.year,
            "profesor": f"{c.teacher.first_name} {c.teacher.last_name}" if c.teacher else "Sin profesor asignado",
            "alumnos": [
                {
                    "rut": a.student.rut,
                    "nombre": f"{a.student.first_name} {a.student.last_name}",
                    "correo": a.student.email or "",
                }
                for a in alumnos
            ]
        })

    return JsonResponse({"cursos": data})


@login_required
@user_passes_test(is_admin)
def api_ver_profesores(request):
    try:
        profesores = User.objects.filter(role="teacher")
        data = []

        for prof in profesores:
            clase = Class.objects.filter(teacher=prof).select_related("grade").first()
            curso_jefe = clase.grade.curso_id if clase else "—"
            year = clase.year if clase else "—"
            asignaturas = list(Subject.objects.filter(teacher=prof).values_list("name", flat=True))

            data.append({
                "id": prof.id,
                "first_name": prof.first_name,
                "last_name": prof.last_name,
                "title": prof.title or "",
                "email": prof.email or "",
                "curso_jefe": curso_jefe,
                "year": year,
                "asignaturas": ", ".join(asignaturas) if asignaturas else "—"
            })

        return JsonResponse({"profesores": data})

    except Exception as e:
        print("❌ Error en api_ver_profesores:", str(e))
        return JsonResponse({"error": str(e)}, status=500)

# =====================================================
#  CRUD PROFESORES
# =====================================================

@login_required
@user_passes_test(is_admin)
@require_http_methods(["POST"])
def api_crear_profesor(request):
    try:
        data = json.loads(request.body.decode("utf-8"))

        rut = data.get("rut")
        first_name = data.get("first_name")
        last_name = data.get("last_name")
        email = data.get("email")
        asignatura = data.get("asignatura", "")
        title = data.get("title", "")
        is_head_teacher = str(data.get("is_head_teacher", "")).lower() in ["true", "1"]
        curso_id = data.get("curso_id")
        year = int(data.get("year", 2025))

        if not all([rut, first_name, last_name, email]):
            return JsonResponse({"error": "Faltan campos obligatorios."}, status=400)

        if User.objects.filter(rut=rut).exists():
            return JsonResponse({"error": "Ya existe un profesor con este RUT."}, status=400)
        if User.objects.filter(email=email).exists():
            return JsonResponse({"error": "Ya existe un profesor con este correo."}, status=400)

        profesor = User.objects.create_user(
            rut=rut,
            email=email,
            first_name=first_name,
            last_name=last_name,
            role="teacher",
            title=title,
            password=rut
        )

        clase = None
        if is_head_teacher and curso_id:
            curso = Grade.objects.filter(curso_id=curso_id).first()
            if curso:
                clase, _ = Class.objects.get_or_create(
                    grade=curso,
                    year=year,
                    defaults={"teacher": profesor}
                )
            else:
                return JsonResponse({"error": f"Curso {curso_id} no encontrado."}, status=404)

        if asignatura:
            materias = [m.strip() for m in asignatura.split(",") if m.strip()]
            for nombre in materias:
                Subject.objects.create(
                    name=nombre,
                    class_group=clase or Class.objects.filter(year=year).first(),
                    teacher=profesor
                )

        return JsonResponse({
            "message": "✅ Profesor creado correctamente.",
            "profesor": {
                "id": profesor.id,
                "nombre": f"{profesor.first_name} {profesor.last_name}",
                "email": profesor.email,
                "asignaturas": asignatura,
                "curso_jefe": curso_id if is_head_teacher else "—"
            }
        }, status=201)

    except Exception as e:
        print("⚠️ Error al crear profesor:", e)
        return JsonResponse({"error": str(e)}, status=500)


@login_required
@user_passes_test(is_admin)
@require_http_methods(["PUT"])
def api_actualizar_profesor(request, id):
    try:
        data = json.loads(request.body)
        profesor = User.objects.get(id=id, role="teacher")

        profesor.first_name = data.get("first_name", profesor.first_name)
        profesor.last_name = data.get("last_name", profesor.last_name)
        profesor.email = data.get("email", profesor.email)
        profesor.title = data.get("title", profesor.title)
        profesor.save()

        return JsonResponse({
            "message": "Profesor actualizado correctamente",
            "profesor": {
                "id": profesor.id,
                "first_name": profesor.first_name,
                "last_name": profesor.last_name,
                "title": profesor.title,
                "email": profesor.email,
            }
        })

    except User.DoesNotExist:
        return JsonResponse({"error": "Profesor no encontrado"}, status=404)
    except Exception as e:
        print("❌ Error al actualizar profesor:", e)
        return JsonResponse({"error": str(e)}, status=500)


@login_required
@user_passes_test(is_admin)
@require_http_methods(["DELETE"])
def api_eliminar_profesor(request, id):
    try:
        profesor = User.objects.get(id=id, role="teacher")
        profesor.delete()
        return JsonResponse({"message": "Profesor eliminado correctamente."})
    except User.DoesNotExist:
        return JsonResponse({"error": "Profesor no encontrado."}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

# =====================================================
#  REGISTRO DE ALUMNOS
# =====================================================

@login_required
@user_passes_test(is_admin)
@require_http_methods(["POST"])
def api_registrar_alumno(request):
    """Registrar alumno + apoderado + relación + pago inicial"""
    try:
        data = request.POST or json.loads(request.body.decode("utf-8"))

        rut = data.get("rut")
        nombres = data.get("nombres")
        apellidos = data.get("apellidos")
        fecha_nacimiento = data.get("fecha_nacimiento")
        comuna = data.get("comuna")
        curso_id = data.get("curso")
        estado_alumno = data.get("estado_alumno", "active")

        rut_apoderado = data.get("rut_apoderado")
        nombre_apoderado = data.get("nombre_apoderado")
        email_apoderado = data.get("email_apoderado")
        telefono_apoderado = data.get("telefono_apoderado")

        if not all([rut, nombres, apellidos, rut_apoderado, nombre_apoderado]):
            return JsonResponse({"error": "Faltan campos obligatorios."}, status=400)

        alumno, _ = User.objects.get_or_create(
            rut=rut,
            defaults={
                "first_name": nombres,
                "last_name": apellidos,
                "role": User.STUDENT,
                "birth_date": fecha_nacimiento,
                "comuna": comuna,
                "active_status": estado_alumno,
                "password": make_password(rut),
            },
        )

        apoderado, _ = User.objects.get_or_create(
            rut=rut_apoderado,
            defaults={
                "first_name": nombre_apoderado,
                "email": email_apoderado,
                "phone": telefono_apoderado,
                "role": User.GUARDIAN,
                "password": make_password(rut_apoderado),
            },
        )

        GuardianRelation.objects.get_or_create(guardian=apoderado, student=alumno)

        if curso_id:
            clase = Class.objects.filter(grade__curso_id=curso_id).first()
            if clase:
                Enrollment.objects.get_or_create(student=alumno, class_group=clase)

        Payment.objects.create(
            student=alumno,
            amount=230000,
            concept=f"Matrícula {datetime.now().year}",
            status="pending"
        )

        return JsonResponse({
            "message": "✅ Alumno registrado correctamente. Se generó matrícula de $230.000 pendiente.",
            "alumno": {
                "nombre": f"{alumno.first_name} {alumno.last_name}",
                "rut": alumno.rut,
                "apoderado": apoderado.first_name,
            }
        }, status=201)

    except Exception as e:
        print("❌ Error en registrar alumno:", e)
        return JsonResponse({"error": str(e)}, status=500)

# =====================================================
#  COMUNICADOS
# =====================================================

@login_required
@user_passes_test(is_admin)
@require_POST
def enviar_comunicado(request):
    """Envía correos a distintos grupos: todos, curso, alumno o manual."""
    try:
        asunto = request.POST.get("asunto")
        mensaje = request.POST.get("mensaje")
        destino = request.POST.get("destino")
        curso_id = request.POST.get("curso_id")
        rut = request.POST.get("rut")
        email_manual = request.POST.get("email_manual")

        if settings.DEBUG:
            correos = ["softerpipe@gmail.com"]
        else:
            correos = []

            if destino == "todos":
                correos = list(User.objects.exclude(email="").values_list("email", flat=True))

            elif destino == "curso" and curso_id:
                clases = Class.objects.filter(grade__curso_id=curso_id)
                if clases.exists():
                    alumnos = User.objects.filter(
                        enrollment__class_group__in=clases, role="student"
                    ).values_list("email", flat=True)
                    correos.extend(alumnos)

            elif destino == "alumno" and rut:
                alumno = User.objects.filter(rut=rut, role="student").first()
                if alumno:
                    rel = GuardianRelation.objects.filter(student=alumno).first()
                    if rel and rel.guardian.email:
                        correos.append(rel.guardian.email)
                    if alumno.email:
                        correos.append(alumno.email)

            elif destino == "manual" and email_manual:
                correos.append(email_manual)

        if not correos:
            return JsonResponse({"error": "No se encontraron destinatarios válidos."}, status=400)

        send_mail(
            subject=asunto or "Comunicado Intranet CSAH",
            message=mensaje or "Mensaje vacío.",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=list(correos),
            fail_silently=False,
        )

        return JsonResponse({"message": f"📩 Comunicado enviado correctamente a {len(correos)} destinatario(s)."})

    except Exception as e:
        print("❌ Error al enviar comunicado:", e)
        return JsonResponse({"error": str(e)}, status=500)

# =====================================================
#  APODERADOS
# =====================================================

@login_required
@user_passes_test(is_admin)
def api_listar_apoderados(request):
    try:
        relaciones = GuardianRelation.objects.select_related("guardian", "student").all()
        data = [
            {
                "alumno": f"{rel.student.first_name} {rel.student.last_name}",
                "rut": rel.student.rut,
                "apoderado": rel.guardian.first_name,
                "email": rel.guardian.email,
            }
            for rel in relaciones
        ]
        return JsonResponse(data, safe=False)
    except Exception as e:
        print("❌ Error al listar apoderados:", e)
        return JsonResponse({"error": str(e)}, status=500)



