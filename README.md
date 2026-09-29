# donaciones-api

Microservicio de autenticación y **registro de personas donantes** de la plataforma web de donaciones de alimentos (Ingeniería de Software, Emiliano Romero García).

- Node.js 22 + Express 4
- JWT (HS256, 1 h) con roles `admin` / `usuario`
- 103 pruebas con Jest + Supertest (cobertura: 100 % de líneas, 99.43 % de ramas, umbral mínimo 80 %)
- Pipeline CI/CD en GitHub Actions: lint → pruebas → SonarQube → imagen Docker → staging → OWASP ZAP

## Ejecutar en local

```bash
npm install
npm run lint
npm run test:coverage
cp .env.example .env      # ajusta JWT_SECRET y ADMIN_PASSWORD
npm start                 # http://localhost:3000/health
```

## Endpoints

| Método | Ruta | Acceso |
|---|---|---|
| POST | /api/auth/registro | Público (siempre crea rol `usuario`) |
| POST | /api/auth/login | Público → devuelve JWT |
| GET | /api/auth/perfil | Autenticado |
| GET | /api/donantes | Admin |
| GET | /api/donantes/:id | Admin o el propio donante |
| PATCH | /api/donantes/:id/rol | Admin |
| DELETE | /api/donantes/:id | Admin |

La especificación completa está en `docs/openapi.yaml`.

## Pipeline (GitHub Actions)

Configura estos secretos en **Settings → Secrets and variables → Actions**:

| Secreto | Uso |
|---|---|
| `SONAR_TOKEN`, `SONAR_HOST_URL` | Análisis de SonarQube / SonarQube Cloud |
| `STAGING_JWT_SECRET`, `STAGING_ADMIN_PASSWORD` | Entorno de prueba (staging) |
| `RENDER_DEPLOY_HOOK` (opcional) | Despliegue en un servicio externo |

## Seguridad y calidad

- `zap/zap-plan.yaml`: plan de OWASP ZAP (Automation Framework). Para ejecutarlo en local:
  ```bash
  export ZAP_AUTH_HEADER=Authorization ZAP_AUTH_HEADER_VALUE="Bearer <jwt admin>"
  TARGET=http://localhost:3000 API_FILE=$PWD/docs/openapi.yaml REPORT_DIR=$PWD/zap/reportes \
    zap.sh -cmd -autorun $PWD/zap/zap-plan.yaml
  ```
- `zap/reportes/`: reportes de los tres escaneos.
- `sonar-project.properties`: configuración de SonarQube.
- `docs/evidencias/`: capturas, métricas y la verificación manual del falso positivo de SQLi.
