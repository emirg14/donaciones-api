import { h, clear } from './dom.js';
import { api, session } from './api.js';
import { vistaInicio } from './views/landing.js';
import { vistaLogin, vistaRegistro } from './views/auth.js';
import { panelDonante } from './views/donante.js';
import { panelOng } from './views/ong.js';
import { panelAdmin } from './views/admin.js';
import { barraPanel, toast } from './views/shared.js';

const root = document.getElementById('app');
const INTERVALO_MS = 5000;
let config = { demo: false, cuentas: [] };
let vistaActual = null;

function vistaPanel() {
  const usuario = session.usuario;
  if (!session.token || !usuario) {
    location.hash = '#/login';
    return null;
  }
  const { barra, refrescar: refrescarNotifs } = barraPanel({
    alSalir: () => { session.cerrar(); toast('Sesión cerrada'); location.hash = '#/'; }
  });
  const cont = h('main', { class: 'panel' });
  clear(root, barra, cont);

  let panel;
  if (usuario.rol === 'admin') panel = panelAdmin(cont);
  else if (usuario.tipo === 'ong') panel = panelOng(cont);
  else panel = panelDonante(cont);

  const refrescar = async () => {
    await Promise.all([panel.refrescar(), refrescarNotifs()]);
  };
  refrescar().catch((err) => toast(err.message, 'error'));
  return { refrescar };
}

function render() {
  const [ruta, query = ''] = location.hash.replace(/^#/, '').split('?');
  const params = new URLSearchParams(query);
  globalThis.scrollTo(0, 0);

  if (ruta === '/login') vistaActual = vistaLogin(root, config, params);
  else if (ruta === '/registro') vistaActual = vistaRegistro(root, config, params);
  else if (ruta === '/panel') vistaActual = vistaPanel();
  else if (ruta === '' || ruta === '/') {
    vistaActual = vistaInicio(root, config);
  } else {
    // anclas internas de la página de inicio (#como, #quien)
    const destino = document.getElementById(ruta);
    if (destino) destino.scrollIntoView({ behavior: 'smooth' });
    else location.hash = '#/';
  }
}

// Actualización periódica ("tiempo real" por sondeo) solo si la pestaña está visible.
setInterval(() => {
  if (document.visibilityState === 'visible' && vistaActual?.refrescar) {
    vistaActual.refrescar().catch(() => {});
  }
}, INTERVALO_MS);

globalThis.addEventListener('hashchange', () => {
  const ruta = location.hash.replace(/^#/, '');
  if (ruta === 'como' || ruta === 'quien') {
    document.getElementById(ruta)?.scrollIntoView({ behavior: 'smooth' });
    return;
  }
  render();
});

try {
  config = await api.config();
} catch {
  // sin modo demostración
}
render();
