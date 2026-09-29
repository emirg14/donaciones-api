const { createDatabase } = require('../../src/db/database');
const { createDonanteRepository } = require('../../src/repositories/donanteRepository');
const { createLoteRepository } = require('../../src/repositories/loteRepository');
const { createNotificacionRepository } = require('../../src/repositories/notificacionRepository');
const { createLoteService, TRANSICIONES } = require('../../src/services/loteService');

function setup() {
  const db = createDatabase();
  const userRepo = createDonanteRepository(db);
  const loteRepo = createLoteRepository(db);
  const notifRepo = createNotificacionRepository(db);
  const service = createLoteService({ loteRepo, notifRepo, userRepo });
  const mk = (email, tipo, rol = 'usuario', empresa = null) => {
    const u = userRepo.create({ nombre: email.split('@')[0], email, passwordHash: 'x', tipo, rol, empresa });
    return { id: u.id, rol: u.rol, tipo: u.tipo };
  };
  const u = {
    admin: mk('admin@x.mx', 'donante', 'admin'),
    donante: mk('don@x.mx', 'donante', 'usuario', 'Panadería Uno'),
    otroDonante: mk('otro@x.mx', 'donante'),
    ong: mk('ong@x.mx', 'ong', 'usuario', 'Comedor Uno'),
    otraOng: mk('ong2@x.mx', 'ong')
  };
  const datos = { titulo: 'Pan', categoria: 'panaderia', cantidad_kg: 10, caducidad: '2026-10-01', direccion: 'Calle 1', lat: 28.6, lng: -106 };
  return { db, service, loteRepo, notifRepo, u, datos };
}

describe('loteService', () => {
  test('solo las empresas donantes publican; se avisa a todas las ONG', () => {
    const { service, notifRepo, u, datos } = setup();
    const lote = service.crear(u.donante, datos);
    expect(lote).toMatchObject({ estado: 'disponible', donante_empresa: 'Panadería Uno', ong_id: null });
    expect(notifRepo.unreadCount(u.ong.id)).toBe(1);
    expect(notifRepo.unreadCount(u.otraOng.id)).toBe(1);
    expect(notifRepo.list(u.ong.id)[0].mensaje).toContain('Nuevo lote disponible: Pan (10 kg) de Panadería Uno');
    expect(() => service.crear(u.ong, datos)).toThrow('Solo las empresas donantes');
    expect(() => service.crear(u.admin, datos)).toThrow('Solo las empresas donantes');
  });

  test('flujo completo disponible → reservado → en_transito → entregado con historial y avisos', () => {
    const { service, notifRepo, u, datos } = setup();
    const { id } = service.crear(u.donante, datos);
    expect(service.cambiarEstado(u.ong, id, 'reservado')).toMatchObject({ estado: 'reservado', ong_id: u.ong.id, ong_empresa: 'Comedor Uno' });
    service.cambiarEstado(u.ong, id, 'en_transito');
    service.cambiarEstado(u.ong, id, 'entregado', 'Recibido completo');
    const det = service.detalle(u.donante, id);
    expect(det.eventos.map((e) => e.estado)).toEqual(['disponible', 'reservado', 'en_transito', 'entregado']);
    expect(det.eventos[3].nota).toBe('Recibido completo');
    const msgs = notifRepo.list(u.donante.id).map((n) => n.mensaje);
    expect(msgs[0]).toContain('fue entregado. ¡Gracias! Rescataste 10 kg');
    expect(msgs[1]).toContain('va en camino con Comedor Uno');
    expect(msgs[2]).toContain('fue reservado por Comedor Uno');
  });

  test('rechaza transiciones inválidas y actores sin permiso', () => {
    const { service, u, datos } = setup();
    const { id } = service.crear(u.donante, datos);
    expect(() => service.cambiarEstado(u.ong, id, 'entregado')).toThrow('Transición no permitida: disponible → entregado');
    expect(() => service.cambiarEstado(u.donante, id, 'reservado')).toThrow('No tienes permisos');
    expect(() => service.cambiarEstado(u.admin, id, 'reservado')).toThrow('No tienes permisos');
    expect(() => service.cambiarEstado(u.otroDonante, id, 'cancelado')).toThrow('No tienes permisos');
    service.cambiarEstado(u.ong, id, 'reservado');
    expect(() => service.cambiarEstado(u.otraOng, id, 'en_transito')).toThrow('No tienes permisos');
    expect(() => service.cambiarEstado(u.ong, 999, 'reservado')).toThrow('Lote no encontrado');
  });

  test('la ONG puede liberar; el donante cancela y se le avisa a nadie más', () => {
    const { service, notifRepo, u, datos } = setup();
    const { id } = service.crear(u.donante, datos);
    service.cambiarEstado(u.ong, id, 'reservado');
    expect(service.cambiarEstado(u.ong, id, 'disponible')).toMatchObject({ estado: 'disponible', ong_id: null });
    expect(notifRepo.list(u.donante.id)[0].mensaje).toContain('fue liberado');
    notifRepo.markAllRead(u.donante.id);
    expect(service.cambiarEstado(u.donante, id, 'cancelado').estado).toBe('cancelado');
    expect(notifRepo.unreadCount(u.donante.id)).toBe(0);
    expect(() => service.cambiarEstado(u.admin, id, 'disponible')).toThrow('Transición no permitida');
  });

  test('el administrador opera como moderador y se avisa a la ONG y al donante', () => {
    const { service, notifRepo, u, datos } = setup();
    const { id } = service.crear(u.donante, datos);
    service.cambiarEstado(u.ong, id, 'reservado');
    notifRepo.markAllRead(u.ong.id);
    service.cambiarEstado(u.admin, id, 'en_transito');
    expect(notifRepo.list(u.ong.id)[0].mensaje).toContain('El administrador cambió el lote');
    service.cambiarEstado(u.admin, id, 'entregado');
    const id2 = service.crear(u.donante, datos).id;
    service.cambiarEstado(u.admin, id2, 'cancelado');
    expect(notifRepo.list(u.donante.id)[0].mensaje).toContain('fue cancelado');
  });

  test('visibilidad: cada perfil solo ve lo que le corresponde', () => {
    const { service, u, datos } = setup();
    const a = service.crear(u.donante, datos);
    const b = service.crear(u.otroDonante, { ...datos, titulo: 'Leche' });
    service.cambiarEstado(u.ong, b.id, 'reservado');
    expect(service.listar(u.donante).map((l) => l.id)).toEqual([a.id]);
    expect(service.listar(u.ong).map((l) => l.id).sort()).toEqual([a.id, b.id]);
    expect(service.listar(u.otraOng).map((l) => l.id)).toEqual([a.id]);
    expect(service.listar(u.admin, 'reservado').map((l) => l.id)).toEqual([b.id]);
    expect(service.listar(u.donante, 'reservado')).toEqual([]);
    expect(service.listar(u.ong, 'disponible').map((l) => l.id)).toEqual([a.id]);
    expect(() => service.detalle(u.donante, b.id)).toThrow('No tienes permisos para ver');
    expect(() => service.detalle(u.otraOng, b.id)).toThrow('No tienes permisos para ver');
    expect(service.detalle(u.otraOng, a.id).id).toBe(a.id);
    expect(service.detalle(u.admin, b.id).id).toBe(b.id);
  });

  test('impacto: kilos, comidas y CO2e por perfil y público', () => {
    const { service, u, datos } = setup();
    const entregar = (donante, kg) => {
      const { id } = service.crear(donante, { ...datos, cantidad_kg: kg });
      ['reservado', 'en_transito', 'entregado'].forEach((e) => service.cambiarEstado(u.ong, id, e));
    };
    entregar(u.donante, 20);
    entregar(u.otroDonante, 30);
    service.crear(u.donante, datos); // sigue disponible

    const global = service.impacto(u.admin);
    expect(global).toMatchObject({ kg_rescatados: 50, lotes_entregados: 2, comidas_estimadas: 100, co2e_evitado_kg: 125, alcance: 'global' });
    expect(global.top_donantes[0]).toMatchObject({ kg: 30 });
    expect(global.por_categoria[0]).toMatchObject({ categoria: 'panaderia', kg: 50 });
    expect(global.por_dia[0].kg).toBe(50);

    expect(service.impacto(u.donante)).toMatchObject({ kg_rescatados: 20, alcance: 'donante' });
    expect(service.impacto(u.ong)).toMatchObject({ kg_rescatados: 50, alcance: 'ong' });
    expect(service.impacto(u.otraOng)).toMatchObject({ kg_rescatados: 0, lotes_entregados: 0 });

    expect(service.impactoPublico()).toEqual({
      kg_rescatados: 50, lotes_entregados: 2, comidas_estimadas: 100, co2e_evitado_kg: 125,
      lotes_disponibles: 1, donantes_activos: 2, ongs: 2
    });
    expect(TRANSICIONES.entregado).toEqual({});
  });
});
