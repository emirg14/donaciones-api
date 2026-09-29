'use strict';

const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { loadConfig } = require('./config');
const { createDatabase } = require('./db/database');
const { createDonanteRepository } = require('./repositories/donanteRepository');
const { createLoteRepository } = require('./repositories/loteRepository');
const { createNotificacionRepository } = require('./repositories/notificacionRepository');
const { createAuthService } = require('./services/authService');
const { createLoteService } = require('./services/loteService');
const { createAuthRouter } = require('./routes/auth.routes');
const { createDonantesRouter } = require('./routes/donantes.routes');
const { createLotesRouter } = require('./routes/lotes.routes');
const {
  createNotificacionesRouter,
  createReportesRouter,
  createPublicRouter
} = require('./routes/extra.routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// Página web: solo recursos propios, sin scripts ni estilos en línea.
// (La API usa la política global de helmet, más estricta: default-src 'none'.)
const pageCsp = helmet.contentSecurityPolicy({
  useDefaults: false,
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'"],
    imgSrc: ["'self'", 'data:'],
    connectSrc: ["'self'"],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"]
  }
});

/**
 * Construye la aplicación Express. Recibe sus dependencias por parámetro
 * (inyección de dependencias) para poder probarla de forma aislada.
 */
function createApp({ config = loadConfig(), db } = {}) {
  const database = db || createDatabase(config.dbPath);
  const repo = createDonanteRepository(database);
  const loteRepo = createLoteRepository(database);
  const notifRepo = createNotificacionRepository(database);
  const authService = createAuthService({ repo, config });
  const loteService = createLoteService({ loteRepo, notifRepo, userRepo: repo });

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // Encabezados de seguridad (CSP, HSTS, X-Content-Type-Options, anti-framing, etc.)
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] }
      },
      crossOriginResourcePolicy: { policy: 'same-origin' }
    })
  );
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    res.set('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
    const esApi = req.path.startsWith('/api') || req.path === '/health';
    // Las páginas web reemplazan la CSP de la API por una que permite sus propios archivos.
    return esApi ? next() : pageCsp(req, res, next);
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
  app.use('/api/lotes', createLotesRouter({ authService, loteService }));
  app.use('/api/notificaciones', createNotificacionesRouter({ authService, notifRepo }));
  app.use('/api/reportes', createReportesRouter({ authService, loteService, loteRepo }));
  app.use('/api/public', createPublicRouter({ loteService, getDemoAccounts: () => app.locals.demoAccounts }));

  // Página web de demostración (sitio estático que consume la API)
  app.use(express.static(PUBLIC_DIR, { index: 'index.html' }));

  app.use(notFound);
  app.use(errorHandler);

  Object.assign(app.locals, { authService, loteService, repo, loteRepo, notifRepo, db: database, demoAccounts: null });
  return app;
}

module.exports = { createApp };
