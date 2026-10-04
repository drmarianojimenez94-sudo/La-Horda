"use strict";
/* ============================================================
   js/systems/difficulty-tiers.js
   DIFICULTADES DE CAMPAÑA (reseña #12): NORMAL · PESADILLA · INFIERNO, al estilo de Diablo II.
   - Pesadilla se abre al terminar la campaña en Normal (la Arena Infernal); Infierno, al terminarla en
     Pesadilla. Dentro de cada dificultad la campaña vuelve a ser SECUENCIAL: la primera arena abierta y,
     de ahí, una por victoria (igual que en Normal).
   - Se juega sobre el ajuste por poder del equipo de difficulty.js (runDifficulty): arriba de eso cada
     dificultad multiplica vida y daño de la horda, sube el tope por golpe, da resistencia a los
     elementos, hace más frecuentes a las élites y corre el "nivel esperado" de cada arena (+lvlOffset):
     un guardián que vuelve más fuerte no la vuelve trivial. Calibrado con tools/items/t_difficulty.js
     (bloque CALIBRACIÓN): con el mismo equipo en el nivel esperado de cada dificultad, la horda tiene
     ×2,5 (Pesadilla) y ×5,5 (Infierno) de vida y ×2,3 / ×4,5 de daño respecto de Normal. Como el poder
     del guardián crece más que la horda de Normal, lo que se SIENTE (vida enemiga / daño propio y golpe
     enemigo / vida propia) frente a Normal en su nivel queda ~×1,2-1,5 en Pesadilla y ~×2-2,5 en
     Infierno. Los golpes de jefe (anclados a la vida del equipo) pesan ×1,3 / ×1,65: duelen, sin borrar.
   - Premio: botín de rareza más alta (peso × lootFactor^exponente de la categoría, como la calificación),
     objetos que caen con nivel (+itemLvl), más XP y más oro.
   - Guardado: save.diffCleared = {pesadilla:{arena:true}, infierno:{…}} (Normal sigue siendo
     save.arenasCleared) y save.diffSelected (la elegida en la Sala). Guardados viejos: vacíos = todo en Normal.
   - Cooperativo: la elige el ANFITRIÓN. Viaja en la Sala ({k:"cos"}, campo d) y en el arranque
     ({k:"start"}, campo diff) -> netMatch.diff. Al invitado le cuenta solo si él ya la tenía abierta en
     esa arena (el mismo criterio que las arenas bloqueadas: el cooperativo no sirve para saltearse nada).
   - VARIANTES DE MAPA POR SEMILLA (reseña #13): runMapSeed() es la semilla de la partida (en cooperativo,
     la del anfitrión: netMatch.seed, que ya viaja en el arranque). Ver mapVariantSalt() y sus usos.
   Componente de la Sala autocontenido: diffPickerHtml() + diffBindPicker(root), como el de la Resonancia.
   ============================================================ */
const DIFF_TIER_ORDER = ["normal", "pesadilla", "infierno"];
const DIFF_TIERS = {
  normal:   {label:"Normal",    color:"#d8cfb8", hp:0.9,  dmg:0.82, bossDmg:0.86, spawn:1.18,    hitCap:1,    elite:1,   resist:0,    lootFactor:1,   itemLvl:0, xp:1,   gold:1,   lvlOffset:0,
             desc:"Campaña accesible: aprendé las arenas con margen para recuperarte."},
  pesadilla:{label:"Pesadilla", color:"#ff9a4a", hp:2.5,  dmg:2.3, bossDmg:1.3,  hitCap:1.3,  elite:1.8, resist:0.15, lootFactor:1.7, itemLvl:2, xp:1.6, gold:1.5, lvlOffset:36,
             desc:"La Horda vuelve con más vida, pega más fuerte, resiste el fuego, el hielo y el rayo, y trae más élites."},
  infierno: {label:"Infierno",  color:"#ff4a5a", hp:5.5,  dmg:4.5,  bossDmg:1.65, hitCap:1.6,  elite:2.6, resist:0.3,  lootFactor:2.6, itemLvl:4, xp:2.3, gold:2,   lvlOffset:62,
             desc:"Para guardianes hechos: cada golpe duele, las élites son la regla y los elementos casi no les entran."}
};
const DIFF_ELEM_KINDS = ["fire", "ice", "lightning"];
function diffTier(k){ return DIFF_TIERS[k] || DIFF_TIERS.normal; }
function _diffSaveShape(){
  if(!save.diffCleared || typeof save.diffCleared!=="object") save.diffCleared = {};
  for(const k of DIFF_TIER_ORDER) if(k!=="normal" && (!save.diffCleared[k] || typeof save.diffCleared[k]!=="object")) save.diffCleared[k] = {};
  if(!DIFF_TIERS[save.diffSelected]) save.diffSelected = "normal";
}
function diffClearedIn(tier, arena){
  if(tier==="normal") return !!(save.arenasCleared && save.arenasCleared[arena]);
  _diffSaveShape();
  return !!save.diffCleared[tier][arena];
}
// ¿Está abierta la dificultad? (terminar la campaña en la anterior)
function diffTierOpen(tier){
  const i = DIFF_TIER_ORDER.indexOf(tier);
  if(i <= 0) return i===0;
  return diffClearedIn(DIFF_TIER_ORDER[i-1], ARENA_ORDER[ARENA_ORDER.length-1]);
}
function diffFrontier(tier){ return ARENA_ORDER.find(k=>!diffClearedIn(tier, k)) || null; }
function diffArenaUnlocked(arena, tier){
  if(tier==="normal" || !DIFF_TIERS[tier]) return typeof isArenaUnlocked==="function" ? isArenaUnlocked(arena) : true;
  if(ARENA_ORDER.indexOf(arena) < 0 || !diffTierOpen(tier)) return false;
  return diffClearedIn(tier, arena) || arena===diffFrontier(tier);
}
// La dificultad que se juega en `arena` con lo elegido (si no está abierta ahí, Normal).
function diffEffective(arena){
  _diffSaveShape();
  const k = save.diffSelected;
  return k!=="normal" && diffArenaUnlocked(arena, k) ? k : "normal";
}
// La dificultad de la partida (o de la Sala): en cooperativo manda el anfitrión.
function diffCurrent(){
  if(typeof endlessOn==="function" && endlessOn()) return "normal"; // la Horda Infinita tiene su propia escala (js/systems/endless.js)
  if(typeof netMatch!=="undefined" && netMatch && DIFF_TIERS[netMatch.diff]) return netMatch.diff;
  if(typeof net!=="undefined" && net && net.role==="guest" && typeof netLobby!=="undefined" && DIFF_TIERS[netLobby.diff]) return netLobby.diff;
  return diffEffective(typeof currentArena!=="undefined" ? currentArena : "ciudad");
}
function diffSetSelected(k){
  if(!DIFF_TIERS[k]) return;
  save.diffSelected = k;
  try{ persist(); }catch(e){}
}

/* ---------------- escalas en la partida ---------------- */
// Lo llama setupRunDifficulty() (difficulty.js) al final: multiplica sobre el poder del equipo.
function diffApplyToRun(rd, avgLevel){
  const T = diffTier(diffCurrent());
  rd.tier = diffCurrent();
  if(T===DIFF_TIERS.normal){ rd.hp*=T.hp; rd.dmg*=T.dmg; rd.avgHp*=T.bossDmg; rd.spawnRate*=T.spawn; if(["bosque","hielo"].includes(currentArena)){rd.hp*=0.85;rd.dmg*=0.8;rd.spawnRate*=1.12;} return rd; }
  // nivel esperado corrido: el seguimiento parcial de REJUGAR mide la brecha contra ese nivel
  const exp = ((typeof currentArena!=="undefined" && DIFF.arenaLevel[currentArena]) || 1) + T.lvlOffset;
  const gap = Math.max(0, avgLevel - exp), rf = Math.min(DIFF.replayFollowMax, gap*DIFF.replayFollowPerLvl), rf0 = rd.replayFollow||0;
  // se reemplaza el seguimiento de Normal (medido contra el nivel de Normal) por el de esta dificultad
  const o = Math.max(0, rd.off-1), d = Math.max(0, rd.def-1);
  const extraHp = (1 + o*(DIFF.hpFollow + rf))/(1 + o*(DIFF.hpFollow + rf0));
  const extraDmg = (1 + d*(DIFF.dmgFollow + rf*0.75))/(1 + d*(DIFF.dmgFollow + rf0*0.75));
  rd.replayGap = gap; rd.replayFollow = rf;
  rd.hp *= T.hp * extraHp;
  rd.dmg *= T.dmg * extraDmg;
  rd.avgHp *= T.bossDmg;          // el daño de jefes, subjefes y golpes con aviso se ancla a esta vida
  rd.xp *= T.xp;
  rd.hitCapMult = T.hitCap;
  rd.expLevel = exp;
  return rd;
}
function diffHitCapMult(){ return (typeof runDifficulty!=="undefined" && runDifficulty.hitCapMult) || 1; }
// Élites más frecuentes: pickFromPool (spawning.js) multiplica el peso de élites y subélites.
function diffEliteWeight(type){
  const T = diffTier(diffCurrent()); if(T.elite===1) return 1;
  const b = typeof ENEMY_BASE!=="undefined" && ENEMY_BASE[type];
  return b && (b.rank==="elite" || b.rank==="subelite") ? T.elite : 1;
}
// Resistencia elemental extra (reactions.js: enemyResist), con techo.
function diffResistBonus(kind){
  const T = diffTier(diffCurrent());
  return T.resist && DIFF_ELEM_KINDS.includes(kind) ? T.resist : 0;
}
// Botín: factor sobre los pesos de categoría (loot.js: lootTierWeights) y nivel con que cae el objeto.
function diffLootFactor(){ return diffTier(diffCurrent()).lootFactor; }
function diffItemLevelBonus(){ return diffTier(diffCurrent()).itemLvl; }
function diffGoldMult(){ return diffTier(diffCurrent()).gold; }

/* ---------------- progreso ---------------- */
// Victoria en la dificultad de la partida. Devuelve {tier, firstClear, opened} (opened = dificultad nueva).
// credit=false: el invitado sin esa dificultad abierta (juega, pero no le cuenta).
function diffMarkCleared(arena, tier, credit){
  tier = tier || diffCurrent();
  if(tier==="normal" || !DIFF_TIERS[tier]) return {tier:"normal", firstClear:false, opened:null};
  _diffSaveShape();
  if(credit===false) return {tier, firstClear:false, opened:null};
  const nextTier = DIFF_TIER_ORDER[DIFF_TIER_ORDER.indexOf(tier)+1];
  const wasOpen = nextTier ? diffTierOpen(nextTier) : true;
  const firstClear = !save.diffCleared[tier][arena];
  save.diffCleared[tier][arena] = true;
  const opened = nextTier && !wasOpen && diffTierOpen(nextTier) ? nextTier : null;
  try{ persist(); }catch(e){}
  return {tier, firstClear, opened};
}
// Normal recién terminada: aviso de que se abrió Pesadilla (lo llama la victoria después de marcar la arena).
function diffOpenedByNormal(wasOpen){ return !wasOpen && diffTierOpen("pesadilla") ? "pesadilla" : null; }
function diffAnnounceOpened(k){
  if(!k || typeof showBanner!=="function") return;
  setTimeout(()=>showBanner(`🔓 NUEVA DIFICULTAD: ${diffTier(k).label.toUpperCase()} — elegila en la Sala`), 5200);
}

/* ---------------- HUD y resultados ---------------- */
function diffBadgeHTML(k){
  const T = diffTier(k);
  return `<b class="diff-badge diff-${k}" style="color:${T.color};">${T.label.toUpperCase()}</b>`;
}
// Etiqueta junto al nombre de la arena (solo Pesadilla/Infierno: en Normal el HUD queda como siempre)
function diffHudMark(){
  const line = document.getElementById("hud-arena-line"); if(!line) return;
  let el = document.getElementById("hud-diff");
  const k = diffCurrent();
  if(k==="normal"){ if(el) el.remove(); return; }
  if(!el){ el = document.createElement("span"); el.id = "hud-diff"; line.appendChild(el); }
  el.innerHTML = " · " + diffBadgeHTML(k);
}
function diffResultRowHTML(victory){
  const k = diffCurrent(), T = diffTier(k);
  const perks = k==="normal" ? "" : ` <span style="color:#cfc6b0;">(botín mejor, objetos +${T.itemLvl} niveles, XP ×${String(T.xp).replace(".", ",")})</span>`;
  if(victory) return `<div class="res-row"><span>Modo</span><b style="color:${T.color};">${T.label}</b></div>`;
  return `<div class="go-diff" style="margin-top:4px;">Modo: <b style="color:${T.color};">${T.label}</b>${perks}</div>`;
}

/* ---------------- semilla de partida: variantes de mapa ---------------- */
let _soloMapSeed = 0;
function diffNewSoloSeed(){ _soloMapSeed = ((Math.random()*0x7fffffff)|0) || 7; return _soloMapSeed; }
// Semilla del mapa: en cooperativo la del anfitrión (netMatch.seed viaja en {k:"start"}); sola, una por partida.
function runMapSeed(){ return (typeof netMatch!=="undefined" && netMatch && netMatch.seed) ? (netMatch.seed>>>0) : (_soloMapSeed>>>0); }
// Sal para mezclar con las semillas fijas del decorado (0 = el mapa de siempre).
function mapVariantSalt(){ const s = runMapSeed(); return s ? ((s*2654435761)>>>0) % 99991 : 0; }
// Número 0..n-1 estable por partida (y distinto por `tag`), para elegir una variante.
function mapVariantPick(tag, n){
  const s = runMapSeed(); if(!s || n <= 1) return 0;
  let h = s ^ 0x9e3779b9; for(let i=0;i<tag.length;i++){ h = Math.imul(h ^ tag.charCodeAt(i), 16777619)>>>0; }
  return (h>>>0) % n;
}

/* ---------------- UI: selector de la Sala (componente autocontenido) ---------------- */
function _diffInjectCss(){
  if(document.getElementById("diff-picker-css")) return;
  const st = document.createElement("style"); st.id = "diff-picker-css";
  st.textContent = `.diff-wrap{margin-top:6px}.diff-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.diff-row .ri-k{color:var(--ember3,#ffb45a);font-size:.85rem;letter-spacing:.06em}
.diff-pick{font:inherit;font-size:.82rem;min-height:36px;padding:4px 10px;border-radius:6px;border:1px solid #5a4a38;background:rgba(20,14,10,.7);color:var(--c,#d8cfb8);cursor:pointer}
.diff-pick.on{border-color:var(--c,#d8cfb8);box-shadow:0 0 0 1px var(--c,#d8cfb8) inset;background:rgba(60,34,18,.8)}
.diff-pick:disabled{opacity:.45;cursor:default}
.diff-desc{color:var(--text-dim,#b8ae98);font-size:.78rem;line-height:1.25;margin-top:3px}
.diff-warn{color:#ffcf5c;font-size:.78rem;margin-top:3px;line-height:1.25}`;
  document.head.appendChild(st);
}
function _diffLockText(k, arena){
  if(!diffTierOpen(k)){ const prev = diffTier(DIFF_TIER_ORDER[DIFF_TIER_ORDER.indexOf(k)-1]).label; return `Terminá la campaña en ${prev} para abrir ${diffTier(k).label}.`; }
  const f = diffFrontier(k), A = (typeof ARENA_MODS!=="undefined" && ARENA_MODS[f]) || {};
  return `En ${diffTier(k).label} esta arena se abre después de ${A.label || "la anterior"}.`;
}
function diffPickerHtml(){
  _diffInjectCss(); _diffSaveShape();
  const arena = typeof currentArena!=="undefined" ? currentArena : "ciudad";
  const guest = typeof net!=="undefined" && net && net.role==="guest" && typeof netInRoom==="function" && netInRoom();
  if(guest){
    const k = diffCurrent(), T = diffTier(k), mine = diffArenaUnlocked(arena, k);
    return `<div class="diff-row"><b class="ri-k">☠ Dificultad</b> ${diffBadgeHTML(k)} <span class="la-by">· la elige el anfitrión</span></div>
      <div class="diff-desc">${T.desc}</div>${mine ? "" : `<div class="diff-warn" id="diff-no-credit">⚠ Todavía no abriste ${T.label} en esta arena: la jugás igual, pero no te cuenta.</div>`}`;
  }
  // nada que elegir hasta terminar la campaña en Normal: no se muestra (la Sala no se recarga)
  if(!diffTierOpen("pesadilla")) return "";
  const sel = save.diffSelected, eff = diffEffective(arena);
  const btn = k=>{ const T = diffTier(k), open = diffArenaUnlocked(arena, k);
    return `<button type="button" class="diff-pick${k===eff ? " on" : ""}" data-diff="${k}" style="--c:${T.color}" ${open ? "" : "disabled"} title="${open ? T.label : _diffLockText(k, arena)}">${open ? "" : "🔒 "}${T.label}</button>`; };
  const T = diffTier(eff);
  const note = sel!==eff ? `<div class="diff-warn">${_diffLockText(sel, arena)} Se juega en ${T.label}.</div>` : "";
  const perks = eff==="normal" ? "" : ` <b>Premio:</b> botín de rareza más alta, objetos +${T.itemLvl} niveles, XP ×${String(T.xp).replace(".", ",")} y oro ×${String(T.gold).replace(".", ",")}.`;
  return `<div class="diff-row"><b class="ri-k">☠ Dificultad</b><span class="diff-picks">${DIFF_TIER_ORDER.map(btn).join("")}</span></div>
    <div class="diff-desc">${T.desc}${perks}</div>${note}`;
}
function diffBindPicker(root){
  if(!root) return;
  root.querySelectorAll(".diff-pick").forEach(b=>{
    b.addEventListener("click", ev=>{
      ev.stopPropagation();
      diffSetSelected(b.dataset.diff);
      const wrap = root.querySelector(".diff-wrap"); if(wrap){ wrap.innerHTML = diffPickerHtml(); diffBindPicker(root); }
      if(typeof playSfx==="function") playSfx("ready");
      // cooperativo: el anfitrión la reparte a la sala
      if(typeof net!=="undefined" && net && net.role==="host" && typeof netHostBroadcastCos==="function") try{ netHostBroadcastCos(true); }catch(err){}
    });
  });
}
