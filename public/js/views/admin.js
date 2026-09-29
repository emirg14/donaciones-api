import { h, clear, icon, kg, num, fechaHora, ESTADOS, CATEGORIAS } from '../dom.js';
import { api, session } from '../api.js';
import { kpisImpacto, barrasH, pintarBarras, columnasDias, badgeEstado, verHistorial, toast, confirmar } from './shared.js';

// Acciones que el administrador puede ejecutar como operador (reservar es exclusivo de las ONG).
const ACCIONES_ADMIN = {
  disponible: [['cancelado', 'Cancelar']],
  reservado: [['en_transito', 'Marcar en camino'], ['disponible', 'Liberar']],
  en_transito: [['entregado', 'Confirmar entrega']]
};

async function descargarReporte() {
  try {
    await api.descargarCsv();
    toast('Reporte descargado');
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ---------- piezas de las tablas (funciones pequeñas para mantener el código plano) ----------
function botonesAdmin(lote, mover) {
  const acciones = ACCIONES_ADMIN[lote.estado] || [];
  return h('div', { class: 'acciones__caja' },
    acciones.map(([estado, txt]) => h('button', { class: 'btn btn--sec btn--mini', onclick: () => mover(lote, estado) }, txt)));
}

function filaLote(l, mover) {
  return h('tr', {},
    h('td', {}, `#${l.id}`),
    h('td', {},
      h('button', { class: 'enlace', onclick: () => verHistorial(l.id) }, l.titulo),
      h('div', { class: 'muted small' }, CATEGORIAS[l.categoria])),
    h('td', { class: 'num' }, kg(l.cantidad_kg)),
    h('td', {}, badgeEstado(l.estado)),
    h('td', {}, l.donante_empresa || l.donante_nombre),
    h('td', {}, l.ong_empresa || l.ong_nombre || '—'),
    h('td', { class: 'muted small' }, fechaHora(l.actualizado_en)),
    h('td', {}, botonesAdmin(l, mover)));
}

function selectorRol(d, cambiarRol) {
  return h('select', { 'aria-label': `Rol de ${d.nombre}`, onchange: (e) => cambiarRol(d, e.target.value) },
    h('option', { value: 'usuario', selected: d.rol === 'usuario' }, 'Usuario'),
    h('option', { value: 'admin', selected: d.rol === 'admin' }, 'Administrador'));
}

function filaCuenta(d, yo, { cambiarRol, eliminar }) {
  const esYo = d.id === yo;
  return h('tr', {},
    h('td', {}, d.nombre),
    h('td', {}, d.empresa || '—'),
    h('td', { class: 'muted' }, d.email),
    h('td', {}, h('span', { class: `chip chip--${d.tipo}` }, d.tipo === 'ong' ? 'ONG' : 'Donante')),
    h('td', {}, esYo ? h('span', { class: 'chip chip--admin' }, 'Administrador (tú)') : selectorRol(d, cambiarRol)),
    h('td', {}, esYo ? null : h('button', { class: 'btn btn--texto btn--peligro-txt', onclick: () => eliminar(d) }, 'Eliminar')));
}

function tabla(encabezados, cuerpo) {
  return h('div', { class: 'tabla-wrap' }, h('table', { class: 'tabla' },
    h('thead', {}, h('tr', {}, encabezados.map((t) => h('th', {}, t)))),
    cuerpo));
}

function vistaResumen(i) {
  const estados = Object.keys(ESTADOS).map((e) => ({ e, n: i.por_estado[e] ? i.por_estado[e].lotes : 0 }));
  return [
    kpisImpacto(i),
    h('div', { class: 'dos-col dos-col--igual' },
      h('section', { class: 'tarjeta' }, h('h2', {}, 'Kilos entregados por día'), h('p', { class: 'muted small' }, 'Últimos 14 días'), columnasDias(i.por_dia)),
      h('section', { class: 'tarjeta' }, h('h2', {}, 'Kilos entregados por categoría'),
        barrasH(i.por_categoria.map((c) => ({ etiqueta: CATEGORIAS[c.categoria], valor: c.kg }))))),
    h('div', { class: 'dos-col dos-col--igual' },
      h('section', { class: 'tarjeta' }, h('h2', {}, 'Lotes por estado'),
        h('div', { class: 'estados' }, estados.map(({ e, n }) => h('div', { class: 'estados__item' }, badgeEstado(e), h('strong', {}, num(n)))))),
      h('section', { class: 'tarjeta' }, h('h2', {}, 'Empresas con más kilos entregados'),
        h('ol', { class: 'ranking' }, i.top_donantes.map((d) => h('li', {}, h('span', {}, d.nombre), h('strong', {}, kg(d.kg)))))))
  ];
}

/** Panel del administrador: indicadores globales, todos los lotes y gestión de cuentas. */
export function panelAdmin(cont) {
  let pestana = 'resumen';
  let filtroEstado = '';
  let ultimaFirma = null;
  const tabs = h('div', { class: 'tabs' });
  const cuerpo = h('div', { class: 'pila' });

  const cambiarPestana = (v) => {
    pestana = v;
    ultimaFirma = null;
    pintarTabs();
    refrescar();
  };
  function pintarTabs() {
    clear(tabs, [['resumen', 'Resumen', 'chart'], ['lotes', 'Lotes', 'box'], ['cuentas', 'Cuentas', 'users']].map(([v, t, i]) =>
      h('button', { class: `tab${pestana === v ? ' activo' : ''}`, onclick: () => cambiarPestana(v) }, icon(i, 16), t)));
  }
  pintarTabs();

  clear(cont,
    h('div', { class: 'panel__cab' },
      h('div', {}, h('h1', {}, 'Panel de administración'), h('p', { class: 'muted' }, 'Impacto global de la red, trazabilidad de lotes y control de cuentas.')),
      h('button', { class: 'btn btn--pri', onclick: descargarReporte }, icon('download', 18), 'Descargar reporte (CSV)')),
    tabs,
    cuerpo);

  const cambio = (firma) => {
    if (firma === ultimaFirma) return false;
    ultimaFirma = firma;
    return true;
  };

  async function mover(lote, estado) {
    try {
      await api.cambiarEstado(lote.id, estado);
      toast(`Lote #${lote.id}: ${ESTADOS[estado].label}`);
      refrescar();
    } catch (err) { toast(err.message, 'error'); }
  }

  async function cambiarRol(d, rol) {
    try { await api.cambiarRol(d.id, rol); toast(`Rol actualizado: ${d.nombre}`); } catch (err) { toast(err.message, 'error'); }
    ultimaFirma = null;
    refrescar();
  }

  async function borrarCuenta(d) {
    try {
      await api.eliminarCuenta(d.id);
      toast('Cuenta eliminada');
      ultimaFirma = null;
      refrescar();
      return true;
    } catch (err) {
      toast(err.message, 'error');
      return false;
    }
  }
  const eliminar = (d) => confirmar('Eliminar cuenta', `Se eliminará la cuenta de ${d.nombre} y sus lotes. Esta acción no se puede deshacer.`, 'Eliminar', () => borrarCuenta(d));

  const alFiltrar = (e) => {
    filtroEstado = e.target.value;
    refrescar();
  };

  async function resumen() {
    const { impacto } = await api.impacto();
    if (!cambio(JSON.stringify(impacto))) return;
    clear(cuerpo, vistaResumen(impacto));
    pintarBarras(cuerpo);
  }

  async function lotes() {
    const { lotes: ls } = await api.lotes(filtroEstado || undefined);
    const primeraVez = ultimaFirma === null;
    if (!cambio(JSON.stringify([ls, filtroEstado]))) return;
    const filas = h('tbody', {}, ls.map((l) => filaLote(l, mover)));
    if (!primeraVez && cuerpo.querySelector('tbody')) {
      cuerpo.querySelector('tbody').replaceWith(filas);
      return;
    }
    const select = h('select', { 'aria-label': 'Filtrar por estado', onchange: alFiltrar },
      h('option', { value: '' }, 'Todos los estados'),
      Object.entries(ESTADOS).map(([v, e]) => h('option', { value: v, selected: v === filtroEstado }, e.label)));
    clear(cuerpo, h('section', { class: 'tarjeta' },
      h('div', { class: 'seccion-cab' }, h('h2', {}, 'Todos los lotes'), select),
      tabla(['ID', 'Lote', 'Kg', 'Estado', 'Donante', 'ONG', 'Actualizado', 'Acciones'], filas)));
  }

  async function cuentas() {
    const { donantes } = await api.cuentas();
    if (!cambio(JSON.stringify(donantes))) return;
    const yo = session.usuario.id;
    clear(cuerpo, h('section', { class: 'tarjeta' },
      h('h2', {}, 'Cuentas registradas'),
      tabla(['Nombre', 'Empresa / organización', 'Correo', 'Tipo', 'Rol', ''],
        h('tbody', {}, donantes.map((d) => filaCuenta(d, yo, { cambiarRol, eliminar }))))));
  }

  function refrescar() {
    let tarea = cuentas;
    if (pestana === 'resumen') tarea = resumen;
    else if (pestana === 'lotes') tarea = lotes;
    return tarea().catch((err) => toast(err.message, 'error'));
  }

  return { refrescar };
}
