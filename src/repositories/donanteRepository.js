'use strict';

/**
 * Acceso a datos de cuentas (empresas donantes, ONG y administradores). Todas las consultas usan sentencias preparadas
 * con parámetros (?) — nunca concatenación de cadenas — para prevenir SQLi.
 */
const PUBLIC_COLUMNS = 'id, nombre, email, rol, tipo, empresa, rfc, telefono, creado_en';

function toPlain(row) {
  return row ? { ...row } : null;
}

function createDonanteRepository(db) {
  const stmts = {
    insert: db.prepare(
      `INSERT INTO usuarios (nombre, email, password_hash, rol, tipo, empresa, rfc, telefono)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ),
    findByEmail: db.prepare('SELECT * FROM usuarios WHERE email = ?'),
    findById: db.prepare(`SELECT ${PUBLIC_COLUMNS} FROM usuarios WHERE id = ?`),
    existsRfc: db.prepare('SELECT 1 AS existe FROM usuarios WHERE rfc = ?'),
    findAll: db.prepare(
      `SELECT ${PUBLIC_COLUMNS} FROM usuarios WHERE (? IS NULL OR tipo = ?) ORDER BY id LIMIT ? OFFSET ?`
    ),
    count: db.prepare('SELECT COUNT(*) AS total FROM usuarios WHERE (? IS NULL OR tipo = ?)'),
    idsByTipo: db.prepare("SELECT id FROM usuarios WHERE tipo = ? AND rol = 'usuario'"),
    updateRol: db.prepare('UPDATE usuarios SET rol = ? WHERE id = ?'),
    remove: db.prepare('DELETE FROM usuarios WHERE id = ?')
  };

  return {
    create({ nombre, email, passwordHash, rol = 'usuario', tipo = 'donante', empresa = null, rfc = null, telefono = null }) {
      const result = stmts.insert.run(nombre, email, passwordHash, rol, tipo, empresa, rfc, telefono);
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
    findAll({ limit = 20, offset = 0, tipo = null } = {}) {
      return stmts.findAll.all(tipo, tipo, limit, offset).map(toPlain);
    },
    count({ tipo = null } = {}) {
      return stmts.count.get(tipo, tipo).total;
    },
    idsByTipo(tipo) {
      return stmts.idsByTipo.all(tipo).map((r) => r.id);
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
