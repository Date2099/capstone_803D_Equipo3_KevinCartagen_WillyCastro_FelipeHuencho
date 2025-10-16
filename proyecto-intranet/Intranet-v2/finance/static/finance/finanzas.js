// Demo data
const DATA = [
  {id:1, created_at:"2025-10-15 09:10", student_name:"Ana Díaz",  student_rut:"19.111.222-3", course_name:"8° Básico A",  period:"2025-09", amount_clp:35000, status:"PENDING",  method:"Transferencia", evidence_url:"#"},
  {id:2, created_at:"2025-10-15 10:05", student_name:"Luis Soto", student_rut:"20.333.444-5", course_name:"IV° Medio A",  period:"2025-09", amount_clp:35000, status:"APPROVED", method:"Webpay",       evidence_url:"#"},
  {id:3, created_at:"2025-10-14 17:21", student_name:"Paula Rey", student_rut:"17.555.666-7", course_name:"1° Básico A",  period:"2025-08", amount_clp:35000, status:"REJECTED", method:"Efectivo",     evidence_url:"#"},
  {id:4, created_at:"2025-10-12 12:00", student_name:"Mario Pino", student_rut:"18.777.888-9", course_name:"II° Medio A",  period:"2025-10", amount_clp:35000, status:"PENDING",  method:"Webpay",       evidence_url:"#"},
  {id:5, created_at:"2025-10-11 08:45", student_name:"Rosa León",  student_rut:"21.111.333-4", course_name:"7° Básico A",  period:"2025-10", amount_clp:35000, status:"APPROVED", method:"Transferencia", evidence_url:"#"},
];

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const money = n => "$" + new Intl.NumberFormat("es-CL").format(n);
const label = s => s==="PENDING"?"Pendiente":s==="APPROVED"?"Aprobado":"Rechazado";
const bclass = s => s==="PENDING"?"pending":s==="APPROVED"?"approved":"rejected";

init();

function init(){
  // Sidebar toggle (opcional)
  $("#btn-toggle")?.addEventListener("click", ()=> document.body.classList.toggle("nav-collapsed"));

  // KPIs
  updateKPIs();

  // Tabla
  renderTable();

  // Filtros
  $("#f-status").addEventListener("change", renderTable);
  $("#f-q").addEventListener("input", debounce(renderTable, 200));

  // Export
  $("#btn-export").addEventListener("click", exportCSV);
}

function filtered(){
  const status = $("#f-status").value;
  const q = $("#f-q").value.trim().toLowerCase();
  return DATA.filter(r=>{
    if(status && r.status!==status) return false;
    if(q){
      const hay = `${r.student_name} ${r.student_rut} ${r.course_name}`.toLowerCase();
      if(!hay.includes(q)) return false;
    }
    return true;
  });
}

function renderTable(){
  const rows = filtered();
  const tb = $("#tbody");
  tb.innerHTML = "";
  const tpl = $("#row-tpl").content;

  rows.forEach(r=>{
    const n = tpl.cloneNode(true);
    n.querySelector('[data-k="created_at"]').textContent = r.created_at;
    n.querySelector('[data-k="student_name"]').textContent= r.student_name;
    n.querySelector('[data-k="course_name"]').textContent = r.course_name;
    n.querySelector('[data-k="period"]').textContent     = r.period;
    n.querySelector('[data-k="amount_fmt"]').textContent = money(r.amount_clp);

    const b = n.querySelector('[data-k="status_label"]');
    b.textContent = label(r.status);
    b.classList.add(bclass(r.status));

    const a = n.querySelector(".btn-voucher");
    a.href = r.evidence_url || "#";

    const ok = n.querySelector(".approve");
    const no = n.querySelector(".reject");
    ok.disabled = r.status!=="PENDING";
    no.disabled = r.status!=="PENDING";
    ok.addEventListener("click", ()=>updateStatus(r.id,"APPROVED"));
    no.addEventListener("click", ()=>updateStatus(r.id,"REJECTED"));

    tb.append(n);
  });
}

function updateStatus(id,to){
  const i = DATA.findIndex(x=>x.id===id);
  if(i<0) return;
  DATA[i].status = to;
  updateKPIs();
  renderTable();
}

function updateKPIs(){
  const periodo = DATA[0]?.period ?? "—";
  $("#kpi-periodo").textContent = `Periodo ${periodo}`;
  $("#kpi-pend").textContent = DATA.filter(r=>r.status==="PENDING").length;
  $("#kpi-apr").textContent  = DATA.filter(r=>r.status==="APPROVED").length;
  $("#kpi-rej").textContent  = DATA.filter(r=>r.status==="REJECTED").length;
  const ingresos = DATA.filter(r=>r.status==="APPROVED").reduce((s,r)=>s+r.amount_clp,0);
  $("#kpi-ingresos").textContent = money(ingresos);
}

function exportCSV(){
  const rows = filtered();
  const header = ["Fecha","Alumno","RUT","Curso","Periodo","Monto","Estado","Método"];
  const body = rows.map(r=>[r.created_at,r.student_name,r.student_rut,r.course_name,r.period,money(r.amount_clp),label(r.status),r.method]);
  const csv = [header,...body].map(a=>a.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob([csv],{type:"text/csv;charset=utf-8;"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "reporte_finanzas.csv";
  a.click();
}

function debounce(fn,ms){let t;return (...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms);};}
