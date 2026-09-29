'use strict';

/** Notificaciones dentro de la plataforma (historia de usuario 4: aviso al donante). */
function createNotificacionRepository(db) {
  const stmts = {
    insert: db.prepare('INSERT INTO notificaciones (usuario_id, lote_id, mensaje) VALUES (?, ?, ?)'),
    list: db.prepare(
      'SELECT id, lote_id, mensaje, leida, creado_en FROM notificaciones WHERE usuario_id = ? ORDER BY id DESC LIMIT 30'
    ),
    unread: db.prepare('SELECT COUNT(*) AS n FROM notificaciones WHERE usuario_id = ? AND leida = 0'),
    markAll: db.prepare('UPDATE notificaciones SET leida = 1 WHERE usuario_id = ? AND leida = 0')
  };

  return {
    create(usuarioId, loteId, mensaje) {
      stmts.insert.run(usuarioId, loteId, mensaje);
    },
    list(usuarioId) {
      return stmts.list.all(usuarioId).map((n) => ({ ...n, leida: n.leida === 1 }));
    },
    unreadCount(usuarioId) {
      return stmts.unread.get(usuarioId).n;
    },
    markAllRead(usuarioId) {
      return stmts.markAll.run(usuarioId).changes;
    }
  };
}

module.exports = { createNotificacionRepository };
