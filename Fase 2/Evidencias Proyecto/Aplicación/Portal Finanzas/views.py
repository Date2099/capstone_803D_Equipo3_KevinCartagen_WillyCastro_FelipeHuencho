from django.shortcuts import render, get_object_or_404, redirect
from django.utils import timezone
from django.contrib.auth.decorators import login_required, user_passes_test
from django.http import JsonResponse
from core.models import UploadedPaymentProof, User, Payment
from django.http import FileResponse, Http404, HttpResponse
from django.conf import settings
import os

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
    comprobantes = UploadedPaymentProof.objects.select_related("student").order_by("-fecha_subida")
    data = []
    for c in comprobantes:
        try:
            file_url = c.comprobante.url      # ej: /media/comprobantes/archivo.png
            file_name = c.comprobante.name    # ej: comprobantes/archivo.png
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
            "archivo": file_url,                # /media/comprobantes/archivo.png
            "archivo_name": c.comprobante.name, # comprobantes/archivo.png ✅
            "fecha_subida": c.fecha_subida.strftime("%d-%m-%Y %H:%M"),
            "fecha_revision": c.fecha_revision.strftime("%d-%m-%Y %H:%M") if c.fecha_revision else "—",
            "revisado_por": str(c.revisado_por) if c.revisado_por else "—",
        })
    return JsonResponse({"comprobantes": data})





@login_required
@user_passes_test(finance_required)
def aprobar_comprobante(request, pk):
    comprobante = get_object_or_404(UploadedPaymentProof, pk=pk)

    # Cambiar estado del comprobante
    comprobante.estado = "validado"
    comprobante.fecha_revision = timezone.now()
    comprobante.revisado_por = request.user
    comprobante.save()

    # ✅ Cambiar estado del pago asociado SI existe
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

    # Cambiar estado del comprobante
    comprobante.estado = "rechazado"
    comprobante.fecha_revision = timezone.now()
    comprobante.revisado_por = request.user
    comprobante.save()

    # ✅ Cambiar estado del pago asociado SI existe
    if comprobante.payment:
        pago = comprobante.payment
        pago.status = "rejected"
        pago.save()

    return JsonResponse({"status": "ok"})


def cuotas_pendientes(request):
    cuotas = Payment.objects.filter(status="pending").select_related("student")
    
    data = [
        {
            "id": p.id,
            "alumno": f"{p.student.first_name} {p.student.last_name}",
            "rut": p.student.rut,
            "concept": p.concept,
            "monto": int(p.amount),
            "fecha_vencimiento": p.due_date.strftime("%d-%m-%Y") if p.due_date else "",
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




