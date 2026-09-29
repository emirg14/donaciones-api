# Reporte de pruebas unitarias y de integración (Jest)

- **Herramientas:** Jest 29, Supertest 7, reportero JUnit (`jest-junit`)
- **Fecha:** 29/09/2026 · **Versión:** 1.1.1
- **Umbral configurado:** 80 % en sentencias, ramas, funciones y líneas (`jest.config.js`). Si no se alcanza, el pipeline falla.

## Resultado

| Métrica | Resultado | Umbral |
|---|---|---|
| Suites | 11 aprobadas / 11 | — |
| Pruebas | **141 aprobadas / 141** | — |
| Sentencias | **100 %** (539/539) | 80 % |
| Ramas | **97.81 %** (358/366) | 80 % |
| Funciones | **100 %** (123/123) | 80 % |
| Líneas | **100 %** (474/474) | 80 % |

## Suites

| Archivo | Tipo | Pruebas | Qué valida |
|---|---|---|---|
| `unit/validators.test.js` | Unitaria | 31 | Contraseñas, correo, RFC, teléfono, payloads XSS/SQLi, paginación |
| `unit/lotes.unit.test.js` | Unitaria | 24 | Validación de lotes y fechas, tipo de cuenta, CSV seguro (formula injection) |
| `unit/loteService.test.js` | Unitaria | 7 | Máquina de estados, permisos por perfil, notificaciones, métricas de impacto |
| `unit/authService.test.js` | Unitaria | 9 | bcrypt, duplicados, JWT (alterado, `alg: none`, expirado) |
| `unit/middleware.test.js` | Unitaria | 11 | `authenticate`, `authorize`, manejador de errores |
| `unit/repository.test.js` | Unitaria | 6 | Consultas parametrizadas, restricciones UNIQUE/CHECK |
| `unit/config.test.js` | Unitaria | 4 | Variables de entorno, secreto obligatorio en producción |
| `integration/auth.test.js` | Integración | 11 | Registro, login y perfil |
| `integration/donantes.test.js` | Integración | 15 | Roles, IDOR, paginación, regresión del hallazgo de ZAP |
| `integration/security.test.js` | Integración | 16 | SQLi, XSS, tokens forjados, rate limit, JSON mal formado, 413 |
| `integration/lotes.test.js` | Integración | 7 | Flujo completo de donación por HTTP, CSV solo admin, página web con CSP, modo demo |

## Archivos

- `resultado-jest.txt` — salida completa de la ejecución con la tabla de cobertura por archivo
- `junit.xml` — resultados en formato JUnit (lo usa GitHub Actions)
- `cobertura/index.html` — reporte de cobertura navegable (Istanbul)
- `coverage-summary.json`, `lcov.info` — cobertura en formato máquina (lo usa SonarQube)

La página web (`public/`) se probó de extremo a extremo en Chromium con Playwright: registro, publicación de un lote, reserva, recolección y entrega por la ONG, notificación al donante, historial y panel de administración, sin errores en la consola del navegador. Las capturas están en `docs/capturas/`.
