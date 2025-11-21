<<<<<<< HEAD
/*
================================================================================
|                                                                              |
|                    SISTEMA DE GESTIÓN DE PROFESORES (SPA)                    |
|                    ARCHIVO: teacher_jss.js                                   |
|                    AUTOR: Kev182-pixel (Refactorizado a Clase por Asistente) |
|                                                                              |
================================================================================
|                                                                              |
|   DESCRIPCIÓN:                                                               |
|   Este script maneja toda la lógica de la Single Page Application (SPA)      |
|   para el panel de profesores. Se ha refactorizado a un patrón de            |
|   Clase (ES6 Class) para una máxima encapsulación, organización y            |
|   mantenibilidad.                                                            |
|                                                                              |
|   ARQUITECTURA DE LA CLASE `TeacherApp`:                                     |
|   -   Campos Privados (#): Almacenan el estado y refs del DOM.               |
|   -   constructor(): Punto de entrada. Llama a #cacheDom, #loadState,        |
|       y #bindEvents.                                                         |
|   -   #cacheDom(): Busca y almacena elementos del DOM una sola vez.          |
|   -   #bindEvents(): Conecta todos los listeners de eventos (estáticos y     |
|       delegados) a sus métodos manejadores.                                  |
|   -   Métodos de Estado (#loadState, #saveState): Manejan localStorage.      |
|   -   Métodos de Lógica (#getEvaluationMetrics): Funciones puras para        |
|       cálculos.                                                              |
|   -   Métodos de Vistas (#renderContent, #renderDashboard): Generan HTML     |
|       y lo inyectan en el DOM.                                               |
|   -   Métodos Manejadores (#onNavClick, #onContentClick): La lógica          |
|       que se ejecuta cuando ocurre un evento.                                |
|                                                                              |
|   FIX DE ERRORES ANTERIORES:                                                 |
|   -   Bug 404: Solucionado al envolver todo en 'DOMContentLoaded' y          |
|       asegurar que `e.preventDefault()` se ejecute correctamente.            |
|   -   ReferenceError (defaultState): Solucionado al definir los datos       |
|       por defecto antes de que `loadState` los necesite.                     |
|   -   ReferenceError (eval): Solucionado renombrando la variable a `evalId`  |
|       durante la desestructuración.                                          |
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
 * Garantiza que el script no se ejecute hasta que el DOM (todo el HTML)
 * esté completamente cargado y listo. Esto previene errores de tipo
 * "Cannot read properties of null" (ej: al intentar buscar un botón
 * que aún no existe).
 */
document.addEventListener('DOMContentLoaded', () => {

  /**
   * ===========================================================================
   * | CLASE PRINCIPAL: TeacherApp                                              |
   * ===========================================================================
   *
   * Esta clase encapsula toda la funcionalidad de la aplicación.
   * Usamos campos privados (#) para proteger el estado interno.
   *
   */
  class TeacherApp {

    /*
    ============================================================================
    | SECCIÓN 1: CAMPOS PRIVADOS DE LA CLASE                                   |
    ============================================================================
    |
    | Almacenan el estado interno y las referencias.
    |
    */

    /**
     * Clave para el `localStorage`.
     * @type {string}
     */
    #STORAGE_KEY = 'profesores_state_v4_courses';

    /**
     * Objeto para cachear los elementos del DOM.
     * @type {Object}
     */
    #DOM = {};

    /**
     * Almacena el estado completo de la aplicación (datos).
     * @type {Object}
     */
    #state = {};

    /**
     * Referencia al objeto Chart.js activo.
     * @type {Chart|null}
     */
    #chart = null;

    /**
     * Almacena la fecha actual para la vista de Calendario.
     * @type {Date}
     */
    #currentMonthView = new Date();


    /**
     * ==========================================================================
     * | CONSTRUCTOR DE LA CLASE                                                |
     * ==========================================================================
     *
     * El punto de entrada. Se llama automáticamente cuando creamos
     * `new TeacherApp()`.
     *
     */
    constructor() {
      // 1. Buscar y almacenar todos los elementos del DOM.
      this.#cacheDom();

      // 2. Verificación de seguridad. Si faltan elementos cruciales,
      //    detenemos la app para evitar errores.
      if (!this.#DOM.contentEl || !this.#DOM.sidebar || !this.#DOM.toggleBtn || !this.#DOM.menu) {
        console.error('Error Crítico: Faltan elementos base del layout. La aplicación no puede iniciar.');
        console.log('DOM Cacheado:', this.#DOM); // Muestra qué elementos faltan
        return; // Detiene la ejecución
      }

      // 3. Cargar el estado desde localStorage (o usar por defecto).
      this.#state = this.#loadState();

      // 4. Conectar todos los listeners de eventos (clics, resize, etc.).
      //    Usamos .bind(this) para asegurar que 'this' dentro del
      //    manejador de eventos se refiera a la instancia de la clase.
      this.#bindEvents();

      // 5. Actualizar la UI estática (nombre, avatar) con los datos cargados.
      this.#updateProfileUI();

      // 6. Renderizar la vista inicial (Dashboard).
      this.#renderContent('dashboard');

      // 7. Mensaje de éxito en la consola.
      console.log('Aplicación de Profesor (Clase) inicializada correctamente.');
    }


    /*
    ============================================================================
    | SECCIÓN 2: MÉTODOS DE INICIALIZACIÓN (Cache y Bind)                      |
    ============================================================================
    */

    /**
     * Busca todos los elementos estáticos del DOM al inicio
     * y los guarda en el objeto `#DOM`.
     * Esto es una optimización de rendimiento, evita querySelector repetidos.
     * @private
     */
    #cacheDom() {
      // Usamos los IDs y Clases definidos en el HTML
      this.#DOM.contentEl = document.getElementById('content-area');
      this.#DOM.sidebar = document.getElementById('sidebar');
      this.#DOM.toggleBtn = document.getElementById('toggle');
      this.#DOM.mq = window.matchMedia('(max-width: 700px)');
      this.#DOM.menu = document.getElementById('menu');
      this.#DOM.menuLinks = document.querySelectorAll('.menu a');
      this.#DOM.topbarTitle = document.getElementById('topbar-title');
      
      // Hooks para actualizar la UI del perfil
      this.#DOM.userNameMini = document.querySelector('.user-mini-name');
      this.#DOM.profileName = document.querySelector('.profile-name');
      this.#DOM.profileRole = document.querySelector('.profile .role');
    }

    /**
     * Conecta los "Handlers" (lógica de eventos) a los elementos del DOM.
     * Se ejecuta UNA SOLA VEZ en el constructor.
     * @private
     */
    #bindEvents() {
      // 1. Listeners Estáticos (para la navegación principal)
      //    Usamos .bind(this) para que 'this' dentro del handler
      //    (ej: #onNavClick) siga siendo la instancia de TeacherApp.
      this.#DOM.menu.addEventListener('click', this.#onNavClick.bind(this));
      this.#DOM.toggleBtn.addEventListener('click', this.#onToggleClick.bind(this));
      document.body.addEventListener('click', this.#onBodyClick.bind(this));
      this.#DOM.mq.addEventListener('change', this.#onResize.bind(this));

      // 2. Listeners Dinámicos (Delegación de Eventos)
      //    Estos se adjuntan al contenedor `contentEl` y manejan
      //    eventos de botones/inputs que se crean y destruyen
      //    dinámicamente con cada vista.
      this.#DOM.contentEl.addEventListener('click', this.#onContentClick.bind(this));
      this.#DOM.contentEl.addEventListener('change', this.#onContentChange.bind(this));
      this.#DOM.contentEl.addEventListener('input', this.#onContentInput.bind(this));
    }


    /*
    ============================================================================
    | SECCIÓN 3: UTILIDADES Y GESTIÓN DE ESTADO                                |
    ============================================================================
    */

    /**
     * Generador de IDs únicos.
     * @param {string} [prefix='ev-'] - Un prefijo para el ID.
     * @returns {string} Un ID pseudo-aleatorio.
     * @private
     * @static
     */
    static #genId(prefix = 'ev-') {
      return prefix + Math.random().toString(36).slice(2, 11);
    }

    /**
     * Devuelve la fecha de hoy (o con un desfase) en formato AAAA-MM-DD.
     * @param {number} [offsetDays=0] - Días a sumar o restar de hoy.
     * @returns {string} La fecha en formato ISO (YYYY-MM-DD).
     * @private
     * @static
     */
    static #todayISO(offsetDays = 0) {
      const d = new Date();
      d.setDate(d.getDate() + offsetDays);
      return d.toISOString().slice(0, 10);
    }

    /**
     * Escapa HTML para prevenir ataques XSS (Cross-Site Scripting).
     * @param {string} [s=''] - El string a escapar.
     * @returns {string} El string seguro.
     * @private
     * @static
     */
    static #escapeHtml(s = '') {
      return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    /**
     * Getter para los datos por defecto.
     * Usar un getter previene que los datos por defecto sean
     * modificados accidentalmente.
     * @returns {object} El estado por defecto.
     * @private
     */
    get #defaultState() {
      // Usamos los métodos estáticos para generar los datos
      return {
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
          { id: 'ev-m1', name: 'Prueba 1', date: TeacherApp.#todayISO(-10), courseId: 'C-01' },
          { id: 'ev-m2', name: 'Tarea 1', date: TeacherApp.#todayISO(-5), courseId: 'C-01' },
          { id: 'ev-f1', name: 'Laboratorio 1', date: TeacherApp.#todayISO(-8), courseId: 'C-02' },
          { id: 'ev-f2', name: 'Prueba de Química', date: TeacherApp.#todayISO(-2), courseId: 'C-02' }
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
          { id: TeacherApp.#genId('an-'), title: 'Reunión de Apoderados', content: 'Se les recuerda que la reunión de apoderados será el próximo viernes a las 18:00 hrs en la sala de conferencias.', date: TeacherApp.#todayISO(-2) }
        ]
      };
    }

    /**
     * Carga el estado desde localStorage.
     * @returns {object} El estado de la aplicación.
     * @private
     */
    #loadState() {
      try {
        const raw = localStorage.getItem(this.#STORAGE_KEY);
        const defaults = this.#defaultState; // Llama al getter
        if (!raw) {
          this.#saveState(defaults); // Guarda el estado por defecto
          return JSON.parse(JSON.stringify(defaults));
        }
        const savedState = JSON.parse(raw);
        // Fusiona el estado por defecto con el guardado
        return { ...defaults, ...savedState, teacher: { ...defaults.teacher, ...(savedState.teacher || {}) } };
      } catch (e) {
        console.error('Error al cargar estado', e);
        return JSON.parse(JSON.stringify(this.#defaultState));
      }
    }

    /**
     * Guarda el estado actual en localStorage.
     * @param {object} [newState=this.#state] - El estado a guardar.
     * @private
     */
    #saveState(newState = this.#state) {
      this.#state = newState; // Actualiza el estado interno de la clase
      localStorage.setItem(this.#STORAGE_KEY, JSON.stringify(this.#state));
    }


    /*
    ============================================================================
    | SECCIÓN 4: MÓDULO DE LÓGICA DE CÁLCULO (#logic)                          |
    ============================================================================
    |
    | Métodos privados para cálculos puros.
    |
    */

    /**
     * Calcula el promedio de una evaluación específica.
     * @param {string} evalId - El ID de la evaluación.
     * @returns {number|NaN} El promedio, o NaN si no hay notas.
     * @private
     */
    #getAverageForEval(evalId) {
      const grades = Object.values(this.#state.grades)
        .map(sGrades => sGrades[evalId])
        .filter(g => g !== undefined && g !== null);
      return grades.length ? grades.reduce((a, b) => parseFloat(a) + parseFloat(b), 0) / grades.length : NaN;
    }
    
    /**
     * Calcula los KPIs (Métricas Clave) para el Dashboard.
     * @returns {object} Un objeto con {overall, best, worst, bestName, worstName}.
     * @private
     */
    #getEvaluationMetrics() {
      const evalData = this.#state.evaluations.map(ev => ({
        name: ev.name,
        avg: this.#getAverageForEval(ev.id)
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
    }

    /**
     * Calcula el promedio de un estudiante en un curso específico.
     * @param {string} studentId - ID del estudiante.
     * @param {string} courseId - ID del curso.
     * @returns {number|NaN} El promedio del curso.
     * @private
     */
    #computeCourseAverage(studentId, courseId) {
      const studentGrades = this.#state.grades[studentId] || {};
      const courseEvalIds = this.#state.evaluations.filter(ev => ev.courseId === courseId).map(ev => ev.id);
      const grades = courseEvalIds.map(evalId => studentGrades[evalId]).filter(g => g !== undefined && g !== null && g !== '');
      if (!grades.length) return NaN;
      return grades.reduce((a, b) => parseFloat(a) + parseFloat(b), 0) / grades.length;
    }

    /**
     * Calcula el promedio general de un estudiante (en todos sus cursos).
     * @param {string} studentId - ID del estudiante.
     * @returns {number|NaN} El promedio general.
     * @private
     */
    #computeOverallStudentAverage(studentId) {
      const studentGrades = this.#state.grades[studentId] || {};
      const grades = Object.values(studentGrades).filter(g => g !== undefined && g !== null && g !== '');
      if (!grades.length) return NaN;
      return grades.reduce((a, b) => parseFloat(a) + parseFloat(b), 0) / grades.length;
    }

    
    /*
    ============================================================================
    | SECCIÓN 5: MÓDULO DE VISTAS (#views)                                     |
    ============================================================================
    |
    | Métodos privados que generan HTML y lo inyectan en el DOM.
    |
    */

    /**
     * Función "Router" principal.
     * @param {string} target - El nombre de la vista a renderizar (ej: 'dashboard').
     * @private
     */
    #renderContent(target) {
      target = (target || 'dashboard').replace(/^\/+/, '');
      
      // Mapeo de string a método de la clase
      const viewMap = {
        'dashboard': this.#renderDashboard,
        'estudiantes': this.#renderStudents,
        'tareas': this.#renderGrades,
        'anuncios': this.#renderAnnouncements,
        'calendario': this.#renderCalendarView,
        'perfil': this.#renderProfile
      };

      const renderFn = viewMap[target] || viewMap['dashboard'];
      
      if (target === 'calendario') {
        this.#currentMonthView = new Date();
      }
      
      // Usamos .call(this) para asegurar que 'this' dentro de la
      // función de renderizado siga siendo la instancia de la clase.
      renderFn.call(this);
    }

    /**
     * VISTA 1: DASHBOARD
     * @private
     */
    #renderDashboard() {
      const metrics = this.#getEvaluationMetrics();
      this.#DOM.contentEl.innerHTML = `
        <div class="grid">
          <div class="kpi students"><i class="fa-solid fa-user-graduate fa-2x"></i><div><div class="num" id="kpi-students-count">--</div><div>Estudiantes Totales</div></div></div>
          <div class="kpi classes"><i class="fa-solid fa-chalkboard fa-2x"></i><div><div class="num" id="kpi-courses-count">--</div><div>Clases Activas</div></div></div>
        </div>
        <div class="grid" style="grid-template-columns: 2fr 1fr; margin-top: 1.5rem; align-items: flex-start;">
          <div class="card">
            <h3>Rendimiento de Evaluaciones</h3>
            <div class="mini-kpi-grid">
              <div class="mini-kpi"><span class="label">Promedio General</span><span class="value" style="color: var(--primary);">${metrics.overall}</span></div>
              <div class="mini-kpi"><span class="label" title="${TeacherApp.#escapeHtml(metrics.bestName)}">Mejor Eval. (${TeacherApp.#escapeHtml(metrics.bestName)})</span><span class="value" style="color: var(--accent);">${metrics.best}</span></div>
              <div class="mini-kpi"><span class="label" title="${TeacherApp.#escapeHtml(metrics.worstName)}">Peor Eval. (${TeacherApp.#escapeHtml(metrics.worstName)})</span><span class="value" style="color: var(--muted);">${metrics.worst}</span></div>
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
      
      try {
        document.getElementById('kpi-students-count').textContent = this.#state.students.length;
        document.getElementById('kpi-courses-count').textContent = this.#state.courses.length;
      } catch (e) {}
      
      this.#renderDashboardChart();
    }

    /** Dibuja el gráfico de barras del Dashboard. */
    #renderDashboardChart() {
      const canvas = document.getElementById('dashboard-chart');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (this.#chart) this.#chart.destroy();

      const labels = this.#state.evaluations.map(ev => ev.name);
      const averages = this.#state.evaluations.map(ev => this.#getAverageForEval(ev.id));

      const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#0F294C';
      const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#CDA758';
      const borderColor = getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || 'rgba(0,0,0,0.1)';

      this.#chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Promedio', data: averages,
            backgroundColor: primaryColor, borderColor: primaryColor,
            borderWidth: 1, borderRadius: 4, hoverBackgroundColor: accentColor
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { 
            legend: { display: false },
            tooltip: {
              backgroundColor: 'var(--ink-2, #111827)', titleColor: 'var(--accent, #CDA758)',
              bodyColor: '#ffffff', displayColors: false,
              callbacks: { label: (context) => `Promedio: ${context.parsed.y.toFixed(2)}` }
            }
          },
          scales: {
            y: { min: 1, max: 7, ticks: { stepSize: 1, padding: 10, color: 'var(--muted)' }, grid: { drawBorder: false, color: borderColor } },
            x: { ticks: { padding: 10, color: 'var(--muted)' }, grid: { display: false } }
          }
        }
      });
    }

    /**
     * VISTA 2: ESTUDIANTES
     * @param {string} [searchTerm=''] - El texto para filtrar la lista.
     * @private
     */
    #renderStudents(searchTerm = '') {
      const term = searchTerm.toLowerCase();
      const filteredStudents = this.#state.students.filter(s => s.name.toLowerCase().includes(term));
      const rows = filteredStudents.map(s => {
        const avg = this.#computeOverallStudentAverage(s.id);
        return `<tr>
          <td>${s.id}</td>
          <td>${TeacherApp.#escapeHtml(s.name)}</td>
          <td style="font-weight:700">${isNaN(avg) ? '-' : avg.toFixed(2)}</td>
          <td>${TeacherApp.#escapeHtml(this.#state.courses.filter(c => c.studentIds.includes(s.id)).map(c => c.name).join(', '))}</td>
        </tr>`;
      }).join('');
      this.#DOM.contentEl.innerHTML = `
        <div class="card">
          <h3>Listado General de Alumnos</h3>
          <div class="view-controls"><div class="search-wrapper"><i class="fa-solid fa-search"></i><input type="search" id="student-search-input" placeholder="Buscar alumno por nombre..." value="${TeacherApp.#escapeHtml(searchTerm)}"></div></div>
          <div class="table-wrapper">
            <table class="data-table">
              <thead><tr><th>ID</th><th>Nombre</th><th>Promedio General</th><th>Cursos</th></tr></thead>
              <tbody>${rows.length > 0 ? rows : `<tr><td colspan="4" class="empty-state">No se encontraron alumnos.</td></tr>`}</tbody>
            </table>
          </div>
        </div>`;
    }

    /**
     * VISTA 3: TAREAS / NOTAS
     * @param {object} [filters] - Opciones de filtrado.
     * @private
     */
    #renderGrades(filters = { searchTerm: '', sortByAvg: false }) {
      this.#DOM.contentEl.innerHTML = `
        <div class="card">
          <div style="display:flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem;">
            <h3 style="margin:0;">Notas por Asignatura</h3>
            <button data-action="show-add-eval-modal" class="btn"><i class="fa-solid fa-plus" style="margin-right: 6px;"></i>Agregar Evaluación</button>
          </div>
          <div class="view-controls">
            <div class="search-wrapper"><i class="fa-solid fa-search"></i><input type="search" id="grade-search-input" placeholder="Buscar alumno por nombre..." value="${TeacherApp.#escapeHtml(filters.searchTerm)}"></div>
            <button data-action="sort-by-avg" class="btn btn-secondary ${filters.sortByAvg ? 'active' : ''}"><i class="fa-solid fa-arrow-down-9-1" style="margin-right: 6px;"></i>Ordenar por Promedio</button>
          </div>
          <div id="courses-container" style="margin-top: 1rem;">${this.#state.courses.map(course => this.#renderCourseAccordion(course, filters)).join('')}</div>
        </div>`;
    }

    /** Helper para la vista de Tareas (Acordeón). */
    #renderCourseAccordion(course, filters) {
      return `<details class="course-accordion" data-course-id="${course.id}" open><summary>${TeacherApp.#escapeHtml(course.name)}</summary><div class="course-content">${this.#renderCourseGradeTable(course, filters)}</div></details>`;
    }

    /** Helper para la vista de Tareas (Tabla de Notas). */
    #renderCourseGradeTable(course, filters) {
      const courseEvals = this.#state.evaluations.filter(ev => ev.courseId === course.id);
      let courseStudents = this.#state.studentIds.map(studentId => this.#state.students.find(s => s.id === studentId)).filter(Boolean);
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        courseStudents = courseStudents.filter(s => s.name.toLowerCase().includes(term));
      }
      if (filters.sortByAvg) {
        courseStudents.sort((a, b) => (this.#computeCourseAverage(b.id, course.id) || 0) - (this.#computeCourseAverage(a.id, course.id) || 0));
      }
      if (courseStudents.length === 0) return '<p class="empty-state">No se encontraron alumnos.</p>';
      if (courseEvals.length === 0) return '<p class="empty-state">No hay evaluaciones para este curso.</p>';
      const header = `<thead><tr><th>Alumno</th>${courseEvals.map(ev => `<th>${TeacherApp.#escapeHtml(ev.name)}</th>`).join('')}<th>Promedio</th></tr></thead>`;
      const body = `<tbody>${courseStudents.map(student => {
        const cells = courseEvals.map(ev => {
          const grade = this.#state.grades[student.id]?.[ev.id] ?? '';
          return `<td><input class="grade-input" type="number" step="0.1" min="0" max="7" value="${grade}" data-student="${student.id}" data-eval="${ev.id}"></td>`;
        }).join('');
        const avg = this.#computeCourseAverage(student.id, course.id);
        return `<tr><td>${TeacherApp.#escapeHtml(student.name)}</td>${cells}<td id="avg-${student.id}-${course.id}">${isNaN(avg) ? '-' : avg.toFixed(2)}</td></tr>`;
      }).join('')}</tbody>`;
      return `<div class="table-wrapper"><table class="data-table">${header}${body}</table></div>`;
    }

    /**
     * VISTA 4: ANUNCIOS
     * @private
     */
    #renderAnnouncements() {
      const announcementsHtml = (this.#state.announcements || []).slice().sort((a, b) => b.date.localeCompare(a.date)).map(an => `
        <div class="card" style="margin-bottom: 1rem;">
          <h4>${TeacherApp.#escapeHtml(an.title)} <span class="text-muted" style="font-size: .8rem; font-weight: 500;">(${an.date})</span></h4>
          <p style="color: var(--ink-2); margin-top: 0.5rem; white-space: pre-wrap;">${TeacherApp.#escapeHtml(an.content)}</p>
        </div>`).join('');
      this.#DOM.contentEl.innerHTML = `
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
    }

    /**
     * VISTA 5: CALENDARIO
     * @private
     */
    #renderCalendarView() {
      this.#DOM.contentEl.innerHTML = `
        <div class="card">
          <div class="calendar-header">
            <button data-action="cal-prev" class="btn btn-secondary"><i class="fa-solid fa-chevron-left"></i></button>
            <h3 id="cal-month-year"></h3>
            <button data-action="cal-next" class="btn btn-secondary"><i class="fa-solid fa-chevron-right"></i></button>
          </div>
          <div id="calendar-container" class="table-wrapper"></div>
        </div>`;
      this.#renderCalendar(this.#currentMonthView);
    }

    /** Helper para la vista de Calendario (Dibuja la tabla). */
    #renderCalendar(dateToShow) {
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
            const evs = this.#state.evaluations.filter(ev => ev.date === dateStr);
            html += `<td class="cal-day ${isToday ? 'is-today' : ''}"><div class="day-number">${date}</div><div class="events-list">${evs.map(ev => `<div class="ev-item" title="${TeacherApp.#escapeHtml(ev.name)}">${TeacherApp.#escapeHtml(ev.name)}</div>`).join('')}</div></td>`;
            date++;
          }
        }
        html += '</tr>';
        if (date > daysInMonth) break;
      }
      html += '</tbody></table>';
      container.innerHTML = html;
    }

    /**
     * VISTA 6: PERFIL
     * @private
     */
    #renderProfile() {
      const t = this.#state.teacher || {};
      const initials = (t.name || '').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
      this.#DOM.contentEl.innerHTML = `
        <div class="card profile-card" id="profile-card-container">
          <div style="display:flex;gap:1.5rem;align-items:center;flex-wrap:wrap; margin-bottom: 1.5rem;">
            <div class="avatar" style="width: 80px; height: 80px; font-size: 2rem; border-radius: var(--radius-lg); background: ${t.avatarColor || '#6d28d9'};">${initials}</div>
            <div style="flex:1;min-width:240px">
              <h3 style="margin: 0 0 0.5rem 0;">${TeacherApp.#escapeHtml(t.name || '')}</h3>
              <div style="color: var(--muted);">${TeacherApp.#escapeHtml(t.subject || '')}</div>
            </div>
            <button data-action="edit-profile" class="btn">Editar Perfil</button>
          </div>
          <div class="profile-field"><strong>Email</strong><div>${TeacherApp.#escapeHtml(t.email || '-')}</div></div>
          <div class="profile-field"><strong>Teléfono</strong><div>${TeacherApp.#escapeHtml(t.phone || '-')}</div></div>
          <div class="profile-field" style="margin-top: 1rem;"><strong>Biografía</strong><p style="margin-top: 6px; color:var(--ink-2); white-space: pre-wrap;">${TeacherApp.#escapeHtml(t.bio || '-')}</p></div>
        </div>`;
    }

    /** Helper para la vista de Perfil (Formulario de Edición). */
    #renderProfileEditForm() {
      const t = this.#state.teacher || {};
      const container = document.getElementById('profile-card-container');
      if (!container) return;
      container.innerHTML = `
        <h3>Editar Perfil</h3>
        <div class="profile-form">
          <label>Nombre</label><input id="prof-name" type="text" placeholder="Nombre" value="${TeacherApp.#escapeHtml(t.name || '')}" />
          <label>Asignatura</label><input id="prof-subject" type="text" placeholder="Asignatura" value="${TeacherApp.#escapeHtml(t.subject || '')}" />
          <label>Email</label><input id="prof-email" type="email" placeholder="Email" value="${TeacherApp.#escapeHtml(t.email || '')}" />
          <label>Teléfono</label><input id="prof-phone" type="tel" placeholder="Teléfono" value="${TeacherApp.#escapeHtml(t.phone || '')}" />
          <label>Biografía</label><textarea id="prof-bio" rows="4" placeholder="Biografía">${TeacherApp.#escapeHtml(t.bio || '')}</textarea>
          <div style="display:flex;gap:.5rem; justify-content: flex-end; margin-top: 1rem;">
            <button data-action="cancel-profile" class="btn btn-secondary">Cancelar</button>
            <button data-action="save-profile" class="btn">Guardar Cambios</button>
          </div>
        </div>`;
    }

    /**
     * VISTA MODAL: AGREGAR EVALUACIÓN
     * @private
     */
    #renderAddEvaluationModal() {
      const modalOverlay = document.createElement('div');
      modalOverlay.className = 'modal-overlay'; 
      const courseOptions = this.#state.courses.map(c => `<option value="${c.id}">${TeacherApp.#escapeHtml(c.name)}</option>`).join('');
      modalOverlay.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
          <div class="modal-header"><h3>Agregar Nueva Evaluación</h3><button class="modal-close" data-action="close-modal">&times;</button></div>
          <div class="modal-body" style="display:flex; flex-direction:column; gap:1rem;">
            <div><label for="modal-course-id">Asignatura / Curso</label><select id="modal-course-id">${courseOptions}</select></div>
            <div><label for="modal-eval-name">Nombre de la Evaluación</label><input id="modal-eval-name" type="text" placeholder="Ej: Parcial 1"></div>
            <div><label for="modal-eval-date">Fecha</label><input id="modal-eval-date" type="date" value="${TeacherApp.#todayISO()}"></div>
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
          this.#state.evaluations.push({ id: TeacherApp.#genId(), name: evalName, date: evalDate, courseId });
          this.#saveState();
          closeModal();
          this.#renderGrades(); // Recarga la vista de tareas
        }
      });
    }

    /**
     * VISTA PARCIAL: ACTUALIZAR UI
     * @private
     */
    #updateProfileUI() {
      const name = this.#state.teacher.name || 'Profesor';
      const initials = name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
      
      document.querySelectorAll('.avatar, .avatar-mini').forEach(el => {
        el.textContent = initials;
        if (el.classList.contains('avatar')) {
          el.style.background = `linear-gradient(135deg, ${this.#state.teacher.avatarColor || '#6d28d9'}, var(--accent-2))`;
        }
      });
      
      if (this.#DOM.userNameMini) this.#DOM.userNameMini.textContent = name;
      if (this.#DOM.profileName) this.#DOM.profileName.textContent = name;
      if (this.#DOM.profileRole) this.#DOM.profileRole.textContent = this.#state.teacher.subject || 'Profesor';
    }


    /*
    ============================================================================
    | SECCIÓN 6: MANEJADORES DE EVENTOS (#handlers)                            |
    ============================================================================
    |
    | Métodos privados que se ejecutan cuando ocurre un evento.
    |
    */

    /**
     * Maneja los clics en la navegación principal (Sidebar).
     * ¡ESTA FUNCIÓN ARREGLA EL BUG 404!
     * @param {Event} e - El objeto de evento del clic.
     * @private
     */
    #onNavClick(e) {
      const link = e.target.closest('a');
      if (!link) return;
      
      // Previene que el navegador recargue la página
      e.preventDefault(); 
      
      this.#DOM.menuLinks.forEach(a => a.classList.remove('active'));
      link.classList.add('active');
      
      const title = link.querySelector('span') ? link.querySelector('span').textContent : 'Dashboard';
      if (this.#DOM.topbarTitle) this.#DOM.topbarTitle.textContent = title;

      this.#renderContent(link.getAttribute('href'));
      
      if (this.#DOM.mq.matches && this.#DOM.sidebar.classList.contains('open')) {
        this.#toggleSidebar(false);
      }
    }

    /**
     * Maneja los clics en el botón de hamburguesa (toggle).
     * @param {Event} e - El objeto de evento del clic.
     * @private
     */
    #onToggleClick(e) {
      e.stopPropagation();
      const isExpanded = this.#DOM.mq.matches ? this.#DOM.sidebar.classList.contains('open') : !this.#DOM.sidebar.classList.contains('closed');
      this.#toggleSidebar(!isExpanded);
    }

    /**
     * Abre o cierra la sidebar y actualiza ARIA.
     * @param {boolean} [forceOpen] - Opcional. Forzar un estado.
     * @private
     */
    #toggleSidebar(forceOpen) {
      let open;
      if (this.#DOM.mq.matches) {
        open = forceOpen !== undefined ? forceOpen : !this.#DOM.sidebar.classList.contains('open');
        this.#DOM.sidebar.classList.toggle('open', open);
      } else {
        open = forceOpen !== undefined ? forceOpen : this.#DOM.sidebar.classList.contains('closed');
        this.#DOM.sidebar.classList.toggle('closed', !open);
      }
      this.#DOM.toggleBtn.setAttribute('aria-expanded', open);
    }

    /**
     * Maneja clics en el <body> (para cerrar el menú móvil).
     * @param {Event} e - El objeto de evento del clic.
     * @private
     */
    #onBodyClick(e) {
      if (!this.#DOM.mq.matches) return;
      const inside = e.target.closest('#sidebar') || e.target.closest('#toggle');
      if (!inside && this.#DOM.sidebar.classList.contains('open')) {
        this.#toggleSidebar(false);
      }
    }

    /**
     * Maneja el redimensionamiento de la ventana.
     * @private
     */
    #onResize() {
      if (this.#DOM.mq.matches) {
        this.#DOM.sidebar.classList.remove('closed');
        this.#DOM.sidebar.classList.remove('open');
        this.#DOM.toggleBtn.setAttribute('aria-expanded', false);
      } else {
        this.#DOM.sidebar.classList.remove('open');
        this.#DOM.toggleBtn.setAttribute('aria-expanded', !this.#DOM.sidebar.classList.contains('closed'));
      }
    }

    /**
     * Manejador de CLICS para TODO el contenido dinámico.
     * Usa delegación de eventos en `data-action`.
     * @param {Event} e - El objeto de evento del clic.
     * @private
     */
    #onContentClick(e) {
      const target = e.target.closest('[data-action]');
      if (!target) return;
      const action = target.dataset.action;

      switch (action) {
        case 'reset-data':
          if (confirm('¿Resetear datos a demo?')) {
            localStorage.removeItem(this.#STORAGE_KEY);
            location.reload();
          }
          break;
        case 'show-add-eval-modal':
          this.#renderAddEvaluationModal();
          break;
        case 'sort-by-avg': {
          const searchTerm = this.#DOM.contentEl.querySelector('#grade-search-input')?.value || '';
          const sortByAvg = !target.classList.contains('active');
          this.#renderGrades({ searchTerm, sortByAvg });
          break;
        }
        case 'add-announcement': {
          const title = this.#DOM.contentEl.querySelector('#new-an-title').value.trim();
          const content = this.#DOM.contentEl.querySelector('#new-an-content').value.trim();
          if (!title || !content) return alert('El título y el contenido son obligatorios.');
          this.#state.announcements.unshift({ id: TeacherApp.#genId('an-'), title, content, date: TeacherApp.#todayISO() });
          this.#saveState();
          this.#renderAnnouncements();
          break;
        }
        case 'cal-prev':
          this.#currentMonthView.setMonth(this.#currentMonthView.getMonth() - 1);
          this.#renderCalendar(this.#currentMonthView);
          break;
        case 'cal-next':
          this.#currentMonthView.setMonth(this.#currentMonthView.getMonth() + 1);
          this.#renderCalendar(this.#currentMonthView);
          break;
        case 'edit-profile':
          this.#renderProfileEditForm();
          break;
        case 'cancel-profile':
          this.#renderProfile();
          break;
        case 'save-profile':
          this.#state.teacher.name = document.getElementById('prof-name').value.trim();
          this.#state.teacher.subject = document.getElementById('prof-subject').value.trim();
          this.#state.teacher.email = document.getElementById('prof-email').value.trim();
          this.#state.teacher.phone = document.getElementById('prof-phone').value.trim();
          this.#state.teacher.bio = document.getElementById('prof-bio').value.trim();
          this.#saveState();
          this.#updateProfileUI();
          this.#renderProfile();
          break;
      }
    }

    /**
     * Manejador de CAMBIOS (CHANGE) para contenido dinámico.
     * @param {Event} e - El objeto de evento 'change'.
     * @private
     */
    #onContentChange(e) {
      if (e.target.matches('.grade-input')) {
        // FIX para la palabra reservada 'eval'
        const { student, eval: evalId } = e.target.dataset;
        const value = parseFloat(e.target.value);
        if (!this.#state.grades[student]) this.#state.grades[student] = {};
        if (isNaN(value)) {
          delete this.#state.grades[student][evalId];
          e.target.value = '';
        } else {
          const validGrade = Math.max(0, Math.min(7, value));
          this.#state.grades[student][evalId] = validGrade;
          if (validGrade !== value) e.target.value = validGrade;
        }
        this.#saveState();
        const courseId = this.#state.evaluations.find(ev => ev.id === evalId)?.courseId;
        if (courseId) {
          const avg = this.#computeCourseAverage(student, courseId);
          const avgEl = document.querySelector(`#avg-${student}-${courseId}`);
          if (avgEl) avgEl.textContent = isNaN(avg) ? '-' : avg.toFixed(2);
        }
      }
    }

    /**
     * Manejador de ESCRITURA (INPUT) para contenido dinámico.
     * @param {Event} e - El objeto de evento 'input'.
     * @private
     */
    #onContentInput(e) {
      if (e.target.id === 'student-search-input') {
        this.#renderStudents(e.target.value);
      }
      if (e.target.id === 'grade-search-input') {
        const searchTerm = e.target.value;
        const sortByAvg = this.#DOM.contentEl.querySelector('[data-action="sort-by-avg"]')?.classList.contains('active') || false;
        // Optimización: Solo re-dibuja las tablas
        this.#DOM.contentEl.querySelectorAll('.course-accordion').forEach(accordion => {
          const courseId = accordion.dataset.courseId;
          const course = this.#state.courses.find(c => c.id === courseId);
          if (course) {
            const tableContainer = accordion.querySelector('.course-content');
            if (tableContainer) {
              tableContainer.innerHTML = this.#renderCourseGradeTable(course, { searchTerm, sortByAvg });
            }
          }
        });
      }
    }

  } // --- FIN DE LA CLASE TeacherApp ---


  /**
   * ===========================================================================
   * | INICIALIZACIÓN DE LA APLICACIÓN                                        |
   * ===========================================================================
   *
   * Esta es la única línea que se ejecuta globalmente (dentro del
   * DOMContentLoaded).
   *
   * Crea una nueva instancia de nuestra clase `TeacherApp`,
   * lo que automáticamente llama al `constructor()` y pone
   * en marcha toda la aplicación.
   */
  new TeacherApp();

}); // --- FIN DE DOMContentLoaded ---
=======
document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.getElementById("sidebar");
  const toggleBtn = document.getElementById("toggle");
  const overlay = document.getElementById("overlay");
  const content = document.getElementById("content-area");
  const topbarTitle = document.getElementById("topbar-title");
  const menuLinks = document.querySelectorAll(".menu a[data-section]");

  // 👇 agregamos TODOS los endpoints que usa el JS
  const API = {
    cursos: "/profesorView/cursos/",
    perfil: "/profesorView/perfil-data/",
    alumnos: (classId) => `/profesorView/curso/${classId}/alumnos/`,
    asignaturas: (classId) => `/profesorView/curso/${classId}/asignaturas/`,
    crearEvaluacion: "/profesorView/crear-evaluacion/",
    // NUEVO: evaluaciones de un curso (tienes que crear el endpoint en Django)
    evaluacionesCurso: (classId) => `/profesorView/curso/${classId}/evaluaciones/`,
    // NUEVO: guardar notas de una evaluación
    guardarNotas: (evalId) => `/profesorView/evaluacion/${evalId}/notas/guardar/`,
  };

  function setTitle(section) {
    const pretty = section.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());
    if (topbarTitle) topbarTitle.textContent = pretty;
  }

  // =========================
  // router
  // =========================
  function load(section) {
    setTitle(section);

    // marcar menú
    menuLinks.forEach((l) => l.classList.remove("active"));
    const current = document.querySelector(`.menu a[data-section="${section}"]`);
    if (current) current.classList.add("active");

    // RUTAS:
    if (section === "dashboard") return renderDashboard();
    if (section === "mis-cursos") return renderCursos();
    if (section === "crear-evaluacion") return renderCrearEval();
    if (section === "ingresar-notas") return renderIngresarNotas();     // 👈 NUEVA
    if (section === "mis-notas") return renderMisNotas();               // 👈 NUEVA
    if (section === "perfil") return renderPerfil();

    content.innerHTML = `<div class="card">Sección "${section}" no implementada.</div>`;
  }

  // =========================
  // dashboard simple
  // =========================
  function renderDashboard() {
    content.innerHTML = `
      <div class="card">
        <h2 class="card-title">Bienvenido, ${profesor.nombre}</h2>
        <p>Panel del profesor.</p>
      </div>`;
  }

  // =========================
  // cursos del profe
  // =========================
  async function renderCursos() {
    content.innerHTML = `<div class="card">Cargando cursos...</div>`;
    let cursos = [];
    try {
      const r = await fetch(API.cursos);
      cursos = await r.json();
    } catch (err) {
      console.warn(err);
      content.innerHTML = `<div class="card">No se pudieron cargar los cursos.</div>`;
      return;
    }

    if (!Array.isArray(cursos) || cursos.length === 0) {
      content.innerHTML = `<div class="card"><h2>Mis Cursos</h2><p>No tienes cursos asignados.</p></div>`;
      return;
    }

    content.innerHTML = `
      <div class="card">
        <h2 class="card-title"><i class="fa-solid fa-chalkboard"></i> Mis Cursos</h2>
        <div class="clases-grid" id="cursos-list"></div>
      </div>`;

    const list = content.querySelector("#cursos-list");
    cursos.forEach((c) => {
      const el = document.createElement("div");
      el.className = "clase-card";
      el.innerHTML = `
        <div class="clase-icon"><i class="fa-solid fa-users"></i></div>
        <div class="clase-info">
          <h3>${c.nombre}</h3>
          <div class="btns-inline">
            <button class="btn-ver" data-id="${c.id}">Ver alumnos</button>
            <button class="btn-eval" data-id="${c.id}">Crear evaluación</button>
          </div>
        </div>`;
      list.appendChild(el);
    });

    // delegación
    list.addEventListener("click", (e) => {
      const btnAlu = e.target.closest("button.btn-ver");
      const btnEval = e.target.closest("button.btn-eval");
      if (btnAlu) {
        const card = btnAlu.closest(".clase-card");
        const nombreCurso = card.querySelector("h3").textContent;
        return renderAlumnos(btnAlu.dataset.id, nombreCurso);
      }
      if (btnEval) {
        return renderCrearEval(btnEval.dataset.id); // crear eval ya con curso elegido
      }
    });
  }

  // =========================
  // alumnos de un curso
  // =========================
  async function renderAlumnos(classId, nombreCurso) {
    content.innerHTML = `<div class="card">Cargando alumnos...</div>`;
    let alumnos = [];
    try {
      const r = await fetch(API.alumnos(classId));
      alumnos = await r.json();
    } catch (err) {
      content.innerHTML = `<div class="card">No se pudieron cargar los alumnos.</div>`;
      return;
    }

    const rows = Array.isArray(alumnos) && alumnos.length
      ? alumnos
          .map(
            (a) => `
          <tr>
            <td>${a.nombre}</td>
            <td>${a.rut || "--"}</td>
          </tr>`
          )
          .join("")
      : `<tr><td colspan="2">Sin alumnos.</td></tr>`;

    content.innerHTML = `
      <div class="card">
        <h2 class="card-title">${nombreCurso} — Alumnos</h2>
        <div class="tabla-card">
          <div class="tabla-body">
            <table class="tabla-notas">
              <thead><tr><th>Nombre</th><th>RUT</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
        <p style="margin-top:10px;">
          <a href="#" data-section="mis-cursos" id="link-volver-cursos">Volver a cursos</a>
        </p>
      </div>`;

    const back = document.getElementById("link-volver-cursos");
    if (back) {
      back.addEventListener("click", (e) => {
        e.preventDefault();
        load("mis-cursos");
      });
    }
  }

  // =========================
  // PERFIL
  // =========================
  async function renderPerfil() {
    content.innerHTML = `<div class="card">Cargando perfil...</div>`;
    let p = {};
    try {
      const r = await fetch(API.perfil);
      p = await r.json();
    } catch (err) {
      content.innerHTML = `<div class="card">No se pudo cargar el perfil.</div>`;
      return;
    }

    content.innerHTML = `
      <div class="perfil-card">
        <div class="perfil-header">
          <div class="perfil-banner"></div>
          <div class="perfil-avatar">
            <div class="avatar-circle">${(p.nombre || "--")
              .split(" ")
              .map((s) => s[0] || "")
              .join("")
              .slice(0, 2)
              .toUpperCase()}</div>
            <h2>${p.nombre}</h2>
            <p class="perfil-sub">RUT ${p.rut || "--"} • ${p.email || "--"}</p>
          </div>
        </div>
        <div class="perfil-body">
          <div class="perfil-info-box">
            <h3>Información</h3>
            <table>
              <tr><td>Nombre</td><td>${p.nombre}</td></tr>
              <tr><td>RUT</td><td>${p.rut || "--"}</td></tr>
              <tr><td>Correo</td><td>${p.email || "--"}</td></tr>
            </table>
          </div>
        </div>
      </div>`;
  }

  // =========================
  // CREAR EVALUACIÓN (2 pasos)
  // =========================
  async function renderCrearEval(preselectedClassId = null) {
    content.innerHTML = `
      <div class="card">
        <h2>Crear evaluación</h2>
        <p>Selecciona el curso y completa los datos.</p>
        <label>Curso</label>
        <select id="select-curso">
          <option value="">Cargando cursos...</option>
        </select>

        <div id="eval-form-wrap" style="margin-top:1rem;"></div>
      </div>
    `;

    const selCurso = document.getElementById("select-curso");
    const formWrap = document.getElementById("eval-form-wrap");

    // cargar cursos
    let cursos = [];
    try {
      const r = await fetch(API.cursos);
      cursos = await r.json();
    } catch (err) {
      selCurso.innerHTML = `<option value="">Error al cargar cursos</option>`;
      return;
    }

    if (!Array.isArray(cursos) || cursos.length === 0) {
      selCurso.innerHTML = `<option value="">No tienes cursos</option>`;
      return;
    }

    selCurso.innerHTML = `<option value="">-- elegir curso --</option>`;
    cursos.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.nombre;
      selCurso.appendChild(opt);
    });

    if (preselectedClassId) {
      selCurso.value = preselectedClassId;
      await buildEvalForm(preselectedClassId, formWrap);
    }

    selCurso.addEventListener("change", async () => {
      const classId = selCurso.value;
      formWrap.innerHTML = "";
      if (!classId) return;
      await buildEvalForm(classId, formWrap);
    });
  }

  async function buildEvalForm(classId, container) {
    container.innerHTML = `
      <label>Asignatura</label>
      <select id="subject-select"><option value="">Cargando...</option></select>

      <label style="margin-top:.5rem;">Nombre / descripción</label>
      <input id="eval-desc" required>

      <label>Fecha</label>
      <input type="date" id="eval-date" required>

      <label>Ponderación</label>
      <input type="number" id="eval-weight" step="0.1" value="1">

      <label>Tipo de evaluación</label>
      <input id="eval-type-name" placeholder="Ej: Prueba, Control" required>

      <button id="btn-save-eval" class="btn" style="margin-top:1rem;">Crear evaluación</button>
    `;

    const selSubject = document.getElementById("subject-select");

    // cargar asignaturas del profe en ese curso
    try {
      const r = await fetch(API.asignaturas(classId));
      const asignaturas = await r.json();
      selSubject.innerHTML = "";
      if (Array.isArray(asignaturas) && asignaturas.length) {
        selSubject.innerHTML = `<option value="">-- elegir asignatura --</option>`;
        asignaturas.forEach((s) => {
          const opt = document.createElement("option");
          opt.value = s.id;
          opt.textContent = s.name || s.nombre || "Asignatura";
          selSubject.appendChild(opt);
        });
      } else {
        selSubject.innerHTML = `<option value="">(no tienes asignaturas en este curso)</option>`;
      }
    } catch (err) {
      selSubject.innerHTML = `<option value="">Error al cargar asignaturas</option>`;
    }

    const btnSave = document.getElementById("btn-save-eval");
    btnSave.addEventListener("click", async () => {
      const subjectId = selSubject.value;
      const desc = document.getElementById("eval-desc").value.trim();
      const date = document.getElementById("eval-date").value;
      const weight = document.getElementById("eval-weight").value || "1";
      const typeName = document.getElementById("eval-type-name").value.trim();

      if (!subjectId) return alert("Debes elegir una asignatura");
      if (!desc) return alert("Debes escribir una descripción");
      if (!date) return alert("Debes elegir una fecha");
      if (!typeName) return alert("Debes indicar el tipo de evaluación");

      const fd = new FormData();
      fd.append("class_id", classId);
      fd.append("subject_id", subjectId);
      fd.append("description", desc);
      fd.append("date", date);
      fd.append("weight", weight);
      fd.append("evaluation_type_name", typeName);

      const r = await fetch(API.crearEvaluacion, {
        method: "POST",
        body: fd,
        headers: {
          "X-CSRFToken": profesor.csrf,
        },
      });
      const res = await r.json();
      if (res.success) {
        alert("Evaluación creada ✅");
        load("mis-cursos");
      } else {
        alert(res.error || "Error al crear la evaluación");
      }
    });
  }

  // =========================
  // INGRESAR NOTAS (lo que enviaste)
  // =========================
  async function renderIngresarNotas() {
    content.innerHTML = `
      <div class="card">
        <h2 class="card-title">Ingresar notas</h2>
        <label>Curso</label>
        <select id="notas-select-curso">
          <option value="">Cargando cursos...</option>
        </select>

        <label style="margin-top:.7rem;">Evaluación</label>
        <select id="notas-select-eval" disabled>
          <option value="">Primero elige un curso</option>
        </select>

        <div id="notas-alumnos-wrap" style="margin-top:1rem;"></div>
      </div>
    `;

    const selCurso = document.getElementById("notas-select-curso");
    const selEval = document.getElementById("notas-select-eval");
    const alumnosWrap = document.getElementById("notas-alumnos-wrap");

    // cargar cursos
    let cursos = [];
    try {
      const r = await fetch(API.cursos);
      cursos = await r.json();
    } catch (err) {
      selCurso.innerHTML = `<option value="">Error al cargar cursos</option>`;
      return;
    }

    if (!Array.isArray(cursos) || cursos.length === 0) {
      selCurso.innerHTML = `<option value="">No tienes cursos</option>`;
      return;
    }

    selCurso.innerHTML = `<option value="">-- elegir curso --</option>`;
    cursos.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.nombre;
      selCurso.appendChild(opt);
    });

    selCurso.addEventListener("change", async () => {
      const classId = selCurso.value;
      selEval.innerHTML = `<option value="">Cargando evaluaciones...</option>`;
      selEval.disabled = true;
      alumnosWrap.innerHTML = "";

      if (!classId) return;

      // pedir evaluaciones del curso
      let evals = [];
      try {
        const r = await fetch(API.evaluacionesCurso(classId));
        if (r.ok) {
          evals = await r.json();
        } else {
          selEval.innerHTML = `<option value="">(Falta endpoint /curso/${classId}/evaluaciones/)</option>`;
          return;
        }
      } catch (err) {
        selEval.innerHTML = `<option value="">No se pudieron cargar</option>`;
        return;
      }

      if (!Array.isArray(evals) || evals.length === 0) {
        selEval.innerHTML = `<option value="">No hay evaluaciones para este curso</option>`;
        return;
      }

      selEval.disabled = false;
      selEval.innerHTML = `<option value="">-- elegir evaluación --</option>`;
      evals.forEach((ev) => {
        const opt = document.createElement("option");
        opt.value = ev.id;
        opt.textContent = `${ev.description || ev.nombre || "Evaluación"} (${ev.date || ""})`;
        selEval.appendChild(opt);
      });
    });

    selEval.addEventListener("change", async () => {
      const classId = selCurso.value;
      const evalId = selEval.value;
      alumnosWrap.innerHTML = "";

      if (!evalId) return;

      // cargar alumnos
      let alumnos = [];
      try {
        const r = await fetch(API.alumnos(classId));
        alumnos = await r.json();
      } catch (err) {
        alumnosWrap.innerHTML = `<p>No se pudieron cargar los alumnos.</p>`;
        return;
      }

      if (!Array.isArray(alumnos) || alumnos.length === 0) {
        alumnosWrap.innerHTML = `<p>Este curso no tiene alumnos.</p>`;
        return;
      }

      alumnosWrap.innerHTML = `
        <form id="form-notas">
          <div class="tabla-card">
            <div class="tabla-body">
              <table class="tabla-notas">
                <thead>
                  <tr><th>Alumno</th><th>RUT</th><th>Nota</th></tr>
                </thead>
                <tbody>
                  ${alumnos
                    .map(
                      (a) => `
                        <tr>
                          <td>${a.nombre}</td>
                          <td>${a.rut || "--"}</td>
                          <td><input type="number" min="1" max="7" step="0.1" name="${a.id}" placeholder="7.0"></td>
                        </tr>
                      `
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
          </div>
          <button type="submit" class="btn" style="margin-top:1rem;">Guardar notas</button>
        </form>
      `;

      const form = document.getElementById("form-notas");
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const r = await fetch(API.guardarNotas(evalId), {
          method: "POST",
          body: fd,
          headers: {
            "X-CSRFToken": profesor.csrf,
          },
        });
        const res = await r.json();
        if (res.success) {
          alert("Notas guardadas ✅");
        } else {
          alert(res.error || "Error al guardar notas");
        }
      });
    });
  }

// ====== MIS NOTAS (resumen) ======
  function renderMisNotas() {
    // usamos el mismo content que arriba: content-area
    const content = document.getElementById("content-area");
    if (!content) {
      console.error("No encontré #content-area");
      return;
    }

    content.innerHTML = `
      <div class="card">
        <h2 class="card-title">Mis cursos y notas</h2>
        <p>Cargando información...</p>
      </div>
    `;

    fetch("/profesorView/mis-cursos-notas/")
      .then((r) => r.json())
      .then((data) => {
        const cursos = data.cursos || [];
        if (!cursos.length) {
          content.innerHTML = `
            <div class="card">
              <h2 class="card-title">Mis cursos y notas</h2>
              <p>No tienes cursos asignados.</p>
            </div>
          `;
          return;
        }

        let html = "";
        cursos.forEach((c) => {
          let alumnosHtml = `
            <div class="alumnos-wrapper">
              <table class="tabla-alumnos">
                <thead>
                  <tr>
                    <th>Alumno</th>
                    <th>RUT</th>
                    <th>Notas</th>
                  </tr>
                </thead>
                <tbody>
          `;

          (c.alumnos || []).forEach((al) => {
            const notasTxt = (al.notas || [])
              .map((n) => n.evaluacion + ": " + (n.nota ?? "-"))
              .join(" | ");

            alumnosHtml += `
              <tr>
                <td>${al.nombre}</td>
                <td>${al.rut || "-"}</td>
                <td>${notasTxt}</td>
              </tr>
            `;
          });

          alumnosHtml += `
                </tbody>
              </table>
            </div>
          `;

          html += `
            <div class="card curso-card">
              <h3>${c.asignatura}</h3>
              <p><strong>Curso:</strong> ${c.curso}</p>
              ${alumnosHtml}
            </div>
          `;
        });

        content.innerHTML = html;
      })
      .catch((err) => {
        console.error(err);
        content.innerHTML = `
          <div class="card">
            <h2 class="card-title">Mis cursos y notas</h2>
            <p>Error al cargar los datos.</p>
          </div>
        `;
      });
  }

  // ====== NAV ====== (esto ya lo tenías)
  menuLinks.forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const section = a.getAttribute("data-section");
      load(section);

      if (sidebar && sidebar.classList.contains("open")) {
        sidebar.classList.remove("open");
        document.body.classList.remove("menu-open");
        if (overlay) overlay.style.display = "none";
      }
    });
  });

  // vista inicial
  load("dashboard");
});  // 👈👈 ESTE CERRABA TODO EL DOCUMENT.ADD... Y FALTABA
>>>>>>> feature/profesor-view
