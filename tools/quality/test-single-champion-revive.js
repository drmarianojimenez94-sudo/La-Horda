'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c=vm.createContext({console,Math});
for(const f of ['js/core/constants.js','js/systems/duo-roster.js','js/ai/allies.js']) vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f});
vm.runInContext(`
var selectedClass='tank',CLASSES={tank:{}},save={champions:{tank:{unlocked:true}},duoReserve:'obsolete'};
var state='playing',runEnding=false,divinaMode=false,runElapsedMs=0,particles=[];
var player={alive:true,x:0,y:0,hp:100,stats:{revives:0},_revHold:1};
var fallen={alive:false,x:10,y:0,maxHp:100,cls:{name:'Ally'}};
var heroes=[player,fallen];
const REVIVE_BTN_HOLD_MS=REVIVE_DURATION_MS;
function netIsGuest(){return false;}
function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function setReviveHpPct(){return .4;}
function setsOnRevive(){}
function showBanner(){}
function tick(ms){runElapsedMs+=ms;updateRevives(ms);}
`,c);
const ev=s=>vm.runInContext(s,c);
assert.equal(ev('duoValid()'),true);assert.equal(ev('duoKeys().length'),1);assert.equal(ev('duoPending({_duoReserve:"tank"})'),false);
ev('tick(2500); player.hp-=20; player.stunTimer=1000; tick(2499)');
assert.equal(ev('fallen.alive'),false);assert.equal(ev('fallen._reviveT'),4999);
ev('tick(1)');assert.equal(ev('fallen.alive'),true);assert.equal(ev('player.stats.revives'),1);
for(const cancel of ['player.alive=false','player.x=500','runEnding=true','player._revHold=-1;cancelRevivesBy(player)']){
 ev('player.alive=true;player.x=0;runEnding=false;fallen.alive=false;player._revHold=1;tick(1000)');ev(cancel);ev('tick(1)');assert.equal(ev('fallen._reviveT'),0,cancel);
}
// Remote players use the same host-authoritative duration and survive hit stun.
ev('player.alive=true;player.x=0;runEnding=false;player.isRemote=true;player._revHold=1;tick(4999)');assert.equal(ev('fallen.alive'),false);ev('tick(1)');assert.equal(ev('fallen.alive'),true);
// Network team defeat must allow a living bot to rescue downed humans.
const source=fs.readFileSync('js/net/net-game.js','utf8');vm.runInContext(source.slice(source.indexOf('function netTeamWiped()'),source.indexOf('function netHostCheckDefeat()')),c);
ev('heroes=[{alive:false},{alive:true,isBot:true}]');assert.equal(ev('netTeamWiped()'),false);ev('heroes[1].alive=false');assert.equal(ev('netTeamWiped()'),true);
console.log('PASS single champion, stale reserve ignored, 5000 ms local/remote revival, damage + stun, cancellation and bot rescue defeat policy');
