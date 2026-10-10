# Audio independiente del combate — 10 de octubre de 2026

Problema reproducido: `playSfx` y la síntesis de ruido consumían `Math.random`, compartido
con daño, IA y botín. El límite de voces depende de `AudioContext.currentTime`: reproducir
un sonido o descartarlo alteraba las siguientes tiradas del juego. Congelar solamente
`performance.now` no resolvía el defecto.

Una traza con Saelis, semilla 117 y reloj simulado aisló la primera divergencia en
`playSfx` a los 29,633 s. Tras aislar audio.js, la comparación sonido/silencio encontró
otra divergencia en `bosRustle` a los 44,200 s. Se separó también el azar de los callbacks
de Bosque, Ciudad, Fortaleza y Minas. Se conserva el azar de sus mecánicas de escenario.

La síntesis, las variaciones de tono/volumen, la música y los sonidos de arena ahora usan
un generador privado Mulberry32. No modifica estadísticas, límites de voces, mezclador,
semillas ni umbrales de balance. No pretende hacer determinista todo el motor: otras
fuentes visuales o de reloj requieren auditoría independiente.

## Regresión reproducible

- `node tools/audio/test-rng-isolation.js`: prohíbe usar el RNG del juego; verifica 10.000
  muestras, siete buffers de ruido/reverb y ejecuta los 185 callbacks de sonido de arenas.
- `node tools/audio/test-combat-rng.js`: dos contextos Chromium nuevos, Saelis nivel 20,
  Bosque, semilla 117, 60 segundos de simulación con idéntico reloj. Sonido y silencio
  deben dar el mismo daño, vida, habilidades, bajas y estado del RNG. Resultado local:
  daño 2167,5050882060796; vida 268; habilidades 35; bajas 181; estado RNG 2536222292.
- Ambas pruebas se ejecutan en CI; los cambios de `tools/audio/**` disparan el workflow.

El ensayo de 60 segundos no acredita todas las arenas, campeones, modos de red ni
hardware móvil. Los callbacks de las diez arenas sí se ejercitan individualmente.
La aprobación del nuevo contenido sigue dependiendo de sus propios gates.

## Validación del cambio

- Plantel público: 38 registrados, 20 candidatos de referencia, 60 simulaciones de
  150 segundos; PASS, cero errores y violaciones. Resultado en
  `docs/balance/entry-gate-results.json`.
- Suite completa `tools/audio/t_audio_mix.js`: SUMMARY OK, fails=0. Diez arenas,
  música de jefes, transiciones, silencio, variación y límites de nodos. Pico de combate
  −1,4 dBFS; estrés −1,3 dBFS; sin clipping ni NaN. En Chromium de escritorio,
  audio en partida: media 0,063 ms/cuadro, p95 0,4 ms. No certifica teléfonos reales.
- Taller separado de Solciju/Veyra, con el mismo arreglo: 66 simulaciones, PASS.
  Esa evidencia pertenece al taller y no aprueba arte, skins ni lanzamiento.
