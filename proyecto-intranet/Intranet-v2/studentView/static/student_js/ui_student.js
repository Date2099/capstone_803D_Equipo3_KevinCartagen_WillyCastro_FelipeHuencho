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

      default:
        content.innerHTML = `<div class="card">Sección "${section}" no implementada aún.</div>`;
        break;
    }
  }

  // Escuchar clics en el menú
  menuLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      menuLinks.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");
      const section = link.getAttribute("data-section");
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
    events: [], // Aquí se cargarán las evaluaciones guardadas
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
  const res = await fetch("/dashboard/perfil-data/");
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


  // ============================
  // CARGA INICIAL (Dashboard)
  // ============================
  loadSection("dashboard");
});
