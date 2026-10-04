"use strict";
/* ============================================================
   js/data/quests.js
   TABLAS DE RETENCIÓN: logros, desafíos diarios/semanales, Pase de Temporada gratuito, títulos,
   marcos y emblemas del perfil. La lógica vive en js/systems/quests.js y la pantalla en
   js/ui/quests-ui.js. Nada de esto da poder de combate: son oro, cofres (botín ganado jugando),
   XP de cuenta y cosméticos del perfil. No hay nada que se compre con plata real.

   Cada logro lee una "vista" V de la cuenta (ver questsView en js/systems/quests.js): las
   estadísticas guardadas + lo que va de la partida en curso (así los contadores pueden saltar en
   plena partida) + el estado del guardado (arenas, cristales, guardianes, Códice).
   ============================================================ */

// Categorías de logros (orden de la pantalla) con su color de medalla.
const QUEST_CATS = [
  {id:"campana",   label:"Campaña",     color:"#ff7a2e"},
  {id:"jefes",     label:"Jefes",       color:"#e0503a"},
  {id:"guardianes",label:"Guardianes",  color:"#5f8fc4"},
  {id:"cristales", label:"Cristales",   color:"#7fe0f0"},
  {id:"coop",      label:"Cooperativo", color:"#3ddc71"},
  {id:"maestria",  label:"Maestría",    color:"#ffcf5c"},
  {id:"secretos",  label:"Secretos",    color:"#b06aff"}
];

// Ayudas para las condiciones (V = vista de la cuenta).
const _qArenasWon = V => ARENA_ORDER.filter(a=>V.cleared[a]).length;
const _qOwned = V => Object.keys(V.champs).filter(k=>V.champs[k].unlocked && (typeof championInProgression!=="function" || championInProgression(k))).length;
const _qMaxLvl = V => Object.values(V.champs).reduce((m,c)=>Math.max(m, c.level||1), 1);
const _qChampsWon = V => Object.keys(V.byChamp).filter(k=>(V.byChamp[k].wins||0) > 0).length;
const _qRolesWon = V => new Set(Object.keys(V.byChamp).filter(k=>(V.byChamp[k].wins||0) > 0 && CLASSES[k]).map(k=>CLASSES[k].roleCategory)).size;
const _qFavRuns = V => Object.values(V.byChamp).reduce((m,c)=>Math.max(m, c.runs||0), 0);
const _qSPArenas = V => Object.keys(V.byArena).filter(a=>V.byArena[a].grade==="S+").length;
const _qResoKinds = V => ["ancestral","escarcha","piedra","juicio"].filter(k=>(V.resoBy[k]||0) > 0).length;
const _qCodexKill = (V, t) => (V.codexKills[t]||0) > 0 ? 1 : 0;

// ECONOMÍA (alfa, Q4): el oro de logros, desafíos y pase se bajó a la mitad y parte del pase paga Gemas
// (el sumidero lento: mejorar objetos). La primera partida daba 2.268 de oro y solo 658 salían de pelear; la
// tienda compraba en 3 partidas lo que el botín tarda decenas en dar. Números: docs/alfa/q4_economia.md.
// LOGROS. goal = meta numérica; prog(V) = progreso (se recorta a la meta). reward: oro / título /
// marco / emblema (ids de QUEST_TITLES, QUEST_FRAMES, QUEST_EMBLEMS). secret: se ve "???" hasta
// desbloquearlo. icon: glifo de QUEST_GLYPHS (se tiñe con el color de la categoría o `tint`).
const ACHIEVEMENTS = [
  // ---------------- CAMPAÑA ----------------
  {id:"c_first_win", cat:"campana", icon:"trophy", name:"Primera sangre", desc:"Ganá tu primera arena.", goal:1, prog:V=>V.wins, reward:{gold:80}},
  {id:"c_arenas3",   cat:"campana", icon:"map",    name:"Camino al infierno", desc:"Completá 3 arenas de la campaña.", goal:3, prog:_qArenasWon, reward:{gold:130}},
  {id:"c_arenas6",   cat:"campana", icon:"map",    name:"Mitad del descenso", desc:"Completá 6 arenas de la campaña.", goal:6, prog:_qArenasWon, reward:{gold:200, frame:"brasa"}},
  {id:"c_arenas_all",cat:"campana", icon:"crown",  name:"El infierno conquistado", desc:"Completá todas las arenas de la campaña.", goal:()=>ARENA_ORDER.length, prog:_qArenasWon, reward:{gold:250, title:"conquistador"}},
  {id:"c_divina",    cat:"campana", icon:"castle", name:"Las Cinco Pruebas", desc:"Abrí la Arena Divina.", goal:1, prog:V=>V.divinaOpen?1:0, reward:{gold:150}},
  {id:"c_divina_win",cat:"campana", icon:"castle", name:"Asedio divino", desc:"Derribá el castillo enemigo en la Arena Divina.", goal:1, prog:V=>V.divinaWins, reward:{gold:150}},
  {id:"c_divina5",   cat:"campana", icon:"castle", name:"Ascenso divino", desc:"Llegá al nivel 5 de la Arena Divina.", goal:5, prog:V=>V.divinaBest, reward:{gold:250, title:"asediador"}},
  {id:"c_runs10",    cat:"campana", icon:"scroll", name:"Veterano de la Horda", desc:"Jugá 10 partidas.", goal:10, prog:V=>V.runs, reward:{gold:100}},
  {id:"c_runs50",    cat:"campana", icon:"scroll", name:"Incansable", desc:"Jugá 50 partidas.", goal:50, prog:V=>V.runs, reward:{gold:250, title:"incansable"}},
  {id:"c_civ25",     cat:"campana", icon:"civ",    name:"Esperanza de la Ciudad", desc:"Rescatá 25 civiles en la Ciudad Maldita.", goal:25, prog:V=>V.civ, reward:{gold:130}},
  {id:"c_civ100",    cat:"campana", icon:"civ",    name:"Pastor de almas", desc:"Rescatá 100 civiles en la Ciudad Maldita.", goal:100, prog:V=>V.civ, reward:{gold:250, title:"pastor"}},
  {id:"c_fis10",     cat:"campana", icon:"crack",  name:"Sellador", desc:"Cerrá 10 fisuras en la Arena Infernal.", goal:10, prog:V=>V.fis, reward:{gold:150}},
  // ---------------- JEFES ----------------
  {id:"j_ciudad",    cat:"jefes", icon:"mask",   name:"Se baja el telón", desc:"Vencé a El Presentador en la Ciudad Maldita.", goal:1, prog:V=>V.cleared.ciudad?1:0, reward:{gold:60}},
  {id:"j_fortaleza", cat:"jefes", icon:"helm",   name:"Caballero caído", desc:"Vencé al Caballero de la Fortaleza.", goal:1, prog:V=>V.cleared.fortaleza?1:0, reward:{gold:80}},
  {id:"j_hielo",     cat:"jefes", icon:"horns",  name:"Deshielo", desc:"Vencé al Demonio Gélido (las dos formas del Mago Gélido).", goal:1, prog:V=>V.cleared.hielo?1:0, reward:{gold:100}},
  {id:"j_acuatica",  cat:"jefes", icon:"wave",   name:"Mar en calma", desc:"Vencé al Leviatán en sus tres fases.", goal:1, prog:V=>V.cleared.acuatica?1:0, reward:{gold:100}},
  {id:"j_laberinto", cat:"jefes", icon:"horns",  name:"Sin salida para la bestia", desc:"Vencé al Minotauro del Laberinto.", goal:1, prog:V=>V.cleared.laberinto?1:0, reward:{gold:130}},
  {id:"j_infernal",  cat:"jefes", icon:"crown",  name:"Regicida", desc:"Vencé al Rey de la Horda en la Arena Infernal.", goal:1, prog:V=>V.cleared.infernal?1:0, reward:{gold:250, frame:"infierno"}},
  {id:"j_jinete",    cat:"jefes", icon:"skull",  name:"Sin cabeza, sin piedad", desc:"Derrotá al Jinete Sin Cabeza.", goal:1, prog:V=>_qCodexKill(V, "jinete_sin_cabeza"), reward:{gold:150}},
  {id:"j_sub10",     cat:"jefes", icon:"sword",  name:"Rompefilas", desc:"Tu equipo derrota 10 subjefes.", goal:10, prog:V=>V.subjefes, reward:{gold:130}},
  {id:"j_sub40",     cat:"jefes", icon:"sword",  name:"Matagigantes", desc:"Tu equipo derrota 40 subjefes.", goal:40, prog:V=>V.subjefes, reward:{gold:250, title:"matagigantes"}},
  // ---------------- GUARDIANES (los héroes) ----------------
  {id:"g_own3",   cat:"guardianes", icon:"shield", name:"Hermandad", desc:"Tené 3 guardianes.", goal:3, prog:_qOwned, reward:{gold:100}},
  {id:"g_own6",   cat:"guardianes", icon:"shield", name:"Escuadrón completo", desc:"Tené 6 guardianes.", goal:6, prog:_qOwned, reward:{gold:200}},
  {id:"g_own_all",cat:"guardianes", icon:"crown",  name:"Todos los guardianes", desc:"Tené a todos los guardianes.", goal:()=>CHAMPION_CATALOG.filter(c=>typeof championInProgression!=="function" || championInProgression(c.id)).length, prog:_qOwned, reward:{gold:250, title:"coleccionista"}},
  {id:"g_lvl20",  cat:"guardianes", icon:"star",   name:"Forjado en batalla", desc:"Llevá un guardián al nivel 20.", goal:20, prog:_qMaxLvl, reward:{gold:100}},
  {id:"g_lvl40",  cat:"guardianes", icon:"star",   name:"Curtido", desc:"Llevá un guardián al nivel 40.", goal:40, prog:_qMaxLvl, reward:{gold:200}},
  {id:"g_lvl60",  cat:"guardianes", icon:"star",   name:"Leyenda viviente", desc:"Llevá un guardián al nivel 60.", goal:60, prog:_qMaxLvl, reward:{gold:250, title:"leyenda"}},
  {id:"g_win4",   cat:"guardianes", icon:"sword",  name:"Versátil", desc:"Ganá una arena con 4 guardianes distintos.", goal:4, prog:_qChampsWon, reward:{gold:150}},
  {id:"g_roles",  cat:"guardianes", icon:"shield", name:"Todos los roles", desc:"Ganá con un Tanque, un Asesino, un Mago y un Soporte.", goal:4, prog:_qRolesWon, reward:{gold:150, emblem:"escudo"}},
  {id:"g_fav25",  cat:"guardianes", icon:"heart",  name:"Inseparables", desc:"Jugá 25 partidas con el mismo guardián.", goal:25, prog:_qFavRuns, reward:{gold:150}},
  // ---------------- CRISTALES Y RESONANCIA ----------------
  {id:"r_crystal1", cat:"cristales", icon:"crystal", tint:"#8fe0a0", name:"El primer cristal", desc:"Liberá el cristal de un Guardián.", goal:1, prog:V=>V.crystals, reward:{gold:100}},
  {id:"r_crystal3", cat:"cristales", icon:"crystal", tint:"#bfe0f5", name:"Los tres cristales", desc:"Liberá los tres cristales de los Guardianes.", goal:3, prog:V=>V.crystals, reward:{gold:250, frame:"cristal"}},
  {id:"r_juicio",   cat:"cristales", icon:"crystal", tint:"#f0c84a", name:"El Juicio", desc:"Despertá el Cristal del Juicio.", goal:1, prog:V=>V.juicio?1:0, reward:{gold:150}},
  {id:"r_reso1",    cat:"cristales", icon:"eye",     name:"Resonancia", desc:"Ganá una arena llevando un cristal.", goal:1, prog:V=>V.resoWins, reward:{gold:80}},
  {id:"r_reso10",   cat:"cristales", icon:"eye",     name:"Eco cristalino", desc:"Ganá 10 arenas llevando un cristal.", goal:10, prog:V=>V.resoWins, reward:{gold:200}},
  {id:"r_reso_all", cat:"cristales", icon:"crystal", tint:"#d29aff", name:"Afinidad total", desc:"Ganá con cada cristal: Ancestral, Escarcha, Piedra y Juicio.", goal:4, prog:_qResoKinds, reward:{gold:250, title:"resonante", emblem:"cristal"}},
  // ---------------- COOPERATIVO ----------------
  {id:"co_first", cat:"coop", icon:"duo",   name:"Juntos en la Horda", desc:"Jugá una partida online con otro jugador.", goal:1, prog:V=>V.coopRuns, reward:{gold:80}},
  {id:"co_win",   cat:"coop", icon:"duo",   name:"Hermanos de armas", desc:"Ganá una arena en cooperativo.", goal:1, prog:V=>V.coopWins, reward:{gold:130, frame:"hermandad"}},
  {id:"co_win10", cat:"coop", icon:"duo",   name:"Escuadra", desc:"Ganá 10 arenas en cooperativo.", goal:10, prog:V=>V.coopWins, reward:{gold:250, title:"escuadra"}},
  {id:"co_full",  cat:"coop", icon:"duo",   name:"Sala llena", desc:"Jugá una partida con 4 jugadores.", goal:1, prog:V=>V.full4?1:0, reward:{gold:150}},
  {id:"co_rev10", cat:"coop", icon:"heart", name:"Nadie se queda atrás", desc:"Reviví a 10 aliados.", goal:10, prog:V=>V.revives, reward:{gold:150}},
  {id:"co_runs25",cat:"coop", icon:"duo",   name:"Compañeros de ruta", desc:"Jugá 25 partidas en cooperativo.", goal:25, prog:V=>V.coopRuns, reward:{gold:200}},
  // ---------------- MAESTRÍA ----------------
  {id:"m_gradeA",   cat:"maestria", icon:"star",   name:"Buen trabajo", desc:"Ganá una arena con calificación A o mejor.", goal:1, prog:V=>V.gradeA, reward:{gold:60}},
  {id:"m_gradeS",   cat:"maestria", icon:"star",   name:"Sobresaliente", desc:"Conseguí una calificación S.", goal:1, prog:V=>V.gradeS, reward:{gold:130}},
  {id:"m_gradeSP",  cat:"maestria", icon:"star",   tint:"#fff6d6", name:"Perfección", desc:"Conseguí una S+ (una partida sin caídas y casi perfecta).", goal:1, prog:V=>V.gradeSP, reward:{gold:200, frame:"oro"}},
  {id:"m_sp5",      cat:"maestria", icon:"crown",  name:"Maestro de la Horda", desc:"Conseguí S+ en 5 arenas distintas.", goal:5, prog:_qSPArenas, reward:{gold:250, title:"maestro"}},
  {id:"m_deathless",cat:"maestria", icon:"shield", name:"Sin un rasguño", desc:"Ganá una arena sin caer ni una vez.", goal:1, prog:V=>V.deathless, reward:{gold:100}},
  {id:"m_deathless10",cat:"maestria",icon:"shield",name:"Inquebrantable", desc:"Ganá 10 arenas sin caer.", goal:10, prog:V=>V.deathless, reward:{gold:250, title:"inquebrantable"}},
  {id:"m_kills1k",  cat:"maestria", icon:"skull",  name:"Mil caídos", desc:"Eliminá 1.000 enemigos.", goal:1000, prog:V=>V.kills, reward:{gold:130}},
  {id:"m_kills10k", cat:"maestria", icon:"skull",  name:"Diez mil caídos", desc:"Eliminá 10.000 enemigos.", goal:10000, prog:V=>V.kills, reward:{gold:250, emblem:"calavera"}},
  {id:"m_runkills", cat:"maestria", icon:"sword",  name:"Carnicería", desc:"Eliminá 300 enemigos en una sola partida.", goal:300, prog:V=>V.maxRunKills, reward:{gold:150}},
  {id:"m_hours5",   cat:"maestria", icon:"hourglass", name:"Dedicación", desc:"Jugá 5 horas en las arenas.", goal:300, unit:"min", prog:V=>Math.floor(V.timeMs/60000), reward:{gold:200}},
  // ---------------- SECRETOS ----------------
  {id:"s_night",   cat:"secretos", secret:true, icon:"moon",  name:"Noctámbulo", desc:"Jugá una partida entre la medianoche y las 5 de la mañana.", goal:1, prog:V=>V.night?1:0, reward:{gold:80, title:"noctambulo"}},
  {id:"s_close",   cat:"secretos", secret:true, icon:"heart", tint:"#ff5a4a", name:"Por un pelo", desc:"Ganá una arena con menos del 10% de vida.", goal:1, prog:V=>V.closeWin?1:0, reward:{gold:100}},
  {id:"s_fast",    cat:"secretos", secret:true, icon:"bolt",  name:"Relámpago", desc:"Ganá una arena en menos de 8 minutos.", goal:1, prog:V=>V.fastWinMs && V.fastWinMs < 8*60000 ? 1 : 0, reward:{gold:130}},
  {id:"s_rich",    cat:"secretos", secret:true, icon:"coin",  name:"Tesoro del dragón", desc:"Juntá 50.000 de oro.", goal:50000, prog:V=>V.gold, reward:{title:"dragon"}},
  {id:"s_perfect_rescue", cat:"secretos", secret:true, icon:"civ", tint:"#9dffb0", name:"Nadie queda atrás", desc:"Ganá la Ciudad Maldita sin perder ni un civil.", goal:1, prog:V=>V.perfectRescue?1:0, reward:{gold:150}},
  {id:"s_duel",    cat:"secretos", secret:true, icon:"sword", tint:"#ffe0a0", name:"Senda del Rōnin", desc:"Ganá 5 duelos en una sola partida con Musashi.", goal:1, prog:V=>V.duel5?1:0, reward:{gold:130}},
  {id:"s_stubborn",cat:"secretos", secret:true, icon:"skull", tint:"#ff8a6a", name:"Terco", desc:"Caé 10 veces ante la Horda… y seguí volviendo.", goal:10, prog:V=>V.losses, reward:{gold:100, title:"terco"}}
];

// TÍTULOS del perfil (se eligen en DESAFÍOS → Perfil). Los de nivel de cuenta se ganan solos.
const QUEST_TITLES = {
  novato:        {name:"Guardián novato"},
  veterano:      {name:"Veterano", accountLevel:5},
  curtido:       {name:"Curtido en la Horda", accountLevel:10},
  leyenda_cuenta:{name:"Leyenda de la Horda", accountLevel:20},
  conquistador:  {name:"Conquistador del Infierno"},
  asediador:     {name:"Asediador Divino"},
  incansable:    {name:"Incansable"},
  pastor:        {name:"Pastor de Almas"},
  matagigantes:  {name:"Matagigantes"},
  coleccionista: {name:"Coleccionista de Guardianes"},
  leyenda:       {name:"Leyenda Viviente"},
  resonante:     {name:"Voz de los Cristales"},
  escuadra:      {name:"Hermano de Armas"},
  maestro:       {name:"Maestro de la Horda"},
  inquebrantable:{name:"Inquebrantable"},
  noctambulo:    {name:"Noctámbulo"},
  dragon:        {name:"Tesoro del Dragón"},
  terco:         {name:"Terco"},
  // Pase de Temporada 1
  t1_nuevo:      {name:"Nuevo Guardián"},
  t1_cazador:    {name:"Cazador de la Horda"},
  t1_brasas:     {name:"Portador de Brasas"},
  t1_rompe:      {name:"Rompehordas"},
  t1_voz:        {name:"Voz de la Resistencia"},
  t1_heraldo:    {name:"Heraldo de la Temporada"},
  t1_legend:     {name:"Nuevo Guardián Legendario"},
  // Ranking semanal de la Horda Infinita (js/net/leaderboard.js): se entregan al cerrar la semana
  lb_contenedor: {name:"Contenedor de la Semana"},      // top 50
  lb_elite:      {name:"Élite de la Cicatriz"},          // top 10
  lb_campeon:    {name:"Campeón de la Horda Infinita"}   // puesto #1
};
// MARCOS del perfil: colores del borde pixelado (claro, medio, oscuro) y brillo opcional.
const QUEST_FRAMES = {
  madera:   {name:"Madera",           c:["#9a7a50","#6b4424","#2a1c12"]},
  hierro:   {name:"Hierro",           c:["#d8dde2","#8a8f96","#3a3e44"]},
  brasa:    {name:"Brasa",            c:["#ffcf5c","#ff7a2e","#6a1e0a"], glow:"255,122,46"},
  escarcha: {name:"Escarcha",         c:["#e6f6ff","#8fc8ec","#24506e"], glow:"160,220,255"},
  abismo:   {name:"Abismo",           c:["#d29aff","#6a3aa0","#1e0e30"], glow:"176,106,255"},
  cristal:  {name:"Cristal",          c:["#e8fff4","#7fe0c0","#1c5a4a"], glow:"127,224,192"},
  hermandad:{name:"Hermandad",        c:["#c8ffd8","#3ddc71","#124a24"], glow:"61,220,113"},
  oro:      {name:"Oro",              c:["#fff6d6","#f0c84a","#8a6a1c"], glow:"255,210,90"},
  infierno: {name:"Infierno",         c:["#ffb070","#b83a2a","#3a0a06"], glow:"255,90,60"},
  temporada1:{name:"Los Nuevos Guardianes", c:["#fff6d6","#ffcf5c","#b83a2a"], glow:"255,200,90", anim:true},
  cicatriz:  {name:"La Cicatriz",      c:["#ffd2ec","#ff7ac8","#3a0f2a"], glow:"255,90,170", anim:true} // top 10 del ranking semanal
};
// EMBLEMAS del perfil (el retrato): "guardian" = tu guardián favorito animado; el resto, glifos.
const QUEST_EMBLEMS = {
  guardian: {name:"Guardián favorito"},
  calavera: {name:"Calavera", icon:"skull",   tint:"#f2e3d3"},
  escudo:   {name:"Escudo",   icon:"shield",  tint:"#5f8fc4"},
  llama:    {name:"Llama",    icon:"flame",   tint:"#ff7a2e"},
  cristal:  {name:"Cristal",  icon:"crystal", tint:"#7fe0f0"},
  corona:   {name:"Corona",   icon:"crown",   tint:"#ffcf5c"},
  espadas:  {name:"Espadas",  icon:"sword",   tint:"#d8dde2"}
};

// PASE DE TEMPORADA GRATUITO. 30 niveles con la XP de cuenta ganada durante la temporada.
// Recompensas: oro, Gemas, cofres (botín normal ganado jugando), títulos, marcos y emblemas. Sin pista paga.
const SEASON_DEF = {id:"t1", name:"Temporada 1: Los Nuevos Guardianes", levels:30};
function seasonXpToNext(level){ return 250 + 15*(level-1); }   // nivel 1→2 = 250 … 29→30 = 670 (≈14.000 en total)
const SEASON_REWARDS = [
  null,
  {title:"t1_nuevo"},               // 1 (al empezar la temporada)
  {gold:150},                       // 2
  {gems:2},                         // 3
  {frame:"hierro"},                 // 4
  {chest:1},                        // 5
  {gold:200},                       // 6
  {emblem:"llama"},                 // 7
  {title:"t1_cazador"},             // 8
  {gems:3},                         // 9
  {chest:2, frame:"escarcha"},      // 10
  {gold:250},                       // 11
  {emblem:"espadas"},               // 12
  {title:"t1_brasas"},              // 13
  {gems:4},                         // 14
  {chest:3},                        // 15
  {gold:300},                       // 16
  {emblem:"corona"},                // 17
  {frame:"abismo"},                 // 18
  {title:"t1_rompe"},               // 19
  {chest:3},                        // 20
  {gold:400},                       // 21
  {gems:5},                         // 22
  {title:"t1_voz"},                 // 23
  {gold:450},                       // 24
  {chest:3},                        // 25
  {chest:4},                        // 26
  {gems:6},                         // 27
  {gold:500},                       // 28
  {title:"t1_heraldo"},             // 29
  {chest:4, frame:"temporada1", title:"t1_legend"} // 30
];
// Nivel de CUENTA (no tiene tope): la misma XP de cuenta, con una curva propia.
function accountXpToNext(level){ return 400 + 80*(level-1); }

// XP de cuenta por partida (ver questsRunXp). Calificación → bono.
const QUEST_GRADE_XP = {"S+":60, S:45, A:30, B:15, C:0};
const QUEST_XP = {achievement:50, daily:120, weekly:400, dailyAll:150, weeklyAll:500};

// Cofres (índice de CHEST_NAMES / drawLootChest): calificación con la que se tira el botín y gemas.
const QUEST_CHESTS = {
  1:{grade:"B",  items:1, gems:0},
  2:{grade:"A",  items:1, gems:1},
  3:{grade:"S",  items:1, gems:2},
  4:{grade:"S+", items:2, gems:4}
};

// DESAFÍOS. stat = contador de la vista V que avanza (el progreso es lo que sube desde que el desafío
// aparece). n = meta [diaria, semanal] (null = no sale en esa rotación). champ: pide un guardián propio.
// avail(V): si se puede cumplir con lo que tiene la cuenta (p.ej. fisuras solo con la Infernal abierta).
// reward: oro [diario, semanal] (alfa, Q4: ×0,55 de lo que pagaban antes; ver docs/alfa/q4_economia.md).
const CHALLENGE_TEMPLATES = [
  {id:"kills",   icon:"skull",  stat:"kills",    n:[200, 1500], gold:[110, 550], name:"Cazador de la Horda", desc:n=>`Eliminá ${n} enemigos.`},
  {id:"wins",    icon:"trophy", stat:"wins",     n:[1, 5],      gold:[140, 660], name:"Arena superada",      desc:n=>n>1 ? `Ganá ${n} arenas.` : "Ganá una arena."},
  {id:"champRuns",icon:"shield",stat:"champRuns",n:[2, null],   gold:[110, 0],    champ:true, name:"Con otro guardián", desc:(n,c)=>`Jugá ${n} partidas con ${c}.`},
  {id:"champWins",icon:"shield",stat:"champWins",n:[null, 2],   gold:[0, 600],   champ:true, name:"Maestría de guardián", desc:(n,c)=>`Ganá ${n} arenas con ${c}.`},
  {id:"deathless",icon:"heart", stat:"deathless",n:[1, 3],      gold:[160, 720], name:"Sin caer",            desc:n=>n>1 ? `Ganá ${n} arenas sin caer ni una vez.` : "Ganá una arena sin caer ni una vez."},
  {id:"civ",     icon:"civ",    stat:"civ",      n:[8, 30],     gold:[120, 550], name:"Rescate",             desc:n=>`Rescatá ${n} civiles en la Ciudad Maldita.`, avail:V=>V.open.ciudad},
  {id:"fis",     icon:"crack",  stat:"fis",      n:[3, 12],     gold:[140, 600], name:"Cerrar las fisuras",  desc:n=>`Cerrá ${n} fisuras en la Arena Infernal.`, avail:V=>V.open.infernal},
  {id:"coop",    icon:"duo",    stat:"coopRuns", n:[null, 3],   gold:[0, 660],   name:"Juntos",              desc:n=>`Jugá ${n} partidas en cooperativo (online).`},
  {id:"subjefes",icon:"sword",  stat:"subjefes", n:[2, 10],     gold:[110, 550], name:"Rompefilas",          desc:n=>`Tu equipo derrota ${n} subjefes.`},
  {id:"gradeA",  icon:"star",   stat:"gradeA",   n:[1, null],   gold:[120, 0],    name:"Buena nota",          desc:()=>"Ganá una arena con calificación A o mejor."},
  {id:"gradeS",  icon:"star",   stat:"gradeS",   n:[null, 3],   gold:[0, 720],   name:"Sobresaliente",       desc:n=>`Ganá ${n} arenas con calificación S o S+.`},
  {id:"revives", icon:"heart",  stat:"revives", n:[1, 6],      gold:[110, 550], name:"Nadie se queda atrás",desc:n=>n>1 ? `Reviví a ${n} aliados.` : "Reviví a un aliado."},
  {id:"minutes", icon:"hourglass",stat:"minutes",n:[20, 120],   gold:[100, 500],  name:"Tiempo en la arena",  desc:n=>`Jugá ${n} minutos en las arenas.`},
  {id:"arenas",  icon:"map",    stat:"distinctArenas", n:[null, 3], gold:[0, 660], name:"Recorrido",         desc:n=>`Ganá en ${n} arenas distintas.`},
  {id:"champs",  icon:"duo",    stat:"distinctChamps", n:[null, 3], gold:[0, 600], name:"Rotación",          desc:n=>`Ganá con ${n} guardianes distintos.`, avail:V=>Object.keys(V.champs).filter(k=>V.champs[k].unlocked).length >= 3}
];
// Bonos por completar los 3 de la rotación: un cofre (reforzado para el día, dorado para la semana).
const CHALLENGE_BONUS = {daily:{chest:1}, weekly:{chest:3}};

// GLIFOS de los íconos (12×12, pixel art): a = color de la categoría, b = su sombra, c = su luz,
// k = contorno, w = hueso/blanco, y = oro, r = rojo, g = gris acero, s = acero claro. "." = vacío.
const QUEST_GLYPHS = {
  trophy:   ["..kkkkkkkk..", ".kyyyyyyyyk.", "kkyyyyyywykk", "kykyyyyywkyk", "kykyyyyyykyk", ".kkyyyyyykk.", "..kyyyyyyk..", "...kyyyyk...", "....kyyk....", "...kkyykk...", "..kyyyyyyk..", "..kkkkkkkk.."],
  map:      ["kkkkkkkkkkkk", "kcccccccccck", "kcbccccrcrck", "kccbccccrcck", "kcccbccrcrck", "kccccbccccck", "kcccccbcccck", "kccccccbccck", "kcbbcccbccck", "kcbbccbcccck", "kcccccccccck", "kkkkkkkkkkkk"],
  crown:    ["............", "k....kk....k", "kk..kyyk..kk", "kyk.kyyk.kyk", "kyykyyyykyyk", "kyyyyyyyyyyk", "kyryyyryyyrk", "kyyyyyyyyyyk", "kbbbbbbbbbbk", "kkkkkkkkkkkk", "............", "............"],
  castle:   ["k.k.k..k.k.k", "kkkkk..kkkkk", "kgsgk..kgsgk", "kgggkkkkgggk", "kgsgsgsgsgsk", "kggggkkggggk", "kgsgkaakgsgk", "kgggkaakgggk", "kgsgkaakgsgk", "kgggkaakgggk", "kkkkkkkkkkkk", "............"],
  scroll:   [".kkkkkkkkkk.", "kcwwwwwwwwck", ".kwwwwwwwwk.", ".kwkkkkkkwk.", ".kwwwwwwwwk.", ".kwkkkkkwwk.", ".kwwwwwwwwk.", ".kwkkkkkkwk.", ".kwwwwwwwwk.", ".kwkkkkwwwk.", "kcwwwwwwwwck", ".kkkkkkkkkk."],
  civ:      ["....kkkk....", "...kwwwwk...", "...kwkwkk...", "...kwwwwk...", "....kkkk....", "..kkaaaakk..", ".kaakaakaak.", ".kakaaaakak.", "..kkaaaakk..", "...kbkkbk...", "...kbk.kbk..", "...kkk.kkk.."],
  crack:    ["kkkkkkkkkkkk", "kbbbbkbbbbbk", "kbbbbkybbbbk", "kbbbkyrkbbbk", "kbbkyrykbbbk", "kbbbkyrrkbbk", "kbbkyrykbbbk", "kbkyrrkbbbbk", "kbbkyrkbbbbk", "kbbbkykbbbbk", "kbbbbkbbbbbk", "kkkkkkkkkkkk"],
  mask:     ["..kkkkkkkk..", ".kwwwwwwwwk.", "kwwwwwwwwwwk", "kwkkwwwwkkwk", "kwkrkwwkrkwk", "kwwkwwwwkwwk", "kwwwwwwwwwwk", "kwwkwwwwkwwk", ".kwwkkkkwwk.", ".kwwwwwwwwk.", "..kkwwwwkk..", "....kkkk...."],
  helm:     ["....kkkk....", "...kssssk...", "..kssggssk..", ".ksggggggsk.", ".ksgkkkkgsk.", ".ksgkaakgsk.", ".ksgkkkkgsk.", ".ksggkkggsk.", ".ksggkkggsk.", ".ksggkkggsk.", "..kkkkkkkk..", "............"],
  horns:    ["k..........k", "kk........kk", ".kk......kk.", "..kkkkkkkk..", "..kaaaaaak..", ".kaaaaaaaak.", ".kakykkykak.", ".kaaaaaaaak.", ".kaakwwkaak.", "..kakwwkak..", "...kaaaak...", "....kkkk...."],
  wave:     ["............", "....kkk.....", "...kccck....", "..kcaaack...", ".kcakkaack..", ".kak..kaak..", "kkak...kaak.", "kaak..kaaakk", "kaakkkaaaaak", "kaaaaaaaaaak", "kbbbbbbbbbbk", "kkkkkkkkkkkk"],
  skull:    ["...kkkkkk...", "..kwwwwwwk..", ".kwwwwwwwwk.", ".kwwwwwwwwk.", ".kwkkwwkkwk.", ".kwkkwwkkwk.", ".kwwwkkwwwk.", "..kwwwwwwk..", "...kwkwkwk..", "...kwwwwwk..", "....kkkkk...", "............"],
  sword:    ["..........kk", ".........ksk", "........kssk", ".......kssk.", "......kssk..", ".kk..kssk...", ".kykkssk....", "..kyksk.....", "..kkyk......", ".kykkyk.....", "kyk..kk.....", "kk.........."],
  shield:   ["kkkkkkkkkkkk", "kccccaaaaaak", "kccccaaaaaak", "kccccaaaaaak", "kaaaayyaaaak", "kaaayyyyaaak", "kaaaayyaabbk", "kaaaaaaabbbk", ".kaaaaabbbk.", "..kaaabbbk..", "...kaabbk...", "....kkkk...."],
  star:     [".....kk.....", "....kyyk....", "....kyyk....", "kkkkkyykkkkk", "kyyyyyyyyyyk", ".kyyyyyyyyk.", "..kyyyyyyk..", "..kyyyyyyk..", ".kyyykkyyyk.", ".kyyk..kyyk.", "kyyk....kyyk", "kkk......kkk"],
  heart:    ["............", ".kkk....kkk.", "kaaak..kaaak", "kacaakkaaaak", "kacaaaaaaaak", "kaaaaaaaaaak", ".kaaaaaaaak.", "..kaaaaaak..", "...kaaaak...", "....kaak....", ".....kk.....", "............"],
  crystal:  [".....kk.....", "....kcck....", "...kccaak...", "..kccaaabk..", ".kccaaaabbk.", ".kcaaaaabbk.", ".kcaaaaabbk.", ".kcaaaaabbk.", "..kcaaabbk..", "...kcabbk...", "....kbbk....", ".....kk....."],
  eye:      ["............", "...kkkkkk...", "..kcccccck..", ".kccakkacck.", "kccakyykacck", "kcakyrrykack", "kcakyrrykack", "kccakyykacck", ".kccakkacck.", "..kcccccck..", "...kkkkkk...", "............"],
  duo:      ["..kkk..kkk..", ".kwwwkkwwwk.", ".kwkwkkwkwk.", ".kwwwkkwwwk.", "..kkk..kkk..", ".kaaak.kccck", "kaaaaakcccck", "kaakaakckcck", "kaakaakckcck", ".kkbkk.kkbkk", ".kbkbk.kbkbk", ".kkkkk.kkkkk"],
  hourglass:["kkkkkkkkkkkk", "kyyyyyyyyyyk", ".kwwwwwwwwk.", ".kwyyyyyywk.", "..kwyyyywk..", "...kwyywk...", "....kyyk....", "..kwwyywwk..", ".kwwwyywwwk.", ".kwyyyyyywk.", "kyyyyyyyyyyk", "kkkkkkkkkkkk"],
  moon:     ["....kkkk....", "..kkcccck...", ".kcccck.....", ".kccck......", "kccck.......", "kcccck......", "kcccck......", "kccccck.....", ".kcccccckkk.", ".kccccccccck", "..kkccccckk.", "....kkkkk..."],
  bolt:     [".......kkkk.", "......kyyyk.", ".....kyyyk..", "....kyyyk...", "...kyyyykkk.", "..kyyyyyyyk.", ".kkkkyyyyk..", "....kyyyk...", "...kyyyk....", "..kyyk......", ".kyk........", ".kk........."],
  coin:     ["...kkkkkk...", "..kyyyyyyk..", ".kyyccyyyyk.", "kyycyyyyyyyk", "kyyyykkyyybk", "kyyykyyyyybk", "kyyykyyyyybk", "kyyyykkyyybk", "kyyyyyyyybbk", ".kyyyyyybbk.", "..kbbbbbbk..", "...kkkkkk..."],
  flame:    [".....k......", "....kak.....", "....kaak....", "...kaaak.k..", "..kaayaakak.", "..kaayyaaak.", ".kaayyyyaak.", ".kayyywyyak.", ".kayywwyyak.", ".kaayyyyaak.", "..kaaaaaak..", "...kkkkkk..."]
};
