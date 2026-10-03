'use strict';
// Motor real sin canvas: prioridades, límites y limpieza entre partidas.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({inView: () => true, championSignaturesReset() {}, resetGore() {}});
// Sprite assets are not involved in pool admission/reset.
for (const key of ['NIGRO_PLAGUE_FX_IMG','NIGRO_DEMON_IMG','MUSASHI_REAL_IMG','SYLVA_REAL_IMG','NIGRO_SKEL_IMG','NIGRO_GOLEM_IMG','NEWFX_IMG']) context[key] = {};
for (const name of ['fx-contrast', 'vfx']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../../js/rendering', name + '.js'), 'utf8'), context);
}
context.VFX_PAL = {spark:['#fff','#fff','#fff','255,255,255']};
const run = code => vm.runInContext(code, context);
run(`vfxBurst(0,0,10000,'spark',100,100,2,0);`);
assert.equal(run('vCount < VFX_MAX'), true, 'secondary particles leave reserved critical budget');
run(`vfxBurst(0,0,10000,'spark',100,100,2,2);`);
assert.equal(run('vCount'), 720, 'critical particles use reserved pool without growth');
run(`vfxUpdateParticles(1000);`);
assert.equal(run('vCount'), 0, 'all particles expire');
run(`for(let i=0;i<FX_CAST_MAX;i++)vfxCastFlash(i,0,'1,2,3',false,0);
fxCasts[4].t=200;vfxCastFlash(99,0,'4,5,6',true,10);`);
assert.equal(run('fxCasts.length'), 10);
assert.equal(run('fxCasts[4].ult && fxCasts[4].x===99'), true, 'ultimate replaces oldest regular flash');
run(`for(let i=0;i<10000;i++)vfxCastFlash(i,0,'4,5,6',true,10);`);
assert.equal(run('fxCasts.length'), 10, 'heavy spam does not allocate extra slots');
assert.equal(run('fxCasts.some(f=>f.x===9999)'), true, 'latest ultimate remains readable at saturation');
run(`vfxCastFlash(-1,0,'1,2,3',false,0);`);
assert.equal(run('fxCasts.some(f=>f.x===-1)'), false, 'normal cast cannot replace an ultimate');
run(`vfxHitFlash(1,2,'4,5,6',4);FX_GLOW.on=true;vfxResetRun();`);
assert.equal(run('fxCasts.every(f=>!f.on)&&fxFlashes.every(f=>!f.on)&&!FX_GLOW.on'), true, 'run reset clears old-arena feedback');
run(`vfxCastFlash(1,2,'4,5,6',true,10);fxContrastUpdate(1000);`);
assert.equal(run('fxCasts.every(f=>!f.on)'), true, 'cast flash expires');
console.log('PASS VFX pools: priority, 10000-cast bound, reset, expiration');
