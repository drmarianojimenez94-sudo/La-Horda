"use strict";
/* ============================================================
   js/arenas/abismo/ab-map.js
   ARENA DEL ABISMO — geometría de plataformas, estados (STABLE/CRACKED/CRITICAL/COLLAPSE), daño
   estructural, reconstrucción, empujes, CAÍDA (colgado del borde + rescate) y regla de seguridad.

   Reglas de seguridad (sin estados imposibles):
   - Una plataforma solo se derrumba si TODO lo que queda en pie sigue conectado a la entrada (h2)
     y queda al menos el 55 % del mapa. Si no, queda CRÍTICA ("la sostienen las runas").
   - La entrada (h2) nunca cae. Nunca se destruye terreno sano de un golpe: el daño estructural
     baja estados; el derrumbe siempre avisa (grietas, temblor, piedras que caen, sonido) ~1,7 s.
   - Caer no mata: el campeón queda COLGADO del borde (no puede soltarse solo) hasta que un compañero
     lo suba (acción contextual RESCATAR). Si se acaba el tiempo, cae y usa el sistema normal de
     muerte/revivir (su cuerpo queda en el borde, al alcance de los compañeros).
   - Caminar nunca tira a nadie: clamp() devuelve al borde. Solo cae lo que fue EMPUJADO.
   - Lo decide el anfitrión y viaja en abNetState(); el invitado solo anima.
   ============================================================ */
let abS = null;
let _abSpawnAt = null;
let _abNavSig = "";

function abNewState(){
  return {
    lv:1,
    p:AB_PLATS.map(()=>({hp:100, st:AB_ST.STABLE, t:0})),
    hang:[],                  // [{h: índice de héroe, t, dur, lx, ly, hx, hy}] (lo que se ve y la acción RESCATAR)
    rescue:[],                // objetivos de acción contextual (uno por colgado)
    zones:[],                 // zonas gravitatorias [{x,y,r,t,d,k}]
    lines:[],                 // filamentos del Tejedor [{x0,y0,x1,y1,t,d,o}]
    charges:[],               // trayectorias del Jinete (aviso) [{x0,y0,x1,y1,t,d}]
    chains:[],                // cadenas del Carcelero (dibujo) [{x0,y0,x1,y1,t,d,k}]
    hint:{t:22000, k:"", x:0, y:0, a:0},     // presencia de lo que vive debajo
    tremorT:18000,
    ca:{st:"none", t:0, x:0, y:0},           // Carcelero del Vacío
    mo:{st:"sleep", t:0, ph:1, eye:0, jaw:0, pat:"", patT:0, rb:0}, // El Que Mora Debajo
    orbs:[],                 // orbes del Heraldo [{x,y,vx,vy,tx,ty,t,life,dmg}]
    wave:null,               // onda del abismo (fase 3)
    shown:{}, voidKills:0
  };
}

/* ---------------- geometría (espacio plano) ---------------- */
function _abFlat(x, y){ return [x, y/AB_ASP]; }
function _abAngIn(a, a0, a1){ let d = a - a0; d = ((d % (Math.PI*2)) + Math.PI*2) % (Math.PI*2); return d <= a1 - a0; }
function abPlatContains(p, x, y, m){
  const fx = x, fy = y/AB_ASP;
  if(p.kind==="hub") return Math.hypot(fx - p.x, fy - p.y) <= p.r - m;
  if(p.kind==="ring"){
    const rr = Math.hypot(fx, fy); if(rr < p.r0 + m || rr > p.r1 - m) return false;
    const am = m/Math.max(40, rr);
    return _abAngIn(Math.atan2(fy, fx), p.a0 + am, p.a1 - am);
  }
  const dx = fx - p.x, dy = fy - p.y, c = Math.cos(p.rot), s = Math.sin(p.rot);
  const lx = dx*c + dy*s, ly = -dx*s + dy*c;
  return Math.abs(lx) <= p.hw - m && Math.abs(ly) <= p.hh - m;
}
// Proyección al punto más cercano de la plataforma (en mundo).
function abPlatProject(p, x, y, m){
  const fx = x, fy = y/AB_ASP; let px, py;
  if(p.kind==="hub"){
    const dx = fx - p.x, dy = fy - p.y, d = Math.hypot(dx, dy) || 1, R = Math.max(4, p.r - m);
    if(d <= R){ px = fx; py = fy; } else { px = p.x + dx/d*R; py = p.y + dy/d*R; }
  } else if(p.kind==="ring"){
    let rr = Math.hypot(fx, fy) || 1, a = Math.atan2(fy, fx);
    const am = m/Math.max(40, rr);
    rr = Math.max(p.r0 + m, Math.min(p.r1 - m, rr));
    if(!_abAngIn(a, p.a0 + am, p.a1 - am)){
      const lo = p.a0 + am, hi = p.a1 - am;
      const dlo = Math.abs(Math.atan2(Math.sin(a - lo), Math.cos(a - lo))), dhi = Math.abs(Math.atan2(Math.sin(a - hi), Math.cos(a - hi)));
      a = dlo < dhi ? lo : hi;
    }
    px = Math.cos(a)*rr; py = Math.sin(a)*rr;
  } else {
    const dx = fx - p.x, dy = fy - p.y, c = Math.cos(p.rot), s = Math.sin(p.rot);
    let lx = dx*c + dy*s, ly = -dx*s + dy*c;
    lx = Math.max(-(p.hw - m), Math.min(p.hw - m, lx)); ly = Math.max(-(p.hh - m), Math.min(p.hh - m, ly));
    px = p.x + lx*c - ly*s; py = p.y + lx*s + ly*c;
  }
  return {x:px, y:py*AB_ASP};
}
function abPlatCenter(p){
  if(p.kind==="ring"){ const a = (p.a0 + p.a1)/2, r = (p.r0 + p.r1)/2; return {x:Math.cos(a)*r, y:Math.sin(a)*r*AB_ASP}; }
  return {x:p.x, y:p.y*AB_ASP};
}
// ¿Pisable? (lo que cae todavía se pisa hasta que se va; lo que se reconstruye, todavía no)
function abPresent(i){ const st = abS ? abS.p[i].st : 0; return st <= AB_ST.FALLING; }
function abSolidAfter(i){ const st = abS ? abS.p[i].st : 0; return st <= AB_ST.CRITICAL; } // sigue en pie después del derrumbe en curso
function abPlatAt(x, y, m){
  for(let i=0;i<AB_PLATS.length;i++){ if(abPresent(i) && abPlatContains(AB_PLATS[i], x, y, m||0)) return i; }
  return -1;
}
function abWalkable(x, y, m){ return abPlatAt(x, y, m) >= 0; }
function abSafeAt(x, y){ for(let i=0;i<AB_PLATS.length;i++){ if(abS.p[i].st <= AB_ST.CRITICAL && abPlatContains(AB_PLATS[i], x, y, 0)) return true; } return false; }
const AB_EDGE = 8;
function abNearestGround(x, y, m){
  if(m===undefined) m = AB_EDGE;
  let best = null, bd = Infinity, bi = -1;
  for(let i=0;i<AB_PLATS.length;i++){
    if(!abPresent(i)) continue;
    const q = abPlatProject(AB_PLATS[i], x, y, m), d = (q.x-x)*(q.x-x) + (q.y-y)*(q.y-y);
    if(d < bd){ bd = d; best = q; bi = i; }
  }
  return best ? {x:best.x, y:best.y, i:bi, d:Math.sqrt(bd)} : {x:AB_MAP.start.x, y:AB_MAP.start.y, i:AB_ENTRY, d:0};
}
function abInside(x, y, m){ return abWalkable(x, y, m||0); }
function abNavBlocked(x, y){ return !abWalkable(x, y, 16); }

/* ---------------- conectividad y regla de seguridad ---------------- */
function abConnectedWithout(skip){
  const keep = i => i !== skip && abSolidAfter(i);
  const seen = new Uint8Array(AB_PLATS.length), q = [AB_ENTRY]; seen[AB_ENTRY] = 1;
  while(q.length){ const i = q.pop(); for(const j of AB_PLATS[i].nb){ if(!seen[j] && keep(j)){ seen[j] = 1; q.push(j); } } }
  let total = 0, reach = 0;
  for(let i=0;i<AB_PLATS.length;i++){ if(keep(i)){ total++; if(seen[i]) reach++; } }
  const minG = (abS && abS.mo.st==="fight") ? AB_CFG.morador.minGround : 0.55;   // con el jefe, más piso mínimo
  return {ok: reach === total && total >= Math.ceil(AB_PLATS.length*minG), total};
}
function abCanCollapse(i){
  const p = AB_PLATS[i];
  if(p.anchor) return false;
  return abConnectedWithout(i).ok;
}
function abComponentOf(i){ // plataformas alcanzables caminando desde i (para bots / enemigos)
  const seen = new Uint8Array(AB_PLATS.length); if(i < 0) return seen;
  const q = [i]; seen[i] = 1;
  while(q.length){ const k = q.pop(); for(const j of AB_PLATS[k].nb){ if(!seen[j] && abPresent(j)){ seen[j] = 1; q.push(j); } } }
  return seen;
}
function abReachable(a, b){
  const ia = abPlatAt(a.x, a.y, 0), ib = abPlatAt(b.x, b.y, 0);
  if(ia < 0 || ib < 0) return true;           // en el aire (colgado, saltando): no bloquea
  return !!abComponentOf(ia)[ib];
}

/* ---------------- estados y daño estructural ---------------- */
function abStOfHp(hp){ return hp >= 67 ? AB_ST.STABLE : (hp >= 34 ? AB_ST.CRACKED : AB_ST.CRITICAL); }
function abRuleStructMult(){ return 1 + 0.06*(typeof arenaRuleStacks==="function" ? arenaRuleStacks() : 0); }
// Daño estructural a UNA plataforma. o.cap: hp mínimo (el Devorador no derrumba: como mucho deja CRÍTICA).
function abDamagePlat(i, dmg, o){
  if(!abS || i < 0) return;
  const S = abS.p[i]; o = o || {};
  if(S.st >= AB_ST.FALLING) return;
  const before = S.st;
  S.hp -= dmg*abRuleStructMult();
  if(o.cap != null && S.hp < o.cap) S.hp = Math.max(o.cap, Math.min(S.hp + dmg, o.cap));
  // sin fuego amigo: lo que rompen los héroes nunca tira a un aliado (queda CRÍTICA mientras haya uno encima)
  if(o.heroSafe && S.hp <= 0 && heroes.some(h=>h.alive && !h.abHang && abPlatContains(AB_PLATS[i], h.x, h.y, -12))) S.hp = 1;
  if(S.hp <= 0){
    if(abCanCollapse(i)){ S.hp = 0; S.st = AB_ST.FALLING; S.t = 0; S.warn = o.warn || AB_CFG.plat.fallWarn; abOnFallStart(i); return; }
    S.hp = 1; S.held = runElapsedMs;   // la sostienen las runas (regla de seguridad)
  }
  S.st = abStOfHp(S.hp);
  if(S.st > before) abOnCrack(i, S.st);
}
// Daño estructural en un radio (habilidades con terrain, pisotones, tentáculos...).
function abDamageArea(x, y, r, dmg, o){
  if(!abS) return;
  for(let i=0;i<AB_PLATS.length;i++){
    if(!abPresent(i)) continue;
    const q = abPlatProject(AB_PLATS[i], x, y, 0);
    if(Math.hypot(q.x - x, q.y - y) <= r) abDamagePlat(i, dmg, o);
  }
}
function abOnCrack(i, st){
  const c = abPlatCenter(AB_PLATS[i]);
  if(inView(c.x, c.y, 200)){
    vfxBurst(c.x, c.y, st===AB_ST.CRITICAL ? 14 : 8, "rock", 120, 520, 3.5, 1, -30, 0);
    playSfx(st===AB_ST.CRITICAL ? "abCrackBig" : "abCrack");
  }
  if(st===AB_ST.CRITICAL) abTutSay("ab_crit", "Esa plataforma está CRÍTICA: tiembla y larga piedras. Un golpe más y se derrumba… con lo que esté arriba.", 7000);
}
function abOnFallStart(i){
  const c = abPlatCenter(AB_PLATS[i]);
  playSfx("abRumble"); vfxShake(4);
  vfxBurst(c.x, c.y, 18, "rock", 150, 700, 4, 2, 40, 0);
  vfxTelegraph({shape:0, x:c.x, y:c.y, r:AB_PLATS[i].kind==="hub" ? AB_PLATS[i].r : 110, dur:abS.p[i].warn || AB_CFG.plat.fallWarn, rgb:"200,80,255"});
  abTutSay("ab_fall", "¡Se DERRUMBA! El borde rojo late cada vez más rápido: salí de esa plataforma… o dejá a la horda encima.", 6000);
}
function abOnGone(i){
  const p = AB_PLATS[i], c = abPlatCenter(p);
  playSfx("abCollapse"); vfxShake(7);
  if(typeof ABISMO_FX!=="undefined" && ABISMO_FX.abMorPlat) bossSheetFx("abMorPlat", c.x, c.y, 150, 900, {anchorY:0.6});
  vfxBurst(c.x, c.y, 26, "rock", 180, 900, 4.5, 2, 90, 0);
  // lo que estaba arriba cae
  for(const h of heroes){
    if(!h.alive || h.abHang) continue;
    if(abPlatContains(p, h.x, h.y, -6) && abPlatAt(h.x, h.y, -10) < 0) abHangStart(h);   // pegado al borde de otra plataforma: se salva (clamp lo sube)
  }
  for(const e of enemies){
    if(!e.alive || e.structure || e.rank==="jefe" || e.rank==="subjefe") continue;
    if(abPlatContains(p, e.x, e.y, -4) && abPlatAt(e.x, e.y, 0) < 0) abEnemyFall(e, e._kbBy || null);
  }
  abS.dirty = 1;
}
function abRebuildAll(heal){
  if(!abS) return;
  for(let i=0;i<AB_PLATS.length;i++){
    const S = abS.p[i];
    if(S.st === AB_ST.GONE || S.st === AB_ST.FALLING){ S.st = AB_ST.REBUILD; S.t = 0; }
    else if(S.st < AB_ST.FALLING && heal){ S.hp = Math.min(100, S.hp + heal); S.st = abStOfHp(S.hp); }
  }
}
function abRebuildOne(i){ const S = abS.p[i]; if(S.st === AB_ST.GONE){ S.st = AB_ST.REBUILD; S.t = 0; } }
function abPlatsUpdate(dt){
  for(let i=0;i<AB_PLATS.length;i++){
    const S = abS.p[i];
    if(S.st === AB_ST.FALLING){
      S.t += dt;
      const c = abPlatCenter(AB_PLATS[i]);
      if(Math.random() < dt/120 && inView(c.x, c.y, 200)) vfxBurst(c.x + (Math.random()-0.5)*120, c.y + (Math.random()-0.5)*50, 3, "rock", 60, 500, 3, 0, 70, 0);
      if(S.t >= (S.warn || AB_CFG.plat.fallWarn)){ S.st = AB_ST.GONE; S.t = 0; abOnGone(i); }
    } else if(S.st === AB_ST.REBUILD){
      S.t += dt;
      if(S.t >= AB_CFG.plat.rebuildMs){
        S.st = AB_ST.STABLE; S.hp = 100; S.t = 0; abS.dirty = 1;
        const c = abPlatCenter(AB_PLATS[i]);
        if(inView(c.x, c.y, 200)){ vfxBurst(c.x, c.y, 12, "arcane", 110, 600, 3, 1, -40, 0); playSfx("abRebuild"); }
        // nadie queda "adentro" de la piedra: lo que estuviera ahí (enemigo en el aire) no importa
      }
    } else if(S.st === AB_ST.CRITICAL){
      const c = abPlatCenter(AB_PLATS[i]);
      if(Math.random() < dt/700 && inView(c.x, c.y, 160)) vfxBurst(c.x + (Math.random()-0.5)*100, c.y + (Math.random()-0.5)*40, 2, "rock", 40, 520, 2.5, 0, 60, 0);
    }
  }
}

/* ---------------- empujes (con caída al vacío) ---------------- */
// Empujón suave (dura ~180 ms): mientras dura, el borde NO frena; si termina afuera, se cae.
function abShove(ent, dx, dy, dist, by){
  if(!ent) return;
  if(ent.cls){ if(ent.abHang || !ent.alive) return; }
  else if(!ent.alive || ent.structure || ent.rank==="jefe" || ent.rank==="subjefe") return;
  const heavy = ent.type==="ab_devorador" ? 0.35 : (ent.type==="ab_jinete" ? 0.5 : 1);
  const d = Math.hypot(dx, dy) || 1, k = dist*heavy*(ent.cls ? (1 - (typeof heroCcResist==="function" ? heroCcResist(ent) : 0)) : 1);
  const ms = 180;
  ent._abKb = {vx:dx/d*k/(ms/1000), vy:dy/d*k/(ms/1000), t:ms};
  ent._abKbT = runElapsedMs + AB_CFG.kb.kbWindow; ent._kbBy = by || ent._kbBy;
}
function abShoveUpdate(ent, dt){
  const K = ent._abKb; if(!K) return;
  const q = Math.min(dt, K.t);
  ent.x += K.vx*q/1000; ent.y += K.vy*q/1000; K.t -= dt;
  if(K.t <= 0) ent._abKb = null;
}
function _abPushed(ent){
  if(ent._abKbT && ent._abKbT > runElapsedMs) return true;
  if(!ent.cls && ent._kbAt != null && runElapsedMs - ent._kbAt < AB_CFG.kb.kbWindow) return true;   // empujes de habilidades (damageEnemy knockback/pull)
  return false;
}
function abClamp(ent){
  if(!ent || !abS) return;
  if(ent.abHang){ ent.x = ent.abHang.hx; ent.y = ent.abHang.hy; return; }
  if(ent.abFall) return;
  // bots: no vuelven a pisar una plataforma que se está derrumbando (se quedan en el último piso firme)
  if(ent.cls && ent!==player && !ent.isRemote && !ent._abKb && !ent.abHook){
    if(abSafeAt(ent.x, ent.y)){ ent._abSafeX = ent.x; ent._abSafeY = ent.y; }
    else if(ent._abSafeX!==undefined && abPlatAt(ent.x, ent.y, 0) >= 0 && abSafeAt(ent._abSafeX, ent._abSafeY)){ ent.x = ent._abSafeX; ent.y = ent._abSafeY; }
  }
  const B = AB_MAP.bounds;
  if(ent.flying || ent.abNoClamp || ent.rank==="jefe"){ ent.x = Math.max(B.x0, Math.min(B.x1, ent.x)); ent.y = Math.max(B.y0, Math.min(B.y1, ent.y)); return; }
  if(abWalkable(ent.x, ent.y, AB_EDGE)) return;
  const n = abNearestGround(ent.x, ent.y, AB_EDGE);
  const guest = typeof netIsGuest==="function" && netIsGuest();
  if(!guest && n.d > (ent.cls ? AB_CFG.kb.heroFallTol : AB_CFG.kb.fallTol) && _abPushed(ent) && !(ent.rank==="subjefe" || ent.structure)){
    if(ent.cls){ if(ent.alive && !(ent.invulnTimer > 0 && !ent._abKb && !ent.abHook)) { abHangStart(ent, n); return; } }
    else if(ent.alive){ abEnemyFall(ent, ent._kbBy || null); return; }
  }
  // empujón / arrastre en curso: el borde no frena (se decide al pasar la tolerancia o al terminar)
  if(!guest && (ent._abKb || ent.abHook) && n.d < 80) return;
  ent.x = n.x; ent.y = n.y;
}

/* ---------------- enemigos al vacío ---------------- */
function abEnemyFall(e, by){
  if(!e.alive || e.abFall) return;
  e.abFall = {t:0};
  abS.voidKills = (abS.voidKills||0) + 1;
  if(typeof abFallerAdd==="function") abFallerAdd(e);
  if(inView(e.x, e.y, 120)){ floatText(e.x, e.y - (e.radius||20)*2, "¡AL VACÍO!", "crit"); vfxBurst(e.x, e.y, 10, "arcane", 90, 700, 3, 1, 120, 0); }
  playSfx("abFallEnemy");
  const src = (by && by.alive!==false) ? by : (heroes.find(h=>h.alive) || player);
  const hp = e.hp; e.dmgTakenMult = 1;
  damageEnemy(e, hp*20 + 999, {src, fromProc:true, critChanceOverride:0});
  if(e.alive){ e.alive = false; e.hp = 0; }
  if(src && src.stats) src.stats.voidKills = (src.stats.voidKills||0) + 1;
  if(abS.voidKills === 1) abTutSay("ab_void", "¡Lo tiraste al vacío! Empujar a la horda por el borde es la mejor arma de esta arena.", 7000);
}

/* ---------------- colgado del borde + rescate ---------------- */
function abHangStart(h, n){
  if(!h.alive || h.abHang) return;
  n = n || abNearestGround(h.x, h.y, AB_EDGE);
  // punto del borde (en el piso) y dónde queda colgando (un poco hacia afuera)
  const dx = h.x - n.x, dy = h.y - n.y, d = Math.hypot(dx, dy) || 1;
  const hx = n.x + dx/d*18, hy = n.y + dy/d*18 + 8;
  const dur = (h===player || h.isRemote) ? AB_CFG.hang.humanMs : AB_CFG.hang.ms;   // las personas tienen un poco más de margen
  h.abHang = {t:0, dur, lx:n.x, ly:n.y, hx, hy};
  h.x = hx; h.y = hy; h._abKb = null; h._ctxHold = null;
  const idx = heroes.indexOf(h);
  abS.hang.push({h:idx, t:0, dur, lx:Math.round(n.x), ly:Math.round(n.y), hx:Math.round(hx), hy:Math.round(hy)});
  const inner = abNearestGround(n.x, n.y, 30);   // un poco adentro del borde: la grilla de navegación de los bots llega
  abS.rescue.push({id:"abr"+idx+"_"+Math.round(runElapsedMs), kind:"ab_rescue", x:Math.round(inner.x), y:Math.round(inner.y), r:AB_CFG.hang.rescueR, dur:AB_CFG.hang.rescueMs, prog:0, h:idx});
  playSfx("abHang");
  if(h===player || h.isRemote) floatText(h.x, h.y - 60, "¡COLGADO!", "crit");
  abTutSay("ab_hang", "¡Quedó COLGADO del borde! Un compañero tiene que acercarse y mantener RESCATAR. (Solo si no queda nadie en pie, se trepa solo… y tarda.)", 8000);
}
function abHangUpdate(dt){
  for(let k=abS.hang.length-1;k>=0;k--){
    const H = abS.hang[k], h = heroes[H.h];
    H.t += dt;
    if(!h || !h.alive || !h.abHang){ abS.hang.splice(k, 1); _abRescueDrop(H.h); continue; }
    h.abHang.t = H.t; h.x = H.hx; h.y = H.hy;
    // regla de seguridad: si NADIE puede rescatarlo (todos colgados o caídos, o juega solo), trepa solo, más lento
    const helper = heroes.some(o=>o!==h && o.alive && !o.abHang);
    if(!helper || H.solo > 0){ H.solo = (H.solo||0) + dt; if(H.solo >= AB_CFG.hang.soloClimbMs){ abRescue(h, null, true); continue; } }
    if(H.t >= H.dur){ abS.hang.splice(k, 1); _abRescueDrop(H.h); abHangFall(h, H); }
  }
}
function _abRescueDrop(idx){ abS.rescue = abS.rescue.filter(r=>r.h !== idx); }
function abHangFall(h, H){
  h.abHang = null;
  h.x = H.lx; h.y = H.ly;           // el cuerpo queda en el borde: los compañeros pueden revivirlo
  playSfx("abFallHero");
  vfxBurst(H.hx, H.hy, 14, "arcane", 110, 800, 3.5, 2, 140, 0);
  h.hp = 0;
  if(h===player){ onPlayerDeath(); }
  else { h.alive = false; showBanner(`${h.cls.name} cayó al vacío`); }
}
function abRescue(h, by, solo){
  const H = abS.hang.find(o=>heroes[o.h]===h); if(!H) return;
  abS.hang = abS.hang.filter(o=>o!==H); _abRescueDrop(H.h);
  h.abHang = null;
  // se sube un poco hacia adentro del borde
  const dx = H.lx - H.hx, dy = H.ly - H.hy, d = Math.hypot(dx, dy) || 1;
  h.x = H.lx + dx/d*26; h.y = H.ly + dy/d*26;
  const n = abNearestGround(h.x, h.y, AB_EDGE + 4); h.x = n.x; h.y = n.y;
  h.invulnTimer = Math.max(h.invulnTimer||0, AB_CFG.hang.riseInvuln);
  vfxBurst(h.x, h.y - 20, 10, "holy", 90, 500, 3, 2, -40, 0);
  playSfx("abRescue");
  floatText(h.x, h.y - 64, solo ? "¡SE TREPÓ!" : "¡RESCATADO!", "heal");
  if(by && by.stats) by.stats.alliesSaved = (by.stats.alliesSaved||0) + 1;
}
CTX_KINDS.ab_rescue = {
  label:"RESCATAR", icon:"🤝", color:"#e8c8ff", farOk:true, maxBots:1, pointer:()=>true, decay:0.2,
  canUse:(h, t)=>!h.abHang && heroes[t.h] !== h,
  onComplete:(t, users)=>{ const h = heroes[t.h]; if(h) abRescue(h, users[0]); },
  botWorth:(h, t)=>(heroes[t.h] && heroes[t.h] !== h && !h.abHang) ? 9 : 0
};

/* ---------------- aparición: por los portales del vacío (hubs con portal) y trepando por los bordes ---------------- */
function abMinHeroDist(x, y){ let d = Infinity; for(const h of heroes){ if(h.alive){ const q = Math.hypot(h.x-x, h.y-y); if(q < d) d = q; } } return d; }
function abRand(a, b){ return a + Math.random()*(b - a); }
function abPick(a){ return a[(Math.random()*a.length)|0]; }
function abPlaceSpawn(e, atBoss){
  if(_abSpawnAt){ e.x = _abSpawnAt.x; e.y = _abSpawnAt.y; abClamp(e); return; }
  if(atBoss || e.rank==="jefe" || e.rank==="subjefe") return;
  const cands = [];
  for(let i=0;i<AB_PLATS.length;i++){
    const p = AB_PLATS[i]; if(!abSolidAfter(i)) continue;
    if(!(p.kind==="hub" || (p.kind==="ring" && runLevel >= 3))) continue;
    const c = abPlatCenter(p), dm = abMinHeroDist(c.x, c.y);
    if(dm < 420) continue;
    cands.push({x:c.x, y:c.y, w:(p.portal ? 3 : 1)*(dm < 1400 ? 1 : 0.4), i});
  }
  let q = null;
  if(cands.length){ let tot = 0; for(const c of cands) tot += c.w; let r = Math.random()*tot; for(const c of cands){ r -= c.w; if(r <= 0){ q = c; break; } } q = q || cands[0]; }
  else { const h = abPick(heroes.filter(o=>o.alive)) || player; const n = abNearestGround(h.x + (Math.random()-0.5)*700, h.y + (Math.random()-0.5)*500, 20); q = {x:n.x, y:n.y}; }
  e.x = q.x + (Math.random()-0.5)*60; e.y = q.y + (Math.random()-0.5)*40;
  abClamp(e);
  // brota: los que vienen "de abajo" trepan por el borde (Acechador, Tejedor) o salen del portal
  e.abEmerge = 520;
  if(inView(e.x, e.y, 160)) vfxBurst(e.x, e.y, 6, "arcane", 70, 500, 3, 0, -30, 1);
}
function abSpawnAt(type, x, y){ _abSpawnAt = {x, y}; const e = spawnEnemy(type, false); _abSpawnAt = null; return e; }

/* ---------------- temblores programados (eventos del Abismo) ---------------- */
function abTremorUpdate(dt){
  const C = AB_CFG.tremor;
  if(runLevel < C.fromLevel || bossActive || runEnding || levelClearing || abS.ca.st==="fight") return;
  abS.tremorT -= dt;
  if(abS.tremorT > 0) return;
  const tier = runLevel <= 4 ? 0 : (runLevel <= 7 ? 1 : 2);
  abS.tremorT = C.everyMs[tier]*(0.8 + Math.random()*0.4);
  // plataformas candidatas: sin héroes encima (el temblor no castiga por estar parado), no la entrada
  const n = runLevel <= 5 ? C.n[0] : C.n[1];
  const pool = [];
  for(let i=0;i<AB_PLATS.length;i++){
    if(!abSolidAfter(i) || AB_PLATS[i].anchor) continue;
    const c = abPlatCenter(AB_PLATS[i]);
    if(heroes.some(h=>h.alive && abPlatContains(AB_PLATS[i], h.x, h.y, -10))) continue;
    // prefiere donde hay horda
    let w = 1; for(const e of enemies){ if(e.alive && Math.hypot(e.x - c.x, e.y - c.y) < 200) w += 1; }
    pool.push({i, w});
  }
  playSfx("abRumble"); vfxShake(3);
  for(let k=0;k<n && pool.length;k++){
    let tot = 0; for(const p of pool) tot += p.w; let r = Math.random()*tot, pick = pool[0];
    for(const p of pool){ r -= p.w; if(r <= 0){ pick = p; break; } }
    pool.splice(pool.indexOf(pick), 1);
    abDamagePlat(pick.i, abRand(C.dmg[0], C.dmg[1]));
  }
  if(!abS.shown.tremor){ abS.shown.tremor = 1; showBanner("🕳 El Abismo tiembla… las ruinas se agrietan"); }
}

/* ---------------- navegación (se rearma cuando cambia el mapa) ---------------- */
function abGeomSig(){ let s = ""; for(let i=0;i<AB_PLATS.length;i++) s += abPresent(i) ? "1" : "0"; return s; }
function abNavMaybe(){
  const sig = abGeomSig();
  if(sig !== _abNavSig){ _abNavSig = sig; aidNavBuild(); }
}

/* ---------------- guía (Hechicero) ---------------- */
function abTutSay(key, text, ms, urgent){
  if(!player || typeof tutSay!=="function" || tutSeen(key)) return;
  tutSay(key, text, null, ms || 6500, urgent);
}
