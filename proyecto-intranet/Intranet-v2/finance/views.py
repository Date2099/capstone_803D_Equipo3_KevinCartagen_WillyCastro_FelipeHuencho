from django.contrib.auth.decorators import login_required, permission_required
from django.utils import timezone
from django.http import JsonResponse, HttpResponseForbidden
from django.shortcuts import get_object_or_404, render
from django.views.generic import ListView, DetailView
from .models import Payment

class PaymentListView(ListView):
    model = Payment
    template_name = "finance/payments_list.html"
    context_object_name = "payments"

    def get_queryset(self):
        q = Payment.objects.all()
        status = self.request.GET.get("status")
        if status in {"PENDING","APPROVED","REJECTED"}:
            q = q.filter(status=status)
        return q[:500]

class PaymentDetailView(DetailView):
    model = Payment
    template_name = "finance/payment_detail.html"
    context_object_name = "p"

@login_required
@permission_required("finance.can_approve", raise_exception=True)
def approve_payment(request, pk):
    if request.method != "POST":
        return HttpResponseForbidden()
    p = get_object_or_404(Payment, pk=pk)
    p.status = Payment.Status.APPROVED
    p.approved_at = timezone.now()
    p.approved_by = request.user
    p.save(update_fields=["status","approved_at","approved_by"])
    return JsonResponse({"ok": True, "status": p.status, "approved_at": p.approved_at.isoformat()})

@login_required
@permission_required("finance.can_approve", raise_exception=True)
def reject_payment(request, pk):
    if request.method != "POST":
        return HttpResponseForbidden()
    p = get_object_or_404(Payment, pk=pk)
    p.status = Payment.Status.REJECTED
    p.approved_at = None
    p.approved_by = None
    p.save(update_fields=["status","approved_at","approved_by"])
    return JsonResponse({"ok": True, "status": p.status})
