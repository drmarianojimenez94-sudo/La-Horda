"use strict";
/* ============================================================
   js/core/update.js
   update(dt): la simulación de un cuadro (movimiento, IA de enemigos, oleadas,
   colisiones, efectos por tiempo, jefes...). Se llama una vez por frame desde el loop.
   ============================================================ */

function update(dt){
  if(state!=="playing") return;
  // B1 cooperativo: el invitado no simula la partida, la reconstruye con lo que manda el anfitrión
  if(netMatch && netMatch.role==="guest"){ netGuestUpdate(dt); return; }
  runElapsedMs += dt;
  invalidatePassiveCache();
  updateRunTimers(dt);
  vfxFrame(dt);
  vfxUpdate(dt);
  updateGore(dt); // manchas y cadáveres (js/rendering/gore.js)
  updateFloatTexts(dt);
  // Musashi — Último Duelo: se procesa para los 4 héroes SIEMPRE, antes que cualquier otro
  // corte por aturdimiento/muerte de updateAllies (que hace "continue" en esos casos y nunca
  // llegaría a decrementar el temporizador del duelo si viviera adentro de ese bucle).
  for(const h of heroes) updateLastDuel(h, dt);
  updateMusashiFx(dt);
  updateBossSkillWorld(dt);
  crystalTick(dt); // ceremonia del cristal de un Guardián (crystals.js)
  hechWorldTick(dt); // efectos diferidos del Hechicero Supremo (inf-hechicero.js)
  for(const h of heroes){ updateSylvaMomentum(h, dt); updateSylvaWolf(h, dt); }
  for(const h of heroes){ updateNigromanteSkeletons(h, dt); updateNigromanteGolem(h, dt); updateNigromanteDemonForm(h, dt); updateNigromantePassive(h, dt); }
  // El Libertador / Eren (+ buffs de equipo que dan): js/champions/champ-shared.js
  for(const h of heroes) updateChampExtras(h, dt);
  updateChampFx(dt);
  updateArenaHazards(dt);
  updateAcuaCurrent(dt);
  updateAcuaAmbience(dt);
  aidNavUpdate(dt); aidAmbUpdate(dt);
  if(arenaHas("update")) arenaHook("update", dt); // mecanismos propios de la arena (La Fortaleza)
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

  updateControlledHero(dt);
  // B1 cooperativo: los héroes de los invitados usan exactamente el mismo código (ver net-game.js)
  if(netMatch && netMatch.role==="host") netHostUpdateRemotes(dt);

  // enemies
  for(const e of enemies){
    if(!e.alive) continue;
    if(axiomFreezeTimer>0){ continue; } // Force Quit: nadie salvo Axiom actúa mientras dura
    if(e.frozenTimer>0) e.frozenTimer -= dt; // congelado (Invierno Sin Fin, reacciones de hielo)
    if(e.shockedTimer>0) e.shockedTimer -= dt;
    if(e.wetTimer>0) e.wetTimer -= dt;
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
    if(arenaMods().enemyRegenPct && e.hp<e.maxHp && e.rank!=="jefe" && e.rank!=="subjefe"){ e.hp = Math.min(e.maxHp, e.hp + e.maxHp*arenaMods().enemyRegenPct*arenaRuleEnemyRegenMult()*dt/1000); }
    if(e.attackAnim>0) e.attackAnim -= dt;
    bossSheetTick(e, dt); // animación de habilidad de las hojas de jefes + estela de fuego del Minotauro
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
    else if(e.role==="cazador") tgt = roleHunterTarget(e) || nearestHeroTo(e.x, e.y); // va por el más frágil
    else { tgt = arenaHas("enemyTarget") ? arenaHook("enemyTarget", e) : nearestHeroTo(e.x, e.y); }
    if(!tgt) continue;
    const dx = tgt.x-e.x, dy = tgt.y-e.y;
    const dist = Math.hypot(dx,dy)||1;
    e.fx = dx/dist; e.fy = dy/dist;
    e.animT += dt;
    // Hechicero Supremo / Golem de Cuerpos: cinemáticas, teletransporte y animaciones propias
    if(HECH_TYPES[e.type] && hechEnemyTick(e, dt, tgt, dist)) continue;
    // Ventana de anticipación (bossWindup): cuando se cumple, recién ahí se resuelve el golpe.
    if(e.bossWind){
      e.bossWind.t += dt;
      if(e.bossWind.t >= e.bossWind.dur){ const w = e.bossWind; e.bossWind = null; w.fn(); }
    }
    // Roles enemigos (js/enemies/enemy-roles.js): sanador, suicida, artillero... true = ya actuó.
    if(e.role){ roleAnnounce(e); if(updateEnemyRole(e, dt, tgt, dist)) continue; }

    // ---- Jefes finales: director de fases y rotación de ataques (js/skills/boss-patterns.js).
    // El Leviatán además orbita el borde (su bloque de más abajo). ----
    if(BOSS_DESIGNS[e.type] && e.type!=="leviatan"){
      if(e.type==="demonio_mayor") demonRegenCheck(e, dt);
      if(updateBossDirector(e, dt, tgt, dist)) continue;
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
              damageHero(h, e.dmg*1.2, e);
              h.slowAmt = Math.max(h.slowAmt||0, 0.4); h.slowTimer = Math.max(h.slowTimer||0, 1600);
              addFrost(h, 2); // Aliento gélido: 2 cargas de escarcha (dos alientos seguidos congelan)
            }
          }
          // con el canon nuevo (Tundraverx sin alas) el efecto viejo traía dibujado al dragón alado:
          // se usa el aliento de su propia hoja (cuadros de ataque) en vez del reemplazo de cuerpo
          if(typeof BOSS_SHEET_ATLAS!=="undefined" && BOSS_SHEET_ATLAS[e.type]) bossSheetPack(e, "atk", 900);
          else e.fxAnim = {name:"aliento_hielo", t:0};
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
          if(typeof BOSS_SHEET_ATLAS!=="undefined" && BOSS_SHEET_ATLAS[e.type]){ bossSheetPack(e, "atk", 700); bossSheetFx("bsMagoBurst", e.x, e.y - e.radius*0.3, R*1.2, 700, {grow:0.3}); }
          else e.fxAnim = {name:"nova_hielo_dragon", t:0};
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
        bossWindup(e, 900, "bossGroundSlam", {shape:0, r:R, rgb:"150,220,255"}, ()=>{ // 0,9 s: norma de aviso de élite (antes 0,6 s, con aturdido en el anillo interior)
          e.attackAnim = 500;
          const targets = [player, ...allies].filter(h=>h.alive);
          for(const h of targets){
            const hd = distance(e,h);
            if(hd <= R){
              damageHero(h, e.dmg*1.2, e);
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

    // ---- IA propia de la arena (ARENA_DEFS[arena].enemyAI[tipo]): true = ya actuó este cuadro ----
    { const aai = arenaEnemyAI(e.type); if(aai && aai(e, dt, tgt, dist)) continue; }

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
          damageHero(tgt, e.dmg*(isElite?1.8:1.5), e);
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
            if(distance(e,h) <= R){ damageHero(h, e.dmg, e); h.slowAmt=Math.max(h.slowAmt||0,0.5); h.slowTimer=Math.max(h.slowTimer||0,900); }
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
              damageHero(h, e.dmg*1.3, e);
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
          if(e.tentacleTarget && e.tentacleTarget.alive && distance(e,e.tentacleTarget)<=300) damageHero(e.tentacleTarget, e.dmg, e);
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
        else damageHero(e.grabbedHero, e.dmg*0.25*dt/1000, e);
      }
      e.sweepCd -= dt;
      if(e.sweepTelegraph>0){
        e.sweepTelegraph -= dt;
        if(e.sweepTelegraph<=0){
          e.attackAnim = 500;
          for(const h of targets){ if(distance(e,h) <= 260) damageHero(h, e.dmg*1.2, e); }
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
      // Ronda el borde del escenario (no entra del todo): órbita fija alrededor del centro. Tras
      // una embestida vuelve nadando a su órbita en vez de teletransportarse a ella.
      const acuaPhase = e.acuaticaPhase||1;
      const busy = updateBossDirector(e, dt, tgt, dist);
      if(!busy && !e.bossCharge){
        e.orbitAngle = (e.orbitAngle===undefined ? Math.atan2(e.y, e.x) : e.orbitAngle) + (dt/1000) * (0.12 + (acuaPhase-1)*0.05);
        const ox = Math.cos(e.orbitAngle)*LEVIATAN_ORBIT_R, oy = Math.sin(e.orbitAngle)*LEVIATAN_ORBIT_R;
        const ddx = ox-e.x, ddy = oy-e.y, dd = Math.hypot(ddx, ddy);
        if(dd > 8){ const k = Math.min(1, 340*dt/1000/dd); e.x += ddx*k; e.y += ddy*k; } else { e.x = ox; e.y = oy; }
        if(e.levCharging){ e.levCharging = false; e.orbitAngle = Math.atan2(e.y, e.x); }
      }
      continue;
    }

    const cmd = roleCommandBuff(e) ? ROLE_CFG.comandante : null; // un Comandante cerca: más rápidos y más fuertes
    const spd = e.bossWind ? 0 : e.speed*(1-e.slowAmt)*(cmd ? 1+cmd.spdBuff : 1); // se planta mientras carga un golpe telegrafiado
    if(e.ranged){
      if(dist > e.range*0.7){
        aidEnemyStep(e, dx, dy, dist, spd, dt); // rodea muros/obstáculos si la arena los tiene
      }
      e.atkCd -= dt;
      if(dist <= e.range && e.atkCd<=0){
        const d0 = e.dmg; if(cmd) e.dmg = d0*(1+cmd.dmgBuff);
        e.atkCd = enemyRangedAttack(e, tgt, dx, dy, dist); // cada familia dispara a su manera (ranged-styles.js)
        e.dmg = d0;
      }
    } else {
      if(dist > e.radius+tgt.radius-4){
        aidEnemyStep(e, dx, dy, dist, spd, dt); // rodea muros/obstáculos si la arena los tiene
      }
      e.atkCd -= dt;
      if(dist <= e.radius+tgt.radius+6 && e.atkCd<=0){
        e.atkCd = 900;
        e.attackAnim = 280;
        damageHero(tgt, e.dmg*(e.basicMult||1)*(cmd ? 1+cmd.dmgBuff : 1), e);
      }
    }
  }
  enemies = enemies.filter(e=>e.alive || e.hp>-9999);
  enemies = enemies.filter(e=>e.alive);
  if(arenaHas("afterEnemies")) arenaHook("afterEnemies"); // p.ej. nadie queda sobre la lava tras un empujón

  // projectiles
  for(const p of projectiles){
    p.x += p.vx*dt/1000; p.y += p.vy*dt/1000; p.life -= dt;
    if(p.enemy){
      if((p.wave || p.lob) && updateEnemyProjectileStyle(p, dt)) continue; // el tiro en arco solo pega al caer
      for(const h of heroes){
        if(!h.alive) continue;
        if(distance(p,h) < h.radius+p.radius){ damageHero(h, p.dmg, {x:p.x-p.vx*0.25, y:p.y-p.vy*0.25, rank:p.rank}); if(p.frost) addFrost(h, p.frost); p.life=0; vfxBurst(p.x, p.y, 4, "spark", 90, 200, 2.5, h===player?2:0, -20, 1); break; }
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
  projectiles = projectiles.filter(p=>p.life>0 && (Math.hypot(p.x-player.x,p.y-player.y)<2200 || (arenaDef() && heroes.some(h=>Math.hypot(p.x-h.x,p.y-h.y)<2200))));

  stepParticles(dt);
  for(const em of embers){ em.y += em.vy*dt/1000; em.phase += dt/1000; if(em.y < player.y-700) em.y = player.y+700; }

  updateAllies(dt);
  updateRevives(dt);
  ctxUpdate(dt); // acciones contextuales (fisuras, braseros, runas...): js/systems/context-actions.js
  updatePotions(dt);
  updateEmergency(dt); // curación de emergencia: la parte que entra de a poco
  updateBreakables(dt); // urnas, barriles, ánforas... (breakables.js)
  updateFireWalls(dt);
  updateTraps(dt);
  updateAxiomZones(dt);
  updateSylvaRainZones(dt);
  updateAxiomVfx(dt);

  // spawn logic
  if(levelClearing > 0){
    levelClearing -= dt;
    if(levelClearing <= 0){ levelClearing = 0; if(state==="playing" && !runEnding) openBuffChoice(); }
  } else if(!divinaMode && !bossActive && !runEnding){
    spawnTimer -= dt;
    // Más enemigos desde la Horda 1, y el ritmo deja de acelerar a partir del nivel ~5
    // (antes seguía acelerando sin techo real y se acumulaba un "masacote" hacia el final).
    const lvlEff = Math.min(runLevel, 5);
    // El nivel de cuenta de los héroes acorta más este intervalo (partyLevelScale) -sobre
    // el piso ya reducido a 560ms-, para que una cuenta veterana enfrente más enemigos por
    // minuto sin depender solo del nivel de la arena en esta partida puntual.
    updatePacing(dt); // montaña rusa del nivel: calentamiento, oleada con aviso, respiro, clímax (pacing.js)
    const spawnInterval = Math.max(360, (1150 - lvlEff*95) * 0.77 * partyLevelScale().spawnRate * (arenaHook("spawnIntervalMult")||1)) * pacingIntervalMult();
    if(spawnTimer<=0 && !activeChampion){
      spawnTimer = spawnInterval;
      // Ráfaga inicial: en vez de un goteo de a uno, las primeras hordas aparecen en grupo
      // (sección "ritmo de oleadas" — preferir muchos enemigos débiles a pocos con mucha vida,
      // más sensación de horda desde temprano). Se reduce a 1 desde el nivel 4 en adelante, así
      // que NO afecta el ritmo ya calibrado de niveles medios/tardíos ni la curva de dificultad.
      const burstSize = runLevel<=1 ? 3 : (runLevel<=3 ? 2 : 1);
      for(let i=0;i<burstSize;i++) maybeAssignRole(spawnEnemy(pickFromPool(spawnPoolFor(runLevel)), false));
    } else if(spawnTimer<=0){
      spawnTimer = 400; // reintenta pronto sin acumular una ráfaga cuando el campeón caiga
    }
    const subBossLevels = arenaDef() ? (arenaDef().subBossLevels||[]) : ((currentArena==="hielo"||currentArena==="laberinto"||currentArena==="acuatica") ? [6] : (currentArena==="bosque" ? [9] : [4,7,9]));
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
      } else if(currentArena==="infernal" && runLevel===9){
        hechSpawnSubboss(); // el Hechicero Supremo se revela (inf-hechicero.js)
      } else {
        const champType = currentArena==="hielo"
          ? "dragon_hielo"
          : (runLevel===4 ? "esqueleto_h" : (runLevel===7 ? "demonio_menor" : "golem"));
        const champ = spawnEnemy(champType, false, true);
        showBanner("¡" + champ.name + " campeón!");
      }
    }
    levelTimer += dt;
    if(levelTimer >= levelDuration && !levelClearing && !arenaHook("holdLevel")){
      if(runLevel === LEVEL_COUNT){
        startBossFight();
      } else {
        beginLevelClear(); // la horda restante cae, respiro corto, y después la elección de refuerzo
      }
    }
  } else {
    if(boss && !boss.alive){ /* handled in killEnemy */ }
  }

  updateBossHud(dt);
  updateHUD();
}

// Controles, temporizadores y efectos por tiempo del héroe que maneja una persona (`player`).
// En multijugador el anfitrión la usa también para cada invitado (netWithHero presta `player`).
function updateControlledHero(dt){
  // player movement
  player.moving = false;
  if(Math.hypot(joyVec.x,joyVec.y) > 0.08){
    facing = {x:joyVec.x, y:joyVec.y};
    const l = Math.hypot(facing.x,facing.y); facing.x/=l; facing.y/=l;
    player.fx = facing.x; player.fy = facing.y;
    const spd = player.baseSpeed * runStats.speedMult * arenaRuleSpeedMult() * setSpeedMult(player) * (1-Math.min(0.8,player.slowAmt||0)) * (player.stunTimer>0?0:1) * ((axiomFreezeTimer>0 && axiomFreezeCaster!==player)?0:1) * (player.fused?0:1) * (player.sylvaCharging?0.55:1) * heroSpeedMult(player);
    player.x += joyVec.x*spd*dt/1000;
    player.y += joyVec.y*spd*dt/1000;
    clampToArena(player);
    resolveWallCollision(player);
    player.moving = !player.fused;
    player.animT += dt;
  }
  // objetos/sets/rendimiento de TODO el equipo: una sola vez por cuadro (no por cada invitado)
  if(!player.isRemote){ for(const h of heroes){ updateItemProcTimers(h, dt); updateSets(h, dt); updateUniquePowers(h, dt); samplePerformance(h, dt); } updateMythicGrounds(dt); updateUniqueFissures(dt); }
  if(player.attackAnim>0) player.attackAnim -= dt;
  if(player.hurtTimer>0) player.hurtTimer -= dt;
  if(basicHeld) triggerBasic(player);

  // timers
  player.basicCd = Math.max(0, player.basicCd-dt);
  for(let i=0;i<3;i++) player.cds[i] = Math.max(0, player.cds[i]-dt);
  player.ultCd = Math.max(0, player.ultCd-dt);
  player.energy = Math.min(player.maxEnergy, player.energy + player.cls.energyRegen*runStats.energyRegenMult*arenaMods().heroEnergyRegenMult*arenaRuleEnergyRegenMult()*dt/1000);
  if(runStats.regenPct>0 && player.alive) player.hp = Math.min(player.maxHp, player.hp + player.maxHp*runStats.regenPct*arenaRuleHealMult()*dt/1000);
  if(player.shieldTimer>0){ player.shieldTimer-=dt; if(player.shieldTimer<=0) player.shield=0; }
  if(player.stats) sampleTankPresence(player, dt);
  if(player.buffTimer>0){ player.buffTimer-=dt; if(player.buffTimer<=0){ player.buffDmgMult=1; player.buffAtkSpeedMult=1; player.buffLifesteal=0; player.buffDefMult=1; player.buffBleedOnHit=false; player.spinDurationMult=1; player.colossalTimer=0; if(player.pendingHpBonus){ player.maxHp=Math.max(1,player.maxHp-player.pendingHpBonus); player.hp=Math.min(player.hp,player.maxHp); player.pendingHpBonus=0; } } }
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
}
// Partículas simples (chispas, anillos, cadáveres...): avanzan y se descartan al terminar.
function stepParticles(dt){
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
}
