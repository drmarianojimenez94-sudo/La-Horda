"use strict";
const vm=require('vm'),fs=require('fs'),assert=require('node:assert/strict');
const listeners={},store=new Map(),sent=[];
const ctx={crypto:require('node:crypto').webcrypto,Uint8Array,console,performance:{now:()=>100},currentArena:'ciudad',runLevel:1,selectedClass:'mago',setTimeout,clearTimeout,setInterval:()=>0,Date,acct:{session:null},localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},accountAvailable:()=>false,accountFetch:async(method,path,body)=>{sent.push({method,path,body});return {status:200,j:{normalConfig:{xp:2},events:[{name:'Temp',enabled:true,start:Date.now()-100,end:Date.now()+60000,arenas:['ciudad'],wave:1,multipliers:{xp:3}}],serverTime:Date.now()}}},document:{hidden:false,getElementById:()=>null,addEventListener:(n,f)=>listeners[n]=f},window:{addEventListener:(n,f)=>listeners[n]=f},accountOpen:()=>{}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('js/net/alpha-services.js','utf8'),ctx);const services=vm.runInContext('AlphaServices',ctx);
(async()=>{
 assert.equal(services.multiplier('xp'),1);ctx.accountAvailable=()=>true;await services.refreshWorld();assert.equal(services.multiplier('xp'),6);
 ctx.currentArena='hielo';assert.equal(services.multiplier('xp'),2);ctx.currentArena='ciudad';ctx.runLevel=0;assert.equal(services.multiplier('xp'),2);ctx.runLevel=1;
 ctx.alphaTrainingActive=()=>true;assert.equal(services.multiplier('xp'),1);ctx.alphaTrainingActive=()=>false;
 services.emit('error',{email:'private@example.com',message:'secret',champion:'mago',arena:'https://private.example',durationMs:Infinity});await services.flush();let body=sent.at(-1).body;
 assert.match(body.session,/^[a-f0-9]{32}$/);assert.equal(JSON.stringify(body).includes('private'),false);assert.equal(JSON.stringify(body).includes('secret'),false);
 store.set('horda_telemetry','off');services.emit('victory');let n=sent.length;await services.flush();assert.equal(sent.length,n);
 store.set('horda_telemetry','on');for(let i=0;i<500;i++)services.emit('skill',{value:i});await services.flush();assert.equal(sent.at(-1).body.events.length,25);
 console.log('PASS Alpha services: offline defaults, scoped multipliers, training isolation, privacy, opt-out, bounded queue');
})().catch(e=>{console.error(e);process.exitCode=1;});
