# Skin del set «Legión de Reconocimiento» — Eren

> ✅ **INTEGRADA (BUGFIX 01)** — hoja en `art-source/skins_sets/`, atlas en `assets/sprites/champions/<campeón>/skins/<set>/`. Se ve con el set COMPLETO equipado. Pendiente solo si llega una hoja mejor: 4 cuadros por estado y vista (hoy 1-2).


- **Set:** `legion` · Eren · maniobras · el Portador · aura rgb(200,90,60)
- **Campeón:** Eren (`eren`) — el set solo lo puede usar este campeón
- **Se activa:** con el set COMPLETO (4 piezas). Con menos piezas solo hay aura parcial.
- **Bonus completo (lo que la skin tiene que contar):** EL PORTADOR ETERNO: la forma titánica dura 30% más y cada baja transformado te cura 2% de la vida.
- **Estado:** FALTA (no existe ningún frame). `SET_SKINS` vacío.

## Referencias que hay que adjuntar a ChatGPT (sí o sí)

1. El atlas CANON actual del campeón: `assets/sprites/champions/eren/v2/atlas.png` (define cuerpo, proporciones, arma y escala).
2. Esta ficha completa (lista de animaciones y grilla).

## Piezas del set (lo que se tiene que ver puesto)

- **Hojas de la Legión** (arma): Las alas en la espalda no son un adorno: son una promesa de volver.
- **Arnés de Maniobras** (pechera): Las alas en la espalda no son un adorno: son una promesa de volver.
- **Empuñaduras de la Legión** (guantes): Las alas en la espalda no son un adorno: son una promesa de volver.
- **Botas de la Legión** (botas): Las alas en la espalda no son un adorno: son una promesa de volver.

## Hoja a producir: TODAS las animaciones (68 cuadros, un solo pedido)

| Animación (id del código) | Cuadros | Qué muestra |
|---|---|---|
| `idle_down` | 3 | reposo de frente |
| `idle_side` | 1 | reposo de perfil derecho |
| `idle_left` | 1 | reposo de perfil izquierdo |
| `idle_up` | 1 | reposo de espaldas |
| `walk_down` | 5 | caminar de frente |
| `walk_side` | 5 | caminar de perfil derecho |
| `walk_left` | 5 | caminar de perfil izquierdo |
| `walk_up` | 5 | caminar de espaldas |
| `run` | 4 | correr |
| `attack_side` | 4 | ataque básico de perfil derecho |
| `cast_side` | 3 | lanzar habilidad de perfil derecho |
| `aim` | 3 | apuntar |
| `hit_down` | 2 | recibir daño de frente |
| `death_down` | 3 | muerte de frente |
| `hook_prep` | 2 | hook prep |
| `hook_launch` | 1 | hook launch |
| `hook_fly` | 3 | hook fly |
| `hook_slash` | 2 | hook slash |
| `hook_land` | 1 | hook land |
| `instinct` | 4 | instinct |
| `advance` | 3 | advance |
| `bite` | 4 | bite |
| `exhausted` | 3 | exhausted |

**Formato:** PNG con fondo transparente, celda de 128×111 px, 8 columnas, pies en la misma línea, mismo orden de filas que la tabla. Mismo alto de cuerpo que el atlas canon (se escala igual en el juego).

## Prompt (copiar entero; adjuntar el atlas canon)

```
Full sprite sheet (ALL animations, 68 frames) of the EXACT SAME character as the attached reference atlas (Eren, LA HORDA) — same body, same proportions, same height, same face, same weapon silhouette, same camera and perspective — now wearing the complete "Legión de Reconocimiento" armor set: Hojas de la Legión (arma), Arnés de Maniobras (pechera), Empuñaduras de la Legión (guantes), Botas de la Legión (botas). Set theme: Eren · maniobras · el Portador. Accent color rgb(200,90,60). Animations, one row each, in this order: idle_down (3 frames: reposo de frente); idle_side (1 frames: reposo de perfil derecho); idle_left (1 frames: reposo de perfil izquierdo); idle_up (1 frames: reposo de espaldas); walk_down (5 frames: caminar de frente); walk_side (5 frames: caminar de perfil derecho); walk_left (5 frames: caminar de perfil izquierdo); walk_up (5 frames: caminar de espaldas); run (4 frames: correr); attack_side (4 frames: ataque básico de perfil derecho); cast_side (3 frames: lanzar habilidad de perfil derecho); aim (3 frames: apuntar); hit_down (2 frames: recibir daño de frente); death_down (3 frames: muerte de frente); hook_prep (2 frames: hook prep); hook_launch (1 frames: hook launch); hook_fly (3 frames: hook fly); hook_slash (2 frames: hook slash); hook_land (1 frames: hook land); instinct (4 frames: instinct); advance (3 frames: advance); bite (4 frames: bite); exhausted (3 frames: exhausted). Every frame on a uniform grid (celda de 128×111 px, 8 columnas), feet on the same baseline, character facing right in side views (left views are separate rows). dark-fantasy detailed 16-bit pixel art, same grammar as the LA HORDA roster (1px dark outline, 2-3 flat tones per color, limited palette, crisp alpha, no gradients/airbrush, no HD painting), transparent background, NO text, NO labels, NO frames, NO grid lines.
```

## Artgate al recibirla

- Tiene que ser el MISMO personaje del atlas canon: si cambia cara, anatomía, altura o arma → se rechaza entera (no se mezclan frames).
- Todas las filas en una sola hoja: una hoja parcial no se integra (no se puede pedir después "solo el frame que falta").
- Se integra como atlas alternativo del campeón con el mismo layout (mismos índices): al completar el set se cambia la imagen, no la lógica.
