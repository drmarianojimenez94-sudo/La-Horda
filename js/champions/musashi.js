"use strict";
/* ============================================================
   js/champions/musashi.js
   Musashi: Concentración, Marca de Duelo, Paso Fantasma y Último Duelo
   (arena de bolsillo).
   ============================================================ */

/* ============================================================
   MUSASHI, EL ESPADACHÍN MALDITO — mecánicas propias
   ============================================================
   Todo lo específico de Musashi vive en este bloque (Marca de Duelo/Concentración, Senda
   del Rōnin, Último Duelo + arena de bolsillo aislada). El resto del combate (daño base,
   maestría, talentos, objetos) sigue pasando por las mismas funciones genéricas de siempre
   -musashiCombatMods() solo AGREGA sus propios bonus encima, nunca reemplaza el pipeline-.
   Constantes ajustables (sección 34 del pedido: "constantes fácilmente editables"):
   ============================================================ */
const MUSASHI_CONC_MAX = 10;
const MUSASHI_PERFECT_STEP_WINDOW = 220; // ms de anticipo para que Paso Fantasma cuente como Paso Perfecto
const MUSASHI_COMBO_WINDOW_MS = 1100;    // si dejó de golpear este tiempo, el combo de 3 golpes se reinicia
// "Arena de bolsillo" del Último Duelo: un lugar del mismo mundo de juego, MUY lejos de la
// arena real (así ninguna habilidad/ally/enemigo externo puede alcanzarlo por distancia, sin
// tener que tocar cada sistema de combate uno por uno) y con su propio radio, muchísimo más
// chico que ARENA_RADIUS (1050). Cada Último Duelo activo usa su propio "slot" para que dos
// duelos simultáneos (dos Musashi) no compartan el mismo espacio.
const MUSASHI_DUEL_POCKET_BASE = {x:60000, y:60000};
const MUSASHI_DUEL_POCKET_STEP = 4000;
const MUSASHI_DUEL_RADIUS = 150;
let musashiDuelSlotsUsed = 0;
let musashiAfterimages = [];   // estelas visuales de Paso Fantasma (puramente decorativas)
let musashiSecondCuts = [];    // corte demorado de Corte del Rōnin en Duelo Perfecto

// Concentración (0-10): tramos 1-3 dan daño, 4-6 dan probabilidad de crítico, 7-9 dan daño
// crítico, 10 activa Duelo Perfecto -sección 8 del pedido, fórmula exacta ahí especificada-.
function musashiConcentrationBonuses(conc){
  const c = Math.max(0, Math.min(MUSASHI_CONC_MAX, conc||0));
  return {
    dmgMult: 0.03 * Math.min(c,3),
    critChanceAdd: 0.02 * Math.min(Math.max(c-3,0),3),
    critMultAdd: 0.05 * Math.min(Math.max(c-6,0),3),
    perfect: c>=MUSASHI_CONC_MAX
  };
}
// Senda del Rōnin: bonus PERSISTENTE toda la partida por cada Victoria de Duelo (sección
// 19-23). El de crítico tiene rendimiento decreciente por victoria pero es acumulativo.
function musashiRoninCritChanceBonus(victories){
  let total = 0;
  for(let n=1;n<=victories;n++) total += (n<=10) ? (11-n) : 1;
  return total/100;
}
function musashiRoninBonuses(h){
  const v = (h.stats && h.stats.duelVictories) || 0;
  return { dmgMult: v*0.05, critChanceAdd: musashiRoninCritChanceBonus(v), critMultAdd: v*0.10 };
}
// Bonus temporales de Último Duelo (sección 16): se derivan en vivo de la config de la
// ultimate mientras duelActive sea true, así desaparecen solos al terminar el duelo -sin
// tener que "restaurar" nada a mano, ni arriesgarse a pisar otro buff genérico del héroe-.
function musashiDuelUltMods(h){
  if(!h.duelActive) return {speedMult:1, atkSpeedMult:1, dmgMult:1, critChanceBonus:0, critMultBonus:0, ghostStepCdMult:1};
  const u = CLASSES.musashi.ultimate;
  return {speedMult:u.speedMult, atkSpeedMult:u.atkSpeedMult, dmgMult:u.dmgMult, critChanceBonus:u.critChanceBonus, critMultBonus:u.critMultBonus, ghostStepCdMult:musashiGhostStepCdMult(h)};
}
// Talento "Duelo Fantasma" (Maestría Fantasma Eterno): reduce aún más el cooldown de Paso
// Fantasma mientras dura Último Duelo, por encima del recorte base de la ultimate.
function musashiGhostStepCdMult(h){
  const bonus = talentSkillMods(h.classKey, "ult").flags.ghostStepCdMultBonus||0;
  return Math.max(0.05, CLASSES.musashi.ultimate.ghostStepCdMult - bonus);
}
// Combina los 3 sistemas propios de Musashi (Concentración + Senda del Rōnin + buffs de
// Último Duelo) en un solo paquete, aplicado UNA sola vez sobre el daño/crítico base (sección
// 20: "evitar double-dipping"). Se usa en todos los puntos donde Musashi hace daño.
function musashiCombatMods(h){
  const conc = musashiConcentrationBonuses(h.concentration||0);
  const ronin = musashiRoninBonuses(h);
  const duel = musashiDuelUltMods(h);
  return {
    dmgMult: (1 + conc.dmgMult + ronin.dmgMult) * duel.dmgMult,
    critChance: Math.min(1, runStats.critChance + conc.critChanceAdd + ronin.critChanceAdd + duel.critChanceBonus),
    critMult: (runStats.critMult||1.8) + conc.critMultAdd + ronin.critMultAdd + duel.critMultBonus,
    perfect: conc.perfect
  };
}
// Marca de Duelo (sección 7): golpear a un objetivo nuevo lo marca y arranca la Concentración
// en `amount`; seguir golpeando al MISMO objetivo ya marcado simplemente suma. Cambiar de
// objetivo (golpear a otro distinto) reinicia todo -tal como pide el pedido-.
function musashiAddConcentration(h, target, amount){
  if(!target) return;
  if(h.duelTarget===target && h.duelTarget.alive){
    h.concentration = Math.min(MUSASHI_CONC_MAX, h.concentration + amount);
  } else {
    h.duelTarget = target;
    h.concentration = Math.min(MUSASHI_CONC_MAX, amount);
  }
}
function musashiClearMark(h){ h.duelTarget = null; h.concentration = 0; }
function musashiSpawnAfterimage(h){
  musashiAfterimages.push({x:h.x, y:h.y, fx:h.fx, fy:h.fy, classKey:h.classKey, life:240, maxLife:240});
}
// Procesa las estelas de Paso Fantasma y el corte demorado de Duelo Perfecto (mismo patrón que
// ya usa el resto del juego para efectos con demora -ver axiomZones-, nunca setTimeout: todo
// tiene que poder pausarse/acelerarse con el resto del loop de juego).
function updateMusashiFx(dt){
  for(const a of musashiAfterimages) a.life -= dt;
  musashiAfterimages = musashiAfterimages.filter(a=>a.life>0);
  if(musashiSecondCuts.length){
    for(const c of musashiSecondCuts) c.timer -= dt;
    const ready = musashiSecondCuts.filter(c=>c.timer<=0);
    musashiSecondCuts = musashiSecondCuts.filter(c=>c.timer>0);
    ready.forEach(c=>{
      if(c.target && c.target.alive && c.caster.alive){
        damageEnemy(c.target, c.dmg, {src:c.caster, critChanceOverride:c.critChance, critMultOverride:c.critMult});
        pushSpark("impacto", c.target.x, c.target.y, 40, 220);
        if(c.caster===player) floatText(c.target.x, c.target.y-30, "2º CORTE", "crit");
      }
    });
  }
}
// ---------------------------------------------------------------------------------------
// ÚLTIMO DUELO (sección 13-19): transporta a Musashi + su Marca a una "arena de bolsillo"
// aislada -ver comentario de MUSASHI_DUEL_POCKET_BASE-, deja a los demás jugadores en la
// arena real sin tocarlos, y los devuelve a su posición original al terminar.
// ---------------------------------------------------------------------------------------
function enterLastDuel(m, target, sk){
  const slot = musashiDuelSlotsUsed++;
  const pocket = {x: MUSASHI_DUEL_POCKET_BASE.x + slot*MUSASHI_DUEL_POCKET_STEP, y: MUSASHI_DUEL_POCKET_BASE.y};
  m.duelReturnX = m.x; m.duelReturnY = m.y;
  target._duelReturnX = target.x; target._duelReturnY = target.y;
  m.duelActive = true; m.duelOpponent = target; m.duelPocket = pocket;
  m.duelTimer = sk.duration; m.duelMaxTimer = sk.duration; m.duelGraceTimer = 0; m.duelResult = null;
  m.concentration = MUSASHI_CONC_MAX; // "obtiene inmediatamente 10 Concentración" (sección 16)
  m.duelTarget = target;
  m._preDuelBaseSpeed = m.baseSpeed;
  m.baseSpeed *= sk.speedMult;
  target.isDuelLocked = true; target.duelOwner = m;
  m.x = pocket.x - 70; m.y = pocket.y;
  target.x = pocket.x + 70; target.y = pocket.y;
  m.invulnTimer = Math.max(m.invulnTimer||0, 260);
  if(m===player) showBanner("¡ÚLTIMO DUELO!");
  playSfx("ult");
  particles.push({x:m.x,y:m.y, life:400, ring:true, maxLife:400, maxR:60, color:"#ff5c4a"});
  // Banner decorativo real (arte del zip de Musashi, antes sin usar): portal de entrada a la
  // arena de bolsillo, superpuesto arriba de los dos duelistas -no reemplaza su dibujo normal-.
  vfxSprite("musashiPortal", 0, pocket.x, pocket.y-46, 130, 700, null, 0.12, false, 0.7, 0);
}
function exitLastDuel(m, result){
  const target = m.duelOpponent;
  m.duelActive = false;
  m.duelResult = result;
  m.baseSpeed = m._preDuelBaseSpeed || m.baseSpeed;
  m.x = m.duelReturnX; m.y = m.duelReturnY;
  clampToArena(m);
  if(target){
    target.isDuelLocked = false; target.duelOwner = null;
    if(target.alive){ target.x = target._duelReturnX; target.y = target._duelReturnY; }
  }
  m.duelOpponent = null; m.duelTimer = 0; m.duelMaxTimer = 0;
  if(result!=="win") musashiClearMark(m); // en "win" el objetivo ya murió; no hay nada que limpiar
  if(m===player){
    if(result==="lose") showBanner("Duelo perdido");
    else if(result==="timeout") showBanner("Se acabó el tiempo del duelo");
  }
}
// Golpe de Gracia (sección 18): Musashi queda inmóvil un instante antes de que el duelo se dé
// por terminado de verdad -así la Victoria de Duelo se siente como un golpe final, no como un
// simple "enemigo murió, cerrar pantalla"-. Llamado desde killEnemy cuando el que muere es la
// Marca de Duelo de ALGUIEN que está en Último Duelo con él ahora mismo.
function musashiHandleDuelWin(m, target){
  // Talento "Golpe de Gracia Superior" (Maestría Filo Perfecto): el instante de victoria dura
  // más -más pantalla de shake, más tiempo de "presentación" antes de volver a la arena real-.
  const graceBonus = 1+(talentSkillMods(m.classKey, "ult").flags.graceStrikeBonus||0);
  m.duelGraceTimer = 650*graceBonus;
  m.stunTimer = Math.max(m.stunTimer||0, 650*graceBonus);
  screenShake = Math.max(screenShake, 6);
  if(m===player) floatText(m.x, m.y-50, "GOLPE DE GRACIA", "crit");
  // Banner decorativo real (antes sin usar), superpuesto sobre Musashi durante el mismo lapso
  // que ya dura el Golpe de Gracia (no alarga ni acorta nada de la mecánica existente).
  vfxSprite("musashiFinish", 0, m.x, m.y-40, 110, 650*graceBonus, m, 0.08, m.fx<-0.12, 0.7, 0);
}
// Se llama una vez por frame para cada héroe (ver update()): procesa el temporizador del
// duelo, la ventana del Golpe de Gracia, y mantiene a los dos participantes dentro del
// pequeño cuadrilátero -lejos de todo lo demás, que sigue su curso en la arena real-.
function updateLastDuel(h, dt){
  if(h.duelGraceTimer>0){
    h.duelGraceTimer -= dt;
    if(h.duelGraceTimer<=0){
      h.stats.duelVictories = (h.stats.duelVictories||0) + 1;
      if(h===player) showBanner("VICTORIA DE DUELO — SENDA DEL RŌNIN +"+h.stats.duelVictories);
      musashiClearMark(h);
      exitLastDuel(h, "win");
    }
    return;
  }
  if(!h.duelActive) return;
  if(!h.alive){ exitLastDuel(h, "lose"); return; }
  const target = h.duelOpponent;
  if(!target || !target.alive){ exitLastDuel(h, "win"); return; } // salvaguarda: no debería llegar acá sin pasar por musashiHandleDuelWin
  h.duelTimer -= dt;
  if(h.duelTimer<=0){ exitLastDuel(h, "timeout"); return; }
  const R = MUSASHI_DUEL_RADIUS, pocket = h.duelPocket;
  [h, target].forEach(ent=>{
    const dx=ent.x-pocket.x, dy=ent.y-pocket.y, d=Math.hypot(dx,dy);
    if(d>R){ const a=Math.atan2(dy,dx); ent.x=pocket.x+Math.cos(a)*R; ent.y=pocket.y+Math.sin(a)*R; }
  });
}
// Fondo del dojo del Último Duelo: plataforma cuadrada de madera oscura, torii y luna roja de
// fondo (referencia del material entregado), dibujado con las mismas primitivas de canvas que
// ya usa el resto de las arenas -nada de esto es arte de terceros, es 100% procedural-.
function drawLastDuelArena(m){
  const now = performance.now()/1000;
  const pocket = m.duelPocket;
  ctx.save();
  ctx.fillStyle = "#0a0508";
  ctx.fillRect(pocket.x-1400, pocket.y-1000, 2800, 2000);
  // luna roja + torii lejanos, puramente decorativos (no afectan colisión)
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = "#7a1f1f";
  ctx.beginPath(); ctx.arc(pocket.x+220, pocket.y-260, 90, 0, Math.PI*2); ctx.fill();
  ctx.globalAlpha = 0.35; ctx.fillStyle="#3a1010";
  ctx.beginPath(); ctx.arc(pocket.x+220, pocket.y-260, 90, 0, Math.PI*2); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "rgba(150,40,30,0.55)"; ctx.lineWidth = 10;
  ctx.beginPath(); ctx.moveTo(pocket.x-260,pocket.y-150); ctx.lineTo(pocket.x-260,pocket.y-40); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(pocket.x-190,pocket.y-150); ctx.lineTo(pocket.x-190,pocket.y-40); ctx.stroke();
  ctx.lineWidth = 14;
  ctx.beginPath(); ctx.moveTo(pocket.x-280,pocket.y-150); ctx.lineTo(pocket.x-170,pocket.y-150); ctx.stroke();
  // plataforma del dojo: cuadrado de madera, mucho más chico que la arena real
  const R = MUSASHI_DUEL_RADIUS*1.35;
  ctx.translate(pocket.x, pocket.y);
  ctx.fillStyle = "#241610";
  ctx.fillRect(-R,-R,R*2,R*2);
  ctx.strokeStyle = "rgba(0,0,0,0.6)"; ctx.lineWidth = 3;
  for(let i=-Math.floor(R/22);i<=Math.floor(R/22);i++){
    ctx.beginPath(); ctx.moveTo(i*22,-R); ctx.lineTo(i*22,R); ctx.stroke();
  }
  const pulse = 0.6+0.4*Math.sin(now*1.4);
  ctx.strokeStyle = `rgba(200,60,40,${0.5+0.3*pulse})`; ctx.lineWidth = 8;
  ctx.strokeRect(-R,-R,R*2,R*2);
  ctx.strokeStyle = "rgba(255,150,80,0.5)"; ctx.lineWidth = 2;
  ctx.strokeRect(-R+10,-R+10,R*2-20,R*2-20);
  // faroles en las 4 esquinas
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sy])=>{
    const lx=sx*(R-16), ly=sy*(R-16);
    const flicker = 0.6+0.4*Math.sin(now*5+sx*3+sy*2);
    ctx.fillStyle = `rgba(255,160,60,${0.5+0.4*flicker})`;
    ctx.beginPath(); ctx.arc(lx,ly,7,0,Math.PI*2); ctx.fill();
  });
  ctx.restore();
  // viñeta oscura para enmarcar el duelo
  const vg = ctx.createRadialGradient(pocket.x,pocket.y,R*0.4,pocket.x,pocket.y,R*2.6);
  vg.addColorStop(0,"rgba(0,0,0,0)"); vg.addColorStop(1,"rgba(0,0,0,0.75)");
  ctx.fillStyle = vg; ctx.fillRect(pocket.x-R*2.6,pocket.y-R*2.6,R*5.2,R*5.2);
}
