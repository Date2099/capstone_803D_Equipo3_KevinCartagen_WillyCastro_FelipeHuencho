// ============================
// PANEL ALUMNO - COLEGIO SAN AGUSTÍN
// ============================

document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("toggle");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("overlay");
  const content = document.getElementById("content-area");
  const menuLinks = document.querySelectorAll(".menu a[data-section]");
  const topbarTitle = document.getElementById("topbar-title");

  // ============================
  // SIDEBAR (Toggle y Responsividad)
  // ============================
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener("click", () => {
      sidebar.classList.toggle("open");
      document.body.classList.toggle("menu-open");

      if (overlay) {
        overlay.style.display = sidebar.classList.contains("open") ? "block" : "none";
      }
    });
  }

  if (overlay) {
    overlay.addEventListener("click", () => {
      sidebar.classList.remove("open");
      document.body.classList.remove("menu-open");
      overlay.style.display = "none";
    });
  }

  // Ajuste al redimensionar ventana (ocultar menú en PC)
  function handleResize() {
    if (window.innerWidth > 992) {
      sidebar.classList.remove("open");
      document.body.classList.remove("menu-open");
      overlay.style.display = "none";
    }
  }
  window.addEventListener("resize", handleResize);

  // ============================
  // NAVEGACIÓN DINÁMICA
  // ============================

  // Función principal de carga de secciones
  function loadSection(section) {
    // Cambia el título de la topbar
    topbarTitle.textContent =
      section.charAt(0).toUpperCase() + section.slice(1).replace("-", " ");

    // Limpiar contenido
    content.innerHTML = "<div class='card'>Cargando...</div>";

    // Determinar qué sección cargar
  switch (section) {
      case "dashboard":
          renderDashboard(content);
          break;

      case "mis-clases":
          renderClases(content);
          break;

      case "tareas":
          renderNotas(content);
          break;

      case "calendario":
          renderCalendario(content);
          break;

      case "perfil":
          renderPerfil(content);
          break;

      case "pagos":
          if (sessionStorage.getItem("pagos_autorizado") === "1") {
              cargarPortalPagos();
          } else {
              pedirPinApoderado();
          }
          break;

      default:
          content.innerHTML = `<div class="card">Sección "${section}" no implementada aún.</div>`;
          break;
  }

  }

menuLinks.forEach((link) => {
  link.addEventListener("click", (e) => {
      e.preventDefault();
      const section = link.getAttribute("data-section");

      if (section === "pagos") {
          // si ya está autorizado → cargar
          if (sessionStorage.getItem("pagos_autorizado") === "1") {
              menuLinks.forEach((l) => l.classList.remove("active"));
              link.classList.add("active");
              loadSection("pagos");
          } else {
              // ❌ NO cambiar sección — solo pedir PIN
              pedirPinApoderado();
          }
          return; // importante: evita continuar con loadSection
      }

      // comportamiento normal para otras secciones
      menuLinks.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");
      loadSection(section);
  });
});

  // ============================
  // SECCIONES (Renderizadores)
  // ============================

  // DASHBOARD
  function renderDashboard(container) {
    container.innerHTML = `
      <div class="card">
        <h2 class="card-title">Bienvenido, ${alumno.nombre} - ${alumno.curso}</h2>
        <p>Este es tu panel personal de estudiante.</p>

        <div class="stat-cards-container">
          <div class="stat-card" style="--card-color: var(--color-primary);">
            <i class="fa-solid fa-book card-icon"></i>
            <div class="card-info">
              <div class="card-num">6</div>
              <div class="card-label">Tus asignaturas</div>
            </div>
          </div>
          <div class="stat-card" style="--card-color: var(--color-secondary);">
            <i class="fa-solid fa-list-check card-icon"></i>
            <div class="card-info">
              <div class="card-num">4.8</div>
              <div class="card-label">Promedio general</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // MIS CLASES
  function renderClases(container) {
    container.innerHTML = `
      <div class="card">
        <h2 class="card-title"><i class="fa-solid fa-book"></i> Mis Clases</h2>
        <p>Aquí puedes ver las asignaturas en las que estás inscrito.</p>
        <div class="clases-grid" id="clases-list"></div>
      </div>
    `;

    const list = container.querySelector("#clases-list");

    // 🔹 Simulación de datos (más adelante se conecta al backend)
    const clases = [
      { nombre: "Matemáticas", profesor: "Juan Pérez", curso: "1° Medio", año: 2025 },
      { nombre: "Lenguaje y Comunicación", profesor: "Ana Soto", curso: "1° Medio", año: 2025 },
      { nombre: "Ciencias Naturales", profesor: "Carlos Rivera", curso: "1° Medio", año: 2025 },
      { nombre: "Historia y Geografía", profesor: "Marcela Díaz", curso: "1° Medio", año: 2025 },
    ];

    if (clases.length === 0) {
      list.innerHTML = `<p class="no-clases">No tienes asignaturas asignadas actualmente.</p>`;
      return;
    }

    clases.forEach((c) => {
      const item = document.createElement("div");
      item.classList.add("clase-card");
      item.innerHTML = `
        <div class="clase-icon"><i class="fa-solid fa-book-open"></i></div>
        <div class="clase-info">
          <h3>${c.nombre}</h3>
          <p><i class="fa-solid fa-chalkboard-user"></i> ${c.profesor}</p>
          <p><i class="fa-solid fa-graduation-cap"></i> ${c.curso} — ${c.año}</p>
        </div>
      `;
      list.appendChild(item);
    });
  }

  function renderNotas(container) {
  container.innerHTML = `
    <div class="tabla-card">
      <div class="tabla-header">
        <h2><i class="fa-solid fa-list-check"></i> Notas</h2>
      </div>

      <div class="tabla-body">
        <table class="tabla-notas">
          <thead>
            <tr>
              <th>Asignatura</th>
              <th>Nota 1</th>
              <th>Nota 2</th>
              <th>Nota 3</th>
              <th>Nota 4</th>
              <th>Nota 5</th>
              <th>Nota 6</th>
              <th>Nota 7</th>
              <th>Promedio</th>
            </tr>
          </thead>
          <tbody id="tabla-body"></tbody>
        </table>
      </div>
    </div>
  `;

  // Datos simulados (se reemplazarán con los reales desde el backend)
  const data = [
    { asignatura: "Matemáticas", notas: ["--", "--", "--", "--", "--", "--", "--"], promedio: "--" },
    { asignatura: "Lenguaje y Comunicación", notas: ["--", "--", "--", "--", "--", "--", "--"], promedio: "--" },
    { asignatura: "Ciencias Naturales", notas: ["--", "--", "--", "--", "--", "--", "--"], promedio: "--" },
    { asignatura: "Historia y Geografía", notas: ["--", "--", "--", "--", "--", "--", "--"], promedio: "--" },
    { asignatura: "Educación Física", notas: ["--", "--", "--", "--", "--", "--", "--"], promedio: "--" },
    { asignatura: "Inglés", notas: ["--", "--", "--", "--", "--", "--", "--"], promedio: "--" },
  ];

  const tbody = container.querySelector("#tabla-body");

  data.forEach((materia) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${materia.asignatura}</td>
      ${materia.notas.map(nota => `<td>${nota}</td>`).join("")}
      <td><strong>${materia.promedio}</strong></td>
    `;
    tbody.appendChild(row);
  });
}

function renderCalendario(container) {
  container.innerHTML = `
    <div class="card">
      <h2 class="card-title"><i class="fa-solid fa-calendar-days"></i> Calendario de Evaluaciones</h2>
      <div id="calendar" style="margin-top: 20px;"></div>
    </div>
  `;

  const calendarEl = container.querySelector("#calendar");

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    height: "auto",
    locale: "es",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,timeGridDay"
    },
    events: [], 
    selectable: true,
    dateClick: function(info) {
      const title = prompt(`📘 Ingresa el nombre de la evaluación para el ${info.dateStr}:`);
      if (title) {
        calendar.addEvent({
          title: title,
          start: info.dateStr,
          allDay: true
        });
      }
    },
    eventClick: function(info) {
      if (confirm(`¿Eliminar la evaluación "${info.event.title}"?`)) {
        info.event.remove();
      }
    },
  });

  calendar.render();
}
async function renderPerfil(container) {
  const res = await fetch("/studentView/perfil-data/");
  const alumno = await res.json();

  container.innerHTML = `
    <div class="perfil-card">
      <div class="perfil-header">
        <div class="perfil-banner"></div>
        <div class="perfil-avatar">
          <div class="avatar-circle">${alumno.nombre.split(" ").map(p => p[0]).join("").slice(0,2).toUpperCase()}</div>
          <h2>${alumno.nombre}</h2>
          <p class="perfil-username">${alumno.username || alumno.email || "usuario"}</p>
          <p class="perfil-sub">${alumno.curso || "--"} • RUT ${alumno.rut || "--"}</p>
        </div>
      </div>

      <div class="perfil-body">
        <div class="perfil-info-box">
          <h3>Información básica</h3>
          <table>
            <tr><td>Nombre completo</td><td>${alumno.nombre}</td></tr>
            <tr><td>Curso</td><td>${alumno.curso || "--"}</td></tr>
            <tr><td>RUT</td><td>${alumno.rut || "--"}</td></tr>

          </table>
        </div>

        <div class="perfil-info-box">
          <h3>Información del apoderado</h3>
          <table>
            <tr><td>Nombre</td><td>${alumno.apoderado_nombre || "--"}</td></tr>

            <tr><td>Teléfono</td><td>${alumno.apoderado_telefono || "--"}</td></tr>
            <tr><td>Correo</td><td>${alumno.apoderado_correo || "--"}</td></tr>
          </table>
        </div>
      </div>
    </div>
  `;
}

function pedirPinApoderado() {
    const html = `
    <div class="modal-pin">
        <div class="modal-pin-box">
            <h3>Acceso al Portal de Pagos</h3>
            <p>Ingrese el PIN del apoderado para continuar:</p>

            <input type="password" id="pin-input" class="modal-pin-input" placeholder="PIN de apoderado">

            <button id="btn-validar-pin" class="modal-pin-btn confirm">
                Validar
            </button>

            <button id="btn-cancel-pin" class="modal-pin-btn cancel">
                Cancelar
            </button>

            <div id="pin-error" style="display:none;"></div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML("beforeend", html);

    document.getElementById("btn-validar-pin").onclick = validarPin;
    document.getElementById("btn-cancel-pin").onclick = () => {
        document.querySelector(".modal-pin").remove();
        // Opcional: regresar al Dashboard
        loadSection("dashboard");
    };
}



// =======================
// VALIDAR PIN APODERADO
// =======================
async function validarPin() {
    const pin = document.getElementById("pin-input").value;
    
    if (!pin) {
        document.getElementById("pin-error").textContent = "Ingrese un PIN";
        document.getElementById("pin-error").style.display = "block";
        return;
    }

    let formData = new FormData();
    formData.append("pin", pin);

    // Obtener CSRF
    const csrftoken = document.cookie
        .split("; ")
        .find(row => row.startsWith("csrftoken="))
        ?.split("=")[1];

    const resp = await fetch("/studentView/validar-pin/", {
        method: "POST",
        headers: { "X-CSRFToken": csrftoken },
        body: formData
    });

    const data = await resp.json();

    if (data.success) {
        //  PIN correcto
        sessionStorage.setItem("pagos_autorizado", "1");
        document.querySelector(".modal-pin").remove();

        //  Actualizar el menú para resaltar Portal de Pagos
        document.querySelectorAll(".menu a").forEach(a => a.classList.remove("active"));
        const pagosMenu = document.querySelector('.menu a[data-section="pagos"]');
        if (pagosMenu) pagosMenu.classList.add("active");

        cargarPortalPagos();

    } else {
        //  PIN incorrecto
        const e = document.getElementById("pin-error");
        e.textContent = data.message || "PIN incorrecto";
        e.style.display = "block";
    }
}

async function cargarPortalPagos() {
    const resp = await fetch("/studentView/obtener-pagos/");
    const data = await resp.json();

    if (data.error) {
        if (data.error.includes("Acceso no autorizado")) {
            sessionStorage.removeItem("pagos_autorizado");
            pedirPinApoderado();
            return;
        }

        content.innerHTML = `<div class="card error-card">${data.error}</div>`;
        return;
    }

    const apoderado = data.apoderado || "Apoderado";
    const alumno = data.alumno || "Alumno";
    const pagos = data.pagos || [];

    const pagadas = pagos.filter(p => p.status === "paid").length;
    const total = pagos.length;
    const porcentaje = Math.round((pagadas / total) * 100);

    let html = `
    <div class="pagos-top">
        <h2>Portal de Pagos</h2>
        <p class="sub">Bienvenid@ <strong>${apoderado}</strong></p>
        <p class="sub" style="margin-top:-8px;">Alumno: <strong>${alumno}</strong></p>

        <div class="barra-progreso">
            <div class="progreso" style="width:${porcentaje}%"></div>
        </div>
        <p class="tiny">${pagadas} cuotas pagadas de ${total} (${porcentaje}%)</p>
    </div>

    <div class="tarjetas-pagos">`;

    pagos.forEach(p => {

        // Badge según estado
        let estadoClase, estadoTxt, accion;

        if (p.status === "paid") {
            estadoClase = "ok";
            estadoTxt = "Pagado";
            accion = `<span class="ic-check">✔</span>`;
        }
        else if (p.status === "pending_review") {
            estadoClase = "review";
            estadoTxt = "En revisión";
            accion = `
                <button class="btn-pay-card" disabled style="background:#b5b5b5; cursor:not-allowed;">
                    📄 En revisión
                </button>`;
        }
        else if (p.status === "rejected") {
            estadoClase = "rejected";
            estadoTxt = "Rechazado";
            accion = `
                <button class="btn-pay-card"
                    onclick="mostrarModalSubida(${p.id}, '${p.concept}', ${p.amount})"
                    style="background:#ffb74d; border:1px solid #e67e22;">
                    ❌ Rechazado — Subir otro
                </button>`;
        }
        else {
            estadoClase = "pend";
            estadoTxt = "Pendiente";
            accion = `
                <button class="btn-pay-card" onclick="mostrarModalSubida(${p.id}, '${p.concept}', ${p.amount})">
                    <i class="fa-solid fa-upload"></i> Subir comprobante
                </button>`;
        }

        html += `
        <div class="pago-card ${estadoClase}">
            <div class="pc-mes">${p.concept}</div>
            <div class="pc-det">
                <span>${p.due_date}</span>
                <span class="pc-monto">$${p.amount.toLocaleString()}</span>
            </div>
            <div class="pc-footer">
                <span class="badge-${estadoClase}">${estadoTxt}</span>
                ${accion}
            </div>
        </div>`;
    });

    html += `
    </div>
    <button id="cerrar-accesso" class="btn-cerrar-elegante">Cerrar acceso apoderado</button>
    `;

    content.innerHTML = html;

    document.getElementById("cerrar-accesso").onclick = () => {
        sessionStorage.removeItem("pagos_autorizado");
        fetch("/studentView/close-pin/");
        document.querySelector('.menu a[data-section="dashboard"]').click();
    };
}



// ---- FUNCIONES GLOBALES PARA SUBIDA DE COMPROBANTES -----

window.mostrarModalSubida = function (pagoId, mes, monto) {
    const modal = `
    <div class="modal-pin" id="modal-comprobante">
        <div class="modal-pin-box" style="width:400px;">
            <h3>Subir comprobante</h3>
            <p><strong>${mes}</strong><br>Monto: $${monto.toLocaleString()}</p>
            
            <input type="file" id="file-comprobante" accept="image/*,application/pdf" class="modal-pin-input">

            <button class="modal-pin-btn confirm" onclick="enviarComprobante(${pagoId})">Enviar</button>
            <button class="modal-pin-btn cancel" onclick="document.querySelector('#modal-comprobante').remove()">Cancelar</button>
            <div id="upload-msg" style="margin-top:10px;font-size:14px;"></div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML("beforeend", modal);
}




window.enviarComprobante = async function(id) {
    const file = document.getElementById("file-comprobante").files[0];
    if (!file) {
        document.getElementById("upload-msg").textContent = "Selecciona un archivo";
        return;
    }

    let form = new FormData();
    form.append("comprobante", file);

    const csrftoken = document.cookie.split("; ").find(r => r.startsWith("csrftoken="))?.split("=")[1];

    const resp = await fetch(`/studentView/subir-comprobante/${id}/`, {
        method: "POST",
        headers: { "X-CSRFToken": csrftoken },
        body: form
    });

    const data = await resp.json();

    const msg = document.getElementById("upload-msg");

    if (data.success) {
        msg.textContent = "✅ Enviado";

        // cerrar ventana modal
        setTimeout(() => {
            document.getElementById("modal-comprobante").remove();

            // buscar el botón en esa tarjeta y actualizar su estado
            const card = document.querySelector(`button[onclick*="${id}"]`)?.closest(".pago-card");

            if (card) {
                const badge = card.querySelector(".pc-footer .badge-pend");
                if (badge) {
                    badge.textContent = "En revisión";
                    badge.classList.remove("badge-pend");
                    badge.classList.add("badge-review");
                }

                const actionBtn = card.querySelector(".btn-pay-card");
                if (actionBtn) {
                    actionBtn.outerHTML = `
                        <button class="btn-pay-card" disabled style="background:#b5b5b5; cursor:not-allowed;">
                             En revisión
                        </button>`;
                }
            }

        }, 700);

    } else {
        msg.textContent = "❌ " + data.error;
    }
};




  // ============================
  // CARGA INICIAL (Dashboard)
  // ============================
  loadSection("dashboard");
});
