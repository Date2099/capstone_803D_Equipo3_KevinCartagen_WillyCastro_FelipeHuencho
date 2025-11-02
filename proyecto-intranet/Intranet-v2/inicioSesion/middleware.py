from django.shortcuts import redirect
from django.urls import reverse, resolve
from django.conf import settings


class LoginRequiredMiddleware:
    """
    Middleware que fuerza la autenticación en todas las vistas,
    excepto en las rutas explícitamente exentas (como /admin/, /login, /static, etc.)
    """

    def __init__(self, get_response):
        self.get_response = get_response

        # Prefijos exentos: recursos estáticos, panel admin, favicon
        self.exempt_prefixes = (
            "/admin/",        # ✅ Admin de Django (libre totalmente)
            "/static/",
            "/media/",
            "/favicon.ico",
        )

        # Nombres de vistas exentas
        self.exempt_names = {
            "inicioSesion:login",
            "inicioSesion:post_login",
            "inicioSesion:logout",
            "admin:login",
        }

        # Paths calculados desde esos nombres
        self.exempt_paths = set()
        for name in self.exempt_names:
            try:
                self.exempt_paths.add(reverse(name))
            except Exception:
                pass

    def __call__(self, request):
        path = request.path

        # ✅ 1. Permitir completamente el acceso al panel /admin/
        # Incluye sus rutas internas (login, logout, CSS, JS)
        if path.startswith("/admin") or path.startswith("/admin/"):
            return self.get_response(request)

        # ✅ 2. Permitir recursos estáticos y media
        if any(path.startswith(p) for p in ("/static/", "/media/", "/favicon.ico")):
            return self.get_response(request)

        # ✅ 3. Permitir rutas exentas explícitamente (login, logout, etc.)
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

        # ✅ 4. Si el usuario ya está autenticado
        if request.user.is_authenticated:
            try:
                # Si intenta acceder al login estando logueado → redirige según su rol
                if path == reverse("inicioSesion:login"):
                    if request.user.is_superuser or request.user.is_staff:
                        return redirect("/admin/")  # 👉 Redirige al Django Admin real

                    role = getattr(request.user, "role", None)
                    if role == "admin":
                        return redirect(reverse("administrador:admin_dashboard"))
                    if role == "teacher":
                        return redirect(reverse("profesorView:dashboard"))
                    if role == "student":
                        return redirect(reverse("studentView:dashboard"))

                    # Si el rol no coincide con ninguno
                    return redirect("/")
            except Exception:
                return redirect("/")

            # Si está autenticado y no es login, deja pasar
            return self.get_response(request)

        # ❌ 5. Si NO está autenticado → redirigir al login
        try:
            login_url = reverse(settings.LOGIN_URL)  # → 'inicioSesion:login'
        except Exception:
            login_url = "/inicioSesion/"

        if path != login_url:
            return redirect(f"{login_url}?next={request.get_full_path()}")

        return self.get_response(request)