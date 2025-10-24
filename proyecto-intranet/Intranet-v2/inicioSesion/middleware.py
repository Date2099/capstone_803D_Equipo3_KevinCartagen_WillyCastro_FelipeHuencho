from django.shortcuts import redirect
from django.urls import reverse, resolve
from django.conf import settings

class LoginRequiredMiddleware:
    """
    Middleware que fuerza la autenticación en todas las vistas,
    excepto en las rutas explícitamente exentas.
    """

    def __init__(self, get_response):
        self.get_response = get_response

        # Prefijos que no requieren autenticación (archivos estáticos, admin, etc.)
        self.exempt_prefixes = (
            "/admin/",
            "/static/",
            "/media/",
            "/favicon.ico",
        )

        # Nombres de vistas exentas (namespace:view_name)
        self.exempt_names = {
            "inicioSesion:login",        # 👈 cambiado
            "inicioSesion:post_login",   # 👈 cambiado
            "inicioSesion:logout",       # 👈 opcional, según tu urls.py
            "admin:login",
        }

        # Construye los paths de esas vistas usando reverse()
        self.exempt_paths = set()
        for name in self.exempt_names:
            try:
                self.exempt_paths.add(reverse(name))
            except Exception:
                pass

    def __call__(self, request):
        path = request.path

        # ✅ Permitir recursos estáticos y admin
        if any(path.startswith(p) for p in self.exempt_prefixes):
            return self.get_response(request)

        # ✅ Permitir rutas exentas (por nombre o path)
        if path in self.exempt_paths:
            return self.get_response(request)

        try:
            resolved = resolve(path)
            urlname = (
                f"{resolved.namespace}:{resolved.url_name}"
                if resolved.namespace else resolved.url_name
            )
        except Exception:
            urlname = None

        if urlname in self.exempt_names:
            return self.get_response(request)

        # ================================
        # ✅ Si el usuario ya está logueado
        # ================================
        if request.user.is_authenticated:
            try:
                # Si intenta acceder al login estando logueado → redirige a su dashboard
                if path == reverse("inicioSesion:login"):
                    if request.user.is_superuser or request.user.is_staff:
                        return redirect("/admin/")
                    if getattr(request.user, "role", None) == "admin":
                        return redirect(reverse("administrador:admin_dashboard"))
                    if getattr(request.user, "role", None) == "teacher":
                        return redirect(reverse("profesorView:dashboard"))
                    if getattr(request.user, "role", None) == "student":
                        return redirect(reverse("studentView:dashboard"))
                    # Si el rol no coincide con ninguno
                    return redirect("/")
            except Exception:
                return redirect("/")

            return self.get_response(request)

        # ================================
        # ❌ Si NO está autenticado
        # ================================
        try:
            login_url = reverse(settings.LOGIN_URL)  # → 'inicioSesion:login'
        except Exception:
            login_url = "/inicioSesion/"

        if path != login_url:
            return redirect(f"{login_url}?next={request.get_full_path()}")

        return self.get_response(request)