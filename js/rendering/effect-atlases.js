"use strict";
/* ============================================================
   js/rendering/effect-atlases.js
   Atlas de efectos de habilidades (hielo, aliento, habilidades del Asesino, Axiom).
   ============================================================ */

const SKILL_ATLAS_DEF = {
  ventisca: {frames:12, w:181, h:160},
  nova_hielo: {frames:12, w:181, h:145},
  armadura_hielo: {frames:12, w:181, h:160},
  nova_escarcha: {frames:1, w:190, h:252},
};
// Un AnimAtlas por tipo (tira horizontal) para las habilidades del Mago de Hielo y
// Cristal -mismo dato SKILL_ATLAS_DEF de siempre, ahora armando el clip una sola vez.
const SKILL_ATLASES = {};
for(const _k in SKILL_ATLAS_DEF){
  const d = SKILL_ATLAS_DEF[_k];
  SKILL_ATLASES[_k] = { img: SKILL_ATLAS_IMG[_k], ready:()=>SKILL_ATLAS_READY[_k], clip: buildStripClip(d.frames, d.w, d.h, 20, false) };
}
const BOSS_FX_DEF = {
  aliento_hielo: {frames:12, w:128, h:140},
  nova_hielo_dragon: {frames:12, w:256, h:162},
};
// Un AnimAtlas por tipo, tira horizontal (buildStripClip), para las habilidades del Dragón
// de Hielo -mismo dato BOSS_FX_DEF de siempre, ahora armando el clip una sola vez al cargar
// en vez de recalcular sx/sy a mano en cada draw().
const BOSS_FX_ATLASES = {};
for(const _k in BOSS_FX_DEF){
  const d = BOSS_FX_DEF[_k];
  BOSS_FX_ATLASES[_k] = { img: BOSS_FX_IMG[_k], ready:()=>BOSS_FX_READY[_k], clip: buildStripClip(d.frames, d.w, d.h, 16, false) };
}
// Dibuja, REEMPLAZANDO por completo al sprite normal (a diferencia de drawBossSkillAnim, que
// se superpone), la animación de una habilidad del Dragón de Hielo: estas hojas ya traen al
// dragón dibujado adentro de cada frame (cuerpo + efecto juntos), así que mostrar el sprite
// normal AL MISMO TIEMPO duplicaría al dragón en pantalla. Devuelve true mientras la animación
// está en curso, para que drawEnemy no dibuje nada más encima.
function drawBossFxReplace(e){
  const fx = e.fxAnim;
  if(!fx) return false;
  const atlas = BOSS_FX_ATLASES[fx.name];
  if(!atlas || !atlas.ready()) return false;
  const clip = atlas.clip;
  if(animRawFrameCount(clip, fx.t) >= clip.frames.length){ e.fxAnim = null; return false; }
  const n = animFrameIndex(clip, fx.t);
  const f = clip.frames[0];
  const targetH = e.radius*2.6;
  const s = targetH/f.h;
  drawAnimFrameSized(atlas.img, clip, n, e.x, e.y, f.w*s, f.h*s, 0.5, 0.92, e.fx < -0.12, undefined);
  return true;
}



/* ============================================================
   ASESINO — sprites reales de sus 4 habilidades (Pestilencia Sombría,
   Triple Golpe, Trampa de Área, Corte Sangrante). Atlas reescalados a 336x336
   (celda de 84px) para entrar en el límite de tamaño del artifact publicado.
   Reemplaza SOLO el dibujo; daño, área, cooldown y demás reglas no cambian.
   ============================================================ */
const ASESINO_HAB_ANIM = {"pestilencia": {"sigilo": {"frames": [0, 1, 2, 3], "fps": 10, "loop": false}, "emboscada": {"frames": [4, 5, 6, 7], "fps": 10, "loop": false}, "cadena": {"frames": [8, 9, 10, 11], "fps": 14, "loop": true}, "veneno": {"frames": [12], "fps": 10, "loop": false}, "sangrado": {"frames": [13], "fps": 10, "loop": false}, "impacto": {"frames": [14], "fps": 10, "loop": false}, "reposo": {"frames": [0], "fps": 10, "loop": false}}, "triple_golpe": {"combo": {"frames": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], "fps": 10, "loop": false}, "primer_corte": {"frames": [12], "fps": 10, "loop": false}, "segundo_corte": {"frames": [13], "fps": 10, "loop": false}, "corte_final": {"frames": [14], "fps": 10, "loop": false}, "reposo": {"frames": [0], "fps": 10, "loop": false}}, "trampa": {"colocar": {"frames": [0, 1, 2, 3], "fps": 10, "loop": false}, "desplegar": {"frames": [4, 5, 6, 7], "fps": 10, "loop": false}, "armada": {"frames": [7], "fps": 10, "loop": false}, "activar": {"frames": [8, 9, 10, 11], "fps": 10, "loop": false}, "atrapado": {"frames": [12, 13], "fps": 8, "loop": true}, "restos": {"frames": [14], "fps": 10, "loop": false}, "reposo": {"frames": [0], "fps": 10, "loop": false}}, "corte_sangrante": {"corte": {"frames": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], "fps": 12, "loop": false}, "arco": {"frames": [12], "fps": 10, "loop": false}, "sangrado": {"frames": [13, 14], "fps": 6, "loop": true}, "reposo": {"frames": [0], "fps": 10, "loop": false}}};
const ASESINO_HAB_FRAME = 84, ASESINO_HAB_COLS = 4;

// Migrado al motor genérico AnimAtlas: un atlas por habilidad (mismo criterio que
// ENEMY_ANIM_ATLASES), cada uno construido a partir de la misma tabla ASESINO_HAB_ANIM de
// siempre vía buildAnimDefFromGrid -ni un solo número de recorte cambia de manos-.
const ASESINO_HAB_ANIM_ATLASES = {};
for(const _sk in ASESINO_HAB_IMG){
  ASESINO_HAB_ANIM_ATLASES[_sk] = wrapAnimImage(ASESINO_HAB_IMG[_sk], ()=>ASESINO_HAB_READY[_sk],
    buildAnimDefFromGrid(ASESINO_HAB_COLS, ASESINO_HAB_FRAME, ASESINO_HAB_FRAME, ASESINO_HAB_ANIM[_sk]));
}
// Dibuja un cuadro de una animación de habilidad del Asesino en (x,y), centrado, tamaño en px.
function drawAsesinoHab(skill, anim, ageMs, x, y, size, flip){
  const atlas = ASESINO_HAB_ANIM_ATLASES[skill];
  if(!atlas || !atlas.ready()) return false;
  const clip = atlas.def.clips[anim];
  if(!clip) return false;
  const n = animFrameIndex(clip, ageMs);
  drawAnimFrameSized(atlas.img, clip, n, x, y, size, size, 0.5, 0.8, flip, undefined);
  return true;
}
const AXIOM_VFX_DEF = {
  err404: {frames:13, w:120, h:160},
  overwrite: {frames:13, w:125, h:140},
  teleport_out: {frames:6, w:120, h:135},
  teleport_in: {frames:6, w:137, h:135},
  forcequit: {frames:13, w:120, h:145},
};
let activeAxiomVfx = [];
// Un AnimAtlas por tipo (tira horizontal) para los bursts de Axiom -mismo dato
// AXIOM_VFX_DEF de siempre, ahora armando el clip una sola vez al cargar.
const AXIOM_VFX_ATLASES = {};
for(const _k in AXIOM_VFX_DEF){
  const d = AXIOM_VFX_DEF[_k];
  AXIOM_VFX_ATLASES[_k] = { img: AXIOM_VFX_IMG[_k], ready:()=>AXIOM_VFX_READY[_k], clip: buildStripClip(d.frames, d.w, d.h) };
}
// (18 fps) sin importar cuántos frames traiga la hoja -mismo criterio que BOSS_FX/SKILL_ATLAS-.
function drawAxiomVfxBurst(x, y, key){
  const def = AXIOM_VFX_DEF[key];
  const life = def ? (def.frames/18)*1000 : 650;
  activeAxiomVfx.push({key, x, y, age:0, life});
}
function updateAxiomVfx(dt){
  for(const v of activeAxiomVfx) v.age += dt;
  activeAxiomVfx = activeAxiomVfx.filter(v=>v.age < v.life);
}
function drawAxiomVfxActive(){
  for(const v of activeAxiomVfx){
    const atlas = AXIOM_VFX_ATLASES[v.key];
    if(!atlas || !atlas.ready()) continue;
    const clip = atlas.clip;
    const f = clip.frames[0];
    const t = v.age/v.life;
    const alpha = t<0.15 ? t/0.15 : 1-((t-0.15)/0.85);
    const scale = 1 + t*0.25;
    const h2 = 90*scale, s = h2/f.h;
    const n = Math.min(clip.frames.length-1, Math.floor(t*clip.frames.length));
    drawAnimFrameSized(atlas.img, clip, n, v.x, v.y, f.w*s, f.h*s, 0.5, 0.5, false, Math.max(0,Math.min(1,alpha)));
  }
}
