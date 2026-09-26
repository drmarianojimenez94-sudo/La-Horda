"use strict";
/* ============================================================
   js/enemies/ranged-styles.js
   Personalidad de los enemigos a distancia. Antes todos disparaban igual (una bola recta cada
   1,5 s); ahora cada familia tiene su forma de disparo, y se aprende a esquivarla:
   - "fan":  abanico de 3 (hechiceros, esfinge, arquera): se esquiva de costado, no hacia atrás.
   - "lead": tiro anticipado y rápido (ángeles, dama): apunta a donde vas; cambiar de dirección lo burla.
   - "wave": orbe lento que ondula (hadas, sirenas, medusas): ocupa más espacio, pero es lento.
   - "lob":  proyectil en arco (dragones, druida, clérigo): marca el piso donde cae; salir del círculo.
   Los que no figuran usan el disparo recto de siempre.
   ============================================================ */
const RANGED_STYLE = {
  demonio_mago:"fan", esfinge:"fan", doblador_arquera:"fan",
  angel_hielo:"lead", dama_bosque:"lead",
  enjambre_hadas:"wave", sirena_abisal:"wave", medusa:"wave",
  dragoncito_hielo:"lob", dragon_hielo:"lob", druida_arena:"lob", doblador_clerigo:"lob"
};
function _enemyShot(e, vx, vy, dmg, extra){
  const p = {x:e.x, y:e.y, vx, vy, dmg, life:2200, radius:7, color:ENEMY_PROJ_COLOR[e.type]||"#ff5a3d", enemy:true, src:e, rank:e.rank,
    sprite: e.type==="sirena_abisal" ? "orb" : ((typeof ENEMY_PROJ_SPRITE!=="undefined" && ENEMY_PROJ_SPRITE[e.type]) || undefined)};
  if(extra) Object.assign(p, extra);
  projectiles.push(p);
  return p;
}
// Dispara según la familia. Devuelve el enfriamiento (ms) hasta el próximo disparo.
function enemyRangedAttack(e, tgt, dx, dy, dist){
  const sp = e.projSpeed||240, dmg = e.dmg*(e.basicMult||1);
  const style = RANGED_STYLE[e.type];
  e.attackAnim = 320;
  if(style==="fan"){
    const a0 = Math.atan2(dy, dx);
    for(let k=-1;k<=1;k++){ const a = a0 + k*0.22; _enemyShot(e, Math.cos(a)*sp, Math.sin(a)*sp, dmg*0.7); }
    return 2100;
  }
  if(style==="lead"){
    // anticipa el movimiento del objetivo (con algo de error para no ser perfecto)
    const v = tgt===player ? {x:(joyVec.x||0)*(player.speed||200), y:(joyVec.y||0)*(player.speed||200)} : {x:0, y:0};
    const s2 = sp*1.25, tHit = dist/s2*0.8;
    const ax = tgt.x + v.x*tHit - e.x, ay = tgt.y + v.y*tHit - e.y, l = Math.hypot(ax, ay)||1;
    _enemyShot(e, ax/l*s2, ay/l*s2, dmg, {radius:6});
    return 1700;
  }
  if(style==="wave"){
    const p = _enemyShot(e, dx/dist*sp*0.72, dy/dist*sp*0.72, dmg, {radius:10, life:2800});
    p.wave = {t:Math.random()*6, amp:46, bx:e.x, by:e.y};
    return 1800;
  }
  if(style==="lob"){
    const tx = tgt.x + (Math.random()-0.5)*30, ty = tgt.y + (Math.random()-0.5)*30, R = 52;
    const dur = 950 + Math.min(500, dist*0.9);
    const p = _enemyShot(e, 0, 0, dmg*1.2, {radius:9, life:dur+100});
    p.lob = {sx:e.x, sy:e.y, tx, ty, t:0, dur, r:R};
    vfxTelegraph({shape:0, r:R, x:tx, y:ty, follow:null, dur, rgb:hexToRgb(p.color)});
    return 2300;
  }
  _enemyShot(e, dx/dist*sp, dy/dist*sp, dmg);
  return 1500;
}
// Movimiento especial por cuadro. Devuelve true si el proyectil ya resolvió su golpe (lob).
function updateEnemyProjectileStyle(p, dt){
  if(p.wave){
    // ondula perpendicular a su trayectoria
    const w = p.wave, sp = Math.hypot(p.vx, p.vy)||1, nx = -p.vy/sp, ny = p.vx/sp;
    const prev = Math.sin(w.t)*w.amp; w.t += dt/1000*5.5; const now = Math.sin(w.t)*w.amp;
    p.x += nx*(now-prev); p.y += ny*(now-prev);
    return false;
  }
  if(p.lob){
    const L = p.lob; L.t += dt;
    const k = Math.min(1, L.t/L.dur);
    p.x = L.sx + (L.tx-L.sx)*k; p.y = L.sy + (L.ty-L.sy)*k;
    p.lobH = Math.sin(k*Math.PI) * Math.min(160, 60 + Math.hypot(L.tx-L.sx, L.ty-L.sy)*0.35);
    if(k >= 1){
      for(const h of heroes){ if(h.alive && Math.hypot(h.x-L.tx, h.y-L.ty) <= L.r + (h.radius||18)*0.5) damageHero(h, p.dmg, {x:L.tx, y:L.ty, rank:p.rank}); }
      vfxShock(L.tx, L.ty, 6, L.r, hexToRgb(p.color), 320, 1);
      vfxBurst(L.tx, L.ty, 8, "spark", 110, 280, 3, 0, -30, 1);
      p.life = 0;
    }
    return true;
  }
  return false;
}
