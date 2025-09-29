/* 
  ================== CONFIG/ESTADO ==================
  Guardamos aquí lo que el front necesita recordar sin backend:
  - tema elegido (auto/claro/oscuro),
  - filtros de tareas,
  - “unlock” temporal de pagos (bloqueo parental),
  - y la foto del alumno (guardada local en DataURL).
  No hay magia: todo explícito para que el que lea no se pierda.
*/
const STATIC_URL  = (typeof window !== "undefined" && window.STATIC_URL) ? window.STATIC_URL : "/static/";
const PHOTO_KEY   = "student_photo_dataurl";   // Foto del alumno en Base64 (DataURL). Prototipo limpio y suficiente.
const PROFILE_KEY = "student_profile_cache";   // Si luego editas perfil, puedes cachearlo acá.

const STATE = {
  section: "dashboard",
  filters: JSON.parse(localStorage.getItem("student_filters")||"{}"),
  pagosUnlockUntil: Number(sessionStorage.getItem("pagos_until")||0),
  theme: localStorage.getItem("theme") || "auto"  // auto | light | dark
};

/* 
  ================== DATOS MOCK/SERVICIOS ==================
  Nada de acoplar las vistas a una API real todavía. 
  Esto funciona sin backend; cuando lo tengas, cambias api.* y listo.
*/
const DATA = {
  clases: [
    { id:"mat", nombre:"Matemáticas", profesor:"María López",  progreso:90, promedio:6.8 },
    { id:"len", nombre:"Lenguaje",    profesor:"Isabel Martinez",progreso:72, promedio:6.2 },
    { id:"his", nombre:"Historia",    profesor:"Andrea Soto",   progreso:58, promedio:5.5 },
    { id:"cie", nombre:"Ciencias",    profesor:"Marie Jane",   progreso:70, promedio:6.9 },
    { id:"ing", nombre:"Inglés",      profesor:"John Doe",      progreso:82, promedio:7.0 },
  ],
  tareas: [
    { id:1, asignatura:"Matemáticas", titulo:"Funciones – guía 1",  fecha:"2025-10-05", estado:"pending",   nota:null },
    { id:2, asignatura:"Lenguaje",    titulo:"Ensayo argumentativo",fecha:"2025-10-22", estado:"pending",   nota:null },
    { id:3, asignatura:"Historia",    titulo:"Control conceptos",   fecha:"2025-09-03", estado:"graded",    nota:6.2  },
    { id:4, asignatura:"Inglés",      titulo:"Speaking A2",         fecha:"2025-10-18", estado:"submitted", nota:null },
  ],
  eventos: [
    { id:101, title:"Prueba de Geometría", date:"2025-10-01", type:"examen", asignatura:"Matemáticas" },
    { id:102, title:"Entrega Ensayo",      date:"2025-10-10", type:"tarea",  asignatura:"Lenguaje"    },
    { id:103, title:"Laboratorio",         date:"2025-10-15", type:"tarea",  asignatura:"Ciencias"    },
  ],
  perfil: {
    nombre:"Felipe Huencho", curso:"4° Medio A", rut:"20.123.456-7",
    correo:"felipe.huencho@example.com", telefono:"+56 9 1234 5678"
  }
};

/* 
  “api” fake con latencia:
  Sí, le metemos setTimeout para que aparezcan skeletons y probemos la UX real.
*/
const api = {
  getClases:   () => new Promise(r=>setTimeout(()=>r(DATA.clases), 500)),
  getTareas:   () => new Promise(r=>setTimeout(()=>r(DATA.tareas), 600)),
  getEventos:  () => new Promise(r=>setTimeout(()=>r(DATA.eventos), 400)),
  getPerfil:   () => new Promise(r=>{
    setTimeout(()=>{
      const cache = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
      r(cache ? {...DATA.perfil, ...cache} : DATA.perfil);
    }, 300);
  }),
};

/* ================== UTILIDADES SUELTAS ================== */
/* helpers pequeños, sin dependencia de frameworks: mantenible y rápido */
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const setTitle = t => { const n=$("#topbar-title"); if(n) n.textContent=t; };
const fmtDate = (iso) => new Date(iso+"T00:00:00").toLocaleDateString("es-CL",{ day:"2-digit", month:"short", year:"numeric" });
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
function mount(html){ const host=$("#main-card"); host.innerHTML=html; host.classList.remove("fade-in"); requestAnimationFrame(()=>host.classList.add("fade-in")); }
function skeleton(lines=3){ return `<div class="skeleton sk-box"></div>${Array.from({length:lines}).map(()=>`<div class="skeleton sk-line"></div>`).join("")}`; }
function getLogoUrl(){ return STATIC_URL + "img/logo.png"; }
function getStudentPhotoUrl(){
  // Si el alumno subió foto en Perfil, úsala. Si no, la de “student.jpg”.
  const saved = localStorage.getItem(PHOTO_KEY);
  return saved || (STATIC_URL + "img/student.jpg");
}

/* 
  ================== PDFs SIN LIBRERÍAS ==================
  exportToPDFWithHeader:
  - Abre una ventana, inyecta HTML con estilos decentes, espera fuentes/imagenes y dispara print().
  - Tiene cabecera con logo, datos del alumno y su foto (la que subió).
  - Tiene marca de agua “INTRANET” para que se note que sale del portal.
  - preHTML: permite meter resúmenes arriba (promedio, totales, etc.) sin ensuciar la tabla principal.
*/
function exportToPDFWithHeader(filename, title, contentHTML, extraMeta = {}){
  const student = extraMeta.student || DATA.perfil;
  const logoUrl = extraMeta.logoUrl || getLogoUrl();
  const photoUrl = extraMeta.photoUrl || getStudentPhotoUrl();
  const preHTML  = extraMeta.preHTML || "";   // bloque opcional antes del contenido
  const watermarkText = extraMeta.watermarkText || "INTRANET";

  const win = window.open("", "_blank", "noopener,noreferrer");

  const styles = `
    <style>
      @page{ size:A4; margin: 14mm; }
      *{ box-sizing: border-box; }
      body{ font-family: Poppins, Arial, sans-serif; color:#111827; }
      .hdr{ display:flex; align-items:center; gap:12px; border-bottom:1px solid #e5e7eb; padding-bottom:10px; margin-bottom:12px; }
      .hdr img.logo{ height:42px; }
      .hdr .school{ font-weight:700; font-size:16px; color:#0f294c; }
      .hdr-right{ margin-left:auto; display:flex; align-items:center; gap:10px; }
      .hdr-right .avatar{ width:44px; height:44px; border-radius:50%; overflow:hidden; border:1px solid #e5e7eb; }
      .badge{ display:inline-block; padding:4px 8px; border:1px solid #cda758; border-radius:8px; color:#0f294c; background:#fff9ea; font-size:11px; font-weight:700; margin-left:6px; }
      h1{ font-size:20px; margin:12px 0; }
      .meta{ color:#6b7280; font-size:12px; margin-bottom:14px; }
      table{ width:100%; border-collapse:collapse; font-size:12px; }
      th,td{ border:1px solid #e5e7eb; padding:8px; text-align:left; }
      th{ background:#f3f4f6; text-transform:uppercase; letter-spacing:.3px; }
      .right{ text-align:right; }
      .summary{ display:flex; flex-wrap:wrap; gap:10px; margin:8px 0 14px 0; }
      .chip{ border:1px solid #e5e7eb; border-radius:8px; padding:6px 10px; background:#fafafa; font-size:12px; }
      footer{ margin-top:18px; font-size:11px; color:#6b7280; }

      /* Marca de agua grande pero humilde, no interfiere con la lectura */
      .wm{
        position: fixed; inset: 0; pointer-events: none; z-index: -1;
        display:flex; align-items:center; justify-content:center;
        opacity: .06; font-size: 120px; font-weight: 900; letter-spacing: 6px;
        color: #0f294c;
      }
    </style>
  `;

  const now = new Date().toLocaleString("es-CL");

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>${styles}</head><body>
    <div class="wm">${watermarkText}</div>

    <div class="hdr">
      <img class="logo" src="${logoUrl}" alt="Logo" />
      <div class="school">Colegio San Agustín de Hipona <span class="badge">INTRANET</span></div>
      <div class="hdr-right">
        <div>
          <div style="font-weight:700">${student?.nombre || "-"}</div>
          <div style="font-size:12px;color:#6b7280">${student?.curso || ""} · RUT: ${student?.rut || ""}</div>
        </div>
        <div class="avatar"><img src="${photoUrl}" alt="Foto alumno" style="width:100%;height:100%;object-fit:cover" /></div>
      </div>
    </div>

    <h1>${title}</h1>
    <div class="meta">Generado: ${now}</div>

    ${preHTML}      <!-- Resúmenes arriba para dar contexto -->
    ${contentHTML}  <!-- Tabla/lista principal de verdad -->

    <footer>Documento informativo generado desde la Intranet del colegio. Para fines oficiales, valide en el portal.</footer>
  </body></html>`;

  win.document.write(html);
  win.document.close();

  // Espera fuentes e imágenes: si no, algunos navegadores imprimen en blanco (clásico bug).
  const waitResources = async () => {
    try { if (win.document.fonts && win.document.fonts.ready) await win.document.fonts.ready; } catch(e){}
    const imgs = Array.from(win.document.images || []);
    await Promise.all(imgs.map(img => img.complete ? Promise.resolve() : new Promise(res => { img.onload = img.onerror = res; })));
  };

  win.onload = async () => {
    await waitResources();
    win.focus();
    win.print();          // El usuario ya elige “Guardar como PDF”
    win.onafterprint = () => win.close();
  };
}

/* 
  Resumen académico rápido para PDFs:
  - Promedio general, mejor ramo y el que más duele.
  - Al apoderado le importa la película grande, no solo la tabla eterna.
*/
async function buildAcademicSummaryHTML(){
  const clases = await api.getClases();
  if(!clases?.length) return "";

  const proms = clases.map(c=>c.promedio).filter(n=>typeof n==="number");
  const promGeneral = proms.length ? (Math.round((proms.reduce((a,b)=>a+b,0)/proms.length)*10)/10).toFixed(1) : "-";

  const sorted = [...clases].filter(c=>typeof c.promedio==="number").sort((a,b)=>b.promedio - a.promedio);
  const top = sorted[0] ? `${sorted[0].nombre} (${sorted[0].promedio})` : "-";
  const bottom = sorted[sorted.length-1] ? `${sorted[sorted.length-1].nombre} (${sorted[sorted.length-1].promedio})` : "-";

  return `
    <div class="summary">
      <div class="chip"><strong>Promedio general:</strong> ${promGeneral}</div>
      <div class="chip"><strong>Mejor ramo:</strong> ${top}</div>
      <div class="chip"><strong>Ramo a reforzar:</strong> ${bottom}</div>
    </div>
  `;
}

/* ================== COMPONENTES UI PEQUEÑOS ================== */
const UI = {
  Progress: (value) => {
    // Barra simple y accesible: aria-attrs y texto visual del % (no confunde).
    const v = clamp(value||0, 0, 100);
    return `<div class="progress" role="progressbar" aria-valuenow="${v}" aria-valuemin="0" aria-valuemax="100" data-percent="${v}">
      <span style="width:${v}%"></span>
    </div>`;
  },
  TagEstado: (estado) => {
    // Estado con color y etiqueta: ojo lo entiende en 1 segundo.
    if (estado==="pending") return `<span class="tag pending">Pendiente</span>`;
    if (estado==="submitted") return `<span class="tag submitted">Entregada</span>`;
    if (estado==="graded") return `<span class="tag graded">Calificada</span>`;
    return `<span class="tag">${estado||"-"}</span>`;
  },
  CardStat: (label, value, accent) => `
    <div class="class-card" ${accent ? `style="background:${accent};color:#fff"` : ""}>
      <div class="subtle" style="${accent?'color:#f3f4f6':''}">${label}</div>
      <div style="font-size:1.9rem;font-weight:700">${value}</div>
    </div>
  `,
  Modal: {
    // Un modal que hace lo que tiene que hacer. Ni más, ni menos.
    show(title, html){
      $("#modal-title").textContent = title || "";
      $("#modal-body").innerHTML = html || "";
      $("#modal").classList.add("show");
      $("#modal").setAttribute("aria-hidden","false");
    },
    hide(){
      $("#modal").classList.remove("show");
      $("#modal").setAttribute("aria-hidden","true");
    }
  }
};

/* ================== TEMA (CLARO/OSCURO) ==================
   - Cambiamos clase en <html> y CSS hace el resto.
   - .theme-animating activa la transición (no mareamos a nadie).
*/
function applyTheme(mode){
  document.documentElement.classList.add("theme-animating");
  document.documentElement.classList.remove("theme-dark");

  // “auto” respeta el sistema del usuario
  if (mode === "dark") document.documentElement.classList.add("theme-dark");
  if (mode === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches){
    document.documentElement.classList.add("theme-dark");
  }

  localStorage.setItem("theme", mode);
  STATE.theme = mode;

  // Quitar flag para no estar animando todo el tiempo
  setTimeout(()=>document.documentElement.classList.remove("theme-animating"), 320);
}

function toggleTheme(){
  // Sencillo y efectivo: auto → light → dark → auto…
  const next = STATE.theme === "light" ? "dark" : STATE.theme === "dark" ? "auto" : "light";
  applyTheme(next);
}

/* ================== SECCIONES ================== */
/* DASHBOARD: lo mínimo que aporta valor real: promedio, #ramo, eventos próximos. */
async function renderDashboard(){
  setTitle("Dashboard");
  mount(`
    <h2 class="section-title">Dashboard</h2>
    <div class="grid" id="db-cards">${skeleton(2)}</div>
    <div class="card" style="margin-top:1rem">
      <h3 class="section-title" style="margin-bottom:.5rem">Eventos próximos</h3>
      <div id="db-events">${skeleton(3)}</div>
    </div>
  `);

  const [clases, eventos] = await Promise.all([api.getClases(), api.getEventos()]);
  const proms = clases.map(c=>c.promedio).filter(Number.isFinite);
  const promGeneral = proms.length ? (Math.round((proms.reduce((a,b)=>a+b,0)/proms.length)*10)/10).toFixed(1) : "-";

  $("#db-cards").innerHTML = `
  ${UI.CardStat("Promedio general", promGeneral, "linear-gradient(90deg,#0f294c,#cda758)")}
  ${UI.CardStat("Asignaturas", clases.length, "linear-gradient(90deg,#0f294c,#cda758)")}
  ${UI.CardStat("Próximos eventos", eventos.length, "linear-gradient(90deg,#0f294c,#cda758)")}
`;


  $("#db-events").innerHTML = eventos.map(e=>{
    const d = new Date(e.date+"T00:00:00");
    const dia = String(d.getDate()).padStart(2,"0");
    const mes = d.toLocaleString("es-CL",{month:"short"});
    return `<div class="row">
      <div class="class-icon" style="width:46px;height:46px">
        <div style="font-weight:700">${dia}</div>
        <div style="font-size:.75rem;color:#666">${mes}</div>
      </div>
      <div>
        <div><strong>${e.title}</strong> · <span class="subtle">${e.asignatura}</span></div>
        <div class="subtle">${fmtDate(e.date)}</div>
      </div>
    </div>`;
  }).join("") || `<div class="subtle">No hay eventos próximos.</div>`;
}

/* MIS CLASES: tarjetas con “Ver detalles” que abre subtabs útiles (material, asistencia, notas). */
async function renderMisClases(){
  setTitle("Mis Clases");
  mount(`
    <h2 class="section-title">Mis Clases</h2>
    <p class="subtle">Resumen de tus asignaturas del año.</p>
    <section class="grid" id="clases-grid">${skeleton(4)}</section>
  `);

  const clases = await api.getClases();
  $("#clases-grid").innerHTML = clases.map(c=>`
    <article class="class-card">
      <div class="class-head">
        <div class="class-icon">📘</div>
        <div>
          <h4 class="class-name">${c.nombre}</h4>
          <p class="class-teacher">Prof. ${c.profesor}</p>
        </div>
      </div>
      <div class="subtle">Promedio: <strong>${c.promedio ?? "-"}</strong></div>
      ${UI.Progress(c.progreso)}
      <div class="row" style="justify-content:flex-end;margin-top:.6rem">
        <button class="btn btn-secondary" data-action="clase-detalle" data-id="${c.id}">Ver detalles</button>
      </div>
    </article>
  `).join("");

  // Delegamos el click: no pegamos listeners a 20 botones. Rendimiento y limpieza.
  document.addEventListener("click", onClaseDetalle, { once:true });
  function onClaseDetalle(e){
    const btn = e.target.closest("[data-action='clase-detalle']");
    if(!btn) { document.addEventListener("click", onClaseDetalle, { once:true }); return; }
    e.preventDefault(); renderClaseDetalle(btn.dataset.id);
  }
}

async function renderClaseDetalle(id){
  const clase = (await api.getClases()).find(c=>c.id===id);
  if(!clase) return renderMisClases();

  mount(`
    <div class="row" style="justify-content:space-between;margin-bottom:.5rem">
      <div class="row">
        <button class="btn btn-secondary" id="back-classes"><i class="fa-solid fa-arrow-left"></i> Volver</button>
        <h2 class="section-title" style="margin:0">${clase.nombre}</h2>
      </div>
    </div>

    <div class="grid">
      <div class="class-card">
        <div class="class-head">
          <div class="class-icon">📘</div>
          <div>
            <h4 class="class-name" style="margin:0">${clase.nombre}</h4>
            <p class="class-teacher">Prof. ${clase.profesor}</p>
          </div>
        </div>
        <p class="subtle">Promedio actual: <strong>${clase.promedio ?? "-"}</strong></p>
        ${UI.Progress(clase.progreso)}
      </div>

      <div class="class-card">
        <div class="row" role="tablist" aria-label="Subsecciones">
          <button class="btn btn-secondary" data-tab="material">Material</button>
          <button class="btn btn-secondary" data-tab="asistencia">Asistencia</button>
          <button class="btn btn-secondary" data-tab="notas">Notas</button>
        </div>
        <div id="tab-body" style="margin-top:.8rem">${skeleton(2)}</div>
      </div>
    </div>
  `);

  // Los tabs muestran lo que el alumno realmente consulta. Nada de florituras.
  const body = $("#tab-body");
  const renderTab = (t) => {
    if(t==="asistencia"){
      body.innerHTML = `
        <table class="table">
          <thead><tr><th>Mes</th><th>Asistencia</th></tr></thead>
          <tbody><tr><td>Ago</td><td>96%</td></tr><tr><td>Sep</td><td>94%</td></tr></tbody>
        </table>
      `;
    } else if(t==="notas"){
      body.innerHTML = `
        <table class="table">
          <thead><tr><th>Evaluación</th><th>Fecha</th><th>Nota</th></tr></thead>
          <tbody><tr><td>Prueba 1</td><td>05/Sep</td><td><span class="grade">6.2</span></td></tr>
                 <tr><td>Tarea</td><td>18/Sep</td><td><span class="grade">6.0</span></td></tr></tbody>
        </table>
      `;
    } else {
      body.innerHTML = `
        <ul>
          <li>Programa de la asignatura (PDF)</li>
          <li>Guía 1: Funciones</li>
        </ul>
      `;
    }
  };
  renderTab("material");

  $("#back-classes").addEventListener("click", (e)=>{e.preventDefault();renderMisClases();});
  $$("[data-tab]").forEach(b=>b.addEventListener("click",()=>renderTab(b.dataset.tab)));
}

/* TAREAS/NOTAS: filtros persistentes y PDF con resumen. Lo justo y necesario. */
async function renderTareas(){
  setTitle("Tareas y Notas");
  const saved = { asig: STATE.filters.asig || "", estado: STATE.filters.estado || "", orden: STATE.filters.orden || "fecha_desc" };
  mount(`
    <h2 class="section-title">Tareas y Notas</h2>

    <div class="row" style="flex-wrap:wrap;gap:.6rem;margin:.3rem 0 1rem 0">
      <label class="subtle">Asignatura</label>
      <select id="flt-asig" class="input" style="max-width:220px"></select>

      <div class="row" role="group" aria-label="Estado">
        <button class="btn btn-secondary" data-est=""          ${saved.estado===""?'aria-pressed="true"':''}>Todas</button>
        <button class="btn btn-secondary" data-est="pending"   ${saved.estado==="pending"?'aria-pressed="true"':''}>Pendientes</button>
        <button class="btn btn-secondary" data-est="submitted" ${saved.estado==="submitted"?'aria-pressed="true"':''}>Entregadas</button>
        <button class="btn btn-secondary" data-est="graded"    ${saved.estado==="graded"?'aria-pressed="true"':''}>Calificadas</button>
      </div>

      <div class="row" style="margin-left:auto">
        <label class="subtle">Orden</label>
        <select id="flt-orden" class="input" style="max-width:180px">
          <option value="fecha_desc">Fecha ↓</option>
          <option value="fecha_asc">Fecha ↑</option>
          <option value="nota_desc">Nota ↓</option>
          <option value="nota_asc">Nota ↑</option>
        </select>
        <button class="btn btn-secondary" id="btn-pdf-tareas" title="Descargar PDF"><i class="fa-solid fa-file-arrow-down"></i> Descargar PDF</button>
      </div>
    </div>

    <div class="card" style="padding:0" id="tareas-card">
      <div style="padding:1rem">${skeleton(4)}</div>
    </div>
  `);

  const tareas = await api.getTareas();

  // Poblar combos una sola vez y a otra cosa
  const asigs = Array.from(new Set(tareas.map(t=>t.asignatura)));
  $("#flt-asig").innerHTML = `<option value="">Todas</option>${asigs.map(a=>`<option>${a}</option>`).join("")}`;
  $("#flt-asig").value = saved.asig;
  $("#flt-orden").value = saved.orden;

  let estado = saved.estado;

  const paint = () => {
    // Filtros encadenados y orden flexible. Lo normal y lo que el alumno entiende.
    let rows = tareas.filter(t => (saved.asig ? t.asignatura===saved.asig : true))
                     .filter(t => (estado ? t.estado===estado : true));

    const byDate = (a,b)=> new Date(a.fecha)-new Date(b.fecha);
    const byNota = (a,b)=> (a.nota??-99) - (b.nota??-99);
    if(saved.orden==="fecha_desc") rows = [...rows].sort((a,b)=> byDate(b,a));
    if(saved.orden==="fecha_asc")  rows = [...rows].sort(byDate);
    if(saved.orden==="nota_desc")  rows = [...rows].sort((a,b)=> byNota(b,a));
    if(saved.orden==="nota_asc")   rows = [...rows].sort(byNota);

    $("#tareas-card").innerHTML = `
      <table class="table" id="tabla-tareas">
        <thead><tr><th>Asignatura</th><th>Título</th><th>Entrega</th><th>Estado</th><th>Nota</th></tr></thead>
        <tbody>
          ${rows.map(t=>`
            <tr>
              <td>${t.asignatura}</td>
              <td>${t.titulo}</td>
              <td>${fmtDate(t.fecha)}</td>
              <td>${UI.TagEstado(t.estado)}</td>
              <td>${t.nota!=null?`<span class="grade">${t.nota}</span>`:"-"}</td>
            </tr>
          `).join("") || `<tr><td colspan="5" class="subtle">Sin resultados.</td></tr>`}
        </tbody>
      </table>
    `;
  };

  // Persistimos filtros en localStorage: el alumno vuelve y todo queda igual.
  $("#flt-asig").addEventListener("change", e=>{ saved.asig = e.target.value; persist(); paint(); });
  $("#flt-orden").addEventListener("change", e=>{ saved.orden = e.target.value; persist(); paint(); });
  $$("[data-est]").forEach(b=>{
    b.addEventListener("click", ()=>{
      estado = b.dataset.est || "";
      $$("[data-est]").forEach(x=>x.removeAttribute("aria-pressed"));
      b.setAttribute("aria-pressed","true");
      saved.estado = estado; persist(); paint();
    });
  });
  const persist = ()=> localStorage.setItem("student_filters", JSON.stringify(saved));
  paint();

  // PDF: metemos arriba un resumen académico + resumen de tareas, y debajo la tabla.
  $("#btn-pdf-tareas").addEventListener("click", async ()=>{
    const perfil = await api.getPerfil();

    const total = DATA.tareas.length;
    const pendientes  = DATA.tareas.filter(t=>t.estado==="pending").length;
    const entregadas  = DATA.tareas.filter(t=>t.estado==="submitted").length;
    const calificadas = DATA.tareas.filter(t=>t.estado==="graded").length;

    const tareasSummary = `
      <div class="summary">
        <div class="chip">Total tareas: ${total}</div>
        <div class="chip">Pendientes: ${pendientes}</div>
        <div class="chip">Entregadas: ${entregadas}</div>
        <div class="chip">Calificadas: ${calificadas}</div>
      </div>
    `;

    const academicSummary = await buildAcademicSummaryHTML();
    const preHTML = `${academicSummary}${tareasSummary}`;
    const tableHTML = $("#tareas-card").innerHTML;

    exportToPDFWithHeader(
      "tareas.pdf",
      "Informe de Tareas y Notas",
      tableHTML,
      {
        preHTML,
        student: perfil,
        logoUrl: getLogoUrl(),
        photoUrl: getStudentPhotoUrl(),
        watermarkText: "INTRANET"
      }
    );
  });
}

/* CALENDARIO: intentamos FullCalendar; si no carga, caemos a una tabla.
   El alumno siempre ve algo, no hay pantallas en blanco, fin del cuento. */
async function ensureCalendarLib(){
  if (window.FullCalendar && window.FullCalendar.Calendar) return true;
  await new Promise((resolve,reject)=>{
    const s=document.createElement("script");
    s.src="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.13/index.global.min.js";
    s.onload=resolve; s.onerror=reject;
    document.head.appendChild(s);
  }).catch(()=>false);
  return !!(window.FullCalendar && window.FullCalendar.Calendar);
}

async function renderCalendario(){
  setTitle("Calendario");
  mount(`
    <h2 class="section-title">Calendario</h2>
    <div class="row" style="gap:.5rem;margin-bottom:.6rem">
      <label class="subtle">Filtrar:</label>
      <select id="flt-cal" class="input" style="max-width:220px"><option value="">Todas las asignaturas</option></select>
    </div>
    <div id="calendar" class="card">${skeleton(4)}</div>
  `);

  const eventos = await api.getEventos();
  const asigs = Array.from(new Set(eventos.map(e=>e.asignatura)));
  $("#flt-cal").innerHTML += asigs.map(a=>`<option>${a}</option>`).join("");

  const loaded = await ensureCalendarLib();
  if(!loaded){
    // Plan B digno y suficiente
    $("#calendar").innerHTML = `
      <div class="card subtle" style="margin-bottom:1rem">No se pudo cargar el calendario interactivo. Mostrando una lista simple.</div>
      <table class="table">
        <thead><tr><th>Fecha</th><th>Evento</th><th>Asignatura</th><th>Tipo</th></tr></thead>
        <tbody id="cal-tbody"></tbody>
      </table>
    `;
    const paintFallback = () => {
      const v = $("#flt-cal").value;
      const rows = eventos.filter(e=> v? e.asignatura===v : true )
        .map(e=>`<tr><td>${fmtDate(e.date)}</td><td>${e.title}</td><td>${e.asignatura}</td><td>${e.type}</td></tr>`)
        .join("") || `<tr><td colspan="4" class="subtle">Sin eventos.</td></tr>`;
      $("#cal-tbody").innerHTML = rows;
    };
    $("#flt-cal").addEventListener("change", paintFallback);
    paintFallback();
    return;
  }

  // FullCalendar estilado por nuestras variables (no hace falta tema extra)
  const el = $("#calendar");
  el.innerHTML = "";
  const cal = new FullCalendar.Calendar(el, {
    initialView: "dayGridMonth",
    locale: "es",
    height: 520,
    headerToolbar: { left:"prev,next today", center:"title", right:"dayGridMonth,timeGridWeek,listWeek" },
    events: eventos.map(e=>({
      id: e.id, title: `${e.title} · ${e.asignatura}`, start: e.date,
      className: e.type==="examen" ? "event-examen" : "event-tarea"
    }))
  });
  cal.on("eventClick", (info)=>{
    const e = eventos.find(x=> String(x.id)===String(info.event.id));
    if(!e) return;
    UI.Modal.show("Detalle de evento", `
      <div><strong>${e.title}</strong></div>
      <div class="subtle">${fmtDate(e.date)} · ${e.asignatura}</div>
      <div class="subtle">Tipo: ${e.type}</div>
    `);
  });
  cal.render();

  $("#flt-cal").addEventListener("change", ()=>{
    const v = $("#flt-cal").value;
    cal.getEvents().forEach(ev=>{
      const show = !v || (ev.title || "").includes(v);
      ev.setProp("display", show ? "auto" : "none");
    });
  });
}

/* PERFIL: cambiar foto y que de verdad se vea en toda la app y en los PDFs. */
async function renderPerfil(){
  setTitle("Perfil");
  const perf = await api.getPerfil();
  const currentPhoto = getStudentPhotoUrl();

  mount(`
    <h2 class="section-title">Perfil</h2>
    <div class="grid">
      <div class="class-card">
        <div class="class-head">
          <div class="avatar" style="width:56px;height:56px">
            <img class="avatar-photo" src="${currentPhoto}" alt="" onerror="this.style.display='none'">
            <span class="avatar-initials">FH</span>
          </div>
          <div>
            <div class="class-name" style="margin:0">${perf.nombre}</div>
            <div class="subtle">${perf.curso}</div>
          </div>
        </div>

        <div class="subtle" style="margin-top:.6rem">
          <div><strong>Correo:</strong> ${perf.correo}</div>
          <div><strong>RUT:</strong> ${perf.rut}</div>
          <div><strong>Teléfono:</strong> ${perf.telefono}</div>
        </div>
      </div>

      <div class="class-card">
        <h4 class="class-name" style="margin:0 0 .6rem 0">Foto (vista previa)</h4>
        <div class="row">
          <input type="file" id="input-foto" accept="image/*" class="input" />
          <button class="btn btn-secondary" id="btn-clear-foto">Quitar</button>
        </div>
        <div id="preview" style="margin-top:.8rem">
          <img src="${currentPhoto}" alt="Foto actual" style="max-width:160px;border-radius:12px;border:1px solid var(--border)" onerror="this.style.display='none'"/>
        </div>
        <p class="help">Se guarda localmente en tu navegador (no se sube al servidor).</p>
      </div>
    </div>
  `);

  // Pintar la foto en todos los lados donde haya avatar (sidebar, etc.)
  applyStudentPhotoToDOM();

  $("#input-foto").addEventListener("change", (e)=>{
    const file = e.target.files?.[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target.result;
      try {
        localStorage.setItem(PHOTO_KEY, dataUrl);
      } catch (err) {
        alert("No se pudo guardar la foto (límite de almacenamiento del navegador).");
      }
      $("#preview").innerHTML = `<img src="${dataUrl}" style="max-width:160px;border-radius:12px;border:1px solid var(--border)" alt="Preview" />`;
      applyStudentPhotoToDOM();
    };
    reader.readAsDataURL(file);
  });

  $("#btn-clear-foto").addEventListener("click", ()=>{
    localStorage.removeItem(PHOTO_KEY);
    $("#preview").innerHTML = `<div class="subtle">Sin foto.</div>`;
    applyStudentPhotoToDOM();
  });
}

function applyStudentPhotoToDOM(){
  // Recorremos todos los .avatar-photo y les seteamos la última foto del alumno
  const url = getStudentPhotoUrl();
  $$(".avatar-photo").forEach(img=>{
    img.src = url;
    img.style.display = "block";
  });
}

/* PAGOS: “bloqueo parental” directo y claro (demo).
   - Contraseña dura (como pediste) para prototipo: HIPONA-APO-2025
   - “Recuérdame 30 min” guardado en sessionStorage. */
const PARENT_PASS = "HIPONA-APO-2025";

function isPagosUnlocked(){ return Date.now() < STATE.pagosUnlockUntil; }

function renderPagos(){
  setTitle("Pagos");
  if(isPagosUnlocked()) return renderPagosContent();

  mount(`
    <h2 class="section-title">Pagos</h2>
    <div class="card" style="max-width:520px;margin:auto">
      <p class="subtle" style="margin-top:0">Un adulto responsable debe ingresar la <strong>Contraseña de Apoderado</strong> para acceder.</p>

      <div class="field">
        <label class="label" for="parent-pass">Contraseña</label>
        <div class="input-row">
          <input id="parent-pass" type="password" class="input" autocomplete="off" placeholder="Ingresa la contraseña" />
          <button class="btn btn-secondary" id="toggle-pass" aria-label="Mostrar/ocultar">👁</button>
        </div>
        <div class="row" style="justify-content:space-between">
          <label class="subtle"><input id="remember30" type="checkbox" /> Recordar por 30 minutos</label>
          <button class="btn" id="parent-enter">Ingresar</button>
        </div>
        <div id="parent-err" class="tag" style="display:none;background:#fee2e2;color:#7f1d1d;border:1px solid #fecaca">Contraseña incorrecta.</div>
      </div>
    </div>
  `);

  const input = $("#parent-pass");
  $("#toggle-pass").addEventListener("click",(e)=>{e.preventDefault(); input.type = (input.type==="password")?"text":"password";});
  $("#parent-enter").addEventListener("click", tryLogin);
  input.addEventListener("keydown",(e)=>{ if(e.key==="Enter") tryLogin(); });

  function tryLogin(){
    const ok = (input.value || "").trim() === PARENT_PASS;
    if(!ok){ $("#parent-err").style.display="inline-block"; input.focus(); input.select(); return; }
    $("#parent-err").style.display="none";
    if($("#remember30").checked){
      // Guardamos hasta cuándo dura el “pase libre”
      const until = Date.now() + (30*60*1000);
      sessionStorage.setItem("pagos_until", String(until));
      STATE.pagosUnlockUntil = until;
    }
    renderPagosContent();
  }
}

function renderPagosContent(){
  // Contenido simple: totales y tabla. No nos vamos a un ERP aquí.
  mount(`
    <div class="row" style="justify-content:space-between;flex-wrap:wrap">
      <h2 class="section-title" style="margin:0">Pagos</h2>
      <div class="row">
        <button class="btn btn-secondary" id="btn-pdf-pagos" title="Descargar PDF"><i class="fa-solid fa-file-arrow-down"></i> Descargar PDF</button>
        <button class="btn btn-secondary" id="logout-pagos">Cerrar sesión de apoderado</button>
      </div>
    </div>

    <div class="grid">
      ${UI.CardStat("Total Pagado", "$230.000")}
      ${UI.CardStat("Total Pendiente", "$0")}
    </div>

    <div class="card" style="margin-top:1rem;padding:0" id="pagos-card">
      <table class="table">
        <thead><tr><th>Fecha</th><th>Monto</th><th>Estado</th></tr></thead>
        <tbody><tr><td>10/03/2025</td><td>$230.000</td><td><span class="tag graded">Pagado</span></td></tr></tbody>
      </table>
    </div>
  `);

  $("#logout-pagos").addEventListener("click", ()=>{
    sessionStorage.removeItem("pagos_until");
    STATE.pagosUnlockUntil = 0;
    renderPagos();
  });

  // PDF de pagos: mete arriba resumen académico (útil para conversar con apoderado)
  $("#btn-pdf-pagos").addEventListener("click", async ()=>{
    const perfil = await api.getPerfil();

    const academicSummary = await buildAcademicSummaryHTML();
    const totalPagado = 230000;
    const totalPendiente = 0;
    const pagosSummary = `
      <div class="summary">
        <div class="chip"><strong>Total pagado:</strong> $${totalPagado.toLocaleString("es-CL")}</div>
        <div class="chip"><strong>Total pendiente:</strong> $${totalPendiente.toLocaleString("es-CL")}</div>
      </div>
    `;

    const preHTML = `${academicSummary}${pagosSummary}`;
    const tableHTML = $("#pagos-card").outerHTML;

    exportToPDFWithHeader(
      "pagos.pdf",
      "Informe de Pagos",
      tableHTML,
      {
        preHTML,
        student: perfil,
        logoUrl: getLogoUrl(),
        photoUrl: getStudentPhotoUrl(),
        watermarkText: "INTRANET"
      }
    );
  });
}

/* ================== ROUTER ==================
   Router minimalista pero suficiente:
   lee data-section y pinta la vista. PUNTO.
*/
function render(section){
  STATE.section = section;
  const titles = {
    "dashboard":"Dashboard","mis-clases":"Mis Clases","tareas":"Tareas y Notas",
    "calendario":"Calendario","perfil":"Perfil","pagos":"Pagos"
  };
  setTitle(titles[section] || "Dashboard");
  $$(".menu a").forEach(a=>{
    const active = a.dataset.section===section;
    a.classList.toggle("active", active);
    if(active) a.setAttribute("aria-current","page"); else a.removeAttribute("aria-current");
  });

  if(section==="dashboard")   return renderDashboard();
  if(section==="mis-clases")  return renderMisClases();
  if(section==="tareas")      return renderTareas();
  if(section==="calendario")  return renderCalendario();
  if(section==="perfil")      return renderPerfil();
  if(section==="pagos")       return renderPagos();
  return renderDashboard();
}

/* ================== ARRANQUE ==================
   Disparamos el tema, enganchamos eventos de navegación y modal,
   pintamos avatar si ya hay foto guardada, y caemos al Dashboard.
*/
document.addEventListener("DOMContentLoaded", ()=>{
  // Tema inicial + escucha del sistema (si está en “auto” y el usuario cambia)
  applyTheme(STATE.theme);
  $("#btn-theme").addEventListener("click", toggleTheme);
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", ()=>{ if(STATE.theme==="auto") applyTheme("auto"); });

  // Navegación de la izquierda / arriba (mobile)
  $$(".menu a").forEach(a=>a.addEventListener("click",(e)=>{e.preventDefault();render(a.dataset.section);} ));

  // Modal genérico
  $("#modal-close").addEventListener("click", UI.Modal.hide);
  $("#modal-ok").addEventListener("click", UI.Modal.hide);
  $("#modal .modal-backdrop").addEventListener("click", UI.Modal.hide);

  // Si el alumno cambió la foto en otra sesión, se pinta ahora.
  applyStudentPhotoToDOM();

  // Primera vista
  render("dashboard");
});

// /* 
//   ================== CONFIG/ESTADO ==================
//   Dejamos todo listo para conectar con backend sin romper la UI.
// */
// const STATIC_URL  = (typeof window !== "undefined" && window.STATIC_URL) ? window.STATIC_URL : "/static/";
// const PHOTO_KEY   = "student_photo_dataurl";   // Foto local (DataURL) hasta que exista endpoint real de subida.
// const PROFILE_KEY = "student_profile_cache";   // Cache de perfil (se llena con GET /api/student/profile/)

// const STATE = {
//   section: "dashboard",
//   filters: JSON.parse(localStorage.getItem("student_filters")||"{}"),
//   pagosUnlockUntil: Number(sessionStorage.getItem("pagos_until")||0),
//   theme: localStorage.getItem("theme") || "auto",  // auto | light | dark
//   cache: {
//     clases: null,
//     tareas: null,
//     eventos: null,
//     perfil: null,
//   }
// };

// /* 
//   ================== HELPERS BACKEND ==================
//   - CSRF de Django desde cookie
//   - fetchJson con manejo de errores y timeouts
//   - querystring builder
// */
// function getCookie(name){
//   const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
//   return match ? decodeURIComponent(match[2]) : null;
// }
// const CSRF_TOKEN = getCookie("csrftoken");

// function withTimeout(promise, ms=10000){
//   return new Promise((resolve, reject)=>{
//     const t = setTimeout(()=>reject(new Error("timeout")), ms);
//     promise.then(v=>{ clearTimeout(t); resolve(v); })
//            .catch(e=>{ clearTimeout(t); reject(e); });
//   });
// }

// async function fetchJson(url, { method="GET", body, headers={}, csrf=true }={}){
//   const opts = {
//     method,
//     headers: {
//       "Accept": "application/json",
//       ...headers
//     },
//     credentials: "same-origin"
//   };
//   if (body !== undefined){
//     if (body instanceof FormData){
//       // Dejamos que el browser ponga el boundary de multipart
//       opts.body = body;
//     } else {
//       opts.headers["Content-Type"] = "application/json";
//       opts.body = JSON.stringify(body);
//     }
//   }
//   if (csrf && CSRF_TOKEN) opts.headers["X-CSRFToken"] = CSRF_TOKEN;

//   const resp = await withTimeout(fetch(url, opts));
//   if (!resp.ok){
//     let msg = `HTTP ${resp.status}`;
//     try {
//       const j = await resp.json();
//       if (j && j.detail) msg = j.detail;
//     } catch {}
//     throw new Error(msg);
//   }
//   // Algunos endpoints pueden devolver 204 No Content
//   if (resp.status === 204) return null;
//   return resp.json();
// }

// function qs(params){
//   const q = new URLSearchParams();
//   Object.entries(params || {}).forEach(([k,v])=>{
//     if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
//   });
//   const s = q.toString();
//   return s ? `?${s}` : "";
// }

// /* 
//   ================== API REAL ==================
//   Ajusta las URLs a tus rutas en Django (urls.py).
//   Estructura de respuesta esperada (ejemplos):
//   - /api/student/profile/ -> { nombre, curso, rut, correo, telefono }
//   - /api/student/classes/ -> [ { id, nombre, profesor, progreso, promedio }, ... ]
//   - /api/student/tasks/   -> [ { id, asignatura, titulo, fecha, estado, nota }, ... ]
//   - /api/student/events/  -> [ { id, title, date, type, asignatura }, ... ]
// */
// const api = {
//   async getPerfil(force=false){
//     if (!force && STATE.cache.perfil) return STATE.cache.perfil;
//     const data = await fetchJson("/api/student/profile/");
//     STATE.cache.perfil = data;
//     // cache local opcional
//     try { localStorage.setItem(PROFILE_KEY, JSON.stringify(data)); } catch {}
//     return data;
//   },
//   async getClases(force=false){
//     if (!force && STATE.cache.clases) return STATE.cache.clases;
//     const data = await fetchJson("/api/student/classes/");
//     STATE.cache.clases = data;
//     return data;
//   },
//   async getTareas(filters={}, force=false){
//     // filters: { subject, status, ordering }
//     // ordering: "fecha_desc" | "fecha_asc" | "nota_desc" | "nota_asc"
//     if (!force && STATE.cache.tareas && !Object.keys(filters||{}).length) return STATE.cache.tareas;
//     const mapOrdering = {
//       "fecha_desc": "-fecha",
//       "fecha_asc": "fecha",
//       "nota_desc": "-nota",
//       "nota_asc": "nota"
//     };
//     const url = "/api/student/tasks/" + qs({
//       subject:  filters.asig || undefined,
//       status:   filters.estado || undefined,
//       ordering: mapOrdering[filters.orden || "fecha_desc"]
//     });
//     const data = await fetchJson(url);
//     // Si pediste con filtros, no cacheamos global (para no pisar la lista completa)
//     if (!Object.keys(filters||{}).length) STATE.cache.tareas = data;
//     return data;
//   },
//   async getEventos(force=false){
//     if (!force && STATE.cache.eventos) return STATE.cache.eventos;
//     const data = await fetchJson("/api/student/events/");
//     STATE.cache.eventos = data;
//     return data;
//   },
//   // Si luego agregas endpoint para foto de perfil:
//   // async uploadPhoto(file){
//   //   const fd = new FormData(); fd.append("photo", file);
//   //   return fetchJson("/api/student/photo/", { method:"POST", body:fd });
//   // }
// };

// /* ================== UTILIDADES SUELTAS ================== */
// const $  = (s, r=document) => r.querySelector(s);
// const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
// const setTitle = t => { const n=$("#topbar-title"); if(n) n.textContent=t; };
// const fmtDate = (iso) => new Date(iso+"T00:00:00").toLocaleDateString("es-CL",{ day:"2-digit", month:"short", year:"numeric" });
// const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
// function mount(html){ const host=$("#main-card"); host.innerHTML=html; host.classList.remove("fade-in"); requestAnimationFrame(()=>host.classList.add("fade-in")); }
// function skeleton(lines=3){ return `<div class="skeleton sk-box"></div>${Array.from({length:lines}).map(()=>`<div class="skeleton sk-line"></div>`).join("")}`; }
// function getLogoUrl(){ return STATIC_URL + "img/logo.png"; }
// function getStudentPhotoUrl(){
//   // 1) Si hay DataURL local, úsala
//   const saved = localStorage.getItem(PHOTO_KEY);
//   if (saved) return saved;
//   // 2) Si el backend retorna URL de foto en perfil (avatar_url), úsala
//   const p = STATE.cache.perfil || JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
//   if (p && p.avatar_url) return p.avatar_url;
//   // 3) Fallback
//   return STATIC_URL + "img/student.jpg";
// }

// /* ================== PDFs SIN LIBRERÍAS ================== */
// function exportToPDFWithHeader(filename, title, contentHTML, extraMeta = {}){
//   const student = extraMeta.student;
//   const logoUrl = extraMeta.logoUrl || getLogoUrl();
//   const photoUrl = extraMeta.photoUrl || getStudentPhotoUrl();
//   const preHTML  = extraMeta.preHTML || "";
//   const watermarkText = extraMeta.watermarkText || "INTRANET";

//   const win = window.open("", "_blank", "noopener,noreferrer");
//   const styles = `
//     <style>
//       @page{ size:A4; margin: 14mm; }
//       *{ box-sizing: border-box; }
//       body{ font-family: Poppins, Arial, sans-serif; color:#111827; }
//       .hdr{ display:flex; align-items:center; gap:12px; border-bottom:1px solid #e5e7eb; padding-bottom:10px; margin-bottom:12px; }
//       .hdr img.logo{ height:42px; }
//       .hdr .school{ font-weight:700; font-size:16px; color:#0f294c; }
//       .hdr-right{ margin-left:auto; display:flex; align-items:center; gap:10px; }
//       .hdr-right .avatar{ width:44px; height:44px; border-radius:50%; overflow:hidden; border:1px solid #e5e7eb; }
//       .badge{ display:inline-block; padding:4px 8px; border:1px solid #cda758; border-radius:8px; color:#0f294c; background:#fff9ea; font-size:11px; font-weight:700; margin-left:6px; }
//       h1{ font-size:20px; margin:12px 0; }
//       .meta{ color:#6b7280; font-size:12px; margin-bottom:14px; }
//       table{ width:100%; border-collapse:collapse; font-size:12px; }
//       th,td{ border:1px solid #e5e7eb; padding:8px; text-align:left; }
//       th{ background:#f3f4f6; text-transform:uppercase; letter-spacing:.3px; }
//       .right{ text-align:right; }
//       .summary{ display:flex; flex-wrap:wrap; gap:10px; margin:8px 0 14px 0; }
//       .chip{ border:1px solid #e5e7eb; border-radius:8px; padding:6px 10px; background:#fafafa; font-size:12px; }
//       footer{ margin-top:18px; font-size:11px; color:#6b7280; }
//       .wm{ position: fixed; inset: 0; pointer-events: none; z-index: -1;
//            display:flex; align-items:center; justify-content:center;
//            opacity: .06; font-size: 120px; font-weight: 900; letter-spacing: 6px; color: #0f294c; }
//     </style>
//   `;
//   const now = new Date().toLocaleString("es-CL");
//   const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>${styles}</head><body>
//     <div class="wm">${watermarkText}</div>
//     <div class="hdr">
//       <img class="logo" src="${logoUrl}" alt="Logo" />
//       <div class="school">Colegio San Agustín de Hipona <span class="badge">INTRANET</span></div>
//       <div class="hdr-right">
//         <div>
//           <div style="font-weight:700">${student?.nombre || "-"}</div>
//           <div style="font-size:12px;color:#6b7280">${student?.curso || ""} · RUT: ${student?.rut || ""}</div>
//         </div>
//         <div class="avatar"><img src="${photoUrl}" alt="Foto alumno" style="width:100%;height:100%;object-fit:cover" /></div>
//       </div>
//     </div>
//     <h1>${title}</h1>
//     <div class="meta">Generado: ${now}</div>
//     ${preHTML}
//     ${contentHTML}
//     <footer>Documento informativo generado desde la Intranet del colegio. Para fines oficiales, valide en el portal.</footer>
//   </body></html>`;
//   win.document.write(html);
//   win.document.close();

//   const waitResources = async () => {
//     try { if (win.document.fonts && win.document.fonts.ready) await win.document.fonts.ready; } catch(e){}
//     const imgs = Array.from(win.document.images || []);
//     await Promise.all(imgs.map(img => img.complete ? Promise.resolve() : new Promise(res => { img.onload = img.onerror = res; })));
//   };
//   win.onload = async () => {
//     await waitResources();
//     win.focus();
//     win.print();
//     win.onafterprint = () => win.close();
//   };
// }

// /* Resumen académico desde backend (sin mocks) */
// async function buildAcademicSummaryHTML(){
//   const clases = await api.getClases();
//   if(!clases?.length) return "";
//   const proms = clases.map(c=>c.promedio).filter(n=>typeof n==="number");
//   const promGeneral = proms.length ? (Math.round((proms.reduce((a,b)=>a+b,0)/proms.length)*10)/10).toFixed(1) : "-";
//   const sorted = [...clases].filter(c=>typeof c.promedio==="number").sort((a,b)=>b.promedio - a.promedio);
//   const top = sorted[0] ? `${sorted[0].nombre} (${sorted[0].promedio})` : "-";
//   const bottom = sorted[sorted.length-1] ? `${sorted[sorted.length-1].nombre} (${sorted[sorted.length-1].promedio})` : "-";
//   return `
//     <div class="summary">
//       <div class="chip"><strong>Promedio general:</strong> ${promGeneral}</div>
//       <div class="chip"><strong>Mejor ramo:</strong> ${top}</div>
//       <div class="chip"><strong>Ramo a reforzar:</strong> ${bottom}</div>
//     </div>
//   `;
// }

// /* ================== UI COMPONENTS ================== */
// const UI = {
//   Progress: (value) => {
//     const v = clamp(value||0, 0, 100);
//     return `<div class="progress" role="progressbar" aria-valuenow="${v}" aria-valuemin="0" aria-valuemax="100" data-percent="${v}">
//       <span style="width:${v}%"></span>
//     </div>`;
//   },
//   TagEstado: (estado) => {
//     if (estado==="pending") return `<span class="tag pending">Pendiente</span>`;
//     if (estado==="submitted") return `<span class="tag submitted">Entregada</span>`;
//     if (estado==="graded") return `<span class="tag graded">Calificada</span>`;
//     return `<span class="tag">${estado||"-"}</span>`;
//   },
//   CardStat: (label, value, accent) => `
//     <div class="class-card" ${accent ? `style="background:${accent};color:#fff"` : ""}>
//       <div class="subtle" style="${accent?'color:#f3f4f6':''}">${label}</div>
//       <div style="font-size:1.9rem;font-weight:700">${value}</div>
//     </div>
//   `,
//   Modal: {
//     show(title, html){
//       $("#modal-title").textContent = title || "";
//       $("#modal-body").innerHTML = html || "";
//       $("#modal").classList.add("show");
//       $("#modal").setAttribute("aria-hidden","false");
//     },
//     hide(){
//       $("#modal").classList.remove("show");
//       $("#modal").setAttribute("aria-hidden","true");
//     }
//   }
// };

// /* ================== TEMA ================== */
// function applyTheme(mode){
//   document.documentElement.classList.add("theme-animating");
//   document.documentElement.classList.remove("theme-dark");
//   if (mode === "dark") document.documentElement.classList.add("theme-dark");
//   if (mode === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches){
//     document.documentElement.classList.add("theme-dark");
//   }
//   localStorage.setItem("theme", mode);
//   STATE.theme = mode;
//   setTimeout(()=>document.documentElement.classList.remove("theme-animating"), 320);
// }
// function toggleTheme(){
//   const next = STATE.theme === "light" ? "dark" : STATE.theme === "dark" ? "auto" : "light";
//   applyTheme(next);
// }

// /* ================== SECCIONES ================== */
// async function renderDashboard(){
//   setTitle("Dashboard");
//   mount(`
//     <h2 class="section-title">Dashboard</h2>
//     <div class="grid" id="db-cards">${skeleton(2)}</div>
//     <div class="card" style="margin-top:1rem">
//       <h3 class="section-title" style="margin-bottom:.5rem">Eventos próximos</h3>
//       <div id="db-events">${skeleton(3)}</div>
//     </div>
//   `);

//   // Datos reales del backend
//   const [clases, eventos] = await Promise.all([api.getClases(), api.getEventos()]);
//   const proms = (clases||[]).map(c=>c.promedio).filter(Number.isFinite);
//   const promGeneral = proms.length ? (Math.round((proms.reduce((a,b)=>a+b,0)/proms.length)*10)/10).toFixed(1) : "-";

//   $("#db-cards").innerHTML = `
//     ${UI.CardStat("Promedio general", promGeneral, "linear-gradient(90deg,#0f294c,#cda758)")}
//     ${UI.CardStat("Asignaturas", (clases||[]).length, "linear-gradient(90deg,#0f294c,#cda758)")}
//     ${UI.CardStat("Próximos eventos", (eventos||[]).length, "linear-gradient(90deg,#0f294c,#cda758)")}
//   `;

//   $("#db-events").innerHTML = (eventos||[]).map(e=>{
//     const d = new Date(e.date+"T00:00:00");
//     const dia = String(d.getDate()).padStart(2,"0");
//     const mes = d.toLocaleString("es-CL",{month:"short"});
//     return `<div class="row">
//       <div class="class-icon" style="width:46px;height:46px">
//         <div style="font-weight:700">${dia}</div>
//         <div style="font-size:.75rem;color:#666">${mes}</div>
//       </div>
//       <div>
//         <div><strong>${e.title}</strong> · <span class="subtle">${e.asignatura}</span></div>
//         <div class="subtle">${fmtDate(e.date)}</div>
//       </div>
//     </div>`;
//   }).join("") || `<div class="subtle">No hay eventos próximos.</div>`;
// }

// async function renderMisClases(){
//   setTitle("Mis Clases");
//   mount(`
//     <h2 class="section-title">Mis Clases</h2>
//     <p class="subtle">Resumen de tus asignaturas del año.</p>
//     <section class="grid" id="clases-grid">${skeleton(4)}</section>
//   `);

//   const clases = await api.getClases();
//   $("#clases-grid").innerHTML = (clases||[]).map(c=>`
//     <article class="class-card">
//       <div class="class-head">
//         <div class="class-icon">📘</div>
//         <div>
//           <h4 class="class-name">${c.nombre}</h4>
//           <p class="class-teacher">Prof. ${c.profesor}</p>
//         </div>
//       </div>
//       <div class="subtle">Promedio: <strong>${c.promedio ?? "-"}</strong></div>
//       ${UI.Progress(c.progreso)}
//       <div class="row" style="justify-content:flex-end;margin-top:.6rem">
//         <button class="btn btn-secondary" data-action="clase-detalle" data-id="${c.id}">Ver detalles</button>
//       </div>
//     </article>
//   `).join("");

//   document.addEventListener("click", onClaseDetalle, { once:true });
//   function onClaseDetalle(e){
//     const btn = e.target.closest("[data-action='clase-detalle']");
//     if(!btn) { document.addEventListener("click", onClaseDetalle, { once:true }); return; }
//     e.preventDefault(); renderClaseDetalle(btn.dataset.id);
//   }
// }

// async function renderClaseDetalle(id){
//   const clases = await api.getClases();
//   const clase = (clases||[]).find(c=>String(c.id)===String(id));
//   if(!clase) return renderMisClases();

//   mount(`
//     <div class="row" style="justify-content:space-between;margin-bottom:.5rem">
//       <div class="row">
//         <button class="btn btn-secondary" id="back-classes"><i class="fa-solid fa-arrow-left"></i> Volver</button>
//         <h2 class="section-title" style="margin:0">${clase.nombre}</h2>
//       </div>
//     </div>

//     <div class="grid">
//       <div class="class-card">
//         <div class="class-head">
//           <div class="class-icon">📘</div>
//           <div>
//             <h4 class="class-name" style="margin:0">${clase.nombre}</h4>
//             <p class="class-teacher">Prof. ${clase.profesor}</p>
//           </div>
//         </div>
//         <p class="subtle">Promedio actual: <strong>${clase.promedio ?? "-"}</strong></p>
//         ${UI.Progress(clase.progreso)}
//       </div>

//       <div class="class-card">
//         <div class="row" role="tablist" aria-label="Subsecciones">
//           <button class="btn btn-secondary" data-tab="material">Material</button>
//           <button class="btn btn-secondary" data-tab="asistencia">Asistencia</button>
//           <button class="btn btn-secondary" data-tab="notas">Notas</button>
//         </div>
//         <div id="tab-body" style="margin-top:.8rem">${skeleton(2)}</div>
//       </div>
//     </div>
//   `);

//   const body = $("#tab-body");
//   const renderTab = async (t) => {
//     // Aquí puedes cambiar a endpoints específicos si los tienes por clase: /api/student/classes/:id/material
//     if(t==="asistencia"){
//       // Ejemplo simple; si tienes endpoint, reemplaza con fetch real.
//       body.innerHTML = `
//         <table class="table">
//           <thead><tr><th>Mes</th><th>Asistencia</th></tr></thead>
//           <tbody><tr><td>Ago</td><td>96%</td></tr><tr><td>Sep</td><td>94%</td></tr></tbody>
//         </table>
//       `;
//     } else if(t==="notas"){
//       // Idem: cuando tengas /api/student/classes/:id/grades -> pintas acá
//       body.innerHTML = `
//         <table class="table">
//           <thead><tr><th>Evaluación</th><th>Fecha</th><th>Nota</th></tr></thead>
//           <tbody><tr><td>Prueba 1</td><td>05/Sep</td><td><span class="grade">6.2</span></td></tr>
//                  <tr><td>Tarea</td><td>18/Sep</td><td><span class="grade">6.0</span></td></tr></tbody>
//         </table>
//       `;
//     } else {
//       body.innerHTML = `
//         <ul>
//           <li>Programa de la asignatura (PDF)</li>
//           <li>Guía 1: Funciones</li>
//         </ul>
//       `;
//     }
//   };
//   renderTab("material");

//   $("#back-classes").addEventListener("click", (e)=>{e.preventDefault();renderMisClases();});
//   $$("[data-tab]").forEach(b=>b.addEventListener("click",()=>renderTab(b.dataset.tab)));
// }

// async function renderTareas(){
//   setTitle("Tareas y Notas");
//   const saved = { asig: STATE.filters.asig || "", estado: STATE.filters.estado || "", orden: STATE.filters.orden || "fecha_desc" };
//   mount(`
//     <h2 class="section-title">Tareas y Notas</h2>

//     <div class="row" style="flex-wrap:wrap;gap:.6rem;margin:.3rem 0 1rem 0">
//       <label class="subtle">Asignatura</label>
//       <select id="flt-asig" class="input" style="max-width:220px"></select>

//       <div class="row" role="group" aria-label="Estado">
//         <button class="btn btn-secondary" data-est=""          ${saved.estado===""?'aria-pressed="true"':''}>Todas</button>
//         <button class="btn btn-secondary" data-est="pending"   ${saved.estado==="pending"?'aria-pressed="true"':''}>Pendientes</button>
//         <button class="btn btn-secondary" data-est="submitted" ${saved.estado==="submitted"?'aria-pressed="true"':''}>Entregadas</button>
//         <button class="btn btn-secondary" data-est="graded"    ${saved.estado==="graded"?'aria-pressed="true"':''}>Calificadas</button>
//       </div>

//       <div class="row" style="margin-left:auto">
//         <label class="subtle">Orden</label>
//         <select id="flt-orden" class="input" style="max-width:180px">
//           <option value="fecha_desc">Fecha ↓</option>
//           <option value="fecha_asc">Fecha ↑</option>
//           <option value="nota_desc">Nota ↓</option>
//           <option value="nota_asc">Nota ↑</option>
//         </select>
//         <button class="btn btn-secondary" id="btn-pdf-tareas" title="Descargar PDF"><i class="fa-solid fa-file-arrow-down"></i> Descargar PDF</button>
//       </div>
//     </div>

//     <div class="card" style="padding:0" id="tareas-card">
//       <div style="padding:1rem">${skeleton(4)}</div>
//     </div>
//   `);

//   // Traemos tareas filtradas desde backend
//   const tareas = await api.getTareas(saved);

//   // Asignaturas para el combo (desde tareas reales)
//   const asigs = Array.from(new Set((tareas||[]).map(t=>t.asignatura))).sort();
//   $("#flt-asig").innerHTML = `<option value="">Todas</option>${asigs.map(a=>`<option>${a}</option>`).join("")}`;
//   $("#flt-asig").value = saved.asig;
//   $("#flt-orden").value = saved.orden;

//   const paint = () => {
//     const rows = (tareas||[]).map(t=>`
//       <tr>
//         <td>${t.asignatura}</td>
//         <td>${t.titulo}</td>
//         <td>${fmtDate(t.fecha)}</td>
//         <td>${UI.TagEstado(t.estado)}</td>
//         <td>${t.nota!=null?`<span class="grade">${t.nota}</span>`:"-"}</td>
//       </tr>
//     `).join("") || `<tr><td colspan="5" class="subtle">Sin resultados.</td></tr>`;
//     $("#tareas-card").innerHTML = `
//       <table class="table" id="tabla-tareas">
//         <thead><tr><th>Asignatura</th><th>Título</th><th>Entrega</th><th>Estado</th><th>Nota</th></tr></thead>
//         <tbody>${rows}</tbody>
//       </table>
//     `;
//   };
//   paint();

//   // Listeners que reconsultan al backend con filtros
//   $("#flt-asig").addEventListener("change", async e=>{
//     saved.asig = e.target.value; persist();
//     const data = await api.getTareas(saved, /*force*/true);
//     renderTareasWithData(saved, data); // re-pintamos con nueva data
//   });
//   $("#flt-orden").addEventListener("change", async e=>{
//     saved.orden = e.target.value; persist();
//     const data = await api.getTareas(saved, true);
//     renderTareasWithData(saved, data);
//   });
//   $$("[data-est]").forEach(b=>{
//     b.addEventListener("click", async ()=>{
//       $$("[data-est]").forEach(x=>x.removeAttribute("aria-pressed"));
//       b.setAttribute("aria-pressed","true");
//       saved.estado = b.dataset.est || ""; persist();
//       const data = await api.getTareas(saved, true);
//       renderTareasWithData(saved, data);
//     });
//   });

//   function persist(){ localStorage.setItem("student_filters", JSON.stringify(saved)); }

//   // PDF con datos actuales (no mocks)
//   $("#btn-pdf-tareas").addEventListener("click", async ()=>{
//     const perfil = await api.getPerfil();
//     const all = await api.getTareas({}, true); // totales SIN filtros

//     const total = (all||[]).length;
//     const pendientes  = (all||[]).filter(t=>t.estado==="pending").length;
//     const entregadas  = (all||[]).filter(t=>t.estado==="submitted").length;
//     const calificadas = (all||[]).filter(t=>t.estado==="graded").length;

//     const tareasSummary = `
//       <div class="summary">
//         <div class="chip">Total tareas: ${total}</div>
//         <div class="chip">Pendientes: ${pendientes}</div>
//         <div class="chip">Entregadas: ${entregadas}</div>
//         <div class="chip">Calificadas: ${calificadas}</div>
//       </div>
//     `;

//     const academicSummary = await buildAcademicSummaryHTML();
//     const preHTML = `${academicSummary}${tareasSummary}`;
//     const tableHTML = $("#tareas-card").innerHTML;

//     exportToPDFWithHeader(
//       "tareas.pdf",
//       "Informe de Tareas y Notas",
//       tableHTML,
//       {
//         preHTML,
//         student: perfil,
//         logoUrl: getLogoUrl(),
//         photoUrl: getStudentPhotoUrl(),
//         watermarkText: "INTRANET"
//       }
//     );
//   });
// }

// // helper para re-pintar Tareas con nueva data (sin perder handlers globales)
// function renderTareasWithData(saved, tareas){
//   // Reemplaza únicamente la tabla para no re-armar toda la vista
//   const rows = (tareas||[]).map(t=>`
//     <tr>
//       <td>${t.asignatura}</td>
//       <td>${t.titulo}</td>
//       <td>${fmtDate(t.fecha)}</td>
//       <td>${UI.TagEstado(t.estado)}</td>
//       <td>${t.nota!=null?`<span class="grade">${t.nota}</span>`:"-"}</td>
//     </tr>
//   `).join("") || `<tr><td colspan="5" class="subtle">Sin resultados.</td></tr>`;
//   $("#tareas-card").innerHTML = `
//     <table class="table" id="tabla-tareas">
//       <thead><tr><th>Asignatura</th><th>Título</th><th>Entrega</th><th>Estado</th><th>Nota</th></tr></thead>
//       <tbody>${rows}</tbody>
//     </table>
//   `;
// }

// async function ensureCalendarLib(){
//   if (window.FullCalendar && window.FullCalendar.Calendar) return true;
//   await new Promise((resolve,reject)=>{
//     const s=document.createElement("script");
//     s.src="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.13/index.global.min.js";
//     s.onload=resolve; s.onerror=reject;
//     document.head.appendChild(s);
//   }).catch(()=>false);
//   return !!(window.FullCalendar && window.FullCalendar.Calendar);
// }

// async function renderCalendario(){
//   setTitle("Calendario");
//   mount(`
//     <h2 class="section-title">Calendario</h2>
//     <div class="row" style="gap:.5rem;margin-bottom:.6rem">
//       <label class="subtle">Filtrar:</label>
//       <select id="flt-cal" class="input" style="max-width:220px"><option value="">Todas las asignaturas</option></select>
//     </div>
//     <div id="calendar" class="card">${skeleton(4)}</div>
//   `);

//   const eventos = await api.getEventos();
//   const asigs = Array.from(new Set((eventos||[]).map(e=>e.asignatura))).sort();
//   $("#flt-cal").innerHTML += asigs.map(a=>`<option>${a}</option>`).join("");

//   const loaded = await ensureCalendarLib();
//   if(!loaded){
//     $("#calendar").innerHTML = `
//       <div class="card subtle" style="margin-bottom:1rem">No se pudo cargar el calendario interactivo. Mostrando una lista simple.</div>
//       <table class="table">
//         <thead><tr><th>Fecha</th><th>Evento</th><th>Asignatura</th><th>Tipo</th></tr></thead>
//         <tbody id="cal-tbody"></tbody>
//       </table>
//     `;
//     const paintFallback = () => {
//       const v = $("#flt-cal").value;
//       const rows = (eventos||[]).filter(e=> v? e.asignatura===v : true )
//         .map(e=>`<tr><td>${fmtDate(e.date)}</td><td>${e.title}</td><td>${e.asignatura}</td><td>${e.type}</td></tr>`)
//         .join("") || `<tr><td colspan="4" class="subtle">Sin eventos.</td></tr>`;
//       $("#cal-tbody").innerHTML = rows;
//     };
//     $("#flt-cal").addEventListener("change", paintFallback);
//     paintFallback();
//     return;
//   }

//   const el = $("#calendar");
//   el.innerHTML = "";
//   const cal = new FullCalendar.Calendar(el, {
//     initialView: "dayGridMonth",
//     locale: "es",
//     height: 520,
//     headerToolbar: { left:"prev,next today", center:"title", right:"dayGridMonth,timeGridWeek,listWeek" },
//     events: (eventos||[]).map(e=>({
//       id: e.id, title: `${e.title} · ${e.asignatura}`, start: e.date,
//       className: e.type==="examen" ? "event-examen" : "event-tarea"
//     }))
//   });
//   cal.on("eventClick", (info)=>{
//     const e = (eventos||[]).find(x=> String(x.id)===String(info.event.id));
//     if(!e) return;
//     UI.Modal.show("Detalle de evento", `
//       <div><strong>${e.title}</strong></div>
//       <div class="subtle">${fmtDate(e.date)} · ${e.asignatura}</div>
//       <div class="subtle">Tipo: ${e.type}</div>
//     `);
//   });
//   cal.render();

//   $("#flt-cal").addEventListener("change", ()=>{
//     const v = $("#flt-cal").value;
//     cal.getEvents().forEach(ev=>{
//       const show = !v || (ev.title || "").includes(v);
//       ev.setProp("display", show ? "auto" : "none");
//     });
//   });
// }

// async function renderPerfil(){
//   setTitle("Perfil");
//   const perf = await api.getPerfil();
//   const currentPhoto = getStudentPhotoUrl();

//   mount(`
//     <h2 class="section-title">Perfil</h2>
//     <div class="grid">
//       <div class="class-card">
//         <div class="class-head">
//           <div class="avatar" style="width:56px;height:56px">
//             <img class="avatar-photo" src="${currentPhoto}" alt="" onerror="this.style.display='none'">
//             <span class="avatar-initials">${(perf?.nombre||"").split(" ").map(s=>s[0]).slice(0,2).join("").toUpperCase() || "AL"}</span>
//           </div>
//           <div>
//             <div class="class-name" style="margin:0">${perf?.nombre || "-"}</div>
//             <div class="subtle">${perf?.curso || ""}</div>
//           </div>
//         </div>

//         <div class="subtle" style="margin-top:.6rem">
//           <div><strong>Correo:</strong> ${perf?.correo || "-"}</div>
//           <div><strong>RUT:</strong> ${perf?.rut || "-"}</div>
//           <div><strong>Teléfono:</strong> ${perf?.telefono || "-"}</div>
//         </div>
//       </div>

//       <div class="class-card">
//         <h4 class="class-name" style="margin:0 0 .6rem 0">Foto (vista previa)</h4>
//         <div class="row">
//           <input type="file" id="input-foto" accept="image/*" class="input" />
//           <button class="btn btn-secondary" id="btn-clear-foto">Quitar</button>
//         </div>
//         <div id="preview" style="margin-top:.8rem">
//           <img src="${currentPhoto}" alt="Foto actual" style="max-width:160px;border-radius:12px;border:1px solid var(--border)" onerror="this.style.display='none'"/>
//         </div>
//         <p class="help">Hoy se guarda localmente. Cuando expongas /api/student/photo/ cambiamos a subida real.</p>
//       </div>
//     </div>
//   `);

//   applyStudentPhotoToDOM();

//   $("#input-foto").addEventListener("change", async (e)=>{
//     const file = e.target.files?.[0]; if(!file) return;

//     // Si ya tienes endpoint de subida, descomenta y usa:
//     // await api.uploadPhoto(file); await api.getPerfil(true); applyStudentPhotoToDOM(); return;

//     // Mientras tanto, guardamos local DataURL (sirve para el PDF también)
//     const reader = new FileReader();
//     reader.onload = ev => {
//       const dataUrl = ev.target.result;
//       try {
//         localStorage.setItem(PHOTO_KEY, dataUrl);
//       } catch (err) {
//         alert("No se pudo guardar la foto (límite de almacenamiento del navegador).");
//       }
//       $("#preview").innerHTML = `<img src="${dataUrl}" style="max-width:160px;border-radius:12px;border:1px solid var(--border)" alt="Preview" />`;
//       applyStudentPhotoToDOM();
//     };
//     reader.readAsDataURL(file);
//   });

//   $("#btn-clear-foto").addEventListener("click", ()=>{
//     localStorage.removeItem(PHOTO_KEY);
//     $("#preview").innerHTML = `<div class="subtle">Sin foto.</div>`;
//     applyStudentPhotoToDOM();
//   });
// }

// function applyStudentPhotoToDOM(){
//   const url = getStudentPhotoUrl();
//   $$(".avatar-photo").forEach(img=>{
//     img.src = url;
//     img.style.display = "block";
//   });
// }

// /* ================== PAGOS (bloqueo parental demo) ================== */
// const PARENT_PASS = "HIPONA-APO-2025";
// function isPagosUnlocked(){ return Date.now() < STATE.pagosUnlockUntil; }

// function renderPagos(){
//   setTitle("Pagos");
//   if(isPagosUnlocked()) return renderPagosContent();

//   mount(`
//     <h2 class="section-title">Pagos</h2>
//     <div class="card" style="max-width:520px;margin:auto">
//       <p class="subtle" style="margin-top:0">Un adulto responsable debe ingresar la <strong>Contraseña de Apoderado</strong> para acceder.</p>
//       <div class="field">
//         <label class="label" for="parent-pass">Contraseña</label>
//         <div class="input-row">
//           <input id="parent-pass" type="password" class="input" autocomplete="off" placeholder="Ingresa la contraseña" />
//           <button class="btn btn-secondary" id="toggle-pass" aria-label="Mostrar/ocultar">👁</button>
//         </div>
//         <div class="row" style="justify-content:space-between">
//           <label class="subtle"><input id="remember30" type="checkbox" /> Recordar por 30 minutos</label>
//           <button class="btn" id="parent-enter">Ingresar</button>
//         </div>
//         <div id="parent-err" class="tag" style="display:none;background:#fee2e2;color:#7f1d1d;border:1px solid #fecaca">Contraseña incorrecta.</div>
//       </div>
//     </div>
//   `);

//   const input = $("#parent-pass");
//   $("#toggle-pass").addEventListener("click",(e)=>{e.preventDefault(); input.type = (input.type==="password")?"text":"password";});
//   $("#parent-enter").addEventListener("click", tryLogin);
//   input.addEventListener("keydown",(e)=>{ if(e.key==="Enter") tryLogin(); });

//   function tryLogin(){
//     const ok = (input.value || "").trim() === PARENT_PASS;
//     if(!ok){ $("#parent-err").style.display="inline-block"; input.focus(); input.select(); return; }
//     $("#parent-err").style.display="none";
//     if($("#remember30").checked){
//       const until = Date.now() + (30*60*1000);
//       sessionStorage.setItem("pagos_until", String(until));
//       STATE.pagosUnlockUntil = until;
//     }
//     renderPagosContent();
//   }
// }

// function renderPagosContent(){
//   // En el futuro, trae montos reales: GET /api/student/payments/summary y /api/student/payments/
//   mount(`
//     <div class="row" style="justify-content:space-between;flex-wrap:wrap">
//       <h2 class="section-title" style="margin:0">Pagos</h2>
//       <div class="row">
//         <button class="btn btn-secondary" id="btn-pdf-pagos" title="Descargar PDF"><i class="fa-solid fa-file-arrow-down"></i> Descargar PDF</button>
//         <button class="btn btn-secondary" id="logout-pagos">Cerrar sesión de apoderado</button>
//       </div>
//     </div>

//     <div class="grid">
//       ${UI.CardStat("Total Pagado", "$230.000")}
//       ${UI.CardStat("Total Pendiente", "$0")}
//     </div>

//     <div class="card" style="margin-top:1rem;padding:0" id="pagos-card">
//       <table class="table">
//         <thead><tr><th>Fecha</th><th>Monto</th><th>Estado</th></tr></thead>
//         <tbody><tr><td>10/03/2025</td><td>$230.000</td><td><span class="tag graded">Pagado</span></td></tr></tbody>
//       </table>
//     </div>
//   `);

//   $("#logout-pagos").addEventListener("click", ()=>{
//     sessionStorage.removeItem("pagos_until");
//     STATE.pagosUnlockUntil = 0;
//     renderPagos();
//   });

//   $("#btn-pdf-pagos").addEventListener("click", async ()=>{
//     const perfil = await api.getPerfil();
//     // Cuando tengas summary real:
//     // const sum = await fetchJson("/api/student/payments/summary/");
//     const academicSummary = await buildAcademicSummaryHTML();
//     const totalPagado = 230000; // sum.total_pagado
//     const totalPendiente = 0;   // sum.total_pendiente
//     const pagosSummary = `
//       <div class="summary">
//         <div class="chip"><strong>Total pagado:</strong> $${totalPagado.toLocaleString("es-CL")}</div>
//         <div class="chip"><strong>Total pendiente:</strong> $${totalPendiente.toLocaleString("es-CL")}</div>
//       </div>
//     `;
//     const preHTML = `${academicSummary}${pagosSummary}`;
//     const tableHTML = $("#pagos-card").outerHTML;

//     exportToPDFWithHeader(
//       "pagos.pdf",
//       "Informe de Pagos",
//       tableHTML,
//       {
//         preHTML,
//         student: perfil,
//         logoUrl: getLogoUrl(),
//         photoUrl: getStudentPhotoUrl(),
//         watermarkText: "INTRANET"
//       }
//     );
//   });
// }

// /* ================== ROUTER ================== */
// function render(section){
//   STATE.section = section;
//   const titles = {
//     "dashboard":"Dashboard","mis-clases":"Mis Clases","tareas":"Tareas y Notas",
//     "calendario":"Calendario","perfil":"Perfil","pagos":"Pagos"
//   };
//   setTitle(titles[section] || "Dashboard");
//   $$(".menu a").forEach(a=>{
//     const active = a.dataset.section===section;
//     a.classList.toggle("active", active);
//     if(active) a.setAttribute("aria-current","page"); else a.removeAttribute("aria-current");
//   });

//   if(section==="dashboard")   return renderDashboard();
//   if(section==="mis-clases")  return renderMisClases();
//   if(section==="tareas")      return renderTareas();
//   if(section==="calendario")  return renderCalendario();
//   if(section==="perfil")      return renderPerfil();
//   if(section==="pagos")       return renderPagos();
//   return renderDashboard();
// }

// /* ================== ARRANQUE ================== */
// document.addEventListener("DOMContentLoaded", async ()=>{
//   applyTheme(STATE.theme);
//   $("#btn-theme")?.addEventListener("click", toggleTheme);
//   window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", ()=>{ if(STATE.theme==="auto") applyTheme("auto"); });

//   $$(".menu a").forEach(a=>a.addEventListener("click",(e)=>{e.preventDefault();render(a.dataset.section);} ));

//   $("#modal-close")?.addEventListener("click", UI.Modal.hide);
//   $("#modal-ok")?.addEventListener("click", UI.Modal.hide);
//   $("#modal .modal-backdrop")?.addEventListener("click", UI.Modal.hide);

//   try {
//     // Pre-cargamos perfil para que el avatar/foto estén listos
//     await api.getPerfil().catch(()=>null);
//   } finally {
//     applyStudentPhotoToDOM();
//     render("dashboard");
//   }
// });
