# Skin del set «Uniforme del Granadero» — El Libertador

- **Set:** `granadero` · Libertador · disparo pesado · aura rgb(90,130,220)
- **Campeón:** El Libertador (`libertador`) — el set solo lo puede usar este campeón
- **Se activa:** con el set COMPLETO (4 piezas). Con menos piezas solo hay aura parcial.
- **Bonus completo (lo que la skin tiene que contar):** FUEGO A DISCRECIÓN: cada disparo de fusil que mata recarga el arma al instante.
- **Estado:** FALTA (no existe ningún frame). `SET_SKINS` vacío.

## Referencias que hay que adjuntar a ChatGPT (sí o sí)

1. El atlas CANON actual del campeón: `assets/sprites/champions/libertador/v2/atlas.png` (define cuerpo, proporciones, arma y escala).
2. Esta ficha completa (lista de animaciones y grilla).

## Piezas del set (lo que se tiene que ver puesto)

- **Fusil del Granadero** (arma): Azul de casaca, blanco de correaje. Lo reconocían antes de oír el disparo.
- **Morrión del Granadero** (casco): Azul de casaca, blanco de correaje. Lo reconocían antes de oír el disparo.
- **Casaca Azul** (pechera): Azul de casaca, blanco de correaje. Lo reconocían antes de oír el disparo.
- **Botas de Caballería** (botas): Azul de casaca, blanco de correaje. Lo reconocían antes de oír el disparo.

## Hoja a producir: TODAS las animaciones (71 cuadros, un solo pedido)

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
| `aim` | 4 | apuntar |
| `fire` | 4 | disparo |
| `reload` | 6 | recargar |
| `bayo_pre` | 4 | bayo pre |
| `bayo_emb` | 4 | bayo emb |
| `bayo_imp` | 4 | bayo imp |
| `bayo_rem` | 4 | bayo rem |
| `command` | 5 | command |
| `cabral` | 5 | cabral |
| `ult_cast` | 1 | ult cast |

**Formato:** PNG con fondo transparente, celda de 103×98 px, 8 columnas, pies en la misma línea, mismo orden de filas que la tabla. Mismo alto de cuerpo que el atlas canon (se escala igual en el juego).

## Prompt (copiar entero; adjuntar el atlas canon)

```
Full sprite sheet (ALL animations, 71 frames) of the EXACT SAME character as the attached reference atlas (El Libertador, LA HORDA) — same body, same proportions, same height, same face, same weapon silhouette, same camera and perspective — now wearing the complete "Uniforme del Granadero" armor set: Fusil del Granadero (arma), Morrión del Granadero (casco), Casaca Azul (pechera), Botas de Caballería (botas). Set theme: Libertador · disparo pesado. Accent color rgb(90,130,220). Animations, one row each, in this order: idle_down (4 frames: reposo de frente); idle_side (1 frames: reposo de perfil derecho); idle_left (1 frames: reposo de perfil izquierdo); idle_up (1 frames: reposo de espaldas); walk_down (4 frames: caminar de frente); walk_side (4 frames: caminar de perfil derecho); walk_left (4 frames: caminar de perfil izquierdo); walk_up (4 frames: caminar de espaldas); attack_side (4 frames: ataque básico de perfil derecho); cast_side (3 frames: lanzar habilidad de perfil derecho); aim (4 frames: apuntar); fire (4 frames: disparo); reload (6 frames: recargar); bayo_pre (4 frames: bayo pre); bayo_emb (4 frames: bayo emb); bayo_imp (4 frames: bayo imp); bayo_rem (4 frames: bayo rem); command (5 frames: command); cabral (5 frames: cabral); ult_cast (1 frames: ult cast). Every frame on a uniform grid (celda de 103×98 px, 8 columnas), feet on the same baseline, character facing right in side views (left views are separate rows). dark-fantasy detailed 16-bit pixel art, same grammar as the LA HORDA roster (1px dark outline, 2-3 flat tones per color, limited palette, crisp alpha, no gradients/airbrush, no HD painting), transparent background, NO text, NO labels, NO frames, NO grid lines.
```

## Artgate al recibirla

- Tiene que ser el MISMO personaje del atlas canon: si cambia cara, anatomía, altura o arma → se rechaza entera (no se mezclan frames).
- Todas las filas en una sola hoja: una hoja parcial no se integra (no se puede pedir después "solo el frame que falta").
- Se integra como atlas alternativo del campeón con el mismo layout (mismos índices): al completar el set se cambia la imagen, no la lógica.
