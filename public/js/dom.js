// Utilidades de DOM. Nunca se usa innerHTML con datos: el texto siempre se
// inserta como nodos de texto, lo que previene XSS en el navegador.

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'text') el.textContent = value;
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (value === true) el.setAttribute(key, '');
    else el.setAttribute(key, String(value));
  }
  append(el, children);
  return el;
}

export function append(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

export function clear(el, ...children) {
  el.replaceChildren();
  return append(el, children);
}

// ---------- iconos SVG (trazos simples, sin librerías externas) ----------
const ICONOS = {
  bell: 'M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  pin: 'M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  box: 'M21 8 12 3 3 8v8l9 5 9-5V8zM3 8l9 5 9-5M12 13v8',
  truck: 'M1 4h13v12H1zM14 9h4l4 4v3h-8M5.5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18.5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  check: 'M20 6 9 17l-5-5',
  leaf: 'M5 21c.5-9 6-14 16-15-.5 9-6 14-13 14M5 21c3-5 6-8 10-10',
  plus: 'M12 5v14M5 12h14',
  download: 'M12 3v12M7 10l5 5 5-5M4 21h16',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  chart: 'M3 3v18h18M7 16v-4M12 16V8M17 16v-7',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  meal: 'M3 11h18a9 9 0 0 1-18 0zM12 3v4M8 5v2M16 5v2',
  cloud: 'M17.5 19H8a6 6 0 1 1 1.3-11.9A5 5 0 0 1 19 9a5 5 0 0 1-1.5 10z',
  x: 'M18 6 6 18M6 6l12 12',
  history: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2'
};

export function icon(name, size = 18) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', ICONOS[name] || '');
  svg.append(path);
  return svg;
}

// ---------- formato ----------
const nf = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 });
export const num = (n) => nf.format(Number(n) || 0);
export const kg = (n) => `${num(n)} kg`;

/** Las fechas de SQLite vienen en UTC como "AAAA-MM-DD HH:MM:SS". */
export const parseUtc = (s) => new Date(`${String(s).replace(' ', 'T')}Z`);

export function fechaHora(s) {
  return parseUtc(s).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function fecha(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function hace(s) {
  const seg = Math.round((Date.now() - parseUtc(s).getTime()) / 1000);
  if (seg < 60) return 'hace un momento';
  const min = Math.round(seg / 60);
  if (min < 60) return `hace ${min} min`;
  const hrs = Math.round(min / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const dias = Math.round(hrs / 24);
  return `hace ${dias} ${dias === 1 ? 'día' : 'días'}`;
}

export function diasParaCaducar(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const hoy = new Date();
  const base = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((new Date(y, m - 1, d) - base) / 86400000);
}

export const hoyIso = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const ESTADOS = {
  disponible: { label: 'Disponible', icon: 'box' },
  reservado: { label: 'Reservado', icon: 'clock' },
  en_transito: { label: 'En camino', icon: 'truck' },
  entregado: { label: 'Entregado', icon: 'check' },
  cancelado: { label: 'Cancelado', icon: 'x' }
};

export const CATEGORIAS = {
  frutas_verduras: 'Frutas y verduras',
  panaderia: 'Panadería',
  lacteos: 'Lácteos',
  abarrotes: 'Abarrotes',
  preparados: 'Comida preparada',
  otros: 'Otros'
};
