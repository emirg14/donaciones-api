# Alimentrega · Plataforma de donación de alimentos

Proyecto de Ingeniería de Software — Emiliano Romero García.

> **Alimentrega es una empresa ficticia.** Todas las empresas, organizaciones, personas y datos de la demostración son inventados.

Conecta a **empresas donantes** que tienen alimentos próximos a caducar con **organizaciones sociales (ONG)** que los recolectan, con trazabilidad de cada lote: *Disponible → Reservado → En camino → Entregado*.

- **API:** Node.js 22, Express 4, JWT (HS256, 1 h) con roles `admin` / `usuario` y perfiles `donante` / `ong`
- **Página web:** HTML, CSS y JavaScript sin frameworks, servida por la misma API
- **Pruebas:** 141 pruebas con Jest + Supertest (100 % de líneas, 97.81 % de ramas; umbral mínimo 80 %)
- **CI/CD:** GitHub Actions → lint → pruebas → SonarQube → imagen Docker → staging → OWASP ZAP

## Requisitos

- [Node.js 22.13 o superior](https://nodejs.org) (usa el módulo nativo `node:sqlite`)

## Demostración (para presentar)

```bash
npm install
npm run demo
```

Abre **http://localhost:3000**. La base de datos vive en memoria y se regenera con datos ficticios en cada arranque. Cuentas de ejemplo (contraseña `Demo2026`):

| Perfil | Correo |
|---|---|
| Empresa donante | `laura@espigadorada.test` |
| ONG | `rosa@nidodelnorte.test` |
| Administrador | `admin@alimentrega.test` |

El guion paso a paso está en [`docs/PRESENTACION.md`](docs/PRESENTACION.md).

## Ejecución normal

```bash
npm run lint
npm run test:coverage
cp .env.example .env      # ajusta JWT_SECRET y ADMIN_PASSWORD
npm start                 # http://localhost:3000
```

## API

| Método | Ruta | Acceso |
|---|---|---|
| POST | /api/auth/registro | Público (siempre rol `usuario`; `tipo`: donante u ong) |
| POST | /api/auth/login | Público → JWT |
| GET | /api/auth/perfil | Autenticado |
| GET · PATCH · DELETE | /api/donantes, /api/donantes/:id, /api/donantes/:id/rol | Admin (o el propio usuario para consultar) |
| GET · POST | /api/lotes | Donante: sus lotes · ONG: disponibles y los suyos · Admin: todos |
| GET | /api/lotes/:id | Detalle con historial |
| PATCH | /api/lotes/:id/estado | Según la máquina de estados y el perfil |
| GET · POST | /api/notificaciones, /api/notificaciones/leer | Autenticado |
| GET | /api/reportes/impacto, /api/reportes/impacto.csv | Autenticado · CSV solo admin |
| GET | /api/public/impacto, /api/public/config | Público (sin datos personales) |

Especificación completa: [`docs/openapi.yaml`](docs/openapi.yaml).

## Pipeline (GitHub Actions)

`.github/workflows/ci-cd.yml`. Secretos en **Settings → Secrets and variables → Actions**:

| Secreto | Uso |
|---|---|
| `SONAR_TOKEN`, `SONAR_HOST_URL` | SonarQube / SonarQube Cloud |
| `STAGING_JWT_SECRET`, `STAGING_ADMIN_PASSWORD` | Entorno de prueba (staging) |
| `RENDER_DEPLOY_HOOK` (opcional) | Despliegue en un servicio externo |

## Reportes

La carpeta [`reportes/`](reportes/README.md) contiene los reportes de **pruebas unitarias**, **seguridad** (OWASP ZAP y `npm audit`) y **SonarQube**.

## Estructura

```
src/            API (config, db, repositories, services, middleware, routes, utils, demo)
public/         Página web (index.html, css, js)
tests/          Pruebas unitarias e de integración (Jest)
reportes/       Reportes de pruebas, seguridad y SonarQube
zap/            Plan de OWASP ZAP y reglas del pipeline
docs/           OpenAPI, guion de presentación, capturas y diagrama del pipeline
.github/        Pipeline de CI/CD
```
