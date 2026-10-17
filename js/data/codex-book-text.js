"use strict";
/* ============================================================
   js/data/codex-book-text.js
   EL LIBRO DE LA HORDA — textos del Códice como eje narrativo (datos, no lógica).
   Lógica de disparo/omisión/persistencia: js/systems/codex-narrative.js · visor animado:
   js/ui/codex/codex-book.js · ilustraciones procedurales: js/ui/codex/codex-book-art.js.
   Canon: docs/lore/LA_HORDA_LORE_BIBLE.md. Regla de tono: acá el narrador es Ismena, escriba del Archivo
   de la Ciudad Maldita (la misma de la Crónica de la Noche del Regreso). No spoilea: la traición del
   Hechicero recién se cuenta en el fragmento de la Arena Infernal, cuando ya la viviste.
   Una "página" del libro = {kicker, title, text, art}. `art` es el nombre de una ilustración
   procedural ("tapa", "horda"...) o "arena:<id>" (la panorámica real de esa arena, teñida de tinta).
   Los datos de sistemas (niveles, talentos, Brasas...) se verificaron contra el código; si cambian las
   reglas, se cambia el texto acá (tools/items/t_codex_book.js chequea la cobertura de temas).
   ============================================================ */

// GRAN INTRODUCCIÓN: se lee una vez, al elegir al primer campeón (y se puede revisitar desde el Códice).
const BOOK_INTRO_PAGES = [
  {kicker:"EL CÓDICE", title:"EL LIBRO DE LA HORDA", art:"tapa",
   text:"Lo anotó Ismena, escriba del Archivo de la Ciudad Maldita, mientras todavía quedaba un archivo. Si lo estás leyendo, ya elegiste a tu guardián. Pasá la página: antes de pelear tenés que saber contra qué."},
  {kicker:"ANTES DE TODO", title:"CUATRO GUARDIANES, CUATRO CRISTALES", art:"guardianes",
   text:"Hace siglos, cuatro Guardianes sostenían un sello hecho de cuatro cristales. Mientras el sello aguantó, la Horda quedó encerrada en su propia dimensión y el mundo pudo dormir."},
  {kicker:"EL ENEMIGO", title:"LA HORDA NO MUERE", art:"horda",
   text:"La Horda es la maldad que hay en el mundo, y eso no se mata. No destruye: corrompe. Los monstruos que hoy custodian los cristales alguna vez fueron héroes. Acordate de eso cuando los tengas enfrente."},
  {kicker:"LA NOCHE DEL REGRESO", title:"LAS CAMPANAS SONARON SOLAS", art:"arena:ciudad",
   text:"A medianoche las campanas sonaron sin que nadie tirara de las cuerdas. La Horda ya estaba adentro: atravesó las puertas como atraviesa el frío. Los guardianes de la muralla bajaron sin que nadie los llamara."},
  {kicker:"LA GUERRA", title:"LAS CICATRICES", art:"cicatriz",
   text:"Los Guardianes fueron cayendo, uno por uno. Donde la Horda pasa, la realidad queda herida: son las Cicatrices. Forman un camino de diez arenas, y vas a seguirlo de a una, hasta el fondo."},
  {kicker:"LA VOZ DORADA", title:"UN GUÍA CON ALAS DE LUZ", art:"hechicero",
   text:"Del humo salió una figura hecha de luz. Habló con calma y llamó a cada guardián por su nombre. Se ofreció a guiarlos hasta los cristales. Nadie vio motivos para negarse. Todavía."},
  {kicker:"TU MISIÓN", title:"SOBREVIVIR", art:"mision",
   text:"Tu único trabajo es seguir con vida. Cada arena tiene 10 niveles y cada nivel dura un ratito: aguantá hasta que el reloj llegue a cero. En el último hay un jefe. Si un compañero cae, mantené ✚ a su lado para levantarlo."},
  {kicker:"UN LIBRO QUE SE ESCRIBE SOLO", title:"SEGUÍ LEYENDO", art:"libro",
   text:"Cada vez que termines una arena, el Códice suma un fragmento: qué pasó ahí y cómo se juega lo que viene. Podés saltear esta lectura cuando quieras y volver a abrirla desde Menú › Códice › Libro."}
];

// CARGA CORTA: una sola página, antes de entrar a cada arena de la campaña (solo, nunca en sala).
const BOOK_SHORT_LINES = {
  ciudad:    "Las campanas todavía suenan. Hay que volver a la muralla.",
  fortaleza: "Seguí la Cicatriz hasta una fábrica que no para nunca.",
  bosque:    "La niebla guarda al más viejo de los Cuatro. Ya no es él.",
  micelial:  "La caverna repite voces de hace siglos. No le contestes.",
  hielo:     "El Segundo Guardián esperó solo. Esperaba a alguien que no volvió.",
  acuatica:  "Un mar donde nunca hubo agua. Los cristales doblan el mundo.",
  laberinto: "Muros levantados para esconderse. Seguí los sellos: I, II, III.",
  abismo:    "El mundo se abre debajo tuyo. No hay vuelta atrás.",
  minas:     "Acá la luz es territorio. Que no se apague ninguna lámpara.",
  infernal:  "El corazón de la Horda. Hoy se termina, de una forma u otra."
};

// FRAGMENTOS: uno por arena, se ganan al completarla. Cada uno = página de historia + página "cómo se juega".
// topic: tema de sistema que enseña (lo usa el chequeo de cobertura). lesson sin presión de compra.
const BOOK_FRAGMENTS = {
  ciudad: {title:"LA PRIMERA CICATRIZ", topic:"modos", topicTitle:"A QUÉ SE JUEGA", topicArt:"modos",
    lore:"La Ciudad Maldita resistió la noche, pero algo quedó marcado en el suelo: una grieta que no es de piedra. La voz dorada la miró y dijo que había que seguirla. Ismena anotó que era la primera Cicatriz, y que no iba a ser la última.",
    lesson:"MODO CAMPAÑA: las diez arenas en orden, solo o con amigos; cada una se abre al ganar la anterior. Fuera de la campaña están Convergencia (5 contra 5, tres carriles) y Coliseo (2 contra 2). Al ganar la Fábrica Sin Fin se abre la Horda Infinita."},
  fortaleza: {title:"UNA FÁBRICA QUE NO PARA", topic:"progresion", topicTitle:"CRECER SIN APURO", topicArt:"progreso",
    lore:"La Horda contaminó las máquinas de una civilización que ya no está. Los que construyeron la Fábrica desaparecieron; las máquinas todavía no se enteraron. De los techos colgaba una cadena sin terminar: la última que se forjó.",
    lesson:"Cada victoria te da experiencia, oro y un cofre. La XP sube el nivel de tu guardián, y cada guardián lleva su propio nivel: probar otro no te hace perder nada. El oro se gasta fuera de la partida, cuando vos quieras."},
  bosque: {title:"EL GUARDIÁN DE LA NIEBLA", topic:"equipo", topicTitle:"LO QUE LLEVÁS PUESTO", topicArt:"equipo",
    lore:"El más viejo de los Cuatro dormía entre menhires, y lo que dormía ya no era él. Lo liberaste y te dejó su cristal. Ahí entendiste lo que Ismena ya sabía: los monstruos de este mundo alguna vez fueron héroes.",
    lesson:"Los objetos del cofre se equipan en tu guardián, fuera de la partida. Tienen rarezas, y los sets dan bonos al juntar sus piezas. Las Gemas ◆ se ganan jugando y sirven para subir el nivel de un objeto; no se compran."},
  micelial: {title:"LO QUE REPITE EL MICELIO", topic:"maestria", topicTitle:"CADA HABILIDAD SE AFILA", topicArt:"maestria",
    lore:"Esta caverna crece y repite voces que escuchó hace siglos. Entre las esporas rotas se oyen nombres de Guardianes, y también uno que no debería estar. La voz dorada dijo que no importaba. Ismena lo subrayó dos veces.",
    lesson:"Cuanto más usás una habilidad, más sube su nivel de uso: una mejora mínima y permanente. Los puntos que invertís en ella (hasta 10) la transforman: más daño, más área, más duración y menos espera. Lo ves en Códice › Guardianes › Maestría."},
  hielo: {title:"CARTAS SIN RESPUESTA", topic:"talentos", topicTitle:"EL ÁRBOL DE TALENTOS", topicArt:"talentos",
    lore:"El Mago Gélido resistió solo, escribiéndole al Primero de los Cuatro. Ninguna carta tuvo respuesta. Al final dijo algo que la voz dorada no quiso comentar: «El Primero no cayó».",
    lesson:"Desde el nivel 40, tu guardián gana puntos para el árbol de talentos de su clase: uno al llegar y otro cada dos niveles. Son pocos y pesan, así que elegí con cabeza. Hasta ahí, concentrate en jugar y en equiparte."},
  acuatica: {title:"EL MAR QUE NO ESTABA", topic:"dificultad", topicTitle:"LA MISMA CAMPAÑA, MÁS DURA", topicArt:"dificultad",
    lore:"Con el segundo cristal en tu bolsa apareció un mar donde nunca hubo agua. Es el precio: la realidad se dobla alrededor de ellos. En un faro sin costa, una farera llamada Maren anotó la noche en que llegó la marea.",
    lesson:"Al terminar la campaña en Normal se abre Pesadilla, y al terminarla en Pesadilla, Infierno. Es la misma historia con una horda más fuerte; a cambio, mejor botín y más XP y oro. Nunca es obligatorio."},
  laberinto: {title:"EL TERCERO LEVANTÓ MUROS", topic:"cooperativo", topicTitle:"NADIE PELEA SOLO", topicArt:"cooperativo",
    lore:"El Tercer Guardián construyó este laberinto para esconderse de la Horda, y de otros. La piedra le fue subiendo por el cuerpo hasta comerle el juicio. Antes de caer te advirtió algo sobre quien te guía. Quedate con eso.",
    lesson:"Podés crear una sala con un código o sumarte a una abierta con JUGAR YA: equipos de cuatro, y los lugares libres los ocupan bots, siempre marcados. Si alguien cae, mantené ✚ a su lado. Al final, la calificación mide lo que aportó tu rol."},
  abismo: {title:"EL PUNTO DE NO RETORNO", topic:"tienda", topicTitle:"EL ORO Y LA TIENDA", topicArt:"tienda",
    lore:"Tres cristales ya pesan más de lo que el mundo aguanta, y el suelo se rasga bajo tus pies. Debajo del Abismo hay minas, y debajo de las minas, una puerta. Otros bajaron antes que vos.",
    lesson:"El oro se gana jugando y se gasta en la Tienda: objetos del día, nuevos guardianes, skins y cromas. Nada de eso es obligatorio para ganar; cada guardián extra es, sobre todo, otra forma de jugar."},
  minas: {title:"LA LUZ ES TERRITORIO", topic:"brasas", topicTitle:"LAS BRASAS ✦", topicArt:"brasas",
    lore:"Las Minas Profundas guardan lo que dejaron los que bajaron antes: nombres grabados en la roca, cuentas de días que se cortan de golpe. Acá la oscuridad también pega, y Cerbero custodia el umbral.",
    lesson:"Las Brasas ✦ son una moneda aparte y solo compran apariencia: skins y cromas. Nunca compran poder ni hacen falta para llegar al final. Todo el poder se consigue jugando, con el oro que ganás en las arenas."},
  infernal: {title:"EL QUE ELIGIÓ QUEDARSE", topic:"postgame", topicTitle:"LO QUE SIGUE", topicArt:"postgame",
    lore:"El Hechicero Supremo fue el Primero de los Cuatro y se quedó con la Horda por decisión propia: quería fundir los cristales para ser la Horda. Cayó diciendo que alguien tenía que sostenerla. Los cristales siguen necesitando portadores, y ahora son ustedes.",
    lesson:"Ganaste la campaña. Quedan la Arena Divina (las Cinco Pruebas), la Horda Infinita, las dificultades Pesadilla e Infierno, Convergencia y Coliseo. Tu guardián y tu equipo siguen creciendo en todos. El Códice guarda todo lo que viste.",
    extra:[{kicker:"RESUMEN DEL LIBRO", title:"LO QUE SABÉS AHORA", art:"recap",
      text:"HISTORIA: cuatro Guardianes, cuatro cristales, y una Horda que no muere.\nMODOS: campaña, cooperativo, Convergencia, Coliseo, Horda Infinita y Divina.\nPROGRESIÓN: XP y nivel, oro y Tienda, equipo y Gemas, maestría, talentos, dificultades. Las Brasas ✦ son solo apariencia."}]}
};

// Temas que el recorrido completo de la campaña tiene que cubrir (el test falla si falta alguno).
const BOOK_REQUIRED_TOPICS = ["modos", "progresion", "equipo", "maestria", "talentos", "dificultad", "cooperativo", "tienda", "brasas", "postgame"];

// Rótulo de cada sección del libro en el Códice.
const BOOK_SECTION = {id:"libro", label:"EL LIBRO", icon:"📖",
  blurb:"La historia de la Horda y cómo se juega, contada en páginas. Releé la introducción o los fragmentos que ya ganaste."};
