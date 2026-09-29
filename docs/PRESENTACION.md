# Guion de presentación (5–7 minutos)

## Antes de empezar

1. En la carpeta del proyecto: `npm install` (solo la primera vez) y luego `npm run demo`.
2. Abre **dos ventanas** del navegador en `http://localhost:3000`, una junto a otra. Cada pestaña guarda su propia sesión.
3. Ten a la mano el reporte de SonarQube (`reportes/sonarqube/sonar-overview.png`) y el de ZAP (`reportes/seguridad/zap/escaneo4-zap-reporte.html`).

## 1. La idea (30 s)

En la página de inicio: "Alimentrega conecta empresas con excedentes de comida con ONG que la distribuyen. Cada kilo se rastrea". Señala el recuadro verde de **impacto en vivo**.

## 2. La empresa donante publica (1 min)

- Ventana izquierda → botón **Empresa donante** (Panadería La Espiga Dorada).
- Muestra los indicadores: kilos, comidas y CO₂e.
- Publica un lote: *"Bolillo y pan de caja del día"*, Panadería, 30 kg, caducidad hoy.
- Explica: el formulario valida los datos también en el servidor. Si escribes `<script>` en la descripción, lo rechaza.

## 3. La ONG lo recibe en tiempo real (1.5 min)

- Ventana derecha → botón **ONG** (Comedor Comunitario Nido del Norte).
- En unos segundos aparece la notificación del lote nuevo (campana naranja).
- **Reservar** → **Ya lo recogimos** → **Confirmar entrega**.
- En la ventana izquierda se ve cómo avanza la barra de estado y llegan los avisos a la campana.
- Abre **Historial**: es la trazabilidad completa, con quién hizo cada cambio y cuándo.

## 4. El administrador (1 min)

- Cierra sesión en una ventana y entra como **Administrador**.
- Pestaña **Resumen**: gráficas de kilos por día y por categoría y ranking de empresas.
- **Descargar reporte (CSV)**: es la historia de usuario del reporte mensual.
- Pestaña **Cuentas**: roles admin/usuario (RBAC).

## 5. Seguridad y calidad (1.5 min)

- **JWT y roles:** un donante no puede ver los lotes de otro ni cambiar roles (403). Hay 141 pruebas automáticas y 100 % de líneas cubiertas.
- **OWASP ZAP:** encontró un error 500 real con un número de página gigante. Se corrigió y se agregó una prueba. La alerta de SQLi es un falso positivo verificado midiendo tiempos.
- **SonarQube:** la versión con la página web fue **rechazada** con 27 observaciones. Se corrigieron y la versión final pasó el Quality Gate con 0 bugs, 0 vulnerabilidades y 0 deuda técnica.
- **CI/CD:** el pipeline corre todo esto en cada push y despliega a staging.

## Preguntas probables

- **¿Por qué SQLite?** Para desarrollo y demostración, sin instalar un servidor de base de datos. El esquema y las consultas parametrizadas son compatibles con MySQL en AWS RDS, que está en el plan de mejora.
- **¿Es tiempo real?** La página consulta al servidor cada 5 segundos (sondeo). La mejora propuesta es usar WebSockets o Server-Sent Events.
- **¿Dónde se guarda el token?** En `sessionStorage`: se borra al cerrar la pestaña y expira en 1 hora.
