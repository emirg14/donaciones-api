/** Configuración de Jest con umbral mínimo de cobertura del 80 %. */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  setupFiles: ['<rootDir>/tests/setupEnv.js'],
  collectCoverageFrom: [
    'src/**/*.js' // los puntos de entrada (server.mjs, demo.mjs) solo levantan el servidor
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80
    }
  }
};
