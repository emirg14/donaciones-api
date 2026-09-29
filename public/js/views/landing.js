import { h, clear, icon, kg, num } from '../dom.js';
import { api, session } from '../api.js';
import { marca, toast } from './shared.js';

export async function entrarDemo(cuenta) {
  try {
    const { token, usuario } = await api.login(cuenta.email, cuenta.password);
    session.guardar(token, usuario);
    location.hash = '#/panel';
  } catch (err) {
    toast(err.message, 'error');
  }
}

export function tarjetasDemo(cuentas) {
  return h('div', { class: 'demo-cuentas' }, cuentas.map((c) =>
    h('button', { class: 'demo-cuenta', onclick: () => entrarDemo(c) },
      h('span', { class: 'demo-cuenta__rol' }, c.etiqueta),
      h('span', { class: 'demo-cuenta__nombre' }, c.descripcion),
      h('span', { class: 'demo-cuenta__email' }, c.email))));
}

export function vistaInicio(root, config) {
  const cifras = h('div', { class: 'hero__cifras' });

  async function refrescar() {
    try {
      const { impacto: i } = await api.impactoPublico();
      clear(cifras,
        h('div', { class: 'hero__cifras-cab' }, h('span', { class: 'envivo__punto' }), 'Impacto de la red, en vivo'),
        h('div', { class: 'cifra' }, h('strong', {}, kg(i.kg_rescatados)), h('span', {}, 'de alimento rescatado')),
        h('div', { class: 'cifra' }, h('strong', {}, num(i.comidas_estimadas)), h('span', {}, 'comidas estimadas')),
        h('div', { class: 'cifra' }, h('strong', {}, kg(i.co2e_evitado_kg)), h('span', {}, 'de CO₂e evitado')),
        h('div', { class: 'cifra' }, h('strong', {}, num(i.lotes_disponibles)), h('span', {}, 'lotes esperando recolección')),
        h('div', { class: 'hero__cifras-pie' }, `${num(i.donantes_activos)} empresas donantes · ${num(i.ongs)} organizaciones`));
    } catch { /* se reintenta en el siguiente ciclo */ }
  }

  const paso = (n, ico, titulo, texto, estado) =>
    h('li', { class: `paso paso--${estado}` },
      h('div', { class: 'paso__icono' }, icon(ico, 22)),
      h('div', { class: 'paso__n' }, `Paso ${n}`),
      h('h3', {}, titulo),
      h('p', {}, texto));

  clear(root,
    h('header', { class: 'nav' },
      marca(),
      h('nav', { class: 'nav__links' },
        h('a', { href: '#como' }, 'Cómo funciona'),
        h('a', { href: '#quien' }, 'Para quién'),
        session.token
          ? h('a', { href: '#/panel', class: 'btn btn--pri' }, 'Ir a mi panel')
          : [h('a', { href: '#/login', class: 'btn btn--sec' }, 'Iniciar sesión'),
            h('a', { href: '#/registro', class: 'btn btn--pri' }, 'Crear cuenta')])),

    h('section', { class: 'hero' },
      h('div', { class: 'hero__texto' },
        h('span', { class: 'eyebrow' }, icon('leaf', 14), 'Red de donación de alimentos'),
        h('h1', {}, 'Del excedente ', h('span', { class: 'resalte' }, 'a la mesa'), '.'),
        h('p', { class: 'hero__sub' }, 'Conectamos a empresas con alimentos próximos a caducar con organizaciones que alimentan a quien más lo necesita. Cada kilo se puede rastrear desde que se publica hasta que se entrega.'),
        h('div', { class: 'hero__ctas' },
          h('a', { href: '#/registro?tipo=donante', class: 'btn btn--pri btn--grande' }, icon('box', 18), 'Quiero donar'),
          h('a', { href: '#/registro?tipo=ong', class: 'btn btn--sec btn--grande' }, icon('users', 18), 'Soy una ONG'))),
      cifras),

    config.demo ? h('section', { class: 'demo' },
      h('div', { class: 'demo__cab' },
        h('span', { class: 'eyebrow eyebrow--naranja' }, 'Modo demostración'),
        h('h2', {}, 'Entra con una cuenta de ejemplo'),
        h('p', { class: 'muted' }, 'Tip para presentar: abre la empresa donante en una ventana y la ONG en otra. Cada pestaña guarda su propia sesión, así se ve cómo viaja la donación en tiempo real.')),
      tarjetasDemo(config.cuentas)) : null,

    h('section', { class: 'seccion', id: 'como' },
      h('h2', {}, 'Cómo funciona'),
      h('p', { class: 'muted seccion__sub' }, 'Cuatro estados, visibles para todos los involucrados.'),
      h('ol', { class: 'pasos' },
        paso(1, 'box', 'Publica', 'La empresa registra el lote: qué es, cuántos kilos, cuándo caduca y dónde recogerlo.', 'disponible'),
        paso(2, 'clock', 'Reserva', 'Las ONG ven los lotes disponibles y reservan el que pueden recoger.', 'reservado'),
        paso(3, 'truck', 'Recolecta', 'El equipo de la ONG marca el lote "en camino" desde su celular.', 'en_transito'),
        paso(4, 'check', 'Entrega', 'Al confirmar la entrega, la empresa recibe su aviso y suma su impacto.', 'entregado'))),

    h('section', { class: 'seccion seccion--quien', id: 'quien' },
      h('div', { class: 'quien' },
        h('h3', {}, icon('box', 20), 'Empresas donantes'),
        h('ul', {},
          h('li', {}, 'Publica excedentes en menos de un minuto.'),
          h('li', {}, 'Recibe avisos cuando reservan y entregan tu donación.'),
          h('li', {}, 'Mide tu impacto: kilos, comidas y CO₂e evitado.'))),
      h('div', { class: 'quien' },
        h('h3', {}, icon('users', 20), 'Organizaciones sociales'),
        h('ul', {},
          h('li', {}, 'Lista de lotes disponibles, ordenados por caducidad.'),
          h('li', {}, 'Reserva y organiza la recolección del día.'),
          h('li', {}, 'Historial de todo lo que has recibido.')))),

    h('footer', { class: 'pie' },
      marca(),
      h('p', {}, 'Proyecto académico de Ingeniería de Software · Emiliano Romero García.'),
      h('p', { class: 'muted small' }, 'Alimentrega es una empresa ficticia. Todas las empresas, organizaciones, personas y datos que aparecen en la demostración son inventados.')));

  refrescar();
  return { refrescar };
}
