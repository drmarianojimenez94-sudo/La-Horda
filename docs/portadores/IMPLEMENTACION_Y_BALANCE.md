# Cinco nuevos Portadores — implementación y balance inicial

Brasa, El Eslabón, Morwen, El Farolero e Iria: 3 habilidades, definitiva y pasiva por campeón. Los cinco se desbloquean a nivel 1 en esta alfa para probarlos inmediatamente. Se conservan niveles, oro, equipo y campaña existentes; los logros de colección pueden conceder sus premios normales.

## Contenido integrado

270 poses base: 54 por campeón (frente, lado y espalda; izquierda espejada). Reposo, caminar, ataque, lanzamiento, impacto, muerte y definitiva. Cinco paletas de set conservan la geometría del cuerpo. Entidades y VFX de canvas: torretas/disparos, cadenas, reactivos, alambique, faroles, sendas, anclas, hilos y triángulos. Bots, apuntado táctil, Códice, guardado y loadouts/snapshots de invitados. Tres ramas y tres maestrías por campeón con miniárboles, veinte piezas de set y cinco skins.

Audio: reutiliza sonidos de lanzamiento, definitiva e impacto del motor. Las tres líneas de voz por campeón son textos, no grabaciones.

## Balance y límites

Morwen: Resina 0,65 → 0,75 de daño base, Sal 0,80 → 0,90 y escudo de Destilación sin residuos 5% → 6%. Farolero: Farol 1,2% → 1,6% por pulso; Vigilia 2,5% → 3,5%. Contrapeso del Eslabón se activa al controlar y tiene recarga interna.

Máximo 48 entidades; dos torretas, un farol y tres anclas por dueño. Estos kits conceden escudo hasta 30% de vida. Ralentización a jefes hasta 12%, sin arrastre/aturdimiento ni desplazamiento de estructuras divinas. Custodia transfiere una sola vez por golpe con presupuesto finito y rechaza guardianes inmunes. Reacciones consumen ambos reactivos, con topes para energía y eco. La luz es local y débil; no borra oscuridad especial ni evita peligros letales.

## Simulaciones del juego real

27 escenarios: nueve campeones × semillas 117/431/991, Bosque, cuenta nivel 20, asignación 4 en habilidades y definitiva, sin equipo ni reliquias iniciales. El autopiloto recoge botín/refuerzos normales y corre hasta 150 segundos simulados. Supervivencia al final del escenario no significa victoria de campaña.

| Campeón | Daño útil medio | Supervive | Escudo absorbido medio |
|---|---:|---:|---:|
| brasa | 14858 | 3/3 | 38 |
| eslabon | 10272 | 3/3 | 121 |
| morwen | 12688 | 2/3 | 221 |
| farolero | 7586 | 3/3 | 575 |
| iria | 11951 | 3/3 | 109 |
| tanque | 11341 | 3/3 | 198 |
| mago | 14436 | 1/3 | 58 |
| soporte | 4718 | 3/3 | 332 |
| cazadora | 17518 | 3/3 | 12 |

Los nuevos atacantes quedan por debajo del Mago y Sylva en este escenario; Eslabón se acerca al Tanque; Farolero combina daño moderado y protección. Es balance inicial para pruebas alfa. Para equilibrio competitivo hacen falta partidas humanas y campañas completas con distintas builds.

## Verificación

93 comprobaciones funcionales: veinte lanzamientos, límites, reacciones, talentos, sets/skins, protección, inmunidades, snapshots, reset y los cinco campeones en diez arenas. Trece comprobaciones de guardado previo/nuevo, UI de talentos y daño en Arena Divina. Tres partidas con anfitrión e iPhone emulado por relay local: casts de invitado, loadouts, skins y dueños sincronizados. Quince maestrías a nivel 99, cuatro campeones simultáneos, treinta enemigos y techo de 48 entidades. Sin errores de página. Resultados y capturas en esta carpeta. Rendimiento en Chromium emulado: ver stress-results.json; no equivale a hardware iPhone.

Regresión del servidor: relay, cuentas y trades. WebP sin pérdida: cero problemas. Alfa binario y fragmentos: art-checks.json.

## Visual gate

**PASS** después de corregir recortes, alineación, alfa y fragmentos. Revisión al tamaño real junto al Tanque: visual-gate.png. Siluetas chibi diferenciadas, contorno oscuro, nearest-neighbor, escala coherente y alfa 0/255. La paleta de set modifica colores, no diseños. Originales: art-source/portadores. Proceso reproducible: tools/art/portadores/build.py (Pillow, NumPy, SciPy).

## Reproducir

Desde la raíz, con Playwright y Chromium disponibles:

```sh
node tools/portadores/simulate.js
node tools/portadores/online.js
node tools/portadores/finish.js
node tools/portadores/stress.js
npm test --prefix server
```

CHROMIUM_PATH permite elegir el ejecutable. Runners locales: puertos 8782–8785, relay 8798. B1-3-portadores evita juntar clientes nuevos con versiones que desconocen estos guardianes.

## Correcciones de auditoría — 30/09/2026

Custodia escala su presupuesto con potencia hasta 70% de vida máxima. Desmontaje escala la aceleración (hasta 50%) y devolución de recarga; Turno de Emergencia escala la aceleración ofensiva de torretas. Paso Seguro escala la mitigación ambiental hasta 30%, sin acumulación entre sendas. Los talentos de Ancla que anunciaban potencia ahora anuncian y otorgan duración.

Los triángulos guardan los IDs de sus tres anclas originales. El bonus de cuatro piezas de Iria exige consumir una de ellas; el triángulo de emergencia y las anclas posteriores no activan ese bonus. Se añadieron ocho comprobaciones de regresión para estos comportamientos.
