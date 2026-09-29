'use strict';

const { DatabaseSync } = require('node:sqlite');

/**
 * Base de datos relacional ligera (SQLite nativo de Node.js) para el entorno de
 * desarrollo, pruebas y demostración. En producción se sustituye por MySQL en
 * AWS RDS manteniendo el mismo esquema y consultas parametrizadas.
 *
 * - usuarios:        cuentas (empresas donantes, ONG y administradores)
 * - lotes:           donaciones de alimentos y su estado actual
 * - lote_eventos:    historial de cambios de estado (trazabilidad)
 * - notificaciones:  avisos para cada usuario
 */
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS usuarios (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre        TEXT    NOT NULL,
    email         TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    rol           TEXT    NOT NULL DEFAULT 'usuario' CHECK (rol IN ('admin', 'usuario')),
    tipo          TEXT    NOT NULL DEFAULT 'donante' CHECK (tipo IN ('donante', 'ong')),
    empresa       TEXT,
    rfc           TEXT    UNIQUE,
    telefono      TEXT,
    creado_en     TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS lotes (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    donante_id     INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    ong_id         INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    titulo         TEXT    NOT NULL,
    categoria      TEXT    NOT NULL CHECK (categoria IN
                     ('frutas_verduras', 'panaderia', 'lacteos', 'abarrotes', 'preparados', 'otros')),
    cantidad_kg    REAL    NOT NULL CHECK (cantidad_kg > 0 AND cantidad_kg <= 10000),
    caducidad      TEXT    NOT NULL,
    direccion      TEXT    NOT NULL,
    lat            REAL,
    lng            REAL,
    estado         TEXT    NOT NULL DEFAULT 'disponible' CHECK (estado IN
                     ('disponible', 'reservado', 'en_transito', 'entregado', 'cancelado')),
    creado_en      TEXT    NOT NULL DEFAULT (datetime('now')),
    actualizado_en TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_lotes_estado ON lotes(estado);
  CREATE INDEX IF NOT EXISTS idx_lotes_donante ON lotes(donante_id);
  CREATE INDEX IF NOT EXISTS idx_lotes_ong ON lotes(ong_id);

  CREATE TABLE IF NOT EXISTS lote_eventos (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    lote_id     INTEGER NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
    estado      TEXT    NOT NULL,
    usuario_id  INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    nota        TEXT,
    creado_en   TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notificaciones (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    lote_id     INTEGER REFERENCES lotes(id) ON DELETE CASCADE,
    mensaje     TEXT    NOT NULL,
    leida       INTEGER NOT NULL DEFAULT 0,
    creado_en   TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_notif_usuario ON notificaciones(usuario_id, leida);
`;

function createDatabase(path = ':memory:') {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  return db;
}

module.exports = { createDatabase };
