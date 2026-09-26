# LA HORDA — Auditoría: próximos sprints y qué necesito para mejorar el juego

> Escrita después de mergear el pase nocturno (PR #14) y de sumar el final de campaña con el Hechicero
> Supremo, la pantalla previa a cada partida, los mensajes claros del guía y el pase de contraste de efectos.
> Ordenada por **impacto en la experiencia del jugador**, no por cantidad de código.

## 1. Dónde está el juego hoy (en una línea por área)

| Área | Estado | Lo que más falta |
|---|---|---|
| Combate | Sólido: impacto en 4 niveles, reacciones, roles, avisos, gore, destructibles | Probarlo con personas en celular (hit-stop, lectura en hordas grandes) |
| Efectos | Contraste nuevo (sombra + color + núcleo blanco), anticipación e impacto | Paleta por campeón en las ultis, encuadre de ulti, lenguaje de color de los avisos |
| Historia | El Hechicero guía, se revela en la Infernal y es el jefe final en 3 formas | Escenas de cierre (victoria/epílogo) y "sembrar la sospecha" arena por arena |
| Claridad | Pantalla previa por arena + mensajes directos | Códice de enemigos/roles y ficha de arena desde la pausa |
| Progresión/economía | Medida con simulación: campaña en 10–15 partidas, 5.000 de oro en la partida 6–7 | Validar con personas; sumidero de oro a largo plazo |
| Arenas | 7 jugables + Divina (en construcción) | Arenas 8–10 anunciadas como "EN DESARROLLO" |
| Multijugador | Relay, 4 jugadores, chat, revive, reintento | Reconexión robusta, lista de salas, emotes en partida |
| Rendimiento | ~2,5 ms de dibujo por cuadro en Chromium sin GPU | Perfilado en iPhone/Android reales, carga diferida de arte por arena |

## 2. Lo que necesito de vos (lo que no puedo resolver solo)

### 2.1 Arte (lo más importante)
Las fichas completas con prompts están en `LA_HORDA_COMBAT_MISSING_ASSETS.md`. Prioridad:

1. **HS-01 Hechicero angelical con alas de luz** (P0). Hoy las alas las dibujo en código sobre su sprite; con
   arte real la pantalla previa gana muchísimo.
2. **HS-02 Golem de Cuerpos animado** (caminar, aplastar, muerte). Hoy tiene 3 poses estáticas y se desliza.
3. **HS-03 Transformaciones** (Hechicero → Golem, Golem → Demonio). Hoy uso las 3 fases de la hoja y partículas.
4. **IT-01 Íconos de objetos con nombre** (24 legendarios, 8 míticos, 3 únicos). Hoy usan el ícono genérico.
5. **CH-01 Cofre** y **RO-01 insignias de rol** (hoy procedurales; funcionan, pero el arte real sube el nivel).

Formato ideal: hoja PNG con fondo transparente (o damero, ya tengo recortador para claro y oscuro), cuadros del
mismo tamaño y en filas por animación, como la hoja del Hechicero que mandaste.

### 2.2 Decisiones de diseño
- **Historia:** ¿por qué el Hechicero te guía? (¿necesita tu alma "despierta"? ¿sos su recipiente?). Con eso
  escribo 1–2 líneas de sospecha por arena y el epílogo.
- **Final:** ¿qué pasa al vencer la forma 3? (texto épico, créditos, "modo pesadilla" desbloqueado…).
- **Arena Divina (4v4):** ¿seguimos con ella o priorizamos las arenas 8–10?
- **Monetización:** hoy no hay ninguna (ni pay-to-win). Confirmar que sigue así.

### 2.3 Pruebas con personas (HUMAN TEST REQUIRED)
- La Gélida en 2–4 intentos y el Laberinto con campeones frágiles a distancia.
- Hit-stop del crítico en celulares de 60 Hz; duración de la ceremonia del cofre.
- ¿La pantalla previa se lee en 5–10 segundos? ¿Se entiende qué hacer en cada arena?
- ¿Los efectos nuevos ayudan a leer o ensucian en hordas de 40+?
- El final: ¿se entiende que el guía te traicionó? ¿las 3 formas se sienten épicas o largas?

## 3. Sprints propuestos

### Sprint 1 — "El final que se recuerda" (historia)
- Escena de victoria final: el Demonio cae, la luz se apaga, 3 líneas de epílogo, créditos.
- Sembrar la sospecha: una línea del Hechicero al terminar cada arena ("Bien. Ya casi estás listo… para mí").
- Música propia del jefe final por forma (hoy usa la música de jefe genérica).
- Si llega el arte: animaciones del Golem y transformaciones completas.
**Necesita:** decisión de historia (2.2) y, idealmente, HS-02/HS-03.

### Sprint 2 — "Se entiende todo" (claridad y onboarding)
- **Códice**: pantalla con cada enemigo, rol y jefe visto (qué hace y cómo contrarrestarlo), se llena al jugar.
- Ficha de la arena accesible desde la pausa (la misma de la pantalla previa).
- Íconos en el chip de regla de la arena con explicación al tocarlo.
- Primera partida guiada revisada con los mensajes nuevos (medir cuántos la terminan).

### Sprint 3 — "VFX 2" (especialista de efectos)
- **Lenguaje de color de los avisos**: rojo = daño, violeta = control (enraizar/aturdir), verde = zona segura,
  dorado = sagrado (Hechicero). Hoy cada jefe usa su paleta.
- **Encuadre de ulti**: zoom breve + viñeta + nombre de la ulti en el color del campeón.
- Paleta firmada por campeón en todas sus habilidades (hoy la tienen los proyectiles y el destello de lanzamiento).
- Jerarquía de números de daño (normal / crítico / reacción / combo de equipo) con tamaños y colores fijos.
- Ajuste fino de la sombra de contraste por arena con capturas en celular real.

### Sprint 4 — "Balance con personas"
- Telemetría local opcional (exportar un resumen de partidas: muertes, causa, tiempo por nivel).
- Laberinto para campeones frágiles a distancia; Gélida validada; vida de las 3 formas del final.

### Sprint 5 — "Contenido"
- Arenas 8–10 (Ciudad Maldita, Abismo, Minas Profundas) con la misma receta: mecánica propia + ficha clara.
- Posible campeón nuevo usando el pipeline de recorte ya probado.

### Sprint 6 — "Multijugador sólido"
- Reconexión a la partida en curso, lista de salas públicas, emotes rápidos en partida, espectador.

### Sprint 7 — "Rendimiento móvil"
- Perfilado en dispositivos reales; carga diferida del arte por arena (el Hechicero pesa 1,5 MB y solo se usa
  en la Infernal); PWA para jugar sin conexión.

### Sprint 8 — "Retención"
- Misiones diarias, logros, colección visual de objetos, temporadas con modificadores.

## 4. Riesgos técnicos a vigilar
- Todo el juego son variables globales cargadas en orden por `index.html`: un script en el lugar equivocado
  rompe en silencio. Mitigación: los tests de humo (`t_func`) y los tests por sistema en `tools/items/`.
- Los eventos visuales de red tienen tope por paquete (260): efectos muy frecuentes no deben viajar por la red
  (por eso la estrella de impacto se dibuja local).
- Sin paso de build: el peso de las imágenes llega entero al celular; conviene la carga diferida (Sprint 7).

## 5. Pase siguiente (arenas, lore, final, Nigromante, evolución, review)
- Review de dirección de arte completa: `LA_HORDA_ART_DIRECTION_REVIEW.md` (12 problemas priorizados, notas por
  área, crítica por arena y por campeón, benchmarks, hoja de ruta P0/P1/P2 y lista de arte pedido).
- Lore canónico: `LA_HORDA_LORE.md` (Cuatro Guardianes, cristales, arco del Hechicero).
- Muros por arena, pisos con menos ruido, Micelial graduado, jefe final con todas las habilidades,
  gólem elemental del Nigromante, firma de nivel en todas las habilidades, modo `?devxp=N`.

## 6. Lo que se hizo en el pase anterior (para referencia)
- **Final de campaña:** Hechicero Supremo subjefe (nivel 9 de la Infernal; huye al caer) y jefe final en 3 formas
  (Hechicero → Golem de Cuerpos → Demonio Mayor), con el arte de su hoja. Test `tools/items/t_hechicero.js`.
- **Pantalla previa** con el Hechicero angelical y la ficha clara de cada arena (solo; en cooperativo se omite).
- **Mensajes del Hechicero** reescritos: qué es, qué hacer y por qué. Roles enemigos explicados por nombre.
- **Pase de VFX:** sombra de contraste + núcleo blanco + copia aditiva en efectos de habilidad; anticipación al
  lanzar; estrella de impacto; anillos en 3 capas. Costo de dibujo sin cambios medibles.
