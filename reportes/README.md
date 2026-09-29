# Reportes del proyecto

Evidencias generadas al ejecutar las pruebas y análisis sobre el código de este repositorio (29/09/2026).

| Carpeta | Contenido | Resultado final |
|---|---|---|
| [`pruebas-unitarias/`](pruebas-unitarias/REPORTE-PRUEBAS.md) | Resultados de Jest (JUnit XML y salida de consola), reporte de cobertura HTML/LCOV | 141 pruebas aprobadas · 100 % líneas · 97.81 % ramas |
| [`seguridad/`](seguridad/REPORTE-SEGURIDAD.md) | 4 escaneos de OWASP ZAP (HTML/JSON), registros del servidor, verificación manual y `npm audit` | 0 vulnerabilidades reales · 1 falso positivo documentado · 0 dependencias vulnerables |
| [`sonarqube/`](sonarqube/REPORTE-SONARQUBE.md) | Métricas de 4 análisis (JSON), detalle del análisis que falló y capturas | Quality Gate aprobado · 0 bugs, 0 vulnerabilidades, 0 code smells, 0 min de deuda |

Cómo regenerarlos:

```bash
npm run test:ci                     # reports/junit.xml y coverage/
npm audit                           # dependencias
sonar-scanner -Dsonar.host.url=... -Dsonar.token=...
# OWASP ZAP: ver zap/zap-plan.yaml
```
