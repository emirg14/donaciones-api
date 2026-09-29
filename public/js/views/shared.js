import { h, clear, icon, kg, num, fecha, fechaHora, hace, diasParaCaducar, ESTADOS, CATEGORIAS } from '../dom.js';
import { api, session } from '../api.js';

// ---------- marca ----------
export function marca({ grande = false } = {}) {
  return h('a', { href: '#/', class: `marca${grande ? ' marca--grande' : ''}`, 'aria-label': 'Alimentrega, inicio' },
    h('img', { src: '/img/logo.svg', alt: '', width: grande ? 44 : 34, height: grande ? 44 : 34 }),
    h('span', {}, 'Alimentrega'));
}

// ---------- avisos y ventanas ----------
export function toast(mensaje, tipo = 'ok') {
  const cont = document.getElementById('toasts');
  const el = h('div', { class: `toast toast--${tipo}` }, icon(tipo === 'error' ? 'x' : 'check', 16), h('span', {}, mensaje));
  cont.append(el);
  setTimeout(() => el.classList.add('toast--salir'), 3200);
  setTimeout(() => el.remove(), 3700);
}

export function modal(titulo, contenido, { acciones = [] } = {}) {
  const cerrar = () => { fondo.remove(); document.removeEventListener('keydown', esc); };
  const esc = (e) => { if (e.key === 'Escape') cerrar(); };
  const fondo = h('div', { class: 'modal-fondo', onclick: (e) => { if (e.target === fondo) cerrar(); } },
    h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo },
      h('header', { class: 'modal__cab' },
        h('h3', {}, titulo),
        h('button', { class: 'btn-icono', 'aria-label': 'Cerrar', onclick: cerrar }, icon('x'))),
      h('div', { class: 'modal__cuerpo' }, contenido),
      acciones.length ? h('footer', { class: 'modal__pie' }, acciones.map((a) =>
        h('button', { class: `btn ${a.clase || 'btn--sec'}`, onclick: async () => { if ((await a.accion()) !== false) cerrar(); } }, a.texto))) : null));
  document.body.append(fondo);
  document.addEventListener('keydown', esc);
  return cerrar;
}

export function confirmar(titulo, texto, textoBoton, accion) {
  modal(titulo, h('p', {}, texto), {
    acciones: [
      { texto: 'Cancelar', clase: 'btn--sec', accion: () => true },
      { texto: textoBoton, clase: 'btn--peligro', accion }
    ]
  });
}

// ---------- piezas de lote ----------
export function badgeEstado(estado) {
  const e = ESTADOS[estado];
  return h('span', { class: `badge badge--${estado}` }, icon(e.icon, 13), e.label);
}

const PASOS = ['disponible', 'reservado', 'en_transito', 'entregado'];
const PASOS_TXT = ['Publicado', 'Reservado', 'En camino', 'Entregado'];

export function progreso(estado) {
  if (estado === 'cancelado') return h('div', { class: 'progreso progreso--cancelado' }, 'Lote cancelado por el donante');
  const idx = PASOS.indexOf(estado);
  const clasePaso = (i) => {
    if (i < idx) return 'hecho';
    return i === idx ? 'actual' : '';
  };
  return h('ol', { class: 'progreso', 'aria-label': `Estado: ${ESTADOS[estado].label}` },
    PASOS.map((p, i) => h('li', { class: clasePaso(i) }, h('span', { class: 'punto' }), h('span', { class: 'txt' }, PASOS_TXT[i]))));
}

export function caducidadTexto(iso, estado) {
  if (estado === 'entregado' || estado === 'cancelado') return h('span', { class: 'muted' }, `Caducaba ${fecha(iso)}`);
  const d = diasParaCaducar(iso);
  let txt = `Caduca en ${d} días`;
  if (d < 0) txt = 'Caducado';
  else if (d === 0) txt = 'Caduca hoy';
  else if (d === 1) txt = 'Caduca mañana';
  return h('span', { class: d <= 1 ? 'urgente' : 'muted' }, icon('clock', 13), ` ${txt} · ${fecha(iso)}`);
}

export function tarjetaLote(lote, { acciones = [], mostrarOng = true, mostrarDonante = true } = {}) {
  return h('article', { class: `lote lote--${lote.estado}` },
    h('div', { class: 'lote__cab' },
      h('span', { class: 'chip' }, CATEGORIAS[lote.categoria]),
      badgeEstado(lote.estado)),
    h('h4', { class: 'lote__titulo' }, lote.titulo),
    h('div', { class: 'lote__kg' }, kg(lote.cantidad_kg)),
    h('ul', { class: 'lote__datos' },
      h('li', {}, caducidadTexto(lote.caducidad, lote.estado)),
      h('li', {}, icon('pin', 13), ` ${lote.direccion}`),
      mostrarDonante ? h('li', {}, icon('box', 13), ` Dona: ${lote.donante_empresa || lote.donante_nombre}`) : null,
      mostrarOng && lote.ong_id ? h('li', {}, icon('users', 13), ` Recibe: ${lote.ong_empresa || lote.ong_nombre}`) : null),
    progreso(lote.estado),
    h('div', { class: 'lote__acciones' },
      acciones,
      h('button', { class: 'btn btn--texto', onclick: () => verHistorial(lote.id) }, icon('history', 15), 'Historial')));
}

export async function verHistorial(id) {
  try {
    const { lote } = await api.lote(id);
    modal(`Trazabilidad del lote #${lote.id}`,
      h('div', {},
        h('p', { class: 'muted' }, `${lote.titulo} · ${kg(lote.cantidad_kg)}`),
        h('ol', { class: 'timeline' }, lote.eventos.map((e) =>
          h('li', { class: `timeline__item timeline--${e.estado}` },
            h('div', { class: 'timeline__estado' }, badgeEstado(e.estado)),
            h('div', {},
              h('strong', {}, e.usuario_empresa || e.usuario_nombre || 'Sistema'),
              e.nota ? h('div', { class: 'muted' }, e.nota) : null,
              h('div', { class: 'muted small' }, `${fechaHora(e.creado_en)} · ${hace(e.creado_en)}`)))))));
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ---------- métricas ----------
export function kpi(etiqueta, valor, { sub, icono = 'leaf', tono = '' } = {}) {
  return h('div', { class: `kpi ${tono}` },
    h('div', { class: 'kpi__icono' }, icon(icono, 20)),
    h('div', {},
      h('div', { class: 'kpi__valor' }, valor),
      h('div', { class: 'kpi__etiqueta' }, etiqueta),
      sub ? h('div', { class: 'kpi__sub' }, sub) : null));
}

export function kpisImpacto(imp, { titulo = 'rescatados' } = {}) {
  return h('div', { class: 'kpis' },
    kpi(`Kilos ${titulo}`, kg(imp.kg_rescatados), { icono: 'leaf', tono: 'kpi--verde' }),
    kpi('Comidas estimadas', num(imp.comidas_estimadas), { icono: 'meal', tono: 'kpi--naranja', sub: `${imp.factores.kg_por_comida} kg por comida` }),
    kpi('CO₂e evitado', kg(imp.co2e_evitado_kg), { icono: 'cloud', tono: 'kpi--azul', sub: `${imp.factores.co2e_por_kg} kg CO₂e por kg` }),
    kpi('Lotes entregados', num(imp.lotes_entregados), { icono: 'check', tono: 'kpi--morado' }));
}

const SVG = 'http://www.w3.org/2000/svg';
function s(tag, attrs = {}, ...hijos) {
  const el = document.createElementNS(SVG, tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  hijos.forEach((c) => el.append(typeof c === 'string' ? document.createTextNode(c) : c));
  return el;
}

/** Barras horizontales (p. ej. kilos por categoría). */
export function barrasH(datos) {
  if (!datos.length) return h('p', { class: 'muted' }, 'Aún no hay entregas registradas.');
  const max = Math.max(...datos.map((d) => d.valor));
  return h('div', { class: 'barras' }, datos.map((d) =>
    h('div', { class: 'barras__fila' },
      h('span', { class: 'barras__etq' }, d.etiqueta),
      h('span', { class: 'barras__pista' }, h('span', { class: 'barras__barra', style: null, dataset: { w: Math.max(3, Math.round((d.valor / max) * 100)) } })),
      h('span', { class: 'barras__val' }, kg(d.valor)))));
}

/** Columnas por día (últimos 14 días) dibujadas en SVG. */
export function columnasDias(porDia, dias = 14) {
  const mapa = Object.fromEntries(porDia.map((d) => [d.dia, d.kg]));
  const serie = [];
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    serie.push({ dia: d, kg: mapa[d] || 0 });
  }
  const W = 560; const H = 170; const pad = 22; const ancho = (W - pad) / dias;
  const max = Math.max(10, ...serie.map((d) => d.kg));
  const svg = s('svg', { viewBox: `0 0 ${W} ${H + 24}`, class: 'columnas', role: 'img', 'aria-label': 'Kilos entregados por día' });
  [0.5, 1].forEach((f) => {
    const y = H - (H - 10) * f;
    svg.append(s('line', { x1: pad, x2: W, y1: y, y2: y, class: 'columnas__guia' }));
    svg.append(s('text', { x: 0, y: y + 4, class: 'columnas__eje' }, String(Math.round(max * f))));
  });
  serie.forEach((d, i) => {
    const alto = (d.kg / max) * (H - 10);
    const x = pad + i * ancho + ancho * 0.18;
    const barra = s('rect', { x, y: H - alto, width: ancho * 0.64, height: Math.max(alto, d.kg ? 2 : 0), rx: 3, class: 'columnas__barra' });
    barra.append(s('title', {}, `${d.dia}: ${num(d.kg)} kg`));
    svg.append(barra);
    if (i % 2 === (dias - 1) % 2) {
      const [, m, dd] = d.dia.split('-');
      svg.append(s('text', { x: x + ancho * 0.32, y: H + 16, class: 'columnas__eje', 'text-anchor': 'middle' }, `${Number(dd)}/${Number(m)}`));
    }
  });
  return svg;
}

/** Aplica el ancho de las barras desde data-w (la CSP no permite estilos en línea en el HTML). */
export function pintarBarras(root) {
  root.querySelectorAll('.barras__barra').forEach((b) => { b.style.width = `${b.dataset.w}%`; });
}

// ---------- barra superior del panel ----------
export function barraPanel({ alSalir }) {
  const u = session.usuario;
  const badge = h('span', { class: 'campana__badge', hidden: true }, '0');
  const lista = h('div', { class: 'notifs', hidden: true });
  const campana = h('button', { class: 'btn-icono campana', 'aria-label': 'Notificaciones', onclick: abrir }, icon('bell', 20), badge);
  let rolTxt = u.tipo === 'ong' ? 'ONG' : 'Empresa donante';
  if (u.rol === 'admin') rolTxt = 'Administrador';

  let ultimoConteo = null;
  async function refrescar() {
    try {
      const { notificaciones, no_leidas: n } = await api.notificaciones();
      badge.hidden = n === 0;
      badge.textContent = n > 9 ? '9+' : String(n);
      if (ultimoConteo !== null && n > ultimoConteo && notificaciones[0]) toast(notificaciones[0].mensaje, 'info');
      ultimoConteo = n;
      clear(lista,
        h('div', { class: 'notifs__cab' }, 'Notificaciones'),
        notificaciones.length
          ? notificaciones.map((x) => h('div', { class: `notif${x.leida ? '' : ' notif--nueva'}` }, h('div', {}, x.mensaje), h('div', { class: 'muted small' }, hace(x.creado_en))))
          : h('div', { class: 'notif muted' }, 'Sin notificaciones por ahora.'));
    } catch { /* sin conexión momentánea */ }
  }
  async function abrir(e) {
    e.stopPropagation();
    lista.hidden = !lista.hidden;
    if (!lista.hidden && !badge.hidden) {
      await api.leerNotificaciones();
      badge.hidden = true;
      ultimoConteo = 0;
    }
  }
  document.addEventListener('click', (e) => { if (!lista.contains(e.target)) lista.hidden = true; });

  const barra = h('header', { class: 'barra' },
    h('div', { class: 'barra__izq' }, marca(), h('span', { class: 'envivo', title: 'Los datos se actualizan cada 5 segundos' }, h('span', { class: 'envivo__punto' }), 'En vivo')),
    h('div', { class: 'barra__der' },
      h('div', { class: 'usuario' },
        h('div', { class: 'usuario__nombre' }, u.empresa || u.nombre),
        h('div', { class: 'usuario__rol' }, `${u.nombre} · ${rolTxt}`)),
      h('div', { class: 'campana-wrap' }, campana, lista),
      h('button', { class: 'btn-icono', 'aria-label': 'Cerrar sesión', title: 'Cerrar sesión', onclick: alSalir }, icon('logout', 20))));
  return { barra, refrescar };
}
