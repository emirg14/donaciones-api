const request = require('supertest');
const { ADMIN, buildTestApp, donanteValido, login } = require('../helpers');
const { seedDemo, PASSWORD_DEMO } = require('../../src/demo/seed');
const { toLocalIsoDate } = require('../../src/utils/validators');

const manana = () => toLocalIsoDate(new Date(Date.now() + 86400000));
const loteBody = (o = {}) => ({
  titulo: 'Pan dulce del día', categoria: 'panaderia', cantidad_kg: 15, caducidad: manana(),
  direccion: 'Calle Encino 214, Col. Centro', lat: 28.63, lng: -106.08, ...o
});

describe('API de lotes, notificaciones y reportes', () => {
  let ctx; let admin; let donante; let ong;
  const auth = (t) => ({ Authorization: `Bearer ${t}` });

  beforeEach(async () => {
    ctx = buildTestApp();
    await ctx.authService.seedAdmin();
    await request(ctx.app).post('/api/auth/registro').send(donanteValido());
    await request(ctx.app).post('/api/auth/registro').send(donanteValido({ email: 'comedor@ong.mx', rfc: 'COM010101AB1', empresa: 'Comedor Esperanza', tipo: 'ong' }));
    admin = await login(ctx.app, ADMIN.email, ADMIN.password);
    donante = await login(ctx.app, 'maria@alimentos.mx', 'Donante2026');
    ong = await login(ctx.app, 'comedor@ong.mx', 'Donante2026');
  });

  test('flujo completo por HTTP con permisos, notificaciones y trazabilidad', async () => {
    const creado = await request(ctx.app).post('/api/lotes').set(auth(donante)).send(loteBody());
    expect(creado.status).toBe(201);
    const id = creado.body.lote.id;
    expect(creado.headers.location).toBe(`/api/lotes/${id}`);

    const notifOng = await request(ctx.app).get('/api/notificaciones').set(auth(ong));
    expect(notifOng.body.no_leidas).toBe(1);
    expect((await request(ctx.app).post('/api/notificaciones/leer').set(auth(ong))).body.marcadas).toBe(1);

    const lista = await request(ctx.app).get('/api/lotes?estado=disponible').set(auth(ong));
    expect(lista.body.total).toBe(1);

    for (const estado of ['reservado', 'en_transito', 'entregado']) {
      const r = await request(ctx.app).patch(`/api/lotes/${id}/estado`).set(auth(ong)).send({ estado, nota: 'Todo bien' });
      expect(r.status).toBe(200);
      expect(r.body.lote.estado).toBe(estado);
    }
    const det = await request(ctx.app).get(`/api/lotes/${id}`).set(auth(donante));
    expect(det.body.lote.eventos).toHaveLength(4);

    const notifDon = await request(ctx.app).get('/api/notificaciones').set(auth(donante));
    expect(notifDon.body.no_leidas).toBe(3);

    const imp = await request(ctx.app).get('/api/reportes/impacto').set(auth(donante));
    expect(imp.body.impacto).toMatchObject({ kg_rescatados: 15, comidas_estimadas: 30, co2e_evitado_kg: 38 });
  });

  test('validaciones y errores de la API de lotes', async () => {
    const malo = await request(ctx.app).post('/api/lotes').set(auth(donante)).send(loteBody({ titulo: '<img src=x onerror=alert(1)>', cantidad_kg: -1 }));
    expect(malo.status).toBe(400);
    expect(malo.body.detalles.length).toBeGreaterThanOrEqual(2);

    expect((await request(ctx.app).post('/api/lotes').set(auth(ong)).send(loteBody())).status).toBe(403);
    expect((await request(ctx.app).get('/api/lotes')).status).toBe(401);
    expect((await request(ctx.app).get('/api/lotes?estado=robado').set(auth(admin))).status).toBe(400);
    expect((await request(ctx.app).get('/api/lotes?estado=').set(auth(admin))).status).toBe(200);
    expect((await request(ctx.app).get('/api/lotes/abc').set(auth(admin))).status).toBe(400);
    expect((await request(ctx.app).get('/api/lotes/999').set(auth(admin))).status).toBe(404);

    const { body } = await request(ctx.app).post('/api/lotes').set(auth(donante)).send(loteBody());
    const url = `/api/lotes/${body.lote.id}/estado`;
    expect((await request(ctx.app).patch(url).set(auth(ong)).send({ estado: 'volando' })).status).toBe(400);
    expect((await request(ctx.app).patch(url).set(auth(ong))).status).toBe(400);
    expect((await request(ctx.app).patch(url).set(auth(ong)).send({ estado: 'reservado', nota: '<script>' })).status).toBe(400);
    expect((await request(ctx.app).patch(url).set(auth(ong)).send({ estado: 'reservado', nota: 5 })).status).toBe(400);
    expect((await request(ctx.app).patch(url).set(auth(ong)).send({ estado: 'entregado' })).status).toBe(400);
    expect((await request(ctx.app).patch(url).set(auth(donante)).send({ estado: 'reservado' })).status).toBe(403);
  });

  test('reporte CSV solo para administradores y con datos neutralizados', async () => {
    await request(ctx.app).post('/api/lotes').set(auth(donante)).send(loteBody({ titulo: '-Pan con guion inicial' }));
    expect((await request(ctx.app).get('/api/reportes/impacto.csv').set(auth(donante))).status).toBe(403);
    const csv = await request(ctx.app).get('/api/reportes/impacto.csv').set(auth(admin));
    expect(csv.status).toBe(200);
    expect(csv.headers['content-type']).toMatch(/text\/csv/);
    expect(csv.headers['content-disposition']).toMatch(/attachment; filename="reporte-donaciones-\d{4}-\d{2}-\d{2}\.csv"/);
    expect(csv.text).toContain("'-Pan con guion inicial");
    expect(csv.text).toContain('Alimentos del Norte S.A. de C.V.');
    const impAdmin = await request(ctx.app).get('/api/reportes/impacto').set(auth(admin));
    expect(impAdmin.body.impacto.alcance).toBe('global');
  });

  test('cuentas: el administrador filtra por tipo', async () => {
    const r = await request(ctx.app).get('/api/donantes?tipo=ong').set(auth(admin));
    expect(r.body.total).toBe(1);
    expect(r.body.donantes[0].tipo).toBe('ong');
    const todos = await request(ctx.app).get('/api/donantes?tipo=otro').set(auth(admin));
    expect(todos.body.total).toBe(3);
  });

  test('endpoints públicos sin datos personales y sin modo demo', async () => {
    const imp = await request(ctx.app).get('/api/public/impacto');
    expect(imp.status).toBe(200);
    expect(Object.keys(imp.body.impacto)).not.toContain('top_donantes');
    const cfg = await request(ctx.app).get('/api/public/config');
    expect(cfg.body).toEqual({ demo: false, cuentas: [] });
  });

  test('sirve la página web y sus archivos con una CSP propia', async () => {
    const page = await request(ctx.app).get('/');
    expect(page.status).toBe(200);
    expect(page.headers['content-type']).toMatch(/text\/html/);
    expect(page.headers['content-security-policy']).toContain("script-src 'self'");
    expect(page.headers['content-security-policy']).not.toContain('unsafe-inline');
    expect(page.text).toContain('Alimentrega');
    const js = await request(ctx.app).get('/js/app.js');
    expect(js.headers['content-type']).toMatch(/javascript/);
    const api = await request(ctx.app).get('/api/public/impacto');
    expect(api.headers['content-security-policy']).toContain("default-src 'none'");
  });
});

describe('Modo demostración', () => {
  test('genera cuentas y datos ficticios coherentes', async () => {
    const ctx = buildTestApp();
    const { authService, loteService, db } = ctx.app.locals;
    ctx.app.locals.demoAccounts = await seedDemo({ authService, loteService, db });

    const cfg = await request(ctx.app).get('/api/public/config');
    expect(cfg.body.demo).toBe(true);
    expect(cfg.body.cuentas.map((c) => c.etiqueta)).toEqual(['Empresa donante', 'ONG', 'Administrador']);
    cfg.body.cuentas.forEach((c) => expect(c.email).toMatch(/\.test$/));

    const imp = (await request(ctx.app).get('/api/public/impacto')).body.impacto;
    expect(imp).toMatchObject({ lotes_entregados: 9, lotes_disponibles: 3, donantes_activos: 4, ongs: 2 });

    const tok = await login(ctx.app, 'rosa@nidodelnorte.test', PASSWORD_DEMO);
    const n = await request(ctx.app).get('/api/notificaciones').set({ Authorization: `Bearer ${tok}` });
    expect(n.body.no_leidas).toBe(0);
  });
});
