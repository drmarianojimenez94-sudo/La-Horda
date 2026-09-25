"use strict";
/* ============================================================
   js/core/update.js
   update(dt): la simulación de un cuadro (movimiento, IA de enemigos, oleadas,
   colisiones, efectos por tiempo, jefes...). Se llama una vez por frame desde el loop.
   ============================================================ */

function update(dt){
  if(state!=="playing") return;
  runElapsedMs += dt;
  vfxFrame(dt);
  vfxUpdate(dt);
  // Musashi — Último Duelo: se procesa para los 4 héroes SIEMPRE, antes que cualquier otro
  // corte por aturdimiento/muerte de updateAllies (que hace "continue" en esos casos y nunca
  // llegaría a decrementar el temporizador del duelo si viviera adentro de ese bucle).
  for(const h of heroes) updateLastDuel(h, dt);
  updateMusashiFx(dt);
  updateBossSkillWorld(dt);
  for(const h of heroes){ updateSylvaMomentum(h, dt); updateSylvaWolf(h, dt); }
  for(const h of heroes){ updateNigromanteSkeletons(h, dt); updateNigromanteGolem(h, dt); updateNigromanteDemonForm(h, dt); }
  updateArenaHazards(dt);
  updateAcuaCurrent(dt);
  updateAcuaAmbience(dt);
  aidNavUpdate(dt); aidAmbUpdate(dt);
  if(axiomForceQuitFlash>0){
    axiomForceQuitFlash -= dt;
    canvas.style.filter = "invert(1)";
    if(axiomForceQuitFlash<=0) canvas.style.filter = "";
  }
  if(axiomFreezeTimer>0){
    axiomFreezeTimer -= dt;
    if(axiomFreezeTimer<=0){
      // Force Quit: recién ahora, al terminar el congelamiento, "la realidad se cae encima"
      // de quien haya quedado cerca de Axiom -no al momento de lanzarla-.
      const pend = axiomForceQuitPending;
      if(pend && axiomFreezeCaster && axiomFreezeCaster.alive){
        const c = axiomFreezeCaster;
        for(const e of enemies){
          if(!e.alive) continue;
          if(distance(c,e) <= pend.radius){
            const isBoss = e.rank==="jefe" || e.rank==="subjefe" || e.rank==="elite";
            damageEnemy(e, isBoss ? pend.dmg*(pend.eliteMult||1) : pend.dmg, {src:c});
          }
        }
        particles.push({x:c.x,y:c.y, life:420, ring:true, maxLife:420, maxR:pend.radius, color:"#4dffe6"});
        drawAxiomVfxBurst(c.x, c.y, "forcequit");
        if(c===player) showBanner("¡FORCE QUIT!");
      }
      axiomForceQuitPending = null;
      axiomFreezeCaster = null;
    }
  }
  if(screenShake>0) screenShake = Math.max(0, screenShake - dt*0.03);
  if(divinaMode){
    updateDivinaEnemies(dt);
    updateDivinaMinions(dt);
    updateDivinaStructuresCombat(dt);
    updateDivinaStructProjectiles(dt);
    divinaWaveTimer -= dt;
    if(divinaWaveTimer<=0){ divinaWaveTimer = DIVINA_WAVE_INTERVAL; spawnDivinaWave(); }
  }

  // player movement
  player.moving = false;
  if(Math.hypot(joyVec.x,joyVec.y) > 0.08){
    facing = {x:joyVec.x, y:joyVec.y};
    const l = Math.hypot(facing.x,facing.y); facing.x/=l; facing.y/=l;
    player.fx = facing.x; player.fy = facing.y;
    const spd = player.baseSpeed * runStats.speedMult * (1-Math.min(0.8,player.slowAmt||0)) * (player.stunTimer>0?0:1) * ((axiomFreezeTimer>0 && axiomFreezeCaster!==player)?0:1) * (player.fused?0:1) * (player.sylvaCharging?0.55:1);
    player.x += joyVec.x*spd*dt/1000;
    player.y += joyVec.y*spd*dt/1000;
    clampToArena(player);
    resolveWallCollision(player);
    player.moving = !player.fused;
    player.animT += dt;
  }
  if(player.attackAnim>0) player.attackAnim -= dt;
  if(player.hurtTimer>0) player.hurtTimer -= dt;
  if(basicHeld) triggerBasic(player);

  // timers
  player.basicCd = Math.max(0, player.basicCd-dt);
  for(let i=0;i<3;i++) player.cds[i] = Math.max(0, player.cds[i]-dt);
  player.ultCd = Math.max(0, player.ultCd-dt);
  player.energy = Math.min(player.maxEnergy, player.energy + player.cls.energyRegen*runStats.energyRegenMult*arenaMods().heroEnergyRegenMult*dt/1000);
  if(player.shieldTimer>0){ player.shieldTimer-=dt; if(player.shieldTimer<=0) player.shield=0; }
  if(player.stats) sampleTankPresence(player, dt);
  if(player.buffTimer>0){ player.buffTimer-=dt; if(player.buffTimer<=0){ player.buffDmgMult=1; player.buffAtkSpeedMult=1; player.buffLifesteal=0; player.buffDefMult=1; player.buffBleedOnHit=false; player.spinDurationMult=1; player.colossalTimer=0; if(player.pendingHpBonus){ player.maxHp-=player.pendingHpBonus; player.hp=Math.min(player.hp,player.maxHp); player.pendingHpBonus=0; } } }
  if(player.furyArmorTimer>0){
    player.furyArmorTimer -= dt;
    if(Math.random()<0.55) particles.push({x:player.x+(Math.random()-0.5)*22, y:player.y-8+(Math.random()-0.5)*12, vx:(Math.random()-0.5)*14, vy:-16-Math.random()*12, life:320, color:Math.random()<0.5?"#c62828":"#1a1414"});
    if(player.furyArmorTimer<=0 && player.furyFinalSlash){ triggerFuryFinalSlash(player); player.furyFinalSlash=false; }
  }
  if(player.berserkTimer>0) player.berserkTimer -= dt;
  if(player.dashFxTimer>0) player.dashFxTimer -= dt;
  if(player.burnTimer>0){ player.burnTimer-=dt; damageHero(player, player.burnDmg*dt/1000); }
  if(player.colossalTimer>0) player.colossalTimer -= dt;
  if(player.growTimer>0){ player.growTimer -= dt; if(player.growTimer<=0) player.growScale=1; }
  if(player.atkAuraTimer>0) player.atkAuraTimer -= dt;
  if(player.shieldAuraTimer>0) player.shieldAuraTimer -= dt;
  if(player.sigilTimer>0) player.sigilTimer -= dt;
  if(player.stealthTimer>0){
    player.stealthTimer -= dt;
    if(player.stealthTimer<=0 && player.stealthPending){ player.stealthPending=false; performShadowStrike(player); }
  }
  if(player.spinTimer>0){
    player.spinTimer -= dt; player.spinTick -= dt;
    if(player.spinTick<=0){
      player.spinTick = player.spinTickInterval;
      for(const e of enemies){
        if(!e.alive) continue;
        if(distance(player,e) <= player.spinRadius) damageEnemy(e, player.spinDmg, {src:player});
      }
      for(let i=0;i<4;i++) particles.push({x:player.x+(Math.random()-0.5)*24, y:player.y+(Math.random()-0.5)*24, vx:0, vy:-14, life:220, color:"#9fe3ff"});
    }
  }
  if(player.stormTimer>0){
    player.stormTimer -= dt; player.stormTick -= dt;
    // Armadura de fuego: aura de brasas constante mientras dura el Cataclismo (cosmético;
    // el bonus real de defensa ya se aplicó como buff al lanzar la habilidad)
    if(Math.random()<0.5) particles.push({x:player.x+(Math.random()-0.5)*20, y:player.y-10+(Math.random()-0.5)*10, vx:(Math.random()-0.5)*10, vy:-18-Math.random()*10, life:340, color:"#ff8a3d"});
    // Campo de hielo: cristales que emergen del suelo dentro del área
    if(Math.random()<0.10){
      const ca=Math.random()*Math.PI*2, cr=Math.random()*player.stormRadius;
      particles.push({x:player.x+Math.cos(ca)*cr, y:player.y+Math.sin(ca)*cr*0.55, life:700, maxLife:700, crystal:true, size:7+Math.random()*6, angle:Math.random()*Math.PI, color:"#bfe8ff"});
    }
    // 2ª y 3ª nova de hielo del Cataclismo, repartidas en el tiempo
    if(player.stormNovaLeft>0){
      player.stormNovaTimer -= dt;
      if(player.stormNovaTimer<=0){
        player.stormNovaTimer = player.stormNovaInterval;
        player.stormNovaLeft--;
        for(const e of enemies){
          if(!e.alive) continue;
          if(distance(player,e) <= player.stormRadius) damageEnemy(e, player.stormNovaDmg, {slow:player.stormNovaFreeze, slowDur:player.stormNovaFreezeDur, src:player});
        }
        frostNovaVFX(player, player.stormRadius*0.85, 8); // la ulti siempre se ve al máximo nivel visual
      }
    }
    if(player.stormTick<=0){
      player.stormTick = player.stormTickInterval;
      const near = enemies.filter(e=>e.alive && distance(player,e)<=player.stormRadius);
      if(near.length){
        const target = near[(Math.random()*near.length)|0];
        damageEnemy(target, player.stormDmg, {src:player, slow:0.3, slowDur:900});
        pushChainBolt(target.x, target.y-180, target.x, target.y, 30, 360);
        pushSpark("impacto", target.x, target.y, 60, 320);
        target.electrifiedTimer = 420; target.electrifiedSize = 60;
      }
    }
  }
  if(player.regenTimer>0){ player.regenTimer-=dt; player.hp = Math.min(player.maxHp, player.hp + (player.regenPerSec||0)*dt/1000); }
  if(player.stunTimer>0) player.stunTimer-=dt;
  if(player.slowTimer>0){ player.slowTimer-=dt; if(player.slowTimer<=0) player.slowAmt=0; }
  if(player.invulnTimer>0) player.invulnTimer-=dt;
  if(player.teleportChargeTimer>0){
    player.teleportChargeTimer -= dt;
    if(player.teleportChargeTimer<=0 && player.teleportChargesBanked<player.teleportChargeMax){
      player.teleportChargesBanked++;
      player.teleportChargeTimer = player.teleportChargesBanked<player.teleportChargeMax ? TELEPORT_CHARGE_RECHARGE_MS : 0;
    }
  }
  // La Profeta — Danza del Presagio: si deja pasar demasiado tiempo sin conectar un básico,
  // pierde las cargas de Presagio acumuladas (ver PROFETA_COMBO_WINDOW_MS en triggerBasic).
  if(player.presagioComboTimer>0){ player.presagioComboTimer-=dt; if(player.presagioComboTimer<=0) player.presagioCharges=0; }
  if(player.comboTimer>0){ player.comboTimer-=dt; if(player.comboTimer<=0) player.comboCharges=0; }
  if(player.ghostStepCritTimer>0) player.ghostStepCritTimer-=dt;
  if(player.profetaSpinFxTimer>0) player.profetaSpinFxTimer-=dt;
  // Visión del Inmortal: al terminar la inmunidad que ella concedió, una pequeña regeneración
  // (reusa los mismos regenTimer/regenPerSec genéricos que ya aplica cualquier otro heal-over-time).
  if(player.visionImmortalTimer>0){ player.visionImmortalTimer-=dt; if(player.visionImmortalTimer<=0){ player.regenTimer=Math.max(player.regenTimer||0,2000); player.regenPerSec=player.maxHp*(player.visionImmortalRegenPct||0.05); } }
  // Ascensión del Elegido: mientras dura, sus cooldowns quedan pisados a un mínimo casi nulo
  // cuadro a cuadro (así una habilidad ya en curso de enfriamiento también se ve beneficiada,
  // no solo las que se lancen después). El resto del empoderamiento (daño/velocidad/defensa/
  // robo de vida) usa los buffDmgMult/buffAtkSpeedMult/buffDefMult/buffLifesteal de siempre y
  // se revierte solo, junto con esto, cuando buffTimer llega a 0 (ver más arriba).
  if(player.ascensionTimer>0){
    player.ascensionTimer -= dt;
    player.cds[0]=Math.min(player.cds[0],60); player.cds[1]=Math.min(player.cds[1],60); player.cds[2]=Math.min(player.cds[2],60); player.ultCd=Math.min(player.ultCd,60);
    if(player.ascensionTimer<=0) player.ascensionMaxTimer=0;
  }
  // Mientras está fusionada con el aliado (invisible/invulnerable), su posición sigue a la de
  // él cuadro a cuadro; al terminar la fusión (stealthTimer llega a 0) vuelve a responder a
  // sus propios controles justo donde haya quedado el aliado.
  if(player.ascensionFusedWith){
    if(player.stealthTimer>0 && player.ascensionFusedWith.alive){ player.x=player.ascensionFusedWith.x; player.y=player.ascensionFusedWith.y; }
    else { player.ascensionFusedWith=null; player.fused=false; }
  }

  // enemies
  for(const e of enemies){
    if(!e.alive) continue;
    if(axiomFreezeTimer>0){ continue; } // Force Quit: nadie salvo Axiom actúa mientras dura
    if(e.stunTimer>0){ e.stunTimer-=dt; e.channel = null; e.bossCharge = null; continue; } // aturdir interrumpe canalizaciones/embestidas
    if(e.slowTimer>0) e.slowTimer-=dt; else e.slowAmt=0;
    if(e.burnTimer>0){ e.burnTimer-=dt; e.hp -= e.burnDmg*dt/1000; if(e.hp<=0){ killEnemy(e); continue; } }
    if(e.bleedTimer>0){ e.bleedTimer-=dt; e.hp -= e.bleedDmg*dt/1000; if(e.hp<=0){ killEnemy(e); continue; } }
    if(e.poisonTimer>0){ e.poisonTimer-=dt; e.hp -= e.poisonDmg*dt/1000; if(e.hp<=0){ killEnemy(e); continue; } }
    if(e.curseTimer>0){
      e.curseTimer -= dt; e.hp -= (e.curseDmg||0)*dt/1000;
      if(e.curseTimer<=0){ e.curseTimer=0; e.cursed=false; e.curseDefTakenMult=1; }
      if(e.hp<=0){ killEnemy(e); continue; } // el contagio ya se dispara adentro de killEnemy
    }
    if(e.hitFlash>0) e.hitFlash -= dt;
    if(e.electrifiedTimer>0) e.electrifiedTimer -= dt;
    if(arenaMods().enemyRegenPct && e.hp<e.maxHp){ e.hp = Math.min(e.maxHp, e.hp + e.maxHp*arenaMods().enemyRegenPct*dt/1000); }
    if(e.attackAnim>0) e.attackAnim -= dt;
    if(e.skillAnim) e.skillAnim.t += dt;
    if(e.fxAnim) e.fxAnim.t += dt;
    // Arrastrado por una Embestida: sigue al caballero en vez de actuar normalmente
    if(e.draggedBy){
      if(!e.draggedBy.alive){ e.draggedBy = null; }
      else {
        e.dragTimer -= dt;
        e.x += (e.draggedBy.x - e.x)*0.4;
        e.y += (e.draggedBy.y - e.y)*0.4;
        if(e.dragTimer<=0){
          const dragger = e.draggedBy; e.draggedBy = null;
          damageEnemy(e, dragger.baseDmg*runStats.dmgMult*0.7, {src:dragger, knockback:true});
        }
        continue;
      }
    }
    // El enemigo persigue al héroe vivo más cercano (jugador o aliado), salvo que esté provocado
    let tgt;
    if(e.tauntedBy && e.tauntedBy.alive && e.tauntTimer>0){ tgt = e.tauntedBy; e.tauntTimer -= dt; }
    else { tgt = nearestHeroTo(e.x, e.y); }
    if(!tgt) continue;
    const dx = tgt.x-e.x, dy = tgt.y-e.y;
    const dist = Math.hypot(dx,dy)||1;
    e.fx = dx/dist; e.fy = dy/dist;
    e.animT += dt;
    // Ventana de anticipación (bossWindup): cuando se cumple, recién ahí se resuelve el golpe.
    if(e.bossWind){
      e.bossWind.t += dt;
      if(e.bossWind.t >= e.bossWind.dur){ const w = e.bossWind; e.bossWind = null; w.fn(); }
    }

    // ---- Habilidades del jefe final (Demonio Mayor) ----
    if(e.type==="demonio_mayor"){
      if(e.breathCd>0) e.breathCd -= dt;
      if(e.waveCd>0) e.waveCd -= dt;
      if(e.regenTimer>0){
        e.regenTimer -= dt;
        e.hp = Math.min(e.maxHp, e.hp + e.maxHp*0.012*dt/1000);
      }
      if(!e.regenUsed && e.hp < e.maxHp*0.4){
        e.regenUsed = true; e.regenTimer = 5000;
        showBanner("¡Regeneración Oscura!");
      }
      if(e.bossWind){
        // cargando un golpe: no arranca otra habilidad hasta resolverlo
      } else if(e.breathCd<=0 && dist < 260){
        e.breathCd = 4200;
        const lfx = e.fx, lfy = e.fy; // la dirección del cono queda fija al empezar el aviso
        bossWindup(e, 750, "bossCast", {shape:1, r:230, dx:lfx, dy:lfy, arc:0.99, rgb:"255,90,40"}, ()=>{
          e.attackAnim = 500;
          const targets = [player, ...allies].filter(h=>h.alive);
          for(const h of targets){
            const hdx=h.x-e.x, hdy=h.y-e.y, hd=Math.hypot(hdx,hdy)||1;
            const dot = (hdx/hd)*lfx + (hdy/hd)*lfy; // dentro del cono frontal
            if(hd < 230 && dot > 0.55){ damageHero(h, e.dmg*1.3); h.bleedTimer=Math.max(h.bleedTimer||0,0); }
          }
          for(let i=0;i<16;i++){
            const spread=(Math.random()-0.5)*0.9, dist2=60+Math.random()*170;
            particles.push({x:e.x, y:e.y, vx:(lfx*Math.cos(spread)-lfy*Math.sin(spread))*dist2*2,
              vy:(lfx*Math.sin(spread)+lfy*Math.cos(spread))*dist2*2, life:380, color:Math.random()<0.5?"#ff6a3d":"#ffcf5c"});
          }
        });
        showBanner("Lanzallamas Demoníaco");
      } else if(e.waveCd<=0){
        e.waveCd = 7200;
        const R = 240;
        bossWindup(e, 900, "bossGroundSlam", {shape:0, r:R, rgb:"255,90,40"}, ()=>{
          e.attackAnim = 500;
          const targets = [player, ...allies].filter(h=>h.alive);
          for(const h of targets){ if(distance(e,h) <= R) damageHero(h, e.dmg*1.1); }
          particles.push({x:e.x,y:e.y, life:650, ring:true, maxLife:650, maxR:R, color:"#ff6a3d"});
          particles.push({x:e.x,y:e.y, life:800, ring:true, maxLife:800, maxR:R*0.7, color:"#ffcf5c"});
        });
        showBanner("¡Onda de Fuego Infernal!");
      }
    }

    // ---- Habilidades del jefe final (Mago de Hielo y Cristal, fase 1 de la Arena de Hielo) ----
    if(e.type==="mago_hielo_cristal"){
      if(e.novaCd>0) e.novaCd -= dt;
      if(e.ventiscaCd>0) e.ventiscaCd -= dt;
      if(e.armorCd>0) e.armorCd -= dt;
      if(e.armorTimer>0){
        e.armorTimer -= dt;
        if(e.armorTimer<=0) e.dmgTakenMult = 1;
      }
      if(e.bossWind){
        // cargando un golpe: no arranca otra habilidad hasta resolverlo
      } else if(e.armorCd<=0 && !(e.armorTimer>0)){
        // Armadura de Hielo: se blinda un rato, reduce el daño que recibe a la mitad
        e.armorCd = 13000; e.armorTimer = 5000; e.dmgTakenMult = 0.5;
        e.skillAnim = {name:"armadura_hielo", t:0};
        animTrigger(e, "bossCast", 700, 0.45);
        showBanner("¡Armadura de Hielo!");
      } else if(e.novaCd<=0 && dist < 230){
        // Nova de Hielo: estallido de daño en área alrededor del jefe
        e.novaCd = 6500;
        const R = 190;
        bossWindup(e, 700, "bossCast", {shape:0, r:R, rgb:"150,220,255"}, ()=>{
          e.attackAnim = 500;
          const targets = [player, ...allies].filter(h=>h.alive);
          for(const h of targets){ if(distance(e,h) <= R) damageHero(h, e.dmg*1.4); }
          particles.push({x:e.x,y:e.y, life:600, ring:true, maxLife:600, maxR:R, color:"#bfe6ff"});
          particles.push({x:e.x,y:e.y, life:780, ring:true, maxLife:780, maxR:R*0.65, color:"#eaf7ff"});
          e.skillAnim = {name:"nova_hielo", t:0};
        });
        showBanner("¡Nova de Hielo!");
      } else if(e.ventiscaCd<=0){
        // Ventisca: área más ancha que empuja a los héroes hacia afuera y los ralentiza
        e.ventiscaCd = 9000;
        const R = 260;
        bossWindup(e, 850, "bossCast", {shape:0, r:R, rgb:"200,235,255"}, ()=>{
          e.attackAnim = 500;
          const targets = [player, ...allies].filter(h=>h.alive);
          for(const h of targets){
            const hd = distance(e,h);
            if(hd <= R){
              damageHero(h, e.dmg*0.6);
              h.slowAmt = Math.max(h.slowAmt||0, 0.55); h.slowTimer = Math.max(h.slowTimer||0, 2400);
              const kx=(h.x-e.x)/(hd||1), ky=(h.y-e.y)/(hd||1);
              h.x += kx*46; h.y += ky*46;
              clampToArena(h); resolveWallCollision(h);
            }
          }
          particles.push({x:e.x,y:e.y, life:900, ring:true, maxLife:900, maxR:R, color:"#dff3ff"});
          for(let i=0;i<20;i++){
            const a = Math.random()*Math.PI*2, d=40+Math.random()*R;
            particles.push({x:e.x+Math.cos(a)*d, y:e.y+Math.sin(a)*d, vx:Math.cos(a)*40, vy:Math.sin(a)*40-10, life:500, color:"#eaf7ff"});
          }
          e.skillAnim = {name:"ventisca", t:0};
        });
        showBanner("¡Ventisca!");
      }
    }

    // ---- Habilidades del Dragón de Hielo (Tundraverx, subjefe de la Arena de Hielo) ----
    // A diferencia del Mago de Hielo, estas hojas ya traen al dragón dibujado adentro del
    // frame: mientras fxAnim está activo, drawBossFxReplace reemplaza el sprite normal en vez
    // de superponerse (por eso no se usa e.skillAnim acá).
    if(e.type==="dragon_hielo"){
      if(e.alientoCd>0) e.alientoCd -= dt;
      if(e.novaCd>0) e.novaCd -= dt;
      if(e.bossWind){
        // cargando un golpe: no arranca otra habilidad hasta resolverlo
      } else if(!e.fxAnim && e.alientoCd<=0 && dist < 260){
        e.alientoCd = 5200;
        const lfx = e.fx, lfy = e.fy;
        bossWindup(e, 700, "bossCast", {shape:1, r:260, dx:lfx, dy:lfy, arc:0.93, rgb:"150,220,255"}, ()=>{
          e.attackAnim = 500;
          const targets = [player, ...allies].filter(h=>h.alive);
          for(const h of targets){
            const hdx=h.x-e.x, hdy=h.y-e.y, hd=Math.hypot(hdx,hdy)||1;
            const dot = (hdx/hd)*lfx + (hdy/hd)*lfy;
            if(hd < 260 && dot > 0.6){
              damageHero(h, e.dmg*1.2);
              h.slowAmt = Math.max(h.slowAmt||0, 0.4); h.slowTimer = Math.max(h.slowTimer||0, 1600);
              addFrost(h, 2); // Aliento gélido: 2 cargas de escarcha (dos alientos seguidos congelan)
            }
          }
          e.fxAnim = {name:"aliento_hielo", t:0};
        });
        showBanner("¡Aliento de Hielo!");
      } else if(!e.fxAnim && e.novaCd<=0){
        e.novaCd = 8200;
        const R = 200;
        bossWindup(e, 750, "bossGroundSlam", {shape:0, r:R, rgb:"150,220,255"}, ()=>{
          e.attackAnim = 500;
          const targets = [player, ...allies].filter(h=>h.alive);
          // Nova gélida: además del daño, ralentiza y suma escarcha (antes solo hacía daño)
          for(const h of targets){ if(distance(e,h) <= R) bossHitHero(h, e.dmg*1.1, {slow:0.45, slowDur:1800, frost:1}); }
          particles.push({x:e.x,y:e.y, life:650, ring:true, maxLife:650, maxR:R, color:"#bfe0f5"});
          particles.push({x:e.x,y:e.y, life:820, ring:true, maxLife:820, maxR:R*0.65, color:"#eaf7ff"});
          e.fxAnim = {name:"nova_hielo_dragon", t:0};
        });
        showBanner("¡Nova de Hielo!");
      }
    }

    // ---- Habilidad del Demonio de Hielo y Fuego: Nova de Escarcha ----
    // Ataque circular de área centrada en el demonio: daño + ralentización, y congelación
    // breve para quien quede en el anillo interior (más cerca del centro).
    if(e.type==="demonio_hielo_fuego"){
      if(e.escarchaCd>0) e.escarchaCd -= dt;
      if(!e.bossWind && !e.channel && e.escarchaCd<=0 && dist < 220){
        e.escarchaCd = 7500;
        const R = 170, Rinner = 80;
        bossWindup(e, 600, "bossGroundSlam", {shape:0, r:R, rgb:"150,220,255"}, ()=>{
          e.attackAnim = 500;
          const targets = [player, ...allies].filter(h=>h.alive);
          for(const h of targets){
            const hd = distance(e,h);
            if(hd <= R){
              damageHero(h, e.dmg*1.2);
              h.slowAmt = Math.max(h.slowAmt||0, 0.5); h.slowTimer = Math.max(h.slowTimer||0, 2000);
              if(hd <= Rinner){ h.stunTimer = Math.max(h.stunTimer||0, 700); }
            }
          }
          particles.push({x:e.x,y:e.y, life:600, ring:true, maxLife:600, maxR:R, color:"#9fd8ee"});
          particles.push({x:e.x,y:e.y, life:750, ring:true, maxLife:750, maxR:Rinner, color:"#eaf7ff"});
          e.skillAnim = {name:"nova_escarcha", t:0};
        });
        showBanner("¡Nova de Escarcha!");
      }
    }


    // ---- Habilidades especiales de jefes/subjefes (módulo updateBossSkills): mientras un
    // enemigo canaliza o embiste, no se mueve ni ataca de la forma normal. ----
    if(BOSS_SKILL_TYPES[e.type] && updateBossSkills(e, dt, tgt, dist)) continue;

    // ---- Arena Acuática: habilidades de los enemigos propios (mismo criterio que el resto del
    // roster de jefes/subjefes de arriba -bloques por e.type, cooldowns propios en el propio
    // enemigo, telegrafiado visual antes de cada golpe importante-). ----
    if(e.type==="tiburon_joven" || e.type==="tiburon_blanco"){
      const isElite = e.type==="tiburon_blanco";
      if(e.charging){
        e.chargeTimer -= dt;
        e.x += e.chargeDx*(isElite?420:380)*dt/1000; e.y += e.chargeDy*(isElite?420:380)*dt/1000;
        clampToArena(e);
        if(!e.chargeHit && distance(e,tgt) <= e.radius+tgt.radius+10){
          damageHero(tgt, e.dmg*(isElite?1.8:1.5));
          if(isElite){ tgt.bleedTimer = Math.max(tgt.bleedTimer||0, 3000); tgt.bleedDmg = Math.max(tgt.bleedDmg||0, e.dmg*0.25); }
          e.chargeHit = true;
        }
        if(e.chargeTimer<=0) e.charging = false;
        continue;
      }
      if(e.chargeTelegraph>0){
        e.chargeTelegraph -= dt;
        if(e.chargeTelegraph<=0){ e.charging=true; e.chargeTimer=420; e.chargeHit=false; e.chargeDx=e.fx; e.chargeDy=e.fy; }
      } else {
        e.chargeCd = (e.chargeCd===undefined ? (isElite?3000:2000) : e.chargeCd) - dt;
        if(e.chargeCd<=0 && dist>140 && dist<440){
          e.chargeCd = isElite ? 6500 : 5000;
          e.chargeTelegraph = isElite ? 650 : 450;
          // Sombra que avisa antes de la carga (pedido explícito para el Tiburón Blanco, y
          // sirve igual de bien como aviso genérico para el Tiburón Joven).
          particles.push({x:e.x,y:e.y, life:e.chargeTelegraph, ring:true, maxLife:e.chargeTelegraph, maxR:34, color: isElite?"#ffe0e0":"#cfe8ff"});
          if(isElite){
            vfxTelegraph({shape:2, r:e.radius+18, len:(isElite?420:380)*0.42, follow:e, aimAt:tgt, dur:e.chargeTelegraph, rgb:"255,110,90"});
            showBanner("¡Carga Depredadora!");
          }
        }
      }
    }

    if(e.type==="medusa_electrica"){
      e.dischargeCd = (e.dischargeCd===undefined?1800:e.dischargeCd) - dt;
      if(e.dischargeTelegraph>0){
        e.dischargeTelegraph -= dt;
        if(e.dischargeTelegraph<=0){
          e.attackAnim = 260;
          const R = 95;
          const targets = [player,...allies].filter(h=>h.alive);
          for(const h of targets){
            if(distance(e,h) <= R){ damageHero(h, e.dmg); h.slowAmt=Math.max(h.slowAmt||0,0.5); h.slowTimer=Math.max(h.slowTimer||0,900); }
          }
          particles.push({x:e.x,y:e.y, life:340, ring:true, maxLife:340, maxR:R, color:"#8fd0ff"});
          vfxBurst(e.x, e.y-20, 10, "shock", 150, 260, 3, 1, 0, 1);
          if(acua2Ready("fxSpark")) vfxSprite("fxSpark", 0, e.x, e.y-10, 60, 260, null, 0.1, false, 0.5);
          e.dischargeCd = 3400;
        }
      } else if(e.dischargeCd<=0 && dist<220){
        e.dischargeTelegraph = 500;
        particles.push({x:e.x,y:e.y, life:500, ring:true, maxLife:500, maxR:40, color:"#c9a8ff"});
        vfxTelegraph({shape:0, r:95, follow:e, dur:500, rgb:"200,160,255"}); // radio real de la Descarga
      }
    }

    if(e.type==="cangrejo_acorazado"){
      e.slamCd = (e.slamCd===undefined?2400:e.slamCd) - dt;
      if(e.slamTelegraph>0){
        e.slamTelegraph -= dt;
        if(e.slamTelegraph<=0){
          e.attackAnim = 300;
          const R = 110;
          const targets = [player,...allies].filter(h=>h.alive);
          for(const h of targets){
            const hd = distance(e,h);
            if(hd <= R){
              damageHero(h, e.dmg*1.3);
              const kx=(h.x-e.x)/(hd||1), ky=(h.y-e.y)/(hd||1);
              h.x += kx*30; h.y += ky*30; clampToArena(h);
            }
          }
          particles.push({x:e.x,y:e.y, life:400, ring:true, maxLife:400, maxR:R, color:"#ff8a5a"});
          vfxShock(e.x, e.y, 20, R, "255,150,90", 380, 1);
          vfxBurst(e.x, e.y, 8, "shell", 120, 320, 3, 1, -40, 0);
          e.slamCd = 5200;
        }
      } else if(e.slamCd<=0 && dist<160){
        e.slamTelegraph = 600;
        particles.push({x:e.x,y:e.y, life:600, ring:true, maxLife:600, maxR:50, color:"#ffcf9a"});
        vfxTelegraph({shape:0, r:110, follow:e, dur:600, rgb:"255,150,90"}); // radio real del Golpe de Suelo
      }
    }

    if(e.type==="sirena_abisal"){
      e.songCd = (e.songCd===undefined?3000:e.songCd) - dt;
      if(e.songTelegraph>0){
        e.songTelegraph -= dt;
        if(e.songTelegraph<=0){
          e.attackAnim = 400;
          const R = 170;
          const targets = [player,...allies].filter(h=>h.alive);
          for(const h of targets){ if(distance(e,h) <= R){ h.slowAmt=Math.max(h.slowAmt||0,0.4); h.slowTimer=Math.max(h.slowTimer||0,1800); } }
          particles.push({x:e.x,y:e.y, life:700, ring:true, maxLife:700, maxR:R, color:"#9fc8ff"});
          e.songCd = 8000;
        }
      } else if(e.songCd<=0){
        e.songTelegraph = 700;
        particles.push({x:e.x,y:e.y, life:700, ring:true, maxLife:700, maxR:60, color:"#c9e0ff"});
        vfxTelegraph({shape:0, r:170, follow:e, dur:700, rgb:"150,200,255"}); // radio real del Canto Abisal
      }
    }

    if(e.type==="anguila_electrica"){
      if(e.dashing){
        e.dashTimer -= dt;
        e.x += e.dashDx*480*dt/1000; e.y += e.dashDy*480*dt/1000;
        clampToArena(e);
        if(!e.dashHit && distance(e,tgt) <= e.radius+tgt.radius+8){
          applyEelChain(e, tgt);
          e.dashHit = true;
        }
        if(e.dashTimer<=0) e.dashing = false;
        continue;
      }
      e.dashCd = (e.dashCd===undefined?1500:e.dashCd) - dt;
      if(e.dashCd<=0 && dist>100 && dist<380){
        e.dashCd = 4200; e.dashing = true; e.dashTimer = 300; e.dashHit = false;
        e.dashDx = e.fx; e.dashDy = e.fy;
        vfxBurst(e.x, e.y-10, 5, "shock", 90, 220, 2.5, 0, 0, 1);
        particles.push({x:e.x,y:e.y, life:200, ring:true, maxLife:200, maxR:20, color:"#ffe86a"});
      }
    }

    if(e.type==="kraken_joven"){
      const targets = [player,...allies].filter(h=>h.alive);
      e.tentacleCd -= dt;
      if(e.tentacleTelegraph>0){
        e.tentacleTelegraph -= dt;
        if(e.tentacleTelegraph<=0){
          e.attackAnim = 350;
          if(e.tentacleTarget && e.tentacleTarget.alive && distance(e,e.tentacleTarget)<=300) damageHero(e.tentacleTarget, e.dmg);
          particles.push({x:e.x,y:e.y, life:260, ring:true, maxLife:260, maxR:40, color:"#c98fe0"});
          if(e.tentacleTarget){
            const tt = e.tentacleTarget;
            vfxSprite("krTent", 0, tt.x, tt.y+4, 112, 460, null, 0.12, tt.x<e.x, 0.95);
            vfxBurst(tt.x, tt.y, 10, "water", 140, 360, 3, 2, -60, 0);
          }
          e.tentacleCd = 2600;
        }
      } else if(e.tentacleCd<=0 && dist<300){
        e.tentacleTelegraph = 500; e.tentacleTarget = tgt;
        particles.push({x:tgt.x,y:tgt.y, life:500, ring:true, maxLife:500, maxR:36, color:"#8a5aa8"});
        // el tentáculo asoma bajo el objetivo (lo sigue: el golpe es a esa persona, no a un punto)
        vfxTelegraph({shape:0, r:40, follow:tgt, dur:500, rgb:"200,140,230"});
        vfxSprite("krTent", 5, tgt.x, tgt.y+4, 46, 500, tgt, 0.6, false, 0.95);
        animTrigger(e, "bossCast", 800, 0.62);
      }
      e.grabCd -= dt;
      if(e.grabCd<=0 && dist<320 && !e.grabbedHero){
        e.grabCd = 9000;
        e.grabbedHero = tgt;
        tgt.stunTimer = Math.max(tgt.stunTimer||0, 2000);
        vfxBurst(tgt.x, tgt.y, 12, "water", 150, 420, 3, 2, -60, 0);
        animTrigger(e, "bossHeavyAttack", 700, 0.3);
        showBanner("¡El Kraken atrapó a "+tgt.cls.name+"!");
        particles.push({x:tgt.x,y:tgt.y, life:2000, ring:true, maxLife:2000, maxR:30, color:"#6a3a6e"});
      }
      if(e.grabbedHero){
        if(!e.grabbedHero.alive || e.grabbedHero.stunTimer<=0){ e.grabbedHero = null; }
        else damageHero(e.grabbedHero, e.dmg*0.25*dt/1000);
      }
      e.sweepCd -= dt;
      if(e.sweepTelegraph>0){
        e.sweepTelegraph -= dt;
        if(e.sweepTelegraph<=0){
          e.attackAnim = 500;
          for(const h of targets){ if(distance(e,h) <= 260) damageHero(h, e.dmg*1.2); }
          particles.push({x:e.x,y:e.y, life:500, ring:true, maxLife:500, maxR:260, color:"#8a5aa8"});
          for(let k=0;k<6;k++){
            const a = k/6*Math.PI*2 + Math.random()*0.3;
            vfxSprite("krSweep", 0, e.x+Math.cos(a)*200, e.y+Math.sin(a)*200*0.6, 90, 520, null, 0.15, Math.cos(a)<0, 0.95);
          }
          vfxShock(e.x, e.y, 60, 270, "200,140,230", 480, 2);
          if(distance(e, player) < 600) vfxShake(6);
          e.sweepCd = 11000;
        }
      } else if(e.sweepCd<=0){
        e.sweepTelegraph = 800;
        particles.push({x:e.x,y:e.y, life:800, ring:true, maxLife:800, maxR:260, color:"#c98fe0"});
        vfxTelegraph({shape:0, r:260, follow:e, dur:800, rgb:"200,140,230"});
        animTrigger(e, "bossGroundSlam", 1150, 0.7);
        showBanner("¡Barrido del Kraken!");
      }
      e.summonCd -= dt;
      if(e.summonCd<=0){
        e.summonCd = 14000;
        spawnEnemy("tiburon_joven", false, false);
        spawnEnemy("cangrejo_acorazado", false, false);
        animTrigger(e, "bossCast", 900, 0.5);
        vfxSprite("fxWhirl", 0, e.x, e.y+10, 120, 900, e, 0.25, false, 0.9);
        showBanner("¡El Kraken invoca refuerzos!");
      }
    }

    if(e.type==="leviatan"){
      const acuaPhase = e.acuaticaPhase||1;
      if(!e.charging2){
        e.orbitAngle = (e.orbitAngle||0) + (dt/1000) * (0.12 + (acuaPhase-1)*0.05);
        e.x = Math.cos(e.orbitAngle)*LEVIATAN_ORBIT_R; e.y = Math.sin(e.orbitAngle)*LEVIATAN_ORBIT_R;
      }
      // la cara sigue mirando al objetivo real (ya calculado arriba para todo enemigo), no al
      // centro de la órbita -así el mordisco/coletazo se telegrafían hacia donde de verdad pega-
      const targets = [player,...allies].filter(h=>h.alive);

      e.biteCd -= dt;
      if(e.biteTelegraph>0){
        e.biteTelegraph -= dt;
        if(e.biteTelegraph<=0){
          e.attackAnim = 400; e._lastAtk = "bite";
          for(const h of targets){ if(distance(e,h) <= 220) damageHero(h, e.dmg); }
          particles.push({x:e.x,y:e.y, life:300, ring:true, maxLife:300, maxR:220, color:"#3a8aa0"});
          vfxSprite("fxSpike", 0, e.x+e.fx*60, e.y+e.fy*40, 110, 420, null, 0.12, false, 0.95);
          vfxBurst(e.x+e.fx*60, e.y+e.fy*40, 14, "water", 170, 420, 3, 2, -70, 0);
          e.biteCd = 3400;
        }
      } else if(e.biteCd<=0){
        let near = targets.some(h=>distance(e,h)<=280);
        if(near){ e.biteTelegraph=550; particles.push({x:e.x,y:e.y, life:550, ring:true, maxLife:550, maxR:220, color:"#7fd0e0"});
          vfxTelegraph({shape:0, r:220, follow:e, dur:550, rgb:"120,210,230"}); animTrigger(e, "bossHeavyAttack", 950, 0.58); }
      }

      e.chargeCd -= dt;
      if(e.chargeTelegraph2>0){
        e.chargeTelegraph2 -= dt;
        if(e.chargeTelegraph2<=0){
          e.charging2 = true; e.chargeTimer2 = 900; e.chargeHitSet = new Set();
          vfxBurst(e.x, e.y, 16, "water", 180, 420, 3, 2, -40, 0);
          const tx=player.x-e.x, ty=player.y-e.y, tl=Math.hypot(tx,ty)||1;
          e.chargeDx2 = tx/tl; e.chargeDy2 = ty/tl;
        }
      } else if(e.charging2){
        e.chargeTimer2 -= dt;
        e.x += e.chargeDx2*520*dt/1000; e.y += e.chargeDy2*520*dt/1000;
        for(const h of targets){ if(!e.chargeHitSet.has(h) && distance(e,h)<=100){ damageHero(h, e.dmg*1.3); e.chargeHitSet.add(h); } }
        if(e.chargeTimer2<=0){ e.charging2 = false; e.chargeCd = 8000; e.orbitAngle = Math.atan2(e.y, e.x); }
      } else if(e.chargeCd<=0){
        e.chargeTelegraph2 = 700;
        particles.push({x:e.x,y:e.y, life:700, ring:true, maxLife:700, maxR:50, color:"#ff8a5a"});
        // carril de la embestida: apunta al jugador en vivo, igual que la dirección real al salir
        vfxTelegraph({shape:2, r:100, len:520*0.9, follow:e, aimAt:player, dur:700, rgb:"255,120,90"});
        animTrigger(e, "bossCharge", 1600, 0.44);
        showBanner("¡El Leviatán embiste!");
      }

      e.tailCd -= dt;
      if(e.tailTelegraph>0){
        e.tailTelegraph -= dt;
        if(e.tailTelegraph<=0){
          e.attackAnim = 450; e._lastAtk = "tail";
          for(const h of targets){
            const hd = distance(e,h);
            if(hd <= 260){ damageHero(h, e.dmg*1.1); const kx=(h.x-e.x)/(hd||1), ky=(h.y-e.y)/(hd||1); h.x+=kx*50; h.y+=ky*50; clampToArena(h); }
          }
          particles.push({x:e.x,y:e.y, life:450, ring:true, maxLife:450, maxR:260, color:"#5ab0c8"});
          vfxSprite("fxSplash", 0, e.x-e.fx*80, e.y-e.fy*50, 100, 520, null, 0.15, false, 0.95);
          vfxShock(e.x, e.y, 40, 270, "120,210,230", 460, 2);
          e.tailCd = 6200;
        }
      } else if(e.tailCd<=0){
        e.tailTelegraph = 600;
        particles.push({x:e.x,y:e.y, life:600, ring:true, maxLife:600, maxR:260, color:"#8fd8ec"});
        vfxTelegraph({shape:0, r:260, follow:e, dur:600, rgb:"120,210,230"});
        animTrigger(e, "bossGroundSlam", 950, 0.63);
      }

      e.waveCd2 -= dt;
      if(e.waveTelegraph>0){
        e.waveTelegraph -= dt;
        if(e.waveTelegraph<=0){
          e.attackAnim = 500; e._lastAtk = "wave";
          for(const h of targets) damageHero(h, e.dmg*0.9);
          particles.push({x:player.x,y:player.y, life:600, ring:true, maxLife:600, maxR:400, color:"#3a8aa0"});
          for(let k=0;k<4;k++){ const a = k*Math.PI/2+0.4; vfxSprite("fxWave", 0, player.x+Math.cos(a)*120, player.y+Math.sin(a)*80, 110, 520, null, 0.1, Math.cos(a)>0, 0.9); }
          vfxShake(8);
          e.waveCd2 = 9000;
        }
      } else if(e.waveCd2<=0){
        e.waveTelegraph = 1100;
        // la Oleada alcanza a todos: el aviso es global (olas que se acercan desde los costados)
        vfxTelegraph({shape:0, r:400, follow:player, dur:1100, rgb:"90,200,230"});
        for(let k=0;k<4;k++){ const a = k*Math.PI/2+0.4; vfxSprite("fxWave", 0, player.x+Math.cos(a)*420, player.y+Math.sin(a)*280, 120, 1100, null, 0.5, Math.cos(a)>0, 0.9, 0, -Math.cos(a)*270, -Math.sin(a)*180); }
        animTrigger(e, "bossCast", 1500, 0.73);
        showBanner("¡Oleada de Agua!");
      }
      continue;
    }

    const spd = e.bossWind ? 0 : e.speed*(1-e.slowAmt); // se planta mientras carga un golpe telegrafiado
    if(e.ranged){
      if(dist > e.range*0.7){
        aidEnemyStep(e, dx, dy, dist, spd, dt); // rodea muros/obstáculos si la arena los tiene
      }
      e.atkCd -= dt;
      if(dist <= e.range && e.atkCd<=0){
        e.atkCd = 1500;
        e.attackAnim = 320;
        projectiles.push({x:e.x,y:e.y, vx:dx/dist*e.projSpeed, vy:dy/dist*e.projSpeed, dmg:e.dmg, life:2200, radius:7, color:ENEMY_PROJ_COLOR[e.type]||"#ff5a3d", enemy:true,
          sprite: e.type==="sirena_abisal" ? "orb" : undefined});
      }
    } else {
      if(dist > e.radius+tgt.radius-4){
        aidEnemyStep(e, dx, dy, dist, spd, dt); // rodea muros/obstáculos si la arena los tiene
      }
      e.atkCd -= dt;
      if(dist <= e.radius+tgt.radius+6 && e.atkCd<=0){
        e.atkCd = 900;
        e.attackAnim = 280;
        damageHero(tgt, e.dmg);
      }
    }
  }
  enemies = enemies.filter(e=>e.alive || e.hp>-9999);
  enemies = enemies.filter(e=>e.alive);

  // projectiles
  for(const p of projectiles){
    p.x += p.vx*dt/1000; p.y += p.vy*dt/1000; p.life -= dt;
    if(p.enemy){
      for(const h of heroes){
        if(!h.alive) continue;
        if(distance(p,h) < h.radius+p.radius){ damageHero(h, p.dmg); p.life=0; vfxBurst(p.x, p.y, 4, "spark", 90, 200, 2.5, h===player?2:0, -20, 1); break; }
      }
    } else {
      for(const e of enemies){
        if(!e.alive) continue;
        if(p.hitSet && p.hitSet.has(e)) continue;
        if(distance(p,e) < e.radius+p.radius){
          damageEnemy(e, p.dmg, {fromBasic:p.fromBasic, slow:p.slow, slowDur:2000, src:p.src,
            critChanceOverride:p.critChanceOverride, critMultOverride:p.critMultOverride, bleed:p.bleed, bleedDur:p.bleedDur});
          if(p.onHit) p.onHit(e);
          if(p.src===player) vfxShock(p.x, p.y, 4, 18+p.radius*2, hexToRgb(p.color), 200, 0);
          if(p.pierce){ p.hitSet.add(e); } else { p.life=0; break; }
        }
      }
    }
  }
  projectiles = projectiles.filter(p=>p.life>0 && Math.hypot(p.x-player.x,p.y-player.y)<2200);

  // particles
  let _pw = 0;
  for(let i=0;i<particles.length;i++){
    const pt = particles[i];
    pt.life -= dt;
    if(pt.x!==undefined && pt.vx!==undefined){ pt.x+=pt.vx*dt/1000; pt.y+=pt.vy*dt/1000; }
    if(pt.life>0) particles[_pw++] = pt;
  }
  particles.length = _pw;
  if(particles.length > 900){
    // tope dinámico: se descartan primero las chispas simples más viejas (nunca anillos/telegraphs)
    let drop = particles.length - 650, w2 = 0;
    for(let i=0;i<particles.length;i++){
      const pt = particles[i];
      const plain = !pt.ring && !pt.warnRing && !pt.corpse && !pt.bolt && !pt.spin && !pt.slash && !pt.crystal && !pt.runeRing;
      if(drop>0 && plain){ drop--; continue; }
      particles[w2++] = pt;
    }
    particles.length = w2;
  }
  for(const em of embers){ em.y += em.vy*dt/1000; em.phase += dt/1000; if(em.y < player.y-700) em.y = player.y+700; }

  updateAllies(dt);
  updatePotions(dt);
  updateFireWalls(dt);
  updateTraps(dt);
  updateAxiomZones(dt);
  updateSylvaRainZones(dt);
  updateAxiomVfx(dt);

  // spawn logic
  if(!divinaMode && !bossActive){
    spawnTimer -= dt;
    // Más enemigos desde la Horda 1, y el ritmo deja de acelerar a partir del nivel ~5
    // (antes seguía acelerando sin techo real y se acumulaba un "masacote" hacia el final).
    const lvlEff = Math.min(runLevel, 5);
    // El nivel de cuenta de los héroes acorta más este intervalo (partyLevelScale) -sobre
    // el piso ya reducido a 560ms-, para que una cuenta veterana enfrente más enemigos por
    // minuto sin depender solo del nivel de la arena en esta partida puntual.
    const spawnInterval = Math.max(360, (1150 - lvlEff*95) * 0.77 * partyLevelScale().spawnRate);
    if(spawnTimer<=0 && !activeChampion){
      spawnTimer = spawnInterval;
      // Ráfaga inicial: en vez de un goteo de a uno, las primeras hordas aparecen en grupo
      // (sección "ritmo de oleadas" — preferir muchos enemigos débiles a pocos con mucha vida,
      // más sensación de horda desde temprano). Se reduce a 1 desde el nivel 4 en adelante, así
      // que NO afecta el ritmo ya calibrado de niveles medios/tardíos ni la curva de dificultad.
      const burstSize = runLevel<=1 ? 3 : (runLevel<=3 ? 2 : 1);
      for(let i=0;i<burstSize;i++) spawnEnemy(pickFromPool(spawnPoolFor(runLevel)), false);
    } else if(spawnTimer<=0){
      spawnTimer = 400; // reintenta pronto sin acumular una ráfaga cuando el campeón caiga
    }
    const subBossLevels = (currentArena==="hielo"||currentArena==="laberinto"||currentArena==="acuatica") ? [6] : (currentArena==="bosque" ? [9] : [4,7,9]);
    if(subBossLevels.includes(runLevel) && !midBossSpawned && levelTimer > levelDuration*0.45){
      midBossSpawned = true;
      if(currentArena==="bosque"){
        // Los 4 Dobladores aparecen JUNTOS, ya con sus propias estadísticas de subjefe
        // (no se les aplica el multiplicador de "campeón" — ver ENEMY_BASE, ya vienen fuertes).
        ["doblador_guerrero","doblador_arquera","doblador_picaro","doblador_clerigo"].forEach(t=>{
          const d = spawnEnemy(t, false, false);
          activeChampion = d; // se limpia solo cuando este referente muere (ver killEnemy)
        });
        showBanner("¡LOS DOBLADORES DESPIERTAN!");
      } else if(currentArena==="laberinto"){
        // El Guardián del Laberinto ya viene con sus propias estadísticas de subjefe
        const g = spawnEnemy("guardian_laberinto", false, false);
        activeChampion = g;
        showBanner("¡EL GUARDIÁN DEL LABERINTO DESPIERTA!");
      } else if(currentArena==="acuatica"){
        // El Kraken Joven ya viene con sus propias estadísticas de subjefe -aparece cerca del
        // borde del escenario, y sus tentáculos (ver el bloque de habilidades en el loop de
        // enemigos) alcanzan bastante más lejos que su radio de contacto real-.
        const spawnAng = Math.random()*Math.PI*2;
        const k = spawnEnemy("kraken_joven", false, false);
        k.x = player.x + Math.cos(spawnAng)*520; k.y = player.y + Math.sin(spawnAng)*520;
        k.tentacleCd = 2600; k.grabCd = 7000; k.sweepCd = 11000; k.summonCd = 9000; k.grabbedHero = null;
        activeChampion = k;
        showBanner("¡EL KRAKEN JOVEN EMERGE!");
      } else {
        const champType = currentArena==="hielo"
          ? "dragon_hielo"
          : (runLevel===4 ? "esqueleto_h" : (runLevel===7 ? "demonio_menor" : "golem"));
        const champ = spawnEnemy(champType, false, true);
        showBanner("¡" + champ.name + " campeón!");
      }
    }
    levelTimer += dt;
    if(levelTimer >= levelDuration){
      if(runLevel === LEVEL_COUNT){
        startBossFight();
      } else {
        // clear remaining trash before showing buff choice, but don't hard-block
        openBuffChoice();
      }
    }
  } else {
    if(boss && !boss.alive){ /* handled in killEnemy */ }
  }

  updateHUD();
}
