"use strict";
/* ============================================================
   js/data/legendaries.js
   LEGENDARIOS CON NOMBRE PROPIO, MÍTICOS CON RECETA y ÚNICOS (arquitectura).
   - Legendario: nombre propio + epíteto + 2-3 propiedades + UN poder funcional (LEGEND_PROCS).
     Pueden especializar una build; no todos la transforman.
   - Mítico: su poder principal CAMBIA la forma de jugar (MYTHIC_POWERS, js/systems/mythic-powers.js).
     Cada Mítico de receta se fabrica con 3 LEGENDARIOS ESPECÍFICOS, relacionados en tema y en
     mecánica: las tres piezas anticipan el poder final ("me falta ese para completar mi Mítico").
   - Único: jackpot. Nunca se fabrica ni se vende en la tienda; cada uno se diseña a mano
     (UNIQUE_POWERS: apariencia, VFX, habilidad). Ver UNIQUE_DESIGNS abajo.
   Todos se registran en DESIGNED_ITEMS (mismo modelo que el resto: id, tipo, rareza), así el
   inventario, la red, la venta y las recetas los tratan igual que a cualquier objeto.
   >>> Afinidad por arena: `arenas` (peso relativo al tirar el botín en esa arena).
   ============================================================ */

// Poderes nuevos de legendario (se suman a los 8 de js/data/items.js). Todos funcionan en combate
// (js/systems/item-procs.js). `epithet` sirve para nombrar legendarios procedurales.
Object.assign(LEGEND_PROCS, {
  frost_aura:   {name:"Aliento Glacial",     desc:"Los enemigos cerca tuyo se mueven un 18% más lento"},
  ignite_basic: {name:"Brasa Viva",          desc:"Tus golpes básicos prenden fuego al objetivo"},
  bleed_basic:  {name:"Filo Sediento",       desc:"Tus golpes básicos abren heridas que sangran"},
  haste_on_kill:{name:"Paso del Cazador",    desc:"Cada baja te da velocidad de movimiento (se acumula hasta 10)"},
  ally_ward:    {name:"Guardia Juramentada", desc:"Los aliados cerca tuyo reciben 10% menos daño"},
  retaliate:    {name:"Represalia",          desc:"Quien te golpea cuerpo a cuerpo recibe parte del daño y queda aturdido"},
  heal_haste:   {name:"Gracia Veloz",        desc:"Curar a un aliado les da a los dos velocidad por 2,5 s"},
  execute_edge: {name:"Filo del Verdugo",    desc:"+60% de daño a enemigos comunes y élites con menos de 20% de vida"},
  shock_skill:  {name:"Descarga Arcana",     desc:"Tus habilidades pueden electrocutar: aturden un instante y saltan a otro enemigo"},
  burn_vs:      {name:"Avivar las Llamas",   desc:"+25% de daño contra enemigos que están ardiendo"},
  cold_crit:    {name:"Frío que Quiebra",    desc:"+50% de daño crítico contra enemigos ralentizados o congelados"}
});
const LEGEND_PROC_EPITHET = {
  kill_explode:"del Estallido Ígneo", basic_chain:"de la Tormenta Encadenada", skill_nova:"de la Resonancia Arcana",
  kill_heal:"del Festín de Almas", hit_shield:"de la Égida", basic_freeze:"de la Escarcha Viva", combo_ramp:"de la Furia Creciente",
  crit_quake:"del Golpe Sísmico", frost_aura:"del Aliento Glacial", ignite_basic:"de la Brasa Viva", bleed_basic:"del Filo Sediento",
  haste_on_kill:"del Paso del Cazador", ally_ward:"de la Guardia Juramentada", retaliate:"de la Represalia", heal_haste:"de la Gracia Veloz",
  execute_edge:"del Verdugo", shock_skill:"de la Descarga Arcana", burn_vs:"de las Llamas Avivadas", cold_crit:"del Frío que Quiebra"
};
Object.keys(LEGEND_PROCS).forEach(k=>{ if(!LEGEND_PROC_IDS.includes(k)) LEGEND_PROC_IDS.push(k); });

/* ---------------- nombres de objetos procedurales ---------------- */
// Un objeto común/raro/muy raro no tiene nombre propio: sustantivo del tipo + calidad. Un legendario
// procedural sí: sustantivo + "de <Nombre>" + el epíteto de su poder ("Yelmo de Morvath, de la Égida").
const ITEM_NOUNS = {
  arma:["Hoja","Filo","Colmillo","Espada","Hacha","Cetro"], escudo:["Escudo","Rodela","Égida","Pavés"],
  casco:["Yelmo","Capucha","Corona","Máscara"], pechera:["Coraza","Pechera","Manto","Cota"],
  guantes:["Guanteletes","Guantes","Brazales","Puños"], botas:["Botas","Grebas","Sandalias","Pasos"]
};
const ITEM_NOUN_FEM = {Hoja:1, Espada:1, Colmillo:0, Hacha:1, Rodela:1, "Égida":1, Capucha:1, Corona:1, "Máscara":1, Coraza:1, Pechera:1, Cota:1,
  Botas:1, Grebas:1, Sandalias:1};
const ITEM_NOUN_PLURAL = {Guanteletes:1, Guantes:1, Brazales:1, "Puños":1, Botas:1, Grebas:1, Sandalias:1, Pasos:1};
const ITEM_QUALITY = {
  comun:  ["Gastad{o}","Oxidad{o}","de Hierro Viejo","Remendad{o}"],
  raro:   ["Templad{o}","de Acero Azul","Reforzad{o}","del Veterano"],
  muyraro:["de Acero Negro","Rúnic{o}","del Campeón","Grabad{o} en Oro"]
};
const LEGEND_PROPER_NAMES = ["Morvath","Ilsande","Karzul","Veyra","Thorgrim","Ashkael","Nerith","Obrecht","Selvane","Durmak",
  "Ysmera","Galdric","Vaelith","Brunhal","Coriane","Zherath"];

/* ---------------- 24 LEGENDARIOS CON NOMBRE (componentes de los Míticos) ---------------- */
// props usan los mismos efectos que ya consume passiveSum (valores reales, sin multiplicador).
const NAMED_LEGENDARIES = {
  // — Invierno (receta: Corona del Invierno Sin Fin)
  leg_tundraverx:{name:"Esquirla de Tundraverx", epithet:"la que muerde el aire", type:"arma", element:"ice", proc:"basic_freeze",
    props:[{effect:"dmg_mult",value:0.10},{effect:"crit_chance_add",value:0.04}], arenas:{hielo:5, acuatica:1},
    lore:"Arrancada del ala del Soberano de Hielo. Todavía está fría al tacto, aunque la dejes al sol."},
  leg_glaciar_manto:{name:"Manto del Glaciar Dormido", epithet:"que nunca despertó", type:"pechera", element:"ice", proc:"frost_aura",
    props:[{effect:"hp_mult",value:0.10},{effect:"def_add",value:0.05}], arenas:{hielo:5, micelial:1},
    lore:"Tejido con escarcha de un glaciar que duerme desde antes de la primera horda."},
  leg_ventisquero:{name:"Ojo del Ventisquero", epithet:"que ve el hielo romperse", type:"guantes", element:"ice", proc:"cold_crit",
    props:[{effect:"crit_mult_add",value:0.22},{effect:"atkspeed_mult",value:0.08}], arenas:{hielo:4, laberinto:1},
    lore:"Los guantes de un cazador que esperaba la ventisca para golpear."},
  // — Averno (receta: Corazón del Averno)
  leg_belial:{name:"Ascua de Belial", epithet:"el que no se apaga", type:"arma", element:"fire", proc:"kill_explode",
    props:[{effect:"dmg_mult",value:0.12},{effect:"skilldmg_mult",value:0.06}], arenas:{infernal:5, fortaleza:1},
    lore:"Un trozo del corazón de un demonio menor. Late cuando hay sangre cerca."},
  leg_herrero_caido:{name:"Guanteletes del Herrero Caído", epithet:"forjados en la derrota", type:"guantes", element:"fire", proc:"ignite_basic",
    props:[{effect:"atkspeed_mult",value:0.10},{effect:"dmg_mult",value:0.05}], arenas:{fortaleza:4, infernal:2},
    lore:"El herrero de la Fortaleza siguió forjando después de muerto. Estos fueron sus últimos."},
  leg_brasa_viva:{name:"Yelmo de Brasa Viva", epithet:"que arde por dentro", type:"casco", element:"fire", proc:"burn_vs",
    props:[{effect:"hp_mult",value:0.08},{effect:"skilldmg_mult",value:0.08}], arenas:{infernal:4, fortaleza:2},
    lore:"Quien lo usa siente el calor en la nuca. Quien lo enfrenta, en toda la piel."},
  // — Tormenta (receta: Martillo de la Tormenta Primigenia)
  leg_ysolde:{name:"Cadena de Ysolde", epithet:"la que salta", type:"arma", element:"lightning", proc:"basic_chain",
    props:[{effect:"atkspeed_mult",value:0.10},{effect:"dmg_mult",value:0.07}], arenas:{acuatica:5, laberinto:1},
    lore:"Ysolde encadenaba rayos como otros encadenan prisioneros."},
  leg_relampago_errante:{name:"Botas del Relámpago Errante", epithet:"que nunca pisan dos veces", type:"botas", element:"lightning", proc:"haste_on_kill",
    props:[{effect:"speed_mult",value:0.08},{effect:"cd_mult",value:0.05}], arenas:{acuatica:4, bosque:1},
    lore:"Dejan un olor a tormenta en cada paso."},
  leg_descarga:{name:"Brazal de la Descarga", epithet:"que muerde al tocar", type:"guantes", element:"lightning", proc:"shock_skill",
    props:[{effect:"onhit_proc",value:0.10},{effect:"skilldmg_mult",value:0.07}], arenas:{acuatica:4, laberinto:2},
    lore:"Forjado dentro de una anguila eléctrica. Todavía zumba."},
  // — Bastión (receta: Égida del Último Bastión)
  leg_kaelen:{name:"Muro de Kaelen", epithet:"el que no retrocedió", type:"escudo", element:"physical", proc:"hit_shield",
    props:[{effect:"def_add",value:0.07},{effect:"hp_mult",value:0.08}], arenas:{fortaleza:5, bosque:1},
    lore:"Kaelen sostuvo la puerta de la Fortaleza tres días. Al cuarto, la puerta lo sostuvo a él."},
  leg_juramento_roto:{name:"Pechera del Juramento Roto", epithet:"que devuelve cada golpe", type:"pechera", element:"physical", proc:"retaliate",
    props:[{effect:"def_add",value:0.08},{effect:"hp_mult",value:0.06}], arenas:{fortaleza:4, laberinto:2},
    lore:"El caballero juró no caer. Cayó. La pechera no aceptó el final."},
  leg_centinela:{name:"Yelmo del Centinela", epithet:"que vigila a los suyos", type:"casco", element:"physical", proc:"ally_ward",
    props:[{effect:"hp_mult",value:0.10},{effect:"heal_mult",value:0.06}], arenas:{fortaleza:3, laberinto:3},
    lore:"Mientras el Centinela mire, nadie de su guardia muere solo."},
  // — Cosecha Roja (receta: Guadaña de la Cosecha Roja)
  leg_morrah:{name:"Hoja Sedienta de Morrah", epithet:"que nunca se sacia", type:"arma", element:"bleed", proc:"bleed_basic",
    props:[{effect:"dmg_mult",value:0.10},{effect:"lifesteal_add",value:0.04}], arenas:{bosque:4, laberinto:2},
    lore:"Morrah la dejó clavada en un árbol de las Ruinas. El árbol todavía sangra."},
  leg_carnicero:{name:"Guantes del Carnicero", epithet:"de la Ciudad Baja", type:"guantes", element:"bleed", proc:"execute_edge",
    props:[{effect:"atkspeed_mult",value:0.09},{effect:"lifesteal_add",value:0.05}], arenas:{laberinto:4, bosque:1},
    lore:"Nunca se lavaron. Nadie se animó a pedírselo."},
  leg_caceria_roja:{name:"Botas de la Cacería Roja", epithet:"que siguen el rastro", type:"botas", element:"bleed", proc:"kill_heal",
    props:[{effect:"speed_mult",value:0.07},{effect:"lifesteal_add",value:0.04}], arenas:{bosque:5, micelial:1},
    lore:"Encuentran a la presa herida aunque su dueño no sepa dónde está."},
  // — Alba (receta: Báculo del Alba Eterna)
  leg_seraphine:{name:"Lágrima de Seraphine", epithet:"la que no cayó en vano", type:"casco", element:"holy", proc:"kill_heal",
    props:[{effect:"heal_mult",value:0.12},{effect:"energy_mult",value:0.08}], arenas:{micelial:3, bosque:3},
    lore:"Seraphine lloró una sola vez: por todos los que no pudo salvar. La lágrima se volvió cristal."},
  leg_peregrino:{name:"Túnica del Peregrino", epithet:"que caminó hasta el alba", type:"pechera", element:"holy", proc:"hit_shield",
    props:[{effect:"overheal_shield_pct",value:0.18},{effect:"heal_mult",value:0.06}], arenas:{micelial:4, acuatica:1},
    lore:"El Peregrino cruzó el Reino Micelial sin enfermar. Nadie sabe cómo."},
  leg_alba_sandalias:{name:"Sandalias del Primer Alba", epithet:"que llegan antes que la luz", type:"botas", element:"holy", proc:"heal_haste",
    props:[{effect:"speed_mult",value:0.07},{effect:"heal_mult",value:0.08}], arenas:{micelial:3, bosque:2},
    lore:"Dicen que quien las usa llega a tiempo. Siempre."},
  // — Eco Arcano (receta: Grimorio del Vacío Hambriento)
  leg_mil_sellos:{name:"Diadema de los Mil Sellos", epithet:"que recuerda cada hechizo", type:"casco", element:"arcane", proc:"skill_nova",
    props:[{effect:"cd_mult",value:0.06},{effect:"skilldmg_mult",value:0.08}], arenas:{laberinto:4, micelial:2},
    lore:"Cada sello es un hechizo que alguien lanzó y olvidó. La diadema no olvida."},
  leg_ceniza_arcana:{name:"Dedos de Ceniza Arcana", epithet:"que queman el aire", type:"guantes", element:"arcane", proc:"shock_skill",
    props:[{effect:"skilldmg_mult",value:0.10},{effect:"energy_mult",value:0.06}], arenas:{laberinto:4, infernal:1},
    lore:"Los dedos de un mago que tocó el Vacío. Solo quedaron los guantes."},
  leg_umbral:{name:"Pasos del Umbral", epithet:"entre un lugar y otro", type:"botas", element:"arcane", proc:"haste_on_kill",
    props:[{effect:"cd_mult",value:0.06},{effect:"speed_mult",value:0.06}], arenas:{laberinto:3, micelial:2},
    lore:"Quien los usa está siempre un paso más allá de donde lo buscan."},
  // — Eclipse (receta: Hoja del Eclipse)
  leg_medianoche:{name:"Filo de Medianoche", epithet:"que corta la sombra", type:"arma", element:"physical", proc:"crit_quake",
    props:[{effect:"crit_chance_add",value:0.06},{effect:"crit_mult_add",value:0.18}], arenas:{infernal:3, laberinto:3},
    lore:"Se forjó una noche sin luna. Brilla solo cuando va a matar."},
  leg_acecho:{name:"Máscara del Acecho Nocturno", epithet:"que no parpadea", type:"casco", element:"physical", proc:"execute_edge",
    props:[{effect:"crit_chance_add",value:0.06},{effect:"dmg_mult",value:0.06}], arenas:{bosque:2, laberinto:3, infernal:1},
    lore:"Los que la vieron de frente no llegaron a contarlo."},
  leg_duelista:{name:"Guantes del Duelista Silencioso", epithet:"que ganó sin hablar", type:"guantes", element:"physical", proc:"combo_ramp",
    props:[{effect:"crit_mult_add",value:0.20},{effect:"atkspeed_mult",value:0.08}], arenas:{laberinto:3, fortaleza:2},
    lore:"Ganó cien duelos. Nunca dijo su nombre."}
};

/* ---------------- 8 MÍTICOS DE RECETA ---------------- */
// Su poder principal (mythic) está implementado en js/systems/mythic-powers.js.
const MYTHIC_POWERS = {
  myth_winter:  {name:"Invierno Sin Fin",    desc:"Cada 3 ralentizaciones sobre el mismo enemigo lo CONGELÁS (1,2 s). Los congelados que mueren estallan en esquirlas que ralentizan y encadenan el frío."},
  myth_inferno: {name:"Combustión Perpetua", desc:"El fuego se CONTAGIA: cada enemigo en llamas prende a otro cercano cada segundo. Los que mueren ardiendo explotan."},
  myth_storm:   {name:"Tormenta Viva",       desc:"Cada 3 habilidades, una TORMENTA te sigue 4 s descargando rayos sobre los enemigos cercanos (aturden un instante)."},
  myth_bastion: {name:"Último Bastión",      desc:"Los golpes fuertes que recibís se ACUMULAN; tu siguiente habilidad libera una onda que devuelve ese daño x2,5 y aturde. Los aliados cerca tuyo reciben 12% menos daño."},
  myth_harvest: {name:"Cosecha Roja",        desc:"Tus básicos hacen SANGRAR. Los que sangran reciben +20% de daño; matar a uno te cura y contagia el sangrado a 3 enemigos cercanos."},
  myth_dawn:    {name:"Alba Eterna",         desc:"Cada curación deja SUELO CONSAGRADO por 3 s: cura a los aliados y quema a los enemigos que lo pisan."},
  myth_echo:    {name:"Eco del Vacío",       desc:"Tus habilidades tienen 25% de probabilidad de REPETIRSE solas al 60% de poder (las de desplazamiento e invocación no)."},
  myth_eclipse: {name:"Eclipse",             desc:"Tus críticos MARCAN al enemigo: si baja de 25% de vida, tu próximo golpe lo EJECUTA (no a jefes ni subjefes). +25% de daño crítico contra jefes."}
};
const RECIPE_MYTHICS = {
  myth_corona_invierno:{name:"Corona del Invierno Sin Fin", type:"casco", mythic:"myth_winter", element:"ice", proc:"frost_aura",
    recipe:["leg_tundraverx","leg_glaciar_manto","leg_ventisquero"], props:[{effect:"hp_mult",value:0.12},{effect:"crit_mult_add",value:0.20},{effect:"dmg_mult",value:0.08}],
    arenas:{hielo:5, acuatica:1}, lore:"La llevaba el Mago de Hielo antes de que el Ángel Caído la reclamara."},
  myth_corazon_averno:{name:"Corazón del Averno", type:"pechera", mythic:"myth_inferno", element:"fire", proc:"burn_vs",
    recipe:["leg_belial","leg_herrero_caido","leg_brasa_viva"], props:[{effect:"hp_mult",value:0.12},{effect:"skilldmg_mult",value:0.10},{effect:"dmg_mult",value:0.08}],
    arenas:{infernal:5, fortaleza:1}, lore:"Late con el ritmo de la Horda. Cuanto más cerca está, más rápido."},
  myth_martillo_tormenta:{name:"Martillo de la Tormenta Primigenia", type:"arma", mythic:"myth_storm", element:"lightning", proc:"basic_chain",
    recipe:["leg_ysolde","leg_relampago_errante","leg_descarga"], props:[{effect:"dmg_mult",value:0.14},{effect:"atkspeed_mult",value:0.10},{effect:"cd_mult",value:0.06}],
    arenas:{acuatica:5, laberinto:1}, lore:"El primer rayo que cayó sobre el mundo. Alguien lo atrapó y le puso mango."},
  myth_egida_bastion:{name:"Égida del Último Bastión", type:"escudo", mythic:"myth_bastion", element:"physical", proc:"retaliate",
    recipe:["leg_kaelen","leg_juramento_roto","leg_centinela"], props:[{effect:"def_add",value:0.10},{effect:"hp_mult",value:0.14}],
    arenas:{fortaleza:5, laberinto:1}, lore:"El último escudo de la última muralla. Nadie la cruzó mientras estuvo en pie."},
  myth_guadana_roja:{name:"Guadaña de la Cosecha Roja", type:"arma", mythic:"myth_harvest", element:"bleed", proc:"execute_edge",
    recipe:["leg_morrah","leg_carnicero","leg_caceria_roja"], props:[{effect:"dmg_mult",value:0.14},{effect:"lifesteal_add",value:0.07}],
    arenas:{bosque:4, laberinto:3}, lore:"No siega trigo."},
  myth_baculo_alba:{name:"Báculo del Alba Eterna", type:"arma", mythic:"myth_dawn", element:"holy", proc:"heal_haste",
    recipe:["leg_seraphine","leg_peregrino","leg_alba_sandalias"], props:[{effect:"heal_mult",value:0.18},{effect:"energy_mult",value:0.10},{effect:"dmg_mult",value:0.06}],
    arenas:{micelial:4, bosque:2}, lore:"Anuncia la mañana aunque falten horas. A veces, eso alcanza para aguantar."},
  myth_grimorio_vacio:{name:"Grimorio del Vacío Hambriento", type:"guantes", mythic:"myth_echo", element:"arcane", proc:"skill_nova",
    recipe:["leg_mil_sellos","leg_ceniza_arcana","leg_umbral"], props:[{effect:"cd_mult",value:0.10},{effect:"skilldmg_mult",value:0.12}],
    arenas:{laberinto:5, micelial:1}, lore:"Cada página que leés, desaparece. Y vuelve más fuerte."},
  myth_hoja_eclipse:{name:"Hoja del Eclipse", type:"arma", mythic:"myth_eclipse", element:"physical", proc:"crit_quake",
    recipe:["leg_medianoche","leg_acecho","leg_duelista"], props:[{effect:"crit_chance_add",value:0.08},{effect:"crit_mult_add",value:0.30},{effect:"dmg_mult",value:0.08}],
    arenas:{infernal:3, laberinto:3}, lore:"Cuando el sol y la luna se cruzan, la hoja corta una sola vez. Alcanza."}
};

/* ---------------- ÚNICOS: jackpot, diseñados a mano ---------------- */
// Arquitectura: cada Único es de UN campeón y su poder (UNIQUE_POWERS) puede cambiar apariencia
// (aura/tinte), VFX y el comportamiento de una habilidad. Implementación: js/systems/mythic-powers.js
// (uniqueOf / uniqueHook). Nunca caen como objeto genérico: si la rareza "único" sale y el campeón
// no tiene Único diseñado, cae uno de otro campeón (el botín es cruzado). Nunca se fabrican.
const UNIQUE_POWERS = {
  uniq_archimago:{name:"Fuego del Vacío", desc:"Tu fuego se vuelve violeta y quema el doble de tiempo. El Muro de Fuego te sigue. La Cadena de Relámpago salta 3 veces más y deja a cada objetivo en llamas.",
    aura:"176,106,255", champion:"mago"},
  uniq_juggernaut:{name:"Paso del Coloso", desc:"Te agrandás un 15% y cada paso hace temblar el suelo: los enemigos pegados a vos se tambalean. La Embestida deja una grieta que aturde a todo lo que cruza.",
    aura:"255,190,90", champion:"tanque"},
  uniq_lunaroja:{name:"Luna Roja", desc:"Tus flechas son de sangre: cada una hace sangrar y, contra tu Presa, atraviesa. El Lobo Espectral aparece siempre que marcás una Presa nueva (cada 20 s).",
    aura:"255,60,80", champion:"cazadora"}
};
const UNIQUE_DESIGNS = {
  uniq_corona_archimago:{name:"Corona del Archimago Eclipsado", type:"casco", champion:"mago", unique:"uniq_archimago", element:"fire",
    props:[{effect:"skilldmg_mult",value:0.18},{effect:"cd_mult",value:0.10},{effect:"energy_mult",value:0.12}],
    lore:"El último Archimago miró al Vacío hasta que el Vacío le devolvió la mirada. La corona es lo único que quedó mirando."},
  uniq_yelmo_coloso:{name:"Yelmo del Coloso Errante", type:"casco", champion:"tanque", unique:"uniq_juggernaut", element:"physical",
    props:[{effect:"hp_mult",value:0.22},{effect:"def_add",value:0.10}],
    lore:"Perteneció a un gigante que caminó a través de tres hordas sin detenerse."},
  uniq_arco_lunaroja:{name:"Arco de la Luna Roja", type:"arma", champion:"cazadora", unique:"uniq_lunaroja", element:"bleed",
    props:[{effect:"dmg_mult",value:0.20},{effect:"atkspeed_mult",value:0.12},{effect:"crit_chance_add",value:0.06}],
    lore:"Solo se tensa cuando la luna sangra. La Cazadora aprendió a esperar esas noches."}
};

/* ---------------- registro en DESIGNED_ITEMS ---------------- */
const MYTHIC_RECIPES = {}; // mythicDesignId -> [legendaryDesignId x3]
(function registerNamedItems(){
  for(const id in NAMED_LEGENDARIES){
    const d = NAMED_LEGENDARIES[id];
    DESIGNED_ITEMS[id] = {id, champion:null, type:d.type, rarity:"legendario", named:true, epithet:d.epithet, element:d.element,
      name:d.name, lore:d.lore, legendProc:d.proc, arenas:d.arenas, effectMods:d.props, passiveNames:d.props.map(p=>PASSIVE_EFFECT_LABEL[p.effect]||"Propiedad")};
  }
  for(const id in RECIPE_MYTHICS){
    const d = RECIPE_MYTHICS[id];
    DESIGNED_ITEMS[id] = {id, champion:null, type:d.type, rarity:"mitico", named:true, element:d.element, mythic:d.mythic, recipe:d.recipe.slice(),
      name:d.name, lore:d.lore, legendProc:d.proc, arenas:d.arenas, effectMods:d.props, passiveNames:d.props.map(p=>PASSIVE_EFFECT_LABEL[p.effect]||"Propiedad")};
    MYTHIC_RECIPES[id] = d.recipe.slice();
  }
  for(const id in UNIQUE_DESIGNS){
    const d = UNIQUE_DESIGNS[id];
    DESIGNED_ITEMS[id] = {id, champion:d.champion, type:d.type, rarity:"unico", named:true, element:d.element, unique:d.unique,
      name:d.name, lore:d.lore, effectMods:d.props, passiveNames:d.props.map(p=>PASSIVE_EFFECT_LABEL[p.effect]||"Propiedad")};
  }
})();
// Qué Mítico usa un legendario como ingrediente (para la UI: "parte de la receta de…").
function recipesUsing(designId){ return Object.keys(MYTHIC_RECIPES).filter(m=>MYTHIC_RECIPES[m].includes(designId)); }
