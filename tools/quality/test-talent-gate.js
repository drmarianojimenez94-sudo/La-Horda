'use strict';
// Executes production save/talent functions, including loadSave and cloud application.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function harness(){
 const data=new Map(), timers=[];
 const storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};
 const c=vm.createContext({console,URL,URLSearchParams,AbortController,CustomEvent:function(){},
  location:new URL('https://fondalstudios.com/la-horda/jugar/'),navigator:{},performance:{now:()=>0},
  localStorage:storage,sessionStorage:storage,setTimeout:fn=>(timers.push(fn),timers.length),clearTimeout(){},setInterval:()=>0,clearInterval(){},
  window:{addEventListener(){},dispatchEvent(){}},document:{addEventListener(){},getElementById:()=>null,querySelector:()=>null}});
 const run=s=>vm.runInContext(s,c);
 run('const CHAMPION_CATALOG=[{id:"axiom",unlockedByDefault:false}]; const CLASSES={axiom:{}}; const EQUIP_SLOT_TYPES=[]; function equippedItem(){return null;}');
 for(const f of ['js/data/talent-trees.js','js/storage/save.js','js/systems/talents.js','js/net/net-config.js','js/net/net-core.js','js/net/account.js'])run(fs.readFileSync(f,'utf8'));
 return {data,run};
}
const h=harness(),r=h.run;
r('loadSave()');
assert.equal(r('save.talentGate40V1'),true,'fresh saves must never migrate later');
for(const [level,points] of [[1,0],[39,0],[40,1],[60,11],[90,26],[99,30],[120,30]]){
 assert.equal(r(`treePointsEarned(${level})`),points);
 r(`save.champions.axiom.level=${level}`);
 assert.equal(r('buyTalentNode("axiom","ax_sis_c1",true).ok'),level>=40);
 r('save.champions.axiom.talents=mkTalentState()');
}
// One snapshot predates test-reset flags; migration must preserve actual progress and wallet.
r(`save.champions.axiom.level=99;save.champions.axiom.unlocked=true;save.gold=1234;save.gems=22;
 save.champions.axiom.talentPoints=7;save.champions.axiom.treeBonus=91;
 save.champions.axiom.talents={nodes:{ax_sis_c1:3,retired_node:2},picks:{old:'choice'},mastery:'sistema',masteryNodes:{ax_m_sis_1:1}};
 delete save.talentGate40V1;delete save.campaignResetV3;delete save.testStageV1;
 localStorage.setItem(SAVE_KEY,JSON.stringify(save));loadSave();`);
assert.equal(r('saveLoadFailed'),false);
assert.equal(r('save.gold'),1234);assert.equal(r('save.gems'),22);
assert.equal(r('save.champions.axiom.level'),99);assert.equal(r('save.champions.axiom.unlocked'),true);
assert.equal(r('save.champions.axiom.talentPoints'),7);
assert.equal(r('save.champions.axiom.treeBonus'),0);
assert.equal(r('JSON.stringify(save.champions.axiom.talents.nodes)'),'{}');
assert.equal(r('save.champions.axiom.talents.mastery'),'sistema');
assert.equal(r('save.champions.axiom.talents.masteryNodes.ax_m_sis_1'),1);
assert.equal(r('save.champions.axiom.talentGate40Legacy.nodes.retired_node'),2);
assert.equal(r('treePointsAvailable("axiom")'),26);
const backup=r('JSON.stringify(save.champions.axiom.talentGate40Legacy)');
r('buyTalentNode("axiom","ax_sis_c1",true);persistNow();loadSave();talentGate40Migrate()');
assert.equal(r('save.champions.axiom.talents.nodes.ax_sis_c1'),1,'reload/idempotence preserves new purchases');
assert.equal(r('JSON.stringify(save.champions.axiom.talentGate40Legacy)'),backup);
// Cache must change across both level gates without touching loadout.
for(const level of [99,89,39,40,90]){
 r(`save.champions.axiom.level=${level}`);
 assert.equal(r('talentSkillMods("axiom",0).areaMult'),level>=90?0.2:0);
 assert.equal(r('talentSkillMods("axiom",0).powerMult'),level>=40?0.05:0);
}
r('save.champions.axiom.level=99');
assert.equal(r('talentRespec("axiom",false).refund'),1);
assert.equal(r('talentRespec("axiom",true).lost'),0);
assert.equal(r('save.champions.axiom.talents.masteryNodes.ax_m_sis_1'),1,'irreversible nodes survive respec');
assert.equal(r('talentRespec("axiom",true).ok'),false,'mastery-only loadout cannot pay for empty respec');
assert.equal(r('pickMastery("axiom","limites",true).ok'),false);
// Cloud snapshot uses the same migration and retains an exact pre-cloud backup.
r(`const priorCloudRaw=localStorage.getItem(SAVE_KEY);const cloudData=JSON.parse(priorCloudRaw);
 delete cloudData.talentGate40V1;cloudData.champions.axiom.talents.nodes={ax_sis_c1:3};
 accountApplyCloud({data:cloudData,version:12,updatedAt:1000});`);
assert.equal(r('acct.sync.dirty'),true,'migrated cloud is queued for upload');
assert.equal(r('acct.sync.version'),12);
assert.equal(r('localStorage.getItem(SAVE_KEY+"_antesDeNube")===priorCloudRaw'),true);
assert.equal(r('save.champions.axiom.talents.masteryNodes.ax_m_sis_1'),1);
assert.equal(r('save.gold'),1234);
console.log('PASS Talent Gate: levels 1/39/40/60/90/99, fresh/legacy saves, no historical resets, idempotence, cache gates, irreversible mastery, cloud backup and upload');
