# Visual Combat Bible

Datos: `js/data/combat-language.js` (`COMBAT_LANGUAGE`, `TARGETING_LANGUAGE`). Toda la UI y los
números flotantes leen de ahí. Regla: **COLOR + FORMA/GLIFO + MOVIMIENTO**, nunca solo color.

## Señales

| Señal | Color | Glifo / forma | Movimiento |
|---|---|---|---|
| Daño | crema `#fff1d6` (o color del elemento) | número | sube y se desvanece |
| Crítico | dorado con contorno rojo | número grande + `!` | pop + sube más alto |
| Curación | verde `#6fdc8c` | `+número` | sube lento |
| Escudo | celeste `#8fd0ff` | `◈número` / burbuja | aparece y late |
| Daño en el tiempo (DoT) | arena `#c9b8a0` | número chico `·` agrupado por objetivo | sube corto |
| Daño recibido | rojo `#ff5a4a` | `-número` | cae |
| Aturdido | amarillo | `✶` estrellas | giran |
| Ralentizado | celeste | `▼` | pulso lento |
| Congelado | hielo | `❄` cristal | quieto |
| Inmovilizado | verde | `⌇` raíces | quieto |
| Quemado / Veneno / Sangrado | naranja / verde ácido / rojo rosado | `♨` / `☣` / `◆` | titila / burbujea / gotea |
| Maldito | violeta | `☠` | late |
| Mejora / Debilitado | dorado / violeta | `▲` / `▽` | sube / baja |
| Invulnerable | blanco | `◯` halo | brillo constante |
| Área | color del lanzador | anillo en el piso | se expande |
| Peligro (enemigo) | rojo | `⚠` área que se llena | se llena hasta el golpe |
| Definitiva | dorado | `★` + destello | explosión |
| Objetivo | cian | `◎` diana / flecha en el borde | late lento |

## Números flotantes (`js/rendering/effects.js`)

- Pool fijo de 70; prioridad de dibujo: avisos > daño recibido > curación/escudo > críticos > daño > DoT.
- Golpes seguidos al mismo objetivo se **agrupan** en un número que crece (conserva el total).
- DoT (sangrado, veneno, quemadura, plaga, ticks de muro de fuego) se agrupa por objetivo con una
  ventana más larga y tamaño menor: informa sin hacer confeti.
- Tope de números chicos en pantalla (14 en táctil, 22 en escritorio); el crítico siempre entra.
- Accesibilidad: tipo distinguible sin color (signo `+`/`-`/`◈`/`!`, tamaño y dirección del movimiento).

## Telegraphs

Todo golpe enemigo grande usa `vfxTelegraph` (`js/rendering/vfx.js`): área roja que se llena
hasta el impacto. Los bots la esquivan (`botDangerVec`). Un hazard sin telegraph es FAIL en el
validador de arenas.

## Prioridad bajo carga (Adaptive VFX)

Nunca se recorta: telegraphs, avisos, daño recibido, definitivas. Se recorta primero: partículas
decorativas, números chicos, decals. Ver `js/systems/performance.js`.
