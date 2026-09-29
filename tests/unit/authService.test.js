const jwt = require('jsonwebtoken');
const { createDatabase } = require('../../src/db/database');
const { createDonanteRepository } = require('../../src/repositories/donanteRepository');
const { createAuthService } = require('../../src/services/authService');
const { loadConfig } = require('../../src/config');

function setup(env = {}) {
  const config = loadConfig({ ...process.env, ...env });
  const repo = createDonanteRepository(createDatabase());
  return { config, repo, service: createAuthService({ repo, config }) };
}

const datos = { nombre: 'Luis', email: 'luis@x.mx', password: 'Segura2026', rfc: 'LUI010101AB1' };

describe('authService.registrar', () => {
  test('guarda la contraseña con hash bcrypt, nunca en texto plano', async () => {
    const { service, repo } = setup();
    const d = await service.registrar(datos);
    const row = repo.findByEmail('luis@x.mx');
    expect(d.rol).toBe('usuario');
    expect(row.password_hash).not.toBe('Segura2026');
    expect(row.password_hash).toMatch(/^\$2[aby]\$/);
  });

  test('rechaza correo duplicado con 409', async () => {
    const { service } = setup();
    await service.registrar(datos);
    await expect(service.registrar({ ...datos, rfc: undefined })).rejects.toMatchObject({ status: 409 });
  });

  test('rechaza RFC duplicado con 409', async () => {
    const { service } = setup();
    await service.registrar(datos);
    await expect(service.registrar({ ...datos, email: 'otro@x.mx' })).rejects.toMatchObject({
      status: 409,
      message: 'El RFC ya está registrado'
    });
  });
});

describe('authService.login y tokens', () => {
  test('emite un JWT con sub, rol, issuer y audience', async () => {
    const { service, config } = setup();
    await service.registrar(datos);
    const { token, usuario } = await service.login('luis@x.mx', 'Segura2026');
    const payload = jwt.verify(token, config.jwt.secret);
    expect(payload).toMatchObject({ sub: String(usuario.id), rol: 'usuario', iss: 'donaciones-api', aud: 'donaciones-web' });
    expect(usuario).not.toHaveProperty('password_hash');
  });

  test('credenciales incorrectas o usuario inexistente -> mismo error 401', async () => {
    const { service } = setup();
    await service.registrar(datos);
    await expect(service.login('luis@x.mx', 'Incorrecta1')).rejects.toMatchObject({ status: 401, message: 'Credenciales inválidas' });
    await expect(service.login('nadie@x.mx', 'Segura2026')).rejects.toMatchObject({ status: 401, message: 'Credenciales inválidas' });
  });

  test('verifyToken rechaza tokens alterados, con alg "none" o firmados con otro secreto', () => {
    const { service, config } = setup();
    const token = service.signToken({ id: 1, rol: 'usuario', email: 'a@x.mx' });
    expect(service.verifyToken(token).sub).toBe('1');

    const [h, , s] = token.split('.');
    const forjado = Buffer.from(JSON.stringify({ sub: '1', rol: 'admin' })).toString('base64url');
    expect(() => service.verifyToken(`${h}.${forjado}.${s}`)).toThrow('Token inválido');

    const sinFirma = jwt.sign({ sub: '1', rol: 'admin' }, null, { algorithm: 'none' });
    expect(() => service.verifyToken(sinFirma)).toThrow('Token inválido');

    const otroSecreto = jwt.sign({ sub: '1', rol: 'admin' }, 'x'.repeat(40), {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience
    });
    expect(() => service.verifyToken(otroSecreto)).toThrow('Token inválido');
  });

  test('verifyToken informa cuando el token expiró', () => {
    const { service, config } = setup();
    const expirado = jwt.sign({ sub: '1', rol: 'usuario' }, config.jwt.secret, {
      expiresIn: -10,
      issuer: config.jwt.issuer,
      audience: config.jwt.audience
    });
    expect(() => service.verifyToken(expirado)).toThrow('El token ha expirado');
  });
});

describe('authService.seedAdmin', () => {
  test('crea el administrador una sola vez', async () => {
    const { service } = setup({ ADMIN_EMAIL: 'root@x.mx', ADMIN_PASSWORD: 'AdminSegura1' });
    const admin = await service.seedAdmin();
    expect(admin.rol).toBe('admin');
    expect(await service.seedAdmin()).toBeNull();
  });

  test('no hace nada si no hay credenciales configuradas', async () => {
    const { service } = setup({ ADMIN_EMAIL: '', ADMIN_PASSWORD: '' });
    expect(await service.seedAdmin()).toBeNull();
  });
});
