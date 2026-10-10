'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../js/modes/crystal-wars/simulation');
// Control uses identical production simulation and profiles, removing only signatures.
// Ratios remain meaningful when shared PvP damage/healing/shield coefficients are tuned.
const controlRoles=Object.fromEntries(Object.entries(C.ROLES).map(([id,c])=>[id,{...c,signature:null}]));
const control=vm.createContext({CW_ROSTER:{ROLES:controlRoles}});
vm.runInContext(fs.readFileSync(require.resolve('../js/modes/crystal-wars/simulation'),'utf8'),control);
const B=control.CrystalWars;
function near(actual,expected,label){assert.ok(Math.abs(actual-expected)<.00001,`${label}: ${actual} != ${expected}`);}
function duel(id,distance=40,engine=C){
 const s=engine.create([{connected:true,champ:id},{connected:true,champ:'tanque'},{connected:true,champ:'tanque'},{connected:true,champ:'tanque'}],1,{mode:'coliseum',monsters:false});
 s.obstacles=[];s.heroes.forEach(h=>{h.x=800;h.y=580;h.basic=99;});
 const h=s.heroes[0],t=s.heroes[2];h.x=200;h.y=300;h.basic=0;t.x=200+distance;t.y=300;t.maxHp=10000;t.hp=10000;
 return{s,h,t,c:engine.ROLES[id],engine};
}
function shot(v,input={}){v.h.basic=0;const before=v.t.hp;v.engine.step(v.s,.01,{0:input});return before-v.t.hp;}
function basicBaseline(id,distance=40,input={}){return shot(duel(id,distance,B),input);}
function cast(v,index){v.engine.ability(v.s,0,index);}
let checks=0;function test(name,f){f();checks++;console.log('PASS',name);}
test('Execution sacrifices healthy-target damage for a wounded-target bonus',()=>{
 let v=duel('guerrero'),base=basicBaseline('guerrero');near(shot(v),base*.92,'healthy');v.t.hp=1000;near(shot(v),base*1.18,'wounded');
});
test('Focus rewards distance and penalizes close range',()=>{
 let v=duel('sira',200);near(shot(v),basicBaseline('sira',200)*1.12,'far');v=duel('sira',40);near(shot(v),basicBaseline('sira',40)*.88,'near');
});
test('Tempo has three-shot parity with a larger third strike',()=>{
 let v=duel('profeta'),base=basicBaseline('profeta');const a=shot(v),b=shot(v),c=shot(v);near(a,base*.85,'first');near(b,a,'second');near(c,base*1.3,'third');near(a+b+c,base*3,'cycle parity');
});
test('Momentum exchanges stationary damage for movement damage',()=>{
 let v=duel('cazadora');near(shot(v),basicBaseline('cazadora')*.9,'stationary');near(shot(v,{y:1}),basicBaseline('cazadora',40,{y:1})*1.1,'moving');
});
test('Siphon healing uses effective damage and reduced attack',()=>{
 let v=duel('segador');v.h.hp-=30;const hp=v.h.hp,d=shot(v);near(d,basicBaseline('segador')*.9,'reduced damage');near(v.h.hp-hp,d*.08,'healing');v=duel('segador');v.h.hp-=30;v.t.hp=1;const hp2=v.h.hp;shot(v);near(v.h.hp-hp2,.08,'no overkill healing');
});
test('Frost trades damage for bounded slowing',()=>{
 let v=duel('myla');near(shot(v),basicBaseline('myla')*.9,'reduced damage');near(v.t.slowFactor,.7,'slow factor');near(v.t.slowUntil-v.s.time,.45,'slow duration');
});
test('Renewal boosts actual team healing but reduces basic damage',()=>{
 let v=duel('soporte'),base=duel('soporte',40,B);v.h.hp-=100;base.h.hp-=100;const hp=v.h.hp,bhp=base.h.hp;cast(v,0);cast(base,0);near(v.h.hp-hp,(base.h.hp-bhp)*1.2,'heal');near(shot(v),basicBaseline('soporte')*.88,'basic tradeoff');
});
test('Aftermath concentrates zone damage into a shorter duration',()=>{
 let v=duel('mago'),base=duel('mago',40,B);cast(v,2);cast(base,2);const z=v.s.effects.find(e=>e.kind==='zone'),b=base.s.effects.find(e=>e.kind==='zone');near(z.until-v.s.time,(b.until-base.s.time)*.8,'duration');near(z.damage,b.damage*1.25,'tick damage');
});
test('Surge adds damage and increases ultimate cooldown',()=>{
 let v=duel('renko'),base=duel('renko',40,B);const hp=v.t.hp,bhp=base.t.hp;cast(v,3);cast(base,3);near(hp-v.t.hp,(bhp-base.t.hp)*1.15,'ultimate damage');near(v.h.cd[3]-base.h.cd[3],5,'cooldown penalty');
});
test('Bulwark improves newly created shields without amplifying existing shields on attack',()=>{
 let v=duel('tanque'),base=duel('tanque',40,B);cast(v,2);cast(base,2);near(v.h.shield,base.h.shield*1.15,'shield');cast(v,0);near(v.h.shield,base.h.shield*1.15,'no repeated amplification');const x=v.h.x,bx=base.h.x;C.step(v.s,.1,{0:{x:1}});B.step(base.s,.1,{0:{x:1}});near(v.h.x-x,(base.h.x-bx)*.92,'movement penalty');
});
console.log(`${checks} specialty behavior/tradeoff tests passed against signature-free controls`);
