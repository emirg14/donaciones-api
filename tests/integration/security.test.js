const request = require('supertest');
const jwt = require('jsonwebtoken');
const { ADMIN, buildTestApp, donanteValido, login } = require('../helpers');

describe('Pruebas de seguridad (OWASP Top 10)', () => {
  let ctx;

  beforeEach(async () => {
    ctx = buildTestApp();
    await ctx.authService.seedAdmin();
  });

  describe('A03 Inyección (SQLi)', () => {
    test.each([
      "' OR '1'='1' --",
      "admin@donaciones.mx' --",
      '" OR ""="',
      "'; DROP TABLE donantes; --"
    ])('login con payload %p no autentica ni rompe la BD', async (payload) => {
      const res = await request(ctx.app).post('/api/auth/login').send({ email: payload, password: payload });
      expect([400, 401]).toContain(res.status);
      expect(res.body.token).toBeUndefined();
      expect(ctx.repo.count()).toBe(1); // la tabla sigue intacta
    });

    test('payload SQLi en el parámetro :id -> 400', async () => {
      const token = await login(ctx.app, ADMIN.email, ADMIN.password);
      const res = await request(ctx.app)
        .get('/api/donantes/1%20OR%201%3D1')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(400);
    });
  });

  describe('A03 Inyección (XSS)', () => {
    test.each(['<script>alert(1)</script>', '"><img src=x onerror=alert(1)>', 'javascript:alert(1)'])(
      'rechaza %p en campos de texto',
      async (payload) => {
        const res = await request(ctx.app).post('/api/auth/registro').send(donanteValido({ nombre: payload, empresa: payload }));
        expect(res.status).toBe(400);
      }
    );

    test('las respuestas son JSON con CSP restrictiva y nosniff', async () => {
      const res = await request(ctx.app).get('/health');
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.headers['content-security-policy']).toContain("default-src 'none'");
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(res.headers['cache-control']).toBe('no-store');
      expect(res.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('A01/A07 Control de acceso y autenticación', () => {
    test('token con alg "none" y rol admin forjado -> 401', async () => {
      const forjado = jwt.sign({ sub: '1', rol: 'admin' }, null, { algorithm: 'none' });
      const res = await request(ctx.app).get('/api/donantes').set('Authorization', `Bearer ${forjado}`);
      expect(res.status).toBe(401);
    });

    test('token expirado -> 401 con mensaje claro', async () => {
      const { secret, issuer, audience } = ctx.config.jwt;
      const expirado = jwt.sign({ sub: '1', rol: 'admin' }, secret, { expiresIn: -1, issuer, audience });
      const res = await request(ctx.app).get('/api/donantes').set('Authorization', `Bearer ${expirado}`);
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('El token ha expirado');
    });

    test('rate limiting en /api/auth tras exceder el máximo -> 429', async () => {
      const limited = buildTestApp({ RATE_LIMIT_MAX: '3' });
      const intentos = [];
      for (let i = 0; i < 4; i += 1) {
        intentos.push((await request(limited.app).post('/api/auth/login').send({ email: 'a@b.mx', password: 'x' })).status);
      }
      expect(intentos.slice(0, 3)).toEqual([401, 401, 401]);
      expect(intentos[3]).toBe(429);
    });
  });

  describe('Robustez de la API', () => {
    test('JSON mal formado -> 400', async () => {
      const res = await request(ctx.app).post('/api/auth/login').set('Content-Type', 'application/json').send('{"email":');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('JSON mal formado');
    });

    test('cuerpo mayor a 10 kb -> 413', async () => {
      const res = await request(ctx.app).post('/api/auth/registro').send({ nombre: 'a'.repeat(20000) });
      expect(res.status).toBe(413);
    });

    test('ruta inexistente -> 404 JSON', async () => {
      const res = await request(ctx.app).get('/no-existe');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Recurso no encontrado');
    });

    test('createApp funciona con su configuración por defecto', () => {
      const { createApp } = require('../../src/app');
      expect(typeof createApp()).toBe('function');
    });
  });
});
