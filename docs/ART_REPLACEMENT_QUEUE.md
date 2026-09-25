# ART_REPLACEMENT_QUEUE — LA HORDA

Únicamente assets con estado **REDRAW REQUIRED** en `docs/VISUAL_ASSET_MANIFEST.md`. Nadie
rediseña esto automáticamente: esta lista es el pedido exacto para producir arte nuevo que
**conserve el diseño existente** (silueta, ropa, arma, colores, temática, habilidades) y lo
reconstruya en la gramática del Master Reference (`docs/ART_BIBLE.md` — el Caballero/Tanque).
Orden de prioridad: campeones jugables primero, después subjefes.

Formato de entrega esperado por ítem: PNG con transparencia real, alfa nítido (0/255), contorno
oscuro de 1px, la grilla de frames indicada. Los recortes/integración al motor los hace el
equipo técnico después — acá solo se pide el arte.

---

## PRIORIDAD 1 — Campeones jugables (6)

### 1. Segador Olvidado ("Berserk")
- **Qué se mantiene:** encapuchado, manto oscuro (violeta/negro), arma pesada de filo grande,
  identidad "cuanto más daño recibe, más peligroso" (armadura de la furia con aura roja/negra).
- **Por qué es REDRAW:** proporciones de adulto realista y sombreado pintado (degradados
  suaves), incompatibles con la proporción chibi del Caballero.
- **Referencia de estilo:** Master Reference (Caballero) para proporción/contorno/sombreado;
  como dirección de agresividad, el espadachín oscuro ensangrentado que mandó el equipo es un
  ejemplo válido de "más grande/agresivo sin cambiar de familia" si se opta por escalarlo como
  subjefe visual, pero **Segador es un campeón jugable**: debe quedar en la MISMA escala que el
  resto del roster (chibi, ~66–70 unidades), no al tamaño de un jefe.
- **Frames a reproducir** (mismo naming que hoy en `assets/sprites/champions/segador/`):
  `idle_down/side/up` (4 c/u), `walk_down/side/up` (4 c/u), `attack_down/side/up` (4 c/u),
  `hit_down/side/up` (2 c/u), `death_down/side/up` (3–4 c/u). Total ~64 frames, formato
  atlas o sueltos (como está hoy).
- **Extra:** una pose de "Armadura de la Furia" (aura roja/negra) reusando el mismo cuerpo.

### 2. Axiom
- **Qué se mantiene:** armadura dorada/ornamentada, capa/escudo azul, temática "código/glitch"
  (parpadeo, teletransporte).
- **Por qué es REDRAW:** proporciones altas y armadura muy detallada/pintada, no chibi.
- **Frames a reproducir:** `idle/walk/attack/cast_down/side/up`, `death_down/side/up` (igual
  cantidad que hoy en `assets/sprites/champions/axiom/`, ver manifest). Total ~46 frames.
- **Extra:** un efecto de "glitch" (parpadeo/transparencia) se resuelve por código (alpha), no
  hace falta dibujarlo.

### 3. La Profeta
- **Qué se mantiene:** pelo oscuro largo, túnica clara con capucha, dos hojas/dagas con brillo
  turquesa, identidad de sanadora de combate cuerpo a cuerpo.
- **Por qué es REDRAW:** estilo más ilustrado (rostro detallado, sombreado suave), proporciones
  altas.
- **Frames a reproducir:** el atlas actual usa `idle` (1), `walk` (3), `attack` (4), `spin` (2) —
  ver `PROFETA_ATLAS_FRAMES` en `js/rendering/champion-sprites.js`. Para el redraw, expandir al
  formato de 4 direcciones como el resto del roster si es posible (idle/walk/attack ×
  down/side/up), o mantener el mismo esquema de "un solo perfil + espejo" si se prefiere — a
  decidir con el equipo antes de encargar el arte.

### 4. Musashi
- **Qué se mantiene:** kimono/gi azul, samurái, espada (bokken), identidad de duelista.
- **Por qué es REDRAW:** proporciones adultas realistas, pintado con sombreado suave.
- **Frames a reproducir** (naming actual en `assets/sprites/champions/musashi/`): `idle`,
  `run1-2`, `basic1-5` (ataque básico), `ronin1-4` (Corte del Rōnin), `thousand1-4` (Mil
  Cortes), `hurt`, `death`. El efecto `ghost1-4` (Paso Fantasma) es un VFX de estela y puede
  seguir siendo una silueta translúcida derivada del `idle` nuevo — no hace falta redibujarlo
  aparte.

### 5. Sylva (Cazadora del Bosque)
- **Qué se mantiene:** pelo rojizo/naranja, ropa de cazadora verde/marrón, arco largo, Lobo
  Espectral como invocación.
- **Por qué es REDRAW:** proporciones adultas realistas.
- **Frames a reproducir:** `idle`, `run1-2`, `atk1-6` (básico), `chargeAim`, `release1-2`,
  `piercingCrit` (Flecha Perforante). El Lobo Espectral (`wolf/idle,run,bite,jump`) **queda
  igual** (no es REDRAW, ver manifest §5).

### 6. Nigromante
- **Qué se mantiene:** túnica/capucha negra, cetro con orbe verde, identidad de invocador
  (esqueletos, gólem, plaga) y su forma demoníaca (Encarnación del Abismo).
- **Por qué es REDRAW:** estilo pintado/tinta con proporciones altas; además varios frames
  vienen cortados por el borde del recorte original (`idle`, `walk1-2`, `walkA2/3/5/6`,
  `basic1-4` — hoy el juego ya evita usar los cortados, ver manifest §1).
- **Frames a reproducir:** `idle`, `walk1-2` (o el ciclo de 6 que ya existe, `walkA1-6`),
  `run1-2`, `basic1-5`, `castSkeleton1-3`, `castGolem1-2`, `castPlague1-2`, `hurt`, `death`,
  `ultTransform1-4`. Las invocaciones (esqueleto/gólem/demonio) **no** son REDRAW — quedan
  iguales.

---

## PRIORIDAD 2 — Subjefes con arte demasiado chico/borroso (5)

Estos NO son un problema de estilo (encajan en la familia pintada de jefes/élites) sino de
**resolución de origen**: el archivo fuente es tan chico que se ve borroso incluso ampliado con
vecino más cercano. Limpiar halo/alfa no alcanza; hace falta una fuente de mayor resolución con
el mismo diseño.

### 7–10. Los 4 "Dobladores" (Doblador — Guerrero / Arquera / Pícaro / Clérigo)
- **Dónde:** `assets/sprites/bosses/bosque/doblador_{guerrero,arquera,picaro,clerigo}/static.png`
- **Tamaño actual:** 22×33 a 32×38 px — demasiado chico para un subjefe (se ve borroso).
- **Qué se mantiene:** silueta shapeshifter oscura con acentos violeta/verde por variante
  (guerrero con espadón, arquera con arco, pícaro sigiloso, clérigo con bastón).
  Cada uno ya tiene su nombre/tema — conservar la variante de color y arma por clase.
  Rank: subjefe (Bosque). No confundir con un jefe: escala intermedia, similar a Guardián del
  Laberinto o Kraken Joven (que sí están en buena resolución) como referencia de tamaño.
- **Formato pedido:** un `static.png` (o pose idle) de ~90–150px de alto, mismo criterio que
  `angel_hielo`/`demonio_hielo_fuego` (ICE_REAL, un solo frame con "bob" por código).

### 11. Dama del Bosque
- **Dónde:** `assets/sprites/enemies/bosque/dama_bosque/static.png`
- **Tamaño actual:** 20×31 px — el más chico/borroso del roster de enemigos.
- **Qué se mantiene:** silueta oscura tipo dríade/entidad del bosque (rank elite).
- **Formato pedido:** igual criterio que arriba, ~90–130px de alto.

---

## Cómo se usará

Cuando llegue el arte nuevo: recortarlo al mismo naming/formato de frames indicado arriba,
correr `python3 tools/art/scan_sprites.py --dir champions/<clave> --apply` (limpieza técnica,
no de diseño) y agregarlo a `ASSET_MANIFEST`/los loaders (`js/assets/champion-sprites.js`,
`js/assets/enemy-sprites.js`) sin tocar nada de `js/data/champions.js` ni `js/data/enemies.js`
(estadísticas y habilidades no cambian). Después, repetir el Roster Visual Test para confirmar
PASS.
