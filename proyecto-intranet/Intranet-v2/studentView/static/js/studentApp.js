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
async function renderDashboard(){
  setTitle("Dashboard");
  const [clases, perfil] = await Promise.all([api.getClases(), api.getPerfil()]);
  const proms = clases.map(c=>c.promedio).filter(Number.isFinite);
  const promGeneral = proms.length
    ? (Math.round((proms.reduce((a,b)=>a+b,0)/proms.length)*10)/10).toFixed(1)
    : "-";

  mount(`
    <section class="hero" style="background-image:
      linear-gradient(90deg, rgba(15,41,76,.90), rgba(205,167,88,.55)),
      url('${STATIC_URL}img/campus.jpg')">
      <div>
        <h2 class="hero-title">¡Bienvenido, ${perfil.nombre}!</h2>
        <p class="hero-sub">${perfil.curso} · RUT ${perfil.rut}</p>
        <div class="hero-badges">
          <span class="badge-soft">Portal Alumno</span>
          <span class="badge-soft">Colegio San Agustín de Hipona</span>
        </div>
      </div>
    </section>

    <section class="grid wide-stats" style="margin-top:1rem" id="db-cards">
      ${UI.CardStat("Promedio general", promGeneral, "linear-gradient(90deg,#0f294c,#cda758)")}
      ${UI.CardStat("Asignaturas", clases.length, "linear-gradient(90deg,#0f294c,#cda758)")}
    </section>
  `);
}




// Helper de icono/color por ramo
const SUBJECT_UI = {
  mat: { icon:"fa-square-root-variable", color:"#0EA5E9" },
  cie: { icon:"fa-flask",               color:"#F97316" },
  len: { icon:"fa-book-open",           color:"#10B981" },
  his: { icon:"fa-globe",               color:"#F43F5E" },
  ing: { icon:"fa-language",            color:"#6366F1" },
  _d:  { icon:"fa-book",                color:"var(--primary)" }
};
const getSubjUI = (id)=> SUBJECT_UI[id] || SUBJECT_UI._d;

async function renderMisClases(){
  setTitle("Mis Clases");
  const clases = await api.getClases();

  // Temas por ramo a partir de las tareas (sin agregar nada a la BD)
  const temasDe = (asig)=>{
    const items = (DATA.tareas||[])
      .filter(t=>t.asignatura===asig)
      .sort((a,b)=> new Date(a.fecha) - new Date(b.fecha))
      .map(t=>{
        let base = t.titulo || "";
        // toma la parte antes de “–” o “-” como tema
        if (base.includes("–")) base = base.split("–")[0];
        else if (base.includes("-")) base = base.split("-")[0];
        base = base.trim() || t.titulo.trim();
        return { fecha: t.fecha, tema: base };
      });

    // quitar duplicados de tema manteniendo orden
    const seen = new Set(), out = [];
    for (const it of items){
      if (!seen.has(it.tema)){ seen.add(it.tema); out.push(it); }
    }
    return out;
  };

  mount(`
    <h2 class="section-title">Mis Clases</h2>
    <p class="subtle">Toca una asignatura para ver los temas que se abordarán durante el semestre.</p>

    <div class="acc" id="clases-list">
      ${clases.map(c=>{
        const temas = temasDe(c.nombre);
        return `
          <div class="acc-item">
            <button class="acc-head">
              <i class="fa-solid fa-book acc-icon"></i>
              <div class="acc-title">
                <div class="cls-name">${c.nombre}</div>
                <div class="cls-subtle">Prof. ${c.profesor}</div>
              </div>
              <i class="fa-solid fa-chevron-down acc-caret"></i>
            </button>
            <div class="acc-body">
              <div class="acc-body-in">
                ${temas.length ? `
                  <ul class="syllabus">
                    ${temas.map(t=>`<li><span class="sy-date">${fmtDate(t.fecha)}</span><span class="sy-dot"></span>${t.tema}</li>`).join("")}
                  </ul>
                ` : `<div class="subtle">Aún no hay temas planificados a partir de las tareas.</div>`}
              </div>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `);

  // abrir/cerrar acordeón
  $("#clases-list").addEventListener("click",(e)=>{
    const head = e.target.closest(".acc-head");
    if(!head) return;
    head.closest(".acc-item").classList.toggle("open");
  });
}







// --- Helper de acordeón ---
function accItemHtml(id, title, bodyHTML, open=false, icon="fa-file-lines"){
  return `
    <div class="acc-item ${open?'open':''}">
      <button class="acc-head" data-acc="${id}">
        <i class="fa-solid ${icon} acc-icon"></i>
        <span class="acc-title">${title}</span>
        <i class="fa-solid fa-chevron-down acc-caret"></i>
      </button>
      <div class="acc-body"><div class="acc-body-in">${bodyHTML}</div></div>
    </div>
  `;
}




// JS — nueva sección "Notas" tipo acordeón (sin estado)
async function renderTareas(){
  setTitle("Notas");
  mount(`
    <h2 class="section-title">Notas</h2>
    <p class="subtle">Revisa tus notas por cada ramo. Toca un ramo para ver sus evaluaciones.</p>
    <section id="notas-acc">${skeleton(4)}</section>
  `);

  const tareas = await api.getTareas();
  const byAsig = tareas.reduce((m,t)=>{ (m[t.asignatura] ||= []).push(t); return m; }, {});
  const items = Object.entries(byAsig).map(([asig, arr])=>{
    const notas = arr.map(x=>x.nota).filter(n=>typeof n==="number");
    const prom  = notas.length ? (Math.round((notas.reduce((a,b)=>a+b,0)/notas.length)*10)/10).toFixed(1) : "--";
    const rows  = arr.map(t=>`
      <tr>
        <td>${t.titulo}</td>
        <td>${fmtDate(t.fecha)}</td>
        <td>${t.nota!=null?`<span class="grade">${t.nota}</span>`:"--"}</td>
      </tr>
    `).join("");
    return `
      <article class="acc-item">
        <button class="acc-head" data-acc="${asig}">
          <div class="acc-title">${asig}</div>
          <div class="acc-grade">Nota final <b>${prom}</b> <i class="fa-solid fa-plus acc-icon" aria-hidden="true"></i></div>
        </button>
        <div class="acc-body">
          <div class="table-wrapper">
            <table class="table">
              <thead><tr><th>Evaluación</th><th>Fecha</th><th>Nota</th></tr></thead>
              <tbody>${rows || `<tr><td colspan="3" class="subtle">Sin evaluaciones.</td></tr>`}</tbody>
            </table>
          </div>
        </div>
      </article>
    `;
  }).join("");

  $("#notas-acc").innerHTML = `
    <div class="acc-headline">INGENIERÍA EN INFORMÁTICA</div>
    ${items || `<div class="card subtle">No hay notas registradas.</div>`}
    <div class="row" style="justify-content:flex-end;margin-top:.5rem">
      <button class="btn btn-secondary" <i class="fa-solid fa-file-arrow-down"></i> Descargar PDF</button>
    </div>
  `;

  // responsive en tablas internas
  $$("#notas-acc table").forEach(responsiveTableEnhance);

  // acordeón
  $("#notas-acc").addEventListener("click", (e)=>{
    const head = e.target.closest(".acc-head");
    if(!head) return;
    const item = head.parentElement;
    item.classList.toggle("open");
    const icon = head.querySelector(".acc-icon");
    if(icon){ icon.classList.toggle("fa-plus"); icon.classList.toggle("fa-minus"); }
  });

  // PDF (sin columna de estado)
  
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
// Eventos personalizados del alumno (tareas/pruebas) sin recordatorios
const CE_KEY = "student_custom_events";
function getCustomEvents(){ try { return JSON.parse(localStorage.getItem(CE_KEY)||"[]"); } catch(_) { return []; } }
function saveCustomEvents(arr){ localStorage.setItem(CE_KEY, JSON.stringify(arr)); }
function toISO(dateStr, timeStr){ if(!dateStr) return null; const t = timeStr && timeStr.length ? timeStr : "00:00"; return `${dateStr}T${t}`; }


async function renderCalendario(){
  setTitle("Calendario");
  mount(`
    <h2 class="section-title">Calendario</h2>

    <div class="card" style="margin-bottom:1rem">
      <h3 class="section-title" style="margin:0 0 .6rem 0">Agregar evento</h3>
      <div class="row" style="flex-wrap:wrap;gap:.5rem">
        <input id="ev-title" class="input" placeholder="Título (p.ej. Prueba Unidad 2)" style="min-width:220px">
        <select id="ev-type" class="input" aria-label="Tipo">
          <option value="tarea">Tarea</option>
          <option value="examen">Prueba</option>
        </select>
        <select id="ev-subj" class="input" aria-label="Asignatura" style="min-width:200px"></select>
        <input id="ev-date" class="input" type="date" aria-label="Fecha">
        <input id="ev-time" class="input" type="time" aria-label="Hora">
        <button id="ev-add" class="btn">Agregar</button>
      </div>
    </div>

    <div class="row" style="gap:.5rem;margin-bottom:.6rem">
      <label class="subtle">Filtrar:</label>
      <select id="flt-cal" class="input" style="max-width:220px"><option value="">Todas las asignaturas</option></select>
    </div>

    <div id="calendar" class="card">${skeleton(4)}</div>
  `);

  // Solo usamos asignaturas y eventos del alumno (sin eventos del profesor)
  const clases = await api.getClases();
  const asigs = Array.from(new Set(clases.map(c=>c.nombre)));
  $("#ev-subj").innerHTML = `<option value="">Asignatura…</option>${asigs.map(a=>`<option>${a}</option>`).join("")}`;
  $("#flt-cal").innerHTML += asigs.map(a=>`<option>${a}</option>`).join("");

  const loaded = await ensureCalendarLib();
  const mapCustom = (arr)=> arr.map(ev=>({
    id: `c-${ev.id}`,
    title: `${ev.title} · ${ev.asignatura}`,
    start: ev.iso,
    className: ev.type==="examen" ? "event-examen" : "event-tarea",
    extendedProps: { kind: ev.type, subj: ev.asignatura }
  }));

  if(!loaded){
    // Fallback silencioso (lista simple, sin mensajes)
    const draw = ()=>{
      const v = $("#flt-cal").value;
      const customs = mapCustom(getCustomEvents())
        .filter(e=> !v || e.extendedProps.subj===v)
        .sort((a,b)=> new Date(a.start)-new Date(b.start));
      $("#calendar").innerHTML = `
        <table class="table" id="cal-fallback">
          <thead><tr><th>Fecha</th><th>Evento</th></tr></thead>
          <tbody>${customs.map(x=>`<tr><td>${fmtDate(x.start)}</td><td>${x.title}</td></tr>`).join("")}</tbody>
        </table>`;
      responsiveTableEnhance("#cal-fallback");
    };
    $("#ev-add").addEventListener("click", ()=>{
      const title=($("#ev-title").value||"").trim(), type=$("#ev-type").value, subj=$("#ev-subj").value, iso=toISO($("#ev-date").value,$("#ev-time").value);
      if(!title || !subj || !iso) return;
      const ev={ id:Date.now(), title, type, asignatura:subj, iso };
      saveCustomEvents([...getCustomEvents(), ev]);
      $("#ev-title").value=""; $("#ev-date").value=""; $("#ev-time").value="";
      draw();
    });
    $("#flt-cal").addEventListener("change", draw);
    draw();
    return;
  }

  // FullCalendar: solo eventos del alumno
  const el = $("#calendar"); el.innerHTML = "";
  const cal = new FullCalendar.Calendar(el, {
    initialView: "dayGridMonth",
    locale: "es",
    firstDay: 1,
    height: 520,
    dayMaxEvents: 3,
    headerToolbar: { left:"prev,next", center:"title", right:"dayGridMonth,timeGridWeek,listWeek" },
    events: mapCustom(getCustomEvents()),
    eventContent: (arg)=>{
      const wrap = document.createElement("div");
      wrap.className = "fc-pill";
      wrap.innerHTML = `<span class="fc-dot"></span>${arg.event.title}`;
      return { domNodes:[wrap] };
    }
  });
  cal.render();

  // Agregar evento (solo alumno)
  $("#ev-add").addEventListener("click", ()=>{
    const title=($("#ev-title").value||"").trim();
    const type=$("#ev-type").value;
    const subj=$("#ev-subj").value;
    const iso=toISO($("#ev-date").value,$("#ev-time").value);
    if(!title || !subj || !iso) return; // sin mensajes

    const ev = { id: Date.now(), title, type, asignatura: subj, iso };
    saveCustomEvents([...getCustomEvents(), ev]);

    cal.addEvent({
      id: `c-${ev.id}`,
      title: `${ev.title} · ${ev.asignatura}`,
      start: ev.iso,
      className: type==="examen" ? "event-examen" : "event-tarea",
      extendedProps: { kind:type, subj:subj }
    });

    $("#ev-title").value=""; $("#ev-date").value=""; $("#ev-time").value="";
  });

  // Filtro por asignatura
  $("#flt-cal").addEventListener("change", ()=>{
    const v = $("#flt-cal").value;
    cal.getEvents().forEach(ev=>{
      const show = !v || ev.extendedProps.subj===v;
      ev.setProp("display", show ? "auto" : "none");
    });
  });
}




// JS: reemplaza por completo la función
async function renderPerfil(){
  setTitle("Perfil");
  const perf = await api.getPerfil();
  const ini = ((perf.nombre||"").match(/\b\p{L}/gu)||[]).slice(0,2).join("").toUpperCase() || "A";

  mount(`
    <section class="profile-hero"
      style="background-image:
        linear-gradient(0deg, rgba(15,41,76,.80), rgba(15,41,76,.35)),
        url('${STATIC_URL}img/campus.jpg')">
      <div class="prof-avatar" aria-hidden="true">${ini}</div>
      <h2 class="prof-name">${perf.nombre}</h2>
      <div class="prof-username">${(perf.correo||"").split("@")[0]||"—"}</div>
      <div class="prof-meta">${perf.curso} · RUT ${perf.rut}</div>
    </section>

    <section class="prof-grid">
      <article class="prof-card">
        <h3 class="prof-title">Información básica</h3>
        <dl class="prof-dl">
          <div class="prof-row"><dt>Nombre completo</dt><dd>${perf.nombre}</dd></div>
          <div class="prof-row"><dt>Curso</dt><dd>${perf.curso}</dd></div>
          <div class="prof-row"><dt>RUT</dt><dd>${perf.rut}</dd></div>
          <div class="prof-row"><dt>Correo</dt><dd>${perf.correo}</dd></div>
          <div class="prof-row"><dt>Teléfono</dt><dd>${perf.telefono}</dd></div>
        </dl>
      </article>

      <article class="prof-card">
        <h3 class="prof-title">Información del apoderado</h3>
        <dl class="prof-dl">
          <div class="prof-row"><dt>Nombre</dt><dd>—</dd></div>
          <div class="prof-row"><dt>Parentesco</dt><dd>—</dd></div>
          <div class="prof-row"><dt>Teléfono</dt><dd>—</dd></div>
          <div class="prof-row"><dt>Correo</dt><dd>—</dd></div>
        </dl>
      </article>
    </section>
  `);
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

  const years = uniqueYearsFromMensualidades();
  if (!STATE.pagosYear) STATE.pagosYear = years[years.length-1];

  let selectedIds = new Set();

  const syncSelectionWithYear = () => {
    const valid = new Set(rowsByYear(STATE.pagosYear).map(r=>String(r.id)));
    selectedIds = new Set([...selectedIds].filter(id=>valid.has(id)));
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
      const ids = new Set(rowsSel.map(r=>String(r.id)));
      (DATA.mensualidades||[]).forEach(r=>{ if(ids.has(String(r.id))) r.pagada = true; });
      UI.Modal.hide();
      selectedIds.clear();
      paint();
    });
  };

  const paintToolbar = ()=>{
    const all = rowsByYear(STATE.pagosYear);
    const sel = all.filter(r=>selectedIds.has(String(r.id)));
    const total = sel.reduce((a,r)=>a+(Number(r.importe)||0),0);
    const host = $("#pay-toolbar");
    host.innerHTML = sel.length ? `
      <div class="card" style="position:sticky; bottom:0; z-index:5; border:1px dashed var(--border); background:var(--card)">
        <div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:.6rem">
          <div class="subtle"><b>${sel.length}</b> cuota(s) seleccionada(s)</div>
          <div class="row" style="gap:.5rem">
            <div class="subtle">Total a pagar: <b>${clp(total)}</b></div>
            <button class="btn btn-chip" id="btn-pay-selected">Pagar seleccionadas</button>
          </div>
        </div>
      </div>
    ` : "";
    if(sel.length) $("#btn-pay-selected")?.addEventListener("click", ()=>openPayModal(sel));
  };

  const paint = ()=>{
    syncSelectionWithYear();

    const y     = STATE.pagosYear;
    const sum   = resumenYear(y);
    const rows  = rowsByYear(y);

    mount(`
      <div class="page-header">
        <h2 style="display:flex;align-items:center;gap:.6rem">Portal de Pagos
          <small class="subtle" style="font-weight:600">· Sesión: <span id="pay-ttl">--:--</span></small>
        </h2>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap">
          <select id="pay-year" class="input" aria-label="Seleccionar año" style="min-width:120px">
            ${years.map(yr=>`<option value="${yr}" ${yr===y?"selected":""}>${yr}</option>`).join("")}
          </select>
          <button id="btn-select-pending" class="btn btn-secondary">Seleccionar todas</button>
          <button id="btn-clear-selection" class="btn btn-secondary">Limpiar</button>
          <button id="btn-export-csv" class="btn btn-secondary">Exportar CSV</button>
          <button id="pay-lock" class="btn btn-secondary">Bloquear</button>
        </div>
      </div>

      <section class="grid" style="margin-bottom:1rem">
        <div class="class-card"><div class="subtle">Saldo por pagar</div><div style="font-weight:800;font-size:1.7rem">${clp(sum.saldo)}</div></div>
        <div class="class-card"><div class="subtle">Cuotas pagadas</div><div style="font-weight:800;font-size:1.7rem">${sum.pagadas} / 12</div></div>
        <div class="class-card"><div class="subtle">Pendientes</div><div style="font-weight:800;font-size:1.7rem">${sum.pendientes}</div></div>
        <div class="class-card"><div class="subtle">Atrasadas</div><div style="font-weight:800;font-size:1.7rem">${sum.atrasadas}</div></div>
      </section>

      <div class="card">
        <h3 class="section-title" style="margin-bottom:.5rem">Detalle ${y}</h3>
        <div class="table-wrapper pay-scroll">
          <table class="pay-table pay-compact" id="tbl-pagos" aria-label="Detalle de pagos ${y}">
            <thead>
              <tr>
                <th style="width:42px;text-align:center">
                  <input id="chk-all" type="checkbox" aria-label="Seleccionar todas" />
                </th>
                <th style="width:18%">Mes</th>
                <th style="width:22%">Vencimiento</th>
                <th style="width:18%">Monto</th>
                <th style="width:16%">Estado</th>
                <th style="width:26%;text-align:right">Acciones</th>
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
                    <td><strong>${mesNombre(r.mes)}</strong></td>
                    <td>${fmtDate(r.fecha_vencimiento)}</td>
                    <td>${clp(r.importe)}</td>
                    <td>${tagHtml(st)}</td>
                    <td>
                      <div class="pay-actions">
                        <button class="btn btn-chip ${selectable?'':'btn-secondary'}" data-act="quickpay" ${selectable?'':'disabled'}>Pagar</button>
                        <button class="btn btn-chip btn-secondary" data-act="rcpt" ${r.pagada?'':'disabled'}>Comprobante</button>
                      </div>
                    </td>
                  </tr>
                `;
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

    // Año
    $("#pay-year")?.addEventListener("change", e=>{ STATE.pagosYear = Number(e.target.value); paint(); });

    // Exportar / bloquear
    $("#btn-export-csv")?.addEventListener("click", ()=>exportPagosCSV(STATE.pagosYear));
    $("#pay-lock")?.addEventListener("click", ()=>{ clearUnlock(); renderPagos(); });

    // Seleccionar pendientes + atrasadas
    $("#btn-select-pending")?.addEventListener("click", ()=>{
      rows.forEach(r=>{ const k=pagoEstado(r).key; if(k!=="paid") selectedIds.add(String(r.id)); });
      paint(); // repinta para refrescar checks y toolbar
    });

    // Limpiar
    $("#btn-clear-selection")?.addEventListener("click", ()=>{ selectedIds.clear(); paint(); });

    // Maestro
    $("#chk-all")?.addEventListener("change", (e)=>{
      if(e.target.checked){ rows.forEach(r=>{ if(!r.pagada) selectedIds.add(String(r.id)); }); }
      else { rows.forEach(r=> selectedIds.delete(String(r.id))); }
      paint();
    });

    // Checks fila
    $("#tbl-pagos")?.addEventListener("change", (e)=>{
      const chk = e.target.closest(".chk-pay");
      if(!chk) return;
      const id = chk.closest("tr")?.dataset?.id;
      if(!id) return;
      if(chk.checked) selectedIds.add(id); else selectedIds.delete(id);
      paintToolbar();
    });

    // Acciones
    $("#tbl-pagos")?.addEventListener("click", (e)=>{
      const btn = e.target.closest("button[data-act]");
      if(!btn) return;
      const tr = btn.closest("tr"); if(!tr) return;
      const id = tr.dataset.id;
      const row = rows.find(r=>String(r.id)===id);
      if(!row) return;

      if(btn.dataset.act==="quickpay" && !row.pagada) openPayModal([row]);
      if(btn.dataset.act==="rcpt" && row.pagada){
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

    // TTL
    const ttlSpan = $("#pay-ttl");
    if (ttlIntervalId) clearInterval(ttlIntervalId);
    const tick = ()=>{
      const left = getUnlockUntil() - Date.now();
      if (ttlSpan) ttlSpan.textContent = msToClock(left);
      if (left <= 0) { clearInterval(ttlIntervalId); ttlIntervalId = null; renderPagos(); }
    };
    tick();
    ttlIntervalId = setInterval(tick, 1000);

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

  $$(".menu a").forEach(a=>a.addEventListener("click",(e)=>{e.preventDefault();render(a.dataset.section);} ));

  $("#modal-close").addEventListener("click", UI.Modal.hide);
  $("#modal-ok").addEventListener("click", UI.Modal.hide);
  $("#modal .modal-backdrop").addEventListener("click", UI.Modal.hide);

  const hb = $("#btn-hamburger");
  const backdrop = $("#drawer-backdrop");
  if(hb){ hb.addEventListener("click", ()=>{ const open = document.documentElement.classList.contains("drawer-open"); open ? closeDrawer() : openDrawer(); }); }
  if(backdrop){ backdrop.addEventListener("click", closeDrawer); }
  document.addEventListener("keydown", (e)=>{ if(e.key==="Escape") closeDrawer(); });

  // ensureMenuAriaLabels ya existente
  ensureMenuAriaLabels();

  render("dashboard");
});
;
