const request = require('supertest');
const { ADMIN, buildTestApp, donanteValido, login } = require('../helpers');

describe('API de autenticación', () => {
  let ctx;

  beforeEach(async () => {
    ctx = buildTestApp();
    await ctx.authService.seedAdmin();
  });

  test('GET /health responde ok', async () => {
    const res = await request(ctx.app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  describe('POST /api/auth/registro', () => {
    test('registra un donante y responde 201 sin exponer la contraseña', async () => {
      const res = await request(ctx.app).post('/api/auth/registro').send(donanteValido());
      expect(res.status).toBe(201);
      expect(res.headers.location).toBe(`/api/donantes/${res.body.donante.id}`);
      expect(res.body.donante).toMatchObject({ email: 'maria@alimentos.mx', rol: 'usuario' });
      expect(JSON.stringify(res.body)).not.toMatch(/password|Donante2026/);
    });

    test('no permite auto-asignarse rol admin (escalamiento de privilegios)', async () => {
      const res = await request(ctx.app).post('/api/auth/registro').send(donanteValido({ rol: 'admin' }));
      expect(res.status).toBe(201);
      expect(res.body.donante.rol).toBe('usuario');
    });

    test('datos inválidos -> 400 con detalles', async () => {
      const res = await request(ctx.app).post('/api/auth/registro').send({ nombre: 'X', email: 'no', password: '1' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Datos de registro inválidos');
      expect(res.body.detalles.length).toBeGreaterThanOrEqual(3);
    });

    test('correo duplicado -> 409', async () => {
      await request(ctx.app).post('/api/auth/registro').send(donanteValido());
      const res = await request(ctx.app).post('/api/auth/registro').send(donanteValido({ rfc: undefined }));
      expect(res.status).toBe(409);
    });
  });

  describe('POST /api/auth/login', () => {
    test('credenciales correctas -> token Bearer', async () => {
      await request(ctx.app).post('/api/auth/registro').send(donanteValido());
      const res = await request(ctx.app).post('/api/auth/login').send({ email: 'maria@alimentos.mx', password: 'Donante2026' });
      expect(res.status).toBe(200);
      expect(res.body.tipo).toBe('Bearer');
      expect(res.body.token.split('.')).toHaveLength(3);
    });

    test('credenciales incorrectas -> 401', async () => {
      const res = await request(ctx.app).post('/api/auth/login').send({ email: ADMIN.email, password: 'Incorrecta99' });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Credenciales inválidas');
    });

    test('cuerpo inválido -> 400', async () => {
      const res = await request(ctx.app).post('/api/auth/login').send({});
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/auth/perfil', () => {
    test('devuelve el perfil con token válido', async () => {
      const token = await login(ctx.app, ADMIN.email, ADMIN.password);
      const res = await request(ctx.app).get('/api/auth/perfil').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.usuario).toMatchObject({ email: ADMIN.email, rol: 'admin' });
    });

    test('sin token -> 401', async () => {
      const res = await request(ctx.app).get('/api/auth/perfil');
      expect(res.status).toBe(401);
    });

    test('token de un usuario eliminado -> 404', async () => {
      const token = ctx.authService.signToken({ id: 999, rol: 'usuario', email: 'x@x.mx' });
      const res = await request(ctx.app).get('/api/auth/perfil').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });
});
