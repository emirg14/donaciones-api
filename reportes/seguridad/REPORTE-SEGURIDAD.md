# Reporte de pruebas de seguridad (OWASP ZAP y dependencias)

- **Herramienta:** OWASP ZAP 2.16.1, Automation Framework (`zap/zap-plan.yaml`)
- **Método:** importación de la especificación OpenAPI (`docs/openapi.yaml`), spider de la página web, escaneo pasivo y escaneo activo (intensidad media, umbral bajo) autenticado con el JWT de un administrador. Incluye las reglas de inyección SQL (40018–40024) y XSS (40012, 40014, 40026).
- **Entorno:** API en modo producción con datos de demostración; límite de intentos relajado solo para el escaneo.

## Resumen de los 4 escaneos

| # | Versión / configuración | Alta | Media | Baja | Info | Resultado clave |
|---|---|---|---|---|---|---|
| 1 | 1.0 · token no aplicado (rutas protegidas respondieron 401) | 1 | 0 | 0 | 4 | Cobertura limitada; se corrigió la autenticación del escáner |
| 2 | 1.0 · autenticado | 1 | 0 | 0 | 2 | **Error 500 real** en `GET /api/donantes?page=4750925297435195125…` (visto en los registros del servidor) |
| 3 | 1.0.1 · tras la corrección | 1 | 0 | 0 | 2 | 0 respuestas 500 |
| 4 | 1.1.1 · API + página web (≈ 6,700 peticiones, 18 URLs de API y 30 de la web) | 1 | 0 | 0 | 3 | 0 respuestas 500; sin alertas de encabezados en la página web |

La única alerta alta (40024 *SQL Injection – SQLite*, confianza media) aparece en todos los escaneos y es un **falso positivo verificado** (ver abajo). No se detectó ninguna alerta de XSS.

## Hallazgo 1 — Error 500 por número de página gigante (corregido)

- **Causa:** `page` enorme → `OFFSET` fuera del rango de 64 bits de SQLite → `datatype mismatch`.
- **Impacto:** error 500 (sin filtrar detalles gracias al manejador central de errores).
- **Corrección:** `parsePagination()` acota `page ≤ 10000` y `limit ≤ 100`; pruebas de regresión unitaria e integración.
- **Verificación:** escaneos 3 y 4 sin respuestas 500 (`zap/escaneo3-peticiones-servidor.log`, `zap/escaneo4-peticiones-servidor.log`).

## Hallazgo 2 — 40024 SQL Injection – SQLite (falso positivo)

Regla ciega basada en tiempo. Se repitieron las peticiones de forma secuencial (`verificacion-manual-sqli.txt`):

| Petición | HTTP | Mediana |
|---|---|---|
| `GET /api/donantes/2` (normal) | 200 | 1.0 ms |
| `GET /api/donantes/<randomblob(100000000)>` | 400 | 1.1 ms |
| `POST /api/auth/registro` válido (bcrypt 12 rondas) | 201 | 341 ms |
| `POST /api/auth/registro` con payload | 400 | 1 ms |
| `POST /api/lotes` con payload en el título | 201 | 1.3 ms (se guarda como texto literal) |

Si SQLite ejecutara `randomblob(100000000)`, la respuesta tardaría cientos de milisegundos. La variación que midió ZAP viene de la carga de CPU de bcrypt con peticiones concurrentes. En el pipeline la regla se configuró como `WARN` y las reglas clásicas de SQLi/XSS como `FAIL` (`zap/rules.tsv`).

## Dependencias

`npm audit`: **0 vulnerabilidades** (`npm-audit.txt`). En la versión inicial había 2 moderadas en `uuid` (dependencia de desarrollo de `jest-junit`), resueltas al actualizar a `jest-junit` 17.

## Controles verificados por pruebas automáticas

Consultas parametrizadas, validación de lista blanca, rechazo de tokens `alg: none`/alterados/expirados, límite de intentos (429), CSP `default-src 'none'` en la API y CSP sin `unsafe-inline` en la página, CSV protegido contra *formula injection*, control de acceso por rol y por propiedad del recurso (IDOR).

## Archivos

- `zap/escaneoN-zap-reporte.html|json` — reportes completos de ZAP
- `zap/zap-reporte-escaneoN.png` — capturas del resumen
- `zap/escaneoN-peticiones-servidor.log` — registro de las peticiones recibidas por el servidor
- `verificacion-manual-sqli.txt`, `npm-audit.txt`
