"use strict";
/* ============================================================
   js/rendering/entities.js
   Dibujo de héroes y enemigos (cuerpo + overlays: barras, auras, estados) y de
   proyectiles.
   ============================================================ */

function drawHero(h){
  const colossal = h.colossalTimer>0;
  const drawScale = (colossal ? h.scale*1.55 : (h.growTimer>0 ? h.scale*(h.growScale||1) : h.scale)) * uniqueScaleMult(h);
  if(h._deadAt) h._deadAt = 0;
  drawUniqueAura(h);
  const prof = animProfileOf(h);
  const P = animPose(h, prof, true);
  const lift = P.oy<0 ? Math.min(0.35, -P.oy/60) : 0;
  drawShadow(h.x, h.y, h.radius*(colossal?1.3:0.85)*(1-lift));
  if(divinaMode) drawDivinaTeamRing(h, h.isDivineFoe ? "enemy" : "player");
  if(h.isDivineFoe) drawDivineAura(h);
  drawGroundSigil(h);

  const spinning = h.spinTimer>0;
  const stealthed = h.stealthTimer>0;

  ctx.save();
  animApply(h.x, h.y, P);
  drawHeroBody(h, drawScale, spinning, stealthed);
  if(P.flash>0.02 && !stealthed){
    ctx.globalCompositeOperation = "lighter";
    const m = ANIM_ALPHA_MUL; ANIM_ALPHA_MUL = P.flash; ctx.globalAlpha = P.flash;
    drawHeroBody(h, drawScale, spinning, false);
    ANIM_ALPHA_MUL = m;
  }
  ctx.restore();
  if(P.glow>0.02 && P.glowRgb && !stealthed){
    const gr = h.radius*2.4*(0.7+0.5*P.glow);
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = Math.min(0.8, P.glow*0.65);
    ctx.drawImage(glowSprite(P.glowRgb), h.x+P.ox-gr, h.y+P.oy-h.radius*1.3-gr, gr*2, gr*2);
    ctx.restore();
  }
  drawHeroOverlays(h, colossal, spinning);
}
// Cuerpo del campeón según su arte real (atlas / poses recortadas / procedural de respaldo).
// Lo comparten el dibujo normal, el hit flash y la caída al morir.
function drawHeroBody(h, drawScale, spinning, stealthed){
  if(champPackPending(h.classKey)) return; // nunca el arte viejo mientras baja el redibujado
  // El Mago usa su propio atlas de sprites (arte provisto por el usuario) en vez del sprite
  // procedural; el resto de las clases sigue exactamente igual que antes.
  if(h.classKey==="mago" && drawMagoAtlas(h, drawScale, stealthed?0.32:1)){
    // dibujado con éxito desde el atlas; nada más que hacer en este bloque
  } else if(h.classKey==="soporte" && drawSoporteAtlas(h, drawScale, stealthed?0.32:1)){
    // dibujado con éxito desde el atlas; nada más que hacer en este bloque
  } else if(h.classKey==="segador" && drawSegadorReal(h, drawScale, stealthed?0.32:1)){
    // Segador Olvidado ("Berserk"): dibujado con éxito desde su sprite real nuevo
  } else if(h.classKey==="axiom" && drawAxiomReal(h, drawScale, stealthed?0.32:1)){
    // Axiom: dibujado con éxito desde su sprite real
  } else if(h.classKey==="profeta" && drawProfetaAtlas(h, drawScale, h.fused ? 0.10 : (stealthed?0.32:1))){
    // La Profeta: dibujado con éxito desde su sprite real. Alpha casi 0 mientras está
    // "fused" (Ascensión del Elegido): fusionada con el aliado, prácticamente invisible.
  } else if(h.classKey==="musashi" && drawMusashiReal(h, drawScale, stealthed?0.32:1)){
    // Musashi: dibujado con éxito desde sus sprites reales recortados (idle/run/ataque/hurt).
  } else if(h.classKey==="cazadora" && drawSylvaReal(h, drawScale, stealthed?0.32:1)){
    // Sylva: dibujado con éxito desde sus sprites reales recortados.
  } else if(h.classKey==="libertador" && drawLibertador(h, drawScale, stealthed?0.32:1)){
    // El Libertador: a pie / a caballo (js/champions/libertador.js)
  } else if(h.classKey==="eren" && drawEren(h, drawScale, stealthed?0.32:1)){
    // Eren: humano / El Portador (js/champions/eren.js)
  } else if(h.classKey==="nigromante" && h.nigroDemonForm && drawNigromanteDemon(h, drawScale, stealthed?0.32:1)){
    // Nigromante transformado (Encarnación del Abismo): Demonio Nigromántico.
  } else if(h.classKey==="nigromante" && drawNigromanteReal(h, drawScale, stealthed?0.32:1)){
    // Nigromante: dibujado con éxito desde sus sprites reales recortados.
  } else if(drawKnightAbilityFx(h, drawScale, stealthed?0.32:1)){
    // Caballero con Torbellino/Estampida/Grito activo: dibujado desde el paquete de habilidades
  } else if(DIR_ATLASES[h.classKey] && drawDirAtlasHero(DIR_ATLASES[h.classKey], h, drawScale, stealthed?0.32:1)){
    // Caballero (tanque) o Asesino (guerrero): dibujado con éxito desde su atlas de 4 direcciones
  } else {
  const img = spinning && SPRITES[h.classKey] ? SPRITES[h.classKey].attack : heroFrame(h);
  if(img){
    if(stealthed) ctx.globalAlpha = 0.32*ANIM_ALPHA_MUL;
    drawRimLight(SPRITES[h.classKey], h.x, h.y, drawScale, h.fx < -0.12);
    drawOutline(SPRITES[h.classKey], h.x, h.y, drawScale, h.fx < -0.12);
    drawSprite(img, h.x, h.y, drawScale, h.fx < -0.12);
    if(SPRITES[h.classKey].shine && !stealthed){
      // Capa extra de brillo: orbe/hoja/filo mágico o metálico propio de cada clase, pulsando
      const pulse = 0.5+0.5*Math.sin(performance.now()/460 + h.animT*0.02);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = (0.18+0.30*pulse)*ANIM_ALPHA_MUL;
      drawSprite(SPRITES[h.classKey].shine, h.x, h.y, drawScale, h.fx < -0.12);
      ctx.restore();
    }
    if(stealthed){
      ctx.globalAlpha = 1;
      const now = performance.now()/1000;
      for(let i=0;i<3;i++){
        const a = now*3+i*2.1, r = 18+((now*20+i*9)%16);
        ctx.strokeStyle = `rgba(120,90,160,${0.4-r/60})`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(h.x, h.y, r, r*0.5, 0, 0, Math.PI*2); ctx.stroke();
      }
    }
  }
  else { ctx.fillStyle = h.cls.color; ctx.beginPath(); ctx.arc(h.x,h.y,h.radius,0,Math.PI*2); ctx.fill(); }
  }
}
// Auras, escudo, arma orbitando y barra de vida: fuera de la transformación de pose.
function drawHeroOverlays(h, colossal, spinning){
  if(h.atkAuraTimer>0 || h.shieldAuraTimer>0){
    // Aro de aura visible directamente sobre el personaje mientras dura un buff de equipo
    // (además del ícono del HUD), orbitando lentamente en sentidos opuestos según el buff.
    const t2 = performance.now()/1000;
    if(h.atkAuraTimer>0){
      ctx.save();
      ctx.globalAlpha = 0.5; ctx.strokeStyle = "#ff4a3d"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(h.x, h.y+4, h.radius*0.9, h.radius*0.42, 0, t2*2, t2*2+4.3); ctx.stroke();
      ctx.restore();
    }
    if(h.shieldAuraTimer>0){
      ctx.save();
      ctx.globalAlpha = 0.5; ctx.strokeStyle = "#5fb0ff"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(h.x, h.y+4, h.radius*1.02, h.radius*0.48, 0, -t2*2, -t2*2+4.3); ctx.stroke();
      ctx.restore();
      // Burbuja hexagonal real girando en loop (el aro fino de arriba queda como respaldo
      // mientras carga la imagen o si por algún motivo no está lista).
      if(newfxReady('holyShieldBubble')){
        const arr = NEWFX_IMG.holyShieldBubble;
        const idx = Math.floor(t2*3.2)%arr.length;
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        drawImgSized(arr[idx], h.x, h.y-2, h.radius*2.3, 0.5, 0.5, false, 0.7, 0);
        ctx.restore();
      }
    }
  }

  if(spinning){
    // El caballero se queda de pie: lo que gira a su alrededor es la espada y el remolino de viento
    const t = performance.now()/1000;
    const prog = h.spinMaxTimer>0 ? Math.max(0, h.spinTimer/h.spinMaxTimer) : 1;
    const orbitR = h.radius*1.15;
    const bladeAngle = t*11;

    // remolino de viento (varios anillos: más capas cuanto más talento tiene Torbellino)
    const windRings = 2 + (h.spinTier||1);
    for(let i=0;i<windRings;i++){
      const a = t*7 + i*(6.28/windRings);
      ctx.save();
      ctx.globalAlpha = 0.55*prog + 0.15;
      ctx.strokeStyle = "#9fe3ff"; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(h.x, h.y, 24+i*11, a, a+1.7);
      ctx.stroke();
      ctx.restore();
    }

    // espada orbitando alrededor del cuerpo (no el cuerpo girando)
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(bladeAngle);
    ctx.translate(orbitR, 0);
    ctx.rotate(Math.PI/2);
    ctx.fillStyle = "#e8eef4"; ctx.shadowColor = "#9fe3ff"; ctx.shadowBlur = 6;
    ctx.fillRect(-2, -12, 4, 12);
    ctx.fillStyle = "#6b4a2a"; ctx.shadowBlur = 0;
    ctx.fillRect(-3, -14, 6, 3);
    ctx.restore();
    // motion trail de la espada (un segundo destello más atrás en el giro)
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.translate(h.x, h.y);
    ctx.rotate(bladeAngle - 0.8);
    ctx.translate(orbitR, 0);
    ctx.rotate(Math.PI/2);
    ctx.fillStyle = "#9fe3ff";
    ctx.fillRect(-2, -12, 4, 12);
    ctx.restore();
  }

  if(colossal){
    ctx.save();
    const pulse = 0.5+0.5*Math.sin(performance.now()/160);
    ctx.strokeStyle = `rgba(255,90,60,${0.35+0.25*pulse})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(h.x, h.y+6, h.radius*1.6, h.radius*0.7, 0, 0, Math.PI*2); ctx.stroke();
    ctx.restore();
  }

  if(h.stormTimer>0){
    // armadura de fuego: aura roja pulsante con alguna chispa de hielo
    const now = performance.now()/1000;
    const pulse = 0.6+0.4*Math.sin(now*9);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(h.x, h.y-14, 4, h.x, h.y-14, 34);
    g.addColorStop(0, `rgba(255,110,40,${0.35*pulse+0.15})`);
    g.addColorStop(1, "rgba(255,110,40,0)");
    ctx.fillStyle = g; ctx.fillRect(h.x-34, h.y-48, 68, 68);
    ctx.restore();
    for(let i=0;i<3;i++){
      const a = now*4 + i*2.1;
      ctx.fillStyle = i===1 ? "rgba(190,230,255,0.85)" : "rgba(255,140,60,0.85)";
      ctx.fillRect(h.x+Math.cos(a)*20-2, h.y-14+Math.sin(a)*14-2, 4, 4);
    }
  }

  if(h.shield>0){
    ctx.strokeStyle = "rgba(143,208,255,0.75)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(h.x, h.y-14, h.radius*(colossal?1.5:1)+10, 0, Math.PI*2); ctx.stroke();
  }
  if(h === player){
    // Anillo del jugador para no confundirlo con los aliados
    ctx.strokeStyle = "rgba(255,207,92,0.75)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(h.x, h.y+5, 20, 8, 0, 0, Math.PI*2); ctx.stroke();
  } else {
    // Indicador de clase + vida sobre el aliado
    const w = 34, top = h.y - 58;
    ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(h.x-w/2, top, w, 5);
    ctx.fillStyle = "#c62828"; ctx.fillRect(h.x-w/2, top, w*Math.max(0,h.hp/h.maxHp), 5);
    ctx.fillStyle = h.cls.color; ctx.fillRect(h.x-w/2-7, top-1, 6, 6);
  }
}

function drawEnemy(e){
  const prof = animProfileOf(e);
  const P = animPose(e, prof, false);
  const lift = P.oy<0 ? Math.min(0.35, -P.oy/60) : 0;
  drawShadow(e.x, e.y, e.radius*0.8*(1-lift));
  if(SHINE_KEYS[e.type]){
    // Sombra de contacto extra, más ajustada y oscura, para anclar mejor al suelo
    // a los enemigos que aparecen desde el principio del juego.
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.30)";
    ctx.beginPath();
    ctx.ellipse(e.x, e.y+3, e.radius*0.55, e.radius*0.2, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }
  if(e.rank!=="normal"){
    // Jerarquía legible dentro de la horda: subélite = aro tenue; élite = aro dorado grueso que
    // gira (se encuentra de un vistazo entre 40 enemigos); subjefe = doble aro naranja; jefe =
    // aro ancho con brillo. No depende del sprite (atlas real o procedural de respaldo).
    const rankColor = e.rank==="jefe" ? "#ffb300" : (e.rank==="subjefe" ? "#ff8a3d" : (e.rank==="elite" ? "#ffe36a" : "#c9bd9c"));
    const t = animNow/1000, pulse = 0.5+0.5*Math.sin(t*4 + e.animT*0.01);
    const rx = e.radius*1.15, ry = e.radius*0.55;
    ctx.save();
    if(e.rank==="subelite"){
      ctx.globalAlpha = 0.2+0.1*pulse; ctx.strokeStyle = rankColor; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(e.x, e.y+4, rx, ry, 0, 0, Math.PI*2); ctx.stroke();
    } else {
      const big = e.rank==="jefe" || e.rank==="subjefe";
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.18+0.12*pulse;
      ctx.fillStyle = rankColor;
      ctx.beginPath(); ctx.ellipse(e.x, e.y+4, rx*1.05, ry*1.05, 0, 0, Math.PI*2); ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.55+0.3*pulse; ctx.strokeStyle = rankColor; ctx.lineWidth = big ? 4 : 3;
      ctx.setLineDash([10, 7]); ctx.lineDashOffset = -t*30;
      ctx.beginPath(); ctx.ellipse(e.x, e.y+4, rx, ry, 0, 0, Math.PI*2); ctx.stroke();
      ctx.setLineDash([]);
      if(big){ ctx.globalAlpha = 0.35; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(e.x, e.y+4, rx*1.22, ry*1.22, 0, 0, Math.PI*2); ctx.stroke(); }
    }
    ctx.restore();
  }
  // Cuerpo con la pose del sistema de animación (solo transformación visual: la hitbox no se mueve).
  ctx.save();
  animApply(e.x, e.y, P);
  drawEnemyBody(e);
  if(P.flash>0.02 && (prof.isBoss || animFlashBudget-- > 0)){
    ctx.globalCompositeOperation = "lighter";
    const m = ANIM_ALPHA_MUL; ANIM_ALPHA_MUL = P.flash; ctx.globalAlpha = P.flash;
    drawEnemyBody(e);
    ANIM_ALPHA_MUL = m;
  }
  ctx.restore();
  if(P.glow>0.02 && P.glowRgb){
    const gr = e.radius*2.2*(0.7+0.5*P.glow);
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = Math.min(0.85, P.glow*0.7);
    ctx.drawImage(glowSprite(P.glowRgb), e.x+P.ox-gr, e.y+P.oy-e.radius*1.1-gr, gr*2, gr*2);
    ctx.restore();
  }
  drawBossSkillAnim(e);
  drawEnemyOverlays(e);
}
// Dibujo del cuerpo del enemigo según qué arte real tenga (sin sombra/estado/barras): lo
// comparten el dibujo normal, el hit flash y la animación de muerte.
function drawEnemyBody(e){
  if(arenaHas("drawEnemyBody") && arenaHook("drawEnemyBody", e)){
    // cuerpo propio de la arena (El Reino Micelial: núcleos, raíces, la Madre por partes)
  } else if(drawBossFxReplace(e)){
    // habilidad del Dragón de Hielo en curso: reemplaza al sprite normal, no dibujar nada más
  } else if(drawAcuaticaReal(e)){
    // dibujado con éxito desde los sprites reales de la Arena Acuática (tiburones/medusa/cangrejo/sirena)
  } else if(drawRealAnimSprite(e)){
    // dibujado con éxito desde la hoja de animación real del Laberinto Maldito (o el Minotauro)
  } else if(drawPackSprite(e)){
    // dibujado con éxito desde los recortes reales del Pack 2 (Duende del Bosque)
  } else if(drawIceRealSprite(e)){
    // dibujado con éxito desde el sprite real limpiado a mano (Ángel/Lobo/Gólem/Demonio de Hielo)
  } else if(drawEnemyAtlas(e)){
    // dibujado con éxito desde el atlas real (esqueleto, demonio_menor/mayor/mago, golem)
  } else {
  const spriteKey = (ENEMY_BASE[e.type] && ENEMY_BASE[e.type].visualAlias) || e.type;
  const sp = SPRITES["enemy_"+spriteKey];
  let img = null;
  if(sp){
    if(e.attackAnim > 0) img = sp.attack;
    else if(e.hitFlash > 55 && sp.hurt) img = sp.hurt;   // retroceso al recibir daño
    else {
      const set = (e.fy < -0.45 && sp.back) ? sp.back : sp.walk;
      img = set[Math.floor(e.animT/150)%4];
    }
  }
  if(img){
    drawRimLight(sp, e.x, e.y, e.scale, e.fx < -0.12);
    drawOutline(sp, e.x, e.y, e.scale, e.fx < -0.12);
    drawSprite(img, e.x, e.y, e.scale, e.fx < -0.12);
    if(e.hitFlash>0 && sp.flash){
      ctx.save();
      ctx.globalAlpha = Math.min(0.42, e.hitFlash/200);
      drawSprite(sp.flash, e.x, e.y, e.scale, e.fx < -0.12);
      ctx.restore();
    }
    if(sp.shine){
      // Capa extra de brillo: destello metálico pulsante en arma/escudo (o herida palpitante en el zombi)
      const pulse2 = 0.5+0.5*Math.sin(performance.now()/480 + e.animT*0.02);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = (0.15+0.28*pulse2)*ANIM_ALPHA_MUL;
      drawSprite(sp.shine, e.x, e.y, e.scale, e.fx < -0.12);
      ctx.restore();
    }
  }
  }
}
// Estados, nombre y barra de vida: fuera de la transformación, para que no bailen con la pose.
function drawEnemyOverlays(e){
  if(e.role) drawEnemyRoleMarks(e); // insignia + anillo del rol enemigo (enemy-roles.js)
  if(e.armorTimer>0){
    // Armadura de Hielo activa: aura celeste pulsante mientras dura la reducción de daño
    const pulse = 0.55+0.45*Math.sin(performance.now()/150);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(e.x, e.y-e.radius*0.6, 4, e.x, e.y-e.radius*0.6, e.radius*1.7);
    g.addColorStop(0, `rgba(150,225,255,${0.34*pulse+0.14})`);
    g.addColorStop(1, "rgba(150,225,255,0)");
    ctx.fillStyle = g; ctx.fillRect(e.x-e.radius*1.7, e.y-e.radius*2.5, e.radius*3.4, e.radius*3.4);
    ctx.restore();
  }

  if(e.burnTimer>0){
    ctx.fillStyle = e.voidFire ? "rgba(176,106,255,0.65)" : "rgba(255,120,30,0.5)";
    for(let i=0;i<3;i++){
      ctx.fillRect(e.x-8+i*8, e.y-e.radius-18-((performance.now()/90+i*7)%10), 4, 5);
    }
  }
  if(e.cursed && e.curseTimer>0){
    // Nigromante — Plaga de los Condenados: aura verdosa pulsante mientras dure la maldición
    // (mismo criterio visual que burn/poison de arriba, propio para no confundirla con ellos).
    const pulseC = 0.5+0.5*Math.sin(performance.now()/220);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(80,230,140,${0.35+0.3*pulseC})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(e.x, e.y+2, e.radius*1.05, e.radius*0.5, 0, 0, Math.PI*2); ctx.stroke();
    ctx.fillStyle = `rgba(80,230,140,${0.18+0.14*pulseC})`;
    ctx.beginPath(); ctx.arc(e.x, e.y-e.radius*0.5, 3, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }
  // mojado (Conducción con el rayo): gotas que caen
  if((e.wetTimer>0 || (e.innateWet && currentArena!=="acuatica")) && inView(e.x, e.y, 0)){
    const t = animNow/140;
    ctx.fillStyle = "rgba(120,200,240,0.85)";
    for(let i=0;i<3;i++){ const k = (t + i*0.33) % 1; ctx.fillRect(e.x-8+i*8, e.y-e.radius*1.2 + k*e.radius, 2, 3); }
  }
  // electrizado (Descarga Arcana / Conducción)
  if(e.shockedTimer>0 && Math.sin(animNow/35) > 0.2){
    ctx.strokeStyle = "rgba(255,232,106,0.9)"; ctx.lineWidth = 1.5;
    const a = animNow/60; ctx.beginPath(); ctx.moveTo(e.x+Math.cos(a)*e.radius*0.8, e.y-e.radius*1.1); ctx.lineTo(e.x, e.y-e.radius*0.7); ctx.lineTo(e.x-Math.cos(a)*e.radius*0.7, e.y-e.radius*0.4); ctx.stroke();
  }
  if(e.slowAmt>0.7 || e.frozenTimer>0){
    // congelado: bloque de hielo translúcido sobre la criatura
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = "#bfe8ff";
    ctx.fillRect(e.x-e.radius*0.9, e.y-e.radius*1.7, e.radius*1.8, e.radius*1.9);
    ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 1.5;
    ctx.strokeRect(e.x-e.radius*0.9, e.y-e.radius*1.7, e.radius*1.8, e.radius*1.9);
    ctx.beginPath();
    ctx.moveTo(e.x-e.radius*0.5, e.y-e.radius*1.3); ctx.lineTo(e.x+e.radius*0.3, e.y-e.radius*0.6);
    ctx.moveTo(e.x+e.radius*0.4, e.y-e.radius*1.5); ctx.lineTo(e.x-e.radius*0.2, e.y-e.radius*0.4);
    ctx.stroke();
    ctx.restore();
  } else if(e.slowAmt>0){
    ctx.strokeStyle = "#8fd0ff"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(e.x, e.y+4, e.radius, e.radius*0.4, 0, 0, Math.PI*2); ctx.stroke();
  }
  if(e.stunTimer>0){
    ctx.fillStyle = "#ffd24a";
    ctx.fillRect(e.x-10, e.y-e.radius-26, 4, 4);
    ctx.fillRect(e.x+2, e.y-e.radius-30, 4, 4);
  }
  if(e.bleedTimer>0){
    ctx.fillStyle = "rgba(200,20,20,0.55)";
    ctx.fillRect(e.x-6, e.y+e.radius*0.4, 3, 5);
    ctx.fillRect(e.x+3, e.y+e.radius*0.5, 3, 6);
  }
  if(e.poisonTimer>0){
    const bub = 0.5+0.5*Math.sin(performance.now()/140);
    ctx.fillStyle = `rgba(90,220,110,${0.4+0.3*bub})`;
    ctx.beginPath(); ctx.arc(e.x-5, e.y-e.radius*0.6, 2.2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(e.x+4, e.y-e.radius*0.9, 1.8, 0, Math.PI*2); ctx.fill();
  }
  if(e.regenTimer>0){
    const pulse = 0.55+0.45*Math.sin(performance.now()/180);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(e.x, e.y-e.radius*0.6, 4, e.x, e.y-e.radius*0.6, e.radius*1.6);
    g.addColorStop(0, `rgba(70,220,110,${0.32*pulse+0.12})`);
    g.addColorStop(1, "rgba(70,220,110,0)");
    ctx.fillStyle = g; ctx.fillRect(e.x-e.radius*1.6, e.y-e.radius*2.4, e.radius*3.2, e.radius*3.2);
    ctx.restore();
  }
  if(e.rank==="jefe" || e.rank==="subjefe"){
    ctx.save();
    ctx.font = "bold 11px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(0,0,0,0.8)";
    ctx.fillText(e.name, e.x+1, e.y-e.radius-21);
    ctx.fillStyle = "#ffcf5c";
    ctx.fillText(e.name, e.x, e.y-e.radius-22);
    ctx.restore();
  }
  // Barras de vida: las comunes solo aparecen cuando ya recibieron daño (menos ruido en la
  // horda); élites y subjefes siempre, más gruesas y con marco; el jefe usa la barra grande de
  // arriba de la pantalla (ver boss-hud.js).
  const hpPct = Math.max(0, e.hp/e.maxHp);
  if(e.rank==="jefe" && e===boss){ /* barra grande de jefe en el HUD */ }
  else if(e.rank==="elite" || e.rank==="subjefe"){
    const big = e.rank==="subjefe";
    const bw = Math.max(e.radius*2.2, big ? 70 : 44), bh = big ? 8 : 6;
    const by = e.y - e.radius - (big ? 16 : 14);
    ctx.fillStyle = "rgba(0,0,0,0.75)"; ctx.fillRect(e.x-bw/2-2, by-2, bw+4, bh+4);
    ctx.fillStyle = big ? "#ff8a3d" : "#e0b43a"; ctx.fillRect(e.x-bw/2, by, bw*hpPct, bh);
    ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.fillRect(e.x-bw/2, by, bw*hpPct, 2);
    if(!big){
      // gema de élite sobre la barra
      ctx.fillStyle = "#ffe36a"; ctx.strokeStyle = "rgba(0,0,0,0.8)"; ctx.lineWidth = 1.5;
      const gx = e.x, gy = by-8;
      ctx.beginPath(); ctx.moveTo(gx, gy-6); ctx.lineTo(gx+5, gy); ctx.lineTo(gx, gy+5); ctx.lineTo(gx-5, gy); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  } else if(hpPct < 0.999){
    const bw = Math.max(e.radius*1.7, 24);
    const by = e.y - e.radius - 12;
    ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(e.x-bw/2, by, bw, 4);
    ctx.fillStyle = e.rank==="jefe" ? "#ffb300" : "#e04a3a";
    ctx.fillRect(e.x-bw/2, by, bw*hpPct, 4);
  }
  if(e.electrifiedTimer>0){
    // Aura eléctrica real (sprite) de Cadena de Relámpagos mientras dura el efecto
    const age = (e.electrifiedSize!==undefined ? 1 : 0); // solo para evitar warnings; usa reloj global
    CadenaRelampagos.draw(ctx, "electrificado", performance.now()/1000, e.x, e.y-e.radius*0.3, e.electrifiedSize||70);
  }
}

const _entPool = [], _entList = [];
let _entN = 0;
function _entPush(y, e, h, w, p){
  let it = _entPool[_entN];
  if(!it){ it = _entPool[_entN] = {y:0, e:null, h:null, w:null, p:null}; }
  it.y = y; it.e = e; it.h = h; it.w = w||null; it.p = p||null; _entN++;
}
function _entSort(a, b){ return a.y-b.y; }
function drawProjectileFx(p){
  if(p.fortSpr && arenaHook("drawProjectile", p)) return;
  if(p.lob){
    // tiro en arco: sombra en el piso + proyectil elevado según la altura del arco
    ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = "#000";
    ctx.beginPath(); ctx.ellipse(p.x, p.y, 10, 5, 0, 0, Math.PI*2); ctx.fill(); ctx.restore();
    const y0 = p.y; p.y = y0 - (p.lobH||0); _drawProjCore(p); p.y = y0; return;
  }
  _drawProjCore(p);
}
function _drawProjCore(p){
  const rgb = hexToRgb(p.color);
  const r = Math.max(3, p.radius);
  const sp = Math.hypot(p.vx||0, p.vy||0)||1;
  const tl = Math.min(r*4, sp*0.05);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = p.color; ctx.lineWidth = Math.max(2, r*0.8);
  ctx.beginPath(); ctx.moveTo(p.x-(p.vx||0)/sp*tl, p.y-(p.vy||0)/sp*tl); ctx.lineTo(p.x, p.y); ctx.stroke();
  ctx.globalAlpha = 0.85;
  const g = r*2.6;
  ctx.drawImage(glowSprite(rgb), p.x-g, p.y-g, g*2, g*2);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  const style = p.sprite ? null : projStyleOf(p); // forma propia de cada campeón (skill-evolution.js)
  if(style && drawProjStyle(p, style, r)){ ctx.restore(); return; }
  if(p.sprite==="orb" && acua2Ready("fxOrb")){
    drawImgSized(acua2Pick("fxOrb",0), p.x, p.y, r*3.4, 0.5, 0.5, false, undefined, animNow/300);
  } else {
    ctx.fillStyle = p.color; ctx.fillRect(p.x-r/2, p.y-r/2, r, r);
    ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.fillRect(p.x-r/4, p.y-r/4, r/2, r/2);
  }
  ctx.restore();
}
