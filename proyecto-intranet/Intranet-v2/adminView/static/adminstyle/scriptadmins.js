/*************************
 * Sidebar responsive
 *************************/
const toggleBtn = document.getElementById('toggle');
const sidebar   = document.getElementById('sidebar');
const mq        = window.matchMedia('(max-width: 768px)');

// Estado inicial sidebar (pc abierto / móvil cerrado)
function updateSidebar(){
  if (mq.matches) sidebar.classList.add('closed');
  else sidebar.classList.remove('closed');
}
updateSidebar();
mq.addEventListener('change', updateSidebar);

// Toggle manual
toggleBtn.addEventListener('click', () => {
  sidebar.classList.toggle('closed');
});

// Click fuera del sidebar en móvil
document.addEventListener('click', (e) => {
  if (!mq.matches) return;
  const clickInside = sidebar.contains(e.target) || toggleBtn.contains(e.target);
  if (!clickInside) sidebar.classList.add('closed');
});

// Gestos táctiles básicos
let touchStartX = 0;
document.addEventListener('touchstart', (e) => {
  if (!mq.matches) return;
  touchStartX = e.touches[0].clientX;
});
document.addEventListener('touchend', (e) => {
  if (!mq.matches) return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (touchStartX < 200 && dx > 50) sidebar.classList.remove('closed'); // abrir
  if (dx < -50) sidebar.classList.add('closed');                        // cerrar
});

/*************************
 * Tema oscuro (persistente)
 *************************/
const themeSwitch = document.getElementById('theme-switch');
const root = document.documentElement;

(function initTheme(){
  const saved = localStorage.getItem('theme') || 'light';
  if (saved === 'dark'){
    root.setAttribute('data-theme','dark');
    themeSwitch.checked = true;
  } else {
    root.setAttribute('data-theme','light');
  }
})();
themeSwitch.addEventListener('change', () => {
  const mode = themeSwitch.checked ? 'dark' : 'light';
  root.setAttribute('data-theme', mode);
  localStorage.setItem('theme', mode);
});

/*************************
 * Router / plantillas
 *************************/
const main = document.getElementById('main-content');
const menuLinks = document.querySelectorAll('.menu a[data-section]');
const topbarTitle = document.getElementById('topbar-title');

let chart1 = null;
let chart2 = null;

/* Datos fake de ejemplo */
const studentData = {
  'pk-a': [{ id:'SAH-PK-001', name:'Ana Contreras', parent:'Luis Contreras', status:'Activo' }],
  '1b-a': [
    { id:'SAH-1B-012', name:'Carlos Díaz', parent:'Mariela Soto', status:'Activo' },
    { id:'SAH-1B-013', name:'Daniela Espinoza', parent:'Jorge Espinoza', status:'Activo' }
  ],
  '4m-a': [
    { id:'SAH-4M-101', name:'Fernanda Muñoz', parent:'Ricardo Muñoz', status:'Activo' },
    { id:'SAH-4M-102', name:'Gabriel Rojas', parent:'Verónica Rojas', status:'Inactivo' },
    { id:'SAH-4M-103', name:'Hugo Salazar', parent:'Mónica Salazar', status:'Activo' }
  ]
};

/* Usuarios (front-only CRUD) */
let USERS = [
  { id:'U-001', nombre:'Sr. Admin', email:'admin@colegio.cl', rol:'Administración', activo:true,  deleted:false },
  { id:'U-002', nombre:'Felipe Huencho', email:'felipe@colegio.cl', rol:'Alumno',        activo:true,  deleted:false },
  { id:'U-003', nombre:'María Ríos',    email:'maria.rios@colegio.cl', rol:'Profesor',   activo:false, deleted:false }
];

/* Contenido de secciones */
const content = {
  tablero: {
    title: 'Panel de Control',
    html: `
      <!-- Meta chips + selector -->
      <div class="page-meta">
        <div class="chips">
          <span class="chip"><i class="fa-regular fa-calendar"></i> Año: 2025</span>
          <span class="chip"><i class="fa-solid fa-graduation-cap"></i> Matrícula total: 90</span>
          <span class="chip"><i class="fa-solid fa-chalkboard-user"></i> Profesores: 11</span>
        </div>
        <select id="range-select" class="select select-compact">
          <option>Últimos 6 meses</option>
          <option>Últimos 12 meses</option>
          <option>Este año</option>
        </select>
      </div>

      <!-- Acciones rápidas -->
      <div class="quick-actions">
        <div class="quick-pill"><i class="fa-solid fa-user-plus"></i><span>Nuevo alumno</span></div>
        <div class="quick-pill"><i class="fa-solid fa-paper-plane"></i><span>Enviar comunicado</span></div>
        <div class="quick-pill"><i class="fa-solid fa-receipt"></i><span>Revisar pagos</span></div>
        <div class="quick-pill"><i class="fa-solid fa-user-gear"></i><span>Administrar usuarios</span></div>
      </div>

      <!-- KPIs -->
      <div class="kpi-row">
        <div class="card kpi">
          <div class="kpi-icon students"><i class="fa-solid fa-user-graduate"></i></div>
          <div><div class="num">90</div><div class="label">Estudiantes</div></div>
        </div>
        <div class="card kpi">
          <div class="kpi-icon parents"><i class="fa-solid fa-user-group"></i></div>
          <div><div class="num">152</div><div class="label">Padres</div></div>
        </div>
        <div class="card kpi">
          <div class="kpi-icon teachers"><i class="fa-solid fa-chalkboard-user"></i></div>
          <div><div class="num">11</div><div class="label">Profesores</div></div>
        </div>
        <div class="card kpi">
          <div class="kpi-icon revenue"><i class="fa-solid fa-dollar-sign"></i></div>
          <div><div class="num">$18.5M</div><div class="label">Ingresos del Mes</div></div>
        </div>
      </div>

      <!-- Mini métricas -->
      <div class="mini-cards">
        <div class="card mini"><i class="fa-solid fa-chart-line"></i> <span>Tasa pago mes:</span> <b>93%</b></div>
        <div class="card mini"><i class="fa-solid fa-user-check"></i> <span>Asistencia promedio:</span> <b>92%</b></div>
        <div class="card mini"><i class="fa-solid fa-bullhorn"></i> <span>Comunicados enviados:</span> <b>8</b></div>
      </div>

      <!-- Gráficos lado a lado -->
      <div class="panel-grid">
        <div class="card chart-card">
          <h3 class="card-title">Ingresos vs. Gastos</h3>
          <div class="chart-container"><canvas id="kpi-chart"></canvas></div>
        </div>
        <div class="card chart-card">
          <h3 class="card-title">Distribución por Nivel</h3>
          <div class="chart-container"><canvas id="dist-chart"></canvas></div>
        </div>
      </div>

      <!-- Pagos + Actividad -->
      <div class="panel-grid panel-bottom">
        <div class="card">
          <div class="card-title" style="display:flex;align-items:center;justify-content:space-between">
            <span>Pagos pendientes</span>
            <button id="btn-export-csv" class="btn btn-secondary btn-compact"><i class="fa-solid fa-file-arrow-down"></i> Exportar CSV</button>
          </div>
          <div class="table-wrapper">
            <table class="data-table" id="tbl-pagos">
              <thead><tr><th>Apoderado</th><th>RUT</th><th>Curso</th><th>Mes</th><th>Monto</th><th>Acción</th></tr></thead>
              <tbody>
                <tr><td>Juan Pérez</td><td>12.345.678-9</td><td>1°B</td><td>Sept</td><td>$50.000</td><td><button class="btn btn-secondary">Recordar</button></td></tr>
                <tr><td>María López</td><td>11.222.333-4</td><td>3°B</td><td>Sept</td><td>$60.000</td><td><button class="btn btn-secondary">Recordar</button></td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title">Actividad reciente</h3>
          <ul class="activity-list">
            <li><i class="fa-solid fa-user-plus"></i> Se agregó <b>Paulina Muñoz</b> a 1° Básico B <span>hoy</span></li>
            <li><i class="fa-solid fa-receipt"></i> Pago registrado de <b>Juan Pérez</b> <span>ayer</span></li>
            <li><i class="fa-solid fa-paper-plane"></i> Comunicado enviado a <b>8° Básico A</b> <span>hace 2 días</span></li>
          </ul>
        </div>
      </div>
    `
  },

  estudiantes: {
    title: 'Navegador de Cursos',
    html: `
      <div class="period-card">
        <div class="period-head"><i class="fa-solid fa-seedling"></i><h3 class="card-title" style="margin:0">Preescolar</h3></div>
        <div class="period-body">
          <div class="course-cell js-view-course" data-course-id="pk-a" data-course-name="Pre-Kínder A">
            <div class="course-title">Pre-Kínder A</div>
            <div class="course-meta">Prof. Jefa: Carmen Soto</div>
            <div class="course-stats"><i class="fa-solid fa-user"></i> 1 Alumno</div>
          </div>
          <div class="course-cell">
            <div class="course-title">Kínder A</div>
            <div class="course-meta">Prof. Jefa: Mónica Bravo</div>
            <div class="course-stats"><i class="fa-solid fa-user"></i> 0 Alumno</div>
          </div>
        </div>
      </div>

      <div class="period-card">
        <div class="period-head"><i class="fa-solid fa-pencil"></i><h3 class="card-title" style="margin:0">Educación Básica</h3></div>
        <div class="period-body">
          ${[1,2,3,4,5,6,7,8].map(n => `
            <div class="course-cell ${n===1||n===2||n===8 ? 'js-view-course':''}" 
                 data-course-id="${n===1?'1b-a': (n===8?'8b-a':'')}" 
                 data-course-name="${n}° Básico A">
              <div class="course-title">${n}° Básico A</div>
              <div class="course-meta">Prof. Jefe: ${(n%2? 'Laura Pérez':'Inés Morales')}</div>
              <div class="course-stats"><i class="fa-solid fa-user"></i> ${n===1?2:n===8?1:0} Alumno(s)</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="period-card">
        <div class="period-head"><i class="fa-solid fa-graduation-cap"></i><h3 class="card-title" style="margin:0">Educación Media</h3></div>
        <div class="period-body">
          ${[1,2,3,4].map(n => `
            <div class="course-cell ${n===4?'js-view-course':''}" 
                 data-course-id="${n===4?'4m-a':''}" data-course-name="${['I','II','III','IV'][n-1]}° Medio A">
              <div class="course-title">${['I','II','III','IV'][n-1]}° Medio A</div>
              <div class="course-meta">Prof. Jefe: ${['Arturo Vidal','Carolina Neira','Marcelo Salas','Mario Vargas'][n-1]}</div>
              <div class="course-stats"><i class="fa-solid fa-user"></i> ${n===4?3:0} Alumno(s)</div>
            </div>
          `).join('')}
        </div>
      </div>
    `
  },

  'agregar-alumno':{
    title:'Alumnos Registrados',
    html:`
      <div class="card">
        <h3 class="card-title">Alumnos Registrados</h3>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr><th>RUT</th><th>Nombre</th><th>Apellido</th><th>Apoderado</th><th>RUT Apoderado</th><th>Email</th><th>Teléfono</th><th>Comuna</th><th>Curso</th><th>Fecha Ingreso</th><th>Estado</th></tr>
            </thead>
            <tbody>
              <tr><td>11.222.333-4</td><td>Juanito</td><td>Pérez</td><td>Luis Pérez</td><td>11.111.111-1</td><td>luis.perez@mail.com</td><td>912345678</td><td>Santiago</td><td>1° Básico A</td><td>01/03/2023</td><td>Activo</td></tr>
              <tr><td>22.333.444-5</td><td>María</td><td>González</td><td>Carmen González</td><td>22.222.222-2</td><td>carmen.g@mail.com</td><td>987654321</td><td>Providencia</td><td>2° Básico B</td><td>01/03/2023</td><td>Activo</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `
  },

  profesores:{
    title:'Profesores',
    html:`
      <div class="card">
        <h3 class="card-title">Listado de Profesores</h3>
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr><th>RUT</th><th>Nombre</th><th>Curso</th><th>Asignatura</th><th>Email</th><th>Teléfono</th></tr></thead>
            <tbody>
              <tr><td>12.345.678-9</td><td>María González</td><td>1° Básico</td><td>Matemáticas</td><td>maria.g@colegio.cl</td><td>+56 9 1234 5678</td></tr>
              <tr><td>23.456.789-0</td><td>Carlos Vega</td><td>2° Básico</td><td>Historia</td><td>carlos.v@colegio.cl</td><td>+56 9 8765 4321</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `
  },

  asignaturas:{
    title:'Listado de Asignaturas',
    html:`
      <div class="card">
        <h3 class="card-title">Listado de Asignaturas</h3>
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr><th>Curso</th><th>Profesor Jefe</th><th>Asignaturas</th><th>Alumnos</th></tr></thead>
            <tbody>
              <tr><td>Kínder</td><td>Ana Morales</td><td>Lenguaje, Matemáticas, Arte</td><td>15</td></tr>
              <tr><td>1° Básico</td><td>Raúl Pérez</td><td>Matemáticas, Historia, Ciencias</td><td>20</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `
  },

  asistencias:{
    title:'Asistencias de Alumnos',
    html:`
      <div class="card">
        <h3 class="card-title">Asistencias</h3>
        <details class="attendance-category" open>
          <summary style="cursor:pointer;padding:.6rem;border-radius:8px;background:var(--color-primary);color:#fff">Prekínder</summary>
          <div class="table-wrapper" style="margin-top:.6rem">
            <table class="data-table">
              <thead><tr><th>Alumno</th><th>RUT</th><th>Promedio</th><th>Asistencia</th><th>Acciones</th></tr></thead>
              <tbody><tr><td>Ana Pérez</td><td>12.345.678-9</td><td>6.5</td><td>95%</td><td><button class="btn btn-secondary">Mensaje</button></td></tr></tbody>
            </table>
          </div>
        </details>
      </div>
    `
  },

  'revision-pagos':{
    title:'Revisión de Pagos',
    html:`
      <div class="card">
        <h3 class="card-title">Pagos</h3>
        <div class="table-wrapper">
          <table class="data-table">
            <thead><tr><th>RUT Apoderado</th><th>Apoderado</th><th>Fecha</th><th>Monto</th></tr></thead>
            <tbody>
              <tr><td>12.345.678-9</td><td>Juan Pérez</td><td>12/09/2025</td><td>$50.000</td></tr>
              <tr><td>11.222.333-4</td><td>María López</td><td>15/09/2025</td><td>$60.000</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `
  },

  comunicados:{
    title:'Comunicados',
    html:`
      <div class="card">
        <h3 class="card-title">Publicar Comunicado</h3>
        <div class="field">
          <label class="label">Título</label>
          <input class="input" id="an-title" placeholder="Título">
        </div>
        <div class="field">
          <label class="label">Contenido</label>
          <textarea class="" id="an-body" rows="4" placeholder="Contenido..."></textarea>
        </div>
        <div class="field" style="text-align:right">
          <button class="btn" id="an-publish">Publicar</button>
        </div>

        <div class="card" style="margin-top:1rem">
          <h3 class="card-title">Anuncios</h3>
          <div id="an-list"><p class="course-meta">No hay anuncios publicados.</p></div>
        </div>
      </div>
    `
  },

  usuarios:{
    title:'Usuarios',
    html:`
      <div class="card">
        <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;gap:.5rem;flex-wrap:wrap">
          <h3 class="card-title" style="margin:0">Usuarios del Sistema</h3>
          <div style="display:flex;gap:.5rem">
            <button class="btn btn-secondary" id="btn-toggle-deleted">Ver eliminados: NO</button>
            <button class="btn" id="btn-new-user"><i class="fa-solid fa-user-plus"></i> Nuevo usuario</button>
          </div>
        </div>
        <div class="table-wrapper">
          <table class="data-table" id="tbl-users">
            <thead><tr><th>ID</th><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    `
  },

  pagos:{ title:'Pagos', html:`<div class="card"><p>Resumen de pagos...</p></div>` }
};

/*********************** helpers ***********************/
function mount(section){
  const view = content[section];
  if (!view){
    main.innerHTML = `<div class="card"><p>Sección no encontrada: ${section}</p></div>`;
    topbarTitle.textContent = 'Sección';
    return;
  }
  topbarTitle.textContent = view.title;
  main.innerHTML = view.html;

  if (section === 'tablero'){ renderCharts(); hookExportCSV(); }
  if (section === 'estudiantes') hookCourseCards();
  if (section === 'usuarios') initUsersUI();
  if (section === 'comunicados') initAnnouncements();
}

function renderCharts(){
  const c1 = document.getElementById('kpi-chart');
  const c2 = document.getElementById('dist-chart');

  if (chart1) chart1.destroy();
  if (chart2) chart2.destroy();

  if (c1){
    const ctx = c1.getContext('2d');
    const gradIn = ctx.createLinearGradient(0,0,0,320);
    gradIn.addColorStop(0,'rgba(106,58,143,0.95)');
    gradIn.addColorStop(1,'rgba(142,102,170,0.85)');
    const gradOut = ctx.createLinearGradient(0,0,0,320);
    gradOut.addColorStop(0,'rgba(16,43,78,0.9)');
    gradOut.addColorStop(1,'rgba(16,43,78,0.6)');

    const labels = ['Abr','May','Jun','Jul','Ago','Sep'];
    const ingresos = [12000,15000,14000,18000,17000,18500];
    const gastos   = [ 8000, 9000,10000,11000,10500,12000];

    chart1 = new Chart(ctx,{
      type:'bar',
      data:{
        labels,
        datasets:[
          { label:'Ingresos', data:ingresos, backgroundColor:gradIn, borderRadius:10, borderSkipped:false, maxBarThickness:64 },
          { label:'Gastos',   data:gastos,   backgroundColor:gradOut, borderRadius:10, borderSkipped:false, maxBarThickness:64 }
        ]
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ position:'bottom' } },
        scales:{
          x:{ grid:{ display:false } },
          y:{ beginAtZero:true, grid:{ color:getComputedStyle(document.documentElement).getPropertyValue('--chart-grid') } }
        }
      }
    });
  }

  if (c2){
    const ctx2 = c2.getContext('2d');
    chart2 = new Chart(ctx2,{
      type:'doughnut',
      data:{ labels:['Preescolar','Básica','Media'], datasets:[{ data:[12,64,14], backgroundColor:['#4c65a7','#8561c2','#c99c2e'] }] },
      options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'bottom' } } }
    });
  }
}
function hookExportCSV(){
  const btn = document.getElementById('btn-export-csv');
  if (!btn) return;
  btn.addEventListener('click', ()=>{
    const header = ['Apoderado','RUT','Curso','Mes','Monto'];
    const rows = [...document.querySelectorAll('#tbl-pagos tbody tr')].map(tr =>
      [...tr.children].slice(0,5).map(td => td.textContent.trim())
    );
    const csv = [header, ...rows].map(r => r.map(v => `"${v.replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'pagos_pendientes.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  });
}


function hookCourseCards(){
  main.querySelectorAll('.js-view-course').forEach(card=>{
    card.addEventListener('click',()=>{
      const id = card.dataset.courseId;
      const name = card.dataset.courseName || 'Curso';
      const rows = (studentData[id]||[]).map(s=>`
        <tr>
          <td>${s.id}</td>
          <td><span class="user-badge"><b>${s.name}</b></span><br><small>${s.parent}</small></td>
          <td>${s.status}</td>
          <td>
            <button class="btn btn-secondary">Ver</button>
            <button class="btn btn-danger js-del-stu" data-id="${s.id}">Eliminar</button>
          </td>
        </tr>
      `).join('') || `<tr><td colspan="4">Sin alumnos.</td></tr>`;

      main.innerHTML = `
        <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.7rem">
          <h2 style="margin:0">Alumnos — ${name}</h2>
          <button class="btn js-back"><i class="fa-solid fa-arrow-left"></i> Volver a Cursos</button>
        </div>
        <div class="card"><div class="table-wrapper">
          <table class="data-table"><thead><tr><th>ID</th><th>Alumno</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${rows}</tbody></table>
        </div></div>
      `;
      document.querySelector('.js-back').addEventListener('click',()=>mount('estudiantes'));
    });
  });
}

/*************** Modal util ***************/
const modal      = document.getElementById('modal');
const modalBody  = document.getElementById('modal-body');
const modalFoot  = document.getElementById('modal-foot');
const modalTitle = document.getElementById('modal-title');
document.getElementById('modal-close').addEventListener('click', hideModal);
modal.querySelector('.modal-backdrop').addEventListener('click', hideModal);

function showModal(title, bodyHTML, footHTML){
  modalTitle.textContent = title || '';
  modalBody.innerHTML = bodyHTML || '';
  modalFoot.innerHTML = footHTML || '';
  modal.classList.add('show');
  modal.setAttribute('aria-hidden','false');
}
function hideModal(){
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden','true');
}

/*************** Usuarios (CRUD front) ***************/
function initUsersUI(){
  const tbody = document.querySelector('#tbl-users tbody');
  const btnNew = document.getElementById('btn-new-user');
  const btnToggleDeleted = document.getElementById('btn-toggle-deleted');
  let showDeleted = false;

  function paint(){
    const rows = USERS
      .filter(u => showDeleted ? u.deleted : !u.deleted)
      .map(u => `
        <tr>
          <td>${u.id}</td>
          <td>${u.nombre}</td>
          <td>${u.email}</td>
          <td>${u.rol}</td>
          <td>
            ${u.deleted ? `<span class="user-badge badge-deleted">Eliminado</span>` :
              u.activo ? `<span class="user-badge badge-active">Activo</span>` :
                        `<span class="user-badge">Inactivo</span>`}
          </td>
          <td>
            ${u.deleted
              ? `<button class="btn btn-secondary js-restore" data-id="${u.id}"><i class="fa-solid fa-rotate-left"></i> Recuperar</button>`
              : `
                <button class="btn btn-secondary js-edit" data-id="${u.id}"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-danger js-del" data-id="${u.id}"><i class="fa-solid fa-trash"></i></button>
              `}
          </td>
        </tr>
      `).join('') || `<tr><td colspan="6">Sin usuarios.</td></tr>`;
    tbody.innerHTML = rows;
  }
  paint();

  btnToggleDeleted.addEventListener('click', ()=>{
    showDeleted = !showDeleted;
    btnToggleDeleted.textContent = `Ver eliminados: ${showDeleted ? 'SÍ' : 'NO'}`;
    paint();
  });

  btnNew.addEventListener('click', ()=> editUserModal());

  tbody.addEventListener('click', (e)=>{
    const editBtn = e.target.closest('.js-edit');
    const delBtn  = e.target.closest('.js-del');
    const resBtn  = e.target.closest('.js-restore');

    if (editBtn){
      const id = editBtn.dataset.id;
      const user = USERS.find(u=>u.id===id);
      editUserModal(user);
    }
    if (delBtn){
      const id = delBtn.dataset.id;
      const user = USERS.find(u=>u.id===id);
      if (user && confirm(`Eliminar usuario ${user.nombre}?`)){
        user.deleted = true;
        paint();
      }
    }
    if (resBtn){
      const id = resBtn.dataset.id;
      const user = USERS.find(u=>u.id===id);
      if (user){
        user.deleted = false;
        paint();
      }
    }
  });

  function editUserModal(user){
    const isEdit = !!user;
    const data = user ? {...user} : { id:`U-${String(USERS.length+1).padStart(3,'0')}`, nombre:'', email:'', rol:'Alumno', activo:true, deleted:false };

    const body = `
      <div class="field">
        <label class="label">ID</label>
        <input class="input" id="f-id" value="${data.id}" ${isEdit ? 'readonly' : ''}>
      </div>
      <div class="field">
        <label class="label">Nombre</label>
        <input class="input" id="f-nombre" value="${data.nombre}">
      </div>
      <div class="field">
        <label class="label">Email</label>
        <input class="input" id="f-email" type="email" value="${data.email}">
      </div>
      <div class="field">
        <label class="label">Rol</label>
        <select class="select" id="f-rol">
          ${['Administración','Profesor','Alumno'].map(r=>`<option ${r===data.rol?'selected':''}>${r}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label class="label">Activo</label>
        <select class="select" id="f-activo">
          <option value="true" ${data.activo?'selected':''}>Sí</option>
          <option value="false" ${!data.activo?'selected':''}>No</option>
        </select>
      </div>
    `;

    const foot = `
      <button class="btn btn-secondary" id="m-cancel">Cancelar</button>
      <button class="btn" id="m-save">${isEdit ? 'Guardar' : 'Crear'}</button>
    `;

    showModal(isEdit ? 'Editar usuario' : 'Nuevo usuario', body, foot);

    document.getElementById('m-cancel').addEventListener('click', hideModal);
    document.getElementById('m-save').addEventListener('click', ()=>{
      const payload = {
        id: document.getElementById('f-id').value.trim(),
        nombre: document.getElementById('f-nombre').value.trim(),
        email: document.getElementById('f-email').value.trim(),
        rol: document.getElementById('f-rol').value,
        activo: document.getElementById('f-activo').value === 'true',
        deleted: false
      };
      if (!payload.nombre || !payload.email){
        alert('Nombre y Email son obligatorios.');
        return;
      }
      if (isEdit){
        const ix = USERS.findIndex(u=>u.id===payload.id);
        if (ix>-1) USERS[ix] = {...USERS[ix], ...payload};
      } else {
        USERS.push(payload);
      }
      hideModal();
      paint();
    });
  }
}

/*************** Anuncios (demo) *****************/
function initAnnouncements(){
  const btn = document.getElementById('an-publish');
  const list = document.getElementById('an-list');
  btn.addEventListener('click', ()=>{
    const t = document.getElementById('an-title').value.trim();
    const b = document.getElementById('an-body').value.trim();
    if (!t || !b){ alert('Completa título y contenido.'); return; }
    const item = document.createElement('div');
    item.className = 'card';
    item.innerHTML = `<h4 style="margin:0 0 .3rem">${t}</h4><p class="course-meta" style="margin:0">${b}</p>`;
    list.prepend(item);
    document.getElementById('an-title').value='';
    document.getElementById('an-body').value='';
  });
}

/*************** Navegación ***************/
menuLinks.forEach(a=>{
  a.addEventListener('click', (e)=>{
    e.preventDefault();
    menuLinks.forEach(x=>x.classList.remove('active'));
    a.classList.add('active');
    const parent = a.closest('details.menu-group');
    if (parent) parent.open = true;
    mount(a.dataset.section);
    if (mq.matches) sidebar.classList.add('closed');
  });
});

// Arranque
document.addEventListener('DOMContentLoaded', () => mount('tablero'));
