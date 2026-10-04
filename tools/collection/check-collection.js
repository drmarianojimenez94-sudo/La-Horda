'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const ctx = vm.createContext({
  document:{getElementById:()=>({addEventListener(){}})},
  save:{champions:{tanque:{level:10}}, cromas:{}, gold:5000},
  SET_SKINS:{}, SET_DB:{}, CHAMP_PACK:{},
  champPackLoadAtlas(){}, champPackCloneAtlas(){},
  SET_ARENA_WEIGHTS:{minas:{baluarte:4}},
  persist(){throw new Error('Presentation must not persist');}
});
const run = s=>vm.runInContext(s, ctx);
for(const file of ['js/systems/cromas.js','js/assets/croma-skins-meta.js','js/assets/set-skins-meta.js','js/assets/portadores-meta.js','js/assets/ynara-meta.js','js/assets/complete-set-skins-meta.js','js/assets/alpha-set-skins-meta.js','js/ui/codex/codex.js']){
  run(fs.readFileSync(path.join(root,file),'utf8'));
}
assert.equal(run('codexDistinctHistory("El último guardián.", "  El último   guardián. ")'), '');
assert.equal(run('codexDistinctHistory("Sinopsis", "Historia distinta")'), '<p>Historia distinta</p>');
assert.equal(run('codexDistinctHistory("Sinopsis", "Historia\\n\\nHistoria")'), '<p>Historia</p>');
assert.equal(run('codexDistinctHistory("", "<script>alert(1)</script>")'), '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
run('SET_DB.baluarte = {name:"Baluarte",champion:"tanque",theme:"Resistencia"}');
const before = run('JSON.stringify(save)');
const catalog = run('cosmeticCatalog()');
assert.ok(catalog.length >= 28);
for(const meta of catalog){
  assert.ok(meta.champion, `${meta.id}: champion missing`);
  assert.ok(meta.lore.length>20, `${meta.id}: lore missing`);
  assert.equal(meta.lorePending, false, `${meta.id}: skin lore missing`);
  assert.ok(fs.existsSync(path.join(root,meta.preview)), `${meta.id}: broken preview`);
  assert.equal(meta.premiumPrice,null);
  assert.equal(meta.currency,null);
  assert.ok(['CROMA','SKIN DE SET'].includes(meta.type));
  if(meta.id.includes('_ancestral')) assert.equal(meta.type,'CROMA');
}
assert.equal(run('JSON.stringify(save)'),before,'Viewing cosmetics must not modify stats/equipment/gold');
assert.equal(run('cosmeticMetadata("missing")'),null);
assert.equal(run('cosmeticMetadata("constructor")'),null);
assert.equal(run('cosmeticMetadata("baluarte").sourceArenas[0]'),'minas');
assert.equal(run('cosmeticMetadata("tanque_ancestral").sfxProfile'),'Original');
console.log(`PASS collection: duplicate lore, escaped prose, ${catalog.length} previews/metadata, classification and cosmetic purity`);
