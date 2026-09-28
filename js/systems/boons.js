"use strict";
/* ============================================================
   js/systems/boons.js
   Motor de los REFUERZOS DE HABILIDAD (datos en js/data/boons.js).
   - Estado: h.boons = {id: rareza 0/1/2}, en el PROPIO héroe (dura la incursión, igual que runStats).
     Viaja solo en los snapshots del cooperativo: el invitado lo lee para su HUD y sus cartas.
   - Oferta: boonBuildOffers() mezcla 1-2 refuerzos del guardián (o 1 en la Horda Infinita) con los
     genéricos de siempre. Opciones como texto: "dmg" (genérico) o "boon:id:rareza".
   - Lanzamiento: castAbility abre un registro (boonCastBegin) que anota a quién golpeó la habilidad
     en ese mismo instante (damageEnemy -> boonRecHit) y lo cierra (boonCastEnd), que dispara los
     efectos. Todo corre en el anfitrión (o partida local); el invitado ve las zonas (champFx) y
     las partículas por el snapshot.
   - Nada daña a aliados (sin fuego amigo) y los jefes/subjefes no se desplazan ni se aturden
     del todo (aturdir a un jefe dura un tercio).
   ============================================================ */
let _boonRec = null;
function boonRarityOf(r){ return BOON_RARITIES[Math.max(0, Math.min(2, r|0))]; }
function boonVal(v, r){ return Array.isArray(v) ? v[Math.max(0, Math.min(v.length-1, r|0))] : v; }
function boonLook(b){ return BOON_LOOKS[b.look] || BOON_LOOKS.steel; }
function heroBoons(h){ return (h && h.boons) || {}; }
function boonOwned(h, id){ const B = heroBoons(h); return B[id]!==undefined ? B[id] : -1; }
// Nombre de la habilidad del kit BASE a la que se ata el refuerzo.
function boonSkillOf(b){
  const cls = CLASSES[b.champ]; if(!cls) return null;
  return b.skill==="ult" ? cls.ultimate : cls.skills[b.skill];
}
function boonsForChamp(k){ return BOONS.filter(b=>b.champ===k); }
// Refuerzos del héroe que transforman la habilidad sk (por nombre: Eren titán tiene otro kit).
function boonsOnSkill(h, sk){
  const out = [], B = heroBoons(h);
  for(const id in B){ const b = BOON_BY_ID[id]; if(!b || b.minion || b.champ!==h.classKey) continue; const s = boonSkillOf(b); if(s && sk && s.name===sk.name) out.push({b, r:B[id]}); }
  return out;
}

/* ---------------- oferta ---------------- */
function boonRollRarity(){
  const lv = (typeof runLevel==="number" ? runLevel : 1);
  const epic = Math.min(0.25, 0.06 + 0.012*lv), rare = 0.30;
  const x = Math.random();
  return x < epic ? 2 : x < epic+rare ? 1 : 0;
}
// Candidatos de refuerzo para h: primero un dúo habilitado (si tiene los dos relacionados), después
// refuerzos nuevos y mejoras de rareza (un refuerzo que ya tiene solo vuelve si sale con más rareza).
function boonCandidates(h){
  if(!h || !h.classKey) return [];
  const all = boonsForChamp(h.classKey), duos = [], plain = [];
  for(const b of all){
    const have = boonOwned(h, b.id);
    if(b.duo){ if(have<0 && b.duo.every(id=>boonOwned(h, id)>=0)) duos.push({id:b.id, r:2}); continue; }
    const r = boonRollRarity();
    if(have < 0) plain.push({id:b.id, r});
    else if(r > have) plain.push({id:b.id, r, up:true});
  }
  plain.sort(()=>Math.random()-0.5);
  return duos.concat(plain);
}
// Arma las opciones de una elección de refuerzo: n cartas con 1-2 refuerzos de habilidad (1 en la
// Horda Infinita, donde las sinergias propias de los genéricos siguen siendo el centro).
function boonBuildOffers(h, genericPool, endless, n){
  n = n || 3;
  const cands = divinaMode ? [] : boonCandidates(h);
  const hasDuo = cands.length && BOON_BY_ID[cands[0].id].duo;
  let k = endless ? 1 : ((hasDuo || Math.random()<0.5) ? 2 : 1);
  k = Math.min(k, cands.length, n);
  const out = cands.slice(0, k).map(c=>"boon:"+c.id+":"+c.r);
  const gen = [...genericPool].sort(()=>Math.random()-0.5).slice(0, n-k).map(b=>b.id);
  return out.concat(gen).sort(()=>Math.random()-0.5);
}
function boonParseOpt(opt){
  if(typeof opt!=="string" || opt.indexOf("boon:")!==0) return null;
  const p = opt.split(":"), b = BOON_BY_ID[p[1]];
  return b ? {b, r:Math.max(0, Math.min(2, parseInt(p[2])||0))} : null;
}
// Da el refuerzo (o sube su rareza). h: el héroe que eligió (el anfitrión lo aplica por el invitado).
function boonGrant(h, id, r){
  const b = BOON_BY_ID[id]; if(!h || !b || b.champ!==h.classKey) return false;
  h.boons = Object.assign({}, h.boons||{}); // objeto nuevo: el snapshot lo detecta como cambio
  h.boons[id] = Math.max(h.boons[id]!==undefined ? h.boons[id] : -1, r|0);
  const L = boonLook(b);
  if(h.alive){ particles.push({x:h.x, y:h.y, life:520, ring:true, maxLife:520, maxR:62, color:L[1]}); floatText(h.x, h.y-58, "✦ "+b.name, "heal"); }
  // ¿habilita un dúo? aviso (la próxima elección lo ofrece primero)
  for(const d of boonsForChamp(h.classKey)) if(d.duo && d.duo.includes(id) && boonOwned(h, d.id)<0 && d.duo.every(x=>boonOwned(h, x)>=0) && h===player) showBanner("¡DÚO HABILITADO: "+d.name.toUpperCase()+"!");
  if(h===player && typeof updateAbilityButtons==="function") updateAbilityButtons();
  return true;
}
function boonAppliedCount(h){ return Object.keys(heroBoons(h)).length; }

/* ---------------- cartas (elección de refuerzo) ---------------- */
// HTML de una opción (genérica o refuerzo de habilidad) para el héroe h de ESTE cliente.
function buffOptHTML(opt, h, hint){
  const pb = boonParseOpt(opt);
  if(!pb){
    const b = BUFF_POOL.find(x=>x.id===opt); if(!b) return "";
    return `<div class="ico">${b.ico}</div><div class="buff-name">${b.name}</div><div class="buff-desc">${b.desc}</div>${hint||""}`;
  }
  const {b, r} = pb, sk = boonSkillOf(b), R = boonRarityOf(r), L = boonLook(b);
  const img = (typeof SKILL_ICON_IMG!=="undefined" && sk) ? SKILL_ICON_IMG[sk.name] : null;
  const ico = img ? `<img class="boon-ico-img" src="${img}" alt="">` : (sk ? sk.ico : "✦");
  const have = boonOwned(h, b.id);
  const tag = b.duo ? "DÚO" : (have>=0 ? `MEJORA ${boonRarityOf(have).name} → ${R.name}` : R.name);
  const duoLine = b.duo ? `<div class="boon-duo">Con ${b.duo.map(id=>BOON_BY_ID[id].name).join(" + ")}</div>`
    : (()=>{ const d = boonsForChamp(b.champ).find(x=>x.duo && x.duo.includes(b.id)); if(!d) return ""; const other = BOON_BY_ID[d.duo.find(x=>x!==b.id)];
        return `<div class="boon-duo">Dúo: <b>${d.name}</b> con ${other.name}${boonOwned(h, other.id)>=0 ? " ✔" : ""}</div>`; })();
  return `<div class="ico boon-ico" style="--boon-c:${L[0]};--boon-g:${L[1]}">${ico}</div>
    <div class="boon-tag" style="color:${R.color}">${tag}</div>
    <div class="buff-name">${b.name}</div>
    <div class="boon-skill">Transforma: <b>${sk ? sk.name : "?"}</b></div>
    <div class="buff-desc">${b.desc(r)}</div>${duoLine}`;
}
function buffOptClass(opt){
  const pb = boonParseOpt(opt); if(!pb) return "buff-card";
  return "buff-card boon rar-"+boonRarityOf(pb.r).id+(pb.b.duo?" duo":"");
}
function buffOptName(opt){ const pb = boonParseOpt(opt); if(pb) return pb.b.name; const b = BUFF_POOL.find(x=>x.id===opt); return b ? b.name : "?"; }
// Aplica la opción elegida al héroe h (runStats ya es el suyo: netWithHero en los invitados).
function buffApplyOpt(h, opt){
  const pb = boonParseOpt(opt);
  if(pb) return boonGrant(h, pb.b.id, pb.r);
  const b = BUFF_POOL.find(x=>x.id===opt); if(!b) return false;
  b.apply(runStats); refreshEquippedStats();
  return true;
}
// Línea "tus refuerzos" bajo las cartas: qué ya transformaste (se ve la build crecer).
function boonOwnedLineHTML(h){
  const B = heroBoons(h), ids = Object.keys(B).filter(id=>BOON_BY_ID[id]);
  if(!ids.length) return "";
  return `<div class="boon-owned">Tus refuerzos: ${ids.map(id=>{ const b = BOON_BY_ID[id]; return `<span style="color:${boonRarityOf(B[id]).color}">${b.duo?"✦✦ ":"✦ "}${b.name}</span>`; }).join(" · ")}</div>`;
}

/* ---------------- HUD: tooltip y marca en el botón ---------------- */
function boonSkillTitle(h, sk){
  const list = boonsOnSkill(h, sk);
  if(h && h.classKey==="nigromante" && sk && CLASSES.nigromante.skills[0].name===sk.name)
    for(const id in heroBoons(h)){ const b = BOON_BY_ID[id]; if(b && b.minion) list.push({b, r:heroBoons(h)[id]}); }
  return list.map(({b,r})=>`\n✦ ${b.name} (${b.duo?"Dúo":boonRarityOf(r).name}): ${b.desc(r)}`).join("");
}
function boonDecorateButton(el, sk){
  if(!el || !player) return;
  const list = boonsOnSkill(player, sk);
  let pip = el.querySelector(".boon-pip");
  if(!list.length){ if(pip) pip.remove(); return; }
  if(!pip){ pip = document.createElement("span"); pip.className = "boon-pip"; el.appendChild(pip); }
  const top = list.reduce((a,x)=>Math.max(a, x.b.duo ? 3 : x.r), 0);
  pip.style.background = top>=3 ? "#ffd76a" : boonRarityOf(top).color;
  pip.textContent = list.length>1 ? String(list.length) : "";
  el.title += boonSkillTitle(player, sk);
}
let _boonHudSig = "";
function boonHudTick(){
  if(!player) return;
  const sig = player.classKey+"|"+JSON.stringify(player.boons||{});
  if(sig===_boonHudSig) return;
  _boonHudSig = sig;
  if(typeof updateAbilityButtons==="function") updateAbilityButtons();
}

/* ---------------- lanzamiento ---------------- */
function boonCastBegin(caster, sk){
  if(!caster || !caster.boons || divinaMode) return null;
  const list = boonsOnSkill(caster, sk);
  if(!list.length) return null;
  const rec = {caster, sk, list, x0:caster.x, y0:caster.y, hits:[], amt:0, n:0, prev:_boonRec};
  caster._lastAimPt = null;
  _boonRec = rec;
  return rec;
}
// damageEnemy: golpe de la habilidad que se está lanzando (no de un refuerzo, un proc o un básico).
function boonRecHit(e, amount, src, opts){
  const R = _boonRec;
  if(!R || src!==R.caster || opts._boon || opts.fromProc || opts.fromBasic) return;
  if(R.hits.indexOf(e) < 0) R.hits.push(e);
  R.amt += amount; R.n++;
}
function boonCastEnd(rec, POWER, AREA){
  if(!rec) return;
  _boonRec = rec.prev; rec.prev = null;
  try{
    const u = boonUnitDmg(rec.caster, POWER);
    for(const {b, r} of rec.list) boonRunFx(b, r, rec, u, AREA||1);
  }catch(err){ if(typeof console!=="undefined") console.warn("boon", err); }
}
function boonUnitDmg(h, POWER){
  const pas = h.classKey ? passiveSum(h.classKey, "dmg_mult") + passiveSum(h.classKey, "skilldmg_mult") : 0;
  return h.baseDmg * ((typeof runStats!=="undefined" && runStats) ? runStats.dmgMult : 1) * (h.buffDmgMult||1) * (POWER||1) * arenaMods().heroDmgMult * (1+pas);
}
function boonSkillRadius(sk){ return (sk && (sk.radius || sk.outerR || (sk.range ? sk.range*0.5 : 0))) || 100; }
function boonAnchors(at, rec, AREA){
  const c = rec.caster, px = rec.px!==undefined ? rec.px : c.x, py = rec.py!==undefined ? rec.py : c.y;
  const ahead = ()=>({x:c.x + (c.fx||0)*((rec.sk && rec.sk.range)||200)*AREA*0.5, y:c.y + (c.fy||0)*((rec.sk && rec.sk.range)||200)*AREA*0.5});
  switch(at){
    case "origin": return [{x:rec.x0, y:rec.y0}];
    case "aim": return [c._lastAimPt ? {x:c._lastAimPt.x, y:c._lastAimPt.y} : (rec.hits[0] ? {x:rec.hits[0].x, y:rec.hits[0].y} : ahead())];
    case "hits": return rec.hits.slice(0, 3).map(e=>({x:e.x, y:e.y}));
    case "ahead": return [ahead()];
    case "golem": return [c.golem ? {x:c.golem.x, y:c.golem.y} : (c._lastAimPt ? {x:c._lastAimPt.x, y:c._lastAimPt.y} : ahead())];
    default: return [{x:px, y:py}];
  }
}
function boonRadius(fx, r, rec, AREA){ return fx.r ? boonVal(fx.r, r) : boonSkillRadius(rec.sk)*AREA*(fx.rMul||1); }
function boonFoes(x, y, R){ return enemies.filter(e=>e.alive && Math.hypot(e.x-x, e.y-y) <= R + (e.radius||0)*0.5); }
// Daño por segundo de un estado que ya tenía: el refuerzo SUMA sobre lo que haya (si no, contra un
// sangrado de la habilidad o de la Firma no se notaría), con tope de 3 veces su propio aporte.
function boonAddDot(timer, old, add){ return (timer>0 && old>0) ? Math.max(old, Math.min(old + add, add*3)) : add; }
function boonApplyStatus(e, st, r, u, src){
  if(!st || !e.alive) return;
  const boss = isBossRank(e);
  if(st.poison){ e.poisonDmg = boonAddDot(e.poisonTimer, e.poisonDmg||0, u*boonVal(st.poison, r)); e.poisonTimer = Math.max(e.poisonTimer||0, 4000); }
  if(st.bleed){ e.bleedDmg = boonAddDot(e.bleedTimer, e.bleedDmg||0, u*boonVal(st.bleed, r)); e.bleedTimer = Math.max(e.bleedTimer||0, 3000); e.bleedSrc = src; }
  if(st.burn){ e.burnDmg = boonAddDot(e.burnTimer, e.burnDmg||0, u*boonVal(st.burn, r)); e.burnTimer = Math.max(e.burnTimer||0, 3000); e.burnSrc = src; }
  if(st.slow){ e.slowAmt = Math.max(e.slowAmt||0, boonVal(st.slow, r)); e.slowTimer = Math.max(e.slowTimer||0, 2200); e.slowBy = src; }
  if(st.stun){ const ms = boonVal(st.stun, r)*(boss ? 0.35 : 1); e.stunTimer = Math.max(e.stunTimer||0, ms); }
  if(st.vuln) seVuln(e, boonVal(st.vuln, r), st.vulnMs||4000);
}
function boonHit(e, amt, src, st, r, u){
  if(!e.alive) return;
  damageEnemy(e, amt, {src, _boon:true});
  boonApplyStatus(e, st, r, u, src);
}
// Detalle visual común: anillo + píxeles del color del refuerzo (se ve que la habilidad cambió).
function boonFlash(x, y, R, L, life){
  particles.push({x, y, life:life||420, ring:true, maxLife:life||420, maxR:R, color:L[0]});
  for(let i=0;i<8;i++){ const a = Math.random()*Math.PI*2, s = 40+Math.random()*70;
    particles.push({x:x+Math.cos(a)*R*0.3, y:y+Math.sin(a)*R*0.2, vx:Math.cos(a)*s, vy:Math.sin(a)*s*0.6-20, life:360+Math.random()*200, color:i%2?L[1]:L[0]}); }
}
function boonRunFx(b, r, rec, u, AREA){
  const c = rec.caster, L = boonLook(b);
  for(const fx of b.fx){
    switch(fx.t){
      case "ground": {
        const R = boonRadius(fx, r, rec, AREA), dur = boonVal(fx.dur, r)||3000;
        for(const p of boonAnchors(fx.at, rec, AREA)){
          pushChampFx({type:"boonZone", x:p.x, y:p.y, r:R, life:dur, maxLife:dur, look:b.look, seed:(Math.random()*997)|0,
            dps:u*(boonVal(fx.dps, r)||0), slow:boonVal(fx.slow, r)||0, burn:!!fx.burn, poison:!!fx.poison, bleed:!!fx.bleed,
            heal:boonVal(fx.heal, r)||0, zap:fx.zap ? {every:fx.zap.every, dmg:u*fx.zap.pct} : null, tickT:0, zapT:0, owner:c, side:!!c.isDivineFoe});
          boonFlash(p.x, p.y, R, L, 380);
        }
        break;
      }
      case "bounce": {
        if(!rec.hits.length) break;
        const per = (rec.n ? rec.amt/rec.n : u)*boonVal(fx.pct, r);
        const done = new Set(rec.hits);
        let cur = rec.hits[rec.hits.length-1];
        for(let i=0;i<boonVal(fx.n, r);i++){
          let next = null, bd = Infinity;
          for(const e of enemies){ if(!e.alive || done.has(e)) continue; const d = Math.hypot(e.x-cur.x, e.y-cur.y); if(d < (fx.range||200) && d < bd){ bd = d; next = e; } }
          if(!next) break;
          particles.push({x:cur.x, y:cur.y-14, x2:next.x, y2:next.y-14, life:260, bolt:true, color:L[1]});
          done.add(next);
          boonHit(next, per, c, fx.status, r, u);
          boonFlash(next.x, next.y, 26, L, 260);
          cur = next;
        }
        break;
      }
      case "status": {
        const list = fx.on==="area" ? boonAnchors(fx.at||"caster", rec, AREA).reduce((a,p)=>a.concat(boonFoes(p.x, p.y, boonRadius(fx, r, rec, AREA))), []) : rec.hits;
        for(const e of list){ boonApplyStatus(e, fx.status, r, u, c); if(e.alive) particles.push({x:e.x, y:e.y-(e.radius||16), life:420, ring:true, maxLife:420, maxR:18, color:L[1]}); }
        break;
      }
      case "burst": case "echo": {
        const R = boonRadius(fx, r, rec, AREA), amt = u*boonVal(fx.pct, r);
        const pts = boonAnchors(fx.at, rec, AREA);
        const go = ()=>{ for(const p of pts){
          for(const e of boonFoes(p.x, p.y, R)){
            boonHit(e, amt, c, fx.status, r, u);
            if(fx.knock && e.alive){ const dx = e.x-p.x, dy = e.y-p.y, l = Math.hypot(dx,dy)||1; seKnock(e, dx/l, dy/l, fx.knock, 200); }
          }
          boonFlash(p.x, p.y, R, L, 460);
        } };
        if(fx.t==="echo"){ for(const p of pts) particles.push({x:p.x, y:p.y, life:fx.delay||500, ring:true, maxLife:fx.delay||500, maxR:R*0.5, color:L[1]}); runLater(fx.delay||500, go); }
        else go();
        break;
      }
      case "shards": {
        const n = boonVal(fx.n, r), amt = u*boonVal(fx.pct, r);
        for(const p of boonAnchors(fx.at, rec, AREA)) for(let i=0;i<n;i++){
          const a = (i/n)*Math.PI*2 + Math.random()*0.2;
          projectiles.push({x:p.x, y:p.y-14, vx:Math.cos(a)*380, vy:Math.sin(a)*380, dmg:amt, life:560, radius:6, color:L[1], pierce:false, hitSet:new Set(), src:c});
        }
        break;
      }
      case "fan": {
        const n = boonVal(fx.n, r), amt = u*boonVal(fx.pct, r), base = Math.atan2(c.fy||0, c.fx||1);
        for(let i=0;i<n;i++){
          const k = Math.ceil((i+1)/2)*(i%2 ? -1 : 1), a = base + k*(fx.spread||0.25);
          projectiles.push({x:c.x, y:c.y-14, vx:Math.cos(a)*560, vy:Math.sin(a)*560, dmg:amt, life:720, radius:6, color:L[1], pierce:true, hitSet:new Set(), src:c});
        }
        break;
      }
      case "line": {
        const amt = u*boonVal(fx.pct, r), w = fx.w||40;
        for(const e of enemies){ if(e.alive && seSegDist(e.x, e.y, rec.x0, rec.y0, c.x, c.y) <= w + (e.radius||0)) boonHit(e, amt, c, fx.status, r, u); }
        particles.push({x:rec.x0, y:rec.y0-14, x2:c.x, y2:c.y-14, life:320, bolt:true, color:L[1]});
        break;
      }
      case "pull": {
        const px = boonVal(fx.px, r);
        for(const p of boonAnchors(fx.at, rec, AREA)){
          const R = boonRadius(fx, r, rec, AREA);
          for(const e of boonFoes(p.x, p.y, R)){ const dx = p.x-e.x, dy = p.y-e.y, l = Math.hypot(dx,dy); if(l < 20) continue; seKnock(e, dx/l, dy/l, Math.min(px, l-18), 250); }
          boonFlash(p.x, p.y, R, L, 520);
        }
        break;
      }
      case "ally": {
        for(const p of boonAnchors(fx.at, rec, AREA)){
          const R = fx.r ? boonVal(fx.r, r) : 220;
          for(const h of heroes){
            if(!h.alive || !!h.isDivineFoe !== !!c.isDivineFoe || Math.hypot(h.x-p.x, h.y-p.y) > R) continue;
            if(fx.shield){ h.shield = Math.max(h.shield||0, h.maxHp*boonVal(fx.shield, r)); h.shieldTimer = Math.max(h.shieldTimer||0, 6000); }
            if(fx.heal) h.hp = Math.min(h.maxHp, h.hp + h.maxHp*boonVal(fx.heal, r)*arenaRuleHealMult());
            particles.push({x:h.x, y:h.y, life:420, ring:true, maxLife:420, maxR:34, color:L[1]});
          }
          boonFlash(p.x, p.y, 50, L, 420);
        }
        break;
      }
    }
  }
}
// Esqueletos del Nigromante (killNigroSkeleton): los refuerzos "minion" estallan desde el propio
// esqueleto que cae (nunca desde cadáveres de enemigos).
function boonOnMinionDeath(owner, m){
  if(!owner || !owner.boons || !m || divinaMode) return;
  const list = [];
  for(const id in owner.boons){ const b = BOON_BY_ID[id]; if(b && b.minion && b.champ===owner.classKey) list.push({b, r:owner.boons[id]}); }
  if(!list.length) return;
  const POWER = masteryPowerMult(effectiveMasteryFor(owner.classKey, 0));
  const rec = {caster:owner, sk:CLASSES[owner.classKey].skills[0], list, x0:m.x, y0:m.y, px:m.x, py:m.y, hits:[], amt:0, n:0};
  const u = boonUnitDmg(owner, POWER)*0.6; // un esqueleto es un cuerpo chico: pega menos que una habilidad
  for(const {b, r} of list) boonRunFx(b, r, rec, u, 1);
}

/* ---------------- zonas en el piso (champFx "boonZone") ---------------- */
const BOON_ZONE_TICK = 250;
function boonZoneTick(f, dt){
  f.tickT += dt;
  while(f.tickT >= BOON_ZONE_TICK){
    f.tickT -= BOON_ZONE_TICK;
    const k = BOON_ZONE_TICK/1000, src = f.owner || player;
    for(const e of enemies){
      if(!e.alive || Math.hypot(e.x-f.x, e.y-f.y) > f.r + (e.radius||0)*0.5) continue;
      if(f.dps>0) damageEnemy(e, f.dps*k, {src, _boon:true, fromProc:true});
      if(!e.alive) continue;
      if(f.slow){ e.slowAmt = Math.max(e.slowAmt||0, f.slow); e.slowTimer = Math.max(e.slowTimer||0, 400); e.slowBy = src; }
      if(f.poison){ e.poisonTimer = Math.max(e.poisonTimer||0, 1200); e.poisonDmg = Math.max(e.poisonDmg||0, f.dps*0.4); }
      if(f.burn){ e.burnTimer = Math.max(e.burnTimer||0, 1200); e.burnDmg = Math.max(e.burnDmg||0, f.dps*0.4); e.burnSrc = src; }
      if(f.bleed){ e.bleedTimer = Math.max(e.bleedTimer||0, 1200); e.bleedDmg = Math.max(e.bleedDmg||0, f.dps*0.4); e.bleedSrc = src; }
    }
    if(f.heal>0) for(const h of heroes){
      if(!h.alive || !!h.isDivineFoe !== !!f.side || Math.hypot(h.x-f.x, h.y-f.y) > f.r) continue;
      h.hp = Math.min(h.maxHp, h.hp + h.maxHp*f.heal*k*arenaRuleHealMult());
    }
  }
  if(f.zap){
    f.zapT += dt;
    if(f.zapT >= f.zap.every){
      f.zapT = 0;
      const inside = enemies.filter(e=>e.alive && Math.hypot(e.x-f.x, e.y-f.y) <= f.r);
      if(inside.length){
        const t = inside[(Math.random()*inside.length)|0], L = BOON_LOOKS[f.look] || BOON_LOOKS.storm;
        damageEnemy(t, f.zap.dmg, {src:f.owner||player, _boon:true});
        particles.push({x:t.x+(Math.random()-0.5)*30, y:t.y-150, x2:t.x, y2:t.y-10, life:220, bolt:true, color:L[1]});
      }
    }
  }
}
// Dibujo pixel: mancha elíptica tenue + píxeles cuadrados que titilan + borde punteado.
function boonDrawZone(f){
  const L = BOON_LOOKS[f.look] || BOON_LOOKS.steel;
  const age = (f.maxLife||1) - f.life, a = Math.min(1, age/220, f.life/400);
  if(a <= 0) return;
  const t = (typeof runElapsedMs==="number" ? runElapsedMs : performance.now())/1000;
  ctx.save();
  ctx.globalAlpha = 0.18*a; ctx.fillStyle = L[0];
  ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r, f.r*0.62, 0, 0, Math.PI*2); ctx.fill();
  ctx.globalAlpha = 0.55*a; ctx.strokeStyle = L[1]; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -t*18;
  ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r, f.r*0.62, 0, 0, Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
  const n = Math.min(34, 10 + (f.r/6)|0), seed = f.seed||0;
  for(let i=0;i<n;i++){
    const ang = i*2.3999 + seed, dist = f.r*Math.sqrt(((i*37 + seed*13) % 100)/100);
    const x = Math.round(f.x + Math.cos(ang)*dist), y = Math.round(f.y + Math.sin(ang)*dist*0.62);
    const fl = 0.5 + 0.5*Math.sin(t*4 + i*1.7);
    ctx.globalAlpha = a*(0.35 + 0.55*fl); ctx.fillStyle = i%3 ? L[0] : L[1];
    const s = i%4===0 ? 4 : 3;
    ctx.fillRect(x - (s>>1), y - (s>>1) - (f.heal||f.look==="steam" ? Math.round(fl*4) : 0), s, s);
  }
  ctx.restore();
}
