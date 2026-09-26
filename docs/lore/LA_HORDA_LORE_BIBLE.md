# LA HORDA — Lore Bible (canon oficial)

> **Fuente de verdad** para texto, diálogos, arte, orden de campaña y diseño de jefes.
> Reemplaza a `LA_HORDA_LORE.md` (canon V1, que ubicaba a la Madre Espora como Guardiana).
> Si el código contradice este documento, **manda este documento**: la contradicción se registra en la
> sección 8 y se adapta la implementación. Nada del canon se cambia en silencio.

## 1. Premisa
1. Hace siglos, **Cuatro Guardianes** sostenían un sello con cuatro **cristales**: así la Horda quedaba
   limitada a su propia dimensión.
2. **La Horda no se puede destruir:** es la maldad que existe en el mundo. No mata: **corrompe**.
3. Los Guardianes fueron cayendo. Los monstruos que hoy custodian los cristales **alguna vez fueron héroes**.
4. **El Hechicero Supremo** se presenta como guía de los campeones. En realidad fue el **primero y líder
   de los Cuatro**, se quedó en la dimensión de la Horda **por decisión propia** y quiere fundir los
   cuatro cristales en uno para **ser** la Horda.
5. Donde la Horda pasa, la realidad queda herida: **las Cicatrices de la Horda** (término provisional).
   Los campeones las siguen de arena en arena.

## 2. Orden canónico de la campaña

| # | Arena | ID interno (no cambia) | Jefe canon | ¿Guardián? | Rol narrativo |
|---|---|---|---|---|---|
| 01 | **Ciudad Maldita** | `ciudad` (*en construcción*) | — | No | Origen. La Horda vuelve a la ciudad de los campeones; aparece la proyección del Hechicero; nace la primera Cicatriz. |
| 02 | **Fábrica Sin Fin** | `fortaleza` | Dragón Steampunk | **No** | La Horda contaminó las máquinas de otra civilización. Primera persecución de la Cicatriz. |
| 03 | **Ruinas Célticas / Élficas** | `bosque` | Guardián Ancestral → Bestia del Bosque | **GUARDIÁN 1** | Primer cristal. Revelación: los monstruos alguna vez fueron héroes. |
| 04 | **Reino Fúngico** | `micelial` | Madre Espora | **No** | El micelio guarda ecos de los Guardianes (y de alguien más). |
| 05 | **Arena Gélida** | `hielo` | Mago Gélido → Demonio Gélido | **GUARDIÁN 2** | Segundo cristal. Primeras pistas de que la historia del Hechicero está incompleta. |
| 06 | **Arena Acuática** | `acuatica` | Kraken | **No** | Con dos cristales la realidad se vuelve inestable. |
| 07 | **Minas Profundas** | `minas` (*en construcción*) | — | No | Luz, oscuridad, exploración: el descenso. |
| 08 | **Laberinto** | `laberinto` | Guardián del Laberinto → Minotauro | **GUARDIÁN 3** | Tercer cristal. El Guardián advierte: no entregar los cristales al Hechicero (sin diálogo definitivo). |
| 09 | **Abismo** | `abismo` | El Que Mora Debajo | No | Punto de no retorno: los campeones cruzan a la dimensión de la Horda. |
| 10 | **Arena Infernal** | `infernal` | Hechicero Supremo → Rey / Demonio de la Horda | **GUARDIÁN 4** | El Forjador prisionero; revelación del Hechicero; el plan de fusión fracasa; final. |

**Postgame (fuera de las diez):** **Arena Divina** — se desbloquea al completar la Arena Infernal y
conserva **Las Cinco Pruebas Divinas**. Es el puente hacia **COLISEO — PRÓXIMAMENTE** (PvP).

## 3. Los Cuatro Guardianes (registro explícito)

- **GUARDIÁN 1:** Ruinas Célticas / Élficas — **Guardián Ancestral → Bestia del Bosque**. Cristal Ancestral (verde).
- **GUARDIÁN 2:** Arena Gélida — **Mago Gélido → Demonio Gélido**. Cristal de Escarcha (celeste).
- **GUARDIÁN 3:** Laberinto — **Guardián del Laberinto → Minotauro**. Cristal de Piedra (ámbar).
- **GUARDIÁN 4:** Arena Infernal — **Hechicero Supremo → Rey / Demonio de la Horda**. Cristal del Juicio (oro blanco).

**NO son Guardianes:** el **Kraken**, la **Madre Espora** ni el **Dragón Steampunk**. Son criaturas de la
Horda (o corrompidas por ella) que los campeones cruzan en el camino. Ningún texto, cristal ni UI debe
presentarlos como Guardianes.

## 4. Las Cicatrices de la Horda (concepto narrativo, no mecánica)
- Aparecen cuando el sello se debilita. Conectan las arenas: son el hilo del viaje.
- Por ahora se expresan con **textos, carteles, diálogos del Hechicero y transiciones** (cartel "✦" al
  completar cada arena). No hay sistema jugable nuevo.
- Evolución: una grieta (Ciudad) → rastro entre máquinas (Fábrica) → late con cada cristal (Ruinas,
  Gélida) → inestable (Acuática) → se hunde (Minas, Laberinto) → se rasga en el Abismo → la dimensión
  de la Horda.
- VFX y cinemáticas propias: pendientes (ver `LA_HORDA_CINEMATICS.md`).

## 5. El Hechicero Supremo — arco
| Tramo | Cómo se comporta |
|---|---|
| Prólogo (Ciudad Maldita) | Proyección en el humo: los Guardianes están cayendo y hay que recuperar los cristales. |
| 02 Fábrica | Mentor cálido y claro. Enseña a seguir la Cicatriz. |
| 03 Ruinas | Primer cristal: "yo te lo cuido". Reconoce que los monstruos fueron héroes. |
| 04 Reino Fúngico | Desestima los ecos de las esporas ("no importan"). |
| 05 Gélida | "No preguntes cómo sé tanto de ellos. Todavía no." La historia no cierra. |
| 06–08 | Cada vez más interesado en los cristales que en los campeones. Descarta la advertencia del Guardián del Laberinto ("deliraba"). |
| 09 Abismo | "Ya no hay vuelta atrás. Te espero en el corazón del Infierno." |
| 10 Infernal, nivel 9 | Se revela: fue el primero y líder de los Cuatro, se quedó por decisión propia. Pelea como subjefe y huye. |
| 10 Infernal, jefe final | Explica que el Forjador se negó a fundir los cristales. Pelea en 3 formas y se convierte en el **Rey de la Horda**. |

## 6. El Forjador
El único capaz de fundir los cuatro cristales en uno. Se negó y el Hechicero lo encadenó en el fondo de
la Arena Infernal. Hoy aparece como **voz** (cartel) y en los diálogos del Hechicero; todavía no hay
entidad ni arte propio.

## 7. Final
El plan de fusión fracasa y el Rey de la Horda cae. Pero los cristales no pueden destruirse y la Horda
tampoco. **Los cristales siguen necesitando portadores:** los campeones empiezan a ocupar el lugar de
los Guardianes (gancho para Arena Divina, Coliseo y temporadas).

## 8. Contradicciones entre el código y el canon (registradas, no ocultas)

| # | Canon | Código actual | Cómo se adaptó |
|---|---|---|---|
| C1 | Arena 01 Ciudad Maldita y 07 Minas Profundas | No existen como arenas jugables | Slots **EN CONSTRUCCIÓN** en el selector (IDs `ciudad`/`minas`, `comingSoon`). El desbloqueo las saltea. La Ciudad se cuenta como **prólogo** antes de la Fábrica. Cuando existan, se agregan al orden jugable con una migración. |
| C2 | Jefe de la Fábrica: Dragón Steampunk | Subjefe **Dragón de la Forja**; jefe final **Caballero de la Armadura Oxidada** | No se reemplazan jefes. El Dragón de la Forja es la lectura steampunk del canon; el Caballero queda como jefe final. **Decisión pendiente** del autor: ¿el Caballero sigue como jefe final o el Dragón pasa a ser el jefe? |
| C3 | Jefe de la Acuática: Kraken | Subjefe **Kraken Joven** (nivel 6); jefe final **Leviatán** | Sin cambios de jefe. Ninguno es Guardián. **Pendiente:** confirmar si el canon "Kraken" es el Leviatán o si el Kraken debe ser el jefe final. |
| C4 | Guardián Ancestral → **Bestia del Bosque** | El Guardián se transforma a su forma "Corrompido" (misma pelea); `bestia_bosque` existe como enemigo común | Cartel de transformación: "NACE LA BESTIA DEL BOSQUE". Falta arte de la forma Bestia (ver Cinematics). |
| C5 | Mago Gélido → **Demonio Gélido** | Fase 2: `angel_caido_hielo` ("Ángel Caído de Hielo") | Mismo jefe y mismo arte; en la campaña se muestra como **"Demonio Gélido — Ángel Caído"** y el cartel dice "NACE EL DEMONIO GÉLIDO". En la Arena Divina conserva su nombre original. |
| C6 | Hechicero Supremo → **Rey / Demonio de la Horda** | 3 formas: Ángel Corrompido → Golem de Cuerpos → `demonio_mayor` (designKey `demonio_final`) | Mismas formas y mecánicas. La forma final se muestra como **"Rey de la Horda — Forma Final"**. |
| C7 | El Forjador, prisionero en la Infernal | No existía | Se agregó solo como voz/diálogo (sin entidad). |
| C8 | La Madre Espora NO es Guardiana | Canon V1: era la Guardiana 1 y daba el Cristal de Espora | Corregido: el cristal pasa a las Ruinas (**Cristal Ancestral**). Los guardados viejos migran (`campaignV2Migrate`). El ataque del jefe final que usaba "esporas" pasa a ser la **Niebla del Olvido** del Guardián Ancestral (misma mecánica). |
| C9 | Cristal de Piedra al vencer al Guardián del Laberinto → Minotauro | Se daba al matar al subjefe (nivel 6) | Ahora se entrega al completar el Laberinto (Minotauro). El subjefe deja la advertencia. |
| C10 | Arena Divina: postgame tras la Infernal | Se desbloqueaba con todas las arenas completas | Ahora: al completar la Arena Infernal. |
| C11 | Orden anterior (Bosque → Acuática → Fortaleza → Micelial → Hielo → Abismo → Laberinto → Infernal) | — | Reemplazado por el orden de la sección 2. La curva de dificultad sigue la posición nueva. |

## 9. Reglas de tono
- El Hechicero habla **claro**; la sospecha va en **una frase al final**, nunca en medio de una instrucción.
- Los Guardianes eran héroes: sus textos tienen una línea de lo que fueron.
- La Horda nunca habla. Es una fuerza, no un personaje.

## 10. Dónde vive en el código
- Orden, números y slots en construcción: `js/data/arenas.js` (`CAMPAIGN_ORDER`, `ARENA_ORDER`, `campaignNumberLabel`).
- Desbloqueo: `js/arenas/arena-rules.js` (`isArenaUnlocked`, `campaignFrontier`, `isDivinaUnlocked`).
- Migración de guardados: `js/storage/save.js` (`campaignV2Migrate`).
- Selector de arenas: `js/ui/menus.js` (`renderArenaGrid`).
- Historia (Cicatrices, prólogo, carteles, final): `js/systems/campaign-story.js`.
- Cristales: `js/systems/crystals.js`. Final: `js/arenas/infernal/inf-hechicero.js`.
- Fichas previas a cada arena: `js/ui/run-intro.js`.
