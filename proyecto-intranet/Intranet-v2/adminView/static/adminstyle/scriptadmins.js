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

      // 4. Itera sobre cada profesor y crea una fila <tr>
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
      }); // Fin del forEach de profesores

      html += `
            </tbody>
          </table>
        </div>`;

      // 5. Inyecta el HTML y actualiza el título
      mainContent.innerHTML = html;
      title.textContent = "Profesores";

      // 6. Asigna el Event Listener para el botón "Nuevo Profesor"
      //    (Debe hacerse DESPUÉS de inyectar el HTML)
      document.getElementById("btn-nuevo-profesor")?.addEventListener("click", () => {
        
        // --- Carga del Formulario de Nuevo Profesor ---
        
        title.textContent = "Agregar Profesor";
        // Reemplaza el contenido por el formulario de registro
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
                <option value="4M">4° Medio</option>
              </select>
              <label>Año:</label>
              <input type="number" name="year" value="2025">
              <div class="form-actions">
                <button type="submit" class="btn-guardar">Registrar Profesor</button>
              </div>
            </form>
          </div>`;

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
      console.error("Error al cargar profesores", error);
      mainContent.innerHTML = `
        <div class="error-msg">
          <i class="fa-solid fa-triangle-exclamation"></i>
          Error al cargar los profesores
        </div>`;
    }
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
      const data = {};
      inputs.forEach(i => data[i.name] = i.value.trim());

      try {
        // Llama a la API de Django (PUT)
        const response = await fetch(`/administrador/api/profesores/${id}/actualizar/`, {
          method: "PUT", // PUT se usa para "Actualizar" un recurso
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCSRFToken(),
          },
          body: JSON.stringify(data),
        });

        const result = await response.json();
        
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
          alert("⚠️ Error: " + (result.error || "No se pudo actualizar."));
        }
      } catch (error) {
        console.error("Error al actualizar:", error);
        alert("❌ No se pudo conectar con el servidor.");
      }
      return; // Termina la función
    }

    // --- ACCIÓN: ELIMINAR ---
    if (btn.classList.contains("btn-eliminar")) {
      const id = row.dataset.id;
      const nombre = row.querySelector('input[name="first_name"]')?.value || "Profesor";

      // Muestra una ventana de confirmación
      if (!confirm(`¿Seguro que deseas eliminar al profesor "${nombre}"?`)) {
        return; // Si el usuario cancela, termina la función
      }

      try {
        // Llama a la API de Django (DELETE)
        const response = await fetch(`/administrador/api/profesores/${id}/eliminar/`, {
          method: "DELETE", // DELETE se usa para "Eliminar" un recurso
          headers: { "X-CSRFToken": getCSRFToken() },
        });

        const result = await response.json();
        
        if (response.ok) {
          // Si se elimina, quita la fila <tr> de la tabla
          row.remove(); 
          alert(`🗑️ Profesor "${nombre}" eliminado correctamente.`);
        } else {
          alert("⚠️ Error: " + (result.error || "No se pudo eliminar."));
        }
      } catch (error) {
        console.error("Error al eliminar:", error);
        alert("❌ No se pudo conectar con el servidor.");
      }
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
    });

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
          method: "POST",
          body: formData,
          headers: { "X-CSRFToken": getCSRFToken() },
        });
        const result = await response.json();
        alert("✅ " + result.message); // Muestra mensaje de éxito
        form.reset(); // Limpia el formulario
      } catch (error) {
        console.error("Error al enviar comunicado:", error);
        alert("❌ Error al conectar con el servidor.");
      }
    });
  } // --- Fin de cargarComunicados ---


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