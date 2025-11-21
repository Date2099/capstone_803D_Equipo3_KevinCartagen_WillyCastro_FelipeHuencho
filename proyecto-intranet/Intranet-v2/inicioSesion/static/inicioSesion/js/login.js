document.addEventListener('DOMContentLoaded', function() {
  const togglePassword = document.querySelector('#toggle-password');
  const passwordInput = document.querySelector('#id_password');

  if (togglePassword && passwordInput) {
    // Aseguramos que el cursor se vea como manito
    togglePassword.style.cursor = 'pointer';

    togglePassword.addEventListener('click', function() {
      // 1. Alternar el tipo de input
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);

      // 2. Cambiar el ícono SVG
      const svg = togglePassword.querySelector('svg');
      
      if (type === 'text') {
        // MODO VISIBLE -> Poner ícono "Ojo Tachado"
        svg.innerHTML = `
          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
          <line x1="2" x2="22" y1="2" y2="22"/>
        `;
        svg.setAttribute('viewBox', '0 0 24 24');
      } else {
        // MODO OCULTO -> Poner ícono "Ojo Normal" (Tu SVG original)
        svg.innerHTML = `
          <path d="M2.062 12.348a1 1 0 0 1 0-.696 
                   10.75 10.75 0 0 1 19.876 0 
                   1 1 0 0 1 0 .696 
                   10.75 10.75 0 0 1-19.876 0"/>
          <circle cx="12" cy="12" r="3"/>
        `;
      }
    });
  }
});
/* ========== 2) MODAL "¿OLVIDASTE TU CONTRASEÑA?" ========== */
const forgotLink = document.getElementById("forgot-link");
const forgotModal = document.getElementById("forgot-modal");

function getCSRFToken() {
  const name = "csrftoken";
  const cookies = document.cookie ? document.cookie.split(";") : [];
  for (let c of cookies) {
    c = c.trim();
    if (c.startsWith(name + "=")) {
      return decodeURIComponent(c.substring(name.length + 1));
    }
  }
  return "";
}

if (forgotLink && forgotModal) {
  const steps = {
    rut: forgotModal.querySelector(".step-rut"),
    email: forgotModal.querySelector(".step-email"),
  };
  const correoOcultoSpan = forgotModal.querySelector("#correo-oculto");

  function showStep(name) {
    Object.values(steps).forEach(s => s && (s.style.display = "none"));
    if (steps[name]) steps[name].style.display = "block";
    forgotModal.querySelectorAll(".estado").forEach(e => e.textContent = "");
  }

  function resetForgotModal() {
    const rutAlumnoInput = forgotModal.querySelector("#rut-alumno");
    const rutApoderadoInput = forgotModal.querySelector("#rut-apoderado");
    const correoApoderadoInput = forgotModal.querySelector("#correo-apoderado");
    if (rutAlumnoInput) rutAlumnoInput.value = "";
    if (rutApoderadoInput) rutApoderadoInput.value = "";
    if (correoApoderadoInput) correoApoderadoInput.value = "";
    showStep("rut");
  }

  function openForgot() {
    forgotModal.classList.add("show");
    resetForgotModal();
  }

  function closeForgot() {
    forgotModal.classList.remove("show");
    resetForgotModal();
  }

  // abrir
  forgotLink.addEventListener("click", (e) => {
    e.preventDefault();
    openForgot();
  });

  // cerrar (los botones que ya están en el HTML del paso 1)
  forgotModal.querySelectorAll(".btn-cancel").forEach(btn => {
    btn.addEventListener("click", () => {
      closeForgot();
    });
  });

  // submit paso 1
  const formStepRut = forgotModal.querySelector("#form-step-rut");
  if (formStepRut) {
    formStepRut.addEventListener("submit", (e) => {
      e.preventDefault();
      const rutAlumno = forgotModal.querySelector("#rut-alumno")?.value.trim();
      const rutApoderado = forgotModal.querySelector("#rut-apoderado")?.value.trim();
      const correoApoderado = forgotModal.querySelector("#correo-apoderado")?.value.trim();
      const estadoRut = steps.rut.querySelector(".estado");

      if (!rutAlumno || !rutApoderado || !correoApoderado) {
        estadoRut.textContent = "Los datos ingresados no coinciden con un registro.";
        return;
      }

      estadoRut.textContent = "Validando...";

      fetch("/inicioSesion/auth/forgot/validate-family/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCSRFToken(),
        },
        body: JSON.stringify({
          rut_alumno: rutAlumno,
          rut_apoderado: rutApoderado,
          correo_apoderado: correoApoderado,
        })
      })
      .then(async (r) => {
        const ct = r.headers.get("content-type") || "";
        // 👇 si Django devolvió HTML (404, 302, 403 CSRF, etc), lo mostramos
        if (!ct.includes("application/json")) {
          const text = await r.text();
          console.warn("La ruta devolvió HTML o algo que no es JSON");
          console.warn("Status:", r.status, r.statusText);
          console.warn("URL que respondió:", r.url);
          console.warn("Contenido devuelto por Django:\n", text);
          return { ok: false };
        }
        return r.json();
      })
      .then(data => {
        console.log("Respuesta backend:", data);

        if (!data || data.ok !== true) {
          estadoRut.textContent = "Los datos ingresados no coinciden con un registro.";
          return;
        }

        // ✅ aquí SÍ mostramos el paso de "correo enviado"
        showStep("email");

        const emailStep = steps.email;
        if (emailStep) {
          emailStep.innerHTML = `
            <h2>Solicitud recibida</h2>
            <p>Hemos enviado un correo a la dirección indicada.</p>
            <button type="button" class="btn-cancel">Cerrar</button>
          `;

          // botón cerrar que acabamos de crear
          const newCancel = emailStep.querySelector(".btn-cancel");
          if (newCancel) {
            newCancel.addEventListener("click", () => {
              closeForgot();
            });
          }
        }

        // opcional: enmascarar correo
        const parts = correoApoderado.split("@");
        if (parts.length === 2) {
          const masked = parts[0].slice(0,1) + "****@" + parts[1];
          console.log("Correo enmascarado:", masked);
          if (correoOcultoSpan) {
            correoOcultoSpan.textContent = masked;
          }
        }
      })
      .catch(err => {
        console.error("Error en fetch:", err);
        estadoRut.textContent = "Los datos ingresados no coinciden con un registro.";
      });
    });
  }
}

// recarga si viene del cache
window.addEventListener('pageshow', function (e) {
  if (e.persisted) window.location.reload();
});
