const request = require('supertest');
const { ADMIN, buildTestApp, donanteValido, login } = require('../helpers');

describe('API de donantes (roles admin/usuario)', () => {
  let ctx;
  let adminToken;
  let userToken;
  let donanteId;

  beforeEach(async () => {
    ctx = buildTestApp();
    await ctx.authService.seedAdmin();
    const reg = await request(ctx.app).post('/api/auth/registro').send(donanteValido());
    donanteId = reg.body.donante.id;
    adminToken = await login(ctx.app, ADMIN.email, ADMIN.password);
    userToken = await login(ctx.app, 'maria@alimentos.mx', 'Donante2026');
  });

  const auth = (t) => ({ Authorization: `Bearer ${t}` });

  describe('GET /api/donantes', () => {
    test('admin obtiene la lista paginada', async () => {
      const res = await request(ctx.app).get('/api/donantes?limit=1&page=2').set(auth(adminToken));
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ page: 2, limit: 1, total: 2 });
      expect(res.body.donantes).toHaveLength(1);
    });

    test('valores de paginación fuera de rango se acotan', async () => {
      const res = await request(ctx.app).get('/api/donantes?limit=5000&page=-3').set(auth(adminToken));
      expect(res.body).toMatchObject({ page: 1, limit: 100 });
    });

    test('usuario normal -> 403', async () => {
      const res = await request(ctx.app).get('/api/donantes').set(auth(userToken));
      expect(res.status).toBe(403);
    });

    test('sin token -> 401', async () => {
      const res = await request(ctx.app).get('/api/donantes');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/donantes/:id', () => {
    test('el donante consulta su propio registro', async () => {
      const res = await request(ctx.app).get(`/api/donantes/${donanteId}`).set(auth(userToken));
      expect(res.status).toBe(200);
      expect(res.body.donante.id).toBe(donanteId);
    });

    test('el donante NO puede consultar a otro (IDOR) -> 403', async () => {
      const res = await request(ctx.app).get('/api/donantes/1').set(auth(userToken));
      expect(res.status).toBe(403);
    });

    test('admin consulta cualquiera; inexistente -> 404; id inválido -> 400', async () => {
      expect((await request(ctx.app).get(`/api/donantes/${donanteId}`).set(auth(adminToken))).status).toBe(200);
      expect((await request(ctx.app).get('/api/donantes/999').set(auth(adminToken))).status).toBe(404);
      expect((await request(ctx.app).get('/api/donantes/abc').set(auth(adminToken))).status).toBe(400);
    });
  });

  describe('PATCH /api/donantes/:id/rol', () => {
    test('admin promueve a un donante', async () => {
      const res = await request(ctx.app).patch(`/api/donantes/${donanteId}/rol`).set(auth(adminToken)).send({ rol: 'admin' });
      expect(res.status).toBe(200);
      expect(res.body.donante.rol).toBe('admin');
    });

    test('rol inválido -> 400; sin cuerpo -> 400; inexistente -> 404', async () => {
      const r1 = await request(ctx.app).patch(`/api/donantes/${donanteId}/rol`).set(auth(adminToken)).send({ rol: 'root' });
      const r2 = await request(ctx.app).patch(`/api/donantes/${donanteId}/rol`).set(auth(adminToken));
      const r3 = await request(ctx.app).patch('/api/donantes/999/rol').set(auth(adminToken)).send({ rol: 'usuario' });
      expect([r1.status, r2.status, r3.status]).toEqual([400, 400, 404]);
    });

    test('un admin no puede quitarse su propio rol', async () => {
      const res = await request(ctx.app).patch('/api/donantes/1/rol').set(auth(adminToken)).send({ rol: 'usuario' });
      expect(res.status).toBe(400);
    });

    test('usuario normal no puede cambiar roles -> 403', async () => {
      const res = await request(ctx.app).patch(`/api/donantes/${donanteId}/rol`).set(auth(userToken)).send({ rol: 'admin' });
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/donantes/:id', () => {
    test('admin elimina -> 204, luego 404', async () => {
      expect((await request(ctx.app).delete(`/api/donantes/${donanteId}`).set(auth(adminToken))).status).toBe(204);
      expect((await request(ctx.app).delete(`/api/donantes/${donanteId}`).set(auth(adminToken))).status).toBe(404);
    });

    test('admin no puede eliminarse a sí mismo', async () => {
      const res = await request(ctx.app).delete('/api/donantes/1').set(auth(adminToken));
      expect(res.status).toBe(400);
    });

    test('usuario normal -> 403', async () => {
      const res = await request(ctx.app).delete(`/api/donantes/${donanteId}`).set(auth(userToken));
      expect(res.status).toBe(403);
    });
  });
});
