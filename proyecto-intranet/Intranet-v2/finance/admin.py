from django.contrib import admin
from .models import Payment
@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("created_at","student_name","course_name","period","amount_clp","status","approved_by")
    list_filter  = ("status","period","course_name")
    search_fields= ("student_name","student_rut")
