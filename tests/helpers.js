const request = require('supertest');
const { createApp } = require('../src/app');
const { loadConfig } = require('../src/config');
const { createDatabase } = require('../src/db/database');

const ADMIN = { email: 'admin@donaciones.mx', password: 'AdminSegura123' };

function buildTestApp(envOverrides = {}) {
  const config = loadConfig({ ...process.env, ADMIN_EMAIL: ADMIN.email, ADMIN_PASSWORD: ADMIN.password, ...envOverrides });
  const db = createDatabase(':memory:');
  const app = createApp({ config, db });
  return { app, config, db, repo: app.locals.repo, authService: app.locals.authService };
}

function donanteValido(overrides = {}) {
  return {
    nombre: 'María Pérez',
    email: 'maria@alimentos.mx',
    password: 'Donante2026',
    empresa: 'Alimentos del Norte S.A. de C.V.',
    rfc: 'ANO010101AB1',
    telefono: '6141234567',
    ...overrides
  };
}

async function login(app, email, password) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.token;
}

module.exports = { ADMIN, buildTestApp, donanteValido, login };
