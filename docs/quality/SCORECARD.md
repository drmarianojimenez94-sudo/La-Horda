# Tarjeta de calidad (AUTO-GENERADO)

> `node tools/quality/scorecard.js` sobre la evidencia de `bash tools/quality/collect-evidence.sh` (2026-10-04). Objetivo: **90/100** en cada aspecto. Cada nota sale de una fórmula visible sobre un número crudo medido por una herramienta del repo. Lo que necesita juicio humano no se puntúa (ver abajo).

## Total ponderado: **92** / 100

| Aspecto | Peso | Nota | Métricas medidas |
|---|---|---|---|
| Jugabilidad | 20 | **82** | 7/7 |
| Jefes | 12 | **98** | 4/4 |
| Arenas | 12 | **98** | 2/2 |
| Arte | 14 | **97** | 4/4 |
| Audio | 10 | **100** | 2/2 |
| HUD y presentación | 14 | **100** | 6/6 |
| Modos de juego | 10 | **96** | 5/5 |
| Rendimiento | 8 | **57** | 3/3 |

## Jugabilidad — **82**

| Métrica | Nota | Medido | Fórmula |
|---|---|---|---|
| victorias del perfil aprendiz | 100 | 73 % (22/30) | objetivo 50–80 %; −2,5 pts por punto porcentual afuera |
| victorias del perfil ocasional | 58 | 53 % (16/30) | objetivo 70–95 %; −2,5 pts por punto porcentual afuera |
| victorias del perfil habitual | 100 | 93 % (28/30) | objetivo 90–100 %; −2,5 pts por punto porcentual afuera |
| la habilidad importa (habitual ≥ ocasional ≥ aprendiz) | 50 | 93 / 53 / 73 % | 50 pts por cada escalón respetado |
| partidas que no terminan (tope 900 s) | 75 | 1/90 | −25 por partida trabada |
| duración de una arena ganada (mediana) | 100 | 476 s | objetivo 6–13 min; −0,25 pts por segundo afuera |
| errores durante las partidas | 100 | 0 | −20 por error |

## Jefes — **98**

| Métrica | Nota | Medido | Fórmula |
|---|---|---|---|
| validación en pelea real | 96 | {"PASS*":8,"PASS":20} | PASS 100 · PASS* 85 · FIX 40 · REWORK 0 |
| ganchos "auto" con su arena disparados | 100 | 24/24 | % de ganchos que la pelea real produce |
| diseño (fichas PASS) | 96 | 27/28 | % de fichas con diseño PASS |
| pruebas de efecto (t_boss_arena_hooks) | 100 | 29 PASS / 0 FAIL | % de pruebas que pasan |

## Arenas — **98**

| Métrica | Nota | Medido | Fórmula |
|---|---|---|---|
| validador de arenas (colisión, telegraphs, ficha, exploración) | 97 | {"PASS":8,"WARNING":2} | PASS 100 · WARNING 85 · FAIL 0 |
| ninguna arena es un muro (gana ≥ 1 de 3 perfiles) | 100 | ciudad 78% · fortaleza 44% · bosque 56% · micelial 100% · hielo 56% · acuatica 100% · laberinto 78% · abismo 89% · minas 100% · infernal 33% | % de arenas ganables por al menos un tercio de los perfiles |

## Arte — **97**

| Métrica | Nota | Medido | Fórmula |
|---|---|---|---|
| densidad de píxel coherente con los campeones (< ×2,5) | 88 | 88/100 tipos; 0 en REDRAW (≥ ×4) | % de tipos de enemigo/jefe con densidad < ×2,5 la del roster |
| jefes con arte propio y a la densidad del juego | 100 | 28/28 (REDRAW = cuerpo prestado o densidad ≥ ×4) | % de fichas de jefe sin REDRAW |
| campeones: sprites y animaciones (validador) | 100 | 29/29 | % de campeones PASS en el validador |
| proyectiles con identidad propia | 100 | 2 PASS / 0 FAIL | % de pruebas que pasan |

## Audio — **100**

| Métrica | Nota | Medido | Fórmula |
|---|---|---|---|
| mezcla, identidad por arena/jefe/fase, costo (t_audio_mix) | 100 | 59 PASS / 0 FAIL | % de comprobaciones que pasan |
| niveles en partida: picos, RMS, silencios | 100 | 6 PASS / 0 FAIL | % de comprobaciones que pasan |

## HUD y presentación — **100**

| Métrica | Nota | Medido | Fórmula |
|---|---|---|---|
| 59 pantallas × 2 teléfonos: botones chicos, desbordes, letra diminuta, fuentes | 100 | issues=0 fonts=0 | 100 − 2 por problema |
| texto grande encimado en los momentos más cargados | 100 | maxBig=2 maxCenter=1 overlaps=0 lootCenter=0 errors=0 | −20 por texto grande de más (>2), −15 por superposición, −10 por botín al centro |
| toques para las acciones comunes | 100 | 14 PASS / 0 FAIL | % de comprobaciones que pasan |
| controles táctiles ≥ 44 px, en pantalla | 100 | 15 PASS / 0 FAIL | % de comprobaciones que pasan |
| texto dentro de su marco | 100 | 1 PASS / 0 FAIL | % de comprobaciones que pasan |
| 290 contratos de interfaz (revivir, guías, layout) | 100 | 1 PASS / 0 FAIL | % de comprobaciones que pasan |

## Modos de juego — **96**

| Métrica | Nota | Medido | Fórmula |
|---|---|---|---|
| Guerra de Cristales: simulación (partidas completas de bots) | 100 | 10 PASS / 0 FAIL | % de comprobaciones que pasan |
| Guerra de Cristales: integrada al hub, ida y vuelta | 100 | 2 PASS / 0 FAIL | % de comprobaciones que pasan |
| Horda Infinita: rondas, jefes cada 5, mutadores, recompensa | 87 | 20 PASS / 3 FAIL | % de comprobaciones que pasan |
| cooperativo real por el relay (4 clientes) | 100 | 1 PASS / 0 FAIL | % de comprobaciones que pasan |
| campaña completa ganable por un jugador habitual | 93 | 93 % | % de arenas ganadas por el perfil habitual |

## Rendimiento — **57**

| Métrica | Nota | Medido | Fórmula |
|---|---|---|---|
| costo del código por cuadro con la horda más grande, CPU ×4 (update + render) | 49 | infernal 10.8 ms → 60 fps (p95 22.7 ms, 62 enemigos; raf sin GPU 30 fps) · ciudad 12.2 ms → 60 fps (p95 20.5 ms, 36 enemigos; raf sin GPU 30 fps) · micelial 27.2 ms → 37 fps (p95 44.4 ms, 31 enemigos; raf sin GPU 30 fps) | peor arena: 20 fps → 0, 55 fps → 100 (fps = 1000 / máx(16,7 ms, mediana)) |
| cuadros con código lento (> 33 ms, CPU ×4) | 26 | micelial 19 % | 25 % → 0, 2 % → 100 |
| carga en 4G simulado (portada, MB, tiempo a jugar) | 100 | 7 PASS / 0 FAIL | % de comprobaciones que pasan |

## Juicio humano pendiente (no se puntúa)

- FPS real en un teléfono de gama media (esta máquina no tiene GPU: el rasterizado del canvas se mide por software y no se puntúa)
- Si la música y los efectos SUENAN bien (son sintetizados; la tarjeta solo mide mezcla, niveles e identidad)
- Si el arte es lindo y coherente a la vista (la tarjeta mide densidad, arte propio y validadores técnicos)
- Sensación en un teléfono real (todo se midió en Chromium emulado)
- Diversión y ritmo percibidos por personas
