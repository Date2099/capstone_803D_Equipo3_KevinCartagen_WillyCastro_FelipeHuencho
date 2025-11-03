// App funcional para módulo Profesores (Vista de Notas por Asignatura con Búsqueda y Filtros)

// SIDEBAR RESPONSIVO
const toggleBtn = document.getElementById('toggle');
const sidebar = document.getElementById('sidebar');
const mq = window.matchMedia('(max-width:700px)');

if (toggleBtn) {
  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (mq.matches) sidebar.classList.toggle('open');
    else sidebar.classList.toggle('closed');
  });
}
document.addEventListener('click', (e) => {
  if (!mq.matches) return;
  const inside = e.target.closest('#sidebar') || e.target.closest('#toggle');
  if (!inside && sidebar.classList.contains('open')) sidebar.classList.remove('open');
});
function updateSidebar() {
  if (mq.matches) {
    sidebar.classList.add('closed');
    sidebar.classList.remove('open');
  } else {
    sidebar.classList.remove('closed');
    sidebar.classList.remove('open');
  }
}
updateSidebar();
mq.addEventListener('change', updateSidebar);

// --- APP STATE & UTILITIES ---
const STORAGE_KEY = 'profesores_state_v4_courses'; // Nueva clave para la nueva estructura
const contentEl = document.querySelector('.content');
let chart = null;
let gradeViewFilters = { searchTerm: '', sortByAvg: false }; // Estado para los filtros

function genId(prefix = 'ev-') { return prefix + Math.random().toString(36).slice(2,9); }
function todayISO(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0,10);
}

const defaultState = {
  teacher: { id: 'T-1234', name: 'Juan Pérez', email: 'juan.perez@colegio.cl', subject: 'Ciencias', phone: '+56912345678', bio: 'Profesor titular de Ciencias Naturales y Física. Apasionado por la experimentación y el aprendizaje práctico.', avatarColor: '#6d28d9' },
  students: [
    { id: 'S-001', name: 'Ana Contreras' }, { id: 'S-002', name: 'Benjamín Soto' },
    { id: 'S-003', name: 'Carlos Díaz' }, { id: 'S-004', name: 'Daniela Espinoza' }
  ],
  courses: [
    { id: 'C-01', name: 'Matemáticas 4to B', studentIds: ['S-001', 'S-002', 'S-003'] },
    { id: 'C-02', name: 'Física 4to B', studentIds: ['S-001', 'S-004'] }
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
    'S-004': { 'ev-f1': 7.0, 'ev-f2': 6.2 }
  },
  announcements: [
      {id: genId('an-'), title: 'Reunión de Apoderados', content: 'Se les recuerda que la reunión de apoderados será el próximo viernes a las 18:00 hrs en la sala de conferencias.', date: todayISO(-2) }
  ]
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) { saveState(defaultState); return JSON.parse(JSON.stringify(defaultState)); }
    const savedState = JSON.parse(raw);
    return { ...defaultState, ...savedState, teacher: { ...defaultState.teacher, ...(savedState.teacher || {}) } };
  } catch (e) { console.error('Error al cargar estado', e); return JSON.parse(JSON.stringify(defaultState)); }
}
function saveState(s = state) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }

let state = loadState();
let currentMonthView = new Date(); // <--- CAMBIO 1 (AÑADIDO)

function updateProfileUI() {
  const name = state.teacher.name || 'Profesor';
  const initials = name.split(' ').map(n => n[0]).filter(Boolean).slice(0,2).join('').toUpperCase();
  document.querySelectorAll('.avatar, .avatar-mini').forEach(el => { el.textContent = initials; if(el.classList.contains('avatar')) el.style.background = `linear-gradient(135deg, ${state.teacher.avatarColor}, #f59e0b)`; });
  document.querySelector('.user-mini span').textContent = name;
  const profileNameEl = document.querySelector('.profile [style*="font-weight:800"]');
  if(profileNameEl) profileNameEl.textContent = name;
  const profileRoleEl = document.querySelector('.profile .role');
  if(profileRoleEl) profileRoleEl.textContent = state.teacher.subject || 'Profesor';
}

function escapeHtml(s=''){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function renderContent(target) {
  target = (target || 'dashboard').replace(/^\/+/, '');
  if (target === 'tareas' || target === 'notas') {
    gradeViewFilters = { searchTerm: '', sortByAvg: false };
    renderGradeEntryView();
  } else if (target === 'estudiantes') {
    renderStudentsView();
  } else if (target === 'calendario') {
    currentMonthView = new Date(); // <--- CAMBIO 2 (AÑADIDO)
    renderCalendarView();
  } else if (target === 'perfil') {
    renderProfileView();
  } else if (target === 'anuncios') {
    renderAnnouncementsView();
  } else {
    renderDashboardView();
  }
}

function renderDashboardView() {
  contentEl.innerHTML = `
    <div class="card chart-card">
      <h3>Rendimiento General de Evaluaciones</h3>
      <div class="chart-wrap" style="height:320px"><canvas id="chart"></canvas></div>
      <div class="grid" id="kpi-grid"></div>
      <div style="margin-top:12px;display:flex;gap:.5rem">
        <button id="reset-data" class="btn btn-secondary">Reset datos (demo)</button>
      </div>
    </div>`;
  document.getElementById('reset-data').addEventListener('click', ()=>{ if(confirm('¿Resetear datos a demo?')) { localStorage.removeItem(STORAGE_KEY); location.reload(); }});
  renderChart();
  renderKPIs();
}

function renderStudentsView() {
  const rows = state.students.map(s => {
    const avg = computeOverallStudentAverage(s.id);
    return `<tr>
      <td>${s.id}</td>
      <td>${s.name}</td>
      <td style="font-weight:700">${isNaN(avg) ? '-' : avg.toFixed(2)}</td>
    </tr>`;
  }).join('');
  contentEl.innerHTML = `<div class="card"><h3>Listado General de Alumnos</h3>
    <div class="table-wrapper"><table class="data-table" style="width:100%">
    <thead><tr><th>ID</th><th>Nombre</th><th>Promedio General</th></tr></thead>
    <tbody>${rows}</tbody>
    </table></div></div>`;
}

function renderGradeEntryView() {
  contentEl.innerHTML = `
    <div class="card">
      <div style="display:flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h3 style="margin:0;">Notas por Asignatura</h3>
        <button id="show-add-eval-modal" class="btn"><i class="fa-solid fa-plus" style="margin-right: 6px;"></i>Agregar Evaluación</button>
      </div>
      <div class="view-controls">
        <div class="search-wrapper">
          <i class="fa-solid fa-search"></i>
          <input type="search" id="student-search" placeholder="Buscar alumno por nombre..." value="${escapeHtml(gradeViewFilters.searchTerm)}">
        </div>
        <button id="sort-by-avg" class="btn btn-secondary ${gradeViewFilters.sortByAvg ? 'active' : ''}"><i class="fa-solid fa-arrow-down-9-1" style="margin-right: 6px;"></i>Ordenar por Promedio</button>
      </div>
      <div id="courses-container">${state.courses.map(course => renderCourseAccordion(course)).join('')}</div>
    </div>`;

  document.getElementById('show-add-eval-modal').addEventListener('click', renderAddEvaluationModal);
  
  document.getElementById('student-search').addEventListener('input', (e) => {
    gradeViewFilters.searchTerm = e.target.value;
    document.querySelectorAll('.course-accordion').forEach(details => {
      const courseId = details.dataset.courseId;
      const course = state.courses.find(c => c.id === courseId);
      if(course) {
          const content = details.querySelector('.course-content');
          if (content) content.innerHTML = renderCourseGradeTable(course);
      }
    });
    addGradeInputListeners();
  });

  document.getElementById('sort-by-avg').addEventListener('click', (e) => {
    gradeViewFilters.sortByAvg = !gradeViewFilters.sortByAvg;
    renderGradeEntryView();
  });

  addGradeInputListeners();
}

function renderCourseAccordion(course) {
  return `
    <details class="course-accordion" data-course-id="${course.id}" open>
      <summary>${escapeHtml(course.name)}</summary>
      <div class="course-content">${renderCourseGradeTable(course)}</div>
    </details>`;
}

function renderCourseGradeTable(course) {
  const courseEvals = state.evaluations.filter(ev => ev.courseId === course.id);
  let courseStudents = course.studentIds.map(studentId => state.students.find(s => s.id === studentId)).filter(Boolean);

  if (gradeViewFilters.searchTerm) {
    const term = gradeViewFilters.searchTerm.toLowerCase();
    courseStudents = courseStudents.filter(s => s.name.toLowerCase().includes(term));
  }

  if (gradeViewFilters.sortByAvg) {
    courseStudents.sort((a, b) => (computeCourseAverage(b.id, course.id) || 0) - (computeCourseAverage(a.id, course.id) || 0));
  }
  
  if (courseStudents.length === 0) return '<p style="padding: 1rem; text-align:center; color: var(--muted);">No se encontraron alumnos.</p>';
  if (courseEvals.length === 0) return '<p style="padding: 1rem; text-align:center; color: var(--muted);">No hay evaluaciones para este curso.</p>';

  const header = `<thead><tr><th>Alumno</th>${courseEvals.map(ev => `<th>${escapeHtml(ev.name)}</th>`).join('')}<th>Promedio</th></tr></thead>`;
  const body = `<tbody>${courseStudents.map(student => {
    const cells = courseEvals.map(ev => {
      const grade = state.grades[student.id]?.[ev.id] ?? '';
      return `<td><input class="grade-input" type="number" step="0.1" min="0" max="7" value="${grade}" data-student="${student.id}" data-eval="${ev.id}"></td>`;
    }).join('');
    const avg = computeCourseAverage(student.id, course.id);
    return `<tr><td>${escapeHtml(student.name)}</td>${cells}<td id="avg-${student.id}-${course.id}" style="font-weight:700">${isNaN(avg) ? '-' : avg.toFixed(2)}</td></tr>`;
_  }).join('')}</tbody>`;

  return `<div class="table-wrapper"><table class="data-table">${header}${body}</table></div>`;
}

function addGradeInputListeners() {
  document.querySelectorAll('.grade-input').forEach(inp => {
    inp.addEventListener('change', (e) => {
      const studentId = e.target.dataset.student;
      const evalId = e.target.dataset.eval;
      const value = parseFloat(e.target.value);

      if (!state.grades[studentId]) state.grades[studentId] = {};
      if (isNaN(value)) delete state.grades[studentId][evalId];
      else state.grades[studentId][evalId] = Math.max(0, Math.min(7, value));
      saveState();

      const courseId = state.evaluations.find(ev => ev.id === evalId)?.courseId;
      if (courseId) {
        const avg = computeCourseAverage(studentId, courseId);
        const avgEl = document.querySelector(`#avg-${studentId}-${courseId}`);
        if(avgEl) avgEl.textContent = isNaN(avg) ? '-' : avg.toFixed(2);
      }
    });
  });
}

function renderAddEvaluationModal() {
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay';
  const courseOptions = state.courses.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');

  modalOverlay.innerHTML = `<div class="modal-content" style="max-width: 400px;">
      <div class="modal-header"><h3>Agregar Nueva Evaluación</h3></div>
      <div class="modal-body" style="display:flex; flex-direction:column; gap:1rem;">
        <div><label>Asignatura / Curso</label><select id="modal-course-id" style="width:100%;">${courseOptions}</select></div>
        <div><label>Nombre de la Evaluación</label><input id="modal-eval-name" type="text" placeholder="Ej: Parcial 1" style="width:100%;"></div>
        <div><label>Fecha</label><input id="modal-eval-date" type="date" value="${todayISO()}" style="width:100%;"></div>
      </div>
      <div class="modal-footer"><button id="modal-cancel" class="btn btn-secondary">Cancelar</button><button id="modal-save" class="btn">Crear Evaluación</button></div>
    </div>`;

  document.body.appendChild(modalOverlay);
  const closeModal = () => modalOverlay.remove();
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });
  document.getElementById('modal-save').addEventListener('click', () => {
    const courseId = document.getElementById('modal-course-id').value;
    const evalName = document.getElementById('modal-eval-name').value.trim();
    const evalDate = document.getElementById('modal-eval-date').value;
    if (!courseId || !evalName || !evalDate) return alert('Todos los campos son obligatorios.');
    state.evaluations.push({ id: genId(), name: evalName, date: evalDate, courseId });
    saveState();
    closeModal();
    renderGradeEntryView();
  });
}

function renderAnnouncementsView() {
  const announcementsHtml = (state.announcements || []).slice().sort((a, b) => b.date.localeCompare(a.date)).map(an => `
    <div class="card" style="margin-bottom: 1rem;">
      <h4>${escapeHtml(an.title)} <span style="font-size: .8rem; color: var(--muted); font-weight: 500;">(${an.date})</span></h4>
      <p style="color: #374151;">${escapeHtml(an.content)}</p>
    </div>
  `).join('');

  contentEl.innerHTML = `
    <div class="card"><h3>Anuncios</h3>
      <div style="margin-top: 1rem; padding: 1rem; border: 1px solid var(--border); border-radius: var(--radius);">
        <h4>Crear Nuevo Anuncio</h4>
        <div style="display:flex; flex-direction:column; gap:.6rem; margin-top:10px;">
          <input id="new-an-title" type="text" placeholder="Título del anuncio" />
          <textarea id="new-an-content" rows="4" placeholder="Contenido..."></textarea>
          <div style="text-align: right;"><button id="add-announcement" class="btn">Publicar</button></div>
        </div>
      </div>
      <div style="margin-top: 1.5rem;"><h4>Anuncios Publicados</h4>${announcementsHtml || '<p>No hay anuncios publicados.</p>'}</div>
    </div>`;

  document.getElementById('add-announcement').addEventListener('click', () => {
    const title = document.getElementById('new-an-title').value.trim();
    const content = document.getElementById('new-an-content').value.trim();
    if (!title || !content) return alert('El título y el contenido son obligatorios.');
    if (!state.announcements) state.announcements = [];
    state.announcements.unshift({ id: 'an-' + Date.now(), title, content, date: todayISO() });
    saveState();
    renderAnnouncementsView();
  });
}

// ==========================================================
// --- INICIO: SECCIÓN CALENDARIO MODIFICADA (CAMBIO 3) ---
// ==========================================================

function renderCalendarView() {
    contentEl.innerHTML = `
    <div class="card">
      <div class="calendar-header">
        <button id="cal-prev" class="btn btn-secondary"><i class="fa-solid fa-chevron-left"></i></button>
        <h3 id="cal-month-year"></h3>
        <button id="cal-next" class="btn btn-secondary"><i class="fa-solid fa-chevron-right"></i></button>
      </div>
      <div id="calendar-container" class="table-wrapper"></div>
    </div>`;

    // Listeners para los nuevos botones
    document.getElementById('cal-prev').addEventListener('click', () => {
      currentMonthView.setMonth(currentMonthView.getMonth() - 1);
      renderCalendar(currentMonthView);
    });
  
    document.getElementById('cal-next').addEventListener('click', () => {
      currentMonthView.setMonth(currentMonthView.getMonth() + 1);
      renderCalendar(currentMonthView);
    });
  
    renderCalendar(currentMonthView); // Render inicial
}

// ==========================================================
// --- INICIO: SECCIÓN CALENDARIO MODIFICADA (CAMBIO 4) ---
// ==========================================================

function renderCalendar(dateToShow) {
  const container = document.getElementById('calendar-container');
  if (!container) return;

  // 1. Actualizar título (Ej: "Octubre 2025")
  const titleEl = document.getElementById('cal-month-year');
  if(titleEl) {
    titleEl.textContent = dateToShow.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());
  }

  const today = new Date(); // Para marcar el día actual
  const month = dateToShow.getMonth();
  const year = dateToShow.getFullYear();

  // 2. Calcular días
  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // 0=Dom, 1=Lun... 6=Sáb. Ajustamos para que la semana empiece en Lunes.
  let startDay = firstDayOfMonth.getDay(); // 0 (Domingo) - 6 (Sábado)
  if (startDay === 0) startDay = 6; // Domingo (0) se convierte en el 6to día (índice)
  else startDay = startDay - 1; // Lunes (1) se convierte en 0, etc.

  // Días del mes anterior
  const prevMonthDays = new Date(year, month, 0).getDate();

  // 3. Construir HTML
  const weekdays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  let html = '<table id="calendar"><thead><tr>' + weekdays.map(d => `<th>${d}</th>`).join('') + '</tr></thead><tbody>';
  
  let date = 1;
  let nextMonthDate = 1;

  for (let i = 0; i < 6; i++) { // 6 filas
    html += '<tr>';
    for (let j = 0; j < 7; j++) { // 7 días
      if (i === 0 && j < startDay) {
        // Días del mes anterior
        const prevDate = (prevMonthDays - startDay + 1 + j);
        html += `<td class="cal-day is-other-month"><div>${prevDate}</div></td>`;
      } else if (date > daysInMonth) {
        // Días del mes siguiente
        html += `<td class="cal-day is-other-month"><div>${nextMonthDate++}</div></td>`;
s     } else {
        // Día actual del mes
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
    if (date > daysInMonth) break; // Termina si ya no hay días
  }
  
  html += '</tbody></table>';
  container.innerHTML = html;
}

// ==========================================================
// --- FIN: SECCIÓN CALENDARIO MODIFICADA ---
// ==========================================================


function renderProfileView() {
  const t = state.teacher || {};
  contentEl.innerHTML = `
    <div class="card profile-card">
      <div style="display:flex;gap:1rem;align-items:center;flex-wrap:wrap">
        <div class="profile-avatar-big">${(t.name||'').split(' ').map(p=>p[0]).slice(0,2).join('').toUpperCase()}</div>
        <div style="flex:1;min-width:240px">
          <h3>Perfil del Profesor</h3>
          <div class="profile-field"><strong>Nombre</strong><div>${escapeHtml(t.name||'')}</div></div>
          <div class="profile-field"><strong>Asignatura Principal</strong><div>${escapeHtml(t.subject||'')}</div></div>
          <div class="profile-field"><strong>Email</strong><div>${escapeHtml(t.email||'')}</div></div>
          <div class="profile-field"><strong>Teléfono</strong><div>${escapeHtml(t.phone||'')}</div></div>
        </div>
      </div>
      <div style="margin-top:12px">
        <strong>Biografía</strong>
        <div style="margin-top:6px;color:#374151">${escapeHtml(t.bio||'')}</div>
      </div>
      <div style="margin-top:14px;display:flex;gap:.5rem">
        <button id="edit-profile" class="btn">Editar Perfil</button>
      </div>
    </div>`;

  document.getElementById('edit-profile').addEventListener('click', () => {
    const formHtml = `
      <div style="display:flex;flex-direction:column;gap:.6rem;margin-top:10px">
        <input id="prof-name" type="text" placeholder="Nombre" value="${(t.name||'')}" />
        <input id="prof-subject" type="text" placeholder="Asignatura" value="${(t.subject||'')}" />
        <input id="prof-email" type="text" placeholder="Email" value="${(t.email||'')}" />
        <input id="prof-phone" type="text" placeholder="Teléfono" value="${(t.phone||'')}" />
        <textarea id="prof-bio" rows="4" placeholder="Biografía">${(t.bio||'')}</textarea>
        <div style="display:flex;gap:.5rem">
          <button id="save-profile" class="btn">Guardar</button>
          <button id="cancel-profile" class="btn btn-secondary">Cancelar</button>
        </div>
      </div>`;
    const card = document.querySelector('.profile-card');
    const temp = document.createElement('div');
    temp.innerHTML = formHtml;
    card.appendChild(temp);
    document.getElementById('cancel-profile').addEventListener('click', () => renderProfileView());
    document.getElementById('save-profile').addEventListener('click', () => {
      state.teacher.name = document.getElementById('prof-name').value.trim();
      state.teacher.subject = document.getElementById('prof-subject').value.trim();
      state.teacher.email = document.getElementById('prof-email').value.trim();
      state.teacher.phone = document.getElementById('prof-phone').value.trim();
      state.teacher.bio = document.getElementById('prof-bio').value.trim();
      saveState();
      updateProfileUI();
      renderProfileView();
    });
  });
}

function renderChart() {
  const canvas = document.getElementById('chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (chart) chart.destroy();
  const labels = state.evaluations.map(ev => ev.name);
  const averages = state.evaluations.map(ev => {
    const grades = Object.values(state.grades).map(sGrades => sGrades[ev.id]).filter(g => g !== undefined);
    return grades.length ? grades.reduce((a, b) => a + b, 0) / grades.length : NaN;
  });
  const grad = ctx.createLinearGradient(0,0,0, canvas.parentElement.clientHeight || 300);
  grad.addColorStop(0, 'rgba(59,130,246,0.9)');
  grad.addColorStop(1, 'rgba(99,102,241,0.12)');
  chart = new Chart(ctx, { type:'line', data: { labels, datasets:[{ label:'Promedio', data: averages, backgroundColor: grad, borderColor: '#374ef0', tension: .3, fill: true, pointRadius:6, spanGaps: true }] }, options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false} , tooltip:{ callbacks:{ label: c => `Promedio: ${Number(c.parsed.y).toFixed(2)}` } } }, scales: { y: { min:1, max:7, ticks:{stepSize:1} } } } });
}

function renderKPIs() {
  const grid = document.getElementById('kpi-grid');
  if (!grid) return;
  grid.innerHTML = `
    <div class="card kpi students"><i class="fa-solid fa-user-graduate fa-2x"></i><div><div class="num">${state.students.length}</div><div class="label">Alumnos Totales</div></div></div>
    <div class="card kpi classes"><i class="fa-solid fa-book fa-2x"></i><div><div class="num">${state.courses.length}</div><div class="label">Asignaturas</div></div></div>`;
}

function computeCourseAverage(studentId, courseId) {
  const studentGrades = state.grades[studentId] || {};
  const courseEvalIds = state.evaluations.filter(ev => ev.courseId === courseId).map(ev => ev.id);
  const grades = courseEvalIds.map(evalId => studentGrades[evalId]).filter(g => g !== undefined && g !== null && g !== '');
  if (!grades.length) return NaN;
  return grades.reduce((a,b) => parseFloat(a) + parseFloat(b), 0) / grades.length;
}

function computeOverallStudentAverage(studentId) {
    const studentGrades = state.grades[studentId] || {};
    const grades = Object.values(studentGrades).filter(g => g !== undefined && g !== null && g !== '');
    if (!grades.length) return NaN;
    return grades.reduce((a,b) => parseFloat(a) + parseFloat(b), 0) / grades.length;
}

document.querySelectorAll('.menu a').forEach(link=>{
  link.addEventListener('click', e=>{
    e.preventDefault();
    document.querySelectorAll('.menu a').forEach(a=>a.classList.remove('active'));
    link.classList.add('active');
    renderContent(link.getAttribute('href'));
    if (mq.matches) {
      sidebar.classList.remove('open');
      sidebar.classList.add('closed');
    }
  });
});

updateProfileUI();
renderContent('dashboard');