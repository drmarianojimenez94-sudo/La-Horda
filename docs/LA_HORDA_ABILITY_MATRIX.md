# LA HORDA — Matriz de habilidades reales: daño, estados y etiquetas ambientales

> Relevada del código (`CLASSES` en `js/data/classes*.js` y los `case` de `js/skills/abilities.js`), no inventada.
> Sistema: `js/systems/env-tags.js` (`DAMAGE_TYPES`, `STATUS_EFFECTS`, `envEmit` / `envOn`).

**Cómo leerla**

- **Tipo de daño**: de qué está hecho el golpe. Hoy el daño se calcula igual para todos los tipos.
  El tipo sirve para las interacciones con el escenario y queda preparado para resistencias futuras.
- **Estados**: lo que el golpe deja en el objetivo, usando los campos de siempre.
- **Emite**: la etiqueta ambiental que la habilidad manda al escenario con `envEmit`.
  - ✅ = implementada y probada.
  - "candidata" = propuesta: **no** está implementada.

## Reacciones del escenario implementadas

| Etiqueta | Arena | Reacción | Prueba |
|---|---|---|---|
| `fire` | Gélida | Enciende braseros apagados. También los prende cualquier proyectil que quema o un Muro de Fuego cercano. | `ENV.muro_de_fuego_enciende_el_brasero`, `HIE.el_fuego_enciende_braseros` |
| `fire` | Ruinas | Quema la maleza de una emboscada que todavía no saltó: los enemigos salen ardiendo. | `ENV.el_fuego_quema_la_maleza_de_la_emboscada` |
| `ice` | Infernal | Enfría una fisura: suma un 35 % del progreso para cerrarla. | `ENV.nova_de_escarcha_enfria_la_fisura` |
| `lightning` | Acuática | Un rayo sobre un enemigo parado en un charco conductor descarga contra los **enemigos** del charco (no contra los héroes). Tiene 3 s de enfriamiento por charco. | `ENV.cadena_de_relampago_conduce_en_el_charco` |
| (charco) | Acuática | La Cadena Eléctrica de la **anguila** salta más lejos (260 en vez de 170) y una vez más si el primer héroe que golpea está en un charco. | `ACU.la_anguila_salta_mas_lejos_en_el_charco` |

| `fire` / `ice` / `lightning` | **Todas** | Arman al instante el objeto destructible que corresponde (el fuego prende la urna de brasas, el barril de pólvora, la vaina de espinas o la de esporas; el hielo el cristal de escarcha; el rayo el ánfora de agua). | `BRK.etiqueta_justa_la_prende_y_otra_no` |

## Reacciones entre estados (`js/systems/reactions.js`)

| Reacción | Estado previo | Golpe que la dispara | Efecto |
|---|---|---|---|
| Conducción | Mojado (acuáticos, charcos, Vapor, ánfora) | Rayo | +25% y salta a los mojados cercanos (aturde) |
| Quiebre | Congelado o muy ralentizado | Pesado (crítico, `heavy`, ulti) | +80% y esquirlas |
| Vapor | Congelado o ralentizado ≥ 50% | Fuego | +50%, descongela y deja **mojado** |
| Hemorragia | Sangrante | Pesado | El sangrado restante entra de golpe (+50%) |

Un golpe que **ya mata** no consume el estado (lo necesitan los míticos que "matan congelados/sangrantes").
Resistencias por arena y por tipo de enemigo: `ENEMY_ARENA_RESIST` / `ENEMY_TYPE_RESIST` (mismo archivo).

## Firma de cada campeón (evolución Nv. 3 — `js/systems/skill-evolution.js`)

Desde el nivel 3 de talento de cada habilidad, sus golpes dejan el estado propio del campeón:

| Campeón | Firma | Habilita |
|---|---|---|
| Tanque, El Libertador | Aturde (220 ms; élites/jefes: ralentiza) | — |
| Asesino, Segador, Musashi, Eren | Sangrado | Hemorragia |
| Mago | Según el elemento de la habilidad: quemadura / escarcha / descarga | Vapor, Quiebre |
| Soporte, La Profeta, La Cazadora | Marca (+10% de daño recibido, 3 s) | — |
| Nigromante | Marchitar (+10% de daño recibido, 3 s) | — |
| Axiom | Descarga | — |

Nv. 7 (Resonancia): golpear con la habilidad a un enemigo que **ya** tiene tu firma lo hace estallar (25% alrededor).

## Campeones

| Campeón | Habilidad | Tipo de daño | Estados | Emite |
|---|---|---|---|---|
| Tanque | Torbellino | Físico | — | — |
| Tanque | Embestida | Físico | Aturdido (400 ms) | — |
| Tanque | Grito de Guerra | — (mejora) | — | — |
| Tanque | **Ulti** Grito Provocador | — | Provocación | — |
| Asesino | Corte Sangrante | Físico | Sangrado | — |
| Asesino | Triple Golpe | Físico | — | — |
| Asesino | Trampa de Área | Físico | — | — |
| Asesino | **Ulti** Pestilencia Sombría | Sombra | Sigilo | — |
| Mago | Muro de Fuego | Fuego | Quemadura | ✅ `fire` |
| Mago | Nova de Escarcha | Hielo | Ralentizado (+ aturdimiento con talento) | ✅ `ice` |
| Mago | Cadena de Relámpago | Rayo | Electrizado | ✅ `lightning` (en cada salto) |
| Mago | **Ulti** Cataclismo Elemental | Fuego + Hielo | Quemadura, Ralentizado | ✅ `fire` + `ice` |
| Soporte | Curación de Área / Bendición de Guerra / Escudo Sagrado | Sagrado (apoyo) | — | candidata: `holy` (purificar corrupción en la Ciudad Maldita) |
| Soporte | **Ulti** Bendición Suprema | Sagrado | — | — |
| Segador Olvidado | Tajo del Segador | Físico | Empuje | — |
| Segador Olvidado | Armadura de la Furia / Último Aliento | Físico | — | — |
| Segador Olvidado | **Ulti** Segador de Almas | Físico | — | — |
| Axiom | Error 404 | Arcano | Ralentizado | — |
| Axiom | Sobrescribir | Arcano | — | — |
| Axiom | Teletransporte | — | — | — |
| Axiom | **Ulti** Force Quit | Arcano | Congela el tiempo | — |
| La Profeta | Destino Restaurado / Visión del Inmortal | Sagrado (apoyo) | Inmunidad breve | — |
| La Profeta | Danza del Augurio | Sagrado | Aturdido (500 ms) | — |
| La Profeta | **Ulti** Ascensión del Elegido | Sagrado | — | — |
| Musashi | Corte del Rōnin / Paso Fantasma / Mil Cortes | Físico | — | — |
| Musashi | **Ulti** Último Duelo | Físico | Aislamiento (duelo) | — |
| La Cazadora | Flecha Perforante | Físico | — | — |
| La Cazadora | Trampa del Bosque | Físico | Atrapado | — |
| La Cazadora | Lluvia de la Cazadora | Físico | — | — |
| La Cazadora | **Ulti** Cacería Salvaje | Físico | — | — |
| Nigromante | Levantar Esqueletos / Crear Gólem | Sombra (invocación) | — | — |
| Nigromante | Plaga de los Condenados | Sombra | Maldito (contagio) | — |
| Nigromante | **Ulti** Encarnación del Abismo | Sombra | — | — |
| El Libertador | Bayoneta / ¡Granaderos! / Carga de San Lorenzo | Físico | Defensa rota | — |
| El Libertador | **Ulti** Cruce de los Andes | Hielo (nieve) + Físico | Defensa rota | candidata: `ice` |
| Eren | Equipo de Maniobras / Instinto / ¡Avancen! | Físico | — | — |
| Eren | **Ulti** El Portador | Físico | — | — |

## Enemigos y peligros que ya aplican estados

| Fuente | Tipo | Estado |
|---|---|---|
| Nova gélida (Hielo), habilidades heladas de jefes (`frost:n`) | Hielo | Escarcha: 4 cargas congelan 1 s |
| **Frío por quietud** (Gélida, nuevo) | Hielo | Suma escarcha al llenarse el medidor |
| Ignición Eterna (Infernal) | Fuego | Quemadura |
| Pozos de lava (regla Infernal) | Fuego | Daño en zona |
| **Calor al cerrar una fisura** (Infernal, nuevo) | Fuego | 1,2 % de la vida máxima por segundo mientras se cierra |
| Anguila Eléctrica (Acuática) | Rayo | Cadena entre héroes cercanos |
| **Descarga del charco** (Acuática, nuevo) | Rayo | 5 % de la vida máxima + ralentizado (héroes); 12 % + aturdido (enemigos) |
| **Runa del Bosque** (Ruinas, nuevo, a favor del equipo) | Naturaleza | Atrapado (aturdido) + daño |
| **Sellos resueltos** (Laberinto, nuevo, a favor del equipo) | — | Aturdido + ralentizado |

## Pendiente (no implementado)

- Etiquetas `holy`, `shadow`, `arcane` y `physical` como emisores. Hoy ninguna arena escucha
  esas etiquetas. Candidatas:
  - `holy`: purificar la corrupción de la Ciudad Maldita.
  - `physical` pesado: derribar plataformas del Abismo.
  - Luz: iluminar las Minas.
- Íconos de estado sobre los enemigos. Hoy solo algunos estados tienen feedback visual propio:
  la escarcha, lo electrizado y lo maldito.
