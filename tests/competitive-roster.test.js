'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const {ROLES,NOTICE,SIGNATURES}=require('../js/modes/crystal-wars/roster.js');
const atlas=require('../js/modes/crystal-wars/atlas.js');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
// Derive expected roster from the actual source registries, including late registrations.
const context=vm.createContext({PRICING:{gold:{champion:2500}}});
vm.runInContext(read('js/data/champions.js'),context);
vm.runInContext(read('js/data/portadores.js').split('for(const k in PORTADORES)')[0],context);
for(const name of ['expedition','ascension'])vm.runInContext(read(`js/champions/${name}/catalog.js`),context);
const source=vm.runInContext('({...CLASSES,...PORTADORES,...EXPEDITION,...ASCENSION})',context);
assert.deepEqual(Object.keys(ROLES).sort(),Object.keys(source).sort(),'Every registered campaign champion has an arena profile');
assert.deepEqual(Object.keys(atlas).sort(),Object.keys(ROLES).sort(),'Every profile has its own authored art');
for(const [id,role] of Object.entries(ROLES)){
  assert.equal(role.id,id);
  assert.ok(['tanque','guerrero','mago','soporte'].includes(role.archetype),id);
  for(const key of ['hp','speed','damage','range','rate'])assert.equal(role[key],ROLES[role.archetype][key],`${id} keeps equal stats within role (${key})`);
  assert.equal(role.skills.length,4);assert.equal(role.skillDescriptions.length,4);
  assert.equal(role.adapted,true,'Campaign kit adaptation is explicit');
  assert.ok(SIGNATURES[role.signature],id+' has a bounded mechanical specialty');
  assert.ok(role.passive.name&&role.passive.desc,id+' describes its passive and tradeoff');
  if(role.signature==='renewal')assert.equal(role.archetype,'soporte');
  if(role.signature==='aftermath')assert.ok(['mago','guerrero'].includes(role.archetype));
  assert.equal(role.ownerOnly,!!source[id].founder,`${id} founder restriction`);
  const meta=atlas[id],png=fs.readFileSync(path.join(root,meta.src)),width=png.readUInt32BE(16),height=png.readUInt32BE(20);
  assert.ok(meta.src.includes('/'+id+'/'),`${id} must use its own art`);
  assert.deepEqual(meta.imageSize,[width,height]);
  assert.ok(meta.referenceHeight>0);
  for(const frame of meta.frames){assert.ok(frame.x>=0&&frame.y>=0&&frame.w>0&&frame.h>0&&frame.x+frame.w<=width&&frame.y+frame.h<=height,`${id} frame within PNG`);}
  for(const clip of Object.values(meta.animations))for(const index of clip.frames)assert.ok(meta.frames[index],`${id} clip frame ${index} exists`);
  for(const dir of ['down','up','left','right'])assert.ok(meta.animations['walk_'+dir]||meta.animations.walk,`${id} locomotion ${dir}`);
}
assert.ok(NOTICE.includes('normalizados'));
assert.equal(new Set(Object.values(ROLES).map(r=>r.signature)).size,10,'Ten distinct mechanical specialties in the active roster');
console.log(`PASS: ${Object.keys(ROLES).length} competitive champions, equal role stats, founder restrictions and all authored atlas frames.`);
