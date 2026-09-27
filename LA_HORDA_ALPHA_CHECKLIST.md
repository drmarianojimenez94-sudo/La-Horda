# LA HORDA — ALPHA CHECKLIST

Cómo leer esta lista:
- `[x]` hecho y verificado en esta auditoría.
- `[ ]` pendiente.
- Etiquetas:
  - **DECISIÓN**: toca economía, progresión o diseño; lo decide el dueño.
  - **NOT VERIFIED IN RUNTIME**: este entorno no puede comprobarlo.

El detalle de cada punto está en [`LA_HORDA_ALPHA_AUDIT.md`](LA_HORDA_ALPHA_AUDIT.md) (número de sección entre corchetes).

---

## MUST FIX (antes de mandar el enlace)

- [x] Perfil nuevo = campaña real: guardián de regalo, Arena 01, nivel 1. El modo prueba (nivel 90,
      todas las arenas y skins) solo se activa con `?dev=1` [24 · C1].
- [x] El prólogo no tapa la pantalla en pleno combate: ahora es una página previa del Hechicero [24 · C2].
- [x] La Arena 01 (y las Minas) tienen ficha del Hechicero: qué te mata, qué te ayuda, el objetivo [24 · C2].
- [x] Joystick centrado y entero en pantalla [24 · C3].
- [x] "Comenzar" de la Sala siempre a mano [24 · C4].
- [x] Sin herramientas de desarrollo visibles: botón "B1" y "[Prueba] Generar objeto" [24 · C6].
- [x] La suite del Códice vuelve a pasar: estaba en rojo en `main` [24 · C10].
- [x] **Relay público**: el servidor rechazaba en silencio al juego publicado (filtro de orígenes); arreglado
      y explicado con un cartel. Verificado en vivo desde GitHub Actions: crear sala 76 ms, unirse con código
      100 ms, y dos iPhone emulados hacen el flujo completo contra GitHub Pages sin errores [27.1].
- [ ] **Relay desde un iPhone físico** (Safari, datos móviles): crear sala → otro teléfono se une → jugar 1
      nivel → reconectar. **NOT VERIFIED IN RUNTIME** (Chromium emulado no es Safari).
- [x] **Relay dormido (plan gratuito)**: el juego lo despierta al abrir y reintenta hasta ~100 s con un
      contador visible; probado con `tools/net-test/coldstart.js` [27.1].
- [x] **Economía de la alfa**: precios por rareza, Míticos y Únicos fuera de la Tienda, guardián a 2.500
      (un guardián cada 2–3 victorias). El regalo único de 10.000 se mantiene (decisión del dueño) [27.6].

## SHOULD FIX (primera semana de alfa)

- [x] Carga en 4G simulado: título en 13,9 s (antes 52,5 s), carga en dos tandas + WebP sin pérdida [27.2].
      La medición sobre GitHub Pages queda en el workflow `Live check` (job `load`).
- [x] Arena 01 más amable (solo la Ciudad): en simulación se gana al primer intento (antes 5) [27.6].
- [ ] Observar a 3–5 personas en la Arena 01 para confirmar la curva con humanos.
- [x] "Estancamiento" de la Ciudad: era el piloto automático empujando contra los edificios; con el piloto
      corregido, 41 partidas y ninguna llega al tope [27.3].
- [x] Prólogo en cooperativo: ahora sale en la primera pantalla de refuerzos.
- [x] Axiom: vida inicial 84 → 92.
- [ ] Probar el audio en un iPhone real: volumen, cansancio, silencio. **NOT VERIFIED IN RUNTIME** [23].
      (Ya hay volúmenes de música y efectos en la pausa, y el audio se reanuda al volver de otra app.)
- [ ] Probar la sensación de combate con el dedo en un iPhone real. **NOT VERIFIED IN RUNTIME** [11].
- [x] Campaña completa hasta la Arena Infernal con el piloto automático (cruza el Portal): Mago en 12
      partidas, Tanque en 19 [27.6]. Con personas: pendiente.
- [ ] Abismo con el Tanque en solitario: 7 intentos en simulación (cae al vacío y los bots no llegan a
      rescatarlo cuando el derrumbe corta los puentes). DECISIÓN de diseño [27.6].

## CAN WAIT FOR BETA

- [x] Modales propios en vez de `confirm()` y `alert()` nativos.
- [x] Sprites más grandes en la selección de guardián.
- [x] Menos textos a la vez: como mucho 2 alertas de civiles (1 si habla el Hechicero).
- [ ] Arte P0: Cerbero en alta resolución, pared agrietada del Laberinto, Ángel Corrompido
      (ver `LA_HORDA_MISSING_ASSETS.md`).
- [ ] Arte P1: tentáculos por función, Foco de Hielo, Focos de Convergencia, Rey de la Horda, raíces
      de la red micelial, cometa del Presentador.
- [ ] Aviso de "Etapa de prueba" con lenguaje de jugador, si la alfa no se presenta como prueba.
- [x] Piloto automático que cruza el Portal de las Minas (la simulación llega a la Infernal).

## POST-LAUNCH

- [ ] Modularizar los 210 scripts globales (`MODULARIZATION_FOLLOWUPS.md`).
- [ ] Unificar la compra de skins (duplicada en `menus.js` y `shop-ui.js`) [4.2].
- [ ] Quitar la rama muerta `PLAYTEST_UNLOCK_ALL` [4.1].
- [ ] Consolidar los más de 30 `.md` de la raíz en `docs/`.
- [ ] Borrar o usar los 4 íconos sin uso de la Profeta [5].
- [ ] Audio con archivos grabados (hoy es todo síntesis): **no se inventaron archivos**.

---

## Verificación de regresión de esta auditoría

- [x] `tools/items/t_*.js`: 18/18 suites OK en la rama (`t_codex` estaba en rojo en `main` y ahora
      pasa; `t_reactions`, después de volverla determinista, pasó 5 de 5).
- [x] Recorrido de jugador nuevo en móvil después de los cambios: 0 errores, 0 404.
- [x] Persistencia: recargar después de jugar y de abandonar conserva guardián, XP, oro y prólogo visto.
- [x] Smokes de arena: Fábrica, Ciudad, Minas y Micelial OK.
- [x] `boss_rules`: 100/101 en la corrida completa; `inf_antikite` pasa aislado (2 de 2 en la rama y en `main`): intermitente.
- [x] Red: `campaign-gate`, `lobby_code_skins` (móvil y escritorio), `disconnect`, `minas_coop` y `ciudad_coop` OK.
- [x] `tools/net-test/e2e.js` y `tools/identity/t_identity.js` actualizados al Bosque actual: pasan.

## Segunda pasada: nuevas herramientas de verificación

- `.github/workflows/live-check.yml`: relay publicado + dos iPhone emulados contra GitHub Pages + carga en 4G.
  Corre una vez por día y a mano desde Actions.
- `tools/audit/ui_layout.js`: 43 pantallas en iPhone 14 y SE (botones, textos, desbordes). Hoy: 0 problemas.
- `tools/audit/fps.js`: fluidez; `tools/audit/loadtime.js`: carga; `tools/net-test/coldstart.js`: relay dormido.
- `tools/minas/t_clamp.js` y `tools/ciudad/t_clamp.js`: nadie queda fuera del mapa.

## MUST NOT (reglas del juego): verificación

- [x] Sin fuego amigo (`arena_pve.friendlyFire=false`; `combat.js` ignora el daño entre aliados).
- [x] Sin explosión de cadáveres como mecánica central.
- [x] Sin dash universal: el desplazamiento es habilidad propia de algunos guardianes.
- [x] Sin fabricación de Únicos: `makeItem` no genera Únicos y no hay receta. La Tienda ya no vende Únicos
      ni Míticos.
- [x] Sin pay-to-win: no hay moneda premium; las Gemas se ganan jugando.
- [x] Sin placeholders feos en pantalla.
