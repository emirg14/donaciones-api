'use strict';

const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { toCsv } = require('../utils/csv');

/** Notificaciones del usuario autenticado. */
function createNotificacionesRouter({ authService, notifRepo }) {
  const router = express.Router();
  router.use(authenticate(authService));

  router.get('/', (req, res) => {
    res.json({ notificaciones: notifRepo.list(req.user.id), no_leidas: notifRepo.unreadCount(req.user.id) });
  });

  router.post('/leer', (req, res) => {
    res.json({ marcadas: notifRepo.markAllRead(req.user.id) });
  });

  return router;
}

const COLUMNAS_CSV = [
  { campo: 'id', titulo: 'ID' },
  { campo: 'titulo', titulo: 'Lote' },
  { campo: 'categoria', titulo: 'Categoría' },
  { campo: 'cantidad_kg', titulo: 'Kg' },
  { campo: 'estado', titulo: 'Estado' },
  { campo: 'caducidad', titulo: 'Caducidad' },
  { campo: 'donante', titulo: 'Donante' },
  { campo: 'ong', titulo: 'ONG' },
  { campo: 'direccion', titulo: 'Dirección' },
  { campo: 'creado_en', titulo: 'Publicado (UTC)' },
  { campo: 'actualizado_en', titulo: 'Última actualización (UTC)' }
];

/** Reportes de impacto (historia de usuario 3: reporte mensual del administrador). */
function createReportesRouter({ authService, loteService, loteRepo }) {
  const router = express.Router();
  router.use(authenticate(authService));

  router.get('/impacto', (req, res) => {
    res.json({ impacto: loteService.impacto(req.user) });
  });

  router.get('/impacto.csv', authorize('admin'), (_req, res) => {
    const filas = loteRepo.exportRows().map((l) => ({
      ...l,
      donante: l.donante_empresa || l.donante_nombre,
      ong: l.ong_empresa || l.ong_nombre || ''
    }));
    const fecha = new Date().toISOString().slice(0, 10);
    res
      .type('text/csv; charset=utf-8')
      .attachment(`reporte-donaciones-${fecha}.csv`)
      .send(toCsv(COLUMNAS_CSV, filas));
  });

  return router;
}

/** Datos públicos agregados (sin información personal) para la página de inicio. */
function createPublicRouter({ loteService, getDemoAccounts }) {
  const router = express.Router();

  router.get('/impacto', (_req, res) => {
    res.json({ impacto: loteService.impactoPublico() });
  });

  // Solo en modo demostración se exponen las cuentas de ejemplo para la presentación.
  router.get('/config', (_req, res) => {
    const cuentas = getDemoAccounts();
    res.json({ demo: Boolean(cuentas), cuentas: cuentas || [] });
  });

  return router;
}

module.exports = { createNotificacionesRouter, createReportesRouter, createPublicRouter };
