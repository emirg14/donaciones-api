'use strict';

const { AppError } = require('../utils/errors');

/** Factores de impacto (estimaciones de referencia, documentadas en el informe). */
const FACTOR_CO2E_POR_KG = 2.5; // kg CO2e evitados por kg de alimento que no se desperdicia
const KG_POR_COMIDA = 0.5; // kg de alimento equivalentes a una comida

/**
 * Máquina de estados del lote. Para cada transición se indica quién puede
 * realizarla: "duenio" (la empresa que donó), "ong" (cualquier ONG),
 * "ong_asignada" (la ONG que reservó). El administrador puede ejecutar
 * cualquier transición válida como operador de la plataforma.
 */
const TRANSICIONES = Object.freeze({
  disponible: { reservado: 'ong', cancelado: 'duenio' },
  reservado: { en_transito: 'ong_asignada', disponible: 'ong_asignada' },
  en_transito: { entregado: 'ong_asignada' },
  entregado: {},
  cancelado: {}
});

const nombreDe = (u) => (u ? u.empresa || u.nombre : 'la plataforma');
const kgTexto = (kg) => `${Number(kg).toLocaleString('es-MX')} kg`;

function mensajeParaDonante(lote, nuevo, actor) {
  const base = `Tu lote «${lote.titulo}»`;
  switch (nuevo) {
    case 'reservado': return `${base} fue reservado por ${nombreDe(actor)}`;
    case 'en_transito': return `${base} va en camino con ${nombreDe(actor)}`;
    case 'entregado': return `${base} fue entregado. ¡Gracias! Rescataste ${kgTexto(lote.cantidad_kg)} de alimento`;
    case 'disponible': return `${base} fue liberado y vuelve a estar disponible`;
    default: return `${base} fue cancelado`;
  }
}

/** Resume las métricas de impacto de un conjunto de lotes. */
function resumir({ porEstado, porCategoria, porDia }) {
  const estados = Object.fromEntries(porEstado.map((e) => [e.estado, { lotes: e.lotes, kg: e.kg }]));
  const kgEntregados = estados.entregado ? estados.entregado.kg : 0;
  return {
    kg_rescatados: Math.round(kgEntregados * 10) / 10,
    lotes_entregados: estados.entregado ? estados.entregado.lotes : 0,
    comidas_estimadas: Math.round(kgEntregados / KG_POR_COMIDA),
    co2e_evitado_kg: Math.round(kgEntregados * FACTOR_CO2E_POR_KG),
    por_estado: estados,
    por_categoria: porCategoria,
    por_dia: porDia,
    factores: { co2e_por_kg: FACTOR_CO2E_POR_KG, kg_por_comida: KG_POR_COMIDA }
  };
}

function createLoteService({ loteRepo, notifRepo, userRepo }) {
  const esAdmin = (user) => user.rol === 'admin';

  function puedeVer(user, lote) {
    if (esAdmin(user)) return true;
    if (lote.donante_id === user.id) return true;
    return user.tipo === 'ong' && (lote.estado === 'disponible' || lote.ong_id === user.id);
  }

  function obtenerLote(id) {
    const lote = loteRepo.findById(id);
    if (!lote) throw new AppError(404, 'Lote no encontrado');
    return lote;
  }

  function crear(user, data) {
    if (user.tipo !== 'donante' || esAdmin(user)) {
      throw new AppError(403, 'Solo las empresas donantes pueden publicar lotes');
    }
    const lote = loteRepo.create(user.id, data);
    loteRepo.addEvento(lote.id, 'disponible', user.id, 'Lote publicado');
    const donante = lote.donante_empresa || lote.donante_nombre;
    const aviso = `Nuevo lote disponible: ${lote.titulo} (${kgTexto(lote.cantidad_kg)}) de ${donante}`;
    userRepo.idsByTipo('ong').forEach((ongId) => notifRepo.create(ongId, lote.id, aviso));
    return lote;
  }

  function listar(user, estado = null) {
    if (esAdmin(user)) return loteRepo.listAll(estado);
    if (user.tipo === 'ong') return loteRepo.listForOng(user.id, estado);
    return loteRepo.listByDonante(user.id, estado);
  }

  function detalle(user, id) {
    const lote = obtenerLote(id);
    if (!puedeVer(user, lote)) throw new AppError(403, 'No tienes permisos para ver este lote');
    return { ...lote, eventos: loteRepo.eventos(id) };
  }

  function autorizado(user, lote, quien) {
    // Reservar es exclusivo de una ONG: el lote siempre debe quedar asignado a una.
    if (quien === 'ong') return user.tipo === 'ong' && !esAdmin(user);
    if (esAdmin(user)) return true;
    if (quien === 'duenio') return lote.donante_id === user.id;
    return user.tipo === 'ong' && lote.ong_id === user.id; // ong_asignada
  }

  function cambiarEstado(user, id, nuevo, nota = null) {
    const lote = obtenerLote(id);
    const quien = TRANSICIONES[lote.estado][nuevo];
    if (!quien) {
      throw new AppError(400, `Transición no permitida: ${lote.estado} → ${nuevo}`);
    }
    if (!autorizado(user, lote, quien)) {
      throw new AppError(403, 'No tienes permisos para realizar este cambio');
    }
    let ongId = lote.ong_id;
    if (nuevo === 'reservado') ongId = user.id;
    if (nuevo === 'disponible') ongId = null;

    const actualizado = loteRepo.updateEstado(id, nuevo, ongId);
    loteRepo.addEvento(id, nuevo, user.id, nota);

    const actor = userRepo.findById(user.id);
    if (lote.donante_id !== user.id) {
      notifRepo.create(lote.donante_id, id, mensajeParaDonante(lote, nuevo, actor));
    }
    if (esAdmin(user) && lote.ong_id && lote.ong_id !== user.id) {
      notifRepo.create(lote.ong_id, id, `El administrador cambió el lote «${lote.titulo}» a "${nuevo}"`);
    }
    return actualizado;
  }

  function impacto(user) {
    if (esAdmin(user)) {
      return { ...resumir(loteRepo.impacto()), top_donantes: loteRepo.topDonantes(), alcance: 'global' };
    }
    const filtro = user.tipo === 'ong' ? { ongId: user.id } : { donanteId: user.id };
    return { ...resumir(loteRepo.impacto(filtro)), alcance: user.tipo };
  }

  function impactoPublico() {
    const r = resumir(loteRepo.impacto());
    return {
      kg_rescatados: r.kg_rescatados,
      lotes_entregados: r.lotes_entregados,
      comidas_estimadas: r.comidas_estimadas,
      co2e_evitado_kg: r.co2e_evitado_kg,
      lotes_disponibles: r.por_estado.disponible ? r.por_estado.disponible.lotes : 0,
      donantes_activos: loteRepo.donantesActivos(),
      ongs: userRepo.count({ tipo: 'ong' })
    };
  }

  return { crear, listar, detalle, cambiarEstado, impacto, impactoPublico, TRANSICIONES };
}

module.exports = { createLoteService, TRANSICIONES, FACTOR_CO2E_POR_KG, KG_POR_COMIDA };
