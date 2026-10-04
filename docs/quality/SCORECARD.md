# Tarjeta de calidad (AUTO-GENERADO)

> `node tools/quality/scorecard.js` sobre la evidencia de `bash tools/quality/collect-evidence.sh` (2026-10-04). Objetivo: **90/100** en cada aspecto. Cada nota sale de una fórmula visible sobre un número crudo medido por una herramienta del repo. Lo que necesita juicio humano no se puntúa (ver abajo).

## Total ponderado: **88** / 100

| Aspecto | Peso | Nota | Métricas medidas |
|---|---|---|---|
| Jugabilidad | 20 | **77** | 7/7 |
| Jefes | 12 | **98** | 4/4 |
| Arenas | 12 | **78** | 2/2 |
| Arte | 14 | **84** | 3/4 |
| Audio | 10 | **100** | 2/2 |
| HUD y presentación | 14 | SIN MEDIR | 0/6 |
| Modos de juego | 10 | **100** | 1/5 |
| Rendimiento | 8 | SIN MEDIR | 0/1 |

## Jugabilidad — **77**

| Métrica | Nota | Medido | Fórmula |
|---|---|---|---|
| victorias del perfil aprendiz | 100 | 50 % (1/2) | objetivo 50–80 %; −2,5 pts por punto porcentual afuera |
| victorias del perfil ocasional | 0 | 0 % (0/2) | objetivo 70–95 %; −2,5 pts por punto porcentual afuera |
| victorias del perfil habitual | 100 | 100 % (1/1) | objetivo 90–100 %; −2,5 pts por punto porcentual afuera |
| la habilidad importa (habitual ≥ ocasional ≥ aprendiz) | 50 | 100 / 0 / 50 % | 50 pts por cada escalón respetado |
| partidas que no terminan (tope 900 s) | 100 | 0/5 | −25 por partida trabada |
| duración de una arena ganada (mediana) | 100 | 532 s | objetivo 6–13 min; −0,25 pts por segundo afuera |
| errores durante las partidas | 100 | 0 | −20 por error |

## Jefes — **98**

| Métrica | Nota | Medido | Fórmula |
|---|---|---|---|
| validación en pelea real | 96 | {"PASS*":8,"PASS":20} | PASS 100 · PASS* 85 · FIX 40 · REWORK 0 |
| ganchos "auto" con su arena disparados | 100 | 24/24 | % de ganchos que la pelea real produce |
| diseño (fichas PASS) | 96 | 27/28 | % de fichas con diseño PASS |
| pruebas de efecto (t_boss_arena_hooks) | 100 | 29 PASS / 0 FAIL | % de pruebas que pasan |

## Arenas — **78**

| Métrica | Nota | Medido | Fórmula |
|---|---|---|---|
| validador de arenas (colisión, telegraphs, ficha, exploración) | 97 | {"PASS":8,"WARNING":2} | PASS 100 · WARNING 85 · FAIL 0 |
| ninguna arena es un muro (gana ≥ 1 de 3 perfiles) | 50 | ciudad 67% · fortaleza 0% | % de arenas ganables por al menos un tercio de los perfiles |

## Arte — **84**

| Métrica | Nota | Medido | Fórmula |
|---|---|---|---|
| densidad de píxel coherente con los campeones (< ×2,5) | 85 | 85/100 tipos; 2 en REDRAW (≥ ×4) | % de tipos de enemigo/jefe con densidad < ×2,5 la del roster |
| jefes con arte propio y a la densidad del juego | 68 | 19/28 (REDRAW = cuerpo prestado o densidad ≥ ×4) | % de fichas de jefe sin REDRAW |
| campeones: sprites y animaciones (validador) | 100 | 29/29 | % de campeones PASS en el validador |
| proyectiles con identidad propia | SIN MEDIR | sin evidencia | % de pruebas que pasan |

## Audio — **100**

| Métrica | Nota | Medido | Fórmula |
|---|---|---|---|
| mezcla, identidad por arena/jefe/fase, costo (t_audio_mix) | 100 | 59 PASS / 0 FAIL | % de comprobaciones que pasan |
| niveles en partida: picos, RMS, silencios | 100 | 6 PASS / 0 FAIL | % de comprobaciones que pasan |

## HUD y presentación — SIN MEDIR

| Métrica | Nota | Medido | Fórmula |
|---|---|---|---|
| 59 pantallas × 2 teléfonos: botones chicos, desbordes, letra diminuta, fuentes | SIN MEDIR | sin evidencia | 100 − 2 por problema |
| texto grande encimado en los momentos más cargados | SIN MEDIR | sin evidencia | −20 por texto grande de más (>2), −15 por superposición, −10 por botín al centro |
| toques para las acciones comunes | SIN MEDIR | sin evidencia | % de comprobaciones que pasan |
| controles táctiles ≥ 44 px, en pantalla | SIN MEDIR | sin evidencia | % de comprobaciones que pasan |
| texto dentro de su marco | SIN MEDIR | sin evidencia | % de comprobaciones que pasan |
| 290 contratos de interfaz (revivir, guías, layout) | SIN MEDIR | sin evidencia | % de comprobaciones que pasan |

## Modos de juego — **100**

| Métrica | Nota | Medido | Fórmula |
|---|---|---|---|
| Guerra de Cristales: simulación (partidas completas de bots) | SIN MEDIR | sin evidencia | % de comprobaciones que pasan |
| Guerra de Cristales: integrada al hub, ida y vuelta | SIN MEDIR | sin evidencia | % de comprobaciones que pasan |
| Horda Infinita: rondas, jefes cada 5, mutadores, recompensa | SIN MEDIR | sin evidencia | % de comprobaciones que pasan |
| cooperativo real por el relay (4 clientes) | SIN MEDIR | sin evidencia | % de comprobaciones que pasan |
| campaña completa ganable por un jugador habitual | 100 | 100 % | % de arenas ganadas por el perfil habitual |

## Rendimiento — SIN MEDIR

| Métrica | Nota | Medido | Fórmula |
|---|---|---|---|
| carga en 4G simulado (portada, MB, tiempo a jugar) | SIN MEDIR | sin evidencia | % de comprobaciones que pasan |

## Juicio humano pendiente (no se puntúa)

- Si la música y los efectos SUENAN bien (son sintetizados; la tarjeta solo mide mezcla, niveles e identidad)
- Si el arte es lindo y coherente a la vista (la tarjeta mide densidad, arte propio y validadores técnicos)
- Sensación en un teléfono real (todo se midió en Chromium emulado)
- Diversión y ritmo percibidos por personas
