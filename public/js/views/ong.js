import { h, clear, icon, kg, num } from '../dom.js';
import { api } from '../api.js';
import { tarjetaLote, kpi, toast } from './shared.js';

/** Panel de la ONG: lotes disponibles, reservas y confirmación de entregas. */
export function panelOng(cont) {
  const kpis = h('div', { class: 'kpis' });
  const disponibles = h('div', { class: 'grid-lotes' });
  const mias = h('div', { class: 'grid-lotes' });
  const cuentaDisp = h('span', { class: 'contador' });
  const cuentaMias = h('span', { class: 'contador' });

  clear(cont,
    h('div', { class: 'panel__cab' },
      h('div', {}, h('h1', {}, 'Recolección de alimentos'), h('p', { class: 'muted' }, 'Reserva lotes cercanos, recógelos y confirma la entrega.'))),
    kpis,
    h('div', { class: 'dos-col dos-col--igual' },
      h('section', { class: 'tarjeta tarjeta--plana' }, h('div', { class: 'seccion-cab' }, h('h2', {}, icon('box', 18), 'Disponibles ahora'), cuentaDisp), disponibles),
      h('section', { class: 'tarjeta tarjeta--plana' }, h('div', { class: 'seccion-cab' }, h('h2', {}, icon('truck', 18), 'Mis recolecciones'), cuentaMias), mias)));


  async function mover(lote, estado, mensaje) {
    try {
      await api.cambiarEstado(lote.id, estado);
      toast(mensaje);
      refrescar();
    } catch (err) {
      toast(err.message, 'error');
      refrescar();
    }
  }
  const reservar = (l) => mover(l, 'reservado', `Reservaste «${l.titulo}»`);

  let ultimaFirma = null;
  async function refrescar() {
    const [{ lotes }, { impacto }] = await Promise.all([api.lotes(), api.impacto()]);
    // Solo se vuelve a pintar si algo cambió (evita parpadeos).
    const firma = JSON.stringify([lotes, impacto]);
    if (firma === ultimaFirma) return;
    ultimaFirma = firma;
    const disp = lotes.filter((l) => l.estado === 'disponible');
    const activas = lotes.filter((l) => ['reservado', 'en_transito'].includes(l.estado));
    const entregadas = lotes.filter((l) => l.estado === 'entregado');

    clear(kpis,
      kpi('Kilos recibidos', kg(impacto.kg_rescatados), { icono: 'leaf', tono: 'kpi--verde' }),
      kpi('Comidas estimadas', num(impacto.comidas_estimadas), { icono: 'meal', tono: 'kpi--naranja' }),
      kpi('Disponibles ahora', num(disp.length), { icono: 'box', tono: 'kpi--azul', sub: kg(disp.reduce((a, l) => a + l.cantidad_kg, 0)) }),
      kpi('Recolecciones activas', num(activas.length), { icono: 'truck', tono: 'kpi--morado' }));

    cuentaDisp.textContent = String(disp.length);
    cuentaMias.textContent = String(activas.length);

    clear(disponibles, disp.length
      ? disp.map((l) => tarjetaLote(l, {
        mostrarOng: false,
        acciones: [h('button', { class: 'btn btn--pri btn--mini', onclick: () => reservar(l) }, icon('check', 15), 'Reservar')]
      }))
      : h('div', { class: 'vacio' }, icon('box', 28), h('p', {}, 'No hay lotes disponibles en este momento.')));

    clear(mias,
      activas.length
        ? activas.map((l) => tarjetaLote(l, {
          mostrarOng: false,
          acciones: l.estado === 'reservado'
            ? [
              h('button', { class: 'btn btn--pri btn--mini', onclick: () => mover(l, 'en_transito', 'Marcado como recogido: va en camino') }, icon('truck', 15), 'Ya lo recogimos'),
              h('button', { class: 'btn btn--sec btn--mini', onclick: () => mover(l, 'disponible', 'Lote liberado') }, 'Liberar')
            ]
            : [h('button', { class: 'btn btn--pri btn--mini', onclick: () => mover(l, 'entregado', '¡Entrega confirmada!') }, icon('check', 15), 'Confirmar entrega')]
        }))
        : h('div', { class: 'vacio' }, icon('truck', 28), h('p', {}, 'No tienes recolecciones en curso.')),
      entregadas.length ? h('p', { class: 'muted small nota-total' }, `${entregadas.length} lotes entregados en total.`) : null);
  }

  return { refrescar };
}
