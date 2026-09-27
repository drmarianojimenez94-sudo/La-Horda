# LA HORDA — Estado de la historia

> Qué parte del canon (`LA_HORDA_LORE_BIBLE.md`) ya se cuenta **jugando** y qué falta.
> ✅ implementado · 🟡 parcial (texto sin arte/cinemática) · ⬜ pendiente

## Campaña
| # | Arena | Estado | Qué ve el jugador hoy |
|---|---|---|---|
| 01 | Ciudad Maldita | 🟡 | Slot **EN CONSTRUCCIÓN** en el selector. Su historia se cuenta como **prólogo** (voz del Hechicero, una vez por perfil) al entrar por primera vez a la Fábrica. |
| 02 | Fábrica Sin Fin | ✅ | Primera arena jugable. Cartel "ARENA 02 — LA FÁBRICA SIN FIN". Al completarla: Cicatriz hacia las Ruinas + el Hechicero explica qué es una Cicatriz. |
| 03 | Ruinas Célticas / Élficas | ✅ 🟡 | Guardián 1. El Guardián Ancestral se corrompe ("NACE LA BESTIA DEL BOSQUE"). Cristal Ancestral + línea "alguna vez fueron héroes". Falta arte de la forma Bestia. |
| 04 | Reino Fúngico | ✅ | Madre Espora (no Guardiana). Cicatriz: ecos de los Guardianes "y de alguien más"; el Hechicero los desestima. |
| 05 | Arena Gélida | ✅ | Guardián 2. "NACE EL DEMONIO GÉLIDO". Cristal de Escarcha + "no preguntes cómo sé tanto de ellos". |
| 06 | Arena Acuática | ✅ | Kraken Joven (subjefe) y Leviatán (jefe final: el "Kraken" del canon). No son Guardianes. Cicatriz: la realidad se dobla; el Hechicero nombra las Minas. |
| 07 | Minas Profundas | ⬜ | Slot **EN CONSTRUCCIÓN**. Se menciona en los textos del descenso. |
| 08 | Laberinto | ✅ | Guardián 3. El Guardián del Laberinto (subjefe) advierte "no le entregues los cristales…" antes de caer. Cristal de Piedra al vencer al Minotauro. |
| 09 | Abismo | ✅ | "El punto de no retorno". Cicatriz: los campeones cruzan a la dimensión de la Horda. |
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
- Perfil nuevo: solo la **primera arena jugable** (Fábrica, 02). Los slots en construcción no cuentan.
- Estrictamente secuencial: completar una arena abre la siguiente **jugable** (Acuática → Laberinto, saltando Minas).
- Completar el Abismo (09) abre la Infernal (10); completar la Infernal abre la Divina.
- Guardados viejos: lo que ya estaba abierto con el orden anterior **sigue abierto** (`save.legacyOpenArenas`); lo completado sigue completado; los cristales se remapean (el de Espora se reemplaza por el Ancestral si ya completaste las Ruinas; la copia vieja queda en `save.crystalsLegacyV1`).

## Pendientes narrativos
1. Arenas 01 Ciudad Maldita y 07 Minas Profundas (diseño + arte + migración para insertarlas).
2. ~~Decisiones de canon abiertas~~ Resueltas: Fábrica = Caballero (jefe) + Dragón de la Forja (subjefe); el Kraken del canon es el Leviatán (Lore Bible §8, C2/C3).
3. Forma "Bestia del Bosque" del Guardián Ancestral (arte).
4. El Forjador como entidad (arte + escena en la Infernal).
5. Líneas de muerte de cada Guardián ("lo que fueron").
6. Cinemáticas (ver `LA_HORDA_CINEMATICS.md`).
