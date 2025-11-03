/*
=========================================================
|   APLICACIÓN DE PROFESOR - VERSIÓN CORREGIDA (FIXED) |
=========================================================
|   - Arregla el bug de 'defaultState' (ReferenceError).
|   - Esto activará los listeners y arreglará el 404.
---------------------------------------------------------
*/

document.addEventListener('DOMContentLoaded', () => {

  // --- SELECTORES GLOBALES ---
  const contentEl = document.querySelector('.content');
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('toggle');
  const mq = window.matchMedia('(max-width: 700px)');

  if (!contentEl || !sidebar || !toggleBtn) {
    console.error('Error Crítico: Faltan elementos base del layout (sidebar, content, toggle).');
    return;
  }

  // --- ESTADO DE LA APLICACIÓN (ORDEN CORREGIDO) ---
  const STORAGE_KEY = 'profesores_state_v4_courses';
  let chart = null;
  let currentMonthView = new Date();

  // --- 1. UTILIDADES (Definidas primero) ---
  function genId(prefix = 'ev-') { return prefix + Math.random().toString(36).slice(2, 11); }
  function todayISO(offsetDays = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  }
  function escapeHtml(s = '') {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // --- 2. DATOS POR DEFECTO (Definidos antes de ser usados) ---
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
      { id: 'ev-m1', name: 'Prueba 1', date: todayISO(-10), courseId: 'C-01' },
      { id: 'ev-m2', name: 'Tarea 1', date: todayISO(-5), courseId: 'C-01' },
      { id: 'ev-f1', name: 'Laboratorio 1', date: todayISO(-8), courseId: 'C-02' },
      { id: 'ev-f2', name: 'Prueba de Química', date: todayISO(-2), courseId: 'C-02' }
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
      { id: genId('an-'), title: 'Reunión de Apoderados', content: 'Se les recuerda que la reunión de apoderados será el próximo viernes a las 18:00 hrs en la sala de conferencias.', date: todayISO(-2) }
    ]
  };

  // --- 3. GESTIÓN DE ESTADO (Definidas antes de ser usadas) ---
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        saveState(defaultState); // <-- Esto ahora funcionará
        return JSON.parse(JSON.stringify(defaultState));
      }
      const savedState = JSON.parse(raw);
      return { ...defaultState, ...savedState, teacher: { ...defaultState.teacher, ...(savedState.teacher || {}) } };
    } catch (e) {
      console.error('Error al cargar estado', e);
      return JSON.parse(JSON.stringify(defaultState));
    }
  }
  
  // La variable 'state' debe ser declarada ANTES de que saveState la use por defecto
  let state = {}; 
  
  function saveState(s = state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }

  // --- 4. INICIALIZACIÓN DEL ESTADO (Ahora es seguro) ---
  state = loadState();

  
  // --- LÓGICA DE NAVEGACIÓN / ROUTER ---
  const viewRenderers = {
    'dashboard': renderDashboardView,
    'estudiantes': renderStudentsView,
    'tareas': renderGradeEntryView,
    'anuncios': renderAnnouncementsView,
    'calendario': renderCalendarView,
    'perfil': renderProfileView,
  };

  function renderContent(target) {
    target = (target || 'dashboard').replace(/^\/+/, '');
    const renderFn = viewRenderers[target] || viewRenderers['dashboard'];
    
    if (target === 'calendario') {
      currentMonthView = new Date();
    }
    
    renderFn();
  }

  // --- RENDERIZADO DE VISTAS PROFESIONALES ---

  function renderDashboardView() {
    contentEl.innerHTML = `
      <div class="grid">
        <div class="kpi students">
          <i class="fa-solid fa-user-graduate fa-2x"></i>
          <div>
            <div class="num" id="kpi-students-count">--</div>
            <div>Estudiantes Totales</div>
          </div>
        </div>
        <div class="kpi classes">
          <i class="fa-solid fa-chalkboard fa-2x"></i>
          <div>
            <div class="num" id="kpi-courses-count">--</div>
            <div>Clases Activas</div>
          </div>
        </div>
      </div>

      <div class="grid" style="grid-template-columns: 2fr 1fr; margin-top: 1.5rem; align-items: flex-start;">
        <div class="card">
          <h3>Promedio de Evaluaciones</h3>
          <div class="chart-wrap">
            <canvas id="dashboard-chart"></canvas>
          </div>
        </div>
        <div class="card">
          <h3>Próximas Tareas (Demo)</h3>
          <ul class="task-list">
            <li>
              <strong>Calificar Ensayo</strong>
              <div>Curso: 8vo Básico - Vence Hoy</div>
            </li>
            <li>
              <strong>Preparar Guía N°5</strong>
              <div>Curso: 7mo A - Vence Mañana</div>
            </li>
            <li>
              <strong>Revisar Proyectos</strong>
              <div>Curso: 8vo A - Vence en 3 días</div>
            </li>
          </ul>
        </div>
      </div>
      <div style="margin-top:1rem; padding-top: 1rem; border-top: 1px solid var(--border); text-align: right;">
          <button data-action="reset-data" class="btn btn-secondary">Resetear datos (demo)</button>
      </div>`;
    
    document.getElementById('kpi-students-count').textContent = state.students.length;
    document.getElementById('kpi-courses-count').textContent = state.courses.length;
    renderDashboardChart();
  }

  function renderDashboardChart() {
    const canvas = document.getElementById('dashboard-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (chart) chart.destroy();

    const labels = state.evaluations.map(ev => ev.name);
    const averages = state.evaluations.map(ev => {
      const grades = Object.values(state.grades).map(sGrades => sGrades[ev.id]).filter(g => g !== undefined && g !== null);
      return grades.length ? grades.reduce((a, b) => a + b, 0) / grades.length : NaN;
    });

    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Promedio',
          data: averages,
          backgroundColor: 'rgba(15, 41, 76, 0.1)',
          borderColor: 'var(--primary)',
          tension: 0.3,
          fill: true,
          pointRadius: 6,
          pointBackgroundColor: 'var(--accent)',
          spanGaps: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { min: 1, max: 7, ticks: { stepSize: 1 } } }
      }
    });
  }

  function renderStudentsView(searchTerm = '') {
    const term = searchTerm.toLowerCase();
    const filteredStudents = state.students.filter(s => s.name.toLowerCase().includes(term));

    const rows = filteredStudents.map(s => {
      const avg = computeOverallStudentAverage(s.id);
      return `<tr>
        <td>${s.id}</td>
        <td>${escapeHtml(s.name)}</td>
        <td style="font-weight:700">${isNaN(avg) ? '-' : avg.toFixed(2)}</td>
        <td>${escapeHtml(state.courses.filter(c => c.studentIds.includes(s.id)).map(c => c.name).join(', '))}</td>
      </tr>`;
    }).join('');

    contentEl.innerHTML = `
      <div class="card">
        <h3>Listado General de Alumnos</h3>
        <div class="view-controls">
          <div class="search-wrapper">
            <i class="fa-solid fa-search"></i>
            <input type="search" id="student-search-input" placeholder="Buscar alumno por nombre..." value="${escapeHtml(searchTerm)}">
          </div>
        </div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr><th>ID</th><th>Nombre</th><th>Promedio General</th><th>Cursos</th></tr></thead>
            <tbody>
              ${rows.length > 0 ? rows : `<tr><td colspan="4" style="text-align:center; padding: 1rem;">No se encontraron alumnos.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  function renderGradeEntryView(filters = { searchTerm: '', sortByAvg: false }) {
    contentEl.innerHTML = `
      <div class="card">
        <div style="display:flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem;">
          <h3 style="margin:0;">Notas por Asignatura</h3>
          <button data-action="show-add-eval-modal" class="btn">
            <i class="fa-solid fa-plus" style="margin-right: 6px;"></i>Agregar Evaluación
          </button>
        </div>
        <div class="view-controls">
          <div class="search-wrapper">
            <i class="fa-solid fa-search"></i>
            <input type="search" id="grade-search-input" placeholder="Buscar alumno por nombre..." value="${escapeHtml(filters.searchTerm)}">
          </div>
          <button data-action="sort-by-avg" class="btn btn-secondary ${filters.sortByAvg ? 'active' : ''}">
            <i class="fa-solid fa-arrow-down-9-1" style="margin-right: 6px;"></i>Ordenar por Promedio
          </button>
        </div>
        <div id="courses-container" style="margin-top: 1rem;">
          ${state.courses.map(course => renderCourseAccordion(course, filters)).join('')}
        </div>
      </div>`;
  }

  function renderCourseAccordion(course, filters) {
    return `
      <details class="course-accordion" data-course-id="${course.id}" open>
        <summary>${escapeHtml(course.name)}</summary>
        <div class="course-content">
          ${renderCourseGradeTable(course, filters)}
        </div>
      </details>`;
  }

  function renderCourseGradeTable(course, filters) {
    const courseEvals = state.evaluations.filter(ev => ev.courseId === course.id);
    let courseStudents = course.studentIds.map(studentId => state.students.find(s => s.id === studentId)).filter(Boolean);

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      courseStudents = courseStudents.filter(s => s.name.toLowerCase().includes(term));
    }

    if (filters.sortByAvg) {
      courseStudents.sort((a, b) => (computeCourseAverage(b.id, course.id) || 0) - (computeCourseAverage(a.id, course.id) || 0));
    }
    
    if (courseStudents.length === 0) return '<p class="empty-state">No se encontraron alumnos.</p>';
    if (courseEvals.length === 0) return '<p class="empty-state">No hay evaluaciones para este curso.</p>';

    const header = `<thead><tr><th>Alumno</th>${courseEvals.map(ev => `<th>${escapeHtml(ev.name)}</th>`).join('')}<th>Promedio</th></tr></thead>`;
    
    const body = `<tbody>${courseStudents.map(student => {
      const cells = courseEvals.map(ev => {
        const grade = state.grades[student.id]?.[ev.id] ?? '';
        return `<td><input class="grade-input" type="number" step="0.1" min="0" max="7" value="${grade}" data-student="${student.id}" data-eval="${ev.id}"></td>`;
      }).join('');
      const avg = computeCourseAverage(student.id, course.id);
      return `<tr><td>${escapeHtml(student.name)}</td>${cells}<td id="avg-${student.id}-${course.id}">${isNaN(avg) ? '-' : avg.toFixed(2)}</td></tr>`;
    }).join('')}</tbody>`;

    return `<div class="table-wrapper"><table class="data-table">${header}${body}</table></div>`;
  }

  function renderAnnouncementsView() {
    const announcementsHtml = (state.announcements || []).slice().sort((a, b) => b.date.localeCompare(a.date)).map(an => `
      <div class="card" style="margin-bottom: 1rem;">
        <h4>${escapeHtml(an.title)} <span style="font-size: .8rem; color: var(--muted); font-weight: 500;">(${an.date})</span></h4>
        <p style="color: var(--ink-2); margin-top: 0.5rem; white-space: pre-wrap;">${escapeHtml(an.content)}</p>
      </div>
    `).join('');

    contentEl.innerHTML = `
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
        <div style="margin-top: 1.5rem;">
          <h4>Anuncios Publicados</h4>
          ${announcementsHtml || '<p class="empty-state">No hay anuncios publicados.</p>'}
        </div>
      </div>`;
  }

  function renderCalendarView() {
    contentEl.innerHTML = `
      <div class="card">
        <div class="calendar-header">
          <button data-action="cal-prev" class="btn btn-secondary"><i class="fa-solid fa-chevron-left"></i></button>
          <h3 id="cal-month-year"></h3>
          <button data-action="cal-next" class="btn btn-secondary"><i class="fa-solid fa-chevron-right"></i></button>
        </div>
        <div id="calendar-container" class="table-wrapper"></div>
      </div>`;
    
    renderCalendar(currentMonthView);
  }

  function renderCalendar(dateToShow) {
    const container = document.getElementById('calendar-container');
    if (!container) return;

    const titleEl = document.getElementById('cal-month-year');
    if (titleEl) {
      titleEl.textContent = dateToShow.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());
    }

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
          const prevDate = (prevMonthDays - startDay + 1 + j);
          html += `<td class="cal-day is-other-month"><div class="day-number">${prevDate}</div></td>`;
        } else if (date > daysInMonth) {
          html += `<td class="cal-day is-other-month"><div class="day-number">${nextMonthDate++}</div></td>`;
        } else {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
          const isToday = date === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          
          const evs = state.evaluations.filter(ev => ev.date === dateStr);
          
          html += `<td class="cal-day ${isToday ? 'is-today' : ''}">`;
          html += `<div class="day-number">${date}</div>`;
          html += `<div class="events-list">${evs.map(ev => `<div class="ev-item" title="${escapeHtml(ev.name)}">${escapeHtml(ev.name)}</div>`).join('')}</div>`;
          html += `</td>`;
          date++;
        }
      }
      html += '</tr>';
      if (date > daysInMonth) break;
    }
    
    html += '</tbody></table>';
    container.innerHTML = html;
  }

  function renderProfileView() {
    const t = state.teacher || {};
    const initials = (t.name || '').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
    
    const viewHtml = `
      <div style="display:flex;gap:1.5rem;align-items:center;flex-wrap:wrap; margin-bottom: 1.5rem;">
        <div class="avatar" style="width: 80px; height: 80px; font-size: 2rem; border-radius: var(--radius-lg); background: ${t.avatarColor || '#6d28d9'};">
          ${initials}
        </div>
        <div style="flex:1;min-width:240px">
          <h3 style="margin: 0 0 0.5rem 0;">${escapeHtml(t.name || '')}</h3>
          <div style="color: var(--muted);">${escapeHtml(t.subject || '')}</div>
        </div>
        <button data-action="edit-profile" class="btn">Editar Perfil</button>
      </div>
      <div class="profile-field"><strong>Email</strong><div>${escapeHtml(t.email || '-')}</div></div>
      <div class="profile-field"><strong>Teléfono</strong><div>${escapeHtml(t.phone || '-')}</div></div>
      <div class="profile-field" style="margin-top: 1rem;">
        <strong>Biografía</strong>
        <p style="margin-top: 6px; color:var(--ink-2); white-space: pre-wrap;">${escapeHtml(t.bio || '-')}</p>
      </div>`;
    
    contentEl.innerHTML = `
      <div class="card profile-card" id="profile-card-container">
        ${viewHtml}
      </div>`;
  }

  function renderProfileEditForm() {
    const t = state.teacher || {};
    const container = document.getElementById('profile-card-container');
    if (!container) return;
    
    container.innerHTML = `
      <h3>Editar Perfil</h3>
      <div class="profile-form">
        <label>Nombre</label>
        <input id="prof-name" type="text" placeholder="Nombre" value="${escapeHtml(t.name || '')}" />
        
        <label>Asignatura</label>
        <input id="prof-subject" type="text" placeholder="Asignatura" value="${escapeHtml(t.subject || '')}" />
        
        <label>Email</label>
        <input id="prof-email" type="email" placeholder="Email" value="${escapeHtml(t.email || '')}" />
        
        <label>Teléfono</label>
        <input id="prof-phone" type="tel" placeholder="Teléfono" value="${escapeHtml(t.phone || '')}" />
        
        <label>Biografía</label>
        <textarea id="prof-bio" rows="4" placeholder="Biografía">${escapeHtml(t.bio || '')}</textarea>
        
        <div style="display:flex;gap:.5rem; justify-content: flex-end; margin-top: 1rem;">
          <button data-action="cancel-profile" class="btn btn-secondary">Cancelar</button>
          <button data-action="save-profile" class="btn">Guardar Cambios</button>
        </div>
      </div>`;
  }

  // --- MODALES ---
  function renderAddEvaluationModal() {
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay'; 
    const courseOptions = state.courses.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');

    modalOverlay.innerHTML = `
      <div class="modal-content" style="max-width: 400px;">
        <div class="modal-header">
          <h3>Agregar Nueva Evaluación</h3>
          <button class="modal-close" data-action="close-modal">&times;</button>
        </div>
        <div class="modal-body" style="display:flex; flex-direction:column; gap:1rem;">
          <div><label for="modal-course-id">Asignatura / Curso</label><select id="modal-course-id">${courseOptions}</select></div>
          <div><label for="modal-eval-name">Nombre de la Evaluación</label><input id="modal-eval-name" type="text" placeholder="Ej: Parcial 1"></div>
          <div><label for="modal-eval-date">Fecha</label><input id="modal-eval-date" type="date" value="${todayISO()}"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" data-action="close-modal">Cancelar</button>
          <button id="modal-save-eval" class="btn">Crear Evaluación</button>
        </div>
      </div>`;

    document.body.appendChild(modalOverlay);
    
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
        
        state.evaluations.push({ id: genId(), name: evalName, date: evalDate, courseId });
        saveState();
        closeModal();
        renderGradeEntryView({ searchTerm: '', sortByAvg: false });
      }
    });
  }

  // --- LÓGICA DE CÁLCULO ---
  function computeCourseAverage(studentId, courseId) {
    const studentGrades = state.grades[studentId] || {};
    const courseEvalIds = state.evaluations.filter(ev => ev.courseId === courseId).map(ev => ev.id);
    const grades = courseEvalIds.map(evalId => studentGrades[evalId]).filter(g => g !== undefined && g !== null && g !== '');
    if (!grades.length) return NaN;
    return grades.reduce((a, b) => parseFloat(a) + parseFloat(b), 0) / grades.length;
  }

  function computeOverallStudentAverage(studentId) {
    const studentGrades = state.grades[studentId] || {};
    const grades = Object.values(studentGrades).filter(g => g !== undefined && g !== null && g !== '');
    if (!grades.length) return NaN;
    return grades.reduce((a, b) => parseFloat(a) + parseFloat(b), 0) / grades.length;
  }

  // --- ACTUALIZACIÓN DE UI (Sidebar/Topbar) ---
  function updateProfileUI() {
    const name = state.teacher.name || 'Profesor';
    const initials = name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
    
    document.querySelectorAll('.avatar, .avatar-mini').forEach(el => {
      el.textContent = initials;
      if (el.classList.contains('avatar')) {
        el.style.background = `linear-gradient(135deg, ${state.teacher.avatarColor || '#6d28d9'}, var(--accent-2))`;
      }
    });
    
    const userNameMini = document.querySelector('.user-mini-name');
    const profileName = document.querySelector('.profile-name');
    const profileRole = document.querySelector('.profile .role');
    
    if (userNameMini) userNameMini.textContent = name;
    if (profileName) profileName.textContent = name;
    if (profileRole) profileRole.textContent = state.teacher.subject || 'Profesor';
  }

  // =================================================================
  // --- INICIALIZACIÓN Y EVENT LISTENERS PRINCIPALES ---
  // =================================================================

  function setupNavigationListeners() {
    
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = mq.matches ? sidebar.classList.contains('open') : !sidebar.classList.contains('closed');
      toggleBtn.setAttribute('aria-expanded', !isExpanded);
      
      if (mq.matches) sidebar.classList.toggle('open');
      else sidebar.classList.toggle('closed');
    });

    const menu = document.querySelector('.menu');
    if (!menu) {
      console.error('Error Crítico: No se encontró el elemento .menu');
      return;
    }
    
    menu.addEventListener('click', e => {
      const link = e.target.closest('a');
      if (!link) return;
      
      e.preventDefault(); // ¡FIX DEL 404!
      
      document.querySelectorAll('.menu a').forEach(a => a.classList.remove('active'));
      link.classList.add('active');
      
      const title = link.querySelector('span') ? link.querySelector('span').textContent : 'Dashboard';
      const topbarTitle = document.querySelector('.topbar-title');
      if (topbarTitle) topbarTitle.textContent = title;

      renderContent(link.getAttribute('href'));
      
      if (mq.matches && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        toggleBtn.setAttribute('aria-expanded', false);
      }
    });

    document.addEventListener('click', (e) => {
      if (!mq.matches) return;
      const inside = e.target.closest('#sidebar') || e.target.closest('#toggle');
      if (!inside && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        toggleBtn.setAttribute('aria-expanded', false);
      }
    });

    function handleResize() {
      if (mq.matches) {
        sidebar.classList.remove('closed');
        sidebar.classList.remove('open');
        toggleBtn.setAttribute('aria-expanded', false);
      } else {
        sidebar.classList.remove('open');
        toggleBtn.setAttribute('aria-expanded', !sidebar.classList.contains('closed'));
      }
    }
    
    handleResize();
    mq.addEventListener('change', handleResize);
  }

  function setupContentEventListeners() {
    
    contentEl.addEventListener('click', (e) => {
      const target = e.target.closest('[data-action]');
      if (!target) return;

      const action = target.dataset.action;

      switch (action) {
        case 'reset-data':
          if (confirm('¿Resetear datos a demo?')) {
            localStorage.removeItem(STORAGE_KEY);
            location.reload();
          }
          break;
        case 'show-add-eval-modal':
          renderAddEvaluationModal();
          break;
        case 'sort-by-avg': {
          const searchTerm = document.getElementById('grade-search-input')?.value || '';
          const sortByAvg = !target.classList.contains('active');
          renderGradeEntryView({ searchTerm, sortByAvg });
          break;
        }
        case 'add-announcement': {
          const title = document.getElementById('new-an-title').value.trim();
          const content = document.getElementById('new-an-content').value.trim();
          if (!title || !content) return alert('El título y el contenido son obligatorios.');
          
          state.announcements.unshift({ id: genId('an-'), title, content, date: todayISO() });
          saveState();
          renderAnnouncementsView();
          break;
        }
        case 'cal-prev':
          currentMonthView.setMonth(currentMonthView.getMonth() - 1);
          renderCalendar(currentMonthView);
          break;
        case 'cal-next':
          currentMonthView.setMonth(currentMonthView.getMonth() + 1);
          renderCalendar(currentMonthView);
          break;
        case 'edit-profile':
          renderProfileEditForm();
          break;
        case 'cancel-profile':
          renderProfileView();
          break;
        case 'save-profile':
          state.teacher.name = document.getElementById('prof-name').value.trim();
          state.teacher.subject = document.getElementById('prof-subject').value.trim();
          state.teacher.email = document.getElementById('prof-email').value.trim();
          state.teacher.phone = document.getElementById('prof-phone').value.trim();
          state.teacher.bio = document.getElementById('prof-bio').value.trim();
          
          saveState();
          updateProfileUI();
          renderProfileView();
          break;
      }
    });

    contentEl.addEventListener('change', (e) => {
      if (e.target.matches('.grade-input')) {
        const studentId = e.target.dataset.student;
        const evalId = e.target.dataset.eval;
        const value = parseFloat(e.target.value);

        if (!state.grades[studentId]) state.grades[studentId] = {};
        if (isNaN(value)) {
          delete state.grades[studentId][evalId];
          e.target.value = '';
        } else {
          const validGrade = Math.max(0, Math.min(7, value));
          state.grades[studentId][evalId] = validGrade;
          if (validGrade !== value) e.target.value = validGrade;
        }
        
        saveState();

        const courseId = state.evaluations.find(ev => ev.id === evalId)?.courseId;
        if (courseId) {
          const avg = computeCourseAverage(studentId, courseId);
          const avgEl = document.querySelector(`#avg-${studentId}-${courseId}`);
          if (avgEl) avgEl.textContent = isNaN(avg) ? '-' : avg.toFixed(2);
        }
      }
    });

    contentEl.addEventListener('input', (e) => {
      if (e.target.id === 'student-search-input') {
        renderStudentsView(e.target.value);
      }
      
      if (e.target.id === 'grade-search-input') {
        const searchTerm = e.target.value;
        const sortByAvg = document.querySelector('[data-action="sort-by-avg"]')?.classList.contains('active') || false;
        
        document.querySelectorAll('.course-accordion').forEach(accordion => {
          const courseId = accordion.dataset.courseId;
          const course = state.courses.find(c => c.id === courseId);
          if (course) {
            const tableContainer = accordion.querySelector('.course-content');
            if (tableContainer) {
              tableContainer.innerHTML = renderCourseGradeTable(course, { searchTerm, sortByAvg });
            }
          }
        });
      }
    });
  }

  // --- ARRANQUE DE LA APLICACIÓN ---
  
  setupNavigationListeners();   // Configura la navegación (arregla el 404)
  setupContentEventListeners(); // Configura el contenido dinámico
  updateProfileUI();            // Actualiza la info del usuario
  renderContent('dashboard');   // Dibuja la vista inicial

});