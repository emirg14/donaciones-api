import { h, clear, icon, hoyIso, CATEGORIAS } from '../dom.js';
import { api } from '../api.js';
import { tarjetaLote, kpisImpacto, toast, confirmar } from './shared.js';

/** Panel de la empresa donante: publicar lotes y seguir su recorrido. */
export function panelDonante(cont) {
  const kpis = h('div');
  const lista = h('div', { class: 'grid-lotes' });
  const errores = h('div', { class: 'alerta alerta--error', hidden: true });
  let filtro = 'activos';

  const filtros = h('div', { class: 'tabs tabs--mini' });
  function pintarFiltros() {
    clear(filtros, [['activos', 'En curso'], ['entregado', 'Entregados'], ['todos', 'Todos']].map(([v, t]) =>
      h('button', { class: `tab${filtro === v ? ' activo' : ''}`, onclick: () => { filtro = v; pintarFiltros(); refrescar(); } }, t)));
  }
  pintarFiltros();

  const form = h('form', { class: 'form', novalidate: true },
    errores,
    h('label', { class: 'campo' }, h('span', { class: 'campo__etq' }, '¿Qué vas a donar?'),
      h('input', { name: 'titulo', required: true, maxlength: 120, placeholder: 'Ej. Pan dulce del día anterior' })),
    h('div', { class: 'form__fila' },
      h('label', { class: 'campo' }, h('span', { class: 'campo__etq' }, 'Categoría'),
        h('select', { name: 'categoria' }, Object.entries(CATEGORIAS).map(([v, t]) => h('option', { value: v }, t)))),
      h('label', { class: 'campo' }, h('span', { class: 'campo__etq' }, 'Cantidad (kg)'),
        h('input', { name: 'cantidad_kg', type: 'number', min: '0.1', max: '10000', step: '0.1', required: true, placeholder: '25' }))),
    h('label', { class: 'campo' }, h('span', { class: 'campo__etq' }, 'Fecha de caducidad'),
      h('input', { name: 'caducidad', type: 'date', required: true, min: hoyIso(), value: hoyIso() })),
    h('label', { class: 'campo' }, h('span', { class: 'campo__etq' }, 'Dirección de recolección'),
      h('input', { name: 'direccion', required: true, maxlength: 200, placeholder: 'Calle, número y colonia' })),
    h('button', { class: 'btn btn--pri btn--bloque', type: 'submit' }, icon('plus', 18), 'Publicar lote'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errores.hidden = true;
    const datos = Object.fromEntries(new FormData(form));
    datos.cantidad_kg = Number(datos.cantidad_kg);
    try {
      const { lote } = await api.crearLote(datos);
      toast(`Lote publicado: ${lote.titulo}`);
      form.reset();
      form.elements.caducidad.value = hoyIso();
      filtro = 'activos';
      pintarFiltros();
      refrescar();
    } catch (err) {
      clear(errores, h('strong', {}, err.message), h('ul', {}, err.detalles.map((d) => h('li', {}, d))));
      errores.hidden = false;
    }
  });

  clear(cont,
    h('div', { class: 'panel__cab' },
      h('div', {}, h('h1', {}, 'Mis donaciones'), h('p', { class: 'muted' }, 'Publica excedentes y sigue cada lote hasta su entrega.'))),
    kpis,
    h('div', { class: 'dos-col' },
      h('section', { class: 'tarjeta' }, h('h2', {}, icon('plus', 18), 'Publicar un lote'), form),
      h('section', { class: 'tarjeta tarjeta--plana' },
        h('div', { class: 'seccion-cab' }, h('h2', {}, icon('box', 18), 'Mis lotes'), filtros),
        lista)));

  async function cancelar(lote) {
    confirmar('Cancelar lote', `¿Seguro que quieres cancelar «${lote.titulo}»? Las ONG ya no podrán reservarlo.`, 'Cancelar lote', async () => {
      try {
        await api.cambiarEstado(lote.id, 'cancelado');
        toast('Lote cancelado');
        refrescar();
        return true;
      } catch (err) { toast(err.message, 'error'); return false; }
    });
  }

  let ultimaFirma = null;
  async function refrescar() {
    const [{ lotes }, { impacto }] = await Promise.all([api.lotes(), api.impacto()]);
    // Solo se vuelve a pintar si algo cambió (evita parpadeos).
    const firma = JSON.stringify([lotes, impacto, filtro]);
    if (firma === ultimaFirma) return;
    ultimaFirma = firma;
    clear(kpis, kpisImpacto(impacto, { titulo: 'donados y entregados' }));
    const visibles = lotes.filter((l) => {
      if (filtro === 'activos') return ['disponible', 'reservado', 'en_transito'].includes(l.estado);
      if (filtro === 'entregado') return l.estado === 'entregado';
      return true;
    });
    clear(lista, visibles.length
      ? visibles.map((l) => tarjetaLote(l, {
        mostrarDonante: false,
        acciones: l.estado === 'disponible' ? [h('button', { class: 'btn btn--sec btn--mini', onclick: () => cancelar(l) }, 'Cancelar')] : []
      }))
      : h('div', { class: 'vacio' }, icon('box', 28), h('p', {}, 'No hay lotes en esta vista.')));
  }

  return { refrescar };
}
