# Q6 — Arte técnico: escala de píxel, luz y lectura (alfa)

Medido con `tools/alfa/q6_pixel_scale.js` en un celular apaisado emulado (844×390, dpr 2: 1 unidad de mundo =
1,2 píxeles de pantalla). Para cada `drawImage` dentro de un `render()` se calcula cuántos píxeles de pantalla
ocupa un píxel del arte: `|dw/sw| × √|det(transformación)|`. Escenas: las 10 arenas en oleada (nivel 3), con su
plantel completo alrededor del jugador y ante su jefe real (nivel 10), más los 37 guardianes de a cuatro.
"Antes" = `origin/main` ff9054d (con el arte nuevo y el Roster Art Gate); "después" = esta rama.
Datos crudos: `docs/alfa/q6/q6_pixel_scale_antes.json` y `..._despues.json`.

## Escalas oficiales (píxeles de pantalla por píxel del arte, en el celular)

| Grupo | Escala oficial | Cómo se logra |
|---|---|---|
| Guardianes (los 37, también los de la Ascensión) | **~1,1** (0,8–1,5) | Arte pixel nuevo ya a ~1 (Roster Art Gate). El arte fino viejo (Caballero, Asesino, Mago) se dibuja desde un mipmap con alfa binario que deja el píxel en 0,7–1,4 |
| Enemigos comunes | **1–2,5**, tope **3** | Tablas de alto por tipo (`CM_HMUL`, `MN_HMUL`, `canon-sheets-meta`) |
| Jefes | **2–3** (tope deseado) | Altos reducidos sin quedar más chicos que su zona de golpe; Cerbero y el Morador no llegan (arte de 36 px) |

Regla: solo cambia el DIBUJO (alto dibujado / radio). Radio, hitbox, IA, red y guardado no se tocan.

## Antes / después por grupo

| Grupo | Antes: mín · mediana · máx | Después: mín · mediana · máx |
|---|---|---|
| guardian | 0,28 · **0,54** · 1,50 | 0,50 · **1,11** · 1,49 |
| enemigo | 0,31 · **1,45** · 3,53 | 0,31 · **1,47** · 3,15 |
| jefe | 0,28 · **2,58** · 6,20 | 1,02 · **2,58** · 5,94 |
| decorado | 0,46 · **2,04** · 5,02 | 0,49 · **2,09** · 5,02 |
| efectos | 0,49 · **0,89** · 3,72 | 0,83 · **1,05** · 1,40 |

## Dispersión en cada pantalla (actores: guardianes, enemigos y jefes)

Razón máx/mín mediana por pantalla: antes ×6,98, después ×2,66

| Pantalla | Antes: actores mín–máx (razón) | Después: actores mín–máx (razón) |
|---|---|---|
| ciudad/oleada | 0,28–2,61 (×9,39) | 0,31–3,05 (×9,88) |
| ciudad/plantel | 0,28–3,53 (×12,71) | 0,71–3,03 (×4,28) |
| ciudad/jefe | 0,28–1,66 (×5,98) | 0,64–1,66 (×2,59) |
| fortaleza/oleada | 0,28–1,01 (×3,65) | 0,71–1,37 (×1,93) |
| fortaleza/plantel | 0,28–1,00 (×3,58) | 0,70–1,37 (×1,95) |
| fortaleza/jefe | 0,28–2,58 (×9,28) | 0,64–2,58 (×4,02) |
| bosque/oleada | 0,28–1,52 (×5,49) | 0,56–1,53 (×2,71) |
| bosque/plantel | 0,28–2,33 (×8,38) | 0,77–2,32 (×3,03) |
| bosque/jefe | 0,28–2,58 (×9,29) | 0,84–2,59 (×3,06) |
| micelial/oleada | 0,28–1,24 (×4,47) | 0,66–1,37 (×2,06) |
| micelial/plantel | 0,28–1,07 (×3,85) | 0,77–1,37 (×1,79) |
| micelial/jefe | 0,28–1,01 (×3,64) | 0,77–1,37 (×1,79) |
| hielo/oleada | 0,28–1,60 (×5,74) | 0,77–1,60 (×2,09) |
| hielo/plantel | 0,28–1,78 (×6,39) | 0,70–1,79 (×2,54) |
| hielo/jefe | 0,28–1,37 (×4,92) | 0,78–1,38 (×1,77) |
| acuatica/oleada | 0,28–1,50 (×5,40) | 0,77–1,48 (×1,93) |
| acuatica/plantel | 0,28–2,27 (×8,17) | 0,77–2,06 (×2,69) |
| acuatica/jefe | 0,28–4,24 (×15,26) | 0,54–4,21 (×7,74) |
| laberinto/oleada | 0,28–1,47 (×5,27) | 0,71–1,47 (×2,08) |
| laberinto/plantel | 0,28–2,05 (×7,39) | 0,71–1,97 (×2,79) |
| laberinto/jefe | 0,28–3,24 (×11,65) | 0,64–3,00 (×4,67) |
| abismo/oleada | 0,28–1,79 (×6,43) | 0,77–1,68 (×2,20) |
| abismo/plantel | 0,28–2,89 (×10,40) | 0,77–2,89 (×3,77) |
| abismo/jefe | 0,28–5,94 (×21,36) | 0,66–5,94 (×8,96) |
| minas/oleada | 0,28–1,00 (×3,59) | 0,71–1,37 (×1,93) |
| minas/plantel | 0,28–3,17 (×11,38) | 0,77–3,15 (×4,12) |
| minas/jefe | 0,28–6,20 (×22,29) | 0,59–5,04 (×8,49) |
| infernal/oleada | 0,28–2,09 (×7,53) | 0,75–1,99 (×2,66) |
| infernal/plantel | 0,28–2,15 (×7,72) | 0,71–2,04 (×2,88) |
| infernal/jefe | 0,31–2,17 (×6,98) | 0,84–2,17 (×2,57) |

(Los mínimos de 0,28-0,31 que quedan en algunos jefes son el efecto de "cadena de relámpagos" que se dibuja
sobre el enemigo, no su cuerpo.)

## Entidades que cambiaron (o fuera de rango)

| Entidad | Antes (mediana) | Después (mediana) |
|---|---|---|
| enemigo · ab_jinete | 1,77 | 1,68 |
| enemigo · chaman | 0,67 | 1,34 |
| enemigo · cm_acechante | 3,20 | 3,02 |
| enemigo · cm_campanero | 3,53 | 3,01 |
| enemigo · cm_espectro | 2,91 | 2,91 |
| enemigo · cm_perro | 3,09 | 3,05 |
| enemigo · cm_verdugo | 3,38 | 3,03 |
| enemigo · cristal_volador | 0,60 | 1,20 |
| enemigo · cu_sith | 1,53 | 1,60 |
| enemigo · dragoncito_hielo | 1,09 | 1,15 |
| enemigo · druida_arena | 1,14 | 1,22 |
| enemigo · esfinge | 2,05 | 1,97 |
| enemigo · golem | 2,15 | 2,04 |
| enemigo · hinchado | 1,07 | 1,12 |
| enemigo · lev_tentaculo | 2,73 | 2,13 |
| enemigo · lobo_artico | 0,61 | 1,21 |
| enemigo · medusa_electrica | 0,83 | 0,92 |
| enemigo · mn_devoraluz | 3,17 | 3,15 |
| enemigo · nucleo_micelial | 1,06 | 1,09 |
| enemigo · sabueso | 0,67 | 1,35 |
| enemigo · sirena_abisal | 0,96 | 0,92 |
| enemigo · tiburon_blanco | 2,27 | 2,06 |
| guardian · farolero | 1,12 | 1,30 |
| guardian · guerrero | 0,34 | 1,37 |
| guardian · iria | 1,03 | 1,12 |
| guardian · mago | 0,28 | 1,11 |
| guardian · tanque | 0,38 | 0,77 |
| guardian · tibor | 1,01 | 1,08 |
| jefe · ab_morador | 3,30 | 3,30 |
| jefe · guardian_ancestral | 0,28 | 2,59 |
| jefe · leviatan | 3,06 | 2,44 |
| jefe · minotauro | 3,24 | 3,00 |
| jefe · mn_cerbero | 6,20 | 5,04 |

## Luz por arena (`ARENA_LIGHT`, js/rendering/art-direction.js)

| Arena | Penumbra | Radio de luz por guardián (u) |
|---|---|---|
| Ciudad | 0,42 violeta | 270 |
| Fortaleza | 0,38 brasa | 280 |
| Ruinas (bosque) | 0,32 verde | 300 |
| Reino Micelial | 0,40 violeta | 270 |
| Gélida | 0,26 azul | 320 |
| Acuática | 0,42 abisal | 270 |
| Laberinto | 0,42 ocre | 260 |
| Abismo | 0,50 violeta | 250 |
| Infernal | 0,38 rojo | 280 |
| Minas / apagón de la Ciudad / Divina | propia (mecánica) / propia / sin penumbra | — |

Los braseros y antorchas de cada arena (`aidLights`) también abren luz. La capa va debajo de avisos, lava,
actores y proyectiles. Se apaga sola si con la resolución adaptable ya al mínimo los cuadros superan 30 ms
durante 4 s; `?luz=0` la apaga a mano.

## Rendimiento (A/B en la misma página)

La máquina de pruebas estuvo con carga 30-45 (otros equipos corriendo): los tiempos absolutos de `render()`
varían ×10 entre corridas y no sirven para comparar. Por eso se midió A/B en la MISMA página y el mismo cuadro,
capas de Q6 prendidas contra apagadas, intercalado, tomando el mínimo de 9-11 tandas (la interferencia solo suma):

| Escena | Q6 prendido | Q6 apagado |
|---|---|---|
| Ciudad oleada (por capa: luz +0,6 ms, sombra y mipmap ≈ 0) | 1,74 ms | 1,27 ms |
| Infernal oleada | 3,55 ms | 1,27 ms |
| Micelial oleada (el mipmap evita reducir atlas enormes cada cuadro) | 1,63 ms | 32,1 ms |
| Minas jefe (sin penumbra propia de Q6) | 1,93 ms | 2,10 ms |
| Acuática jefe | 2,89 ms | 1,82 ms |

Costo típico: +0,5 a +2 ms por cuadro de CPU en el emulador (casi todo la composición de la penumbra a
pantalla completa); en el Reino Micelial es mucho más rápido. NO VERIFICADO en un teléfono físico.

## Capturas (`docs/alfa/q6/`)

`antes_<arena>_<oleada|jefe>.webp` y `despues_<arena>_<oleada|jefe>.webp` (422×195, la mitad del celular).
Las partidas tienen azar: la horda y el encuadre no son idénticos entre "antes" y "después".

## Cómo repetir

```
node tools/alfa/q6_pixel_scale.js --tag despues --out docs/alfa/q6 --shots --perf   # con el repo servido en 8906
node tools/alfa/q6_pixel_scale.js --arenas ciudad,micelial --perf --ab             # A/B de rendimiento
```
