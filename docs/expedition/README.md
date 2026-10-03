# La Horda — Expedición de los Diez

Propuesta completa y taller de prototipos · 3 de octubre de 2026.

Base revisada: main 965a4504fb44ca81438fe8e31b63ca445c7bb008. Guías aplicadas: AGENTS, Balance de Campeones, referencia por rol, Art Bible, Lore Bible y Production Bibles.

## Estado real

Diez historias originales; diez pasivas; diez básicos; treinta habilidades y diez definitivas implementadas en un taller aislado; tres ramas de talentos por candidato; diez sets de cuatro piezas; veinte diseños de skins con historia propia y diez cromas. Las apariencias son especificaciones de producción: **no hay atlas nuevos aprobados**. El taller usa siluetas prestadas claramente rotuladas, y no se registra en el index de producción.

El taller no equivale a diez campeones terminados para la Alpha. Falta producir y revisar sprites/animaciones/previews, VFX y SFX de identidad, y la entrega persistente de cosméticos de Set. No se inventan archivos ni aprobaciones para hacer pasar el contrato.

## Reglas conservadas

La Horda corrompe y no puede destruirse. No se agregan Guardianes antiguos, cristales ni cambios al orden de campaña. Las nuevas biografías son propuestas compatibles; no reescriben el canon. La sombra de Vesper no prueba una cura; el reflejo de Nahir no predice realmente el futuro. Baltra conoce el mar después de que aparece en la campaña.

Cada campeón tiene una herramienta multiblanco. Máximo 12 afectados por evento directo, ocho objetos propios y 48 objetos del sistema compartido. Las zonas caducan; los pulsos de definitivas tienen cantidad fija aun al ampliar duración. Las marcas pertenecen a cada jugador, expiran y no viajan como referencias inválidas. Desplazamientos comprobados por pasos contra geometría. Jefes sin empuje/aturdimiento, freno máximo 12%. Escudos no acumulables del mismo efecto; curación acotada; efectos cancelados al morir, fusionarse o reiniciar.

Los valores de entrada pasan por el normalizador antes de jugar. knownChampions y las medias aprobadas no se modifican. Pasar el techo de admisión no demuestra equivalencia de utilidad, supervivencia, curación o daño en todas las builds.

## Validación de esta reconstrucción

- Funcional: 234 comprobaciones; 0 fallos; 0 errores. Incluye 100 cruces campeón/arena, niveles iniciales, límites, talentos máximos, sets, control, muerte/reset y serialización. [JSON](functional-results.json).
- Gate: 33 simulaciones de 150 s; 0 infracciones y 0 errores. [JSON](entry-gate-results.json).
- Cooperativo: 10 combinaciones entre host e invitado; 0 fallos y 0 errores. Relay real local; cada candidato envía 3 habilidades + definitiva y replica entidades con dueño correcto. [JSON](online-results.json). No mide Internet público ni cuatro teléfonos físicos.
- Audio: suite del motor existente (no diez identidades sonoras nuevas); ver [registro](audio-results.txt). La escucha humana y firmas propias siguen pendientes.
- Performance de escritorio: 714 cuadros; p95 16.70 ms; 0.14% por encima de 33,4 ms. Viewport móvil en Chromium/Linux, no iPhone físico. [JSON](performance-results.json).

## Comparación de entrada

Daño registrado por jugador en Bosque, nivel 20, tres semillas oficiales, 150 s. La referencia es histórica: diferencias del motor y autopiloto impiden tratarla como una medida de equilibrio actual. Los resultados anteriores a la interrupción no se reutilizan como evidencia.

| Campeón | Rol | HP / daño / defensa | Velocidad / básico ms | Daño medio | % de referencia | Con vida |
|---|---|---|---|---:|---:|---:|
| Vesper | asesino | 104 / 11 / 7.000000000000001% | 179 / 430 | 8862 | 69% | 3/3 |
| Nahir | asesino | 101 / 11 / 6% | 181 / 450 | 8462 | 66% | 3/3 |
| Baltra | tanque | 166 / 9 / 20% | 137 / 620 | 7066 | 67% | 3/3 |
| Maura | tanque | 152 / 9 / 18% | 150 / 590 | 6441 | 61% | 3/3 |
| Dáriel | soporte | 112 / 6.5 / 12% | 165 / 600 | 5540 | 85% | 3/3 |
| Orsa | asesino | 101 / 11 / 7.000000000000001% | 168 / 580 | 7405 | 58% | 3/3 |
| Tibor | mago | 99 / 9 / 7.000000000000001% | 155 / 560 | 10033 | 67% | 3/3 |
| Zahra | mago | 99 / 9 / 7.000000000000001% | 158 / 550 | 8028 | 54% | 3/3 |
| Renko | tanque | 160 / 9 / 19% | 140 / 640 | 5299 | 50% | 3/3 |
| Sira | mago | 96 / 9 / 6% | 164 / 570 | 7731 | 52% | 3/3 |

Estadísticas de la tabla: propuesta previa al normalizador; los valores finales y ajustes figuran en entries del JSON del gate. Daño bajo también requiere revisión: este gate solo bloquea excesos, errores y falta de lanzamientos.

## Fichas

### Vesper — La Costurera de Sombras

**asesino.** Asesina de preparación: marca grupos, cose una salida y consume los hilos.

Vesper remendaba los trajes del teatro de la Ciudad. La noche del regreso encontró a su hermana sentada frente a un espejo: el cuerpo seguía allí, pero la sombra ya se movía sola. Intentó sujetarla con el hilo que usaba para coser nombres dentro de los abrigos. Desde entonces puede hilvanar las sombras de los corrompidos durante unos segundos. No sabe si aquello devuelve algo de quienes fueron. Conserva una manga sin terminar y sigue cada Cicatriz con una pregunta que no se anima a hacer en voz alta: cuánto de una persona queda cuando todavía reconocés su nombre.

**Silueta:** Capucha corta, delantal asimétrico y dos tijeras grandes; ciruela, marfil y acero.

**Debilidad:** Necesita acercarse y preparar marcas; vulnerable al quedarse sin desplazamiento.

**Básico:** Tijeras de luto; cuerpo a cuerpo, alcance 72, recarga 430 ms.

**Pasiva — Hilván:** Los básicos dejan hasta 3 puntadas por objetivo y dueña durante 5 s. Al caer un marcado libera una única rotura de hilo: no provoca cadenas de explosiones.

| Poder | Coste | CD | Daño × | Alcance / radio | Duración base | Efecto |
|---|---:|---:|---:|---|---:|---|
| Agujas de penumbra | 24 | 5.5 s | 2.38 | 235 / 85 | 0 s | Abanico de agujas: daño y una puntada por enemigo. |
| Costura de fuga | 25 | 8.5 s | 0.56 | 120 / 24 | 2.2 s | Avanza por terreno seguro y deja una costura que daña en 4 pulsos. |
| Deshilachar | 28 | 7.6 s | 1.82 | 200 / 150 | 0 s | Consume las puntadas cercanas: +20% de daño por puntada. |
| ★ La última puntada | 0 | 35 s | 0.924 | 200 / 155 | 2.4 s | Cuatro cortes circulares; el último consume las marcas para amplificarse. |

Daño × multiplica el daño de habilidad calculado por el motor; en efectos por pulsos es **por pulso**, no daño total. El radio/alcance efectivo respeta techos del runtime aun con talentos.

**Talentos y maestría:** tres ramas, una por habilidad: +5% al efecto por rango, +5% área (duración para postura) y −3% CD, tres rangos cada una. Los poderes sin daño aumentan duración (reflejo/postura/montículo) o distancia (retroceso). Maestría de rama añade 10% al efecto correspondiente; miniárbol dos rangos de +5% al efecto y +5% poder de definitiva. Son árboles de prototipo, pendientes de especializaciones artísticas/UI.

**Set — Hilo del Recuerdo:** arma, casco, pechera, botas. 2 piezas +5% vida; 3 +4% daño de habilidades; 4 −4% recargas. Fuente propuesta: ciudad. Completar la colección otorgaría la segunda skin; falta integrar el grant persistente, no se simula como obtenido.

**Apariencias:**

- **Sastre de la Corte Muerta**: Frac de marfil, cuello rígido, guantes negros y tijeras ceremoniales doradas. Cosió el traje de una coronación que nunca llegó. Ahora lleva sus retazos para recordar a quienes esperaron afuera.
- **Costurera de Espantapájaros** (skin de Set): Capucha de arpillera, delantal de parches y tijeras de hueso. Los refugios del campo le dieron ropa vieja. Con ella vistió espantapájaros; después se puso el último para acompañarlos.
- **Ceniza del Alba (croma):** marfil y ceniza, sin cambios de ropa; se etiqueta croma.

**Voces:** elección «Todavía puedo remendar esto.»; victoria «Contá los nombres. No las sombras.»; caída «La manga… falta la manga…».

**Contrato:** [vesper.json](manifests/vesper.json).

### Nahir — El Vidrio Errante

**asesino.** Flanqueador que usa reflejos breves para cubrir ángulos distintos.

Antes de entrar al Laberinto, Nahir restauraba espejos: devolvía a otros un rostro sin las manchas del tiempo. En una galería encontró su propia imagen varios pasos por delante. La siguió hasta verla arrodillarse ante una figura que no aparecía en el cristal. Rompió el espejo, pero tres fragmentos conservaron aquel gesto. Los lleva sujetos a sus muñecas; cada reflejo repite por un instante lo que él hace. Nahir busca una salida que su imagen todavía no conozca. No predice el futuro: teme que una elección repetida termine pareciéndose a un destino.

**Silueta:** Máscara partida, media capa y dos hojas curvas; turquesa, gris y blanco opaco.

**Debilidad:** Los reflejos son posiciones fijas, caducan y no absorben daño ni bloquean pasos.

**Básico:** Hojas de espejo; cuerpo a cuerpo, alcance 72, recarga 450 ms.

**Pasiva — Ángulo muerto:** Cambiar al menos 60° el ángulo de ataque contra el mismo enemigo añade 15% de daño; recarga interna 900 ms.

| Poder | Coste | CD | Daño × | Alcance / radio | Duración base | Efecto |
|---|---:|---:|---:|---|---:|---|
| Astillas errantes | 24 | 5.5 s | 2.85 | 240 / 90 | 0 s | Proyecta astillas en abanico contra la horda. |
| Reflejo fugitivo | 25 | 9.5 s | 0 | 110 / 25 | 5 s | Paso seguro que deja un reflejo inmóvil; máximo 3. |
| Corte cruzado | 30 | 8 s | 3.15 | 240 / 24 | 0 s | Corte lineal propio y ecos al 25% desde los reflejos; un eco por reflejo y objetivo. |
| ★ Galería de nadie | 0 | 36 s | 0 | 130 / 70 | 6 s | Coloca 3 reflejos por 6 s. No son aliados adicionales ni copias autónomas. |

Daño × multiplica el daño de habilidad calculado por el motor; en efectos por pulsos es **por pulso**, no daño total. El radio/alcance efectivo respeta techos del runtime aun con talentos.

**Talentos y maestría:** tres ramas, una por habilidad: +5% al efecto por rango, +5% área (duración para postura) y −3% CD, tres rangos cada una. Los poderes sin daño aumentan duración (reflejo/postura/montículo) o distancia (retroceso). Maestría de rama añade 10% al efecto correspondiente; miniárbol dos rangos de +5% al efecto y +5% poder de definitiva. Son árboles de prototipo, pendientes de especializaciones artísticas/UI.

**Set — Galería Quebrada:** arma, casco, pechera, botas. 2 piezas +5% vida; 3 +4% daño de habilidades; 4 −4% recargas. Fuente propuesta: laberinto. Completar la colección otorgaría la segunda skin; falta integrar el grant persistente, no se simula como obtenido.

**Apariencias:**

- **Obsidiana Real**: Máscara de obsidiana, hombrera angular y manto de ceremonia. Un salón sin invitados le ofreció un trono. Nahir se llevó el espejo de la puerta y dejó la corona sobre el asiento.
- **Vitral del Réquiem** (skin de Set): Armadura ligera de marcos de vitral y capa de pequeños paños. Los vidrieros refugiados reunieron ventanas rotas para vestir a quien les encontró una salida.
- **Ceniza del Alba (croma):** marfil y ceniza, sin cambios de ropa; se etiqueta croma.

**Voces:** elección «No sigas mi reflejo.»; victoria «Esta salida la elegimos nosotros.»; caída «No… ese gesto no…».

**Contrato:** [nahir.json](manifests/nahir.json).

### Baltra — La Campana Hundida

**tanque.** Tanque frontal que transforma golpes recibidos en ondas de campana.

Baltra cuidaba una campana de aviso en un poblado de la costa nueva. Cuando el agua apareció donde antes había calles, se ató al badajo para seguir tocando mientras los demás subían. La encontraron dentro de la campana, respirando en una bolsa de aire que nadie supo explicar. No afirma que el bronce la salvara: recuerda las manos que tiraron de la cuerda desde arriba. Convirtió la campana en escafandra y vuelve al borde del agua en cada expedición. Su señal no promete victoria. Promete que todavía hay alguien sosteniendo la otra punta.

**Silueta:** Escafandra de campana, botas pesadas y badajo corto; bronce oxidado, azul y cuero.

**Debilidad:** Lenta; la guardia protege solo el frente y reduce su movilidad.

**Básico:** Badajo de salvamento; cuerpo a cuerpo, alcance 88, recarga 620 ms.

**Pasiva — Resonancia de rescate:** Recibir daño efectivo en vida o escudo suma vibración: máximo 5, una cada 500 ms.

| Poder | Coste | CD | Daño × | Alcance / radio | Duración base | Efecto |
|---|---:|---:|---:|---|---:|---|
| Bronce vivo | 26 | 6 s | 2.38 | 150 / 125 | 0 s | Onda circular que consume vibración: +12% de daño por carga. |
| Bajo la campana | 26 | 10 s | 0 | 90 / 70 | 3.5 s | Guardia frontal de 25%; velocidad −20% mientras dura. |
| Badajo de retorno | 28 | 8.5 s | 3.08 | 180 / 100 | 0 s | Golpe en cono: consume vibración y frena enemigos; jefes máximo 12%. |
| ★ Que todos la escuchen | 0 | 37 s | 1.82 | 220 / 190 | 2.4 s | Tres tañidos; el último empuja comunes. No desplaza jefes. |

Daño × multiplica el daño de habilidad calculado por el motor; en efectos por pulsos es **por pulso**, no daño total. El radio/alcance efectivo respeta techos del runtime aun con talentos.

**Talentos y maestría:** tres ramas, una por habilidad: +5% al efecto por rango, +5% área (duración para postura) y −3% CD, tres rangos cada una. Los poderes sin daño aumentan duración (reflejo/postura/montículo) o distancia (retroceso). Maestría de rama añade 10% al efecto correspondiente; miniárbol dos rangos de +5% al efecto y +5% poder de definitiva. Son árboles de prototipo, pendientes de especializaciones artísticas/UI.

**Set — Última Advertencia:** arma, casco, pechera, botas. 2 piezas +5% vida; 3 +4% daño de habilidades; 4 −4% recargas. Fuente propuesta: acuatica. Completar la colección otorgaría la segunda skin; falta integrar el grant persistente, no se simula como obtenido.

**Apariencias:**

- **Campanero de la Catedral**: Armadura de campanario, capucha de oficiante y badajo de plata. Guardó el metal de las campanas pequeñas para que cada refugio pudiera dar su propia alarma.
- **Festival de los Ausentes** (skin de Set): Escafandra con cintas, placas votivas y faroles apagados sujetos al cinturón. Una vez al año lleva los nombres de quienes todavía faltan. Ninguna cinta significa que haya dejado de buscarlos.
- **Ceniza del Alba (croma):** marfil y ceniza, sin cambios de ropa; se etiqueta croma.

**Voces:** elección «Mientras suene, seguí subiendo.»; victoria «Esta vez volvimos todos los que pude contar.»; caída «No suelten… la cuerda…».

**Contrato:** [baltra.json](manifests/baltra.json).

### Maura — La Pastora de Espinas

**tanque.** Protectora de avance: recibe el choque, recoge semillas y abre un corredor.

Maura guiaba rebaños por senderos que ya no figuran en los mapas. Al regresar a las Ruinas encontró las cercas convertidas en espinas y a los animales agrupados frente a un camino que parecía respirar. No intentó dominar el bosque: cortó una vereda lo bastante estrecha para pasar de a uno. Por allí salieron pastores, refugiados y una niña que había olvidado cómo llamarse. Las zarzas crecieron en su cayado después de aquella noche. Maura las poda todos los días. Sabe que proteger algo vivo también significa impedir que ocupe todo el espacio.

**Silueta:** Abrigo corto de corteza, cayado curvo y zarzas bajas; oliva, tierra y rojo seco.

**Debilidad:** Alcance corto y protección temporal; sus zonas no son paredes ni daño ilimitado.

**Básico:** Cayado de zarza; cuerpo a cuerpo, alcance 86, recarga 590 ms.

**Pasiva — Semillero:** Impactos directos generan hasta 5 semillas, como máximo una cada 500 ms.

| Poder | Coste | CD | Daño × | Alcance / radio | Duración base | Efecto |
|---|---:|---:|---:|---|---:|---|
| Raíces de paso | 25 | 6.5 s | 3.5 | 245 / 26 | 0 s | Una línea de raíces daña, frena y deja un suelo de espinas temporal. |
| Corteza prestada | 28 | 11.5 s | 1.575 | 100 / 95 | 4 s | Escudo de 10% de vida; al expirar libera una sola descarga si sigue viva. |
| Poda necesaria | 26 | 8 s | 3.15 | 110 / 110 | 0 s | Corte circular que consume semillas; cura 1% por semilla, máximo 5%. |
| ★ El bosque camina | 0 | 36 s | 1.12 | 150 / 135 | 4.8 s | Seis pulsos móviles de espinas. No aumenta la hitbox ni crea un ejército. |

Daño × multiplica el daño de habilidad calculado por el motor; en efectos por pulsos es **por pulso**, no daño total. El radio/alcance efectivo respeta techos del runtime aun con talentos.

**Talentos y maestría:** tres ramas, una por habilidad: +5% al efecto por rango, +5% área (duración para postura) y −3% CD, tres rangos cada una. Los poderes sin daño aumentan duración (reflejo/postura/montículo) o distancia (retroceso). Maestría de rama añade 10% al efecto correspondiente; miniárbol dos rangos de +5% al efecto y +5% poder de definitiva. Son árboles de prototipo, pendientes de especializaciones artísticas/UI.

**Set — Sendero de Zarzas:** arma, casco, pechera, botas. 2 piezas +5% vida; 3 +4% daño de habilidades; 4 −4% recargas. Fuente propuesta: bosque. Completar la colección otorgaría la segunda skin; falta integrar el grant persistente, no se simula como obtenido.

**Apariencias:**

- **Rosa del Luto**: Armadura de pétalos rígidos, velo corto y cayado de rosal. Plantó una rosa por cada nombre recuperado. Las flores no curan la corrupción: impiden que el recuerdo se vuelva anónimo.
- **Pastora Invernal** (skin de Set): Capa de lana, botas de nieve y cayado con pequeñas campanas de madera. Aprendió a reconocer las pisadas que la nieve todavía no había borrado y guió al último grupo hasta el fuego.
- **Ceniza del Alba (croma):** marfil y ceniza, sin cambios de ropa; se etiqueta croma.

**Voces:** elección «De a uno. Yo cierro la fila.»; victoria «Ahora dejá que el sendero descanse.»; caída «No salgas… del camino…».

**Contrato:** [maura.json](manifests/maura.json).

### Dáriel — El Último Aplauso

**soporte.** Músico de ritmo alternado: daño moderado, protección y recuperación acotada.

Dáriel dirigía la música entre escenas. Cuando el Presentador dejó de permitir que el público se levantara, cambió el final de una melodía por la señal de evacuación que conocían los tramoyistas. Unos pocos siguieron el ritmo hasta las puertas de servicio. Él salió último, todavía marcando el compás sobre la madera. Desde entonces detesta los aplausos que no terminan: escucha en ellos las butacas llenas y la orden de volver a empezar. Viaja con los portadores para ofrecer otra cosa, una canción que sepa callarse cuando todos hayan cruzado.

**Silueta:** Frac gastado, bufanda de escena y diapasón largo; ocre, negro y vino.

**Debilidad:** Daño personal bajo; necesita mantener cerca a sus aliados y gastar notas para curar.

**Básico:** Diapasón del telón; a distancia, alcance 300, recarga 600 ms.

**Pasiva — Contrapunto:** Alternar habilidades distintas acumula hasta 3 notas; repetir la misma no añade notas.

| Poder | Coste | CD | Daño × | Alcance / radio | Duración base | Efecto |
|---|---:|---:|---:|---|---:|---|
| Nota discordante | 24 | 6.5 s | 0.7 | 205 / 95 | 0 s | Cono sonoro: daño y −8% de daño enemigo durante 1,5 s; jefes −4%. |
| Marcha de salida | 28 | 11 s | 0 | 150 / 150 | 2.4 s | Aliados cercanos: escudo 4% sin acumular y velocidad +8%. |
| Volver al estribillo | 28 | 8.5 s | 0.4 | 150 / 130 | 0 s | Daño circular y cura 1% +0,6% por nota consumida; máximo 2,8%. |
| ★ Todavía hay una salida | 0 | 38 s | 0.18 | 170 / 160 | 4.8 s | Seis pulsos alternan daño y cura de 1% con escudo de 2%, sin acumulación. |

Daño × multiplica el daño de habilidad calculado por el motor; en efectos por pulsos es **por pulso**, no daño total. El radio/alcance efectivo respeta techos del runtime aun con talentos.

**Talentos y maestría:** tres ramas, una por habilidad: +5% al efecto por rango, +5% área (duración para postura) y −3% CD, tres rangos cada una. Los poderes sin daño aumentan duración (reflejo/postura/montículo) o distancia (retroceso). Maestría de rama añade 10% al efecto correspondiente; miniárbol dos rangos de +5% al efecto y +5% poder de definitiva. Son árboles de prototipo, pendientes de especializaciones artísticas/UI.

**Set — Función Inconclusa:** arma, casco, pechera, botas. 2 piezas +5% vida; 3 +4% daño de habilidades; 4 −4% recargas. Fuente propuesta: ciudad. Completar la colección otorgaría la segunda skin; falta integrar el grant persistente, no se simula como obtenido.

**Apariencias:**

- **Director del Réquiem**: Levitas largas, guantes blancos y batuta de hueso tallado. Reescribió las partituras de los músicos ausentes sin borrar sus nombres del margen.
- **Carnaval de Medianoche** (skin de Set): Chaqueta de comparsa, máscara lateral y diapasón con cascabeles apagados. La ciudad guardó su último carnaval en baúles. Dáriel abrió uno para que la próxima marcha no fuera un desfile de miedo.
- **Ceniza del Alba (croma):** marfil y ceniza, sin cambios de ropa; se etiqueta croma.

**Voces:** elección «Escuchá el cambio. Ahí salimos.»; victoria «El final también necesita silencio.»; caída «Seguí… el compás…».

**Contrato:** [dariel.json](manifests/dariel.json).

### Orsa — La Cazadora del Trueno

**asesino.** Tiradora que distribuye cargas y decide cuándo descargar la horda.

Orsa inspeccionaba los cables que llevaban señales entre los niveles de las Minas. Durante un apagón oyó tres golpes en una línea que llevaba años cortada. Bajó con una bobina a la espalda y encontró una cuadrilla que repetía el mismo turno sin recordar cómo había empezado. Solo uno reconoció la señal de regreso. Orsa lo sacó siguiendo el cable hasta la luz. Hoy su ballesta almacena pequeñas descargas en el metal que alcanza. No persigue tormentas ni controla el cielo: quiere que, cuando alguien golpee desde abajo, todavía quede una respuesta.

**Silueta:** Ballesta ancha con bobina, poncho minero y guantes gruesos; ámbar, hierro y azul oscuro.

**Debilidad:** La postura la ralentiza; necesita impactos previos y no encadena rebotes infinitos.

**Básico:** Ballesta de bobina; a distancia, alcance 335, recarga 580 ms.

**Pasiva — Carga conductora:** Los básicos dejan hasta 3 cargas por blanco y dueña durante 5 s.

| Poder | Coste | CD | Daño × | Alcance / radio | Duración base | Efecto |
|---|---:|---:|---:|---|---:|---|
| Perno conductor | 25 | 6.5 s | 3.08 | 340 / 22 | 0 s | Perno lineal que atraviesa varios enemigos y añade una carga. |
| Apoyar la culata | 24 | 10.5 s | 0 | 100 / 50 | 3.5 s | Los próximos 3 básicos causan +25%; velocidad −25% mientras dure la postura. |
| Cerrar el circuito | 30 | 9 s | 1.82 | 190 / 175 | 0 s | Consume cargas cercanas para aumentar daño; la descarga salta a 2 vecinos como máximo, con presupuesto total de 12 blancos. |
| ★ Tormenta de rescate | 0 | 36 s | 1.12 | 280 / 210 | 2.4 s | Tres barridos cargan objetivos; una descarga final consume las marcas cercanas. |

Daño × multiplica el daño de habilidad calculado por el motor; en efectos por pulsos es **por pulso**, no daño total. El radio/alcance efectivo respeta techos del runtime aun con talentos.

**Talentos y maestría:** tres ramas, una por habilidad: +5% al efecto por rango, +5% área (duración para postura) y −3% CD, tres rangos cada una. Los poderes sin daño aumentan duración (reflejo/postura/montículo) o distancia (retroceso). Maestría de rama añade 10% al efecto correspondiente; miniárbol dos rangos de +5% al efecto y +5% poder de definitiva. Son árboles de prototipo, pendientes de especializaciones artísticas/UI.

**Set — Circuito de Rescate:** arma, casco, pechera, botas. 2 piezas +5% vida; 3 +4% daño de habilidades; 4 −4% recargas. Fuente propuesta: minas. Completar la colección otorgaría la segunda skin; falta integrar el grant persistente, no se simula como obtenido.

**Apariencias:**

- **Cazadora de Leviatanes**: Abrigo impermeable, ballesta de arpón y carrete de cuerda al costado. En la costa aprendió a apuntar al agua que se mueve antes de que asome la criatura.
- **Trueno Carmesí** (skin de Set): Armadura de cuadrilla, visor rojo y ballesta con aisladores de cerámica. Los rescatistas pintaron de rojo el equipo que debía volver a la superficie. Ella nunca lo cambió.
- **Ceniza del Alba (croma):** marfil y ceniza, sin cambios de ropa; se etiqueta croma.

**Voces:** elección «Tres golpes. Y te contesto.»; victoria «Todavía llega la señal.»; caída «No cortes… el cable…».

**Contrato:** [orsa.json](manifests/orsa.json).

### Tibor — El Rey del Enjambre

**mago.** Mago territorial con una sola nube que debe conservar y recolocar.

A Tibor lo llamaban rey porque era incapaz de dar una orden a sus abejas. Les abría las cajas y esperaba. Cuando el micelio empezó a repetir voces humanas, una colonia abandonó el apiario y se instaló en su carro. Las demás quedaron cubiertas de una cera gris. No sabe por qué esas sobrevivieron; se niega a atribuirse el mérito. Las conduce por zonas donde el aire todavía deja pasar la luz y marca con polen las cosas que deben evitar. Si alguna vez encuentra un lugar seguro, piensa dejar allí la colmena y marcharse sin corona.

**Silueta:** Máscara de malla, colmena pequeña a la espalda e incensario; miel, marrón y crema.

**Debilidad:** El enjambre no puede estar en dos lugares a la vez y se agota si no lo recupera.

**Básico:** Incensario de apicultor; a distancia, alcance 300, recarga 560 ms.

**Pasiva — Colonia viva:** Fuerza de colonia 0–100. Sin nube recupera 9/s; cada pulso de nube cuesta 8. Una sola nube por dueño.

| Poder | Coste | CD | Daño × | Alcance / radio | Duración base | Efecto |
|---|---:|---:|---:|---|---:|---|
| Nube obrera | 30 | 8.5 s | 0.63 | 260 / 110 | 4.8 s | Coloca una nube que daña cada 600 ms hasta agotarse o expirar. |
| Volvé a casa | 25 | 10 s | 1.68 | 260 / 30 | 0 s | Retira la nube, daña su recorrido y recupera 20 de fuerza. Escudo 7%; sin nube, 3%. |
| Polen de aviso | 24 | 6 s | 1.365 | 260 / 90 | 4 s | Salpicadura que daña, frena y mueve la nube al punto elegido. |
| ★ El cielo zumba | 0 | 36 s | 0.756 | 270 / 155 | 6 s | Rellena la fuerza y reemplaza la nube por otra mayor durante 6 s. |

Daño × multiplica el daño de habilidad calculado por el motor; en efectos por pulsos es **por pulso**, no daño total. El radio/alcance efectivo respeta techos del runtime aun con talentos.

**Talentos y maestría:** tres ramas, una por habilidad: +5% al efecto por rango, +5% área (duración para postura) y −3% CD, tres rangos cada una. Los poderes sin daño aumentan duración (reflejo/postura/montículo) o distancia (retroceso). Maestría de rama añade 10% al efecto correspondiente; miniárbol dos rangos de +5% al efecto y +5% poder de definitiva. Son árboles de prototipo, pendientes de especializaciones artísticas/UI.

**Set — Reina Errante:** arma, casco, pechera, botas. 2 piezas +5% vida; 3 +4% daño de habilidades; 4 −4% recargas. Fuente propuesta: micelial. Completar la colección otorgaría la segunda skin; falta integrar el grant persistente, no se simula como obtenido.

**Apariencias:**

- **Señor de las Polillas**: Capucha de seda nocturna, lámpara cerrada y alas bordadas en el manto. En un refugio sin flores aprendió a seguir a las polillas que buscaban el calor de una ventana.
- **Colmena de Ámbar** (skin de Set): Máscara de resina tallada, placas de apicultor y panales vacíos en el cinturón. Conservó en ámbar la primera cera limpia que su colonia volvió a producir.
- **Ceniza del Alba (croma):** marfil y ceniza, sin cambios de ropa; se etiqueta croma.

**Voces:** elección «Ellas eligen dónde quedarse.»; victoria «Todavía escucho el zumbido.»; caída «Abrí… la caja…».

**Contrato:** [tibor.json](manifests/tibor.json).

### Zahra — La Devoradora de Brasas

**mago.** Maga de calor: gana potencia arriesgando sobrecalentarse y debe purgar.

Zahra abría las compuertas de los hornos al final de cada turno. Una noche los indicadores dejaron de bajar, aunque ya no entraba combustible. Los capataces ordenaron mantener la línea. Ella arrancó el cierre de una válvula y sostuvo la salida mientras sus compañeros escapaban. El guante absorbió un calor que desde entonces regresa cuando la Cicatriz está cerca. Zahra lo descarga en ráfagas cortas y cuenta en voz baja antes de volver a abrir el puño. No quiere gobernar el fuego: aprendió demasiado tarde lo que pasa cuando nadie se atreve a apagar una máquina.

**Silueta:** Guante de horno enorme, delantal chamuscado y máscara subida; cobre, carbón y naranja.

**Debilidad:** La mala gestión del calor interrumpe su ofensiva; su paso no atraviesa paredes.

**Básico:** Guante de horno; a distancia, alcance 220, recarga 550 ms.

**Pasiva — Calor prestado:** Calor 0–100: desde 60, +15% de daño. A 100 entra 1,8 s en recuperación; puede usar Enfriar. Fuera de uso pierde 1,5/s.

| Poder | Coste | CD | Daño × | Alcance / radio | Duración base | Efecto |
|---|---:|---:|---:|---|---:|---|
| Boca de horno | 25 | 6 s | 4.4 | 190 / 100 | 0 s | Cono ardiente. Genera 30 de calor. |
| Enfriar | 26 | 11 s | 0 | 160 / 140 | 0 s | Consume el calor y extingue sus líneas cercanas; escudo de 4% a 12% según calor. |
| Paso de ceniza | 26 | 9.5 s | 0.8 | 120 / 28 | 2.4 s | Avanza por suelo seguro y deja 4 pulsos de ceniza. Genera 25 de calor. |
| ★ Abrir todas las válvulas | 0 | 36 s | 1.8 | 180 / 155 | 2.4 s | Consume el calor en 4 pulsos; +0,4% de daño por punto consumido. |

Daño × multiplica el daño de habilidad calculado por el motor; en efectos por pulsos es **por pulso**, no daño total. El radio/alcance efectivo respeta techos del runtime aun con talentos.

**Talentos y maestría:** tres ramas, una por habilidad: +5% al efecto por rango, +5% área (duración para postura) y −3% CD, tres rangos cada una. Los poderes sin daño aumentan duración (reflejo/postura/montículo) o distancia (retroceso). Maestría de rama añade 10% al efecto correspondiente; miniárbol dos rangos de +5% al efecto y +5% poder de definitiva. Son árboles de prototipo, pendientes de especializaciones artísticas/UI.

**Set — Compuerta Abierta:** arma, casco, pechera, botas. 2 piezas +5% vida; 3 +4% daño de habilidades; 4 −4% recargas. Fuente propuesta: fortaleza. Completar la colección otorgaría la segunda skin; falta integrar el grant persistente, no se simula como obtenido.

**Apariencias:**

- **Horno de Porcelana**: Guante esmaltado, delantal de ceramista y máscara de horno blanca. Reconstruyó un pequeño horno para cocer platos en el refugio. Por primera vez el fuego no esperaba una orden de guerra.
- **Corazón Volcánico** (skin de Set): Protecciones de piedra porosa, respirador y guante de basalto con juntas incandescentes. Los mineros le dieron una roca que seguía tibia lejos del pozo. La convirtió en aislante, no en una promesa de poder.
- **Ceniza del Alba (croma):** marfil y ceniza, sin cambios de ropa; se etiqueta croma.

**Voces:** elección «Cuando diga ahora, soltá la válvula.»; victoria «El horno puede esperar.»; caída «Cerrá… la compuerta…».

**Contrato:** [zahra.json](manifests/zahra.json).

### Renko — El Sepulturero sin Tumbas

**tanque.** Tanque de preparación del terreno, sin obstáculos sólidos ni encierros.

Renko anotaba nombres para quienes ya no podían hacerlo. Cuando el cementerio empezó a devolver las lápidas al camino, dejó de cavar: no iba a entregar más recuerdos a una tierra que los repetía mal. Cargó las placas pequeñas en un carro y llevó a los vivos hasta la puerta norte. Su pala todavía arranca surcos de un suelo que parece negarse a quedar quieto. Los usa para contener el avance, nunca para cerrar una salida. Viaja para encontrar un lugar donde dejar los nombres y poder volver a llamarse, simplemente, jardinero.

**Silueta:** Pala cuadrada, placas de piedra y abrigo de trabajo; gris cálido, cuero y marfil.

**Debilidad:** Pierde potencial al abandonar el terreno preparado; las zonas no bloquean enemigos.

**Básico:** Pala de nombres; cuerpo a cuerpo, alcance 90, recarga 640 ms.

**Pasiva — Tierra removida:** Un básico contra un blanco junto a sus surcos produce una sacudida de ×0,25; recarga interna 900 ms.

| Poder | Coste | CD | Daño × | Alcance / radio | Duración base | Efecto |
|---|---:|---:|---:|---|---:|---|
| Surco de contención | 25 | 6.5 s | 2.52 | 235 / 30 | 5 s | Traza una línea que daña, frena y deja tierra removida; máximo 3. |
| Montículo | 26 | 11 s | 0 | 160 / 100 | 4.2 s | Zona no sólida: reduce 8% el daño a aliados dentro. No se acumula con otros montículos. |
| Devolver a la tierra | 28 | 8.5 s | 2.8 | 140 / 120 | 0 s | Consume hasta 3 surcos para aumentar el daño circular un 20% por surco. |
| ★ Aquí siguen los nombres | 0 | 37 s | 1.82 | 240 / 180 | 2.4 s | Tres sacudidas. La última aturde comunes 300 ms; los jefes no se aturden. |

Daño × multiplica el daño de habilidad calculado por el motor; en efectos por pulsos es **por pulso**, no daño total. El radio/alcance efectivo respeta techos del runtime aun con talentos.

**Talentos y maestría:** tres ramas, una por habilidad: +5% al efecto por rango, +5% área (duración para postura) y −3% CD, tres rangos cada una. Los poderes sin daño aumentan duración (reflejo/postura/montículo) o distancia (retroceso). Maestría de rama añade 10% al efecto correspondiente; miniárbol dos rangos de +5% al efecto y +5% poder de definitiva. Son árboles de prototipo, pendientes de especializaciones artísticas/UI.

**Set — Nombres Conservados:** arma, casco, pechera, botas. 2 piezas +5% vida; 3 +4% daño de habilidades; 4 −4% recargas. Fuente propuesta: ciudad. Completar la colección otorgaría la segunda skin; falta integrar el grant persistente, no se simula como obtenido.

**Apariencias:**

- **Marmolista Real**: Mandil de cantero, placas de mármol y pala cincelada. Talló escaleras para un palacio. Hoy utiliza los recortes para escribir nombres que ninguna corte quiso conservar.
- **Enterrador del Desierto** (skin de Set): Turbante de viaje, gafas de arena y pala ancha de bronce. Aprendió a fijar las placas bajo el viento; una inscripción pequeña puede pesar más que una piedra.
- **Ceniza del Alba (croma):** marfil y ceniza, sin cambios de ropa; se etiqueta croma.

**Voces:** elección «El nombre va primero.»; victoria «Todavía no hace falta cavar.»; caída «Que no se borren…».

**Contrato:** [renko.json](manifests/renko.json).

### Sira — La Cartógrafa de lo Perdido

**mago.** Maga que dibuja con su recorrido y convierte trayectos recientes en ataques.

El padre de Sira volvió del Laberinto con un mapa en blanco. Durante semanas señaló sobre él caminos que nadie más veía, hasta que un día dejó una marca de tinta y salió sin abrigo. Sira siguió la marca. Encontró otras en muros, telas y huesos de animales: no indicaban dónde ir, sino dónde alguien había conseguido regresar. Desde entonces registra sus propios pasos y borra las rutas que ya no son seguras. Sus mapas duran poco cerca de la Cicatriz. Le basta con que duren hasta que cruce la última persona.

**Silueta:** Capa corta con mapas, rollo lateral y pluma larga; azul tinta, pergamino y plata.

**Debilidad:** Requiere movimiento previo; carece de teletransporte y de memoria infinita del mapa.

**Básico:** Pluma de agrimensor; a distancia, alcance 310, recarga 570 ms.

**Pasiva — Trazado reciente:** Conserva hasta 12 puntos de los últimos 4 s. Un salto de más de 75 unidades o terreno inaccesible interrumpe el trazo.

| Poder | Coste | CD | Daño × | Alcance / radio | Duración base | Efecto |
|---|---:|---:|---:|---|---:|---|
| Línea de tinta | 25 | 6 s | 4.41 | 290 / 24 | 0 s | Trazo recto que atraviesa hasta 12 enemigos. |
| Volver sobre los pasos | 24 | 10.5 s | 0 | 170 / 24 | 0 s | Recorre hacia atrás hasta 170 unidades del trazo válido. Comprueba cada paso contra muros y vacíos. |
| Borrar el camino | 28 | 8.5 s | 5.04 | 200 / 28 | 0 s | Consume el trazo e impacta una sola vez por objetivo; sin ruta usa un círculo de radio 80. |
| ★ Atlas de los ausentes | 0 | 36 s | 2.016 | 190 / 32 | 2.4 s | Tres pulsos sobre una copia de la ruta; sin ruta dibuja un rombo local. No altera el mapa. |

Daño × multiplica el daño de habilidad calculado por el motor; en efectos por pulsos es **por pulso**, no daño total. El radio/alcance efectivo respeta techos del runtime aun con talentos.

**Talentos y maestría:** tres ramas, una por habilidad: +5% al efecto por rango, +5% área (duración para postura) y −3% CD, tres rangos cada una. Los poderes sin daño aumentan duración (reflejo/postura/montículo) o distancia (retroceso). Maestría de rama añade 10% al efecto correspondiente; miniárbol dos rangos de +5% al efecto y +5% poder de definitiva. Son árboles de prototipo, pendientes de especializaciones artísticas/UI.

**Set — Ruta Imborrable:** arma, casco, pechera, botas. 2 piezas +5% vida; 3 +4% daño de habilidades; 4 −4% recargas. Fuente propuesta: laberinto. Completar la colección otorgaría la segunda skin; falta integrar el grant persistente, no se simula como obtenido.

**Apariencias:**

- **Atlas Astral**: Capa de observatorio, visor de latón y pluma con regla circular. Comparaba las estrellas con caminos terrestres hasta descubrir que ninguno garantiza el regreso.
- **Cartógrafa Corsaria** (skin de Set): Casaca de navegante, compás grande y tubos de cartas marinas. El mar nuevo dejó sin sentido las costas dibujadas. Sira empezó por anotar los refugios que aún tenían luz.
- **Ceniza del Alba (croma):** marfil y ceniza, sin cambios de ropa; se etiqueta croma.

**Voces:** elección «Esta línea llega hasta nosotros.»; victoria «Marcá la salida. Después el resto.»; caída «No sigas… esa tinta…».

**Contrato:** [sira.json](manifests/sira.json).

## Cierre de producción pendiente

1. Producir 10 atlas originales y 20 variantes de vestuario, animaciones y previews. Aplicar el visual gate con referencia Tanque; conservar INCOMPLETE hasta PASS. Los prompts completos están en cada contrato.
2. Crear anticipaciones, impactos y firmas visuales/sonoras propias; comprobar lectura con partículas mínimas y audio apagado. Escucha humana, control de mezcla y revisión táctil de 667×375.
3. Conectar drops a las arenas propuestas y grant de skin de Set por colección persistente, idempotente y sin bonus cosmético.
4. Balance ampliado: diez semillas/rol, Bosque/Minas/Infernal, solo y cuatro jugadores, nivel inicial/20/40, builds completas y curación/daño recibido/tiempo caído. No ajustar por DPS solamente.
5. Medir iPhone real antes de aprobar el piso móvil. Solo después registrar módulos antes del normalizador en index y pasar gates sobre el candidato final.

## Repetir el taller

No utiliza la web publicada. Requiere Node, Python, Playwright y Chromium; relay usa el lockfile de server. El puerto propio separa localStorage de la web de producción. Usar perfiles de prueba; no iniciar cuentas reales.

```sh
node tools/expedition/server.js
# En otra terminal, desde la raíz; CHROMIUM_PATH es opcional si Playwright tiene browser instalado:
node tools/balance/check-entry-reference.js > docs/expedition/reference-results.txt
node tools/expedition/functional.js
ENTRY_BASE_URL=http://127.0.0.1:8806 node tools/balance/entry-gate.js
cp docs/balance/entry-gate-results.json docs/expedition/entry-gate-results.json
# Restaurar el informe del roster de producción, no sustituirlo con el taller:
git restore docs/balance/entry-gate-results.json
npm --prefix server ci --ignore-scripts
node tools/expedition/online.js
node tools/expedition/performance.js
node tools/expedition/production.js
```

`production.js` conserva los manifiestos INCOMPLETE por falta de assets/evidencia visual. No rebaja el contrato ni registra automáticamente campeones.
