# El Libertador (José de San Martín) y Eren (El Portador)

Dos campeones completos agregados sin tocar el kit de los demás. Este documento es la referencia
técnica: dónde vive cada cosa, cómo se mapean las animaciones, qué sonidos se usan, qué arte falta y
cómo se prueban.

## Archivos

| Qué | Dónde |
|---|---|
| Balance (TODOS los números de sus habilidades) | `js/data/champion-tuning.js` (`SM_CFG`, `EREN_CFG`) |
| Datos de clase (stats, botones, cooldowns, textos) | `js/data/champions.js` (`CLASSES.libertador`, `CLASSES.eren`, `EREN_TITAN_CLS`) |
| Lógica San Martín (básico, habilidades, pasiva, IA, dibujo, HUD) | `js/champions/libertador.js` |
| Lógica Eren (Furia, combo, ganchos, titán, Retumbar, IA, dibujo, HUD) | `js/champions/eren.js` |
| Piezas comunes (efectos de mundo `champFx`, reglas por rango, ganchos de stats) | `js/champions/champ-shared.js` |
| Talentos y maestrías | `js/data/talent-trees.js` (`TALENT_TREES.libertador`, `TALENT_TREES.eren`) |
| Arte fuente / recorte / atlas | `art-source/redraw/{libertador,eren}.png`, `tools/art/redraw/{sheets_se,build_se}.py` |
| Arte en juego | `assets/sprites/champions/{libertador,eren}/v2/` (`atlas.png`, `horse.png`, `titan.png`, `fx/*.png`) |
| Pruebas | `tools/regression/t_champs_se.js` (SM 1-13, Eren 1-20, equipo, bots), `tools/net-test/champs_se.js` (cooperativo) |

### Enganches al motor (los únicos puntos tocados fuera de sus archivos)

- `castAbility` (`js/skills/abilities.js`): los `kind` nuevos derivan a `libertadorCast` / `erenCast`.
  `triggerBasic` deriva a `libertadorBasic` / `erenBasic`. `useSkill`/`useUltimate`: segundo gancho
  en vuelo, Ultimate II transformado, bloqueo por AGOTADO.
- `js/systems/combat.js`: multiplicadores de daño hecho/recibido (`heroDmgOutMult`, `heroDmgTakenMult`,
  `enemyVulnMult`), Furia al recibir daño (`erenOnHurt`), muerte evitada (`heroPreventDeath`, Soldado Cabral).
- `js/core/update.js` y `js/ai/allies.js`: velocidad (`heroSpeedMult`, que también bloquea el
  movimiento durante embestidas/cinemáticas), `updateChampExtras` por héroe y `updateChampFx`.
- IA: `botTryAbilities` deriva a `botLibertador` / `botEren` (no se usan como rivales de la Arena Divina: `noDivinaFoe`).
- Red: `champFx` está en `NET_COLLS`; todo el estado vive en el héroe y viaja solo en el snapshot.
  El invitado recupera la clase del titán con `heroClsOf`. El invitado pide el segundo gancho y las
  definitivas con los mensajes de intención de siempre (`cast`, `ult`).

Para rebalancear: tocar solo `champion-tuning.js` (y los cooldowns/costos en `champions.js`).

## Decisiones técnicas

- **Furia = barra de la definitiva** (`ultCharge`). Sube pegando (como todos), recibiendo daño,
  con el 3er golpe del combo, más con poca vida, con Instinto (x3) y con ¡Avancen! (x1.5).
- **Titán = cambio de clase**: al transformarse `h.cls = EREN_TITAN_CLS`, así los 3 botones, sus
  cooldowns, la IA y el HUD pasan a ser los del titán sin condicionales repartidos. Se guardan vida
  máxima/radio/defensa/cooldowns humanos (`erenPrev`) y se restauran al volver (o al morir).
- **El Retumbar = 3 efectos de mundo** (`rumbleStep`) con retardo y aviso; el daño lo aplica solo el
  anfitrión. Las 9 siluetas gigantes son UN efecto de pantalla (no entidades). Las pisadas nunca se
  descartan por el tope de efectos (se quita un efecto decorativo para hacerles lugar).
- **Granaderos espectrales / jinetes del Cruce** = VFX sin IA ni colisión; el daño es UNA zona lógica.
- **Cordillera** = siluetas en los bordes de la pantalla (vista cenital, sin horizonte).
- **Reglas por rango** (`seKnock`): comunes se desplazan; élite/subélite tambalean (aturdimiento
  corto); jefes/subjefes NUNCA se desplazan (reciben daño y defensa rota).
- **Cinemáticas protegidas**: durante la transformación y El Retumbar Eren no recibe daño (pierde el
  control; no sería justo morir sin poder reaccionar).
- **Sin zoom de cámara** para El Retumbar: la cámara del juego tiene zoom fijo y cambiarlo rompe la
  escala acordada en todas las pantallas (ver `t_camera.js`). Se usa sacudida + destello + siluetas.
- Terremoto y Retumbar (hab. 2/3 del titán) se cortan si se activa El Retumbar (no hace falta esperar).

## Mapeo de animaciones

### El Libertador — `CHAMP_PACK.libertador` (a pie)

| Estado | Set | Cuadros |
|---|---|---|
| quieto | `idle_down` / `idle_side` / `idle_up` | 4 / 1 / 1 |
| caminar | `walk_down` / `walk_side` / `walk_up` | 4 c/u |
| disparo (Fusil) | `fire` (+ retroceso de `SM_CFG.musket.recoilPx`) | 4 |
| recarga visible | `reload` (avanza con el enfriamiento del básico) | 6 |
| Bayoneta | `bayo_pre` → `bayo_emb` (embestida) → `bayo_imp` (impacto) / `bayo_rem` (remate con poca vida) | 4 c/u |
| ¡Granaderos! | `command` | 5 |
| Soldado Cabral | `cabral` | 5 |
| Cruce (levantar el sable) | `ult_cast` | 1 |

`CHAMP_PACK.libertador_horse` (misma escala de píxel): `mount` 4, `charge` 5, `dismount` 4,
`m_idle` 1, `m_atk` 3 (sable corvo), `m_run` 3.

### Eren — `CHAMP_PACK.eren` (humano)

| Estado | Set | Cuadros |
|---|---|---|
| quieto / caminar | `idle_down`, `walk_*` | 3 / 5 |
| correr (¡Avancen! o poca vida) | `run` | 4 |
| combo doble hoja 1-2-3 | `attack_side` | 4 |
| gancho | `hook_prep` 2 → `hook_launch` 1 → `hook_fly` 3 → `hook_slash` 2 → `hook_land` 1 | |
| Instinto / ¡Avancen! | `instinct` 4 / `advance` 3 | |
| mordida | `bite` | 4 |
| agotado | `exhausted` | 3 |
| golpe / muerte | `hit_down` 2 / `death_down` 3 | |

`CHAMP_PACK.eren_titan`: `idle_down`/`walk_down` 2, `walk_side` 3, `walk_up` 3, `atk` 3 (puño-puño),
`sismo` 4 (también el pisotón del 3er golpe), `terremoto` 4, `retumbar` 5, `roar` 1, `tf` 6 (surgimiento).

## Audio

Sintetizado en `js/audio/audio.js` (WebAudio, sin archivos): `musket`, `musketOfficer`, `blade`,
`bugle` (clarín), `gallop`, `hook`, `punch`, `stomp`, `roar`, `thunder`; además se reutilizan
`boom`, `bigKill`, `shield`. **Faltan grabaciones reales** (se pueden reemplazar sin tocar la
lógica): disparo de fusil de chispa, clarín de caballería, relincho/galope, cable/gas del equipo de
maniobras, rugido del titán, trueno de la transformación, pisada colosal.

## Arte faltante (no se inventó)

- San Martín: sin cuadros de **golpe recibido** ni de **muerte** en la hoja (usa el destello de
  daño genérico y la caída genérica). El caballo solo tiene vista **lateral** (hacia arriba/abajo
  se dibuja el lateral).
- Eren: el **humo gris** de la hoja tiene los mismos tonos que el damero y no se pudo separar: el
  humo/vapor en juego es procedural (partículas) + los 4 cuadros de vapor que sí se extrajeron.
- Los FX espectrales (granaderos fantasma, escarcha) estaban pintados semitransparentes sobre el
  damero: se limpió el gris (`ghost_clean` en `build_se.py`), sin agregar píxeles.
- Titán: sin vista lateral de **ataque** (usa `atk` frontal espejado según el lado).

## Pruebas

```bash
python3 -m http.server 8771 &                                   # desde la raíz
node tools/regression/t_champs_se.js /tmp/se_out                # 42 chequeos + capturas
(cd server && PORT=8799 node relay.js &) ; node tools/net-test/champs_se.js   # cooperativo
```

Nota: los muñecos de prueba del Bosque se regeneran (regla de la arena), por eso la suite mide el
daño acumulado (`e.__dmg`) en vez de la vida.

## Propiedad intelectual

Eren y los elementos visuales de "el titán", el equipo de maniobras y El Retumbar remiten a una obra
de terceros (Attack on Titan). Está bien para un proyecto personal; si el juego se publica, conviene
renombrar y rediseñar esos elementos.
