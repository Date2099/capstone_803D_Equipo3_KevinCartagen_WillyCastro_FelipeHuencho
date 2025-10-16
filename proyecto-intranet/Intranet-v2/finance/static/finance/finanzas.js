// ===== Demo data (reemplaza por fetch a tu API) =====
const DATA = [
  {id:1, created_at:"2025-10-15 09:10", student_name:"Ana Díaz",  student_rut:"19.111.222-3", course_name:"8° Básico A",  period:"2025-09", amount_clp:35000, status:"PENDING",  method:"Transferencia", evidence_url:"#"},
  {id:2, created_at:"2025-10-15 10:05", student_name:"Luis Soto", student_rut:"20.333.444-5", course_name:"IV° Medio A",  period:"2025-09", amount_clp:35000, status:"APPROVED", method:"Webpay",       evidence_url:"#"},
  {id:3, created_at:"2025-10-14 17:21", student_name:"Paula Rey", student_rut:"17.555.666-7", course_name:"1° Básico A",  period:"2025-08", amount_clp:35000, status:"REJECTED", method:"Efectivo",     evidence_url:"#"},
  {id:4, created_at:"2025-10-12 12:00", student_name:"Mario Pino", student_rut:"18.777.888-9", course_name:"II° Medio A",  period:"2025-10", amount_clp:35000, status:"PENDING",  method:"Webpay",       evidence_url:"#"},
  {id:5, created_at:"2025-10-11 08:45", student_name:"Rosa León",  student_rut:"21.111.333-4", course_name:"7° Básico A",  period:"2025-10", amount_clp:35000, status:"APPROVED", method:"Transferencia", evidence_url:"#"},
];

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const fmtMoney = n => "$" + new Intl.NumberFormat("es-CL").format(n);
const label = s => s==="PENDING"?"Pendiente":s==="APPROVED"?"Aprobado":"Rechazado";
const badge = s => s==="PENDING"?"pending":s==="APPROVED"?"approved":"rejected";

const state = {
  q: "", status: "", method: "", month: "", sortK: "created_at", sortDir: "desc",
  page: 1, size: 20, sel: new Set()
};

init();

function init(){
  // Meses únicos
  const months = [...new Set(DATA.map(r=>r.period))].sort().reverse();
  const sel = $("#f-month");
  months.forEach(m=>{ const o=document.createElement("option"); o.value=m; o.textContent=m; sel.append(o); });

  // Paginación
  $("#pg-size").addEventListener("change", e=>{ state.size = +e.target.value; state.page = 1; render(); });
  $("#pg-prev").addEventListener("click", ()=>{ if(state.page>1){ state.page--; render(); }});
  $("#pg-next").addEventListener("click", ()=>{ state.page++; render(); });

  // Filtros
  $("#f-status").addEventListener("change", e=>{ state.status=e.target.value; state.page=1; render(); });
  $("#f-method").addEventListener("change", e=>{ state.method=e.target.value; state.page=1; render(); });
  $("#f-month").addEventListener("change",  e=>{ state.month= e.target.value; state.page=1; render(); });

  // Búsqueda con debounce
  let t; $("#f-q").addEventListener("input", e=>{
    clearTimeout(t); t=setTimeout(()=>{ state.q=e.target.value.trim().toLowerCase(); state.page=1; render(); }, 200);
  });

  // Orden
  $$(".th.sort").forEach(th=>{
    th.addEventListener("click", ()=>{
      const k = th.dataset.k;
      if(state.sortK===k){ state.sortDir = state.sortDir==="asc"?"desc":"asc"; }
      else { state.sortK = k; state.sortDir = "asc"; }
      render();
    });
  });

  // Export
  $("#btn-export").addEventListener("click", exportCSV);

  // Masivas
  $("#btn-approve-selected").addEventListener("click", ()=>bulkUpdate("APPROVED"));
  $("#btn-reject-selected").addEventListener("click",  ()=>bulkUpdate("REJECTED"));
  $("#cb-all").addEventListener("change", e=>{
    const rows = $$("#tbody .trow");
    if(e.target.checked){ rows.forEach(r=>state.sel.add(+r.dataset.id)); }
    else{ state.sel.clear(); }
    updateSelectionUI();
  });

  render();
}

function filtered(){
  return DATA.filter(r=>{
    if(state.status && r.status!==state.status) return false;
    if(state.method && r.method!==state.method) return false;
    if(state.month  && r.period!==state.month)  return false;
    if(state.q){
      const hay = `${r.student_name} ${r.student_rut} ${r.course_name}`.toLowerCase();
      if(!hay.includes(state.q)) return false;
    }
    return true;
  }).sort((a,b)=>{
    const k = state.sortK, dir = state.sortDir==="asc"?1:-1;
    return (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * dir;
  });
}

function render(){
  const all = filtered();
  const total = all.length;
  const start = (state.page-1)*state.size;
  const pageRows = all.slice(start, start+state.size);

  // KPIs
  const mes = state.month || (all[0]?.period ?? "");
  const delMes = all.filter(r=>r.period===mes && r.status==="APPROVED").reduce((s,r)=>s+r.amount_clp,0);
  $("#kpi-ingresos").textContent = fmtMoney(delMes);
  $("#kpi-ingresos-nota").textContent = mes?`Periodo ${mes}`:"—";
  $("#kpi-pend").textContent = all.filter(r=>r.status==="PENDING").length;
  $("#kpi-apr").textContent  = all.filter(r=>r.status==="APPROVED").length;
  $("#kpi-rej").textContent  = all.filter(r=>r.status==="REJECTED").length;

  // Tabla
  const tbody = $("#tbody");
  tbody.innerHTML = "";
  $("#empty").hidden = total>0;

  const tpl = $("#row-tpl").content;
  pageRows.forEach(r=>{
    const n = tpl.cloneNode(true);
    const row = n.querySelector(".trow"); row.dataset.id = r.id;

    n.querySelector('[data-k="created_at"]').textContent = r.created_at;
    n.querySelector('[data-k="student_name"]').textContent= r.student_name;
    n.querySelector('[data-k="course_name"]').textContent = r.course_name;
    n.querySelector('[data-k="period"]').textContent     = r.period;
    n.querySelector('[data-k="amount_fmt"]').textContent = fmtMoney(r.amount_clp);
    const b = n.querySelector('[data-k="status_label"]');
    b.textContent = label(r.status); b.classList.add(badge(r.status));

    const a = n.querySelector(".btn-voucher"); a.href = r.evidence_url || "#";
    const bOk = n.querySelector(".approve");
    const bNo = n.querySelector(".reject");
    bOk.disabled = r.status!=="PENDING"; bNo.disabled = r.status!=="PENDING";
    bOk.addEventListener("click", ()=>updateStatus(r.id,"APPROVED"));
    bNo.addEventListener("click", ()=>updateStatus(r.id,"REJECTED"));

    const cb = n.querySelector(".cb-row");
    cb.checked = state.sel.has(r.id);
    cb.addEventListener("change", e=>{
      if(e.target.checked) state.sel.add(r.id); else state.sel.delete(r.id);
      updateSelectionUI();
    });

    tbody.append(n);
  });

  // Paginación
  $("#page-total").textContent = total;
  $("#page-start").textContent = total? start+1 : 0;
  $("#page-end").textContent   = Math.min(start+state.size, total);
  const pages = Math.max(1, Math.ceil(total/state.size));
  $("#pg-info").textContent = `${state.page} / ${pages}`;
  $("#pg-prev").disabled = state.page<=1;
  $("#pg-next").disabled = state.page>=pages;

  updateSelectionUI();
}

function updateStatus(id,to){
  const i = DATA.findIndex(x=>x.id===id);
  if(i<0) return;
  DATA[i].status = to;
  toast(to==="APPROVED"?"Pago aprobado":"Pago rechazado");
  render();
}

function bulkUpdate(to){
  if(state.sel.size===0) return;
  DATA.forEach(r=>{ if(state.sel.has(r.id) && r.status==="PENDING") r.status=to; });
  toast(`${state.sel.size} registro(s) ${to==="APPROVED"?"aprobado(s)":"rechazado(s)"}`);
  state.sel.clear();
  $("#cb-all").checked = false;
  render();
}

function updateSelectionUI(){
  $("#sel-count").textContent = `${state.sel.size} seleccionados`;
}

function exportCSV(){
  const rows = filtered();
  const header = ["Fecha","Alumno","RUT","Curso","Periodo","Monto","Estado","Método"];
  const body = rows.map(r=>[r.created_at,r.student_name,r.student_rut,r.course_name,r.period,fmtMoney(r.amount_clp),label(r.status),r.method]);
  const csv = [header,...body].map(a=>a.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob([csv],{type:"text/csv;charset=utf-8;"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "finanzas_pagos.csv";
  a.click();
}

function toast(msg){
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"), 1600);
}
