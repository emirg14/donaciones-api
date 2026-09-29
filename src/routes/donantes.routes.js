'use strict';

const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { AppError } = require('../utils/errors');
const { isValidRol, parseId, parsePagination, TIPOS_CUENTA } = require('../utils/validators');

/**
 * Gestión de donantes (protegida con JWT):
 *   GET    /api/donantes           -> admin: lista paginada
 *   GET    /api/donantes/:id       -> admin o el propio donante
 *   PATCH  /api/donantes/:id/rol   -> admin: cambia el rol
 *   DELETE /api/donantes/:id       -> admin: elimina
 */
function createDonantesRouter({ authService, repo }) {
  const router = express.Router();
  router.use(authenticate(authService));

  const requireId = (req) => {
    const id = parseId(req.params.id);
    if (!id) throw new AppError(400, 'Identificador inválido');
    return id;
  };

  router.get('/', authorize('admin'), (req, res) => {
    const { limit, page, offset } = parsePagination(req.query);
    const tipo = TIPOS_CUENTA.includes(req.query.tipo) ? req.query.tipo : null;
    const donantes = repo.findAll({ limit, offset, tipo });
    res.json({ donantes, page, limit, total: repo.count({ tipo }) });
  });

  router.get('/:id', authorize('admin', 'usuario'), (req, res) => {
    const id = requireId(req);
    // Un usuario solo puede consultar su propio registro (evita IDOR).
    if (req.user.rol !== 'admin' && req.user.id !== id) {
      throw new AppError(403, 'No tienes permisos para esta acción');
    }
    const donante = repo.findById(id);
    if (!donante) throw new AppError(404, 'Donante no encontrado');
    res.json({ donante });
  });

  router.patch('/:id/rol', authorize('admin'), (req, res) => {
    const id = requireId(req);
    const { rol } = req.body || {};
    if (!isValidRol(rol)) throw new AppError(400, 'Rol inválido: use "admin" o "usuario"');
    if (id === req.user.id && rol !== 'admin') {
      throw new AppError(400, 'Un administrador no puede quitarse su propio rol');
    }
    const donante = repo.updateRol(id, rol);
    if (!donante) throw new AppError(404, 'Donante no encontrado');
    res.json({ donante });
  });

  router.delete('/:id', authorize('admin'), (req, res) => {
    const id = requireId(req);
    if (id === req.user.id) throw new AppError(400, 'Un administrador no puede eliminarse a sí mismo');
    if (!repo.remove(id)) throw new AppError(404, 'Donante no encontrado');
    res.status(204).end();
  });

  return router;
}

module.exports = { createDonantesRouter };
