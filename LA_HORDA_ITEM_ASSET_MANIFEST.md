# LA HORDA — Manifiesto de assets de objetos

> Generado desde los datos reales del juego con `node tools/items/gen_item_manifest.js`. No editar a mano: si cambia el catálogo, se regenera.

## Estado actual (sin reemplazos silenciosos)

- **Íconos:** ningún objeto tiene arte final todavía. Los 143 objetos diseñados y los arquetipos procedurales usan un **ícono provisorio procedural en pixel art** (`js/ui/item-icons.js`): la silueta sale de la pieza, el material del elemento o del set y el marco de la categoría. **No es arte final.** Cuando exista el PNG se registra en `ITEM_ICON_ART` y la UI lo toma sola.
- **Auras de set:** hoy son un anillo procedural (punteado y creciente con 2+ piezas; pleno con el set completo). El arte final es opcional y se lista abajo.
- **Skins de set:** hoy no hay ninguna. `SET_SKINS` está vacío y **nunca** se dibuja una skin sin su arte. Con el set completo solo se ve el aura plena.
- **VFX de procs:** hoy usan partículas y ondas del sistema VFX (paletas del juego). El reemplazo por sprites es una mejora, no un faltante que rompa algo.

## Estilo obligatorio (docs/ART_BIBLE.md)

Contorno oscuro de 1 px; 2–3 tonos planos por color, sin degradados; paleta de 4–6 colores más contorno; alfa nítido (0 o 255); fondo transparente. El marco de rareza lo dibuja el juego, así que **el PNG no lleva marco ni texto**. Tamaño 64×64 (se muestra a 40, 48 y 72 px con `image-rendering: pixelated`, así que conviene diseñar en 32×32 y escalar ×2).

Colores de marco por categoría: Común blanco · Raro azul · Muy Raro amarillo · Legendario naranja · Mítico rojo · Set verde · Único violeta.

## Resumen

| Grupo | Cantidad | Formato |
|---|---|---|
| Legendarios con nombre | 24 | ícono 64×64 |
| Míticos (receta) | 8 | ícono 64×64 |
| Únicos (a mano) | 3 | ícono 64×64 |
| Objetos de campeón | 14 | ícono 64×64 |
| Piezas de set | 94 (23 sets) | ícono 64×64 |
| Arquetipos procedurales | 26 siluetas base × 10 materiales de familia | ícono base 64×64, gris neutro, se tiñe por familia |
| Auras de set | 23 | tira de 8 frames de 128×64 (opcional) |
| Skins de set | 23 | atlas del campeón o capa superpuesta (ver abajo) |
| VFX de procs, míticos y únicos | 31 | tira de 6 frames de 64×64 |
| **Total de íconos de objeto** | **169** | |

## Prioridad de producción

1. Únicos y Míticos: son pocos y son los que más se muestran.
2. Los 26 arquetipos procedurales: cubren el 90% del botín.
3. Legendarios con nombre.
4. Piezas de set, un set completo por vez para que se lea como conjunto.
5. Objetos de campeón.
6. Skins de set, luego auras y VFX.

## 1. Únicos (diseñados a mano, nunca procedurales, sin skin)

#### Corona del Archimago Eclipsado  `uniq_corona_archimago`
- **Categoría:** Único · **Rareza:** Único · **Slot real:** Casco (casco) · **Set:** — · **Uso:** Mago
- **Arena / fuente:** Único diseñado a mano (jefes finales / pity de Único)
- **Archivo:** `assets/items/uniq_corona_archimago.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["uniq_corona_archimago"]`)
- **Efecto (para que el arte lo cuente):** +18% daño de habilidades / +10% enfriamiento / +12% recurso / Represalia: Quien te golpea cuerpo a cuerpo recibe parte del daño y queda aturdido / Fuego del Vacío: Tu fuego se vuelve violeta y quema el doble de tiempo. El Muro de Fuego te sigue. La Cadena de Relámpago salta 3 veces más y deja a cada objetivo en llamas.
- **Descripción visual:** corona de fuego (rojo brasa, naranja, amarillo). El último Archimago miró al Vacío hasta que el Vacío le devolvió la mirada. La corona es lo único que quedó mirando.
- **Prompt:** `Corona del Archimago Eclipsado — game item icon, a crown, palette: fire (ember red, orange, yellow); lore hint: "El último Archimago miró al Vacío hasta que el Vacío le devolvió la mirada. La corona es lo único que quedó mirando."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Yelmo del Coloso Errante  `uniq_yelmo_coloso`
- **Categoría:** Único · **Rareza:** Único · **Slot real:** Casco (casco) · **Set:** — · **Uso:** Tanque
- **Arena / fuente:** Único diseñado a mano (jefes finales / pity de Único)
- **Archivo:** `assets/items/uniq_yelmo_coloso.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["uniq_yelmo_coloso"]`)
- **Efecto (para que el arte lo cuente):** +22% vida / +10% defensa / Aliento Glacial: Los enemigos cerca tuyo se mueven un 18% más lento / Paso del Coloso: Te agrandás un 15% y cada paso hace temblar el suelo: los enemigos pegados a vos se tambalean. La Embestida deja una grieta que aturde a todo lo que cruza.
- **Descripción visual:** yelmo de acero (gris azulado). Perteneció a un gigante que caminó a través de tres hordas sin detenerse.
- **Prompt:** `Yelmo del Coloso Errante — game item icon, a helmet, palette: steel (bluish grey); lore hint: "Perteneció a un gigante que caminó a través de tres hordas sin detenerse."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Arco de la Luna Roja  `uniq_arco_lunaroja`
- **Categoría:** Único · **Rareza:** Único · **Slot real:** Arma (arma) · **Set:** — · **Uso:** La Cazadora
- **Arena / fuente:** Único diseñado a mano (jefes finales / pity de Único)
- **Archivo:** `assets/items/uniq_arco_lunaroja.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["uniq_arco_lunaroja"]`)
- **Efecto (para que el arte lo cuente):** +20% daño / +12% velocidad de ataque / +6% prob. de crítico / Festín de Almas: Cada baja te cura; las bajas de élite curan mucho más / Luna Roja: Tus flechas son de sangre: cada una hace sangrar y, contra tu Presa, atraviesa. El Lobo Espectral aparece siempre que marcás una Presa nueva (cada 20 s).
- **Descripción visual:** arco de sangre (carmesí, rojo oscuro). Solo se tensa cuando la luna sangra. La Cazadora aprendió a esperar esas noches.
- **Prompt:** `Arco de la Luna Roja — game item icon, a bow, palette: blood (crimson, dark red); lore hint: "Solo se tensa cuando la luna sangra. La Cazadora aprendió a esperar esas noches."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

## 2. Míticos (modifican builds; sin skin)

#### Corona del Invierno Sin Fin  `myth_corona_invierno`
- **Categoría:** Mítico · **Rareza:** Mítico · **Slot real:** Casco (casco) · **Set:** — · **Uso:** Universal
- **Arena / fuente:** Receta: Esquirla de Tundraverx + Manto del Glaciar Dormido + Ojo del Ventisquero
- **Archivo:** `assets/items/myth_corona_invierno.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["myth_corona_invierno"]`)
- **Efecto (para que el arte lo cuente):** +12% vida / +20% daño crítico / +8% daño / Aliento Glacial: Los enemigos cerca tuyo se mueven un 18% más lento / Invierno Sin Fin: Cada 3 ralentizaciones sobre el mismo enemigo lo CONGELÁS (1,2 s). Los congelados que mueren estallan en esquirlas que ralentizan y encadenan el frío.
- **Descripción visual:** corona de hielo (azul glaciar, celeste, blanco). La llevaba el Mago de Hielo antes de que el Ángel Caído la reclamara.
- **Prompt:** `Corona del Invierno Sin Fin — game item icon, a crown, palette: ice (glacier blue, cyan, white); lore hint: "La llevaba el Mago de Hielo antes de que el Ángel Caído la reclamara."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Corazón del Averno  `myth_corazon_averno`
- **Categoría:** Mítico · **Rareza:** Mítico · **Slot real:** Pechera (pechera) · **Set:** — · **Uso:** Universal
- **Arena / fuente:** Receta: Ascua de Belial + Guanteletes del Herrero Caído + Yelmo de Brasa Viva
- **Archivo:** `assets/items/myth_corazon_averno.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["myth_corazon_averno"]`)
- **Efecto (para que el arte lo cuente):** +12% vida / +10% daño de habilidades / +8% daño / Avivar las Llamas: +25% de daño contra enemigos que están ardiendo / Combustión Perpetua: El fuego se CONTAGIA: cada enemigo en llamas prende a otro cercano cada segundo. Los que mueren ardiendo explotan.
- **Descripción visual:** corazón de fuego (rojo brasa, naranja, amarillo). Late con el ritmo de la Horda. Cuanto más cerca está, más rápido.
- **Prompt:** `Corazón del Averno — game item icon, a heart relic, palette: fire (ember red, orange, yellow); lore hint: "Late con el ritmo de la Horda. Cuanto más cerca está, más rápido."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Martillo de la Tormenta Primigenia  `myth_martillo_tormenta`
- **Categoría:** Mítico · **Rareza:** Mítico · **Slot real:** Arma (arma) · **Set:** — · **Uso:** Universal
- **Arena / fuente:** Receta: Cadena de Ysolde + Botas del Relámpago Errante + Brazal de la Descarga
- **Archivo:** `assets/items/myth_martillo_tormenta.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["myth_martillo_tormenta"]`)
- **Efecto (para que el arte lo cuente):** +14% daño / +10% velocidad de ataque / +6% enfriamiento / Tormenta Encadenada: Cada 4 golpes básicos sale un rayo que salta entre enemigos / Tormenta Viva: Cada 3 habilidades, una TORMENTA te sigue 4 s descargando rayos sobre los enemigos cercanos (aturden un instante).
- **Descripción visual:** martillo de rayo (amarillo eléctrico, blanco). El primer rayo que cayó sobre el mundo. Alguien lo atrapó y le puso mango.
- **Prompt:** `Martillo de la Tormenta Primigenia — game item icon, a war hammer, palette: lightning (electric yellow, white); lore hint: "El primer rayo que cayó sobre el mundo. Alguien lo atrapó y le puso mango."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Égida del Último Bastión  `myth_egida_bastion`
- **Categoría:** Mítico · **Rareza:** Mítico · **Slot real:** Escudo (escudo) · **Set:** — · **Uso:** Universal
- **Arena / fuente:** Receta: Muro de Kaelen + Pechera del Juramento Roto + Yelmo del Centinela
- **Archivo:** `assets/items/myth_egida_bastion.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["myth_egida_bastion"]`)
- **Efecto (para que el arte lo cuente):** +10% defensa / +14% vida / Represalia: Quien te golpea cuerpo a cuerpo recibe parte del daño y queda aturdido / Último Bastión: Los golpes fuertes que recibís se ACUMULAN; tu siguiente habilidad libera una onda que devuelve ese daño x2,5 y aturde. Los aliados cerca tuyo reciben 12% menos daño.
- **Descripción visual:** rodela redonda de acero (gris azulado). El último escudo de la última muralla. Nadie la cruzó mientras estuvo en pie.
- **Prompt:** `Égida del Último Bastión — game item icon, a round buckler, palette: steel (bluish grey); lore hint: "El último escudo de la última muralla. Nadie la cruzó mientras estuvo en pie."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Guadaña de la Cosecha Roja  `myth_guadana_roja`
- **Categoría:** Mítico · **Rareza:** Mítico · **Slot real:** Arma (arma) · **Set:** — · **Uso:** Universal
- **Arena / fuente:** Receta: Hoja Sedienta de Morrah + Guantes del Carnicero + Botas de la Cacería Roja
- **Archivo:** `assets/items/myth_guadana_roja.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["myth_guadana_roja"]`)
- **Efecto (para que el arte lo cuente):** +14% daño / +7% robo de vida / Filo del Verdugo: +60% de daño a enemigos comunes y élites con menos de 20% de vida / Cosecha Roja: Tus básicos hacen SANGRAR. Los que sangran reciben +20% de daño; matar a uno te cura y contagia el sangrado a 3 enemigos cercanos.
- **Descripción visual:** guadaña de sangre (carmesí, rojo oscuro). No siega trigo.
- **Prompt:** `Guadaña de la Cosecha Roja — game item icon, a scythe, palette: blood (crimson, dark red); lore hint: "No siega trigo."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Báculo del Alba Eterna  `myth_baculo_alba`
- **Categoría:** Mítico · **Rareza:** Mítico · **Slot real:** Arma (arma) · **Set:** — · **Uso:** Universal
- **Arena / fuente:** Receta: Lágrima de Seraphine + Túnica del Peregrino + Sandalias del Primer Alba
- **Archivo:** `assets/items/myth_baculo_alba.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["myth_baculo_alba"]`)
- **Efecto (para que el arte lo cuente):** +18% curación / +10% recurso / +6% daño / Gracia Veloz: Curar a un aliado les da a los dos velocidad por 2,5 s / Alba Eterna: Cada curación deja SUELO CONSAGRADO por 3 s: cura a los aliados y quema a los enemigos que lo pisan.
- **Descripción visual:** bastón/báculo de luz sagrada (dorado, marfil). Anuncia la mañana aunque falten horas. A veces, eso alcanza para aguantar.
- **Prompt:** `Báculo del Alba Eterna — game item icon, a staff, palette: holy light (gold, ivory); lore hint: "Anuncia la mañana aunque falten horas. A veces, eso alcanza para aguantar."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Grimorio del Vacío Hambriento  `myth_grimorio_vacio`
- **Categoría:** Mítico · **Rareza:** Mítico · **Slot real:** Guantes (guantes) · **Set:** — · **Uso:** Universal
- **Arena / fuente:** Receta: Diadema de los Mil Sellos + Dedos de Ceniza Arcana + Pasos del Umbral
- **Archivo:** `assets/items/myth_grimorio_vacio.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["myth_grimorio_vacio"]`)
- **Efecto (para que el arte lo cuente):** +10% enfriamiento / +12% daño de habilidades / Resonancia Arcana: Al lanzar una habilidad, una onda de energía golpea a tu alrededor / Eco del Vacío: Tus habilidades tienen 25% de probabilidad de REPETIRSE solas al 60% de poder (las de desplazamiento e invocación no).
- **Descripción visual:** grimorio de arcano (violeta, lila). Cada página que leés, desaparece. Y vuelve más fuerte.
- **Prompt:** `Grimorio del Vacío Hambriento — game item icon, a grimoire, palette: arcane (violet, lilac); lore hint: "Cada página que leés, desaparece. Y vuelve más fuerte."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Hoja del Eclipse  `myth_hoja_eclipse`
- **Categoría:** Mítico · **Rareza:** Mítico · **Slot real:** Arma (arma) · **Set:** — · **Uso:** Universal
- **Arena / fuente:** Receta: Filo de Medianoche + Máscara del Acecho Nocturno + Guantes del Duelista Silencioso
- **Archivo:** `assets/items/myth_hoja_eclipse.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["myth_hoja_eclipse"]`)
- **Efecto (para que el arte lo cuente):** +8% prob. de crítico / +30% daño crítico / +8% daño / Golpe Sísmico: Los críticos generan una onda de choque que aturde / Eclipse: Tus críticos MARCAN al enemigo: si baja de 25% de vida, tu próximo golpe lo EJECUTA (no a jefes ni subjefes). +25% de daño crítico contra jefes.
- **Descripción visual:** espada de acero (gris azulado). Cuando el sol y la luna se cruzan, la hoja corta una sola vez. Alcanza.
- **Prompt:** `Hoja del Eclipse — game item icon, a sword, palette: steel (bluish grey); lore hint: "Cuando el sol y la luna se cruzan, la hoja corta una sola vez. Alcanza."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

## 3. Legendarios con nombre

#### Esquirla de Tundraverx  `leg_tundraverx`
- **Categoría:** Legendario con nombre · **Rareza:** Legendario · **Slot real:** Arma (arma) · **Set:** — · **Uso:** Universal
- **Arena / fuente:** Arena de Hielo, Arena Acuática
- **Archivo:** `assets/items/leg_tundraverx.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["leg_tundraverx"]`)
- **Efecto (para que el arte lo cuente):** +10% daño / +4% prob. de crítico / Escarcha Viva: Tus básicos ralentizan; cada 6 golpes congelan al objetivo / Parte de la receta de Corona del Invierno Sin Fin
- **Descripción visual:** daga/colmillo de hielo (azul glaciar, celeste, blanco), «la que muerde el aire». Arrancada del ala del Soberano de Hielo. Todavía está fría al tacto, aunque la dejes al sol.
- **Prompt:** `Esquirla de Tundraverx — game item icon, a dagger/fang blade, palette: ice (glacier blue, cyan, white); lore hint: "Arrancada del ala del Soberano de Hielo. Todavía está fría al tacto, aunque la dejes al sol."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Manto del Glaciar Dormido  `leg_glaciar_manto`
- **Categoría:** Legendario con nombre · **Rareza:** Legendario · **Slot real:** Pechera (pechera) · **Set:** — · **Uso:** Universal
- **Arena / fuente:** Arena de Hielo, El Reino Micelial
- **Archivo:** `assets/items/leg_glaciar_manto.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["leg_glaciar_manto"]`)
- **Efecto (para que el arte lo cuente):** +10% vida / +5% defensa / Aliento Glacial: Los enemigos cerca tuyo se mueven un 18% más lento / Parte de la receta de Corona del Invierno Sin Fin
- **Descripción visual:** manto de hielo (azul glaciar, celeste, blanco), «que nunca despertó». Tejido con escarcha de un glaciar que duerme desde antes de la primera horda.
- **Prompt:** `Manto del Glaciar Dormido — game item icon, a cloak, palette: ice (glacier blue, cyan, white); lore hint: "Tejido con escarcha de un glaciar que duerme desde antes de la primera horda."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Ojo del Ventisquero  `leg_ventisquero`
- **Categoría:** Legendario con nombre · **Rareza:** Legendario · **Slot real:** Guantes (guantes) · **Set:** — · **Uso:** Universal
- **Arena / fuente:** Arena de Hielo, Laberinto Maldito
- **Archivo:** `assets/items/leg_ventisquero.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["leg_ventisquero"]`)
- **Efecto (para que el arte lo cuente):** +22% daño crítico / +8% velocidad de ataque / Frío que Quiebra: +50% de daño crítico contra enemigos ralentizados o congelados / Parte de la receta de Corona del Invierno Sin Fin
- **Descripción visual:** diadema/aureola de hielo (azul glaciar, celeste, blanco), «que ve el hielo romperse». Los guantes de un cazador que esperaba la ventisca para golpear.
- **Prompt:** `Ojo del Ventisquero — game item icon, a circlet, palette: ice (glacier blue, cyan, white); lore hint: "Los guantes de un cazador que esperaba la ventisca para golpear."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Ascua de Belial  `leg_belial`
- **Categoría:** Legendario con nombre · **Rareza:** Legendario · **Slot real:** Arma (arma) · **Set:** — · **Uso:** Universal
- **Arena / fuente:** Arena Infernal, La Fortaleza Sin Fin
- **Archivo:** `assets/items/leg_belial.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["leg_belial"]`)
- **Efecto (para que el arte lo cuente):** +12% daño / +6% daño de habilidades / Estallido Ígneo: Al matar, el enemigo puede estallar en llamas y dañar a los cercanos / Parte de la receta de Corazón del Averno
- **Descripción visual:** orbe de fuego (rojo brasa, naranja, amarillo), «el que no se apaga». Un trozo del corazón de un demonio menor. Late cuando hay sangre cerca.
- **Prompt:** `Ascua de Belial — game item icon, an orb, palette: fire (ember red, orange, yellow); lore hint: "Un trozo del corazón de un demonio menor. Late cuando hay sangre cerca."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Guanteletes del Herrero Caído  `leg_herrero_caido`
- **Categoría:** Legendario con nombre · **Rareza:** Legendario · **Slot real:** Guantes (guantes) · **Set:** — · **Uso:** Universal
- **Arena / fuente:** La Fortaleza Sin Fin, Arena Infernal
- **Archivo:** `assets/items/leg_herrero_caido.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["leg_herrero_caido"]`)
- **Efecto (para que el arte lo cuente):** +10% velocidad de ataque / +5% daño / Brasa Viva: Tus golpes básicos prenden fuego al objetivo / Parte de la receta de Corazón del Averno
- **Descripción visual:** guanteletes de fuego (rojo brasa, naranja, amarillo), «forjados en la derrota». El herrero de la Fortaleza siguió forjando después de muerto. Estos fueron sus últimos.
- **Prompt:** `Guanteletes del Herrero Caído — game item icon, a gauntlets, palette: fire (ember red, orange, yellow); lore hint: "El herrero de la Fortaleza siguió forjando después de muerto. Estos fueron sus últimos."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Yelmo de Brasa Viva  `leg_brasa_viva`
- **Categoría:** Legendario con nombre · **Rareza:** Legendario · **Slot real:** Casco (casco) · **Set:** — · **Uso:** Universal
- **Arena / fuente:** Arena Infernal, La Fortaleza Sin Fin
- **Archivo:** `assets/items/leg_brasa_viva.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["leg_brasa_viva"]`)
- **Efecto (para que el arte lo cuente):** +8% vida / +8% daño de habilidades / Avivar las Llamas: +25% de daño contra enemigos que están ardiendo / Parte de la receta de Corazón del Averno
- **Descripción visual:** yelmo de fuego (rojo brasa, naranja, amarillo), «que arde por dentro». Quien lo usa siente el calor en la nuca. Quien lo enfrenta, en toda la piel.
- **Prompt:** `Yelmo de Brasa Viva — game item icon, a helmet, palette: fire (ember red, orange, yellow); lore hint: "Quien lo usa siente el calor en la nuca. Quien lo enfrenta, en toda la piel."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Cadena de Ysolde  `leg_ysolde`
- **Categoría:** Legendario con nombre · **Rareza:** Legendario · **Slot real:** Arma (arma) · **Set:** — · **Uso:** Universal
- **Arena / fuente:** Arena Acuática, Laberinto Maldito
- **Archivo:** `assets/items/leg_ysolde.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["leg_ysolde"]`)
- **Efecto (para que el arte lo cuente):** +10% velocidad de ataque / +7% daño / Tormenta Encadenada: Cada 4 golpes básicos sale un rayo que salta entre enemigos / Parte de la receta de Martillo de la Tormenta Primigenia
- **Descripción visual:** cadena de rayo (amarillo eléctrico, blanco), «la que salta». Ysolde encadenaba rayos como otros encadenan prisioneros.
- **Prompt:** `Cadena de Ysolde — game item icon, a chain, palette: lightning (electric yellow, white); lore hint: "Ysolde encadenaba rayos como otros encadenan prisioneros."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Botas del Relámpago Errante  `leg_relampago_errante`
- **Categoría:** Legendario con nombre · **Rareza:** Legendario · **Slot real:** Botas (botas) · **Set:** — · **Uso:** Universal
- **Arena / fuente:** Arena Acuática, Ruinas del Bosque
- **Archivo:** `assets/items/leg_relampago_errante.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["leg_relampago_errante"]`)
- **Efecto (para que el arte lo cuente):** +8% velocidad / +5% enfriamiento / Paso del Cazador: Cada baja te da velocidad de movimiento (se acumula hasta 10) / Parte de la receta de Martillo de la Tormenta Primigenia
- **Descripción visual:** botas de rayo (amarillo eléctrico, blanco), «que nunca pisan dos veces». Dejan un olor a tormenta en cada paso.
- **Prompt:** `Botas del Relámpago Errante — game item icon, a boots, palette: lightning (electric yellow, white); lore hint: "Dejan un olor a tormenta en cada paso."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Brazal de la Descarga  `leg_descarga`
- **Categoría:** Legendario con nombre · **Rareza:** Legendario · **Slot real:** Guantes (guantes) · **Set:** — · **Uso:** Universal
- **Arena / fuente:** Arena Acuática, Laberinto Maldito
- **Archivo:** `assets/items/leg_descarga.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["leg_descarga"]`)
- **Efecto (para que el arte lo cuente):** +10% descarga al golpear / +7% daño de habilidades / Descarga Arcana: Tus habilidades pueden electrocutar: aturden un instante y saltan a otro enemigo / Parte de la receta de Martillo de la Tormenta Primigenia
- **Descripción visual:** guanteletes de rayo (amarillo eléctrico, blanco), «que muerde al tocar». Forjado dentro de una anguila eléctrica. Todavía zumba.
- **Prompt:** `Brazal de la Descarga — game item icon, a gauntlets, palette: lightning (electric yellow, white); lore hint: "Forjado dentro de una anguila eléctrica. Todavía zumba."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Muro de Kaelen  `leg_kaelen`
- **Categoría:** Legendario con nombre · **Rareza:** Legendario · **Slot real:** Escudo (escudo) · **Set:** — · **Uso:** Universal
- **Arena / fuente:** La Fortaleza Sin Fin, Ruinas del Bosque
- **Archivo:** `assets/items/leg_kaelen.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["leg_kaelen"]`)
- **Efecto (para que el arte lo cuente):** +7% defensa / +8% vida / Égida: Un golpe fuerte recibido te da un escudo (cada 8 s) / Parte de la receta de Égida del Último Bastión
- **Descripción visual:** pavés/escudo torre de acero (gris azulado), «el que no retrocedió». Kaelen sostuvo la puerta de la Fortaleza tres días. Al cuarto, la puerta lo sostuvo a él.
- **Prompt:** `Muro de Kaelen — game item icon, a tower shield, palette: steel (bluish grey); lore hint: "Kaelen sostuvo la puerta de la Fortaleza tres días. Al cuarto, la puerta lo sostuvo a él."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Pechera del Juramento Roto  `leg_juramento_roto`
- **Categoría:** Legendario con nombre · **Rareza:** Legendario · **Slot real:** Pechera (pechera) · **Set:** — · **Uso:** Universal
- **Arena / fuente:** La Fortaleza Sin Fin, Laberinto Maldito
- **Archivo:** `assets/items/leg_juramento_roto.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["leg_juramento_roto"]`)
- **Efecto (para que el arte lo cuente):** +8% defensa / +6% vida / Represalia: Quien te golpea cuerpo a cuerpo recibe parte del daño y queda aturdido / Parte de la receta de Égida del Último Bastión
- **Descripción visual:** coraza/peto de acero (gris azulado), «que devuelve cada golpe». El caballero juró no caer. Cayó. La pechera no aceptó el final.
- **Prompt:** `Pechera del Juramento Roto — game item icon, a chest armor, palette: steel (bluish grey); lore hint: "El caballero juró no caer. Cayó. La pechera no aceptó el final."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Yelmo del Centinela  `leg_centinela`
- **Categoría:** Legendario con nombre · **Rareza:** Legendario · **Slot real:** Casco (casco) · **Set:** — · **Uso:** Universal
- **Arena / fuente:** La Fortaleza Sin Fin, Laberinto Maldito
- **Archivo:** `assets/items/leg_centinela.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["leg_centinela"]`)
- **Efecto (para que el arte lo cuente):** +10% vida / +6% curación / Guardia Juramentada: Los aliados cerca tuyo reciben 10% menos daño / Parte de la receta de Égida del Último Bastión
- **Descripción visual:** yelmo de acero (gris azulado), «que vigila a los suyos». Mientras el Centinela mire, nadie de su guardia muere solo.
- **Prompt:** `Yelmo del Centinela — game item icon, a helmet, palette: steel (bluish grey); lore hint: "Mientras el Centinela mire, nadie de su guardia muere solo."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Hoja Sedienta de Morrah  `leg_morrah`
- **Categoría:** Legendario con nombre · **Rareza:** Legendario · **Slot real:** Arma (arma) · **Set:** — · **Uso:** Universal
- **Arena / fuente:** Ruinas del Bosque, Laberinto Maldito
- **Archivo:** `assets/items/leg_morrah.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["leg_morrah"]`)
- **Efecto (para que el arte lo cuente):** +10% daño / +4% robo de vida / Filo Sediento: Tus golpes básicos abren heridas que sangran / Parte de la receta de Guadaña de la Cosecha Roja
- **Descripción visual:** espada de sangre (carmesí, rojo oscuro), «que nunca se sacia». Morrah la dejó clavada en un árbol de las Ruinas. El árbol todavía sangra.
- **Prompt:** `Hoja Sedienta de Morrah — game item icon, a sword, palette: blood (crimson, dark red); lore hint: "Morrah la dejó clavada en un árbol de las Ruinas. El árbol todavía sangra."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Guantes del Carnicero  `leg_carnicero`
- **Categoría:** Legendario con nombre · **Rareza:** Legendario · **Slot real:** Guantes (guantes) · **Set:** — · **Uso:** Universal
- **Arena / fuente:** Laberinto Maldito, Ruinas del Bosque
- **Archivo:** `assets/items/leg_carnicero.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["leg_carnicero"]`)
- **Efecto (para que el arte lo cuente):** +9% velocidad de ataque / +5% robo de vida / Filo del Verdugo: +60% de daño a enemigos comunes y élites con menos de 20% de vida / Parte de la receta de Guadaña de la Cosecha Roja
- **Descripción visual:** guantes de sangre (carmesí, rojo oscuro), «de la Ciudad Baja». Nunca se lavaron. Nadie se animó a pedírselo.
- **Prompt:** `Guantes del Carnicero — game item icon, a gloves, palette: blood (crimson, dark red); lore hint: "Nunca se lavaron. Nadie se animó a pedírselo."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Botas de la Cacería Roja  `leg_caceria_roja`
- **Categoría:** Legendario con nombre · **Rareza:** Legendario · **Slot real:** Botas (botas) · **Set:** — · **Uso:** Universal
- **Arena / fuente:** Ruinas del Bosque, El Reino Micelial
- **Archivo:** `assets/items/leg_caceria_roja.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["leg_caceria_roja"]`)
- **Efecto (para que el arte lo cuente):** +7% velocidad / +4% robo de vida / Festín de Almas: Cada baja te cura; las bajas de élite curan mucho más / Parte de la receta de Guadaña de la Cosecha Roja
- **Descripción visual:** botas de sangre (carmesí, rojo oscuro), «que siguen el rastro». Encuentran a la presa herida aunque su dueño no sepa dónde está.
- **Prompt:** `Botas de la Cacería Roja — game item icon, a boots, palette: blood (crimson, dark red); lore hint: "Encuentran a la presa herida aunque su dueño no sepa dónde está."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Lágrima de Seraphine  `leg_seraphine`
- **Categoría:** Legendario con nombre · **Rareza:** Legendario · **Slot real:** Casco (casco) · **Set:** — · **Uso:** Universal
- **Arena / fuente:** El Reino Micelial, Ruinas del Bosque
- **Archivo:** `assets/items/leg_seraphine.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["leg_seraphine"]`)
- **Efecto (para que el arte lo cuente):** +12% curación / +8% recurso / Festín de Almas: Cada baja te cura; las bajas de élite curan mucho más / Parte de la receta de Báculo del Alba Eterna
- **Descripción visual:** cristal/gema de luz sagrada (dorado, marfil), «la que no cayó en vano». Seraphine lloró una sola vez: por todos los que no pudo salvar. La lágrima se volvió cristal.
- **Prompt:** `Lágrima de Seraphine — game item icon, a crystal, palette: holy light (gold, ivory); lore hint: "Seraphine lloró una sola vez: por todos los que no pudo salvar. La lágrima se volvió cristal."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Túnica del Peregrino  `leg_peregrino`
- **Categoría:** Legendario con nombre · **Rareza:** Legendario · **Slot real:** Pechera (pechera) · **Set:** — · **Uso:** Universal
- **Arena / fuente:** El Reino Micelial, Arena Acuática
- **Archivo:** `assets/items/leg_peregrino.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["leg_peregrino"]`)
- **Efecto (para que el arte lo cuente):** +18% exceso de curación → escudo / +6% curación / Égida: Un golpe fuerte recibido te da un escudo (cada 8 s) / Parte de la receta de Báculo del Alba Eterna
- **Descripción visual:** túnica de luz sagrada (dorado, marfil), «que caminó hasta el alba». El Peregrino cruzó el Reino Micelial sin enfermar. Nadie sabe cómo.
- **Prompt:** `Túnica del Peregrino — game item icon, a robe, palette: holy light (gold, ivory); lore hint: "El Peregrino cruzó el Reino Micelial sin enfermar. Nadie sabe cómo."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Sandalias del Primer Alba  `leg_alba_sandalias`
- **Categoría:** Legendario con nombre · **Rareza:** Legendario · **Slot real:** Botas (botas) · **Set:** — · **Uso:** Universal
- **Arena / fuente:** El Reino Micelial, Ruinas del Bosque
- **Archivo:** `assets/items/leg_alba_sandalias.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["leg_alba_sandalias"]`)
- **Efecto (para que el arte lo cuente):** +7% velocidad / +8% curación / Gracia Veloz: Curar a un aliado les da a los dos velocidad por 2,5 s / Parte de la receta de Báculo del Alba Eterna
- **Descripción visual:** sandalias de luz sagrada (dorado, marfil), «que llegan antes que la luz». Dicen que quien las usa llega a tiempo. Siempre.
- **Prompt:** `Sandalias del Primer Alba — game item icon, a sandals, palette: holy light (gold, ivory); lore hint: "Dicen que quien las usa llega a tiempo. Siempre."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Diadema de los Mil Sellos  `leg_mil_sellos`
- **Categoría:** Legendario con nombre · **Rareza:** Legendario · **Slot real:** Casco (casco) · **Set:** — · **Uso:** Universal
- **Arena / fuente:** Laberinto Maldito, El Reino Micelial
- **Archivo:** `assets/items/leg_mil_sellos.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["leg_mil_sellos"]`)
- **Efecto (para que el arte lo cuente):** +6% enfriamiento / +8% daño de habilidades / Resonancia Arcana: Al lanzar una habilidad, una onda de energía golpea a tu alrededor / Parte de la receta de Grimorio del Vacío Hambriento
- **Descripción visual:** diadema/aureola de arcano (violeta, lila), «que recuerda cada hechizo». Cada sello es un hechizo que alguien lanzó y olvidó. La diadema no olvida.
- **Prompt:** `Diadema de los Mil Sellos — game item icon, a circlet, palette: arcane (violet, lilac); lore hint: "Cada sello es un hechizo que alguien lanzó y olvidó. La diadema no olvida."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Dedos de Ceniza Arcana  `leg_ceniza_arcana`
- **Categoría:** Legendario con nombre · **Rareza:** Legendario · **Slot real:** Guantes (guantes) · **Set:** — · **Uso:** Universal
- **Arena / fuente:** Laberinto Maldito, Arena Infernal
- **Archivo:** `assets/items/leg_ceniza_arcana.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["leg_ceniza_arcana"]`)
- **Efecto (para que el arte lo cuente):** +10% daño de habilidades / +6% recurso / Descarga Arcana: Tus habilidades pueden electrocutar: aturden un instante y saltan a otro enemigo / Parte de la receta de Grimorio del Vacío Hambriento
- **Descripción visual:** guantes de arcano (violeta, lila), «que queman el aire». Los dedos de un mago que tocó el Vacío. Solo quedaron los guantes.
- **Prompt:** `Dedos de Ceniza Arcana — game item icon, a gloves, palette: arcane (violet, lilac); lore hint: "Los dedos de un mago que tocó el Vacío. Solo quedaron los guantes."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Pasos del Umbral  `leg_umbral`
- **Categoría:** Legendario con nombre · **Rareza:** Legendario · **Slot real:** Botas (botas) · **Set:** — · **Uso:** Universal
- **Arena / fuente:** Laberinto Maldito, El Reino Micelial
- **Archivo:** `assets/items/leg_umbral.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["leg_umbral"]`)
- **Efecto (para que el arte lo cuente):** +6% enfriamiento / +6% velocidad / Paso del Cazador: Cada baja te da velocidad de movimiento (se acumula hasta 10) / Parte de la receta de Grimorio del Vacío Hambriento
- **Descripción visual:** botas de arcano (violeta, lila), «entre un lugar y otro». Quien los usa está siempre un paso más allá de donde lo buscan.
- **Prompt:** `Pasos del Umbral — game item icon, a boots, palette: arcane (violet, lilac); lore hint: "Quien los usa está siempre un paso más allá de donde lo buscan."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Filo de Medianoche  `leg_medianoche`
- **Categoría:** Legendario con nombre · **Rareza:** Legendario · **Slot real:** Arma (arma) · **Set:** — · **Uso:** Universal
- **Arena / fuente:** Arena Infernal, Laberinto Maldito
- **Archivo:** `assets/items/leg_medianoche.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["leg_medianoche"]`)
- **Efecto (para que el arte lo cuente):** +6% prob. de crítico / +18% daño crítico / Golpe Sísmico: Los críticos generan una onda de choque que aturde / Parte de la receta de Hoja del Eclipse
- **Descripción visual:** espada de acero (gris azulado), «que corta la sombra». Se forjó una noche sin luna. Brilla solo cuando va a matar.
- **Prompt:** `Filo de Medianoche — game item icon, a sword, palette: steel (bluish grey); lore hint: "Se forjó una noche sin luna. Brilla solo cuando va a matar."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Máscara del Acecho Nocturno  `leg_acecho`
- **Categoría:** Legendario con nombre · **Rareza:** Legendario · **Slot real:** Casco (casco) · **Set:** — · **Uso:** Universal
- **Arena / fuente:** Laberinto Maldito, Ruinas del Bosque
- **Archivo:** `assets/items/leg_acecho.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["leg_acecho"]`)
- **Efecto (para que el arte lo cuente):** +6% prob. de crítico / +6% daño / Filo del Verdugo: +60% de daño a enemigos comunes y élites con menos de 20% de vida / Parte de la receta de Hoja del Eclipse
- **Descripción visual:** máscara/visor de acero (gris azulado), «que no parpadea». Los que la vieron de frente no llegaron a contarlo.
- **Prompt:** `Máscara del Acecho Nocturno — game item icon, a mask, palette: steel (bluish grey); lore hint: "Los que la vieron de frente no llegaron a contarlo."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Guantes del Duelista Silencioso  `leg_duelista`
- **Categoría:** Legendario con nombre · **Rareza:** Legendario · **Slot real:** Guantes (guantes) · **Set:** — · **Uso:** Universal
- **Arena / fuente:** Laberinto Maldito, La Fortaleza Sin Fin
- **Archivo:** `assets/items/leg_duelista.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["leg_duelista"]`)
- **Efecto (para que el arte lo cuente):** +20% daño crítico / +8% velocidad de ataque / Furia Creciente: Golpear seguido acumula daño y velocidad de ataque (hasta 10) / Parte de la receta de Hoja del Eclipse
- **Descripción visual:** guantes de acero (gris azulado), «que ganó sin hablar». Ganó cien duelos. Nunca dijo su nombre.
- **Prompt:** `Guantes del Duelista Silencioso — game item icon, a gloves, palette: steel (bluish grey); lore hint: "Ganó cien duelos. Nunca dijo su nombre."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

## 4. Objetos de campeón

#### Escudo del Juggernaut  `tanque_leg`
- **Categoría:** Objeto de campeón · **Rareza:** Legendario · **Slot real:** Escudo (escudo) · **Set:** — · **Uso:** Tanque
- **Arena / fuente:** Botín del campeón (cualquier arena)
- **Archivo:** `assets/items/tanque_leg.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["tanque_leg"]`)
- **Efecto (para que el arte lo cuente):** Embestida: durante la carga recibís 10% menos daño (0,5 s). / Paso del Cazador: Cada baja te da velocidad de movimiento (se acumula hasta 10)
- **Descripción visual:** escudo de cometa de acero (gris azulado). Perteneció a un caballero que nunca retrocedió un solo paso.
- **Prompt:** `Escudo del Juggernaut — game item icon, a kite shield, palette: steel (bluish grey); lore hint: "Perteneció a un caballero que nunca retrocedió un solo paso."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Corona del Paladín Eterno  `tanque_mit`
- **Categoría:** Objeto de campeón · **Rareza:** Mítico · **Slot real:** Pechera (pechera) · **Set:** — · **Uso:** Tanque
- **Arena / fuente:** Botín del campeón (cualquier arena)
- **Archivo:** `assets/items/tanque_mit.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["tanque_mit"]`)
- **Efecto (para que el arte lo cuente):** Grito de Guerra: tu próximo Torbellino dura 18% más. / Sobrecarga Mítica: Con menos de 50% de vida: +15% de daño y +15% de velocidad de ataque / Golpe Sísmico: Los críticos generan una onda de choque que aturde
- **Descripción visual:** pala de acero (gris azulado). Se dice que el grito de su portador todavía se escucha en el campo de batalla.
- **Prompt:** `Corona del Paladín Eterno — game item icon, a shovel, palette: steel (bluish grey); lore hint: "Se dice que el grito de su portador todavía se escucha en el campo de batalla."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Garra del Cazador  `guerrero_leg`
- **Categoría:** Objeto de campeón · **Rareza:** Legendario · **Slot real:** Botas (botas) · **Set:** — · **Uso:** Asesino
- **Arena / fuente:** Botín del campeón (cualquier arena)
- **Archivo:** `assets/items/guerrero_leg.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["guerrero_leg"]`)
- **Efecto (para que el arte lo cuente):** Trampa de Área: colocás 1 trampa más por lanzamiento. / Resonancia Arcana: Al lanzar una habilidad, una onda de energía golpea a tu alrededor
- **Descripción visual:** botas de cuero (marrón). Cada paso que da queda marcado con una trampa invisible.
- **Prompt:** `Garra del Cazador — game item icon, a boots, palette: leather (brown); lore hint: "Cada paso que da queda marcado con una trampa invisible."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Colmillo del Verdugo  `guerrero_mit`
- **Categoría:** Objeto de campeón · **Rareza:** Mítico · **Slot real:** Arma (arma) · **Set:** — · **Uso:** Asesino
- **Arena / fuente:** Botín del campeón (cualquier arena)
- **Archivo:** `assets/items/guerrero_mit.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["guerrero_mit"]`)
- **Efecto (para que el arte lo cuente):** Triple Golpe: contra enemigos con menos de 30% de vida, el golpe final hace +22% de daño. / Sobrecarga Mítica: Con menos de 50% de vida: +15% de daño y +15% de velocidad de ataque / Avivar las Llamas: +25% de daño contra enemigos que están ardiendo
- **Descripción visual:** daga/colmillo de acero (gris azulado). Bebe con más sed cuanto más débil está su presa.
- **Prompt:** `Colmillo del Verdugo — game item icon, a dagger/fang blade, palette: steel (bluish grey); lore hint: "Bebe con más sed cuanto más débil está su presa."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Cristal de Invierno Eterno  `mago_leg`
- **Categoría:** Objeto de campeón · **Rareza:** Legendario · **Slot real:** Casco (casco) · **Set:** — · **Uso:** Mago
- **Arena / fuente:** Botín del campeón (cualquier arena)
- **Archivo:** `assets/items/mago_leg.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["mago_leg"]`)
- **Efecto (para que el arte lo cuente):** Nova de Escarcha: los enemigos cerca del centro quedan aturdidos 0,35 s. / Guardia Juramentada: Los aliados cerca tuyo reciben 10% menos daño
- **Descripción visual:** cristal/gema de hielo (azul glaciar, celeste, blanco). Extraído de un glaciar que nunca ha visto el sol.
- **Prompt:** `Cristal de Invierno Eterno — game item icon, a crystal, palette: ice (glacier blue, cyan, white); lore hint: "Extraído de un glaciar que nunca ha visto el sol."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Corazón del Muro Eterno  `mago_mit`
- **Categoría:** Objeto de campeón · **Rareza:** Mítico · **Slot real:** Arma (arma) · **Set:** — · **Uso:** Mago
- **Arena / fuente:** Botín del campeón (cualquier arena)
- **Archivo:** `assets/items/mago_mit.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["mago_mit"]`)
- **Efecto (para que el arte lo cuente):** Muro de Fuego: mientras dura, todo tu daño aumenta 7%. / Sobrecarga Mítica: Con menos de 50% de vida: +15% de daño y +15% de velocidad de ataque / Golpe Sísmico: Los críticos generan una onda de choque que aturde
- **Descripción visual:** corazón de acero (gris azulado). El fuego que jamás se apaga, ni siquiera cuando el Mago descansa.
- **Prompt:** `Corazón del Muro Eterno — game item icon, a heart relic, palette: steel (bluish grey); lore hint: "El fuego que jamás se apaga, ni siquiera cuando el Mago descansa."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Cáliz de Sobreabundancia  `soporte_leg`
- **Categoría:** Objeto de campeón · **Rareza:** Legendario · **Slot real:** Pechera (pechera) · **Set:** — · **Uso:** Soporte
- **Arena / fuente:** Botín del campeón (cualquier arena)
- **Archivo:** `assets/items/soporte_leg.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["soporte_leg"]`)
- **Efecto (para que el arte lo cuente):** El exceso de curación se convierte en escudo (15% de lo que sobra). / +15% exceso de curación → escudo / Resonancia Arcana: Al lanzar una habilidad, una onda de energía golpea a tu alrededor
- **Descripción visual:** cáliz de acero (gris azulado). Nunca se vacía del todo: siempre queda algo para dar.
- **Prompt:** `Cáliz de Sobreabundancia — game item icon, a chalice, palette: steel (bluish grey); lore hint: "Nunca se vacía del todo: siempre queda algo para dar."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Aura de la Consagración  `soporte_mit`
- **Categoría:** Objeto de campeón · **Rareza:** Mítico · **Slot real:** Arma (arma) · **Set:** — · **Uso:** Soporte
- **Arena / fuente:** Botín del campeón (cualquier arena)
- **Archivo:** `assets/items/soporte_mit.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["soporte_mit"]`)
- **Efecto (para que el arte lo cuente):** Bendición de Guerra: además daña a los enemigos cercanos (14% de tu daño). / Sobrecarga Mítica: Con menos de 50% de vida: +15% de daño y +15% de velocidad de ataque / Avivar las Llamas: +25% de daño contra enemigos que están ardiendo
- **Descripción visual:** espada de acero (gris azulado). Bendice el arma de un aliado con un eco ofensivo propio.
- **Prompt:** `Aura de la Consagración — game item icon, a sword, palette: steel (bluish grey); lore hint: "Bendice el arma de un aliado con un eco ofensivo propio."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Yugo de la Furia  `segador_leg`
- **Categoría:** Objeto de campeón · **Rareza:** Legendario · **Slot real:** Pechera (pechera) · **Set:** — · **Uso:** Segador Olvidado
- **Arena / fuente:** Botín del campeón (cualquier arena)
- **Archivo:** `assets/items/segador_leg.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["segador_leg"]`)
- **Efecto (para que el arte lo cuente):** Armadura de la Furia: +6% de robo de vida mientras está activa. / Guardia Juramentada: Los aliados cerca tuyo reciben 10% menos daño
- **Descripción visual:** coraza/peto de acero (gris azulado). Cuanto más aprieta, más fuerte se vuelve quien lo lleva.
- **Prompt:** `Yugo de la Furia — game item icon, a chest armor, palette: steel (bluish grey); lore hint: "Cuanto más aprieta, más fuerte se vuelve quien lo lleva."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Corazón Carmesí  `segador_mit`
- **Categoría:** Objeto de campeón · **Rareza:** Mítico · **Slot real:** Arma (arma) · **Set:** — · **Uso:** Segador Olvidado
- **Arena / fuente:** Botín del campeón (cualquier arena)
- **Archivo:** `assets/items/segador_mit.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["segador_mit"]`)
- **Efecto (para que el arte lo cuente):** Hasta +22% de daño según la vida que te falta. / +22% daño según vida faltante / Guardián Mítico: La primera vez que te quedás sin escudo en la partida, recibís un escudo de emergencia del 20% de tu vida / Gracia Veloz: Curar a un aliado les da a los dos velocidad por 2,5 s
- **Descripción visual:** corazón de sangre (carmesí, rojo oscuro). Late más rápido mientras menos le queda por perder.
- **Prompt:** `Corazón Carmesí — game item icon, a heart relic, palette: blood (crimson, dark red); lore hint: "Late más rápido mientras menos le queda por perder."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Fragmento de Recarga  `axiom_leg`
- **Categoría:** Objeto de campeón · **Rareza:** Legendario · **Slot real:** Botas (botas) · **Set:** — · **Uso:** Axiom
- **Arena / fuente:** Botín del campeón (cualquier arena)
- **Archivo:** `assets/items/axiom_leg.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["axiom_leg"]`)
- **Efecto (para que el arte lo cuente):** Teletransporte: al llegar recibís un escudo del 7% de tu vida. / Escarcha Viva: Tus básicos ralentizan; cada 6 golpes congelan al objetivo
- **Descripción visual:** botas de cuero (marrón). Un trozo de código que nunca terminó de compilar.
- **Prompt:** `Fragmento de Recarga — game item icon, a boots, palette: leather (brown); lore hint: "Un trozo de código que nunca terminó de compilar."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Núcleo de Ejecución Forzada  `axiom_mit`
- **Categoría:** Objeto de campeón · **Rareza:** Mítico · **Slot real:** Arma (arma) · **Set:** — · **Uso:** Axiom
- **Arena / fuente:** Botín del campeón (cualquier arena)
- **Archivo:** `assets/items/axiom_mit.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["axiom_mit"]`)
- **Efecto (para que el arte lo cuente):** Sobrescribir: el multiplicador de ejecución sube +0,35. / Guardián Mítico: La primera vez que te quedás sin escudo en la partida, recibís un escudo de emergencia del 20% de tu vida / Estallido Ígneo: Al matar, el enemigo puede estallar en llamas y dañar a los cercanos
- **Descripción visual:** orbe de acero (gris azulado). Encuentra la vulnerabilidad exacta antes de que exista.
- **Prompt:** `Núcleo de Ejecución Forzada — game item icon, an orb, palette: steel (bluish grey); lore hint: "Encuentra la vulnerabilidad exacta antes de que exista."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Lágrima del Augurio  `profeta_leg`
- **Categoría:** Objeto de campeón · **Rareza:** Legendario · **Slot real:** Casco (casco) · **Set:** — · **Uso:** La Profeta
- **Arena / fuente:** Botín del campeón (cualquier arena)
- **Archivo:** `assets/items/profeta_leg.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["profeta_leg"]`)
- **Efecto (para que el arte lo cuente):** Danza del Augurio: el radio de aturdimiento crece 12%. / Filo del Verdugo: +60% de daño a enemigos comunes y élites con menos de 20% de vida
- **Descripción visual:** cristal/gema de luz sagrada (dorado, marfil). Cada lágrima que cae es un futuro que ya no ocurrirá.
- **Prompt:** `Lágrima del Augurio — game item icon, a crystal, palette: holy light (gold, ivory); lore hint: "Cada lágrima que cae es un futuro que ya no ocurrirá."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Cáliz del Sacrificio Menor  `profeta_mit`
- **Categoría:** Objeto de campeón · **Rareza:** Mítico · **Slot real:** Pechera (pechera) · **Set:** — · **Uso:** La Profeta
- **Arena / fuente:** Botín del campeón (cualquier arena)
- **Archivo:** `assets/items/profeta_mit.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["profeta_mit"]`)
- **Efecto (para que el arte lo cuente):** Sacrificio: curás 12% más. / Guardián Mítico: La primera vez que te quedás sin escudo en la partida, recibís un escudo de emergencia del 20% de tu vida / Filo Sediento: Tus golpes básicos abren heridas que sangran
- **Descripción visual:** cáliz de acero (gris azulado). Un poco de vida propia a cambio de mucha vida ajena.
- **Prompt:** `Cáliz del Sacrificio Menor — game item icon, a chalice, palette: steel (bluish grey); lore hint: "Un poco de vida propia a cambio de mucha vida ajena."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

## 5. Piezas de set

Las piezas de un set tienen que leerse como **un conjunto**: el mismo metal, el mismo motivo y el color del aura del set como acento.

### Set de Lucifer  `lucifer` — Fuego · riesgo · agresión

Aura rgb(255,110,40) · 6 piezas · sale más en: Arena Infernal · completo: INFIERNO DESATADO: +15% daño y +8% robo de vida. Con menos de 50% de vida tus golpes básicos incendian y tus asesinatos estallan en llamas.

#### Espada de Lucifer  `lucifer_arma`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Arma (arma) · **Set:** Set de Lucifer · **Uso:** Universal
- **Arena / fuente:** Arena Infernal
- **Archivo:** `assets/items/lucifer_arma.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["lucifer_arma"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** espada de color del set (rgb 255,110,40). Forjado en las profundidades del Infierno para un campeón caído que se negó a arrodillarse.
- **Prompt:** `Espada de Lucifer — game item icon, a sword, palette: the set color rgb(255,110,40) as accent; lore hint: "Forjado en las profundidades del Infierno para un campeón caído que se negó a arrodillarse."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Escudo de Lucifer  `lucifer_escudo`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Escudo (escudo) · **Set:** Set de Lucifer · **Uso:** Universal
- **Arena / fuente:** Arena Infernal
- **Archivo:** `assets/items/lucifer_escudo.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["lucifer_escudo"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** escudo de cometa de color del set (rgb 255,110,40). Forjado en las profundidades del Infierno para un campeón caído que se negó a arrodillarse.
- **Prompt:** `Escudo de Lucifer — game item icon, a kite shield, palette: the set color rgb(255,110,40) as accent; lore hint: "Forjado en las profundidades del Infierno para un campeón caído que se negó a arrodillarse."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Casco de Lucifer  `lucifer_casco`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Casco (casco) · **Set:** Set de Lucifer · **Uso:** Universal
- **Arena / fuente:** Arena Infernal
- **Archivo:** `assets/items/lucifer_casco.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["lucifer_casco"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** yelmo de color del set (rgb 255,110,40). Forjado en las profundidades del Infierno para un campeón caído que se negó a arrodillarse.
- **Prompt:** `Casco de Lucifer — game item icon, a helmet, palette: the set color rgb(255,110,40) as accent; lore hint: "Forjado en las profundidades del Infierno para un campeón caído que se negó a arrodillarse."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Pechera de Lucifer  `lucifer_pechera`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Pechera (pechera) · **Set:** Set de Lucifer · **Uso:** Universal
- **Arena / fuente:** Arena Infernal
- **Archivo:** `assets/items/lucifer_pechera.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["lucifer_pechera"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** coraza/peto de color del set (rgb 255,110,40). Forjado en las profundidades del Infierno para un campeón caído que se negó a arrodillarse.
- **Prompt:** `Pechera de Lucifer — game item icon, a chest armor, palette: the set color rgb(255,110,40) as accent; lore hint: "Forjado en las profundidades del Infierno para un campeón caído que se negó a arrodillarse."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Guantes de Lucifer  `lucifer_guantes`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Guantes (guantes) · **Set:** Set de Lucifer · **Uso:** Universal
- **Arena / fuente:** Arena Infernal
- **Archivo:** `assets/items/lucifer_guantes.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["lucifer_guantes"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** guantes de color del set (rgb 255,110,40). Forjado en las profundidades del Infierno para un campeón caído que se negó a arrodillarse.
- **Prompt:** `Guantes de Lucifer — game item icon, a gloves, palette: the set color rgb(255,110,40) as accent; lore hint: "Forjado en las profundidades del Infierno para un campeón caído que se negó a arrodillarse."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Botas de Lucifer  `lucifer_botas`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Botas (botas) · **Set:** Set de Lucifer · **Uso:** Universal
- **Arena / fuente:** Arena Infernal
- **Archivo:** `assets/items/lucifer_botas.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["lucifer_botas"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** botas de color del set (rgb 255,110,40). Forjado en las profundidades del Infierno para un campeón caído que se negó a arrodillarse.
- **Prompt:** `Botas de Lucifer — game item icon, a boots, palette: the set color rgb(255,110,40) as accent; lore hint: "Forjado en las profundidades del Infierno para un campeón caído que se negó a arrodillarse."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

### Pacto del Glaciar  `glaciar` — Hielo · control

Aura rgb(150,220,255) · 4 piezas · sale más en: Arena de Hielo, Arena Acuática · completo: FRAGMENTOS: golpear enemigos ralentizados acumula fragmentos. Con 5, o si muere, estalla una explosión glacial que daña y congela alrededor.

#### Colmillo del Glaciar  `glaciar_arma`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Arma (arma) · **Set:** Pacto del Glaciar · **Uso:** Universal
- **Arena / fuente:** Arena de Hielo, Arena Acuática
- **Archivo:** `assets/items/glaciar_arma.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["glaciar_arma"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** daga/colmillo de color del set (rgb 150,220,255). Un juramento sellado en el corazón de un glaciar que nunca se derritió.
- **Prompt:** `Colmillo del Glaciar — game item icon, a dagger/fang blade, palette: the set color rgb(150,220,255) as accent; lore hint: "Un juramento sellado en el corazón de un glaciar que nunca se derritió."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Diadema de Escarcha  `glaciar_casco`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Casco (casco) · **Set:** Pacto del Glaciar · **Uso:** Universal
- **Arena / fuente:** Arena de Hielo, Arena Acuática
- **Archivo:** `assets/items/glaciar_casco.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["glaciar_casco"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** diadema/aureola de color del set (rgb 150,220,255). Un juramento sellado en el corazón de un glaciar que nunca se derritió.
- **Prompt:** `Diadema de Escarcha — game item icon, a circlet, palette: the set color rgb(150,220,255) as accent; lore hint: "Un juramento sellado en el corazón de un glaciar que nunca se derritió."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Coraza del Invierno  `glaciar_pechera`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Pechera (pechera) · **Set:** Pacto del Glaciar · **Uso:** Universal
- **Arena / fuente:** Arena de Hielo, Arena Acuática
- **Archivo:** `assets/items/glaciar_pechera.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["glaciar_pechera"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** coraza/peto de color del set (rgb 150,220,255). Un juramento sellado en el corazón de un glaciar que nunca se derritió.
- **Prompt:** `Coraza del Invierno — game item icon, a chest armor, palette: the set color rgb(150,220,255) as accent; lore hint: "Un juramento sellado en el corazón de un glaciar que nunca se derritió."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Garras Gélidas  `glaciar_guantes`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Guantes (guantes) · **Set:** Pacto del Glaciar · **Uso:** Universal
- **Arena / fuente:** Arena de Hielo, Arena Acuática
- **Archivo:** `assets/items/glaciar_guantes.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["glaciar_guantes"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** garras de color del set (rgb 150,220,255). Un juramento sellado en el corazón de un glaciar que nunca se derritió.
- **Prompt:** `Garras Gélidas — game item icon, a claw gloves, palette: the set color rgb(150,220,255) as accent; lore hint: "Un juramento sellado en el corazón de un glaciar que nunca se derritió."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

### Corazón del Coloso  `coloso` — Tanque · absorber

Aura rgb(230,190,110) · 4 piezas · sale más en: La Fortaleza Sin Fin, Laberinto Maldito · completo: ONDA COLOSAL: el daño que mitigás o absorbés se acumula. Al llegar al 30% de tu vida, liberás una onda que daña y aturde enemigos y escuda a los aliados cercanos.

#### Bastión del Coloso  `coloso_escudo`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Escudo (escudo) · **Set:** Corazón del Coloso · **Uso:** Universal
- **Arena / fuente:** La Fortaleza Sin Fin, Laberinto Maldito
- **Archivo:** `assets/items/coloso_escudo.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["coloso_escudo"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** pavés/escudo torre de color del set (rgb 230,190,110). Late despacio, como una montaña que respira.
- **Prompt:** `Bastión del Coloso — game item icon, a tower shield, palette: the set color rgb(230,190,110) as accent; lore hint: "Late despacio, como una montaña que respira."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Yelmo del Coloso  `coloso_casco`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Casco (casco) · **Set:** Corazón del Coloso · **Uso:** Universal
- **Arena / fuente:** La Fortaleza Sin Fin, Laberinto Maldito
- **Archivo:** `assets/items/coloso_casco.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["coloso_casco"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** yelmo de color del set (rgb 230,190,110). Late despacio, como una montaña que respira.
- **Prompt:** `Yelmo del Coloso — game item icon, a helmet, palette: the set color rgb(230,190,110) as accent; lore hint: "Late despacio, como una montaña que respira."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Corazón de Piedra  `coloso_pechera`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Pechera (pechera) · **Set:** Corazón del Coloso · **Uso:** Universal
- **Arena / fuente:** La Fortaleza Sin Fin, Laberinto Maldito
- **Archivo:** `assets/items/coloso_pechera.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["coloso_pechera"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** corazón de color del set (rgb 230,190,110). Late despacio, como una montaña que respira.
- **Prompt:** `Corazón de Piedra — game item icon, a heart relic, palette: the set color rgb(230,190,110) as accent; lore hint: "Late despacio, como una montaña que respira."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Pisada del Coloso  `coloso_botas`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Botas (botas) · **Set:** Corazón del Coloso · **Uso:** Universal
- **Arena / fuente:** La Fortaleza Sin Fin, Laberinto Maldito
- **Archivo:** `assets/items/coloso_botas.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["coloso_botas"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** botas de color del set (rgb 230,190,110). Late despacio, como una montaña que respira.
- **Prompt:** `Pisada del Coloso — game item icon, a boots, palette: the set color rgb(230,190,110) as accent; lore hint: "Late despacio, como una montaña que respira."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

### Réquiem del Sepulturero  `sepulturero` — Invocaciones · no-muertos

Aura rgb(122,212,138) · 4 piezas · sale más en: El Reino Micelial, Ruinas del Bosque · completo: CALIDAD SOBRE CANTIDAD: cada 16 s, dos esqueletos se fusionan en un Esqueleto Élite. Sin esqueletos, las bajas de élites levantan un guerrero no-muerto (máx. 2).

#### Pala del Sepulturero  `sepulturero_arma`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Arma (arma) · **Set:** Réquiem del Sepulturero · **Uso:** Universal
- **Arena / fuente:** El Reino Micelial, Ruinas del Bosque
- **Archivo:** `assets/items/sepulturero_arma.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["sepulturero_arma"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** pala de color del set (rgb 122,212,138). Cava tumbas para enemigos y aliados por igual. A veces las llena al revés.
- **Prompt:** `Pala del Sepulturero — game item icon, a shovel, palette: the set color rgb(122,212,138) as accent; lore hint: "Cava tumbas para enemigos y aliados por igual. A veces las llena al revés."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Capucha del Réquiem  `sepulturero_casco`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Casco (casco) · **Set:** Réquiem del Sepulturero · **Uso:** Universal
- **Arena / fuente:** El Reino Micelial, Ruinas del Bosque
- **Archivo:** `assets/items/sepulturero_casco.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["sepulturero_casco"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** capucha de color del set (rgb 122,212,138). Cava tumbas para enemigos y aliados por igual. A veces las llena al revés.
- **Prompt:** `Capucha del Réquiem — game item icon, a hood, palette: the set color rgb(122,212,138) as accent; lore hint: "Cava tumbas para enemigos y aliados por igual. A veces las llena al revés."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Mortaja Cosida  `sepulturero_pechera`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Pechera (pechera) · **Set:** Réquiem del Sepulturero · **Uso:** Universal
- **Arena / fuente:** El Reino Micelial, Ruinas del Bosque
- **Archivo:** `assets/items/sepulturero_pechera.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["sepulturero_pechera"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** túnica de color del set (rgb 122,212,138). Cava tumbas para enemigos y aliados por igual. A veces las llena al revés.
- **Prompt:** `Mortaja Cosida — game item icon, a robe, palette: the set color rgb(122,212,138) as accent; lore hint: "Cava tumbas para enemigos y aliados por igual. A veces las llena al revés."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Manos de Tierra  `sepulturero_guantes`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Guantes (guantes) · **Set:** Réquiem del Sepulturero · **Uso:** Universal
- **Arena / fuente:** El Reino Micelial, Ruinas del Bosque
- **Archivo:** `assets/items/sepulturero_guantes.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["sepulturero_guantes"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** garras de color del set (rgb 122,212,138). Cava tumbas para enemigos y aliados por igual. A veces las llena al revés.
- **Prompt:** `Manos de Tierra — game item icon, a claw gloves, palette: the set color rgb(122,212,138) as accent; lore hint: "Cava tumbas para enemigos y aliados por igual. A veces las llena al revés."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

### Tempestad Eterna  `tempestad` — Electricidad · cadena · movilidad

Aura rgb(150,190,255) · 4 piezas · sale más en: Arena Acuática, Arena Divina · completo: TEMPESTAD: cada golpe carga la tormenta. Con la carga completa, tu siguiente habilidad desata una tormenta de 6 rayos encadenados.

#### Cetro del Relámpago  `tempestad_arma`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Arma (arma) · **Set:** Tempestad Eterna · **Uso:** Universal
- **Arena / fuente:** Arena Acuática, Arena Divina
- **Archivo:** `assets/items/tempestad_arma.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["tempestad_arma"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** cetro de color del set (rgb 150,190,255). El trueno no pide permiso. Llega, y ya pasó.
- **Prompt:** `Cetro del Relámpago — game item icon, a scepter, palette: the set color rgb(150,190,255) as accent; lore hint: "El trueno no pide permiso. Llega, y ya pasó."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Corona de Nubes  `tempestad_casco`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Casco (casco) · **Set:** Tempestad Eterna · **Uso:** Universal
- **Arena / fuente:** Arena Acuática, Arena Divina
- **Archivo:** `assets/items/tempestad_casco.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["tempestad_casco"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** corona de color del set (rgb 150,190,255). El trueno no pide permiso. Llega, y ya pasó.
- **Prompt:** `Corona de Nubes — game item icon, a crown, palette: the set color rgb(150,190,255) as accent; lore hint: "El trueno no pide permiso. Llega, y ya pasó."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Guantes de Descarga  `tempestad_guantes`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Guantes (guantes) · **Set:** Tempestad Eterna · **Uso:** Universal
- **Arena / fuente:** Arena Acuática, Arena Divina
- **Archivo:** `assets/items/tempestad_guantes.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["tempestad_guantes"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** guantes de color del set (rgb 150,190,255). El trueno no pide permiso. Llega, y ya pasó.
- **Prompt:** `Guantes de Descarga — game item icon, a gloves, palette: the set color rgb(150,190,255) as accent; lore hint: "El trueno no pide permiso. Llega, y ya pasó."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Botas del Rayo  `tempestad_botas`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Botas (botas) · **Set:** Tempestad Eterna · **Uso:** Universal
- **Arena / fuente:** Arena Acuática, Arena Divina
- **Archivo:** `assets/items/tempestad_botas.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["tempestad_botas"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** botas de color del set (rgb 150,190,255). El trueno no pide permiso. Llega, y ya pasó.
- **Prompt:** `Botas del Rayo — game item icon, a boots, palette: the set color rgb(150,190,255) as accent; lore hint: "El trueno no pide permiso. Llega, y ya pasó."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

### Sangre del Berserker  `berserker` — Riesgo · recompensa

Aura rgb(230,50,40) · 4 piezas · sale más en: Arena Infernal, La Fortaleza Sin Fin · completo: FRENESÍ: al bajar del 30% de vida entrás en estado Berserker 6 s: +25% robo de vida, +25% velocidad de ataque y +20% daño. Enfriamiento interno 40 s.

#### Hacha Sedienta  `berserker_arma`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Arma (arma) · **Set:** Sangre del Berserker · **Uso:** Universal
- **Arena / fuente:** Arena Infernal, La Fortaleza Sin Fin
- **Archivo:** `assets/items/berserker_arma.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["berserker_arma"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** hacha de color del set (rgb 230,50,40). Cuanto más cerca de la muerte, más claro ve el camino.
- **Prompt:** `Hacha Sedienta — game item icon, an axe, palette: the set color rgb(230,50,40) as accent; lore hint: "Cuanto más cerca de la muerte, más claro ve el camino."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Piel del Berserker  `berserker_pechera`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Pechera (pechera) · **Set:** Sangre del Berserker · **Uso:** Universal
- **Arena / fuente:** Arena Infernal, La Fortaleza Sin Fin
- **Archivo:** `assets/items/berserker_pechera.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["berserker_pechera"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** coraza/peto de color del set (rgb 230,50,40). Cuanto más cerca de la muerte, más claro ve el camino.
- **Prompt:** `Piel del Berserker — game item icon, a chest armor, palette: the set color rgb(230,50,40) as accent; lore hint: "Cuanto más cerca de la muerte, más claro ve el camino."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Puños de Sangre  `berserker_guantes`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Guantes (guantes) · **Set:** Sangre del Berserker · **Uso:** Universal
- **Arena / fuente:** Arena Infernal, La Fortaleza Sin Fin
- **Archivo:** `assets/items/berserker_guantes.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["berserker_guantes"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** guanteletes de color del set (rgb 230,50,40). Cuanto más cerca de la muerte, más claro ve el camino.
- **Prompt:** `Puños de Sangre — game item icon, a gauntlets, palette: the set color rgb(230,50,40) as accent; lore hint: "Cuanto más cerca de la muerte, más claro ve el camino."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Botas de la Carga  `berserker_botas`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Botas (botas) · **Set:** Sangre del Berserker · **Uso:** Universal
- **Arena / fuente:** Arena Infernal, La Fortaleza Sin Fin
- **Archivo:** `assets/items/berserker_botas.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["berserker_botas"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** botas de color del set (rgb 230,50,40). Cuanto más cerca de la muerte, más claro ve el camino.
- **Prompt:** `Botas de la Carga — game item icon, a boots, palette: the set color rgb(230,50,40) as accent; lore hint: "Cuanto más cerca de la muerte, más claro ve el camino."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

### Juramento del Guardián  `guardian` — Protección cooperativa

Aura rgb(143,208,255) · 4 piezas · sale más en: La Fortaleza Sin Fin, Laberinto Maldito · completo: JURAMENTO: absorber daño cerca de aliados, escudar y revivir acumulan Juramento. Completo: protección grupal (escudo + 25% menos daño recibido) por 4 s.

#### Égida del Juramento  `guardian_escudo`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Escudo (escudo) · **Set:** Juramento del Guardián · **Uso:** Universal
- **Arena / fuente:** La Fortaleza Sin Fin, Laberinto Maldito
- **Archivo:** `assets/items/guardian_escudo.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["guardian_escudo"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** rodela redonda de color del set (rgb 143,208,255). Nadie cae mientras quede uno de pie que lo haya jurado.
- **Prompt:** `Égida del Juramento — game item icon, a round buckler, palette: the set color rgb(143,208,255) as accent; lore hint: "Nadie cae mientras quede uno de pie que lo haya jurado."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Yelmo del Guardián  `guardian_casco`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Casco (casco) · **Set:** Juramento del Guardián · **Uso:** Universal
- **Arena / fuente:** La Fortaleza Sin Fin, Laberinto Maldito
- **Archivo:** `assets/items/guardian_casco.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["guardian_casco"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** yelmo de color del set (rgb 143,208,255). Nadie cae mientras quede uno de pie que lo haya jurado.
- **Prompt:** `Yelmo del Guardián — game item icon, a helmet, palette: the set color rgb(143,208,255) as accent; lore hint: "Nadie cae mientras quede uno de pie que lo haya jurado."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Peto Juramentado  `guardian_pechera`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Pechera (pechera) · **Set:** Juramento del Guardián · **Uso:** Universal
- **Arena / fuente:** La Fortaleza Sin Fin, Laberinto Maldito
- **Archivo:** `assets/items/guardian_pechera.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["guardian_pechera"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** coraza/peto de color del set (rgb 143,208,255). Nadie cae mientras quede uno de pie que lo haya jurado.
- **Prompt:** `Peto Juramentado — game item icon, a chest armor, palette: the set color rgb(143,208,255) as accent; lore hint: "Nadie cae mientras quede uno de pie que lo haya jurado."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Guanteletes de la Promesa  `guardian_guantes`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Guantes (guantes) · **Set:** Juramento del Guardián · **Uso:** Universal
- **Arena / fuente:** La Fortaleza Sin Fin, Laberinto Maldito
- **Archivo:** `assets/items/guardian_guantes.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["guardian_guantes"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** guanteletes de color del set (rgb 143,208,255). Nadie cae mientras quede uno de pie que lo haya jurado.
- **Prompt:** `Guanteletes de la Promesa — game item icon, a gauntlets, palette: the set color rgb(143,208,255) as accent; lore hint: "Nadie cae mientras quede uno de pie que lo haya jurado."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

### Profecía del Alba  `alba` — Soporte · curación

Aura rgb(255,230,140) · 4 piezas · sale más en: Ruinas del Bosque, Arena Acuática · completo: AMANECER: la curación EFECTIVA (no la que sobra) acumula luz. Al completarse, tu siguiente curación libera una onda de regeneración y +15% daño a los aliados cercanos.

#### Báculo del Alba  `alba_arma`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Arma (arma) · **Set:** Profecía del Alba · **Uso:** Universal
- **Arena / fuente:** Ruinas del Bosque, Arena Acuática
- **Archivo:** `assets/items/alba_arma.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["alba_arma"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** bastón/báculo de color del set (rgb 255,230,140). Cada amanecer fue anunciado por alguien que se negó a dejar morir la noche anterior.
- **Prompt:** `Báculo del Alba — game item icon, a staff, palette: the set color rgb(255,230,140) as accent; lore hint: "Cada amanecer fue anunciado por alguien que se negó a dejar morir la noche anterior."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Aureola Profética  `alba_casco`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Casco (casco) · **Set:** Profecía del Alba · **Uso:** Universal
- **Arena / fuente:** Ruinas del Bosque, Arena Acuática
- **Archivo:** `assets/items/alba_casco.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["alba_casco"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** diadema/aureola de color del set (rgb 255,230,140). Cada amanecer fue anunciado por alguien que se negó a dejar morir la noche anterior.
- **Prompt:** `Aureola Profética — game item icon, a circlet, palette: the set color rgb(255,230,140) as accent; lore hint: "Cada amanecer fue anunciado por alguien que se negó a dejar morir la noche anterior."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Túnica del Amanecer  `alba_pechera`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Pechera (pechera) · **Set:** Profecía del Alba · **Uso:** Universal
- **Arena / fuente:** Ruinas del Bosque, Arena Acuática
- **Archivo:** `assets/items/alba_pechera.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["alba_pechera"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** túnica de color del set (rgb 255,230,140). Cada amanecer fue anunciado por alguien que se negó a dejar morir la noche anterior.
- **Prompt:** `Túnica del Amanecer — game item icon, a robe, palette: the set color rgb(255,230,140) as accent; lore hint: "Cada amanecer fue anunciado por alguien que se negó a dejar morir la noche anterior."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Sandalias de Luz  `alba_botas`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Botas (botas) · **Set:** Profecía del Alba · **Uso:** Universal
- **Arena / fuente:** Ruinas del Bosque, Arena Acuática
- **Archivo:** `assets/items/alba_botas.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["alba_botas"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** sandalias de color del set (rgb 255,230,140). Cada amanecer fue anunciado por alguien que se negó a dejar morir la noche anterior.
- **Prompt:** `Sandalias de Luz — game item icon, a sandals, palette: the set color rgb(255,230,140) as accent; lore hint: "Cada amanecer fue anunciado por alguien que se negó a dejar morir la noche anterior."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

### Sombra del Cazador  `cazador` — Asesino · objetivo único

Aura rgb(190,120,255) · 4 piezas · sale más en: Ruinas del Bosque, El Reino Micelial · completo: PRESA MARCADA: golpear un élite/subjefe/jefe lo marca. Golpearlo seguido acumula Concentración (hasta 10): +3% crítico y +5% daño crítico por carga. Cambiar de objetivo la reduce a la mitad.

#### Colmillo de la Sombra  `cazador_arma`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Arma (arma) · **Set:** Sombra del Cazador · **Uso:** Universal
- **Arena / fuente:** Ruinas del Bosque, El Reino Micelial
- **Archivo:** `assets/items/cazador_arma.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["cazador_arma"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** daga/colmillo de color del set (rgb 190,120,255). No persigue a la manada. Persigue al que la guía.
- **Prompt:** `Colmillo de la Sombra — game item icon, a dagger/fang blade, palette: the set color rgb(190,120,255) as accent; lore hint: "No persigue a la manada. Persigue al que la guía."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Máscara del Acecho  `cazador_casco`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Casco (casco) · **Set:** Sombra del Cazador · **Uso:** Universal
- **Arena / fuente:** Ruinas del Bosque, El Reino Micelial
- **Archivo:** `assets/items/cazador_casco.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["cazador_casco"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** máscara/visor de color del set (rgb 190,120,255). No persigue a la manada. Persigue al que la guía.
- **Prompt:** `Máscara del Acecho — game item icon, a mask, palette: the set color rgb(190,120,255) as accent; lore hint: "No persigue a la manada. Persigue al que la guía."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Guantes Silenciosos  `cazador_guantes`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Guantes (guantes) · **Set:** Sombra del Cazador · **Uso:** Universal
- **Arena / fuente:** Ruinas del Bosque, El Reino Micelial
- **Archivo:** `assets/items/cazador_guantes.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["cazador_guantes"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** guantes de color del set (rgb 190,120,255). No persigue a la manada. Persigue al que la guía.
- **Prompt:** `Guantes Silenciosos — game item icon, a gloves, palette: the set color rgb(190,120,255) as accent; lore hint: "No persigue a la manada. Persigue al que la guía."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Pasos de Sombra  `cazador_botas`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Botas (botas) · **Set:** Sombra del Cazador · **Uso:** Universal
- **Arena / fuente:** Ruinas del Bosque, El Reino Micelial
- **Archivo:** `assets/items/cazador_botas.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["cazador_botas"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** botas de color del set (rgb 190,120,255). No persigue a la manada. Persigue al que la guía.
- **Prompt:** `Pasos de Sombra — game item icon, a boots, palette: the set color rgb(190,120,255) as accent; lore hint: "No persigue a la manada. Persigue al que la guía."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

### Ojo del Arcano  `arcano` — Mago · rotación

Aura rgb(200,140,255) · 4 piezas · sale más en: El Reino Micelial, Arena de Hielo · completo: RESONANCIA: usar habilidades DISTINTAS seguidas acumula Resonancia (repetir la misma la reinicia). Con 3, tus habilidades hacen +45% daño durante 4 s.

#### Orbe del Arcano  `arcano_arma`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Arma (arma) · **Set:** Ojo del Arcano · **Uso:** Universal
- **Arena / fuente:** El Reino Micelial, Arena de Hielo
- **Archivo:** `assets/items/arcano_arma.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["arcano_arma"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** orbe de color del set (rgb 200,140,255). Ve el hechizo antes de que el hechicero lo piense.
- **Prompt:** `Orbe del Arcano — game item icon, an orb, palette: the set color rgb(200,140,255) as accent; lore hint: "Ve el hechizo antes de que el hechicero lo piense."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Ojo Abierto  `arcano_casco`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Casco (casco) · **Set:** Ojo del Arcano · **Uso:** Universal
- **Arena / fuente:** El Reino Micelial, Arena de Hielo
- **Archivo:** `assets/items/arcano_casco.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["arcano_casco"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** diadema/aureola de color del set (rgb 200,140,255). Ve el hechizo antes de que el hechicero lo piense.
- **Prompt:** `Ojo Abierto — game item icon, a circlet, palette: the set color rgb(200,140,255) as accent; lore hint: "Ve el hechizo antes de que el hechicero lo piense."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Dedos del Sello  `arcano_guantes`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Guantes (guantes) · **Set:** Ojo del Arcano · **Uso:** Universal
- **Arena / fuente:** El Reino Micelial, Arena de Hielo
- **Archivo:** `assets/items/arcano_guantes.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["arcano_guantes"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** guantes de color del set (rgb 200,140,255). Ve el hechizo antes de que el hechicero lo piense.
- **Prompt:** `Dedos del Sello — game item icon, a gloves, palette: the set color rgb(200,140,255) as accent; lore hint: "Ve el hechizo antes de que el hechicero lo piense."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Pasos del Vacío  `arcano_botas`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Botas (botas) · **Set:** Ojo del Arcano · **Uso:** Universal
- **Arena / fuente:** El Reino Micelial, Arena de Hielo
- **Archivo:** `assets/items/arcano_botas.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["arcano_botas"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** botas de color del set (rgb 200,140,255). Ve el hechizo antes de que el hechicero lo piense.
- **Prompt:** `Pasos del Vacío — game item icon, a boots, palette: the set color rgb(200,140,255) as accent; lore hint: "Ve el hechizo antes de que el hechicero lo piense."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

### Rey del Laberinto  `laberinto` — Movimiento · posicionamiento

Aura rgb(220,200,150) · 4 piezas · sale más en: Laberinto Maldito, Arena Acuática · completo: IMPULSO: esquivar avisos de ataque y pasar tiempo sin recibir daño acumula Impulso (hasta 10): +2% velocidad y +2,5% daño por carga. Un golpe fuerte lo rompe.

#### Corona del Rey Errante  `laberinto_casco`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Casco (casco) · **Set:** Rey del Laberinto · **Uso:** Universal
- **Arena / fuente:** Laberinto Maldito, Arena Acuática
- **Archivo:** `assets/items/laberinto_casco.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["laberinto_casco"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** corona de color del set (rgb 220,200,150). Conoce cada pasillo porque nunca se quedó quieto en ninguno.
- **Prompt:** `Corona del Rey Errante — game item icon, a crown, palette: the set color rgb(220,200,150) as accent; lore hint: "Conoce cada pasillo porque nunca se quedó quieto en ninguno."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Manto de los Pasillos  `laberinto_pechera`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Pechera (pechera) · **Set:** Rey del Laberinto · **Uso:** Universal
- **Arena / fuente:** Laberinto Maldito, Arena Acuática
- **Archivo:** `assets/items/laberinto_pechera.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["laberinto_pechera"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** manto de color del set (rgb 220,200,150). Conoce cada pasillo porque nunca se quedó quieto en ninguno.
- **Prompt:** `Manto de los Pasillos — game item icon, a cloak, palette: the set color rgb(220,200,150) as accent; lore hint: "Conoce cada pasillo porque nunca se quedó quieto en ninguno."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Guantes del Cartógrafo  `laberinto_guantes`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Guantes (guantes) · **Set:** Rey del Laberinto · **Uso:** Universal
- **Arena / fuente:** Laberinto Maldito, Arena Acuática
- **Archivo:** `assets/items/laberinto_guantes.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["laberinto_guantes"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** guantes de color del set (rgb 220,200,150). Conoce cada pasillo porque nunca se quedó quieto en ninguno.
- **Prompt:** `Guantes del Cartógrafo — game item icon, a gloves, palette: the set color rgb(220,200,150) as accent; lore hint: "Conoce cada pasillo porque nunca se quedó quieto en ninguno."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Botas del Rey  `laberinto_botas`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Botas (botas) · **Set:** Rey del Laberinto · **Uso:** Universal
- **Arena / fuente:** Laberinto Maldito, Arena Acuática
- **Archivo:** `assets/items/laberinto_botas.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["laberinto_botas"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** botas de color del set (rgb 220,200,150). Conoce cada pasillo porque nunca se quedó quieto en ninguno.
- **Prompt:** `Botas del Rey — game item icon, a boots, palette: the set color rgb(220,200,150) as accent; lore hint: "Conoce cada pasillo porque nunca se quedó quieto en ninguno."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

### Baluarte Inquebrantable  `baluarte` — Tanque · masa · control · solo Tanque

Aura rgb(170,200,235) · 4 piezas · sale más en: — · completo: GOLPE SÍSMICO: cada 3er golpe básico es un pisotón que daña, empuja y aturde a su alrededor. Con el Grito de Guerra activo, la onda es el doble de grande.

#### Pavés del Baluarte  `baluarte_escudo`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Escudo (escudo) · **Set:** Baluarte Inquebrantable · **Uso:** Tanque
- **Arena / fuente:** Botín de set
- **Archivo:** `assets/items/baluarte_escudo.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["baluarte_escudo"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** pavés/escudo torre de color del set (rgb 170,200,235). Nadie recuerda el nombre del caballero. Sí recuerdan que la horda nunca pasó de donde él estaba parado.
- **Prompt:** `Pavés del Baluarte — game item icon, a tower shield, palette: the set color rgb(170,200,235) as accent; lore hint: "Nadie recuerda el nombre del caballero. Sí recuerdan que la horda nunca pasó de donde él estaba parado."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Yelmo del Baluarte  `baluarte_casco`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Casco (casco) · **Set:** Baluarte Inquebrantable · **Uso:** Tanque
- **Arena / fuente:** Botín de set
- **Archivo:** `assets/items/baluarte_casco.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["baluarte_casco"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** yelmo de color del set (rgb 170,200,235). Nadie recuerda el nombre del caballero. Sí recuerdan que la horda nunca pasó de donde él estaba parado.
- **Prompt:** `Yelmo del Baluarte — game item icon, a helmet, palette: the set color rgb(170,200,235) as accent; lore hint: "Nadie recuerda el nombre del caballero. Sí recuerdan que la horda nunca pasó de donde él estaba parado."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Coraza del Baluarte  `baluarte_pechera`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Pechera (pechera) · **Set:** Baluarte Inquebrantable · **Uso:** Tanque
- **Arena / fuente:** Botín de set
- **Archivo:** `assets/items/baluarte_pechera.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["baluarte_pechera"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** coraza/peto de color del set (rgb 170,200,235). Nadie recuerda el nombre del caballero. Sí recuerdan que la horda nunca pasó de donde él estaba parado.
- **Prompt:** `Coraza del Baluarte — game item icon, a chest armor, palette: the set color rgb(170,200,235) as accent; lore hint: "Nadie recuerda el nombre del caballero. Sí recuerdan que la horda nunca pasó de donde él estaba parado."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Grebas del Baluarte  `baluarte_botas`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Botas (botas) · **Set:** Baluarte Inquebrantable · **Uso:** Tanque
- **Arena / fuente:** Botín de set
- **Archivo:** `assets/items/baluarte_botas.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["baluarte_botas"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** botas de color del set (rgb 170,200,235). Nadie recuerda el nombre del caballero. Sí recuerdan que la horda nunca pasó de donde él estaba parado.
- **Prompt:** `Grebas del Baluarte — game item icon, a boots, palette: the set color rgb(170,200,235) as accent; lore hint: "Nadie recuerda el nombre del caballero. Sí recuerdan que la horda nunca pasó de donde él estaba parado."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

### Sombra Nocturna  `nocturno` — Asesino · sangrado · desaparecer · solo Asesino

Aura rgb(150,60,90) · 4 piezas · sale más en: — · completo: SOMBRA LETAL: matar a un élite o subjefe te vuelve invisible 1,5 s (la horda te pierde) y reinicia Triple Golpe.

#### Colmillo Nocturno  `nocturno_arma`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Arma (arma) · **Set:** Sombra Nocturna · **Uso:** Asesino
- **Arena / fuente:** Botín de set
- **Archivo:** `assets/items/nocturno_arma.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["nocturno_arma"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** daga/colmillo de color del set (rgb 150,60,90). Los guardias hablan de una sombra que sangra. Nunca dicen de quién es la sangre.
- **Prompt:** `Colmillo Nocturno — game item icon, a dagger/fang blade, palette: the set color rgb(150,60,90) as accent; lore hint: "Los guardias hablan de una sombra que sangra. Nunca dicen de quién es la sangre."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Capucha Nocturna  `nocturno_casco`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Casco (casco) · **Set:** Sombra Nocturna · **Uso:** Asesino
- **Arena / fuente:** Botín de set
- **Archivo:** `assets/items/nocturno_casco.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["nocturno_casco"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** capucha de color del set (rgb 150,60,90). Los guardias hablan de una sombra que sangra. Nunca dicen de quién es la sangre.
- **Prompt:** `Capucha Nocturna — game item icon, a hood, palette: the set color rgb(150,60,90) as accent; lore hint: "Los guardias hablan de una sombra que sangra. Nunca dicen de quién es la sangre."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Guantes del Degollador  `nocturno_guantes`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Guantes (guantes) · **Set:** Sombra Nocturna · **Uso:** Asesino
- **Arena / fuente:** Botín de set
- **Archivo:** `assets/items/nocturno_guantes.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["nocturno_guantes"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** guantes de color del set (rgb 150,60,90). Los guardias hablan de una sombra que sangra. Nunca dicen de quién es la sangre.
- **Prompt:** `Guantes del Degollador — game item icon, a gloves, palette: the set color rgb(150,60,90) as accent; lore hint: "Los guardias hablan de una sombra que sangra. Nunca dicen de quién es la sangre."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Pasos Nocturnos  `nocturno_botas`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Botas (botas) · **Set:** Sombra Nocturna · **Uso:** Asesino
- **Arena / fuente:** Botín de set
- **Archivo:** `assets/items/nocturno_botas.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["nocturno_botas"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** botas de color del set (rgb 150,60,90). Los guardias hablan de una sombra que sangra. Nunca dicen de quién es la sangre.
- **Prompt:** `Pasos Nocturnos — game item icon, a boots, palette: the set color rgb(150,60,90) as accent; lore hint: "Los guardias hablan de una sombra que sangra. Nunca dicen de quién es la sangre."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

### Convergencia Elemental  `convergencia` — Mago · fuego + hielo + rayo · solo Mago

Aura rgb(200,150,255) · 4 piezas · sale más en: — · completo: CONVERGENCIA: golpear a un mismo enemigo con fuego, hielo y rayo en menos de 4 s lo hace estallar (área, 250% de daño, congela y deja ardiendo).

#### Bastón de la Convergencia  `convergencia_arma`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Arma (arma) · **Set:** Convergencia Elemental · **Uso:** Mago
- **Arena / fuente:** Botín de set
- **Archivo:** `assets/items/convergencia_arma.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["convergencia_arma"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** bastón/báculo de color del set (rgb 200,150,255). Tres escuelas que se odiaban. Un mago que se negó a elegir.
- **Prompt:** `Bastón de la Convergencia — game item icon, a staff, palette: the set color rgb(200,150,255) as accent; lore hint: "Tres escuelas que se odiaban. Un mago que se negó a elegir."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Capucha Tricolor  `convergencia_casco`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Casco (casco) · **Set:** Convergencia Elemental · **Uso:** Mago
- **Arena / fuente:** Botín de set
- **Archivo:** `assets/items/convergencia_casco.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["convergencia_casco"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** capucha de color del set (rgb 200,150,255). Tres escuelas que se odiaban. Un mago que se negó a elegir.
- **Prompt:** `Capucha Tricolor — game item icon, a hood, palette: the set color rgb(200,150,255) as accent; lore hint: "Tres escuelas que se odiaban. Un mago que se negó a elegir."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Túnica de los Tres Elementos  `convergencia_pechera`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Pechera (pechera) · **Set:** Convergencia Elemental · **Uso:** Mago
- **Arena / fuente:** Botín de set
- **Archivo:** `assets/items/convergencia_pechera.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["convergencia_pechera"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** túnica de color del set (rgb 200,150,255). Tres escuelas que se odiaban. Un mago que se negó a elegir.
- **Prompt:** `Túnica de los Tres Elementos — game item icon, a robe, palette: the set color rgb(200,150,255) as accent; lore hint: "Tres escuelas que se odiaban. Un mago que se negó a elegir."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Sellos Elementales  `convergencia_guantes`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Guantes (guantes) · **Set:** Convergencia Elemental · **Uso:** Mago
- **Arena / fuente:** Botín de set
- **Archivo:** `assets/items/convergencia_guantes.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["convergencia_guantes"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** guantes de color del set (rgb 200,150,255). Tres escuelas que se odiaban. Un mago que se negó a elegir.
- **Prompt:** `Sellos Elementales — game item icon, a gloves, palette: the set color rgb(200,150,255) as accent; lore hint: "Tres escuelas que se odiaban. Un mago que se negó a elegir."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

### Bendición del Custodio  `custodio` — Soporte · salvar a tiempo · solo Soporte

Aura rgb(255,235,160) · 4 piezas · sale más en: — · completo: ÁNGEL GUARDIÁN: cuando un aliado cerca tuyo baja de 30% de vida, recibe un escudo sagrado del 25% y 20% menos daño por 3 s (una vez cada 15 s por aliado).

#### Báculo del Custodio  `custodio_arma`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Arma (arma) · **Set:** Bendición del Custodio · **Uso:** Soporte
- **Arena / fuente:** Botín de set
- **Archivo:** `assets/items/custodio_arma.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["custodio_arma"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** bastón/báculo de color del set (rgb 255,235,160). El Custodio nunca levantó un arma. Nunca le hizo falta: nadie a su lado caía.
- **Prompt:** `Báculo del Custodio — game item icon, a staff, palette: the set color rgb(255,235,160) as accent; lore hint: "El Custodio nunca levantó un arma. Nunca le hizo falta: nadie a su lado caía."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Mitra del Custodio  `custodio_casco`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Casco (casco) · **Set:** Bendición del Custodio · **Uso:** Soporte
- **Arena / fuente:** Botín de set
- **Archivo:** `assets/items/custodio_casco.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["custodio_casco"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** corona de color del set (rgb 255,235,160). El Custodio nunca levantó un arma. Nunca le hizo falta: nadie a su lado caía.
- **Prompt:** `Mitra del Custodio — game item icon, a crown, palette: the set color rgb(255,235,160) as accent; lore hint: "El Custodio nunca levantó un arma. Nunca le hizo falta: nadie a su lado caía."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Hábito del Custodio  `custodio_pechera`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Pechera (pechera) · **Set:** Bendición del Custodio · **Uso:** Soporte
- **Arena / fuente:** Botín de set
- **Archivo:** `assets/items/custodio_pechera.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["custodio_pechera"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** túnica de color del set (rgb 255,235,160). El Custodio nunca levantó un arma. Nunca le hizo falta: nadie a su lado caía.
- **Prompt:** `Hábito del Custodio — game item icon, a robe, palette: the set color rgb(255,235,160) as accent; lore hint: "El Custodio nunca levantó un arma. Nunca le hizo falta: nadie a su lado caía."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Sandalias del Custodio  `custodio_botas`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Botas (botas) · **Set:** Bendición del Custodio · **Uso:** Soporte
- **Arena / fuente:** Botín de set
- **Archivo:** `assets/items/custodio_botas.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["custodio_botas"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** sandalias de color del set (rgb 255,235,160). El Custodio nunca levantó un arma. Nunca le hizo falta: nadie a su lado caía.
- **Prompt:** `Sandalias del Custodio — game item icon, a sandals, palette: the set color rgb(255,235,160) as accent; lore hint: "El Custodio nunca levantó un arma. Nunca le hizo falta: nadie a su lado caía."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

### Marea Roja  `marea` — Berserker · riesgo · furia · solo Segador Olvidado

Aura rgb(220,40,40) · 4 piezas · sale más en: — · completo: MAREA ROJA: cada baja con menos de 50% de vida suma Sangre (hasta 10): +3% daño y +1,5% robo de vida por carga. Con 10, tu próximo Tajo es un TAJO DE LA MUERTE: doble alcance y remata comunes y élites bajo 30%.

#### Guadaña de la Marea  `marea_arma`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Arma (arma) · **Set:** Marea Roja · **Uso:** Segador Olvidado
- **Arena / fuente:** Botín de set
- **Archivo:** `assets/items/marea_arma.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["marea_arma"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** guadaña de color del set (rgb 220,40,40). Cuanto más le quitan, más toma.
- **Prompt:** `Guadaña de la Marea — game item icon, a scythe, palette: the set color rgb(220,40,40) as accent; lore hint: "Cuanto más le quitan, más toma."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Coraza Carmesí  `marea_pechera`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Pechera (pechera) · **Set:** Marea Roja · **Uso:** Segador Olvidado
- **Arena / fuente:** Botín de set
- **Archivo:** `assets/items/marea_pechera.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["marea_pechera"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** coraza/peto de color del set (rgb 220,40,40). Cuanto más le quitan, más toma.
- **Prompt:** `Coraza Carmesí — game item icon, a chest armor, palette: the set color rgb(220,40,40) as accent; lore hint: "Cuanto más le quitan, más toma."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Garras de la Marea  `marea_guantes`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Guantes (guantes) · **Set:** Marea Roja · **Uso:** Segador Olvidado
- **Arena / fuente:** Botín de set
- **Archivo:** `assets/items/marea_guantes.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["marea_guantes"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** garras de color del set (rgb 220,40,40). Cuanto más le quitan, más toma.
- **Prompt:** `Garras de la Marea — game item icon, a claw gloves, palette: the set color rgb(220,40,40) as accent; lore hint: "Cuanto más le quitan, más toma."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Botas del Olvido  `marea_botas`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Botas (botas) · **Set:** Marea Roja · **Uso:** Segador Olvidado
- **Arena / fuente:** Botín de set
- **Archivo:** `assets/items/marea_botas.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["marea_botas"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** botas de color del set (rgb 220,40,40). Cuanto más le quitan, más toma.
- **Prompt:** `Botas del Olvido — game item icon, a boots, palette: the set color rgb(220,40,40) as accent; lore hint: "Cuanto más le quitan, más toma."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

### Acceso Raíz  `sistema` — Axiom · reglas rotas · solo Axiom

Aura rgb(70,240,210) · 4 piezas · sale más en: — · completo: RECURSIÓN: cada enemigo infectado por Sobrescribir que muere contagia el código a 2 enemigos cercanos y reduce 1 s el enfriamiento de Error 404.

#### Núcleo Raíz  `sistema_arma`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Arma (arma) · **Set:** Acceso Raíz · **Uso:** Axiom
- **Arena / fuente:** Botín de set
- **Archivo:** `assets/items/sistema_arma.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["sistema_arma"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** orbe de color del set (rgb 70,240,210). Un conjunto de permisos que nadie debería tener. Axiom los tiene todos.
- **Prompt:** `Núcleo Raíz — game item icon, an orb, palette: the set color rgb(70,240,210) as accent; lore hint: "Un conjunto de permisos que nadie debería tener. Axiom los tiene todos."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Visor de Depuración  `sistema_casco`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Casco (casco) · **Set:** Acceso Raíz · **Uso:** Axiom
- **Arena / fuente:** Botín de set
- **Archivo:** `assets/items/sistema_casco.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["sistema_casco"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** máscara/visor de color del set (rgb 70,240,210). Un conjunto de permisos que nadie debería tener. Axiom los tiene todos.
- **Prompt:** `Visor de Depuración — game item icon, a mask, palette: the set color rgb(70,240,210) as accent; lore hint: "Un conjunto de permisos que nadie debería tener. Axiom los tiene todos."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Guantes de Compilación  `sistema_guantes`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Guantes (guantes) · **Set:** Acceso Raíz · **Uso:** Axiom
- **Arena / fuente:** Botín de set
- **Archivo:** `assets/items/sistema_guantes.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["sistema_guantes"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** guantes de color del set (rgb 70,240,210). Un conjunto de permisos que nadie debería tener. Axiom los tiene todos.
- **Prompt:** `Guantes de Compilación — game item icon, a gloves, palette: the set color rgb(70,240,210) as accent; lore hint: "Un conjunto de permisos que nadie debería tener. Axiom los tiene todos."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Pasos Asíncronos  `sistema_botas`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Botas (botas) · **Set:** Acceso Raíz · **Uso:** Axiom
- **Arena / fuente:** Botín de set
- **Archivo:** `assets/items/sistema_botas.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["sistema_botas"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** botas de color del set (rgb 70,240,210). Un conjunto de permisos que nadie debería tener. Axiom los tiene todos.
- **Prompt:** `Pasos Asíncronos — game item icon, a boots, palette: the set color rgb(70,240,210) as accent; lore hint: "Un conjunto de permisos que nadie debería tener. Axiom los tiene todos."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

### La Última Profecía  `profecia` — Profeta · destino · salvar · solo La Profeta

Aura rgb(120,240,220) · 4 piezas · sale más en: — · completo: PROFECÍA CUMPLIDA: cuando un aliado cerca tuyo recibe un golpe letal, sobrevive con 1 de vida y queda inmune 1,5 s (una vez cada 40 s).

#### Velo de la Profecía  `profecia_casco`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Casco (casco) · **Set:** La Última Profecía · **Uso:** La Profeta
- **Arena / fuente:** Botín de set
- **Archivo:** `assets/items/profecia_casco.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["profecia_casco"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** capucha de color del set (rgb 120,240,220). La última profecía no hablaba del fin del mundo. Hablaba de alguien que se negaba a dejarlo terminar.
- **Prompt:** `Velo de la Profecía — game item icon, a hood, palette: the set color rgb(120,240,220) as accent; lore hint: "La última profecía no hablaba del fin del mundo. Hablaba de alguien que se negaba a dejarlo terminar."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Manto del Augurio  `profecia_pechera`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Pechera (pechera) · **Set:** La Última Profecía · **Uso:** La Profeta
- **Arena / fuente:** Botín de set
- **Archivo:** `assets/items/profecia_pechera.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["profecia_pechera"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** manto de color del set (rgb 120,240,220). La última profecía no hablaba del fin del mundo. Hablaba de alguien que se negaba a dejarlo terminar.
- **Prompt:** `Manto del Augurio — game item icon, a cloak, palette: the set color rgb(120,240,220) as accent; lore hint: "La última profecía no hablaba del fin del mundo. Hablaba de alguien que se negaba a dejarlo terminar."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Brazales del Destino  `profecia_guantes`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Guantes (guantes) · **Set:** La Última Profecía · **Uso:** La Profeta
- **Arena / fuente:** Botín de set
- **Archivo:** `assets/items/profecia_guantes.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["profecia_guantes"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** guanteletes de color del set (rgb 120,240,220). La última profecía no hablaba del fin del mundo. Hablaba de alguien que se negaba a dejarlo terminar.
- **Prompt:** `Brazales del Destino — game item icon, a gauntlets, palette: the set color rgb(120,240,220) as accent; lore hint: "La última profecía no hablaba del fin del mundo. Hablaba de alguien que se negaba a dejarlo terminar."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Pasos del Presagio  `profecia_botas`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Botas (botas) · **Set:** La Última Profecía · **Uso:** La Profeta
- **Arena / fuente:** Botín de set
- **Archivo:** `assets/items/profecia_botas.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["profecia_botas"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** botas de color del set (rgb 120,240,220). La última profecía no hablaba del fin del mundo. Hablaba de alguien que se negaba a dejarlo terminar.
- **Prompt:** `Pasos del Presagio — game item icon, a boots, palette: the set color rgb(120,240,220) as accent; lore hint: "La última profecía no hablaba del fin del mundo. Hablaba de alguien que se negaba a dejarlo terminar."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

### El Rōnin Errante  `errante` — Musashi · paciencia · un solo corte · solo Musashi

Aura rgb(160,210,255) · 4 piezas · sale más en: — · completo: IAIJUTSU: tras 1,2 s sin atacar, tu próximo básico es un corte desenvainado: crítico asegurado con +150% de daño crítico que corta en línea a todos hasta 160.

#### Bokken del Errante  `errante_arma`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Arma (arma) · **Set:** El Rōnin Errante · **Uso:** Musashi
- **Arena / fuente:** Botín de set
- **Archivo:** `assets/items/errante_arma.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["errante_arma"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** espada de color del set (rgb 160,210,255). Caminó treinta años sin desenvainar. La única vez que lo hizo, no hizo falta una segunda.
- **Prompt:** `Bokken del Errante — game item icon, a sword, palette: the set color rgb(160,210,255) as accent; lore hint: "Caminó treinta años sin desenvainar. La única vez que lo hizo, no hizo falta una segunda."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Kasa del Errante  `errante_casco`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Casco (casco) · **Set:** El Rōnin Errante · **Uso:** Musashi
- **Arena / fuente:** Botín de set
- **Archivo:** `assets/items/errante_casco.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["errante_casco"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** sombrero (kasa) de color del set (rgb 160,210,255). Caminó treinta años sin desenvainar. La única vez que lo hizo, no hizo falta una segunda.
- **Prompt:** `Kasa del Errante — game item icon, a straw kasa hat, palette: the set color rgb(160,210,255) as accent; lore hint: "Caminó treinta años sin desenvainar. La única vez que lo hizo, no hizo falta una segunda."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Tekko del Errante  `errante_guantes`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Guantes (guantes) · **Set:** El Rōnin Errante · **Uso:** Musashi
- **Arena / fuente:** Botín de set
- **Archivo:** `assets/items/errante_guantes.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["errante_guantes"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** guantes de color del set (rgb 160,210,255). Caminó treinta años sin desenvainar. La única vez que lo hizo, no hizo falta una segunda.
- **Prompt:** `Tekko del Errante — game item icon, a gloves, palette: the set color rgb(160,210,255) as accent; lore hint: "Caminó treinta años sin desenvainar. La única vez que lo hizo, no hizo falta una segunda."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Waraji del Errante  `errante_botas`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Botas (botas) · **Set:** El Rōnin Errante · **Uso:** Musashi
- **Arena / fuente:** Botín de set
- **Archivo:** `assets/items/errante_botas.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["errante_botas"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** sandalias de color del set (rgb 160,210,255). Caminó treinta años sin desenvainar. La única vez que lo hizo, no hizo falta una segunda.
- **Prompt:** `Waraji del Errante — game item icon, a sandals, palette: the set color rgb(160,210,255) as accent; lore hint: "Caminó treinta años sin desenvainar. La única vez que lo hizo, no hizo falta una segunda."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

### La Manada  `manada` — Cazadora · marca → presa → lobo · solo La Cazadora

Aura rgb(140,220,120) · 4 piezas · sale más en: — · completo: MANADA: al acorralar a tu Presa (Rastreo al máximo) aparece el Lobo Espectral por 6 s; mientras esté, tus flechas contra la Presa rebotan a 2 enemigos cercanos.

#### Arco de la Manada  `manada_arma`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Arma (arma) · **Set:** La Manada · **Uso:** La Cazadora
- **Arena / fuente:** Botín de set
- **Archivo:** `assets/items/manada_arma.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["manada_arma"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** arco de color del set (rgb 140,220,120). Nunca caza sola. A veces el lobo es el que dispara.
- **Prompt:** `Arco de la Manada — game item icon, a bow, palette: the set color rgb(140,220,120) as accent; lore hint: "Nunca caza sola. A veces el lobo es el que dispara."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Capucha del Rastreador  `manada_casco`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Casco (casco) · **Set:** La Manada · **Uso:** La Cazadora
- **Arena / fuente:** Botín de set
- **Archivo:** `assets/items/manada_casco.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["manada_casco"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** capucha de color del set (rgb 140,220,120). Nunca caza sola. A veces el lobo es el que dispara.
- **Prompt:** `Capucha del Rastreador — game item icon, a hood, palette: the set color rgb(140,220,120) as accent; lore hint: "Nunca caza sola. A veces el lobo es el que dispara."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Guantes de la Cuerda Tensa  `manada_guantes`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Guantes (guantes) · **Set:** La Manada · **Uso:** La Cazadora
- **Arena / fuente:** Botín de set
- **Archivo:** `assets/items/manada_guantes.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["manada_guantes"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** guantes de color del set (rgb 140,220,120). Nunca caza sola. A veces el lobo es el que dispara.
- **Prompt:** `Guantes de la Cuerda Tensa — game item icon, a gloves, palette: the set color rgb(140,220,120) as accent; lore hint: "Nunca caza sola. A veces el lobo es el que dispara."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Botas del Sendero  `manada_botas`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Botas (botas) · **Set:** La Manada · **Uso:** La Cazadora
- **Arena / fuente:** Botín de set
- **Archivo:** `assets/items/manada_botas.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["manada_botas"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** botas de color del set (rgb 140,220,120). Nunca caza sola. A veces el lobo es el que dispara.
- **Prompt:** `Botas del Sendero — game item icon, a boots, palette: the set color rgb(140,220,120) as accent; lore hint: "Nunca caza sola. A veces el lobo es el que dispara."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

### Uniforme del Granadero  `granadero` — Libertador · disparo pesado · solo El Libertador

Aura rgb(90,130,220) · 4 piezas · sale más en: — · completo: FUEGO A DISCRECIÓN: cada disparo de fusil que mata recarga el arma al instante.

#### Fusil del Granadero  `granadero_arma`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Arma (arma) · **Set:** Uniforme del Granadero · **Uso:** El Libertador
- **Arena / fuente:** Botín de set
- **Archivo:** `assets/items/granadero_arma.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["granadero_arma"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** fusil de color del set (rgb 90,130,220). Azul de casaca, blanco de correaje. Lo reconocían antes de oír el disparo.
- **Prompt:** `Fusil del Granadero — game item icon, a musket, palette: the set color rgb(90,130,220) as accent; lore hint: "Azul de casaca, blanco de correaje. Lo reconocían antes de oír el disparo."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Morrión del Granadero  `granadero_casco`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Casco (casco) · **Set:** Uniforme del Granadero · **Uso:** El Libertador
- **Arena / fuente:** Botín de set
- **Archivo:** `assets/items/granadero_casco.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["granadero_casco"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** yelmo de color del set (rgb 90,130,220). Azul de casaca, blanco de correaje. Lo reconocían antes de oír el disparo.
- **Prompt:** `Morrión del Granadero — game item icon, a helmet, palette: the set color rgb(90,130,220) as accent; lore hint: "Azul de casaca, blanco de correaje. Lo reconocían antes de oír el disparo."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Casaca Azul  `granadero_pechera`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Pechera (pechera) · **Set:** Uniforme del Granadero · **Uso:** El Libertador
- **Arena / fuente:** Botín de set
- **Archivo:** `assets/items/granadero_pechera.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["granadero_pechera"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** túnica de color del set (rgb 90,130,220). Azul de casaca, blanco de correaje. Lo reconocían antes de oír el disparo.
- **Prompt:** `Casaca Azul — game item icon, a robe, palette: the set color rgb(90,130,220) as accent; lore hint: "Azul de casaca, blanco de correaje. Lo reconocían antes de oír el disparo."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Botas de Caballería  `granadero_botas`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Botas (botas) · **Set:** Uniforme del Granadero · **Uso:** El Libertador
- **Arena / fuente:** Botín de set
- **Archivo:** `assets/items/granadero_botas.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["granadero_botas"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** botas de color del set (rgb 90,130,220). Azul de casaca, blanco de correaje. Lo reconocían antes de oír el disparo.
- **Prompt:** `Botas de Caballería — game item icon, a boots, palette: the set color rgb(90,130,220) as accent; lore hint: "Azul de casaca, blanco de correaje. Lo reconocían antes de oír el disparo."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

### Réquiem del Señor de la Muerte  `requiem` — Nigromante · legión · almas · solo Nigromante

Aura rgb(90,230,140) · 4 piezas · sale más en: — · completo: LEGIÓN SIN FIN: con 5 o más esqueletos, vos y tu ejército reciben 15% menos daño y tus esqueletos golpean 20% más fuerte.

#### Cetro del Réquiem  `requiem_arma`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Arma (arma) · **Set:** Réquiem del Señor de la Muerte · **Uso:** Nigromante
- **Arena / fuente:** Botín de set
- **Archivo:** `assets/items/requiem_arma.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["requiem_arma"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** cetro de color del set (rgb 90,230,140). Cada pieza fue cosida con el nombre de un muerto. Todavía responden cuando las llaman.
- **Prompt:** `Cetro del Réquiem — game item icon, a scepter, palette: the set color rgb(90,230,140) as accent; lore hint: "Cada pieza fue cosida con el nombre de un muerto. Todavía responden cuando las llaman."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Corona de Huesos  `requiem_casco`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Casco (casco) · **Set:** Réquiem del Señor de la Muerte · **Uso:** Nigromante
- **Arena / fuente:** Botín de set
- **Archivo:** `assets/items/requiem_casco.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["requiem_casco"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** corona de color del set (rgb 90,230,140). Cada pieza fue cosida con el nombre de un muerto. Todavía responden cuando las llaman.
- **Prompt:** `Corona de Huesos — game item icon, a crown, palette: the set color rgb(90,230,140) as accent; lore hint: "Cada pieza fue cosida con el nombre de un muerto. Todavía responden cuando las llaman."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Mortaja del Señor  `requiem_pechera`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Pechera (pechera) · **Set:** Réquiem del Señor de la Muerte · **Uso:** Nigromante
- **Arena / fuente:** Botín de set
- **Archivo:** `assets/items/requiem_pechera.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["requiem_pechera"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** túnica de color del set (rgb 90,230,140). Cada pieza fue cosida con el nombre de un muerto. Todavía responden cuando las llaman.
- **Prompt:** `Mortaja del Señor — game item icon, a robe, palette: the set color rgb(90,230,140) as accent; lore hint: "Cada pieza fue cosida con el nombre de un muerto. Todavía responden cuando las llaman."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Garras de la Tumba  `requiem_guantes`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Guantes (guantes) · **Set:** Réquiem del Señor de la Muerte · **Uso:** Nigromante
- **Arena / fuente:** Botín de set
- **Archivo:** `assets/items/requiem_guantes.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["requiem_guantes"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** garras de color del set (rgb 90,230,140). Cada pieza fue cosida con el nombre de un muerto. Todavía responden cuando las llaman.
- **Prompt:** `Garras de la Tumba — game item icon, a claw gloves, palette: the set color rgb(90,230,140) as accent; lore hint: "Cada pieza fue cosida con el nombre de un muerto. Todavía responden cuando las llaman."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

### Legión de Reconocimiento  `legion` — Eren · maniobras · el Portador · solo Eren

Aura rgb(200,90,60) · 4 piezas · sale más en: — · completo: EL PORTADOR ETERNO: la forma titánica dura 30% más y cada baja transformado te cura 2% de la vida.

#### Hojas de la Legión  `legion_arma`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Arma (arma) · **Set:** Legión de Reconocimiento · **Uso:** Eren
- **Arena / fuente:** Botín de set
- **Archivo:** `assets/items/legion_arma.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["legion_arma"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** par de hojas de color del set (rgb 200,90,60). Las alas en la espalda no son un adorno: son una promesa de volver.
- **Prompt:** `Hojas de la Legión — game item icon, a pair of twin blades, palette: the set color rgb(200,90,60) as accent; lore hint: "Las alas en la espalda no son un adorno: son una promesa de volver."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Arnés de Maniobras  `legion_pechera`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Pechera (pechera) · **Set:** Legión de Reconocimiento · **Uso:** Eren
- **Arena / fuente:** Botín de set
- **Archivo:** `assets/items/legion_pechera.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["legion_pechera"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** coraza/peto de color del set (rgb 200,90,60). Las alas en la espalda no son un adorno: son una promesa de volver.
- **Prompt:** `Arnés de Maniobras — game item icon, a chest armor, palette: the set color rgb(200,90,60) as accent; lore hint: "Las alas en la espalda no son un adorno: son una promesa de volver."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Empuñaduras de la Legión  `legion_guantes`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Guantes (guantes) · **Set:** Legión de Reconocimiento · **Uso:** Eren
- **Arena / fuente:** Botín de set
- **Archivo:** `assets/items/legion_guantes.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["legion_guantes"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** guantes de color del set (rgb 200,90,60). Las alas en la espalda no son un adorno: son una promesa de volver.
- **Prompt:** `Empuñaduras de la Legión — game item icon, a gloves, palette: the set color rgb(200,90,60) as accent; lore hint: "Las alas en la espalda no son un adorno: son una promesa de volver."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

#### Botas de la Legión  `legion_botas`
- **Categoría:** Set · **Rareza:** Set · **Slot real:** Botas (botas) · **Set:** Legión de Reconocimiento · **Uso:** Eren
- **Arena / fuente:** Botín de set
- **Archivo:** `assets/items/legion_botas.png` · 64×64 PNG, fondo transparente (se registra en `ITEM_ICON_ART["legion_botas"]`)
- **Efecto (para que el arte lo cuente):** solo estadísticas
- **Descripción visual:** botas de color del set (rgb 200,90,60). Las alas en la espalda no son un adorno: son una promesa de volver.
- **Prompt:** `Botas de la Legión — game item icon, a boots, palette: the set color rgb(200,90,60) as accent; lore hint: "Las alas en la espalda no son un adorno: son una promesa de volver."; pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64`

## 6. Arquetipos procedurales (Común → Mítico procedural)

Una silueta base por arquetipo en **gris neutro**. El juego la tiñe con el material de la familia, así que no hacen falta 260 íconos. La pasiva de cada arquetipo es fija, y el ícono tiene que sugerirla (Colmillo = robo de vida, Égida = sobrecuración...).

| Slot | Arquetipo | Silueta (brief) | Pasiva fija (Raro o más) | Archivo | Prompt |
|---|---|---|---|---|---|
| Arma | Hoja | sable curvo y liviano, filo fino | Ojo Certero | `assets/items/base_arma_hoja.png` 64×64 | `Hoja — game item icon, a light curved saber with a thin edge, neutral grey steel palette meant to be tinted, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64` |
| Arma | Filo | hoja recta ancha con el filo brillante, cargada | Filo Cargado | `assets/items/base_arma_filo.png` 64×64 | `Filo — game item icon, a broad straight blade with a glowing charged edge, neutral grey steel palette meant to be tinted, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64` |
| Arma | Colmillo | daga curva como un colmillo, gotas en la punta | Sed de Vida | `assets/items/base_arma_colmillo.png` 64×64 | `Colmillo — game item icon, a curved fang-shaped dagger with drops at the tip, neutral grey steel palette meant to be tinted, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64` |
| Arma | Espada | espada larga de guardia ancha, empuñadura liviana | Reflejos | `assets/items/base_arma_espada.png` 64×64 | `Espada — game item icon, a longsword with a wide crossguard and light grip, neutral grey steel palette meant to be tinted, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64` |
| Arma | Hacha | hacha de una mano con hoja pesada | Golpe Devastador | `assets/items/base_arma_hacha.png` 64×64 | `Hacha — game item icon, a one-handed axe with a heavy head, neutral grey steel palette meant to be tinted, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64` |
| Arma | Cetro | cetro corto con una gema en la cabeza | Furia Elemental | `assets/items/base_arma_cetro.png` 64×64 | `Cetro — game item icon, a short scepter topped with a gem, neutral grey steel palette meant to be tinted, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64` |
| Escudo | Escudo | escudo de cometa con remaches | Piel de Brasa | `assets/items/base_escudo_escudo.png` 64×64 | `Escudo — game item icon, a riveted kite shield, neutral grey steel palette meant to be tinted, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64` |
| Escudo | Rodela | rodela redonda y liviana | Paso Ligero | `assets/items/base_escudo_rodela.png` 64×64 | `Rodela — game item icon, a light round buckler, neutral grey steel palette meant to be tinted, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64` |
| Escudo | Égida | escudo redondo con un emblema radiante | Sobreabundancia | `assets/items/base_escudo_egida.png` 64×64 | `Égida — game item icon, a round aegis with a radiant emblem, neutral grey steel palette meant to be tinted, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64` |
| Escudo | Pavés | escudo torre alto | Vitalidad | `assets/items/base_escudo_paves.png` 64×64 | `Pavés — game item icon, a tall tower shield, neutral grey steel palette meant to be tinted, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64` |
| Casco | Yelmo | yelmo cerrado con visera | Vitalidad | `assets/items/base_casco_yelmo.png` 64×64 | `Yelmo — game item icon, a closed helm with visor, neutral grey steel palette meant to be tinted, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64` |
| Casco | Capucha | capucha de tela con sombra adentro | Mente Ágil | `assets/items/base_casco_capucha.png` 64×64 | `Capucha — game item icon, a cloth hood with shadowed face, neutral grey steel palette meant to be tinted, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64` |
| Casco | Corona | corona de puntas con gemas | Pozo Interior | `assets/items/base_casco_corona.png` 64×64 | `Corona — game item icon, a spiked crown with gems, neutral grey steel palette meant to be tinted, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64` |
| Casco | Máscara | máscara de guerra con ojos rasgados | Ojo Certero | `assets/items/base_casco_mascara.png` 64×64 | `Máscara — game item icon, a war mask with narrow eye slits, neutral grey steel palette meant to be tinted, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64` |
| Pechera | Coraza | coraza de placas | Piel de Brasa | `assets/items/base_pechera_coraza.png` 64×64 | `Coraza — game item icon, a plate cuirass, neutral grey steel palette meant to be tinted, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64` |
| Pechera | Pechera | peto acolchado con correas | Vitalidad | `assets/items/base_pechera_pechera.png` 64×64 | `Pechera — game item icon, a padded breastplate with straps, neutral grey steel palette meant to be tinted, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64` |
| Pechera | Manto | manto con capucha caída | Gracia Curativa | `assets/items/base_pechera_manto.png` 64×64 | `Manto — game item icon, a cloak with lowered hood, neutral grey steel palette meant to be tinted, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64` |
| Pechera | Cota | cota de malla | Cuero Curtido | `assets/items/base_pechera_cota.png` 64×64 | `Cota — game item icon, a chainmail shirt, neutral grey steel palette meant to be tinted, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64` |
| Guantes | Guanteletes | guanteletes de placas | Filo Cargado | `assets/items/base_guantes_guanteletes.png` 64×64 | `Guanteletes — game item icon, a plate gauntlets, neutral grey steel palette meant to be tinted, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64` |
| Guantes | Guantes | guantes de cuero ajustados | Reflejos | `assets/items/base_guantes_guantes.png` 64×64 | `Guantes — game item icon, a fitted leather gloves, neutral grey steel palette meant to be tinted, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64` |
| Guantes | Brazales | brazales con runas | Descarga | `assets/items/base_guantes_brazales.png` 64×64 | `Brazales — game item icon, a rune-etched bracers, neutral grey steel palette meant to be tinted, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64` |
| Guantes | Puños | puños con nudilleras | Golpe Devastador | `assets/items/base_guantes_punos.png` 64×64 | `Puños — game item icon, a knuckle-duster fists, neutral grey steel palette meant to be tinted, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64` |
| Botas | Botas | botas de cuero altas | Paso Ligero | `assets/items/base_botas_botas.png` 64×64 | `Botas — game item icon, a tall leather boots, neutral grey steel palette meant to be tinted, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64` |
| Botas | Grebas | grebas de placas | Piel de Brasa | `assets/items/base_botas_grebas.png` 64×64 | `Grebas — game item icon, a plate greaves, neutral grey steel palette meant to be tinted, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64` |
| Botas | Sandalias | sandalias atadas | Gracia Curativa | `assets/items/base_botas_sandalias.png` 64×64 | `Sandalias — game item icon, a strapped sandals, neutral grey steel palette meant to be tinted, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64` |
| Botas | Pasos | botas livianas con alas o plumas | Mente Ágil | `assets/items/base_botas_pasos.png` 64×64 | `Pasos — game item icon, a light boots with small wings or feathers, neutral grey steel palette meant to be tinted, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame), 64x64` |

**Familias (tinte y arena):**

| Familia | Color | Arenas donde cae | Identidad |
|---|---|---|---|
| Fuego | `#ff7a3a` | La Fortaleza Sin Fin, Arena Infernal | quemadura · daño a quemados · estallidos |
| Hielo | `#9fe3ff` | Arena Acuática, Arena de Hielo | ralentizar · congelar · críticos contra lentos |
| Tormenta | `#ffe36a` | Arena Acuática | rayos en cadena · aturdir |
| Sangrado | `#e04848` | Ruinas del Bosque, Laberinto Maldito, Arena Infernal | sangrado · rematar · robo de vida |
| Bastión | `#8fd0ff` | La Fortaleza Sin Fin, Arena de Hielo, Arena Divina | escudos · devolver golpes · proteger aliados |
| Impacto | `#e0b070` | La Fortaleza Sin Fin, Laberinto Maldito, Arena Infernal, Arena Divina | críticos que aturden · golpes seguidos |
| Caza | `#a8e070` | Ruinas del Bosque, Arena Acuática, Laberinto Maldito | velocidad por baja · rematar |
| Luz | `#ffe79a` | Ruinas del Bosque, El Reino Micelial, Arena Divina | curación · velocidad al curar |
| Arcano | `#c79cff` | El Reino Micelial, Laberinto Maldito, Arena Infernal, Arena Divina | ondas al lanzar · habilidades que electrocutan |
| Podredumbre | `#b06ae6` | El Reino Micelial | podredumbre que contagia · daño en el tiempo |

## 7. Auras de set (opcional; hoy son procedurales)

Formato: `assets/sets/aura_<id>.png`, tira de 8 frames de 128×64, un anillo elíptico bajo los pies en loop. El juego baja la opacidad en el set parcial y la sube con el set completo.

| Set | Color | Motivo del anillo | Prompt |
|---|---|---|---|
| Set de Lucifer | rgb(255,110,40) | Fuego · riesgo · agresión | `ground aura ring loop for the "Set de Lucifer" item set, Fuego · riesgo · agresión, main color rgb(255,110,40), elliptical ring seen from 3/4 top-down, 8-frame horizontal strip 128x64 per frame, pixel art, 1px dark outline on runes, crisp alpha` |
| Pacto del Glaciar | rgb(150,220,255) | Hielo · control | `ground aura ring loop for the "Pacto del Glaciar" item set, Hielo · control, main color rgb(150,220,255), elliptical ring seen from 3/4 top-down, 8-frame horizontal strip 128x64 per frame, pixel art, 1px dark outline on runes, crisp alpha` |
| Corazón del Coloso | rgb(230,190,110) | Tanque · absorber | `ground aura ring loop for the "Corazón del Coloso" item set, Tanque · absorber, main color rgb(230,190,110), elliptical ring seen from 3/4 top-down, 8-frame horizontal strip 128x64 per frame, pixel art, 1px dark outline on runes, crisp alpha` |
| Réquiem del Sepulturero | rgb(122,212,138) | Invocaciones · no-muertos | `ground aura ring loop for the "Réquiem del Sepulturero" item set, Invocaciones · no-muertos, main color rgb(122,212,138), elliptical ring seen from 3/4 top-down, 8-frame horizontal strip 128x64 per frame, pixel art, 1px dark outline on runes, crisp alpha` |
| Tempestad Eterna | rgb(150,190,255) | Electricidad · cadena · movilidad | `ground aura ring loop for the "Tempestad Eterna" item set, Electricidad · cadena · movilidad, main color rgb(150,190,255), elliptical ring seen from 3/4 top-down, 8-frame horizontal strip 128x64 per frame, pixel art, 1px dark outline on runes, crisp alpha` |
| Sangre del Berserker | rgb(230,50,40) | Riesgo · recompensa | `ground aura ring loop for the "Sangre del Berserker" item set, Riesgo · recompensa, main color rgb(230,50,40), elliptical ring seen from 3/4 top-down, 8-frame horizontal strip 128x64 per frame, pixel art, 1px dark outline on runes, crisp alpha` |
| Juramento del Guardián | rgb(143,208,255) | Protección cooperativa | `ground aura ring loop for the "Juramento del Guardián" item set, Protección cooperativa, main color rgb(143,208,255), elliptical ring seen from 3/4 top-down, 8-frame horizontal strip 128x64 per frame, pixel art, 1px dark outline on runes, crisp alpha` |
| Profecía del Alba | rgb(255,230,140) | Soporte · curación | `ground aura ring loop for the "Profecía del Alba" item set, Soporte · curación, main color rgb(255,230,140), elliptical ring seen from 3/4 top-down, 8-frame horizontal strip 128x64 per frame, pixel art, 1px dark outline on runes, crisp alpha` |
| Sombra del Cazador | rgb(190,120,255) | Asesino · objetivo único | `ground aura ring loop for the "Sombra del Cazador" item set, Asesino · objetivo único, main color rgb(190,120,255), elliptical ring seen from 3/4 top-down, 8-frame horizontal strip 128x64 per frame, pixel art, 1px dark outline on runes, crisp alpha` |
| Ojo del Arcano | rgb(200,140,255) | Mago · rotación | `ground aura ring loop for the "Ojo del Arcano" item set, Mago · rotación, main color rgb(200,140,255), elliptical ring seen from 3/4 top-down, 8-frame horizontal strip 128x64 per frame, pixel art, 1px dark outline on runes, crisp alpha` |
| Rey del Laberinto | rgb(220,200,150) | Movimiento · posicionamiento | `ground aura ring loop for the "Rey del Laberinto" item set, Movimiento · posicionamiento, main color rgb(220,200,150), elliptical ring seen from 3/4 top-down, 8-frame horizontal strip 128x64 per frame, pixel art, 1px dark outline on runes, crisp alpha` |
| Baluarte Inquebrantable | rgb(170,200,235) | Tanque · masa · control | `ground aura ring loop for the "Baluarte Inquebrantable" item set, Tanque · masa · control, main color rgb(170,200,235), elliptical ring seen from 3/4 top-down, 8-frame horizontal strip 128x64 per frame, pixel art, 1px dark outline on runes, crisp alpha` |
| Sombra Nocturna | rgb(150,60,90) | Asesino · sangrado · desaparecer | `ground aura ring loop for the "Sombra Nocturna" item set, Asesino · sangrado · desaparecer, main color rgb(150,60,90), elliptical ring seen from 3/4 top-down, 8-frame horizontal strip 128x64 per frame, pixel art, 1px dark outline on runes, crisp alpha` |
| Convergencia Elemental | rgb(200,150,255) | Mago · fuego + hielo + rayo | `ground aura ring loop for the "Convergencia Elemental" item set, Mago · fuego + hielo + rayo, main color rgb(200,150,255), elliptical ring seen from 3/4 top-down, 8-frame horizontal strip 128x64 per frame, pixel art, 1px dark outline on runes, crisp alpha` |
| Bendición del Custodio | rgb(255,235,160) | Soporte · salvar a tiempo | `ground aura ring loop for the "Bendición del Custodio" item set, Soporte · salvar a tiempo, main color rgb(255,235,160), elliptical ring seen from 3/4 top-down, 8-frame horizontal strip 128x64 per frame, pixel art, 1px dark outline on runes, crisp alpha` |
| Marea Roja | rgb(220,40,40) | Berserker · riesgo · furia | `ground aura ring loop for the "Marea Roja" item set, Berserker · riesgo · furia, main color rgb(220,40,40), elliptical ring seen from 3/4 top-down, 8-frame horizontal strip 128x64 per frame, pixel art, 1px dark outline on runes, crisp alpha` |
| Acceso Raíz | rgb(70,240,210) | Axiom · reglas rotas | `ground aura ring loop for the "Acceso Raíz" item set, Axiom · reglas rotas, main color rgb(70,240,210), elliptical ring seen from 3/4 top-down, 8-frame horizontal strip 128x64 per frame, pixel art, 1px dark outline on runes, crisp alpha` |
| La Última Profecía | rgb(120,240,220) | Profeta · destino · salvar | `ground aura ring loop for the "La Última Profecía" item set, Profeta · destino · salvar, main color rgb(120,240,220), elliptical ring seen from 3/4 top-down, 8-frame horizontal strip 128x64 per frame, pixel art, 1px dark outline on runes, crisp alpha` |
| El Rōnin Errante | rgb(160,210,255) | Musashi · paciencia · un solo corte | `ground aura ring loop for the "El Rōnin Errante" item set, Musashi · paciencia · un solo corte, main color rgb(160,210,255), elliptical ring seen from 3/4 top-down, 8-frame horizontal strip 128x64 per frame, pixel art, 1px dark outline on runes, crisp alpha` |
| La Manada | rgb(140,220,120) | Cazadora · marca → presa → lobo | `ground aura ring loop for the "La Manada" item set, Cazadora · marca → presa → lobo, main color rgb(140,220,120), elliptical ring seen from 3/4 top-down, 8-frame horizontal strip 128x64 per frame, pixel art, 1px dark outline on runes, crisp alpha` |
| Uniforme del Granadero | rgb(90,130,220) | Libertador · disparo pesado | `ground aura ring loop for the "Uniforme del Granadero" item set, Libertador · disparo pesado, main color rgb(90,130,220), elliptical ring seen from 3/4 top-down, 8-frame horizontal strip 128x64 per frame, pixel art, 1px dark outline on runes, crisp alpha` |
| Réquiem del Señor de la Muerte | rgb(90,230,140) | Nigromante · legión · almas | `ground aura ring loop for the "Réquiem del Señor de la Muerte" item set, Nigromante · legión · almas, main color rgb(90,230,140), elliptical ring seen from 3/4 top-down, 8-frame horizontal strip 128x64 per frame, pixel art, 1px dark outline on runes, crisp alpha` |
| Legión de Reconocimiento | rgb(200,90,60) | Eren · maniobras · el Portador | `ground aura ring loop for the "Legión de Reconocimiento" item set, Eren · maniobras · el Portador, main color rgb(200,90,60), elliptical ring seen from 3/4 top-down, 8-frame horizontal strip 128x64 per frame, pixel art, 1px dark outline on runes, crisp alpha` |

## 8. Skins de set (solo con set completo; hoy no existe ninguna)

- **Set de campeón:** atlas completo de ese campeón con la armadura del set, con la misma grilla y animaciones que su atlas actual (`idle_*`, `walk_*`, `attack_*`). Va en `assets/sets/skin_<id>.png` y se registra en `SET_SKINS["<id>"]`.
- **Set universal:** capa de armadura superpuesta por dirección, de 96×96 por frame con la misma grilla del campeón, o un atlas por campeón si se quiere calidad plena. Hasta que exista, se ve solo el aura.

| Set | Campeón | Tipo de skin | Prompt |
|---|---|---|---|
| Set de Lucifer | cualquiera | capa superpuesta | `armor overlay layer: the full "Set de Lucifer" set (Fuego · riesgo · agresión), accent color rgb(255,110,40), same frame grid and poses as the champion atlas, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame)` |
| Pacto del Glaciar | cualquiera | capa superpuesta | `armor overlay layer: the full "Pacto del Glaciar" set (Hielo · control), accent color rgb(150,220,255), same frame grid and poses as the champion atlas, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame)` |
| Corazón del Coloso | cualquiera | capa superpuesta | `armor overlay layer: the full "Corazón del Coloso" set (Tanque · absorber), accent color rgb(230,190,110), same frame grid and poses as the champion atlas, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame)` |
| Réquiem del Sepulturero | cualquiera | capa superpuesta | `armor overlay layer: the full "Réquiem del Sepulturero" set (Invocaciones · no-muertos), accent color rgb(122,212,138), same frame grid and poses as the champion atlas, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame)` |
| Tempestad Eterna | cualquiera | capa superpuesta | `armor overlay layer: the full "Tempestad Eterna" set (Electricidad · cadena · movilidad), accent color rgb(150,190,255), same frame grid and poses as the champion atlas, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame)` |
| Sangre del Berserker | cualquiera | capa superpuesta | `armor overlay layer: the full "Sangre del Berserker" set (Riesgo · recompensa), accent color rgb(230,50,40), same frame grid and poses as the champion atlas, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame)` |
| Juramento del Guardián | cualquiera | capa superpuesta | `armor overlay layer: the full "Juramento del Guardián" set (Protección cooperativa), accent color rgb(143,208,255), same frame grid and poses as the champion atlas, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame)` |
| Profecía del Alba | cualquiera | capa superpuesta | `armor overlay layer: the full "Profecía del Alba" set (Soporte · curación), accent color rgb(255,230,140), same frame grid and poses as the champion atlas, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame)` |
| Sombra del Cazador | cualquiera | capa superpuesta | `armor overlay layer: the full "Sombra del Cazador" set (Asesino · objetivo único), accent color rgb(190,120,255), same frame grid and poses as the champion atlas, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame)` |
| Ojo del Arcano | cualquiera | capa superpuesta | `armor overlay layer: the full "Ojo del Arcano" set (Mago · rotación), accent color rgb(200,140,255), same frame grid and poses as the champion atlas, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame)` |
| Rey del Laberinto | cualquiera | capa superpuesta | `armor overlay layer: the full "Rey del Laberinto" set (Movimiento · posicionamiento), accent color rgb(220,200,150), same frame grid and poses as the champion atlas, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame)` |
| Baluarte Inquebrantable | Tanque | atlas del campeón | `Tanque wearing the full "Baluarte Inquebrantable" set (Tanque · masa · control), accent color rgb(170,200,235), same frame grid and poses as the champion atlas, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame)` |
| Sombra Nocturna | Asesino | atlas del campeón | `Asesino wearing the full "Sombra Nocturna" set (Asesino · sangrado · desaparecer), accent color rgb(150,60,90), same frame grid and poses as the champion atlas, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame)` |
| Convergencia Elemental | Mago | atlas del campeón | `Mago wearing the full "Convergencia Elemental" set (Mago · fuego + hielo + rayo), accent color rgb(200,150,255), same frame grid and poses as the champion atlas, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame)` |
| Bendición del Custodio | Soporte | atlas del campeón | `Soporte wearing the full "Bendición del Custodio" set (Soporte · salvar a tiempo), accent color rgb(255,235,160), same frame grid and poses as the champion atlas, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame)` |
| Marea Roja | Segador Olvidado | atlas del campeón | `Segador Olvidado wearing the full "Marea Roja" set (Berserker · riesgo · furia), accent color rgb(220,40,40), same frame grid and poses as the champion atlas, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame)` |
| Acceso Raíz | Axiom | atlas del campeón | `Axiom wearing the full "Acceso Raíz" set (Axiom · reglas rotas), accent color rgb(70,240,210), same frame grid and poses as the champion atlas, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame)` |
| La Última Profecía | La Profeta | atlas del campeón | `La Profeta wearing the full "La Última Profecía" set (Profeta · destino · salvar), accent color rgb(120,240,220), same frame grid and poses as the champion atlas, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame)` |
| El Rōnin Errante | Musashi | atlas del campeón | `Musashi wearing the full "El Rōnin Errante" set (Musashi · paciencia · un solo corte), accent color rgb(160,210,255), same frame grid and poses as the champion atlas, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame)` |
| La Manada | La Cazadora | atlas del campeón | `La Cazadora wearing the full "La Manada" set (Cazadora · marca → presa → lobo), accent color rgb(140,220,120), same frame grid and poses as the champion atlas, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame)` |
| Uniforme del Granadero | El Libertador | atlas del campeón | `El Libertador wearing the full "Uniforme del Granadero" set (Libertador · disparo pesado), accent color rgb(90,130,220), same frame grid and poses as the champion atlas, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame)` |
| Réquiem del Señor de la Muerte | Nigromante | atlas del campeón | `Nigromante wearing the full "Réquiem del Señor de la Muerte" set (Nigromante · legión · almas), accent color rgb(90,230,140), same frame grid and poses as the champion atlas, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame)` |
| Legión de Reconocimiento | Eren | atlas del campeón | `Eren wearing the full "Legión de Reconocimiento" set (Eren · maniobras · el Portador), accent color rgb(200,90,60), same frame grid and poses as the champion atlas, pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame)` |

## 9. VFX de procs, míticos y únicos (hoy procedurales)

Formato: `assets/vfx/items/<id>.png`, tira de 6 frames de 64×64. **Tiene que ser corto y chico:** el objetivo es que el proc se note sin llenar la pantalla.

| Id | Nombre | Qué hace | Prompt |
|---|---|---|---|
| `kill_explode` (proc) | Estallido Ígneo | Al matar, el enemigo puede estallar en llamas y dañar a los cercanos | `small hit VFX for "Estallido Ígneo": Al matar, el enemigo puede estallar en llamas y dañar a los cercanos; 6-frame strip 64x64, pixel art, crisp alpha, short and readable, does not cover the enemy` |
| `basic_chain` (proc) | Tormenta Encadenada | Cada 4 golpes básicos sale un rayo que salta entre enemigos | `small hit VFX for "Tormenta Encadenada": Cada 4 golpes básicos sale un rayo que salta entre enemigos; 6-frame strip 64x64, pixel art, crisp alpha, short and readable, does not cover the enemy` |
| `skill_nova` (proc) | Resonancia Arcana | Al lanzar una habilidad, una onda de energía golpea a tu alrededor | `small hit VFX for "Resonancia Arcana": Al lanzar una habilidad, una onda de energía golpea a tu alrededor; 6-frame strip 64x64, pixel art, crisp alpha, short and readable, does not cover the enemy` |
| `kill_heal` (proc) | Festín de Almas | Cada baja te cura; las bajas de élite curan mucho más | `small hit VFX for "Festín de Almas": Cada baja te cura; las bajas de élite curan mucho más; 6-frame strip 64x64, pixel art, crisp alpha, short and readable, does not cover the enemy` |
| `hit_shield` (proc) | Égida | Un golpe fuerte recibido te da un escudo (cada 8 s) | `small hit VFX for "Égida": Un golpe fuerte recibido te da un escudo (cada 8 s); 6-frame strip 64x64, pixel art, crisp alpha, short and readable, does not cover the enemy` |
| `basic_freeze` (proc) | Escarcha Viva | Tus básicos ralentizan; cada 6 golpes congelan al objetivo | `small hit VFX for "Escarcha Viva": Tus básicos ralentizan; cada 6 golpes congelan al objetivo; 6-frame strip 64x64, pixel art, crisp alpha, short and readable, does not cover the enemy` |
| `combo_ramp` (proc) | Furia Creciente | Golpear seguido acumula daño y velocidad de ataque (hasta 10) | `small hit VFX for "Furia Creciente": Golpear seguido acumula daño y velocidad de ataque (hasta 10); 6-frame strip 64x64, pixel art, crisp alpha, short and readable, does not cover the enemy` |
| `crit_quake` (proc) | Golpe Sísmico | Los críticos generan una onda de choque que aturde | `small hit VFX for "Golpe Sísmico": Los críticos generan una onda de choque que aturde; 6-frame strip 64x64, pixel art, crisp alpha, short and readable, does not cover the enemy` |
| `frost_aura` (proc) | Aliento Glacial | Los enemigos cerca tuyo se mueven un 18% más lento | `small hit VFX for "Aliento Glacial": Los enemigos cerca tuyo se mueven un 18% más lento; 6-frame strip 64x64, pixel art, crisp alpha, short and readable, does not cover the enemy` |
| `ignite_basic` (proc) | Brasa Viva | Tus golpes básicos prenden fuego al objetivo | `small hit VFX for "Brasa Viva": Tus golpes básicos prenden fuego al objetivo; 6-frame strip 64x64, pixel art, crisp alpha, short and readable, does not cover the enemy` |
| `bleed_basic` (proc) | Filo Sediento | Tus golpes básicos abren heridas que sangran | `small hit VFX for "Filo Sediento": Tus golpes básicos abren heridas que sangran; 6-frame strip 64x64, pixel art, crisp alpha, short and readable, does not cover the enemy` |
| `haste_on_kill` (proc) | Paso del Cazador | Cada baja te da velocidad de movimiento (se acumula hasta 10) | `small hit VFX for "Paso del Cazador": Cada baja te da velocidad de movimiento (se acumula hasta 10); 6-frame strip 64x64, pixel art, crisp alpha, short and readable, does not cover the enemy` |
| `ally_ward` (proc) | Guardia Juramentada | Los aliados cerca tuyo reciben 10% menos daño | `small hit VFX for "Guardia Juramentada": Los aliados cerca tuyo reciben 10% menos daño; 6-frame strip 64x64, pixel art, crisp alpha, short and readable, does not cover the enemy` |
| `retaliate` (proc) | Represalia | Quien te golpea cuerpo a cuerpo recibe parte del daño y queda aturdido | `small hit VFX for "Represalia": Quien te golpea cuerpo a cuerpo recibe parte del daño y queda aturdido; 6-frame strip 64x64, pixel art, crisp alpha, short and readable, does not cover the enemy` |
| `heal_haste` (proc) | Gracia Veloz | Curar a un aliado les da a los dos velocidad por 2,5 s | `small hit VFX for "Gracia Veloz": Curar a un aliado les da a los dos velocidad por 2,5 s; 6-frame strip 64x64, pixel art, crisp alpha, short and readable, does not cover the enemy` |
| `execute_edge` (proc) | Filo del Verdugo | +60% de daño a enemigos comunes y élites con menos de 20% de vida | `small hit VFX for "Filo del Verdugo": +60% de daño a enemigos comunes y élites con menos de 20% de vida; 6-frame strip 64x64, pixel art, crisp alpha, short and readable, does not cover the enemy` |
| `shock_skill` (proc) | Descarga Arcana | Tus habilidades pueden electrocutar: aturden un instante y saltan a otro enemigo | `small hit VFX for "Descarga Arcana": Tus habilidades pueden electrocutar: aturden un instante y saltan a otro enemigo; 6-frame strip 64x64, pixel art, crisp alpha, short and readable, does not cover the enemy` |
| `burn_vs` (proc) | Avivar las Llamas | +25% de daño contra enemigos que están ardiendo | `small hit VFX for "Avivar las Llamas": +25% de daño contra enemigos que están ardiendo; 6-frame strip 64x64, pixel art, crisp alpha, short and readable, does not cover the enemy` |
| `cold_crit` (proc) | Frío que Quiebra | +50% de daño crítico contra enemigos ralentizados o congelados | `small hit VFX for "Frío que Quiebra": +50% de daño crítico contra enemigos ralentizados o congelados; 6-frame strip 64x64, pixel art, crisp alpha, short and readable, does not cover the enemy` |
| `spore_rot` (proc) | Esporas Pútridas | Tus golpes básicos pudren al objetivo: daño en el tiempo y +8% de daño recibido durante 3 s. Si muere podrido, contagia a un enemigo cercano | `small hit VFX for "Esporas Pútridas": Tus golpes básicos pudren al objetivo: daño en el tiempo y +8% de daño recibido durante 3 s. Si muere podrido, contagia a un enemigo cercano; 6-frame strip 64x64, pixel art, crisp alpha, short and readable, does not cover the enemy` |
| `myth_winter` (mítico) | Invierno Sin Fin | Cada 3 ralentizaciones sobre el mismo enemigo lo CONGELÁS (1,2 s). Los congelados que mueren estallan en esquirlas que ralentizan y encadenan el frío. | `small hit VFX for "Invierno Sin Fin": Cada 3 ralentizaciones sobre el mismo enemigo lo CONGELÁS (1,2 s). Los congelados que mueren estallan en esquirlas que ralentizan y encadenan el frío.; 6-frame strip 64x64, pixel art, crisp alpha, short and readable, does not cover the enemy` |
| `myth_inferno` (mítico) | Combustión Perpetua | El fuego se CONTAGIA: cada enemigo en llamas prende a otro cercano cada segundo. Los que mueren ardiendo explotan. | `small hit VFX for "Combustión Perpetua": El fuego se CONTAGIA: cada enemigo en llamas prende a otro cercano cada segundo. Los que mueren ardiendo explotan.; 6-frame strip 64x64, pixel art, crisp alpha, short and readable, does not cover the enemy` |
| `myth_storm` (mítico) | Tormenta Viva | Cada 3 habilidades, una TORMENTA te sigue 4 s descargando rayos sobre los enemigos cercanos (aturden un instante). | `small hit VFX for "Tormenta Viva": Cada 3 habilidades, una TORMENTA te sigue 4 s descargando rayos sobre los enemigos cercanos (aturden un instante).; 6-frame strip 64x64, pixel art, crisp alpha, short and readable, does not cover the enemy` |
| `myth_bastion` (mítico) | Último Bastión | Los golpes fuertes que recibís se ACUMULAN; tu siguiente habilidad libera una onda que devuelve ese daño x2,5 y aturde. Los aliados cerca tuyo reciben 12% menos daño. | `small hit VFX for "Último Bastión": Los golpes fuertes que recibís se ACUMULAN; tu siguiente habilidad libera una onda que devuelve ese daño x2,5 y aturde. Los aliados cerca tuyo reciben 12% menos daño.; 6-frame strip 64x64, pixel art, crisp alpha, short and readable, does not cover the enemy` |
| `myth_harvest` (mítico) | Cosecha Roja | Tus básicos hacen SANGRAR. Los que sangran reciben +20% de daño; matar a uno te cura y contagia el sangrado a 3 enemigos cercanos. | `small hit VFX for "Cosecha Roja": Tus básicos hacen SANGRAR. Los que sangran reciben +20% de daño; matar a uno te cura y contagia el sangrado a 3 enemigos cercanos.; 6-frame strip 64x64, pixel art, crisp alpha, short and readable, does not cover the enemy` |
| `myth_dawn` (mítico) | Alba Eterna | Cada curación deja SUELO CONSAGRADO por 3 s: cura a los aliados y quema a los enemigos que lo pisan. | `small hit VFX for "Alba Eterna": Cada curación deja SUELO CONSAGRADO por 3 s: cura a los aliados y quema a los enemigos que lo pisan.; 6-frame strip 64x64, pixel art, crisp alpha, short and readable, does not cover the enemy` |
| `myth_echo` (mítico) | Eco del Vacío | Tus habilidades tienen 25% de probabilidad de REPETIRSE solas al 60% de poder (las de desplazamiento e invocación no). | `small hit VFX for "Eco del Vacío": Tus habilidades tienen 25% de probabilidad de REPETIRSE solas al 60% de poder (las de desplazamiento e invocación no).; 6-frame strip 64x64, pixel art, crisp alpha, short and readable, does not cover the enemy` |
| `myth_eclipse` (mítico) | Eclipse | Tus críticos MARCAN al enemigo: si baja de 25% de vida, tu próximo golpe lo EJECUTA (no a jefes ni subjefes). +25% de daño crítico contra jefes. | `small hit VFX for "Eclipse": Tus críticos MARCAN al enemigo: si baja de 25% de vida, tu próximo golpe lo EJECUTA (no a jefes ni subjefes). +25% de daño crítico contra jefes.; 6-frame strip 64x64, pixel art, crisp alpha, short and readable, does not cover the enemy` |
| `uniq_archimago` (único) | Fuego del Vacío | Tu fuego se vuelve violeta y quema el doble de tiempo. El Muro de Fuego te sigue. La Cadena de Relámpago salta 3 veces más y deja a cada objetivo en llamas. | `small hit VFX for "Fuego del Vacío": Tu fuego se vuelve violeta y quema el doble de tiempo. El Muro de Fuego te sigue. La Cadena de Relámpago salta 3 veces más y deja a cada objetivo en llamas.; 6-frame strip 64x64, pixel art, crisp alpha, short and readable, does not cover the enemy` |
| `uniq_juggernaut` (único) | Paso del Coloso | Te agrandás un 15% y cada paso hace temblar el suelo: los enemigos pegados a vos se tambalean. La Embestida deja una grieta que aturde a todo lo que cruza. | `small hit VFX for "Paso del Coloso": Te agrandás un 15% y cada paso hace temblar el suelo: los enemigos pegados a vos se tambalean. La Embestida deja una grieta que aturde a todo lo que cruza.; 6-frame strip 64x64, pixel art, crisp alpha, short and readable, does not cover the enemy` |
| `uniq_lunaroja` (único) | Luna Roja | Tus flechas son de sangre: cada una hace sangrar y, contra tu Presa, atraviesa. El Lobo Espectral aparece siempre que marcás una Presa nueva (cada 20 s). | `small hit VFX for "Luna Roja": Tus flechas son de sangre: cada una hace sangrar y, contra tu Presa, atraviesa. El Lobo Espectral aparece siempre que marcás una Presa nueva (cada 20 s).; 6-frame strip 64x64, pixel art, crisp alpha, short and readable, does not cover the enemy` |
