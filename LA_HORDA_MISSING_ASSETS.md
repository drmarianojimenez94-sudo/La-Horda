# LA HORDA — MISSING ASSETS (pre-alfa, consolidado)

Lista **única y actual** del arte que falta o que se ve bien pero merece arte propio. Se armó
revisando `assets/` (carpeta por carpeta), el manifiesto de precarga (1.366 imágenes, 0 rotas) y
lo que dibuja el código en partida.

Reemplaza a la versión "Alpha 0.1", archivada en
[`docs/archive/LA_HORDA_MISSING_ASSETS_alpha01.md`](docs/archive/LA_HORDA_MISSING_ASSETS_alpha01.md).
Muchas de sus entradas ya están resueltas: el Hechicero, los jefes de un solo frame (ahora con
atlas `v2`), y la Ciudad, el Abismo y las Minas (ya son arenas completas).

Detalle por sistema, si hace falta más contexto:
- `LA_HORDA_BOSS_ASSET_MANIFEST.md`;
- `LA_HORDA_CITY_MISSING_ASSETS.md`;
- `LA_HORDA_MINES_MISSING_ASSETS.md`;
- `LA_HORDA_ABISMO_ASSETS.md`;
- `LA_HORDA_CODEX_MISSING_ASSETS.md`;
- `LA_HORDA_COMBAT_MISSING_ASSETS.md`.

**Regla que se mantiene:** hoy no hay placeholders feos en pantalla. Todo lo de abajo está dibujado
con código (procedural) o con arte prestado de otra pieza, de forma digna.

## Actualización S5 (septiembre 2026): lo que NO se puede tapar espejando ni clonando

Después de esta pasada, **ningún guardián ni enemigo tiene un estado o una dirección vacía**. Lo que falta se
completa en tiempo de dibujo, con dos herramientas:
- `tools/art/skin_audit.js`: guardianes y skins, 19 packs, 0 fallas.
- `tools/art/enemy_coverage.js`: 104 tipos de enemigo × 11 estados, 0 vacíos.

Las formas de completar:
- **espejo:** la izquierda es la derecha invertida;
- **clon:** un estado toma prestado el más parecido (por ejemplo, ataque → conjuro → quieto);
- **balanceo:** una caminata corta se rellena con el movimiento del cuerpo.

Lo de abajo es lo que **no queda bien con esos rellenos**, porque no hay nada parecido para clonar o porque
la calidad o el estilo no coinciden. Es lo que hay que pedir. Las celdas están en píxeles de arte.

### Crítico (P0): se ve mal en una partida normal

| # | Qué | Problema hoy | Qué pedir |
|---|---|---|---|
| C-1 | **Ciudad (15 tipos `cm_*`) y Abismo (`ab_*`)**. Peores: `cm_maestro`, `cm_dama`, `cm_espejismo`, `cm_presentador`, `ab_carcelero`, `ab_jinete` | Arte de 16–37 px de alto dibujado 3–5 veces más grande: pixelotes al lado de Fortaleza/Micelial/Minas (85–130 px). Caminata de 2 cuadros | Redibujo a ~2×: quieto 2–4, caminar 4–6 por dirección (perfil, frente, espalda), ataque 3–4, golpe 1–2, muerte 4. Celda ~64×80 (comunes) y ~96×128 (subjefes y Presentador) |
| C-2 | **Acuática comunes**: Tiburón Joven, Tiburón Blanco (élite), Cangrejo, Medusa Eléctrica, Sirena | 1–2 cuadros quietos + 1 de ataque; sin golpe ni muerte; píxel grueso | Nado de perfil 4, ataque 3, golpe 1, muerte 3–4. Celda ~64×64; Tiburón Blanco ~96×64 |
| C-3 | **Gólem de Cuerpos** (2ª forma del jefe final) | Quieto, caminar y ataque de 1 cuadro cada uno | Caminar 4, quieto 2–4, golpetazo 3–4, golpe 1. Celda ~327×274 |
| C-4 | **Ángel Corrompido** (1ª forma del jefe final, ya era A-03) | Es el Hechicero recoloreado con alas procedurales | Hoja propia: quieto 4, caminar 4, conjuro 8, ataque 4, golpe 2, muerte 6. Celda ~102×113 |
| C-5 | **Cerbero** (jefe de las Minas, ya era A-01) | Baja resolución (≈54×67) escalada | Todas sus animaciones en alta resolución |
| C-6 | **Pared agrietada del Laberinto** (ya era A-02) | Grietas procedurales | Pared sana, agrietada y derrumbe (3–4 cuadros) |
| C-7 | **Jinete del Abismo** (`ab_jinete`, élite) | Caminar de 1 cuadro; el ataque es el mismo quieto | Caminar 4 de perfil + 2–4 de frente y espalda, ataque 3–4. Celda ~56×44 a 2× |

### Importante (P1)

| # | Qué | Qué pedir |
|---|---|---|
| I-1 | Atlas infernal: Esqueleto, Demonio Menor, Demonio Hechicero, **Demonio Mayor (jefe)**, Lobo Ártico: sin golpe ni muerte propios | Golpe 1–2 y muerte 4–5 de perfil, celda 119. El jefe primero |
| I-2 | Esfinge: ninguna vista de ataque ni de golpe | Ataque 3–4 de perfil, golpe 1, celda 82×72 |
| I-3 | Muertes del Laberinto **en el diseño del juego**: Esfinge encapuchada, Medusa humana, Druida encapuchado. Las de la última hoja son otros personajes (esfinge alada, Medusa violeta, druida con astas) y quedaron desactivadas | Muerte 4 cuadros de cada una, mismo diseño que su caminata (celda de su tira: 72 px de alto) |
| I-4 | Kraken y Leviatán: sin cuadros de ataque (el Kraken ataca con el quieto) | Ataque 3–4 |
| I-5 | Escorpión Gigante: arte con ruido, sin golpe ni muerte | Golpe 1 y muerte 3 (55×44); idealmente redibujado |
| I-6 | Recortes con basura del cuadro vecino: `cm_sectario`, muerte de `mn_escupidor`, ataque de `mn_cerbero`, muerte de `ab_errante` | Volver a recortar de la hoja original (no hace falta redibujar) |
| I-7 | Dragoncito de hielo: su golpe es un dragón más grande que su caminata. Ángel de hielo: la muerte es una línea finita. Enjambre de hadas: ataque de un punto | Golpe del Dragoncito a la escala de su caminata; muerte del Ángel 4 cuadros; ataque de las hadas 2–3 |

### Pulido (P2)

- Minas, Fortaleza y Micelial: solo tienen perfil. Faltan caminar de frente y de espalda (4 cuadros por tipo).
- Engendro de la Fortaleza: quieto 1 y muerte 1.
- Gólem de Piedra: muerte 1.
- Gólem infernal: ataque 1.
- Golpe propio para la Druida y los Dobladores (hoy clonan el quieto).
- Guardianes: las cuatro hojas viejas (Guerrero, Tanque, Mago, Soporte) se ven bien. El resto de los packs quedó
  completo con espejo y clon (`skin_audit.js`: 0 fallas). **No hay guardián que necesite arte urgente para
  verse bien de los dos lados.**

## Convenciones

- **Escala:** 1 px de arte = 2 unidades de mundo. Un guardián mide ≈32–36 px de arte (65 u).
- **Vista:** 3/4 cenital, la misma de los enemigos y props actuales.
- **Formato:** PNG de 32 bits con **fondo transparente** (alfa real, sin fondo "ajedrez"), en una
  hoja en grilla (celdas iguales, 1 px de separación) o en frames sueltos numerados.
- **Direcciones:** "1" significa que se espeja en el código (izquierda y derecha); "4" es
  abajo, arriba, izquierda y derecha.
- **Prioridad:**
  - **P0:** se nota en partida hoy.
  - **P1:** mejora clara.
  - **P2:** pulido.
- **Estilo común de TODOS los prompts** (se agrega al final de cada uno):
  > *dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette,
  > strong silhouette, top-down 3/4 view, transparent background, sprite sheet grid, no text*

## Resumen

| ID | P | Sistema | Personaje / arena | Asset | Estado hoy |
|---|---|---|---|---|---|
| A-01 | **P0** | Jefe | 09 Minas · Cerbero | Cerbero en alta resolución (todas sus animaciones) | EXISTE en baja resolución (≈54×67), se ve en bloque al escalar |
| A-02 | **P0** | Jefe / escenario | 07 Laberinto · Minotauro | Pared agrietada y derrumbe | FALTANTE (grietas procedurales) |
| A-03 | **P0** | Jefe | 10 Infernal · final | Ángel Corrompido | INCOMPLETO (recoloreado del Hechicero y alas procedurales) |
| A-04 | P1 | Jefe | 10 Infernal · final | Rey de la Horda | INCOMPLETO (cuerpo del Demonio Mayor) |
| A-05 | P1 | Regla de jefe | 10 Infernal | Focos de Convergencia ×4 | INCOMPLETO (aguja de cristal teñida) |
| A-06 | P1 | Regla de jefe | 06 Acuática · Leviatán | Tentáculos por función (GOLPE / AGARRE / CORRIENTE) | INCOMPLETO (tentáculos del Kraken) |
| A-07 | P1 | Regla de jefe | 05 Gélida · Mago Gélido | Foco de Hielo | INCOMPLETO (aguja del Ángel y cristal del Mago) |
| A-08 | P1 | Regla de jefe | 04 Fúngico · Madre Espora | Raíz-tendón de la red y Corazón abierto | INCOMPLETO (procedural) |
| A-09 | P1 | Regla de jefe | 01 Ciudad · El Presentador | Cometa del Gran Número (vuelo e impacto) | INCOMPLETO (FX de la Ciudad y estela procedural) |
| A-10 | P1 | Jefe | 02 Fábrica · Caballero | Armadura en 3 estados de calor y shock térmico | INCOMPLETO (brillo procedural) |
| A-11 | P1 | Mecánica de arena | 05 Gélida | Brasero de hielo (encendido, apagado, prendiéndose, congelado) | INCOMPLETO (brasero infernal y llama procedural) |
| A-12 | P1 | Mecánica de arena | 07 Laberinto | Sellos de piedra I / II / III | FALTANTE (procedural) |
| A-13 | P1 | Mecánica de arena | 06 Acuática | Corriente, chorro y charco conductor | FALTANTE (procedural) |
| A-14 | P1 | Mecánica de arena | 03 Ruinas | Runa del menhir y maleza de emboscada | FALTANTE (procedural) |
| A-15 | P2 | Mecánica de arena | 10 Infernal | Fisura de la Horda (abre, 3 etapas, sellada) y sigilos HORDA / VIDA / PIEL | INCOMPLETO (procedural; solo hay una fisura del Abismo) |
| A-16 | P2 | UI | HUD, todas | Íconos de acción contextual (RESCATAR, ENCENDER, ATRAVESAR, sello, cerrar) | INCOMPLETO (emoji / glifos) |
| A-17 | P2 | UI | Selección de guardián | Retratos de tarjeta 104×104 de los 12 guardianes | INCOMPLETO (el sprite de partida escalado se ve chico) |
| A-18 | P2 | Jefe | 08 Abismo | Ojo abierto (ventana EXPUESTO) | INCOMPLETO (halo del HUD) |
| A-19 | P2 | Jefe | 03 Ruinas | Escudo de raíces sobre el Guardián Ancestral | INCOMPLETO (hojas procedurales) |
| A-20 | P2 | Jefe | 02 Fábrica | Dragón de la Forja huyendo herido | INCOMPLETO (reusa el vuelo) |
| AU-* | — | Audio | Todo el juego | Ver la sección de audio | **No se inventan archivos**: hoy todo es síntesis |

---

## Fichas

Todos los campos de cada ficha: nombre · sistema · personaje o arena · dimensiones · frames ·
direcciones · animación · VFX · formato · transparencia · prioridad · archivo · prompt.

### A-01 · Cerbero, Guardián del Umbral (alta resolución) — P0

| Campo | Valor |
|---|---|
| Sistema | Jefe final de la arena 09 (`js/arenas/minas/mn-bosses.js`) |
| Dimensiones | celda de 192×192 |
| Frames | idle 8 · walk 8 · run 8 · lanzallamas 10 · pisotón 8 · triple mordida 10 · aullido 8 · daño 4 · muerte 14 |
| Direcciones | 1 (se espeja) |
| Animación | en loop: idle, walk, run. Una vez: el resto |
| VFX | aparte: cono de fuego (3 cabezas: física, fuego y sombra) y onda del pisotón |
| Formato | PNG, una fila por animación |
| Transparencia | sí |
| Archivo | `assets/sprites/arenas/minas/cerbero_hd/atlas.png` |
| Prompt | *"three-headed hellhound Cerberus, left head physical (bone and scars), center head fire (molten jaw), right head shadow (smoke eyes), broken iron chains on neck, full animation set idle, walk, run, flamethrower, stomp, triple bite, howl, hurt, death, 192x192 cells"* + estilo común |

### A-02 · Pared agrietada del Laberinto — P0

| Campo | Valor |
|---|---|
| Sistema | Regla del Minotauro: embiste y derriba paredes (`boss-encounter.js`, Laberinto) |
| Dimensiones | tramo horizontal de 64×32 y vertical de 32×64 (tileables) |
| Frames | intacta 1 · agrietada 3 (brillo naranja que late) · derrumbe 8 · escombro 1 |
| Direcciones | 2 (horizontal y vertical) |
| Animación | el latido de la grieta en loop; el derrumbe una vez |
| VFX | polvo y piedras al caer (ya existen como partículas) |
| Formato / transparencia | PNG / sí |
| Archivo | `assets/sprites/arenas/laberinto/pared_agrietada.png` |
| Prompt | *"sandstone labyrinth wall segment with glowing orange cracks, tileable horizontal and vertical pieces, 3-frame crack pulse, 8-frame collapse into rubble, final rubble tile"* + estilo común |

### A-03 · Ángel Corrompido — P0

| Campo | Valor |
|---|---|
| Sistema | Forma del jefe final (Infernal) |
| Dimensiones | celda de 128×128 |
| Frames | idle 6 · cast 8 · ataque 8 · daño 3 · muerte 12 |
| Direcciones | 1 |
| Animación | idle en loop, el resto una vez |
| VFX | aparte: 4 cristales orbitando (verde, hielo, piedra y dorado) |
| Formato / transparencia | PNG / sí |
| Archivo | `assets/sprites/bosses/infernal/angel_corrompido/atlas.png` |
| Prompt | *"fallen angel sorcerer with torn crimson corrupted wings, cracked golden halo, four orbiting crystals, idle, cast, attack, hurt, death, 128x128 cells"* + estilo común |

### A-04 · Rey de la Horda — P1

| Campo | Valor |
|---|---|
| Sistema / arena | Forma final del jefe (Infernal) |
| Dimensiones | 192×192 · Frames: idle 6, ataque 10, rugido 8, muerte 14 · Direcciones 1 |
| VFX | lava que gotea (aparte) · PNG, transparente |
| Archivo | `assets/sprites/bosses/infernal/rey_horda/atlas.png` |
| Prompt | *"demon king forged from the horde, crown of horns, body of fused corpses and lava cracks, idle, attack, roar, death, 192x192 cells"* + estilo común |

### A-05 · Focos de Convergencia (×4) — P1

| Campo | Valor |
|---|---|
| Sistema | Regla del Hechicero: Convergencia |
| Dimensiones | 48×96 · Frames: idle 6, quiebre 8 · Direcciones 1 · 4 variantes de color |
| Archivo | `assets/sprites/bosses/infernal/focos/{ancestral,escarcha,piedra,hechicero}.png` |
| Prompt | *"four crystal foci obelisks, green nature, pale ice, amber stone, gold holy, each idle 6 frames and shatter 8 frames, 48x96 cells"* + estilo común |

### A-06 · Tentáculos del Leviatán por función — P1

| Campo | Valor |
|---|---|
| Sistema | Regla del Leviatán: GOLPE / AGARRE / CORRIENTE |
| Dimensiones | 64×128 · Frames: emerger 4, idle 4, acción 6, hundirse 4 · 3 variantes · Direcciones 1 |
| VFX | salpicadura (existe); para el agarre, un anillo sobre el guardián (4 frames) |
| Archivo | `assets/sprites/bosses/acuatica/leviatan_tent/{golpe,agarre,corriente}.png` |
| Prompt | *"giant sea-monster tentacle rising from dark water, three variants: SLAM club-tipped, GRAB hooked and curling, CURRENT fin-edged spinning water; emerge, idle, action, sink; purple-crimson with suckers, 64x128 cells"* + estilo común |

### A-07 · Foco de Hielo — P1

| Campo | Valor |
|---|---|
| Sistema | Gran Helada del Mago Gélido (romper 3 focos) |
| Dimensiones | 48×96 · Frames: idle 6, quiebre 8 · Direcciones 1 |
| Archivo | `assets/sprites/bosses/hielo/foco_hielo.png` |
| Prompt | *"ice focus obelisk with a floating rotating crystal, pale blue glow, idle 6 frames and shatter 8 frames, 48x96 cells"* + estilo común |

### A-08 · Red micelial: raíz-tendón y Corazón abierto — P1

| Campo | Valor |
|---|---|
| Sistema | Madre Espora: cortar la red de núcleos para abrir el Corazón |
| Dimensiones | raíz de 64×24 (tileable horizontal) · corazón de 128×128 |
| Frames | raíz: latido 4 · corazón: latido 6 |
| Archivo | `assets/sprites/arenas/micelial/raiz_red.png`, `corazon_abierto.png` |
| Prompt | *"thick pulsing mycelium root tendon, tileable horizontal segment 64x24, 4-frame pulse, magenta glow veins; plus giant fungal heart exposed in an opened chest of spores, beating 6 frames, 128x128"* + estilo común |

### A-09 · Cometa del Gran Número — P1

| Campo | Valor |
|---|---|
| Sistema | Regla de El Presentador (Ciudad) |
| Dimensiones | 48×48 · Frames: vuelo 6 (loop), impacto 5 · también la versión "reflejado" (dorada) |
| Archivo | `assets/vfx/ciudad/cometa.png`, `cometa_reflejado.png` |
| Prompt | *"flaming theatrical comet shaped like a burning star with a ribbon tail, 6-frame loop and 5-frame impact burst, crimson and gold, 48x48 cells"* + estilo común |

### A-10 · Caballero: armadura en 3 estados de calor y shock térmico — P1

| Campo | Valor |
|---|---|
| Sistema | Regla del Caballero + Dragón (Fábrica) |
| Dimensiones | la misma celda que el atlas actual del Caballero |
| Frames | la hoja actual repetida en 3 estados (oscuro, rojo e incandescente) · shock térmico: 8 frames |
| Archivo | `assets/sprites/arenas/fortaleza/caballero/heat_{0,1,2}.png`, `shock.png` |
| Prompt | *"rusted plate-armor knight, same poses as reference, 3 heat states: dark iron, glowing red seams, white-hot with molten cracks; plus 8-frame steam explosion cracking the armor"* + estilo común |

### A-11 · Brasero de hielo — P1

| Campo | Valor |
|---|---|
| Sistema | Gélida: el frío baja junto al brasero; el Mago los congela |
| Dimensiones | 48×64 · Frames: encendido 6 (loop), apagado 1, prendiéndose 4, congelado 3 |
| Archivo | `assets/sprites/arenas/hielo/brasero.png` |
| Prompt | *"stone brazier with pale blue-white fire for a frozen arena: lit 6-frame loop, unlit, igniting 4 frames, encased in ice 3 frames of frost spreading, 48x64 cells"* + estilo común |

### A-12 · Sellos de piedra I / II / III — P1

| Campo | Valor |
|---|---|
| Sistema | Laberinto: activar en orden I → II → III |
| Dimensiones | 64×64 (disco en el piso) · Frames: apagado 1, encendido 4 (loop), error 3 · 3 variantes (números romanos) |
| Archivo | `assets/sprites/arenas/laberinto/sello_{1,2,3}.png` |
| Prompt | *"round carved stone floor seal with roman numeral I / II / III, off, glowing gold 4-frame loop, red error flash 3 frames, 64x64 cells"* + estilo común |

### A-13 · Corriente, chorro y charco conductor — P1

| Campo | Valor |
|---|---|
| Sistema | Acuática |
| Dimensiones | franja de corriente 64×32 (tileable) · remolino 96×96 · boca de chorro 32×32 y columna 32×96 · charco 64×40 |
| Frames | corriente 6 · remolino 8 · chorro 6 · charco: reposo 1, cargando 4, descarga 5 |
| Archivo | `assets/vfx/acuatica/{corriente,remolino,chorro,charco}.png` |
| Prompt | *"underwater arena water mechanics: tileable flowing current strip, whirlpool ring, wall water spout and jet column, conductive puddle idle, charging with sparks, electric discharge"* + estilo común |

### A-14 · Runa del menhir y maleza de emboscada — P1

| Campo | Valor |
|---|---|
| Sistema | Ruinas: las runas atrapan con raíces; los enemigos saltan de la maleza |
| Dimensiones | runa 32×64 · maleza 48×40 |
| Frames | runa: cargando 4, lista 4 (loop), disparo 5 · maleza: quieta 1, sacudiéndose 4, saltando 4, ardiendo 6 |
| Archivo | `assets/sprites/arenas/bosque/runa.png`, `maleza.png` |
| Prompt | *"celtic menhir with carved green rune: charging, ready glowing loop, firing; plus a dense bush: still, shaking, enemy bursting out, burning"* + estilo común |

### A-15 · Fisura de la Horda y sigilos — P2

| Campo | Valor |
|---|---|
| Sistema | Infernal: fisuras que generan horda; regla final HORDA / VIDA / PIEL |
| Dimensiones | 96×48 · Frames: abrir 6, 3 etapas × 4 (loop), sellada 1 · sigilo de 32×32 × 3 variantes (6 frames) |
| Archivo | `assets/vfx/infernal/fisura.png`, `sigilo_{horda,vida,piel}.png` |
| Prompt | *"hellish ground fissure opening in 3 growing stages, lava light, then sealed scar; plus floating sigils: summoning horns, life heart, armor shield, 6-frame loop each"* + estilo común |

### A-16 · Íconos de acción contextual — P2

| Campo | Valor |
|---|---|
| Sistema | Botón de acción contextual (`js/systems/context-actions.js`) |
| Dimensiones | 32×32 · Frames: 1 (más un brillo de 3 frames opcional) · 6 íconos |
| Archivo | `assets/ui/ctx/{rescatar,encender,atravesar,sello,cerrar,activar}.png` |
| Prompt | *"six UI action icons: rescue hand reaching a civilian, torch lighting, infernal portal, stone seal, closing fissure, lever activate; gold rim on dark stone, 32x32 each"* + estilo común |

### A-17 · Retratos de tarjeta de los 12 guardianes — P2

| Campo | Valor |
|---|---|
| Sistema | Selección de guardián y Sala |
| Dimensiones | 104×104 · Frames: 1 (más 2 de respiración, opcional) · 12 guardianes |
| Archivo | `assets/sprites/champions/<clave>/card.png` |
| Prompt | *"bust portrait of <guardián> facing 3/4 right, dramatic rim light, dark background vignette inside a 104x104 square, consistent roster style"* + estilo común |

### A-18 · A-19 · A-20 — P2

| ID | Dimensiones y frames | Archivo | Prompt |
|---|---|---|---|
| A-18 Ojo abierto (Abismo) | 128×128 · dilatarse 6 | `assets/sprites/arenas/abismo/ojo_abierto.png` | *"colossal abyssal eye in a pit, dilating violet pupil, 6 frames"* + estilo |
| A-19 Escudo de raíces | 128×128 · loop 6 | `assets/vfx/bosque/escudo_raices.png` | *"shield of twisting glowing corrupted roots wrapping a giant elf guardian, 6-frame loop, sickly green and red"* + estilo |
| A-20 Dragón herido en huida | celda del Dragón · 6 | `assets/sprites/arenas/fortaleza/dragon_forja/huida.png` | *"wounded mechanical steampunk dragon fleeing upward, smoking wing, leaking embers, 6 frames"* + estilo |

---

## Audio (no se inventan archivos)

Hoy **todo el audio es síntesis en vivo** (`js/audio/audio.js`, WebAudio): música de cuerdas y
percusión que cambia en oleadas y jefes, y efectos por evento. **No hay archivos de audio en el
repositorio y no se agregó ninguno.**

Si en el futuro se graba audio, estos son los huecos que más se notarían. Es una lista de
necesidades, sin archivos:

| Necesidad | Dónde | Prioridad |
|---|---|---|
| Voz o jingle del Hechicero al abrir la ficha | Pantalla previa | P2 |
| Rugido propio de cada jefe final (10) | Entrada de jefe | P2 |
| Ambiente por arena (viento helado, agua, maquinaria, cueva) | Loop de fondo | P2 |
| Golpe de impacto "pesado" más grave para teléfonos | Combate | P2 |

La calidad del audio actual es **NOT VERIFIED IN RUNTIME** (este entorno no tiene parlantes).
