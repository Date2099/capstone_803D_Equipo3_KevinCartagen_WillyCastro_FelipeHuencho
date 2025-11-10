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
    container.innerHTML = `
      <div class="card">
        <h2 class="card-title">Bienvenido, ${alumno.nombre} - ${alumno.curso}</h2>
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
    const alumno = await res.json();

    container.innerHTML = `
      <div class="perfil-card">
        <div class="perfil-header">
          <div class="perfil-banner"></div>
          <div class="perfil-avatar">
            <div class="avatar-circle">
              ${alumno.nombre
                .split(" ")
                .map((p) => p[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
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
              <tr><td>Correo</td><td>${alumno.email || "--"}</td></tr>
              <tr><td>Teléfono</td><td>${alumno.telefono || "--"}</td></tr>
            </table>
          </div>

          <div class="perfil-info-box">
            <h3>Información del apoderado</h3>
            <table>
              <tr><td>Nombre</td><td>${alumno.apoderado_nombre || "--"}</td></tr>
              <tr><td>Parentesco</td><td>${alumno.apoderado_parentesco || "--"}</td></tr>
              <tr><td>Teléfono</td><td>${alumno.apoderado_telefono || "--"}</td></tr>
              <tr><td>Correo</td><td>${alumno.apoderado_correo || "--"}</td></tr>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // ============================
  // NAVEGACIÓN
  // ============================
  function loadSection(section) {
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
      default:
        content.innerHTML = `<div class="card">Sección "${section}" no implementada aún.</div>`;
        break;
    }
  }

  menuLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      menuLinks.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");
      const section = link.getAttribute("data-section");
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
