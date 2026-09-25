"use strict";
/* ============================================================
   js/rendering/renderer.js
   render(): dibuja un cuadro completo (cámara, escenario, entidades ordenadas por
   profundidad, efectos y overlays).
   ============================================================ */

function render(){
  ctx.clearRect(0,0,VW,VH);
  if(state!=="playing" && state!=="paused") return;
  animNow = performance.now();
  ANIM_ALPHA_MUL = 1; // resguardo: si un frame anterior se cortó a mitad de un fade, no arrastra el alpha

  ctx.save();
  ctx.imageSmoothingEnabled = false; // pixel art: siempre vecino más cercano
  ctx.scale(CAM_ZOOM, CAM_ZOOM);
  const shakeX = screenShake>0 ? (Math.random()-0.5)*screenShake : 0;
  const shakeY = screenShake>0 ? (Math.random()-0.5)*screenShake : 0;
  // cámara alineada a píxeles del dispositivo: sin temblor de medio píxel en el pixel art
  const _pxW = CAM_ZOOM*DPR;
  const camTX = Math.round((VW/2/CAM_ZOOM - player.x + shakeX)*_pxW)/_pxW;
  const camTY = Math.round(((VH/2 - CAM_Y_ANCHOR)/CAM_ZOOM - player.y + shakeY)*_pxW)/_pxW;
  ctx.translate(camTX, camTY);

  // Escenario: suelo, lava, muros, braseros
  drawArena();

  // partículas flotantes ambientales: brasas (Infernal), copos (Hielo) o luciérnagas (Bosque)
  const emberColor = currentArena==="hielo" ? "220,240,255" : currentArena==="bosque" ? "170,230,120" : "255,150,60";
  if(currentArena==="infernal") for(const em of embers){
    if(!inView(em.x, em.y, 20)) continue;
    const flicker = 0.5+0.5*Math.sin(em.phase*3);
    ctx.fillStyle = `rgba(${emberColor},${em.a*flicker})`;
    ctx.fillRect(em.x, em.y, 2, 2);
  }
  drawAcuaAmbience();
  drawHazardZones(); // pozos de lava (regla de la Arena Infernal)
  vfxDrawGround(); // telegraphs de zonas peligrosas + ondas de choque
  drawSetAuras(); // aura discreta de los sets completos (color del set, más intensa con su carga)
  drawAimPreview(); // previsualización de la habilidad que se está apuntando
  drawBossTethers(); // cadenas de hielo entre el Mago y sus guardianes
  vfxDrawSprites(true); // efectos de sprite real "de suelo" (bajo las entidades)

  // anillos de habilidad en el suelo
  for(const pt of particles){
    if(pt.ring || pt.warnRing){
      const base = pt.maxLife || (pt.warnRing ? 850 : 360);
      const prog = Math.max(0, Math.min(1, 1-(pt.life/base)));
      const r = Math.max(0, pt.maxR*(pt.warnRing?0.9:prog));
      if(r <= 0) continue;
      ctx.strokeStyle = pt.warnRing ? "rgba(255,90,40,0.85)" : (pt.color+"cc");
      ctx.lineWidth = pt.warnRing?3:5;
      ctx.beginPath(); ctx.arc(pt.x,pt.y+6,r,0,Math.PI*2); ctx.stroke(); // radio real del efecto (antes aplastado)
    }
  }

  // pociones en el suelo
  for(const p of potions){
    drawShadow(p.x, p.y, 9);
    drawPotion(p);
  }

  // muros de fuego del Mago
  for(const fw of fireWalls){
    drawFireWall(fw);
  }

  // trampas del Asesino
  for(const tr of traps){
    drawTrap(tr);
  }
  // zonas de Axiom (Error 404 / Bug de Colisión)
  drawAxiomZones();
  drawSylvaRainZones();
  drawAxiomVfxActive();

  // héroes caídos (se dibujan bajo los vivos); en la Arena Divina también los campeones rivales,
  // que antes desaparecían en el acto al morir
  for(const h of heroes){ if(!h.alive) drawFallenHero(h); }
  if(divinaMode){ for(const h of divinaEnemies){ if(!h.alive && !h.isBossChamp && h.classKey) drawFallenHero(h); } }

  // cuerpos de enemigos muriendo (debajo de los vivos)
  vfxDrawDying();

  // entidades ordenadas por profundidad (entradas reutilizadas: sin allocations por frame; los
  // enemigos fuera de cámara no se dibujan -no se veían igual- y eso libera mucho con hordas grandes)
  _entN = 0;
  _animCrowdCount = 0;
  for(const e of enemies){
    if(!e.alive) continue;
    if(!inView(e.x, e.y, e.rank==="jefe" ? e.radius*4 : Math.max(140, e.radius*3))) continue;
    _animCrowdCount++;
    _entPush(e.y, e, null);
  }
  for(const h of heroes){ if(h.alive) _entPush(h.y, null, h); }
  for(const w of iceWalls){ if(inView(w.x, w.y, 80)) _entPush(w.y, null, null, w); }
  if(!player.duelActive) aidPushTall(); // columnas, árboles, muros del Laberinto, estructuras de la Divina
  if(divinaMode){
    // Los campeones divinos son "héroes" (drawHero), salvo en el nivel de jefes (nivel 6),
    // donde son entidades tipo enemigo (drawEnemy) — ver makeDivinaBossChamp.
    for(const h of divinaEnemies){ if(h.alive){ if(h.isBossChamp) _entPush(h.y, h, null); else _entPush(h.y, null, h); } }
    for(const m of divinaMinions){ if(m.alive) _entPush(m.y, m, null); }
  }
  animCrowd = _animCrowdCount;
  animFlashBudget = animCrowd > 70 ? 12 : 30;
  _entList.length = _entN;
  for(let i=0;i<_entN;i++) _entList[i] = _entPool[i];
  const ents = _entList;
  ents.sort(_entSort);
  for(const it of ents){
    if(it.p){ aidDrawTall(it.p, animNow/1000); continue; }
    if(it.w){ drawIceWall(it.w); continue; }
    if(it.e){
      if(divinaMode && (it.e.isBossChamp || it.e.side)) drawDivinaTeamRing(it.e, it.e.side || "enemy");
      drawEnemy(it.e);
    } else {
      drawHero(it.h);
    }
  }
  for(const h of heroes){ if(h.wolf) drawSpectralWolf(h.wolf); }
  drawMusashiAfterimages();
  drawDownedMarkers();
  for(const h of heroes){
    if(h.golem) drawGolemReal(h.golem);
    if(h.skeletons && h.skeletons.length) for(const sk of h.skeletons) drawSkeletonMinion(sk);
  }
  drawAcua2Overlays();
  drawBossSkillOverlay();
  vfxDrawSprites();

  // proyectiles: núcleo + glow cacheado + estela (sin shadowBlur, que es caro en mobile)
  for(const p of projectiles){
    if(!inView(p.x, p.y, 60)) continue;
    drawProjectileFx(p);
  }
  if(divinaMode) drawDivinaStructProjectiles();

  // partículas
  for(const pt of particles){
    if(pt.corpse){
      const sp = SPRITES["enemy_"+pt.spriteType];
      const img = sp ? (sp.hurt || sp.walk[0]) : null;
      if(img){
        const prog = 1 - Math.max(0, pt.life/pt.maxLife);
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1-prog*1.15);
        ctx.translate(pt.x, pt.y);
        ctx.rotate((pt.flip?-1:1) * Math.min(1, prog*2.2) * Math.PI/2);  // cae de costado
        ctx.translate(0, Math.min(1, prog*2.2)*6);
        ctx.imageSmoothingEnabled = false;
        const w = img.width/SPR_PX*pt.scale*0.92, h = img.height/SPR_PX*pt.scale*0.92;
        ctx.drawImage(img, -w/2, -h*0.74, w, h);
        ctx.restore();
      }
    } else if(pt.bolt){
      ctx.save();
      ctx.globalAlpha = Math.max(0, pt.life/220);
      ctx.strokeStyle = pt.color; ctx.lineWidth = 3; ctx.shadowColor = pt.color; ctx.shadowBlur = 8;
      const dx = pt.x2-pt.x, dy = pt.y2-pt.y;
      ctx.beginPath(); ctx.moveTo(pt.x, pt.y-10);
      ctx.lineTo(pt.x+dx*0.33+(Math.random()-0.5)*14, pt.y-10+dy*0.33+(Math.random()-0.5)*14);
      ctx.lineTo(pt.x+dx*0.66+(Math.random()-0.5)*14, pt.y-10+dy*0.66+(Math.random()-0.5)*14);
      ctx.lineTo(pt.x2, pt.y2-10);
      ctx.stroke();
      ctx.restore();
    } else if(pt.spin){
      const prog = 1-(pt.life/pt.maxLife);
      const ang = prog*Math.PI*3.4;
      ctx.save();
      ctx.globalAlpha = Math.max(0, pt.life/pt.maxLife)*0.9;
      ctx.strokeStyle = pt.color; ctx.lineWidth = 3; ctx.shadowColor = pt.color; ctx.shadowBlur = 6;
      for(let k=0;k<2;k++){
        const a = ang + k*Math.PI;
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(pt.x+Math.cos(a)*pt.radius, pt.y+Math.sin(a)*pt.radius*0.6);
        ctx.stroke();
      }
      ctx.restore();
    } else if(pt.slash){
      ctx.strokeStyle = pt.color; ctx.lineWidth = 5; ctx.globalAlpha = pt.life/140;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, 30, 0, Math.PI*1.4); ctx.stroke();
      ctx.globalAlpha = 1;
    } else if(pt.crystal){
      // Esquirla de hielo que emerge del suelo: crece y luego se desvanece (N3 de la referencia)
      const prog = 1-(pt.life/pt.maxLife);
      const pop = Math.sin(Math.PI*Math.min(1,prog*1.3));
      ctx.save();
      ctx.globalAlpha = Math.max(0, pop);
      ctx.translate(pt.x, pt.y - pop*4);
      ctx.rotate(pt.angle);
      ctx.fillStyle = pt.color; ctx.shadowColor = pt.color; ctx.shadowBlur = 6;
      const s = pt.size*pop;
      ctx.beginPath();
      ctx.moveTo(0, -s); ctx.lineTo(s*0.4, 0); ctx.lineTo(0, s*0.6); ctx.lineTo(-s*0.4, 0);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
    } else if(pt.runeRing){
      // Círculo rúnico completo bajo el mago (N4 de la referencia): marcas giratorias en un anillo
      const alpha = Math.max(0, pt.life/pt.maxLife);
      const rot = performance.now()/900;
      ctx.save();
      ctx.globalAlpha = alpha*0.85;
      ctx.strokeStyle = pt.color; ctx.shadowColor = pt.color; ctx.shadowBlur = 5;
      for(let i=0;i<pt.count;i++){
        const a = rot + (i/pt.count)*Math.PI*2;
        const rx = pt.x+Math.cos(a)*pt.maxR, ry = pt.y+Math.sin(a)*pt.maxR*0.55;
        ctx.save();
        ctx.translate(rx, ry); ctx.rotate(a+Math.PI/2);
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0,-5); ctx.lineTo(0,5); ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    } else if(!pt.ring && !pt.warnRing){
      ctx.fillStyle = pt.color; ctx.globalAlpha = Math.max(0, pt.life/420);
      ctx.fillRect(pt.x, pt.y, 3, 3);
      ctx.globalAlpha = 1;
    }
  }

  vfxDrawParticles(); // partículas del pool central (impactos, muertes, casts, estelas)

  drawChainFX(); // sprites reales de Cadena de Relámpagos (rayos + impactos), dentro de la cámara

  aidAmbDraw(animNow/1000); // ambiente de primer plano: ceniza, nieve, hojas, polvo, motas
  aidGrade(animNow/1000);   // luz/color propio de la arena (debajo del HUD)
  drawFloatTexts();          // números de daño/curación y avisos, por encima de todo el mundo

  ctx.restore();
  drawScreenFeedback();      // viñeta de daño, dirección del golpe, flechas en el borde, destellos
}
