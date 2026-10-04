"use strict";
/* ============================================================
   js/arenas/hielo/hie-boss.js
   BOSS IDENTITY — EL MAGO GÉLIDO (2º Guardián) → DEMONIO GÉLIDO.
   REGLA: EL CLIMA ES SU ARMA. REFUGIATE DEL FRÍO Y ROMPÉ SUS FOCOS.
   - En toda la pelea el frío aprieta más (quedarse quieto enfría más rápido). Los BRASEROS son los
     refugios; el frío solo nunca congela (máx. 2 cargas de escarcha): congelar lo terminan sus golpes.
   - GRAN HELADA (firma del Mago): canaliza el invierno. Congela el brasero encendido más cercano a
     él (aviso de 1,2 s; nunca el último) y levanta 3 FOCOS DE HIELO en el anillo exterior. Mientras
     canaliza: ESCUDO (menos daño) y la tormenta enfría aun moviéndose: hay que refugiarse junto al
     fuego o romper los focos. Cada foco roto debilita el escudo; los 3 rotos INTERRUMPEN el clima y el
     Mago queda EXPUESTO. Si termina el canal, INVIERNO ETERNO: quien esté fuera de un brasero recibe
     un golpe helado (menor cuantos menos focos queden).
   - DEMONIO GÉLIDO (2ª forma): CORAZA DE ESCARCHA (recibe menos daño) salvo junto a un brasero
     encendido, donde SE DERRITE (recibe más). Si lo dejan pegado al fuego unos segundos, lo apaga con
     las alas: hay que volver a encenderlo (acción contextual o cualquier fuego).
   - ANTI-KITE: si todo el equipo se aleja, la ventisca los persigue (golpes marcados donde están).
     ANTI-FACETANK: Nova de Hielo / Ventisca / Alas de Ventisca (salen de él).
   Todo lo decide el anfitrión; HIE.storm viaja en hieNetState y los campos del jefe con el enemigo.
   ============================================================ */
const HIE_BOSS = { baseCold:1.5, ghFirst:9000, ghCd:[21000, 25000], ghMs:7000, foci:3, fociR:560, fociHp:0.035,
                   shield:[0.45, 0.6, 0.78], snuffWarn:1200, exposeMs:5200, exposeMult:1.7, winterMult:1.1,
                   demonShield:0.75, demonMelt:1.4, meltR:210, snuffMs:4500, kiteR:620, kiteMs:4000 };
Object.assign(ENEMY_BASE, {
  foco_hielo: {name:"Foco de Hielo", rank:"subelite", hp:60, dmg:0, speed:0, radius:26, xp:6, gold:2, scale:2.2, color:"#bfe8ff", ranged:false, structure:true, noDivina:true}
});
function hieBossMago(){ return enemies.find(e=>e.alive && e.type==="mago_hielo_cristal") || null; }
function hieBossDemon(){ return enemies.find(e=>e.alive && e.type==="angel_caido_hielo") || null; }
function hieFoci(){ return enemies.filter(e=>e.alive && e.type==="foco_hielo"); }
function hieBossClear(){
  for(const f of enemies) if(f.alive && f.type==="foco_hielo"){ f.alive = false; f.hp = 0; vfxBurst(f.x, f.y - 30, 10, "ice", 120, 500, 3, 1, -40, 0); }
  HIE.storm = 0; HIE.bossCold = 1;
  if(HIE.gh){ const m = hieBossMago(); if(m && m._spd0){ m.speed = m._spd0; m._spd0 = 0; } }
  HIE.gh = null;
}
// Se llama desde hieUpdate (anfitrión).
function hieBossRule(dt){
  if(!bossActive){ if(HIE.gh || HIE.storm) hieBossClear(); return; }
  const mago = hieBossMago(), demon = hieBossDemon();
  if(!mago && !demon){ if(HIE.gh || HIE.storm) hieBossClear(); return; }
  HIE.bossCold = HIE_BOSS.baseCold;
  if(mago) hieMagoRule(mago, dt);
  else { if(HIE.gh || HIE.storm){ hieBossClear(); HIE.bossCold = HIE_BOSS.baseCold; } hieDemonRule(demon, dt); }
  const b = mago || demon;
  // ANTI-KITE: la ventisca persigue a quien se aleja
  if(bossHeroesFarMs(b, HIE_BOSS.kiteR, dt) > HIE_BOSS.kiteMs){
    b._kiteMs = 0;
    for(const h of heroes){
      if(!h.alive || Math.hypot(h.x - b.x, h.y - b.y) < HIE_BOSS.kiteR) continue;
      bossStrike(h.x, h.y, 115, 1100, b.dmg*0.9, "ice", {slow:0.45, slowDur:1600, frost:1});
    }
    showBanner("La ventisca te persigue: no podés escaparle al invierno");
    playSfx("hieChill");
  }
}
function hieMagoRule(e, dt){
  const C = HIE_BOSS, G = HIE.gh || (HIE.gh = {st:"idle", t:0, cd:C.ghFirst});
  G.t += dt;
  if(G.st==="idle"){
    e._encMult = 1; e._encTag = null; HIE.storm = 0;
    if(!(e._expT > 0)) G.cd -= dt;
    if(G.cd <= 0 && !e.bossWind && !(e.stunTimer > 0)) hieGranHelada(e);
    return;
  }
  // canalizando la GRAN HELADA
  const foci = hieFoci(), n = foci.length;
  e._encMult = C.shield[Math.max(0, C.foci - Math.max(1, n))] || C.shield[0];
  e._encTag = `GRAN HELADA · ${n} FOCO${n===1 ? "" : "S"} (−${Math.round((1 - e._encMult)*100)}%)`;
  if(!n){                                                       // ¡focos rotos! el clima se corta
    hieGranHeladaEnd(e);
    bossExpose(e, C.exposeMs, C.exposeMult, "¡ROMPISTE LOS FOCOS! El invierno se corta: el Mago queda EXPUESTO");
    if(typeof bossArenaEvent==="function") bossArenaEvent("mago_hielo_cristal.focos", e);
    return;
  }
  if(G.t >= C.ghMs){                                            // INVIERNO ETERNO
    const k = n/C.foci;
    for(const h of heroes){
      if(!h.alive) continue;
      if(hieNearLit(h.x, h.y)){ if(h===player) floatText(h.x, h.y - 50, "¡A salvo junto al fuego!", "heal"); continue; }
      bossHitHero(h, e.dmg*C.winterMult*(0.4 + 0.6*k), {from:e, frost:n >= 2 ? 2 : 1, slow:0.5, slowDur:1800});
    }
    flashScreen(0.4, "200,235,255"); vfxShake(10); playSfx("hieChill");
    showBanner("❄ INVIERNO ETERNO ❄");
    hieGranHeladaEnd(e);
  }
}
function hieGranHelada(e){
  const C = HIE_BOSS, G = HIE.gh;
  G.st = "cast"; G.t = 0; HIE.storm = 1;
  e._spd0 = e.speed || e._spd0; e.speed = 0;
  bossSheetPack(e, "canal", C.ghMs); bossSheetFx("bsMagoRune", e.x, e.y + 4, e.radius*3, 1200, {grow:0.3});
  bossAnnounce(e, "GRAN HELADA", "refugiate junto a un brasero o rompé los 3 FOCOS");
  showBanner("❄ ¡GRAN HELADA! Rompé los FOCOS DE HIELO o refugiate junto al fuego");
  if(typeof tutSay==="function" && !tutSeen("hie_gh")) tutSay("hie_gh", "La Gran Helada enfría aunque te muevas. Quedate junto a un BRASERO encendido o rompé los 3 FOCOS DE HIELO: si caen todos, el Mago queda expuesto.", null, 10000, true);
  playSfx("hieChill"); vfxShake(5);
  // congela el brasero encendido más cercano a él (nunca el último)
  const lit = HIE.br.filter(b=>b.lit);
  if(lit.length >= 2){
    let tb = lit[0]; for(const b of lit) if(Math.hypot(b.x - e.x, b.y - e.y) < Math.hypot(tb.x - e.x, tb.y - e.y)) tb = b;
    vfxTelegraph({shape:0, r:HIE_CFG.warmR, x:tb.x, y:tb.y, dur:C.snuffWarn, rgb:"160,220,255"});
    runLater(C.snuffWarn, ()=>{
      if(state!=="playing" || !tb.lit || HIE.br.filter(b=>b.lit).length < 2) return;
      tb.lit = false; tb.done = false; tb.prog = 0; tb.fuel = 0;
      if(typeof bossArenaEvent==="function") bossArenaEvent("mago_hielo_cristal.brasero", e);
      vfxBurst(tb.x, tb.y - 34, 18, "ice", 140, 700, 3, 1, -50, 0); playSfx("hieOut");
      showBanner("¡El Mago congela un brasero! Volvé a encenderlo");
    });
  }
  // tres focos en el anillo exterior, lejos de él
  const a0 = Math.atan2(e.y, e.x) + Math.PI;
  for(let i=0;i<C.foci;i++){
    const a = a0 + (i - 1)*2.1, p = {x:Math.cos(a)*C.fociR*1.1, y:Math.sin(a)*C.fociR*0.8, radius:30}; clampToArena(p);
    const f = spawnEnemy("foco_hielo", false, false);
    f.x = p.x; f.y = p.y; f._ax = p.x; f._ay = p.y; f.encStatic = true; f.structure = true;
    f.maxHp = f.hp = Math.max(40, Math.round(e.maxHp*C.fociHp)); f.speed = 0; f.fx = 0; f.fy = 1;
    vfxTelegraph({shape:0, r:70, x:p.x, y:p.y, dur:600, rgb:"170,225,255"});
    bossSheetFx("bsAngelPillar", p.x, p.y, 120, 700, {anchorY:0.95, grow:0.2});
  }
}
function hieGranHeladaEnd(e){
  const C = HIE_BOSS, G = HIE.gh;
  for(const f of enemies) if(f.alive && f.type==="foco_hielo"){ f.alive = false; f.hp = 0; vfxBurst(f.x, f.y - 30, 12, "ice", 140, 600, 3, 1, -50, 0); }
  G.st = "idle"; G.t = 0; G.cd = C.ghCd[0] + Math.random()*(C.ghCd[1] - C.ghCd[0]);
  HIE.storm = 0; e._encMult = 1; e._encTag = null;
  if(e._spd0){ e.speed = e._spd0; e._spd0 = 0; }
}
function hieDemonRule(e, dt){
  const C = HIE_BOSS;
  if(e._expT > 0){ e._encMult = 1; e._encTag = null; return; }
  let near = null, nd = C.meltR + e.radius;
  for(const b of HIE.br){ if(!b.lit) continue; const d = Math.hypot(b.x - e.x, b.y - e.y); if(d < nd){ nd = d; near = b; } }
  if(near){
    e._encMult = C.demonMelt; e._encTag = "¡SE DERRITE JUNTO AL FUEGO!";
    if(!e._hieNearFire){ e._hieNearFire = 1; if(typeof bossArenaEvent==="function") bossArenaEvent("angel_caido_hielo.fuego", e); }
    e._meltMs = (e._meltMs||0) + dt;
    if(Math.random() < dt/120) vfxBurst(e.x, e.y - e.radius, 2, "steam", 60, 500, 3, 1, -40, 0);
    if(e._meltMs >= C.snuffMs){
      e._meltMs = 0;
      near.lit = false; near.done = false; near.prog = 0; near.fuel = 0;
      if(typeof bossArenaEvent==="function") bossArenaEvent("angel_caido_hielo.apaga", e);
      bossSheetPack(e, "wing", 800); vfxBurst(near.x, near.y - 34, 20, "ice", 160, 700, 3, 1, -50, 0);
      playSfx("hieOut"); vfxShake(6);
      showBanner("¡El Demonio apaga el brasero con sus alas! Encendé otro y llevalo al fuego");
    }
  } else {
    e._meltMs = Math.max(0, (e._meltMs||0) - dt); e._hieNearFire = 0;
    e._encMult = C.demonShield; e._encTag = `CORAZA DE ESCARCHA −${Math.round((1 - C.demonShield)*100)}% · llevalo al FUEGO`;
  }
  if(typeof tutSay==="function" && !tutSeen("hie_demon")) tutSay("hie_demon", "La CORAZA DE ESCARCHA del Demonio se derrite junto a un BRASERO encendido: peleale al lado del fuego.", null, 9000, true);
}
// bots: los focos primero; con el Demonio, mantener braseros encendidos
function hieBossBotTarget(h, range){
  if(!bossActive) return null;
  let best = null, bs = -Infinity;
  for(const e of enemies){
    if(!e.alive) continue;
    const d = Math.hypot(e.x - h.x, e.y - h.y); if(d > range + 300) continue;
    let s = -Infinity;
    if(e.type==="foco_hielo") s = 620 - d*0.3;
    else if((e.type==="mago_hielo_cristal" || e.type==="angel_caido_hielo") && e._expT > 0) s = 700 - d*0.1;
    if(s > bs){ bs = s; best = e; }
  }
  return best;
}
{
  const bw = CTX_KINDS.hie_brazier.botWorth;
  CTX_KINDS.hie_brazier.botWorth = (h, b)=>{
    if(bossActive && hieBossDemon() && HIE.br.filter(x=>x.lit).length < 2) return 3;
    return bw(h, b);
  };
}
// cuerpo del foco: la aguja de cristal (arte del Ángel) con el cristal del Mago flotando encima
function hieDrawEnemyBody(e){
  if(e.type!=="foco_hielo") return false;
  const P = VFX_SPR_EXTRA.bsAngelPillar, K = VFX_SPR_EXTRA.bsMagoCrystal, t = animNow/1000;
  const q = e.maxHp ? e.hp/e.maxHp : 1;
  _hieGlow(e.x, e.y - 40, 70 + 10*Math.sin(t*5 + e.x), "150,215,255", 0.45);
  const base = P && P.imgs[1], top = K && K.imgs[Math.floor(t*6) % K.imgs.length];
  if(base && base.complete && base.naturalWidth){ const h = 118, w = base.width*h/base.height; ctx.drawImage(base, e.x - w/2, e.y - h*0.95, w, h); }
  if(top && top.complete && top.naturalWidth){ const h = 50, w = top.width*h/top.height, y = e.y - 150 + Math.sin(t*3 + e.y)*6; ctx.globalAlpha = 0.6 + 0.4*q; ctx.drawImage(top, e.x - w/2, y - h/2, w, h); ctx.globalAlpha = 1; }
  return true;
}
function _hieGlow(x, y, r, rgb, a){
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r*2, r*2);
}
// haces de cada foco hacia el Mago mientras canaliza + halo de derretido del Demonio
function hieBossDrawTop(){
  const m = hieBossMago(), t = animNow/1000;
  if(m) for(const f of enemies){
    if(!f.alive || f.type!=="foco_hielo") continue;
    ctx.save(); ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(120,190,255,0.35)"; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(f.x, f.y - 150); ctx.lineTo(m.x, m.y - 60); ctx.stroke();
    ctx.strokeStyle = `rgba(230,248,255,${0.6 + 0.3*Math.sin(t*10 + f.x)})`; ctx.lineWidth = 3; ctx.setLineDash([14, 12]); ctx.lineDashOffset = t*80; ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  }
}
BOSS_CLEANUP_EXTRA.push(()=>{ if(currentArena==="hielo" && typeof HIE!=="undefined") hieBossClear(); });
Object.assign(ARENA_EXT.hielo, { botTarget:hieBossBotTarget, drawEnemyBody:hieDrawEnemyBody });
{
  const dt0 = ARENA_EXT.hielo.drawTop;
  ARENA_EXT.hielo.drawTop = function(){ dt0.apply(this, arguments); hieBossDrawTop(); };
  const up0 = ARENA_EXT.hielo.update;
  ARENA_EXT.hielo.update = function(dt){ hieBossRule(dt); up0.apply(this, arguments); };
}
