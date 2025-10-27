// static/finance/finanzas.js
// Dashboard tipo LIRMI + móvil + tema

var DATA = [
  {id:1, created_at:"2025-10-15 09:10", student_name:"Ana Díaz",  student_rut:"19.111.222-3", course_name:"8° Básico A",  period:"2025-09", amount_clp:35000, status:"PENDING",  method:"Transferencia", evidence_url:"#"},
  {id:2, created_at:"2025-10-15 10:05", student_name:"Luis Soto", student_rut:"20.333.444-5", course_name:"IV° Medio A",  period:"2025-09", amount_clp:35000, status:"APPROVED", method:"Webpay",       evidence_url:"#"},
  {id:3, created_at:"2025-10-14 17:21", student_name:"Paula Rey", student_rut:"17.555.666-7", course_name:"1° Básico A",  period:"2025-08", amount_clp:35000, status:"REJECTED", method:"Efectivo",     evidence_url:"#"},
  {id:4, created_at:"2025-10-12 12:00", student_name:"Mario Pino", student_rut:"18.777.888-9", course_name:"II° Medio A",  period:"2025-10", amount_clp:35000, status:"PENDING",  method:"Webpay",       evidence_url:"#"},
  {id:5, created_at:"2025-10-11 08:45", student_name:"Rosa León",  student_rut:"21.111.333-4", course_name:"7° Básico A",  period:"2025-10", amount_clp:35000, status:"APPROVED", method:"Transferencia", evidence_url:"#"},
];
var INCOME_DATA = [
  {id:101, date:"2025-10-05 10:10", student:"Pedro Muñoz", rut:"18.222.333-4", course:"II° Medio A", method:"Webpay",        period:"2025-10", amount:35000},
  {id:102, date:"2025-10-04 08:30", student:"Camila Rivas", rut:"17.111.999-8", course:"8° Básico A", method:"Transferencia", period:"2025-10", amount:35000},
  {id:103, date:"2025-09-28 12:05", student:"Ignacio Soto", rut:"16.888.777-6", course:"IV° Medio A", method:"Webpay",        period:"2025-09", amount:35000},
];
var EXPENSE_DATA = [
  {id:201, date:"2025-10-03", vendor:"Tecno SA",   memo:"Licencias software",     cc:"TI",             doc:"FA-001223", amount:1200000},
  {id:202, date:"2025-10-02", vendor:"Luz Centro", memo:"Electricidad Campus",    cc:"Servicios",      doc:"FC-88912",  amount:430000},
  {id:203, date:"2025-09-29", vendor:"Papelería",  memo:"Útiles administrativos", cc:"Administración", doc:"BO-5521",   amount:98000},
];
var MOROSIDAD_NIVELES = [
  {nivel:"Preescolar",   pct:10},
  {nivel:"Primaria",     pct:16},
  {nivel:"Secundaria",   pct:14},
  {nivel:"Bachillerato", pct:12},
];

var $  = function(s){ return document.querySelector(s); };
var $$ = function(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); };
function on(el,ev,fn){ if(el) el.addEventListener(ev,fn); }
function money(n){ return "$" + new Intl.NumberFormat("es-CL").format(n); }
function label(s){ return s==="PENDING"?"Pendiente":s==="APPROVED"?"Aprobado":"Rechazado"; }
function bclass(s){ return s==="PENDING"?"pending":s==="APPROVED"?"approved":"rejected"; }
function debounce(fn,ms){ var t; return function(){ var a=arguments; clearTimeout(t); t=setTimeout(function(){ fn.apply(null,a); },ms); }; }
function toast(msg){ var t=$("#toast"); if(!t) return; t.textContent=msg; t.classList.add("show"); setTimeout(function(){ t.classList.remove("show"); },1500); }
function showSkeleton(v){ var s=$("#skeleton"); if(s) s.hidden = !v; }
function countUp(el, to, fmt){
  if(!el) return; var start = +el.getAttribute("data-value")||0; var dur=350; var t0=performance.now();
  function step(t){ var p=Math.min(1,(t-t0)/dur); var val = Math.round(start + (to-start)*p);
    el.textContent = fmt? fmt(val) : String(val); if(p<1) requestAnimationFrame(step); else el.setAttribute("data-value", to);
  } requestAnimationFrame(step);
}

var state = { q:"", status:"", method:"", month:"", sortK:"created_at", sortDir:"desc", page:1, size:20, sel:new Set() };

init();

function init(){
  // Drawer móvil
  var burger = $("#btn-toggle");
  on(burger,"click",function(){
    var open = !document.body.classList.contains("nav-open");
    document.body.classList.toggle("nav-open", open);
    var bd = $("#drawerBackdrop");
    if(bd){ bd.hidden = !open; bd.classList.toggle("show", open); }
  });
  var backdrop = $("#drawerBackdrop");
  on(backdrop,"click",function(){ document.body.classList.remove("nav-open"); backdrop.classList.remove("show"); backdrop.hidden=true; });
  on(document,"keydown",function(e){
    if(e.key==="Escape" && document.body.classList.contains("nav-open")){
      document.body.classList.remove("nav-open");
      if(backdrop){ backdrop.classList.remove("show"); backdrop.hidden=true; }
    }
  });

  // Tema
  on($("#btn-theme"),"click",function(){
    var dark = !document.body.classList.contains("theme-dark");
    document.body.classList.toggle("theme-dark", dark);
    localStorage.setItem("finz.theme", dark?"1":"0");
  });
  if(localStorage.getItem("finz.theme")==="1") document.body.classList.add("theme-dark");

  // Meses
  var months = Array.from(new Set(DATA.map(function(r){return r.period;}))).sort().reverse();
  var selM=$("#f-month");
  if(selM && selM.options.length===1){ months.forEach(function(m){ var o=document.createElement("option"); o.value=m; o.textContent=m; selM.appendChild(o); }); }

  // Filtros
  on($("#f-status"),"change",function(e){ state.status=e.target.value; state.page=1; render(); });
  on($("#f-method"),"change",function(e){ state.method=e.target.value; state.page=1; render(); });
  on($("#f-month"), "change",function(e){ state.month =e.target.value;  state.page=1; render(); });
  on($("#f-q"),     "input", debounce(function(e){ state.q=(e.target.value||"").trim().toLowerCase(); state.page=1; render(); },180));

  // Orden
  $$(".th.sort").forEach(function(th){
    on(th,"click",function(){
      var k = th.getAttribute("data-k");
      if(state.sortK===k) state.sortDir = state.sortDir==="asc"?"desc":"asc";
      else { state.sortK=k; state.sortDir="asc"; }
      render();
    });
  });

  // Paginación
  on($("#pg-size"),"change",function(e){ state.size=+e.target.value; state.page=1; render(); });
  on($("#pg-prev"),"click",function(){ if(state.page>1){ state.page--; render(); }});
  on($("#pg-next"),"click",function(){ state.page++; render(); });

  // Masivos
  on($("#cb-all"),"change",function(e){
    var rows=$$("#tbody .trow");
    if(e.target.checked){ rows.forEach(function(r){ state.sel.add(+r.dataset.id); }); }
    else state.sel.clear();
    updateSelUI();
  });
  on($("#btn-approve-selected"),"click",function(){ bulkUpdate("APPROVED"); });
  on($("#btn-reject-selected"), "click",function(){ bulkUpdate("REJECTED"); });

  // Export
  on($("#btn-export"), "click", exportCSV);
  on($("#btn-export-2"),"click", exportCSV);

  // Accesos
  on(document,"keydown",function(e){
    var mac=(navigator.platform||"").toUpperCase().indexOf("MAC")>=0;
    var mod=mac?e.metaKey:e.ctrlKey; if(!mod) return;
    if((e.key||"").toLowerCase()==="k"){ e.preventDefault(); var q=$("#f-q"); if(q) q.focus(); }
  });

  // Router y render inicial
  setupRouter();
  render();

  // Resumen financiero
  renderIngresosChart();
  renderMorosidadPanel();
  renderDonuts();
}

function setupRouter(){
  var SECS={dashboard:"sec-dashboard",ingresos:"sec-ingresos",gastos:"sec-gastos",reportes:"sec-reportes"};
  function switchSection(sec){
    $$("#side .item").forEach(function(i){ i.classList.toggle("active", i.dataset.section===sec); });
    $$(".view").forEach(function(v){ v.classList.remove("is-visible"); });
    var id=SECS[sec]||SECS.dashboard; var v=document.getElementById(id); if(v){ v.classList.add("is-visible"); }
    if(sec==="ingresos") renderIngresos();
    if(sec==="gastos")   renderGastos();
    if(sec==="reportes") renderReportes();
  }
  var saved=localStorage.getItem("finz.section")||"dashboard";
  switchSection(saved);
  $$("#side .item").forEach(function(a){
    a.setAttribute("role","button");
    on(a,"click",function(e){
      e.preventDefault(); e.stopPropagation();
      var sec=a.dataset.section; switchSection(sec); localStorage.setItem("finz.section",sec);
      if(window.matchMedia("(max-width:640px)").matches){
        document.body.classList.remove("nav-open");
        var bd=$("#drawerBackdrop"); if(bd){ bd.classList.remove("show"); bd.hidden=true; }
      }
    });
    on(a,"keydown",function(e){ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); a.click(); } });
  });
}

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

function render(){
  showSkeleton(true);
  requestAnimationFrame(function(){
    var all=filtered();
    var total=all.length;
    var start=(state.page-1)*state.size;
    var pageRows=all.slice(start,start+state.size);

    var currentMonth=new Date().toISOString().slice(0,7);
    var periodo=state.month||currentMonth;

    var pend = all.filter(function(r){return r.status==="PENDING";}).length;
    var apr  = all.filter(function(r){return r.status==="APPROVED";}).length;
    var rej  = all.filter(function(r){return r.status==="REJECTED";}).length;
    var ing  = DATA.filter(function(r){return r.status==="APPROVED" && r.period===periodo;})
                   .reduce(function(s,r){return s+r.amount_clp;},0);

    var kp=$("#kpi-periodo"); if(kp) kp.textContent="Periodo "+periodo;
    countUp($("#kpi-pend"), pend);
    countUp($("#kpi-apr"),  apr);
    countUp($("#kpi-rej"),  rej);
    countUp($("#kpi-ingresos"), ing, money);

    var tbody=$("#tbody"); if(tbody) tbody.innerHTML="";
    var empty=$("#empty"); if(empty) empty.hidden = total>0;
    var tpl=$("#row-tpl"); tpl = tpl? tpl.content : null;

    if(tpl && tbody){
      pageRows.forEach(function(r){
        var n=tpl.cloneNode(true); var row=n.querySelector(".trow"); row.dataset.id=r.id;
        n.querySelector('[data-k="created_at"]').textContent=r.created_at;
        n.querySelector('[data-k="student_name"]').textContent=r.student_name;
        n.querySelector('[data-k="course_name"]').textContent=r.course_name;
        n.querySelector('[data-k="method"]').textContent=r.method;
        n.querySelector('[data-k="period"]').textContent=r.period;
        n.querySelector('[data-k="amount_fmt"]').textContent=money(r.amount_clp);
        var b=n.querySelector('[data-k="status_label"]'); b.textContent=label(r.status); b.classList.add(bclass(r.status));
        var a=n.querySelector(".btn-voucher"); a.href=r.evidence_url||"#";
        var ok=n.querySelector(".approve"); var no=n.querySelector(".reject");
        ok.disabled=r.status!=="PENDING"; no.disabled=r.status!=="PENDING";
        on(ok,"click",function(){ updateStatus(r.id,"APPROVED"); });
        on(no,"click",function(){ updateStatus(r.id,"REJECTED"); });
        var cb=n.querySelector(".cb-row"); cb.checked=state.sel.has(r.id);
        on(cb,"change",function(e){ if(e.target.checked) state.sel.add(r.id); else state.sel.delete(r.id); updateSelUI(); });
        tbody.appendChild(n);
      });
    }

    var pages=Math.max(1,Math.ceil(total/state.size)); if(state.page>pages) state.page=pages;
    var pt=$("#page-total"); if(pt) pt.textContent=total;
    var ps=$("#page-start"); if(ps) ps.textContent= total? start+1 : 0;
    var pe=$("#page-end");   if(pe) pe.textContent= Math.min(start+state.size,total);
    var pgi=$("#pg-info");   if(pgi) pgi.textContent= state.page+" / "+pages;
    var prv=$("#pg-prev");   if(prv) prv.disabled = state.page<=1;
    var nxt=$("#pg-next");   if(nxt) nxt.disabled = state.page>=pages;

    var cball=$("#cb-all"); if(cball) cball.checked = pageRows.length && pageRows.every(function(r){return state.sel.has(r.id);});
    updateSelUI();
    showSkeleton(false);
  });
}

function updateStatus(id,to){
  var i=DATA.findIndex(function(x){return x.id===id;}); if(i<0) return;
  if(DATA[i].status===to) return;
  if(!confirm((to==="APPROVED"?"Aprobar":"Rechazar")+" pago de "+DATA[i].student_name+"?")) return;
  DATA[i].status=to; toast(to==="APPROVED"?"Pago aprobado":"Pago rechazado"); render(); renderDonuts();
}
function bulkUpdate(to){
  if(state.sel.size===0) return;
  if(!confirm((to==="APPROVED"?"Aprobar":"Rechazar")+" "+state.sel.size+" seleccionado(s)?")) return;
  var c=0; DATA.forEach(function(r){ if(state.sel.has(r.id)&&r.status==="PENDING"){ r.status=to; c++; }});
  toast(c+" registro(s) "+(to==="APPROVED"?"aprobado(s)":"rechazado(s)")); state.sel.clear(); var cb=$("#cb-all"); if(cb) cb.checked=false; render(); renderDonuts();
}
function updateSelUI(){ var sc=$("#sel-count"); if(sc) sc.textContent=state.sel.size+" seleccionados"; }
function exportCSV(){
  var rows=filtered();
  var header=["Fecha","Alumno","RUT","Curso","Periodo","Monto","Estado","Método"];
  var body=rows.map(function(r){ return [r.created_at,r.student_name,r.student_rut,r.course_name,r.period,money(r.amount_clp),label(r.status),r.method]; });
  csvDownload("reporte_finanzas.csv",[header].concat(body));
}

/* ===== Gráfico columnas ===== */
function renderIngresosChart(){
  var ctx = document.getElementById("chart-ingresos"); if(!ctx || !window.Chart) return;
  var meses = ["Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  var proyectado = new Array(meses.length).fill(10000000);
  var recaudado  = [3000000,4200000,3600000,5200000,4800000,5400000,6000000,0,0,0];

  new Chart(ctx.getContext("2d"),{
    type:"bar",
    data:{ labels:meses, datasets:[
      { label:"Recaudado", data:recaudado, backgroundColor:"rgba(205,167,88,0.95)", borderColor:"#0F294C", borderWidth:1},
      { label:"Proyectado", data:proyectado, backgroundColor:"rgba(15,41,76,0.18)", borderColor:"#0F294C", borderWidth:1}
    ]},
    options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:true}},
      scales:{ y:{ beginAtZero:true, ticks:{ callback:function(v){return "$"+new Intl.NumberFormat("es-CL").format(v);} } } } }
  });
}

/* ===== Panel morosidad ===== */
function renderMorosidadPanel(){
  var totalAlumnos = 800, morosos = 120;
  var pct = Math.round((morosos/totalAlumnos)*100);
  var p = $("#moro-percent"); if(p) p.textContent = pct+"%";
  var ul = $("#moro-breakdown"); if(!ul) return;
  ul.innerHTML = MOROSIDAD_NIVELES.map(function(i){
    return '<li><span>'+i.nivel+'</span><strong>'+i.pct+'%</strong></li>';
  }).join("");
}

/* ===== Donuts ===== */
var _donut1,_donut2;
function renderDonuts(){
  if(!window.Chart) return;
  var counts = {APPROVED:0,PENDING:0,REJECTED:0};
  DATA.forEach(function(p){ counts[p.status]++; });
  var total = DATA.length||1;
  var estadosData = [
    Math.round(100*counts.APPROVED/total),
    Math.round(100*counts.REJECTED/total),
    Math.round(100*counts.PENDING/total)
  ];
  var estadosLabels = ["Aceptados","Rechazados","Pendientes"];

  var mediosCnt = {};
  DATA.forEach(function(p){ mediosCnt[p.method]=(mediosCnt[p.method]||0)+1; });
  var mediosLabels = Object.keys(mediosCnt);
  var mediosData = mediosLabels.map(function(k){ return Math.round(100*mediosCnt[k]/total); });

  var ctx1 = document.getElementById("chart-estados");
  var ctx2 = document.getElementById("chart-medios");
  if(ctx1){
    if(_donut1) _donut1.destroy();
    var estColors = ["#16a34a","#ef4444","#f59e0b"];
    _donut1 = new Chart(ctx1.getContext("2d"),{
      type:"doughnut",
      data:{ labels:estadosLabels, datasets:[{ data:estadosData, backgroundColor:estColors, borderColor:"#fff", borderWidth:2 }]},
      options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, cutout:"62%"}
    });
    $("#legend-estados").innerHTML = estadosLabels.map(function(l,i){
      return '<li><span><span class="dot" style="background:'+estColors[i]+'"></span>'+l+
             '</span><strong>'+estadosData[i]+'%</strong></li>';
    }).join("");
  }
  if(ctx2){
    if(_donut2) _donut2.destroy();
    var mediosColors = mediosLabels.map(function(_,i){ return i%2? "rgba(15,41,76,0.55)" : "#CDA758"; });
    _donut2 = new Chart(ctx2.getContext("2d"),{
      type:"doughnut",
      data:{ labels:mediosLabels, datasets:[{ data:mediosData, backgroundColor:mediosColors, borderColor:"#fff", borderWidth:2 }]},
      options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, cutout:"62%"}
    });
    $("#legend-medios").innerHTML = mediosLabels.map(function(l,i){
      return '<li><span><span class="dot" style="background:'+mediosColors[i]+'"></span>'+l+
             '</span><strong>'+mediosData[i]+'%</strong></li>';
    }).join("");
  }
  var f = new Date().toLocaleDateString("es-CL");
  var eu=$("#estado-update"); if(eu) eu.textContent="Actualizado al "+f;
  var mu=$("#medios-update"); if(mu) mu.textContent="Actualizado al "+f;
}

/* Ingresos */
function renderIngresos(){
  var months=Array.from(new Set(INCOME_DATA.map(function(r){return r.period;}))).sort().reverse();
  var sel=$("#ing-month"); if(sel && sel.options.length===1){ months.forEach(function(m){ var o=document.createElement("option"); o.value=m; o.textContent=m; sel.appendChild(o); }); }
  var q=(($("#ing-q")||{}).value||"").toLowerCase(); var month=(sel&&sel.value)||"";
  var rows=INCOME_DATA.filter(function(r){ if(month && r.period!==month) return false; if(q){ var hay=(r.student+" "+r.rut+" "+r.course).toLowerCase(); if(hay.indexOf(q)===-1) return false; } return true; });
  var tb=$("#ing-tbody"); if(!tb) return;
  tb.innerHTML = rows.map(function(r){
    return '<div class="trow fade"><span>'+r.date+'</span><span>'+r.student+'</span><span>'+r.course+
           '</span><span>'+r.method+'</span><span>'+r.period+'</span><span class="mono">'+money(r.amount)+'</span></div>';
  }).join("");
  on($("#ing-export"),"click",function(){ var header=["Fecha","Alumno","Curso","Método","Periodo","Monto"]; var body=rows.map(function(r){return [r.date,r.student,r.course,r.method,r.period,money(r.amount)];}); csvDownload("ingresos_demo.csv",[header].concat(body)); });
  on($("#ing-q"),"input",debounce(renderIngresos,180)); on($("#ing-month"),"change",renderIngresos);
}

/* Gastos */
function renderGastos(){
  var ccs=Array.from(new Set(EXPENSE_DATA.map(function(r){return r.cc;}))).sort();
  var sel=$("#gas-cc"); if(sel && sel.options.length===1){ ccs.forEach(function(c){ var o=document.createElement("option"); o.value=c; o.textContent=c; sel.appendChild(o); }); }
  var q=(($("#gas-q")||{}).value||"").toLowerCase(); var cc=(sel&&sel.value)||"";
  var rows=EXPENSE_DATA.filter(function(r){ if(cc && r.cc!==cc) return false; if(q){ var hay=(r.vendor+" "+r.memo).toLowerCase(); if(hay.indexOf(q)===-1) return false; } return true; });
  var tb=$("#gas-tbody"); if(!tb) return;
  tb.innerHTML = rows.map(function(r){
    return '<div class="trow fade"><span>'+r.date+'</span><span>'+r.vendor+'</span><span>'+r.memo+
           '</span><span>'+r.cc+'</span><span>'+r.doc+'</span><span class="mono">'+money(r.amount)+'</span></div>';
  }).join("");
  on($("#gas-export"),"click",function(){ var h=["Fecha","Proveedor","Glosa","Centro de Costo","Documento","Monto"]; var b=rows.map(function(r){return [r.date,r.vendor,r.memo,r.cc,r.doc,money(r.amount)];}); csvDownload("gastos_demo.csv",[h].concat(b)); });
  on($("#gas-q"),"input",debounce(renderGastos,180)); on($("#gas-cc"),"change",renderGastos);
}

/* Reportes */
function renderReportes(){
  var months=Array.from(new Set([].concat(INCOME_DATA.map(function(r){return r.period;}), DATA.map(function(r){return r.period;})))).sort().reverse();
  var msel=$("#rep-month"); if(msel && msel.options.length===1){ months.forEach(function(m){ var o=document.createElement("option"); o.value=m; o.textContent=m; msel.appendChild(o); }); }
  var m=(msel&&msel.value)||months[0]||"";
  var ing=INCOME_DATA.filter(function(r){return !m || r.period===m;}).reduce(function(s,r){return s+r.amount;},0);
  var gas=EXPENSE_DATA.reduce(function(s,r){return s+r.amount;},0);
  countUp($("#rep-ing"), ing, money);
  countUp($("#rep-gas"), gas, money);
  countUp($("#rep-res"), ing-gas, money);
  countUp($("#rep-tx"),  INCOME_DATA.length + EXPENSE_DATA.length);
  on($("#rep-month"),"change",renderReportes);
  on($("#rep-export"),"click",function(){
    var type=$("#rep-type").value; var rows=[["#","Tipo","Fecha","Persona/Proveedor","Detalle","Periodo","Monto"]];
    if(type==="all"||type==="ing"){ INCOME_DATA.forEach(function(r){ rows.push([r.id,"Ingreso",r.date,r.student,r.method,r.period,money(r.amount)]); }); }
    if(type==="all"||type==="gas"){ EXPENSE_DATA.forEach(function(r){ rows.push([r.id,"Gasto",r.date,r.vendor,r.memo,"-",money(r.amount)]); }); }
    csvDownload("reporte_finanzas_demo.csv",rows);
  });
}

/* CSV genérico */
function csvDownload(filename, rows){
  var csv=rows.map(function(a){ return a.map(function(x){ return '"' + String(x).replace(/"/g,'""') + '"'; }).join(","); }).join("\n");
  var blob=new Blob([csv],{type:"text/csv;charset=utf-8;"}); var a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=filename; a.click();
}
