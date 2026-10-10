"use strict";
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context=vm.createContext({document:{addEventListener(){},getElementById(){return null;}},window:{addEventListener(){}},console});
vm.runInContext('Math.random=()=>{throw Error("Audio consumed gameplay RNG");};',context);
vm.runInContext(fs.readFileSync('js/audio/music-score.js','utf8'),context);
vm.runInContext(fs.readFileSync('js/audio/audio.js','utf8'),context);
const result=vm.runInContext(`(()=>{
 const samples=Array.from({length:10000},()=>audioRandom());
 const buffers=[];
 audioCtx={sampleRate:8000,createBuffer:(_,n)=>{const data=new Float32Array(n);buffers.push(data);return {getChannelData:()=>data};}};
 _mkNoise();_mkIR(.4,1500,.4,1);
 return {min:Math.min(...samples),max:Math.max(...samples),unique:new Set(samples).size,
  buffers:buffers.length,finite:buffers.every(b=>b.every(Number.isFinite)),energy:buffers.every(b=>b.some(v=>v!==0))};
})()`,context);
assert(result.min>=0&&result.max<1);assert(result.unique>9900);
assert.equal(result.buffers,7);assert(result.finite&&result.energy);
assert(!/Math\.random\s*\(/.test(fs.readFileSync('js/audio/audio.js','utf8')),'all sound variation must use the private stream');
console.log('PASS audio RNG: independent stream, bounded variation, finite non-silent noise and reverb, no gameplay random consumed');

// Execute the actual arena sound registries with gameplay RNG forbidden.
// Extract only their registration statements; arena simulation initialization
// legitimately uses gameplay RNG and is outside this audio test.
const path=require('node:path');
vm.runInContext('const ARENA_SFX={};_noise=()=>{};_tone=()=>{};_duck=()=>{};',context);
function visit(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){
 const file=path.join(dir,item.name);
 if(item.isDirectory())visit(file);
 else if(file.endsWith('.js')){
  const source=fs.readFileSync(file,'utf8');
  const blocks=source.match(/Object\.assign\(ARENA_SFX,\s*\{[\s\S]*?^\}\);/gm)||[];
  for(const helper of source.match(/function _\w+\(p, gap, play\)\{ return \{p, gap, play\}; \}/g)||[])vm.runInContext(helper,context);
  for(const block of blocks)vm.runInContext(block,context,{filename:file});
 }
}}
visit('js/arenas');
const count=vm.runInContext(`Object.values(ARENA_SFX).filter(s=>typeof s.play==='function').map(s=>{s.play(0,{});return s;}).length`,context);
assert(count>100,'arena sound registrations were not loaded');
console.log('PASS '+count+' arena sound callbacks consume no gameplay RNG');
