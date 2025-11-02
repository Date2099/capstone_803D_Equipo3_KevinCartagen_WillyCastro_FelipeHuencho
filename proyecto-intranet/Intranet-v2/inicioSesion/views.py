from django.shortcuts import render, redirect
from django.contrib import messages
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from .forms import LoginForm


def role_redirect_name(user):
    # ✅ PRIORIDAD: tu admin custom
    if getattr(user, "role", None) == "admin":
        return "administrador:admin_dashboard"

    # Luego, si quieres permitir el admin nativo:
    if user.is_superuser or user.is_staff:
        return "admin:index"

    if getattr(user, "role", None) == "teacher":
        return "teacher:dashboard"
    if getattr(user, "role", None) == "student":
        return "studentView:dashboard"
    return "inicioSesion:login"  # 👈 fallback al login


def login_view(request):
    if request.user.is_authenticated:
        return redirect(role_redirect_name(request.user))  # ✅ usa la función

    if request.method == "POST":
        form = LoginForm(request.POST)
        if form.is_valid():
            rut = form.cleaned_data["rut"]
            password = form.cleaned_data["password"]
            remember = form.cleaned_data["remember"]

            user = authenticate(request, username=rut, password=password)
            if user:
                login(request, user)
                if remember:
                    request.session.set_expiry(60 * 60 * 24 * 14)
                else:
                    request.session.set_expiry(0)
                return redirect(role_redirect_name(user))  # ✅ redirección según rol

            else:
                messages.error(request, "RUT o contraseña incorrectos.")
                form.cleaned_data["password"] = ""
    else:
        form = LoginForm()

    return render(request, "inicioSesion/login.html", {"form": form})


@login_required
def post_login(request):
    return redirect(role_redirect_name(request.user))


@login_required
def logout_view(request):
    logout(request)
    messages.info(request, "Sesión cerrada correctamente.")
    return redirect("inicioSesion:login")


@login_required
def dashboard(request):
    return render(request, "studentView/dashboard.html")