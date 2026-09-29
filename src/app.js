'use strict';

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { loadConfig } = require('./config');
const { createDatabase } = require('./db/database');
const { createDonanteRepository } = require('./repositories/donanteRepository');
const { createAuthService } = require('./services/authService');
const { createAuthRouter } = require('./routes/auth.routes');
const { createDonantesRouter } = require('./routes/donantes.routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

/**
 * Construye la aplicación Express. Recibe sus dependencias por parámetro
 * (inyección de dependencias) para poder probarla de forma aislada.
 */
function createApp({ config = loadConfig(), db } = {}) {
  const database = db || createDatabase(config.dbPath);
  const repo = createDonanteRepository(database);
  const authService = createAuthService({ repo, config });

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // Encabezados de seguridad (CSP, HSTS, X-Content-Type-Options, etc.)
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] }
      },
      crossOriginResourcePolicy: { policy: 'same-origin' }
    })
  );
  app.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    res.set('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
    next();
  });
  app.use(express.json({ limit: '10kb' }));

  const authLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    limit: config.rateLimit.max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Demasiadas solicitudes, intente más tarde' }
  });

  app.get('/health', (_req, res) => res.json({ status: 'ok', servicio: 'donaciones-api' }));
  app.use('/api/auth', authLimiter, createAuthRouter({ authService, repo }));
  app.use('/api/donantes', createDonantesRouter({ authService, repo }));

  app.use(notFound);
  app.use(errorHandler);

  app.locals.authService = authService;
  app.locals.repo = repo;
  return app;
}

module.exports = { createApp };
