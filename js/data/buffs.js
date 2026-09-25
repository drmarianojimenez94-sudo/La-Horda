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
  {id:"potion", ico:"🧪", name:"Cofre de Pociones", desc:"Los enemigos sueltan muchas más pociones de vida", apply:s=>{ s.potionRateMult=(s.potionRateMult||1)*1.7; }}
];
