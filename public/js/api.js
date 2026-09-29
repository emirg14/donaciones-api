// Cliente de la API. El token se guarda en sessionStorage: dura solo mientras la
// pestaña está abierta y cada pestaña puede tener su propia sesión (útil para
// presentar con una ventana de donante y otra de ONG al mismo tiempo).

const TOKEN_KEY = 'alimentrega.token';
const USER_KEY = 'alimentrega.usuario';

function leer(key) {
  try { return sessionStorage.getItem(key); } catch { return null; }
}
function escribir(key, value) {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch { /* almacenamiento no disponible */ }
}

export const session = {
  get token() { return leer(TOKEN_KEY); },
  get usuario() {
    try { return JSON.parse(leer(USER_KEY)); } catch { return null; }
  },
  guardar(token, usuario) {
    escribir(TOKEN_KEY, token);
    escribir(USER_KEY, JSON.stringify(usuario));
  },
  cerrar() {
    escribir(TOKEN_KEY, null);
    escribir(USER_KEY, null);
  }
};

export class ApiError extends Error {
  constructor(status, message, detalles) {
    super(message);
    this.status = status;
    this.detalles = detalles || [];
  }
}

async function request(method, path, body) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (session.token) headers.Authorization = `Bearer ${session.token}`;

  const res = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && session.token) {
      session.cerrar();
      location.hash = '#/login?expirada=1';
    }
    throw new ApiError(res.status, data.error || 'Error de comunicación con el servidor', data.detalles);
  }
  return data;
}

const q = (params) => {
  const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));
  return s.toString() ? `?${s}` : '';
};

export const api = {
  login: (email, password) => request('POST', '/api/auth/login', { email, password }),
  registro: (datos) => request('POST', '/api/auth/registro', datos),
  perfil: () => request('GET', '/api/auth/perfil'),
  lotes: (estado) => request('GET', `/api/lotes${q({ estado })}`),
  lote: (id) => request('GET', `/api/lotes/${encodeURIComponent(id)}`),
  crearLote: (datos) => request('POST', '/api/lotes', datos),
  cambiarEstado: (id, estado) => request('PATCH', `/api/lotes/${encodeURIComponent(id)}/estado`, { estado }),
  notificaciones: () => request('GET', '/api/notificaciones'),
  leerNotificaciones: () => request('POST', '/api/notificaciones/leer', {}),
  impacto: () => request('GET', '/api/reportes/impacto'),
  impactoPublico: () => request('GET', '/api/public/impacto'),
  config: () => request('GET', '/api/public/config'),
  cuentas: (tipo) => request('GET', `/api/donantes${q({ tipo, limit: 100 })}`),
  cambiarRol: (id, rol) => request('PATCH', `/api/donantes/${encodeURIComponent(id)}/rol`, { rol }),
  eliminarCuenta: (id) => request('DELETE', `/api/donantes/${encodeURIComponent(id)}`),

  async descargarCsv() {
    const res = await fetch('/api/reportes/impacto.csv', { headers: { Authorization: `Bearer ${session.token}` } });
    if (!res.ok) throw new ApiError(res.status, 'No se pudo generar el reporte');
    const blob = await res.blob();
    const nombre = /filename="?([^";]+)"?/.exec(res.headers.get('content-disposition') || '');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre ? nombre[1] : 'reporte-donaciones.csv';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
};
