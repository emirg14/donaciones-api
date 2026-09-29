'use strict';

/**
 * Acceso a datos de lotes de alimentos, su historial y las métricas de impacto.
 * Todas las consultas son sentencias preparadas con parámetros.
 */
const SELECT_LOTE = `
  SELECT l.id, l.donante_id, l.ong_id, l.titulo, l.categoria, l.cantidad_kg, l.caducidad,
         l.direccion, l.lat, l.lng, l.estado, l.creado_en, l.actualizado_en,
         d.nombre AS donante_nombre, d.empresa AS donante_empresa,
         o.nombre AS ong_nombre, o.empresa AS ong_empresa
    FROM lotes l
    JOIN usuarios d ON d.id = l.donante_id
    LEFT JOIN usuarios o ON o.id = l.ong_id`;

const plain = (row) => (row ? { ...row } : null);

function createLoteRepository(db) {
  const stmts = {
    insert: db.prepare(
      `INSERT INTO lotes (donante_id, titulo, categoria, cantidad_kg, caducidad, direccion, lat, lng)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ),
    findById: db.prepare(`${SELECT_LOTE} WHERE l.id = ?`),
    listAll: db.prepare(`${SELECT_LOTE} WHERE (? IS NULL OR l.estado = ?) ORDER BY l.id DESC LIMIT 200`),
    listByDonante: db.prepare(
      `${SELECT_LOTE} WHERE l.donante_id = ? AND (? IS NULL OR l.estado = ?) ORDER BY l.id DESC LIMIT 200`
    ),
    listForOng: db.prepare(
      `${SELECT_LOTE} WHERE (l.estado = 'disponible' OR l.ong_id = ?) AND (? IS NULL OR l.estado = ?)
       ORDER BY CASE l.estado WHEN 'disponible' THEN 0 ELSE 1 END, l.caducidad, l.id DESC LIMIT 200`
    ),
    updateEstado: db.prepare(
      "UPDATE lotes SET estado = ?, ong_id = ?, actualizado_en = datetime('now') WHERE id = ?"
    ),
    insertEvento: db.prepare('INSERT INTO lote_eventos (lote_id, estado, usuario_id, nota) VALUES (?, ?, ?, ?)'),
    eventos: db.prepare(
      `SELECT e.id, e.estado, e.nota, e.creado_en, u.nombre AS usuario_nombre, u.empresa AS usuario_empresa
         FROM lote_eventos e LEFT JOIN usuarios u ON u.id = e.usuario_id
        WHERE e.lote_id = ? ORDER BY e.id`
    ),
    porEstado: db.prepare(
      `SELECT estado, COUNT(*) AS lotes, COALESCE(SUM(cantidad_kg), 0) AS kg FROM lotes
        WHERE (? IS NULL OR donante_id = ?) AND (? IS NULL OR ong_id = ?) GROUP BY estado`
    ),
    porCategoria: db.prepare(
      `SELECT categoria, COUNT(*) AS lotes, SUM(cantidad_kg) AS kg FROM lotes
        WHERE estado = 'entregado' AND (? IS NULL OR donante_id = ?) AND (? IS NULL OR ong_id = ?)
        GROUP BY categoria ORDER BY kg DESC`
    ),
    topDonantes: db.prepare(
      `SELECT COALESCE(d.empresa, d.nombre) AS nombre, COUNT(*) AS lotes, SUM(l.cantidad_kg) AS kg
         FROM lotes l JOIN usuarios d ON d.id = l.donante_id
        WHERE l.estado = 'entregado' GROUP BY d.id ORDER BY kg DESC LIMIT 5`
    ),
    entregasPorDia: db.prepare(
      `SELECT date(e.creado_en) AS dia, SUM(l.cantidad_kg) AS kg
         FROM lote_eventos e JOIN lotes l ON l.id = e.lote_id
        WHERE e.estado = 'entregado' AND date(e.creado_en) >= date('now', ?)
          AND (? IS NULL OR l.donante_id = ?) AND (? IS NULL OR l.ong_id = ?)
        GROUP BY dia ORDER BY dia`
    ),
    donantesActivos: db.prepare("SELECT COUNT(DISTINCT donante_id) AS n FROM lotes WHERE estado = 'entregado'"),
    exportRows: db.prepare(`${SELECT_LOTE} ORDER BY l.id`)
  };

  return {
    create(donanteId, { titulo, categoria, cantidad_kg: kg, caducidad, direccion, lat = null, lng = null }) {
      const r = stmts.insert.run(donanteId, titulo, categoria, kg, caducidad, direccion, lat, lng);
      return this.findById(Number(r.lastInsertRowid));
    },
    findById(id) {
      return plain(stmts.findById.get(id));
    },
    listAll(estado = null) {
      return stmts.listAll.all(estado, estado).map(plain);
    },
    listByDonante(donanteId, estado = null) {
      return stmts.listByDonante.all(donanteId, estado, estado).map(plain);
    },
    listForOng(ongId, estado = null) {
      return stmts.listForOng.all(ongId, estado, estado).map(plain);
    },
    updateEstado(id, estado, ongId) {
      stmts.updateEstado.run(estado, ongId, id);
      return this.findById(id);
    },
    addEvento(loteId, estado, usuarioId, nota = null) {
      stmts.insertEvento.run(loteId, estado, usuarioId, nota);
    },
    eventos(loteId) {
      return stmts.eventos.all(loteId).map(plain);
    },
    /** Métricas agregadas; filtros opcionales por donante u ONG. */
    impacto({ donanteId = null, ongId = null, dias = 14 } = {}) {
      return {
        porEstado: stmts.porEstado.all(donanteId, donanteId, ongId, ongId).map(plain),
        porCategoria: stmts.porCategoria.all(donanteId, donanteId, ongId, ongId).map(plain),
        porDia: stmts.entregasPorDia.all(`-${dias - 1} days`, donanteId, donanteId, ongId, ongId).map(plain)
      };
    },
    topDonantes() {
      return stmts.topDonantes.all().map(plain);
    },
    donantesActivos() {
      return stmts.donantesActivos.get().n;
    },
    exportRows() {
      return stmts.exportRows.all().map(plain);
    }
  };
}

module.exports = { createLoteRepository };
