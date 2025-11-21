document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.getElementById("sidebar");
  const toggleBtn = document.getElementById("toggle");
  const overlay = document.getElementById("overlay");
  const content = document.getElementById("content-area");
  const topbarTitle = document.getElementById("topbar-title");
  const menuLinks = document.querySelectorAll(".menu a[data-section]");

  // 👇 agregamos TODOS los endpoints que usa el JS
  const API = {
    cursos: "/profesorView/cursos/",
    perfil: "/profesorView/perfil-data/",
    alumnos: (classId) => `/profesorView/curso/${classId}/alumnos/`,
    asignaturas: (classId) => `/profesorView/curso/${classId}/asignaturas/`,
    crearEvaluacion: "/profesorView/crear-evaluacion/",
    // NUEVO: evaluaciones de un curso (tienes que crear el endpoint en Django)
    evaluacionesCurso: (classId) => `/profesorView/curso/${classId}/evaluaciones/`,
    // NUEVO: guardar notas de una evaluación
    guardarNotas: (evalId) => `/profesorView/evaluacion/${evalId}/notas/guardar/`,
  };

  function setTitle(section) {
    const pretty = section.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());
    if (topbarTitle) topbarTitle.textContent = pretty;
  }

  // =========================
  // router
  // =========================
  function load(section) {
    setTitle(section);

    // marcar menú
    menuLinks.forEach((l) => l.classList.remove("active"));
    const current = document.querySelector(`.menu a[data-section="${section}"]`);
    if (current) current.classList.add("active");

    // RUTAS:
    if (section === "dashboard") return renderDashboard();
    if (section === "mis-cursos") return renderCursos();
    if (section === "crear-evaluacion") return renderCrearEval();
    if (section === "ingresar-notas") return renderIngresarNotas();     // 👈 NUEVA
    if (section === "mis-notas") return renderMisNotas();               // 👈 NUEVA
    if (section === "perfil") return renderPerfil();

    content.innerHTML = `<div class="card">Sección "${section}" no implementada.</div>`;
  }

  // =========================
  // dashboard simple
  // =========================
  function renderDashboard() {
    content.innerHTML = `
      <div class="card">
        <h2 class="card-title">Bienvenido, ${profesor.nombre}</h2>
        <p>Panel del profesor.</p>
      </div>`;
  }

  // =========================
  // cursos del profe
  // =========================
  async function renderCursos() {
    content.innerHTML = `<div class="card">Cargando cursos...</div>`;
    let cursos = [];
    try {
      const r = await fetch(API.cursos);
      cursos = await r.json();
    } catch (err) {
      console.warn(err);
      content.innerHTML = `<div class="card">No se pudieron cargar los cursos.</div>`;
      return;
    }

    if (!Array.isArray(cursos) || cursos.length === 0) {
      content.innerHTML = `<div class="card"><h2>Mis Cursos</h2><p>No tienes cursos asignados.</p></div>`;
      return;
    }

    content.innerHTML = `
      <div class="card">
        <h2 class="card-title"><i class="fa-solid fa-chalkboard"></i> Mis Cursos</h2>
        <div class="clases-grid" id="cursos-list"></div>
      </div>`;

    const list = content.querySelector("#cursos-list");
    cursos.forEach((c) => {
      const el = document.createElement("div");
      el.className = "clase-card";
      el.innerHTML = `
        <div class="clase-icon"><i class="fa-solid fa-users"></i></div>
        <div class="clase-info">
          <h3>${c.nombre}</h3>
          <div class="btns-inline">
            <button class="btn-ver" data-id="${c.id}">Ver alumnos</button>
            <button class="btn-eval" data-id="${c.id}">Crear evaluación</button>
          </div>
        </div>`;
      list.appendChild(el);
    });

    // delegación
    list.addEventListener("click", (e) => {
      const btnAlu = e.target.closest("button.btn-ver");
      const btnEval = e.target.closest("button.btn-eval");
      if (btnAlu) {
        const card = btnAlu.closest(".clase-card");
        const nombreCurso = card.querySelector("h3").textContent;
        return renderAlumnos(btnAlu.dataset.id, nombreCurso);
      }
      if (btnEval) {
        return renderCrearEval(btnEval.dataset.id); // crear eval ya con curso elegido
      }
    });
  }

  // =========================
  // alumnos de un curso
  // =========================
  async function renderAlumnos(classId, nombreCurso) {
    content.innerHTML = `<div class="card">Cargando alumnos...</div>`;
    let alumnos = [];
    try {
      const r = await fetch(API.alumnos(classId));
      alumnos = await r.json();
    } catch (err) {
      content.innerHTML = `<div class="card">No se pudieron cargar los alumnos.</div>`;
      return;
    }

    const rows = Array.isArray(alumnos) && alumnos.length
      ? alumnos
          .map(
            (a) => `
          <tr>
            <td>${a.nombre}</td>
            <td>${a.rut || "--"}</td>
          </tr>`
          )
          .join("")
      : `<tr><td colspan="2">Sin alumnos.</td></tr>`;

    content.innerHTML = `
      <div class="card">
        <h2 class="card-title">${nombreCurso} — Alumnos</h2>
        <div class="tabla-card">
          <div class="tabla-body">
            <table class="tabla-notas">
              <thead><tr><th>Nombre</th><th>RUT</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
        <p style="margin-top:10px;">
          <a href="#" data-section="mis-cursos" id="link-volver-cursos">Volver a cursos</a>
        </p>
      </div>`;

    const back = document.getElementById("link-volver-cursos");
    if (back) {
      back.addEventListener("click", (e) => {
        e.preventDefault();
        load("mis-cursos");
      });
    }
  }

  // =========================
  // PERFIL
  // =========================
  async function renderPerfil() {
    content.innerHTML = `<div class="card">Cargando perfil...</div>`;
    let p = {};
    try {
      const r = await fetch(API.perfil);
      p = await r.json();
    } catch (err) {
      content.innerHTML = `<div class="card">No se pudo cargar el perfil.</div>`;
      return;
    }

    content.innerHTML = `
      <div class="perfil-card">
        <div class="perfil-header">
          <div class="perfil-banner"></div>
          <div class="perfil-avatar">
            <div class="avatar-circle">${(p.nombre || "--")
              .split(" ")
              .map((s) => s[0] || "")
              .join("")
              .slice(0, 2)
              .toUpperCase()}</div>
            <h2>${p.nombre}</h2>
            <p class="perfil-sub">RUT ${p.rut || "--"} • ${p.email || "--"}</p>
          </div>
        </div>
        <div class="perfil-body">
          <div class="perfil-info-box">
            <h3>Información</h3>
            <table>
              <tr><td>Nombre</td><td>${p.nombre}</td></tr>
              <tr><td>RUT</td><td>${p.rut || "--"}</td></tr>
              <tr><td>Correo</td><td>${p.email || "--"}</td></tr>
            </table>
          </div>
        </div>
      </div>`;
  }

  // =========================
  // CREAR EVALUACIÓN (2 pasos)
  // =========================
  async function renderCrearEval(preselectedClassId = null) {
    content.innerHTML = `
      <div class="card">
        <h2>Crear evaluación</h2>
        <p>Selecciona el curso y completa los datos.</p>
        <label>Curso</label>
        <select id="select-curso">
          <option value="">Cargando cursos...</option>
        </select>

        <div id="eval-form-wrap" style="margin-top:1rem;"></div>
      </div>
    `;

    const selCurso = document.getElementById("select-curso");
    const formWrap = document.getElementById("eval-form-wrap");

    // cargar cursos
    let cursos = [];
    try {
      const r = await fetch(API.cursos);
      cursos = await r.json();
    } catch (err) {
      selCurso.innerHTML = `<option value="">Error al cargar cursos</option>`;
      return;
    }

    if (!Array.isArray(cursos) || cursos.length === 0) {
      selCurso.innerHTML = `<option value="">No tienes cursos</option>`;
      return;
    }

    selCurso.innerHTML = `<option value="">-- elegir curso --</option>`;
    cursos.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.nombre;
      selCurso.appendChild(opt);
    });

    if (preselectedClassId) {
      selCurso.value = preselectedClassId;
      await buildEvalForm(preselectedClassId, formWrap);
    }

    selCurso.addEventListener("change", async () => {
      const classId = selCurso.value;
      formWrap.innerHTML = "";
      if (!classId) return;
      await buildEvalForm(classId, formWrap);
    });
  }

  async function buildEvalForm(classId, container) {
    container.innerHTML = `
      <label>Asignatura</label>
      <select id="subject-select"><option value="">Cargando...</option></select>

      <label style="margin-top:.5rem;">Nombre / descripción</label>
      <input id="eval-desc" required>

      <label>Fecha</label>
      <input type="date" id="eval-date" required>

      <label>Ponderación</label>
      <input type="number" id="eval-weight" step="0.1" value="1">

      <label>Tipo de evaluación</label>
      <input id="eval-type-name" placeholder="Ej: Prueba, Control" required>

      <button id="btn-save-eval" class="btn" style="margin-top:1rem;">Crear evaluación</button>
    `;

    const selSubject = document.getElementById("subject-select");

    // cargar asignaturas del profe en ese curso
    try {
      const r = await fetch(API.asignaturas(classId));
      const asignaturas = await r.json();
      selSubject.innerHTML = "";
      if (Array.isArray(asignaturas) && asignaturas.length) {
        selSubject.innerHTML = `<option value="">-- elegir asignatura --</option>`;
        asignaturas.forEach((s) => {
          const opt = document.createElement("option");
          opt.value = s.id;
          opt.textContent = s.name || s.nombre || "Asignatura";
          selSubject.appendChild(opt);
        });
      } else {
        selSubject.innerHTML = `<option value="">(no tienes asignaturas en este curso)</option>`;
      }
    } catch (err) {
      selSubject.innerHTML = `<option value="">Error al cargar asignaturas</option>`;
    }

    const btnSave = document.getElementById("btn-save-eval");
    btnSave.addEventListener("click", async () => {
      const subjectId = selSubject.value;
      const desc = document.getElementById("eval-desc").value.trim();
      const date = document.getElementById("eval-date").value;
      const weight = document.getElementById("eval-weight").value || "1";
      const typeName = document.getElementById("eval-type-name").value.trim();

      if (!subjectId) return alert("Debes elegir una asignatura");
      if (!desc) return alert("Debes escribir una descripción");
      if (!date) return alert("Debes elegir una fecha");
      if (!typeName) return alert("Debes indicar el tipo de evaluación");

      const fd = new FormData();
      fd.append("class_id", classId);
      fd.append("subject_id", subjectId);
      fd.append("description", desc);
      fd.append("date", date);
      fd.append("weight", weight);
      fd.append("evaluation_type_name", typeName);

      const r = await fetch(API.crearEvaluacion, {
        method: "POST",
        body: fd,
        headers: {
          "X-CSRFToken": profesor.csrf,
        },
      });
      const res = await r.json();
      if (res.success) {
        alert("Evaluación creada ✅");
        load("mis-cursos");
      } else {
        alert(res.error || "Error al crear la evaluación");
      }
    });
  }

  // =========================
  // INGRESAR NOTAS (lo que enviaste)
  // =========================
  async function renderIngresarNotas() {
    content.innerHTML = `
      <div class="card">
        <h2 class="card-title">Ingresar notas</h2>
        <label>Curso</label>
        <select id="notas-select-curso">
          <option value="">Cargando cursos...</option>
        </select>

        <label style="margin-top:.7rem;">Evaluación</label>
        <select id="notas-select-eval" disabled>
          <option value="">Primero elige un curso</option>
        </select>

        <div id="notas-alumnos-wrap" style="margin-top:1rem;"></div>
      </div>
    `;

    const selCurso = document.getElementById("notas-select-curso");
    const selEval = document.getElementById("notas-select-eval");
    const alumnosWrap = document.getElementById("notas-alumnos-wrap");

    // cargar cursos
    let cursos = [];
    try {
      const r = await fetch(API.cursos);
      cursos = await r.json();
    } catch (err) {
      selCurso.innerHTML = `<option value="">Error al cargar cursos</option>`;
      return;
    }

    if (!Array.isArray(cursos) || cursos.length === 0) {
      selCurso.innerHTML = `<option value="">No tienes cursos</option>`;
      return;
    }

    selCurso.innerHTML = `<option value="">-- elegir curso --</option>`;
    cursos.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.nombre;
      selCurso.appendChild(opt);
    });

    selCurso.addEventListener("change", async () => {
      const classId = selCurso.value;
      selEval.innerHTML = `<option value="">Cargando evaluaciones...</option>`;
      selEval.disabled = true;
      alumnosWrap.innerHTML = "";

      if (!classId) return;

      // pedir evaluaciones del curso
      let evals = [];
      try {
        const r = await fetch(API.evaluacionesCurso(classId));
        if (r.ok) {
          evals = await r.json();
        } else {
          selEval.innerHTML = `<option value="">(Falta endpoint /curso/${classId}/evaluaciones/)</option>`;
          return;
        }
      } catch (err) {
        selEval.innerHTML = `<option value="">No se pudieron cargar</option>`;
        return;
      }

      if (!Array.isArray(evals) || evals.length === 0) {
        selEval.innerHTML = `<option value="">No hay evaluaciones para este curso</option>`;
        return;
      }

      selEval.disabled = false;
      selEval.innerHTML = `<option value="">-- elegir evaluación --</option>`;
      evals.forEach((ev) => {
        const opt = document.createElement("option");
        opt.value = ev.id;
        opt.textContent = `${ev.description || ev.nombre || "Evaluación"} (${ev.date || ""})`;
        selEval.appendChild(opt);
      });
    });

    selEval.addEventListener("change", async () => {
      const classId = selCurso.value;
      const evalId = selEval.value;
      alumnosWrap.innerHTML = "";

      if (!evalId) return;

      // cargar alumnos
      let alumnos = [];
      try {
        const r = await fetch(API.alumnos(classId));
        alumnos = await r.json();
      } catch (err) {
        alumnosWrap.innerHTML = `<p>No se pudieron cargar los alumnos.</p>`;
        return;
      }

      if (!Array.isArray(alumnos) || alumnos.length === 0) {
        alumnosWrap.innerHTML = `<p>Este curso no tiene alumnos.</p>`;
        return;
      }

      alumnosWrap.innerHTML = `
        <form id="form-notas">
          <div class="tabla-card">
            <div class="tabla-body">
              <table class="tabla-notas">
                <thead>
                  <tr><th>Alumno</th><th>RUT</th><th>Nota</th></tr>
                </thead>
                <tbody>
                  ${alumnos
                    .map(
                      (a) => `
                        <tr>
                          <td>${a.nombre}</td>
                          <td>${a.rut || "--"}</td>
                          <td><input type="number" min="1" max="7" step="0.1" name="${a.id}" placeholder="7.0"></td>
                        </tr>
                      `
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
          </div>
          <button type="submit" class="btn" style="margin-top:1rem;">Guardar notas</button>
        </form>
      `;

      const form = document.getElementById("form-notas");
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const r = await fetch(API.guardarNotas(evalId), {
          method: "POST",
          body: fd,
          headers: {
            "X-CSRFToken": profesor.csrf,
          },
        });
        const res = await r.json();
        if (res.success) {
          alert("Notas guardadas ✅");
        } else {
          alert(res.error || "Error al guardar notas");
        }
      });
    });
  }

  // ====== MIS NOTAS (resumen) ======
  function renderMisNotas() {
    content.innerHTML = `
      <div class="card">
        <h2 class="card-title">Notas del curso</h2>
        <p>Aquí puedes mostrar un resumen por curso/evaluación (pendiente).</p>
      </div>
    `;
  }

  // ====== NAV ======
  menuLinks.forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const section = a.getAttribute("data-section");
      load(section);

      // cerrar sidebar en móvil
      if (sidebar && sidebar.classList.contains("open")) {
        sidebar.classList.remove("open");
        document.body.classList.remove("menu-open");
        if (overlay) overlay.style.display = "none";
      }
    });
  });

  // ====== sidebar responsive ======
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      sidebar.classList.toggle("open");
      document.body.classList.toggle("menu-open");
      if (overlay) {
        overlay.style.display = sidebar.classList.contains("open") ? "block" : "none";
      }
    });
  }

  if (overlay) {
    overlay.addEventListener("click", () => {
      sidebar.classList.remove("open");
      document.body.classList.remove("menu-open");
      overlay.style.display = "none";
    });
  }

  // vista inicial
  load("dashboard");
});
