from django.shortcuts import redirect
from django.urls import reverse, resolve
from django.conf import settings


class LoginRequiredMiddleware:
    """
<<<<<<< HEAD
    Middleware que fuerza la autenticación en todas las vistas,
    excepto en las rutas explícitamente exentas (como /admin/, /login, /static, etc.)
=======
    Middleware proteje a la pagina.
    
    Funciones principales:
    - Obliga a autenticarse para acceder a cualquier vista protegida.
    - Permite acceso libre a rutas específicas (login, logout, admin, estáticos, etc.).
    - Impide volver a páginas autenticadas usando el botón "Atrás" del navegador
      mediante cabeceras anti-cache.
>>>>>>> feature/inicio-sesion
    """

    def __init__(self, get_response):
        self.get_response = get_response

<<<<<<< HEAD
        # Prefijos exentos: recursos estáticos, panel admin, favicon
=======
        # Rutas que pueden ser accedidas sin autenticación por prefijo
>>>>>>> feature/inicio-sesion
        self.exempt_prefixes = (
            "/admin/",        # ✅ Admin de Django (libre totalmente)
            "/static/",
            "/media/",
            "/favicon.ico",
        )

<<<<<<< HEAD
        # Nombres de vistas exentas
=======
>>>>>>> feature/inicio-sesion
        self.exempt_names = {
            "inicioSesion:login",
            "inicioSesion:post_login",
            "inicioSesion:logout",
<<<<<<< HEAD
            "admin:login",
        }

        # Paths calculados desde esos nombres
=======
            "inicioSesion:diag_login",  # ruta de testeo
            "admin:login",
        }

>>>>>>> feature/inicio-sesion
        self.exempt_paths = set()
        for name in self.exempt_names:
            try:
                self.exempt_paths.add(reverse(name))
            except Exception:
                pass

    def _no_cache(self, response):
        """
        Fuerza al navegador a no guardar caché para evitar volver
        a páginas privadas con el botón Atrás.
        """
        response["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response["Pragma"] = "no-cache"
        response["Expires"] = "0"
        return response

    def __call__(self, request):
        path = request.path

<<<<<<< HEAD
        # ✅ 1. Permitir completamente el acceso al panel /admin/
        # Incluye sus rutas internas (login, logout, CSS, JS)
        if path.startswith("/admin") or path.startswith("/admin/"):
            return self.get_response(request)

        # ✅ 2. Permitir recursos estáticos y media
        if any(path.startswith(p) for p in ("/static/", "/media/", "/favicon.ico")):
            return self.get_response(request)

        # ✅ 3. Permitir rutas exentas explícitamente (login, logout, etc.)
=======
        # 1) Acceso libre al panel admin
        if path.startswith("/admin"):
            response = self.get_response(request)
            return self._no_cache(response)

        # 2) Acceso libre a archivos estáticos / media
        if any(path.startswith(p) for p in self.exempt_prefixes):
            return self.get_response(request)

        # 3) Acceso libre a rutas explícitamente exentas
>>>>>>> feature/inicio-sesion
        if path in self.exempt_paths:
            response = self.get_response(request)
            return self._no_cache(response)

        # 4) Detectar vista por nombre 
        try:
            resolved = resolve(path)
            urlname = (
                f"{resolved.namespace}:{resolved.url_name}"
                if resolved.namespace else resolved.url_name
            )
        except Exception:
            urlname = None

        if urlname in self.exempt_names:
            response = self.get_response(request)
            return self._no_cache(response)

<<<<<<< HEAD
        # ✅ 4. Si el usuario ya está autenticado
=======
        # 5) Usuario autenticado
>>>>>>> feature/inicio-sesion
        if request.user.is_authenticated:

            # Si intenta acceder al login estando logueado -> redirigir a dashboard según rol
            try:
<<<<<<< HEAD
                # Si intenta acceder al login estando logueado → redirige según su rol
=======
>>>>>>> feature/inicio-sesion
                if path == reverse("inicioSesion:login"):
                    # Si es staff/superuser usar admin nativo
                    if request.user.is_superuser or request.user.is_staff:
<<<<<<< HEAD
                        return redirect("/admin/")  # 👉 Redirige al Django Admin real
=======
                        return redirect("/admin/")
>>>>>>> feature/inicio-sesion

                    role = getattr(request.user, "role", None)
                    if role == "admin":
                        return redirect(reverse("administrador:admin_dashboard"))
                    if role == "teacher":
                        return redirect(reverse("profesorView:dashboard"))
                    if role == "student":
                        return redirect(reverse("studentView:dashboard"))
<<<<<<< HEAD

                    # Si el rol no coincide con ninguno
=======
                    if role == "finance_admin":
                        return redirect("/finanzas/")


>>>>>>> feature/inicio-sesion
                    return redirect("/")
            except Exception:
                return redirect("/")

<<<<<<< HEAD
            # Si está autenticado y no es login, deja pasar
            return self.get_response(request)

        # ❌ 5. Si NO está autenticado → redirigir al login
=======
            # Si está autenticado y no es login -> permitir y evitar caché
            response = self.get_response(request)
            return self._no_cache(response)

        # 6) Usuario NO autenticado → mandar a login
>>>>>>> feature/inicio-sesion
        try:
            login_url = reverse(settings.LOGIN_URL)
        except Exception:
            login_url = "/inicioSesion/login/"

        # Guardar "next" para redirigir después del login
        if path != login_url:
            return redirect(f"{login_url}?next={request.get_full_path()}")

<<<<<<< HEAD
        return self.get_response(request)
=======
        # 7) Página de login también sin caché
        response = self.get_response(request)
        return self._no_cache(response)
>>>>>>> feature/inicio-sesion
