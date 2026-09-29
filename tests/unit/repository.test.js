const { createDatabase } = require('../../src/db/database');
const { createDonanteRepository } = require('../../src/repositories/donanteRepository');

describe('donanteRepository', () => {
  let repo;
  const base = { nombre: 'Ana', email: 'ana@x.mx', passwordHash: 'hash' };

  beforeEach(() => {
    repo = createDonanteRepository(createDatabase());
  });

  test('crea un donante con rol "usuario" por defecto y sin exponer el hash', () => {
    const d = repo.create(base);
    expect(d).toMatchObject({ id: 1, nombre: 'Ana', email: 'ana@x.mx', rol: 'usuario', empresa: null });
    expect(d).not.toHaveProperty('password_hash');
  });

  test('findByEmail devuelve el registro completo (incluye hash) o null', () => {
    repo.create(base);
    expect(repo.findByEmail('ana@x.mx').password_hash).toBe('hash');
    expect(repo.findByEmail('nadie@x.mx')).toBeNull();
  });

  test('las consultas son parametrizadas: un payload SQLi no altera la consulta', () => {
    repo.create(base);
    expect(repo.findByEmail("' OR '1'='1")).toBeNull();
    expect(repo.findById('1 OR 1=1')).toBeNull();
    expect(repo.count()).toBe(1);
  });

  test('rfcExists, findAll con paginación y count', () => {
    repo.create({ ...base, rfc: 'ABC010101AB1' });
    repo.create({ ...base, email: 'b@x.mx' });
    repo.create({ ...base, email: 'c@x.mx' });
    expect(repo.rfcExists('ABC010101AB1')).toBe(true);
    expect(repo.rfcExists('ZZZ010101AB1')).toBe(false);
    expect(repo.findAll({ limit: 2, offset: 0 })).toHaveLength(2);
    expect(repo.findAll({ limit: 2, offset: 2 })).toHaveLength(1);
    expect(repo.findAll()).toHaveLength(3);
    expect(repo.count()).toBe(3);
  });

  test('updateRol y remove', () => {
    const d = repo.create(base);
    expect(repo.updateRol(d.id, 'admin').rol).toBe('admin');
    expect(repo.updateRol(999, 'admin')).toBeNull();
    expect(repo.remove(d.id)).toBe(true);
    expect(repo.remove(d.id)).toBe(false);
  });

  test('la base de datos impone correo único y roles válidos', () => {
    repo.create(base);
    expect(() => repo.create(base)).toThrow(/UNIQUE/);
    expect(() => repo.create({ ...base, email: 'z@x.mx', rol: 'superadmin' })).toThrow(/CHECK/);
  });
});
