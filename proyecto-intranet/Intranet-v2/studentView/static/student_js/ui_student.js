/*
================================================================================
|                                                                              |
|               ARCHIVO JAVASCRIPT: Panel del Estudiante                       |
|               PROYECTO: Intranet Colegio San Agustín (v2.1)                  |
|               AUTOR: Kev182-pixel (Comentado por Asistente)                  |
|                                                                              |
================================================================================
|                                                                              |
|   DESCRIPCIÓN GENERAL:                                                       |
|   Este script maneja toda la lógica de la Single Page Application (SPA)      |
|   para el panel de ESTUDIANTES.                                              |
|                                                                              |
|   FUNCIONALIDAD:                                                             |
|   1.  Manejo de la Sidebar (Menú lateral) responsivo.                        |
|   2.  Navegación dinámica (SPA) que carga vistas (secciones) sin             |
|       recargar la página.                                                    |
|   3.  Renderizado de cada vista (Dashboard, Clases, Notas, etc.)             |
|       inyectando HTML dinámico en el contenedor principal.                   |
|   4.  Integración con la librería FullCalendar para la vista de Calendario.  |
|   5.  Carga de datos de perfil desde el backend (fetch).                     |
|                                                                              |
================================================================================
*/


/**
 * =============================================================================
 * | EVENTO DOMContentLoaded                                                    |
 * =============================================================================
 *
 * Envolvemos toda la aplicación en este listener.
 *
 * ¿POR QUÉ?
 * Esto es una "buena práctica" crucial. Asegura que el script JavaScript
 * no intente ejecutarse (ej: buscar 'getElementById') hasta que el
 * documento HTML esté completamente cargado y listo.
 *
 * Esto previene los comunes errores "Cannot read properties of null"
 * (no se puede leer 'addEventListener' de null) que ocurren cuando el JS
 * se ejecuta antes de que el HTML exista.
 */
document.addEventListener("DOMContentLoaded", () => {

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

  // El botón "hamburguesa" que abre/cierra la sidebar en móvil.
  const toggleBtn = document.getElementById("toggle");
  
  // El contenedor principal de la barra lateral (<aside>).
  const sidebar = document.getElementById("sidebar");
  
  // El fondo oscuro semitransparente que aparece en móvil
  // cuando la sidebar está abierta.
  const overlay = document.getElementById("overlay");
  
  // El contenedor principal <main> donde se "dibujarán" las vistas (SPA).
  // (Tu HTML lo llama 'content' en el CSS, pero el HTML anterior lo llama 'content-area')
  // Basado en tu HTML de Profesor, asumiremos que el ID es 'content-area'.
  const content = document.getElementById("content-area"); 
  
  // Una lista de TODOS los enlaces <a> dentro del menú que
  // tienen el atributo 'data-section'.
  const menuLinks = document.querySelectorAll(".menu a[data-section]");
  
  // El <h1> en la barra superior (topbar) cuyo texto cambiaremos
  // dinámicamente.
  const topbarTitle = document.getElementById("topbar-title");

  
  /*
  ==============================================================================
  | SECCIÓN 2: LÓGICA DE LA SIDEBAR (MENÚ LATERAL)                             |
  ==============================================================================
  |
  |   Maneja la apertura, cierre y comportamiento responsivo de la
  |   barra de navegación lateral.
  |
  */

  // Primero, nos aseguramos de que el botón y la sidebar existan
  // antes de añadir un listener (esto previene errores si el HTML cambia).
  if (toggleBtn && sidebar) {
    
    // 1. Evento de Clic en el Botón Toggle (hamburguesa)
    toggleBtn.addEventListener("click", () => {
      // Alterna la clase 'open' en la sidebar.
      // El CSS en 'studentStyle.css' usa esta clase para
      // animar (transform: translateX(0)) la sidebar.
      sidebar.classList.toggle("open");
      
      // Alterna una clase en el <body> para bloquear el scroll
      // del contenido principal mientras el menú está abierto.
      document.body.classList.toggle("menu-open");

      // Si el overlay (fondo oscuro) existe...
      if (overlay) {
        // Muestra u oculta el overlay basándose en si la sidebar
        // tiene la clase 'open'.
        overlay.style.display = sidebar.classList.contains("open") ? "block" : "none";
      }
    });
  }

  // 2. Evento de Clic en el Overlay (fondo oscuro)
  //    Esto permite al usuario cerrar el menú haciendo clic
  //    en cualquier lugar fuera de él.
  if (overlay) {
    overlay.addEventListener("click", () => {
      sidebar.classList.remove("open");
      document.body.classList.remove("menu-open");
      overlay.style.display = "none";
    });
  }

  /**
   * 3. Función de Manejo de Redimensionamiento (Resize)
   * Esta función se asegura de que si el usuario redimensiona
   * su ventana de móvil a desktop, el menú se "resetee"
   * a su estado de desktop (cerrado, sin overlay).
   */
  function handleResize() {
    // 992px es el punto de ruptura (breakpoint)
    if (window.innerWidth > 992) {
      sidebar.classList.remove("open");
      document.body.classList.remove("menu-open");
      if (overlay) {
        overlay.style.display = "none";
      }
    }
  }
  // Conectamos la función al evento 'resize' del navegador.
  window.addEventListener("resize", handleResize);

  
  /*
  ==============================================================================
  | SECCIÓN 3: NAVEGACIÓN DINÁMICA (Single Page Application - SPA)             |
  ==============================================================================
  |
  |   Este es el "cerebro" de la SPA. Maneja los clics en el menú
  |   y decide qué contenido "dibujar" en la pantalla.
  |
  */

  /**
   * Carga una sección (vista) específica en el contenedor principal.
   * Esta es la función "Router" principal.
   *
   * @param {string} section - El nombre de la sección a cargar (ej: "dashboard", "mis-clases").
   */
  function loadSection(section) {
    
    // 1. Formatear el nombre de la sección para el título
    //    (ej: "mis-clases" -> "Mis clases")
    const title = section.charAt(0).toUpperCase() + section.slice(1).replace("-", " ");
    
    // 2. Actualizar el H1 en la Topbar
    topbarTitle.textContent = title;

    // 3. Mostrar un estado de "Cargando..."
    //    Esto le da feedback inmediato al usuario mientras
    //    las funciones de renderizado (que podrían ser lentas) preparan el HTML.
    content.innerHTML = "<div class='card'>Cargando...</div>";

    // 4. Decidir qué función de renderizado llamar
    //    El 'switch' dirige a la función correcta basada en el
    //    valor de 'section' (obtenido del data-attribute del enlace).
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

      // Fallback: Si se hace clic en un enlace con un data-section
      // que no tiene un 'case', se muestra este mensaje.
      default:
        content.innerHTML = `<div class="card">Sección "${section}" no implementada aún.</div>`;
        break;
    }
  }

  /**
   * 5. Conexión de Eventos del Menú (Event Binding)
   * Iteramos sobre CADA enlace <a> que encontramos en el menú
   * y le asignamos un listener de 'click'.
   */
  menuLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      
      // ¡PREVENIR LA RECARGA DE PÁGINA!
      // Esta es la línea más importante de la SPA.
      // Evita que el navegador intente cargar una nueva página
      // (ej: "/profesorView/estudiantes"), lo que causaría un error 404.
      e.preventDefault();
      
      // Lógica de la clase "active":
      // a. Quita la clase 'active' de TODOS los enlaces...
      menuLinks.forEach((l) => l.classList.remove("active"));
      // b. ...y se la añade solo al enlace en el que se hizo clic.
      link.classList.add("active");
      
      // Obtiene el nombre de la sección desde el atributo 'data-section'
      // (ej: <a href="#" data-section="mis-clases">)
      const section = link.getAttribute("data-section");
      
      // Llama al router principal para cargar el contenido de esa sección.
      loadSection(section);
    });
  });

  
  /*
  ==============================================================================
  | SECCIÓN 4: SECCIONES (Renderizadores de Vistas)                            |
  ==============================================================================
  |
  |   Cada una de estas funciones es una "plantilla".
  |   Son responsables de generar el HTML para una vista específica
  |   e inyectarlo en el 'container' (que es el <div> 'content').
  |
  */

  /**
   * ----------------------------
   * VISTA: DASHBOARD
   * ----------------------------
   * Muestra las tarjetas de bienvenida y KPIs.
   *
   * @param {HTMLElement} container - El elemento .content donde se dibujará.
   */
  function renderDashboard(container) {
    // NOTA DE DESARROLLO: La variable 'alumno' se usa aquí
    // (ej: ${alumno.nombre}), pero no está definida en este scope.
    // Para que funcione, 'alumno' debería ser un objeto global
    // cargado al inicio (ej: con un fetch en la carga inicial).
    // Por ahora, el código fallará con "ReferenceError: alumno is not defined".
    
    // Se usa un template literal (backticks ``) para escribir HTML
    // de forma multilínea.
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
  } // --- Fin de renderDashboard ---

  /**
   * ----------------------------
   * VISTA: MIS CLASES
   * ----------------------------
   * Muestra una grilla con las asignaturas del alumno.
   *
   * @param {HTMLElement} container - El elemento .content donde se dibujará.
   */
  function renderClases(container) {
    // 1. Dibuja el "esqueleto" de la vista (la tarjeta y la grilla vacía).
    container.innerHTML = `
      <div class="card">
        <h2 class="card-title"><i class="fa-solid fa-book"></i> Mis Clases</h2>
        <p>Aquí puedes ver las asignaturas en las que estás inscrito.</p>
        <div class="clases-grid" id="clases-list"></div>
      </div>
    `;

    // 2. Selecciona el contenedor de la lista que acabamos de crear.
    const list = container.querySelector("#clases-list");

    // 3. Simulación de datos (Mock Data).
    //    En una implementación real, esto vendría de un 'fetch'
    //    a la base de datos de Django (similar a 'renderPerfil').
    const clases = [
      { nombre: "Matemáticas", profesor: "Juan Pérez", curso: "1° Medio", año: 2025 },
      { nombre: "Lenguaje y Comunicación", profesor: "Ana Soto", curso: "1° Medio", año: 2025 },
      { nombre: "Ciencias Naturales", profesor: "Carlos Rivera", curso: "1° Medio", año: 2025 },
      { nombre: "Historia y Geografía", profesor: "Marcela Díaz", curso: "1° Medio", año: 2025 },
    ];

    // 4. Manejo de estado vacío (si no hay clases)
    if (clases.length === 0) {
      list.innerHTML = `<p class="no-clases">No tienes asignaturas asignadas actualmente.</p>`;
      return; // Termina la función
    }

    // 5. Itera sobre los datos simulados y crea una tarjeta por cada clase
    clases.forEach((c) => {
      const item = document.createElement("div");
      item.classList.add("clase-card"); // Aplica el estilo .clase-card del CSS
      
      // Define el HTML interno de la tarjeta de clase
      item.innerHTML = `
        <div class="clase-icon"><i class="fa-solid fa-book-open"></i></div>
        <div class="clase-info">
          <h3>${c.nombre}</h3>
          <p><i class="fa-solid fa-chalkboard-user"></i> ${c.profesor}</p>
          <p><i class="fa-solid fa-graduation-cap"></i> ${c.curso} — ${c.año}</p>
        </div>
      `;
      // Añade la nueva tarjeta a la grilla
      list.appendChild(item);
    });
  } // --- Fin de renderClases ---

  /**
   * ----------------------------
   * VISTA: TAREAS / NOTAS
   * ----------------------------
   * Muestra una tabla con las notas del alumno.
   *
   * @param {HTMLElement} container - El elemento .content donde se dibujará.
   */
  function renderNotas(container) {
    // 1. Dibuja el "esqueleto" de la tabla (encabezados <thead>)
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

    // 2. Datos simulados (Mock Data)
    //    Esto debe ser reemplazado por una llamada (fetch) al backend.
    const data = [
      { asignatura: "Matemáticas", notas: ["--", "--", "--", "--", "--", "--", "--"], promedio: "--" },
      { asignatura: "Lenguaje y Comunicación", notas: ["--", "--", "--", "--", "--", "--", "--"], promedio: "--" },
      { asignatura: "Ciencias Naturales", notas: ["--", "--", "--", "--", "--", "--", "--"], promedio: "--" },
      { asignatura: "Historia y Geografía", notas: ["--", "--", "--", "--", "--", "--", "--"], promedio: "--" },
      { asignatura: "Educación Física", notas: ["--", "--", "--", "--", "--", "--", "--"], promedio: "--" },
      { asignatura: "Inglés", notas: ["--", "--", "--", "--", "--", "--", "--"], promedio: "--" },
    ];

    // 3. Selecciona el <tbody> que acabamos de crear
    const tbody = container.querySelector("#tabla-body");

    // 4. Itera sobre los datos y crea una fila (<tr>) por cada materia
    data.forEach((materia) => {
      const row = document.createElement("tr");
      // Genera el HTML de la fila
      row.innerHTML = `
        <td>${materia.asignatura}</td>
        ${materia.notas.map(nota => `<td>${nota}</td>`).join("")}
        <td><strong>${materia.promedio}</strong></td>
      `;
      // Añade la fila completa al <tbody>
      tbody.appendChild(row);
    });
  } // --- Fin de renderNotas ---

  /**
   * ----------------------------
   * VISTA: CALENDARIO
   * ----------------------------
   * Inicializa la librería FullCalendar.
   *
   * @param {HTMLElement} container - El elemento .content donde se dibujará.
   */
  function renderCalendario(container) {
    // 1. Dibuja el contenedor de la tarjeta y el <div>
    //    donde FullCalendar se "adjuntará".
    container.innerHTML = `
      <div class="card">
        <h2 class="card-title"><i class="fa-solid fa-calendar-days"></i> Calendario de Evaluaciones</h2>
        <div id="calendar" style="margin-top: 20px;"></div>
      </div>
    `;

    // 2. Selecciona el elemento que acabamos de crear
    const calendarEl = container.querySelector("#calendar");

    // 3. Crea una nueva instancia de FullCalendar
    //    (Esto asume que el script de FullCalendar se cargó
    //    correctamente en el <head> del HTML).
    const calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: "dayGridMonth", // Vista de mes por defecto
      height: "auto",              // Altura automática
      locale: "es",                // Idioma español
      
      // Configura los botones de la barra de herramientas
      headerToolbar: {
        left: "prev,next today",
        center: "title",
        right: "dayGridMonth,timeGridWeek,timeGridDay"
      },
      
      // Aquí es donde se cargarían los eventos desde la base de datos
      events: [], // (ej: fetch('/api/evaluaciones/'))
      
      selectable: true, // Permite hacer clic en los días
      
      // --- Eventos Interactivos (Simulados) ---
      
      // Se ejecuta al hacer clic en un DÍA
      dateClick: function(info) {
        const title = prompt(`📘 Ingresa el nombre de la evaluación para el ${info.dateStr}:`);
        if (title) { // Si el usuario escribió algo
          calendar.addEvent({
            title: title,
            start: info.dateStr,
            allDay: true
          });
        }
      },
      
      // Se ejecuta al hacer clic en un EVENTO existente
      eventClick: function(info) {
        if (confirm(`¿Eliminar la evaluación "${info.event.title}"?`)) {
          info.event.remove(); // Elimina el evento del calendario
        }
      },
    });

    // 4. "Dibuja" el calendario en la pantalla.
    calendar.render();
  } // --- Fin de renderCalendario ---

  /**
   * ----------------------------
   * VISTA: PERFIL
   * ----------------------------
   * Carga y muestra la información del estudiante.
   *
   * @param {HTMLElement} container - El elemento .content donde se dibujará.
   */
  async function renderPerfil(container) {
    // 1. Carga de datos (Simulación de Fetch)
    //    Esta función es 'async' (asíncrona).
    //    'await fetch(...)' pausará la función hasta que
    //    el servidor responda.
    //    NOTA: Esta URL '/dashboard/perfil-data/' debe existir
    //    en tu 'urls.py' de Django.
    
    // ---------------------------------------------------------------
    // INICIO DE BLOQUE TRY/CATCH
    // Es crucial "intentar" (try) un fetch, y "capturar" (catch)
    // el error si el servidor falla o no responde.
    try {
      const res = await fetch("/dashboard/perfil-data/");
      
      // Si la respuesta no es 200 (OK), lanza un error
      if (!res.ok) {
        throw new Error(`Error del servidor: ${res.status}`);
      }
      
      const alumno = await res.json(); // Parsea la respuesta JSON

      // 2. Genera el HTML del perfil
      //    Usamos los datos de 'alumno' para rellenar la plantilla.
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
      
    } catch (error) {
      // 3. Manejo de Errores (si el 'fetch' falla)
      console.error("Error al cargar el perfil:", error);
      container.innerHTML = `
        <div class="card">
          <h2 class="card-title" style="color: #c0392b;">Error al cargar el perfil</h2>
          <p>No se pudo conectar con el servidor para obtener tu información.</p>
          <p style="color: #777; margin-top: 10px;"><i>Detalle: ${error.message}</i></p>
        </div>
      `;
    } // --- Fin de TRY/CATCH ---
    
  } // --- Fin de renderPerfil ---


  /*
  ==============================================================================
  | SECCIÓN 5: CARGA INICIAL                                                   |
  ==============================================================================
  |
  |   Esta es la línea final que "enciende" la aplicación.
  |   Llama a 'loadSection' con "dashboard" para que el usuario
  |   siempre aterrice en la vista principal al cargar la página.
  |
  */
  
  // Carga la vista "dashboard" por defecto al entrar a la página.
  loadSection("dashboard");
  
}); // --- FIN DE DOMContentLoaded ---