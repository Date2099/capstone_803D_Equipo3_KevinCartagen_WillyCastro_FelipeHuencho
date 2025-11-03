/*
================================================================================
|                                                                              |
|                    SISTEMA DE GESTIÓN DE PROFESORES (SPA)                    |
|                    ARCHIVO: teacher_jss.js                                   |
|                    AUTOR: Kev182-pixel (Refactorizado por Asistente)         |
|                                                                              |
================================================================================
|                                                                              |
|   DESCRIPCIÓN:                                                               |
|   Este script maneja toda la lógica de la Single Page Application (SPA)      |
|   para el panel de profesores. Utiliza un Patrón Módulo (IIFE) para          |
|   encapsular el estado y la lógica, previniendo conflictos con el            |
|   scope global.                                                              |
|                                                                              |
|   ARQUITECTURA DEL SCRIPT:                                                   |
|   1.  DOMContentLoaded Wrapper: Asegura que el script no se ejecute          |
|       hasta que el DOM esté completamente cargado. (FIX 404 BUG)             |
|   2.  IIFE (Immediately Invoked Function Expression): Crea un scope privado. |
|   3.  Estado de la App: Definición de variables globales del módulo.         |
|   4.  Utilidades y Datos por Defecto: Funciones helper y datos demo.         |
|   5.  Gestión de Estado (_state): Lógica para cargar/guardar en localStorage.|
|   6.  Lógica de Cálculo (_logic): Funciones puras para calcular promedios.   |
|   7.  Renderizado de Vistas (_views): Funciones que generan HTML.            |
|   8.  Manejadores de Eventos (_handlers): Lógica de qué hacer en un evento.  |
|   9.  Binding de Eventos: Conecta los handlers a los elementos del DOM.      |
|   10. Init: Función de arranque que orquesta todo.                           |
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
 * Este es el **arreglo principal para el bug 404 y el ReferenceError**. 
 * Los errores ocurrían porque el script original intentaba buscar elementos
 * del DOM (como `document.getElementById('toggle')`) ANTES de que el HTML 
 * existiera, o intentaba usar variables antes de ser definidas.
 *
 * Al envolver todo aquí, garantizamos que el JavaScript no se ejecutará
 * hasta que cada elemento (<a>, <button>, <div>, etc.) esté cargado y 
 * listo en la página.
 */
document.addEventListener('DOMContentLoaded', () => {

  /**
   * ===========================================================================
   * | PATRÓN MÓDULO (IIFE)                                                     |
   * ===========================================================================
   *
   * Creamos una función anónima que se ejecuta a sí misma.
   * (function() { ... })();
   *
   * ¿POR QUÉ?
   * Esto crea un "scope" o "ámbito" privado. Todas las variables definidas
   * aquí (DOM, state, _logic, etc.) NO son accesibles desde la consola
   * o desde otros scripts (como Chart.js). Esto previene bugs,
   * conflictos de nombres y es una práctica de desarrollo profesional.
   */
  (function() {
    
    // 'use strict'; // Descomenta esto para un modo de JS más estricto

    /*
    ============================================================================
    | SECCIÓN 1: ESTADO Y VARIABLES GLOBALES DEL MÓDULO                       |
    ============================================================================
    |
    | Aquí definimos las variables que persistirán durante toda la
    | vida de la aplicación.
    |
    */

    /**
     * @typedef {Object} DOMCache
     * @property {HTMLElement} contentEl - El contenedor principal <main class="content">.
     * @property {HTMLElement} sidebar - El <aside class="sidebar">.
     * @property {HTMLElement} toggleBtn - El <button id="toggle">.
     * @property {MediaQueryList} mq - El objeto de media query para responsive.
     * @property {HTMLElement} menu - El <nav class="menu">.
     * @property {NodeListOf<HTMLAnchorElement>} menuLinks - Todos los <a> en el menú.
     * @property {HTMLElement} topbarTitle - El <h1 class="topbar-title">.
     * @property {HTMLElement} userNameMini - El <span> del mini perfil.
     * @property {HTMLElement} profileName - El <div> del nombre en la sidebar.
     * @property {HTMLElement} profileRole - El <div> del rol en la sidebar.
     */
    
    /**
     * Almacén de elementos del DOM.
     * Se rellena en la función `cacheDom()` al inicio.
     * Usar esto es mucho más rápido que hacer `document.querySelector`
     * repetidamente.
     * @type {DOMCache}
     */
    const DOM = {};

    /**
     * Clave para el `localStorage`.
     * Cambiar esto invalida los datos guardados de los usuarios.
     */
    const STORAGE_KEY = 'profesores_state_v4_courses';

    /**
     * Referencia global al objeto Chart.js activo.
     * Necesitamos guardarlo aquí para poder destruirlo (`chart.destroy()`)
     * antes de dibujar un gráfico nuevo.
     */
    let chart = null;

    /**
     * Almacena el estado global de la aplicación.
     * Se inicializa vacío y se rellena con `_state.load()`.
     */
    let state = {};

    /**
     * Almacena la fecha (Mes/Año) que se está viendo en el calendario.
     * Se resetea a "hoy" cada vez que se entra a la vista de calendario.
     */
    let currentMonthView = new Date();


    /*
    ============================================================================
    | SECCIÓN 2: UTILIDADES Y DATOS POR DEFECTO                                |
    ============================================================================
    |
    | Este es el orden corregido (FIX ReferenceError):
    | Definimos las utilidades y los datos por defecto ANTES de que
    | cualquier función (como `_state.load`) intente usarlos.
    |
    */
    
    /**
     * Objeto _utils: Contiene funciones "helper" puras.
     */
    const _utils = {
      /**
       * Generador de IDs únicos para nuevas evaluaciones, etc.
       * @param {string} [prefix='ev-'] - Un prefijo para el ID.
       * @returns {string} Un ID pseudo-aleatorio.
       */
      genId: (prefix = 'ev-') => prefix + Math.random().toString(36).slice(2, 11),

      /**
       * Devuelve la fecha de hoy (o con un desfase) en formato AAAA-MM-DD.
       * @param {number} [offsetDays=0] - Días a sumar o restar de hoy.
       * @returns {string} La fecha en formato ISO (YYYY-MM-DD).
       */
      todayISO: (offsetDays = 0) => {
        const d = new Date();
        d.setDate(d.getDate() + offsetDays);
        return d.toISOString().slice(0, 10);
      },

      /**
       * Escapa HTML para prevenir ataques XSS (Cross-Site Scripting).
       * @param {string} [s=''] - El string a escapar.
       * @returns {string} El string seguro.
       */
      escapeHtml: (s = '') => {
        return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
      }
    };

    /**
     * El estado por defecto de la aplicación.
     * Este objeto es crucial, ya que define la "forma" de nuestros datos.
     */
    const defaultState = {
      teacher: { id: 'T-1234', name: 'Juan Pérez', email: 'juan.perez@colegio.cl', subject: 'Matemáticas', phone: '+56912345678', bio: 'Profesor titular de Matemáticas. Apasionado por la experimentación y el aprendizaje práctico.', avatarColor: '#6d28d9' },
      students: [
        { id: 'S-001', name: 'Ana Contreras' }, { id: 'S-002', name: 'Benjamín Soto' },
        { id: 'S-003', name: 'Carlos Díaz' }, { id: 'S-004', name: 'Daniela Espinoza' },
        { id: 'S-005', name: 'Elena Morales' }, { id: 'S-006', name: 'Felipe Rojas' }
      ],
      courses: [
        { id: 'C-01', name: 'Matemáticas 4to B', studentIds: ['S-001', 'S-002', 'S-003', 'S-005'] },
        { id: 'C-02', name: 'Física 4to B', studentIds: ['S-001', 'S-004', 'S-006'] }
      ],
      evaluations: [
        { id: 'ev-m1', name: 'Prueba 1', date: _utils.todayISO(-10), courseId: 'C-01' },
        { id: 'ev-m2', name: 'Tarea 1', date: _utils.todayISO(-5), courseId: 'C-01' },
        { id: 'ev-f1', name: 'Laboratorio 1', date: _utils.todayISO(-8), courseId: 'C-02' },
        { id: 'ev-f2', name: 'Prueba de Química', date: _utils.todayISO(-2), courseId: 'C-02' }
      ],
      grades: {
        'S-001': { 'ev-m1': 6.5, 'ev-m2': 7.0, 'ev-f1': 6.8, 'ev-f2': 7.0 },
        'S-002': { 'ev-m1': 5.4, 'ev-m2': 6.0 },
        'S-003': { 'ev-m1': 4.1 },
        'S-004': { 'ev-f1': 7.0, 'ev-f2': 6.2 },
        'S-005': { 'ev-m1': 6.8, 'ev-m2': 6.5 },
        'S-006': { 'ev-f1': 5.5, 'ev-f2': 5.9 }
      },
      announcements: [
        { id: _utils.genId('an-'), title: 'Reunión de Apoderados', content: 'Se les recuerda que la reunión de apoderados será el próximo viernes a las 18:00 hrs en la sala de conferencias.', date: _utils.todayISO(-2) }
      ]
    };


    /*
    ============================================================================
    | SECCIÓN 3: MÓDULO DE LÓGICA DE ESTADO (_state)                           |
    ============================================================================
    |
    | Contiene funciones para cargar y guardar el estado de la aplicación
    | en el `localStorage` del navegador.
    |
    */
    const _state = {
      /**
       * Carga el estado desde localStorage.
       * Si no hay estado, crea uno nuevo usando `defaultState`.
       * @returns {object} El estado de la aplicación.
       */
      load: () => {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (!raw) {
            _state.save(defaultState); // Ahora `defaultState` SÍ existe.
            return JSON.parse(JSON.stringify(defaultState));
          }
          const savedState = JSON.parse(raw);
          return { ...defaultState, ...savedState, teacher: { ...defaultState.teacher, ...(savedState.teacher || {}) } };
        } catch (e) {
          console.error('Error al cargar estado', e);
          return JSON.parse(JSON.stringify(defaultState));
        }
      },

      /**
       * Guarda el estado actual en localStorage.
       * @param {object} [newState=state] - El objeto de estado que se va a guardar.
       */
      save: (newState = state) => {
        state = newState; // Actualiza la variable 'state' local
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }
    };
    
    // INICIALIZACIÓN DEL ESTADO: Ahora que _state y defaultState existen,
    // podemos cargar el estado de forma segura.
    state = _state.load();


    /*
    ============================================================================
    | SECCIÓN 4: MÓDULO DE LÓGICA DE CÁLCULO (_logic)                          |
    ============================================================================
    |
    | Contiene funciones "puras" para calcular datos.
    | Estas funciones no modifican el DOM, solo toman datos y devuelven
    | nuevos datos.
    |
    */
    const _logic = {
      /**
       * Calcula el promedio de una evaluación específica.
       * @param {string} evalId - El ID de la evaluación.
       * @returns {number|NaN} El promedio, o NaN si no hay notas.
       */
      getAverageForEval: (evalId) => {
        const grades = Object.values(state.grades)
          .map(sGrades => sGrades[evalId])
          .filter(g => g !== undefined && g !== null);
        return grades.length ? grades.reduce((a, b) => parseFloat(a) + parseFloat(b), 0) / grades.length : NaN;
      },
      
      /**
       * Calcula los KPIs (Métricas Clave) para el Dashboard.
       * @returns {object} Un objeto con {overall, best, worst, bestName, worstName}.
       */
      getEvaluationMetrics: () => {
        const evalData = state.evaluations.map(ev => ({
          name: ev.name,
          avg: _logic.getAverageForEval(ev.id)
        })).filter(ev => !isNaN(ev.avg));
        
        if (evalData.length === 0) return { overall: 'N/A', best: 'N/A', worst: 'N/A', bestName: '-', worstName: '-' };
        
        const overall = evalData.reduce((acc, ev) => acc + ev.avg, 0) / evalData.length;
        let best = evalData[0], worst = evalData[0];
        evalData.forEach(ev => {
          if (ev.avg > best.avg) best = ev;
          if (ev.avg < worst.avg) worst = ev;
        });
        
        return {
          overall: overall.toFixed(2),
          best: best.avg.toFixed(2),
          worst: worst.avg.toFixed(2),
          bestName: best.name,
          worstName: worst.name
        };
      },

      /**
       * Calcula el promedio de un estudiante en un curso específico.
       * @param {string} studentId - ID del estudiante.
       * @param {string} courseId - ID del curso.
       * @returns {number|NaN} El promedio del curso.
       */
      computeCourseAverage: (studentId, courseId) => {
        const studentGrades = state.grades[studentId] || {};
        const courseEvalIds = state.evaluations.filter(ev => ev.courseId === courseId).map(ev => ev.id);
        const grades = courseEvalIds.map(evalId => studentGrades[evalId]).filter(g => g !== undefined && g !== null && g !== '');
        if (!grades.length) return NaN;
        return grades.reduce((a, b) => parseFloat(a) + parseFloat(b), 0) / grades.length;
      },

      /**
       * Calcula el promedio general de un estudiante (en todos sus cursos).
       * @param {string} studentId - ID del estudiante.
       * @returns {number|NaN} El promedio general.
       */
      computeOverallStudentAverage: (studentId) => {
        const studentGrades = state.grades[studentId] || {};
        const grades = Object.values(studentGrades).filter(g => g !== undefined && g !== null && g !== '');
        if (!grades.length) return NaN;
        return grades.reduce((a, b) => parseFloat(a) + parseFloat(b), 0) / grades.length;
      }
    };

    
    /*
    ============================================================================
    | SECCIÓN 5: MÓDULO DE VISTAS (_views)                                     |
    ============================================================================
    |
    | Contiene funciones que generan HTML y lo inyectan en el DOM.
    | Estas funciones son el "Router" de nuestra SPA.
    |
    */
    const _views = {
      
      /**
       * Función "Router" principal.
       * Recibe un 'target' (ej: 'dashboard') y llama a la
       * función de renderizado correspondiente.
       * @param {string} target - El nombre de la vista a renderizar.
       */
      renderContent: (target) => {
        target = (target || 'dashboard').replace(/^\/+/, '');
        // Busca la función de renderizado en este mismo objeto (ej: _views.dashboard)
        const renderFn = _views[target] || _views['dashboard'];
        
        if (target === 'calendario') {
          currentMonthView = new Date();
        }
        
        // Ejecuta la función de renderizado
        renderFn();
      },

      /**
       * VISTA 1: DASHBOARD
       * Renderiza la vista principal (KPIs, Gráfico, Tareas).
       */
      dashboard: () => {
        const metrics = _logic.getEvaluationMetrics();
        DOM.contentEl.innerHTML = `
          <div class="grid">
            <div class="kpi students"><i class="fa-solid fa-user-graduate fa-2x"></i><div><div class="num" id="kpi-students-count">--</div><div>Estudiantes Totales</div></div></div>
            <div class="kpi classes"><i class="fa-solid fa-chalkboard fa-2x"></i><div><div class="num" id="kpi-courses-count">--</div><div>Clases Activas</div></div></div>
          </div>
          <div class="grid" style="grid-template-columns: 2fr 1fr; margin-top: 1.5rem; align-items: flex-start;">
            <div class="card">
              <h3>Rendimiento de Evaluaciones</h3>
              <div class="mini-kpi-grid">
                <div class="mini-kpi"><span class="label">Promedio General</span><span class="value" style="color: var(--primary);">${metrics.overall}</span></div>
                <div class="mini-kpi"><span class="label" title="${_utils.escapeHtml(metrics.bestName)}">Mejor Eval. (${_utils.escapeHtml(metrics.bestName)})</span><span class="value" style="color: var(--accent);">${metrics.best}</span></div>
                <div class="mini-kpi"><span class="label" title="${_utils.escapeHtml(metrics.worstName)}">Peor Eval. (${_utils.escapeHtml(metrics.worstName)})</span><span class="value" style="color: var(--muted);">${metrics.worst}</span></div>
              </div>
              <div class="chart-wrap" style="height: 260px;"><canvas id="dashboard-chart"></canvas></div>
            </div>
            <div class="card">
              <h3>Tareas Pendientes (Demo)</h3>
              <ul class="task-list">
                <li><strong>Calificar Ensayo</strong><div>Curso: 8vo Básico - Vence Hoy</div></li>
                <li><strong>Preparar Guía N°5</strong><div>Curso: 7mo A - Vence Mañana</div></li>
                <li><strong>Revisar Proyectos</strong><div>Curso: 8vo A - Vence en 3 días</div></li>
              </ul>
            </div>
          </div>
          <div style="margin-top:1rem; padding-top: 1rem; border-top: 1px solid var(--border); text-align: right;"><button data-action="reset-data" class="btn btn-secondary">Resetear datos (demo)</button></div>`;
        
        // Rellena los KPIs y dibuja el gráfico.
        try {
          document.getElementById('kpi-students-count').textContent = state.students.length;
          document.getElementById('kpi-courses-count').textContent = state.courses.length;
        } catch (e) {
          console.warn("No se pudieron rellenar los KPIs a tiempo.", e);
        }
        
        _views.renderDashboardChart();
      },

      /**
       * Dibuja el gráfico de barras del Dashboard.
       */
      renderDashboardChart: () => {
        const canvas = document.getElementById('dashboard-chart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (chart) chart.destroy();

        const labels = state.evaluations.map(ev => ev.name);
        const averages = state.evaluations.map(ev => _logic.getAverageForEval(ev.id));

        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#0F294C';
        const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#CDA758';
        const borderColor = getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || 'rgba(0,0,0,0.1)';

        chart = new Chart(ctx, {
          type: 'bar', // Gráfico de Barras
          data: {
            labels,
            datasets: [{
              label: 'Promedio',
              data: averages,
              backgroundColor: primaryColor,
              borderColor: primaryColor,
              borderWidth: 1,
              borderRadius: 4,
              hoverBackgroundColor: accentColor
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
              legend: { display: false },
              tooltip: {
                backgroundColor: 'var(--ink-2, #111827)',
                titleColor: 'var(--accent, #CDA758)',
                bodyColor: '#ffffff',
                displayColors: false,
                callbacks: { 
                  label: (context) => `Promedio: ${context.parsed.y.toFixed(2)}`
                }
              }
            },
            scales: {
              y: {
                min: 1, max: 7,
                ticks: { stepSize: 1, padding: 10, color: 'var(--muted)' },
                grid: { drawBorder: false, color: borderColor }
              },
              x: {
                ticks: { padding: 10, color: 'var(--muted)' },
                grid: { display: false }
              }
            }
          }
        });
      },

      /**
       * VISTA 2: ESTUDIANTES
       * Renderiza la tabla de todos los estudiantes.
       * @param {string} [searchTerm=''] - El texto para filtrar la lista.
       */
      estudiantes: (searchTerm = '') => {
        const term = searchTerm.toLowerCase();
        const filteredStudents = state.students.filter(s => s.name.toLowerCase().includes(term));
        const rows = filteredStudents.map(s => {
          const avg = _logic.computeOverallStudentAverage(s.id);
          return `<tr>
            <td>${s.id}</td>
            <td>${_utils.escapeHtml(s.name)}</td>
            <td style="font-weight:700">${isNaN(avg) ? '-' : avg.toFixed(2)}</td>
            <td>${_utils.escapeHtml(state.courses.filter(c => c.studentIds.includes(s.id)).map(c => c.name).join(', '))}</td>
          </tr>`;
        }).join('');
        DOM.contentEl.innerHTML = `
          <div class="card">
            <h3>Listado General de Alumnos</h3>
            <div class="view-controls"><div class="search-wrapper"><i class="fa-solid fa-search"></i><input type="search" id="student-search-input" placeholder="Buscar alumno por nombre..." value="${_utils.escapeHtml(searchTerm)}"></div></div>
            <div class="table-wrapper">
              <table class="data-table">
                <thead><tr><th>ID</th><th>Nombre</th><th>Promedio General</th><th>Cursos</th></tr></thead>
                <tbody>${rows.length > 0 ? rows : `<tr><td colspan="4" class="empty-state">No se encontraron alumnos.</td></tr>`}</tbody>
              </table>
            </div>
          </div>`;
      },

      /**
       * VISTA 3: TAREAS / NOTAS
       * Renderiza la vista principal de ingreso de notas por curso.
       * @param {object} [filters] - Opciones de filtrado.
       */
      tareas: (filters = { searchTerm: '', sortByAvg: false }) => {
        DOM.contentEl.innerHTML = `
          <div class="card">
            <div style="display:flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem;">
              <h3 style="margin:0;">Notas por Asignatura</h3>
              <button data-action="show-add-eval-modal" class="btn"><i class="fa-solid fa-plus" style="margin-right: 6px;"></i>Agregar Evaluación</button>
            </div>
            <div class="view-controls">
              <div class="search-wrapper"><i class="fa-solid fa-search"></i><input type="search" id="grade-search-input" placeholder="Buscar alumno por nombre..." value="${_utils.escapeHtml(filters.searchTerm)}"></div>
              <button data-action="sort-by-avg" class="btn btn-secondary ${filters.sortByAvg ? 'active' : ''}"><i class="fa-solid fa-arrow-down-9-1" style="margin-right: 6px;"></i>Ordenar por Promedio</button>
            </div>
            <div id="courses-container" style="margin-top: 1rem;">${state.courses.map(course => _views.renderCourseAccordion(course, filters)).join('')}</div>
          </div>`;
      },

      /** Helper para la vista de Tareas (Acordeón). */
      renderCourseAccordion: (course, filters) => {
        return `<details class="course-accordion" data-course-id="${course.id}" open><summary>${_utils.escapeHtml(course.name)}</summary><div class="course-content">${_views.renderCourseGradeTable(course, filters)}</div></details>`;
      },

      /** Helper para la vista de Tareas (Tabla de Notas). */
      renderCourseGradeTable: (course, filters) => {
        const courseEvals = state.evaluations.filter(ev => ev.courseId === course.id);
        let courseStudents = course.studentIds.map(studentId => state.students.find(s => s.id === studentId)).filter(Boolean);
        if (filters.searchTerm) {
          const term = filters.searchTerm.toLowerCase();
          courseStudents = courseStudents.filter(s => s.name.toLowerCase().includes(term));
        }
        if (filters.sortByAvg) {
          courseStudents.sort((a, b) => (_logic.computeCourseAverage(b.id, course.id) || 0) - (_logic.computeCourseAverage(a.id, course.id) || 0));
        }
        if (courseStudents.length === 0) return '<p class="empty-state">No se encontraron alumnos.</p>';
        if (courseEvals.length === 0) return '<p class="empty-state">No hay evaluaciones para este curso.</p>';
        const header = `<thead><tr><th>Alumno</th>${courseEvals.map(ev => `<th>${_utils.escapeHtml(ev.name)}</th>`).join('')}<th>Promedio</th></tr></thead>`;
        const body = `<tbody>${courseStudents.map(student => {
          const cells = courseEvals.map(ev => {
            const grade = state.grades[student.id]?.[ev.id] ?? '';
            return `<td><input class="grade-input" type="number" step="0.1" min="0" max="7" value="${grade}" data-student="${student.id}" data-eval="${ev.id}"></td>`;
          }).join('');
          const avg = _logic.computeCourseAverage(student.id, course.id);
          return `<tr><td>${_utils.escapeHtml(student.name)}</td>${cells}<td id="avg-${student.id}-${course.id}">${isNaN(avg) ? '-' : avg.toFixed(2)}</td></tr>`;
        }).join('')}</tbody>`;
        return `<div class="table-wrapper"><table class="data-table">${header}${body}</table></div>`;
      },

      /**
       * VISTA 4: ANUNCIOS
       * Renderiza el formulario para crear anuncios y la lista de anuncios.
       */
      anuncios: () => {
        const announcementsHtml = (state.announcements || []).slice().sort((a, b) => b.date.localeCompare(a.date)).map(an => `
          <div class="card" style="margin-bottom: 1rem;">
            <h4>${_utils.escapeHtml(an.title)} <span class="text-muted" style="font-size: .8rem; font-weight: 500;">(${an.date})</span></h4>
            <p style="color: var(--ink-2); margin-top: 0.5rem; white-space: pre-wrap;">${_utils.escapeHtml(an.content)}</p>
          </div>`).join('');
        DOM.contentEl.innerHTML = `
          <div class="card">
            <h3>Anuncios</h3>
            <div style="margin-top: 1rem; padding: 1rem; border: 1px solid var(--border); border-radius: var(--radius-md);">
              <h4>Crear Nuevo Anuncio</h4>
              <div style="display:flex; flex-direction:column; gap:.6rem; margin-top:10px;">
                <input id="new-an-title" type="text" placeholder="Título del anuncio" />
                <textarea id="new-an-content" rows="4" placeholder="Contenido..."></textarea>
                <div style="text-align: right;"><button data-action="add-announcement" class="btn">Publicar</button></div>
              </div>
            </div>
            <div style="margin-top: 1.5rem;"><h4>Anuncios Publicados</h4>${announcementsHtml || '<p class="empty-state">No hay anuncios publicados.</p>'}</div>
          </div>`;
      },

      /**
       * VISTA 5: CALENDARIO
       * Renderiza el calendario de evaluaciones (versión mejorada).
       */
      calendario: () => {
        DOM.contentEl.innerHTML = `
          <div class="card">
            <div class="calendar-header">
              <button data-action="cal-prev" class="btn btn-secondary"><i class="fa-solid fa-chevron-left"></i></button>
              <h3 id="cal-month-year"></h3>
              <button data-action="cal-next" class="btn btn-secondary"><i class="fa-solid fa-chevron-right"></i></button>
            </div>
            <div id="calendar-container" class="table-wrapper"></div>
          </div>`;
        _views.renderCalendar(currentMonthView);
      },

      /** Helper para la vista de Calendario (Dibuja la tabla). */
      renderCalendar: (dateToShow) => {
        const container = document.getElementById('calendar-container');
        if (!container) return;
        document.getElementById('cal-month-year').textContent = dateToShow.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());
        const today = new Date();
        const month = dateToShow.getMonth();
        const year = dateToShow.getFullYear();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1);
        let startDay = firstDayOfMonth.getDay();
        startDay = (startDay === 0) ? 6 : startDay - 1;
        const prevMonthDays = new Date(year, month, 0).getDate();
        const weekdays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        let html = '<table id="calendar"><thead><tr>' + weekdays.map(d => `<th>${d}</th>`).join('') + '</tr></thead><tbody>';
        let date = 1;
        let nextMonthDate = 1;
        for (let i = 0; i < 6; i++) {
          html += '<tr>';
          for (let j = 0; j < 7; j++) {
            if (i === 0 && j < startDay) {
              html += `<td class="cal-day is-other-month"><div class="day-number">${prevMonthDays - startDay + 1 + j}</div></td>`;
            } else if (date > daysInMonth) {
              html += `<td class="cal-day is-other-month"><div class="day-number">${nextMonthDate++}</div></td>`;
            } else {
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
              const isToday = date === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const evs = state.evaluations.filter(ev => ev.date === dateStr);
              html += `<td class="cal-day ${isToday ? 'is-today' : ''}"><div class="day-number">${date}</div><div class="events-list">${evs.map(ev => `<div class="ev-item" title="${_utils.escapeHtml(ev.name)}">${_utils.escapeHtml(ev.name)}</div>`).join('')}</div></td>`;
              date++;
            }
          }
          html += '</tr>';
          if (date > daysInMonth) break;
        }
        html += '</tbody></table>';
        container.innerHTML = html;
      },

      /**
       * VISTA 6: PERFIL
       * Renderiza la tarjeta de perfil del profesor (modo "ver").
       */
      perfil: () => {
        const t = state.teacher || {};
        const initials = (t.name || '').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
        DOM.contentEl.innerHTML = `
          <div class="card profile-card" id="profile-card-container">
            <div style="display:flex;gap:1.5rem;align-items:center;flex-wrap:wrap; margin-bottom: 1.5rem;">
              <div class="avatar" style="width: 80px; height: 80px; font-size: 2rem; border-radius: var(--radius-lg); background: ${t.avatarColor || '#6d28d9'};">${initials}</div>
              <div style="flex:1;min-width:240px">
                <h3 style="margin: 0 0 0.5rem 0;">${_utils.escapeHtml(t.name || '')}</h3>
                <div style="color: var(--muted);">${_utils.escapeHtml(t.subject || '')}</div>
              </div>
              <button data-action="edit-profile" class="btn">Editar Perfil</button>
            </div>
            <div class="profile-field"><strong>Email</strong><div>${_utils.escapeHtml(t.email || '-')}</div></div>
            <div class="profile-field"><strong>Teléfono</strong><div>${_utils.escapeHtml(t.phone || '-')}</div></div>
            <div class="profile-field" style="margin-top: 1rem;"><strong>Biografía</strong><p style="margin-top: 6px; color:var(--ink-2); white-space: pre-wrap;">${_utils.escapeHtml(t.bio || '-')}</p></div>
          </div>`;
      },

      /** Helper para la vista de Perfil (Formulario de Edición). */
      renderProfileEditForm: () => {
        const t = state.teacher || {};
        const container = document.getElementById('profile-card-container');
        if (!container) return;
        container.innerHTML = `
          <h3>Editar Perfil</h3>
          <div class="profile-form">
            <label>Nombre</label><input id="prof-name" type="text" placeholder="Nombre" value="${_utils.escapeHtml(t.name || '')}" />
            <label>Asignatura</label><input id="prof-subject" type="text" placeholder="Asignatura" value="${_utils.escapeHtml(t.subject || '')}" />
            <label>Email</label><input id="prof-email" type="email" placeholder="Email" value="${_utils.escapeHtml(t.email || '')}" />
            <label>Teléfono</label><input id="prof-phone" type="tel" placeholder="Teléfono" value="${_utils.escapeHtml(t.phone || '')}" />
            <label>Biografía</label><textarea id="prof-bio" rows="4" placeholder="Biografía">${_utils.escapeHtml(t.bio || '')}</textarea>
            <div style="display:flex;gap:.5rem; justify-content: flex-end; margin-top: 1rem;">
              <button data-action="cancel-profile" class="btn btn-secondary">Cancelar</button>
              <button data-action="save-profile" class="btn">Guardar Cambios</button>
            </div>
          </div>`;
      },

      /**
       * VISTA MODAL: AGREGAR EVALUACIÓN
       * Renderiza un modal sobre la página.
       */
      renderAddEvaluationModal: () => {
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay'; 
        const courseOptions = state.courses.map(c => `<option value="${c.id}">${_utils.escapeHtml(c.name)}</option>`).join('');
        modalOverlay.innerHTML = `
          <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header"><h3>Agregar Nueva Evaluación</h3><button class="modal-close" data-action="close-modal">&times;</button></div>
            <div class="modal-body" style="display:flex; flex-direction:column; gap:1rem;">
              <div><label for="modal-course-id">Asignatura / Curso</label><select id="modal-course-id">${courseOptions}</select></div>
              <div><label for="modal-eval-name">Nombre de la Evaluación</label><input id="modal-eval-name" type="text" placeholder="Ej: Parcial 1"></div>
              <div><label for="modal-eval-date">Fecha</label><input id="modal-eval-date" type="date" value="${_utils.todayISO()}"></div>
            </div>
            <div class="modal-footer"><button class="btn btn-secondary" data-action="close-modal">Cancelar</button><button id="modal-save-eval" class="btn">Crear Evaluación</button></div>
          </div>`;
        document.body.appendChild(modalOverlay);
        
        // Listeners locales para el modal
        const closeModal = () => modalOverlay.remove();
        modalOverlay.addEventListener('click', (e) => {
          if (e.target === modalOverlay || e.target.closest('[data-action="close-modal"]')) {
            closeModal();
          }
          if (e.target.id === 'modal-save-eval') {
            const courseId = document.getElementById('modal-course-id').value;
            const evalName = document.getElementById('modal-eval-name').value.trim();
            const evalDate = document.getElementById('modal-eval-date').value;
            if (!courseId || !evalName || !evalDate) return alert('Todos los campos son obligatorios.');
            state.evaluations.push({ id: _utils.genId(), name: evalName, date: evalDate, courseId });
            _state.save();
            closeModal();
            _views.tareas(); // Recarga la vista de tareas
          }
        });
      },

      /**
       * VISTA PARCIAL: ACTUALIZAR UI
       * Actualiza los elementos estáticos (Sidebar, Topbar) con
       * la información del perfil del profesor.
       */
      updateProfileUI: () => {
        const name = state.teacher.name || 'Profesor';
        const initials = name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
        
        document.querySelectorAll('.avatar, .avatar-mini').forEach(el => {
          el.textContent = initials;
          if (el.classList.contains('avatar')) {
            el.style.background = `linear-gradient(135deg, ${state.teacher.avatarColor || '#6d28d9'}, var(--accent-2))`;
          }
        });
        
        // Usa los elementos cacheados en DOM
        if (DOM.userNameMini) DOM.userNameMini.textContent = name;
        if (DOM.profileName) DOM.profileName.textContent = name;
        if (DOM.profileRole) DOM.profileRole.textContent = state.teacher.subject || 'Profesor';
      }
    };


    /*
    ============================================================================
    | SECCIÓN 6: MANEJADORES DE EVENTOS (_handlers)                            |
    ============================================================================
    |
    | Contienen la *lógica* que se ejecuta cuando ocurre un evento.
    | Estas funciones son llamadas por los 'listeners' en `bindEvents()`.
    |
    */
    const _handlers = {
      
      /**
       * Maneja los clics en la navegación principal (Sidebar).
       * ¡ESTA FUNCIÓN ARREGLA EL BUG 404!
       * @param {Event} e - El objeto de evento del clic.
       */
      onNavClick: (e) => {
        const link = e.target.closest('a');
        if (!link) return;
        
        // ¡LA LÍNEA MÁS IMPORTANTE!
        // Previene que el navegador recargue la página (el 404).
        e.preventDefault(); 
        
        DOM.menuLinks.forEach(a => a.classList.remove('active'));
        link.classList.add('active');
        
        const title = link.querySelector('span') ? link.querySelector('span').textContent : 'Dashboard';
        if (DOM.topbarTitle) DOM.topbarTitle.textContent = title;

        _views.renderContent(link.getAttribute('href'));
        
        if (DOM.mq.matches && DOM.sidebar.classList.contains('open')) {
          _handlers.toggleSidebar(false);
        }
      },

      /**
       * Maneja los clics en el botón de hamburguesa (toggle).
       * @param {Event} e - El objeto de evento del clic.
       */
      onToggleClick: (e) => {
        e.stopPropagation();
        const isExpanded = DOM.mq.matches ? DOM.sidebar.classList.contains('open') : !DOM.sidebar.classList.contains('closed');
        _handlers.toggleSidebar(!isExpanded);
      },

      /**
       * Abre o cierra la sidebar y actualiza ARIA.
       * @param {boolean} [forceOpen] - Opcional. Forzar un estado (true=abrir, false=cerrar).
       */
      toggleSidebar: (forceOpen) => {
        let open;
        if (DOM.mq.matches) {
          open = forceOpen !== undefined ? forceOpen : !DOM.sidebar.classList.contains('open');
          DOM.sidebar.classList.toggle('open', open);
        } else {
          open = forceOpen !== undefined ? forceOpen : DOM.sidebar.classList.contains('closed');
          DOM.sidebar.classList.toggle('closed', !open);
        }
        DOM.toggleBtn.setAttribute('aria-expanded', open);
      },

      /**
       * Maneja clics en el <body> (para cerrar el menú móvil).
       */
      onBodyClick: (e) => {
        if (!DOM.mq.matches) return;
        const inside = e.target.closest('#sidebar') || e.target.closest('#toggle');
        if (!inside && DOM.sidebar.classList.contains('open')) {
          _handlers.toggleSidebar(false);
        }
      },

      /**
       * Maneja el redimensionamiento de la ventana.
       */
      onResize: () => {
        if (DOM.mq.matches) {
          DOM.sidebar.classList.remove('closed');
          DOM.sidebar.classList.remove('open');
          DOM.toggleBtn.setAttribute('aria-expanded', false);
        } else {
          DOM.sidebar.classList.remove('open');
          DOM.toggleBtn.setAttribute('aria-expanded', !DOM.sidebar.classList.contains('closed'));
        }
      },

      /**
       * Manejador de CLICS para TODO el contenido dinámico.
       * Usa delegación de eventos en `data-action`.
       * @param {Event} e - El objeto de evento del clic.
       */
      onContentClick: (e) => {
        const target = e.target.closest('[data-action]');
        if (!target) return;
        const action = target.dataset.action;

        // Switch-case para todas las acciones posibles
        switch (action) {
          case 'reset-data':
            if (confirm('¿Resetear datos a demo?')) {
              localStorage.removeItem(STORAGE_KEY);
              location.reload();
            }
            break;
            
          case 'show-add-eval-modal':
            _views.renderAddEvaluationModal();
            break;
            
          case 'sort-by-avg': {
            const searchTerm = DOM.contentEl.querySelector('#grade-search-input')?.value || '';
            const sortByAvg = !target.classList.contains('active');
            _views.tareas({ searchTerm, sortByAvg });
            break;
          }
            
          case 'add-announcement': {
            const title = DOM.contentEl.querySelector('#new-an-title').value.trim();
            const content = DOM.contentEl.querySelector('#new-an-content').value.trim();
            if (!title || !content) return alert('El título y el contenido son obligatorios.');
            state.announcements.unshift({ id: _utils.genId('an-'), title, content, date: _utils.todayISO() });
            _state.save();
            _views.anuncios();
            break;
          }
            
          case 'cal-prev':
            currentMonthView.setMonth(currentMonthView.getMonth() - 1);
            _views.renderCalendar(currentMonthView);
            break;
            
          case 'cal-next':
            currentMonthView.setMonth(currentMonthView.getMonth() + 1);
            _views.renderCalendar(currentMonthView);
            break;
            
          case 'edit-profile':
            _views.renderProfileEditForm();
            break;
            
          case 'cancel-profile':
            _views.perfil();
            break;
            
          case 'save-profile':
            state.teacher.name = document.getElementById('prof-name').value.trim();
            state.teacher.subject = document.getElementById('prof-subject').value.trim();
            state.teacher.email = document.getElementById('prof-email').value.trim();
            state.teacher.phone = document.getElementById('prof-phone').value.trim();
            state.teacher.bio = document.getElementById('prof-bio').value.trim();
            _state.save();
            _views.updateProfileUI();
            _views.perfil();
            break;
        }
      },

      /**
       * Manejador de CAMBIOS (CHANGE) para contenido dinámico.
       * (Principalmente para los inputs de notas).
       * @param {Event} e - El objeto de evento 'change'.
       */
      onContentChange: (e) => {
        if (e.target.matches('.grade-input')) {
          
          // FIX para la palabra reservada 'eval'
          const { student, eval: evalId } = e.target.dataset;
          const value = parseFloat(e.target.value);

          if (!state.grades[student]) state.grades[student] = {};
          
          if (isNaN(value)) {
            delete state.grades[student][evalId];
            e.target.value = '';
          } else {
            const validGrade = Math.max(0, Math.min(7, value));
            state.grades[student][evalId] = validGrade;
            if (validGrade !== value) e.target.value = validGrade;
          }
          
          _state.save();
          
          const courseId = state.evaluations.find(ev => ev.id === evalId)?.courseId;
          if (courseId) {
            const avg = _logic.computeCourseAverage(student, courseId);
            const avgEl = document.querySelector(`#avg-${student}-${courseId}`);
            if (avgEl) avgEl.textContent = isNaN(avg) ? '-' : avg.toFixed(2);
          }
        }
      },

      /**
       * Manejador de ESCRITURA (INPUT) para contenido dinámico.
       * (Principalmente para las barras de búsqueda).
       * @param {Event} e - El objeto de evento 'input'.
       */
      onContentInput: (e) => {
        if (e.target.id === 'student-search-input') {
          _views.estudiantes(e.target.value);
        }
        
        if (e.target.id === 'grade-search-input') {
          const searchTerm = e.target.value;
          const sortByAvg = DOM.contentEl.querySelector('[data-action="sort-by-avg"]')?.classList.contains('active') || false;
          
          DOM.contentEl.querySelectorAll('.course-accordion').forEach(accordion => {
            const courseId = accordion.dataset.courseId;
            const course = state.courses.find(c => c.id === courseId);
            if (course) {
              const tableContainer = accordion.querySelector('.course-content');
              if (tableContainer) {
                tableContainer.innerHTML = _views.renderCourseGradeTable(course, { searchTerm, sortByAvg });
              }
            }
          });
        }
      }
    };


    /*
    ============================================================================
    | SECCIÓN 7: BIND EVENTS (Conexión de Eventos)                             |
    ============================================================================
    |
    | Conecta los "Handlers" (lógica) a los elementos del DOM.
    | Se ejecuta UNA SOLA VEZ al inicio.
    |
    */
    function bindEvents() {
      // 1. Listeners Estáticos (para la navegación principal)
      DOM.menu.addEventListener('click', _handlers.onNavClick);
      DOM.toggleBtn.addEventListener('click', _handlers.onToggleClick);
      document.body.addEventListener('click', _handlers.onBodyClick);
      DOM.mq.addEventListener('change', _handlers.onResize);

      // 2. Listeners Dinámicos (Delegación de Eventos)
      DOM.contentEl.addEventListener('click', _handlers.onContentClick);
      DOM.contentEl.addEventListener('change', _handlers.onContentChange);
      DOM.contentEl.addEventListener('input', _handlers.onContentInput);
    }


    /*
    ============================================================================
    | SECCIÓN 8: CACHE DOM (Búsqueda de Elementos)                             |
    ============================================================================
    |
    | Busca todos los elementos estáticos del DOM al inicio
    | y los guarda en el objeto `DOM`.
    | Esto es una optimización de rendimiento.
    |
    */
    function cacheDom() {
      DOM.contentEl = document.getElementById('content-area');
      DOM.sidebar = document.getElementById('sidebar');
      DOM.toggleBtn = document.getElementById('toggle');
      DOM.mq = window.matchMedia('(max-width: 700px)');
      DOM.menu = document.getElementById('menu');
      DOM.menuLinks = document.querySelectorAll('.menu a');
      DOM.topbarTitle = document.getElementById('topbar-title');
      DOM.userNameMini = document.querySelector('.user-mini-name');
      DOM.profileName = document.querySelector('.profile-name');
      DOM.profileRole = document.querySelector('.profile .role');
    }

    /*
    ============================================================================
    | SECCIÓN 9: INIT (Función de Arranque)                                    |
    ============================================================================
    |
    | La función principal que orquesta el inicio de la aplicación.
    |
    */
    function init() {
      // 1. Buscar y guardar los elementos del DOM.
      cacheDom();
      
      // 2. Verificación de seguridad. Si falta algo crucial, detenemos la app.
      if (!DOM.contentEl || !DOM.sidebar || !DOM.toggleBtn || !DOM.menu) {
        console.error('Error Crítico: Faltan elementos base del layout. La aplicación no puede iniciar.');
        console.log('DOM Cache:', DOM);
        return; // Detiene la ejecución
      }
      
      // 3. Conectar todos los listeners de eventos (clics, resize, etc.).
      //    (Lo hacemos antes de cargar el estado para que todo esté listo).
      bindEvents();
      
      // 4. Actualizar la UI estática (nombre, avatar) con los datos cargados.
      _views.updateProfileUI();
      
      // 5. Renderizar la vista inicial (Dashboard).
      _views.renderContent('dashboard');
      
      // 6. Mensaje de éxito en la consola.
      console.log('Aplicación de Profesor inicializada correctamente.');
    }

    // --- ¡ARRANCAR LA APLICACIÓN! ---
    init();

  })(); // Fin de la IIFE

}); // Fin de DOMContentLoaded