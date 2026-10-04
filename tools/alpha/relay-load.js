'use strict';
// Loopback transport stress only: excludes browser rendering, Internet RTT and DB load.
const WebSocket=require('../../server/node_modules/ws'),{spawn}=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const data=fs.mkdtempSync(path.join(os.tmpdir(),'horda-load-')),port=18991;
const server=spawn(process.execPath,['server/relay.js'],{env:{...process.env,PORT:String(port),ACCOUNT_DATA_DIR:data,DATABASE_URL:''},stdio:'ignore'});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function connect(){const s=new WebSocket('ws://127.0.0.1:'+port);await new Promise((resolve,reject)=>{s.once('open',resolve);s.once('error',reject)});return s;}
function request(s,m){return new Promise((resolve,reject)=>{const t=setTimeout(()=>{s.off('message',f);reject(Error('timeout'))},5000);const f=raw=>{const j=JSON.parse(raw);if(j.t==='error'){clearTimeout(t);s.off('message',f);reject(Error(j.code));}if(j.t==='joined'){clearTimeout(t);s.off('message',f);resolve(j)}};s.on('message',f);s.send(JSON.stringify(m))})}
(async()=>{const reports=[];try{
 for(let i=0;i<50;i++){try{if((await fetch('http://127.0.0.1:'+port+'/health')).ok)break}catch{}await delay(100)}
 for(const clients of [12,40]){
  const sockets=[],hosts=[],latencies=[];let received=0,expected=0;
  try{
   for(let r=0;r<clients/4;r++){
    const host=await connect();sockets.push(host);hosts.push(host);
    const joined=await request(host,{t:'create',protocol:1,build:'audit-load',arena:'bosque',champ:'tanque',name:'Load host',clientId:'host-'+r});
    for(let n=1;n<4;n++){const s=await connect();sockets.push(s);await request(s,{t:'join',protocol:1,build:'audit-load',code:joined.room.code,champ:'mago',name:'Load guest',clientId:'guest-'+r+'-'+n});s.on('message',raw=>{const m=JSON.parse(raw);if(m.t==='msg'&&m.d?.k==='load'){received++;latencies.push(Date.now()-m.d.at)}});}
   }
   const start=Date.now();for(let tick=0;tick<200;tick++){for(const host of hosts){host.send(JSON.stringify({t:'msg',d:{k:'load',at:Date.now(),body:'x'.repeat(4096)}}));expected+=3;}await delay(50)}await delay(500);
   latencies.sort((a,b)=>a-b);const row={clients,rooms:hosts.length,rateHz:20,payloadBytes:4096,durationMs:Date.now()-start,expected,received,p95Ms:latencies[Math.floor(latencies.length*.95)],p99Ms:latencies[Math.floor(latencies.length*.99)]};reports.push(row);console.log(JSON.stringify(row));assert.equal(received,expected);
  }finally{for(const s of sockets)s.close();await delay(300)}
 }
 fs.writeFileSync('docs/public-alpha/relay-load.json',JSON.stringify({scope:'Local WebSocket relay only; not production capacity or end-to-end latency',reports},null,2));
}finally{server.kill();await delay(200);fs.rmSync(data,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1});
