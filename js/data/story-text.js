"use strict";
/* ============================================================
   js/data/story-text.js
   TEXTOS DE LA HISTORIA (datos, no lógica). Canon: docs/lore/LA_HORDA_LORE_BIBLE.md (§10-§13 son de
   este archivo: actos, voces, Crónicas, epílogo). La lógica que los muestra vive en js/systems/story.js.
   Reglas de tono (biblia §9): el Hechicero habla CLARO y la sospecha va en una frase al final; los
   Guardianes eran héroes y sus textos dicen lo que fueron; la Horda NUNCA habla (las bestias no tienen
   voz: las comenta el Hechicero, o se oye al Forjador desde abajo).
   - STORY_ACTS: la campaña en tres actos (arco del Hechicero: mentor → sospecha → revelación).
   - BOSS_VOICES: presentación, frases de fase y muerte de cada jefe/subjefe con peso narrativo.
   - HERO_VOICES: 3 líneas por guardián jugable (al elegirlo, al ganar, al caer). Un guardián nuevo
     suma su fila acá (clave = la de CLASSES); sin fila, simplemente no habla.
   - CHRONICLE_BOOKS / CHRONICLE_PAGES: las Crónicas (páginas coleccionables que se leen en el Códice).
   - STORY_EPILOGUE / STORY_POSTCREDITS: el final jugable de la Infernal, por pantallas.
   ============================================================ */

/* ---------------- los tres actos ---------------- */
const STORY_ACTS = [
  {n:"I", name:"EL GUÍA", arenas:["ciudad","fortaleza","bosque"],
    intro:"La Horda volvió a la ciudad de los guardianes, y del humo salió una voz dorada que sabía sus nombres. Les habló de cuatro Guardianes caídos y de cuatro cristales perdidos. Les pidió que confiaran en ella. Todavía no había motivos para no hacerlo.",
    outro:"El primer cristal late en tu bolsa, y la voz del humo dice tu nombre con más ternura que nunca. En la Ciudad dicen que tuviste suerte de encontrar un guía. Nadie pregunta quién encontró a quién."},
  {n:"II", name:"LOS ECOS", arenas:["micelial","hielo","acuatica","laberinto"],
    intro:"Con el primer cristal, el mundo empezó a contestar. Las esporas repiten voces de hace siglos, el hielo guarda cartas que nadie respondió y un mar aparece donde nunca hubo agua. Cada eco cuenta la misma historia que el guía. Casi la misma.",
    outro:"Las esporas, las cartas, el faro y los muros dijeron lo mismo con palabras distintas: eran cuatro, y uno eligió el otro lado. La voz dorada te sigue felicitando. Cada vez felicita un poco más a los cristales."},
  {n:"III", name:"EL DESCENSO", arenas:["abismo","minas","infernal"],
    intro:"Tres cristales pesan más de lo que deberían, y el mundo ya no los aguanta: se abre. Debajo del Abismo hay minas, y debajo de las minas, una puerta. Otros bajaron antes. Ninguno volvió para contar quién les indicó el camino.",
    outro:"El Rey cayó, y con él el nombre que había olvidado. Los cristales no se rompen, la Horda no muere, y alguien tiene que seguir cargando lo que pesa. Esta noche, la fogata es tuya."}
];
// ¿Esta arena cierra su acto? (la última de STORY_ACTS[].arenas): cartel "FIN DEL ACTO" en la victoria y en el campamento.
function storyActClosing(arena){ const a = storyActOf(arena); return a && a.arenas[a.arenas.length-1]===arena ? a : null; }
function storyActOf(arena){ return STORY_ACTS.find(a=>a.arenas.includes(arena)) || null; }

/* ---------------- quién habla (retrato del cuadro de voz) ---------------- */
// face: retrato del cuadro (css/story.css): hech (el arte real del Hechicero) · boss · guardian · forge · echo · chron · hero
const STORY_WHO = {
  hech:    {name:"EL HECHICERO", face:"hech"},
  forjador:{name:"UNA VOZ ENCADENADA", face:"forge"},
  echo:    {name:"ECOS DE LAS ESPORAS", face:"echo"},
  chron:   {name:"CRÓNICAS", face:"chron"}
};

/* ---------------- voces de los jefes ----------------
   who: quién habla por defecto ({name, face} o una clave de STORY_WHO). Cada línea puede ser un texto o
   {who, t}. intro: al aparecer (una vez por partida) · phase[n]: al entrar a la fase n (n ≥ 1) · death: al
   caer de verdad (una muerte que es transformación también cuenta: el Mago Gélido antes del Demonio).
   once:true → las líneas del Hechicero-comentarista se dicen una sola vez por perfil (no se repiten en
   cada partida); las voces propias de los jefes sí se repiten, como en los clásicos. */
const BOSS_VOICES = {
  // ---- 01 · Ciudad Maldita ----
  cm_funcion:{who:{name:"EL MAESTRO DE CEREMONIAS", face:"boss"},
    intro:"¡Damas y caballeros, la función de esta noche: la caída de la ciudad! No se levanten. No van a poder.",
    death:"Se terminó el primer acto… El Presentador no perdona un mal final…"},
  cm_dama:{who:{name:"LA DAMA DEL TELÓN", face:"boss"},
    intro:"Shh. Apagaron las luces para que nadie vea cómo cae la ciudad. Yo tampoco quiero verlo.",
    death:"Bajen… el telón… por favor…"},
  cm_presentador:{who:{name:"EL PRESENTADOR", face:"boss"},
    intro:"Todo esto es un espectáculo, y ustedes son mis invitados especiales. Me prometieron un público que nunca se va.",
    death:"El público… se fue. Nadie me dijo que iba a estar muerto."},
  // ---- 02 · Fábrica Sin Fin ----
  dragon_forja:{who:"hech", once:true,
    intro:"Un dragón de bronce. Lo hicieron para cuidar los hornos, y la Horda le enseñó a cazar. Su fuego es lo único que calienta al Caballero: acordate."},
  caballero:{who:{name:"EL CABALLERO OXIDADO", face:"boss"},
    intro:"Juré que nadie saldría de esta prisión. Nadie. Tampoco yo.",
    phase:{1:"¡La compuerta sigue cerrada! ¡Siempre estuvo cerrada!", 2:"La armadura arde… como el día del juramento…"},
    death:"Siglos custodiando esta puerta… y nunca supe para quién era la última cadena."},
  // ---- 03 · Ruinas (GUARDIÁN 1) ----
  dobladores:{who:{name:"LOS CUATRO REFLEJOS", face:"boss"},
    intro:"Nosotros también vinimos por el cristal. Nosotros también le creímos a la voz.",
    death:"Llevate lo que nosotros no pudimos… y no se lo des…"},
  guardian_ancestral:{who:{name:"EL GUARDIÁN ANCESTRAL", face:"guardian"},
    intro:"¿Otra vez vienen por el cristal? La niebla borró mil caminos. Va a borrar el tuyo.",
    phase:{1:"La Horda me quiere entero… ¡Corran, antes de que no quede nada de mí!"}},
  // ---- 04 · Reino Fúngico ----
  micelio:{who:"hech", once:true,
    intro:"Son los que se perdieron en el Reino. El micelio los junta y los cose. No son ellos: no los llores."},
  madre_espora:{who:"echo",
    intro:"«…sostengan el sello…» «…tengo frío…» «…cierro este camino…» «…yo me quedo…»",
    phase:{1:"«…¿por qué te quedás del otro lado?…»", 2:"«…porque alguien tiene que ponerle una mano encima…»"},
    death:{who:"hech", t:"Ecos. Las esporas repiten cualquier cosa que oyeron alguna vez. No les busques sentido."}},
  // ---- 05 · Arena Gélida (GUARDIÁN 2) ----
  dragon_hielo:{who:{name:"TUNDRAVERX", face:"boss"},
    intro:"Dormí trescientos inviernos sobre este paso, esperando que él volviera. Vos no sos él.",
    death:"Decile al Mago… que dejé el paso abierto… que ya no espere…"},
  mago_hielo_cristal:{who:{name:"EL MAGO GÉLIDO", face:"guardian"},
    intro:"¿Primero? ¿Sos vos? …No. Hace siglos que espero a otro.",
    phase:{1:"El frío es lo único que todavía me obedece."},
    death:"Me está entrando… por dentro… Primero, ¿por qué no volviste?"},
  angel_caido_hielo:{who:{name:"EL DEMONIO GÉLIDO", face:"boss"},
    intro:"YA NO QUEDA NADIE ADENTRO DEL HIELO.",
    phase:{1:"…terminalo… antes de que la Horda termine conmigo…"}},
  // ---- 06 · Arena Acuática ----
  kraken_joven:{who:"hech", once:true,
    intro:"Una cría del Leviatán. Sigue el brillo de los cristales, igual que su madre. Que no se te acerque a ellos."},
  leviatan:{who:"hech", once:true,
    intro:"El Leviatán. No viene por vos: viene por lo que llevás. Protegé los cristales. Son lo único que importa.",
    phase:{1:"¡No lo dejes llegar a los cristales!", 2:"Resistí. Los cristales primero."},
    death:"Bien. Los cristales están a salvo. Y vos también, supongo."},
  // ---- 07 · Laberinto (GUARDIÁN 3) ----
  guardian_laberinto:{who:{name:"EL GUARDIÁN DEL LABERINTO", face:"guardian"},
    intro:"Cerré mil caminos. El tuyo también lo voy a cerrar, si venís de parte de él.",
    death:"El que te guía… no le entregues los cristales. Las llaves eran cuatro… hacé la cuenta."},
  minotauro:{who:{name:"EL MINOTAURO", face:"boss"},
    intro:"¡NADIE SALE DEL CENTRO!",
    phase:{1:"Piedra… todo es piedra… ¿quién era yo?", 2:"¡CERRAR! ¡CERRAR TODOS LOS CAMINOS!"}},
  // ---- 08 · Abismo ----
  ab_carcelero:{who:{name:"EL CARCELERO DEL VACÍO", face:"boss"},
    intro:"Cuatro cadenas sostienen lo que queda del mundo. Rompé una y mirá cómo cae.",
    death:"Ya no hay piso… ahora todo baja… todo baja hacia lo que mora debajo…"},
  ab_morador:{who:"hech", once:true,
    intro:"Lo que mora debajo estuvo esperando que alguien pisara donde no debía. Pisá igual. No hay otro camino.",
    death:"El mundo se rompe. Perfecto: debajo está el camino."},
  // ---- 09 · Minas Profundas ----
  mn_titan:{who:"hech", once:true,
    intro:"Era un minero. Todos acá lo fueron. Bajaron demasiado y la roca se los quedó.",
    death:{who:"forjador", t:"…¿Otra vez alguien baja? Den la vuelta… mientras todavía tengan nombre…"}},
  mn_devoraluz:{who:"hech", once:true,
    intro:"El Devoraluz se come las lámparas. Volvé a encenderlas: acá abajo la luz es lo único que es tuyo."},
  mn_cerbero:{who:"hech", once:true,
    intro:"Cerbero. Guarda el Umbral desde que… desde hace mucho. Matalo, y la puerta se abre.",
    death:[{who:"hech", t:"La puerta está abierta. Cruzá. Te espero del otro lado."},
           {who:"forjador", t:"No crucen… O crucen, pero no le lleven lo que tienen…"}]},
  // ---- 10 · Arena Infernal (GUARDIÁN 4) ----
  hechicero_supremo:{who:{name:"EL HECHICERO SUPREMO", face:"hech"},
    phase:{1:"¿Sabés cuántos portadores guié antes que vos? Todos me dijeron maestro. Ninguno llegó tan lejos."},
    death:[{t:"Todavía no. Nos vemos al final del camino."},
           {who:"forjador", t:"No le des los cristales… Me negué a fundirlos, y por eso me encerró."}]},
  angel_corrompido:{who:{name:"EL HECHICERO SUPREMO", face:"hech"},
    phase:{1:"¿Lo sentís? Cuatro pedazos de un mismo corazón. Juntos no encierran a la Horda: la obedecen."},
    death:"Todos los que cayeron en el camino… ahora son míos."},
  golem_cuerpos:{who:{name:"EL HECHICERO SUPREMO", face:"hech"},
    intro:"Los de la Ciudad. Los de la Fábrica. Los de las Minas. Todos me sirven ahora.",
    phase:{1:"Aldren también está acá adentro. Me decía maestro."},
    death:"¡No! Todavía no… ¡La Horda es MÍA!"},
  rey_horda:{who:{name:"EL REY DE LA HORDA", face:"boss"},
    intro:"YO SOY LA HORDA. NO SE PUEDE MATAR LO QUE ES.",
    phase:{1:"¿Por qué siguen de pie? ¡Los cristales son míos! ¡Siempre fueron míos!", 2:"Primero… Juez… Guardián… ¿Cómo era mi nombre?"},
    death:"Yo elegí quedarme… Alguien tenía que sostenerla…"},
  // ---- Arena Divina (postgame) ----
  jinete_sin_cabeza:{who:{name:"LAS PRUEBAS DIVINAS", face:"chron"},
    intro:"Un cazador sin cabeza y sin descanso. Los que llevan cristales son su presa favorita."}
};
// Tipos que comparten una misma voz (grupos de subjefes, formas con otro nombre).
const STORY_VOICE_ALIAS = {cm_maestro:"cm_funcion", cm_tramoyista:"cm_funcion",
  doblador_guerrero:"dobladores", doblador_arquera:"dobladores", doblador_picaro:"dobladores", doblador_clerigo:"dobladores"};
// La voz que cierra cada arena (pantalla de victoria: "LAS ÚLTIMAS PALABRAS"). Las de los Guardianes salen
// de GUARDIAN_LAST_WORDS (crystals.js).
const STORY_ARENA_LAST = {ciudad:"cm_presentador", fortaleza:"caballero", micelial:"madre_espora", acuatica:"leviatan",
  abismo:"ab_morador", minas:"mn_cerbero", infernal:"rey_horda"};

/* ---------------- voces de los guardianes jugables ----------------
   pick: al elegirlo (pantalla previa y Códice) · win: pantalla de victoria · fall: pantalla de derrota.
   Salen de su historia del Códice (CODEX_CHAMP_LORE). */
const HERO_VOICES = {
  tanque:    {pick:"La puerta norte aguantó tres noches. Esta también va a aguantar.",
              win:"Sigo en pie. A esta altura, es una costumbre.",
              fall:"Tres noches… y ni una más…"},
  guerrero:  {pick:"No me pagues. La Horda ya me debe bastante.",
              win:"Todos sangran. Hasta los que alguna vez fueron héroes.",
              fall:"Mal corte… justo el último…"},
  mago:      {pick:"Fuego y hielo son el mismo idioma. Y los libros que él prohibió dicen lo mismo que yo.",
              win:"La historia oficial tiene huecos. Cada victoria cierra uno.",
              fall:"Me faltaba… una página…"},
  soporte:   {pick:"Mientras yo respire, nadie de este grupo cae para siempre.",
              win:"Todos respiran. El juramento sigue en pie.",
              fall:"Perdón… no llegué a todos…"},
  segador:   {pick:"No sé cómo me llamo. Sé dónde está la Horda.",
              win:"Otra guerra que nadie va a recordar. Mejor así.",
              fall:"Volver a morir… no es tan distinto…"},
  axiom:     {pick:"Alguien dejó abierta esta línea a propósito. Vengo a leer quién la escribió.",
              win:"Excepción controlada. Sigo buscando al autor.",
              fall:"Error… sin… manejar…"},
  profeta:   {pick:"Ya vi cómo termina. Vine igual.",
              win:"Esta vez la visión se equivocó. Ojalá se siga equivocando.",
              fall:"Lo vi venir… y no alcanzó…"},
  musashi:   {pick:"Un solo corte. Antes, hay que entender dónde.",
              win:"Otro rival comprendido. La Horda todavía no.",
              fall:"Buen… duelo…"},
  cazadora:  {pick:"Conozco cada sendero de las Ruinas. Y sé quién las pudrió.",
              win:"Una presa menos. El bosque sigue esperando justicia.",
              fall:"El bosque… me está llamando…"},
  nigromante:{pick:"Los muertos de la ciudad me prestan sus manos. La Horda nunca les pidió permiso.",
              win:"Descansen. Si hace falta, los vuelvo a llamar.",
              fall:"Ahora me toca a mí… obedecer…"},
  libertador:{pick:"Crucé una cordillera entera. Una Horda no me va a detener.",
              win:"Seamos libres. Lo demás no importa nada.",
              fall:"Que otro… siga la marcha…"},
  eren:      {pick:"Nací entre muros. No pienso morir entre ellos.",
              win:"Detrás de cada muro hay otro muro. Este también lo crucé.",
              fall:"Todavía… no soy libre…"}
};

/* ---------------- CRÓNICAS: páginas coleccionables ----------------
   Se encuentran jugando la campaña (nunca en la Divina) y se leen en el Códice › CRÓNICAS. No dan poder
   ni oro: son historia. src dice cómo aparece cada una en su arena:
     world → aparece en el piso de la arena (niveles 4 y 7) · sub → la suelta un subjefe · boss → se
     encuentra al completar la arena (pantalla de victoria). Los élites sueltan, muy de vez en cuando,
     cualquier página que te falte de esa arena. */
const CHRONICLE_BOOKS = [
  {id:"noche",   name:"Crónica de la Noche del Regreso", author:"Ismena, escriba del Archivo de la ciudad",
    blurb:"Lo que pasó la noche en que la Horda volvió, contado por la última persona que siguió escribiendo."},
  {id:"fabrica", name:"Bitácora del Último Maquinista", author:"Sin firma",
    blurb:"Quién pagó la Fábrica Sin Fin, y para qué se forjó su última cadena."},
  {id:"cantos",  name:"Cantos del Primer Guardián", author:"Los elfos de los menhires",
    blurb:"Himnos y memorias del bosque sagrado, antes de la niebla."},
  {id:"ecos",    name:"Ecos del Micelio", author:"Transcripción anónima",
    blurb:"Lo que repiten las esporas cuando se rompen contra la piedra."},
  {id:"cartas",  name:"Cartas del Mago Gélido", author:"El Mago Gélido, Segundo Guardián",
    blurb:"Cartas al Primero de los Cuatro. Ninguna tuvo respuesta."},
  {id:"faro",    name:"Bitácora del Faro de Maren", author:"Maren, farera",
    blurb:"Un faro en un valle sin mar, hasta la noche en que llegó el agua."},
  {id:"laberinto", name:"Diario del Guardián del Laberinto", author:"El Tercero de los Cuatro",
    blurb:"El hombre que levantó los muros, mientras la piedra le subía por el cuerpo."},
  {id:"aldren",  name:"Diario de la Expedición de Aldren", author:"Aldren, portador",
    blurb:"Seis guardianes que la voz guió antes que a vos."},
  {id:"forjador", name:"Páginas del Forjador", author:"El Forjador",
    blurb:"El único que sabe qué fueron los cristales antes de ser cuatro."},
  {id:"juicio",  name:"El Libro del Juicio", author:"El Primero de los Cuatro",
    blurb:"Lo que el Hechicero Supremo escribió para sí mismo."}
];
const CHRONICLE_PAGES = [
  // ---- 01 · Ciudad Maldita ----
  {id:"noche_1", book:"noche", n:1, arena:"ciudad", src:"world", title:"Las campanas",
    text:"Las campanas de la ciudad sonaron solas a medianoche. Nadie tiraba de las cuerdas. Cuando salimos a la calle, la Horda ya estaba adentro: no rompió las puertas, las atravesó como atraviesa el frío.\n\nVi a mi vecino abrir la boca para gritar y no le salió su voz: le salió otra cosa. Los guardianes de la muralla bajaron sin que nadie los llamara. El capitán sostuvo la puerta norte con el hombro. La sanadora del Santuario del Alba corría entre los caídos.\n\nEscribo esto a la luz de un incendio, porque es la única luz que queda."},
  {id:"noche_2", book:"noche", n:2, arena:"ciudad", src:"boss", title:"La figura en el humo",
    text:"Al amanecer, el humo no se fue: se abrió. Adentro había una figura hecha de luz, con alas que no terminaban de ser alas. Habló con calma, como quien ya conoce el final de la historia.\n\nDijo que los Cuatro Guardianes estaban cayendo y que sus cristales tenían que volver a manos limpias. Llamó a cada guardián por su nombre. Nadie le había dicho sus nombres.\n\nAnoto un detalle que nadie más quiso anotar: la figura nunca tocó el suelo. Donde tendrían que haber estado sus pies, el humo seguía siendo humo."},
  // ---- 02 · Fábrica Sin Fin ----
  {id:"fabrica_1", book:"fabrica", n:1, arena:"fortaleza", src:"world", title:"Los planos",
    text:"El encargo llegó con un sello de oro y unos planos que ninguno de nuestros ingenieros entendía del todo: una fábrica que no se detuviera nunca, para forjar las cadenas que iban a sujetar a la Horda.\n\nEl que trajo los planos no quiso dar su nombre. Los viejos lo llamaban el Primero, y bajaban la vista al decirlo. Levantamos los hornos donde él señaló. Juramos, a pedido suyo, que ninguna cadena saldría de acá sin su orden.\n\nEl Caballero juró más fuerte que todos: que nada ni nadie saldría jamás de su prisión."},
  {id:"fabrica_2", book:"fabrica", n:2, arena:"fortaleza", src:"sub", title:"La última cadena",
    text:"Hoy llegó la última orden. Una sola cadena, más gruesa que un hombre, con eslabones de un metal que no se funde. «Para un solo prisionero», decía la carta. No preguntamos para quién.\n\nTardamos cuarenta días. Cuando la cadena salió por la compuerta, los hornos siguieron encendidos y nosotros empezamos a olvidar para qué. Mis compañeros ya no recuerdan sus nombres. Yo escribía el mío al pie de cada página para no perderlo.\n\nEsta mañana lo leí y no supe de quién era. Por eso esta página va sin firma."},
  // ---- 03 · Ruinas Célticas (GUARDIÁN 1) ----
  {id:"cantos_1", book:"cantos", n:1, arena:"bosque", src:"world", title:"Canto de la niebla",
    text:"Guardián de la niebla, raíz que no duerme,\nborrá los senderos a quien busca tu piedra.\nQue el ladrón camine en círculos hasta olvidarse,\nque el hambriento encuentre solamente helechos.\n\nGuardián de la niebla, corteza y promesa,\nsostené el sello mientras nosotros cantamos,\ny cuando ya no cantemos,\nsostenelo igual."},
  {id:"cantos_2", book:"cantos", n:2, arena:"bosque", src:"sub", title:"La visita",
    text:"Los ancianos cuentan que, antes de la gran niebla, llegó al bosque un hombre de luz dorada. Era uno de los Cuatro, y el Guardián lo recibió como a un hermano. Hablaron tres noches entre los menhires.\n\nLa cuarta mañana, el hombre de luz se fue sin despedirse, y el Guardián levantó la niebla por primera vez. Desde entonces nadie volvió a encontrar el cristal.\n\nCuando le preguntamos de quién lo escondía, el Guardián respondió: «De la Horda». Y después, más bajo: «Y de los que la entienden demasiado»."},
  // ---- 04 · Reino Fúngico ----
  {id:"ecos_1", book:"ecos", n:1, arena:"micelial", src:"world", title:"Cuatro voces",
    text:"Lo anoto tal como sale de las esporas cuando se rompen contra la piedra.\n\n«…sostengan el sello, no lo suelten…», dice una voz de madera vieja.\n«…tengo frío. Siempre voy a tener frío…», dice una voz que tiembla.\n«…cierro este camino, y el siguiente, y el siguiente…», dice una voz de piedra.\n\nY una cuarta, tranquila, que no se parece a ninguna: «…váyanse ustedes. Yo me quedo.»\n\nLas esporas repiten lo que escucharon. No saben mentir. No saben nada."},
  {id:"ecos_2", book:"ecos", n:2, arena:"micelial", src:"sub", title:"Lo que dijo el cuarto",
    text:"Esta noche las esporas repitieron una conversación entera. La voz de piedra preguntaba: «¿Por qué te quedás del otro lado?».\n\nLa voz tranquila contestó: «Porque la Horda no se puede matar. Nosotros la encerramos, y el encierro se pudre. Alguien tiene que ponerle una mano encima».\n\nHubo un silencio largo. Después, la voz de madera dijo una sola palabra, la que el micelio repite desde hace siglos cada vez que alguien pasa: «Traidor»."},
  // ---- 05 · Arena Gélida (GUARDIÁN 2) ----
  {id:"cartas_1", book:"cartas", n:1, arena:"hielo", src:"world", title:"Primera carta",
    text:"Primero:\n\nEl invierno avanza sobre la montaña, y yo avanzo con él. Esta semana congelé tres caminos de la Horda; mañana congelo el cuarto. Los otros dos resisten en sus puestos, o eso quiero creer.\n\nDijiste que ibas a volver cuando el sello estuviera firme del otro lado. El sello está firme. Te guardo el lugar junto al fuego, aunque en esta catedral ya no queda fuego.\n\nEscribime. Aunque sea una línea."},
  {id:"cartas_2", book:"cartas", n:2, arena:"hielo", src:"sub", title:"Carta sin fecha",
    text:"Tallo ángeles de cristal para que recen por el sello: es lo único que me calma las manos. Tundraverx duerme sobre el paso y respira escarcha.\n\nAyer terminé un ángel y, antes de que se enfriara del todo, me habló. Tenía tu voz, Primero. Me pidió el cristal.\n\nLe rompí las alas. Desde entonces no tallo más ángeles, y el frío se me mete por dentro sin pedir permiso."},
  {id:"cartas_3", book:"cartas", n:3, arena:"hielo", src:"boss", title:"Última carta",
    text:"Ya no te escribo a vos. Le escribo a quien encuentre esto, cuando yo ya no sea yo.\n\nÉramos cuatro. Tres nos quedamos de este lado, sosteniendo. El cuarto eligió el otro lado y lo llamó sacrificio.\n\nSi una voz dorada te trajo hasta mi cristal, llevátelo: no voy a poder impedirlo. Pero no se lo entregues. Llevalo encima. Un cristal es más fuerte cuanto más tiempo lo lleva alguien que no lo quiere para sí."},
  // ---- 06 · Arena Acuática ----
  {id:"faro_1", book:"faro", n:1, arena:"acuatica", src:"world", title:"El mar que no estaba",
    text:"Mi faro está en un valle. Nunca tuvo mar: lo levantaron mis abuelos para guiar caravanas en la niebla.\n\nAnoche el agua llegó sin tormenta y sin ruido, de abajo hacia arriba, como si la tierra se hubiera acordado de otra forma de ser. Tapó el pueblo, las ruinas viejas y el camino.\n\nLos que saben de estas cosas dicen que alguien se llevó el segundo cristal del hielo, y que el mundo se dobla alrededor de lo que se mueve. Yo solo sé que ahora el faro sirve, y que no hay barcos."},
  {id:"faro_2", book:"faro", n:2, arena:"acuatica", src:"sub", title:"Lo que sigue al brillo",
    text:"Enciendo el faro cada noche, aunque no haya a quién guiar. Hoy entendí que algo me mira desde el fondo.\n\nNo persigue la luz del faro: la ignora. Persigue otra luz, una que pasó por el valle hace unos días en manos de unos viajeros, fría y celeste.\n\nLo que nada debajo no quiere barcos. Quiere cristales. Si leés esto y llevás uno encima, no te quedes cerca del agua."},
  // ---- 07 · Laberinto (GUARDIÁN 3) ----
  {id:"laberinto_1", book:"laberinto", n:1, arena:"laberinto", src:"world", title:"Muros",
    text:"Cada muro de este laberinto es un camino que la Horda ya no puede usar. Los levanto de noche, piedra sobre piedra, y de día los recorro para no olvidarme del dibujo.\n\nLos gólems me ayudan con lo pesado. La Esfinge cuida la entrada y pregunta lo que yo le enseñé a preguntar.\n\nEscondí el cristal en el centro. Solo los Cuatro sabemos dónde queda el centro de algo que se mueve."},
  {id:"laberinto_2", book:"laberinto", n:2, arena:"laberinto", src:"sub", title:"Las llaves",
    text:"Alguien abre mis caminos desde adentro. Encuentro muros corridos que yo no corrí, pasillos que se abren hacia la Horda como una boca.\n\nPara mover estas piedras hace falta una llave de Guardián, y las llaves son cuatro. La mía la llevo en el pecho. La del Ancestral duerme bajo su niebla. La del Mago está sepultada en el hielo, con él.\n\nHago la cuenta una y otra vez. Siempre me sobra una."},
  {id:"laberinto_3", book:"laberinto", n:3, arena:"laberinto", src:"boss", title:"La piedra",
    text:"La piedra me sube por las piernas. Ya no siento los pies, y a veces no recuerdo por qué construí todo esto. Escribo mientras todavía sé escribir: el que abrió los caminos fue uno de nosotros.\n\nSi me vencés —y me vas a vencer—, no le entregues mi cristal a quien te mandó. Preguntale por qué necesita manos ajenas para algo que dice que es suyo.\n\nSi no te contesta, ya tenés la respuesta."},
  // ---- 08 · Abismo ----
  {id:"aldren_1", book:"aldren", n:1, arena:"abismo", src:"world", title:"Día cuarenta",
    text:"Día cuarenta. Somos seis. La voz nos encontró en el camino, como encuentra a todos: con luz, con calma, con nuestros nombres en la boca.\n\nNos dijo que los Guardianes eran demasiado fuertes para nosotros y que no hacía falta pelearlos, que había otra tarea más importante: bajar. «Debajo del Abismo hay minas», dijo, «y debajo de las minas, una puerta. Hay que abrirla desde este lado.»\n\nNos llamó guardianes. Nunca nadie nos había llamado así."},
  {id:"aldren_2", book:"aldren", n:2, arena:"abismo", src:"sub", title:"Día cuarenta y seis",
    text:"Día cuarenta y seis. Perdimos a Tavia en el borde: el piso se abrió y no la devolvió. El Carcelero nos miró pasar sin moverse, como quien mira ganado que ya tiene dueño.\n\nEsta noche le pregunté a la voz por qué no baja ella misma, si conoce tan bien el camino. Tardó en contestar. Dijo que no puede cruzar a este lado, que solo llega hasta nosotros como llega la luz al fondo de un pozo.\n\nDespués dijo: «Por eso los necesito»."},
  // ---- 09 · Minas Profundas ----
  {id:"aldren_3", book:"aldren", n:3, arena:"minas", src:"world", title:"Día cincuenta y uno",
    text:"Día cincuenta y uno. Acá abajo la luz es territorio. Encendemos lámparas y las perdemos una por una: algo se las come.\n\nSomos tres. Bren dejó de hablar ayer, y hoy dejó de ser Bren.\n\nEncontramos marcas en las paredes, más viejas que nosotros: otros nombres, otras cuentas de días. Todas terminan en la misma galería. La voz dice que no las leamos. Que sigamos bajando."},
  {id:"aldren_4", book:"aldren", n:4, arena:"minas", src:"sub", title:"Último día",
    text:"No sé qué día es. Encontramos la puerta: piedra negra, cadenas y un calor que respira. Delante duerme una bestia de tres cabezas, encadenada hace tanto que las cadenas le crecieron adentro.\n\nLa voz está contenta. Dice que abramos, que del otro lado alguien nos espera para darnos las gracias. Somos dos.\n\nSi alguien encuentra esto: la voz nos llamó guardianes. No éramos guardianes. Éramos una llave."},
  {id:"forjador_1", book:"forjador", n:1, arena:"minas", src:"boss", title:"La piedra entera",
    text:"Antes de los cristales hubo una piedra: el Sello, entero, del tamaño de un corazón. Nadie podía sostenerlo sin volverse otra cosa.\n\nMe pidieron que lo partiera en cuatro, para que cuatro lo sostuvieran sin que ninguno fuera su dueño. Lo partí. Tardé un año en cada corte.\n\nEscribo esto para quien llegue hasta el Umbral. Si tenés cristales, tenés un pedazo de aquel corazón. Y si alguien te pide que los juntes, preguntate qué quiere llegar a ser."},
  // ---- 10 · Arena Infernal (GUARDIÁN 4) ----
  {id:"forjador_2", book:"forjador", n:2, arena:"infernal", src:"world", title:"Los Cuatro",
    text:"El Ancestral hablaba poco y escuchaba a los árboles. El Mago se reía fuerte, antes del frío. El Tercero dibujaba caminos en la tierra con un palo, y después los borraba.\n\nY el Primero, el que juzgaba, no se reía nunca: medía. Medía a la Horda como se mide un río antes de cruzarlo.\n\nCuando entraron a esta dimensión para sellarla, fue el último en salir. Mejor dicho: fue el único que no salió."},
  {id:"forjador_3", book:"forjador", n:3, arena:"infernal", src:"sub", title:"La negativa",
    text:"Volvió siglos después, con la voz más dorada que nunca, y me pidió que fundiera los cuatro cristales en uno. «Una piedra entera no se puede sostener», me dijo, «pero se la puede ser.»\n\nMe negué. No dijo nada; no hacía falta.\n\nA la semana llegaron las cadenas, forjadas en una fábrica que él había pagado siglos atrás, con eslabones de un metal que no se funde. Las reconocí enseguida: a trabajar ese metal les había enseñado yo."},
  {id:"forjador_4", book:"forjador", n:4, arena:"infernal", src:"world", title:"A los que vienen",
    text:"Si leés esto, bajaste. Te guió la misma voz que guió a los otros, y llegaste más lejos que todos.\n\nEscuchame: los cristales no eligen al más fuerte. Eligen al que los sigue llevando cuando pesan. Él los quiere porque no puede cargarlos: solo puede tenerlos.\n\nNo le des lo que llevás. Y si te lo arranca, no te preocupes por los cristales: preocupate por él. Una piedra entera no perdona a quien la usa."},
  {id:"juicio_1", book:"juicio", n:1, arena:"infernal", src:"boss", title:"El Libro del Juicio",
    text:"Nos pidieron contener lo que no puede morir. Lo contuvimos, y lo llamaron victoria. Pero un encierro no es un final: es una espera. La Horda no se cansa. Nosotros sí.\n\nEl Ancestral se durmió, el Mago se congeló, el Tercero se volvió piedra. Yo hice la cuenta antes que ellos.\n\nSi la Horda no puede morir, que tenga dueño. Si alguien tiene que ser el monstruo, que sea uno que sepa lo que hace. No pido perdón. Pido que, cuando me venzan, alguien la sostenga mejor que yo."}
];

/* ---------------- EPÍLOGO (al completar la Arena Infernal por primera vez; se repite desde el Códice) ----------------
   Pantallas de texto sobre el arte de las arenas (assets/ui/codex/arenas/*.jpg). art:"crystals" = los
   cuatro cristales dibujados en vivo (crystalDrawGem). who = una línea dicha por alguien. */
const STORY_EPILOGUE = [
  {art:"infernal", kicker:"EPÍLOGO",
    text:"El Rey de la Horda cae de rodillas en el corazón del Infierno. Por un instante, debajo de los cuernos y del fuego, vuelve a ser un hombre: el Primero de los Cuatro, el que juzgaba."},
  {art:"infernal",
    text:"No pide clemencia. Mira los cristales que se le escapan de las manos como quien mira irse a un viejo amigo.",
    who:"EL PRIMERO", say:"Yo elegí quedarme. Alguien tenía que sostenerla."},
  {art:"minas",
    text:"En el fondo de la arena, las cadenas del Forjador se aflojan. Son cadenas de la Fábrica Sin Fin, forjadas por una civilización que ya no existe, para un solo prisionero.",
    who:"EL FORJADOR", say:"No me pidan que los funda. Nunca más. Pero tampoco me pidan que los rompa: no se puede."},
  {art:"crystals",
    text:"Los cristales no pueden destruirse. La Horda tampoco: es la maldad que existe en el mundo, y no muere. Espera.",
    who:"EL FORJADOR", say:"Los cristales siguen necesitando portadores. Él lo sabía. Por eso los necesitaba a ustedes."},
  {art:"ciudad",
    text:"En la Ciudad Maldita, las campanas vuelven a sonar, esta vez porque alguien tira de las cuerdas. Nadie le cambió el nombre todavía. Pero en la puerta norte hay gente esperando a los que bajaron."},
  {art:"ciudad", kicker:"LOS NUEVOS GUARDIANES",
    text:"Ya no son solo los guardianes de una ciudad. Llevan el Cristal Ancestral, el de Escarcha, el de Piedra, y el del Juicio, que quedó sin dueño. Donde había cuatro Guardianes, ahora están ellos.",
    note:"El Cristal del Juicio es tuyo: podés llevarlo antes de cada partida."},
  {art:"black", kicker:"LA HORDA", final:true, text:"Fin del Libro Primero."}
];
const STORY_POSTCREDITS = [
  {art:"divina", kicker:"DESPUÉS",
    text:"Lejos de la ciudad, en un lugar donde el cielo es de oro, unas gradas vacías esperan. Alguien mira cuatro cristales nuevos en manos ajenas.",
    who:"UNA VOZ DESDE LAS GRADAS", say:"Portadores. Veamos si merecen serlo.",
    note:"ARENA DIVINA — Las Cinco Pruebas ya están abiertas."},
  {art:"abismo",
    text:"Y en el fondo del Abismo, donde cayó el Rey, algo que ya no tiene rey empieza a moverse. Sin dueño, la Horda no obedece a nadie. Solo crece.",
    note:"LA HORDA INFINITA — la Horda no se termina: aguantá lo que puedas."}
];
