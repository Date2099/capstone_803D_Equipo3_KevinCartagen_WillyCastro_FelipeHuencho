from django.shortcuts import render, get_object_or_404, redirect
from django.utils import timezone
from django.contrib.auth.decorators import login_required, user_passes_test
from django.http import JsonResponse
from core.models import UploadedPaymentProof, User, Payment
from django.http import FileResponse, Http404, HttpResponse
from django.conf import settings
import os
from django.db.models.functions import ExtractMonth
from django.db.models import Count
import calendar

def finance_required(user):
    return user.is_authenticated and user.role == User.FINANCE_ADMIN


@login_required
@user_passes_test(finance_required)
def dashboard_finanzas(request):
    # Esta vista solo carga Finanzas.html
    return render(request, "finanzas/Finanzas.html")


@login_required
@user_passes_test(finance_required)
def api_comprobantes(request):
    comprobantes = (
        UploadedPaymentProof.objects
        .select_related("student")
        .order_by("-fecha_subida")
    )

    data = []
    for c in comprobantes:

        # ✅ Obtener curso del estudiante
        enrollment = c.student.enrollment_set.select_related(
            "class_group__grade"
        ).first()
        curso_nombre = enrollment.class_group.grade.curso_nombre if enrollment else ""

        try:
            file_url = c.comprobante.url
            file_name = c.comprobante.name
        except Exception:
            file_url = ""
            file_name = ""

        data.append({
            "id": c.id,
            "rut": c.student.rut,
            "alumno": f"{c.student.first_name} {c.student.last_name}",
            "mes": c.mes,
            "monto": float(c.monto),
            "estado": c.estado,

            # ✅ Curso agregado
            "curso": curso_nombre,

            "archivo": file_url,
            "archivo_name": file_name,
            "fecha_subida": c.fecha_subida.strftime("%d-%m-%Y %H:%M"),
            "fecha_revision": c.fecha_revision.strftime("%d-%m-%Y %H:%M") if c.fecha_revision else "—",
            "revisado_por": str(c.revisado_por) if c.revisado_por else "—",
        })

    return JsonResponse({"comprobantes": data})






@login_required
@user_passes_test(finance_required)
def aprobar_comprobante(request, pk):
    comprobante = get_object_or_404(UploadedPaymentProof, pk=pk)

    comentario = request.POST.get("comentario", "").strip()

    comprobante.estado = "validado"
    comprobante.comentario_finanzas = comentario or "Pago aprobado"
    comprobante.fecha_revision = timezone.now()
    comprobante.revisado_por = request.user
    comprobante.save()

    if comprobante.payment:
        pago = comprobante.payment
        pago.status = "paid"
        pago.paid_at = timezone.now()
        pago.save()

    return JsonResponse({"status": "ok"})

    


@login_required
@user_passes_test(finance_required)
def rechazar_comprobante(request, pk):
    comprobante = get_object_or_404(UploadedPaymentProof, pk=pk)

    comentario = request.POST.get("comentario", "").strip()
    if not comentario:
        return JsonResponse({"error": "Debe ingresar un motivo"}, status=400)

    comprobante.estado = "rechazado"
    comprobante.comentario_finanzas = comentario
    comprobante.fecha_revision = timezone.now()
    comprobante.revisado_por = request.user
    comprobante.save()

    if comprobante.payment:
        pago = comprobante.payment
        pago.status = "rejected"
        pago.save()

    return JsonResponse({"status": "ok"})



def cuotas_pendientes(request):
    cuotas = Payment.objects.filter(
        status__in=["pending", "rejected"]
    ).select_related("student")
    
    data = [
        {
            "id": p.id,
            "alumno": f"{p.student.first_name} {p.student.last_name}",
            "rut": p.student.rut,
            "concept": p.concept,
            "monto": int(p.amount),
            "fecha_vencimiento": p.due_date.strftime("%d-%m-%Y") if p.due_date else "",
            "status": p.status,   
        }
        for p in cuotas
    ]

    return JsonResponse({"cuotas": data})


@login_required
def ver_comprobante(request, pk):
    file_obj = get_object_or_404(UploadedPaymentProof, pk=pk)

    # Solo finanzas o el dueño
    if request.user.role != User.FINANCE_ADMIN and file_obj.student != request.user:
        return HttpResponse("No autorizado", status=403)

    file_path = file_obj.comprobante.path  # Django lo resuelve bien

    if not os.path.exists(file_path):
        raise Http404("Archivo no encontrado en disco")

    return FileResponse(open(file_path, "rb"))




@login_required
@user_passes_test(finance_required)
def revertir_comprobante(request, pk):
    comprobante = get_object_or_404(UploadedPaymentProof, pk=pk)

    # Volver a estado pendiente
    comprobante.estado = "pendiente"
    comprobante.fecha_revision = None
    comprobante.revisado_por = None
    comprobante.save()

    # Si tiene cuota asociada, resetearla a pendiente también
    if comprobante.payment:
        pago = comprobante.payment
        pago.status = "pending"
        pago.paid_at = None
        pago.save()

    return JsonResponse({"status": "ok"})



from django.db.models.functions import ExtractMonth
from django.db.models import Count



@login_required
@user_passes_test(finance_required)
def api_pagos_por_mes(request):
    # Pagos realmente pagados (flujo real)
    pagos = (
        Payment.objects
        .filter(status="paid", paid_at__isnull=False)
        .annotate(month=ExtractMonth("paid_at"))
        .values("month")
        .annotate(total=Count("id"))
        .order_by("month")
    )

    # Inicializar todos los meses
    labels = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]
    data = [0] * 12

    for item in pagos:
        if item["month"]:
            data[item["month"] - 1] = item["total"]

    return JsonResponse({
        "labels": labels,
        "data": data
    })



from django.db.models import Count
import calendar

@login_required
@user_passes_test(finance_required)
def api_estadisticas_mensuales(request):
    # Pagos aprobados por mes
    pagos_aprobados = (
        UploadedPaymentProof.objects.filter(estado="validado")
        .values_list("fecha_revision", flat=True)
    )

    # Pagos rechazados por mes
    pagos_rechazados = (
        UploadedPaymentProof.objects.filter(estado="rechazado")
        .values_list("fecha_revision", flat=True)
    )

    # Inicializar meses
    labels = [calendar.month_abbr[i].capitalize() for i in range(1, 13)]
    aprobados = [0] * 12
    rechazados = [0] * 12

    # Contar aprobados por mes
    for fecha in pagos_aprobados:
        if fecha:
            aprobados[fecha.month - 1] += 1

    # Contar rechazados por mes
    for fecha in pagos_rechazados:
        if fecha:
            rechazados[fecha.month - 1] += 1

    # Línea acumulada
    acumulado = []
    total = 0
    for val in aprobados:
        total += val
        acumulado.append(total)

    return JsonResponse({
        "labels": labels,
        "aprobados": aprobados,
        "rechazados": rechazados,
        "acumulado": acumulado,
    })

from django.db.models.functions import ExtractMonth
from django.db.models import Count, Q

@login_required
@user_passes_test(finance_required)
def api_comprobantes_por_mes(request):
    proofs = UploadedPaymentProof.objects.annotate(
        subido_mes=ExtractMonth("fecha_subida")
    )

    labels = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]
    subidos = [0] * 12
    correspondientes = [0] * 12
    atrasados = [0] * 12

    for p in proofs:
        if p.subido_mes:
            mes_pago = int(p.mes) if p.mes.isdigit() else None
            m = p.subido_mes - 1

            subidos[m] += 1

            if mes_pago == p.subido_mes:
                correspondientes[m] += 1
            elif mes_pago and mes_pago < p.subido_mes:
                atrasados[m] += 1

    return JsonResponse({
        "labels": labels,
        "subidos": subidos,
        "correspondientes": correspondientes,
        "atrasados": atrasados,
    })


#agregar cuotas a los alumnos
