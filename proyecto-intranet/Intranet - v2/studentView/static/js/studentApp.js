// SIDEBAR TOGGLE
const toggleBtn = document.getElementById('toggle');
const sidebar = document.getElementById('sidebar');
const mq = window.matchMedia("(max-width: 768px)");

toggleBtn.addEventListener('click', () => {
  sidebar.classList.toggle('closed');
});
document.addEventListener("click", (e) => {
  if (mq.matches && !sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
    sidebar.classList.add("closed");
  }
});
function updateSidebar() {
  if (mq.matches) sidebar.classList.add('closed');
  else sidebar.classList.remove('closed');
}
updateSidebar();
mq.addEventListener('change', updateSidebar);

// CONTENIDO DINÁMICO
const mainCard = document.getElementById('main-card');
const links = document.querySelectorAll('.menu a');
const topbarTitle = document.getElementById('topbar-title');

const contentData = {
  'dashboard': {
    title: 'Dashboard',
    html: `
      <h3 class="card-title">Resumen General</h3>
      <div class="stat-cards-container">
        <div class="stat-card" style="--card-color: #4A2B6D;"><div class="card-icon"><i class="fa-solid fa-star"></i></div><div class="card-info"><div class="card-num">6.5</div><div class="card-label">Promedio General</div></div></div>
        <div class="stat-card" style="--card-color: #2563eb;"><div class="card-icon"><i class="fa-solid fa-file-pen"></i></div><div class="card-info"><div class="card-num">3</div><div class="card-label">Tareas Pendientes</div></div></div>
        <div class="stat-card" style="--card-color: #db2777;"><div class="card-icon"><i class="fa-solid fa-bullhorn"></i></div><div class="card-info"><div class="card-num">2</div><div class="card-label">Anuncios Nuevos</div></div></div>
        <div class="stat-card" style="--card-color: #16a34a;"><div class="card-icon"><i class="fa-solid fa-calendar-check"></i></div><div class="card-info"><div class="card-num">98%</div><div class="card-label">Asistencia</div></div></div>
      </div>
      <div class="dashboard-columns">
        <div class="dashboard-column"><div class="card list-card"><h3 class="card-title-small">Próximos Eventos y Anuncios</h3><ul class="events-list"><li><div class="event-date"><span>15</span>SEP</div><div class="event-details"><div class="event-title">Examen Final de Matemáticas</div><div class="event-meta">Aula 102 - 10:00 AM</div></div></li><li><div class="event-date"><span>18</span>SEP</div><div class="event-details"><div class="event-title">Feriado Fiestas Patrias</div><div class="event-meta">No hay clases</div></div></li><li><div class="event-date"><span>25</span>SEP</div><div class="event-details"><div class="event-title">Entrega Proyecto de Ciencias</div><div class="event-meta">Fecha límite: 11:59 PM</div></div></li><li><div class="event-date"><span>30</span>SEP</div><div class="event-details"><div class="event-title">Reunión de Apoderados</div><div class="event-meta">Gimnasio - 7:00 PM</div></div></li></ul></div></div>
        <div class="dashboard-column"><div class="card table-card"><h3 class="card-title-small">Últimas Calificaciones</h3><div class="table-wrapper"><table class="grades-table"><thead><tr><th>Asignatura</th><th>Evaluación</th><th>Nota</th></tr></thead><tbody><tr><td>Historia</td><td>Prueba Parcial 2</td><td><span class="grade grade-good">6.8</span></td></tr><tr><td>Lenguaje</td><td>Ensayo "Cien Años de Soledad"</td><td><span class="grade grade-excellent">7.0</span></td></tr><tr><td>Química</td><td>Laboratorio N°3</td><td><span class="grade grade-bad">5.2</span></td></tr><tr><td>Inglés</td><td>Presentación Oral</td><td><span class="grade grade-regular">6.0</span></td></tr></tbody></table></div></div></div>
      </div>
    `
  },
  'mis-clases': {
    title: 'Mis Clases',
    html: `
        <h3 class="card-title">Mis Clases</h3>
        <p class="card-subtitle">Aquí encontrarás un resumen de todas tus asignaturas para el año escolar actual.</p>
        <div class="classes-grid">
            <div class="class-card">
                <div class="class-card-icon" style="background-color: rgba(74, 43, 109, 0.1); color: var(--color-primary);"><i class="fa-solid fa-calculator"></i></div>
                <div class="class-card-info">
                    <h4 class="class-card-title">Matemáticas</h4>
                    <p class="class-card-teacher">Prof. Ricardo Lagos</p>
                </div>
                <div class="class-card-progress">
                    <div class="progress-labels"><span>Promedio</span><span>6.8</span></div>
                    <div class="progress-bar-container"><div class="progress-bar" style="width: 97%;"></div></div>
                </div>
                <div class="class-card-footer"><a href="#" class="btn btn-secondary">Ver Detalles</a></div>
            </div>
            <div class="class-card">
                <div class="class-card-icon" style="background-color: rgba(219, 39, 119, 0.1); color: #db2777;"><i class="fa-solid fa-book-open"></i></div>
                <div class="class-card-info">
                    <h4 class="class-card-title">Lenguaje</h4>
                    <p class="class-card-teacher">Prof. Isabel Allende</p>
                </div>
                <div class="class-card-progress">
                    <div class="progress-labels"><span>Promedio</span><span>6.2</span></div>
                    <div class="progress-bar-container"><div class="progress-bar" style="width: 88%;"></div></div>
                </div>
                <div class="class-card-footer"><a href="#" class="btn btn-secondary">Ver Detalles</a></div>
            </div>
            <div class="class-card">
                <div class="class-card-icon" style="background-color: rgba(245, 158, 11, 0.1); color: #f59e0b;"><i class="fa-solid fa-landmark"></i></div>
                <div class="class-card-info">
                    <h4 class="class-card-title">Historia</h4>
                    <p class="class-card-teacher">Prof. Augusto Pinochet</p>
                </div>
                <div class="class-card-progress">
                    <div class="progress-labels"><span>Promedio</span><span>5.5</span></div>
                    <div class="progress-bar-container"><div class="progress-bar" style="width: 78%;"></div></div>
                </div>
                <div class="class-card-footer"><a href="#" class="btn btn-secondary">Ver Detalles</a></div>
            </div>
            <div class="class-card">
                <div class="class-card-icon" style="background-color: rgba(22, 163, 74, 0.1); color: #16a34a;"><i class="fa-solid fa-flask-vial"></i></div>
                <div class="class-card-info">
                    <h4 class="class-card-title">Ciencias</h4>
                    <p class="class-card-teacher">Prof. Marie Curie</p>
                </div>
                <div class="class-card-progress">
                    <div class="progress-labels"><span>Promedio</span><span>6.9</span></div>
                    <div class="progress-bar-container"><div class="progress-bar" style="width: 98%;"></div></div>
                </div>
                <div class="class-card-footer"><a href="#" class="btn btn-secondary">Ver Detalles</a></div>
            </div>
             <div class="class-card">
                <div class="class-card-icon" style="background-color: rgba(37, 99, 235, 0.1); color: #2563eb;"><i class="fa-solid fa-earth-americas"></i></div>
                <div class="class-card-info">
                    <h4 class="class-card-title">Inglés</h4>
                    <p class="class-card-teacher">Prof. John Doe</p>
                </div>
                <div class="class-card-progress">
                    <div class="progress-labels"><span>Promedio</span><span>7.0</span></div>
                    <div class="progress-bar-container"><div class="progress-bar" style="width: 100%;"></div></div>
                </div>
                <div class="class-card-footer"><a href="#" class="btn btn-secondary">Ver Detalles</a></div>
            </div>
             <div class="class-card">
                <div class="class-card-icon" style="background-color: rgba(220, 38, 38, 0.1); color: #dc2626;"><i class="fa-solid fa-person-running"></i></div>
                <div class="class-card-info">
                    <h4 class="class-card-title">Educación Física</h4>
                    <p class="class-card-teacher">Prof. Usain Bolt</p>
                </div>
                <div class="class-card-progress">
                    <div class="progress-labels"><span>Promedio</span><span>-</span></div>
                    <div class="progress-bar-container"><div class="progress-bar" style="width: 100%;"></div></div>
                </div>
                <div class="class-card-footer"><a href="#" class="btn btn-secondary">Ver Detalles</a></div>
            </div>
        </div>
    `
  },
  'tareas': {
    title: 'Tareas y Notas',
    html: `
      <h3 class="card-title">Tareas y Notas</h3><div class="filters-container"><div class="filter-group"><label for="subject-filter">Filtrar por Asignatura</label><select id="subject-filter" class="filter-select"><option value="todas">Todas las asignaturas</option><option value="matematicas">Matemáticas</option><option value="lenguaje">Lenguaje</option><option value="historia">Historia</option><option value="ciencias">Ciencias</option><option value="ingles">Inglés</option></select></div><div class="filter-group"><label>Filtrar por Estado</label><div class="filter-buttons"><button class="filter-btn active" data-status="todas">Todas</button><button class="filter-btn" data-status="pendiente">Pendientes</button><button class="filter-btn" data-status="entregada">Entregadas</button><button class="filter-btn" data-status="calificada">Calificadas</button></div></div></div>
      <div class="table-wrapper"><table class="tasks-table"><thead><tr><th>Asignatura</th><th>Tarea / Evaluación</th><th>Fecha de Entrega</th><th>Estado</th><th>Nota</th></tr></thead>
        <tbody><tr><td>Matemáticas</td><td>Guía de Álgebra N°5</td><td>12/09/2025</td><td><span class="status status-pending">Pendiente</span></td><td>-</td></tr><tr><td>Lenguaje</td><td>Ensayo "Cien Años de Soledad"</td><td>10/09/2025</td><td><span class="status status-graded">Calificada</span></td><td><span class="grade grade-excellent">7.0</span></td></tr><tr><td>Historia</td><td>Prueba Parcial 2</td><td>08/09/2025</td><td><span class="status status-graded">Calificada</span></td><td><span class="grade grade-good">6.8</span></td></tr><tr><td>Ciencias</td><td>Proyecto "El Ecosistema"</td><td>25/09/2025</td><td><span class="status status-pending">Pendiente</span></td><td>-</td></tr><tr><td>Inglés</td><td>Presentación Oral "My Hobbies"</td><td>05/09/2025</td><td><span class="status status-submitted">Entregada</span></td><td>En revisión</td></tr><tr><td>Matemáticas</td><td>Prueba de Geometría</td><td>01/09/2025</td><td><span class="status status-graded">Calificada</span></td><td><span class="grade grade-bad">5.2</span></td></tr></tbody>
      </table></div>`
  },
  'calendario': {
    title: 'Calendario Académico',
    html: `<div id="calendar-container"><div id="calendar"></div></div>`
  },
  'perfil': {
    title: 'Mi Perfil',
    html: `
      <h3 class="card-title">Mi Perfil</h3><div class="profile-layout"><div class="profile-sidebar"><div class="profile-avatar-card"><div class="profile-avatar">FH</div><h2 class="profile-name">Felipe Huencho</h2><p class="profile-course">Curso: 8° Básico A</p><button class="btn btn-secondary"><i class="fa-solid fa-camera"></i> Cambiar Foto</button></div></div><div class="profile-details"><div class="details-header"><h4>Información del Alumno</h4><button class="btn btn-edit"><i class="fa-solid fa-pencil"></i> Editar</button></div><div class="info-grid"><div class="info-item"><span class="info-label">Nombres</span><span class="info-value">Felipe Ignacio</span></div><div class="info-item"><span class="info-label">Apellidos</span><span class="info-value">Huencho Pérez</span></div><div class="info-item"><span class="info-label">RUT</span><span class="info-value">22.333.444-5</span></div><div class="info-item"><span class="info-label">Fecha de Nacimiento</span><span class="info-value">15 de Mayo, 2011</span></div><div class="info-item"><span class="info-label">Comuna</span><span class="info-value">Santo Domingo</span></div><div class="info-item"><span class="info-label">ID Estudiante</span><span class="info-value">SAH-2025-0123</span></div></div><h4 class="details-subtitle">Información del Apoderado</h4><div class="info-grid"><div class="info-item"><span class="info-label">Nombre Apoderado</span><span class="info-value">Ana Pérez González</span></div><div class="info-item"><span class="info-label">RUT Apoderado</span><span class="info-value">12.345.678-9</span></div><div class="info-item"><span class="info-label">Email</span><span class="info-value">ana.perez@email.com</span></div><div class="info-item"><span class="info-label">Teléfono</span><span class="info-value">+56 9 8765 4321</span></div></div></div></div>`
  },
  'pagos': {
    title: 'Portal de Pagos',
    html: `
      <h3 class="card-title">Portal de Pagos</h3><div class="pagos-resumen"><div class="resumen-card"><div class="num">$230.000</div><div class="label">Total Pendiente</div></div><div class="resumen-card paid"><div class="num">7</div><div class="label">Pagos Realizados</div></div></div><h4>Pagos Pendientes</h4><div class="table-wrapper"><table class="tabla-pagos"><thead><tr><th>Mensualidad</th><th>Vencimiento</th><th>Monto</th><th>Acción</th></tr></thead><tbody><tr><td>Septiembre</td><td>10/09/2025</td><td>$230.000</td><td><button class="btn btn-pagar">Pagar</button></td></tr></tbody></table></div><h4>Historial de Pagos</h4><div class="table-wrapper"><table class="tabla-pagos"><thead><tr><th>Mensualidad</th><th>Fecha de Pago</th><th>Monto</th><th>Estado</th></tr></thead> 
        <tbody><tr><td>Abril</td><td>10/03/2025</td><td>$230.000</td><td><span class="status status-paid">Pagado</span></td></tr><tr><td>Mayo</td><td>10/04/2025</td><td>$230.000</td><td><span class="status status-paid">Pagado</span></td></tr><tr><td>Junio</td><td>10/05/2025</td><td>$230.000</td><td><span class="status status-paid">Pagado</span></td></tr><tr><td>Julio</td><td>10/06/2025</td><td>$230.000</td><td><span class="status status-paid">Pagado</span></td></tr><tr><td>Agosto</td><td>10/07/2025</td><td>$230.000</td><td><span class="status status-review">En revisión</span></td></tr></tbody>
      </table></div>`
  }
};

function renderCalendar() {
  const calendarEl = document.getElementById('calendar');
  if (!calendarEl) return;
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth', locale: 'es', height: '100%',
    headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,listWeek' },
    events: [ { title: 'Prueba de Geometría', start: '2025-09-01', className: 'event-examen' }, { title: 'Entrega Ensayo', start: '2025-09-10', className: 'event-tarea' }, { title: 'Examen Final Matemáticas', start: '2025-09-15', end: '2025-09-16', className: 'event-examen' }, { title: 'Feriado Fiestas Patrias', start: '2025-09-18', end: '2025-09-20', className: 'event-feriado', display: 'background' }, { title: 'Entrega Proyecto de Ciencias', start: '2025-09-25', className: 'event-tarea' }, { title: 'Reunión de Apoderados', start: '2025-09-30T19:00:00', className: 'event-reunion' }]
  });
  calendar.render();
}

function renderContent(section) {
    if (contentData[section]) {
        links.forEach(l => l.classList.remove('active'));
        const activeLink = document.querySelector(`.menu a[data-section="${section}"]`);
        if (activeLink) activeLink.classList.add('active');
        const newTitle = contentData[section].title;
        topbarTitle.textContent = newTitle;
        mainCard.innerHTML = contentData[section].html;
        if (section === 'calendario') {
            renderCalendar();
        }
    }
}

links.forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const section = link.dataset.section;
    renderContent(section);
  });
});

renderContent('dashboard');