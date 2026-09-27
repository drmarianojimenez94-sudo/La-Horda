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
- [ ] **Relay público**: desde un iPhone con datos móviles, crear sala → otro teléfono se une con el
      código → jugar 1 nivel → reconectar. **NOT VERIFIED IN RUNTIME** (el proxy del entorno lo bloquea) [19].
- [ ] **Si el relay es un plan gratuito que se duerme**: despertarlo antes de la sesión, o pasarlo a un
      plan sin suspensión [25 · D7].
- [ ] **Economía de la alfa** (DECISIÓN): mantener "etapa de prueba" (10.000 de oro, todo a 1.000,
      Únicos incluidos) asumiéndolo, o aplicar D1 [17].

## SHOULD FIX (primera semana de alfa)

- [ ] Medir la carga real en 4G. Si pasa de ~20 s, cargar por arena o usar WebP [25 · D3]. **NOT VERIFIED IN RUNTIME**
- [ ] Observar a 3–5 personas en la Arena 01 y decidir si se suaviza el nivel 9 o se agrega un punto de
      control en el 6, **solo** en la Ciudad (DECISIÓN) [16 · D2].
- [ ] Revisar con una persona el posible estancamiento de la Ciudad: 2 de ~25 partidas simuladas no
      terminaron en 22 min (Presentador vivo en el nivel 10; Eren en el 9). **NOT VERIFIED IN RUNTIME** [14].
- [ ] Prólogo en cooperativo: pasarlo a la primera pantalla de refuerzos [25 · D4].
- [ ] Axiom: vida inicial (murió en el nivel 2 en simulación) (DECISIÓN) [15 · D6].
- [ ] Probar el audio en un iPhone real: volumen, cansancio, silencio. **NOT VERIFIED IN RUNTIME** [23].
- [ ] Probar la sensación de combate con el dedo en un iPhone real. **NOT VERIFIED IN RUNTIME** [11].
- [ ] Recorrer la campaña completa hasta la Arena Infernal con una persona o con un piloto que sepa
      cruzar el Portal de las Minas. **NOT VERIFIED IN RUNTIME** [13].

## CAN WAIT FOR BETA

- [ ] Modales propios en vez de `confirm()` y `alert()` nativos [4.3 · D5].
- [ ] Sprites más grandes en la selección de guardián [8].
- [ ] Menos textos a la vez entre los minutos 2 y 3 (tutorial, alertas, carteles, "+") [22].
- [ ] Arte P0: Cerbero en alta resolución, pared agrietada del Laberinto, Ángel Corrompido
      (ver `LA_HORDA_MISSING_ASSETS.md`).
- [ ] Arte P1: tentáculos por función, Foco de Hielo, Focos de Convergencia, Rey de la Horda, raíces
      de la red micelial, cometa del Presentador.
- [ ] Aviso de "Etapa de prueba" con lenguaje de jugador, si la alfa no se presenta como prueba.
- [ ] Piloto automático (`tools/playtest/autopilot.js`) que use la acción contextual para cruzar el
      Portal de las Minas: así la simulación de campaña llega a la Infernal.

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
- [ ] Actualizar `tools/net-test/e2e.js` (falla igual en `main`: da por hecho una aparición del jefe del
      Bosque que ya no es así) y `tools/identity/t_identity.js` (usa `bosReady`, que ya no existe).

## MUST NOT (reglas del juego): verificación

- [x] Sin fuego amigo (`arena_pve.friendlyFire=false`; `combat.js` ignora el daño entre aliados).
- [x] Sin explosión de cadáveres como mecánica central.
- [x] Sin dash universal: el desplazamiento es habilidad propia de algunos guardianes.
- [x] Sin fabricación de Únicos: `makeItem` no genera Únicos y no hay receta. **Ojo:** la Tienda de la etapa
      de prueba los vende (ver DECISIÓN D1).
- [x] Sin pay-to-win: no hay moneda premium; las Gemas se ganan jugando.
- [x] Sin placeholders feos en pantalla.
