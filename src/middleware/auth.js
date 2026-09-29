'use strict';

const { AppError } = require('../utils/errors');

/** Exige un encabezado "Authorization: Bearer <jwt>" válido. */
function authenticate(authService) {
  return (req, _res, next) => {
    const header = req.get('authorization') || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return next(new AppError(401, 'Se requiere autenticación'));
    }
    try {
      const payload = authService.verifyToken(token);
      req.user = { id: Number(payload.sub), rol: payload.rol, tipo: payload.tipo, email: payload.email };
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

/** Autoriza solo a los roles indicados (control de acceso basado en roles). */
function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(new AppError(401, 'Se requiere autenticación'));
    if (!roles.includes(req.user.rol)) {
      return next(new AppError(403, 'No tienes permisos para esta acción'));
    }
    return next();
  };
}

module.exports = { authenticate, authorize };
