"use strict";
/* ============================================================
   js/arenas/abismo/ab-boss-rule.js
   BOSS IDENTITY — EL QUE MORA DEBAJO. REGLA: EL PISO ES SU ARMA (y su debilidad son los tentáculos).
   Lo que ya hacía la pelea (ab-bosses.js): sus golpes pesados agrietan y hunden plataformas, los
   patrones de fase 2 desprenden partes enteras y el Abismo las devuelve; la regla de seguridad deja
   SIEMPRE piso conectado; caer = colgarse del borde y cualquiera (bots incluidos) puede rescatar.
   Esta capa suma:
   - Romper un TENTÁCULO le transmite el golpe y ABRE EL OJO: ventana EXPUESTO (se lee en el HUD).
   - ANTI-KITE: si todos se alejan del pozo, el piso bajo sus pies empieza a desprenderse (fragmentos
     marcados que agrietan la plataforma): quedarse lejos no es seguro.
   - CAZADOR AMBIENTAL (fase 2+): el JINETE SIN CABEZA cruza el Abismo a la carga; su embestida empuja
     a guardianes Y enemigos hacia el vacío. Se lo puede usar para tirar a la horda.
   Anfitrión (ganchos de ARENA_DEFS.abismo).
   ============================================================ */
const AB_RULE = { exposeMs:3200, exposeMult:1.5, kiteR:600, kiteMs:5000, riderEvery:[26000, 32000], riderFrom:2 };
function abRuleTick(dt){
  if(!abS || !abS.mo || abS.mo.st!=="fight" || runLevel!==LEVEL_COUNT) return;
  const e = abMoradorEntity(); if(!e) return;
  const M = abS.mo, tents = enemies.filter(o=>o.alive && o.type==="ab_tentaculo").length;
  e._encTag = e._expT > 0 ? null : tents ? `TENTÁCULOS: ${tents} · rompelos para abrirle el OJO` : "EL OJO VIGILA";
  // ANTI-KITE: el piso lejos del pozo se desprende bajo los que se esconden
  if(bossHeroesFarMs(e, AB_RULE.kiteR, dt) > AB_RULE.kiteMs){
    e._kiteMs = 0;
    for(const h of heroes){
      if(!h.alive || h.abHang || Math.hypot(h.x - e.x, h.y - e.y) < AB_RULE.kiteR) continue;
      const x = h.x, y = h.y;
      bossStrike(x, y, 95, 1300, e.dmg*0.7, "rock", null);
      runLater(1300, ()=>{ if(abS && abS.mo.st==="fight") abDamageArea(x, y, 110, 6); });
    }
    showBanner("El piso lejos del pozo se desprende: ¡no hay dónde esconderse!");
    playSfx("abRumble");
  }
  // CAZADOR AMBIENTAL: el Jinete cruza el Abismo (fase 2+)
  if(M.ph >= AB_RULE.riderFrom){
    M.riderT = (M.riderT===undefined ? 6000 : M.riderT) - dt;
    if(M.riderT <= 0){
      M.riderT = AB_RULE.riderEvery[0] + Math.random()*(AB_RULE.riderEvery[1] - AB_RULE.riderEvery[0]);
      if(!enemies.some(o=>o.alive && o.type==="ab_jinete")){
        const h = bossFarthestHero(e.x, e.y) || player, a = Math.atan2(h.y, h.x) + Math.PI*0.5;
        const p = abNearestGround(Math.cos(a)*AB_R.hub, Math.sin(a)*AB_R.hub*AB_ASP, 30);
        const r = abSpawnAt("ab_jinete", p.x, p.y); r.x = p.x; r.y = p.y; r.xp = Math.round(r.xp*0.5);
        vfxShock(p.x, p.y, 10, 120, "150,90,255", 600, 2);
        showBanner("🐎 El JINETE SIN CABEZA cabalga por el Abismo: su carga tira al vacío a quien toque… guardianes y horda");
        if(typeof tutSay==="function" && !tutSeen("ab_rider")) tutSay("ab_rider", "La embestida del Jinete empuja a TODOS hacia el vacío, también a los enemigos. Esquivala de costado… o ponele la horda en el camino.", null, 9000, true);
      }
    }
  }
}
// un tentáculo roto abre el ojo (ventana EXPUESTO real, en vez del multiplicador suelto de antes)
function abRuleTentacleCut(b){
  if(!b || !b.alive) return;
  b.hp = Math.max(1, b.hp - b.maxHp*0.04);
  bossExpose(b, AB_RULE.exposeMs, AB_RULE.exposeMult, null);
  b.stunTimer = 0;                        // el ojo se abre, pero el Abismo no se detiene
  floatText(b.x, b.y - 140, "¡EL OJO SE ABRE!", "crit");
}
{
  const D = ARENA_DEFS.abismo, up0 = D.update;
  D.update = function(dt){ const r = up0.apply(this, arguments); abRuleTick(dt); return r; };
}
