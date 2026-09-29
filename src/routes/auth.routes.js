'use strict';

const express = require('express');
const { validateRegistro, validateLogin } = require('../utils/validators');
const { AppError } = require('../utils/errors');
const { authenticate } = require('../middleware/auth');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Rutas públicas de autenticación:
 *   POST /api/auth/registro  -> alta de persona donante (rol "usuario")
 *   POST /api/auth/login     -> devuelve un JWT
 *   GET  /api/auth/perfil    -> datos del usuario autenticado
 */
function createAuthRouter({ authService, repo }) {
  const router = express.Router();

  router.post(
    '/registro',
    asyncHandler(async (req, res) => {
      const { errors, value } = validateRegistro(req.body);
      if (errors.length) throw new AppError(400, 'Datos de registro inválidos', errors);
      // El rol nunca se toma del cuerpo de la petición: todo registro público es "usuario".
      const donante = await authService.registrar(value);
      res.status(201).location(`/api/donantes/${donante.id}`).json({ donante });
    })
  );

  router.post(
    '/login',
    asyncHandler(async (req, res) => {
      const { errors, value } = validateLogin(req.body);
      if (errors.length) throw new AppError(400, 'Datos de inicio de sesión inválidos', errors);
      const { token, usuario } = await authService.login(value.email, value.password);
      res.json({ token, tipo: 'Bearer', usuario });
    })
  );

  router.get('/perfil', authenticate(authService), (req, res, next) => {
    const usuario = repo.findById(req.user.id);
    if (!usuario) return next(new AppError(404, 'Usuario no encontrado'));
    return res.json({ usuario });
  });

  return router;
}

module.exports = { createAuthRouter, asyncHandler };
