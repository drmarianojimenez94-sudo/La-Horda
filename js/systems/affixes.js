"use strict";
/* ============================================================
   js/systems/affixes.js
   AFIJOS AL AZAR de los objetos (datos y balance: js/data/affixes.js).
     rollItemAffixes(it)        -> tira los afijos de un objeto recién creado (y su nombre D2 si corresponde)
     affixPassives(it)          -> sus afijos como pasivas {effect,value} (equippedPassives los suma)
     affixLines(it, classKey)   -> líneas del tooltip: "+12% daño [8-15]" con ▲▼ contra lo equipado
     migrateAffixesV1(stash)    -> objetos de guardados viejos: reciben sus afijos sin cambiar de nombre
     Mística (sumidero de oro): affixRerollCost / affixRerollStart / affixRerollChoose
   Un afijo guardado es {id, v}: v es el valor tirado (fracción: 0.12 = 12%) a nivel 1; el nivel del
   objeto (Gemas) lo multiplica igual que al resto de sus números (itemLevelMult).
   ============================================================ */
function itemAffixes(it){ return (it && Array.isArray(it.affixes)) ? it.affixes : []; }
function affixScale(it){ return AFFIX_RARITY_SCALE[it && it.rarity] || 1; }
// Rango posible [mín, máx] de un afijo en ESTE objeto (rareza × nivel actual).
function affixRange(it, id){
  const d = AFFIX_DB[id]; if(!d) return [0, 0];
  const k = affixScale(it) * itemLevelMult(it);
  return [d.range[0]*k, d.range[1]*k];
}
function affixValue(it, a){ return (a && typeof a.v==="number" ? a.v : 0) * itemLevelMult(it); }
function _affixRoll(it, id, rng){
  const d = AFFIX_DB[id], r = (rng || Math.random)();
  return Math.round((d.range[0] + (d.range[1]-d.range[0])*r) * affixScale(it) * 10000) / 10000;
}
// Afijos que puede recibir este objeto: su ranura y sin repetir EFECTO (dos "+daño" no conviven).
function _affixPool(it, exclude){
  const taken = new Set((exclude||[]).map(a=>AFFIX_DB[a.id] && AFFIX_DB[a.id].effect));
  return AFFIX_IDS.filter(id=>{ const d = AFFIX_DB[id]; return d.slots.indexOf(it.type) >= 0 && !taken.has(d.effect); });
}
function _affixCountFor(it, rng){
  const c = AFFIX_COUNT[it.rarity] || [1,1];
  return c[0] + Math.floor((rng || Math.random)()*(c[1]-c[0]+1));
}
// Tira los afijos de un objeto. Los procedurales Común/Raro además toman su NOMBRE de los afijos
// ("Hacha Ávida de la Tormenta"); el Muy Raro conserva su nombre de familia y suma el sufijo.
function rollItemAffixes(it, rng){
  if(!it || !ITEM_TYPES[it.type]) return it;
  rng = rng || Math.random;
  const out = [], n = _affixCountFor(it, rng);
  for(let i=0;i<n;i++){
    const pool = _affixPool(it, out); if(!pool.length) break;
    const id = pool[Math.floor(rng()*pool.length)];
    out.push({id, v:_affixRoll(it, id, rng)});
  }
  it.affixes = out;
  if(!it.designed && it.noun){ it.baseName = it.baseName || it.name; it.affixName = true; it.name = affixItemName(it); }
  return it;
}
function _affixAdj(noun, adj){ return (typeof _genderize==="function") ? _genderize(adj, noun) : adj.replace("{o}", "o"); }
// Nombre D2: sustantivo + primer prefijo + primer sufijo. Solo objetos procedurales (con sustantivo).
function affixItemName(it){
  if(!it || it.designed || !it.noun) return it ? it.name : "";
  const A = itemAffixes(it);
  const pre = A.find(a=>AFFIX_DB[a.id] && AFFIX_DB[a.id].kind==="pre");
  const suf = A.find(a=>AFFIX_DB[a.id] && AFFIX_DB[a.id].kind==="suf");
  if(AFFIX_NAMED_RARITY[it.rarity]){
    let n = it.noun;
    if(pre) n += " " + _affixAdj(it.noun, AFFIX_DB[pre.id].adj);
    if(suf) n += " " + AFFIX_DB[suf.id].suf;
    return (pre || suf) ? n : (it.baseName || it.name);
  }
  // Muy Raro (y más): su nombre de identidad + el sufijo si su nombre todavía no tiene un "de ..."
  const base = it.baseName || it.name;
  if(it.rarity==="muyraro" && suf && !/ del? /.test(base)) return base + " " + AFFIX_DB[suf.id].suf;
  return base;
}
// Pasivas de los afijos para equippedPassives (se SUMAN entre objetos: son stats, no pasivas de catálogo).
function affixPassives(it){
  return itemAffixes(it).filter(a=>AFFIX_DB[a.id]).map(a=>({id:"afx:"+a.id, name:affixLabel(a.id), effect:AFFIX_DB[a.id].effect, value:affixValue(it, a)}));
}
function affixLabel(id){ const d = AFFIX_DB[id]; return d ? (PASSIVE_EFFECT_LABEL[d.effect] || d.effect) : id; }
function _pctTxt(v){ const p = v*100; return (Math.abs(p) < 10 && Math.round(p*10)%10) ? (Math.round(p*10)/10).toString().replace(".", ",") : String(Math.round(p)); }
// Texto de un afijo: "+12% daño [8-15]".
function affixText(it, a){
  const [lo, hi] = affixRange(it, a.id);
  const ri = v=>Math.max(1, Math.round(v*100)); // el rango va en enteros, como en Diablo II
  return `+${_pctTxt(affixValue(it, a))}% ${affixLabel(a.id).toLowerCase()} <span class="afx-range">[${ri(lo)}-${ri(hi)}]</span>`;
}
// Suma de un efecto en los afijos de un objeto (para comparar contra lo equipado).
function affixEffectSum(it, effect){ let s = 0; for(const a of itemAffixes(it)){ const d = AFFIX_DB[a.id]; if(d && d.effect===effect) s += affixValue(it, a); } return s; }
// Líneas del tooltip con comparación ▲▼ contra el objeto equipado en esa ranura (si hay classKey).
// Devuelve [{txt, cmp:"up"|"down"|"eq"|"new"|"lost"|null, idx}] (idx = posición del afijo, para la Mística).
function affixLines(it, classKey){
  const eq = (classKey && typeof equippedItem==="function") ? equippedItem(classKey, it.type) : null;
  const other = eq && eq.uid!==it.uid ? eq : null;
  const lines = itemAffixes(it).map((a, idx)=>{
    const d = AFFIX_DB[a.id]; if(!d) return null;
    let cmp = null;
    if(other){ const mine = affixValue(it, a), theirs = affixEffectSum(other, d.effect);
      cmp = theirs <= 0 ? "new" : (mine > theirs + 1e-4 ? "up" : (mine < theirs - 1e-4 ? "down" : "eq")); }
    return {txt:affixText(it, a), cmp, idx, id:a.id};
  }).filter(Boolean);
  // lo que tenía lo equipado y este objeto no trae: se pierde
  if(other) for(const a of itemAffixes(other)){
    const d = AFFIX_DB[a.id]; if(!d || affixEffectSum(it, d.effect) > 0) continue;
    lines.push({txt:`${affixLabel(a.id)}: perdés ${_pctTxt(affixValue(other, a))}%`, cmp:"lost", idx:-1, id:a.id});
  }
  return lines;
}
const AFFIX_CMP_MARK = {up:" ▲", down:" ▼", eq:" =", new:" ▲ nuevo", lost:" ▼"};
function affixLinesHTML(it, classKey, withReroll){
  const L = affixLines(it, classKey); if(!L.length) return "";
  const lock = typeof it.rerollIdx==="number" ? it.rerollIdx : -1;
  return L.map(l=>{
    const mark = l.cmp ? `<span class="afx-cmp ${l.cmp}">${AFFIX_CMP_MARK[l.cmp]}</span>` : "";
    const btn = (withReroll && l.idx>=0 && (lock<0 || lock===l.idx)) ? ` <button class="afx-reroll-btn" data-afx-reroll="${l.idx}">Mística · ${affixRerollCost(it)}o</button>` : "";
    return `<div class="ip-line item-affix ${l.cmp==="lost"?"afx-lost":""}">${l.cmp==="lost" ? "" : "◇ "}${l.txt}${mark}${btn}</div>`;
  }).join("");
}

/* ---------------- guardados viejos ---------------- */
// RNG determinístico por objeto: el mismo objeto viejo recibe siempre los mismos afijos.
function _affixSeedRng(str){
  let h = 2166136261; const s = String(str||"");
  for(let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  let a = h>>>0;
  return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a>>>15, 1 | a); t = t + Math.imul(t ^ t>>>7, 61 | t) ^ t; return ((t ^ t>>>14)>>>0)/4294967296; };
}
// Objetos anteriores a los afijos: quedan válidos (mismo uid, nombre, nivel y equipo) y reciben sus
// afijos según su rareza. No se renombran: el jugador los conoce por su nombre.
function migrateAffixesV1(stash){
  let n = 0;
  for(const it of (stash||[])){
    if(!it || Array.isArray(it.affixes) || !ITEM_TYPES[it.type]) continue;
    const keepName = it.name;
    rollItemAffixes(it, _affixSeedRng("afx1/" + it.uid));
    it.name = keepName; it.affixName = false; delete it.baseName;
    n++;
  }
  return n;
}

/* ---------------- Mística: re-tirar UN afijo por oro ---------------- */
function affixRerollCost(it){
  if(!it) return 0;
  const base = AFFIX_REROLL_BASE[it.set ? "set" : it.rarity] || 100;
  return Math.min(AFFIX_REROLL_CAP, Math.round(base * Math.pow(AFFIX_REROLL_GROWTH, it.rerolls||0) / 5) * 5);
}
// ¿Se puede re-tirar el afijo idx de este objeto? {ok, reason}
function affixRerollCheck(it, idx){
  if(!it) return {ok:false, reason:"Objeto inexistente"};
  const A = itemAffixes(it);
  if(!(idx >= 0 && idx < A.length)) return {ok:false, reason:"Elegí un afijo del objeto"};
  if(typeof it.rerollIdx==="number" && it.rerollIdx!==idx) return {ok:false, reason:"Este objeto ya está atado a otro afijo: solo ese se puede re-tirar"};
  if((save.gold||0) < affixRerollCost(it)) return {ok:false, reason:`Necesitás ${affixRerollCost(it)} de oro`};
  return {ok:true};
}
// Cobra el oro y devuelve las opciones nuevas (el original siempre se puede conservar). Nada de lo que
// sale acá cambia la rareza, la identidad, el set ni el Único del objeto.
let _affixPending = null;
function affixRerollStart(uid, idx, rng){
  const it = (typeof findStashItem==="function") ? findStashItem(uid) : null;
  const chk = affixRerollCheck(it, idx); if(!chk.ok) return chk;
  rng = rng || Math.random;
  const A = itemAffixes(it), others = A.filter((a,i)=>i!==idx);
  const pool = _affixPool(it, others).filter(id=>id!==A[idx].id);
  const opts = [];
  const bag = pool.slice();
  while(opts.length < AFFIX_REROLL_OPTIONS && bag.length){
    const id = bag.splice(Math.floor(rng()*bag.length), 1)[0];
    opts.push({id, v:_affixRoll(it, id, rng)});
  }
  if(!opts.length) return {ok:false, reason:"No hay otros afijos posibles para esta pieza"};
  save.gold -= affixRerollCost(it);
  it.rerolls = (it.rerolls||0) + 1;
  it.rerollIdx = idx;
  _affixPending = {uid, idx, orig:{id:A[idx].id, v:A[idx].v}, opts};
  if(typeof persist==="function") persist();
  try{ window.dispatchEvent(new CustomEvent("horda-stat", {detail:{k:"affix_reroll", v:it.rerolls}})); }catch(e){}
  return {ok:true, orig:_affixPending.orig, opts, cost:affixRerollCost(it)};
}
// choice: índice de la opción nueva, o -1 para quedarse con el original.
function affixRerollChoose(uid, choice){
  const P = _affixPending; _affixPending = null;
  const it = P && P.uid===uid ? findStashItem(uid) : null;
  if(!it) return {ok:false, reason:"No hay una re-tirada pendiente"};
  if(choice >= 0 && P.opts[choice]){
    it.affixes[P.idx] = {id:P.opts[choice].id, v:P.opts[choice].v};
    if(it.affixName) it.name = affixItemName(it);
  }
  if(typeof invalidatePassiveCache==="function") invalidatePassiveCache();
  if(typeof persist==="function") persist();
  return {ok:true, item:it};
}
// Modal de la Mística (desde la vista previa del objeto).
function openAffixReroll(uid, idx, classKey, onDone){
  const it = findStashItem(uid); if(!it) return;
  const chk = affixRerollCheck(it, idx);
  if(!chk.ok){ if(typeof gameAlert==="function") gameAlert(chk.reason); return; }
  const cost = affixRerollCost(it);
  const go = ()=>{
    const r = affixRerollStart(uid, idx); if(!r.ok){ if(typeof gameAlert==="function") gameAlert(r.reason); return; }
    if(typeof playSfx==="function") playSfx("chestOpen");
    let el = document.getElementById("affix-reroll");
    if(!el){ el = document.createElement("div"); el.id = "affix-reroll"; document.body.appendChild(el); }
    const opt = (a, i, label)=>`<button class="afx-opt ${i<0?"keep":""}" data-afx-choose="${i}"><span class="afx-opt-k">${label}</span><span class="afx-opt-v">${affixText(it, a)}</span></button>`;
    el.innerHTML = `<div class="ip-backdrop"></div><div class="afx-panel"><div class="afx-title">MÍSTICA</div>
      <div class="afx-sub" style="color:${itemColor(it)}">${it.name}</div>
      <div class="afx-opts">${opt(r.orig, -1, "Conservar")}${r.opts.map((a,i)=>opt(a, i, "Nuevo")).join("")}</div>
      <div class="afx-sub">Pagaste ${cost} de oro. Próxima re-tirada de este objeto: ${r.cost} de oro.</div></div>`;
    el.classList.remove("hidden");
    el.querySelectorAll("[data-afx-choose]").forEach(b=>b.addEventListener("click", ()=>{
      affixRerollChoose(uid, +b.getAttribute("data-afx-choose"));
      el.classList.add("hidden"); el.innerHTML = "";
      if(typeof renderSaveLine==="function") renderSaveLine();
      if(onDone) onDone();
    }));
  };
  const msg = `Re-tirar «${AFFIX_DB[itemAffixes(it)[idx].id] ? affixLabel(itemAffixes(it)[idx].id) : "afijo"}» por ${cost} de oro. Vas a ver ${AFFIX_REROLL_OPTIONS} opciones nuevas y podés quedarte con la original.${typeof it.rerollIdx!=="number" ? " Desde ahora, en este objeto solo se va a poder re-tirar este afijo." : ""}`;
  if(typeof gameConfirm==="function") gameConfirm(msg, {okText:"Re-tirar"}).then(ok=>{ if(ok) go(); });
  else go();
}
