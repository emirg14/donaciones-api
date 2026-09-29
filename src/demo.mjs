/**
 * Arranca la plataforma en MODO DEMOSTRACIÓN (para la presentación):
 *   npm run demo   ->  http://localhost:3000
 * Base de datos en memoria con datos ficticios que se regeneran en cada arranque.
 * Funciona igual en Windows, macOS y Linux (no depende de variables en la terminal).
 */
import crypto from 'node:crypto';
import { loadConfig } from './config/index.js';
import { createApp } from './app.js';
import { seedDemo } from './demo/seed.js';

process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
process.env.BCRYPT_ROUNDS = process.env.BCRYPT_ROUNDS || '10';
process.env.RATE_LIMIT_MAX = process.env.RATE_LIMIT_MAX || '300';

try {
  const config = loadConfig();
  const app = createApp({ config });
  const { authService, loteService, db } = app.locals;
  app.locals.demoAccounts = await seedDemo({ authService, loteService, db });

  app.listen(config.port, () => {
    console.log('');
    console.log(`  Alimentrega (demo) lista en  http://localhost:${config.port}`);
    console.log('  Cuentas de ejemplo (contraseña Demo2026):');
    app.locals.demoAccounts.forEach((c) => console.log(`   - ${c.etiqueta.padEnd(16)} ${c.email}`));
    console.log('  Ctrl + C para detener.');
    console.log('');
  });
} catch (err) {
  console.error('No se pudo iniciar la demo:', err.message);
  process.exit(1);
}
