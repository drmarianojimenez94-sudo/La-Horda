'use strict';
// Founder presence: verified identity, grant-only champion gating, lobby grouping and anti-spam.
const assert=require('assert/strict');
const {create}=require('./presence');
(async()=>{
 const sent=[],timers=[];let checks=0;
 const ids={nano:{name:'NanoGM',founder:{key:'nano',champion:'nano_gm'},grantOnly:['nano_gm']},facu:{name:'Facu',founder:{key:'facu',champion:'facu_gm'},grantOnly:['facu_gm']},plain:{name:'Ana',founder:null,grantOnly:[]}};
 const p=create({resolve:async t=>ids[t]||null,requiresGrant:c=>['nano_gm','facu_gm','aurelia'].includes(c),broadcast:(room,obj)=>sent.push(obj),setTimer:fn=>{timers.push(fn);return 1;}});
 const ws=k=>({});const flush=()=>{while(timers.length)timers.shift()();};
 const a=ws(),b=ws(),c=ws(),forged=ws();
 await p.identify(a,'nano');await p.identify(b,'facu');await p.identify(c,'plain');await p.identify(forged,'bogus');
 assert.equal(p.memberFounder(a),'nano');assert.equal(p.memberFounder(c),null);assert.equal(p.memberFounder(forged),null);
 // A client that names itself "NanoGM" or sends nano_gm without the entitlement gets nothing.
 assert.equal(p.champAllowed(a,'nano_gm'),true);assert.equal(p.champAllowed(b,'nano_gm'),false);assert.equal(p.champAllowed(c,'nano_gm'),false);assert.equal(p.champAllowed(forged,'facu_gm'),false);
 assert.equal(p.champAllowed(c,'tanque'),true);assert.equal(p.champAllowed(c,'aurelia'),false);checks+=9;
 // Both founders arrive together -> ONE grouped lobby banner.
 const room={slots:[{ws:a,name:'NanoGM',founder:'nano'},{ws:b,name:'Facu',founder:'facu'},{ws:c,name:'Ana',founder:null},null]};
 p.joined(room,room.slots[0]);p.joined(room,room.slots[1]);p.joined(room,room.slots[2]);flush();
 assert.equal(sent.length,1);assert.equal(sent[0].scope,'lobby');assert.deepEqual(sent[0].founders.map(f=>f.key),['nano','facu']);checks+=3;
 // Rejoin / refresh / reconnect in the same room never repeats it.
 p.joined(room,room.slots[0]);p.joined(room,room.slots[1]);flush();assert.equal(sent.length,1);checks++;
 // Separate arrival in another room -> its own single banner.
 const room2={slots:[{ws:a,name:'NanoGM',founder:'nano'},null,null,null]};p.joined(room2,room2.slots[0]);flush();
 room2.slots[1]={ws:b,name:'Facu',founder:'facu'};p.joined(room2,room2.slots[1]);flush();
 assert.equal(sent.length,3);assert.deepEqual(sent[2].founders.map(f=>f.key),['facu']);checks+=2;
 // Arena: one grouped event per match start, only connected founders, public fields only.
 room.slots[1].ws=null;p.started(room);assert.equal(sent.length,4);assert.deepEqual(sent[3],{t:'presence',scope:'arena',founders:[{key:'nano',name:'NanoGM'}]});checks+=2;
 p.started({slots:[{ws:c,name:'Ana',founder:null}]});assert.equal(sent.length,4);checks++;
 console.log('PASS founder presence: '+checks+' checks');
})().catch(e=>{console.error(e);process.exitCode=1;});
