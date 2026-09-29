'use strict';

/**
 * Acceso a datos de donantes. Todas las consultas usan sentencias preparadas
 * con parámetros (?) — nunca concatenación de cadenas — para prevenir SQLi.
 */
const PUBLIC_COLUMNS = 'id, nombre, email, rol, empresa, rfc, telefono, creado_en';

function toPlain(row) {
  return row ? { ...row } : null;
}

function createDonanteRepository(db) {
  const stmts = {
    insert: db.prepare(
      `INSERT INTO donantes (nombre, email, password_hash, rol, empresa, rfc, telefono)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ),
    findByEmail: db.prepare('SELECT * FROM donantes WHERE email = ?'),
    findById: db.prepare(`SELECT ${PUBLIC_COLUMNS} FROM donantes WHERE id = ?`),
    existsRfc: db.prepare('SELECT 1 AS existe FROM donantes WHERE rfc = ?'),
    findAll: db.prepare(`SELECT ${PUBLIC_COLUMNS} FROM donantes ORDER BY id LIMIT ? OFFSET ?`),
    count: db.prepare('SELECT COUNT(*) AS total FROM donantes'),
    updateRol: db.prepare('UPDATE donantes SET rol = ? WHERE id = ?'),
    remove: db.prepare('DELETE FROM donantes WHERE id = ?')
  };

  return {
    create({ nombre, email, passwordHash, rol = 'usuario', empresa = null, rfc = null, telefono = null }) {
      const result = stmts.insert.run(nombre, email, passwordHash, rol, empresa, rfc, telefono);
      return this.findById(Number(result.lastInsertRowid));
    },
    findByEmail(email) {
      return toPlain(stmts.findByEmail.get(email));
    },
    findById(id) {
      return toPlain(stmts.findById.get(id));
    },
    rfcExists(rfc) {
      return Boolean(stmts.existsRfc.get(rfc));
    },
    findAll({ limit = 20, offset = 0 } = {}) {
      return stmts.findAll.all(limit, offset).map(toPlain);
    },
    count() {
      return stmts.count.get().total;
    },
    updateRol(id, rol) {
      const { changes } = stmts.updateRol.run(rol, id);
      return changes > 0 ? this.findById(id) : null;
    },
    remove(id) {
      return stmts.remove.run(id).changes > 0;
    }
  };
}

module.exports = { createDonanteRepository };
