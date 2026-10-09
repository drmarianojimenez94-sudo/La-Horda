'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '../..');
const GATES = {
  reference: ['node', 'tools/balance/check-entry-reference.js'],
  talents: ['node', 'tools/quality/test-talent-gate.js'],
  abilities: ['node', 'tools/bible/ability-gate.js', '--strict'],
  resources: ['node', 'tools/quality/test-ability-resources.js'],
  passives: ['node', 'tools/quality/test-classic-passives.js'],
  balance: ['node', 'tools/balance/entry-gate.js'],
  visuals: ['node', 'tools/art/roster_visual_test.js'],
  style: ['python3', 'tools/art/painter/style_gate.py', '--strict'],
  audio: ['node', 'tools/audio/t_audio_mix.js'],
  multiplayer: ['node', 'tools/net-test/lobby_code_skins.js'],
  performance: ['node', 'tools/audit/fps.js']
};
function safeFile(file, root = ROOT) {
  if (typeof file !== 'string' || !file || path.isAbsolute(file)) return null;
  const resolved = path.resolve(root, file);
  if (!resolved.startsWith(path.resolve(root) + path.sep) || !fs.existsSync(resolved)) return null;
  const real = fs.realpathSync(resolved);
  return real.startsWith(fs.realpathSync(root) + path.sep) && fs.statSync(real).isFile() ? real : null;
}
// Categories come from js/data/champion-taxonomy.js (same file the game and server use).
let TAXONOMY;
function taxonomy(root = ROOT) {
  if (TAXONOMY) return TAXONOMY;
  const vm = require('node:vm'), c = {}; vm.createContext(c);
  vm.runInContext(fs.readFileSync(path.join(root, 'js/data/champion-taxonomy.js'), 'utf8'), c, {timeout:1000});
  return (TAXONOMY = {categories:c.CHAMPION_CATEGORIES, entries:c.CHAMPION_TAXONOMY, meta:id => c.championMeta(id)});
}
// Admission ceilings by category. FOUNDER ultimates are deliberately bigger but still bounded.
const BUDGETS = {STANDARD:{particles:64, summons:8, audioVoices:4}, FAMILY:{particles:64, summons:8, audioVoices:4}, FOUNDER:{particles:96, summons:8, audioVoices:5}};
function validate(m, root = ROOT) {
  const errors = [], check = (condition, message) => { if (!condition) errors.push(message); };
  const text = value => typeof value === 'string' && value.trim().length > 0 && !/^TODO|^PENDING/.test(value);
  if (!m || typeof m !== 'object' || Array.isArray(m)) return ['manifest must be an object'];
  check(m.schemaVersion === 1, 'schemaVersion must be 1');
  check(/^[a-z][a-z0-9_]*$/.test(m.id || ''), 'id must be a stable lowercase identifier');
  const T = taxonomy(), category = m.category || 'STANDARD', founder = category === 'FOUNDER';
  check(Object.hasOwn(T.categories, category), `category must be one of ${Object.keys(T.categories).join(', ')}`);
  if (Object.hasOwn(T.entries, m.id || '')) check(T.meta(m.id).category === category, 'manifest category must match js/data/champion-taxonomy.js');
  if (founder) {
    check(text(m.founderKey) && T.meta(m.id).founderKey === m.founderKey, 'FOUNDER requires founderKey bound in champion-taxonomy.js');
    check(m.balanceProfile === 'founder', 'FOUNDER must declare balanceProfile "founder" (explicit reference profile, never skipped)');
    check(m.purchasable !== true && m.transferable !== true, 'FOUNDER can never be purchasable or transferable');
  }
  for (const key of ['name', 'title', 'role', 'fantasy', 'lore', 'personality', 'silhouette']) check(text(m[key]), `${key} required`);
  const kit = m.kit || {}, skills = Array.isArray(kit.skills) ? kit.skills : [];
  check(skills.length === 3, 'kit requires three skills');
  const abilities = [kit.basic, ...skills, kit.ultimate];
  const ids = new Set();
  for (const [i, ability] of abilities.entries()) {
    const a = ability || {};
    for (const key of ['id', 'description', 'anticipation', 'execution', 'impact', 'feedback', 'vfx', 'sfx']) check(text(a[key]), `ability ${i}: ${key} required`);
    check(!ids.has(a.id), `duplicate ability id ${a.id}`); ids.add(a.id);
    check(Number.isFinite(a.cooldownMs) && a.cooldownMs >= 0, `ability ${i}: finite cooldown required`);
    check(Number.isFinite(a.maxTargets) && a.maxTargets >= 1, `ability ${i}: bounded maxTargets required`);
  }
  check(abilities.some(a => a && a.maxTargets > 1 && text(a.hordeMechanism)), 'at least one documented multi-target horde tool required');
  const stats = m.stats || {};
  for (const key of ['hp', 'damage', 'speed']) check(Number.isFinite(stats[key]) && stats[key] > 0, `positive stats.${key} required`);
  const files = m.integration || {};
  for (const key of ['runtime', 'codex', 'talents', 'mastery', 'set', 'kitTest']) check(!!safeFile(files[key], root), `integration.${key} must reference a real repository file`);
  const art = m.art || {}, atlas = safeFile(art.atlas, root), preview = safeFile(art.preview, root);
  check(!!atlas && !!preview, 'atlas and preview must exist');
  check(art.directions === 4, 'four readable directions required');
  check(Number.isInteger(art.frameWidth) && art.frameWidth > 0 && Number.isInteger(art.frameHeight) && art.frameHeight > 0, 'positive integer frame dimensions required');
  if (atlas) {
    const data = fs.readFileSync(atlas);
    const png = data.length >= 24 && data.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    check(png, 'atlas must be PNG');
    if (png) {
      const width = data.readUInt32BE(16), height = data.readUInt32BE(20);
      check(width > 0 && height > 0 && width % art.frameWidth === 0 && height % art.frameHeight === 0, 'atlas dimensions must align to frame grid');
      check(Object.values(art.animations || {}).reduce((sum, count) => sum + count, 0) <= (width / art.frameWidth) * (height / art.frameHeight), 'declared animation frames exceed atlas capacity');
    }
    check(art.sha256 === crypto.createHash('sha256').update(data).digest('hex'), 'atlas hash must match reviewed content');
  }
  for (const anim of ['idle', 'walk', 'attack', 'cast', 'hit', 'death', 'ultimate']) check(Number.isInteger(art.animations?.[anim]) && art.animations[anim] > 0, `art.animations.${anim} frame count required`);
  check(art.review?.status === 'PASS' && text(art.review?.reviewer) && !!safeFile(art.review?.evidence, root), 'visual review requires reviewer and evidence; structural checks cannot approve style');
  const cosmetics = Array.isArray(m.cosmetics) ? m.cosmetics : [], cosmeticIds = new Set();
  for (const c of cosmetics) {
    check(text(c.id) && !cosmeticIds.has(c.id), 'unique cosmetic id required'); cosmeticIds.add(c.id);
    for (const key of ['name', 'rarity', 'tagline', 'lore', 'visualTheme', 'unlockSource', 'collection', 'vfxProfile']) check(text(c[key]), `${c.id}: ${key} required`);
    check(c.champion === m.id, `${c.id}: champion mismatch`);
    check(c.lore !== m.lore, `${c.id}: cosmetic lore must differ from champion lore`);
    check(['croma', 'skin', 'epic', 'legendary', 'set'].includes(c.type), `${c.id}: invalid type`);
    check(!['gameplayOverrides', 'stats', 'modifiers', 'mods', 'baseHP', 'baseDmg', 'baseDef', 'baseSpeed', 'damage', 'cooldown', 'hitbox'].some(key => Object.hasOwn(c, key)), `${c.id}: cosmetics cannot modify gameplay`);
    check(Array.isArray(c.visualChanges) && c.visualChanges.length > 0, `${c.id}: visualChanges required`);
    if (c.type !== 'croma') check((c.visualChanges || []).some(x => ['clothing','armor','accessory','secondarySilhouette'].includes(x)), `${c.id}: palette/aura alone is a croma`);
    check(!!safeFile(c.preview, root), `${c.id}: preview must exist`);
    check(c.availability === 'alpha-test' && c.premiumPrice == null, `${c.id}: Alpha must remain testable without monetary price`);
  }
  // FOUNDER: outside normal progression -> no Set/croma requirement, but at least one Founder skin.
  for (const type of founder ? ['skin'] : ['skin', 'croma', 'set']) check(cosmetics.some(c => c.type === type), `initial ${type} required`);
  if (!founder) {
    check(text(m.set?.sourceArena) && Array.isArray(m.set?.pieces) && m.set.pieces.length >= 2 && new Set(m.set.pieces).size === m.set.pieces.length, 'set requires distinct pieces and explicit farm source');
    check(cosmetics.some(c => c.type === 'set' && c.id === m.set?.rewardCosmetic), 'set reward must reference its cosmetic');
    check(m.set?.rewardGrantsPower === false, 'set cosmetic reward cannot grant power');
  } else check(m.set == null, 'FOUNDER has no Set (no loot, no progression rewards)');
  const budgets = m.budgets || {}, caps = BUDGETS[category] || BUDGETS.STANDARD;
  for (const [key, cap] of Object.entries(caps)) check(Number.isInteger(budgets[key]) && budgets[key] >= 0 && budgets[key] <= cap, `budgets.${key} must be bounded by ${cap}`);
  for (const gate of Object.keys(GATES)) check(!!safeFile(m.evidence?.[gate], root), `${gate} evidence required (file presence does not prove gate passed)`);
  return errors;
}
function scaffold(id, category = 'STANDARD') {
  const ability = name => ({id:name, description:'', cooldownMs:0, maxTargets:1, hordeMechanism:'', anticipation:'', execution:'', impact:'', feedback:'', vfx:'', sfx:''});
  return {schemaVersion:1,id,name:'',title:'',role:'',fantasy:'',lore:'',personality:'',silhouette:'',stats:{hp:0,damage:0,speed:0},kit:{basic:ability('basic'),skills:[1,2,3].map(n=>ability(`skill_${n}`)),ultimate:ability('ultimate')},art:{atlas:'',preview:'',directions:4,frameWidth:0,frameHeight:0,sha256:'',animations:{idle:0,walk:0,attack:0,cast:0,hit:0,death:0,ultimate:0},review:{status:'PENDING',reviewer:'',evidence:''}},integration:{runtime:'',codex:'',talents:'',mastery:'',set:'',kitTest:''},cosmetics:[],set:{sourceArena:'',pieces:[],rewardCosmetic:'',rewardGrantsPower:false},budgets:{particles:32,summons:3,audioVoices:2},evidence:Object.fromEntries(Object.keys(GATES).map(k=>[k,''])),category,...(category==='FOUNDER'?{founderKey:'',balanceProfile:'founder',purchasable:false,transferable:false,set:null}:{})};
}
module.exports = {ROOT, GATES, BUDGETS, safeFile, validate, scaffold, taxonomy};
