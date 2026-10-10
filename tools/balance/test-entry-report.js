'use strict';
// Reporting regression only: a launch failure must invalidate a previous PASS.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
(async()=>{
 for(const flag of [null,'--workshop-quality','--workshop-solciju','--self-test']){
  let output=JSON.stringify({status:'PASS',entries:['stale'],runs:['stale'],errors:[]});
  const processStub={env:{ENTRY_BASE_URL:'http://not-used'},argv:['node','entry-gate.js',...(flag?[flag]:[])],exitCode:0};
  vm.runInNewContext(fs.readFileSync('tools/balance/entry-gate.js','utf8'),{
   process:processStub,console:{log(){},error(){}},
   require(name){
    if(name==='fs')return {mkdirSync(){},writeFileSync(_,s){output=s;},readFileSync(){return output;}};
    if(name==='path')return require('node:path');
    if(name==='child_process')return {spawn(){throw Error('unexpected server');}};
    if(name==='playwright')return {chromium:{executablePath:()=>'',launch:async()=>{throw Error('controlled browser failure');}}};
    throw Error('unexpected dependency '+name);
   }
  });
  await new Promise(r=>setImmediate(r));
  const report=JSON.parse(output);assert.equal(processStub.exitCode,1);assert.equal(report.status,'FAIL');
  assert.deepEqual(report.runs,[]);assert.deepEqual(report.entries,[]);assert(report.errors.some(e=>e.includes('controlled browser failure')));
 }
 console.log('PASS entry reports: launch failures invalidate stale approval in all four modes');
})().catch(e=>{console.error(e);process.exitCode=1;});
