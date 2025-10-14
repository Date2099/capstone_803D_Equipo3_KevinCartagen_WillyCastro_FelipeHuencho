/* =========================================================
   scriptadmins.js — Vista Admin COMPLETO y Responsivo
   Reemplaza el archivo entero con este contenido.
========================================================= */

/* ---------- Selectores base ---------- */
const sidebar   = document.getElementById('sidebar');
const toggleBtn = document.getElementById('toggle');
const mainEl    = document.getElementById('main-content');
const topTitle  = document.getElementById('topbar-title');
const mq        = window.matchMedia('(max-width: 768px)');
const themeSwitch = document.getElementById('theme-switch');

let currentSection = 'tablero';
let adminChartInstance = null;

/* ---------- Backdrop mobile ---------- */
let backdrop = document.getElementById('sidebar-backdrop');
if (!backdrop) {
  backdrop = document.createElement('div');
  backdrop.id = 'sidebar-backdrop';
  backdrop.className = 'sidebar-backdrop';
  document.body.appendChild(backdrop);
}
function openSidebar(){ sidebar.classList.remove('closed'); backdrop.classList.add('show'); }
function closeSidebar(){ sidebar.classList.add('closed'); backdrop.classList.remove('show'); }

/* ---------- Sidebar toggle/responsive ---------- */
function updateSidebar() { mq.matches ? closeSidebar() : (sidebar.classList.remove('closed'), backdrop.classList.remove('show')); }
updateSidebar();
mq.addEventListener('change', updateSidebar);

toggleBtn.addEventListener('click', () => {
  if (sidebar.classList.contains('closed')) openSidebar();
  else closeSidebar();
});

document.addEventListener('click', (e) => {
  if (!mq.matches) return;
  const insideSidebar = sidebar.contains(e.target);
  const onToggle = toggleBtn.contains(e.target);
  const onBackdrop = e.target === backdrop;
  if ((!insideSidebar && !onToggle) || onBackdrop) closeSidebar();
});

/* ---------- Tema claro/oscuro ---------- */
const savedTheme = localStorage.getItem('theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
function applyTheme(mode){
  if (mode === 'dark') document.documentElement.setAttribute('data-theme','dark');
  else document.documentElement.removeAttribute('data-theme');
  if (themeSwitch) themeSwitch.checked = mode === 'dark';
}
applyTheme(savedTheme ? savedTheme : (prefersDark.matches ? 'dark' : 'light'));
themeSwitch?.addEventListener('change', () => {
  const mode = themeSwitch.checked ? 'dark' : 'light';
  localStorage.setItem('theme', mode);
  applyTheme(mode);
  if (currentSection === 'tablero') renderAdminDashboardChart();
});

/* ---------- Modal simple ---------- */
const modal       = document.getElementById('modal');
const modalBody   = document.getElementById('modal-body');
const modalHead   = document.getElementById('modal-title');
const modalFoot   = document.getElementById('modal-foot');
const modalClose  = document.getElementById('modal-close');

function openModal({title='', body='', foot=''}) {
  modalHead.textContent = title;
  modalBody.innerHTML = body;
  modalFoot.innerHTML = foot || `<button class="btn btn-secondary" id="modal-ok">Cerrar</button>`;
  modal.classList.add('show');
  document.getElementById('modal-ok')?.addEventListener('click', closeModal);
}
function closeModal(){ modal.classList.remove('show'); }
modalClose?.addEventListener('click', closeModal);
modal?.addEventListener('click', e => { if (e.target.classList.contains('modal-backdrop')) closeModal(); });

/* ---------- Datos mock ---------- */
const studentData = {
  'pk-a': [{ id: 'SAH-PK-001', name: 'Ana Contreras', parent: 'Luis Contreras', status: 'Activo' }],
  'k-a':  [{ id: 'SAH-K-005',  name: 'Benjamín Soto', parent: 'Carla Soto', status: 'Activo' }],
  '1b-a': [
    { id: 'SAH-1B-012', name: 'Carlos Díaz',     parent: 'Mariela Soto',  status: 'Activo' },
    { id: 'SAH-1B-013', name: 'Daniela Espinoza',parent: 'Jorge Espinoza',status: 'Activo' }
  ],
  '8b-a': [{ id: 'SAH-8B-080', name: 'Elena Martínez',  parent: 'Roberto Martínez', status: 'Activo' }],
  '1m-a': [{ id: 'SAH-1M-095', name: 'Francisco Núñez', parent: 'Teresa Núñez',     status: 'Activo' }],
  '4m-a': [
    { id: 'SAH-4M-101', name: 'Fernanda Muñoz', parent: 'Ricardo Muñoz',  status: 'Activo' },
    { id: 'SAH-4M-102', name: 'Gabriel Rojas',  parent: 'Verónica Rojas', status: 'Inactivo' },
    { id: 'SAH-4M-103', name: 'Hugo Salazar',   parent: 'Mónica Salazar', status: 'Activo' }
  ]
};

/* ---------- Vistas: HTML de cada sección ---------- */
const contentData = {
  'tablero': {
    title: 'Panel de Control',
  html: `
    <div class="kpi-grid">
      <div class="card kpi"><div class="kpi-icon students"><i class="fa-solid fa-user-graduate"></i></div><div class="kpi-info"><div class="num">90</div><div class="label">Estudiantes</div></div></div>
      <div class="card kpi"><div class="kpi-icon parents"><i class="fa-solid fa-user-group"></i></div><div class="kpi-info"><div class="num">152</div><div class="label">Padres</div></div></div>
      <div class="card kpi"><div class="kpi-icon teachers"><i class="fa-solid fa-chalkboard-user"></i></div><div class="kpi-info"><div class="num">11</div><div class="label">Profesores</div></div></div>
      <div class="card kpi"><div class="kpi-icon revenue"><i class="fa-solid fa-dollar-sign"></i></div><div class="kpi-info"><div class="num">$18.5M</div><div class="label">Ingresos del Mes</div></div></div>
    </div>

    <div class="quick-actions" style="margin:1rem 0">
      <button class="quick-pill" data-action="nuevo-alumno"><i class="fa-solid fa-user-plus"></i> Nuevo alumno</button>
      <button class="quick-pill" data-action="comunicado"><i class="fa-solid fa-bullhorn"></i> Enviar comunicado</button>
      <button class="quick-pill" data-action="pagos"><i class="fa-solid fa-wallet"></i> Revisar pagos</button>
      <button class="quick-pill" data-action="usuarios"><i class="fa-solid fa-user-gear"></i> Administrar usuarios</button>
    </div>

    <div class="mini-cards">
      <div class="card mini">
        <i class="fa-solid fa-percent"></i>
        <div>
          <div style="font-weight:700">Tasa pago mes</div>
          <div class="progress"><div class="progress-bar" style="width:93%"></div></div>
          <small class="muted">93% · 84/90</small>
        </div>
      </div>
      <div class="card mini">
        <i class="fa-solid fa-user-check"></i>
        <div>
          <div style="font-weight:700">Asistencia promedio</div>
          <canvas id="spark-asistencia" height="36"></canvas>
          <small class="muted">Últimos 7 días</small>
        </div>
      </div>
      <div class="card mini">
        <i class="fa-solid fa-paper-plane"></i>
        <div>
          <div style="font-weight:700">Comunicados enviados</div>
          <div style="font-size:1.1rem;font-weight:800">8</div>
          <small class="muted">2 pendientes</small>
        </div>
      </div>
    </div>

    <div class="panel-grid">
      <div class="card chart-card">
        <h3 class="card-title">Resumen Financiero 2025</h3>
        <div class="chart-container"><canvas id="admin-chart"></canvas></div>
      </div>

      <div class="card">
        <h3 class="card-title">Cobranza del mes</h3>
        <div class="flex-col gap-8">
          <div style="width:100%;max-width:260px;margin:auto">
            <canvas id="donut-cobranza" height="220"></canvas>
          </div>
          <ul class="list-clean">
            <li><span class="dot dot-paid"></span> Pagado <strong>$15.3M</strong></li>
            <li><span class="dot dot-pending"></span> Pendiente <strong>$2.1M</strong></li>
            <li><span class="dot dot-overdue"></span> Atrasado <strong>$1.1M</strong></li>
          </ul>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:1rem">
      <h3 class="card-title">Actividad reciente</h3>
      <ul class="timeline">
        <li><span class="time">09:40</span> Pago de <strong>Juan Pérez</strong> — $230.000</li>
        <li><span class="time">09:12</span> Comunicado “Reunión apoderados” a 1°B</li>
        <li><span class="time">08:50</span> Agregado <strong>Ana Soto</strong> a 8°A</li>
      </ul>
    </div>
  `
  },
  'estudiantes': {
    title: 'Navegador de Cursos',
    html: `
      <div class="page-header">
        <h2>Navegador de Cursos</h2>
        <button class="btn" id="add-course"><i class="fa-solid fa-plus"></i> Agregar Curso</button>
      </div>
      <div class="course-grid">
        <div class="course-card js-view-course" data-course-id="pk-a" data-course-name="Pre-Kinder A">
          <div class="course-card-icon"><i class="fa-solid fa-shapes"></i></div>
          <div class="course-card-info"><h4>Pre-Kinder A</h4><p>Prof. Jefa: Carmen Soto</p></div>
          <div class="course-card-stats"><span><i class="fa-solid fa-user"></i> 1 Alumno</span></div>
        </div>
        <div class="course-card js-view-course" data-course-id="k-a" data-course-name="Kinder A">
          <div class="course-card-icon"><i class="fa-solid fa-shapes"></i></div>
          <div class="course-card-info"><h4>Kinder A</h4><p>Prof. Jefa: Mónica Bravo</p></div>
          <div class="course-card-stats"><span><i class="fa-solid fa-user"></i> 1 Alumno</span></div>
        </div>
        <div class="course-card js-view-course" data-course-id="1b-a" data-course-name="1° Básico A">
          <div class="course-card-icon"><i class="fa-solid fa-pencil"></i></div>
          <div class="course-card-info"><h4>1° Básico A</h4><p>Prof. Jefa: Laura Pérez</p></div>
          <div class="course-card-stats"><span><i class="fa-solid fa-user"></i> 2 Alumnos</span></div>
        </div>
        <div class="course-card"><div class="course-card-icon"><i class="fa-solid fa-pencil"></i></div><div class="course-card-info"><h4>2° Básico A</h4><p>Prof. Jefe: Juan Torres</p></div><div class="course-card-stats"><span><i class="fa-solid fa-user"></i> 0</span></div></div>
        <div class="course-card"><div class="course-card-icon"><i class="fa-solid fa-pencil"></i></div><div class="course-card-info"><h4>3° Básico A</h4><p>Prof. Jefa: Inés Morales</p></div><div class="course-card-stats"><span><i class="fa-solid fa-user"></i> 0</span></div></div>
        <div class="course-card"><div class="course-card-icon"><i class="fa-solid fa-pencil"></i></div><div class="course-card-info"><h4>4° Básico A</h4><p>Prof. Jefe: Carlos Rojas</p></div><div class="course-card-stats"><span><i class="fa-solid fa-user"></i> 0</span></div></div>
        <div class="course-card"><div class="course-card-icon"><i class="fa-solid fa-book-open"></i></div><div class="course-card-info"><h4>5° Básico A</h4><p>Prof. Jefe: Esteban Paredes</p></div><div class="course-card-stats"><span><i class="fa-solid fa-user"></i> 0</span></div></div>
        <div class="course-card"><div class="course-card-icon"><i class="fa-solid fa-book-open"></i></div><div class="course-card-info"><h4>6° Básico A</h4><p>Prof. Jefa: Sandra Fuentes</p></div><div class="course-card-stats"><span><i class="fa-solid fa-user"></i> 0</span></div></div>
        <div class="course-card"><div class="course-card-icon"><i class="fa-solid fa-book-open"></i></div><div class="course-card-info"><h4>7° Básico A</h4><p>Prof. Jefe: Miguel Ángel</p></div><div class="course-card-stats"><span><i class="fa-solid fa-user"></i> 0</span></div></div>
        <div class="course-card js-view-course" data-course-id="8b-a" data-course-name="8° Básico A">
          <div class="course-card-icon"><i class="fa-solid fa-book-open"></i></div>
          <div class="course-card-info"><h4>8° Básico A</h4><p>Prof. Jefa: Rosa Espinoza</p></div>
          <div class="course-card-stats"><span><i class="fa-solid fa-user"></i> 1</span></div>
        </div>
        <div class="course-card js-view-course" data-course-id="1m-a" data-course-name="I° Medio A">
          <div class="course-card-icon"><i class="fa-solid fa-graduation-cap"></i></div>
          <div class="course-card-info"><h4>I° Medio A</h4><p>Prof. Jefe: Arturo Vidal</p></div>
          <div class="course-card-stats"><span><i class="fa-solid fa-user"></i> 1</span></div>
        </div>
        <div class="course-card"><div class="course-card-icon"><i class="fa-solid fa-graduation-cap"></i></div><div class="course-card-info"><h4>II° Medio A</h4><p>Prof. Jefa: Carolina Neira</p></div><div class="course-card-stats"><span><i class="fa-solid fa-user"></i> 0</span></div></div>
        <div class="course-card"><div class="course-card-icon"><i class="fa-solid fa-graduation-cap"></i></div><div class="course-card-info"><h4>III° Medio A</h4><p>Prof. Jefe: Marcelo Salas</p></div><div class="course-card-stats"><span><i class="fa-solid fa-user"></i> 0</span></div></div>
        <div class="course-card js-view-course" data-course-id="4m-a" data-course-name="IV° Medio A">
          <div class="course-card-icon"><i class="fa-solid fa-graduation-cap"></i></div>
          <div class="course-card-info"><h4>IV° Medio A</h4><p>Prof. Jefe: Mario Vargas</p></div>
          <div class="course-card-stats"><span><i class="fa-solid fa-user"></i> 3</span></div>
        </div>
      </div>`
  },
  'agregar-alumno': {
    title: 'Agregar Alumno',
    html: `
      <div class="card">
        <h3 class="card-title">Agregar Alumno</h3>
        <form id="form-add-student" class="grid" style="grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem">
          <div class="field"><label class="label">Nombre</label><input class="input" name="nombre" required></div>
          <div class="field"><label class="label">RUT</label><input class="input" name="rut" required></div>
          <div class="field"><label class="label">Apoderado</label><input class="input" name="apoderado"></div>
          <div class="field"><label class="label">Curso</label>
            <select class="select" name="curso" required>
              <option value="1b-a">1° Básico A</option>
              <option value="8b-a">8° Básico A</option>
              <option value="1m-a">I° Medio A</option>
              <option value="4m-a">IV° Medio A</option>
            </select>
          </div>
          <div class="field" style="grid-column:1/-1">
            <button class="btn" type="submit"><i class="fa-solid fa-save"></i> Guardar</button>
          </div>
        </form>
      </div>`
  },
  'profesores': {
    title: 'Profesores',
    html: `
      <div class="card">
        <h3 class="card-title">Listado de Profesores</h3>
        <div class="table-wrapper">
          <table class="data-table" id="table-prof">
            <thead><tr><th>ID</th><th>Nombre</th><th>Asignatura</th><th>Email</th><th>Acciones</th></tr></thead>
            <tbody>
              <tr><td>PF-001</td><td>María González</td><td>Matemáticas</td><td>maria.g@colegio.cl</td>
                  <td><button class="btn btn-compact js-mail" data-mail="maria.g@colegio.cl"><i class="fa-solid fa-envelope"></i></button></td></tr>
              <tr><td>PF-002</td><td>Carlos Vega</td><td>Historia</td><td>carlos.v@colegio.cl</td>
                  <td><button class="btn btn-compact js-mail" data-mail="carlos.v@colegio.cl"><i class="fa-solid fa-envelope"></i></button></td></tr>
              <tr><td>PF-003</td><td>Isabel Ríos</td><td>Lenguaje</td><td>isabel.r@colegio.cl</td>
                  <td><button class="btn btn-compact js-mail" data-mail="isabel.r@colegio.cl"><i class="fa-solid fa-envelope"></i></button></td></tr>
            </tbody>
          </table>
        </div>
      </div>`
  },
  'asignaturas': {
    title: 'Asignaturas',
    html: `
      <div class="card">
        <h3 class="card-title">Asignaturas</h3>
        <ul>
          <li>Matemáticas</li><li>Lenguaje</li><li>Historia</li><li>Ciencias</li>
        </ul>
      </div>`
  },
  'revision-pagos': {
    title: 'Revisión de Pagos',
    html: `
      <div class="card">
        <h3 class="card-title">Revisión de Pagos</h3>
        <div class="table-wrapper">
          <table class="data-table" id="table-pagos">
            <thead><tr><th>Alumno</th><th>Mes</th><th>Monto</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              <tr><td>Ana Contreras</td><td>Septiembre</td><td>$230.000</td>
                <td><span class="status status-review">En revisión</span></td>
                <td><button class="btn btn-compact js-approve" data-id="1"><i class="fa-solid fa-check"></i></button></td></tr>
              <tr><td>Benjamín Soto</td><td>Septiembre</td><td>$230.000</td>
                <td><span class="status status-paid">Pagado</span></td>
                <td><button class="btn btn-compact js-refund" data-id="2"><i class="fa-solid fa-rotate-left"></i></button></td></tr>
            </tbody>
          </table>
        </div>
      </div>`
  },
  'comunicados': {
    title: 'Comunicados',
    html: `
      <div class="card">
        <h3 class="card-title">Comunicados</h3>
        <div class="field"><button class="btn" id="new-comm"><i class="fa-solid fa-plus"></i> Nuevo Comunicado</button></div>
        <ul id="comm-list">
          <li><strong>15/09/2025:</strong> Examen Final de Matemáticas.</li>
          <li><strong>18/09/2025:</strong> Feriado - No hay clases.</li>
        </ul>
      </div>`
  },
  'usuarios': {
    title: 'Usuarios',
    html: `
      <div class="card">
        <h3 class="card-title">Usuarios del Sistema</h3>
        <div class="table-wrapper">
          <table class="data-table" id="table-users">
            <thead><tr><th>ID</th><th>Nombre</th><th>Rol</th><th>Acciones</th></tr></thead>
            <tbody>
              <tr><td>U-001</td><td>Sr. Admin</td><td>Administración</td>
                <td><button class="btn btn-compact js-reset" data-user="U-001"><i class="fa-solid fa-key"></i></button></td></tr>
              <tr><td>U-002</td><td>Felipe Huencho</td><td>Alumno</td>
                <td><button class="btn btn-compact js-reset" data-user="U-002"><i class="fa-solid fa-key"></i></button></td></tr>
            </tbody>
          </table>
        </div>
      </div>`
  }
};
function renderDonutCobranza() {
  const el = document.getElementById('donut-cobranza');
  if (!el) return;
  const ctx = el.getContext('2d');
  const paid=15300000, pending=2100000, overdue=1100000;

  new Chart(ctx, {
    type:'doughnut',
    data:{
      labels:['Pagado','Pendiente','Atrasado'],
      datasets:[{ data:[paid,pending,overdue], backgroundColor:['#16a34a','#f59e0b','#ef4444'], borderWidth:0 }]
    },
    options:{ responsive:true, cutout:'65%', plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label:c=>`${c.label}: $${Number(c.raw).toLocaleString('es-CL')}` } } } }
  });
}

function renderSparkAsistencia() {
  const el = document.getElementById('spark-asistencia');
  if (!el) return;

  // Alto fijo y contenedor controlado
  el.style.height = '36px';
  const wrap = el.parentElement;
  if (wrap) { wrap.style.minWidth = '220px'; wrap.style.width = '100%'; }

  // limpiar instancia previa si la hubiera guardada
  if (el._chart) { el._chart.destroy(); }

  const data = [88, 91, 92, 90, 93, 94, 92];
  const ctx = el.getContext('2d');

  el._chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map((_, i) => i + 1),
      datasets: [{
        data,
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 0,
        fill: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: { x: { display: false }, y: { display: false, suggestedMin: 80, suggestedMax: 100 } },
      elements: { line: { capBezierPoints: true } }
    }
  });
}



/* ---------- Render: Tablero (Chart.js) ---------- */
function renderAdminDashboardChart() {
  const canvas = document.getElementById('admin-chart');
  if (!canvas) return;
  if (adminChartInstance) adminChartInstance.destroy();

  const container = canvas.closest('.chart-container');
  if (container) {
    const h = Math.max(240, Math.min(420, Math.round(window.innerHeight * 0.38)));
    container.style.height = h + 'px';
  }

  const ctx = canvas.getContext('2d');
  const height = canvas.clientHeight || 320;
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  const dark = document.documentElement.hasAttribute('data-theme');
  grad.addColorStop(0, dark ? 'rgba(201,156,46,0.95)' : 'rgba(16,43,78,0.95)');
  grad.addColorStop(1, dark ? 'rgba(201,156,46,0.65)' : 'rgba(16,43,78,0.65)');

  const labels = ['Abr','May','Jun','Jul','Ago','Sep'];
  const dataValues = [12000,15000,14000,18000,17000,18500];

  adminChartInstance = new Chart(canvas, {
    type: 'bar',
    data: { labels, datasets: [{ label:'Ingresos', data: dataValues, backgroundColor: grad, borderRadius: 10, borderSkipped: false, barThickness: 'flex', maxBarThickness: 64 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: (ctx) => 'Ingresos: $' + Number(ctx.parsed?.y ?? ctx.raw).toLocaleString('es-CL') }
        }
      },
      scales: {
        x: { grid: { display:false }, ticks: { font: { weight: 700 } } },
        y: {
          beginAtZero: true,
          suggestedMax: Math.max(...dataValues) * 1.12,
          grid: { color: getComputedStyle(document.documentElement).getPropertyValue('--chart-grid') || 'rgba(15,23,42,.06)', borderDash: [4,4] },
          ticks: { callback: v => '$' + Number(v).toLocaleString('es-CL'), stepSize: 2000 }
        }
      },
      interaction: { mode: 'index', intersect: false }
    }
  });
}
let resizeRAF;
window.addEventListener('resize', () => {
  if (currentSection !== 'tablero') return;
  cancelAnimationFrame(resizeRAF);
  resizeRAF = requestAnimationFrame(renderAdminDashboardChart);
});

/* ---------- Render: tabla alumnos ---------- */
function renderStudentTable(courseId, courseName) {
  const students = studentData[courseId] || [];
  const rows = students.map(s => `
    <tr>
      <td>${s.id}</td>
      <td class="user-cell">
        <div class="avatar" style="width:36px;height:36px;font-size:.85rem">${s.name.split(' ').map(n=>n[0]).join('')}</div>
        <div><div style="font-weight:600">${s.name}</div><div style="font-size:.85rem;color:#6b7280">${s.parent}</div></div>
      </td>
      <td>${s.status}</td>
      <td class="action-buttons">
        <button class="action-btn view btn btn-compact" data-student-id="${s.id}" title="Ver"><i class="fa-solid fa-eye"></i></button>
        <button class="action-btn delete btn btn-compact btn-danger" data-student-id="${s.id}" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>`).join('') || `<tr><td colspan="4">No hay alumnos en este curso.</td></tr>`;

  mainEl.innerHTML = `
    <div class="page-header">
      <h2>Alumnos — ${courseName}</h2>
      <button class="btn js-back-to-courses"><i class="fa-solid fa-arrow-left"></i> Volver a Cursos</button>
    </div>
    <div class="card">
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr><th>ID</th><th>Alumno</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
  topTitle.textContent = `Alumnos — ${courseName}`;
}

/* ---------- Render genérico + wiring por sección ---------- */
function renderContent(section) {
  currentSection = section;
  const entry = contentData[section];
  if (!entry) {
    mainEl.innerHTML = `<div class="card"><p>Sección no encontrada: ${section}</p></div>`;
    topTitle.textContent = 'Sección';
    return;
  }
  topTitle.textContent = entry.title;
  mainEl.innerHTML = entry.html;

  if (section === 'tablero') {
  renderAdminDashboardChart();
  renderDonutCobranza();
  renderSparkAsistencia();
}
;

  if (section === 'estudiantes') {
    mainEl.querySelectorAll('.js-view-course').forEach(card => {
      card.addEventListener('click', () => renderStudentTable(card.dataset.courseId, card.dataset.courseName));
    });
    document.getElementById('add-course')?.addEventListener('click', () => {
      openModal({
        title: 'Agregar Curso',
        body: `<div class="field"><label class="label">Nombre</label><input class="input"></div>
               <div class="field"><label class="label">Profesor Jefe</label><input class="input"></div>`,
      });
    });
  }

  if (section === 'agregar-alumno') {
    document.getElementById('form-add-student')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      openModal({
        title: 'Alumno guardado',
        body: `<p><strong>${fd.get('nombre')}</strong> asignado a <strong>${fd.get('curso')}</strong>.</p>`,
      });
      e.currentTarget.reset();
    });
  }

  if (section === 'profesores') {
    mainEl.querySelectorAll('.js-mail').forEach(b =>
      b.addEventListener('click', () => openModal({ title:'Enviar correo', body:`<p>Redactar a <strong>${b.dataset.mail}</strong> (simulado)</p>` }))
    );
  }

  if (section === 'revision-pagos') {
    mainEl.querySelectorAll('.js-approve').forEach(b =>
      b.addEventListener('click', () => openModal({ title:'Aprobar pago', body:'Pago marcado como aprobado (simulado).' }))
    );
    mainEl.querySelectorAll('.js-refund').forEach(b =>
      b.addEventListener('click', () => openModal({ title:'Reversar pago', body:'Pago marcado para reversa (simulado).' }))
    );
  }

  if (section === 'comunicados') {
    document.getElementById('new-comm')?.addEventListener('click', () => {
      openModal({
        title:'Nuevo Comunicado',
        body:`<div class="field"><label class="label">Título</label><input class="input" id="c-title"></div>
              <div class="field"><label class="label">Contenido</label><textarea class="input" id="c-body"></textarea></div>`,
        foot:`<button class="btn" id="save-comm"><i class="fa-solid fa-save"></i> Publicar</button>
              <button class="btn btn-secondary" id="modal-ok">Cancelar</button>`
      });
      document.getElementById('save-comm')?.addEventListener('click', () => {
        const t = document.getElementById('c-title').value || '(sin título)';
        const list = document.getElementById('comm-list');
        const today = new Date().toLocaleDateString('es-CL');
        list.insertAdjacentHTML('beforeend', `<li><strong>${today}:</strong> ${t}</li>`);
        closeModal();
      });
    });
  }

  if (section === 'usuarios') {
    mainEl.querySelectorAll('.js-reset').forEach(b =>
      b.addEventListener('click', () => openModal({ title:'Reset de contraseña', body:`Se reseteó la contraseña de <strong>${b.dataset.user}</strong> (simulado).` }))
    );
  }
}

/* ---------- Menú lateral: navegación ---------- */
document.querySelectorAll('.menu a[data-section]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const sec = link.dataset.section;
    if (!sec) return;
    document.querySelectorAll('.menu a').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    link.closest('details.menu-group') && (link.closest('details.menu-group').open = true);
    renderContent(sec);
    if (mq.matches) closeSidebar();
  });
});

/* ---------- Carga inicial ---------- */
renderContent('tablero');
