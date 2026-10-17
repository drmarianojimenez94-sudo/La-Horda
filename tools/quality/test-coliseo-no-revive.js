'use strict';
// Coliseo competitivo: ni el botón ni los bots ni los remotos pueden revivir en ninguna fase.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c=vm.createContext({console,Math});
for(const f of ['js/core/constants.js','js/systems/duo-roster.js','js/ai/allies.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f});
const core=fs.readFileSync('js/arenas/lanes/lanes-core.js','utf8');
vm.runInContext(core.slice(core.indexOf('function lanesOn()'),core.indexOf('\n',core.indexOf('function lanesOn()'))),c);
vm.runInContext(core.slice(core.indexOf('function lanesNoRevive'),core.indexOf('\n',core.indexOf('function lanesNoRevive'))),c);
vm.runInContext(`
var selectedClass='tank',CLASSES={tank:{}},save={champions:{tank:{unlocked:true}}};
var state='playing',runEnding=false,divinaMode=false,runElapsedMs=0,particles=[],LN=null;
var player={alive:true,x:0,y:0,hp:100,stats:{revives:0},_revHold:1};
var fallen={alive:false,x:10,y:0,maxHp:100,cls:{name:'Ally'}};
var heroes=[player,fallen];
const REVIVE_BTN_HOLD_MS=REVIVE_DURATION_MS;
function netIsGuest(){return false;} function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function setReviveHpPct(){return .4;} function setsOnRevive(){} function showBanner(){}
function tick(ms){runElapsedMs+=ms;updateRevives(ms);}
`,c);
const ev=s=>vm.runInContext(s,c);
for(const phase of ['prep','fight','break']){
  ev(`LN={mode:'coliseo',col:{phase:'${phase}'}};fallen.alive=false;player.alive=true;player._revHold=1;fallen._reviveT=0;fallen._reviveBy=null`);
  ev('tick(6000)');assert.equal(ev('fallen.alive'),false,'sin revivir en fase '+phase);
  ev('reviveHero(fallen,player)');assert.equal(ev('fallen.alive'),false,'reviveHero bloqueado '+phase);
}
// Fuera de Coliseo (p.ej. Cristales/campaña) el revivir de 5 s sigue funcionando.
ev("LN={mode:'convergencia'};fallen.alive=false;player._revHold=1;fallen._reviveT=0;fallen._reviveBy=null;tick(5000)");
assert.equal(ev('fallen.alive'),true);
console.log('PASS Coliseo: revivir bloqueado en prep/fight/break; otros modos intactos');
