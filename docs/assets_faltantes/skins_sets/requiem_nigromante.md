# Skin del set «Réquiem del Señor de la Muerte» — Nigromante

- **Set:** `requiem` · Nigromante · legión · almas · aura rgb(90,230,140)
- **Campeón:** Nigromante (`nigromante`) — el set solo lo puede usar este campeón
- **Se activa:** con el set COMPLETO (4 piezas). Con menos piezas solo hay aura parcial.
- **Bonus completo (lo que la skin tiene que contar):** LEGIÓN SIN FIN: con 5 o más esqueletos, vos y tu ejército reciben 15% menos daño y tus esqueletos golpean 20% más fuerte.
- **Estado:** FALTA (no existe ningún frame). `SET_SKINS` vacío.

## Referencias que hay que adjuntar a ChatGPT (sí o sí)

1. El atlas CANON actual del campeón: `assets/sprites/champions/nigromante/v2/atlas.png` (define cuerpo, proporciones, arma y escala).
2. Esta ficha completa (lista de animaciones y grilla).

## Piezas del set (lo que se tiene que ver puesto)

- **Cetro del Réquiem** (arma): Cada pieza fue cosida con el nombre de un muerto. Todavía responden cuando las llaman.
- **Corona de Huesos** (casco): Cada pieza fue cosida con el nombre de un muerto. Todavía responden cuando las llaman.
- **Mortaja del Señor** (pechera): Cada pieza fue cosida con el nombre de un muerto. Todavía responden cuando las llaman.
- **Garras de la Tumba** (guantes): Cada pieza fue cosida con el nombre de un muerto. Todavía responden cuando las llaman.

## Hoja a producir: TODAS las animaciones (45 cuadros, un solo pedido)

| Animación (id del código) | Cuadros | Qué muestra |
|---|---|---|
| `idle_down` | 4 | reposo de frente |
| `idle_side` | 1 | reposo de perfil derecho |
| `idle_left` | 1 | reposo de perfil izquierdo |
| `idle_up` | 1 | reposo de espaldas |
| `walk_down` | 5 | caminar de frente |
| `walk_side` | 3 | caminar de perfil derecho |
| `walk_left` | 3 | caminar de perfil izquierdo |
| `walk_up` | 3 | caminar de espaldas |
| `walk_up_left` | 2 | caminar diagonal arriba-izquierda |
| `attack_side` | 4 | ataque básico de perfil derecho |
| `cast_side` | 4 | lanzar habilidad de perfil derecho |
| `hit_down` | 4 | recibir daño de frente |
| `death_down` | 6 | muerte de frente |
| `ult` | 4 | ultimate |

**Formato:** PNG con fondo transparente, celda de 161×114 px, 8 columnas, pies en la misma línea, mismo orden de filas que la tabla. Mismo alto de cuerpo que el atlas canon (se escala igual en el juego).

## Prompt (copiar entero; adjuntar el atlas canon)

```
Full sprite sheet (ALL animations, 45 frames) of the EXACT SAME character as the attached reference atlas (Nigromante, LA HORDA) — same body, same proportions, same height, same face, same weapon silhouette, same camera and perspective — now wearing the complete "Réquiem del Señor de la Muerte" armor set: Cetro del Réquiem (arma), Corona de Huesos (casco), Mortaja del Señor (pechera), Garras de la Tumba (guantes). Set theme: Nigromante · legión · almas. Accent color rgb(90,230,140). Animations, one row each, in this order: idle_down (4 frames: reposo de frente); idle_side (1 frames: reposo de perfil derecho); idle_left (1 frames: reposo de perfil izquierdo); idle_up (1 frames: reposo de espaldas); walk_down (5 frames: caminar de frente); walk_side (3 frames: caminar de perfil derecho); walk_left (3 frames: caminar de perfil izquierdo); walk_up (3 frames: caminar de espaldas); walk_up_left (2 frames: caminar diagonal arriba-izquierda); attack_side (4 frames: ataque básico de perfil derecho); cast_side (4 frames: lanzar habilidad de perfil derecho); hit_down (4 frames: recibir daño de frente); death_down (6 frames: muerte de frente); ult (4 frames: ultimate). Every frame on a uniform grid (celda de 161×114 px, 8 columnas), feet on the same baseline, character facing right in side views (left views are separate rows). dark-fantasy detailed 16-bit pixel art, same grammar as the LA HORDA roster (1px dark outline, 2-3 flat tones per color, limited palette, crisp alpha, no gradients/airbrush, no HD painting), transparent background, NO text, NO labels, NO frames, NO grid lines.
```

## Artgate al recibirla

- Tiene que ser el MISMO personaje del atlas canon: si cambia cara, anatomía, altura o arma → se rechaza entera (no se mezclan frames).
- Todas las filas en una sola hoja: una hoja parcial no se integra (no se puede pedir después "solo el frame que falta").
- Se integra como atlas alternativo del campeón con el mismo layout (mismos índices): al completar el set se cambia la imagen, no la lógica.
