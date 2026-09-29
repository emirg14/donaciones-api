'use strict';

/**
 * Configuración centralizada leída de variables de entorno.
 * En producción el secreto JWT es obligatorio; nunca se usa un valor por defecto.
 */
function loadConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV || 'development';
  const jwtSecret = env.JWT_SECRET;

  if (!jwtSecret && nodeEnv === 'production') {
    throw new Error('JWT_SECRET es obligatorio en producción');
  }
  if (jwtSecret && jwtSecret.length < 32) {
    throw new Error('JWT_SECRET debe tener al menos 32 caracteres');
  }

  return Object.freeze({
    nodeEnv,
    port: Number.parseInt(env.PORT, 10) || 3000,
    dbPath: env.DB_PATH || ':memory:',
    jwt: Object.freeze({
      secret: jwtSecret || 'dev-only-secret-no-usar-en-produccion-0123456789',
      expiresIn: env.JWT_EXPIRES_IN || '1h',
      issuer: 'donaciones-api',
      audience: 'donaciones-web'
    }),
    bcryptRounds: Number.parseInt(env.BCRYPT_ROUNDS, 10) || 12,
    admin: Object.freeze({
      email: env.ADMIN_EMAIL || null,
      password: env.ADMIN_PASSWORD || null
    }),
    rateLimit: Object.freeze({
      windowMs: Number.parseInt(env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
      max: Number.parseInt(env.RATE_LIMIT_MAX, 10) || 20
    })
  });
}

module.exports = { loadConfig };
