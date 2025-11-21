<<<<<<< HEAD
/*
================================================================================
|                                                                              |
|               ARCHIVO JAVASCRIPT: Panel de Administración                    |
|               PROYECTO: Intranet Colegio San Agustín (v2.1)                  |
|               AUTOR: Kev182-pixel (Comentado por Asistente)                  |
|                                                                              |
================================================================================
|                                                                              |
|   DESCRIPCIÓN GENERAL:                                                       |
|   Este script maneja toda la lógica de la Single Page Application (SPA)      |
|   para el panel de ADMINISTRACIÓN.                                           |
|                                                                              |
|   FUNCIONALIDAD:                                                             |
|   1.  Manejo de la Sidebar (Menú lateral) responsivo.                        |
|   2.  Navegación dinámica (SPA) que carga vistas (secciones) sin             |
|       recargar la página.                                                    |
|   3.  Renderizado de cada vista (Ver Cursos, Profesores, Pagos, etc.)        |
|       inyectando HTML dinámico en el contenedor principal.                   |
|   4.  Lógica CRUD (Crear, Leer, Actualizar, Eliminar) para Profesores        |
|       mediante 'fetch' a la API de Django.                                   |
|   5.  Manejo de formularios dinámicos (Agregar Alumno, Enviar Comunicado).   |
|   6.  Obtención de token CSRF para peticiones POST/PUT/DELETE seguras.       |
|                                                                              |
================================================================================
*/


// Envolvemos todo el script en un listener 'DOMContentLoaded'.
// Esto es una "buena práctica" crucial. Asegura que el script JavaScript
// no intente ejecutarse (ej: buscar 'getElementById') hasta que el
// documento HTML esté completamente cargado y listo.
document.addEventListener('DOMContentLoaded', () => {

  /*
  ==============================================================================
  | SECCIÓN 1: SELECCIÓN DE ELEMENTOS DEL DOM (CACHE)                          |
  ==============================================================================
  |
  |   Aquí "cacheamos" (guardamos) todos los elementos HTML estáticos que
  |   usaremos repetidamente. Hacemos esto al inicio para que el script
  |   no tenga que buscar ('query') el DOM cada vez que ocurre un evento,
  |   lo cual es una optimización de rendimiento.
  |
  */

  // El contenedor principal de la barra lateral (<aside>).
  const sidebar = document.getElementById('sidebar');
  
  // El botón "hamburguesa" que abre/cierra la sidebar en móvil.
  const toggleBtn = document.getElementById('toggle');
  
  // El fondo oscuro semitransparente que aparece en móvil
  // cuando la sidebar está abierta.
  const overlay = document.getElementById('sidebar-overlay');
  
  // El contenedor principal <section class="content"> donde
  // se "dibujarán" las vistas (SPA).
  const mainContent = document.getElementById('main-content');
  
  // El <h1> en la barra superior (topbar) cuyo texto cambiaremos
  // dinámicamente.
  const title = document.getElementById('topbar-title');


  /*
  ==============================================================================
  | SECCIÓN 2: UTILIDADES (CSRF Token y Helpers)                               |
  ==============================================================================
  */

  /**
   * Obtiene el token CSRF (Cross-Site Request Forgery) de las cookies
   * del navegador.
   *
   * ¿POR QUÉ?
   * Django requiere este token para CUALQUIER petición 'mutante'
   * (POST, PUT, DELETE) como medida de seguridad.
   * Debemos incluirlo en los 'headers' de nuestras peticiones 'fetch'.
   *
   * @returns {string|null} El valor del token CSRF o null si no se encuentra.
   */
  function getCSRFToken() {
    const name = "csrftoken"; // El nombre estándar de la cookie de CSRF en Django
    const cookies = document.cookie.split(";"); // Obtiene todas las cookies
    
    // Itera sobre todas las cookies
    for (let cookie of cookies) {
      cookie = cookie.trim(); // Limpia espacios en blanco
      // Comprueba si esta es la cookie que buscamos
      if (cookie.startsWith(name + "=")) {
        // Devuelve el valor de la cookie
        return cookie.substring(name.length + 1);
      }
    }
    // Si no se encuentra la cookie, devuelve null
    return null;
  }

  /*
  ==============================================================================
  | SECCIÓN 3: LÓGICA DE LA SIDEBAR (MENÚ LATERAL)                             |
  ==============================================================================
  |
  |   Maneja la apertura, cierre y comportamiento responsivo de la
  |   barra de navegación lateral.
  |
  */

  /**
   * Helper que comprueba si estamos en una vista de móvil.
   * @returns {boolean} True si el ancho de la ventana es <= 768px.
   */
  function isMobile() {
    return window.innerWidth <= 768;
  }

  /**
   * Abre la sidebar (en modo móvil).
   * Añade las clases CSS necesarias para mostrar la sidebar,
   * mostrar el overlay y bloquear el scroll del body.
   */
  function openSidebar() {
    sidebar.classList.add('open');
    overlay.classList.add('show');
    document.body.classList.add('no-scroll');
  }

  /**
   * Cierra la sidebar (en modo móvil).
   * Quita las clases CSS de 'open', 'show' y 'no-scroll'.
   */
  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
    document.body.classList.remove('no-scroll');
  }

  // --- Conexión de Eventos de la Sidebar ---

  // 1. Evento de Clic en el Botón Toggle (hamburguesa)
  //    (Usamos '?.') por si el elemento no existe, para evitar errores.
  toggleBtn?.addEventListener('click', () => {
    // Si la sidebar TIENE la clase 'open', ciérrala.
    // Si no la tiene, ábrela.
    sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
  });

  // 2. Evento de Clic en el Overlay (fondo oscuro)
  //    Cierra la sidebar si se hace clic fuera de ella.
  overlay?.addEventListener('click', closeSidebar);

  // 3. Evento de Teclado (Escape)
  //    Permite cerrar la sidebar presionando la tecla 'Esc'.
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSidebar();
    }
  });


  /*
  ==============================================================================
  | SECCIÓN 4: NAVEGACIÓN SPA (Single Page Application)                        |
  ==============================================================================
  |
  |   Este es el "cerebro" de la SPA. Maneja los clics en el menú
  |   y decide qué contenido "dibujar" en la pantalla.
  |
  */

  /**
   * Quita la clase 'active' de TODOS los enlaces y summaries del menú.
   * Esto "resetea" el estado visual antes de activar el nuevo enlace.
   */
  function clearActive() {
    document.querySelectorAll('.menu a, .menu summary').forEach(el => el.classList.remove('active'));
  }

  // Obtenemos todos los enlaces <a> que tienen 'data-section'
  const links = document.querySelectorAll('.menu a[data-section]');
  // Obtenemos todos los <summary> (títulos de desplegables)
  const summaries = document.querySelectorAll('.menu summary');

  // Añadimos un listener a cada <summary>
  summaries.forEach(summary => {
    summary.addEventListener('click', () => {
      // Usamos setTimeout(..., 0) para ejecutar esta lógica
      // DESPUÉS de que el navegador haya procesado el clic
      // y (abierto/cerrado) el <details>.
      setTimeout(() => {
        clearActive(); // Limpia todos los activos
        // Si el <details> (padre del summary) está abierto,
        // marca este summary como 'active'.
        if (summary.parentElement.open) {
          summary.classList.add('active');
        }
      }, 0);
    });
  });

  // --- Router Principal de la SPA ---
  // Iteramos sobre CADA enlace <a> del menú
  links.forEach(link => {
    link.addEventListener('click', async (e) => {
      
      // ¡PREVENIR LA RECARGA DE PÁGINA!
      // Esta es la línea más importante de la SPA.
      // Evita que el navegador intente cargar una nueva página
      // (ej: "/profesorView/estudiantes"), lo que causaría un error 404.
      e.preventDefault();
      
      // 1. Resetea el estado visual de todos los enlaces/summaries
      clearActive();
      // 2. Añade la clase 'active' solo al enlace clickeado
      link.classList.add('active');
      
      // 3. Obtiene el nombre de la sección desde el atributo 'data-section'
      const section = link.getAttribute('data-section');

      // 4. Llama al "Router" (switch) para cargar la vista correcta
      //    Usamos 'await' porque las funciones de carga (ej: cargarVerCursos)
      //    son asíncronas (usan 'fetch').
      switch (section) {
        case 'tablero':
          title.textContent = "Panel de Control";
          mainContent.innerHTML = "<h1>Bienvenido</h1>"; // Vista de ejemplo
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
        
        // Fallback: Si el data-section no coincide con ningún 'case'
        default:
          mainContent.innerHTML = `<h1>${link.textContent}</h1><p>Sección "${section}" en construcción...</p>`;
          title.textContent = link.textContent.trim();
      }

      // 5. Si estamos en móvil, cierra la sidebar después de la navegación.
      if (isMobile()) {
        closeSidebar();
      }
    });
  }); // --- Fin del forEach de enlaces ---


  /*
  ==============================================================================
  | SECCIÓN 5: VISTAS (Renderizadores de Contenido)                            |
  ==============================================================================
  |
  |   Cada una de estas funciones es una "plantilla".
  |   Son responsables de:
  |   1.  Hacer 'fetch' a la API de Django para obtener datos.
  |   2.  Generar el HTML para esa vista.
  |   3.  Inyectar el HTML en el 'mainContent'.
  |   4.  Añadir los 'event listeners' específicos para esa vista.
  |
  */

  // ======================================================
  // 🔹 VISTA 1: Ver Cursos
  // ======================================================
  
  /**
   * Carga y renderiza la vista "Ver Cursos".
   * Obtiene una lista de cursos y sus alumnos desde la API.
   * @async
   */
  async function cargarVerCursos() {
    // Usamos try...catch para manejar errores si el 'fetch' falla
    try {
      // 1. Llama a la API de Django (GET)
      const response = await fetch("/administrador/api/ver_cursos/");
      // Si la respuesta no es OK (ej: 404, 500), lanza un error
      if (!response.ok) throw new Error("Error al obtener los cursos");

      // 2. Parsea la respuesta JSON
      const data = await response.json();
      
      // 3. Comienza a construir el string HTML
      let html = `<div class="ver-cursos">`; // Contenedor principal

      // 4. Itera sobre cada curso recibido
      data.cursos.forEach(c => {
        // Añade un <details> (acordeón) por cada curso
        html += `
          <details class="curso-card">
            <summary class="curso-header">
              <div class="curso-titulo">${c.curso} - ${c.profesor}</div>
            </summary>
            <div class="curso-body">
              <table class="tabla-notas"> <thead>
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
      }); // Fin del forEach de cursos

      html += `</div>`; // Cierra el contenedor principal
      
      // 5. Inyecta el HTML en la página y actualiza el título
      mainContent.innerHTML = html;
      title.textContent = "Ver Cursos";
      
    } catch (error) {
      // 6. Manejo de Errores
      //    Si el 'fetch' falla, muestra un mensaje de error amigable.
      console.error("Error al cargar cursos", error);
      mainContent.innerHTML = `
        <div class="error-msg">
          <i class="fa-solid fa-triangle-exclamation"></i>
          Error al cargar los cursos
        </div>`;
    }
  } // --- Fin de cargarVerCursos ---


  // ======================================================
  // 🔹 VISTA 2: CRUD de Profesores
  // ======================================================

  /**
   * Carga y renderiza la vista "Listado de Profesores".
   * Obtiene la lista de profesores y prepara la tabla para CRUD.
   * @async
   */
  async function cargarProfesores() {
    try {
      // 1. Llama a la API de Django (GET)
      const response = await fetch("/administrador/api/ver_profesores/");
      if (!response.ok) throw new Error("Error al obtener los profesores");

      // 2. Parsea la respuesta JSON
      const data = await response.json();

      // 3. Comienza a construir el HTML
=======
document.addEventListener("DOMContentLoaded", () => {
  // PANEL ADMIN - SPA INTERACTIVA
  // --- Referencias del DOM ---
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('toggle');
  const overlay = document.getElementById('sidebar-overlay');
  const mainContent = document.getElementById('main-content');
  const title = document.getElementById('topbar-title');


  // Helper para obtener el token CSRF
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

  // Funciones básicas
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

  // Botón toggle y overlay 
  toggleBtn?.addEventListener('click', () => {
    sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
  });
  overlay?.addEventListener('click', closeSidebar);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSidebar();
  });

  // Resaltar item activo 
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


  //  Ver Cursos
  async function cargarVerCursos() {
    try {
      const response = await fetch("/adminview/api/cursos/");
      if (!response.ok) throw new Error("Error al obtener los cursos");

      const data = await response.json();
      let html = `<div class="ver-cursos">`;

      data.cursos.forEach(c => {
        html += `
          <details class="curso-card">
            <summary class="curso-header">
              <div class="curso-titulo">${c.curso}</div>
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

  //  Profesores

  async function cargarProfesores() {
    try {
      const response = await fetch("/adminview/api/profesores/");
      if (!response.ok) throw new Error("Error al obtener los profesores");

      const data = await response.json();

>>>>>>> feature/admin-view
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
<<<<<<< HEAD
                <th>Título</th>
=======
         
>>>>>>> feature/admin-view
                <th>Correo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
      `;

<<<<<<< HEAD
      // 4. Itera sobre cada profesor y crea una fila <tr>
=======
>>>>>>> feature/admin-view
      data.profesores.forEach(p => {
        html += `
          <tr data-id="${p.id}">
            <td><input type="text" name="first_name" value="${p.first_name} ${p.last_name}" disabled></td>
            <td><input type="text" name="asignaturas" value="${p.asignaturas}" disabled></td>
<<<<<<< HEAD
            <td><input type="text" name="title" value="${p.title || ''}" disabled></td>
=======

>>>>>>> feature/admin-view
            <td><input type="text" name="email" value="${p.email}" disabled></td>
            <td>
              <div class="acciones">
                <button class="btn-editar">Editar</button>
                <button class="btn-guardar" disabled>Guardar</button>
                <button class="btn-eliminar">Eliminar</button>
              </div>
            </td>
          </tr>`;
<<<<<<< HEAD
      }); // Fin del forEach de profesores
=======
      });
>>>>>>> feature/admin-view

      html += `
            </tbody>
          </table>
        </div>`;

<<<<<<< HEAD
      // 5. Inyecta el HTML y actualiza el título
      mainContent.innerHTML = html;
      title.textContent = "Profesores";

      // 6. Asigna el Event Listener para el botón "Nuevo Profesor"
      //    (Debe hacerse DESPUÉS de inyectar el HTML)
      document.getElementById("btn-nuevo-profesor")?.addEventListener("click", () => {
        
        // --- Carga del Formulario de Nuevo Profesor ---
        
        title.textContent = "Agregar Profesor";
        // Reemplaza el contenido por el formulario de registro
=======
      mainContent.innerHTML = html;
      title.textContent = "Profesores";

      // Botón para nuevo profesor 
      document.getElementById("btn-nuevo-profesor")?.addEventListener("click", () => {
        title.textContent = "Agregar Profesor";
>>>>>>> feature/admin-view
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
<<<<<<< HEAD
=======
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
>>>>>>> feature/admin-view
                <option value="4M">4° Medio</option>
              </select>
              <label>Año:</label>
              <input type="number" name="year" value="2025">
              <div class="form-actions">
                <button type="submit" class="btn-guardar">Registrar Profesor</button>
              </div>
            </form>
          </div>`;

<<<<<<< HEAD
        // 7. Asigna el Event Listener para el botón "Volver"
        //    (Nuevamente, debe hacerse DESPUÉS de inyectar el HTML)
        document.getElementById("volver-profesores")?.addEventListener("click", async () => {
          // Llama a la función original para recargar la tabla
          await cargarProfesores();
        });

        // 8. Asigna el Event Listener para el envío (submit) del formulario
        const form = document.getElementById("form-profesor");
        form.addEventListener("submit", async (e) => {
          // Previene la recarga de página por defecto del formulario
          e.preventDefault(); 
          
          // Convierte los datos del formulario en un objeto JSON
          const formData = Object.fromEntries(new FormData(form).entries());
          // Añade el rol manualmente (el backend lo espera)
          formData.role = "teacher"; 

          try {
            // 9. Llama a la API de Django (POST)
            const response = await fetch("/administrador/api/profesores/crear/", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCSRFToken(), // Incluye el token de seguridad
              },
              body: JSON.stringify(formData), // Envía los datos como JSON
            });

            const result = await response.json(); // Lee la respuesta
            
            if (response.ok) {
              // Si el servidor responde OK...
              alert("✅ Profesor registrado correctamente.");
              await cargarProfesores(); // Vuelve a la lista de profesores
            } else {
              // Si el servidor responde con un error...
              alert("⚠️ Error: " + (result.error || "No se pudo registrar el profesor."));
            }
          } catch (error) {
            // Si el 'fetch' falla (ej: sin conexión)
            console.error("Error:", error);
            alert("❌ No se pudo conectar con el servidor.");
          }
        }); // --- Fin del listener del formulario ---
        
      }); // --- Fin del listener del botón "Nuevo Profesor" ---

    } catch (error) {
      // 10. Manejo de Errores (si la carga inicial de profesores falla)
=======
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
>>>>>>> feature/admin-view
      console.error("Error al cargar profesores", error);
      mainContent.innerHTML = `
        <div class="error-msg">
          <i class="fa-solid fa-triangle-exclamation"></i>
          Error al cargar los profesores
        </div>`;
    }
<<<<<<< HEAD
  } // --- Fin de cargarProfesores ---


  // ======================================================
  // 🔹 DELEGACIÓN DE EVENTOS (Editar / Guardar / Eliminar)
  // ======================================================
  
  /**
   * Se añade un solo Event Listener al contenedor 'mainContent'.
   *
   * ¿POR QUÉ? (Delegación de Eventos)
   * En lugar de añadir 100 listeners (uno por cada botón 'Editar'),
   * añadimos UNO solo al contenedor padre.
   *
   * Este listener "escucha" todos los clics que ocurren dentro.
   * Luego, comprueba si el clic se hizo en un botón que nos
   * interesa (ej: '.btn-editar').
   *
   * Esto es mucho más eficiente y funciona para contenido
   * que se añade dinámicamente (como las filas de la tabla).
   */
  mainContent.addEventListener("click", async (e) => {
    const btn = e.target; // El elemento exacto clickeado (ej: el <i>)
    const row = btn.closest("tr"); // Busca la fila (<tr>) padre más cercana

    // --- FILTRO DE EVENTOS ---
    // Si el clic no fue en uno de los botones que nos importan,
    // o si no se pudo encontrar la fila (row),
    // simplemente ignora el clic y termina la función.
    if (!row || (
        !btn.classList.contains("btn-editar") &&
        !btn.classList.contains("btn-guardar") &&
        !btn.classList.contains("btn-eliminar")
    )) return;

    // --- ACCIÓN: EDITAR ---
    if (btn.classList.contains("btn-editar")) {
      const inputs = row.querySelectorAll("input");
      // Habilita todos los inputs de la fila
      inputs.forEach(i => i.disabled = false); 
      // Habilita el botón "Guardar"
      row.querySelector(".btn-guardar").disabled = false;
      // Añade una clase CSS para el estilo visual (ej: borde azul)
      row.classList.add("editando");
      return; // Termina la función
    }

    // --- ACCIÓN: GUARDAR (Actualizar) ---
    if (btn.classList.contains("btn-guardar")) {
      const id = row.dataset.id; // Obtiene el ID del profesor (del atributo 'data-id')
      const inputs = row.querySelectorAll("input");
      
      // Recolecta los datos de los inputs de la fila
=======
  }

  // Delegación de eventos (Editar / Guardar / Eliminar)

  mainContent.addEventListener("click", async (e) => {
    const btn = e.target;
    const row = btn.closest("tr");

    if (!btn.classList.contains("btn-editar") &&
      !btn.classList.contains("btn-guardar") &&
      !btn.classList.contains("btn-eliminar")) return;
    if (!row) return;

    // EDITAR 
    if (btn.classList.contains("btn-editar")) {
      const inputs = row.querySelectorAll("input");
      inputs.forEach(i => i.disabled = false);
      row.querySelector(".btn-guardar").disabled = false;
      row.classList.add("editando");
      return;
    }

    // GUARDAR 
    if (btn.classList.contains("btn-guardar")) {

      const id = row.dataset.id;
      const inputs = row.querySelectorAll("input");
>>>>>>> feature/admin-view
      const data = {};
      inputs.forEach(i => data[i.name] = i.value.trim());

      try {
<<<<<<< HEAD
        // Llama a la API de Django (PUT)
        const response = await fetch(`/administrador/api/profesores/${id}/actualizar/`, {
          method: "PUT", // PUT se usa para "Actualizar" un recurso
=======
        const response = await fetch(`/adminview/api/profesores/${id}/actualizar/`, {
          method: "PUT",
>>>>>>> feature/admin-view
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCSRFToken(),
          },
          body: JSON.stringify(data),
        });

        const result = await response.json();
<<<<<<< HEAD
        
        if (response.ok) {
          // Feedback visual de éxito
          btn.textContent = "✅ Guardado";
          btn.disabled = true;
          row.classList.remove("editando");
          inputs.forEach(i => i.disabled = true); // Deshabilita los inputs
          
          // Vuelve el botón a su estado original después de 2 segundos
          setTimeout(() => btn.textContent = "Guardar", 2000); 
        } else {
          // Muestra el error del backend
=======
        if (response.ok) {
          btn.textContent = "✅ Guardado";
          btn.disabled = true;
          row.classList.remove("editando");
          inputs.forEach(i => i.disabled = true);
          setTimeout(() => btn.textContent = "💾 Guardar", 2000);
        } else {
>>>>>>> feature/admin-view
          alert("⚠️ Error: " + (result.error || "No se pudo actualizar."));
        }
      } catch (error) {
        console.error("Error al actualizar:", error);
        alert("❌ No se pudo conectar con el servidor.");
      }
<<<<<<< HEAD
      return; // Termina la función
    }

    // --- ACCIÓN: ELIMINAR ---
=======
      return;
    }

    // ELIMINAR 
>>>>>>> feature/admin-view
    if (btn.classList.contains("btn-eliminar")) {
      const id = row.dataset.id;
      const nombre = row.querySelector('input[name="first_name"]')?.value || "Profesor";

<<<<<<< HEAD
      // Muestra una ventana de confirmación
      if (!confirm(`¿Seguro que deseas eliminar al profesor "${nombre}"?`)) {
        return; // Si el usuario cancela, termina la función
      }

      try {
        // Llama a la API de Django (DELETE)
        const response = await fetch(`/administrador/api/profesores/${id}/eliminar/`, {
          method: "DELETE", // DELETE se usa para "Eliminar" un recurso
=======
      if (!confirm(`¿Seguro que deseas eliminar al profesor "${nombre}"?`)) return;

      try {
        const response = await fetch(`/adminview/api/profesores/${id}/eliminar/`, {
          method: "DELETE",
>>>>>>> feature/admin-view
          headers: { "X-CSRFToken": getCSRFToken() },
        });

        const result = await response.json();
<<<<<<< HEAD
        
        if (response.ok) {
          // Si se elimina, quita la fila <tr> de la tabla
          row.remove(); 
=======
        if (response.ok) {
          row.remove();
>>>>>>> feature/admin-view
          alert(`🗑️ Profesor "${nombre}" eliminado correctamente.`);
        } else {
          alert("⚠️ Error: " + (result.error || "No se pudo eliminar."));
        }
      } catch (error) {
        console.error("Error al eliminar:", error);
        alert("❌ No se pudo conectar con el servidor.");
      }
<<<<<<< HEAD
      return; // Termina la función
    }
  }); // --- Fin de la Delegación de Eventos ---


  // ======================================================
  // 🔹 VISTA 3: Agregar Alumno (Formulario)
  // ======================================================

  /**
   * Carga y renderiza el formulario para registrar un nuevo alumno.
   * @async
   */
  async function cargarAgregarAlumno() {
    title.textContent = "Agregar Alumno";

    // 1. Dibuja el HTML del formulario
=======
      return;
    }
  });


  // Agregar Alumno
  async function cargarAgregarAlumno() {
    title.textContent = "Agregar Alumno";

>>>>>>> feature/admin-view
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
<<<<<<< HEAD
            
=======

>>>>>>> feature/admin-view
            <label>Fecha de Nacimiento:</label>
            <input type="date" name="fecha_nacimiento" required>

            <label>Comuna:</label>
            <input type="text" name="comuna" placeholder="Ej: San Antonio">

            <label>Curso:</label>
            <select name="curso" required>
              <option value="">Seleccionar curso...</option>
              <option value="PG">Playgroup</option>
<<<<<<< HEAD
=======
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
>>>>>>> feature/admin-view
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

<<<<<<< HEAD
    // 2. Asigna el Event Listener para el botón "Volver"
    document.getElementById("volver-cursos")?.addEventListener("click", async () => {
      await cargarVerCursos(); // Vuelve a la lista de cursos
    });

    // 3. Asigna el Event Listener para el envío (submit) del formulario
    const form = document.getElementById("form-alumno");
    form.addEventListener("submit", async (e) => {
      e.preventDefault(); // Previene recarga de página
      
      // FormData es ideal para enviar formularios,
      // maneja 'multipart/form-data' si hubiera archivos.
      const formData = new FormData(form);

      try {
        // 4. Llama a la API de Django (POST)
        const response = await fetch("/administrador/api/registrar_alumno/", {
          method: "POST",
          headers: { "X-CSRFToken": getCSRFToken() }, // CSRF Token
          body: formData, // Envía los datos
        });

        const result = await response.json(); // Lee la respuesta

        if (response.ok) {
          alert(result.message || "✅ Alumno registrado correctamente.");
          form.reset(); // Limpia el formulario
        } else {
          alert("⚠️ Error: " + (result.error || "No se pudo registrar el alumno."));
        }
      } catch (error) {
        console.error("Error:", error);
        alert("❌ No se pudo conectar con el servidor.");
      }
    });
  } // --- Fin de cargarAgregarAlumno ---
  
  
  // ======================================================
  // 🔹 VISTA 4: Revisión de Pagos
  // ======================================================

  /**
   * Carga y renderiza la vista "Revisión de Pagos".
   * Obtiene los pagos y los clasifica por estado.
   * @async
   */
  async function cargarVerPagos() {
    try {
      // 1. Llama a la API de Django (GET)
      const response = await fetch("/administrador/api/ver_pagos/");
      if (!response.ok) throw new Error("Error al obtener los pagos");
      const data = await response.json();

      // 2. Comienza a construir el HTML
      let html = `<div class="ver-pagos">`;
      
      // Define las secciones y su orden
      const secciones = [
        { titulo: "Pendientes", key: "pendientes", color: "#f39c12" },
        { titulo: "Pagados", key: "pagados", color: "#2ecc71" },
        { titulo: "Fallidos", key: "fallidos", color: "#e74c3c" },
        { titulo: "Reembolsados", key: "reembolsados", color: "#3498db" },
      ];

      // 3. Itera sobre cada SECCIÓN (Pendientes, Pagados, etc.)
      secciones.forEach(sec => {
        const pagosPorMes = data[sec.key] || {}; // Obtiene los datos para esa sección
        
        // Si no hay pagos en esta sección, no dibuja nada
        if (Object.keys(pagosPorMes).length === 0) return; 

        // Dibuja el título de la sección
        html += `<section class="bloque-pagos">
          <h3 style="color:${sec.color}">${sec.titulo}</h3>`;

        // 4. Itera sobre cada MES dentro de esa sección
        Object.entries(pagosPorMes).forEach(([mes, pagos]) => {
          // Dibuja el <details> (acordeón) para el mes
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
        }); // Fin del forEach de meses

        html += `</section>`;
      }); // Fin del forEach de secciones

      html += `</div>`;
      
      // 6. Inyecta el HTML y actualiza el título
      mainContent.innerHTML = html;
      title.textContent = "Revisión de Pagos";
      
    } catch (error) {
      // 7. Manejo de Errores
      console.error("Error al cargar pagos", error);
      mainContent.innerHTML = `
        <div class="error-msg">
          <i class="fa-solid fa-triangle-exclamation"></i>
          Error al cargar los pagos.
        </div>`;
    }
  } // --- Fin de cargarVerPagos ---
  
  
  // ======================================================
  // 🔹 VISTA 5: Enviar Comunicados
  // ======================================================

  /**
   * Carga y renderiza la vista "Comunicados".
   * Muestra un formulario para enviar y una lista de apoderados.
   * @async
   */
  async function cargarComunicados() {
    title.textContent = "Comunicados";

    // 1. Dibuja el layout de 2 columnas (Formulario y Lista)
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
            <input type="text" id="buscar-apoderado" placeholder=" Buscar alumno, RUT o apoderado... (Función no lista)">
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

    // 2. Asigna el Event Listener para el <select> de "destino"
    //    (para mostrar/ocultar los filtros dinámicos)
    const destino = document.getElementById("destino");
    destino.addEventListener("change", (e) => {
      // Oculta todos los filtros
      document.querySelectorAll(".filtro-extra").forEach(div => div.style.display = "none");
      // Muestra el filtro correspondiente
      if (e.target.value === "curso") document.getElementById("filtro-curso").style.display = "block";
      if (e.target.value === "alumno") document.getElementById("filtro-alumno").style.display = "block";
      if (e.target.value === "manual") document.getElementById("filtro-manual").style.display = "block";
=======
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
>>>>>>> feature/admin-view
    });

<<<<<<< HEAD
    // 3. Carga los datos en la tabla de apoderados (llamada asíncrona)
    await cargarApoderadosEnTabla();

    // 4. Asigna el Event Listener para el envío (submit) del formulario
    const form = document.getElementById("form-comunicado");
    form.addEventListener("submit", async (e) => {
      e.preventDefault(); // Previene recarga de página
      const formData = new FormData(form);
      
      try {
        // 5. Llama a la API de Django (POST)
        const response = await fetch("/administrador/api/enviar_comunicado/", {
=======

  // Ver Pagos

  async function cargarVerPagos() {
    try {
      const response = await fetch("/adminview/api/pagos/");
      if (!response.ok) throw new Error("Error al obtener los pagos");
      const data = await response.json();

      let html = `<div class="ver-pagos">`;
      const secciones = [
        { titulo: "Pendientes", key: "pendientes" },
        { titulo: "Pagados", key: "pagados" },
        { titulo: "Fallidos", key: "fallidos" },
        { titulo: "Reembolsados", key: "reembolsados" },
      ];

      secciones.forEach(sec => {
        const pagosPorMes = data[sec.key] || {};
        if (Object.keys(pagosPorMes).length === 0) return;

        html += `<section class="bloque-pagos">
          <h3>${sec.titulo}</h3>`;

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


  //  Comunicados
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

    //  Buscador de apoderados
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
>>>>>>> feature/admin-view
          method: "POST",
          body: formData,
          headers: { "X-CSRFToken": getCSRFToken() },
        });
<<<<<<< HEAD
        const result = await response.json();
        alert("✅ " + result.message); // Muestra mensaje de éxito
        form.reset(); // Limpia el formulario
      } catch (error) {
        console.error("Error al enviar comunicado:", error);
        alert("❌ Error al conectar con el servidor.");
      }
=======

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



  //  Horarios 
  async function cargarHorarios() {
    title.textContent = "Horarios";

    // pantalla de carga
    mainContent.innerHTML = `
    <div class="card">
      <h2>Horarios</h2>
      <p>Cargando horarios de los profesores...</p>
    </div>
  `;

    try {
      const resp = await fetch("/adminview/api/horarios/");
      if (!resp.ok) throw new Error("No se pudo obtener los horarios");

      const data = await resp.json();
      const profesores = data.profesores || [];

      if (!profesores.length) {
        mainContent.innerHTML = `
        <div class="card">
          <h2>Horarios</h2>
          <p>No hay horarios registrados.</p>
        </div>`;
        return;
      }

      let html = `<div class="horarios-wrapper">`;

      profesores.forEach(p => {
        html += `
      <div class="card horario-card">
        <div class="horario-header">
          <strong>${p.profesor}</strong>
          <span>${p.horarios.length} bloque(s)</span>
        </div>

        <div class="horario-body">
          <table class="tabla-generica">
            <thead>
              <tr>
                <th>Día</th>
                <th>Inicio</th>
                <th>Término</th>
                <th>Asignatura</th>
                <th>Curso</th>
              </tr>
            </thead>
            <tbody>
              ${p.horarios.map(h => `
                <tr>
                  <td>${h.dia}</td>
                  <td>${h.inicio}</td>
                  <td>${h.termino}</td>
                  <td>${h.asignatura}</td>
                  <td>${h.curso || "—"}</td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>
      </div>
      `;
      });

      html += `</div>`;
      mainContent.innerHTML = html;

      // Activar animación después de cargar
      activarAnimacionHorarios();

    } catch (err) {
      console.error(err);
      mainContent.innerHTML = `
      <div class="card">
        <h2>Horarios</h2>
        <p>Error al cargar los horarios.</p>
      </div>
    `;
    }
  }

  // Animación suave al abrir/cerrar bloques de horarios

  function activarAnimacionHorarios() {
    const cards = document.querySelectorAll(".horario-card");

    cards.forEach(card => {
      const header = card.querySelector(".horario-header");
      const body = card.querySelector(".horario-body");

      // Cerrar inicialmente
      body.style.maxHeight = "0px";
      body.style.opacity = "0";

      header.addEventListener("click", () => {
        const isOpen = card.classList.contains("open");

        if (isOpen) {
          // CERRAR
          body.style.maxHeight = body.scrollHeight + "px";
          requestAnimationFrame(() => {
            body.style.maxHeight = "0px";
            body.style.opacity = "0";
          });
          card.classList.remove("open");

        } else {
          // ABRIR
          body.style.maxHeight = body.scrollHeight + "px";
          body.style.opacity = "1";
          card.classList.add("open");

          body.addEventListener("transitionend", () => {
            if (card.classList.contains("open")) {
              body.style.maxHeight = "none";
            }
          }, { once: true });
        }
      });
>>>>>>> feature/admin-view
    });
  } // --- Fin de cargarComunicados ---


<<<<<<< HEAD
  /**
   * Función auxiliar: carga apoderados desde la API
   * y los inyecta en la tabla de la vista "Comunicados".
   * @async
   */
  async function cargarApoderadosEnTabla() {
    const tbody = document.getElementById("tabla-apoderados-body");
    try {
      // 1. Llama a la API
      const response = await fetch("/administrador/api/listar_apoderados/");
      const data = await response.json();

      tbody.innerHTML = ""; // Limpia la tabla
      
      // 2. Manejo de estado vacío
      if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4">No hay apoderados registrados.</td></tr>`;
        return;
      }

      // 3. Itera y dibuja las filas
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
      // 4. Manejo de Errores
      console.error("Error al cargar apoderados:", error);
      tbody.innerHTML = `<tr><td colspan="4">Error al cargar datos.</td></tr>`;
    }
  } // --- Fin de cargarApoderadosEnTabla ---

  
  /*
  ==============================================================================
  | SECCIÓN 6: CÓDIGO HUÉRFANO (resizeRAF)                                     |
  ==============================================================================
  |
  |   Este bloque de código parece estar incompleto o fuera de lugar.
  |   'currentSection' no está definido en este scope.
  |   'renderAdminDashboardChart' no existe.
  |   
  |   Lo comentaré para evitar errores, pero se mantiene como
  |   evidencia del trabajo original.
  |
  */
  /*
  let resizeRAF;
  window.addEventListener('resize', () => {
    // 'currentSection' no está definido aquí, esto causaría un error.
    if (currentSection !== 'tablero') return; 
    cancelAnimationFrame(resizeRAF);
    // 'renderAdminDashboardChart' no está definida aquí.
    resizeRAF = requestAnimationFrame(renderAdminDashboardChart); 
  });
  */
  
}); // --- FIN DE DOMContentLoaded ---
=======

  //Asignaturas

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

      //  Filtro rápido en la tabla
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






// Navegación SPA

links.forEach(link => {
  link.addEventListener("click", async (e) => {
    e.preventDefault();

    // Actualizar estado visual
    clearActive();
    link.classList.add("active");

    const section = link.getAttribute("data-section");

    switch (section) {


      //DASHBOARD

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

            <div class="chart-box" style="grid-column: span 2; height: 450px;">
              <div class="chart-title">Población Estudiantil por Ciclo</div>
              <div class="chart-container"><canvas id="graficoCiclos"></canvas></div>
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


          // 6. DISTRIBUCIÓN POR CICLO (Derecha)
          let preEscolar = 0, basica = 0, media = 0;
          
          // Usamos los mismos datos de niveles para calcular ciclos
          nivelesLabels.forEach((label, i) => {
             const l = label.toLowerCase();
             const count = nivelesData[i];
             if (l.includes('med')) media += count;
             else if (l.includes('bás') || l.match(/\d/)) basica += count;
             else preEscolar += count;
          });

          const ctxCiclos = document.getElementById("graficoCiclos").getContext('2d');
          new Chart(ctxCiclos, {
            type: 'doughnut',
            data: {
              labels: ["Pre-Escolar", "Básica", "Media"],
              datasets: [{
                data: [preEscolar, basica, media],
                backgroundColor: ["#60a5fa", "#1c3162", "#CDA758"], // Celeste, Azul, Dorado
                borderWidth: 0,
                hoverOffset: 15
              }]
            },
            options: {
              responsive: true, maintainAspectRatio: false, cutout: "60%",
              plugins: {
                legend: { position: 'right', labels: { usePointStyle: true, padding: 20, font: {size: 13} } },
                tooltip: tooltipTheme
              },
              layout: { padding: 10 }
            }
          });

        } catch (error) {
          console.error(error);
          mainContent.innerHTML += `<div class="error-msg">Error cargando gráficos.</div>`;
        }
        break;


      //  Otras Secciones
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



  // Cargar TABLERO automáticamente al entrar
  const linkTablero = document.querySelector('a[data-section="tablero"]');
  if (linkTablero) linkTablero.click();
});



>>>>>>> feature/admin-view
