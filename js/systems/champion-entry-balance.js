"use strict";
// Existing champions retain their tested stats. A newly registered class receives a
// bounded starting point from the versioned role reference before saves/heroes initialize.
const CHAMPION_ENTRY_BALANCE = [];
function balanceChampionEntry(key,c,reference){
 if(reference.knownChampions.includes(key))return {key,existing:true,changes:{}};
 const R=reference.roles[c.roleCategory];if(!R)return {key,error:"Unknown roleCategory: "+c.roleCategory};
 const before={},changes={},set=(field,value)=>{before[field]=c[field];if(c[field]!==value){changes[field]={from:changes[field]?changes[field].from:c[field],to:value};c[field]=value;}};
 const clamp=(value,bounds)=>Math.max(bounds.min,Math.min(bounds.max,Number.isFinite(value)?value:bounds.mean));
 set("baseDef",Math.min(.5,clamp(c.baseDef,R.defense)));
 set("baseHP",clamp(c.baseHP,R.hp));set("baseSpeed",clamp(c.baseSpeed,R.speed));
 set("hpGrowthMult",clamp(c.hpGrowthMult,R.hpGrowth));set("dmgGrowthMult",clamp(c.dmgGrowthMult,R.damageGrowth));
 if(!Number.isFinite(c.basicCd)||c.basicCd<150)set("basicCd",560);
 const dps=clamp(c.baseDmg*1000/c.basicCd,R.basicDPS);set("baseDmg",dps*c.basicCd/1000);
 const W=reference.compositeWeights,ehp=c.baseHP/(1-c.baseDef),p=c.baseDmg*1000/c.basicCd;
 const hpPart=W.effectiveHP*ehp/R.effectiveHP.mean,damagePart=W.basicDPS*p/R.basicDPS.mean,speedPart=W.speed*c.baseSpeed/R.speed.mean;
 const budget=hpPart+damagePart+speedPart;
 if(budget>reference.compositeCeiling){
  const ratio=Math.max(0,(reference.compositeCeiling-speedPart)/(hpPart+damagePart));
  set("baseHP",c.baseHP*ratio);set("baseDmg",c.baseDmg*ratio);
 }
 // Round only after applying the budget, without raising it above its ceiling.
 set("baseHP",Math.floor(c.baseHP*100)/100);set("baseDmg",Math.floor(c.baseDmg*1000)/1000);
 const finalBudget=W.effectiveHP*(c.baseHP/(1-c.baseDef))/R.effectiveHP.mean+W.basicDPS*(c.baseDmg*1000/c.basicCd)/R.basicDPS.mean+W.speed*c.baseSpeed/R.speed.mean;
 return {key,role:c.roleCategory,referenceVersion:reference.version,changes,budgetBefore:budget,budgetAfter:finalBudget,needsGameplaySimulation:true};
}
for(const [key,c] of Object.entries(CLASSES))CHAMPION_ENTRY_BALANCE.push(balanceChampionEntry(key,c,CHAMPION_BALANCE_REFERENCE));
