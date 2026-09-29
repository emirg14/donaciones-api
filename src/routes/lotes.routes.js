'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { AppError } = require('../utils/errors');
const { validateLote, parseId, ESTADOS } = require('../utils/validators');

/**
 * Lotes de alimentos (protegido con JWT):
 *   GET   /api/lotes?estado=      -> donante: sus lotes · ONG: disponibles + los suyos · admin: todos
 *   POST  /api/lotes              -> empresa donante publica un lote
 *   GET   /api/lotes/:id          -> detalle con historial (trazabilidad)
 *   PATCH /api/lotes/:id/estado   -> cambio de estado según la máquina de estados
 */
function createLotesRouter({ authService, loteService }) {
  const router = express.Router();
  router.use(authenticate(authService));

  const requireId = (req) => {
    const id = parseId(req.params.id);
    if (!id) throw new AppError(400, 'Identificador inválido');
    return id;
  };

  const parseEstado = (estado) => {
    if (estado === undefined || estado === '') return null;
    if (!ESTADOS.includes(estado)) throw new AppError(400, 'Estado inválido');
    return estado;
  };

  router.get('/', (req, res) => {
    const lotes = loteService.listar(req.user, parseEstado(req.query.estado));
    res.json({ lotes, total: lotes.length });
  });

  router.post('/', (req, res) => {
    const { errors, value } = validateLote(req.body);
    if (errors.length) throw new AppError(400, 'Datos del lote inválidos', errors);
    const lote = loteService.crear(req.user, value);
    res.status(201).location(`/api/lotes/${lote.id}`).json({ lote });
  });

  router.get('/:id', (req, res) => {
    res.json({ lote: loteService.detalle(req.user, requireId(req)) });
  });

  router.patch('/:id/estado', (req, res) => {
    const id = requireId(req);
    const { estado, nota } = req.body || {};
    if (!ESTADOS.includes(estado)) throw new AppError(400, 'Estado inválido');
    if (nota !== undefined && (typeof nota !== 'string' || nota.length > 200 || /[<>]/.test(nota))) {
      throw new AppError(400, 'La nota debe ser texto de hasta 200 caracteres');
    }
    const lote = loteService.cambiarEstado(req.user, id, estado, nota ? nota.trim() : null);
    res.json({ lote });
  });

  return router;
}

module.exports = { createLotesRouter };
