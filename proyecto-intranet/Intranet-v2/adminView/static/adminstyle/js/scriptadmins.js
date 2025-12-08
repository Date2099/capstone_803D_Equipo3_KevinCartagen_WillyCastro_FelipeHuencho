document.addEventListener("DOMContentLoaded", () => {
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
    if (!sidebar) return;
    sidebar.classList.add('open');
    overlay?.classList.add('show');
    document.body.classList.add('no-scroll');
  }
  function closeSidebar() {
    if (!sidebar) return;
    sidebar.classList.remove('open');
    overlay?.classList.remove('show');
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
  // 🔹 Ver Cursos (ORGANIZADO POR NIVELES)
  // ======================================================
  async function cargarVerCursos() {
    title.textContent = "Listado de Cursos";
    mainContent.innerHTML = `<div class="card"><p>Cargando cursos...</p></div>`;

    try {
      const response = await fetch("/adminview/api/cursos/");
      if (!response.ok) throw new Error("Error al obtener los cursos");
      const data = await response.json();

      // 1. Clasificar los cursos por nombre
      const preBasica = [];
      const basica = [];
      const media = [];

      data.cursos.forEach(c => {
        const nombre = c.curso.toLowerCase(); // Normalizar a minúsculas para comparar
        
        if (nombre.includes("medio")) {
          media.push(c);
        } else if (nombre.includes("básico") || nombre.includes("basico") || /\d/.test(nombre)) {
           // Si tiene número y no es medio, asumimos básico (ej: 1° Básico)
           // Ojo: Ajustar esta lógica si tus nombres de Pre-Básica tienen números
           // Pero comúnmente Pre-Básica es PK, K, Playgroup.
           if(nombre.includes("kínder") || nombre.includes("kinder") || nombre.includes("play")) {
             preBasica.push(c);
           } else {
             basica.push(c);
           }
        } else {
          // Playgroup, Prekínder, Kínder (si no cayeron arriba)
          preBasica.push(c);
        }
      });

      // 2. Función auxiliar para generar el HTML de una lista de tarjetas
      const renderGrid = (listaCursos) => {
        if (listaCursos.length === 0) return `<p style="color:#999; font-style:italic;">No hay cursos en este nivel.</p>`;
        
        return `<div class="cursos-grid">` + listaCursos.map(c => {
          const cantidad = c.alumnos ? c.alumnos.length : 0;
          return `
            <details class="curso-card">
              <summary class="curso-header">
                <div class="curso-titulo">
                  <i class="fa-solid fa-graduation-cap"></i>
                  <span>${c.curso}</span>
                </div>
                <span class="curso-badge">${cantidad} Alumnos</span>
              </summary>
              
              <div class="curso-body">
                ${cantidad > 0 ? `
                  <table class="tabla-generica">
                    <thead><tr><th>Alumno</th><th>RUT</th></tr></thead>
                    <tbody>
                      ${c.alumnos.map(a => `
                        <tr>
                          <td style="font-weight:500">${a.nombre}</td>
                          <td style="color:#666">${a.rut}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                ` : `<p style="padding:15px; text-align:center; color:#888;">Sin alumnos.</p>`}
              </div>
            </details>
          `;
        }).join('') + `</div>`;
      };

      // 3. Construir el HTML Final
      let html = ``;

      // Sección Pre-Básica
      if (preBasica.length > 0) {
        html += `
          <div class="periodo-section">
            <h3 class="periodo-title">Pre-Escolar</h3>
            ${renderGrid(preBasica)}
          </div>`;
      }

      // Sección Básica
      if (basica.length > 0) {
        html += `
          <div class="periodo-section">
            <h3 class="periodo-title">Enseñanza Básica</h3>
            ${renderGrid(basica)}
          </div>`;
      }

      // Sección Media
      if (media.length > 0) {
        html += `
          <div class="periodo-section">
            <h3 class="periodo-title">Enseñanza Media</h3>
            ${renderGrid(media)}
          </div>`;
      }

      if (html === ``) html = `<div class="card"><p>No se encontraron cursos.</p></div>`;

      mainContent.innerHTML = html;

    } catch (error) {
      console.error("Error:", error);
      mainContent.innerHTML = `<div class="error-msg">Error al cargar los cursos.</div>`;
    }
  }

  // ======================================================
  // 🔹 Profesores
  // ======================================================
  async function cargarProfesores() {
    try {
      const response = await fetch("/adminview/api/profesores/");
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
            const response = await fetch("/adminview/api/profesores/crear/", {
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
    if (!row) return;

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
        const response = await fetch(`/adminview/api/profesores/${id}/actualizar/`, {
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
        const response = await fetch(`/adminview/api/profesores/${id}/eliminar/`, {
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
  // 🔹 Agregar Alumno
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

    document.getElementById("volver-cursos")?.addEventListener("click", async () => {
      await cargarVerCursos();
    });

    const form = document.getElementById("form-alumno");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(form);

      try {
        const response = await fetch("/adminview/api/alumnos/registrar/", {
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

  /// ======================================================
  // 🔹 Ver Pagos (Lógica Original - Diseño Lista Moderna)
  // ======================================================
  async function cargarVerPagos() {
    try {
      const response = await fetch("/adminview/api/pagos/");
      if (!response.ok) throw new Error("Error al obtener los pagos");
      const data = await response.json();

      let html = `<div class="finance-dashboard">`; // Contenedor nuevo
      
      // Agregamos metadatos visuales (color/icono) sin tocar la lógica
      const secciones = [
        { titulo: "Pendientes", key: "pendientes", color: "warning", icon: "fa-clock" },
        { titulo: "Pagados", key: "pagados", color: "success", icon: "fa-check-circle" },
        { titulo: "Fallidos", key: "fallidos", color: "danger", icon: "fa-circle-xmark" },
        { titulo: "Reembolsados", key: "reembolsados", color: "neutral", icon: "fa-rotate-left" },
      ];

      secciones.forEach(sec => {
        const pagosPorMes = data[sec.key] || {};
        if (Object.keys(pagosPorMes).length === 0) return;

        // Header de Sección con estilo Badge
        html += `
          <div class="finance-section ${sec.color}">
             <h3 class="section-header">
                <i class="fa-solid ${sec.icon}"></i> ${sec.titulo}
             </h3>
        `;

        Object.entries(pagosPorMes).forEach(([mes, pagos]) => {
          html += `
            <details class="month-group">
              <summary class="month-header">
                 <span class="month-label">${mes}</span>
                 <span class="month-count">${pagos.length} movimientos</span>
              </summary>
              
              <div class="transaction-list">
                ${pagos.map(p => {
                  // Lógica visual simple para avatar (Inicial del nombre)
                  const inicial = p.alumno ? p.alumno.charAt(0).toUpperCase() : "?";
                  
                  return `
                  <div class="transaction-item">
                    <div class="tx-left">
                       <div class="tx-avatar ${sec.color}">${inicial}</div>
                       <div class="tx-info">
                          <div class="tx-name">${p.alumno}</div>
                          <div class="tx-concept">${p.concepto}</div>
                       </div>
                    </div>

                    <div class="tx-right">
                       <div class="tx-date"><i class="fa-regular fa-calendar"></i> ${p.fecha}</div>
                       <div class="tx-amount">$ ${p.monto}</div> 
                    </div>
                  </div>`;
                }).join("")}
              </div>
            </details>`;
        });

        html += `</div>`; // Cierre de finance-section
      });

      html += `</div>`;
      mainContent.innerHTML = html;
      title.textContent = "Historial de Pagos";
      
    } catch (error) {
      console.error("Error al cargar pagos", error);
      mainContent.innerHTML = `<div class="error-msg">Error cargando datos.</div>`;
    }
  }

  // ======================================================
  // 🔹 Comunicados
  // ======================================================
  async function cargarComunicados() {
    title.textContent = "Comunicados";

    mainContent.innerHTML = `
    <div class="comunicados-layout">

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


      <div class="comunicados-lista">

        <div class="header-lista">
          <h3><i class="fa-solid fa-address-book"></i> Listado de Apoderados</h3>

          <div class="tabla-toolbar">
            <input 
              type="text" 
              id="buscar-apoderado" 
              class="input-busqueda"
              placeholder=" Buscar alumno, RUT o apoderado..."
            >
          </div>
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

    // Mostrar/ocultar filtros extra según el destino
    const destino = document.getElementById("destino");
    destino.addEventListener("change", (e) => {
      document.querySelectorAll(".filtro-extra").forEach(div => div.style.display = "none");
      if (e.target.value === "curso") document.getElementById("filtro-curso").style.display = "block";
      if (e.target.value === "alumno") document.getElementById("filtro-alumno").style.display = "block";
      if (e.target.value === "manual") document.getElementById("filtro-manual").style.display = "block";
    });

    // Cargar tabla de apoderados
    await cargarApoderadosEnTabla();

    // ======================================================
    // 🔍 Buscador funcional de apoderados
    // ======================================================
    const buscador = document.getElementById("buscar-apoderado");

    buscador.addEventListener("input", (e) => {
      const term = e.target.value.toLowerCase().trim();
      const filas = document.querySelectorAll("#tabla-apoderados-body tr");

      filas.forEach(row => {
        const texto = row.textContent.toLowerCase();
        row.style.display = texto.includes(term) ? "" : "none";
      });
    });

    // Enviar comunicado
    const form = document.getElementById("form-comunicado");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(form);

      try {
        const response = await fetch("/adminview/api/comunicados/enviar/", {
          method: "POST",
          body: formData,
          headers: { "X-CSRFToken": getCSRFToken() },
        });

        const result = await response.json();
        alert("✅ " + result.message);
        form.reset();
      }
      catch (error) {
        console.error("Error al enviar comunicado:", error);
        alert("❌ Error al conectar con el servidor.");
      }
    });
  }






  async function cargarApoderadosEnTabla() {
    const tbody = document.getElementById("tabla-apoderados-body");
    try {
      const response = await fetch("/adminview/api/apoderados/");
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
// 📅 HORARIOS (Estructura Divs para Responsividad Total)
// ======================================================
async function cargarHorarios() {
    title.textContent = "Horarios de Clases";

    // Pantalla de carga
    mainContent.innerHTML = `
      <div class="card" style="text-align:center; padding:40px;">
        <i class="fa-solid fa-circle-notch fa-spin" style="font-size:2rem; color:var(--primary);"></i>
        <p style="margin-top:15px; color:#666;">Cargando horarios de los profesores...</p>
      </div>
    `;

    try {
      const resp = await fetch("/adminview/api/horarios/");
      if (!resp.ok) throw new Error("No se pudo obtener los horarios");

      const data = await resp.json();
      const profesores = data.profesores || [];

      if (!profesores.length) {
        mainContent.innerHTML = `
        <div class="card" style="text-align:center;">
          <i class="fa-regular fa-calendar-xmark" style="font-size:3rem; color:#ccc; margin-bottom:15px;"></i>
          <h2>Sin Horarios</h2>
          <p>No hay horarios registrados en el sistema.</p>
        </div>`;
        return;
      }

      let html = `<div class="horarios-wrapper">`;

      profesores.forEach(p => {
        html += `
        <details class="horario-card">
            <summary class="horario-header">
                <strong>${p.profesor}</strong>
                <span>${p.horarios.length} BLOQUE(S)</span>
            </summary>

            <div class="horario-body">
                <div class="schedule-head-row">
                    <div class="head-day">DÍA</div>
                    <div class="head-time">HORA</div>
                    <div class="head-subject">ASIGNATURA</div>
                    <div class="head-course">CURSO</div>
                </div>

                <div class="schedule-list-items">
                    ${p.horarios.map(h => `
                    <div class="schedule-item">
                        <div class="item-day">${h.dia}</div>
                        
                        <div class="item-time">
                            <span class="time-start">${h.inicio}</span>
                            <i class="fa-solid fa-arrow-right-long time-arrow"></i>
                            <span class="time-end">${h.termino}</span>
                        </div>
                        
                        <div class="item-subject">${h.asignatura}</div>
                        
                        <div class="item-course">
                            <span class="badge-curso">${h.curso || "—"}</span>
                        </div>
                    </div>`).join("")}
                </div>
            </div>
        </details>
        `;
      });

      html += `</div>`;
      mainContent.innerHTML = html;
      title.textContent = "Horarios de Clases";

    } catch (err) {
      console.error("Error al cargar horarios:", err);
      mainContent.innerHTML = `<div class="card error-card">Error al cargar los horarios.</div>`;
    }
  }
  

  // ======================================================
  // 🔹 NUEVO: Asignaturas (con estilito)
  // ======================================================
  async function cargarAsignaturas() {
    title.textContent = "Asignaturas";

    try {
      const resp = await fetch("/adminview/api/asignaturas/");
      if (!resp.ok) throw new Error("No se pudo obtener las asignaturas");
      const data = await resp.json();

      const asignaturas = data.asignaturas || [];

      let html = `
      <div class="card card-asignaturas">
        <div class="asignaturas-header">
          <div>
            <h2>Asignaturas del colegio</h2>
            <p class="card-subtitle">
              Vista consolidada de ramos por curso y año académico.
            </p>
          </div>
          <span class="badge badge-info">${asignaturas.length} registro(s)</span>
        </div>

        ${asignaturas.length === 0 ? `
          <p class="empty-msg">No hay asignaturas registradas.</p>
        ` : `
          <div class="tabla-toolbar">
            <input 
              type="text" 
              id="buscador-asignaturas" 
              class="input-busqueda" 
              placeholder="Buscar por asignatura, curso o profesor..."
            >
          </div>

          <div class="tabla-wrapper">
            <table class="tabla-generica" id="tabla-asignaturas">
              <thead>
                <tr>
                  <th>Asignatura</th>
                  <th>Curso</th>
                  <th>Año</th>
                  <th>Profesor</th>
                </tr>
              </thead>
              <tbody>
                ${asignaturas.map(a => `
                  <tr>
                    <td>${a.name}</td>
                    <td>${a.curso || "—"}</td>
                    <td>${a.year || "—"}</td>
                    <td>${a.teacher || "—"}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;

      mainContent.innerHTML = html;

      // 🔍 Filtro rápido en la tabla
      const inputBuscador = document.getElementById("buscador-asignaturas");
      if (inputBuscador) {
        const filas = Array.from(
          document.querySelectorAll("#tabla-asignaturas tbody tr")
        );

        inputBuscador.addEventListener("input", (e) => {
          const term = e.target.value.toLowerCase().trim();

          filas.forEach(row => {
            const texto = row.textContent.toLowerCase();
            row.style.display = texto.includes(term) ? "" : "none";
          });
        });
      }

    } catch (err) {
      console.error(err);
      mainContent.innerHTML = `
      <div class="error-msg">
        <i class="fa-solid fa-triangle-exclamation"></i>
        Error al cargar las asignaturas.
      </div>
    `;
    }
  }





// ======================================================
// 🔹 Navegación SPA
// ======================================================
links.forEach(link => {
  link.addEventListener("click", async (e) => {
    e.preventDefault();

    clearActive();
    link.classList.add("active");

    const section = link.getAttribute("data-section");

    switch (section) {

     // ======================================================
      // 🟦 TABLERO (DASHBOARD FINAL - 4 ARRIBA / 2 ABAJO)
      // ======================================================
      case "tablero":
        title.textContent = "Panel de Control";

        // --- 1. Estructura HTML ---
        mainContent.innerHTML = `
          <h1>Bienvenido</h1>
          <p>Resumen general del ecosistema escolar.</p>

          <div class="tarjetas-resumen">
            <div class="tarjeta" id="card-estudiantes">Estudiantes: ...</div>
            <div class="tarjeta" id="card-profesores">Profesores: ...</div>
            <div class="tarjeta" id="card-apoderados">Apoderados: ...</div>
            <div class="tarjeta" id="card-admins">Administrativos: ...</div>
          </div>

          <div class="dashboard-charts">
            
            <div class="chart-box">
              <div class="chart-title">Distribución de Usuarios</div>
              <div class="chart-container"><canvas id="graficoUsuarios"></canvas></div>
            </div>

            <div class="chart-box">
              <div class="chart-title">Estado General de Pagos</div>
              <div class="chart-container"><canvas id="graficoPagos"></canvas></div>
            </div>

            <div class="chart-box">
              <div class="chart-title">Proporción Alumnos / Personal</div>
              <div class="chart-container"><canvas id="graficoRelacion"></canvas></div>
            </div>

            <div class="chart-box">
              <div class="chart-title">Desglose de Cobranza</div>
              <div class="chart-container"><canvas id="graficoDeuda"></canvas></div>
            </div>

            <div class="chart-box" style="grid-column: span 2; height: 450px;">
              <div class="chart-title">Detalle de Matrícula por Curso</div>
              <div class="chart-container"><canvas id="graficoAlumnosNivel"></canvas></div>
            </div>

            

          </div>
        `;

        // --- 2. Configuración Global ---
        Chart.defaults.font.family = "'Poppins', sans-serif";
        Chart.defaults.color = '#64748b';
        Chart.defaults.scale.grid.color = '#f1f5f9';
        
        const tooltipTheme = {
          backgroundColor: '#ffffff', titleColor: '#1c3162', bodyColor: '#64748b',
          borderColor: '#e2e8f0', borderWidth: 1, padding: 12, usePointStyle: true,
          titleFont: { size: 14, family: "'Poppins', sans-serif" }, displayColors: true
        };

        function createGradient(ctx, c1, c2) {
            const g = ctx.createLinearGradient(0, 0, 0, 400);
            g.addColorStop(0, c1); g.addColorStop(1, c2); return g;
        }

        try {
          const resp = await fetch("/adminview/api/dashboard/stats/");
          const stats = await resp.json();

          // Cards
          document.getElementById("card-estudiantes").textContent = `Estudiantes: ${stats.total_students}`;
          document.getElementById("card-profesores").textContent  = `Profesores: ${stats.total_teachers}`;
          document.getElementById("card-apoderados").textContent  = `Apoderados: ${stats.total_guardians}`;
          document.getElementById("card-admins").textContent      = `Administrativos: ${stats.total_admins}`;

          // --- GRÁFICOS SUPERIORES ---

          // 1. Usuarios
          new Chart(document.getElementById("graficoUsuarios"), {
            type: "doughnut",
            data: {
              labels: ["Alumnos", "Profesores", "Apoderados", "Admin"],
              datasets: [{ data: [stats.total_students, stats.total_teachers, stats.total_guardians, stats.total_admins], backgroundColor: ["#1c3162", "#CDA758", "#60a5fa", "#94a3b8"], borderWidth: 4, borderColor: '#ffffff' }]
            },
            options: { responsive: true, maintainAspectRatio: false, cutout: "70%", plugins: { legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8 } }, tooltip: tooltipTheme } }
          });

          // 2. Pagos
          new Chart(document.getElementById("graficoPagos"), {
            type: "pie",
            data: {
              labels: ["Pagados", "Pendientes", "Fallidos"],
              datasets: [{ data: [stats.pagos_pagados, stats.pagos_pendientes, stats.pagos_fallidos], backgroundColor: ["#10b981", "#f59e0b", "#ef4444"], borderWidth: 4, borderColor: '#ffffff' }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8 } }, tooltip: tooltipTheme } }
          });

          // 3. Relación
          const personalTotal = stats.total_teachers + stats.total_admins;
          new Chart(document.getElementById("graficoRelacion"), {
            type: "bar",
            data: {
              labels: ["Alumnos", "Personal"],
              datasets: [{ label: "Personas", data: [stats.total_students, personalTotal], backgroundColor: ["#1c3162", "#CDA758"], borderRadius: 6, barThickness: 40 }]
            },
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: tooltipTheme }, scales: { x: { display: false }, y: { grid: { display: false } } } }
          });

          // 4. Deuda
          new Chart(document.getElementById("graficoDeuda"), {
            type: "polarArea",
            data: {
              labels: ["Pagado", "Pendiente", "Fallido"],
              datasets: [{ data: [stats.pagos_pagados, stats.pagos_pendientes, stats.pagos_fallidos], backgroundColor: ["rgba(16, 185, 129, 0.7)", "rgba(245, 158, 11, 0.7)", "rgba(239, 68, 68, 0.7)"], borderWidth: 1, borderColor: '#fff' }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { r: { grid: { color: '#f0f0f0' }, ticks: { display: false } } }, plugins: { legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8 } }, tooltip: tooltipTheme } }
          });

          // --- GRÁFICOS INFERIORES (ANCHOS) ---

          // 5. MATRÍCULA POR NIVEL (Izquierda)
          const ctxNivel = document.getElementById("graficoAlumnosNivel").getContext('2d');
          const gradNivel = createGradient(ctxNivel, '#CDA758', '#fae8b9');
          
          // Validamos datos
          const nivelesLabels = (stats.niveles_labels && stats.niveles_labels.length) ? stats.niveles_labels : ["Sin datos"];
          const nivelesData = (stats.niveles_data && stats.niveles_data.length) ? stats.niveles_data : [0];

          new Chart(ctxNivel, {
            type: "bar",
            data: {
              labels: nivelesLabels,
              datasets: [{
                label: "Alumnos",
                data: nivelesData,
                backgroundColor: gradNivel,
                borderRadius: 6,
                barThickness: 30
              }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: tooltipTheme }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { precision: 0 } } } }
          });


          

        } catch (error) {
          console.error(error);
          mainContent.innerHTML += `<div class="error-msg">Error cargando gráficos.</div>`;
        }
        break;
      // ======================================================
      // 📚 Otras Secciones
      // ======================================================
      case "estudiantes":
        await cargarVerCursos();
        break;

      case "profesores":
        await cargarProfesores();
        break;

      case "agregar-alumno":
        await cargarAgregarAlumno();
        break;

      case "revision-pagos":
        await cargarVerPagos();
        break;

      case "comunicados":
        await cargarComunicados();
        break;

      case "asignaturas":
        await cargarAsignaturas();
        break;

      case "horarios":
        await cargarHorarios();
        break;

      default:
        mainContent.innerHTML = `
          <h1>${link.textContent}</h1>
          <p>Sección "${section}" en construcción...</p>
        `;
        title.textContent = link.textContent.trim();
    }

    if (isMobile()) closeSidebar();
  });
});


  // ======================================================
  // ⭐ Cargar TABLERO automáticamente al entrar
  // ======================================================
  const linkTablero = document.querySelector('a[data-section="tablero"]');
  if (linkTablero) linkTablero.click();
});



