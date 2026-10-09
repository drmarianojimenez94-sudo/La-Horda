# Talent Gate 40 — implementación inicial (2026-10-09)

## Cambios realizados
- Árbol de talentos bloqueado hasta nivel 40.
- Escalones: 40, 45, 50, 60 y 75.
- Puntos normales: 1 al nivel 40 y +1 cada dos niveles posteriores (máximo 30 al 99).
- Bloqueo de compra y de aplicación de modificadores/sinergias antes del nivel 40, incluso en partidas guardadas antiguas.
- Se preservan las elecciones históricas para no destruir progresión; la economía de puntos heredados (`treeBonus`) requiere migración específica posterior.

## Pendientes obligatorios antes de dar por cerrada la expansión
1. Revisar textos y pantallas de talentos; eliminar referencias a desbloqueo en nivel 5.
2. Revisar el sistema de maestría de habilidades del HUD (bolsa separada) y definir su gate de nivel.
3. Migración explícita de puntos heredados, pruebas de guardados locales y nube.
4. Ability Gate: verificar banderas de talentos conectadas al motor y pruebas de comportamiento.
5. Localizar la fábrica de campeones y sus Art/Balance Gates, producir Solciju, Brakk, Veyra, Morveth y Aelith con una skin cada uno.
6. QA de oleadas, jefes, cooperativo, PvP y móvil antes de integrar los campeones.

Este commit es el primer tramo de la iniciativa, no acredita el pase de los cinco campeones por sus gates.
