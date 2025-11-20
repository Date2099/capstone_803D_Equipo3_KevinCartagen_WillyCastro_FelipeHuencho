import json
from datetime import datetime, time
from django.utils.timezone import make_aware
from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods, require_POST
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib.auth.hashers import make_password
from django.core.mail import send_mail
from django.conf import settings
from django.utils.timezone import localtime


from core.models import (
    User, Payment, Class, Grade,
    Subject, Enrollment, GuardianRelation
)

#FUNCIONES AUXILIARES
def is_admin(user):
    return user.is_authenticated and user.role in ["admin", "finance_admin"]


#DASHBOARD PRINCIPAL

@login_required
@user_passes_test(is_admin)
def admin_dashboard(request):
    total_students = User.objects.filter(role="student").count()
    total_teachers = User.objects.filter(role="teacher").count()
    total_guardians = User.objects.filter(role="guardian").count()
    total_payments = Payment.objects.count()

    return render(request, "adminView/admins.html", {  
        "usuario": request.user,
        "total_students": total_students,
        "total_teachers": total_teachers,
        "total_guardians": total_guardians,
        "total_payments": total_payments,
    })


#  USUARIOS Y LISTADOS

@login_required
@user_passes_test(is_admin)
def users_list(request):
    users = User.objects.all().order_by("role", "first_name")
    return render(request, "adminView/users.html", {"users": users})  

#  PAGOS
@login_required
@user_passes_test(is_admin)
def payments(request):
    pagos = Payment.objects.all().order_by("-issue_date")
    return render(request, "adminView/payments.html", {"pagos": pagos})  


from datetime import datetime, time
from django.utils.timezone import localtime, make_aware

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
        #Resolver estado
        estado = status_map.get(p.status, "pendientes")

        #Obtener fecha base
        fecha = p.issue_date or p.created_at

        #Convertir fecha a datetime seguro
        if isinstance(fecha, datetime):
            dt = localtime(fecha)
        else:
            # Es un date → convertir a datetime (08:00)
            fecha_dt = make_aware(datetime.combine(fecha, time(8, 0)))
            dt = localtime(fecha_dt)

        # Agrupación por mes
        mes = dt.strftime("%B %Y").capitalize()

        # Guardar registro
        buckets[estado].setdefault(mes, []).append({
            "alumno": f"{p.student.first_name} {p.student.last_name}",
            "concepto": p.concept or "—",
            "monto": f"${p.amount:,.0f}".replace(",", "."),
            "fecha": dt.strftime("%d-%m-%Y"),
        })

    return JsonResponse(buckets)



#CURSOS Y PROFESORES

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

    return render(request, "adminView/ver_cursos.html", {  
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
        profesores = User.objects.filter(role="teacher").prefetch_related("subject_set")
        data = []

        for prof in profesores:

            #  Curso Jefe
            clase = Class.objects.filter(teacher=prof).select_related("grade").first()
            curso_jefe = clase.grade.curso_id if clase else "—"
            year = clase.year if clase else "—"

            # Asignaturas únicas
            asignaturas_query = prof.subject_set.values_list("name", flat=True)
            asignaturas_unicas = list(dict.fromkeys(asignaturas_query))
            asignaturas_str = ", ".join(asignaturas_unicas) if asignaturas_unicas else "—"

            data.append({
                "id": prof.id,
                "first_name": prof.first_name,
                "last_name": prof.last_name,
                "email": prof.email or "",
                "telefono": prof.phone or "—",     
                "curso_jefe": curso_jefe,
                "year": year,
                "asignaturas": asignaturas_str,
            })

        return JsonResponse({"profesores": data})

    except Exception as e:
        print("❌ Error en api_ver_profesores:", str(e))
        return JsonResponse({"error": str(e)}, status=500)



#  CRUD PROFESORES

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

#REGISTRO DE ALUMNOS
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

#COMUNICADOS
@login_required
@user_passes_test(is_admin)
@require_POST
def api_enviar_comunicado(request):
    """
    API para enviar comunicados por correo.
    Recibe: asunto, mensaje, destino (todos/curso/alumno/manual)
    """
    asunto = request.POST.get("asunto", "").strip()
    mensaje = request.POST.get("mensaje", "").strip()
    destino = request.POST.get("destino", "todos")

    if not asunto or not mensaje:
        return JsonResponse({"error": "Asunto y mensaje son obligatorios."}, status=400)

    try:
        destinatarios = []


        if destino == "manual":
            email_manual = request.POST.get("email_manual", "").strip()
            if not email_manual:
                return JsonResponse({"error": "Debes indicar un correo destino."}, status=400)
            destinatarios.append(email_manual)

        else:

            if settings.EMAIL_HOST_USER:
                destinatarios.append(settings.EMAIL_HOST_USER)
            else:

                return JsonResponse(
                    {"error": "No hay correo remitente configurado en el servidor."},
                    status=500
                )

        send_mail(
            subject=asunto,
            message=mensaje,
            from_email=settings.DEFAULT_FROM_EMAIL or settings.EMAIL_HOST_USER,
            recipient_list=destinatarios,
            fail_silently=False,
        )

        return JsonResponse({"message": "Comunicado enviado correctamente."})

    except Exception as e:
        # Para debug:
        print("Error al enviar comunicado:", e)
        return JsonResponse({"error": "Error interno al enviar el comunicado."}, status=500)
    
    
@login_required
@user_passes_test(is_admin)
def api_listar_usuarios(request):
    try:
        usuarios = User.objects.all().order_by("role", "first_name")

        data = []
        for u in usuarios:
            data.append({
                "id": u.id,
                "nombre": f"{u.first_name} {u.last_name}",
                "rut": u.rut,
                "email": u.email or "—",
                "telefono": u.phone or "—",
                "rol": u.get_role_display() if hasattr(u, "get_role_display") else u.role,
            })

        return JsonResponse({"usuarios": data})

    except Exception as e:
        print("❌ Error al listar usuarios:", e)
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



# asignaturas 
@login_required
@user_passes_test(is_admin)
def api_listar_asignaturas(request):
    # 1) Traemos todas las asignaturas, EXCEPTO "Almuerzo"
    asignaturas = (
        Subject.objects
        .exclude(name__icontains="almuerzo")
        .select_related("class_group", "class_group__grade", "teacher")
        .all()
    )

    data = []

    for a in asignaturas:
        curso = a.class_group.grade.curso_nombre if a.class_group and a.class_group.grade else "—"
        year = a.class_group.year if a.class_group else "—"

        profesor = (
            f"{a.teacher.first_name} {a.teacher.last_name}"
            if a.teacher else None
        )

        data.append({
            "name": a.name or "—",
            "curso": curso,
            "year": year,
            "teacher": profesor or "—",
            "has_teacher": profesor is not None,  
        })

    # 2) Ordenar: primero con profesor, luego sin profesor, y por nombre
    data.sort(key=lambda x: (not x["has_teacher"], x["name"]))

    # 3) No enviamos has_teacher al front (no lo necesita)
    for item in data:
        item.pop("has_teacher", None)

    return JsonResponse({"asignaturas": data})




#profesores
from core.models import Subject, SubjectSchedule  

@login_required
@user_passes_test(is_admin)
def api_listar_horarios(request):
    """
    Devuelve los horarios agrupados por profesor.
    """
    day_names = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]

    schedules = (
        SubjectSchedule.objects
        .select_related("subject", "subject__teacher", "subject__class_group")
        .all()
        .order_by("day_of_week", "start_time")
    )

    profesores = {}  
    for sch in schedules:
        subject = sch.subject
        teacher = subject.teacher
        if not teacher:
            continue 

        prof_id = teacher.id
        if prof_id not in profesores:
            profesores[prof_id] = {
                "profesor": f"{teacher.first_name} {teacher.last_name}",
                "horarios": []
            }

        profesores[prof_id]["horarios"].append({
            "dia": day_names[sch.day_of_week] if sch.day_of_week < len(day_names) else sch.day_of_week,
            "inicio": sch.start_time.strftime("%H:%M"),
            "termino": sch.end_time.strftime("%H:%M"),
            "asignatura": subject.name,
            "curso": getattr(subject.class_group.grade, "curso_nombre", "") if getattr(subject, "class_group", None) and getattr(subject.class_group, "grade", None) else "",
        })

    return JsonResponse({"profesores": list(profesores.values())})

@login_required
def api_dashboard_stats(request):
    stats = {
        "total_students": User.objects.filter(role="student").count(),
        "total_teachers": User.objects.filter(role="teacher").count(),
        "total_guardians": User.objects.filter(role="guardian").count(),
        "total_admins": User.objects.filter(role__in=["admin", "finance_admin"]).count(),
        "pagos_pendientes": Payment.objects.filter(status="pending").count(),
        "pagos_pagados": Payment.objects.filter(status="paid").count(),
        "pagos_fallidos": Payment.objects.filter(status="failed").count(),
    }
    return JsonResponse(stats)
