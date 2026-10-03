"use strict";
/* ============================================================
   js/arenas/common/arena-blueprints.js
   ARENA FACTORY — ficha de datos (ArenaDefinition) de cada arena. Game Bible: docs/bible/ARENA_BIBLE.md.

   Qué es: la DEFINICIÓN de diseño de una arena en datos, en un solo lugar, que alimenta el briefing
   previo (js/ui/arena-briefing.js), el micro-tutorial (js/systems/arena-tutorials.js), el Códice, el
   validador (tools/bible/arena-validator.js) y la referencia autogenerada de la Bible. No reemplaza a
   los ganchos de comportamiento (ARENA_DEFS / ARENA_EXT en arena-registry.js): los REFERENCIA.
   No duplica valores: el nombre y la dificultad salen de ARENA_MODS, las frases del Hechicero de
   ARENA_BRIEF (run-intro.js), el sabor de botín de SET_ARENA_WEIGHTS / ARENA_LOOT_LABEL (loot.js).

   Campos (todos obligatorios salvo los marcados ?):
     number          lugar en la campaña (CAMPAIGN_ORDER) o 0 (postgame)
     fantasy         una frase: qué fantasía vende
     decision        LA decisión que el jugador toma acá y en ninguna otra arena (regla de identidad)
     biome, navigation   bioma y patrón de navegación
     primary         {name, rule}  mecánica principal exclusiva
     secondary       [{name, rule}] 1-2 mecánicas secundarias
     hazard          {name, effect, telegraph}  nunca daño invisible: telegraph obligatorio
     objectives      [{id, text}]  qué hay que hacer (y cómo se gana)
     dynamic         [..] cómo cambia la arena durante la partida (cambia decisiones, no solo decorado)
     enemySynergy    [..] qué enemigos refuerzan la mecánica
     subBoss?, boss  {type, name, phases, arena, teaches}  BOSS + ARENA = ENCUENTRO
     loot            {focus}  qué familia de recompensa incentiva repetirla (los sets salen de SET_ARENA_WEIGHTS)
     tutorial        {steps:[{id, say, done}]}  micro-tutorial jugable (ids que la arena marca con arenaTutStep)
     geometry        {solids?, notes}  sólidos que SE VEN (el validador comprueba que también choquen)
     multiplayer     qué estado sincroniza el anfitrión
     code            carpeta / archivos
     status          {grade: PASS|FIX|REDRAW|REWORK|REJECT, why}  auditoría de diseño (actualizar al cambiar)
     variants?       {layouts?, other[]}  variaciones reales (no recolores): el validador prueba 8 semillas de trazado
   ============================================================ */
const ARENA_BLUEPRINTS = {
  ciudad:{
    fantasy:"La ciudad que defendiste la noche en que la Horda volvió.",
    decision:"A quién salvar: rescatar civiles o defender las estructuras críticas mientras todo se derrumba.",
    biome:"urbano en llamas", navigation:"calles entre edificios con interiores; refugios con escudo verde",
    primary:{name:"Rescate de civiles", rule:"Encontrar civiles escondidos, mantener RESCATAR y escoltarlos a un refugio."},
    secondary:[{name:"Estructuras críticas", rule:"La Horda las derriba; si caen todas, perdés."}],
    hazard:{name:"La Ciudad Arde", effect:"Estructuras y calles en llamas presionan las rutas.", telegraph:"humo y brasas sobre la estructura atacada + alerta en el HUD"},
    objectives:[{id:"rescue", text:"Rescatá civiles y llevalos a un refugio."},{id:"protect", text:"Que no caigan todas las estructuras críticas."},{id:"boss", text:"Derrotá a El Presentador (nivel 10)."}],
    dynamic:["las estructuras se derrumban y cierran calles","apagón en el nivel 9 (Dama del Telón)"],
    enemySynergy:["enemigos que atacan estructuras y obligan a dividirse","cazadores de civiles que castigan escoltar sin cubrirse"],
    subBoss:{name:"Maestro + Tramoyista → Dama del Telón", level:9},
    boss:{type:"cm_presentador", name:"El Presentador", phases:"espectáculo por actos", arena:"usa el escenario y el público: la ciudad es su teatro", teaches:"leer avisos de escena y mantener la escolta"},
    loot:{focus:"sets de entrada (Alba, Guardián) y oro por rescate"},
    tutorial:{steps:[{id:"rescue", say:"Hay civiles escondidos: acercate y MANTENÉ RESCATAR.", done:"rescue"},{id:"shelter", say:"Llevalos al escudo verde: el refugio.", done:"shelter"}]},
    geometry:{solids:"cmVisualSolids", derived:true, notes:"edificios sólidos con interiores (cm-map.js); el dibujo sale de los mismos datos"},
    multiplayer:"civiles, estructuras y jefes en el estado de la arena (cm-arena.js)",
    code:"js/arenas/ciudad/", status:{grade:"PASS", why:"identidad, objetivo y jefe propios; rejugabilidad por recompensas de rescate"}
  },
  fortaleza:{
    fantasy:"Una fábrica viva que la Horda contaminó y que nunca se detiene.",
    decision:"Cuándo cruzar: leer el Ciclo Mecánico y los puentes que se reconfiguran antes de avanzar.",
    biome:"industrial", navigation:"recorrido por sectores con puentes levadizos y puertas",
    primary:{name:"Ciclo Mecánico", rule:"Trampas (vapor, rejillas, prensas, cadenas) con un director que las sincroniza."},
    secondary:[{name:"Puentes que se mueven", rule:"El camino cambia por sector; el nivel no termina hasta cruzar."}],
    hazard:{name:"Ciclo Mecánico", effect:"Daño y empuje por trampas", telegraph:"marcas en el piso que se encienden antes de cada trampa"},
    objectives:[{id:"cross", text:"Cruzá la Fábrica sector por sector."},{id:"boss", text:"Derrotá al Caballero de la Armadura Oxidada."}],
    dynamic:["puentes que se levantan y bajan por sector","el ciclo se acelera en los sectores profundos"],
    enemySynergy:["élites pesadas que sostienen posiciones junto a trampas","arañas que tejen redes en los pasos"],
    subBoss:{name:"Dragón de la Forja", level:6},
    boss:{type:"caballero", name:"El Caballero de la Armadura Oxidada", phases:"contraataque azul", arena:"pelea en su cámara entre mecanismos", teaches:"no pegar cuando brilla azul (contraataque)"},
    loot:{focus:"sets de Coloso y Guardián"},
    tutorial:{steps:[{id:"trap", say:"Mirá el piso: las marcas encienden antes de cada trampa.", done:"trap"}]},
    geometry:{gated:true, derived:true, notes:"plataformas, puentes y puertas con colisión propia (fort-map.js); los sectores se abren al avanzar; el dibujo sale de la misma geometría (sin fondo pintado)"},
    multiplayer:"sectores, puentes y trampas en el estado de la arena (fort-arena.js)",
    code:"js/arenas/fortaleza/", status:{grade:"PASS", why:"navegación y hazards propios, jefe con regla legible"}
  },
  bosque:{
    variants:{layouts:"4 trazados de menhires × espejo por semilla (Pesadilla/Infierno, Horda Infinita)", other:["qué 4 de los 8 menhires llevan runa (2 juegos por semilla)"]},
    fantasy:"Ruinas célticas de un bosque sagrado que ahora caza.",
    decision:"Usar las runas de los menhires en el momento justo o guardarlas para la emboscada.",
    biome:"bosque en ruinas", navigation:"claros entre menhires; maleza que oculta emboscadas",
    primary:{name:"Runas de los menhires", rule:"Se cargan solas; activadas, las raíces atrapan y lastiman a la horda cercana."},
    secondary:[{name:"Emboscadas", rule:"La maleza tiembla y salta una jauría; el fuego la quema antes."},{name:"Regeneración enemiga", rule:"La horda se cura: hay que concentrar el daño."}],
    hazard:{name:"Niebla del Olvido", effect:"Reduce la visión a distancia", telegraph:"niebla visible que se espesa en los bordes"},
    objectives:[{id:"survive", text:"Sobreviví 10 niveles."},{id:"boss", text:"Vencé al Guardián Ancestral y recuperá el PRIMER CRISTAL."}],
    dynamic:["las runas se desbordan antes del jefe","la maleza se vuelve más agresiva por nivel"],
    enemySynergy:["jaurías de emboscada que salen de la maleza","hadas que se curan entre sí (regeneración)"],
    subBoss:{name:"Los Dobladores", level:9},
    boss:{type:"guardian_ancestral", name:"Guardián Ancestral", phases:"se corrompe en la Bestia del Bosque", arena:"las runas se desbordan y explotan al empezar", teaches:"usar las runas a favor"},
    loot:{focus:"sets de Alba y Cazador"},
    tutorial:{steps:[{id:"rune", say:"Esa runa brilla: mantené ✚ junto a ella.", done:"rune"},{id:"ambush", say:"¡La maleza tiembla! Alejate o quemala.", done:"ambush"}]},
    geometry:{solids:"aidVisualSolids", notes:"menhires, árboles y arcos sólidos (aidResolveCircles)"},
    multiplayer:"cargas de runas y emboscadas en bosNetState()",
    code:"js/arenas/bosque/bos-ruins.js (ARENA_EXT)", status:{grade:"PASS", why:"identidad jugable propia; jefe usa las runas"}
  },
  micelial:{
    variants:{other:["ecosistema: estados de 54 nodos con su reloj","núcleos sembrados por el director cerca de los héroes","raíces, brazos y hongos gigantes de la Madre en posiciones nuevas"]},
    fantasy:"Una caverna viva que crece, madura y muere: el mapa entero es la Madre Espora.",
    decision:"Qué núcleo romper primero: cada uno que cae retrae la infección de su zona, pero la colonia sigue creciendo en otra.",
    biome:"caverna fúngica", navigation:"anillo alrededor del trono de la Madre; montículos y estanques que parten el mapa en carriles",
    primary:{name:"La Colonia", rule:"Núcleos Miceliales aparecen y extienden territorio infectado que frena y acelera a la horda; romper un núcleo retrae la infección."},
    secondary:[{name:"Ecosistema", rule:"Los hongos del escenario germinan, maduran, liberan esporas y se marchitan; los grandes son sólidos."},{name:"Nubes de esporas", rule:"Frenan y dañan poco a poco; las dejan los Infectados al morir y la Madre."}],
    hazard:{name:"Infección y esporas", effect:"Lentitud y daño leve dentro del territorio y de las nubes", telegraph:"piso violeta pulsante con borde marcado; nubes visibles con su radio"},
    objectives:[{id:"nests", text:"Rompé los NÚCLEOS para contener la colonia."},{id:"survive", text:"Sobreviví a las etapas: Germinación, Colonización, Maduración, Floración."},{id:"boss", text:"Derrotá a la Madre Espora en el Corazón."}],
    dynamic:["etapas: el ecosistema crece y el fondo madura","raíces gigantes cruzan la arena (niveles 7-9)","la Madre interviene y brotan hongos gigantes sólidos","al morir la Madre el Reino queda en silencio"],
    enemySynergy:["Infectados que dejan esporas","Chamán que germina núcleos y cura","Peregrinos que se plantan en carriles","Sabuesos en jauría por los corredores","Acechador que embosca desde el territorio","Hinchado que explota en zonas"],
    subBoss:{name:"Micelio Primigenio", level:6},
    boss:{type:"madre_espora", name:"La Madre Espora", phases:"3 fases (brazos, alucinaciones, corazón expuesto)", arena:"ES la estructura del centro: brazos, hongos gigantes que bloquean rutas, nubes y raíces", teaches:"lo aprendido: núcleos, esporas y rutas que se cierran"},
    loot:{focus:"sets Sepulturero y Arcano; set de Morwen/Tibor (campeones del Reino)"},
    tutorial:{steps:[
      {id:"colony", say:"La colonia late en el piso: ese violeta es territorio infectado.", done:"colony"},
      {id:"spores", say:"Dentro de la infección y de las nubes te movés más lento. Probalo y salí.", done:"spores"},
      {id:"nest", say:"¡Un NÚCLEO! Rompelo: la infección de su zona se retira.", done:"nest"},
      {id:"recede", say:"¿Ves? La colonia retrocede. Así se pelea acá: núcleo por núcleo.", done:"recede"}]},
    geometry:{solids:"micBgPolys", notes:"montículos, racimos, pilares, estanque y trono pintados = polígonos sólidos (MIC_BG_SOLIDS)"},
    multiplayer:"etapa, nodos, núcleos, nubes, raíces y fases de la Madre en micNetState()",
    code:"js/arenas/micelial/", status:{grade:"PASS", why:"Gold Standard: geometría pintada = jugable (2026-10), micro-tutorial, briefing con botín"}
  },
  hielo:{
    variants:{layouts:"4 trazados de pilares de hielo × espejo por semilla", other:["giro de los braseros por semilla"]},
    fantasy:"Una arena helada donde quedarse quieto es morir de a poco.",
    decision:"Moverse o pelear quieto: el frío castiga la quietud y los braseros obligan a reposicionarse.",
    biome:"tundra", navigation:"anillo abierto con braseros en el interior",
    primary:{name:"Frío por quietud", rule:"Quieto, el medidor sube y deja cargas de escarcha (lentitud); moverse lo baja."},
    secondary:[{name:"Braseros", rule:"Zonas de calor que derriten la escarcha; se apagan y se prenden con fuego o con la acción."}],
    hazard:{name:"Furia del Vendaval Helado", effect:"Novas gélidas y lentitud creciente", telegraph:"escarcha a los pies, medidor ❄ y borde de pantalla helado"},
    objectives:[{id:"survive", text:"Sobreviví 10 niveles moviéndote."},{id:"boss", text:"Derrotá al Mago Gélido en sus dos formas y recuperá el SEGUNDO CRISTAL."}],
    dynamic:["los braseros se apagan y hay que reencenderlos","el Frío Creciente sube por nivel"],
    enemySynergy:["Lobos rápidos que castigan quedarse quieto","Gólems que frenan","Demonio de Hielo y Fuego con muro de hielo"],
    subBoss:{name:"Tundraverx, Dragón de Hielo", level:6},
    boss:{type:"mago_hielo_cristal", name:"Mago de Hielo y Cristal → Ángel Caído", phases:"2 formas", arena:"muro de hielo y novas que empujan fuera de los braseros", teaches:"moverse entre braseros"},
    loot:{focus:"set Glaciar"},
    tutorial:{steps:[{id:"cold", say:"Si te quedás quieto, el frío sube. ¡Movete!", done:"cold"},{id:"brazier", say:"Un BRASERO: mantené 🔥 o prendelo con fuego.", done:"brazier"}]},
    geometry:{solids:"aidVisualSolids", notes:"octágono abierto + decorado sólido (aidBuildHielo); el monolito de hielo choca desde 2026-10"},
    multiplayer:"braseros y frío de cada héroe en hieNetState()",
    code:"js/arenas/hielo/hie-cold.js (ARENA_EXT)", status:{grade:"FIX", why:"curva de dificultad: sigue siendo la pared de la campaña (LA_HORDA_PLAYTEST_REPORT.md)"}
  },
  acuatica:{
    variants:{layouts:"4 trazados de columnas hundidas × espejo por semilla", other:["disposición de corrientes distinta en cada nivel"]},
    fantasy:"Ruinas hundidas: el agua decide hacia dónde vas.",
    decision:"Usar las corrientes para moverte y arrastrar a la horda, o pelear contra ellas.",
    biome:"ruinas sumergidas", navigation:"corrientes lineales, remolinos, anillo y chorros que cambian por nivel",
    primary:{name:"Corrientes", rule:"Zonas que empujan a héroes y enemigos (los jefes no)."},
    secondary:[{name:"Charcos conductores", rule:"Descargan cada pocos segundos; el rayo los vuelve un arma contra la horda."}],
    hazard:{name:"Corriente Profunda", effect:"Empuje y descargas en charcos", telegraph:"chevrones animados; círculo amarillo 1,2 s antes de la descarga; línea 1,1 s antes del chorro"},
    objectives:[{id:"survive", text:"Llegá al nivel 10."},{id:"boss", text:"Vencé al Leviatán en sus 3 fases."}],
    dynamic:["la disposición de corrientes cambia en cada nivel","aparecen remolino (2), anillo (4) y chorros (5)"],
    enemySynergy:["anguilas cuya cadena salta más en los charcos","cangrejos blindados de frente que hay que flanquear con la corriente"],
    subBoss:{name:"Kraken Joven", level:6},
    boss:{type:"leviatan", name:"Leviatán", phases:"3 vidas", arena:"ronda el borde y ataca desde el agua", teaches:"leer el borde y las corrientes"},
    loot:{focus:"sets Tempestad y Glaciar"},
    tutorial:{steps:[{id:"current", say:"Esa corriente te lleva: usala para moverte rápido.", done:"current"},{id:"puddle", say:"El charco brilla antes de descargar: salí.", done:"puddle"}]},
    geometry:{solids:"aidVisualSolids", notes:"octágono + ruinas sólidas"},
    multiplayer:"corrientes (predicción en el invitado) y charcos en el estado de la arena",
    code:"js/arenas/acuatica.js + js/arenas/acuatica/ (ARENA_EXT)", status:{grade:"PASS", why:"movilidad propia y reacción con el rayo"}
  },
  laberinto:{
    variants:{layouts:"4 trazados de obeliscos × espejo por semilla", other:["juegos de sellos en lugares libres distintos cada 26-36 s"]},
    fantasy:"Muros que levantó un Guardián para esconderse: el laberinto se resuelve.",
    decision:"Activar los sellos en orden I-II-III bajo presión o seguir peleando en los pasillos.",
    biome:"ruinas de piedra", navigation:"pasillos, cámaras y plazas con muros reales",
    primary:{name:"Sellos en orden", rule:"Tres placas numeradas; en orden antes de 40 s aturden a la horda y curan al equipo."},
    secondary:[{name:"Muros y sismos", rule:"Muros con colisión real; sismos con aviso."},{name:"Maná escaso", rule:"La energía se regenera a la mitad."}],
    hazard:{name:"Maldición del Minotauro", effect:"Sismos y rocas", telegraph:"temblor de pantalla y sombra de las rocas antes de caer"},
    objectives:[{id:"seals", text:"Activá los sellos I → II → III."},{id:"boss", text:"Derrotá al Minotauro y recuperá el TERCER CRISTAL."}],
    dynamic:["juegos de sellos nuevos cada 26-36 s","Muros que se Cierran (regla creciente)"],
    enemySynergy:["escorpiones que emboscan en las esquinas","gólems que bloquean pasillos"],
    subBoss:{name:"Guardián del Laberinto", level:6},
    boss:{type:"minotauro", name:"Minotauro", phases:"cargas", arena:"se aturde al chocar contra un muro", teaches:"usar los muros como arma"},
    loot:{focus:"sets Laberinto y Coloso"},
    tutorial:{steps:[{id:"seal", say:"Sello I: mantené ◈ encima. Después II y III.", done:"seal"}]},
    geometry:{solids:"aidVisualSolids", notes:"muros rectangulares rotados (collision.js) con navegación"},
    multiplayer:"sellos en el estado de la arena (lab-seals.js)",
    code:"js/arenas/laberinto/lab-seals.js (ARENA_EXT)", status:{grade:"PASS", why:"resolver + jefe que usa los muros"}
  },
  abismo:{
    fantasy:"Ruinas suspendidas sobre el vacío: el terreno es un recurso.",
    decision:"Qué plataforma sacrificar: empujar a la horda al vacío sin quedarte sin piso.",
    biome:"ruinas flotantes", navigation:"plataformas que se agrietan, colapsan y se reconstruyen",
    primary:{name:"Plataformas que colapsan", rule:"ESTABLE → AGRIETADA → CRÍTICA → COLAPSO → RECONSTRUCCIÓN."},
    secondary:[{name:"Caer no mata", rule:"Quedás colgado del borde; un compañero te sube con RESCATAR. A los enemigos sí se los tira al vacío."}],
    hazard:{name:"El Vacío", effect:"Perder el piso", telegraph:"la plataforma tiembla y larga piedras antes de caer (2,2 s)"},
    objectives:[{id:"survive", text:"Sobreviví a las ruinas."},{id:"boss", text:"Vencé al Carcelero del Vacío y enfrentá a El Que Mora Debajo."}],
    dynamic:["el mapa se rompe y el Abismo lo reconstruye entre oleadas","patrones del jefe que dejan medio anillo"],
    enemySynergy:["Jinete que carga en línea (se lo usa como arma)","enemigos que rompen plataformas"],
    subBoss:{name:"El Carcelero del Vacío", level:9},
    boss:{type:"ab_morador", name:"El Que Mora Debajo", phases:"por partes", arena:"destruye plataformas con patrones legibles", teaches:"leer grietas y conservar piso"},
    loot:{focus:"sets Arcano y Laberinto"},
    tutorial:{steps:[{id:"crack", say:"Esa plataforma tiembla: salí antes de que caiga.", done:"crack"}]},
    geometry:{fallable:true, derived:true, notes:"plataformas con estado; el vacío no es caminable; caer = colgado del borde hasta el rescate (ab-map.js); dibujo derivado de las plataformas"},
    multiplayer:"estados de plataformas, colgados y rescates en el estado de la arena",
    code:"js/arenas/abismo/", status:{grade:"PASS", why:"terreno como recurso, rescate cooperativo"}
  },
  minas:{
    fantasy:"Minas que bajan hasta la puerta del Infierno: la luz es territorio.",
    decision:"Qué luz reencender primero: en la oscuridad recibís más daño y te emboscan.",
    biome:"minas profundas", navigation:"descenso por seis sectores",
    primary:{name:"La luz es territorio", rule:"Los enemigos apagan lámparas; el equipo las reenciende con la acción."},
    secondary:[{name:"Salida obligatoria", rule:"Matar a Cerbero no termina la arena: hay que atravesar el Portal."}],
    hazard:{name:"La Oscuridad", effect:"Más daño recibido y emboscadas", telegraph:"zonas oscuras visibles y antorchas que se sofocan"},
    objectives:[{id:"light", text:"Mantené las luces encendidas."},{id:"boss", text:"Derrotá a Cerbero y ATRAVESÁ el Portal Infernal."}],
    dynamic:["las fuentes de luz se apagan","Cerbero rompe cadenas al 66% y se enfurece al 33%"],
    enemySynergy:["Devoraluz que apaga lámparas","emboscadores que solo atacan en la oscuridad"],
    subBoss:{name:"Titán de Piedra", level:8},
    boss:{type:"mn_cerbero", name:"Cerbero, Guardián del Umbral", phases:"3 actos", arena:"se expone a la luz y se enfurece en la oscuridad", teaches:"controlar la luz"},
    loot:{focus:"sets Coloso y Lucifer"},
    tutorial:{steps:[{id:"light", say:"Se apagó una luz: acercate y MANTENÉ ENCENDER.", done:"light"}]},
    geometry:{derived:true, notes:"sectores con paredes de roca (mn-map.js); el dibujo sale de la misma geometría (sin fondo pintado)"},
    multiplayer:"luces y sectores en el estado de la arena (mn-arena.js)",
    code:"js/arenas/minas/", status:{grade:"PASS", why:"territorio de luz + jefe que lo usa"}
  },
  infernal:{
    variants:{layouts:"4 trazados de columnas × espejo por semilla", other:["fisuras en posiciones nuevas por nivel"]},
    fantasy:"La dimensión de la Horda: el final del viaje.",
    decision:"¿Mato o cierro? Cerrar fisuras corta la horda pero quema y expone.",
    biome:"infierno", navigation:"octágono con pozos de lava",
    primary:{name:"Fisuras-portal", rule:"Grietas que crecen en 3 etapas y escupen demonios; se cierran con la acción (y el hielo ayuda)."},
    secondary:[{name:"Habilidades debilitadas", rule:"Las habilidades pegan 40% menos: el básico y el posicionamiento importan más."}],
    hazard:{name:"Ignición Eterna", effect:"Fuego del piso y erupciones", telegraph:"temblor + grieta 1,7 s antes; aviso circular antes de la erupción"},
    objectives:[{id:"close", text:"Cerrá fisuras para cortar la horda."},{id:"boss", text:"Llegá al corazón del Infierno y derrotá al Hechicero."}],
    dynamic:["las fisuras crecen y erupcionan","bajan una etapa entre niveles"],
    enemySynergy:["demonios que salen de las fisuras","magos demoníacos que castigan quedarse cerrando"],
    subBoss:{name:"Campeones de la Horda", level:9},
    boss:{type:"demonio_mayor", name:"El Hechicero → Gólem de Cuerpos → Demonio Mayor", phases:"3 formas", arena:"la revelación del guía en su propia dimensión", teaches:"todo lo aprendido"},
    loot:{focus:"Lucifer y Berserker; acceso a toda la tabla de sets"},
    tutorial:{steps:[{id:"fissure", say:"Una FISURA: mantené ✖ junto a ella para cerrarla.", done:"fissure"}]},
    geometry:{solids:"aidVisualSolids", notes:"octágono + pozos de lava (hazards.js)"},
    multiplayer:"fisuras en infNetState()",
    code:"js/arenas/infernal/ (ARENA_EXT)", status:{grade:"PASS", why:"decisión propia; jefe narrativo en 3 formas"}
  },
  divina:{
    number:0,
    fantasy:"Asedio 4 contra 4 contra el equipo divino (postgame).",
    decision:"Empujar torres o defender el castillo: un modo de asedio, no de supervivencia.",
    biome:"cielo divino", navigation:"carriles de asedio con torres y castillos",
    primary:{name:"Asedio", rule:"Derribar las torres y el castillo enemigos."},
    secondary:[{name:"Campeones rivales", rule:"El equipo divino usa campeones como vos."}],
    hazard:{name:"Mirada Ascendida", effect:"Torres que disparan", telegraph:"rango de torre visible"},
    objectives:[{id:"siege", text:"Derribá las torres y el castillo del equipo divino."}],
    dynamic:["las torres caen y abren carriles"],
    enemySynergy:["resumen de toda la horda peleada"],
    boss:{type:null, name:"Jefes finales de cada bioma", phases:"—", arena:"defienden el castillo", teaches:"asedio"},
    loot:{focus:"tabla avanzada"},
    tutorial:{steps:[]},
    geometry:{notes:"js/arenas/divina.js"},
    multiplayer:"modo propio",
    code:"js/arenas/divina.js", status:{grade:"FIX", why:"Fase 1: escenario sin combate completo (ARENA_MODS.divina)"}
  }
};
const ARENA_BLUEPRINT_REQUIRED = ["fantasy","decision","biome","navigation","primary","secondary","hazard","objectives","dynamic","enemySynergy","boss","loot","tutorial","geometry","multiplayer","code","status"];

function arenaBlueprint(key){
  const b = ARENA_BLUEPRINTS[key]; if(!b) return null;
  const mods = (typeof ARENA_MODS!=="undefined" && ARENA_MODS[key]) || {};
  return Object.assign({key, number: b.number!==undefined ? b.number : (typeof campaignNumber==="function" ? campaignNumber(key) : 0),
    name: mods.label || key, icon: mods.icon || "", hazardName: mods.hazardName || (b.hazard && b.hazard.name)}, b);
}
// Sets con "sabor" de la arena (de SET_ARENA_WEIGHTS), del más probable al menos.
function arenaLootSets(key, max){
  const W = (typeof SET_ARENA_WEIGHTS!=="undefined" && SET_ARENA_WEIGHTS[key]) || {};
  return Object.entries(W).sort((a,b)=>b[1]-a[1]).slice(0, max||3).map(([id,w])=>({id, w, name:(typeof SET_DB!=="undefined" && SET_DB[id] && SET_DB[id].name) || id}));
}
// Validación de una ficha (la usa el validador de arenas y la prueba de datos).
function validateArenaBlueprint(key){
  const b = ARENA_BLUEPRINTS[key], issues = [];
  if(!b) return [{level:"FAIL", msg:"sin ficha en ARENA_BLUEPRINTS"}];
  for(const f of ARENA_BLUEPRINT_REQUIRED) if(b[f]===undefined || b[f]===null || b[f]==="") issues.push({level:"FAIL", msg:"falta "+f});
  if(b.hazard && !b.hazard.telegraph) issues.push({level:"FAIL", msg:"hazard sin telegraph"});
  if(!Array.isArray(b.objectives) || !b.objectives.length || b.objectives.some(o=>!o.text)) issues.push({level:"FAIL", msg:"objetivo sin explicación"});
  if(Array.isArray(b.secondary) && (b.secondary.length < 1 || b.secondary.length > 2)) issues.push({level:"WARNING", msg:"1-2 mecánicas secundarias recomendadas"});
  if(b.boss && (!b.boss.arena || !b.boss.teaches)) issues.push({level:"FAIL", msg:"jefe sin relación con la arena"});
  if(b.boss && b.boss.type && typeof ENEMY_BASE!=="undefined" && !ENEMY_BASE[b.boss.type]) issues.push({level:"FAIL", msg:"jefe inexistente en ENEMY_BASE: "+b.boss.type});
  if(b.tutorial && b.number!==0 && !(b.tutorial.steps||[]).length) issues.push({level:"WARNING", msg:"sin micro-tutorial"});
  if(b.decision && b.decision.length < 20) issues.push({level:"FAIL", msg:"decisión propia sin desarrollar"});
  if(typeof ARENA_MODS!=="undefined" && !ARENA_MODS[key]) issues.push({level:"FAIL", msg:"sin ARENA_MODS"});
  if(typeof SET_ARENA_WEIGHTS!=="undefined" && !SET_ARENA_WEIGHTS[key]) issues.push({level:"WARNING", msg:"sin sabor de sets (SET_ARENA_WEIGHTS)"});
  return issues;
}
