from django.db import models
from django.conf import settings

class Payment(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pendiente"
        APPROVED = "APPROVED", "Aprobado"
        REJECTED = "REJECTED", "Rechazado"

    student_rut   = models.CharField(max_length=20, db_index=True)
    student_name  = models.CharField(max_length=120)
    course_name   = models.CharField(max_length=60)    # p.ej. "8° Básico A"
    period        = models.CharField(max_length=20)    # p.ej. "2025-09"
    amount_clp    = models.PositiveIntegerField()
    method        = models.CharField(max_length=30)    # "Transferencia", "Webpay", etc.
    evidence_url  = models.URLField(blank=True)        # voucher/drive/s3
    status        = models.CharField(max_length=9, choices=Status.choices, default=Status.PENDING, db_index=True)
    created_at    = models.DateTimeField(auto_now_add=True)
    approved_at   = models.DateTimeField(null=True, blank=True)
    approved_by   = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)

    class Meta:
        permissions = [("can_approve", "Puede aprobar pagos")]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.student_name} {self.period} {self.amount_clp} {self.status}"
