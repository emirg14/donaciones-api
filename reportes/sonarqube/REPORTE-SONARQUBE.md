# Reporte de análisis de calidad (SonarQube)

- **Herramientas:** SonarQube Community Build 26.1, SonarScanner CLI 7.2
- **Configuración:** `sonar-project.properties` (fuentes `src` y `public`; cobertura desde `coverage/lcov.info`)
- **Quality Gate:** *Sonar way* — cobertura de código nuevo ≥ 80 %, duplicación ≤ 3 %, 0 observaciones nuevas, 100 % de hotspots revisados

## Evolución de los análisis

| Métrica | Análisis 1 (v1.0.0) | Análisis 2 (v1.0.1) | Análisis 3 (v1.1.0) | Análisis 4 (v1.1.1) |
|---|---|---|---|---|
| Alcance | API de registro | API + correcciones | API + donaciones + página web | Versión final |
| **Quality Gate** | Aprobado | Aprobado | **Rechazado** | **Aprobado** |
| Bugs | 0 (A) | 0 (A) | 0 | **0 (A)** |
| Vulnerabilidades | 0 (A) | 0 (A) | 0 | **0 (A)** |
| Security Hotspots | 0 | 0 | 2 sin revisar | **0 pendientes (100 % revisados)** |
| Code smells | 2 | 1 (aceptado) | 27 | **0** |
| Deuda técnica | 5 min | 5 min → 0 tras triage | 1 h 47 min | **0 min (A)** |
| Cobertura | 99.3 % | 99.8 % | 97.1 % (código nuevo) | **98.6 %** |
| Duplicación | 0.0 % | 0.0 % | 0.0 % | **0.0 %** |
| Líneas de código | 435 | 447 | — | **2,312** (31 archivos) |

Detalle del análisis 3: `sonar-analisis3-fallido.txt`. Métricas completas: `sonar-analisisN-metricas.json`.

## Qué se corrigió entre el análisis 3 y el 4

- **S2004 (alta):** funciones anidadas a más de 4 niveles en el panel de administración → se dividió en funciones pequeñas.
- **S3358:** ternarios anidados → condiciones explícitas.
- **S7785:** preferir *top-level await* → los puntos de entrada pasaron a módulos ES (`server.mjs`, `demo.mjs`). Esto también resolvió la observación que se había aceptado en el análisis 2.
- **S7721, S7764, S6582, S6594, S7781, S7748:** estilo y modernización (`globalThis`, `replaceAll`, `RegExp.exec`, encadenamiento opcional).
- **S6819 (accesibilidad):** `<output>` en lugar de `role="status"`.
- **S1135:** falso positivo por la palabra "todo" en español → se reescribió el comentario.
- **Hotspot S5728 (CSP deshabilitada):** la CSP global de helmet queda activa y las páginas la sustituyen por la suya.
- **Hotspot S2068 (contraseña en el código):** revisado como **seguro**; son las cuentas ficticias del modo demostración (base en memoria, dominio `.test`, no se cargan en producción).

## Capturas

`sonar-overview.png` (panel), `sonar-activity.png` (historial con el análisis rechazado y el aprobado), `sonar-issues.png`, `sonar-measures.png`.
