"use strict";
/* ============================================================
   js/assets/boss-sheets.js
   Arte de las hojas de jefes (art-source/hielo_jefes/): Mago de Hielo y Cristal, Ángel Caído de
   Hielo, Jinete Sin Cabeza, Tundraverx, Gólem de Cristal y esbirros de cristal, más sus efectos.
   - Cuerpos: ENEMY_ATLAS_PACK (mismo motor que Dama del Bosque / Hechicero), con sets de habilidad
     que la IA pide con bossSheetPack(e, set, ms) -nova, lanza, canalización, vuelo, alas...-.
   - Efectos: se suman a VFX_SPR_EXTRA para usarlos con vfxSprite(); también como proyectil
     (p.sprite = clave) en drawProjectile.
   Datos generados: js/assets/boss-sheets-meta.js (tools/art/hielo_jefes/build.py).
   ============================================================ */
for(const k in BOSS_SHEET_ATLAS){
  const A = BOSS_SHEET_ATLAS[k];
  enemyAtlasPackLoad(k, A.src, A.meta);
  ENEMY_ATLAS_PACK[k].hMul = A.hMul;
}
for(const k in BOSS_SHEET_FX){
  const F = BOSS_SHEET_FX[k];
  const imgs = F.srcs.map(s=>{ const im = new Image(); im.src = s; return im; });
  VFX_SPR_EXTRA[k] = { imgs, ready:()=>imgs.every(im=>im.complete && im.naturalWidth > 0), ground:F.ground };
}
// Animación de habilidad sobre el cuerpo (la descuenta bossSheetTick, no la IA de cada arena).
function bossSheetPack(e, set, ms){
  const P = ENEMY_ATLAS_PACK[e.type];
  if(!P || !P.sets[set]) return;
  e.packSet = set; e.packTimer = ms; e.packDur = ms; e._bsPack = true;
}
// Efecto de hoja en el mundo (atajo de vfxSprite con los defaults de estas hojas).
function bossSheetFx(key, x, y, h, dur, o){
  o = o || {};
  const n = (VFX_SPR_EXTRA[key] && VFX_SPR_EXTRA[key].imgs.length) || 1;
  vfxSprite(key, 0, x, y, h, dur, o.follow || null, o.grow === undefined ? 0 : o.grow, !!o.flip, o.anchorY === undefined ? 0.5 : o.anchorY,
            o.fps || Math.max(6, n * 1000 / dur), o.vx || 0, o.vy || 0, o.rot || 0);
}
// Por cuadro, para los tipos de estas hojas: descuento del packSet y la estela de fuego del Minotauro.
function bossSheetTick(e, dt){
  if(e._bsPack && e.packTimer > 0){ e.packTimer -= dt; if(e.packTimer <= 0){ e.packSet = null; e._bsPack = false; } }
  if(e.type === "minotauro" && e.bossCharge){
    e._minoFireT = (e._minoFireT || 0) - dt;
    if(e._minoFireT <= 0){
      e._minoFireT = 140;
      const c = e.bossCharge, a = Math.atan2(c.dy, c.dx);
      bossSheetFx("bsMinoFire", e.x - c.dx * e.radius * 0.9, e.y - c.dy * e.radius * 0.4, e.radius * 1.3, 520, {rot:a, anchorY:0.6});
    }
  }
}
