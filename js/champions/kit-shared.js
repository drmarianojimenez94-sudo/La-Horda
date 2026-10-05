'use strict';
/* ============================================================
   js/champions/kit-shared.js — BASE COMPARTIDA DE LOS KITS NUEVOS (Expedición, Ascensión)
   Filtro de habilidades (docs/bible/ABILITY_GATE.md): todo campeón tiene una habilidad de área, otra que daña a varios,
   una de potenciación y una definitiva que suma varias cosas. Este archivo da:
     · kitBuff(src, aliado, ms, {dmg, armor, speed, label}): potenciaciones estándar, medibles y legibles (un ícono
       flotante sobre quien la recibe). +daño se aplica en damageEnemy; armadura en portadorTakenMult; velocidad con
       el temporizador de los portadores.
     · kitFx(tema, x, y, r): el efecto visual de la habilidad con los sprites y partículas que ya tiene el motor
       (agua, ola, vórtice, viento, luz, escudo, púas, hielo, rayo, sombra, fuego, tierra, plumas), así cada
       habilidad muestra lo que dice que hace. Respeta "Reducir efectos intensos" (fxBudget).
   ============================================================ */
function kitBuff(src, a, ms, o){
  if(!a || !a.alive || a.fused) return;
  const t = runElapsedMs; o = o || {};
  if(o.dmg){ const on = (a._kitDmgUntil||0) > t; a._kitDmgPct = Math.max(on ? (a._kitDmgPct||0) : 0, o.dmg); a._kitDmgUntil = Math.max(a._kitDmgUntil||0, t + ms); }
  if(o.armor){ const on = (a._kitArmorUntil||0) > t; a._kitArmorPct = Math.max(on ? (a._kitArmorPct||0) : 0, Math.min(.5, o.armor)); a._kitArmorUntil = Math.max(a._kitArmorUntil||0, t + ms); }
  if(o.speed){ const on = a.portSpeedTimer > 0; a.portSpeedBonus = Math.max(on ? (a.portSpeedBonus||0) : 0, o.speed); a.portSpeedTimer = Math.max(a.portSpeedTimer||0, ms); }
  if(typeof floatText === "function" && !(a._kitBuffTextAt > t)){ a._kitBuffTextAt = t + 700; floatText(a.x, a.y - 58, o.label || (o.dmg ? "+DAÑO" : o.armor ? "+ARMADURA" : "+VELOCIDAD"), null); }
  if(src && src.stats && a !== src) src.stats.buffsGiven = (src.stats.buffsGiven||0) + 1;
}
function kitBuffActive(a){ const t = runElapsedMs; return !!a && ((a._kitDmgUntil||0) > t || (a._kitArmorUntil||0) > t); }
// Potenciaciones en el daño: +daño del que pega, armadura del que recibe.
(function(){
  const oDmg = damageEnemy;
  damageEnemy = function(e, amount, opts){ const h = opts && opts.src;
    if(h && h._kitDmgUntil > runElapsedMs && !(opts && opts.execute)) amount *= 1 + (h._kitDmgPct||0);
    return oDmg.apply(this, [e, amount].concat([].slice.call(arguments, 2))); };
  const oTaken = portadorTakenMult;
  portadorTakenMult = function(h, src){ let m = oTaken(h, src); if(h && h._kitArmorUntil > runElapsedMs) m *= 1 - (h._kitArmorPct||0); return m; };
})();

// Temas visuales: sprites reales del motor + partículas. [sprite, alto, color de onda, paleta de partículas]
const KIT_FX = {
  water:  ['fxSplash', 70, [80,200,230], 't_#7fe9ff'],   wave:   ['fxWave', 90, [60,170,220], 't_#bff7ff'],
  vortex: ['fxVortex', 90, [120,110,255], 't_#b8b0ff'],  wind:   ['fxWhirl', 80, [230,240,255], 't_#ffffff'],
  light:  ['fxHolyHealBurst', 96, [255,230,140], 't_#fff1b8'], shield: ['fxHolyShieldBubble', 80, [180,220,255], 't_#d9f0ff'],
  spike:  ['fxSpike', 80, [190,200,215], 't_#dfe6ee'],    ice:    ['fxIceCrystal', 40, [170,230,255], 't_#e0f8ff'],
  bolt:   ['fxBolt', 90, [255,240,140], 't_#fff6a0'],     dark:   ['fxSoulReapBurst', 120, [60,40,80], 't_#3a2a55'],
  slash:  ['fxScytheSlash', 70, [240,240,250], 't_#ffffff'], spark: ['fxSpark', 50, [255,210,120], 't_#ffd27a'],
  fire:   ['fortFireBurst', 80, [255,140,60], 't_#ff9a3c'],  earth: ['fxSpike', 60, [160,120,80], 't_#b08a5a'],
  feather:['fxWhirl', 70, [255,250,235], 't_#fff6e0'],    rune:   ['fxFrostRune', 40, [200,180,255], 't_#d6c8ff']
};
function kitFx(theme, x, y, r, opts){
  const T = KIT_FX[theme]; if(!T) return;
  r = r || 60; opts = opts || {};
  const budget = typeof fxBudget === "function" ? fxBudget(1) : 1;
  if(typeof vfxShock === "function") vfxShock(x, y, Math.max(8, r*0.25), r, T[2], opts.ult ? 620 : 420, opts.ult ? 3 : 2);
  if(budget && typeof vfxSprite === "function" && vfxSprReady(T[0])) vfxSprite(T[0], 0, x, y + (T[0]==='fxHolyHealBurst' ? 2 : 6), Math.max(T[1], r*(opts.ult ? 1.4 : 1)), opts.ult ? 700 : 480, null, 0.12, false, 0.8, 8);
  if(budget && typeof vfxBurst === "function") vfxBurst(x, y - 6, Math.round((opts.ult ? 22 : 12) * (r/90 + .4)), T[3], opts.ult ? 240 : 160, opts.ult ? 700 : 500, 3, opts.ult ? 2 : 1, -40, 0);
}
// Línea temática (cortes, corrientes, rayos): una estela de partículas a lo largo del trazo.
function kitFxLine(theme, ax, ay, bx, by, w){
  const T = KIT_FX[theme]; if(!T || typeof vfxSpray !== "function") return;
  const L = Math.hypot(bx-ax, by-ay) || 1, n = Math.max(3, Math.min(9, Math.round(L/45)));
  for(let i = 0; i <= n; i++){ const u = i/n; vfxSpray(ax + (bx-ax)*u, ay + (by-ay)*u, 3, T[3], (bx-ax)/L, (by-ay)/L, 120, 380, 2.5, 1); }
  if(typeof vfxSprReady === "function" && vfxSprReady(T[0])) vfxSprite(T[0], 0, bx, by + 6, Math.max(40, (w||30)*1.6), 380, null, 0.1, bx < ax, 0.8, 8);
}
// Indicador persistente: chevrones dorados (+daño) y anillo celeste (armadura) sobre quien está potenciado.
(function(){
  if(typeof drawPortadorTop !== "function") return;
  const oTop = drawPortadorTop;
  drawPortadorTop = function(){ oTop.apply(this, arguments); const t = runElapsedMs;
    for(const h of heroes){ if(!h.alive) continue;
      const dmgOn = (h._kitDmgUntil||0) > t, armOn = (h._kitArmorUntil||0) > t; if(!dmgOn && !armOn) continue;
      ctx.save(); const bob = Math.sin(t/160)*2;
      if(dmgOn){ ctx.fillStyle = '#ffd34d'; ctx.strokeStyle = '#3a2508'; ctx.lineWidth = 1.5;
        for(let i = 0; i < 2; i++){ const y = h.y - 64 - i*6 + bob; ctx.beginPath(); ctx.moveTo(h.x - 7, y + 4); ctx.lineTo(h.x, y - 2); ctx.lineTo(h.x + 7, y + 4); ctx.lineTo(h.x + 7, y + 7); ctx.lineTo(h.x, y + 1); ctx.lineTo(h.x - 7, y + 7); ctx.closePath(); ctx.fill(); ctx.stroke(); } }
      if(armOn){ ctx.globalAlpha = .55 + .2*Math.sin(t/200); ctx.strokeStyle = '#bfe8ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(h.x, h.y - 6, 20, 9, 0, 0, Math.PI*2); ctx.stroke(); }
      ctx.restore(); }
  };
})();
