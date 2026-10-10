'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function fixture(){
 const h={x:0,y:0,fx:1,fy:0,alive:true},ally={x:5,y:0,alive:true},rival={x:0,y:80,alive:true};
 const c=vm.createContext({divinaMode:false,enemies:[],heroes:[h,ally],divinaEnemies:[rival],divinaMinions:[],divinaStructures:[]});
 // Load the actual hostile-side selector as well as the complete aiming implementation.
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../../js/champions/portadores.js'),'utf8').match(/function portadorEnemies\(h\)\{[\s\S]*?\n\}/)[0],c);
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../../js/skills/aim-targeting.js'),'utf8'),c);
 return {c,h,ally,rival};
}
test('both Crystal Wars sides select enemies, never their allies',()=>{
 const {c,h,ally,rival}=fixture();c.divinaMode=true;
 assert.equal(c.aimTarget(h,200),rival);assert.equal(c.aimTarget(rival,200),h);
 assert.deepEqual({...c.bestClusterPoint(h,200,90)},{x:0,y:80});
 assert.deepEqual({...c.aimDir(h,200)},{x:0,y:1});
 assert.notEqual(c.aimTarget(h,200),ally);
});
test('hostile minions and structures count; friendly structures never do',()=>{
 const {c,h}=fixture();c.divinaMode=true;c.divinaEnemies=[];
 const enemy={x:0,y:70,alive:true,side:'enemy'},friendly={x:1,y:0,alive:true,side:'player'};
 c.divinaStructures=[friendly,enemy];assert.equal(c.aimTarget(h,200),enemy);
 c.divinaStructures=[friendly];c.divinaMinions=[enemy];assert.equal(c.aimTarget(h,200),enemy);
});
test('PvE excludes dead, cinematic, duel-locked and out-of-range enemies',()=>{
 const {c,h}=fixture(),valid={x:80,y:0,alive:true};
 c.enemies=[{x:1,y:0,alive:false},{x:2,y:0,alive:true,cineT:10},{x:3,y:0,alive:true,isDuelLocked:true,duelOwner:{}},valid,{x:800,y:0,alive:true}];
 assert.equal(c.aimTarget(h,100),valid);assert.deepEqual({...c.bestClusterPoint(h,100,20)},{x:80,y:0});assert.equal(c.aimTarget(h,50),null);
});
test('manual direction and point remain authoritative and range-bounded',()=>{
 const {c,h}=fixture();c.divinaMode=true;h.aim={dx:-1,dy:0,x:-900,y:0};
 assert.deepEqual({...c.aimDir(h,200)},{x:-1,y:0});
 assert.deepEqual({...c.aimPoint(h,200,40)},{x:-200,y:0});
});
