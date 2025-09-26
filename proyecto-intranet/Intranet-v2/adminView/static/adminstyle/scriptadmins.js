const toggleBtn = document.getElementById('toggle');
const sidebar = document.getElementById('sidebar');
const mq = window.matchMedia("(max-width: 768px)");

sidebar.style.transition = 'none';

/* Slide bar para pc y celular de foma responsiva */

// Función que actualiza el estado del sidebar según el ancho de pantalla.
function updateSidebar() {
  if (mq.matches) {
    sidebar.classList.add('closed'); 
  } else {
    sidebar.classList.remove('closed'); 
  }
}

// Ejecutamos inmediatamente para aplicar el estado inicial correcto
updateSidebar();

// Reactivamos la transición luego de un breve tiempo, y hacemos que sea lenta la transición
setTimeout(() => {
  sidebar.style.transition = '';
}, 50);

// Al hacer click en el menu de hamburguesa/toggle, alternamos el estado del sidebar
toggleBtn.addEventListener('click', () => {
  sidebar.classList.toggle('closed');
});

// En celular, si el usuario hace click fuera del sidebar y del botón se cierra
document.addEventListener('click', (e) => {
  if (!mq.matches) return; // sólo aplica en móvil
  const isClickInsideSidebar = sidebar.contains(e.target);
  const isClickToggleBtn = toggleBtn.contains(e.target);
  if (!isClickInsideSidebar && !isClickToggleBtn) {
    sidebar.classList.add('closed');
  }
});

// Cuando cambie el ancho de la pantalla (rotación, resize), reevaluamos el estado.
mq.addEventListener('change', updateSidebar);

/* aqui podemos deslizar la barra lateral con el dedo en pantallas táctiles  */
let touchStartX = 0;
let touchEndX = 0;

document.addEventListener('touchstart', (e) => {
  if (!mq.matches) return; // solo móvil
  touchStartX = e.touches[0].clientX;
});

document.addEventListener('touchend', (e) => {
  if (!mq.matches) return; // solo móvil
  touchEndX = e.changedTouches[0].clientX;
  const swipeDistance = touchEndX - touchStartX;

  // Swipe desde borde izquierdo (menos de 30px del borde) hacia la derecha: abrir sidebar
  if (touchStartX < 200 && swipeDistance > 50) {
    sidebar.classList.remove('closed');
  }

  // Swipe hacia la izquierda: cerrar sidebar
  if (swipeDistance < -50) {
    sidebar.classList.add('closed');
  }
  touchStartX = 0;
  touchEndX = 0;
});



/* Navegacion y contenedores */

const mainContent = document.getElementById('main-content');
const menuLinks = document.querySelectorAll('.menu a[data-section]');
const topbarTitle = document.getElementById('topbar-title');
let adminChartInstance = null;

/* Datos de ejemplo para mostrar como quedaria (falta la bd) */

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

/* Simulacion de contenido de tablero */

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

 /*Simulacion de contenido de estudiantes*/
  'estudiantes': {
    title: 'Navegador de Cursos',
    html: `
      <div class="page-header">
        <h2>Navegador de Cursos</h2>
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

 /*Simulacion de contenido de la lista de alumnos*/
  'agregar-alumno': {
    title: 'Listado de Alumnos',
    html: `
    <div class="page-header">
      <h2>Alumnos Registrados</h2>
    </div>
    <div class="card">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>RUT</th>
              <th>Nombre</th>
              <th>Apellido</th>
              <th>Apoderado</th>
              <th>RUT Apoderado</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Comuna</th>
              <th>Curso</th>
              <th>Fecha Ingreso</th>
              <th>Activo/Inactivo</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>11.222.333-4</td>
              <td>Juanito</td>
              <td>Pérez</td>
              <td>Luis Pérez</td>
              <td>11.111.111-1</td>
              <td>luis.perez@mail.com</td>
              <td>912345678</td>
              <td>Santiago</td>
              <td>1° Básico A</td>
              <td>01/03/2023</td>
              <td>Activo</td>
            </tr>
            <tr>
              <td>22.333.444-5</td>
              <td>María</td>
              <td>González</td>
              <td>Carmen González</td>
              <td>22.222.222-2</td>
              <td>carmen.g@mail.com</td>
              <td>987654321</td>
              <td>Providencia</td>
              <td>2° Básico B</td>
              <td>01/03/2023</td>
              <td>Activo</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
  },
 /*Simulacion de contenido de profesores*/
  'profesores': {
    title: 'Profesores',
    html: `
    <h3 class="card-title">Listado de Profesores</h3>
    <div class="card">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>RUT</th>
              <th>Nombre</th>
              <th>Curso</th>
              <th>Asignatura</th>
              <th>Email</th>
              <th>Teléfono</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>12.345.678-9</td>
              <td>María González</td>
              <td>1° Básico</td>
              <td>Matemáticas</td>
              <td>maria.g@colegio.cl</td>
              <td>+56 9 1234 5678</td>
            </tr>
            <tr>
              <td>23.456.789-0</td>
              <td>Carlos Vega</td>
              <td>2° Básico</td>
              <td>Historia</td>
              <td>carlos.v@colegio.cl</td>
              <td>+56 9 8765 4321</td>
            </tr>
            <tr>
              <td>34.567.890-1</td>
              <td>Isabel Ríos</td>
              <td>3° Básico</td>
              <td>Lenguaje</td>
              <td>isabel.r@colegio.cl</td>
              <td>+56 9 9123 4567</td>
            </tr>
            <tr>
              <td>45.678.901-2</td>
              <td>Felipe Castro</td>
              <td>4° Básico</td>
              <td>Ciencias</td>
              <td>felipe.c@colegio.cl</td>
              <td>+56 9 9345 6789</td>
            </tr>
            <tr>
              <td>56.789.012-3</td>
              <td>Laura Moreno</td>
              <td>5° Básico</td>
              <td>Matemáticas</td>
              <td>laura.m@colegio.cl</td>
              <td>+56 9 9456 7890</td>
            </tr>
            <tr>
              <td>67.890.123-4</td>
              <td>Juan Torres</td>
              <td>6° Básico</td>
              <td>Historia</td>
              <td>juan.t@colegio.cl</td>
              <td>+56 9 9567 8901</td>
            </tr>
            <tr>
              <td>78.901.234-5</td>
              <td>Raúl Fernández</td>
              <td>3° Medio</td>
              <td>Matemáticas</td>
              <td>raul.f@colegio.cl</td>
              <td>+56 9 9678 9012</td>
            </tr>
            <tr>
              <td>89.012.345-6</td>
              <td>Carmen Rojas</td>
              <td>3° Medio</td>
              <td>Lenguaje</td>
              <td>carmen.r@colegio.cl</td>
              <td>+56 9 9789 0123</td>
            </tr>
            <tr>
              <td>90.123.456-7</td>
              <td>Eduardo Soto</td>
              <td>3° Medio</td>
              <td>Ciencias</td>
              <td>eduardo.s@colegio.cl</td>
              <td>+56 9 9890 1234</td>
            </tr>
            <tr>
              <td>01.234.567-8</td>
              <td>Paula Herrera</td>
              <td>7° Básico</td>
              <td>Arte</td>
              <td>paula.h@colegio.cl</td>
              <td>+56 9 9012 3456</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
  },
 /*Simulacion de contenido de listado de asignaturas*/
  'asignaturas': {
    title: 'Listado de Asignaturas',
    html: `
    <h3 class="card-title">Listado de Asignaturas</h3>
    <div class="card">
      <table class="data-table">
        <thead>
          <tr>
            <th>Curso</th>
            <th>Profesor Jefe</th>
            <th>Asignaturas del curso</th>
            <th>Cantidad de Alumnos</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Kinder</td>
            <td>Ana Morales</td>
            <td>Lenguaje, Matemáticas, Arte</td>
            <td>15</td>
          </tr>
          <tr>
            <td>1° Básico</td>
            <td>Raúl Pérez</td>
            <td>Matemáticas, Historia, Ciencias</td>
            <td>20</td>
          </tr>
          <tr>
            <td>2° Básico</td>
            <td>Laura Díaz</td>
            <td>Lenguaje, Matemáticas, Historia</td>
            <td>19</td>
          </tr>
          <tr>
            <td>3° Básico</td>
            <td>Paula Herrera</td>
            <td>Matemáticas, Lenguaje, Historia</td>
            <td>20</td>
          </tr>
          <tr>
            <td>4° Básico</td>
            <td>María Silva</td>
            <td>Lenguaje, Matemáticas, Historia, Ciencias</td>
            <td>21</td>
          </tr>
          <tr>
            <td>5° Básico</td>
            <td>Laura Moreno</td>
            <td>Lenguaje, Matemáticas, Historia, Ciencias</td>
            <td>22</td>
          </tr>
          <tr>
            <td>6° Básico</td>
            <td>Raúl Soto</td>
            <td>Lenguaje, Matemáticas, Historia, Ciencias</td>
            <td>21</td>
          </tr>
          <tr>
            <td>7° Básico</td>
            <td>Laura Rojas</td>
            <td>Lenguaje, Matemáticas, Historia, Ciencias</td>
            <td>22</td>
          </tr>
          <tr>
            <td>8° Básico</td>
            <td>Paula Moreno</td>
            <td>Lenguaje, Matemáticas, Historia, Ciencias</td>
            <td>22</td>
          </tr>
          <tr>
            <td>1° Medio</td>
            <td>Raúl Moreno</td>
            <td>Lenguaje, Matemáticas, Historia, Ciencias</td>
            <td>24</td>
          </tr>
          <tr>
            <td>2° Medio</td>
            <td>Laura Fernández</td>
            <td>Lenguaje, Matemáticas, Historia, Ciencias</td>
            <td>24</td>
          </tr>
          <tr>
            <td>3° Medio</td>
            <td>Raúl Fernández</td>
            <td>Lenguaje, Matemáticas, Historia, Ciencias</td>
            <td>24</td>
          </tr>
          <tr>
            <td>4° Medio</td>
            <td>Laura Medina</td>
            <td>Lenguaje, Matemáticas, Historia, Ciencias</td>
            <td>25</td>
          </tr>
        </tbody>
      </table>
    </div>
  `
  },
 /*Simulacion de contenido de asistencias*/
  'asistencias': {
    title: 'Asistencias de Alumnos',
    html: `
    <h3 class="card-title">Asistencias de Alumnos</h3>
    <div class="attendance-section">
      <!-- Varias categorías (Prekínder, 1° Básico, etc.), cada una con su tabla -->
      <!-- Aquí se muestran datos de ejemplo. En producción, reemplazar por fetch a la API. -->
      <details class="attendance-category">
        <summary>Prekínder</summary>
        <div class="attendance-card">
          <table class="data-table">
            <thead>
              <tr>
                <th>Alumno</th>
                <th>RUT</th>
                <th>Promedio</th>
                <th>Asistencia</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Ana Pérez</td>
                <td>12.345.678-9</td>
                <td>6.5</td>
                <td>95%</td>
                <td>
                  <button class="btn message-btn" data-contact="56912345678">
                    <i class="fa-solid fa-envelope"></i> Mensaje
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>
      <!-- poner hasta 4tomedio -->
    </div>
  `
  },

  'revision-pagos': {
    title: 'Revisión de Pagos',
    html: `
    <div class="payments-section">
      <details class="payment-category">
        <summary> Pagos Realizados</summary>
        <div class="card">
          <table class="data-table">
            <thead>
              <tr>
                <th>RUT Apoderado</th>
                <th>Apoderado</th>
                <th>Fecha</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>12.345.678-9</td>
                <td>Juan Pérez</td>
                <td>12/09/2025</td>
                <td>$50.000</td>
              </tr>
              <tr>
                <td>11.222.333-4</td>
                <td>María López</td>
                <td>15/09/2025</td>
                <td>$60.000</td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>
      <details class="payment-category">
        <summary> Pagos en Proceso</summary>
        <div class="card">
          <table class="data-table">
            <thead>
              <tr>
                <th>RUT Apoderado</th>
                <th>Apoderado</th>
                <th>Fecha</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>22.333.444-6</td>
                <td>Pedro Torres</td>
                <td>30/09/2025</td>
                <td>$55.000</td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>
      <details class="payment-category">
        <summary> Pagos Atrasados</summary>
        <div class="card">
          <table class="data-table">
            <thead>
              <tr>
                <th>RUT Apoderado</th>
                <th>Apoderado</th>
                <th>Fecha</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>99.888.777-6</td>
                <td>Laura González</td>
                <td>05/09/2025</td>
                <td>$70.000</td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>
    </div>
  `
  },
 /*Simulacion de contenido de comunicados*/
  'comunicados': {
    title: 'Comunicados',
    html: `
    <div class="card announcements-card">
      <h3 class="card-title">Anuncios</h3>
      <div class="announcement-create">
        <h4>Crear Nuevo Anuncio</h4>
        <div class="announcement-inputs">
          <input id="new-an-title" type="text" placeholder="Título del anuncio" />
          <textarea id="new-an-content" rows="4" placeholder="Contenido..."></textarea>
          <div class="text-right">
            <button id="add-announcement" class="btn">Publicar</button>
          </div>
        </div>
      </div>
      <div class="announcement-filters-bottom">
        <label for="course-filter">Curso:</label>
        <select id="course-filter">
          <option value="">Todos</option>
          <option value="prekinder">Prekínder</option>
          <option value="kinder">Kinder</option>
          <option value="1basico">1° Básico</option>
          <option value="2basico">2° Básico</option>
          <option value="3basico">3° Básico</option>
          <option value="4basico">4° Básico</option>
          <option value="5basico">5° Básico</option>
          <option value="6basico">6° Básico</option>
          <option value="7basico">7° Básico</option>
          <option value="8basico">8° Básico</option>
          <option value="1medio">1° Medio</option>
          <option value="2medio">2° Medio</option>
          <option value="3medio">3° Medio</option>
          <option value="4medio">4° Medio</option>
        </select>
        <label for="parent-filter">Para:</label>
        <select id="parent-filter">
          <option value="">Todos</option>
        </select>
        <label><input type="checkbox" id="has-email-filter"> Solo con correo</label>
        <label><input type="checkbox" id="has-whatsapp-filter"> Solo WhatsApp</label>
      </div>
      <div class="announcement-list-section">
        <h4>Anuncios Publicados</h4>
        <div id="announcements-list">
          <p>No hay anuncios publicados.</p>
        </div>
      </div>
    </div>
  `
  },
 /*Simulacion de contenido de lista de usuarios*/
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
 /*Simulacion de contenido de pagos*/
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

/* Grafico del tablero del admin*/
function renderAdminDashboardChart() {
  const canvas = document.getElementById('admin-chart');
  if (!canvas) return;
  if (adminChartInstance) {
    adminChartInstance.destroy();
  }

  // Forzamos una altura adecuada del contenedor para que Chart.js calcule bien.
  const container = canvas.closest('.chart-container');
  if (container) {
    container.style.height = '320px';
    container.style.maxHeight = '420px';
  }

  const ctx = canvas.getContext('2d');

  // Degradado vertical basado en la altura real del contenedor.
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

/* tablas de alumnos por curso (simulacion)*/
function renderStudentTable(courseId, courseName) {
  const students = studentData[courseId] || [];
  let rows = students.map(s => `
    <tr>
      <td>${s.id}</td>
      <td class="user-cell">
        <div class="avatar" style="width:36px;height:36px;font-size:.85rem">${s.name.split(' ').map(n => n[0]).join('')}</div>
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

/* secciones*/
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
  // Si existen tarjetas de curso en la sección, las activamos para que
  // al hacer click cambien la vista a la tabla de alumnos del curso elegido.
  const courseCards = mainContent.querySelectorAll('.js-view-course');
  courseCards.forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.courseId;
      const name = card.dataset.courseName || card.querySelector('.course-card-info h4')?.textContent || 'Curso';
      renderStudentTable(id, name);
      // Como cambiamos de vista, removemos el estado "active" del menú (si lo tuviera).
      document.querySelectorAll('.menu a').forEach(a => a.classList.remove('active'));
    });
  });
}

/*Interacciones del menu*/
menuLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const sec = link.dataset.section;
    if (!sec) return;
    // estilo de "activo" en el menú
    menuLinks.forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    const parentDetails = link.closest('details.menu-group');
    if (parentDetails) parentDetails.open = true;
    renderContent(sec);
    // si estamos en celular, cerramos el sidebar tras elegir una sección
    if (mq.matches) sidebar.classList.add('closed');
  });
});

/*Eventos*/ 
mainContent.addEventListener('click', e => {
  const bt = e.target.closest('.js-back-to-courses');
  if (bt) {
    renderContent('estudiantes');
    // Marcamos "Estudiantes" como activo en el menú para mantener coherencia visual.
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
      // Sólo removemos la fila del DOM como simulación. En producción, aquí
      // iría una llamada al backend y, tras éxito, refrescar la tabla.
      delBtn.closest('tr').remove();
    }
    return;
  }
});
renderContent('tablero');