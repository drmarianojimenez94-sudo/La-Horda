"use strict";
/* ============================================================
   js/systems/build-powers.js
   LEGENDARIOS QUE CAMBIAN LA BUILD (BUILD_POWERS / BUILD_LEGENDARIES, js/data/legendaries.js).
   Sirven a cualquier guardián: cuelgan de lo que tienen todos (golpe básico, habilidades 1-3,
   definitiva, bajas y golpes recibidos). Mismos ganchos que los poderes legendarios y míticos
   (item-procs.js los llama); todo corre en la simulación (anfitrión o partida sola).
     bp_twin_cast   Eco Gemelo          — la habilidad 1 se lanza dos veces; enfriamiento +40%.
     bp_basic_nova  Cataclismo          — cada 5.º básico, nova alrededor del objetivo.
     bp_crit_chain  Rayo Cautivo        — el crítico salta a 4 enemigos.
     bp_comet       Cometa              — caminar carga una explosión que suelta la próxima habilidad.
     bp_thorns      Espino Negro        — espinas a quien te pega + furia por golpe recibido.
     bp_last_breath Último Aliento      — sobrevivir a un golpe mortal (cada 60 s) y robar vida 5 s.
     bp_cd_on_kill  Reloj del Condenado — cada baja acorta los enfriamientos.
     bp_ult_battery Última Palabra      — definitiva ×2 de carga; habilidades 1-3 +25% de enfriamiento.
     bp_magnet      Imán Hambriento     — cada 5 s atrae a la horda cercana y te escuda.
     bp_prism       Alquimia Loca       — cada golpe aplica fuego, hielo o rayo al azar.
   Todos tienen tope o enfriamiento interno; ninguno daña a aliados (sin fuego amigo).
   ============================================================ */
const BUILD_CFG = {
  twinPower: 0.6, twinDelay: 350, twinCdMult: 1.4,
  novaEvery: 5, novaR: 110, novaPct: 1.5,
  chainJumps: 4, chainR: 210, chainPct: 0.7, chainCd: 260,
  cometMax: 100, cometPerPx: 0.12, cometMin: 20, cometR: 135, cometPct: 3.0,
  thornsPct: 1.2, thornsHitPct: 0.4, thornsCd: 180, thornsFuryPct: 0.06, thornsFuryMax: 5, thornsFuryMs: 4000,
  breathCd: 60000, breathInvuln: 2000, breathLeechMs: 5000, breathLeech: 0.25,
  cdKill: 400, cdKillBig: 3000,
  ultCharge: 2, ultSkillCdMult: 1.25,
  magnetEvery: 5000, magnetR: 240, magnetShieldPer: 0.03, magnetShieldMax: 0.30,
  prismCd: 300
};
// Qué poder de build lleva cada guardián equipado: {bp_x:1}. Caché por cuadro (el de passiveSum).
function heroBuildPowers(champKey){
  if(!champKey || !save || !save.champions[champKey]) return null;
  const c = _passiveBucket(champKey);
  if(!c.builds){
    c.builds = {};
    EQUIP_SLOT_TYPES.forEach(type=>{ const k = itemBuildPower(equippedItem(champKey, type)); if(k) c.builds[k] = 1; });
  }
  return c.builds;
}
function itemBuildPower(it){
  if(!it) return null;
  const k = it.buildPower || (it.designId && DESIGNED_ITEMS[it.designId] && DESIGNED_ITEMS[it.designId].buildPower);
  return k && BUILD_POWERS[k] ? k : null;
}
function _bp(h, key){ if(!h || !h.classKey) return false; const b = heroBuildPowers(h.classKey); return !!(b && b[key]); }
function _bpBase(h){ return h.baseDmg * runStats.dmgMult * (h.buffDmgMult||1); }
const _bpBig = e => e.rank==="jefe" || e.rank==="subjefe";
function _bpSay(h, txt){ if(h===player && typeof floatText==="function") floatText(h.x, h.y-58, txt, "crit"); }

/* ---------------- lectura desde las fórmulas ---------------- */
// Daño (itemDamageMult): furia del Espino Negro.
function buildDamageMult(h, e){
  if(!(h._bpFury > 0) || !_bp(h, "bp_thorns")) return 1;
  return 1 + BUILD_CFG.thornsFuryPct*h._bpFury;
}
// Carga de la definitiva (combat.js → damageEnemy).
function buildUltChargeMult(h){ return _bp(h, "bp_ult_battery") ? BUILD_CFG.ultCharge : 1; }

/* ---------------- al golpear ---------------- */
function buildOnHit(h, e, dmg, crit, opts){
  if(!e.alive || !h.classKey) return;
  const B = heroBuildPowers(h.classKey); if(!B) return;
  const C = BUILD_CFG;
  // Último Aliento: mientras dura, tus golpes te curan
  if(h._bpLeechT > 0 && B.bp_last_breath){ const before = h.hp; h.hp = Math.min(h.maxHp, h.hp + dmg*C.breathLeech*arenaRuleHealMult()); if(h===player && h.hp-before > h.maxHp*0.03 && _procFx(h, "bpleech", 400)) floatText(h.x, h.y-34, "+"+Math.round(h.hp-before), "heal"); }
  // Cataclismo: cada 5.º básico, nova alrededor del objetivo
  if(opts.fromBasic && B.bp_basic_nova){
    h._bpNovaN = (h._bpNovaN||0) + 1;
    if(h._bpNovaN >= C.novaEvery){
      h._bpNovaN = 0;
      const x = e.x, y = e.y, d = _bpBase(h)*C.novaPct;
      for(const o of enemies){ if(o.alive && Math.hypot(o.x-x, o.y-y) < C.novaR + (o.radius||20)*0.5) damageEnemy(o, d, {src:h, fromProc:true, knockback:true}); }
      vfxShock(x, y, 12, C.novaR, "255,190,90", 380, h===player?2:1);
      vfxBurst(x, y, 10, "rock", 150, 380, 3.5, h===player?2:1, -20, 0);
      if(h===player){ vfxShake(3); playSfx("heavy"); }
      h._bpNovas = (h._bpNovas||0) + 1;
    }
  }
  // Rayo Cautivo: el crítico salta
  if(crit && B.bp_crit_chain && _procReady(h, "bpchain", C.chainCd)){
    let cur = e, px = e.x, py = e.y - 14; const hit = [e];
    for(let i=0;i<C.chainJumps;i++){
      let next = null, bd = C.chainR;
      for(const o of enemies){ if(!o.alive || hit.includes(o)) continue; const d = Math.hypot(o.x-cur.x, o.y-cur.y); if(d < bd){ bd = d; next = o; } }
      if(!next) break;
      pushChainBolt(px, py, next.x, next.y-10, 22, 300);
      damageEnemy(next, _bpBase(h)*C.chainPct, {src:h, fromProc:true});
      hit.push(next); px = next.x; py = next.y - 14; cur = next;
    }
    if(hit.length > 1) vfxBurst(e.x, e.y-14, 5, "shock", 100, 240, 2.5, h===player?1:0, -20, 1);
  }
  // Alquimia Loca: un elemento al azar por golpe (con enfriamiento por enemigo)
  if(B.bp_prism && runElapsedMs - (e._bpPrismAt||-1e9) > C.prismCd){
    e._bpPrismAt = runElapsedMs;
    const k = (Math.random()*3)|0, base = _bpBase(h);
    if(k===0){ e.burnTimer = Math.max(e.burnTimer||0, 2400); e.burnDmg = Math.max(e.burnDmg||0, base*0.2); e.burnSrc = h; if(inView(e.x, e.y, 0)) vfxBurst(e.x, e.y-14, 4, "ember", 80, 280, 2.5, 0, -40, 1); }
    else if(k===1){ e.slowAmt = Math.max(e.slowAmt||0, 0.3); e.slowTimer = Math.max(e.slowTimer||0, 1500); e.slowBy = h; if(inView(e.x, e.y, 0)) vfxBurst(e.x, e.y-14, 4, "ice", 80, 300, 2.5, 0, -20, 1); }
    else { e.shockedTimer = Math.max(e.shockedTimer||0, 1200); if(!_bpBig(e)) e.stunTimer = Math.max(e.stunTimer||0, 150); if(inView(e.x, e.y, 0)) vfxBurst(e.x, e.y-14, 4, "shock", 90, 240, 2.5, 0, -20, 1); }
    h._bpPrismN = (h._bpPrismN||0) + 1;
  }
}

/* ---------------- al matar ---------------- */
function buildOnKill(h, e){
  if(!_bp(h, "bp_cd_on_kill") || !h.cds) return;
  const big = _bpBig(e) || e.rank==="elite" || !!e.eliteName;
  const cut = big ? BUILD_CFG.cdKillBig : BUILD_CFG.cdKill;
  for(let i=0;i<h.cds.length;i++) if(h.cds[i] > 0) h.cds[i] = Math.max(0, h.cds[i] - cut);
  h._bpCdCut = (h._bpCdCut||0) + cut;
  if(big && _procFx(h, "bpclock", 600)){ vfxShock(h.x, h.y-10, 8, 40, "190,160,255", 300, h===player?1:0); _bpSay(h, "-3 s"); }
}

/* ---------------- al lanzar ---------------- */
const BUILD_TWIN_BLOCK = MYTH_ECHO_BLOCK; // lo mismo que no repite el Eco del Vacío (desplazamientos, invocaciones, canalizaciones)
function buildOnCast(h, sk, isUlt){
  if(!h.classKey || h._bpTwinning) return;
  const B = heroBuildPowers(h.classKey); if(!B) return;
  const C = BUILD_CFG;
  const idx = !isUlt && h.cls && h.cls.skills ? h.cls.skills.indexOf(sk) : -1;
  // Cometa: la carga acumulada caminando se suelta con la habilidad
  if(B.bp_comet && (h._bpComet||0) >= C.cometMin){
    const k = Math.min(1, h._bpComet/C.cometMax), R = C.cometR, d = _bpBase(h)*C.cometPct*k;
    for(const o of enemies){ if(o.alive && Math.hypot(o.x-h.x, o.y-h.y) < R + (o.radius||20)*0.5) damageEnemy(o, d, {src:h, fromProc:true, burn:true}); }
    vfxShock(h.x, h.y, 16, R, "255,140,50", 420, h===player?2:1);
    vfxBurst(h.x, h.y-10, 18, "ember", 200, 460, 3.5, h===player?2:1, -40, 0);
    if(h===player){ vfxShake(k > 0.8 ? 6 : 3); playSfx("boom"); }
    h._bpComet = 0; h._bpCometReady = false; h._bpComets = (h._bpComets||0) + 1;
  }
  // Enfriamientos (se aplican sobre lo que ya calculó useSkill / la IA, antes de este gancho)
  if(idx >= 0 && h.cds && h.cds[idx] > 0){
    let m = 1;
    if(B.bp_twin_cast && idx===0) m *= C.twinCdMult;
    if(B.bp_ult_battery) m *= C.ultSkillCdMult;
    if(m !== 1){ h.cds[idx] *= m; if(h.cdTotal) h.cdTotal[idx] = h.cds[idx]; }
  }
  // Eco Gemelo: la habilidad 1 se repite
  if(B.bp_twin_cast && idx===0 && !BUILD_TWIN_BLOCK[sk.kind]){
    runLater(C.twinDelay, ()=>{
      if(!h.alive || state!=="playing") return;
      const b = h.buffDmgMult||1;
      h.buffDmgMult = b*C.twinPower; h._bpTwinning = true;
      try{ vfxBurst(h.x, h.y-20, 8, "arcane", 120, 320, 3, h===player?1:0, -20, 1); castAbility(h, sk, false, 0); }
      finally{ h.buffDmgMult = b; h._bpTwinning = false; }
      h._bpTwins = (h._bpTwins||0) + 1;
      if(h===player && _procReady(h, "bptwinmsg", 3000)) _bpSay(h, "ECO GEMELO");
    });
  }
}

/* ---------------- al recibir daño ---------------- */
function buildOnHurt(h, dmg, src){
  if(!_bp(h, "bp_thorns")) return;
  const C = BUILD_CFG;
  h._bpFury = Math.min(C.thornsFuryMax, (h._bpFury||0) + 1); h._bpFuryT = C.thornsFuryMs;
  const foe = src && src.maxHp && src.alive ? src : (src && src.from && src.from.maxHp && src.from.alive ? src.from : null);
  if(!foe || !enemies.includes(foe) || Math.hypot(foe.x-h.x, foe.y-h.y) > 520 || !_procReady(h, "bpthorns", C.thornsCd)) return;
  damageEnemy(foe, _bpBase(h)*C.thornsPct + dmg*C.thornsHitPct, {src:h, fromProc:true, bleed:true, bleedDur:2000});
  vfxBurst(foe.x, foe.y-14, 6, "blood", 110, 300, 3, h===player?1:0, -20, 0);
  h._bpThorns = (h._bpThorns||0) + 1;
}
// Golpe mortal (champ-shared.js → heroPreventDeath): el Último Aliento lo evita cada 60 s.
function buildPreventDeath(h){
  if(!_bp(h, "bp_last_breath")) return false;
  if(h._bpBreathAt !== undefined && runElapsedMs - h._bpBreathAt < BUILD_CFG.breathCd) return false;
  h._bpBreathAt = runElapsedMs;
  h.hp = 1; h.invulnTimer = Math.max(h.invulnTimer||0, BUILD_CFG.breathInvuln); h._bpLeechT = BUILD_CFG.breathLeechMs;
  vfxShock(h.x, h.y-10, 12, 80, "255,235,170", 560, 2); vfxBurst(h.x, h.y-30, 16, "holy", 120, 600, 3, 2, -40, 0);
  _bpSay(h, "¡ÚLTIMO ALIENTO!");
  if(h===player) playSfx("ult");
  return true;
}

/* ---------------- por cuadro ---------------- */
function updateBuildPowers(h, dt){
  if(h._bpFuryT > 0){ h._bpFuryT -= dt; if(h._bpFuryT <= 0) h._bpFury = 0; }
  if(h._bpLeechT > 0) h._bpLeechT -= dt;
  if(!h.alive || !h.classKey) return;
  const B = heroBuildPowers(h.classKey); if(!B) return;
  const C = BUILD_CFG;
  // Cometa: la distancia caminada carga
  if(B.bp_comet){
    const px = h._bpPx === undefined ? h.x : h._bpPx, py = h._bpPy === undefined ? h.y : h._bpPy;
    const moved = Math.hypot(h.x-px, h.y-py); h._bpPx = h.x; h._bpPy = h.y;
    if(moved > 0 && moved < 60) h._bpComet = Math.min(C.cometMax, (h._bpComet||0) + moved*C.cometPerPx);
    if(h._bpComet >= C.cometMax && !h._bpCometReady){ h._bpCometReady = true; _bpSay(h, "¡COMETA CARGADO!"); vfxShock(h.x, h.y-10, 6, 34, "255,140,50", 300, h===player?1:0); }
    if(h._bpComet >= C.cometMin && inView(h.x, h.y, 0) && Math.random() < 0.08 + 0.25*(h._bpComet/C.cometMax))
      vfxBurst(h.x + (Math.random()-0.5)*24, h.y - 6 - Math.random()*20, 1, "ember", 20, 420, 2, 0, -30, 1);
  }
  // Imán Hambriento: cada 5 s, tirón y escudo
  if(B.bp_magnet){
    h._bpMagT = (h._bpMagT === undefined ? C.magnetEvery : h._bpMagT) - dt;
    if(h._bpMagT <= 0){
      h._bpMagT = C.magnetEvery;
      let n = 0;
      for(const o of enemies){
        if(!o.alive || _bpBig(o) || o.encStatic || o.immobile) continue;
        const d = Math.hypot(o.x-h.x, o.y-h.y); if(d > C.magnetR || d < 40) continue;
        const k = (d - 44)/d; o.x -= (o.x-h.x)*k*0.75; o.y -= (o.y-h.y)*k*0.75;
        try{ clampToArena(o); if(typeof resolveWallCollision==="function") resolveWallCollision(o); }catch(err){}
        o.stunTimer = Math.max(o.stunTimer||0, 250); n++;
      }
      if(n){
        const cap = h.maxHp*C.magnetShieldMax;
        h.shield = Math.min(Math.max(h.shield||0, cap), (h.shield||0) + h.maxHp*C.magnetShieldPer*n);
        h.shieldTimer = Math.max(h.shieldTimer||0, 4000);
        vfxShock(h.x, h.y, 14, C.magnetR, "160,170,200", 380, h===player?2:1);
        vfxBurst(h.x, h.y-10, 8, "spirit", 90, 360, 2.5, h===player?1:0, 0, 2);
        h._bpPulls = (h._bpPulls||0) + n;
      }
    }
  }
}
