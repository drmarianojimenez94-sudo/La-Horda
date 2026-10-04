'use strict';
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
let server='wss://primary.test',n=0;const timers=new Set();
const ctx={NET_CONFIG:{build:'test'},netServerUrl:()=>server,performance:{now:()=>0},AbortController,setTimeout:()=>{timers.add(++n);return n},clearTimeout:id=>timers.delete(id),setInterval:()=>0,document:{getElementById:()=>null},fetch:async()=>{throw Error('offline')}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('js/net/net-rooms.js','utf8'),ctx);
(async()=>{
 assert.equal(await vm.runInContext('netFetchRooms()',ctx),null);assert.equal(timers.size,0);assert.equal(vm.runInContext('netRooms.busy',ctx),false);
 let resolve;ctx.fetch=()=>new Promise(r=>resolve=r);const pending=vm.runInContext('netFetchRooms()',ctx);server='wss://manual.test';resolve({ok:true,status:200,json:async()=>({rooms:[{code:'OLD123'}]})});assert.equal(await pending,null);assert.equal(vm.runInContext('netRooms.list',ctx),null);assert.equal(timers.size,0);
 ctx.fetch=async()=>({ok:true,status:200,json:async()=>({rooms:[{code:'NEW123'}]})});await vm.runInContext('netFetchRooms()',ctx);assert.equal(vm.runInContext('netRooms.list[0].code',ctx),'NEW123');assert.equal(timers.size,0);
 console.log('PASS rooms: offline cleanup, stale server response rejected, new environment list');
})().catch(e=>{console.error(e);process.exitCode=1});
