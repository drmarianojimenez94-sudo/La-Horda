"use strict";
/* ============================================================
   js/data/item-identity.js
   IDENTIDAD DE LOS OBJETOS (Master Itemization, alfa).
   Reglas que esta tabla hace cumplir:
   - La PASIVA de un objeto es FIJA: sale de su identidad (qué objeto es), nunca del azar.
     Lo que varía entre dos copias del mismo objeto son los STATS (roll dentro de un rango).
   - Rareza = poder + especialización + cambio de gameplay:
       Común      → números (sin pasiva).
       Raro       → mejores números + UNA pasiva de orientación, fija por el tipo de pieza
                    (toda "Hoja" da crítico, todo "Manto" da curación...).
       Muy Raro   → la pasiva de su pieza + su PRIMERA MECÁNICA (poder menor de su familia).
       Legendario → pasiva de pieza + pasiva de familia + un PODER completo (item-procs.js).
       Mítico     → poder que redefine la build (mythic-powers.js). Nunca procedural.
       Set        → sinergia entre piezas (sets.js / champion-sets.js); set completo: skin si existe.
       Único      → diseñado a mano (legendaries.js, UNIQUE_DESIGNS). NUNCA procedural ni por fusión.
   - Familias de loot por ARENA: qué mecánicas tienden a caer en cada arena (se aprende jugando).
   - Gemas: recurso ganado jugando, SOLO sube el nivel de un objeto (sin azar, sin romperse).
   ============================================================ */

/* ---------------- 1) Pasiva fija por pieza (objetos procedurales) ---------------- */
// Cada sustantivo de ITEM_NOUNS es una pieza reconocible con una pasiva propia. Así "Hoja
// Templada" y "Hoja Reforzada" son dos Hojas (crítico) con rolls distintos, no dos lotería.
const ITEM_ARCHETYPE_PASSIVE = {
  arma:    {Hoja:"pas_crit", Filo:"pas_dmg", Colmillo:"pas_lifesteal", Espada:"pas_atkspeed", Hacha:"pas_critdmg", Cetro:"pas_elem"},
  escudo:  {Escudo:"pas_surviv", Rodela:"pas_veloc", "Égida":"pas_overheal", "Pavés":"pas_vida"},
  casco:   {Yelmo:"pas_vida", Capucha:"pas_cdr", Corona:"pas_energia", "Máscara":"pas_crit"},
  pechera: {Coraza:"pas_surviv", Pechera:"pas_vida", Manto:"pas_heal", Cota:"pas_resphys"},
  guantes: {Guanteletes:"pas_dmg", Guantes:"pas_atkspeed", Brazales:"pas_onhit", "Puños":"pas_critdmg"},
  botas:   {Botas:"pas_veloc", Grebas:"pas_surviv", Sandalias:"pas_heal", Pasos:"pas_cdr"}
};

/* ---------------- 2) Familias de mecánicas ---------------- */
// Una familia agrupa poderes que YA existen en combate (item-procs.js) y que combinan entre sí.
// adj: cómo se llama un Muy Raro de esa familia ("Hacha Escarchada" = mecánica de hielo).
// passive: pasiva de familia de los Legendarios procedurales (fija).
const ITEM_FAMILIES = {
  fuego:   {label:"Fuego",       color:"#ff7a3a", element:"fire",      adj:["Ígne{o}","de Brasa"],       passive:"pas_resfire",
    procs:{ignite_basic:3, burn_vs:2, kill_explode:2}, hint:"quemadura · daño a quemados · estallidos"},
  hielo:   {label:"Hielo",       color:"#9fe3ff", element:"ice",       adj:["Escarchad{o}","Glacial"],   passive:"pas_resice",
    procs:{basic_freeze:3, frost_aura:2, cold_crit:2}, hint:"ralentizar · congelar · críticos contra lentos"},
  rayo:    {label:"Tormenta",    color:"#ffe36a", element:"lightning", adj:["Tormentos{o}","del Trueno"], passive:"pas_resltg",
    procs:{basic_chain:3, shock_skill:2}, hint:"rayos en cadena · aturdir"},
  sangre:  {label:"Sangrado",    color:"#e04848", element:"bleed",     adj:["Sedient{o}","Carmesí"],     passive:"pas_lifesteal",
    procs:{bleed_basic:3, execute_edge:2, kill_heal:1}, hint:"sangrado · rematar · robo de vida"},
  bastion: {label:"Bastión",     color:"#8fd0ff", element:"physical",  adj:["Juramentad{o}","del Bastión"], passive:"pas_surviv",
    procs:{hit_shield:3, retaliate:2, ally_ward:2}, hint:"escudos · devolver golpes · proteger aliados"},
  impacto: {label:"Impacto",     color:"#e0b070", element:"physical",  adj:["Sísmic{o}","del Coloso"],   passive:"pas_critdmg",
    procs:{crit_quake:3, combo_ramp:2, retaliate:1}, hint:"críticos que aturden · golpes seguidos"},
  caza:    {label:"Caza",        color:"#a8e070", element:"physical",  adj:["Veloz","del Acecho"],       passive:"pas_veloc",
    procs:{haste_on_kill:3, combo_ramp:2, execute_edge:1}, hint:"velocidad por baja · rematar"},
  luz:     {label:"Luz",         color:"#ffe79a", element:"holy",      adj:["Consagrad{o}","del Alba"],  passive:"pas_heal",
    procs:{heal_haste:3, kill_heal:2, hit_shield:1}, hint:"curación · velocidad al curar"},
  arcano:  {label:"Arcano",      color:"#c79cff", element:"arcane",    adj:["Rúnic{o}","Arcan{o}"],      passive:"pas_cdr",
    procs:{skill_nova:3, shock_skill:2}, hint:"ondas al lanzar · habilidades que electrocutan"},
  plaga:   {label:"Podredumbre", color:"#b06ae6", element:"rot",       adj:["Pútrid{o}","Micelial"],     passive:"pas_vida",
    procs:{spore_rot:4, execute_edge:1}, hint:"podredumbre que contagia · daño en el tiempo"}
};

/* ---------------- 3) Familias de loot por arena (arenas reales) ---------------- */
// Peso de cada familia cuando cae un Muy Raro / Legendario procedural en esa arena. Los
// Legendarios con nombre y los Sets ya tienen su propia afinidad (legendaries.js, SET_ARENA_WEIGHTS).
const ARENA_ITEM_FAMILIES = {
  bosque:    {sangre:4, caza:4, luz:1},                  // Jinete, bestias, cacería: sangrado y movilidad
  acuatica:  {rayo:5, hielo:1, caza:1},                  // anguilas y medusas: rayo, control (Mojado + rayo)
  fortaleza: {bastion:5, fuego:2, impacto:1},            // forja y murallas: defensa, fuego de fragua
  micelial:  {plaga:5, luz:2, arcano:1},                 // la Madre Espora: infección, propagación, daño en el tiempo
  hielo:     {hielo:6, bastion:1},                       // el Mago de Hielo: congelar, ralentizar, controlar
  laberinto: {impacto:5, sangre:3, caza:1, arcano:1},    // Minotauro y Guardián: fuerza, impacto, sangrado, embestida
  infernal:  {fuego:5, impacto:2, sangre:1, arcano:1},   // demonios: fuego, riesgo, crítico
  divina:    {bastion:2, luz:2, arcano:2, impacto:1}
};
// Texto para la pantalla previa / Mi Inventario: "qué conviene buscar acá".
const ARENA_LOOT_HINT = {
  bosque:"Sangrado y cacería", acuatica:"Tormenta y control", fortaleza:"Bastión y fuego de forja", micelial:"Podredumbre y luz",
  hielo:"Hielo y control", laberinto:"Impacto y sangrado", infernal:"Fuego e impacto", divina:"Bastión, luz y arcano"
};

/* ---------------- 4) Poder nuevo de la familia Podredumbre (reusa la Plaga) ---------------- */
// No es una mecánica nueva: aplica la maldición real de Plaga de los Condenados (daño en el
// tiempo + más daño recibido + contagio al morir), la misma que ya usa el Nigromante.
LEGEND_PROCS.spore_rot = {name:"Esporas Pútridas", desc:"Tus golpes básicos pudren al objetivo: daño en el tiempo y +8% de daño recibido durante 3 s. Si muere podrido, contagia a un enemigo cercano"};
LEGEND_PROC_EPITHET.spore_rot = "de las Esporas Pútridas";
if(!LEGEND_PROC_IDS.includes("spore_rot")) LEGEND_PROC_IDS.push("spore_rot");
// Poder MENOR (primera mecánica del Muy Raro): el mismo poder a la mitad de fuerza.
LEGEND_PROC_POWER.muyraro = 0.5;
// Familia de cada poder (para sinergias, color del efecto y el tooltip)
const PROC_FAMILY = {};
for(const f in ITEM_FAMILIES) for(const p in ITEM_FAMILIES[f].procs) if(!PROC_FAMILY[p]) PROC_FAMILY[p] = f;

/* ---------------- 5) Nivel de objeto, roll y Gemas ---------------- */
const ITEM_MAX_LEVEL = 10;
const ITEM_LEVEL_STEP = 0.04;          // +4% de los stats y pasivas numéricas por nivel (Nv.10 = +36%): no salta de rareza
const ITEM_ROLL_RANGE = [0.90, 1.10];  // dos copias del mismo objeto: stats entre -10% y +10%
// Costo en Gemas de subir de nivel L a L+1 = base × 1,5^(L-1). Sin azar, sin romperse, sin perder nivel.
const GEM_UPGRADE_BASE = {comun:1, raro:2, muyraro:3, legendario:5, set:6, mitico:8, unico:10};
const GEM_UPGRADE_GROWTH = 1.5;
// Gemas ganadas jugando (al terminar la arena). Nunca se compran: no son moneda premium.
const GEMS_PER_VICTORY = {bosque:2, acuatica:3, fortaleza:4, micelial:4, hielo:5, laberinto:6, infernal:8, divina:6};
const GEMS_GRADE_MULT = {C:0.6, B:0.8, A:1, S:1.25, "S+":1.5};
const GEMS_DEFEAT_AFTER_SUBBOSS = 1;   // perder después del subjefe deja 1 gema

/* ---------------- 6) Efecto mecánico de los objetos de campeón (tooltip) ---------------- */
// Separado del lore: NOMBRE · EFECTO (qué hace, con números) · LORE. Verificado contra abilities.js.
const DESIGNED_EFFECT_TEXT = {
  tanque_leg:"Embestida: durante la carga recibís 10% menos daño (0,5 s).",
  tanque_mit:"Grito de Guerra: tu próximo Torbellino dura 18% más.",
  guerrero_leg:"Trampa de Área: colocás 1 trampa más por lanzamiento.",
  guerrero_mit:"Triple Golpe: contra enemigos con menos de 30% de vida, el golpe final hace +22% de daño.",
  mago_leg:"Nova de Escarcha: los enemigos cerca del centro quedan aturdidos 0,35 s.",
  mago_mit:"Muro de Fuego: mientras dura, todo tu daño aumenta 7%.",
  soporte_leg:"El exceso de curación se convierte en escudo (15% de lo que sobra).",
  soporte_mit:"Bendición de Guerra: además daña a los enemigos cercanos (14% de tu daño).",
  segador_leg:"Armadura de la Furia: +6% de robo de vida mientras está activa.",
  segador_mit:"Hasta +22% de daño según la vida que te falta.",
  axiom_leg:"Teletransporte: al llegar recibís un escudo del 7% de tu vida.",
  axiom_mit:"Sobrescribir: el multiplicador de ejecución sube +0,35.",
  profeta_leg:"Danza del Augurio: el radio de aturdimiento crece 12%.",
  profeta_mit:"Sacrificio: curás 12% más."
};

/* ---------------- 7) Textos corregidos (la pasiva tiene que decir exactamente lo que hace) ---------------- */
// Set de Lucifer: el bonus de 2 piezas decía "daño de fuego" y es daño de TODAS las habilidades;
// el de 4 decía "Quemadura" pero daba una descarga eléctrica. Ahora dice y hace lo mismo (set-effects.js).
SET_DB.lucifer.thresholds[0] = {count:2, desc:"+8% daño de habilidades", mods:()=>[{effect:"skilldmg_mult", value:0.08}]};
SET_DB.lucifer.thresholds[2] = {count:4, desc:"Tus golpes básicos prenden fuego al objetivo (Quemadura: daño en el tiempo)", mods:()=>[]};
PASSIVE_DB_MYTHIC[0].desc = "Con menos de 50% de vida: +15% de daño y +15% de velocidad de ataque";
PASSIVE_DB_MYTHIC[1].desc = "La primera vez que te quedás sin escudo en la partida, recibís un escudo de emergencia del 20% de tu vida";
