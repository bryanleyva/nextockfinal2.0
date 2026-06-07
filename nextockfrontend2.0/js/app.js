// ====================== Utilidades de UI ======================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 3000);
}
function setMsg(el, texto, tipo = '') {
  el.textContent = texto;
  el.className = 'msg ' + tipo;
}
const claseEstado = (e) => (e === 'SOBRE STOCK' ? 'SOBRE' : e);

// ====================== Autenticación ======================
$$('.tab').forEach((tab) =>
  tab.addEventListener('click', () => {
    $$('.tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    const esLogin = tab.dataset.tab === 'login';
    $('#form-login').classList.toggle('hidden', !esLogin);
    $('#form-registro').classList.toggle('hidden', esLogin);
    setMsg($('#auth-msg'), '');
  }),
);

$('#form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const r = await api('/auth/login', {
      method: 'POST',
      body: { email: $('#login-email').value, password: $('#login-pass').value },
    });
    iniciarSesion(r);
  } catch (err) {
    setMsg($('#auth-msg'), err.message, 'error');
  }
});

$('#form-registro').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const r = await api('/auth/registro', {
      method: 'POST',
      body: {
        fullName: $('#reg-nombre').value,
        bodega: $('#reg-bodega').value,
        email: $('#reg-email').value,
        password: $('#reg-pass').value,
      },
    });
    iniciarSesion(r);
  } catch (err) {
    setMsg($('#auth-msg'), err.message, 'error');
  }
});

function iniciarSesion(r) {
  Auth.token = r.access_token;
  Auth.usuario = r.usuario;
  mostrarApp();
}

$('#btn-logout').addEventListener('click', () => {
  Auth.logout();
  $('#app').classList.add('hidden');
  $('#auth').classList.remove('hidden');
});

// ====================== Navegación ======================
$$('.nav-btn').forEach((btn) =>
  btn.addEventListener('click', () => {
    $$('.nav-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const vista = btn.dataset.view;
    $$('.view').forEach((v) => v.classList.add('hidden'));
    $('#view-' + vista).classList.remove('hidden');
    if (vista === 'dashboard') cargarDashboard();
    if (vista === 'prediccion') cargarProductos();
    if (vista === 'reportes') cargarReportes();
  }),
);

function mostrarApp() {
  $('#auth').classList.add('hidden');
  $('#app').classList.remove('hidden');
  $('#user-name').textContent = '👤 ' + (Auth.usuario?.nombre || '');
  cargarDashboard();
  cargarProductos();
}

// ====================== Dashboard (HU-05, HU-18) ======================
async function cargarDashboard() {
  try {
    const m = await api('/inventario/metricas');
    $('#metricas').innerHTML = `
      ${card(m.productos_total, 'Productos')}
      ${card(m.unidades_en_stock, 'Unidades en stock')}
      ${card('S/ ' + (m.valor_inventario ?? 0).toLocaleString(), 'Valor inventario')}
      ${card(m.productos_bajo_stock, 'Bajo stock')}
      ${card(m.productos_agotados, 'Agotados')}
      ${card((m.tasa_quiebre_pct ?? 0) + '%', 'Tasa de quiebre')}`;

    const rep = await api('/analisis/reporte-inventario');
    chartEstados(rep);

    const rk = await api('/analisis/ranking');
    chartRanking(rk.ranking);

    const ventas = await api('/inventario/ventas');
    chartVentas(ventas.datos || []);
  } catch (err) {
    toast('Error cargando dashboard: ' + err.message);
  }
}
const card = (valor, etq) => `<div class="card"><div class="valor">${valor}</div><div class="etq">${etq}</div></div>`;

// ====================== Predicción (HU-01, HU-09, HU-11) ======================
async function cargarProductos() {
  try {
    const prods = await api('/productos');
    const sel = $('#sel-producto');
    sel.innerHTML = prods
      .map((p) => `<option value="${p.sourceProductId}">${p.sourceProductId} — ${p.productName}</option>`)
      .join('');
  } catch (err) {
    toast('Error: ' + err.message);
  }
}

$('#btn-predecir').addEventListener('click', async () => {
  const sku = $('#sel-producto').value;
  if (!sku) return;
  try {
    const s = await api('/analisis/series/' + sku);
    const r = s.resumen;
    $('#ficha-texto').textContent =
      `Nombre del producto: ${s.nombre}\n` +
      `Categoria: ${s.categoria}\n` +
      `Stock actual: ${r.stock_actual} unidades\n` +
      `Demanda proyectada: ${r.demanda_proyectada} unidades\n` +
      `Nivel recomendado de pedido: ${r.nivel_recomendado_pedido} unidades\n` +
      `Probabilidad de quiebre de stock: ${r.prob_quiebre_pct}%\n` +
      `Fecha estimada de agotamiento: ${r.fecha_agotamiento || 'No se agota en el horizonte'}`;
    $('#estado-badge').innerHTML = `<span class="badge ${claseEstado(s.estado)}">${s.estado}</span>`;
    $('#pred-resultado').classList.remove('hidden');
    chartStock(s);
    chartDemanda(s);
  } catch (err) {
    toast('Error: ' + err.message);
  }
});

// ====================== Reportes (HU-09, HU-10, HU-11) ======================
async function cargarReportes() {
  try {
    const f = await api('/analisis/finanzas');
    $('#finanzas').innerHTML = `
      ${card('S/ ' + f.ingreso_total.toLocaleString(), 'Ingreso total')}
      ${card('S/ ' + f.costo_total.toLocaleString(), 'Costo total')}
      ${card('S/ ' + f.utilidad_bruta.toLocaleString(), 'Utilidad bruta')}
      ${card(f.margen_pct + '%', 'Margen bruto')}
      ${card((f.unidades_vendidas ?? 0).toLocaleString(), 'Unidades vendidas')}`;

    const rep = await api('/analisis/reporte-inventario');
    const tbody = $('#tabla-reporte tbody');
    tbody.innerHTML = rep.productos
      .map((p) => `<tr>
        <td>${p.sku}</td>
        <td>${p.nombre}</td>
        <td><span class="pill ${claseEstado(p.estado)}">${p.estado}</span></td>
        <td>${p.stock_actual}</td>
        <td>${p.demanda_diaria_prom}</td>
        <td>${p.dias_hasta_quiebre ?? '—'}</td>
        <td>${p.cantidad_recomendada_pedir}</td>
      </tr>`)
      .join('');
  } catch (err) {
    toast('Error cargando reportes: ' + err.message);
  }
}

// ====================== Subir datos (HU-17 / HU-03) ======================
$('#btn-up-prod').addEventListener('click', () => subir('#file-productos', '/datos/productos', false));
$('#btn-up-hechos').addEventListener('click', () => subir('#file-hechos', '/datos/hechos', true));

async function subir(inputSel, ruta, reentrena) {
  const file = $(inputSel).files[0];
  if (!file) return setMsg($('#upload-msg'), 'Selecciona un archivo CSV primero', 'error');
  const fd = new FormData();
  fd.append('file', file);
  try {
    setMsg($('#upload-msg'), 'Subiendo...', '');
    const r = await api(ruta, { method: 'POST', form: fd });
    let txt = `Cargadas ${r.filas} filas en ${r.tabla}.`;
    if (reentrena && r.entrenamiento?.mae !== undefined) {
      txt += ` Modelo reentrenado (MAE ${r.entrenamiento.mae}).`;
    }
    setMsg($('#upload-msg'), txt, 'ok');
    toast('Datos cargados correctamente');
    cargarDashboard();
    cargarProductos();
  } catch (err) {
    setMsg($('#upload-msg'), err.message, 'error');
  }
}

// ====================== Arranque ======================
if (Auth.token) mostrarApp();
