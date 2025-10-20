/* =========================================================
   FINANZAS · San Agustín — JS sin optional chaining (compat)
========================================================= */

/* ===== Datos demo (Dashboard) ===== */
const DATA = [
  {id:1, created_at:"2025-10-15 09:10", student_name:"Ana Díaz",  student_rut:"19.111.222-3", course_name:"8° Básico A",  period:"2025-09", amount_clp:35000, status:"PENDING",  method:"Transferencia", evidence_url:"#"},
  {id:2, created_at:"2025-10-15 10:05", student_name:"Luis Soto", student_rut:"20.333.444-5", course_name:"IV° Medio A",  period:"2025-09", amount_clp:35000, status:"APPROVED", method:"Webpay",       evidence_url:"#"},
  {id:3, created_at:"2025-10-14 17:21", student_name:"Paula Rey", student_rut:"17.555.666-7", course_name:"1° Básico A",  period:"2025-08", amount_clp:35000, status:"REJECTED", method:"Efectivo",     evidence_url:"#"},
  {id:4, created_at:"2025-10-12 12:00", student_name:"Mario Pino", student_rut:"18.777.888-9", course_name:"II° Medio A",  period:"2025-10", amount_clp:35000, status:"PENDING",  method:"Webpay",       evidence_url:"#"},
  {id:5, created_at:"2025-10-11 08:45", student_name:"Rosa León",  student_rut:"21.111.333-4", course_name:"7° Básico A",  period:"2025-10", amount_clp:35000, status:"APPROVED", method:"Transferencia", evidence_url:"#"},
];

/* ===== Datos demo adicionales ===== */
const INCOME_DATA = [
  {id:101, date:"2025-10-05 10:10", student:"Pedro Muñoz", rut:"18.222.333-4", course:"II° Medio A", method:"Webpay",        period:"2025-10", amount:35000},
  {id:102, date:"2025-10-04 08:30", student:"Camila Rivas", rut:"17.111.999-8", course:"8° Básico A", method:"Transferencia", period:"2025-10", amount:35000},
  {id:103, date:"2025-09-28 12:05", student:"Ignacio Soto", rut:"16.888.777-6", course:"IV° Medio A", method:"Webpay",        period:"2025-09", amount:35000},
];
const EXPENSE_DATA = [
  {id:201, date:"2025-10-03", vendor:"Tecno SA",   memo:"Licencias software",          cc:"TI",              doc:"FA-001223", amount:1200000},
  {id:202, date:"2025-10-02", vendor:"Luz Centro", memo:"Electricidad Campus",         cc:"Servicios",       doc:"FC-88912",  amount:430000},
  {id:203, date:"2025-09-29", vendor:"Papelería",  memo:"Útiles administrativos",      cc:"Administración",  doc:"BO-5521",   amount:98000},
];

/* ===== Util ===== */
var $  = function(s){ return document.querySelector(s); };
var $$ = function(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); };
function on(el, ev, fn){ if(el) el.addEventListener(ev, fn); }
function money(n){ return "$" + new Intl.NumberFormat("es-CL").format(n); }
function label(s){ return s==="PENDING"?"Pendiente":s==="APPROVED"?"Aprobado":"Rechazado"; }
function bclass(s){ return s==="PENDING"?"pending":s==="APPROVED"?"approved":"rejected"; }
function debounce(fn,ms){ var t; return function(){ var a=arguments; clearTimeout(t); t=setTimeout(function(){ fn.apply(null,a); }, ms); }; }

/* ===== Estado Dashboard ===== */
var state = { q:"", status:"", method:"", month:"", sortK:"created_at", sortDir:"desc", page:1, size:20, sel:new Set() };

/* ===== Init ===== */
init();
function init(){
  on($("#btn-toggle"), "click", function(){ document.body.classList.toggle("nav-collapsed"); });

  // Meses en selector
  var months=[].concat(new Set(DATA.map(function(r){return r.period;}))).sort().reverse();
  var selM=$("#f-month");
  if(selM && selM.options.length===1){
    months.forEach(function(m){ var o=document.createElement("option"); o.value=m; o.textContent=m; selM.appendChild(o); });
  }

  on($("#f-status"), "change", function(e){ state.status=e.target.value; state.page=1; render(); });
  on($("#f-method"), "change", function(e){ state.method=e.target.value; state.page=1; render(); });
  on($("#f-month"),  "change", function(e){ state.month =e.target.value; state.page=1; render(); });
  on($("#f-q"), "input", debounce(function(e){ state.q=(e.target.value||"").trim().toLowerCase(); state.page=1; render(); },200));

  $$(".th.sort").forEach(function(th){
    on(th,"click",function(){
      var k=th.getAttribute("data-k");
      if(state.sortK===k) state.sortDir = state.sortDir==="asc"?"desc":"asc";
      else { state.sortK=k; state.sortDir="asc"; }
      render();
    });
  });

  on($("#pg-size"), "change", function(e){ state.size=+e.target.value; state.page=1; render(); });
  on($("#pg-prev"), "click", function(){ if(state.page>1){ state.page--; render(); }});
  on($("#pg-next"), "click", function(){ state.page++; render(); });

  on($("#cb-all"), "change", function(e){
    var rows=$$("#tbody .trow");
    if(e.target.checked){ rows.forEach(function(r){ state.sel.add(+r.dataset.id); }); }
    else { state.sel.clear(); }
    updateSelUI();
  });
  on($("#btn-approve-selected"), "click", function(){ bulkUpdate("APPROVED"); });
  on($("#btn-reject-selected"),  "click", function(){ bulkUpdate("REJECTED"); });

  on($("#btn-export"),  "click", exportCSV);
  on($("#btn-export-2"),"click", exportCSV);

  document.addEventListener("keydown", function(e){
    var mac = (navigator.platform||"").toUpperCase().indexOf("MAC")>=0;
    var mod = mac? e.metaKey : e.ctrlKey;
    if(!mod) return;
    if((e.key||"").toLowerCase()==="k"){ e.preventDefault(); var q=$("#f-q"); if(q) q.focus(); }
    if(e.key==="ArrowUp"||e.key==="ArrowDown"){
      e.preventDefault();
      var order=["created_at","student_name","course_name","period","amount_clp","status"];
      var i=(order.indexOf(state.sortK)+(e.key==="ArrowDown"?1:-1)+order.length)%order.length;
      state.sortK=order[i]; state.sortDir="asc"; render();
    }
    if((e.key||"").toLowerCase()==="a"){
      e.preventDefault(); $$("#tbody .trow").forEach(function(r){ state.sel.add(+r.dataset.id); }); updateSelUI();
    }
  });

  document.addEventListener("pointerdown", function(e){
    var btn=e.target.closest && e.target.closest(".btn"); if(!btn) return;
    btn.classList.add("press"); setTimeout(function(){ btn.classList.remove("press"); },180);
  });

  setupRouter();
  render();
}

/* ===== Router lateral ===== */
function setupRouter(){
  var SECTION_IDS={dashboard:"sec-dashboard", ingresos:"sec-ingresos", gastos:"sec-gastos", reportes:"sec-reportes"};

  function switchSection(sec){
    $$("#side .item").forEach(function(i){ i.classList.toggle("active", i.dataset.section===sec); });
    $$(".view").forEach(function(v){ v.classList.remove("is-visible"); });
    var id = SECTION_IDS[sec] || SECTION_IDS.dashboard;
    var view = document.getElementById(id);
    if(view) view.classList.add("is-visible");

    if(sec==="ingresos") renderIngresos();
    if(sec==="gastos")   renderGastos();
    if(sec==="reportes") renderReportes();
  }

  var saved = localStorage.getItem("finz.section") || "dashboard";
  switchSection(saved);

  $$("#side .item").forEach(function(a){
    a.setAttribute("role","button");
    on(a,"click",function(e){
      e.preventDefault();
      e.stopPropagation();
      var sec = a.dataset.section;
      switchSection(sec);
      localStorage.setItem("finz.section", sec);
    });
    on(a,"keydown",function(e){
      if(e.key==="Enter"||e.key===" "){ e.preventDefault(); a.click(); }
    });
  });

  if(saved==="ingresos") renderIngresos();
  if(saved==="gastos")   renderGastos();
  if(saved==="reportes") renderReportes();
}

/* ===== Dashboard: filtros ===== */
function filtered(){
  return DATA.filter(function(r){
    if(state.status && r.status!==state.status) return false;
    if(state.method && r.method!==state.method) return false;
    if(state.month  && r.period!==state.month)  return false;
    if(state.q){
      var hay=(r.student_name+" "+r.student_rut+" "+r.course_name).toLowerCase();
      if(hay.indexOf(state.q)===-1) return false;
    }
    return true;
  }).sort(function(a,b){
    var k=state.sortK, dir=state.sortDir==="asc"?1:-1;
    return (a[k]>b[k]?1:a[k]<b[k]?-1:0)*dir;
  });
}

/* ===== Dashboard: render principal ===== */
function render(){
  showSkeleton(true);
  requestAnimationFrame(function(){
    var all=filtered();
    var total=all.length;
    var start=(state.page-1)*state.size;
    var pageRows=all.slice(start,start+state.size);

    var currentMonth = new Date().toISOString().slice(0,7);
    var periodo = state.month || currentMonth;
    var p = $("#kpi-periodo"); if(p) p.textContent="Periodo "+periodo;
    var kp=$("#kpi-pend"); if(kp) kp.textContent = all.filter(function(r){return r.status==="PENDING";}).length;
    var ka=$("#kpi-apr");  if(ka) ka.textContent = all.filter(function(r){return r.status==="APPROVED";}).length;
    var kr=$("#kpi-rej");  if(kr) kr.textContent = all.filter(function(r){return r.status==="REJECTED";}).length;
    var ingresos = DATA.filter(function(r){return r.status==="APPROVED" && r.period===periodo;})
                       .reduce(function(s,r){return s+r.amount_clp;},0);
    var ki=$("#kpi-ingresos"); if(ki) ki.textContent=money(ingresos);

    var tbody=$("#tbody"); if(tbody){ tbody.innerHTML=""; }
    var empty=$("#empty"); if(empty) empty.hidden = total>0 ? true : false;

    var tpl=$("#row-tpl"); tpl = tpl ? tpl.content : null;
    if(tpl && tbody){
      pageRows.forEach(function(r){
        var n=tpl.cloneNode(true);
        var row=n.querySelector(".trow"); row.dataset.id=r.id;

        n.querySelector('[data-k="created_at"]').textContent=r.created_at;
        n.querySelector('[data-k="student_name"]').textContent=r.student_name;
        n.querySelector('[data-k="course_name"]').textContent=r.course_name;
        n.querySelector('[data-k="method"]').textContent=r.method;
        n.querySelector('[data-k="period"]').textContent=r.period;
        n.querySelector('[data-k="amount_fmt"]').textContent=money(r.amount_clp);

        var b=n.querySelector('[data-k="status_label"]');
        b.textContent=label(r.status); b.classList.add(bclass(r.status));

        var a=n.querySelector(".btn-voucher"); a.href=r.evidence_url||"#";

        var ok=n.querySelector(".approve"); var no=n.querySelector(".reject");
        ok.disabled=r.status!=="PENDING"; no.disabled=r.status!=="PENDING";
        on(ok,"click",function(){ updateStatus(r.id,"APPROVED"); });
        on(no,"click",function(){ updateStatus(r.id,"REJECTED"); });

        var cb=n.querySelector(".cb-row");
        cb.checked=state.sel.has(r.id);
        on(cb,"change",function(e){
          if(e.target.checked) state.sel.add(r.id); else state.sel.delete(r.id);
          updateSelUI();
        });

        tbody.appendChild(n);
      });
    }

    var pt=$("#page-total"); if(pt) pt.textContent = total;
    var ps=$("#page-start"); if(ps) ps.textContent = total? start+1 : 0;
    var pe=$("#page-end");   if(pe) pe.textContent = Math.min(start+state.size,total);
    var pages=Math.max(1,Math.ceil(total/state.size));
    if(state.page>pages) state.page=pages;
    var pgi=$("#pg-info"); if(pgi) pgi.textContent = state.page+" / "+pages;
    var prv=$("#pg-prev"); if(prv) prv.disabled = state.page<=1;
    var nxt=$("#pg-next"); if(nxt) nxt.disabled = state.page>=pages;

    var cball=$("#cb-all");
    if(cball) cball.checked = pageRows.length && pageRows.every(function(r){ return state.sel.has(r.id); });

    updateSelUI();
    showSkeleton(false);
  });
}

/* ===== Dashboard: acciones ===== */
function updateStatus(id,to){
  var i=DATA.findIndex(function(x){return x.id===id;}); if(i<0) return;
  if(DATA[i].status===to) return;
  if(!confirm((to==="APPROVED"?"Aprobar":"Rechazar")+" pago de "+DATA[i].student_name+"?")) return;
  DATA[i].status=to;
  toast(to==="APPROVED"?"Pago aprobado":"Pago rechazado");
  render();
}
function bulkUpdate(to){
  if(state.sel.size===0) return;
  if(!confirm((to==="APPROVED"?"Aprobar":"Rechazar")+" "+state.sel.size+" seleccionado(s)?")) return;
  var c=0; DATA.forEach(function(r){ if(state.sel.has(r.id)&&r.status==="PENDING"){ r.status=to; c++; }});
  toast(c+" registro(s) "+(to==="APPROVED"?"aprobado(s)":"rechazado(s)"));
  state.sel.clear(); var cb=$("#cb-all"); if(cb) cb.checked=false; render();
}
function updateSelUI(){ var sc=$("#sel-count"); if(sc) sc.textContent=state.sel.size+" seleccionados"; }
function exportCSV(){
  var rows=filtered();
  var header=["Fecha","Alumno","RUT","Curso","Periodo","Monto","Estado","Método"];
  var body=rows.map(function(r){ return [r.created_at,r.student_name,r.student_rut,r.course_name,r.period,money(r.amount_clp),label(r.status),r.method]; });
  csvDownload("reporte_finanzas.csv",[header].concat(body));
}

/* ===== Ingresos (demo) ===== */
function renderIngresos(){
  var months=[].concat(new Set(INCOME_DATA.map(function(r){return r.period;}))).sort().reverse();
  var sel=$("#ing-month");
  if(sel && sel.options.length===1){ months.forEach(function(m){ var o=document.createElement("option"); o.value=m; o.textContent=m; sel.appendChild(o); }); }

  var q = ( ($("#ing-q")||{}).value || "" ).toLowerCase();
  var month = (sel&&sel.value) || "";
  var rows = INCOME_DATA.filter(function(r){
    if(month && r.period!==month) return false;
    if(q){
      var hay=(r.student+" "+r.rut+" "+r.course).toLowerCase();
      if(hay.indexOf(q)===-1) return false;
    }
    return true;
  });

  var tb=$("#ing-tbody"); if(!tb) return;
  tb.innerHTML = rows.map(function(r){
    return '<div class="trow">'+
      '<span>'+r.date+'</span>'+
      '<span>'+r.student+'</span>'+
      '<span>'+r.course+'</span>'+
      '<span>'+r.method+'</span>'+
      '<span>'+r.period+'</span>'+
      '<span class="mono">'+money(r.amount)+'</span>'+
    '</div>';
  }).join("");

  on($("#ing-export"), "click", function(){
    var header=["Fecha","Alumno","Curso","Método","Periodo","Monto"];
    var body = rows.map(function(r){ return [r.date,r.student,r.course,r.method,r.period,money(r.amount)]; });
    csvDownload("ingresos_demo.csv",[header].concat(body));
  });

  on($("#ing-q"), "input", debounce(renderIngresos,200));
  on($("#ing-month"), "change", renderIngresos);
}

/* ===== Gastos (demo) ===== */
function renderGastos(){
  var ccs=[].concat(new Set(EXPENSE_DATA.map(function(r){return r.cc;}))).sort();
  var sel=$("#gas-cc");
  if(sel && sel.options.length===1){ ccs.forEach(function(c){ var o=document.createElement("option"); o.value=c; o.textContent=c; sel.appendChild(o); }); }

  var q = ( ($("#gas-q")||{}).value || "" ).toLowerCase();
  var cc = (sel&&sel.value) || "";
  var rows = EXPENSE_DATA.filter(function(r){
    if(cc && r.cc!==cc) return false;
    if(q){
      var hay=(r.vendor+" "+r.memo).toLowerCase();
      if(hay.indexOf(q)===-1) return false;
    }
    return true;
  });

  var tb=$("#gas-tbody"); if(!tb) return;
  tb.innerHTML = rows.map(function(r){
    return '<div class="trow">'+
      '<span>'+r.date+'</span>'+
      '<span>'+r.vendor+'</span>'+
      '<span>'+r.memo+'</span>'+
      '<span>'+r.cc+'</span>'+
      '<span>'+r.doc+'</span>'+
      '<span class="mono">'+money(r.amount)+'</span>'+
    '</div>';
  }).join("");

  on($("#gas-export"), "click", function(){
    var header=["Fecha","Proveedor","Glosa","Centro de Costo","Documento","Monto"];
    var body = rows.map(function(r){ return [r.date,r.vendor,r.memo,r.cc,r.doc,money(r.amount)]; });
    csvDownload("gastos_demo.csv",[header].concat(body));
  });

  on($("#gas-q"), "input", debounce(renderGastos,200));
  on($("#gas-cc"), "change", renderGastos);
}

/* ===== Reportes (resumen demo) ===== */
function renderReportes(){
  var months=[].concat(new Set([].concat(INCOME_DATA.map(function(r){return r.period;}), DATA.map(function(r){return r.period;})))).sort().reverse();
  var msel=$("#rep-month"); 
  if(msel && msel.options.length===1){ months.forEach(function(m){ var o=document.createElement("option"); o.value=m; o.textContent=m; msel.appendChild(o); }); }
  var m = (msel&&msel.value) || months[0] || "";

  var ing = INCOME_DATA.filter(function(r){ return !m || r.period===m; }).reduce(function(s,r){return s+r.amount;},0);
  var gas = EXPENSE_DATA.reduce(function(s,r){return s+r.amount;},0);
  var ri=$("#rep-ing"); if(ri) ri.textContent = money(ing);
  var rg=$("#rep-gas"); if(rg) rg.textContent = money(gas);
  var rr=$("#rep-res"); if(rr) rr.textContent = money(ing-gas);
  var rt=$("#rep-tx");  if(rt) rt.textContent = INCOME_DATA.length + EXPENSE_DATA.length;

  on($("#rep-month"), "change", renderReportes);

  on($("#rep-export"), "click", function(){
    var type=$("#rep-type").value;
    var rows=[["#","Tipo","Fecha","Persona/Proveedor","Detalle","Periodo","Monto"]];
    if(type==="all"||type==="ing"){
      INCOME_DATA.forEach(function(r){ rows.push([r.id,"Ingreso",r.date,r.student,r.method,r.period,money(r.amount)]); });
    }
    if(type==="all"||type==="gas"){
      EXPENSE_DATA.forEach(function(r){ rows.push([r.id,"Gasto",r.date,r.vendor,r.memo,"-",money(r.amount)]); });
    }
    csvDownload("reporte_finanzas_demo.csv",rows);
  });
}

/* ===== Helpers UI ===== */
function csvDownload(filename, rows){
  var csv=rows.map(function(a){ return a.map(function(x){ return '"' + String(x).replace(/"/g,'""') + '"'; }).join(","); }).join("\n");
  var blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
  var a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=filename; a.click();
}
function toast(msg){ var t=$("#toast"); if(!t) return; t.textContent=msg; t.classList.add("show"); setTimeout(function(){ t.classList.remove("show"); },1500); }
function showSkeleton(v){ var s=$("#skeleton"); if(!s) return; s.hidden = !v; }
