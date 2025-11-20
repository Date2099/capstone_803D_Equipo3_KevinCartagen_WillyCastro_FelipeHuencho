// =======================
// CSRF
// =======================
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let cookie of cookies) {
      cookie = cookie.trim();
      if (cookie.substring(0, name.length + 1) === (name + "=")) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}
const csrftoken = getCookie("csrftoken");

// =======================
// MAIN
// =======================
document.addEventListener("DOMContentLoaded", () => {

  // -----------------------
  // Elementos DOM
  // -----------------------
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("overlay");
  const menuLinks = document.querySelectorAll(".menu a[data-section]");
  const content = document.getElementById("content-area");
  const title = document.getElementById("topbar-title");
  const toggleBtn = document.getElementById("toggle");

  // -----------------------
  // Sidebar móvil
  // -----------------------
  toggleBtn.addEventListener("click", () => {
    sidebar.classList.toggle("open");
    overlay.classList.toggle("show");
  });

  overlay.addEventListener("click", () => {
    sidebar.classList.remove("open");
    overlay.classList.remove("show");
  });

  // -----------------------
  // API: obtener comprobantes
  // -----------------------
  async function getComprobantes() {
    try {
      const res = await fetch("/finanzas/api/comprobantes/");
      const raw = await res.json();
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw.comprobantes)) return raw.comprobantes;
      return [];
    } catch {
      return [];
    }
  }

  // -----------------------
  // Dashboard
  // -----------------------
  async function loadDashboard() {
    const data = await getComprobantes();

    const pendientes = data.filter(x => x.estado === "pendiente").length;
    const aprobados  = data.filter(x => x.estado === "validado").length;
    const rechazados = data.filter(x => x.estado === "rechazado").length;

    content.innerHTML = `
      <div class="card">
        <h2>Panel Finanzas</h2>
        <p>Resumen general de movimiento de comprobantes.</p>

        <div class="stat-cards-container">
          <div class="stat-card">
            <i class="fa-solid fa-hourglass-start"></i>
            <div><div class="card-num">${pendientes}</div>Pendientes</div>
          </div>

          <div class="stat-card">
            <i class="fa-solid fa-circle-check"></i>
            <div><div class="card-num">${aprobados}</div>Aprobados</div>
          </div>

          <div class="stat-card">
            <i class="fa-solid fa-ban"></i>
            <div><div class="card-num">${rechazados}</div>Rechazados</div>
          </div>
        </div>

        <h3 style="margin-top:25px;">Comprobantes ingresados por mes</h3>
        <canvas id="chartIngresos" style="max-height:270px;"></canvas>
      </div>
    `;

    // --- Gráfico de ingresos mensuales ---
    const res2 = await fetch("/finanzas/api/comprobantes-por-mes/");
    const stats2 = await res2.json();

    const ctx2 = document.getElementById("chartIngresos").getContext("2d");
    if (window._chartIngresos) window._chartIngresos.destroy();

    window._chartIngresos = new Chart(ctx2, {
      type: "bar",
      data: {
        labels: stats2.labels,
        datasets: [
          { label: "Subidos",              data: stats2.subidos,        borderWidth: 1 },
          { label: "Correspondientes al mes", data: stats2.correspondientes, borderWidth: 1 },
          { label: "Atrasados",            data: stats2.atrasados,      borderWidth: 1 }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } }
        }
      }
    });
  }

  // -----------------------
  // Render Comprobantes
  // -----------------------
  let _cacheComprobantes = [];

  async function getComprobantesCached() {
    if (_cacheComprobantes.length) return _cacheComprobantes;
    _cacheComprobantes = await getComprobantes();
    return _cacheComprobantes;
  }

  function renderList(titleStr, items) {
    const sectionId = `section-${titleStr}`;
    return `
      <div class="card comprobantes-card accordion-card">
        <div class="accordion-header" onclick="toggleAccordion('${sectionId}', this)">
          <h3>${titleStr} <span class="count-soft">${items.length}</span></h3>
          <span class="accordion-icon">▼</span>
        </div>
        <div id="${sectionId}" class="accordion-body">
          <div class="card-header filters-row">
            <div class="search-box">
              <input class="search-input"
                     placeholder="Buscar alumno o RUT..."
                     oninput="filterList('${titleStr}', this.value); showSuggestions('${titleStr}', this.value)">
              <div class="suggestions" id="sug-${titleStr}"></div>
            </div>
            <select class="filter-select" onchange="applyFilters('${titleStr}')">
              <option value="">Mes</option>
              <option>Enero</option><option>Febrero</option><option>Marzo</option>
              <option>Abril</option><option>Mayo</option><option>Junio</option>
              <option>Julio</option><option>Agosto</option><option>Septiembre</option>
              <option>Octubre</option><option>Noviembre</option><option>Diciembre</option>
            </select>
            <select class="filter-select" onchange="applyFilters('${titleStr}')">
              <option value="">Curso</option>
              <option>1° Básico</option><option>2° Básico</option><option>3° Básico</option>
              <option>4° Básico</option><option>5° Básico</option><option>6° Básico</option>
              <option>7° Básico</option><option>8° Básico</option>
              <option>1° Medio</option><option>2° Medio</option><option>3° Medio</option><option>4° Medio</option>
            </select>
          </div>

          <div class="list-table-header">
            <span>Alumno</span><span>RUT</span><span>Curso</span><span>Mes</span>
            <span>Monto</span><span>Subido</span><span>Archivo</span><span>Estado</span><span>Acción</span>
          </div>

          <div class="list-scroll" id="list-${titleStr}">
            ${
              items.length === 0
                ? "<p style='opacity:.6;padding:12px;'>No hay registros</p>"
                : items.map(c => {
                    const url       = `/finanzas/ver-comprobante/${c.id}`;
                    const archivo   = c.archivo_name ? `<a class="link-ver" href="${url}" target="_blank">Ver</a>` : "—";
                    const montoFmt  = Number(c.monto).toLocaleString("es-CL");
                    const estadoBadge =
                      c.estado === "pendiente"
                        ? `<span class="badge badge-pendiente">Pendiente</span>`
                        : c.estado === "validado"
                          ? `<span class="badge badge-aprobado">Aprobado</span>`
                          : `<span class="badge badge-rechazado">Rechazado</span>`;

                    return `
                      <div class="payment-row" data-curso="${c.curso || ""}">
                        <div>${c.alumno}</div>
                        <div>${c.rut}</div>
                        <div>${c.curso || "-"}</div>
                        <div>${c.mes}</div>
                        <div>$${montoFmt}</div>
                        <div>${c.fecha_subida}</div>
                        <div>${archivo}</div>
                        <div>${estadoBadge}</div>
                        <div class="acciones">
                          ${
                            c.estado === "pendiente"
                              ? `
                                <button class="btn-acc approve" onclick="aprobar(${c.id}, this)">
                                  <i class="fa-solid fa-check"></i>
                                </button>
                                <button class="btn-acc reject" onclick="rechazar(${c.id}, this)">
                                  <i class="fa-solid fa-xmark"></i>
                                </button>
                                `
                              : `
                                <button class="btn-acc revert" onclick="revertir(${c.id}, this)">
                                  <i class="fa-solid fa-rotate-left"></i>
                                </button>
                                `
                          }
                        </div>
                      </div>
                    `;
                  }).join("")
            }
          </div>
        </div>
      </div>
    `;
  }

  // Guardar acordeones abiertos
  function getOpenAccordions() {
    return [...document.querySelectorAll(".accordion-body.open")].map(el => el.id);
  }

  // Restaurar acordeones abiertos
  function restoreOpenAccordions(openIds) {
    openIds.forEach(id => {
      const body = document.getElementById(id);
      if (body) {
        body.classList.add("open");
        const header = body.previousElementSibling;
        if (header) {
          const icon = header.querySelector(".accordion-icon");
          if (icon) icon.classList.add("rotated");
        }
      }
    });
  }

  async function loadComprobantes() {
    const openIds = getOpenAccordions();
    const data = await getComprobantes();

    content.innerHTML =
      renderList("Pendientes", data.filter(x => x.estado === "pendiente")) +
      renderList("Aprobados",  data.filter(x => x.estado === "validado")) +
      renderList("Rechazados", data.filter(x => x.estado === "rechazado"));

    restoreOpenAccordions(openIds);

    // Gráfico de flujo
    content.insertAdjacentHTML("beforeend", `
      <div class="card" style="margin-top:30px;">
        <h3>Flujo de revisión de comprobantes</h3>
        <canvas id="chartFlujo" style="max-height:270px;"></canvas>
      </div>
    `);

    const res = await fetch("/finanzas/api/estadisticas/");
    const stats = await res.json();
    const ctx = document.getElementById("chartFlujo").getContext("2d");

    if (window._chartFlujo) window._chartFlujo.destroy();

    window._chartFlujo = new Chart(ctx, {
      type: "bar",
      data: {
        labels: stats.labels,
        datasets: [
          { label: "Aprobados", data: stats.aprobados,   borderWidth: 1 },
          { label: "Rechazados", data: stats.rechazados, borderWidth: 1 },
          { type: "line", label: "Acumulado", data: stats.acumulado, borderWidth: 3, tension: 0.3 }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } }
        }
      }
    });
  }

  // -----------------------
  // POST con comentario
  // -----------------------
  async function postActionWithComment(url, comentario, btn) {
    if (btn) btn.innerText = "Procesando...";

    await fetch(url, {
      method: "POST",
      headers: {
        "X-CSRFToken": csrftoken,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({ comentario })
    });

    await loadComprobantes();
  }

  window.aprobar = (id, btn) => {
    abrirModal("Aprobar comprobante", false, comentario => {
      postActionWithComment(`/finanzas/comprobante/${id}/aprobar/`, comentario, btn);
    });
  };

  window.rechazar = (id, btn) => {
    abrirModal("Rechazar comprobante", true, comentario => {
      postActionWithComment(`/finanzas/comprobante/${id}/rechazar/`, comentario, btn);
    });
  };

  window.revertir = (id, btn) => {
    if (!confirm("¿Revertir estado a Pendiente?")) return;
    postActionWithComment(`/finanzas/comprobante/${id}/revertir/`, "", btn);
  };

  // -----------------------
  // Cuotas Pendientes (incluye rechazadas)
  // -----------------------
  async function loadCuotasPendientes() {
    // Backend ya devuelve pending + rejected
    const res = await fetch("/finanzas/api/cuotas-pendientes/");
    const data = await res.json();
    const cuotas = data.cuotas || [];

    // Render
    content.innerHTML = `
      <div class="card cuotas-card">
        <h2>Cuotas Pendientes</h2>
        <p>Resumen del estado de morosidad y cuotas pendientes del colegio.</p>

        <div class="stat-cards-container" style="margin-bottom:20px;">
          <div class="stat-card">
            <i class="fa-solid fa-receipt"></i>
            <div>
              <div class="card-num">${cuotas.length}</div>Cuotas Pendientes
            </div>
          </div>

          <div class="stat-card">
            <i class="fa-solid fa-sack-dollar"></i>
            <div>
              <div class="card-num">
                $${cuotas.reduce((t, c) => t + c.monto, 0).toLocaleString("es-CL")}
              </div>Monto Total Adeudado
            </div>
          </div>

          <div class="stat-card">
            <i class="fa-solid fa-exclamation-triangle"></i>
            <div>
              <div class="card-num" id="severeCount">0</div>Morosidad Grave (+60 días)
            </div>
          </div>
        </div>

        <h3>Riesgo de Morosidad</h3>
        <canvas id="chartRiesgo" style="max-height:240px; margin-bottom:20px;"></canvas>

        <div class="search-box" style="margin-bottom:10px;">
          <input class="search-input" placeholder="Buscar alumno o RUT..." oninput="filterCuotas(this.value)">
        </div>

        <div class="list-table-header">
          <span>Alumno</span><span>RUT</span><span>Concepto</span>
          <span>Monto</span><span>Vence</span><span>Estado</span>
        </div>

        <div class="list-scroll">
          ${
            cuotas.length === 0
              ? "<p style='opacity:.6;padding:12px;'>No hay cuotas pendientes</p>"
              : cuotas.map(c => {
                  const estadoTxt = c.status === "rejected" ? "Rechazado" : "Pendiente";
                  return `
                    <div class="payment-row cuota-item">
                      <div>${c.alumno}</div>
                      <div>${c.rut}</div>
                      <div>${c.concept}</div>
                      <div>$${c.monto.toLocaleString("es-CL")}</div>
                      <div>${c.fecha_vencimiento}</div>
                      <div>${estadoTxt}</div>
                    </div>
                  `;
                }).join("")
          }
        </div>
      </div>
    `;

    // Gráfico de riesgo de morosidad
    setTimeout(() => {
      const today = new Date();
      let verde = 0, amarillo = 0, rojo = 0;

      cuotas.forEach(c => {
        if (!c.fecha_vencimiento || c.fecha_vencimiento.trim() === "") return;

        const [dd, mm, yyyy] = c.fecha_vencimiento.split("-");
        const fecha = new Date(`${yyyy}-${mm}-${dd}`);
        const diffDays = Math.ceil((today - fecha) / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) verde++;
        else if (diffDays <= 60) amarillo++;
        else rojo++;
      });

      const severeEl = document.getElementById("severeCount");
      if (severeEl) severeEl.textContent = rojo;

      const canvas = document.getElementById("chartRiesgo");
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (window._chartRiesgo) window._chartRiesgo.destroy();

      window._chartRiesgo = new Chart(ctx, {
        type: "pie",
        data: {
          labels: ["Al día", "Atraso leve (1-60 días)", "Morosidad grave (+60 días)"],
          datasets: [{
            data: [verde, amarillo, rojo],
            backgroundColor: ["#4CAF50", "#FFC107", "#E53935"]
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: "bottom" }
          }
        }
      });
    }, 200);
  }

  // -----------------------
  // Navegación SPA
  // -----------------------
  function loadSection(sec) {
    title.textContent = sec.charAt(0).toUpperCase() + sec.slice(1);

    if (sec === "dashboard")             loadDashboard();
    if (sec === "comprobantes recibidos") loadComprobantes();
    if (sec === "cuotas")                loadCuotasPendientes();
  }

  menuLinks.forEach(link => link.addEventListener("click", e => {
    e.preventDefault();
    menuLinks.forEach(l => l.classList.remove("active"));
    link.classList.add("active");
    loadSection(link.dataset.section);
  }));

  // -----------------------
  // Buscador comprobantes
  // -----------------------
  window.filterList = function(titleStr, value) {
    const rows = document.querySelectorAll(`#list-${titleStr} .payment-row`);
    const term = value.toLowerCase()
                      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                      .replace(/\./g,"").replace(/-/g,"");

    rows.forEach(row => {
      const txt = row.textContent.toLowerCase()
                    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
                    .replace(/\./g,"").replace(/-/g,"");
      row.style.display = txt.includes(term) ? "" : "none";
    });
  };

  // -----------------------
  // Filtro select mes/curso
  // -----------------------
  window.applyFilters = function(titleStr) {
    const section = document.getElementById(`section-${titleStr}`);
    const search  = section.querySelector(".search-input");
    const month   = section.querySelector(".filter-select:nth-of-type(1)");
    const curso   = section.querySelector(".filter-select:nth-of-type(2)");

    const term = search.value.toLowerCase()
                  .normalize("NFD").replace(/[\u0300-\u036f]/g,"");
    const m = month.value.toLowerCase();
    const c = curso.value.toLowerCase();

    section.querySelectorAll(".payment-row").forEach(row => {
      const cols = row.querySelectorAll("div");
      const alumno   = cols[0].textContent.toLowerCase();
      const mes      = cols[3].textContent.toLowerCase();
      const cursoRow = row.dataset.curso?.toLowerCase() || "";

      const okSearch = alumno.includes(term);
      const okMonth  = !m || mes.includes(m);
      const okClass  = !c || cursoRow.includes(c);

      row.style.display = (okSearch && okMonth && okClass) ? "" : "none";
    });
  };

  // -----------------------
  // Filtro cuotas
  // -----------------------
  window.filterCuotas = function(value) {
    const term = value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
    document.querySelectorAll(".cuota-item").forEach(row => {
      const text = row.textContent.toLowerCase()
                    .normalize("NFD").replace(/[\u0300-\u036f]/g,"");
      row.style.display = text.includes(term) ? "" : "none";
    });
  };

  // -----------------------
  // Acordeón
  // -----------------------
  window.toggleAccordion = function(id, header) {
    const body = document.getElementById(id);
    header.querySelector(".accordion-icon").classList.toggle("rotated");
    body.classList.toggle("open");
  };

  // -----------------------
  // Sugerencias
  // -----------------------
  window.showSuggestions = function(titleStr, value) {
    const box = document.getElementById(`sug-${titleStr}`);
    if (!value.trim()) {
      box.innerHTML = "";
      box.style.display = "none";
      return;
    }

    const term = value.toLowerCase();
    const rows = document.querySelectorAll(`#list-${titleStr} .payment-row`);
    const results = [];

    rows.forEach(r => {
      const cols = r.querySelectorAll("div");
      const name = cols[0].textContent.trim();
      const rut  = cols[1].textContent.trim();
      const n  = name.toLowerCase();
      const rr = rut.toLowerCase().replace(/\./g,"").replace(/-/g,"");

      if (n.includes(term) || rr.includes(term.replace(/\./g,"").replace(/-/g,""))) {
        results.push({ name, rut });
      }
    });

    const unique = [];
    const seen = new Set();

    for (const r of results) {
      if (!seen.has(r.rut)) {
        seen.add(r.rut);
        unique.push(r);
        if (unique.length >= 6) break;
      }
    }

    box.innerHTML = "";
    unique.forEach(r => {
      const d = document.createElement("div");
      d.className = "suggest-item";
      d.textContent = `${r.name} — ${r.rut}`;
      d.onclick = () => selectSuggestion(titleStr, r.name);
      box.appendChild(d);
    });
    box.style.display = unique.length ? "block" : "none";
  };

  window.selectSuggestion = function(titleStr, name) {
    const input = document.querySelector(`#section-${titleStr} .search-input`);
    input.value = name;
    filterList(titleStr, name);
    const box = document.getElementById(`sug-${titleStr}`);
    box.innerHTML = "";
    box.style.display = "none";
  };

  // -----------------------
  // Modal
  // -----------------------
  document.body.insertAdjacentHTML("beforeend", `
    <div id="modal-bg" style="position:fixed; top:0; left:0; right:0; bottom:0;
                              background:rgba(0,0,0,0.4); display:none;
                              align-items:center; justify-content:center; z-index:9999;">
      <div style="background:white; padding:20px; width:350px; border-radius:8px; font-family:Poppins;">
        <h3 id="modal-title" style="margin-bottom:10px;"></h3>
        <textarea id="modal-comentario" rows="4" placeholder="Ingrese comentario..."
                  style="width:100%; padding:8px; border:1px solid #ccc; border-radius:6px; margin-bottom:12px;"></textarea>
        <div style="display:flex; justify-content:flex-end; gap:10px;">
          <button id="modal-cancel" style="padding:6px 12px; background:#bbb;">Cancelar</button>
          <button id="modal-ok" style="padding:6px 12px; background:#0F294C; color:white;">Confirmar</button>
        </div>
      </div>
    </div>
  `);

  function abrirModal(titulo, obligatorio, callback) {
    document.getElementById("modal-title").textContent = titulo;
    const input = document.getElementById("modal-comentario");
    input.value = "";
    document.getElementById("modal-bg").style.display = "flex";

    document.getElementById("modal-ok").onclick = () => {
      const val = input.value.trim();
      if (obligatorio && !val) return alert("Debe ingresar un comentario");
      callback(val);
      cerrarModal();
    };
    document.getElementById("modal-cancel").onclick = cerrarModal;
  }

  function cerrarModal() {
    document.getElementById("modal-bg").style.display = "none";
  }

  // -----------------------
  // Inicio en Dashboard
  // -----------------------
  loadSection("dashboard");
});
