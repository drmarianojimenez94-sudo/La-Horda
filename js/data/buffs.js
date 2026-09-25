"use strict";
/* ============================================================
   js/data/buffs.js
   DATOS de los refuerzos que se eligen al superar un nivel de la Horda.
   ============================================================ */

const BUFF_POOL = [
  {id:"dmg", ico:"⚔", name:"Filo Ardiente", desc:"+20% daño de habilidades", apply:s=>s.dmgMult*=1.20},
  {id:"hp", ico:"♥", name:"Vitalidad de la Horda", desc:"+26% vida máxima", apply:s=>{s.hpMult*=1.26;}},
  {id:"spd", ico:"➳", name:"Paso Veloz", desc:"+16% velocidad de movimiento", apply:s=>s.speedMult*=1.16},
  {id:"cdr", ico:"◆", name:"Mente Fría", desc:"-20% enfriamiento de habilidades", apply:s=>s.cdMult*=0.80},
  {id:"life", ico:"✚", name:"Sed de Sangre", desc:"+12% robo de vida en ataque básico", apply:s=>s.lifesteal+=0.12},
  {id:"regen", ico:"✦", name:"Flujo Arcano", desc:"+55% regeneración de energía", apply:s=>s.energyRegenMult*=1.55},
  {id:"crit", ico:"✹", name:"Ojo Certero", desc:"+15% prob. de golpe crítico", apply:s=>s.critChance+=0.15},
  {id:"armor", ico:"🛡", name:"Piel de Brasa", desc:"+16% reducción de daño recibido", apply:s=>s.defBonus+=0.16},
  {id:"critdmg", ico:"💥", name:"Golpe Devastador", desc:"+35% daño de los golpes críticos", apply:s=>{ s.critMult=(s.critMult||1.8)+0.35; }},
  {id:"potion", ico:"🧪", name:"Cofre de Pociones", desc:"Los enemigos sueltan muchas más pociones de vida", apply:s=>{ s.potionRateMult=(s.potionRateMult||1)*1.7; }},
  // Segunda tanda (más variedad por partida: con 25 opciones casi nunca se repite la misma build)
  {id:"aspd", ico:"⚡", name:"Frenesí", desc:"+18% velocidad de ataque básico", apply:s=>{ s.atkSpeedMult*=1.18; }},
  {id:"execute", ico:"🗡", name:"Verdugo", desc:"+35% daño a enemigos con menos del 30% de vida", apply:s=>{ s.executeBonus+=0.35; }},
  {id:"elite", ico:"👑", name:"Cazador de Élites", desc:"+25% daño a élites, subjefes y jefes", apply:s=>{ s.eliteDmgMult*=1.25; }},
  {id:"thorns", ico:"🌵", name:"Espinas", desc:"Devuelve el 40% del daño cuerpo a cuerpo que recibís", apply:s=>{ s.thorns+=0.40; }},
  {id:"hpregen", ico:"❤", name:"Sangre Tenaz", desc:"Regenerás 1% de tu vida máxima por segundo", apply:s=>{ s.regenPct+=0.01; }},
  {id:"ultcharge", ico:"★", name:"Furia Contenida", desc:"La definitiva se carga 30% más rápido", apply:s=>{ s.ultChargeMult*=1.30; }},
  {id:"gold", ico:"🪙", name:"Botín de Guerra", desc:"+40% oro de los enemigos", apply:s=>{ s.goldMult*=1.40; }},
  {id:"xp", ico:"📜", name:"Sabiduría Antigua", desc:"+30% experiencia de los enemigos", apply:s=>{ s.xpMult*=1.30; }},
  {id:"glass", ico:"🔥", name:"Cañón de Cristal", desc:"+35% daño, pero -12% vida máxima", apply:s=>{ s.dmgMult*=1.35; s.hpMult*=0.88; }},
  {id:"bulwark", ico:"🏰", name:"Baluarte", desc:"+18% vida máxima y +8% reducción de daño", apply:s=>{ s.hpMult*=1.18; s.defBonus+=0.08; }},
  {id:"swift", ico:"🌪", name:"Danza de Guerra", desc:"+10% velocidad y +10% velocidad de ataque", apply:s=>{ s.speedMult*=1.10; s.atkSpeedMult*=1.10; }},
  {id:"focus", ico:"🎯", name:"Concentración", desc:"+8% prob. de crítico y -10% enfriamientos", apply:s=>{ s.critChance+=0.08; s.cdMult*=0.90; }},
  {id:"vamp", ico:"🦇", name:"Colmillo", desc:"+6% robo de vida y +10% daño", apply:s=>{ s.lifesteal+=0.06; s.dmgMult*=1.10; }},
  {id:"arcane", ico:"🔮", name:"Pozo Arcano", desc:"+35% regeneración de energía y la definitiva se carga 15% más rápido", apply:s=>{ s.energyRegenMult*=1.35; s.ultChargeMult*=1.15; }},
  {id:"hunter", ico:"🏹", name:"Remate Letal", desc:"+20% daño a élites/jefes y +20% a enemigos debilitados", apply:s=>{ s.eliteDmgMult*=1.20; s.executeBonus+=0.20; }}
];
