"use strict";
/* ============================================================
   js/champions/asesino.js
   Asesino (clave interna "guerrero"): trampas, Pestilencia Sombría tras el sigilo.
   ============================================================ */

/* ============================================================
   TRAMPA DE ÁREA (Asesino)
   ============================================================ */
function updateTraps(dt){
  for(const tr of traps){
    tr.timer -= dt;
    if(tr.armTime>0) tr.armTime -= dt;
    tr.phase = (tr.phase||0) + dt;
    if(tr.triggered || tr.armTime>0) continue;
    for(const e of enemies){
      if(!e.alive) continue;
      if(distance(tr,e) <= tr.radius){ triggerTrap(tr, e); break; }
    }
  }
  traps = traps.filter(tr=>tr.timer>0 && !tr.triggered);
}

function triggerTrap(tr, firstEnemy){
  tr.triggered = true;
  if(tr.kind==="forest_root"){
    particles.push({x:tr.x,y:tr.y, life:420, ring:true, maxLife:420, maxR:tr.radius*1.3, color:"#4a7a2e"});
    const caster = tr.src;
    for(const e of enemies){
      if(!e.alive || distance(tr,e) > tr.radius) continue;
      const isBossRank = e.rank==="jefe" || e.rank==="subjefe";
      const isEliteRank = e.rank==="elite" || e.rank==="subelite";
      if(isBossRank){
        // Los jefes no se pueden inmovilizar del todo: solo un ralentizado fuerte.
        e.slowTimer = Math.max(e.slowTimer||0, tr.rootDur); e.slowAmt = Math.max(e.slowAmt||0, 0.55);
      } else if(isEliteRank){
        e.stunTimer = Math.max(e.stunTimer||0, tr.rootDur*0.45);
      } else {
        e.stunTimer = Math.max(e.stunTimer||0, tr.rootDur);
      }
      if(caster && caster.classKey==="cazadora"){
        if(e===firstEnemy) champSetOnTrapRoot(caster, e); // set La Manada: lo atrapado pasa a ser la Presa
        if(caster.huntTarget===e){ sylvaAddTrack(caster, e, 2); }
        caster.sylvaTrapBurstTimer = Math.max(caster.sylvaTrapBurstTimer||0, 2000);
        // Talento "Cacería Instantánea": activar una trampa durante Cacería Salvaje también
        // acorta el cooldown de las otras habilidades, igual que golpear a la Presa.
        if(caster.wildHuntTimer>0){
          const cdrMs = talentSkillMods(caster.classKey, "ult").flags.trapCdrBonusMs||0;
          if(cdrMs>0) for(let i=0;i<caster.cds.length;i++) caster.cds[i] = Math.max(0, (caster.cds[i]||0)-cdrMs);
        }
      }
    }
    return;
  }
  damageEnemy(firstEnemy, tr.dmg, {src:tr.src, stun:400});
  particles.push({x:tr.x,y:tr.y, life:420, ring:true, maxLife:420, maxR:tr.radius*1.4, color:"#8dffa0"});
  let hitList=[firstEnemy], cur=firstEnemy, curDmg=tr.dmg*0.75, px_=tr.x, py_=tr.y;
  for(let i=0;i<3 && cur;i++){
    particles.push({x:px_,y:py_, x2:cur.x, y2:cur.y, life:230, bolt:true, color:"#8dffa0"});
    let next=null, bd=Infinity;
    for(const e of enemies){
      if(!e.alive || hitList.includes(e)) continue;
      const d = distance(cur, e);
      if(d < tr.chainRadius && d<bd){ bd=d; next=e; }
    }
    if(!next) break;
    damageEnemy(next, curDmg, {src:tr.src});
    hitList.push(next); px_=cur.x; py_=cur.y; cur=next; curDmg*=0.8;
  }
}

/* ============================================================
   PESTILENCIA SOMBRÍA (golpe tras el sigilo del Asesino)
   ============================================================ */
function performShadowStrike(caster){
  const sk = caster.stealthSk || {};
  const t = nearestEnemyTo(caster, 280);
  if(!t){ caster.stealthSk = null; return; }
  const dmg = caster.baseDmg * runStats.dmgMult * (caster.buffDmgMult||1) * (sk.dmgMult||1);
  damageEnemy(t, dmg, {src:caster, forceCrit:true});
  damageEnemy(t, dmg, {src:caster, forceCrit:true});
  damageEnemy(t, dmg*(sk.finalMult||1.4), {src:caster, forceCrit:true});
  t.poisonTimer = sk.duration||3000; t.poisonDmg = dmg*(sk.poisonDmgMult||0.16);
  t.bleedTimer = Math.max(t.bleedTimer||0, sk.duration||3000); t.bleedDmg = Math.max(t.bleedDmg||0, dmg*(sk.bleedDmgMult||0.14));
  particles.push({x:t.x,y:t.y, life:420, ring:true, maxLife:420, maxR:52, color:"#8dffa0"});
  pushAsesinoFx("pestilencia", "emboscada", t.x, t.y, 100, 500, (t.x-caster.x)<0);
  if(caster===player) floatText(t.x, t.y-46, "¡PESTILENCIA!", "crit");
  // veneno encadenado a enemigos cercanos
  let hitList=[t], cur=t, curDmg=dmg*0.55, px_=caster.x, py_=caster.y;
  for(let i=0;i<3 && cur;i++){
    particles.push({x:px_,y:py_, x2:cur.x, y2:cur.y, life:250, bolt:true, color:"#8dffa0"});
    let next=null, bd=Infinity;
    for(const e of enemies){
      if(!e.alive || hitList.includes(e)) continue;
      const d = distance(cur, e);
      if(d < (sk.chainRadius||150) && d<bd){ bd=d; next=e; }
    }
    if(!next) break;
    damageEnemy(next, curDmg, {src:caster});
    next.poisonTimer = (sk.duration||3000)*0.85; next.poisonDmg = curDmg*0.14;
    pushAsesinoFx("pestilencia", "veneno", next.x, next.y, 60, 400, false);
    hitList.push(next); px_=cur.x; py_=cur.y; cur=next; curDmg*=0.75;
  }
  caster.stealthSk = null;
}

function drawTrap(tr){
  if(tr.kind==="forest_root" && SYLVA_TRAP_READY.f1){
    // Trampa del Bosque con su arte real (antes sin usar): crece en 4 etapas durante el
    // armado (200ms, antes esa ventana era directamente invisible) y queda en la última
    // pose mientras sigue activa, con el mismo fundido de salida que ya tenía el crosshair.
    const seq = ["f1","f2","f3","f4"];
    const growProgress = Math.max(0, Math.min(0.999, 1 - (tr.armTime||0)/200));
    const img = SYLVA_TRAP_IMG[seq[Math.floor(growProgress*seq.length)]];
    const fade = tr.timer < 1200 ? Math.max(0.2, tr.timer/1200) : 1;
    const s = 64/img.height;
    const clip = { frames: [{x:0, y:0, w:img.width, h:img.height}] };
    drawAnimFrameSized(img, clip, 0, tr.x, tr.y, img.width*s, img.height*s, 0.5, 0.85, false, fade);
    return;
  }
  if(tr.armTime>0) return; // invisible mientras se activa
  const now = performance.now()/1000;
  const pulse = 0.6+0.4*Math.sin(now*5);
  const fade = tr.timer < 1200 ? Math.max(0.2, tr.timer/1200) : 1;
  ctx.save();
  ctx.globalAlpha = fade*(0.55+0.25*pulse);
  ctx.translate(tr.x, tr.y);
  ctx.rotate(now*0.6);
  ctx.strokeStyle = "#7dffa0"; ctx.lineWidth = 2; ctx.shadowColor = "#7dffa0"; ctx.shadowBlur = 6;
  ctx.beginPath();
  for(let i=0;i<4;i++){
    const a = i*Math.PI/2;
    ctx.moveTo(0,0); ctx.lineTo(Math.cos(a)*14, Math.sin(a)*14);
  }
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0,-10); ctx.lineTo(10,0); ctx.lineTo(0,10); ctx.lineTo(-10,0); ctx.closePath();
  ctx.stroke();
  ctx.restore();
}
