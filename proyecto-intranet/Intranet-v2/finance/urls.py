from django.urls import path
from django.views.generic import TemplateView

urlpatterns = [
    path("finanzas/", TemplateView.as_view(template_name="finance/finanzas.html"), name="finanzas"),
]
