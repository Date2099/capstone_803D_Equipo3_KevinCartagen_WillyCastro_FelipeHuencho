// ==============================
// PANEL ADMIN - SPA INTERACTIVA
// ==============================

// --- Referencias del DOM ---
const sidebar = document.getElementById('sidebar');
const toggleBtn = document.getElementById('toggle');
const overlay = document.getElementById('sidebar-overlay');
const mainContent = document.getElementById('main-content');
const title = document.getElementById('topbar-title');

// ==========================================
// Helper para obtener el token CSRF
// ==========================================
function getCSRFToken() {
  const name = "csrftoken";
  const cookies = document.cookie.split(";");
  for (let cookie of cookies) {
    cookie = cookie.trim();
    if (cookie.startsWith(name + "=")) {
      return cookie.substring(name.length + 1);
    }
  }
  return null;
}

// ==========================================
// Funciones básicas
// ==========================================
function isMobile() {
  return window.innerWidth <= 768;
}
function openSidebar() {
  sidebar.classList.add('open');
  overlay.classList.add('show');
  document.body.classList.add('no-scroll');
}
function closeSidebar() {
  sidebar.classList.remove('open');
  overlay.classList.remove('show');
  document.body.classList.remove('no-scroll');
}

// --- Botón toggle y overlay ---
toggleBtn?.addEventListener('click', () => {
  sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
});
overlay?.addEventListener('click', closeSidebar);
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSidebar();
});

// --- Resaltar item activo ---
function clearActive() {
  document.querySelectorAll('.menu a, .menu summary').forEach(el => el.classList.remove('active'));
}
const links = document.querySelectorAll('.menu a[data-section]');
const summaries = document.querySelectorAll('.menu summary');
summaries.forEach(summary => {
  summary.addEventListener('click', () => {
    setTimeout(() => {
      clearActive();
      if (summary.parentElement.open) summary.classList.add('active');
    }, 0);
  });
});

// ======================================================
// 🔹 Ver Cursos
// ======================================================
async function cargarVerCursos() {
  try {
    const response = await fetch("/administrador/api/ver_cursos/");
    if (!response.ok) throw new Error("Error al obtener los cursos");

    const data = await response.json();
    let html = `<div class="ver-cursos">`;

    data.cursos.forEach(c => {
      html += `
        <details class="curso-card">
          <summary class="curso-header">
            <div class="curso-titulo">${c.curso} - ${c.profesor}</div>
          </summary>
          <div class="curso-body">
            <table class="tabla-notas">
              <thead>
                <tr><th>Alumno</th><th>RUT</th><th>Correo</th></tr>
              </thead>
              <tbody>
                ${c.alumnos.map(a => `
                  <tr>
                    <td>${a.nombre}</td>
                    <td>${a.rut}</td>
                    <td>${a.correo}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </details>`;
    });

    html += `</div>`;
    mainContent.innerHTML = html;
    title.textContent = "Ver Cursos";
  } catch (error) {
    console.error("Error al cargar cursos", error);
    mainContent.innerHTML = `
      <div class="error-msg">
        <i class="fa-solid fa-triangle-exclamation"></i>
        Error al cargar los cursos
      </div>`;
  }
}

// ======================================================
// 🔹 Profesores
// ======================================================
async function cargarProfesores() {
  try {
    const response = await fetch("/administrador/api/ver_profesores/");
    if (!response.ok) throw new Error("Error al obtener los profesores");

    const data = await response.json();

    let html = `
      <div class="profesores-lista">
        <div class="profesores-header">
          <h2>Listado de Profesores</h2>
          <button id="btn-nuevo-profesor" class="btn-nuevo">+</button>
        </div>
        <table class="tabla-profesores">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Asignatura</th>
              <th>Título</th>
              <th>Correo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
    `;

    data.profesores.forEach(p => {
      html += `
        <tr data-id="${p.id}">
          <td><input type="text" name="first_name" value="${p.first_name} ${p.last_name}" disabled></td>
          <td><input type="text" name="asignaturas" value="${p.asignaturas}" disabled></td>
          <td><input type="text" name="title" value="${p.title || ''}" disabled></td>
          <td><input type="text" name="email" value="${p.email}" disabled></td>
          <td>
            <div class="acciones">
              <button class="btn-editar">Editar</button>
              <button class="btn-guardar" disabled>Guardar</button>
              <button class="btn-eliminar">Eliminar</button>
            </div>
          </td>

        </tr>`;
    });

    html += `
          </tbody>
        </table>
      </div>`;

    mainContent.innerHTML = html;
    title.textContent = "Profesores";

    // --- Botón para nuevo profesor ---
    document.getElementById("btn-nuevo-profesor")?.addEventListener("click", () => {
      title.textContent = "Agregar Profesor";
      mainContent.innerHTML = `
        <div class="formulario-profesor">
          <div class="form-top">
            <h2>Registrar Profesor</h2>
            <button id="volver-profesores" class="btn-volver">← Volver</button>
          </div>
          <form id="form-profesor">
            <label>RUT:</label>
            <input type="text" name="rut" required>
            <label>Nombre:</label>
            <input type="text" name="first_name" required>
            <label>Apellido:</label>
            <input type="text" name="last_name" required>
            <label>Correo electrónico:</label>
            <input type="email" name="email" required>
            <label>Asignatura:</label>
            <input type="text" name="asignatura" required>
            <label>Título:</label>
            <input type="text" name="title">
            <label>¿Es jefe de curso?</label>
            <select name="is_head_teacher">
              <option value="false">No</option>
              <option value="true">Sí</option>
            </select>
            <label>Curso asignado:</label>
            <select name="curso_id">
              <option value="">Seleccionar curso...</option>
              <option value="PG">Playgroup</option>
              <option value="PK">Prekínder</option>
              <option value="K">Kínder</option>
              <option value="1">1° Básico</option>
              <option value="2">2° Básico</option>
              <option value="3">3° Básico</option>
              <option value="4">4° Básico</option>
              <option value="5">5° Básico</option>
              <option value="6">6° Básico</option>
              <option value="7">7° Básico</option>
              <option value="8">8° Básico</option>
              <option value="1M">1° Medio</option>
              <option value="2M">2° Medio</option>
              <option value="3M">3° Medio</option>
              <option value="4M">4° Medio</option>
            </select>
            <label>Año:</label>
            <input type="number" name="year" value="2025">
            <div class="form-actions">
              <button type="submit" class="btn-guardar">Registrar Profesor</button>
            </div>
          </form>
        </div>`;

      document.getElementById("volver-profesores")?.addEventListener("click", async () => {
        await cargarProfesores();
      });

      const form = document.getElementById("form-profesor");
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = Object.fromEntries(new FormData(form).entries());
        formData.role = "teacher";

        try {
          const response = await fetch("/administrador/api/profesores/crear/", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-CSRFToken": getCSRFToken(),
            },
            body: JSON.stringify(formData),
          });

          const result = await response.json();
          if (response.ok) {
            alert("✅ Profesor registrado correctamente.");
            await cargarProfesores();
          } else {
            alert("⚠️ Error: " + (result.error || "No se pudo registrar el profesor."));
          }
        } catch (error) {
          console.error("Error:", error);
          alert("❌ No se pudo conectar con el servidor.");
        }
      });
    });

  } catch (error) {
    console.error("Error al cargar profesores", error);
    mainContent.innerHTML = `
      <div class="error-msg">
        <i class="fa-solid fa-triangle-exclamation"></i>
        Error al cargar los profesores
      </div>`;
  }
}

// ======================================================
// 🎯 Delegación de eventos (Editar / Guardar / Eliminar)
// ======================================================
mainContent.addEventListener("click", async (e) => {
  const btn = e.target;
  const row = btn.closest("tr");

  if (!btn.classList.contains("btn-editar") &&
      !btn.classList.contains("btn-guardar") &&
      !btn.classList.contains("btn-eliminar")) return;

  // --- EDITAR ---
  if (btn.classList.contains("btn-editar")) {
    const inputs = row.querySelectorAll("input");
    inputs.forEach(i => i.disabled = false);
    row.querySelector(".btn-guardar").disabled = false;
    row.classList.add("editando");
    return;
  }

  // --- GUARDAR ---
  if (btn.classList.contains("btn-guardar")) {
    const id = row.dataset.id;
    const inputs = row.querySelectorAll("input");
    const data = {};
    inputs.forEach(i => data[i.name] = i.value.trim());

    try {
      const response = await fetch(`/administrador/api/profesores/${id}/actualizar/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCSRFToken(),
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (response.ok) {
        btn.textContent = "✅ Guardado";
        btn.disabled = true;
        row.classList.remove("editando");
        inputs.forEach(i => i.disabled = true);
        setTimeout(() => btn.textContent = "💾 Guardar", 2000);
      } else {
        alert("⚠️ Error: " + (result.error || "No se pudo actualizar."));
      }
    } catch (error) {
      console.error("Error al actualizar:", error);
      alert("❌ No se pudo conectar con el servidor.");
    }
    return;
  }

  // --- ELIMINAR ---
  if (btn.classList.contains("btn-eliminar")) {
    const id = row.dataset.id;
    const nombre = row.querySelector('input[name="first_name"]')?.value || "Profesor";

    if (!confirm(`¿Seguro que deseas eliminar al profesor "${nombre}"?`)) return;

    try {
      const response = await fetch(`/administrador/api/profesores/${id}/eliminar/`, {
        method: "DELETE",
        headers: { "X-CSRFToken": getCSRFToken() },
      });

      const result = await response.json();
      if (response.ok) {
        row.remove();
        alert(`🗑️ Profesor "${nombre}" eliminado correctamente.`);
      } else {
        alert("⚠️ Error: " + (result.error || "No se pudo eliminar."));
      }
    } catch (error) {
      console.error("Error al eliminar:", error);
      alert("❌ No se pudo conectar con el servidor.");
    }
    return;
  }
});

// ======================================================
// 🔹 Agregar Alumno (versión completa)
// ======================================================
async function cargarAgregarAlumno() {
  title.textContent = "Agregar Alumno";

  mainContent.innerHTML = `
    <div class="formulario-alumno">
      <div class="form-top">
        <h2>Registro de Alumno</h2>
        <button id="volver-cursos" class="btn-volver">← Volver</button>
      </div>

      <form id="form-alumno" class="form-alumno">
        <div class="form-section">
          <h3>Datos del Alumno</h3>

          <label>RUT:</label>
          <input type="text" name="rut" placeholder="Ej: 21.345.678-9" required>

          <label>Nombres:</label>
          <input type="text" name="nombres" required>

          <label>Apellidos:</label>
          <input type="text" name="apellidos" required>

          <label>Fecha de Nacimiento:</label>
          <input type="date" name="fecha_nacimiento" required>

          <label>Comuna:</label>
          <input type="text" name="comuna" placeholder="Ej: San Antonio">

          <label>Curso:</label>
          <select name="curso" required>
            <option value="">Seleccionar curso...</option>
            <option value="PG">Playgroup</option>
            <option value="PK">Prekínder</option>
            <option value="K">Kínder</option>
            <option value="1">1° Básico</option>
            <option value="2">2° Básico</option>
            <option value="3">3° Básico</option>
            <option value="4">4° Básico</option>
            <option value="5">5° Básico</option>
            <option value="6">6° Básico</option>
            <option value="7">7° Básico</option>
            <option value="8">8° Básico</option>
            <option value="1M">1° Medio</option>
            <option value="2M">2° Medio</option>
            <option value="3M">3° Medio</option>
            <option value="4M">4° Medio</option>
          </select>

          <label>Estado:</label>
          <select name="estado_alumno">
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
        </div>

        <div class="form-section">
          <h3>Datos del Apoderado</h3>

          <label>RUT Apoderado:</label>
          <input type="text" name="rut_apoderado" required>

          <label>Nombre Apoderado:</label>
          <input type="text" name="nombre_apoderado" required>

          <label>Correo Apoderado:</label>
          <input type="email" name="email_apoderado" placeholder="ejemplo@correo.com">

          <label>Teléfono:</label>
          <input type="text" name="telefono_apoderado" placeholder="+56 9 1234 5678">
        </div>

        <div class="form-actions">
          <button type="submit" class="btn-guardar">Registrar Alumno</button>
        </div>
      </form>
    </div>
  `;

  // 🔙 Botón para volver al listado de cursos
  document.getElementById("volver-cursos")?.addEventListener("click", async () => {
    await cargarVerCursos();
  });

  // 📨 Envío del formulario
  const form = document.getElementById("form-alumno");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(form);

    try {
      const response = await fetch("/administrador/api/registrar_alumno/", {
        method: "POST",
        headers: { "X-CSRFToken": getCSRFToken() },
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        alert(result.message || "✅ Alumno registrado correctamente.");
        form.reset();
      } else {
        alert("⚠️ Error: " + (result.error || "No se pudo registrar el alumno."));
      }
    } catch (error) {
      console.error("Error:", error);
      alert("❌ No se pudo conectar con el servidor.");
    }
  });
}
let resizeRAF;
window.addEventListener('resize', () => {
  if (currentSection !== 'tablero') return;
  cancelAnimationFrame(resizeRAF);
  resizeRAF = requestAnimationFrame(renderAdminDashboardChart);
});


async function cargarVerPagos() {
  try {
    const response = await fetch("/administrador/api/ver_pagos/");
    if (!response.ok) throw new Error("Error al obtener los pagos");
    const data = await response.json();

    let html = `<div class="ver-pagos">`;
    const secciones = [
      { titulo: " Pendientes",   key: "pendientes"},
      { titulo: " Pagados",      key: "pagados" },
      { titulo: " Fallidos",     key: "fallidos" },
      { titulo: " Reembolsados", key: "reembolsados" },
    ];

    secciones.forEach(sec => {
      const pagosPorMes = data[sec.key] || {};
      if (Object.keys(pagosPorMes).length === 0) return;

      html += `<section class="bloque-pagos">
        <h3 style="color:${sec.color}">${sec.titulo}</h3>`;

      Object.entries(pagosPorMes).forEach(([mes, pagos]) => {
        html += `
          <details class="mes-card">
            <summary>${mes}</summary>
            <table class="tabla-pagos">
              <thead>
                <tr><th>Alumno</th><th>Concepto</th><th>Monto</th><th>Fecha</th></tr>
              </thead>
              <tbody>
                ${pagos.map(p => `
                  <tr>
                    <td>${p.alumno}</td>
                    <td>${p.concepto}</td>
                    <td>${p.monto}</td>
                    <td>${p.fecha}</td>
                  </tr>`).join("")}
              </tbody>
            </table>
          </details>`;
      });

      html += `</section>`;
    });

    html += `</div>`;
    mainContent.innerHTML = html;
    title.textContent = "Revisión de Pagos";
  } catch (error) {
    console.error("Error al cargar pagos", error);
    mainContent.innerHTML = `
      <div class="error-msg">
        <i class="fa-solid fa-triangle-exclamation"></i>
        Error al cargar los pagos.
      </div>`;
  }
}





async function cargarComunicados() {
  title.textContent = "Comunicados";

mainContent.innerHTML = `
  <div class="comunicados-layout">
    
    <!-- 📤 COLUMNA IZQUIERDA -->
    <div class="comunicados-form">
      <h2><i class="fa-solid fa-bullhorn"></i> Enviar Comunicado</h2>

      <form id="form-comunicado">
        <div class="form-group">
          <label>Asunto:</label>
          <input type="text" name="asunto" placeholder="Escribe el asunto del mensaje..." required>
        </div>

        <div class="form-group">
          <label>Mensaje:</label>
          <textarea name="mensaje" rows="6" placeholder="Escribe aquí el comunicado..." required></textarea>
        </div>

        <div class="form-group">
          <label>Enviar a:</label>
          <select name="destino" id="destino">
            <option value="todos">Todos los usuarios</option>
            <option value="curso">Por curso</option>
            <option value="alumno">Alumno específico</option>
            <option value="manual">Correo manual</option>
          </select>
        </div>

        <div id="filtro-curso" class="filtro-extra">
          <label>Seleccionar curso:</label>
          <input type="text" name="curso_id" placeholder="Ej: 4to Medio A">
        </div>

        <div id="filtro-alumno" class="filtro-extra">
          <label>RUT del alumno:</label>
          <input type="text" name="rut" placeholder="Ej: 12345678-9">
        </div>

        <div id="filtro-manual" class="filtro-extra">
          <label>Correo electrónico destino:</label>
          <input type="email" name="email_manual" placeholder="Ej: nombre@correo.com">
        </div>

        <div class="form-actions">
          <button type="submit" class="btn-guardar">Enviar Comunicado</button>
        </div>
      </form>
    </div>

    <!-- 📋 COLUMNA DERECHA -->
    <div class="comunicados-lista">
      <div class="header-lista">
        <h3><i class="fa-solid fa-address-book"></i> Listado de Apoderados</h3>
        <input type="text" id="buscar-apoderado" placeholder=" Buscar alumno, RUT o apoderado... AUN NO LISTA ESTA FUNCION">
      </div>


      <div class="tabla-wrapper">
        <table class="tabla-apoderados">
          <thead>
            <tr>
              <th>Alumno</th>
              <th>RUT</th>
              <th>Apoderado</th>
              <th>Correo</th>
            </tr>
          </thead>
          <tbody id="tabla-apoderados-body">
            <tr><td colspan="4">Cargando datos...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
`;


  // Mostrar filtros dinámicos
  const destino = document.getElementById("destino");
  destino.addEventListener("change", (e) => {
    document.querySelectorAll(".filtro-extra").forEach(div => div.style.display = "none");
    if (e.target.value === "curso") document.getElementById("filtro-curso").style.display = "block";
    if (e.target.value === "alumno") document.getElementById("filtro-alumno").style.display = "block";
    if (e.target.value === "manual") document.getElementById("filtro-manual").style.display = "block";
  });

  // Cargar lista de apoderados
  await cargarApoderadosEnTabla();

  // Envío del formulario
  const form = document.getElementById("form-comunicado");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    try {
      const response = await fetch("/administrador/api/enviar_comunicado/", {
        method: "POST",
        body: formData,
        headers: { "X-CSRFToken": getCSRFToken() },
      });
      const result = await response.json();
      alert("✅ " + result.message);
      form.reset();
    } catch (error) {
      console.error("Error al enviar comunicado:", error);
      alert("❌ Error al conectar con el servidor.");
    }
  });
}

// 🔹 Función auxiliar: carga apoderados desde API
async function cargarApoderadosEnTabla() {
  const tbody = document.getElementById("tabla-apoderados-body");
  try {
    const response = await fetch("/administrador/api/listar_apoderados/");
    const data = await response.json();

    tbody.innerHTML = "";
    if (data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4">No hay apoderados registrados.</td></tr>`;
      return;
    }

    data.forEach(item => {
      tbody.innerHTML += `
        <tr>
          <td>${item.alumno}</td>
          <td>${item.rut}</td>
          <td>${item.apoderado}</td>
          <td>${item.email || "—"}</td>
        </tr>
      `;
    });
  } catch (error) {
    console.error("Error al cargar apoderados:", error);
    tbody.innerHTML = `<tr><td colspan="4">Error al cargar datos.</td></tr>`;
  }
}




// ======================================================
// 🔹 Navegación SPA
// ======================================================
links.forEach(link => {
  link.addEventListener('click', async (e) => {
    e.preventDefault();
    clearActive();
    link.classList.add('active');
    const section = link.getAttribute('data-section');

    switch (section) {
      case 'tablero':
        title.textContent = "Panel de Control";
        mainContent.innerHTML = "<h1>Bienvenido</h1>";
        break;
      case 'estudiantes':
        await cargarVerCursos();
        break;
      case 'profesores':
        await cargarProfesores();
        break;
      case 'agregar-alumno':
        await cargarAgregarAlumno();
        break;
      case 'revision-pagos':
        await cargarVerPagos();
        break;
      case 'comunicados':     
        await cargarComunicados(); 
        break;


      default:
        mainContent.innerHTML = `<h1>${link.textContent}</h1><p>Sección "${section}" en construcción...</p>`;
        title.textContent = link.textContent.trim();
    }

    if (isMobile()) closeSidebar();
  });
});










