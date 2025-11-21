/*
================================================================================
|                                                                              |
|               ARCHIVO JAVASCRIPT: Panel del Estudiante                       |
|               PROYECTO: Intranet Colegio San Agustín (v2.1)                  |
|               AUTOR: Kev182-pixel (Comentado v4 por Asistente)               |
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
|   4.  ¡NUEVO! Implementación de un "Password Gate" (portal de contraseña)    |
|       para la vista de "Portal de Pagos" por solicitud del cliente.          |
|   5.  ¡NUEVO! Implementación de un temporizador de sesión de 30 minutos      |
|       para el portal de pagos.                                               |
|   6.  ¡NUEVO! Animación de transición al desbloquear el portal.              |
|   7.  Integración con la librería FullCalendar para la vista de Calendario.  |
|   8.  Carga de datos de perfil desde el backend (fetch).                     |
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

  // 'toggleBtn': El botón "hamburguesa" que abre/cierra la sidebar en móvil.
  const toggleBtn = document.getElementById("toggle");
  
  // 'sidebar': El contenedor principal de la barra lateral (<aside>).
  const sidebar = document.getElementById("sidebar");
  
  // 'overlay': El fondo oscuro semitransparente que aparece en móvil
  // cuando la sidebar está abierta.
  const overlay = document.getElementById("overlay");
  
  // 'content': El contenedor principal <main> donde se "dibujarán" las vistas (SPA).
  // Se asume que el ID en el HTML es 'content-area'.
  const content = document.getElementById("content-area"); 
  
  // 'menuLinks': Una NodeList (lista) de TODOS los enlaces <a> dentro del menú
  // que tienen el atributo 'data-section'.
  // IMPORTANTE: Esto ignora el enlace de "Cerrar Sesión", ¡lo cual es correcto!
  const menuLinks = document.querySelectorAll(".menu a[data-section]");
  
  // 'topbarTitle': El <h1> en la barra superior (topbar) cuyo texto cambiaremos
  // dinámicamente al navegar entre vistas.
  const topbarTitle = document.getElementById("topbar-title");

  
  /*
  ==============================================================================
  | SECCIÓN 1.5: GESTIÓN DE ESTADO DEL PORTAL DE PAGOS                         |
  ==============================================================================
  |
  |   Definimos variables para manejar el estado del portal de pagos,
  |   específicamente el temporizador de sesión.
  |
  */

  /**
   * Almacena el ID del temporizador (`setTimeout`).
   * Lo guardamos aquí para poder cancelarlo (con `clearTimeout`)
   * si el usuario bloquea manualmente el portal o navega a otra sección.
   * Inicia como 'null' (sin temporizador activo).
   */
  let paymentPortalTimer = null;

  /**
   * Duración de la sesión del portal de pagos en milisegundos.
   * 30 minutos * 60 segundos/minuto * 1000 milisegundos/segundo
   */
  const PAYMENT_SESSION_DURATION = 30 * 60 * 1000;

  /**
   * Contraseña bruta para desbloquear el portal.
   * Solicitada por el cliente.
   */
  const PORTAL_PASSWORD = "hipona-apo-2025";


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
  } // Fin del if (toggleBtn && sidebar)

  // 2. Evento de Clic en el Overlay (fondo oscuro)
  //    Esto permite al usuario cerrar el menú haciendo clic
  //    en cualquier lugar fuera de él (mejora de UX).
  if (overlay) {
    overlay.addEventListener("click", () => {
      sidebar.classList.remove("open");
      document.body.classList.remove("menu-open");
      overlay.style.display = "none";
    });
  } // Fin del if (overlay)

  /**
   * 3. Función de Manejo de Redimensionamiento (Resize)
   * Esta función se asegura de que si el usuario redimensiona
   * su ventana de móvil a desktop, el menú se "resetee"
   * a su estado de desktop (cerrado, sin overlay).
   */
  function handleResize() {
    // 992px es el punto de ruptura (breakpoint) definido en el CSS.
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
    
    // --- LÓGICA DE SESIÓN DE PAGOS ---
    // Si el usuario navega a CUALQUIER OTRA sección que no sea
    // "pagos", y el temporizador estaba activo, lo cancelamos.
    if (section !== "pagos" && paymentPortalTimer) {
      console.log("Navegando fuera del portal, temporizador de pagos detenido.");
      clearTimeout(paymentPortalTimer);
      paymentPortalTimer = null;
    }
    // ---------------------------------

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

      // ===========================================
      // ¡AQUÍ ESTÁ TU VISTA DE PAGOS!
      // ===========================================
      // Coincide con el data-section="pagos" de tu HTML.
      case "pagos":
        // Comprueba si la sesión de pagos ya está activa (timer corriendo).
        // Si no está activa, muestra la puerta de contraseña.
        if (!paymentPortalTimer) {
          renderPasswordGate(content); // Llama al "portal de contraseña"
        } else {
          // Si la sesión SÍ está activa, muestra el portal directamente.
          renderPortalDePagos(content);
        }
        break;
      // ===========================================

      // Fallback: Si se hace clic en un enlace con un data-section
      // que no tiene un 'case', se muestra este mensaje.
      default:
        content.innerHTML = `<div class="card">Sección "${section}" no implementada aún.</div>`;
        break;
    }
  } // --- Fin de loadSection ---

  /**
   * 5. Conexión de Eventos del Menú (Event Binding)
   * Iteramos sobre CADA enlace <a> que encontramos en el menú
   * (los que guardamos en 'menuLinks') y le asignamos un
   * listener de 'click'.
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
  }); // --- Fin del forEach de menuLinks ---

  
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
    // ¡FIX! Esta función ahora lee la variable 'alumno'
    // que fue definida en el 'student.html'.
    // Esto previene el error "alumno is not defined".
    
    // Se usa un template literal (backticks ``) para escribir HTML
    // de forma multilínea.
    container.innerHTML = `
      <div class*="card animate-in">
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
      <div class="card animate-in">
        <h2 class="card-title"><i class="fa-solid fa-book"></i> Mis Clases</h2>
        <p>Aquí puedes ver las asignaturas en las que estás inscrito.</p>
        <div classd="clases-grid" id="clases-list"></div>
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
      <div class="tabla-card animate-in">
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
      <div class="card animate-in">
        <h2 class="card-title"><i class="fa-solid fa-calendar-days"></i> Calendario de Evaluaciones</h2>
        <div id="calendar" style="margin-top: 20px;"></div>
      </div>
    `;

    // 2. Selecciona el elemento que acabamos de crear
    const calendarEl = container.querySelector("#calendar");

    // 3. Crea una nueva instancia de FullCalendar
    //    'FullCalendar' es un objeto global que se cargó
    //    desde el script en el HTML.
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
      // Usamos una URL relativa a la app 'studentView'
      const res = await fetch("/studentView/api/perfil-data/"); // URL CORREGIDA (suposición)
      
      // Si la respuesta no es 200 (OK), lanza un error
      if (!res.ok) {
        throw new Error(`Error del servidor: ${res.status}`);
      }
      
      const alumno = await res.json(); // Parsea la respuesta JSON

      // 2. Genera el HTML del perfil
      //    Usamos los datos de 'alumno' para rellenar la plantilla.
      container.innerHTML = `
        <div class="perfil-card animate-in">
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


  // ======================================================
  // ¡NUEVA VISTA!
  // 🔹 VISTA: PORTAL DE PAGOS
  // ======================================================

  /**
   * ----------------------------
   * VISTA: PORTAL DE PAGOS (Función Principal)
   * ----------------------------
   * Esta función es la que renderiza la vista de pagos completa
   * (KPIs, Filtros, Tabla de Cuotas) inspirada en la imagen.
   *
   * @param {HTMLElement} container - El elemento .content donde se dibujará.
   */
  function renderPortalDePagos(container) {
    
    // 1. Dibuja el HTML del portal de pagos
    //    Esta estructura HTML coincide con el diseño de la imagen
    //    y será estilizada por las nuevas clases en 'studentstyle.css'.
    //    Añadimos la clase 'animate-in' para la transición.
    container.innerHTML = `
      <div class="kpi-grid animate-in" style="--anim-delay: 0s;">
        <article class="kpi-card">
          <div class="kpi-head">Saldo por pagar</div>
          <div class="kpi-val" id="kpi-saldo">$2.070.000</div>
          <div class="kpi-foot">Total pendiente 2025</div>
        </article>
        <article class="kpi-card">
          <div class="kpi-head">Cuotas pagadas</div>
          <div class="kpi-val" id="kpi-cuotas">3 / 12</div>
          <div class="kpi-foot">Año 2025</div>
        </article>
        <article class="kpi-card">
          <div class="kpi-head">Pendientes</div>
          <div class="kpi-val" id="kpi-pendientes">3</div>
          <div class="kpi-foot">Próximas cuotas</div>
        </article>
        <article class="kpi-card">
          <div class="kpi-head">Atrasadas</div>
          <div class="kpi-val" id="kpi-atrasadas" style="color: var(--status-overdue-text);">6</div>
          <div class="kpi-foot">Cuotas vencidas</div>
        </article>
      </div>

      <div class="payment-card animate-in" style="--anim-delay: 0.1s;">
        
        <header class="payment-header">
          <h3>Detalle 2025</h3>
          <div class="payment-filters">
            <select id="filtro-ano" aria-label="Seleccionar Año">
              <option>2025</option>
              <option>2024</option>
            </select>
            <button class="btn-secondary" id="btn-select-all">Seleccionar todas</button>
            <button class="btn-secondary" id="btn-clear">Limpiar</button>
            <button class="btn-secondary" id="btn-export-csv">Exportar CSV</button>
            
            <button class="btn-lock-portal" id="btn-lock-portal" data-action="lock-portal">
              <i class="fa-solid fa-lock"></i>
              <span>Bloquear Portal</span>
            </button>
            
            <button class="btn-primary" id="btn-pagar-seleccion">Pagar Selección</button>
          </div>
        </header>

        <div class="payment-table-wrapper">
          <table class="payment-table">
            <thead>
              <tr>
                <th class="col-checkbox"><input type="checkbox" id="check-all" aria-label="Seleccionar todo"></th>
                <th>Mes</th>
                <th>Vencimiento</th>
                <th>Monto</th>
                <th>Estado</th>
                <th class="col-acciones">Acciones</th>
              </tr>
            </thead>
            <tbody id="payment-tbody">
              </tbody>
          </table>
        </div> <footer class="payment-footer">
          <details>
            <summary>Información Importante</summary>
            <p>
              Aquí puede ir información relevante sobre el proceso de pago,
              políticas de reembolso o datos de contacto de finanzas.
            </p>
          </details>
        </footer>
        
      </div> `;

    // 2. (PRÓXIMO PASO) Lógica de Fetch y Simulación
    //    Por ahora, solo inyectamos los datos brutos.
    const tbody = container.querySelector("#payment-tbody");
    
    // Datos brutos (Mock Data)
    const cuotas = [
      { mes: "Enero", venc: "10 ene 2025", monto: "230.000", estado: "Pagada" },
      { mes: "Febrero", venc: "10 feb 2025", monto: "230.000", estado: "Pagada" },
      { mes: "Marzo", venc: "10 mar 2025", monto: "230.000", estado: "Pagada" },
      { mes: "Abril", venc: "10 abr 2025", monto: "230.000", estado: "Atrasada" },
      { mes: "Mayo", venc: "10 may 2025", monto: "230.000", estado: "Atrasada" },
      { mes: "Junio", venc: "10 jun 2025", monto: "230.000", estado: "Atrasada" },
      { mes: "Julio", venc: "10 jul 2025", monto: "230.000", estado: "Atrasada" },
      { mes: "Agosto", venc: "10 ago 2025", monto: "230.000", estado: "Atrasada" },
      { mes: "Septiembre", venc: "10 sep 2025", monto: "230.000", estado: "Atrasada" },
      { mes: "Octubre", venc: "10 oct 2025", monto: "230.000", estado: "Pendiente" },
      { mes: "Noviembre", venc: "10 nov 2025", monto: "230.000", estado: "Pendiente" },
      { mes: "Diciembre", venc: "10 dic 2025", monto: "230.000", estado: "Pendiente" },
    ];
    
    let rowsHtml = '';
    // Itera sobre los datos brutos y crea el HTML de la tabla
    cuotas.forEach(cuota => {
      let estadoClass = '';
      // Asigna una clase CSS basada en el estado
      if (cuota.estado === 'Pagada') estadoClass = 'badge-paid';
      if (cuota.estado === 'Atrasada') estadoClass = 'badge-overdue';
      if (cuota.estado === 'Pendiente') estadoClass = 'badge-pending';
    
      rowsHtml += `
        <tr>
          <td class="col-checkbox"><input type="checkbox" aria-label="Seleccionar ${cuota.mes}"></td>
          <td>${cuota.mes}</td>
          <td>${cuota.venc}</td>
          <td class="col-monto">$${cuota.monto}</td>
          <td><span class="badge ${estadoClass}">${cuota.estado}</span></td>
          <td class="col-acciones">
            <button class="btn btn-pagar" ${cuota.estado === 'Pagada' ? 'disabled' : ''}>Pagar</button>
            <button class="btn btn-comprobante" ${cuota.estado !== 'Pagada' ? 'disabled' : ''}>Comprobante</button>
          </td>
        </tr>
      `;
    });
    
    // Inyecta todas las filas en la tabla
    tbody.innerHTML = rowsHtml;
    
    // 3. (PRÓXIMO PASO) Lógica de botones
    //    Aquí se añadirían los listeners para 'btn-pagar-seleccion',
    //    'btn-export-csv', y los botones individuales de "Pagar".
    //    Por ahora, son solo visuales.
    
    // Obtenemos el botón de "Pagar Selección"
    const payButton = container.querySelector("#btn-pagar-seleccion");
    payButton.addEventListener('click', () => {
        // Lógica de simulación (igual que el formulario anterior)
        alert("Iniciando pago por las cuotas seleccionadas...\n\n(Próximo paso: implementar lógica de Transbank)");
    });
    
    // 4. Conectamos el botón de "Bloquear Portal"
    const lockButton = container.querySelector("#btn-lock-portal");
    lockButton.addEventListener('click', () => {
        // Llama a la función que bloquea el portal
        lockPaymentPortal();
    });

  } // --- Fin de renderPortalDePagos ---


  /**
   * ----------------------------
   * VISTA: PORTAL DE CONTRASEÑA (Password Gate)
   * ----------------------------
   * Esta función se activa ANTES que 'renderPortalDePagos'.
   * Pide una contraseña y solo si es correcta,
   * llama a 'renderPortalDePagos'.
   *
   * @param {HTMLElement} container - El elemento .content donde se dibujará.
   */
  function renderPasswordGate(container) {
    
    // 1. Dibuja el HTML del formulario de contraseña
    //    Usamos las clases CSS de la nueva SECCIÓN 8.5
    container.innerHTML = `
      <div class="card password-gate-wrapper animate-in">
        
        <div class="password-gate-icon">
          <i class="fa-solid fa-lock"></i>
        </div>
        
        <h2 class="card-title" style="text-align: center; border: none; padding: 0; margin-bottom: 10px;">
          Acceso Restringido
        </h2>
        
        <p class="gate-subtitle">
          Esta sección es solo para personal autorizado (Apoderados).
          <br>Por favor, ingrese la contraseña de acceso.
        </p>
        
        <form id="form-password-gate" class="password-gate-form">
          <div class="form-group">
            <label for="gate-password">Contraseña de Acceso</label>
            <input type="password" id="gate-password" required>
            
            <p id="gate-error-msg" class="gate-error-text" hidden></p>
          </div>
          
          <button type="submit" class="btn btn-pagar" style="width: 100%;">
            Desbloquear
          </button>
        </form>
        
      </div>
    `;

    // 2. Añadir el Event Listener al formulario de contraseña
    const form = container.querySelector("#form-password-gate");
    const passwordInput = container.querySelector("#gate-password");
    const errorMsg = container.querySelector("#gate-error-msg");
    const cardWrapper = container.querySelector(".password-gate-wrapper");

    form.addEventListener("submit", (e) => {
      e.preventDefault(); // Previene recarga de página
      const password = passwordInput.value;

      // 3. Comprueba la contraseña
      if (password === PORTAL_PASSWORD) {
        // --- ÉXITO ---
        // La contraseña es correcta.
        
        // 1. Inicia el temporizador de sesión de 30 minutos
        startPaymentTimer();
        
        // 2. Ejecuta la animación de salida
        cardWrapper.classList.add('is-fading-out');
        
        // 3. Después de 300ms (ver CSS), reemplaza el contenido
        setTimeout(() => {
          // Llamamos a la función real que renderiza el portal de pagos.
          renderPortalDePagos(container); // 'container' es el mismo <div> .content
        }, 300); // Duración de la animación
      
      } else {
        // --- ERROR ---
        // La contraseña es incorrecta.
        errorMsg.textContent = "Contraseña incorrecta. Intente de nuevo.";
        errorMsg.hidden = false; // Muestra el mensaje de error
        
        // Añade un 'shake' de error al formulario
        cardWrapper.classList.add('shake');
        // Quita la animación después de que termine
        setTimeout(() => {
          cardWrapper.classList.remove('shake');
        }, 500);
      }
    });
  } // --- Fin de renderPasswordGate ---
  

  /*
  ==============================================================================
  | SECCIÓN 5: FUNCIONES DE SESIÓN DEL PORTAL DE PAGOS                         |
  ==============================================================================
  |
  |   Funciones para iniciar el temporizador y bloquear el portal.
  |
  */

  /**
   * Inicia el temporizador de 30 minutos.
   * Si ya existe un temporizador, lo resetea.
   */
  function startPaymentTimer() {
    // 1. Limpia cualquier temporizador antiguo (si existe)
    if (paymentPortalTimer) {
      clearTimeout(paymentPortalTimer);
    }
    
    // 2. Muestra un log en la consola (para depuración)
    console.log("Temporizador de sesión de pagos iniciado (30 min).");

    // 3. Crea el nuevo temporizador
    paymentPortalTimer = setTimeout(() => {
      // 4. Esta función se ejecutará después de 30 minutos
      console.log("Sesión del portal de pagos expirada. Bloqueando...");
      alert("Su sesión en el portal de pagos ha expirado por inactividad.");
      lockPaymentPortal(); // Llama a la función de bloqueo
    }, PAYMENT_SESSION_DURATION); // 30 minutos
  } // --- Fin de startPaymentTimer ---

  /**
   * Bloquea el portal de pagos.
   * Esto limpia el temporizador y vuelve a renderizar
   * la vista de "pagos", que (como el timer está en null)
   * mostrará la puerta de contraseña.
   */
  function lockPaymentPortal() {
    // 1. Limpia el temporizador (si existía)
    if (paymentPortalTimer) {
      clearTimeout(paymentPortalTimer);
    }
    paymentPortalTimer = null; // Resetea el estado
    
    // 2. Llama al router principal
    //    Esto recarga la vista "pagos", que ahora
    //    mostrará 'renderPasswordGate()'.
    loadSection("pagos");
  } // --- Fin de lockPaymentPortal ---
  

  /*
  ==============================================================================
  | SECCIÓN 6: CARGA INICIAL                                                   |
  ==============================================================================
  |
  |   Esta es la línea final que "enciende" la aplicación.
  |   Tu HTML ya no carga el dashboard (está en blanco), por lo que
  |   esta línea es VITAL para mostrar el contenido inicial.
  |
  */
  
  // Carga la vista "dashboard" por defecto al entrar a la página.
  loadSection("dashboard");
  
}); // --- FIN DE DOMContentLoaded ---