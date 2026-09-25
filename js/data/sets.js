"use strict";
/* ============================================================
   js/data/sets.js
   Los SETS de La Horda (Loot & Sets V1). Categoría especial VERDE: no son "mejores que
   Mítico", son SINERGIA entre piezas. Cada set arma una build distinta:
   - bonus parciales (2 y 3 piezas): estadísticas que empujan hacia esa build;
   - SET COMPLETO: un comportamiento nuevo en combate (ver js/systems/set-effects.js).
   Las piezas tienen el poder base de un Legendario (RARITY_VALUES.legendario) y no se fusionan
   con la fusión común; los duplicados se pueden REFORJAR (2 duplicados -> 1 pieza faltante).
   Set de Lucifer (6 piezas) se define en js/data/items.js y acá se completa su bonus final.
   ============================================================ */
const SET_COLOR = "#3ddc71";

// Revisión del Set de Lucifer: el bonus de 6 piezas ahora cambia la forma de pelear (riesgo).
SET_DB.lucifer.theme = "Fuego · riesgo · agresión";
SET_DB.lucifer.aura = "255,110,40";
SET_DB.lucifer.full = "infierno";
SET_DB.lucifer.thresholds[3] = {count:6, desc:"INFIERNO DESATADO: +15% daño y +8% robo de vida. Con menos de 50% de vida tus golpes básicos incendian y tus asesinatos estallan en llamas.",
  mods:()=>[{effect:"dmg_mult", value:0.15},{effect:"lifesteal_add", value:0.08}]};

const NEW_SETS = {
  glaciar: {
    name:"Pacto del Glaciar", theme:"Hielo · control", aura:"150,220,255", full:"glaciar",
    lore:"Un juramento sellado en el corazón de un glaciar que nunca se derritió.",
    pieces:{arma:"Colmillo del Glaciar", casco:"Diadema de Escarcha", pechera:"Coraza del Invierno", guantes:"Garras Gélidas"},
    thresholds:[
      {count:2, desc:"Tus habilidades ralentizan un 20% (1,5 s) y +10% duración de ralentización", mods:()=>[]},
      {count:3, desc:"+12% daño contra enemigos ralentizados o congelados", mods:()=>[]},
      {count:4, desc:"FRAGMENTOS: golpear enemigos ralentizados acumula fragmentos. Con 5, o si muere, estalla una explosión glacial que daña y congela alrededor.", mods:()=>[]}
    ]},
  coloso: {
    name:"Corazón del Coloso", theme:"Tanque · absorber", aura:"230,190,110", full:"coloso",
    lore:"Late despacio, como una montaña que respira.",
    pieces:{escudo:"Bastión del Coloso", casco:"Yelmo del Coloso", pechera:"Corazón de Piedra", botas:"Pisada del Coloso"},
    thresholds:[
      {count:2, desc:"+12% vida máxima", mods:()=>[{effect:"hp_mult", value:0.12}]},
      {count:3, desc:"+8% defensa", mods:()=>[{effect:"def_add", value:0.08}]},
      {count:4, desc:"ONDA COLOSAL: el daño que mitigás o absorbés se acumula. Al llegar al 30% de tu vida, liberás una onda que daña y aturde enemigos y escuda a los aliados cercanos.", mods:()=>[]}
    ]},
  sepulturero: {
    name:"Réquiem del Sepulturero", theme:"Invocaciones · no-muertos", aura:"122,212,138", full:"sepulturero",
    lore:"Cava tumbas para enemigos y aliados por igual. A veces las llena al revés.",
    pieces:{arma:"Pala del Sepulturero", casco:"Capucha del Réquiem", pechera:"Mortaja Cosida", guantes:"Manos de Tierra"},
    thresholds:[
      {count:2, desc:"Tus invocaciones tienen +20% vida y daño", mods:()=>[]},
      {count:3, desc:"+8% daño de habilidades", mods:()=>[{effect:"skilldmg_mult", value:0.08}]},
      {count:4, desc:"CALIDAD SOBRE CANTIDAD: cada 16 s, dos esqueletos se fusionan en un Esqueleto Élite. Sin esqueletos, las bajas de élites levantan un guerrero no-muerto (máx. 2).", mods:()=>[]}
    ]},
  tempestad: {
    name:"Tempestad Eterna", theme:"Electricidad · cadena · movilidad", aura:"150,190,255", full:"tempestad",
    lore:"El trueno no pide permiso. Llega, y ya pasó.",
    pieces:{arma:"Cetro del Relámpago", casco:"Corona de Nubes", guantes:"Guantes de Descarga", botas:"Botas del Rayo"},
    thresholds:[
      {count:2, desc:"+8% velocidad de ataque y +6% velocidad de movimiento", mods:()=>[{effect:"atkspeed_mult", value:0.08},{effect:"speed_mult", value:0.06}]},
      {count:3, desc:"+10% probabilidad de descarga en cadena al golpear", mods:()=>[{effect:"onhit_proc", value:0.10}]},
      {count:4, desc:"TEMPESTAD: cada golpe carga la tormenta. Con la carga completa, tu siguiente habilidad desata una tormenta de 6 rayos encadenados.", mods:()=>[]}
    ]},
  berserker: {
    name:"Sangre del Berserker", theme:"Riesgo · recompensa", aura:"230,50,40", full:"berserker",
    lore:"Cuanto más cerca de la muerte, más claro ve el camino.",
    pieces:{arma:"Hacha Sedienta", pechera:"Piel del Berserker", guantes:"Puños de Sangre", botas:"Botas de la Carga"},
    thresholds:[
      {count:2, desc:"Hasta +18% daño según la vida que te falta", mods:()=>[{effect:"missinghp_dmg_bonus", value:0.18}]},
      {count:3, desc:"+6% robo de vida", mods:()=>[{effect:"lifesteal_add", value:0.06}]},
      {count:4, desc:"FRENESÍ: al bajar del 30% de vida entrás en estado Berserker 6 s: +25% robo de vida, +25% velocidad de ataque y +20% daño. Enfriamiento interno 40 s.", mods:()=>[]}
    ]},
  guardian: {
    name:"Juramento del Guardián", theme:"Protección cooperativa", aura:"143,208,255", full:"guardian",
    lore:"Nadie cae mientras quede uno de pie que lo haya jurado.",
    pieces:{escudo:"Égida del Juramento", casco:"Yelmo del Guardián", pechera:"Peto Juramentado", guantes:"Guanteletes de la Promesa"},
    thresholds:[
      {count:2, desc:"+10% defensa", mods:()=>[{effect:"def_add", value:0.10}]},
      {count:3, desc:"Los aliados que revivís vuelven con 60% de vida (en vez de 40%)", mods:()=>[]},
      {count:4, desc:"JURAMENTO: absorber daño cerca de aliados, escudar y revivir acumulan Juramento. Completo: protección grupal (escudo + 25% menos daño recibido) por 4 s.", mods:()=>[]}
    ]},
  alba: {
    name:"Profecía del Alba", theme:"Soporte · curación", aura:"255,230,140", full:"alba",
    lore:"Cada amanecer fue anunciado por alguien que se negó a dejar morir la noche anterior.",
    pieces:{arma:"Báculo del Alba", casco:"Aureola Profética", pechera:"Túnica del Amanecer", botas:"Sandalias de Luz"},
    thresholds:[
      {count:2, desc:"+12% curación realizada", mods:()=>[{effect:"heal_mult", value:0.12}]},
      {count:3, desc:"+10% recurso máximo y regeneración", mods:()=>[{effect:"energy_mult", value:0.10}]},
      {count:4, desc:"AMANECER: la curación EFECTIVA (no la que sobra) acumula luz. Al completarse, tu siguiente curación libera una onda de regeneración y +15% daño a los aliados cercanos.", mods:()=>[]}
    ]},
  cazador: {
    name:"Sombra del Cazador", theme:"Asesino · objetivo único", aura:"190,120,255", full:"cazador",
    lore:"No persigue a la manada. Persigue al que la guía.",
    pieces:{arma:"Colmillo de la Sombra", casco:"Máscara del Acecho", guantes:"Guantes Silenciosos", botas:"Pasos de Sombra"},
    thresholds:[
      {count:2, desc:"+10% daño contra élites, subjefes y jefes", mods:()=>[]},
      {count:3, desc:"+8% probabilidad de crítico", mods:()=>[{effect:"crit_chance_add", value:0.08}]},
      {count:4, desc:"PRESA MARCADA: golpear un élite/subjefe/jefe lo marca. Golpearlo seguido acumula Concentración (hasta 10): +3% crítico y +5% daño crítico por carga. Cambiar de objetivo la reduce a la mitad.", mods:()=>[]}
    ]},
  arcano: {
    name:"Ojo del Arcano", theme:"Mago · rotación", aura:"200,140,255", full:"arcano",
    lore:"Ve el hechizo antes de que el hechicero lo piense.",
    pieces:{arma:"Orbe del Arcano", casco:"Ojo Abierto", guantes:"Dedos del Sello", botas:"Pasos del Vacío"},
    thresholds:[
      {count:2, desc:"+8% daño de habilidades", mods:()=>[{effect:"skilldmg_mult", value:0.08}]},
      {count:3, desc:"−8% enfriamiento de habilidades", mods:()=>[{effect:"cd_mult", value:0.08}]},
      {count:4, desc:"RESONANCIA: usar habilidades DISTINTAS seguidas acumula Resonancia (repetir la misma la reinicia). Con 3, tus habilidades hacen +45% daño durante 4 s.", mods:()=>[]}
    ]},
  laberinto: {
    name:"Rey del Laberinto", theme:"Movimiento · posicionamiento", aura:"220,200,150", full:"laberinto",
    lore:"Conoce cada pasillo porque nunca se quedó quieto en ninguno.",
    pieces:{casco:"Corona del Rey Errante", pechera:"Manto de los Pasillos", guantes:"Guantes del Cartógrafo", botas:"Botas del Rey"},
    thresholds:[
      {count:2, desc:"+8% velocidad de movimiento", mods:()=>[{effect:"speed_mult", value:0.08}]},
      {count:3, desc:"+8% defensa", mods:()=>[{effect:"def_add", value:0.08}]},
      {count:4, desc:"IMPULSO: esquivar avisos de ataque y pasar tiempo sin recibir daño acumula Impulso (hasta 10): +2% velocidad y +2,5% daño por carga. Un golpe fuerte lo rompe.", mods:()=>[]}
    ]}
};
for(const id in NEW_SETS){
  SET_DB[id] = Object.assign({id, rarity:"legendario"}, NEW_SETS[id]);
  Object.keys(NEW_SETS[id].pieces).forEach(type=>{
    const key = id+"_"+type;
    DESIGNED_ITEMS[key] = {id:key, champion:null, type, rarity:"legendario", set:id,
      name:NEW_SETS[id].pieces[type], lore:NEW_SETS[id].lore, passiveNames:[]};
  });
}
// Piezas de set (ids de DESIGNED_ITEMS) por set, para el loot y la UI.
function setPieceIds(setId){ return Object.keys(SET_DB[setId].pieces).map(t=>setId+"_"+t); }
function setPieceCount(setId){ return Object.keys(SET_DB[setId].pieces).length; }
// Umbral del bonus completo (la última entrada de thresholds).
function setFullCount(setId){ const th = SET_DB[setId].thresholds; return th[th.length-1].count; }
