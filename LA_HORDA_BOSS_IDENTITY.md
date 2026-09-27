# LA HORDA — BOSS IDENTITY + LORE + ENCOUNTER OVERHAUL (pre-alfa)

Cada uno de los 10 jefes de campaña tiene ahora una **REGLA** propia: una mecánica que hay que
entender y resolver. No alcanza con pegarle. Ninguna regla usa lo que el pedido prohíbe:

- nada de jefes "esponja" de vida;
- nada de spam de velocidad, teletransporte o proyectiles;
- nada de daño imposible de esquivar ni de golpes que matan de un saque;
- nada de inmunidad arbitraria (los escudos bajan el daño, **nunca lo anulan**).

Orden canónico: **01 Ciudad · 02 Fábrica · 03 Ruinas · 04 Fúngico · 05 Gélida · 06 Acuática ·
07 Laberinto · 08 Abismo · 09 Minas "EL DESCENSO" · 10 Infernal**. Después viene la **Arena
Divina**, que es postgame y se desbloquea al vencer al jefe Infernal.

Los Cuatro Guardianes:

| Guardián | Forma de jefe |
|---|---|
| 1. Guardián Ancestral | Bestia del Bosque |
| 2. Mago Gélido | Demonio Gélido |
| 3. Guardián del Laberinto | Minotauro |
| 4. Hechicero Supremo | Rey de la Horda |

Ningún otro jefe se llama "Guardián". Cerbero es el *Guardián del Umbral*: un título, no uno de
los Cuatro.

---

## Capa común (js/systems/boss-encounter.js)

| Pieza | Qué hace |
|---|---|
| `bossExpose(e, ms, mult, txt)` | **Ventana EXPUESTO**: tambaleo corto (máx. 2,6 s) + daño recibido ×mult. Cancela canalizaciones y embestidas. Se ve en el HUD ("EXPUESTO") y la anuncian cartel, destello, hit-stop y sonido. |
| `e._encMult` / `e._encTag` | Escudo o blindaje **propio del encuentro**: armadura, raíces, red, tentáculos, coraza… Siempre es parcial. La barra del jefe muestra la etiqueta (p.ej. `TENTÁCULOS: 3 (−50%)`). |
| `bossHeroesFarMs` / `bossHeroesCloseMs` | Medidores de **ANTI-KITE** (todo el equipo lejos) y **ANTI-FACETANK** (alguien pegado). |
| `bossDeathCleanup()` + `BOSS_CLEANUP_EXTRA` | Al morir el jefe se cancelan los golpes diferidos, los avisos y los proyectiles enemigos. Cada arena limpia sus propios peligros. **Nada de daño póstumo.** |
| `BOSS_STRIKE_HOOKS` / gancho `strikeLanded` | La arena reacciona cuando cae un golpe de jefe. Ejemplos: el fuego del Dragón calienta al Caballero; el Guardián rompe su propia runa. |
| flag `encStatic` | Piezas quietas de un encuentro que no caminan ni atacan: focos, tentáculos. |

**Red:** el anfitrión decide todo. Los campos del jefe (`_expT`, `_encTag`, `levRole`, `cvEl`…)
viajan con el enemigo, y los estados de arena viajan en su `netState`.

---

## 01 · CIUDAD — EL PRESENTADOR

- **Arena:** la ciudad bajo asedio, con estructuras críticas y civiles.
- **Jefe:** El Presentador, dueño del espectáculo de la Horda.
- **Lore / fantasía:** un showman que convierte la masacre en función. Defender la ciudad es arruinarle el número.

**Regla: ARRUINALE EL NÚMERO.**

- **Firma — «EL GRAN NÚMERO»:** canaliza 2,3 s con un anillo visible.
  - Si en ese tiempo le hacen ≥7 % de su vida máxima, se interrumpe y queda **EXPUESTO**.
  - Si no, lanza 1–2 **cometas** contra las estructuras críticas en pie. Cada cometa quita 28 % de la estructura.
  - Los cometas se interceptan con el cuerpo: el héroe recibe el golpe y la estructura se salva.
  - Un cometa **desviado** vuelve al Presentador y lo expone.
- **Anti-kite:** si todos se alejan (650 u durante 4 s), ataca la ciudad (fuerza el Gran Número).
- **Anti-facetank:** su kit de 3 actos (Marca del espectáculo, Telón, Ovación).
- **Interacción con la arena:** estructuras, civiles y pilares del escenario.
- **Fases:** 3 actos (100/66/33 %).
- **Vulnerabilidad:** número interrumpido o cometa reflejado → EXPUESTO ×1,6.
- **Telegrafías:** anillo de canalización; los cometas muestran una línea punteada hasta su objetivo.
- **Contrajuego:** burst durante la canalización, interceptar o desviar cometas.
- **Solo / MP / bots:** en solo alcanza con el burst de uno. Los bots dan prioridad 1100 a los cometas.
- **Identidad visual:** cometas de fuego con estela; reflector.

## 02 · FÁBRICA — AMO Y BESTIA: el Caballero de la Armadura Oxidada y el Dragón de la Forja

- **Canon:** el jefe es el **Caballero**. El Dragón Steampunk / de la Forja es **su bestia**.
- **Lore:** el Dragón no muere en el nivel 6: herido, vuela al trono de su amo. En el nivel 10 vuelven a pelear juntos.

**Regla: USÁ AL DRAGÓN PARA ROMPER AL CABALLERO.**

- **Firma — sobrecalentamiento:** la **armadura** reduce el daño (−65 % → −50 % → −38 % tras cada shock).
  - El fuego del Dragón (Aliento, Bombardeo) que alcanza al Caballero lo **sobrecalienta**: metal oscuro → rojo → incandescente.
  - Incandescente + un chorro de **VAPOR** encima = **SHOCK TÉRMICO** → EXPUESTO ×1,65 durante 6 s.
  - El vapor sale de las 4 rejillas de la cámara, con la acción **ABRIR VÁLVULA** o solo.
- **Relación:**
  - con el Dragón malherido, el Caballero lo protege (se enfurece);
  - si la bestia cae, pelea con rabia pero **descuida la guardia** (menos armadura);
  - con el amo en su última fase, el Dragón enloquece.
- **Anti-kite:** lejos del Caballero, el Dragón bombardea. El Dragón controla la distancia.
- **Anti-facetank:** pegado, el Caballero usa su Postura de Contraataque. El Caballero controla la cercanía.
- **Solo / MP / bots:** en solo, las rejillas también saltan solas. Los bots abren la válvula solo cuando sirve: Caballero incandescente y a menos de 260 u (`botWorth` 14).

## 03 · RUINAS — EL GUARDIÁN ANCESTRAL → LA BESTIA DEL BOSQUE (Guardián 1)

**Regla: CORTÁ SU CONEXIÓN CON EL BOSQUE.**

- **Firma — runas corruptas:** las runas se reactivan solas cada 11–17 s.
  - Cada runa encendida le da **ESCUDO DE RAÍCES** (×0,55 / 0,38 / 0,28 / 0,22) y regeneración.
  - **Purificarla** (acción contextual) le hace daño y lo deja EXPUESTO.
  - Sus **golpes pesados** que caen sobre una runa encendida **la rompen** (lo castiga su propio ataque).
- **Transformación:** al llegar al umbral de vida, o tras 4 purificaciones (pierde la conexión), se vuelve la **Bestia**: más rápida, más física y ×1,15 más vulnerable.
- **Anti-kite:** si todos se alejan, despierta una runa y lanza raíces a los que huyen.
- **Solo / MP / bots:** en solo purificar es rápido. Los bots purifican (acción de las runas) y atacan cuando está expuesto.

## 04 · FÚNGICO — LA MADRE ESPORA

- **Lore:** no es una Guardiana. Es lo que creció donde un Guardián dejó de mirar.

**Regla: CORTÁ LA RED PARA EXPONER EL CORAZÓN** (`mic-network.js`).

- **Firma:** en cada fase teje su **RED**: 3–4 **Núcleos Miceliales** unidos a ella por raíces que laten.
  - Mientras vivan: escudo (−20 / 38 / 50 / 58 %) y regeneración de 0,08 %/s por núcleo. Los núcleos maduros sueltan colonia.
  - **Cortar un núcleo** le transmite 3 % de daño y la hace tambalear.
  - **Red entera cortada → se abre el CORAZÓN MICELIAL:** EXPUESTO ×1,8 durante 7 s.
  - Después la colonia **reconstruye** la red (5,5 s).
- **Anti-kite:** si todos se alejan, la infección crece: los núcleos maduran de golpe y brotan nubes sobre el equipo.
- **Anti-facetank:** Zarpazo (cono) y Latigazo.
- **Fases:** Colonia → Floración (alucinaciones) → Corazón (la zona segura se achica). Cada fase vuelve a tejer la red.
- **Solo / MP / bots:** los núcleos tienen poca vida (×1,5 base). Los bots los priorizan (560) y el corazón abierto también (760).

## 05 · GÉLIDA — EL MAGO GÉLIDO → DEMONIO GÉLIDO (Guardián 2)

**Regla: EL CLIMA ES SU ARMA. REFUGIATE DEL FRÍO Y ROMPÉ SUS FOCOS** (`hie-boss.js`).

- **Base:** el frío aprieta ×1,5. El frío solo **nunca congela** (máx. 2 cargas de escarcha). Los braseros son refugio.
- **Firma — GRAN HELADA:**
  - congela el brasero encendido más cercano a él, con aviso de 1,2 s y **nunca el último**;
  - levanta **3 FOCOS DE HIELO**;
  - canaliza 7 s: la tormenta enfría **aunque te muevas**, y él queda quieto con escudo.
- **Resolución:**
  - 3 focos rotos → clima cortado → EXPUESTO ×1,7 durante 5,2 s;
  - si el canal termina → **INVIERNO ETERNO**: golpe helado solo a quien esté lejos de un brasero, menor cuantos menos focos queden.
- **Transformación — DEMONIO GÉLIDO:** tiene **CORAZA DE ESCARCHA** (−25 %).
  - Junto a un brasero encendido **se derrite** (×1,4).
  - Si pasa 4,5 s pegado al fuego, lo apaga con las alas y hay que reencenderlo.
- **Anti-kite:** la ventisca persigue (golpes marcados sobre los que se alejan).
- **Anti-facetank:** Nova de Hielo / Ventisca / Alas.
- **Solo / MP / bots:** los focos tienen 3,5 % de la vida del Mago. Los bots priorizan los focos (620) y encienden braseros si quedan menos de 2 con el Demonio.

## 06 · ACUÁTICA — EL LEVIATÁN (canon: el Kraken adulto)

**Regla: NEUTRALIZÁ SUS TENTÁCULOS** (`acu-leviatan.js`).

- **Firma:** 3 tentáculos (4 desde la 2ª vida) salen dentro de la arena, cada uno con una **función** escrita encima:

| Función | Qué hace |
|---|---|
| **GOLPE** | Azota con un círculo marcado 1,1 s antes. |
| **AGARRE** | Anillo de aviso de 0,75 s. Inmoviliza y aprieta. Los **aliados lo liberan** haciéndole 14 % al tentáculo. |
| **CORRIENTE** | Remolino que empuja hacia afuera. |

- **Protección:** mientras haya tentáculos, el cuerpo está protegido (−20…58 %).
- **Todos neutralizados → sale a respirar:** se arrima a la costa y deja el **NÚCLEO EXPUESTO** (×1,8, 6 s). Luego se hunde y rebrotan.
- **Anti-kite:** embiste a través de la arena y deja remolinos marcados sobre los que se alejan.
- **Anti-facetank:** Mordida y Coletazo desde la orilla, más los azotes.
- **Solo:** sin aliados en pie, el agarre dura solo 1,8 s y el tentáculo queda **retraído y expuesto** (×1,5).
- **Bots:** el tentáculo que agarra a un aliado es prioridad máxima (900).

## 07 · LABERINTO — EL MINOTAURO (Guardián 3)

**Regla: HACELO CHOCAR CONTRA LO QUE ESTÁ ROTO** (`lab-boss.js`).

- **Firma:** 5 **paredes agrietadas** (grietas naranjas).
  - Embestida contra una agrietada → **la derriba** y queda EXPUESTO ×1,7 durante 4,5 s.
  - Contra una pared sana o el borde → aturdido solo 1,4 s.
- **Rutas:** las paredes rotas **abren** rutas y nunca cierran (sin encierros). La navegación de bots y enemigos se recalcula.
- **Fase final (25 %) — ESTAMPIDA:** el laberinto central se derrumba, con aviso de 1,6 s → campo abierto.
- **Anti-kite:** el techo se desmorona sobre los que se esconden lejos.
- **Anti-facetank:** Hachazo, Pisotón y Cruz.
- **Solo / MP / bots:** en solo es cuestión de pararse delante de una grieta. Los bots atacan cuando está expuesto.

## 08 · ABISMO — EL QUE MORA DEBAJO

**Regla: EL PISO ES SU ARMA; SUS TENTÁCULOS, SU DEBILIDAD** (`ab-bosses.js` + `ab-boss-rule.js`).

- **Terreno:** sus golpes pesados agrietan y hunden plataformas. En fase 2 los patrones desprenden partes enteras y el Abismo las devuelve.
  - **Siempre queda piso conectado** (regla de seguridad).
  - Caer = colgarse del borde. Cualquiera puede rescatar, **bots incluidos**.
- **Firma:** romper un **tentáculo** le quita 4 % y **abre el OJO** (EXPUESTO ×1,5 durante 3,2 s). El Abismo no se detiene.
- **Cazador ambiental (fase 2+):** el **Jinete Sin Cabeza** cruza a la carga cada 26–32 s. Su embestida empuja a guardianes **y a la horda** hacia el vacío, y se puede usar a favor.
- **Anti-kite:** lejos del pozo, el piso bajo tus pies se desprende (fragmentos marcados que agrietan la plataforma).

## 09 · MINAS "EL DESCENSO" — CERBERO, GUARDIÁN DEL UMBRAL

- **Canon:** el Devoraluz es **élite** (evento de oleada), no jefe. Cerbero abre el Portal Infernal.

**Regla: LA LUZ LO EXPONE; LA OSCURIDAD LO ENFURECE.**

- **Firma:** 3 cabezas (física / fuego / oscuridad).
  - **Iluminado** por suficientes fuentes (braseros cerca, más antorchas del equipo) se llena el medidor → **EXPUESTO** (sus sombras se separan).
  - **En la oscuridad** sus enfriamientos bajan ×0,7, se mueve más rápido y salta desde las sombras en cualquier acto.
- **Fase final:** las fuentes de luz se apagan de a una (quedan 3 permanentes).
- **Muerte:** abre el **Portal**. La victoria es **interactuar** con el portal.
- **Anti-kite:** lluvia de brasas o carga forzada.
- **Solo / MP / bots:** en solo, las antorchas ayudan. Los bots reencienden luces.

## 10 · INFERNAL — EL HECHICERO SUPREMO (Guardián 4) → REY DE LA HORDA

**Revelación:** el guía de toda la campaña era el cuarto Guardián.

Pelea en 3 formas (`inf-hechicero.js` + `inf-boss.js`):

**1. Ángel Corrompido — CONVERGENCIA**

- Canaliza el ritual (9 s) con **4 focos de cristal** (Ancestral, Escarcha, Piedra y el suyo) unidos a él por haces. Mientras vivan tiene escudo.
- Romperlos todos → **ritual interrumpido**, EXPUESTO ×1,7 durante 6 s e inestabilidad −1.
- Si el ritual termina → **INESTABILIDAD +1** (+8 % de daño por punto, máximo 5) y descarga el Juicio de los Cuatro, marcado y esquivable.
- La inestabilidad también crece sola cada 45 s.

**2. Golem de Cuerpos — EL EXAMEN**

Versiones corrompidas y simples de lo aprendido:

| Examen | Origen | Cómo se resuelve |
|---|---|---|
| «EL GRAN NÚMERO» | Ciudad | Interrumpir con 6 % de daño. |
| «LA EMBESTIDA» | Laberinto | Hacerlo chocar contra el borde. |
| «LA RED» | Fúngico/Gélida | 3 focos: romperlos en 10 s. |

Cada examen resuelto → EXPUESTO.

**3. Rey de la Horda — CONVERGENCIA DE LA HORDA**

- Se abren **3 fisuras**, cada una con un poder:

| Fisura | Poder |
|---|---|
| **HORDA** | Invoca demonios. |
| **VIDA** | Regenera 0,35 %/s. |
| **PIEL** | Blindaje −35 %. |

- **Cerrar** una (acción contextual, bots incluidos) le quita ese poder.
- Las tres cerradas → **NÚCLEO DE LA HORDA EXPUESTO** (×1,8, 7 s). Después la Horda vuelve a abrirlas.

**Resto de la pelea**

- **Anti-kite:** el infierno sube bajo los pies de los que se alejan.
- **Anti-facetank:** blink solo si lo acorralan (cooldown de 6,5 s), Juicio Divino y Anillo.
- **Muerte épica:** la secuencia de caída de 3 formas. Después se desbloquea la **Arena Divina** (`isDivinaUnlocked`).

---

## BOSS MECHANIC MATRIX

| # | Jefe | Firma (regla) | Anti-kite | Anti-facetank | Ventana | Escudo del encuentro | Bots | Solo |
|---|---|---|---|---|---|---|---|---|
| 01 | El Presentador | Gran Número interrumpible + cometas a estructuras | ataca la ciudad | actos / pilares | número roto / cometa reflejado ×1,6 | — | cometas 1100 | burst |
| 02 | Caballero + Dragón | fuego del Dragón → vapor → shock térmico | Dragón bombardea | Contraataque | shock ×1,65 · 6 s | armadura −65/50/38 % | válvula útil | rejillas saltan solas |
| 03 | Guardián Ancestral | runas = escudo + regen; purificar / su golpe las rompe | raíces + runa | golpe pesado | purificación ×1,45 | raíces ×0,55…0,22 | purifican | ok |
| 04 | Madre Espora | red de núcleos → corazón | infección crece | Zarpazo / Latigazo | corazón ×1,8 · 7 s | red −20…58 % | núcleos 560 | núcleos frágiles |
| 05 | Mago → Demonio Gélido | Gran Helada: refugio o 3 focos · coraza se derrite al fuego | ventisca persigue | Nova / Ventisca / Alas | focos ×1,7 · 5,2 s | escudo de canal / coraza −25 % | focos 620 + braseros | ok |
| 06 | Leviatán | tentáculos GOLPE / AGARRE / CORRIENTE | embestida + remolinos | Mordida / Coletazo | núcleo ×1,8 · 6 s | tentáculos −20…58 % | agarre 900 | agarre corto + retraído |
| 07 | Minotauro | paredes agrietadas → expuesto; campo abierto al 25 % | techo se desmorona | Hachazo / Pisotón | pared rota ×1,7 · 4,5 s | — | atacan expuesto | ok |
| 08 | El Que Mora Debajo | tentáculos abren el ojo; el piso es el arma; Jinete ambiental | piso se desprende | ondas / mandíbula | ojo ×1,5 · 3,2 s | — | rescate de colgados | ok |
| 09 | Cerbero | luz → expuesto; oscuridad → feroz | brasas / carga | 3 cabezas | iluminado | — | reencienden luces | antorchas |
| 10 | Hechicero → Rey | Convergencia · Examen · Fisuras de poder | infierno sube | blink / Juicio / Anillo | ritual, examen y núcleo ×1,6–1,8 | focos / fisura PIEL | focos 640 + fisuras | ok |

---

## Pruebas de exploits (tools/bosses/boss_rules.js)

| # | Exploit | Cómo se prueba | Resultado |
|---|---|---|---|
| 1 | A distancia máxima | todos a 900–1100 u del jefe durante 5–6 s | probado en 8 jefes (Ciudad, Ruinas, Fúngico, Gélida, Acuática, Laberinto, Abismo, Infernal): castigan con golpes marcados, ataque a la ciudad, embestida o piso ✅. Fábrica (Dragón bombardea) y Cerbero (brasas / carga) usan la misma capa, pero su anti-kite todavía no tiene prueba automática. |
| 2 | Correr en círculos | mismo medidor de lejanía (se acumula aunque te muevas) | ✅ |
| 3 | Facetank | 4 guardianes pegados al jefe 10 s (Gélida, Laberinto, Acuática) | reciben daño ✅ |
| 4 | Burst | escudos del encuentro + piso de fase (`BOSS_EPIC.floorPad`): nadie saltea una fase de un golpe; las ventanas son el lugar del burst | ✅ |
| 5 | Solo | resto del equipo caído: el agarre del Leviatán se suelta a los 1,8 s y el tentáculo queda expuesto | ✅ |
| 6 | Bots | prioridad de objetivo en focos, núcleos, tentáculos, cometas y fisuras; acciones contextuales con `botWorth` | ✅ |
| 7 | 4 jugadores | `tools/net-test/minas_coop.js`, `ciudad_coop.js`, `campaign-gate.js` (anfitrión decide, invitado dibuja) | ver regresión |
| 8 | Morir / revivir en plena mecánica | el agarrado muere → se suelta; revive → la regla sigue | ✅ |
| 9 | Cambio de fase con proyectiles | 30 proyectiles en vuelo + Gran Helada activa → Demonio: sin focos ni tormenta colgados, sin errores | ✅ |
| 10 | Muerte con peligros activos | golpe diferido pendiente al morir → se cancela en los 10 jefes | ✅ |

**Uso:**

```
(python3 -m http.server 8771 &) ; node tools/bosses/boss_rules.js <carpeta> [arena,arena,...|exploits]
```
