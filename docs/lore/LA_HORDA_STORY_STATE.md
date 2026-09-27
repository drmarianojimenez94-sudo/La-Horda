# LA HORDA — Estado de la historia

> Qué parte del canon (`LA_HORDA_LORE_BIBLE.md`) ya se cuenta **jugando** y qué falta.
> ✅ implementado · 🟡 parcial (texto sin arte/cinemática) · ⬜ pendiente

## Campaña
| # | Arena | Estado | Qué ve el jugador hoy |
|---|---|---|---|
| 01 | Ciudad Maldita | ✅ | Arena 01 jugable: civiles, estructuras, subjefes y El Presentador. El prólogo del Hechicero se cuenta acá. |
| 02 | Fábrica Sin Fin | ✅ | Cartel "ARENA 02 — LA FÁBRICA SIN FIN". Al completarla: Cicatriz hacia las Ruinas + el Hechicero explica qué es una Cicatriz. |
| 03 | Ruinas Célticas / Élficas | ✅ 🟡 | Guardián 1. El Guardián Ancestral se corrompe ("NACE LA BESTIA DEL BOSQUE"). Cristal Ancestral + línea "alguna vez fueron héroes". Falta arte de la forma Bestia. |
| 04 | Reino Fúngico | ✅ | Madre Espora (no Guardiana). Cicatriz: ecos de los Guardianes "y de alguien más"; el Hechicero los desestima. |
| 05 | Arena Gélida | ✅ | Guardián 2. "NACE EL DEMONIO GÉLIDO". Cristal de Escarcha + "no preguntes cómo sé tanto de ellos". |
| 06 | Arena Acuática | ✅ | Kraken Joven (subjefe) y Leviatán (jefe final: el "Kraken" del canon). No son Guardianes. Cicatriz: se hunde en la piedra, hacia el Laberinto. |
| 07 | Laberinto | ✅ | Guardián 3. El Guardián del Laberinto (subjefe) advierte "no le entregues los cristales…" antes de caer. Cristal de Piedra al vencer al Minotauro. |
| 08 | Abismo | ✅ | "El punto de no retorno". Cicatriz: el mundo se rompe y debajo se abre una mina; el Hechicero nombra la puerta del fondo. |
| 09 | Minas Profundas | ✅ 🟡 | Descenso por 6 sectores con la luz como territorio. Titán de Piedra (subjefe, nivel 8), Devoraluz (evento élite), **Cerbero** (jefe, nivel 10, no es Guardián). Al morir Cerbero se abre el **Portal Infernal**: la arena termina cuando un guardián humano lo atraviesa ("ATRAVESASTE EL UMBRAL") y se abre la Infernal. Falta arte propio del portal, la puerta y las cadenas (ver `LA_HORDA_MINES_MISSING_ASSETS.md`). |
| 10 | Arena Infernal | ✅ 🟡 | Guardián 4. Revelación (líder de los Cuatro, se quedó por decisión propia), voz del Forjador encadenado, 3 formas → "Rey de la Horda — Forma Final", texto de final. Falta entidad/arte del Forjador y cinemática de final. |
| — | Arena Divina (postgame) | ✅ | Se abre al completar la Infernal. Cinco Pruebas Divinas. |
| — | Coliseo (PvP) | ⬜ | Tarjeta "PRÓXIMAMENTE" en el selector. |

## Cristales
| Cristal | Guardián | Se obtiene | Estado |
|---|---|---|---|
| Ancestral | Guardián Ancestral (03) | al completar las Ruinas | ✅ |
| Escarcha | Mago Gélido (05) | al completar la Gélida | ✅ |
| Piedra | Guardián del Laberinto (08) | al completar el Laberinto | ✅ |
| Juicio | Hechicero Supremo (10) | es suyo: lo usa en el jefe final | ✅ (sin premio: la historia no lo entrega) |

## Progresión (cómo se desbloquea)
- Perfil nuevo: solo la **Arena 01** (Ciudad Maldita).
- Estrictamente secuencial: completar una arena abre la siguiente (… Laberinto 07 → Abismo 08 → Minas 09).
- Completar las Minas (09, atravesando el Portal Infernal) abre la Infernal (10); completar la Infernal abre la Divina.
- Guardados viejos: lo que ya estaba abierto con el orden anterior **sigue abierto** (`save.legacyOpenArenas`); lo completado sigue completado; los cristales se remapean (el de Espora se reemplaza por el Ancestral si ya completaste las Ruinas; la copia vieja queda en `save.crystalsLegacyV1`).

## Pendientes narrativos
1. ~~Arenas Ciudad Maldita y Minas Profundas~~ Jugables (01 y 09). Pendiente: arte propio del Portal Infernal y la puerta del Umbral.
2. ~~Decisiones de canon abiertas~~ Resueltas: Fábrica = Caballero (jefe) + Dragón de la Forja (subjefe); el Kraken del canon es el Leviatán (Lore Bible §8, C2/C3).
3. Forma "Bestia del Bosque" del Guardián Ancestral (arte).
4. El Forjador como entidad (arte + escena en la Infernal).
5. Líneas de muerte de cada Guardián ("lo que fueron").
6. Cinemáticas (ver `LA_HORDA_CINEMATICS.md`).
