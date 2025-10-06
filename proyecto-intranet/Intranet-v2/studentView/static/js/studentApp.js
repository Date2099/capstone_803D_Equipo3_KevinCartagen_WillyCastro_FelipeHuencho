/* ================== CONFIG/ESTADO ================== */
const STATIC_URL  = (typeof window !== "undefined" && window.STATIC_URL) ? window.STATIC_URL : "/static/";
const PHOTO_KEY   = "student_photo_dataurl";
const PROFILE_KEY = "student_profile_cache";

const STATE = {
  section: "dashboard",
  filters: JSON.parse(localStorage.getItem("student_filters")||"{}"),
  pagosUnlockUntil: Number(sessionStorage.getItem("pagos_until")||0),
  theme: localStorage.getItem("theme") || "auto",
  pagosYear: null,
};

/* ================== DATOS MOCK/SERVICIOS ================== */
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
  },
  mensualidades: [
    { id:"2025-01", anio:2025, mes:1,  importe:230000, pagada:true,  fecha_vencimiento:"2025-01-10" },
    { id:"2025-02", anio:2025, mes:2,  importe:230000, pagada:true,  fecha_vencimiento:"2025-02-10" },
    { id:"2025-03", anio:2025, mes:3,  importe:230000, pagada:true,  fecha_vencimiento:"2025-03-10" },
    { id:"2025-04", anio:2025, mes:4,  importe:230000, pagada:false, fecha_vencimiento:"2025-04-10" },
    { id:"2025-05", anio:2025, mes:5,  importe:230000, pagada:false, fecha_vencimiento:"2025-05-10" },
    { id:"2025-06", anio:2025, mes:6,  importe:230000, pagada:false, fecha_vencimiento:"2025-06-10" },
    { id:"2025-07", anio:2025, mes:7,  importe:230000, pagada:false, fecha_vencimiento:"2025-07-10" },
    { id:"2025-08", anio:2025, mes:8,  importe:230000, pagada:false, fecha_vencimiento:"2025-08-10" },
    { id:"2025-09", anio:2025, mes:9,  importe:230000, pagada:false, fecha_vencimiento:"2025-09-10" },
    { id:"2025-10", anio:2025, mes:10, importe:230000, pagada:false, fecha_vencimiento:"2025-10-10" },
    { id:"2025-11", anio:2025, mes:11, importe:230000, pagada:false, fecha_vencimiento:"2025-11-10" },
    { id:"2025-12", anio:2025, mes:12, importe:230000, pagada:false, fecha_vencimiento:"2025-12-10" },
  ],
};

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

/* ================== UTILIDADES ================== */
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const setTitle = t => { const n=$("#topbar-t"); if(n) n.textContent=t; };
const fmtDate = (iso) => new Date(iso+"T00:00:00").toLocaleDateString("es-CL",{ day:"2-digit", month:"short", year:"numeric" });
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
function mount(html){ const host=$("#main-card"); host.innerHTML=html; host.classList.remove("fade-in"); requestAnimationFrame(()=>host.classList.add("fade-in")); }
function skeleton(lines=3){ return `<div class="skeleton sk-box"></div>${Array.from({length:lines}).map(()=>`<div class="skeleton sk-line"></div>`).join("")}`; }
function getLogoUrl(){ return STATIC_URL + "img/logo.png"; }
function getStudentPhotoUrl(){ const saved = localStorage.getItem(PHOTO_KEY); return saved || (STATIC_URL + "img/student.jpg"); }
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const mesNombre = (n) => MESES[(n-1) % 12];
const clp = (n) => (Number(n)||0).toLocaleString("es-CL", { style:"currency", currency:"CLP", maximumFractionDigits:0 });

/* ====== Helpers responsive ====== */
function responsiveTableEnhance(tableOrSelector) {
  const table = typeof tableOrSelector === "string" ? document.querySelector(tableOrSelector) : tableOrSelector;
  if (!table || table.dataset.enhanced) return;
  const heads = Array.from(table.querySelectorAll("thead th")).map(th => th.textContent.trim());
  table.querySelectorAll("tbody tr").forEach(tr => {
    Array.from(tr.children).forEach((td, i) => td.setAttribute("data-label", heads[i] || ""));
  });
  table.classList.add("responsive");
  table.dataset.enhanced = "1";
}
function ensureMenuAriaLabels() {
  document.querySelectorAll(".menu a").forEach(a => {
    const label = a.querySelector("span")?.textContent?.trim();
    if (label) a.setAttribute("aria-label", label);
  });
}

/* ================== PDFs (export) ================== */
function exportToPDFWithHeader(filename, title, contentHTML, extraMeta = {}){
  const student = extraMeta.student || DATA.perfil;
  const logoUrl = extraMeta.logoUrl || getLogoUrl();
  const photoUrl = extraMeta.photoUrl || getStudentPhotoUrl();
  const preHTML  = extraMeta.preHTML || "";
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
      .wm{ position: fixed; inset: 0; pointer-events: none; z-index: -1; display:flex; align-items:center; justify-content:center; opacity: .06; font-size: 120px; font-weight: 900; letter-spacing: 6px; color: #0f294c; }
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
    ${preHTML}
    ${contentHTML}
    <footer>Documento informativo generado desde la Intranet del colegio. Para fines oficiales, valide en el portal.</footer>
  </body></html>`;
  win.document.write(html); win.document.close();
  const waitResources = async () => {
    try { if (win.document.fonts && win.document.fonts.ready) await win.document.fonts.ready; } catch(e){}
    const imgs = Array.from(win.document.images || []);
    await Promise.all(imgs.map(img => img.complete ? Promise.resolve() : new Promise(res => { img.onload = img.onerror = res; })));
  };
  win.onload = async () => { await waitResources(); win.focus(); win.print(); win.onafterprint = () => win.close(); };
}

/* ================== Resumen académico para PDFs ================== */
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

/* ================== COMPONENTES UI ================== */
const UI = {
  Progress: (value) => {
    const v = clamp(value||0, 0, 100);
    return `<div class="progress" role="progressbar" aria-valuenow="${v}" aria-valuemin="0" aria-valuemax="100" data-percent="${v}">
      <span style="width:${v}%"></span>
    </div>`;
  },
  TagEstado: (estado) => {
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

/* ================== TEMA ================== */
function applyTheme(mode){
  document.documentElement.classList.add("theme-animating");
  document.documentElement.classList.remove("theme-dark");
  if (mode === "dark") document.documentElement.classList.add("theme-dark");
  if (mode === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches){
    document.documentElement.classList.add("theme-dark");
  }
  localStorage.setItem("theme", mode);
  STATE.theme = mode;
  setTimeout(()=>document.documentElement.classList.remove("theme-animating"), 320);
}
function toggleTheme(){
  const next = STATE.theme === "light" ? "dark" : STATE.theme === "dark" ? "auto" : "light";
  applyTheme(next);
}

/* ================== SECCIONES (renderers) ================== */
async function renderDashboard(){ /* ...igual que antes... */ 
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

async function renderMisClases(){ /* ...igual que en la versión anterior... */ 
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
  document.addEventListener("click", onClaseDetalle, { once:true });
  function onClaseDetalle(e){
    const btn = e.target.closest("[data-action='clase-detalle']");
    if(!btn) { document.addEventListener("click", onClaseDetalle, { once:true }); return; }
    e.preventDefault(); renderClaseDetalle(btn.dataset.id);
  }
}

async function renderClaseDetalle(id){ /* ...igual; omito por espacio (sin cambios relevantes) ... */ 
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
  const body = $("#tab-body");
  const renderTab = (t) => {
    if(t==="asistencia"){
      body.innerHTML = `
        <table class="table" id="tabla-asistencia">
          <thead><tr><th>Mes</th><th>Asistencia</th></tr></thead>
          <tbody><tr><td>Ago</td><td>96%</td></tr><tr><td>Sep</td><td>94%</td></tr></tbody>
        </table>`;
      responsiveTableEnhance("#tabla-asistencia");
    } else if(t==="notas"){
      body.innerHTML = `
        <table class="table" id="tabla-notas">
          <thead><tr><th>Evaluación</th><th>Fecha</th><th>Nota</th></tr></thead>
          <tbody><tr><td>Prueba 1</td><td>05/Sep</td><td><span class="grade">6.2</span></td></tr>
                 <tr><td>Tarea</td><td>18/Sep</td><td><span class="grade">6.0</span></td></tr></tbody>
        </table>`;
      responsiveTableEnhance("#tabla-notas");
    } else {
      body.innerHTML = `<ul><li>Programa de la asignatura (PDF)</li><li>Guía 1: Funciones</li></ul>`;
    }
  };
  renderTab("material");
  $("#back-classes").addEventListener("click", (e)=>{e.preventDefault();renderMisClases();});
  $$("[data-tab]").forEach(b=>b.addEventListener("click",()=>renderTab(b.dataset.tab)));
}

async function renderTareas(){ /* igual que antes, con responsiveTableEnhance */ 
  setTitle("Tareas y Notas");
  const saved = { asig: STATE.filters.asig || "", estado: STATE.filters.estado || "", orden: STATE.filters.orden || "fecha_desc" };
  mount(`
    <h2 class="section-title">Tareas y Notas</h2>
    <div class="row" style="flex-wrap:wrap;gap:.6rem;margin:.3rem 0 1rem 0">
      <label class="subtle"></label>
      <select id="flt-asig" class="input" style="max-width:220px"></select>
      <div class="row" role="group" aria-label="Estado">
        <button class="btn btn-secondary" data-est=""          ${saved.estado===""?'aria-pressed="true"':''}>Todas</button>
        <button class="btn btn-secondary" data-est="pending"   ${saved.estado==="pending"?'aria-pressed="true"':''}>Pendientes</button>
        <button class="btn btn-secondary" data-est="submitted" ${saved.estado==="submitted"?'aria-pressed="true"':''}>Entregadas</button>
        <button class="btn btn-secondary" data-est="graded"    ${saved.estado==="graded"?'aria-pressed="true"':''}>Calificadas</button>
      </div>
      <div class="row" style="margin-left:auto">
        <label class="subtle"></label>
        <select id="flt-orden" class="input" style="max-width:180px">
          <option value="fecha_desc">Fecha ↓</option>
          <option value="fecha_asc">Fecha ↑</option>
          <option value="nota_desc">Nota ↓</option>
          <option value="nota_asc">Nota ↑</option>
        </select>
        <button class="btn btn-secondary" id="btn-pdf-tareas" title="Descargar PDF"><i class="fa-solid fa-file-arrow-down"></i> Descargar PDF</button>
      </div>
    </div>
    <div class="card" style="padding:0" id="tareas-card"><div style="padding:1rem">${skeleton(4)}</div></div>
  `);
  const tareas = await api.getTareas();
  const asigs = Array.from(new Set(tareas.map(t=>t.asignatura)));
  $("#flt-asig").innerHTML = `<option value="">Todas</option>${asigs.map(a=>`<option>${a}</option>`).join("")}`;
  $("#flt-asig").value = saved.asig; $("#flt-orden").value = saved.orden;
  let estado = saved.estado;

  const paint = () => {
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
      </table>`;
    responsiveTableEnhance("#tabla-tareas");
  };
  $("#flt-asig").addEventListener("change", e=>{ saved.asig = e.target.value; persist(); paint(); });
  $("#flt-orden").addEventListener("change", e=>{ saved.orden = e.target.value; persist(); paint(); });
  $$("[data-est]").forEach(b=>{
    b.addEventListener("click", ()=>{ estado = b.dataset.est || ""; $$("[data-est]").forEach(x=>x.removeAttribute("aria-pressed")); b.setAttribute("aria-pressed","true"); saved.estado = estado; persist(); paint(); });
  });
  const persist = ()=> localStorage.setItem("student_filters", JSON.stringify(saved));
  paint();

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
      </div>`;
    const academicSummary = await buildAcademicSummaryHTML();
    const preHTML = `${academicSummary}${tareasSummary}`;
    const tableHTML = $("#tareas-card").innerHTML;
    exportToPDFWithHeader("tareas.pdf","Informe de Tareas y Notas", tableHTML, { preHTML, student: perfil, logoUrl: getLogoUrl(), photoUrl: getStudentPhotoUrl(), watermarkText: "INTRANET" });
  });
}

async function ensureCalendarLib(){ /* igual que antes */ 
  if (window.FullCalendar && window.FullCalendar.Calendar) return true;
  await new Promise((resolve,reject)=>{
    const s=document.createElement("script");
    s.src="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.13/index.global.min.js";
    s.onload=resolve; s.onerror=reject;
    document.head.appendChild(s);
  }).catch(()=>false);
  return !!(window.FullCalendar && window.FullCalendar.Calendar);
}

async function renderCalendario(){ /* igual que antes (sin cambios) */ 
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
    $("#calendar").innerHTML = `
      <div class="card subtle" style="margin-bottom:1rem">No se pudo cargar el calendario interactivo. Mostrando una lista simple.</div>
      <table class="table" id="table-cal-fallback">
        <thead><tr><th>Fecha</th><th>Evento</th><th>Asignatura</th><th>Tipo</th></tr></thead>
        <tbody id="cal-tbody"></tbody>
      </table>`;
    const paintFallback = () => {
      const v = $("#flt-cal").value;
      const rows = eventos.filter(e=> v? e.asignatura===v : true )
        .map(e=>`<tr><td>${fmtDate(e.date)}</td><td>${e.title}</td><td>${e.asignatura}</td><td>${e.type}</td></tr>`)
        .join("") || `<tr><td colspan="4" class="subtle">Sin eventos.</td></tr>`;
      $("#cal-tbody").innerHTML = rows;
      responsiveTableEnhance("#table-cal-fallback");
    };
    $("#flt-cal").addEventListener("change", paintFallback);
    paintFallback();
    return;
  }
  const el = $("#calendar"); el.innerHTML = "";
  const cal = new FullCalendar.Calendar(el, {
    initialView: "dayGridMonth",
    locale: "es",
    height: 520,
    headerToolbar: { left:"prev,next today", center:"title", right:"dayGridMonth,timeGridWeek,listWeek" },
    events: eventos.map(e=>({ id: e.id, title: `${e.title} · ${e.asignatura}`, start: e.date, className: e.type==="examen" ? "event-examen" : "event-tarea" }))
  });
  cal.on("eventClick", (info)=>{
    const e = eventos.find(x=> String(x.id)===String(info.event.id));
    if(!e) return;
    UI.Modal.show("Detalle de evento", `
      <div><strong>${e.title}</strong></div>
      <div class="subtle">${fmtDate(e.date)} · ${e.asignatura}</div>
      <div class="subtle">Tipo: ${e.type}</div>`);
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

async function renderPerfil(){ /* igual que antes (sin cambios funcionales) */ 
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
  applyStudentPhotoToDOM();
  $("#input-foto").addEventListener("change", (e)=>{
    const file = e.target.files?.[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target.result;
      try { localStorage.setItem(PHOTO_KEY, dataUrl); } catch (err) { alert("No se pudo guardar la foto (límite de almacenamiento del navegador)."); }
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
  const url = getStudentPhotoUrl();
  $$(".avatar-photo").forEach(img=>{ img.src = url; img.style.display = "block"; });
}

/* ================== PAGOS (sin cambios) ================== */
/* =============== PAGOS (multi-selección, resumen, bloqueo + CSV) =============== */

/** Config */
const PARENT_PASS = "HIPONA-APO-2025"; // clave apoderado
const UNLOCK_MINUTES = 30;             // minutos de sesión abierta

/** Storage y helpers de sesión */
const STORAGE_KEY_PAGOS = "alumno_pagos_unlock_until";
function getUnlockUntil() {
  if (typeof STATE !== "undefined" && STATE) {
    if (typeof STATE.pagosUnlockUntil !== "number") STATE.pagosUnlockUntil = 0;
    return Number(STATE.pagosUnlockUntil || 0);
  }
  return Number(localStorage.getItem(STORAGE_KEY_PAGOS) || 0);
}
function setUnlockUntil(ts) {
  try {
    if (typeof STATE !== "undefined" && STATE) STATE.pagosUnlockUntil = Number(ts);
    localStorage.setItem(STORAGE_KEY_PAGOS, String(ts));
  } catch (_) {}
}
function clearUnlock(){ setUnlockUntil(0); }
function isPagosUnlocked(){ return Date.now() < getUnlockUntil(); }

/* ===== Utilidades locales ===== */
function msToClock(ms){
  if (ms <= 0) return "00:00";
  const s = Math.floor(ms/1000);
  const m = Math.floor(s/60);
  const r = s % 60;
  return `${String(m).padStart(2,"0")}:${String(r).padStart(2,"0")}`;
}
function pagoEstado(row){
  if (row.pagada) return { key:"paid", label:"Pagada",   color:"#166534", bg:"#EAF7EE", border:"#86efac" };
  const vencio = new Date(row.fecha_vencimiento+"T00:00:00") < new Date();
  if (vencio)   return { key:"overdue", label:"Atrasada", color:"#991B1B", bg:"#FEE2E2", border:"#FCA5A5" };
  return { key:"pending", label:"Pendiente", color:"#92400E", bg:"#FEF3C7", border:"#FCD34D" };
}
function tagHtml(state){
  return `<span style="display:inline-block;padding:.2rem .5rem;border-radius:999px;font-weight:700;
          color:${state.color};background:${state.bg};border:1px solid ${state.border};font-size:.85rem">
          ${state.label}</span>`;
}
function uniqueYearsFromMensualidades(){
  const years = Array.from(new Set((DATA?.mensualidades||[]).map(x=>x.anio))).sort((a,b)=>a-b);
  return years.length ? years : [new Date().getFullYear()];
}
function rowsByYear(year){
  return (DATA?.mensualidades||[]).filter(x=>String(x.anio)===String(year))
                                  .sort((a,b)=>a.mes-b.mes);
}
function resumenYear(year){
  const rows = rowsByYear(year);
  const total = rows.reduce((acc,r)=>acc + (Number(r.importe)||0), 0);
  const pagadas = rows.filter(r=>r.pagada);
  const pendientes = rows.filter(r=>!r.pagada && new Date(r.fecha_vencimiento+"T00:00:00") >= new Date());
  const atrasadas  = rows.filter(r=>!r.pagada && new Date(r.fecha_vencimiento+"T00:00:00") <  new Date());
  const saldo = [...pendientes, ...atrasadas].reduce((a,r)=>a+(Number(r.importe)||0),0);
  return { total, pagadas:pagadas.length, pendientes:pendientes.length, atrasadas:atrasadas.length, saldo };
}
function exportPagosCSV(year){
  const rows = rowsByYear(year);
  const header = ["Año","Mes","Vencimiento","Monto","Estado"];
  const lines = [header.join(",")];
  rows.forEach(r=>{
    const st = pagoEstado(r).label;
    lines.push([r.anio, mesNombre(r.mes), fmtDate(r.fecha_vencimiento), (Number(r.importe)||0), st].join(","));
  });
  const blob = new Blob([lines.join("\n")], {type:"text/csv;charset=utf-8"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `pagos_${year}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
}

/* ===== Vistas: Bloqueo ===== */
let ttlIntervalId = null;

function renderPagosLocked(){
  setTitle("Pagos — Acceso protegido");
  if (ttlIntervalId) { clearInterval(ttlIntervalId); ttlIntervalId = null; }

  mount(`
    <div class="card" style="max-width:560px;margin:1rem auto">
      <h3 class="card-title" style="margin-bottom:.5rem">Acceso protegido</h3>
      <p class="subtle" style="margin-bottom:1rem">
        Ingresa la <b>clave de apoderado</b>. El acceso se mantendrá activo por ${UNLOCK_MINUTES} minutos.
      </p>

      <div class="row" style="gap:.5rem;margin-bottom:.75rem">
        <input id="pay-pass-input" class="input" type="password" placeholder="Clave de apoderado" aria-label="Clave de apoderado" style="max-width:320px">
        <button id="pay-pass-toggle" class="btn btn-secondary" aria-label="Mostrar u ocultar clave">Mostrar</button>
        <button id="pay-unlock" class="btn" aria-label="Desbloquear portal de pagos">Desbloquear</button>
      </div>

      <p id="pay-error" style="display:none;margin:.25rem 0 0 0; color:#991B1B; font-weight:700"></p>

      <details style="margin-top:1rem">
        <summary>Ayuda</summary>
        <ul class="subtle" style="margin:.5rem 1rem">
          <li>Si olvidaste tu clave, solicita asistencia en Secretaría.</li>
          <li>Tras desbloquear, podrás pagar <b>una o varias cuotas a la vez</b>.</li>
        </ul>
      </details>
    </div>
  `);

  const input  = $("#pay-pass-input");
  const toggle = $("#pay-pass-toggle");
  const btn    = $("#pay-unlock");
  const err    = $("#pay-error");
  if(!input || !toggle || !btn) return;

  toggle.addEventListener("click", ()=>{
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    toggle.textContent = show ? "Ocultar" : "Mostrar";
    input.focus();
  });

  const tryUnlock = () => {
    const val = (input.value||"").trim();
    if (!val) { err.style.display="block"; err.textContent="Ingresa la clave."; return; }
    if (val === PARENT_PASS) {
      const until = Date.now() + UNLOCK_MINUTES*60*1000;
      setUnlockUntil(until);
      renderPagos();
    } else {
      err.style.display="block";
      err.textContent="Clave incorrecta. Inténtalo nuevamente.";
    }
  };
  btn.addEventListener("click", tryUnlock);
  input.addEventListener("keydown", e=>{ if(e.key==="Enter") tryUnlock(); });
}

/* ===== Vistas: Contenido con multi-selección ===== */
function renderPagosContent(){
  setTitle("Pagos");

  // Año por defecto
  const years = uniqueYearsFromMensualidades();
  if (!STATE.pagosYear) STATE.pagosYear = years[years.length-1];

  // selección múltiple en memoria
  let selectedIds = new Set();

  const syncSelectionWithYear = () => {
    const validIds = new Set(rowsByYear(STATE.pagosYear).map(r=>String(r.id)));
    selectedIds = new Set([...selectedIds].filter(id=>validIds.has(id)));
  };

  const openPayModal = (rowsSel)=>{
    const total = rowsSel.reduce((a,r)=>a+(Number(r.importe)||0),0);
    const list  = rowsSel.map(r=>`• ${mesNombre(r.mes)} ${r.anio} — ${clp(r.importe)}`).join("<br>");
    UI.Modal.show("Confirmar pago", `
      <p>Vas a pagar las siguientes cuotas:</p>
      <div class="subtle" style="margin:.5rem 0 1rem 0">${list}</div>
      <p><b>Total:</b> ${clp(total)}</p>
      <div class="row" style="justify-content:flex-end;gap:.5rem;margin-top:1rem">
        <button class="btn btn-secondary" id="m-cancel">Cancelar</button>
        <button class="btn" id="m-confirm">Confirmar</button>
      </div>
    `);
    $("#m-cancel")?.addEventListener("click", UI.Modal.hide);
    $("#m-confirm")?.addEventListener("click", ()=>{
      // DEMO: marcar como pagadas en memoria
      const ids = new Set(rowsSel.map(r=>String(r.id)));
      (DATA.mensualidades||[]).forEach(r=>{
        if (ids.has(String(r.id))) r.pagada = true;
      });
      UI.Modal.hide();
      // limpiamos selección y repintamos
      selectedIds.clear();
      paint();
    });
  };

  const paintToolbar = ()=>{
    const all = rowsByYear(STATE.pagosYear);
    const selected = all.filter(r=>selectedIds.has(String(r.id)));
    const total = selected.reduce((a,r)=>a+(Number(r.importe)||0),0);
    const visible = selected.length > 0;

    const host = $("#pay-toolbar");
    if (!host) return;

    host.innerHTML = visible ? `
      <div class="card" style="position:sticky; bottom:0; z-index:5; border:1px dashed var(--border,#e5e7eb); background:var(--card,#fff)">
        <div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:.6rem">
          <div class="subtle"><b>${selected.length}</b> cuota(s) seleccionada(s)</div>
          <div class="row" style="gap:.5rem">
            <div class="subtle">Total a pagar: <b>${clp(total)}</b></div>
            <button class="btn" id="btn-pay-selected">Pagar seleccionadas</button>
          </div>
        </div>
      </div>
    ` : "";
    if (visible){
      $("#btn-pay-selected")?.addEventListener("click", ()=> openPayModal(selected));
    }
  };

  const paint = ()=>{
    syncSelectionWithYear();

    const y   = STATE.pagosYear;
    const res = resumenYear(y);
    const rows = rowsByYear(y);

    mount(`
      <div class="page-header">
        <h2 style="display:flex;align-items:center;gap:.6rem">Portal de Pagos
          <small class="subtle" style="font-weight:600">· Sesión: <span id="pay-ttl">--:--</span></small>
        </h2>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap">
          <select id="pay-year" class="input" aria-label="Seleccionar año" style="min-width:120px">
            ${years.map(yr=>`<option value="${yr}" ${yr===y?"selected":""}>${yr}</option>`).join("")}
          </select>
          <button id="btn-select-pending" class="btn btn-secondary" title="Seleccionar pendientes/atrasadas">Seleccionar todas</button>
          <button id="btn-clear-selection" class="btn btn-secondary" title="Limpiar selección">Limpiar</button>
          <button id="btn-export-csv" class="btn btn-secondary" title="Exportar CSV">Exportar CSV</button>
          <button id="pay-lock" class="btn btn-secondary" title="Bloquear acceso">Bloquear</button>
        </div>
      </div>

      <section class="grid" style="margin-bottom:1rem">
        <div class="class-card"><div class="subtle">Saldo por pagar</div><div style="font-weight:800;font-size:1.7rem">${clp(res.saldo)}</div></div>
        <div class="class-card"><div class="subtle">Cuotas pagadas</div><div style="font-weight:800;font-size:1.7rem">${res.pagadas} / 12</div></div>
        <div class="class-card"><div class="subtle">Pendientes</div><div style="font-weight:800;font-size:1.7rem">${res.pendientes}</div></div>
        <div class="class-card"><div class="subtle">Atrasadas</div><div style="font-weight:800;font-size:1.7rem">${res.atrasadas}</div></div>
      </section>

      <div class="card">
        <h3 class="section-title" style="margin-bottom:.5rem">Detalle ${y}</h3>
        <div class="table-wrapper">
          <table class="data-table" id="tbl-pagos">
            <thead>
              <tr>
                <th style="width:38px;text-align:center">
                  <input id="chk-all" type="checkbox" aria-label="Seleccionar todas" />
                </th>
                <th>Mes</th>
                <th>Vencimiento</th>
                <th>Monto</th>
                <th>Estado</th>
                <th style="text-align:right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(r=>{
                const st = pagoEstado(r);
                const id = String(r.id);
                const selectable = !r.pagada;
                const checked = selectable && selectedIds.has(id) ? "checked" : "";
                return `
                <tr data-id="${id}">
                  <td style="text-align:center">
                    <input type="checkbox" class="chk-pay" ${selectable?"":"disabled"} ${checked} aria-label="Seleccionar cuota ${mesNombre(r.mes)}"/>
                  </td>
                  <td>${mesNombre(r.mes)}</td>
                  <td>${fmtDate(r.fecha_vencimiento)}</td>
                  <td>${clp(r.importe)}</td>
                  <td>${tagHtml(st)}</td>
                  <td style="text-align:right;white-space:nowrap">
                    <button class="btn ${selectable?'':'btn-secondary'}" data-act="quickpay" ${selectable?'':'disabled'}>Pagar</button>
                    <button class="btn btn-secondary" data-act="rcpt" ${r.pagada?'':'disabled'}>Comprobante</button>
                  </td>
                </tr>`;
              }).join("")}
            </tbody>
          </table>
        </div>
        <div id="pay-toolbar" style="margin-top:.8rem"></div>
      </div>

      <details style="margin-top:1rem">
        <summary>Información importante</summary>
        <div class="subtle" style="margin:.6rem 0 0 0">
          Los montos/fechas son referenciales. Para dudas o convenios, escribe a <strong>tesoreria@hipona.cl</strong>.
        </div>
      </details>
    `);

    responsiveTableEnhance("#tbl-pagos");

    // Cambios de año
    $("#pay-year")?.addEventListener("change", e=>{ STATE.pagosYear = Number(e.target.value); paint(); });

    // Exportar y bloqueo
    $("#btn-export-csv")?.addEventListener("click", ()=>exportPagosCSV(STATE.pagosYear));
    $("#pay-lock")?.addEventListener("click", ()=>{ clearUnlock(); renderPagos(); });

    // Seleccionar todas pendientes+atrasadas
    $("#btn-select-pending")?.addEventListener("click", ()=>{
      rows.forEach(r=>{
        const st = pagoEstado(r).key;
        if (st!=="paid") selectedIds.add(String(r.id));
      });
      paint(); // repinta para reflejar checks
    });

    // Limpiar selección
    $("#btn-clear-selection")?.addEventListener("click", ()=>{
      selectedIds.clear();
      paint();
    });

    // Checkbox maestro
    $("#chk-all")?.addEventListener("change", (e)=>{
      if (e.target.checked){
        rows.forEach(r=>{ if(!r.pagada) selectedIds.add(String(r.id)); });
      } else {
        rows.forEach(r=> selectedIds.delete(String(r.id)));
      }
      paint();
    });

    // Checks por fila
    $("#tbl-pagos")?.addEventListener("change", (e)=>{
      const chk = e.target.closest(".chk-pay");
      if(!chk) return;
      const tr = chk.closest("tr");
      const id = tr?.dataset?.id;
      if (!id) return;
      if (chk.checked) selectedIds.add(id); else selectedIds.delete(id);
      paintToolbar();
    });

    // Acciones por fila
    $("#tbl-pagos")?.addEventListener("click", (e)=>{
      const btn = e.target.closest("button[data-act]");
      if(!btn) return;
      const tr = btn.closest("tr"); if(!tr) return;
      const id = tr.dataset.id;
      const row = rows.find(r=>String(r.id)===id);
      if(!row) return;

      if (btn.dataset.act === "quickpay" && !row.pagada){
        // Shortcut: pagar solo esta
        openPayModal([row]);
      }
      if (btn.dataset.act === "rcpt" && row.pagada){
        UI.Modal.show("Comprobante", `
          <p>Comprobante para <b>${mesNombre(row.mes)} ${row.anio}</b>.</p>
          <p class="subtle">* Aquí se generaría el PDF o link al comprobante oficial.</p>
          <div class="row" style="justify-content:flex-end;margin-top:.8rem">
            <button class="btn btn-secondary" id="m-ok">Cerrar</button>
          </div>
        `);
        $("#m-ok")?.addEventListener("click", UI.Modal.hide);
      }
    });

    // TTL (conteo regresivo)
    const ttlSpan = $("#pay-ttl");
    if (ttlIntervalId) clearInterval(ttlIntervalId);
    const tick = ()=>{
      const left = getUnlockUntil() - Date.now();
      if (ttlSpan) ttlSpan.textContent = msToClock(left);
      if (left <= 0) { clearInterval(ttlIntervalId); ttlIntervalId = null; renderPagos(); }
    };
    tick();
    ttlIntervalId = setInterval(tick, 1000);

    // primera pintura de toolbar
    paintToolbar();
  };

  paint();
}

/** Entrada pública */
function renderPagos(){
  if (isPagosUnlocked()) renderPagosContent();
  else renderPagosLocked();
}

/** Para el router/menú */
window.renderPagos = renderPagos;


/* ================== ROUTER ================== */
function render(section){
  STATE.section = section;
  const titles = { "dashboard":"Dashboard","mis-clases":"Mis Clases","tareas":"Tareas y Notas","calendario":"Calendario","perfil":"Perfil","pagos":"Pagos" };
  setTitle(titles[section] || "Dashboard");
  $$(".menu a").forEach(a=>{
    const active = a.dataset.section===section;
    a.classList.toggle("active", active);
    if(active) a.setAttribute("aria-current","page"); else a.removeAttribute("aria-current");
  });
  // al navegar, cerrar el drawer si está abierto
  closeDrawer();

  if(section==="dashboard")   return renderDashboard();
  if(section==="mis-clases")  return renderMisClases();
  if(section==="tareas")      return renderTareas();
  if(section==="calendario")  return renderCalendario();
  if(section==="perfil")      return renderPerfil();
  if(section==="pagos")       return renderPagos();
  return renderDashboard();
}

/* ================== DRAWER (hamburguesa) ================== */
function openDrawer(){
  document.documentElement.classList.add("drawer-open");
  const btn = $("#btn-hamburger");
  if(btn) btn.setAttribute("aria-expanded","true");
}
function closeDrawer(){
  document.documentElement.classList.remove("drawer-open");
  const btn = $("#btn-hamburger");
  if(btn) btn.setAttribute("aria-expanded","false");
}

/* ================== ARRANQUE ================== */
document.addEventListener("DOMContentLoaded", ()=>{
  applyTheme(STATE.theme);
  $("#btn-theme").addEventListener("click", toggleTheme);
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", ()=>{ if(STATE.theme==="auto") applyTheme("auto"); });

  // navegación
  $$(".menu a").forEach(a=>a.addEventListener("click",(e)=>{e.preventDefault();render(a.dataset.section);} ));

  // modal
  $("#modal-close").addEventListener("click", UI.Modal.hide);
  $("#modal-ok").addEventListener("click", UI.Modal.hide);
  $("#modal .modal-backdrop").addEventListener("click", UI.Modal.hide);

  // hamburguesa
  const hb = $("#btn-hamburger");
  const backdrop = $("#drawer-backdrop");
  if(hb){ hb.addEventListener("click", ()=>{ const open = document.documentElement.classList.contains("drawer-open"); open ? closeDrawer() : openDrawer(); }); }
  if(backdrop){ backdrop.addEventListener("click", closeDrawer); }
  document.addEventListener("keydown", (e)=>{ if(e.key==="Escape") closeDrawer(); });

  // cerrar drawer al clickear un item del menú
  $$(".menu a").forEach(a=>a.addEventListener("click", closeDrawer));

  applyStudentPhotoToDOM();
  ensureMenuAriaLabels();
  render("dashboard");
});
