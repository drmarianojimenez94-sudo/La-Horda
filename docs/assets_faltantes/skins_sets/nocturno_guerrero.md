# Skin del set «Sombra Nocturna» — Asesino

- **Set:** `nocturno` · Asesino · sangrado · desaparecer · aura rgb(150,60,90)
- **Campeón:** Asesino (`guerrero`) — el set solo lo puede usar este campeón
- **Se activa:** con el set COMPLETO (4 piezas). Con menos piezas solo hay aura parcial.
- **Bonus completo (lo que la skin tiene que contar):** SOMBRA LETAL: matar a un élite o subjefe te vuelve invisible 1,5 s (la horda te pierde) y reinicia Triple Golpe.
- **Estado:** FALTA (no existe ningún frame). `SET_SKINS` vacío.

## Referencias que hay que adjuntar a ChatGPT (sí o sí)

1. El atlas CANON actual del campeón: `assets/sprites/champions/guerrero/atlas.png` (define cuerpo, proporciones, arma y escala).
2. Esta ficha completa (lista de animaciones y grilla).

## Piezas del set (lo que se tiene que ver puesto)

- **Colmillo Nocturno** (arma): Los guardias hablan de una sombra que sangra. Nunca dicen de quién es la sangre.
- **Capucha Nocturna** (casco): Los guardias hablan de una sombra que sangra. Nunca dicen de quién es la sangre.
- **Guantes del Degollador** (guantes): Los guardias hablan de una sombra que sangra. Nunca dicen de quién es la sangre.
- **Pasos Nocturnos** (botas): Los guardias hablan de una sombra que sangra. Nunca dicen de quién es la sangre.

## Hoja a producir: TODAS las animaciones (40 cuadros, un solo pedido)

| Animación (id del código) | Cuadros | Qué muestra |
|---|---|---|
| `idle_down` | 4 | reposo de frente |
| `idle_side` | 1 | reposo de perfil derecho |
| `idle_left` | 1 | reposo de perfil izquierdo |
| `idle_up` | 1 | reposo de espaldas |
| `walk_down` | 4 | caminar de frente |
| `walk_side` | 4 | caminar de perfil derecho |
| `walk_left` | 4 | caminar de perfil izquierdo |
| `walk_up` | 4 | caminar de espaldas |
| `attack_side` | 4 | ataque básico de perfil derecho |
| `cast_side` | 3 | lanzar habilidad de perfil derecho |
| `hit_down` | 4 | recibir daño de frente |
| `death_down` | 6 | muerte de frente |

**Formato:** PNG con fondo transparente, misma grilla que su atlas actual (formato heredado), pies en la misma línea, mismo orden de filas que la tabla. Mismo alto de cuerpo que el atlas canon (se escala igual en el juego).

## Prompt (copiar entero; adjuntar el atlas canon)

```
Full sprite sheet (ALL animations, 40 frames) of the EXACT SAME character as the attached reference atlas (Asesino, LA HORDA) — same body, same proportions, same height, same face, same weapon silhouette, same camera and perspective — now wearing the complete "Sombra Nocturna" armor set: Colmillo Nocturno (arma), Capucha Nocturna (casco), Guantes del Degollador (guantes), Pasos Nocturnos (botas). Set theme: Asesino · sangrado · desaparecer. Accent color rgb(150,60,90). Animations, one row each, in this order: idle_down (4 frames: reposo de frente); idle_side (1 frames: reposo de perfil derecho); idle_left (1 frames: reposo de perfil izquierdo); idle_up (1 frames: reposo de espaldas); walk_down (4 frames: caminar de frente); walk_side (4 frames: caminar de perfil derecho); walk_left (4 frames: caminar de perfil izquierdo); walk_up (4 frames: caminar de espaldas); attack_side (4 frames: ataque básico de perfil derecho); cast_side (3 frames: lanzar habilidad de perfil derecho); hit_down (4 frames: recibir daño de frente); death_down (6 frames: muerte de frente). Every frame on a uniform grid (misma grilla que su atlas actual (formato heredado)), feet on the same baseline, character facing right in side views (left views are separate rows). dark-fantasy detailed 16-bit pixel art, same grammar as the LA HORDA roster (1px dark outline, 2-3 flat tones per color, limited palette, crisp alpha, no gradients/airbrush, no HD painting), transparent background, NO text, NO labels, NO frames, NO grid lines.
```

## Artgate al recibirla

- Tiene que ser el MISMO personaje del atlas canon: si cambia cara, anatomía, altura o arma → se rechaza entera (no se mezclan frames).
- Todas las filas en una sola hoja: una hoja parcial no se integra (no se puede pedir después "solo el frame que falta").
- Se integra como atlas alternativo del campeón con el mismo layout (mismos índices): al completar el set se cambia la imagen, no la lógica.
