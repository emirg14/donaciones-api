const { loadConfig } = require('../../src/config');

describe('loadConfig', () => {
  test('usa valores por defecto en desarrollo', () => {
    const cfg = loadConfig({});
    expect(cfg.nodeEnv).toBe('development');
    expect(cfg.port).toBe(3000);
    expect(cfg.dbPath).toBe(':memory:');
    expect(cfg.jwt.expiresIn).toBe('1h');
    expect(cfg.bcryptRounds).toBe(12);
    expect(cfg.admin.email).toBeNull();
    expect(cfg.rateLimit.max).toBe(20);
  });

  test('lee variables de entorno', () => {
    const cfg = loadConfig({
      NODE_ENV: 'production',
      PORT: '8080',
      DB_PATH: '/data/app.db',
      JWT_SECRET: 'x'.repeat(40),
      JWT_EXPIRES_IN: '15m',
      BCRYPT_ROUNDS: '10',
      ADMIN_EMAIL: 'a@b.mx',
      ADMIN_PASSWORD: 'Segura2026',
      RATE_LIMIT_WINDOW_MS: '1000',
      RATE_LIMIT_MAX: '5'
    });
    expect(cfg.port).toBe(8080);
    expect(cfg.jwt.secret).toHaveLength(40);
    expect(cfg.jwt.expiresIn).toBe('15m');
    expect(cfg.rateLimit).toEqual({ windowMs: 1000, max: 5 });
    expect(Object.isFrozen(cfg)).toBe(true);
  });

  test('exige JWT_SECRET en producción', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow('JWT_SECRET es obligatorio');
  });

  test('rechaza secretos cortos', () => {
    expect(() => loadConfig({ JWT_SECRET: 'corto' })).toThrow('al menos 32');
  });
});
