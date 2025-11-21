from django.shortcuts import render, redirect
from django.contrib import messages
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.views.decorators.cache import never_cache
from django.core.cache import cache
import time

from .forms import LoginForm


# ===========================================================
# Función: Redirige dashboard según rol
# ===========================================================
def role_redirect_name(user):
    """Retorna la ruta correspondiente según el rol del usuario."""

    if getattr(user, "role", None) == "admin":
        return "administrador:admin_dashboard"

    if user.is_superuser or user.is_staff:
        return "admin:index"

    if getattr(user, "role", None) == "teacher":
        return "profesorView:dashboard"

    if getattr(user, "role", None) == "student":
        return "studentView:dashboard"
    
    if getattr(user, "role", None) == "finance_admin":
        return "finanzas:dashboard_finanzas"


    return "inicioSesion:login"


# ===========================================================
# Redirección para la ruta raíz "/"
# ===========================================================
def root_redirect(request):
    """Envía al dashboard si está logueado, si no al login."""
    if request.user.is_authenticated:
        return redirect(role_redirect_name(request.user))
    return redirect("inicioSesion:login")


# ===========================================================
# Login con bloqueo de intentos + no-cache
# ===========================================================
@never_cache
def login_view(request):
    """Vista de login con:
        - Prevención de navegación con 'atrás'
        - Bloqueo tras múltiples intentos fallidos
        - Cookie para persistir estado de bloqueo tras F5/cerrar página
    """

    # Si ya está logeado, evita mostrar login
    if request.user.is_authenticated:
        return redirect(role_redirect_name(request.user))

    # Seguridad: límites
    LOCK_TIME = 480    # 8 minutos 
    MAX_ATTEMPTS = 5

    # Detectar RUT ingresado o último usado en cookie
    rut_input = (request.POST.get("rut") or request.COOKIES.get("last_rut") or "").strip()
    cache_key = f"login_attempts_{rut_input}" if rut_input else None

    attempts = 0
    elapsed = 0

    if cache_key:
        data = cache.get(cache_key, {"count": 0, "time": time.time()})
        attempts = data["count"]
        elapsed = time.time() - data["time"]

    locked = attempts >= MAX_ATTEMPTS and elapsed < LOCK_TIME
    remaining_seconds = max(0, LOCK_TIME - int(elapsed)) if locked else 0

    # =========================
    # Procesamiento POST
    # =========================
    if request.method == "POST":
        form = LoginForm(request.POST)

        if form.is_valid():
            rut = form.cleaned_data["rut"]
            password = form.cleaned_data["password"]
            remember = form.cleaned_data["remember"]

            cache_key = f"login_attempts_{rut}"
            data = cache.get(cache_key, {"count": 0, "time": time.time()})
            attempts = data["count"]
            elapsed = time.time() - data["time"]
            locked = attempts >= MAX_ATTEMPTS and elapsed < LOCK_TIME

            # Si está bloqueado → impedir login
            if locked:
                messages.error(request, "Demasiados intentos fallidos. Espera unos minutos.")
            else:
                # Reiniciar bloque si ya pasó el tiempo
                if attempts >= MAX_ATTEMPTS and elapsed >= LOCK_TIME:
                    attempts = 0

                # Validación usuario
                user = authenticate(request, username=rut, password=password)

                if user:
                    # Iniciar sesión
                    login(request, user)
                    request.session.set_expiry(60*60*24*14 if remember else 0)  # 14 días vs hasta cerrar navegador
                    cache.delete(cache_key)

                    # Limpiar cookie RUT
                    response = redirect(role_redirect_name(user))
                    response.delete_cookie("last_rut")
                    return response

                # Incrementar intento fallido
                attempts += 1
                cache.set(cache_key, {"count": attempts, "time": time.time()}, LOCK_TIME)

                if attempts >= MAX_ATTEMPTS:
                    messages.error(request, "Has superado los intentos. Espera unos minutos.")
                else:
                    messages.error(request, f"Credenciales incorrectas. Intento {attempts}/{MAX_ATTEMPTS}")

            locked = attempts >= MAX_ATTEMPTS
            remaining_seconds = max(0, LOCK_TIME - int(elapsed))

    else:
        form = LoginForm()

    # =========================
    # Render del login
    # =========================
    response = render(request, "inicioSesion/login.html", {
        "form": form,
        "lockout": locked,
        "remaining_seconds": remaining_seconds,
    })

    # Guardar cookie para mantener bloqueo entre recargas
    if rut_input:
        response.set_cookie("last_rut", rut_input, max_age=600, samesite="Strict")

    # Evitar caché del navegador
    response["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response["Pragma"] = "no-cache"
    response["Expires"] = "0"

    return response


# ===========================================================
# Logout
# ===========================================================
@login_required
def logout_view(request):
    """Cerrar sesión limpiamente y mostrar mensaje."""
    logout(request)
    messages.info(request, "Sesión cerrada correctamente.")
    return redirect("inicioSesion:login")


# Sólo para compatibilidad / redirecciones internas
@login_required
def post_login(request):
    return redirect(role_redirect_name(request.user))


@login_required
def dashboard(request):
    return render(request, "studentView/dashboard.html")
