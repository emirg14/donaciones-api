'use strict';

const { loadConfig } = require('./config');
const { createApp } = require('./app');

async function main() {
  const config = loadConfig();
  const app = createApp({ config });
  await app.locals.authService.seedAdmin();

  const server = app.listen(config.port, () => {
    console.log(`donaciones-api escuchando en el puerto ${config.port} (${config.nodeEnv})`);
  });

  const shutdown = () => server.close(() => process.exit(0));
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('No se pudo iniciar el servidor:', err.message);
  process.exit(1);
});
