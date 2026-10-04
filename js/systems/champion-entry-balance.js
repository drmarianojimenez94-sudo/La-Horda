"use strict";
// Existing champions retain their tested stats. A newly registered class receives a
// bounded starting point from the versioned role reference before saves/heroes initialize.
const CHAMPION_ENTRY_BALANCE = [];
// Category profiles (reference.profiles) are explicit and versioned: a FOUNDER is normalized and simulated
// like any newcomer, against its own bounded ceiling. Profiles never skip normalization.
function balanceProfileFor(key,reference){
 const profiles=reference.profiles||{};
 const category=typeof championMeta==="function"?championMeta(key).category:"STANDARD";
 for(const [name,p] of Object.entries(profiles))if((p.categories||[]).includes(category))return Object.assign({name},p);
 return null;
}
function balanceChampionEntry(key,c,reference,profileOverride){
 if(reference.knownChampions.includes(key))return {key,existing:true,changes:{}};
 const base=reference.roles[c.roleCategory];if(!base)return {key,error:"Unknown roleCategory: "+c.roleCategory};
 const profile=profileOverride!==undefined?profileOverride:balanceProfileFor(key,reference),k=profile?profile.statMultiplier:1;
 const scale=b=>({mean:b.mean*k,min:b.min*k,max:b.max*k});
 const R=k===1?base:Object.assign({},base,{hp:scale(base.hp),basicDPS:scale(base.basicDPS)});
 const ceiling=profile?profile.compositeCeiling:reference.compositeCeiling;
 const before={},changes={},set=(field,value)=>{before[field]=c[field];if(c[field]!==value){changes[field]={from:changes[field]?changes[field].from:c[field],to:value};c[field]=value;}};
 const clamp=(value,bounds)=>Math.max(bounds.min,Math.min(bounds.max,Number.isFinite(value)?value:bounds.mean));
 set("baseDef",Math.min(.5,clamp(c.baseDef,R.defense)));
 set("baseHP",clamp(c.baseHP,R.hp));set("baseSpeed",clamp(c.baseSpeed,R.speed));
 set("hpGrowthMult",clamp(c.hpGrowthMult,R.hpGrowth));set("dmgGrowthMult",clamp(c.dmgGrowthMult,R.damageGrowth));
 if(!Number.isFinite(c.basicCd)||c.basicCd<150)set("basicCd",560);
 const dps=clamp(c.baseDmg*1000/c.basicCd,R.basicDPS);set("baseDmg",dps*c.basicCd/1000);
 const W=reference.compositeWeights,ehp=c.baseHP/(1-c.baseDef),p=c.baseDmg*1000/c.basicCd;
 const hpPart=W.effectiveHP*ehp/base.effectiveHP.mean,damagePart=W.basicDPS*p/base.basicDPS.mean,speedPart=W.speed*c.baseSpeed/base.speed.mean;
 const budget=hpPart+damagePart+speedPart;
 if(budget>ceiling){
  const ratio=Math.max(0,(ceiling-speedPart)/(hpPart+damagePart));
  set("baseHP",c.baseHP*ratio);set("baseDmg",c.baseDmg*ratio);
 }
 // Round only after applying the budget, without raising it above its ceiling.
 set("baseHP",Math.floor(c.baseHP*100)/100);set("baseDmg",Math.floor(c.baseDmg*1000)/1000);
 const finalBudget=W.effectiveHP*(c.baseHP/(1-c.baseDef))/base.effectiveHP.mean+W.basicDPS*(c.baseDmg*1000/c.basicCd)/base.basicDPS.mean+W.speed*c.baseSpeed/base.speed.mean;
 return {key,role:c.roleCategory,referenceVersion:reference.version,profile:profile?profile.name:null,ceiling,changes,budgetBefore:budget,budgetAfter:finalBudget,needsGameplaySimulation:true};
}
for(const [key,c] of Object.entries(CLASSES))CHAMPION_ENTRY_BALANCE.push(balanceChampionEntry(key,c,CHAMPION_BALANCE_REFERENCE));
