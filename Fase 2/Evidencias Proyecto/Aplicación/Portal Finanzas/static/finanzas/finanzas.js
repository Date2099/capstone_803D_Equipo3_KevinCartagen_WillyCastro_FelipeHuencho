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
document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("overlay");
  const menuLinks = document.querySelectorAll(".menu a[data-section]");
  const content = document.getElementById("content-area");
  const title = document.getElementById("topbar-title");
  const toggleBtn = document.getElementById("toggle");

  toggleBtn.addEventListener("click", () => {
    sidebar.classList.toggle("open");
    overlay.classList.toggle("show");
  });

  overlay.addEventListener("click", () => {
    sidebar.classList.remove("open");
    overlay.classList.remove("show");
  });

  async function getComprobantes() {
    try {
      const res = await fetch("/finanzas/api/comprobantes/");
      const raw = await res.json();
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw.comprobantes)) return raw.comprobantes;
      return [];
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  async function loadDashboard() {
    const data = await getComprobantes();
    const pendientes = data.filter(x => x.estado === "pendiente").length;
    const aprobados = data.filter(x => x.estado === "validado").length;
    const rechazados = data.filter(x => x.estado === "rechazado").length;

    content.innerHTML = `
      <div class="card">
        <h2>Panel Finanzas</h2>
        <p>Revisa y gestiona comprobantes de alumnos.</p>

        <div class="stat-cards-container">
          <div class="stat-card"><i class="fa-solid fa-hourglass-start"></i><div><div class="card-num">${pendientes}</div>Pendientes</div></div>
          <div class="stat-card"><i class="fa-solid fa-circle-check"></i><div><div class="card-num">${aprobados}</div>Aprobados</div></div>
          <div class="stat-card"><i class="fa-solid fa-ban"></i><div><div class="card-num">${rechazados}</div>Rechazados</div></div>
        </div>
      </div>
    `;
  }

function renderList(title, items) {
  return `
    <div class="card">
      <h3>${title}</h3>
      <div class="list-scroll">
        ${
          items.length === 0 
          ? "<p style='opacity:.6'>No hay registros</p>"
          : items.map(c => {
              
              // ✅ URL usando ID del comprobante
              const secureUrl = `/finanzas/ver-comprobante/${c.id}`;

              const montoFmt = Number(c.monto).toLocaleString("es-CL");
              const tieneArchivo = c.archivo_name && c.archivo_name.trim() !== "";

              return `
                <div class="payment-item">
                  <span>${c.alumno}</span>
                  <span>$${montoFmt}</span>
S
                  ${
                    tieneArchivo
                      ? `<a href="${secureUrl}" target="_blank" rel="noopener">Ver</a>`
                      : `<span style="opacity:.6">Sin archivo</span>`
                  }

                  ${
                    c.estado === "pendiente"
                      ? `
                        <button class="btn-acc" onclick="aprobar(${c.id}, this)">Aprobar</button>
                        <button class="btn-acc reject" onclick="rechazar(${c.id}, this)">Rechazar</button>
                        `
                      : c.estado === "validado"
                        ? "✅"
                        : "❌"
                  }
                </div>
              `;
            }).join("")
        }
      </div>
    </div>
  `;
}







  // ✅ Reemplazo total del loadComprobantes para usar tarjetas con scroll
  async function loadComprobantes() {
    const data = await getComprobantes();
    const pendientes = data.filter(c => c.estado === "pendiente");
    const aprobados = data.filter(c => c.estado === "validado");
    const rechazados = data.filter(c => c.estado === "rechazado");

    content.innerHTML = `
      ${renderList("Pendientes", pendientes)}
      ${renderList("Aprobados", aprobados)}
      ${renderList("Rechazados", rechazados)}
    `;
  }

  async function postAction(url, btn) {
    if (btn) btn.innerText = "Procesando...";

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        "X-CSRFToken": csrftoken,
      },
    });

    if (!res.ok) {
      alert("Error procesando la acción");
      if (btn) btn.innerText = "Error";
      return;
    }

    await loadComprobantes();
    await loadDashboard();
  }


  async function loadCuotasPendientes() {
    const res = await fetch("/finanzas/api/cuotas-pendientes/");
    const data = await res.json();
    const cuotas = data.cuotas || [];

    content.innerHTML = `
      <div class="card">
        <h3>Cuotas Pendientes</h3>
        <table class="tabla">
          <thead><tr><th>Alumno</th><th>RUT</th><th>Concepto</th><th>Monto</th><th>Vence</th></tr></thead>
          <tbody>
            ${cuotas.map(c => `
              <tr>
                <td>${c.alumno}</td>
                <td>${c.rut}</td>
                <td>${c.concept}</td>
                <td>$${c.monto.toLocaleString()}</td>
                <td>${c.fecha_vencimiento}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  window.aprobar = (id, btn) => postAction(`/finanzas/comprobante/${id}/aprobar/`, btn);
  window.rechazar = (id, btn) => postAction(`/finanzas/comprobante/${id}/rechazar/`, btn);

  function loadSection(sec) {
    title.textContent = sec.charAt(0).toUpperCase() + sec.slice(1);
    if (sec === "dashboard") loadDashboard();
    if (sec === "comprobantes recibidos") loadComprobantes();
    if (sec === "cuotas") loadCuotasPendientes();
  }

  menuLinks.forEach(link => link.addEventListener("click", e => {
    e.preventDefault();
    menuLinks.forEach(l => l.classList.remove("active"));
    link.classList.add("active");
    loadSection(link.dataset.section);
  }));

  loadSection("dashboard");
});
