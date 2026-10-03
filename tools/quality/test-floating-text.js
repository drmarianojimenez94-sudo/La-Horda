'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const draws=[];
const ctx={font:'',save(){},restore(){},strokeText(){},fillText(text,x,y){draws.push({text,x,y});},measureText(text){return{width:text.length*10};}};
const c=vm.createContext({ctx,player:null,CAM_ZOOM:1,inView:()=>true,window:{matchMedia:()=>({matches:true})}});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../../js/rendering/effects.js'),'utf8'),c);
const run=s=>vm.runInContext(s,c);
run(`for(let i=0;i<70;i++)floatText(100+(i%7)*8,100+Math.floor(i/7)*4,'143','crit','ice',{});floatText(100,100,'¡PELIGRO!','warn');floatText(110,100,'-90','dmg');floatText(120,100,'+40','heal');drawFloatTexts();`);
assert(draws.some(x=>x.text==='¡PELIGRO!'),'warning retains priority');
assert(draws.length<20,'crowd does not cover combat in 70 overlapping labels');
assert(run(`(()=>{for(let i=0;i<_ftRectCount;i++)for(let j=i+1;j<_ftRectCount;j++){const a=_ftRects[i],b=_ftRects[j];if(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y)return false;}return true;})()`),'rendered rectangles do not overlap');
run(`for(const f of floatTexts)f.on=false;floatText(100,100,'¡ALERTA!','warn');for(let i=0;i<200;i++)floatText(100,100,'143','crit','ice',{});`);
assert.equal(run("floatTexts.some(f=>f.on&&f.text==='¡ALERTA!')"),true,'critical spam cannot evict warnings from pool');
run(`for(const f of floatTexts)f.on=false;const target={};floatText(0,0,'20','dmg','fire',target);floatText(0,0,'30','crit','fire',target);`);
assert.equal(run('floatTexts.filter(f=>f.on).length'),1);
assert.equal(run('floatTexts.find(f=>f.on).val'),50,'aggregation conserves damage');
for(const zoom of [.5,1,2]){c.CAM_ZOOM=zoom;draws.length=0;run('drawFloatTexts()');assert.equal(draws.length,1);}
run('updateFloatTexts(2000)');draws.length=0;run('drawFloatTexts()');assert.equal(draws.length,0,'expiry clears placement occupancy');
console.log('PASS floating text: 70-enemy crowd, priority, no overlapping bounds, damage aggregation, zoom, expiry');
