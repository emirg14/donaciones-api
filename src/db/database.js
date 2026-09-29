'use strict';

const { DatabaseSync } = require('node:sqlite');

/**
 * Base de datos relacional ligera (SQLite nativo de Node.js) para el entorno de
 * desarrollo y pruebas. En producción se sustituye por MySQL en AWS RDS
 * manteniendo el mismo esquema y consultas parametrizadas.
 */
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS donantes (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre        TEXT    NOT NULL,
    email         TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    rol           TEXT    NOT NULL DEFAULT 'usuario' CHECK (rol IN ('admin', 'usuario')),
    empresa       TEXT,
    rfc           TEXT    UNIQUE,
    telefono      TEXT,
    creado_en     TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`;

function createDatabase(path = ':memory:') {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  return db;
}

module.exports = { createDatabase };
