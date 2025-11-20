// ============================
// PANEL ALUMNO - COLEGIO SAN AGUSTÍN
// ============================

console.log("ui_student.js ALUMNO con Portal de Pagos v2 cargado");

document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("toggle");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("overlay");
  const content = document.getElementById("content-area");
  const menuLinks = document.querySelectorAll(".menu a[data-section]");
  const topbarTitle = document.getElementById("topbar-title");

  console.log("DOMContentLoaded - menuLinks encontrados:", menuLinks.length);

  // ============================
  // SIDEBAR
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

  window.addEventListener("resize", () => {
    if (window.innerWidth > 992) {
      sidebar.classList.remove("open");
      document.body.classList.remove("menu-open");
      if (overlay) overlay.style.display = "none";
    }
  });

  // ============================
  // RENDERIZADORES
  // ============================

  async function renderCalendario(container) {
    container.innerHTML = `
      <div class="card">
        <h2 class="card-title"><i class="fa-solid fa-calendar-days"></i> Calendario de Evaluaciones</h2>
        <div id="calendar" style="margin-top: 20px;"></div>
      </div>
    `;

    const calendarEl = container.querySelector("#calendar");

    let eventos = [];
    try {
      const resp = await fetch("/studentView/evaluaciones/");
      if (resp.ok) {
        eventos = await resp.json();
      }
    } catch (err) {
      console.warn("No se pudieron cargar las evaluaciones", err);
    }

    const calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: "dayGridMonth",
      height: "auto",
      locale: "es",
      headerToolbar: {
        left: "prev,next today",
        center: "title",
        right: "dayGridMonth,timeGridWeek,timeGridDay",
      },
      events: eventos,
      selectable: false,
      eventClick: function (info) {
        const extra = info.event.extendedProps || {};
        alert(
          [
            `Evaluación: ${info.event.title}`,
            extra.curso ? `Curso: ${extra.curso}` : "",
            extra.tipo ? `Tipo: ${extra.tipo}` : "",
            `Fecha: ${info.event.startStr}`,
          ]
            .filter(Boolean)
            .join("\n")
        );
      },
    });

    calendar.render();
  }

  function renderDashboard(container) {
    const nombreAlumno = (window.alumno && alumno.nombre) || "Alumno";
    const cursoAlumno = (window.alumno && alumno.curso) || "--";

    container.innerHTML = `
      <div class="card">
        <h2 class="card-title">Bienvenido, ${nombreAlumno} - ${cursoAlumno}</h2>
        <p>Este es tu panel personal de estudiante.</p>

        <div class="stat-cards-container">
          <div class="stat-card" style="--card-color: var(--color-primary);">
            <i class="fa-solid fa-book card-icon"></i>
            <div class="card-info">
              <div class="card-num" id="stat-asignaturas">...</div>
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

    fetch("/studentView/mis-asignaturas/")
      .then((r) => r.json())
      .then((data) => {
        const asignaturas = data.asignaturas || [];
        const el = document.getElementById("stat-asignaturas");
        if (el) el.textContent = asignaturas.length;
      })
      .catch(() => {
        const el = document.getElementById("stat-asignaturas");
        if (el) el.textContent = "0";
      });
  }

  function renderClases(container) {
    container.innerHTML = `
      <div class="card">
        <h2 class="card-title"><i class="fa-solid fa-book"></i> Mis Clases</h2>
        <p>Aquí puedes ver las asignaturas en las que estás inscrito.</p>
        <div class="clases-grid" id="clases-list"></div>
      </div>
    `;

    const list = container.querySelector("#clases-list");
    list.innerHTML = `<p>Cargando asignaturas...</p>`;

    const dayNames = {
      0: "Lunes",
      1: "Martes",
      2: "Miércoles",
      3: "Jueves",
      4: "Viernes",
      5: "Sábado",
      6: "Domingo",
    };

    fetch("/studentView/mis-asignaturas/")
      .then((r) => r.json())
      .then((data) => {
        const clases = data.asignaturas || [];

        if (!clases.length) {
          list.innerHTML = `<p class="no-clases">No tienes asignaturas asignadas actualmente.</p>`;
          return;
        }

        list.innerHTML = "";
        clases.forEach((c) => {
          const item = document.createElement("div");
          item.classList.add("clase-card");

          const horariosHtml =
            c.horarios && c.horarios.length
              ? `<p><i class="fa-solid fa-clock"></i> ${c.horarios
                  .map((h) => {
                    const raw = h.day_of_week;
                    const nombreDia = dayNames[raw] ?? dayNames[Number(raw)] ?? raw;
                    return `${nombreDia} ${h.start_time} - ${h.end_time}`;
                  })
                  .join("<br>")}</p>`
              : "";

          item.innerHTML = `
            <div class="clase-icon"><i class="fa-solid fa-book-open"></i></div>
            <div class="clase-info">
              <h3>${c.nombre}</h3>
              <p><i class="fa-solid fa-chalkboard-user"></i> ${c.profesor || "--"}</p>
              ${horariosHtml}
            </div>
          `;
          list.appendChild(item);
        });
      })
      .catch(() => {
        list.innerHTML = `<p class="no-clases">Error al cargar las asignaturas.</p>`;
      });
  }

  function renderNotas(container) {
    container.innerHTML = `
      <div class="tabla-card">
        <div class="tabla-header">
          <h2><i class="fa-solid fa-list-check"></i> Notas</h2>
          <p style="margin-top:4px;">(se excluyen Acto Cívico, Almuerzo, Orientación y Liga)</p>
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
            <tbody id="tabla-body">
              <tr><td colspan="9">Cargando...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    const tbody = container.querySelector("#tabla-body");

    fetch("/studentView/mis-notas/")
      .then((r) => r.json())
      .then((data) => {
        let materias = [];

        if (Array.isArray(data)) {
          materias = data;
        } else if (Array.isArray(data.notas)) {
          materias = data.notas;
        } else if (Array.isArray(data.raw)) {
          const tmp = {};
          data.raw.forEach((item) => {
            const asig = item.subject || "Sin asignatura";
            if (!tmp[asig]) tmp[asig] = [];
            tmp[asig].push({
              score: Number(item.score),
              description: item.evaluation_description || "",
              date: item.date || null,
            });
          });
          materias = Object.entries(tmp).map(([asignatura, notas]) => ({
            asignatura,
            notas,
          }));
        }

        const excluidas = [
          "acto cívico",
          "acto civico",
          "almuerzo",
          "orientación",
          "orientacion",
          "liga",
        ];

        const visibles = materias.filter((m) => {
          const nombre = (m.asignatura || "").toLowerCase();
          return !excluidas.includes(nombre);
        });

        if (!visibles.length) {
          tbody.innerHTML = `<tr><td colspan="9">No hay notas registradas.</td></tr>`;
          return;
        }

        tbody.innerHTML = "";
        visibles.forEach((m) => {
          const notas = (m.notas || []).map((n) => Number(n.score));
          const celdas = [];

          for (let i = 0; i < 7; i++) {
            celdas.push(`<td>${notas[i] ? notas[i].toFixed(1) : "--"}</td>`);
          }

          let prom = "--";
          if (notas.length) {
            const suma = notas.reduce((a, b) => a + b, 0);
            prom = (suma / notas.length).toFixed(1);
          }

          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>${m.asignatura}</td>
            ${celdas.join("")}
            <td><strong>${prom}</strong></td>
          `;
          tbody.appendChild(tr);
        });
      })
      .catch((err) => {
        console.error("❌ error cargando notas", err);
        tbody.innerHTML = `<tr><td colspan="9">Error al cargar notas.</td></tr>`;
      });
  }

  async function renderPerfil(container) {
    const res = await fetch("/studentView/perfil-data/");
    const alumnoData = await res.json();

    container.innerHTML = `
      <div class="perfil-card">
        <div class="perfil-header">
          <div class="perfil-banner"></div>
          <div class="perfil-avatar">
            <div class="avatar-circle">
              ${alumnoData.nombre
                .split(" ")
                .map((p) => p[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <h2>${alumnoData.nombre}</h2>
            <p class="perfil-username">${alumnoData.username || alumnoData.email || "usuario"}</p>
            <p class="perfil-sub">${alumnoData.curso || "--"} • RUT ${alumnoData.rut || "--"}</p>
          </div>
        </div>

        <div class="perfil-body">
          <div class="perfil-info-box">
            <h3>Información básica</h3>
            <table>
              <tr><td>Nombre completo</td><td>${alumnoData.nombre}</td></tr>
              <tr><td>Curso</td><td>${alumnoData.curso || "--"}</td></tr>
              <tr><td>RUT</td><td>${alumnoData.rut || "--"}</td></tr>
              <tr><td>Correo</td><td>${alumnoData.email || "--"}</td></tr>
              <tr><td>Teléfono</td><td>${alumnoData.telefono || "--"}</td></tr>
            </table>
          </div>

          <div class="perfil-info-box">
            <h3>Información del apoderado</h3>
            <table>
              <tr><td>Nombre</td><td>${alumnoData.apoderado_nombre || "--"}</td></tr>
              <tr><td>Parentesco</td><td>${alumnoData.apoderado_parentesco || "--"}</td></tr>
              <tr><td>Teléfono</td><td>${alumnoData.apoderado_telefono || "--"}</td></tr>
              <tr><td>Correo</td><td>${alumnoData.apoderado_correo || "--"}</td></tr>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // ============================
  // PORTAL DE PAGOS: PIN + CUOTAS
  // ============================

  function pedirPinApoderado() {
    console.log("Mostrar modal PIN apoderado");
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

            <div id="pin-error" style="display:none; color:#ff5252; margin-top:8px;"></div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML("beforeend", html);

    const btnValidar = document.getElementById("btn-validar-pin");
    const btnCancel = document.getElementById("btn-cancel-pin");

    if (btnValidar) btnValidar.onclick = validarPin;
    if (btnCancel) btnCancel.onclick = () => {
      const modal = document.querySelector(".modal-pin");
      if (modal) modal.remove();
      loadSection("dashboard");
    };
  }

  // VALIDAR PIN APODERADO
  async function validarPin() {
    const input = document.getElementById("pin-input");
    const errorBox = document.getElementById("pin-error");

    if (!input) return;
    const pin = input.value;

    if (!pin) {
      if (errorBox) {
        errorBox.textContent = "Ingrese un PIN";
        errorBox.style.display = "block";
      }
      return;
    }

    let formData = new FormData();
    formData.append("pin", pin);

    const csrftoken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("csrftoken="))
      ?.split("=")[1];

    console.log("Enviando PIN al backend...");

    const resp = await fetch("/studentView/validar-pin/", {
      method: "POST",
      headers: { "X-CSRFToken": csrftoken },
      body: formData,
    });

    const data = await resp.json();
    console.log("Respuesta validar_pin:", data);

    if (data.success) {
      sessionStorage.setItem("pagos_autorizado", "1");
      const modal = document.querySelector(".modal-pin");
      if (modal) modal.remove();

      // marcar menú como activo y cargar sección pagos
      document.querySelectorAll(".menu a").forEach((a) => a.classList.remove("active"));
      const pagosMenu = document.querySelector('.menu a[data-section="pagos"]');
      if (pagosMenu) pagosMenu.classList.add("active");

      loadSection("pagos");
    } else {
      if (errorBox) {
        errorBox.textContent = data.message || "PIN incorrecto";
        errorBox.style.display = "block";
      }
    }
  }

  async function cargarPortalPagos() {
    console.log("cargarPortalPagos() llamado");
    const resp = await fetch("/studentView/obtener-pagos/");
    const data = await resp.json();

    console.log("Datos obtener_pagos:", data);

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
    const alumnoNombre = data.alumno || "Alumno";
    const pagos = data.pagos || [];

    const pagadas = pagos.filter((p) => p.status === "paid").length;
    const total = pagos.length || 1;
    const porcentaje = Math.round((pagadas / total) * 100);

    let html = `
    <div class="pagos-top">
        <h2>Portal de Pagos</h2>
        <p class="sub">Bienvenid@ <strong>${apoderado}</strong></p>
        <p class="sub" style="margin-top:-8px;">Alumno: <strong>${alumnoNombre}</strong></p>

        <div class="barra-progreso">
            <div class="progreso" style="width:${porcentaje}%"></div>
        </div>
        <p class="tiny">${pagadas} cuotas pagadas de ${total} (${porcentaje}%)</p>
    </div>

    <div class="tarjetas-pagos">`;

    pagos.forEach((p) => {
      let estadoClase, estadoTxt, accion;

      if (p.status === "paid") {
        estadoClase = "ok";
        estadoTxt = "Pagado";
        accion = `<span class="ic-check">✔</span>`;
      } else if (p.status === "pending_review") {
        estadoClase = "review";
        estadoTxt = "En revisión";
        accion = `
          <button class="btn-pay-card" disabled style="background:#b5b5b5; cursor:not-allowed;">
              📄 En revisión
          </button>`;
      } else if (p.status === "rejected") {
        estadoClase = "rejected";
        estadoTxt = "Rechazado";
        accion = `
          <button class="btn-pay-card"
              onclick="mostrarModalSubida(${p.id}, '${p.concept}', ${p.amount})"
              style="background:#ffb74d; border:1px solid #e67e22;">
              ❌ Rechazado — Subir otro
          </button>`;
      } else {
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

    const btnCerrar = document.getElementById("cerrar-accesso");
    if (btnCerrar) {
      btnCerrar.onclick = () => {
        sessionStorage.removeItem("pagos_autorizado");
        fetch("/studentView/close-pin/");
        const dashLink = document.querySelector('.menu a[data-section="dashboard"]');
        if (dashLink) dashLink.click();
        else loadSection("dashboard");
      };
    }
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
  };

  window.enviarComprobante = async function (id) {
    const fileInput = document.getElementById("file-comprobante");
    const msg = document.getElementById("upload-msg");

    if (!fileInput || !fileInput.files[0]) {
      if (msg) msg.textContent = "Selecciona un archivo";
      return;
    }

    const file = fileInput.files[0];

    let form = new FormData();
    form.append("comprobante", file);

    const csrftoken = document.cookie
      .split("; ")
      .find((r) => r.startsWith("csrftoken="))
      ?.split("=")[1];

    const resp = await fetch(`/studentView/subir-comprobante/${id}/`, {
      method: "POST",
      headers: { "X-CSRFToken": csrftoken },
      body: form,
    });

    const data = await resp.json();

    if (!msg) return;

    if (data.success) {
      msg.textContent = "✅ Enviado";

      setTimeout(() => {
        const modal = document.getElementById("modal-comprobante");
        if (modal) modal.remove();

        const card = document
          .querySelector(`button[onclick*="${id}"]`)
          ?.closest(".pago-card");

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
      msg.textContent = "❌ " + (data.error || "Error al subir comprobante");
    }
  };

  // ============================
  // NAVEGACIÓN
  // ============================
  function loadSection(section) {
    console.log("loadSection:", section);
    topbarTitle.textContent =
      section.charAt(0).toUpperCase() + section.slice(1).replace("-", " ");

    content.innerHTML = "<div class='card'>Cargando...</div>";

    switch (section) {
      case "dashboard":
        renderDashboard(content);
        break;
      case "mis-clases":
        renderClases(content);
        break;
      case "tareas":
      case "mis-notas":
        renderNotas(content);
        break;
      case "calendario":
        renderCalendario(content);
        break;
      case "perfil":
        renderPerfil(content);
        break;
      case "pagos":
        cargarPortalPagos();
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
      console.log("Click en sección:", section);

      if (section === "pagos") {
        if (sessionStorage.getItem("pagos_autorizado") === "1") {
          console.log("Pagos ya autorizado en sessionStorage");
          menuLinks.forEach((l) => l.classList.remove("active"));
          link.classList.add("active");
          loadSection("pagos");
        } else {
          console.log("Pagos NO autorizado, mostrar modal PIN");
          pedirPinApoderado();
        }
        return;
      }

      menuLinks.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");
      loadSection(section);

      if (sidebar && sidebar.classList.contains("open")) {
        sidebar.classList.remove("open");
        document.body.classList.remove("menu-open");
        if (overlay) overlay.style.display = "none";
      }
    });
  });

  // vista inicial
  loadSection("dashboard");
});
