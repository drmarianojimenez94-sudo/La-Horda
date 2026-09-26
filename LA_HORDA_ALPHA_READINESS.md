# LA HORDA — Alpha Readiness Gate (Alpha 0.1)

> Veredictos por categoría: **PASS** · **PASS WITH ISSUES** · **FAIL** · **UNKNOWN / HUMAN TEST REQUIRED**.
> Sin puntajes. Cada veredicto cita la evidencia (prueba ejecutada o su ausencia).
> Detalle en `LA_HORDA_PLAYTEST_REPORT.md`.

| Categoría | Veredicto | Por qué |
|---|---|---|
| **ONBOARDING** | **PASS WITH ISSUES** | Existe un tutorial jugable sin pantallas: el Hechicero enseña moverse → atacar → habilidad y después revivir, runas, emboscadas, fisuras, frío y braseros cuando aparecen. Lo aprendido se guarda y no se repite (`TUT.*` 4/4). **Falta:** que lo pruebe una persona nueva (claridad del texto y del ritmo). De los 18 conceptos del documento cubre 16: movimiento, ataque, habilidad, recarga, energía, daño recibido, jerarquía enemiga, avisos (emboscadas y jefes), acción contextual, aliados/revivir, refuerzo al subir de nivel, mejorar una habilidad e identidad de arena (`TUT.*` 5/5; "mejorar una habilidad" se dispara con el "+" real y no tiene prueba automática). Le faltan targeting y XP. El retrato del Hechicero es provisorio. |
| **COMBAT** | **PASS WITH ISSUES** | La base de impacto, números y avisos es de fases anteriores. Lo nuevo es legible en las capturas de celular: barra circular, botón con porcentaje, flechas al borde y avisos que los bots esquivan. **Falta:** íconos de estado sobre los enemigos y una prueba humana de "qué me pegó" con mucha horda. |
| **ARENA IDENTITY** | **PASS WITH ISSUES** | De las **7 arenas jugables, las 7 cambian cómo se juega**: Ruinas (runas + emboscadas), Acuática (corrientes + charcos), Fortaleza (puentes + trampas, previa), Micelial (el mapa crece, previa), Gélida (frío + braseros), Laberinto (sellos en orden) e Infernal (fisuras). Todo probado con 81 chequeos y partidas reales. **Pero el documento pide 10:** Ciudad Maldita, Abismo y Minas están **EN DESARROLLO** (no existen ni tienen arte). En la Gélida el frío casi no actúa sobre el piloto automático: su impacto real depende de humanos. |
| **PROGRESSION** | **PASS WITH ISSUES** | La campaña simulada de 3 campeones llega de la arena 1 a la 7 (nivel final ≈ 46). **La Gélida es una pared** (1/7 y 1/22 intentos, Tanque 0/20). Era así antes de esta fase; queda pendiente de diseño. |
| **MASTERY** | **PASS WITH ISSUES** | Cada arena tiene un "uso del mapa contra la horda" medible: la runa atrapa y lastima 6/6; el charco aturde 4/4; los sellos aturden y ralentizan a toda la horda; la fisura sellada aturde alrededor. **Falta:** evidencia humana de que el conocimiento se convierte en poder (anticipar → usar). |
| **BOSSES** | **PASS WITH ISSUES** | Los jefes existentes no se tocaron y la regresión pasa. **FAIL parcial frente al documento:** el jefe final Hechicero → Demonio de la Horda no existe (sin arte ni canon: P0 en `LA_HORDA_MISSING_ASSETS.md`). Tres jefes tienen un solo frame (Mago de Hielo, Ángel Caído, Jinete). |
| **VISUAL CONSISTENCY** | **PASS WITH ISSUES** | Todo lo nuevo es provisorio y procedural, con la paleta de cada arena y píxeles enteros. No reemplaza arte canon. Se nota que es "de código" al lado de los sprites pintados: está listado para arte (P1). |
| **MULTIPLAYER** | **PASS WITH ISSUES** | Probado con relay real: Infernal con **4 jugadores** (11/11), las otras 4 arenas con 2 (25/25), el ciclo completo de 4 navegadores ×3 rondas (102 chequeos, 0 fallas), e2e (0 fallas), gate de campaña (0 fallas). Se corrigió un problema previo de correcciones en cadena por la corriente de la Acuática. **Falta:** 4 humanos reales en celulares y redes reales (latencia, Wi-Fi/4G): **HUMAN TEST REQUIRED**. |
| **BOTS** | **PASS WITH ISSUES** | Entienden las mecánicas nuevas: cierran fisuras sin meterse rodeados, encienden braseros cuando hace falta, usan runas con horda, resuelven los sellos en orden y evitan remolinos. Se corrigieron dos problemas reales encontrados jugando: abandonaban la pelea por objetivos de poco valor y se trababan en las puntas de los muros. **Queda:** el piloto de la simulación no usa las mecánicas (juega como antes). |
| **STABILITY** | **PASS** | 0 errores de página en: 88 partidas de campaña simulada, más de 100 partidas A/B, la batería de identidad, la funcional (91/91), la Fortaleza (41/41) y las pruebas de red. Sin trabas de partida: las fisuras bajan de etapa entre niveles, los sellos vuelven a cero, los braseros se reencienden. **Flake conocido y preexistente:** `BOTS.vuelven_a_la_zona_segura` (Micelial) falla a veces. |
| **PERFORMANCE** | **PASS WITH ISSUES** | Chromium sin GPU, con otras simulaciones en paralelo: `update()` < 1 ms y `render()` 2-6 ms por cuadro con 40-50 enemigos en las 5 arenas extendidas (+0,1 a +0,4 ms respecto de la versión vieja). **Falta:** medir en un celular real, sobre todo gama media con iOS Safari: **HUMAN TEST REQUIRED**. |
| **RETENTION** | **UNKNOWN / HUMAN TEST REQUIRED** | Hay más motivos para volver (mastery por arena, narrativa que asoma: "Tres cayeron", el mural), pero el deseo de jugar "una más" no se puede medir sin personas. Riesgo detectado: la curva despareja (arenas 1-4 fáciles, Gélida muro). |

## Resumen

**Alpha 0.1 jugable y estable.** Las 7 arenas existentes se diferencian por cómo se juegan, con red y bots que entienden las mecánicas.

**Bloqueantes para una "Alpha completa" según el documento:**

1. Arte y canon del Hechicero y del Demonio de la Horda (final de campaña).
2. Las 3 arenas que no existen (Ciudad Maldita, Abismo, Minas) y las 5 Pruebas de la Divina.
3. Decisión de diseño sobre la curva de la Gélida.
4. Playtest humano (onboarding, celular, 4 personas).
