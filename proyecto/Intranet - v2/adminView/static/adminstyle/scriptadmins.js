// SIDEBAR TOGGLE + RESPONSIVE
const toggleBtn = document.getElementById('toggle');
const sidebar = document.getElementById('sidebar');
const mq = window.matchMedia("(max-width: 768px)");

toggleBtn.addEventListener('click', () => {
  sidebar.classList.toggle('closed');
});

function updateSidebar() {
  if (mq.matches) {
    sidebar.classList.add('closed');
  } else {
    sidebar.classList.remove('closed');
  }
}
updateSidebar();
mq.addEventListener('change', updateSidebar);

// Cerrar sidebar al hacer click fuera, solo en mobile
document.addEventListener('click', (e) => {
  if (!mq.matches) return; // solo móvil
  const isClickInsideSidebar = sidebar.contains(e.target);
  const isClickToggleBtn = toggleBtn.contains(e.target);
  if (!isClickInsideSidebar && !isClickToggleBtn) {
    sidebar.classList.add('closed');
  }
});

// --- SISTEMA DE CONTENIDO DINÁMICO ---
const mainContent = document.getElementById('main-content');
const menuLinks = document.querySelectorAll('.menu a[data-section]');
const topbarTitle = document.getElementById('topbar-title');

let adminChartInstance = null;

// Datos de ejemplo para los alumnos por curso
const studentData = {
  'pk-a': [{ id: 'SAH-PK-001', name: 'Ana Contreras', parent: 'Luis Contreras', status: 'Activo' }],
  'k-a': [{ id: 'SAH-K-005', name: 'Benjamín Soto', parent: 'Carla Soto', status: 'Activo' }],
  '1b-a': [
    { id: 'SAH-1B-012', name: 'Carlos Díaz', parent: 'Mariela Soto', status: 'Activo' },
    { id: 'SAH-1B-013', name: 'Daniela Espinoza', parent: 'Jorge Espinoza', status: 'Activo' }
  ],
  '8b-a': [{ id: 'SAH-8B-080', name: 'Elena Martínez', parent: 'Roberto Martínez', status: 'Activo' }],
  '1m-a': [{ id: 'SAH-1M-095', name: 'Francisco Núñez', parent: 'Teresa Núñez', status: 'Activo' }],
  '4m-a': [
    { id: 'SAH-4M-101', name: 'Fernanda Muñoz', parent: 'Ricardo Muñoz', status: 'Activo' },
    { id: 'SAH-4M-102', name: 'Gabriel Rojas', parent: 'Verónica Rojas', status: 'Inactivo' },
    { id: 'SAH-4M-103', name: 'Hugo Salazar', parent: 'Mónica Salazar', status: 'Activo' }
  ]
};

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
      <div class="card chart-card">
        <h3 class="card-title">Resumen Financiero 2025</h3>
        <div class="chart-container"><canvas id="admin-chart"></canvas></div>
      </div>
    `
  },
  'estudiantes': {
    title: 'Navegador de Cursos',
    html: `
      <div class="page-header">
        <h2>Navegador de Cursos</h2>
        <button class="btn"><i class="fa-solid fa-plus"></i> Agregar Curso</button>
      </div>
      <div class="course-grid">
        <div class="course-card js-view-course" data-course-id="pk-a" data-course-name="Pre-Kinder A"><div class="course-card-icon"><i class="fa-solid fa-shapes"></i></div><div class="course-card-info"><h4>Pre-Kinder A</h4><p>Prof. Jefa: Carmen Soto</p></div><div class="course-card-stats"><span><i class="fa-solid fa-user"></i> 1 Alumno</span></div></div>
        <div class="course-card js-view-course" data-course-id="k-a" data-course-name="Kinder A"><div class="course-card-icon"><i class="fa-solid fa-shapes"></i></div><div class="course-card-info"><h4>Kinder A</h4><p>Prof. Jefa: Mónica Bravo</p></div><div class="course-card-stats"><span><i class="fa-solid fa-user"></i> 1 Alumno</span></div></div>
        <div class="course-card js-view-course" data-course-id="1b-a" data-course-name="1° Básico A"><div class="course-card-icon"><i class="fa-solid fa-pencil"></i></div><div class="course-card-info"><h4>1° Básico A</h4><p>Prof. Jefa: Laura Pérez</p></div><div class="course-card-stats"><span><i class="fa-solid fa-user"></i> 2 Alumnos</span></div></div>
        <div class="course-card"><div class="course-card-icon"><i class="fa-solid fa-pencil"></i></div><div class="course-card-info"><h4>2° Básico A</h4><p>Prof. Jefe: Juan Torres</p></div><div class="course-card-stats"><span><i class="fa-solid fa-user"></i> 0 Alumnos</span></div></div>
        <div class="course-card"><div class="course-card-icon"><i class="fa-solid fa-pencil"></i></div><div class="course-card-info"><h4>3° Básico A</h4><p>Prof. Jefa: Inés Morales</p></div><div class="course-card-stats"><span><i class="fa-solid fa-user"></i> 0 Alumnos</span></div></div>
        <div class="course-card"><div class="course-card-icon"><i class="fa-solid fa-pencil"></i></div><div class="course-card-info"><h4>4° Básico A</h4><p>Prof. Jefe: Carlos Rojas</p></div><div class="course-card-stats"><span><i class="fa-solid fa-user"></i> 0 Alumnos</span></div></div>
        <div class="course-card"><div class="course-card-icon"><i class="fa-solid fa-book-open"></i></div><div class="course-card-info"><h4>5° Básico A</h4><p>Prof. Jefe: Esteban Paredes</p></div><div class="course-card-stats"><span><i class="fa-solid fa-user"></i> 0 Alumnos</span></div></div>
        <div class="course-card"><div class="course-card-icon"><i class="fa-solid fa-book-open"></i></div><div class="course-card-info"><h4>6° Básico A</h4><p>Prof. Jefa: Sandra Fuentes</p></div><div class="course-card-stats"><span><i class="fa-solid fa-user"></i> 0 Alumnos</span></div></div>
        <div class="course-card"><div class="course-card-icon"><i class="fa-solid fa-book-open"></i></div><div class="course-card-info"><h4>7° Básico A</h4><p>Prof. Jefe: Miguel Ángel</p></div><div class="course-card-stats"><span><i class="fa-solid fa-user"></i> 0 Alumnos</span></div></div>
        <div class="course-card js-view-course" data-course-id="8b-a" data-course-name="8° Básico A"><div class="course-card-icon"><i class="fa-solid fa-book-open"></i></div><div class="course-card-info"><h4>8° Básico A</h4><p>Prof. Jefa: Rosa Espinoza</p></div><div class="course-card-stats"><span><i class="fa-solid fa-user"></i> 1 Alumno</span></div></div>
        <div class="course-card js-view-course" data-course-id="1m-a" data-course-name="I° Medio A"><div class="course-card-icon"><i class="fa-solid fa-graduation-cap"></i></div><div class="course-card-info"><h4>I° Medio A</h4><p>Prof. Jefe: Arturo Vidal</p></div><div class="course-card-stats"><span><i class="fa-solid fa-user"></i> 1 Alumno</span></div></div>
        <div class="course-card"><div class="course-card-icon"><i class="fa-solid fa-graduation-cap"></i></div><div class="course-card-info"><h4>II° Medio A</h4><p>Prof. Jefa: Carolina Neira</p></div><div class="course-card-stats"><span><i class="fa-solid fa-user"></i> 0 Alumnos</span></div></div>
        <div class="course-card"><div class="course-card-icon"><i class="fa-solid fa-graduation-cap"></i></div><div class="course-card-info"><h4>III° Medio A</h4><p>Prof. Jefe: Marcelo Salas</p></div><div class="course-card-stats"><span><i class="fa-solid fa-user"></i> 0 Alumnos</span></div></div>
        <div class="course-card js-view-course" data-course-id="4m-a" data-course-name="IV° Medio A"><div class="course-card-icon"><i class="fa-solid fa-graduation-cap"></i></div><div class="course-card-info"><h4>IV° Medio A</h4><p>Prof. Jefe: Mario Vargas</p></div><div class="course-card-stats"><span><i class="fa-solid fa-user"></i> 3 Alumnos</span></div></div>
      </div>
    `
  },
  'agregar-alumno': {
    title: 'Agregar Alumno',
    html: `
      <h3 class="card-title">Agregar Alumno (datos brutos)</h3>
      <div class="card">
        <p>Formulario simulado (solo datos de ejemplo)</p>
        <ul>
          <li>Nombre: Juanito Pérez</li>
          <li>RUT: 11.222.333-4</li>
          <li>Curso: 1° Básico A</li>
        </ul>
      </div>
    `
  },
  'profesores': {
    title: 'Profesores',
    html: `
      <h3 class="card-title">Listado de Profesores</h3>
      <div class="card">
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr><th>ID</th><th>Nombre</th><th>Asignatura</th><th>Email</th></tr></thead>
            <tbody>
              <tr><td>PF-001</td><td>María González</td><td>Matemáticas</td><td>maria.g@colegio.cl</td></tr>
              <tr><td>PF-002</td><td>Carlos Vega</td><td>Historia</td><td>carlos.v@colegio.cl</td></tr>
              <tr><td>PF-003</td><td>Isabel Ríos</td><td>Lenguaje</td><td>isabel.r@colegio.cl</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `
  },
  'asignaturas': {
    title: 'Asignaturas',
    html: `
      <h3 class="card-title">Asignaturas</h3>
      <div class="card">
        <ul>
          <li>Matemáticas</li>
          <li>Lenguaje</li>
          <li>Historia</li>
          <li>Ciencias</li>
        </ul>
      </div>
    `
  },
  'horarios': {
    title: 'Horarios',
    html: `
      <h3 class="card-title">Horarios</h3>
      <div class="card">
        <p>Horario ejemplo: 08:00 - 12:30 (Lun-Vie)</p>
      </div>
    `
  },
  'revision-pagos': {
    title: 'Revisión de Pagos',
    html: `
      <h3 class="card-title">Revisión de Pagos</h3>
      <div class="card">
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr><th>Alumno</th><th>Mes</th><th>Monto</th><th>Estado</th></tr></thead>
            <tbody>
              <tr><td>Ana Contreras</td><td>Septiembre</td><td>$230.000</td><td><span class="status status-review">En revisión</span></td></tr>
              <tr><td>Benjamín Soto</td><td>Septiembre</td><td>$230.000</td><td><span class="status status-paid">Pagado</span></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `
  },
  'comunicados': {
    title: 'Comunicados',
    html: `
      <h3 class="card-title">Comunicados</h3>
      <div class="card">
        <ul>
          <li><strong>15/09/2025:</strong> Examen Final de Matemáticas.</li>
          <li><strong>18/09/2025:</strong> Feriado - No hay clases.</li>
        </ul>
      </div>
    `
  },
  'usuarios': {
    title: 'Usuarios',
    html: `
      <h3 class="card-title">Usuarios del Sistema</h3>
      <div class="card">
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr><th>ID</th><th>Nombre</th><th>Rol</th></tr></thead>
            <tbody>
              <tr><td>U-001</td><td>Sr. Admin</td><td>Administración</td></tr>
              <tr><td>U-002</td><td>Felipe Huencho</td><td>Alumno</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `
  },
  'pagos': {
    title: 'Pagos',
    html: `
      <h3 class="card-title">Resumen de Pagos</h3>
      <div class="card">
        <p>Total Pendiente: $230.000</p>
        <p>Pagos realizados (meses): Abril, Mayo, Junio, Julio</p>
      </div>
    `
  }
};

// Render chart for tablero (estético mejorado)
function renderAdminDashboardChart() {
  const canvas = document.getElementById('admin-chart');
  if (!canvas) return;
  if (adminChartInstance) {
    adminChartInstance.destroy();
  }

  // asegurar que el contenedor tenga una altura explícita
  const container = canvas.closest('.chart-container');
  if (container) {
    container.style.height = '320px';
    container.style.maxHeight = '420px';
  }

  const ctx = canvas.getContext('2d');

  // crear degradado dinámico según la altura actual
  const height = container ? Math.max(220, container.clientHeight) : 320;
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, 'rgba(106,58,143,0.95)');
  grad.addColorStop(1, 'rgba(142,102,170,0.85)');

  const labels = ['Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep'];
  const dataValues = [12000, 15000, 14000, 18000, 17000, 18500];

  adminChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Ingresos',
        data: dataValues,
        backgroundColor: grad,
        borderRadius: 10,
        borderSkipped: false,
        barThickness: 'flex',
        maxBarThickness: 64
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#121212',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          padding: 10,
          callbacks: {
            label: (ctx) => {
              const v = ctx.parsed?.y ?? ctx.raw;
              return 'Ingresos: $' + Number(v).toLocaleString('es-CL');
            }
          }
        }
      },
      layout: { padding: { top: 6, bottom: 6, left: 6, right: 6 } },
      scales: {
        x: {
          grid: { display: false, drawBorder: false },
          ticks: { color: '#374151', font: { weight: 700 } }
        },
        y: {
          beginAtZero: true,
          suggestedMax: Math.max(...dataValues) * 1.12,
          grid: {
            color: 'rgba(15,23,42,0.06)',
            borderDash: [4, 4]
          },
          ticks: {
            color: '#6b7280',
            callback: value => '$' + Number(value).toLocaleString('es-CL'),
            stepSize: 2000
          }
        }
      },
      interaction: { mode: 'index', intersect: false }
    }
  });
}

function renderStudentTable(courseId, courseName) {
  const students = studentData[courseId] || [];
  let rows = students.map(s => `
    <tr>
      <td>${s.id}</td>
      <td class="user-cell">
        <div class="avatar" style="width:36px;height:36px;font-size:.85rem">${s.name.split(' ').map(n=>n[0]).join('')}</div>
        <div>
          <div style="font-weight:600">${s.name}</div>
          <div style="font-size:.85rem;color:#6b7280">${s.parent}</div>
        </div>
      </td>
      <td>${s.status}</td>
      <td class="action-buttons">
        <button class="action-btn view" data-student-id="${s.id}" title="Ver"><i class="fa-solid fa-eye"></i></button>
        <button class="action-btn delete" data-student-id="${s.id}" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="4">No hay alumnos en este curso.</td></tr>`;

  mainContent.innerHTML = `
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
    </div>
  `;
  topbarTitle.textContent = `Alumnos — ${courseName}`;
}

// renderContent general
function renderContent(section) {
  const entry = contentData[section];
  if (!entry) {
    mainContent.innerHTML = `<div class="card"><p>Sección no encontrada: ${section}</p></div>`;
    topbarTitle.textContent = 'Sección';
    return;
  }
  topbarTitle.textContent = entry.title;
  mainContent.innerHTML = entry.html;

  if (section === 'tablero') {
    renderAdminDashboardChart();
  }

  // Añadir listeners para tarjetas de curso (si existen)
  const courseCards = mainContent.querySelectorAll('.js-view-course');
  courseCards.forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.courseId;
      const name = card.dataset.courseName || card.querySelector('.course-card-info h4')?.textContent || 'Curso';
      renderStudentTable(id, name);
      // actualizar active en menú
      document.querySelectorAll('.menu a').forEach(a => a.classList.remove('active'));
    });
  });
}

// Menu click listeners
menuLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const sec = link.dataset.section;
    if (!sec) return;
    // marcar activo
    menuLinks.forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    // abrir details padres si aplica
    const parentDetails = link.closest('details.menu-group');
    if (parentDetails) parentDetails.open = true;
    renderContent(sec);
    // en mobile cerrar sidebar
    if (mq.matches) sidebar.classList.add('closed');
  });
});

// Delegación para botones dentro del main (volver, ver, eliminar)
mainContent.addEventListener('click', e => {
  const bt = e.target.closest('.js-back-to-courses');
  if (bt) {
    renderContent('estudiantes');
    // re-mark menu active
    menuLinks.forEach(l => l.classList.remove('active'));
    const estudiantesLink = document.querySelector('.menu a[data-section="estudiantes"]');
    if (estudiantesLink) estudiantesLink.classList.add('active');
    return;
  }

  const viewBtn = e.target.closest('.action-btn.view');
  if (viewBtn) {
    const sid = viewBtn.dataset.studentId;
    alert('Ver alumno: ' + sid + ' (simulado)');
    return;
  }

  const delBtn = e.target.closest('.action-btn.delete');
  if (delBtn) {
    const sid = delBtn.dataset.studentId;
    if (confirm('Eliminar alumno ' + sid + ' (simulado)?')) {
      // aquí solo simulamos la eliminación del DOM
      delBtn.closest('tr').remove();
    }
    return;
  }
});

// Carga inicial
renderContent('tablero');