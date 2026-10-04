const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const ref=JSON.parse(fs.readFileSync('docs/balance/champion-entry-reference.json','utf8'));
const context=vm.createContext({CLASSES:{}});
vm.runInContext(fs.readFileSync('js/data/champion-balance-reference.js','utf8'),context);
vm.runInContext(fs.readFileSync('js/systems/champion-entry-balance.js','utf8'),context);
assert.equal(vm.runInContext('JSON.stringify(CHAMPION_BALANCE_REFERENCE)',context),JSON.stringify(ref),'Runtime reference must match JSON');
const normalize=vm.runInContext('balanceChampionEntry',context);
for(const role of Object.keys(ref.roles)){
 const c={roleCategory:role,baseHP:100000,baseDmg:100000,baseDef:.99,baseSpeed:10000,basicCd:100,hpGrowthMult:100,dmgGrowthMult:100};
 const result=normalize('__new_'+role,c,ref);
 assert(result.budgetAfter<=ref.compositeCeiling+1e-6,role+' combined budget');assert(c.baseDef<=.5);assert(c.baseHP>0&&c.baseDmg>0);assert(result.needsGameplaySimulation);
 const old={...c},known=normalize(ref.knownChampions[0],c,ref);assert(known.existing);assert.deepEqual(c,old,'existing champion unchanged');
}
assert(normalize('__invalid',{roleCategory:'missing'},ref).error,'Unknown role must be reported');
// Founder profile: still normalized, bounded by its own explicit ceiling (never infinite, never skipped).
const fp=Object.assign({name:'founder'},ref.profiles.founder);
for(const role of Object.keys(ref.roles)){
 const c={roleCategory:role,baseHP:100000,baseDmg:100000,baseDef:.99,baseSpeed:10000,basicCd:100,hpGrowthMult:100,dmgGrowthMult:100};
 const r=normalize('__founder_'+role,c,ref,fp);
 assert.equal(r.profile,'founder');assert(r.budgetAfter<=fp.compositeCeiling+1e-6,role+' founder budget');assert(r.budgetAfter>ref.compositeCeiling,role+' founder above standard');
 assert(c.baseDef<=.5&&Number.isFinite(c.baseHP)&&Number.isFinite(c.baseDmg));
}
console.log('PASS: reference synchronization, four new-role budgets, four founder-profile budgets, known roster unchanged, invalid role reported');
