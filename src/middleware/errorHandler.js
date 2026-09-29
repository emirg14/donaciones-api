'use strict';

const { AppError } = require('../utils/errors');

function notFound(req, _res, next) {
  next(new AppError(404, 'Recurso no encontrado'));
}

/**
 * Manejador central de errores. Nunca expone la traza ni mensajes internos
 * al cliente (evita divulgación de información).
 */
function errorHandler(err, req, res, _next) {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON mal formado' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'La petición es demasiado grande' });
  }
  if (err instanceof AppError) {
    const body = { error: err.message };
    if (err.details) body.detalles = err.details;
    return res.status(err.status).json(body);
  }
  if (process.env.NODE_ENV !== 'test') {
    console.error('[error]', err); // se registra en el servidor, no se envía al cliente
  }
  return res.status(500).json({ error: 'Error interno del servidor' });
}

module.exports = { notFound, errorHandler };
