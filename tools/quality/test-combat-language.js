'use strict';
// Lenguaje visual de combate: escudo y DoT como tipos propios de número flotante, distinguibles sin
// color (glifo/tamaño/dirección), agrupados por objetivo y sin desplazar avisos ni golpes directos.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const draws=[];
const ctx={font:'',globalAlpha:1,save(){},restore(){},strokeText(){},fillText(text,x,y){draws.push({text,x,y,fill:this.fillStyle,font:this.font});},measureText(t){return{width:String(t).length*10};}};
const c=vm.createContext({ctx,player:null,heroes:[],CAM_ZOOM:1,inView:()=>true,window:{matchMedia:()=>({matches:true})}});
for(const f of ['js/data/combat-language.js','js/rendering/effects.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../..',f),'utf8'),c);
const run=s=>vm.runInContext(s,c);
// 1) DoT: 20 ticks sobre el mismo enemigo -> UN número que conserva el total
run(`globalThis.E={x:0,y:0,radius:20};for(let i=0;i<20;i++)ftDotTick(E,5,'fire',100);`);
const dots=run(`floatTexts.filter(f=>f.on&&f.kind===6)`);
assert.equal(dots.length,1,'DoT agrupado en un solo número');
assert.equal(Math.round(dots[0].val+run('E._dotAcc')),100,'DoT conserva el total (mostrado + pendiente = 20x5)');
// 2) Escudo: glifo propio (no depende del color)
run(`for(const f of floatTexts)f.on=false;floatText(0,0,30,'shield',null,E);floatText(0,0,20,'shield',null,E);`);
const sh=run(`floatTexts.filter(f=>f.on&&f.kind===5)`);
assert.equal(sh.length,1);assert.equal(sh[0].text,'◈50','escudo agrupado con glifo ◈');
// 3) Saturación de DoT no desplaza avisos ni daño directo
run(`for(const f of floatTexts)f.on=false;floatText(5,5,'¡PELIGRO!','warn');floatText(9,9,'40','crit','fire',{});for(let i=0;i<300;i++){const e={x:i*3,y:0,radius:20};ftDotTick(e,9,'poison',700);}`);
assert.equal(run(`floatTexts.some(f=>f.on&&f.text==='¡PELIGRO!')`),true,'aviso sobrevive al spam de DoT');
assert.equal(run(`floatTexts.some(f=>f.on&&f.kind===1)`),true,'crítico sobrevive al spam de DoT');
assert(run(`floatTexts.filter(f=>f.on&&f.kind===6).length`)<=run('FT_NUM_CAP'),'DoT respeta el tope de números');
// 4) Escudo ganado por un héroe -> número automático; daño recibido cae (rise negativo)
run(`for(const f of floatTexts)f.on=false;heroes=[{x:0,y:0,alive:true,shield:0}];updateFloatTexts(16);heroes[0].shield=40;updateFloatTexts(16);`);
assert.equal(run(`floatTexts.filter(f=>f.on&&f.kind===5).length`),1,'ganar escudo muestra ◈');
// 5) Cada tipo es distinguible sin color: glifo o tamaño distinto
const st=run('FT_STYLE');assert(st[6].size<st[0].size,'DoT más chico que el daño directo');
const L=run('COMBAT_LANGUAGE');for(const k of ['damage','crit','heal','shield','dot','taken','stun','slow','buff','debuff','danger','ultimate'])assert(L[k]&&L[k].color&&L[k].shape&&L[k].motion,'señal completa: '+k);
const glyphs=['crit','heal','shield','taken'].map(k=>L[k].glyph);assert.equal(new Set(glyphs).size,glyphs.length,'glifos únicos');
console.log('PASS combat language: DoT aggregation/cap, shield glyph, priority under DoT spam, shield tracking, non-color cues');
