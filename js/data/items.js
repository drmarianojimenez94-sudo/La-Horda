"use strict";
/* ============================================================
   js/data/items.js
   DATOS de objetos: rarezas, tipos de ranura, valores por rareza, pasivas,
   sets y objetos legendarios/míticos diseñados a mano. Precio de venta y capacidad
   del inventario.
   ============================================================ */

/* ============================================================
   FASE 1 — SISTEMA DE OBJETOS: modelo de datos + equipamiento + escudo
   ============================================================
   Todo lo que sigue es NUEVO y se apoya sobre lo existente sin reemplazarlo:
   - No toca combate, habilidades, enemigos ni progresión de maestría.
   - Es 100% data-driven: un objeto nuevo se agrega sumando una entrada a
     RARITY_VALUES / generando con makeItem(), nunca como caso especial en código.
   - Las pasivas ya tienen estructura completa (nombre, descripción, id, condición,
     efecto, valor, crecimiento) pero por ahora son informativas: no modifican
     todavía el combate. Es el punto de extensión previsto para más adelante.
   ============================================================ */

// Las 6 rarezas del juego (nomenclatura/colores normalizados según spec: Común=blanco,
// Raro=azul, Muy Raro=amarillo, Legendario=naranja, Mítico=rojo, Único=violeta). El orden
// de este array define también el orden de "fuerza". Saves viejos con las claves previas
// ("magico"/"raro" en su sentido anterior) se migran en loadSave() -ver MIGRATE_RARITY-.
const RARITIES = ["comun","raro","muyraro","legendario","mitico","unico"];
const RARITY_META = {
  comun:      {label:"Común",      color:"#e8e8ec", passives:0},
  raro:       {label:"Raro",       color:"#4fa8f0", passives:1},
  muyraro:    {label:"Muy Raro",   color:"#ffe14a", passives:2},
  legendario: {label:"Legendario", color:"#ffb020", passives:3},
  mitico:     {label:"Mítico",     color:"#ff4d4d", passives:4},
  unico:      {label:"Único",      color:"#b06aff", passives:4} // + 1 pasiva mítica, igual que mítico
};
// Tipos de equipamiento: 6 ranuras base (sección "IDENTIDAD DE LOS SLOTS"). El nombre que
// ve cada campeón puede variar (bastón/grimorio/etc.) vía CLASS_SLOT_LABELS más abajo, pero
// la ranura interna ("slot") es siempre una de estas 6 -data-driven, nada hardcodeado al
// Caballero-. Agregar un tipo nuevo es sumar una entrada acá + una fila en RARITY_VALUES.
const ITEM_TYPES = {
  arma:     {label:"Arma",     icon:"⚔",  slot:"arma",     statLabel:"daño"},
  escudo:   {label:"Escudo",   icon:"🛡", slot:"escudo",   statLabel:"escudo"},
  casco:    {label:"Casco",    icon:"⛑",  slot:"casco",    statLabel:"vida"},
  pechera:  {label:"Pechera",  icon:"🎽", slot:"pechera",  statLabel:"vida"},
  guantes:  {label:"Guantes",  icon:"🧤", slot:"guantes",  statLabel:"velocidad de ataque"},
  botas:    {label:"Botas",    icon:"👢", slot:"botas",    statLabel:"velocidad de movimiento"}
};
const EQUIP_SLOT_TYPES = Object.keys(ITEM_TYPES); // ["arma","escudo","casco","pechera","guantes","botas"]
// Nombre que ve cada campeón para la ranura "arma" (identidad, sección 3): puramente
// cosmético, el slot interno sigue siendo "arma" para todo el motor de items/comparación.
const CLASS_WEAPON_LABEL = {
  tanque:"Espada", guerrero:"Daga", mago:"Bastón", soporte:"Báculo",
  segador:"Hoja", axiom:"Núcleo", profeta:"Hoja Ceremonial", musashi:"Bokken", cazadora:"Arco Largo",
  nigromante:"Cetro de Hueso"
};
// Configuración central de balance: TODO objeto sale de estas tablas, nunca de un
// número suelto escrito en otra parte. Fácil de rebalancear después. arma/guantes ->
// daño y velocidad de ataque; escudo/casco/pechera -> vida y defensa; botas -> velocidad
// de movimiento y defensa (ver "IDENTIDAD DE LOS SLOTS").
const RARITY_VALUES = {
  arma:     {comun:0.10, raro:0.20, muyraro:0.35, legendario:0.50, mitico:0.70, unico:1.40},
  escudo:   {comun:0.16, raro:0.26, muyraro:0.40, legendario:0.55, mitico:0.75, unico:1.50},
  casco:    {comun:0.14, raro:0.24, muyraro:0.36, legendario:0.50, mitico:0.70, unico:1.40},
  pechera:  {comun:0.20, raro:0.32, muyraro:0.48, legendario:0.65, mitico:0.85, unico:1.70},
  guantes:  {comun:0.08, raro:0.16, muyraro:0.26, legendario:0.38, mitico:0.55, unico:1.10},
  botas:    {comun:0.08, raro:0.16, muyraro:0.26, legendario:0.38, mitico:0.55, unico:1.10}
};
// Catálogo de pasivas posibles. Estructura lista para crecer; agregar una pasiva nueva
// es sumar una entrada acá. El "efecto" es una clave real de passiveSum(): TODA pasiva acá
// listada ya afecta el combate de verdad (regla absoluta de la sección 10 — "ninguna pasiva
// mostrada puede ser decorativa"), reusando exactamente los mismos baldes que ya consultan
// las fórmulas de daño/curación/defensa/cooldown y que también alimentan los Talentos.
const PASSIVE_DB = [
  {id:"pas_dmg",      name:"Filo Cargado",     desc:"Aumenta el daño",                    condition:"siempre",            effect:"dmg_mult",        valueBase:0.04, growth:0.015},
  {id:"pas_atkspeed", name:"Reflejos",         desc:"Aumenta la velocidad de ataque",     condition:"siempre",            effect:"atkspeed_mult",   valueBase:0.04, growth:0.015},
  {id:"pas_cdr",      name:"Mente Ágil",       desc:"Reduce el enfriamiento de habilidades", condition:"siempre",         effect:"cd_mult",         valueBase:0.03, growth:0.01},
  {id:"pas_lifesteal",name:"Sed de Vida",      desc:"Otorga robo de vida en ataque básico", condition:"al golpear",       effect:"lifesteal_add",   valueBase:0.02, growth:0.01},
  {id:"pas_heal",     name:"Gracia Curativa",  desc:"Aumenta la curación realizada",      condition:"al curar",           effect:"heal_mult",       valueBase:0.05, growth:0.02},
  {id:"pas_surviv",   name:"Piel de Brasa",    desc:"Reduce el daño recibido",            condition:"siempre",            effect:"def_add",         valueBase:0.03, growth:0.01},
  {id:"pas_elem",     name:"Furia Elemental",  desc:"Aumenta el daño de habilidades",     condition:"siempre",            effect:"skilldmg_mult",   valueBase:0.04, growth:0.015},
  {id:"pas_onhit",    name:"Descarga",         desc:"Probabilidad de electrocutar al golpear", condition:"al golpear",    effect:"onhit_proc",      valueBase:0.08, growth:0.01},
  {id:"pas_vida",     name:"Vitalidad",        desc:"Aumenta la vida máxima",             condition:"siempre",            effect:"hp_mult",         valueBase:0.04, growth:0.015},
  {id:"pas_veloc",    name:"Paso Ligero",      desc:"Aumenta la velocidad de movimiento", condition:"siempre",            effect:"speed_mult",      valueBase:0.03, growth:0.01},
  {id:"pas_crit",     name:"Ojo Certero",      desc:"Aumenta la probabilidad de golpe crítico", condition:"siempre",      effect:"crit_chance_add", valueBase:0.025, growth:0.01},
  {id:"pas_critdmg",  name:"Golpe Devastador", desc:"Aumenta el daño de los golpes críticos", condition:"siempre",        effect:"crit_mult_add",   valueBase:0.08, growth:0.03},
  {id:"pas_energia",  name:"Pozo Interior",    desc:"Aumenta el recurso máximo y su regeneración", condition:"siempre",   effect:"energy_mult",     valueBase:0.05, growth:0.02},
  {id:"pas_overheal", name:"Sobreabundancia",  desc:"El exceso de curación/robo de vida se convierte en escudo", condition:"al curar de más", effect:"overheal_shield_pct", valueBase:0.10, growth:0.04}
];
// Potencia real de las pasivas según la rareza del objeto que las trae. Antes una pasiva valía
// lo mismo en un Raro que en un Mítico (4% de daño, casi imperceptible en combate): ahora un
// objeto de rareza alta se siente de verdad. Se aplica al LEER (equippedPassives), así que los
// objetos ya guardados también se benefician sin tocar el save.
const PASSIVE_RARITY_MULT = {comun:1, raro:2.5, muyraro:2.3, legendario:2.7, mitico:3.1, unico:3.3};
// Poderes de objeto legendario/mítico/único: efectos VISIBLES en combate (no un % más). Cada
// objeto de esas rarezas tiene uno; los objetos viejos reciben el suyo de forma determinística
// según su identificador (siempre el mismo para el mismo objeto), sin modificar el guardado.
// "power" escala por rareza (mítico/único pegan más fuerte que legendario).
const LEGEND_PROCS = {
  kill_explode: {name:"Estallido Ígneo",     desc:"Al matar, el enemigo puede estallar en llamas y dañar a los cercanos"},
  basic_chain:  {name:"Tormenta Encadenada", desc:"Cada 4 golpes básicos sale un rayo que salta entre enemigos"},
  skill_nova:   {name:"Resonancia Arcana",   desc:"Al lanzar una habilidad, una onda de energía golpea a tu alrededor"},
  kill_heal:    {name:"Festín de Almas",     desc:"Cada baja te cura; las bajas de élite curan mucho más"},
  hit_shield:   {name:"Égida",               desc:"Un golpe fuerte recibido te da un escudo (cada 8 s)"},
  basic_freeze: {name:"Escarcha Viva",       desc:"Tus básicos ralentizan; cada 6 golpes congelan al objetivo"},
  combo_ramp:   {name:"Furia Creciente",     desc:"Golpear seguido acumula daño y velocidad de ataque (hasta 10)"},
  crit_quake:   {name:"Golpe Sísmico",       desc:"Los críticos generan una onda de choque que aturde"}
};
const LEGEND_PROC_IDS = Object.keys(LEGEND_PROCS);
const LEGEND_PROC_POWER = {legendario:1, mitico:1.45, unico:1.7};
const PASSIVE_DB_MYTHIC = [
  {id:"pasm_overload",  name:"Sobrecarga Mítica",  desc:"Bonificación adicional de daño y velocidad al bajar de 50% de vida", condition:"vida<50%", effect:"mythic_execute",  valueBase:0.15, growth:0},
  {id:"pasm_guardian",  name:"Guardián Mítico",    desc:"Al quedar sin escudo, genera un escudo de emergencia una vez por combate", condition:"escudo=0 (1 vez)", effect:"mythic_emergency_shield", valueBase:0.20, growth:0}
];

/* ============================================================
   SETS (sección 7/8) — un set NO es una rareza: una pieza es
   "legendario + set" o "mitico + set", nunca "set" a secas.
   ============================================================ */
// Catálogo de sets. Cada uno declara sus 6 piezas (una por slot) y los umbrales de bonus que
// usa (no todos tienen que usar 2/4/6 exactos). "mods" de cada umbral usa EXACTAMENTE el mismo
// formato que ya consumen talentos/pasivas: {effect,value} global o {targetSkill,key/flag,value}
// por habilidad -se agregan a computeTalentMods() vía activeSetBonusEffects(), sección de abajo-.
const SET_DB = {
  lucifer: {
    id:"lucifer", name:"Set de Lucifer", rarity:"legendario",
    lore:"Forjado en las profundidades del Infierno para un campeón caído que se negó a arrodillarse.",
    pieces:{
      arma:"Espada de Lucifer", escudo:"Escudo de Lucifer", casco:"Casco de Lucifer",
      pechera:"Pechera de Lucifer", guantes:"Guantes de Lucifer", botas:"Botas de Lucifer"
    },
    thresholds:[
      {count:2, desc:"+8% daño de fuego (todas las habilidades)", mods:()=>[{effect:"skilldmg_mult", value:0.08}]},
      {count:3, desc:"+10% defensa", mods:()=>[{effect:"def_add", value:0.10}]},
      {count:4, desc:"Los golpes básicos aplican Quemadura (daño sobre el tiempo)", mods:()=>[{effect:"onhit_proc", value:0.35}]},
      {count:6, desc:"+25% daño general y +15% robo de vida: el Infierno mismo pelea con vos", mods:()=>[{effect:"dmg_mult", value:0.25},{effect:"lifesteal_add", value:0.15}]}
    ]
  }
};

/* ============================================================
   LEGENDARIOS Y MÍTICOS DISEÑADOS A MANO (sección 12/13)
   ============================================================
   Cantidad MODERADA a propósito (calidad > cantidad): 1 legendario + 1 mítico realmente
   distintivo por campeón, cada uno reutilizando una bandera YA cableada en castAbility para
   la habilidad real de ese campeón (las mismas que ya usan sus propios Talentos especiales),
   así el modificador es mecánicamente real desde el día uno, no solo un +X% genérico con
   nombre bonito. `skillMods` usa el mismo formato {targetSkill,flag/key,value} que ya consume
   computeTalentMods(). Índices de habilidad: 0/1/2 = las 3 skills en el orden de CLASSES,
   "ult" = la Ultimate.
   ============================================================ */
const DESIGNED_ITEMS = {
  tanque_leg: {id:"tanque_leg", champion:"tanque", type:"escudo", rarity:"legendario",
    name:"Escudo del Juggernaut", lore:"Perteneció a un caballero que nunca retrocedió un solo paso.",
    passiveNames:["Ariete Blindado"], skillMods:[{targetSkill:1, flag:"chargeDefBonus", value:0.10}]},
  tanque_mit: {id:"tanque_mit", champion:"tanque", type:"pechera", rarity:"mitico",
    name:"Corona del Paladín Eterno", lore:"Se dice que el grito de su portador todavía se escucha en el campo de batalla.",
    passiveNames:["Grito que No Termina"], skillMods:[{targetSkill:2, flag:"warcryExtendsSpinPct", value:0.18}]},
  guerrero_leg: {id:"guerrero_leg", champion:"guerrero", type:"botas", rarity:"legendario",
    name:"Garra del Cazador", lore:"Cada paso que da queda marcado con una trampa invisible.",
    passiveNames:["Trampa Adicional"], skillMods:[{targetSkill:2, flag:"extraTrapCount", value:1}]},
  guerrero_mit: {id:"guerrero_mit", champion:"guerrero", type:"arma", rarity:"mitico",
    name:"Colmillo del Verdugo", lore:"Bebe con más sed cuanto más débil está su presa.",
    passiveNames:["Instinto Asesino"], skillMods:[{targetSkill:1, flag:"executeLowHpBonus", value:0.22}]},
  mago_leg: {id:"mago_leg", champion:"mago", type:"casco", rarity:"legendario",
    name:"Cristal de Invierno Eterno", lore:"Extraído de un glaciar que nunca ha visto el sol.",
    passiveNames:["Escarcha que Paraliza"], skillMods:[{targetSkill:1, flag:"frostNovaStunMs", value:350}]},
  mago_mit: {id:"mago_mit", champion:"mago", type:"arma", rarity:"mitico",
    name:"Corazón del Muro Eterno", lore:"El fuego que jamás se apaga, ni siquiera cuando el Mago descansa.",
    passiveNames:["Ígneo Persistente"], skillMods:[{targetSkill:0, flag:"wallEmpowersAll", value:0.07}]},
  soporte_leg: {id:"soporte_leg", champion:"soporte", type:"pechera", rarity:"legendario",
    name:"Cáliz de Sobreabundancia", lore:"Nunca se vacía del todo: siempre queda algo para dar.",
    passiveNames:["Desborde Sagrado"], effectMods:[{effect:"overheal_shield_pct", value:0.15}]},
  soporte_mit: {id:"soporte_mit", champion:"soporte", type:"arma", rarity:"mitico",
    name:"Aura de la Consagración", lore:"Bendice el arma de un aliado con un eco ofensivo propio.",
    passiveNames:["Consagración Mayor"], skillMods:[{targetSkill:1, flag:"offensiveNovaPct", value:0.14}]},
  segador_leg: {id:"segador_leg", champion:"segador", type:"pechera", rarity:"legendario",
    name:"Yugo de la Furia", lore:"Cuanto más aprieta, más fuerte se vuelve quien lo lleva.",
    passiveNames:["Furia Vampírica"], skillMods:[{targetSkill:1, flag:"furyLifestealBonus", value:0.06}]},
  segador_mit: {id:"segador_mit", champion:"segador", type:"arma", rarity:"mitico",
    name:"Corazón Carmesí", lore:"Late más rápido mientras menos le queda por perder.",
    passiveNames:["Desesperación Letal"], effectMods:[{effect:"missinghp_dmg_bonus", value:0.22}]},
  axiom_leg: {id:"axiom_leg", champion:"axiom", type:"botas", rarity:"legendario",
    name:"Fragmento de Recarga", lore:"Un trozo de código que nunca terminó de compilar.",
    passiveNames:["Recipiente Reforzado"], skillMods:[{targetSkill:2, flag:"teleportShieldPct", value:0.07}]},
  axiom_mit: {id:"axiom_mit", champion:"axiom", type:"arma", rarity:"mitico",
    name:"Núcleo de Ejecución Forzada", lore:"Encuentra la vulnerabilidad exacta antes de que exista.",
    passiveNames:["Excepción Fatal"], skillMods:[{targetSkill:1, flag:"executeMultBonus", value:0.35}]},
  profeta_leg: {id:"profeta_leg", champion:"profeta", type:"casco", rarity:"legendario",
    name:"Lágrima del Augurio", lore:"Cada lágrima que cae es un futuro que ya no ocurrirá.",
    passiveNames:["Presagio Amplio"], skillMods:[{targetSkill:2, flag:"augurioStunRadiusPct", value:0.12}]},
  profeta_mit: {id:"profeta_mit", champion:"profeta", type:"pechera", rarity:"mitico",
    name:"Cáliz del Sacrificio Menor", lore:"Un poco de vida propia a cambio de mucha vida ajena.",
    passiveNames:["Precio Reducido"], skillMods:[{targetSkill:0, flag:"sacrificeHealBonus", value:0.12}]}
};
// Las 6 piezas del Set de Lucifer, generadas desde SET_DB.pieces + RARITY_VALUES: comparten la
// identidad "legendario + set", sin necesitar una entrada manual repetida por pieza.
Object.keys(SET_DB.lucifer.pieces).forEach(type=>{
  const key = "lucifer_"+type;
  DESIGNED_ITEMS[key] = {id:key, champion:null, type, rarity:SET_DB.lucifer.rarity, set:"lucifer",
    name:SET_DB.lucifer.pieces[type], lore:SET_DB.lucifer.lore, passiveNames:[]};
});
// El % garantizado de cada tipo de objeto (item.value) se traduce en UN efecto concreto según
// la "identidad del slot" (sección 4): arma/casco/escudo siguen su mecanismo propio de siempre
// (computePlayerStats, dmg directo / shieldPct), así que acá solo se sintetiza el de los 3
// slots nuevos -pechera/guantes/botas- como una pasiva más, reusando el mismo balde de
// passiveSum sin tocar ninguna fórmula de combate existente.
const SLOT_GUARANTEED_EFFECT = { pechera:"hp_mult", guantes:"atkspeed_mult", botas:"speed_mult" };
// Agrega un objeto al inventario permanente de un campeón (NO lo equipa automáticamente)
const INVENTORY_CAPACITY = 30;
// Valor de venta por rareza, centralizado (fácil de rebalancear después)
const SELL_VALUE = {comun:12, raro:28, muyraro:60, legendario:130, mitico:280, unico:600};
