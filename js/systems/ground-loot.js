"use strict";
/* ============================================================
   js/systems/ground-loot.js
   BOTÍN EN EL PISO (balance: js/data/ground-loot.js).
     groundLootOnKill(e)      -> SIMULACIÓN (anfitrión / partida sola): por cada jugador humano decide si
                                 le cae algo y con qué calidad. Al propio lo suelta acá; a cada invitado
                                 se lo manda por evento (netEmitTo "groundLootDrop", no se descarta).
     groundLootDrop(...)      -> en el cliente de ESE jugador: tira la rareza con SU protección contra la
                                 mala suerte, arma el objeto real (con sus afijos) y lo deja en el piso.
     groundLootTick(dt)       -> levantar al pasar por encima (anfitrión e invitado, cada uno lo suyo).
     groundLootPickNearest()  -> el botón contextual ("Levantar", el mismo de Revivir) / tecla E.
     groundLootDraw*()        -> haz de luz por rareza, el objeto en el piso y su nombre al acercarse.
   El botín es INSTANCIADO: lo que ves en el piso es tuyo; tus amigos ven el suyo (Diablo III).
   Al ganar, lo que quedó en el piso se junta solo; al cambiar de arena en la Horda Infinita, también.
   ============================================================ */
let groundLoot = []; // [{item, tier, x, y, t0, id}] -- solo los de ESTE jugador
// Aspecto del botón contextual cuando lo que hay al alcance es botín (no es un objetivo del anfitrión:
// levantar es local e instantáneo, cada uno lo suyo).
CTX_KINDS.ground_loot = {label:"Levantar", icon:"⇪", color:"#ffcf5c"};
const GROUND_LOOT_CTX = {kind:"ground_loot", id:"ground_loot"};
let _glSeq = 0, _glFullHintAt = 0;

// Rango de botín del enemigo (null = no suelta: invocaciones, estructuras, trampas, apéndices de un jefe).
function _glRank(e){
  if(e.eliteName) return "named";
  return (e.rank==="named" || GROUND_LOOT_CFG.chance[e.rank]===undefined) ? null : e.rank;
}
// Calificación y probabilidad según la fuente (en la Horda Infinita manda la ronda: endless.js).
function _glSource(e){
  const C = GROUND_LOOT_CFG, rk = _glRank(e);
  if(!rk) return null;
  let grade = C.grade[rk], chance = C.chance[rk];
  if(typeof endlessOn==="function" && endlessOn() && typeof endlessGradeForRound==="function"){
    const g = endlessGradeForRound(EN.round);
    if(rk==="elite" || rk==="named" || rk==="subjefe" || rk==="jefe") grade = GRADE_ORDER_GL.indexOf(g) > GRADE_ORDER_GL.indexOf(grade) ? g : grade;
    if(rk==="elite" || rk==="named") chance = Math.min(0.9, chance * (1 + ENDLESS_CFG.lootGrowthPerRound*(EN.round-1)));
  }
  return {rk, grade, chance, hm:C.highMult[rk], count:C.count[rk]};
}
const GRADE_ORDER_GL = ["C","B","A","S","S+"];
// PURA (la usa también el simulador de economía): cuántos objetos le caen a un jugador por esta baja.
function groundLootRollCount(src, rng){
  rng = rng || Math.random;
  if(rng() >= src.chance) return 0;
  return src.count[0] + Math.floor(rng()*(src.count[1]-src.count[0]+1));
}
// PURA: rareza de un objeto del piso. pity = protección de ESTE guardado (no se modifica acá).
function groundLootRollTier(arena, grade, hm, pity, rng){
  const w = lootTierWeights(arena, grade, pity, false);
  for(const t of ["legendario","mitico","set","unico"]) w[t] *= hm;
  return _pick(w, rng || Math.random) || "comun";
}
// Simulación: al morir un enemigo (combat.js → killEnemy).
function groundLootOnKill(e){
  if(!e || (typeof netIsGuest==="function" && netIsGuest())) return;
  if(typeof divinaMode!=="undefined" && divinaMode) return;
  if(e.noLoot || e.summonedByRole || e._eliteMirror) return;
  const src = _glSource(e); if(!src) return;
  const arena = currentArena;
  for(const h of heroes){
    const local = h===player, remote = !!h.isRemote;
    if(!local && !remote) continue; // los bots no juntan botín (el inventario es de la cuenta del jugador)
    const n = groundLootRollCount(src);
    for(let i=0;i<n;i++){
      const a = Math.random()*Math.PI*2, d = 14 + Math.random()*GROUND_LOOT_CFG.scatter;
      const p = {x:e.x + Math.cos(a)*d, y:e.y + Math.sin(a)*d*0.7, radius:14};
      try{ clampToArena(p); if(typeof resolveWallCollision==="function") resolveWallCollision(p); clampToArena(p); }catch(err){}
      const x = Math.round(p.x), y = Math.round(p.y);
      if(local) groundLootDrop(x, y, src.grade, src.hm, arena, src.rk);
      else netEmitTo(h._netSlot, "groundLootDrop", [x, y, src.grade, src.hm, arena, src.rk]);
    }
  }
}
// Cliente del jugador (anfitrión: directo; invitado: por evento de red). Arma el objeto con SU guardado.
function groundLootDrop(x, y, grade, hm, arena, rk){
  if(!player || typeof state==="undefined" || (state!=="playing" && state!=="buff" && state!=="paused")) return null;
  save.lootPity = Object.assign({legendario:0, set:0, mitico:0, unico:0}, save.lootPity||{});
  const classKey = player.classKey || selectedClass;
  let tier = groundLootRollTier(arena || currentArena, grade || "B", hm==null ? 1 : hm, save.lootPity);
  let spec = {tier};
  if(tier==="set"){ const sp = _rollSetPiece(arena, ownedDesignIds(), Math.random, classKey); spec = sp ? {tier, setId:sp.setId, designId:sp.designId, type:sp.type} : {tier:"legendario"}; tier = spec.tier; }
  const it = materializeLoot(spec, classKey, arena || currentArena);
  if(!it) return null;
  it.lootTier = spec.tier;
  // Pesadilla/Infierno: cae con nivel extra, igual que el cofre (loot.js)
  const lb = typeof diffItemLevelBonus==="function" ? diffItemLevelBonus() : 0;
  if(lb > 0) it.level = Math.min(ITEM_MAX_LEVEL, itemLevel(it) + lb);
  if(LOOT_PITY[spec.tier]){ save.lootPity[spec.tier] = 0; if(typeof persist==="function") persist(); } // cayó: su protección vuelve a cero
  const shown = itemTier(it);
  const g = {item:it, tier:shown, x, y, t0:(typeof animNow!=="undefined" && animNow) || performance.now(), id:++_glSeq, src:rk||""};
  groundLoot.push(g);
  if(groundLoot.length > GROUND_LOOT_CFG.maxOnFloor) _glOverflow();
  // se oye y se ve al caer (solo en la pantalla de su dueño: cada uno ve lo suyo)
  if(typeof netQuiet==="function") netQuiet(()=>{
    if(typeof playSfx==="function" && (typeof inView!=="function" || inView(x, y, 80))) playSfx(GROUND_SFX[shown] || "lootCommon");
    if(TIER_ORDER[shown] >= 3 && typeof vfxShock==="function") vfxShock(x, y, 10, 90, GROUND_BEAM[shown], 700, 2);
  });
  try{ window.dispatchEvent(new CustomEvent("horda-stat", {detail:{k:"ground_drop", v:TIER_ORDER[shown]||0}})); }catch(err){}
  return g;
}
// Demasiado en el piso: se levanta solo lo más viejo de menor categoría (nunca se pierde en silencio).
function _glOverflow(){
  let worst = null;
  for(const g of groundLoot){ if(!worst || TIER_ORDER[g.tier] < TIER_ORDER[worst.tier]) worst = g; }
  if(worst && !groundLootPick(worst)){ groundLoot.splice(groundLoot.indexOf(worst), 1); }
}
// Levantar: al inventario de la cuenta. Devuelve false si no entra (queda en el piso).
function groundLootPick(g){
  if(!g || groundLoot.indexOf(g) < 0) return false;
  if(stashFull()){
    const now = performance.now();
    if(now - _glFullHintAt > 2500){ _glFullHintAt = now; if(typeof netQuiet==="function") netQuiet(()=>floatText(g.x, g.y-40, "Inventario lleno", null)); groundLootToast(null, "Inventario lleno: vendé o descartá para levantarlo"); }
    return false;
  }
  groundLoot.splice(groundLoot.indexOf(g), 1);
  addItemToInventory(player ? player.classKey : selectedClass, g.item);
  if(typeof endlessOn==="function" && endlessOn() && EN.local && EN.local.loot) EN.local.loot.push(g.item);
  if(typeof netQuiet==="function") netQuiet(()=>{
    if(typeof playSfx==="function") playSfx(TIER_ORDER[g.tier] >= 3 ? GROUND_SFX[g.tier] : "potion");
    if(typeof vfxShock==="function") vfxShock(g.x, g.y, 6, 44, GROUND_BEAM[g.tier], 360, 1);
  });
  groundLootToast(g.item);
  if(TIER_ORDER[g.tier] >= 3 && typeof persistNow==="function") persistNow(); // lo valioso se guarda ya (no espera la tanda de 1,5 s)
  try{ window.dispatchEvent(new CustomEvent("horda-stat", {detail:{k:"ground_pick", v:TIER_ORDER[g.tier]||0}})); }catch(err){}
  return true;
}
// Cada cuadro (anfitrión en update.js; invitado en netGuestUpdate): levantar al pasar por encima.
function groundLootTick(dt){
  if(!groundLoot.length || !player || !player.alive) return;
  const R = GROUND_LOOT_CFG.pickR;
  for(let i=groundLoot.length-1;i>=0;i--){
    const g = groundLoot[i];
    if(g && Math.hypot(player.x-g.x, player.y-g.y) < R) groundLootPick(g);
  }
}
// El más cercano al alcance del botón contextual (o null).
function groundLootNearest(h, r){
  if(!groundLoot.length || !h || !h.alive) return null;
  r = r || GROUND_LOOT_CFG.btnR;
  let best = null, bd = r;
  for(const g of groundLoot){ const d = Math.hypot(h.x-g.x, h.y-g.y); if(d < bd){ bd = d; best = g; } }
  return best;
}
function groundLootPickNearest(){ const g = groundLootNearest(player); return g ? groundLootPick(g) : false; }
// Juntar todo lo que quedó en el piso (victoria / cambio de arena). Devuelve lo que entró.
function groundLootCollectAll(){
  const got = [];
  for(const g of groundLoot.slice().sort((a,b)=>TIER_ORDER[b.tier]-TIER_ORDER[a.tier])){
    if(stashFull()) break;
    groundLoot.splice(groundLoot.indexOf(g), 1);
    addItemToInventory(player ? player.classKey : selectedClass, g.item);
    if(typeof endlessOn==="function" && endlessOn() && EN.local && EN.local.loot) EN.local.loot.push(g.item);
    got.push(g.item);
  }
  groundLoot = [];
  return got;
}
// Al empezar una partida (o cambiar de arena a mitad de una): lo que quedaba en el piso se junta solo
// si la partida sigue (Horda Infinita); si no, se descarta (era de una partida anterior).
function groundLootReset(){
  if(groundLoot.length && typeof state!=="undefined" && (state==="playing" || state==="buff")) groundLootCollectAll();
  groundLoot = [];
}

/* ---------------- aviso al levantar ---------------- */
function groundLootToast(it, text){
  if(typeof document==="undefined") return;
  let box = document.getElementById("loot-toasts");
  if(!box){ box = document.createElement("div"); box.id = "loot-toasts"; document.body.appendChild(box); }
  // en la pila de avisos de ARRIBA A LA DERECHA (con los de red y desafíos), no en el medio de la pelea:
  // jerarquía de textos en js/ui/hud-text.js
  const host = typeof toastStackHost==="function" ? toastStackHost() : null;
  if(host && box.parentNode !== host) host.appendChild(box);
  const el = document.createElement("div");
  el.className = "loot-toast";
  if(it){
    const col = itemColor(it), tl = itemTierLabel(it);
    el.style.setProperty("--tc", col);
    el.innerHTML = `${typeof itemIconHTML==="function" ? itemIconHTML(it, "lt-ico") : ""}<span class="lt-txt"><span class="lt-name" style="color:${col}">${it.name}</span><span class="lt-tier">${tl}</span></span>`;
  } else { el.classList.add("lt-warn"); el.textContent = text || ""; }
  box.appendChild(el);
  while(box.children.length > (host ? 2 : 3)) box.removeChild(box.firstChild); // arriba a la derecha, 2 (no bajan hasta los botones)
  setTimeout(()=>{ el.classList.add("out"); }, 2300);
  setTimeout(()=>{ if(el.parentNode) el.parentNode.removeChild(el); }, 2800);
}

/* ---------------- dibujo ---------------- */
// Debajo de las entidades: sombra, el objeto (su ícono pixel) apoyado en el piso y el haz de luz.
function groundLootDrawGround(){
  if(!groundLoot.length || typeof ctx==="undefined") return;
  const t = (typeof animNow!=="undefined" ? animNow : performance.now())/1000;
  ctx.save();
  for(const g of groundLoot){
    const H = GROUND_BEAM_H[g.tier] || 0;
    if(typeof inView==="function" && !inView(g.x, g.y - H*0.5, 60 + H*0.5)) continue;
    const rgb = GROUND_BEAM[g.tier] || "200,200,200", age = t - g.t0/1000;
    const pulse = 0.78 + 0.22*Math.sin(t*3 + g.id);
    // haz vertical (luz aditiva): más alto y más intenso cuanto más raro; nace de golpe al caer
    if(H > 0){
      const grow = Math.min(1, Math.max(0, age*3));
      const hh = Math.round(H*grow), big = TIER_ORDER[g.tier] >= 3, w = big ? 18 : 12;
      ctx.globalCompositeOperation = "lighter";
      // columna escalonada (tres anchos, como el pixel art): afuera tenue, adentro intensa
      for(const [k, a] of [[1, 0.28], [0.55, 0.42], [0.22, 0.6]]){
        const ww = Math.max(2, Math.round(w*k));
        const gr = ctx.createLinearGradient(0, g.y - hh, 0, g.y);
        gr.addColorStop(0, `rgba(${rgb},0)`); gr.addColorStop(0.55, `rgba(${rgb},${a*0.55*pulse})`); gr.addColorStop(1, `rgba(${rgb},${a*pulse})`);
        ctx.fillStyle = gr; ctx.fillRect(Math.round(g.x - ww/2), g.y - hh, ww, hh);
      }
      // halo en el piso del color de la rareza
      ctx.fillStyle = `rgba(${rgb},${(big ? 0.34 : 0.24)*pulse})`;
      ctx.beginPath(); ctx.ellipse(g.x, g.y + 2, big ? 30 : 22, big ? 11 : 8, 0, 0, Math.PI*2); ctx.fill();
      if(typeof glowSprite==="function"){ ctx.globalAlpha = 0.8*pulse; const R = big ? 52 : 34; ctx.drawImage(glowSprite(rgb), g.x - R, g.y - R*0.6, R*2, R*1.2); ctx.globalAlpha = 1; }
      ctx.globalCompositeOperation = "source-over";
    } else {
      ctx.fillStyle = `rgba(${rgb},0.18)`; ctx.beginPath(); ctx.ellipse(g.x, g.y + 2, 18, 6, 0, 0, Math.PI*2); ctx.fill();
    }
    // sombra + objeto
    ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.beginPath(); ctx.ellipse(g.x, g.y + 3, 13, 5, 0, 0, Math.PI*2); ctx.fill();
    const cv = typeof itemIconCanvas==="function" ? itemIconCanvas(g.item) : null;
    const drop = age < 0.35 ? (1 - age/0.35) : 0; // cae con un pequeño rebote
    const bob = Math.round(Math.sin(t*2.2 + g.id)*1.5) - Math.round(Math.sin(drop*Math.PI)*16);
    if(cv){ ctx.imageSmoothingEnabled = false; ctx.drawImage(cv, Math.round(g.x - 20), Math.round(g.y - 36 + bob), 40, 40); }
    else { ctx.fillStyle = `rgb(${rgb})`; ctx.fillRect(Math.round(g.x - 5), Math.round(g.y - 14 + bob), 10, 10); }
    // destello pixel sobre lo raro
    if(TIER_ORDER[g.tier] >= 2 && ((t*2 + g.id*0.37) % 1.6) < 0.18){ ctx.fillStyle = "#fff"; const sx = Math.round(g.x + 8), sy = Math.round(g.y - 22 + bob); ctx.fillRect(sx, sy - 3, 1, 7); ctx.fillRect(sx - 3, sy, 7, 1); }
  }
  ctx.restore();
}
// Nombre flotante (al acercarse; Legendario o más, siempre en pantalla). Se dibuja en píxeles de PANTALLA,
// fuera de la cámara: con el zoom del teléfono (×0,6) un texto del mundo quedaba ilegible.
function groundLootDrawNames(){
  if(!groundLoot.length || !player || typeof ctx==="undefined" || typeof worldToScreen!=="function") return;
  ctx.save();
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = "17px 'VT323', monospace";
  const shown = [];
  const list = groundLoot.slice().sort((a,b)=>Math.hypot(player.x-a.x, player.y-a.y) - Math.hypot(player.x-b.x, player.y-b.y));
  for(const g of list){
    const d = Math.hypot(player.x-g.x, player.y-g.y);
    if(typeof inView==="function" && !inView(g.x, g.y, 10)) continue;
    if(d > GROUND_LOOT_CFG.nameR && TIER_ORDER[g.tier] < 3) continue;
    const s = worldToScreen(g.x, g.y);
    const col = itemColor(g.item), label = g.item.name;
    const w = Math.ceil(ctx.measureText(label).width) + 10;
    let y = Math.round(s.y - 34);
    for(let k=0;k<8;k++){ if(!shown.some(r=>Math.abs(r.y - y) < 17 && Math.abs(r.x - s.x) < (r.w + w)/2)) break; y -= 18; } // que no se pisen
    shown.push({x:s.x, y, w});
    const x0 = Math.round(s.x - w/2);
    ctx.fillStyle = "rgba(8,6,10,0.85)"; ctx.fillRect(x0, y - 9, w, 18);
    ctx.fillStyle = col; ctx.fillRect(x0, y + 8, w, 1);
    ctx.fillStyle = "#000"; ctx.fillText(label, Math.round(s.x) + 1, y + 2);
    ctx.fillStyle = col; ctx.fillText(label, Math.round(s.x), y + 1);
  }
  ctx.restore();
}
