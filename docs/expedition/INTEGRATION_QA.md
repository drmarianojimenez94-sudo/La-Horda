# Cierre de integración sobre main

La primera ejecución de GitHub Actions confirmó el gate de entrada y toda la suite Expedition champions. El workflow general falló en pruebas heredadas de main: `main-flow.js` esperaba `select[data-duo="1"]`, eliminado por el cambio previo a un campeón, y `tools/ux/functional.js` seguía exigiendo relevo automático sin reanimación.

Se actualizan esas expectativas al comportamiento vigente, sin restaurar reservas ni desactivar gates:

- Flujo real menú → un campeón → arena → pausa → continuar, en 667 y 844.
- Suite funcional: 290 comprobaciones, sin fallos; muerte conserva campeón, inmovilidad del caído, reanimación a los 5000 ms incluso tras daño/aturdimiento, guías completas, talentos/boons y navegación.
- Cooperativo: cuatro clientes, rechazo de campeones duplicados/loadout ausente, muerte e input del caído, reanimación enviada por invitado y replicada, control después de revivir, derrota de equipo y retorno al lobby.
- Se incorpora al workflow el test de reanimación ya existente en main.
- El gate antiguo de skins tenía cantidades fijas y trataba todo croma como skin. Conserva los 32 cosméticos/13 skins previos y comprueba exactamente los 30 cosméticos/10 skins comerciales adicionales; distingue vestuario de paleta. 4481 comprobaciones de atlas, frames, alfa, cuatro direcciones, propiedad, estadísticas y red sin fallos.
- La comprobación de layout reveló que el selector de la tarjeta única quedaba bajo el footer en 667×375. Se coloca junto al retrato en landscape; el test de separación del footer permanece y pasa.

No se modifican umbrales, referencias ni gameplay para satisfacer estas pruebas.
