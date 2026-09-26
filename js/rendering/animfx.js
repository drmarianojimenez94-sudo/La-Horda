"use strict";
/* ============================================================
   js/rendering/animfx.js
   AnimFX: animación procedural (golpe, retroceso, respiración, poses) y perfiles
   de personalidad por tipo de enemigo. Solo transforma el dibujo.
   ============================================================ */

/* ============================================================
   ANIMFX + VFX — sistema central de animación procedural y efectos visuales.
   Todo lo de acá transforma SOLO el dibujo (ctx.translate/rotate/scale y alpha):
   nunca toca x/y/radius/hp/cooldowns, así que hitboxes, colisiones y balance quedan
   exactamente iguales. Sobre sprites con hoja completa (atlas con caminata/ataque)
   las transformaciones se atenúan y actúan como complemento; sobre sprites estáticos
   o de pocas poses aportan todo el movimiento (respiración, pasos, ataques, golpes).
   ============================================================ */
let ANIM_ALPHA_MUL = 1;          // multiplicador de alpha para el cuerpo (lo respetan drawAnimFrame/Sized)
let animNow = 0, animDt = 16;    // reloj de render (ms) y dt del último frame
let animFlashBudget = 0;         // re-dibujados "lighter" de hit flash permitidos por frame
let animCrowd = 0;               // enemigos visibles el frame anterior (para LOD)
let _animCrowdCount = 0;

const ANIM_TIER = {
  // idle/walk/lean/attack = cuánto de cada preset se aplica según cuántos frames reales tiene el sprite
  full:    {idle:0.30, walk:0.0, lean:0.45, attack:0.45},
  walk:    {idle:0.40, walk:0.15, lean:0.6, attack:1.0},
  partial: {idle:0.70, walk:0.55, lean:0.8, attack:0.8},
  static:  {idle:1.0,  walk:1.0, lean:1.0, attack:1.0},
};
const ANIM_DEFAULT = {speed:1, weight:1, amp:1, recoil:1, lunge:8, cast:1, impact:1, particle:"spark", material:"flesh", basic:"melee", death:"fall", tier:null};
const ANIM_PROFILES = {
  // ---- campeones ----
  tanque:     {speed:0.8, weight:1.6, amp:0.7, recoil:1.2, lunge:12, cast:0.8, impact:1.5, particle:"spark",  basic:"melee",  tier:"full"},
  guerrero:   {speed:1.3, weight:0.8, amp:0.9, recoil:0.8, lunge:14, cast:0.8, impact:1.1, particle:"blood",  basic:"melee",  tier:"full"},
  mago:       {speed:0.9, weight:0.8, amp:0.5, recoil:0.4, lunge:2,  cast:1.6, impact:1.0, particle:"arcane", basic:"cast",   tier:"full"},
  soporte:    {speed:0.9, weight:0.9, amp:0.6, recoil:0.4, lunge:3,  cast:1.3, impact:0.9, particle:"holy",   basic:"cast",   tier:"full"},
  profeta:    {speed:1.0, weight:0.8, amp:0.6, recoil:0.5, lunge:4,  cast:1.4, impact:1.0, particle:"holy",   basic:"cast",   tier:"full"},
  segador:    {speed:0.85,weight:1.5, amp:0.9, recoil:1.3, lunge:16, cast:1.0, impact:1.5, particle:"blood",  basic:"melee",  tier:"static"},
  axiom:      {speed:1.1, weight:0.9, amp:0.6, recoil:0.6, lunge:4,  cast:1.4, impact:1.0, particle:"glitch", basic:"cast",   tier:"static"},
  musashi:    {speed:1.4, weight:0.8, amp:0.8, recoil:0.7, lunge:18, cast:0.9, impact:1.2, particle:"steel",  basic:"melee",  tier:"static"},
  cazadora:   {speed:1.2, weight:0.8, amp:0.8, recoil:1.0, lunge:4,  cast:1.0, impact:1.0, particle:"leaf",   basic:"ranged", tier:"static"},
  nigromante: {speed:0.8, weight:1.0, amp:0.45,recoil:0.5, lunge:3,  cast:1.5, impact:1.1, particle:"necro",  basic:"cast",   tier:"static"},
  libertador: {speed:0.9, weight:1.2, amp:0.5, recoil:1.6, lunge:6,  cast:1.1, impact:1.4, particle:"spark",  basic:"ranged", tier:"static"},
  eren:       {speed:1.4, weight:0.9, amp:0.8, recoil:0.8, lunge:14, cast:1.0, impact:1.3, particle:"blood",  basic:"melee",  tier:"static"},
  // ---- invocaciones ----
  nigro_skel: {speed:1.4, weight:0.6, amp:1.1, lunge:8,  impact:0.8, particle:"bone", material:"bone", tier:"static"},
  nigro_golem:{speed:0.55,weight:2.4, amp:0.6, lunge:12, impact:2.0, particle:"rock", material:"rock", tier:"static"},
  // ---- enemigos (personalidad; el resto usa el default ajustado por rango/tamaño) ----
  esqueleto:          {speed:1.4, weight:0.6, amp:1.2, lunge:8,  impact:0.8, material:"bone",  death:"crumble"},
  esqueleto_h:        {speed:1.2, weight:0.9, amp:1.0, lunge:10, impact:1.0, material:"bone",  death:"frames"},
  zombie:             {speed:0.7, weight:1.2, amp:1.1, lunge:6,  impact:0.9, material:"rot", death:"frames"},
  demonio_menor:      {speed:1.3, weight:0.9, lunge:12, material:"ember"},
  demonio_mago:       {speed:0.9, cast:1.4, basic:"cast", material:"ember", particle:"ember"},
  demonio_mayor:      {speed:0.7, weight:2.2, amp:0.7, lunge:18, cast:1.5, impact:2.2, material:"ember", particle:"ember", death:"collapse"},
  golem:              {speed:0.55,weight:2.4, amp:0.6, lunge:14, impact:2.2, material:"rock",  death:"crumble"},
  lobo_artico:        {speed:1.5, weight:0.6, lunge:12, material:"flesh"},
  golem_hielo:        {speed:0.6, weight:2.0, amp:0.7, lunge:10, impact:1.8, material:"ice",   death:"frames"},
  dragoncito_hielo:   {speed:1.3, weight:0.6, basic:"ranged", material:"ice"},
  angel_hielo:        {speed:0.9, basic:"cast", cast:1.3, material:"ice", death:"dissolve"},
  demonio_hielo_fuego:{speed:1.0, weight:1.2, lunge:12, material:"ember", death:"frames"},
  dragon_hielo:       {speed:0.7, weight:2.0, amp:0.8, basic:"ranged", impact:1.8, material:"ice", death:"collapse"},
  golem_cristal:      {speed:0.6, weight:2.0, amp:0.7, lunge:10, impact:1.8, material:"ice",   death:"frames"},
  cristal_servo:      {speed:1.1, lunge:12, material:"ice", death:"frames"},
  cristal_volador:    {speed:1.2, weight:0.4, amp:1.2, basic:"ranged", material:"ice", death:"frames"},
  mago_hielo_cristal: {speed:0.9, basic:"cast", cast:1.6, material:"ice", death:"dissolve"},
  angel_caido_hielo:  {speed:0.8, weight:2.0, basic:"cast", cast:1.7, impact:2.0, material:"ice", death:"collapse"},
  duende_bosque:      {speed:1.5, weight:0.5, amp:1.3, lunge:8, material:"leaf", death:"frames"},
  enjambre_hadas:     {speed:1.3, weight:0.3, amp:1.4, basic:"ranged", material:"spirit", death:"dissolve"},
  bestia_bosque:      {speed:1.3, weight:1.0, lunge:14, material:"flesh", death:"frames"},
  cu_sith:            {speed:1.4, weight:0.9, lunge:16, material:"spirit"},
  ent:                {speed:0.5, weight:2.4, amp:0.6, lunge:12, impact:2.0, material:"wood", death:"frames"},
  dama_bosque:        {speed:0.9, basic:"cast", cast:1.4, material:"spirit", death:"dissolve"},
  doblador_guerrero:  {speed:1.1, lunge:14, material:"spirit", death:"dissolve"},
  doblador_arquera:   {basic:"ranged", material:"spirit", death:"dissolve"},
  doblador_picaro:    {speed:1.5, weight:0.7, lunge:16, material:"spirit", death:"dissolve"},
  doblador_clerigo:   {basic:"cast", cast:1.3, material:"spirit", death:"dissolve"},
  jinete_sin_cabeza:  {speed:0.9, weight:2.0, lunge:20, impact:2.2, material:"shadow", particle:"shadow", death:"collapse"},
  escorpion_gigante:  {speed:1.4, weight:0.7, lunge:10, material:"chitin"},
  golem_piedra:       {speed:0.55,weight:2.2, lunge:12, impact:2.0, material:"rock", death:"crumble"},
  medusa:             {speed:1.0, basic:"ranged", material:"stone"},
  druida_arena:       {basic:"cast", cast:1.4, material:"sand"},
  esfinge:            {speed:0.9, weight:1.6, basic:"ranged", impact:1.6, material:"sand"},
  guardian_laberinto: {speed:0.6, weight:2.2, lunge:14, impact:2.1, material:"rock", death:"frames"},
  minotauro:          {speed:1.0, weight:1.9, amp:0.9, lunge:26, impact:2.4, material:"flesh", death:"collapse"},
  tiburon_joven:      {speed:1.4, weight:0.8, lunge:16, material:"water", death:"sink"},
  medusa_electrica:   {speed:0.7, weight:0.4, amp:1.4, basic:"cast", particle:"shock", material:"shock", death:"dissolve"},
  cangrejo_acorazado: {speed:0.8, weight:1.6, lunge:8, impact:1.5, material:"shell", death:"sink"},
  sirena_abisal:      {basic:"ranged", cast:1.3, material:"water", particle:"water", death:"sink"},
  anguila_electrica:  {speed:1.6, weight:0.5, amp:0.8, lunge:12, material:"shock", particle:"shock", death:"frames"},
  tiburon_blanco:     {speed:1.2, weight:1.4, lunge:20, impact:1.8, material:"water", death:"sink"},
  kraken_joven:       {speed:0.6, weight:2.3, amp:0.7, lunge:8, impact:2.0, material:"ink", particle:"ink", death:"frames"},
  leviatan:           {speed:0.8, weight:2.6, amp:0.5, lunge:24, impact:2.4, material:"water", particle:"water", death:"frames"},
};
// Paletas por tipo de partícula/material: colores de las chispas + color (r,g,b) del glow.
const VFX_PAL = {
  spark:["#ffd24a","#fff3b0","#ffffff","255,210,74"], blood:["#c81e1e","#8a1010","#ff5a5a","255,60,60"],
  arcane:["#b98cff","#7fd0ff","#ffffff","170,130,255"], holy:["#ffe79a","#fff6d0","#ffd24a","255,225,140"],
  glitch:["#4affd2","#ff4ad8","#ffffff","80,255,210"], steel:["#e8eef4","#9fb4c8","#ffffff","220,235,255"],
  leaf:["#8fd46a","#4a8a2e","#d8f0a0","150,220,110"], necro:["#5ae68c","#2e7a4a","#b98cff","90,230,140"],
  ember:["#ff6a2a","#ffb347","#ffd24a","255,120,40"], bone:["#ece4cc","#cfc4a4","#fffbe8","236,228,204"],
  rot:["#6d7d55","#8a9a4a","#3e4a2e","130,150,80"], rock:["#8a8a82","#6b6f52","#b0ae9c","170,170,160"],
  ice:["#bfe8ff","#8fd0ff","#ffffff","160,220,255"], flesh:["#b0402c","#e04a3a","#7a2a1e","230,80,60"],
  spirit:["#c9d8ff","#9fb0e0","#ffffff","200,215,255"], wood:["#8a6a42","#5a4a2e","#7a9a4a","150,120,70"],
  shadow:["#5a5a62","#2e2e38","#b0a0ff","140,120,200"], chitin:["#c99a4a","#8a6a2e","#e0c070","220,170,80"],
  stone:["#8a9a8a","#5a6a5a","#b0c0b0","160,180,160"], sand:["#e0c070","#c2a05a","#fff0c0","230,200,120"],
  water:["#7fd0e0","#cfeeff","#3a8aa0","120,210,230"], shock:["#ffe86a","#c9a8ff","#ffffff","255,232,106"],
  shell:["#b0402c","#ff8a5a","#e0c0a0","255,140,90"], ink:["#6a3a6e","#2a1a3a","#c98fe0","200,140,230"],
};

function animProfileOf(ent){
  if(ent._ap) return ent._ap;
  const key = (ent.classKey && ANIM_PROFILES[ent.classKey]) ? ent.classKey : (ent._animKey || ent.type);
  const src = ANIM_PROFILES[key] || {};
  const p = Object.assign({}, ANIM_DEFAULT, src);
  if(!src.basic && ent.ranged) p.basic = "ranged";
  if(!src.weight && ent.radius) p.weight = Math.max(0.6, Math.min(2.4, ent.radius/26));
  if(!p.tier){
    if(ENEMY_ANIM_ATLASES[ent.type]) p.tier = "full";
    else if(typeof BOSS_SHEET_ATLAS!=="undefined" && BOSS_SHEET_ATLAS[ent.type]) p.tier = "full"; // hojas de jefes: animación real completa
    else if(REAL_ANIM_ATLASES[ent.type]) p.tier = "walk";
    else if(ICE_REAL_IMG[ent.type]){ p.tier = "static"; p.hasBob = true; }
    else if(ACUA_ENEMY_TYPES[ent.type]) p.tier = "static";
    else p.tier = "partial";
  }
  p.T = ANIM_TIER[p.tier] || ANIM_TIER.static;
  p.sizeK = Math.max(0.7, Math.min(3, (ent.radius||24)/24));
  p.isBoss = ent.rank==="jefe" || ent.rank==="subjefe";
  ent._ap = p;
  return p;
}
const ACUA_ENEMY_TYPES = {tiburon_joven:1, tiburon_blanco:1, cangrejo_acorazado:1, medusa_electrica:1, sirena_abisal:1, anguila_electrica:1, kraken_joven:1, leviatan:1};

// Pose de trabajo reutilizada (sin allocations por frame).
const POSE = {ox:0, oy:0, sx:1, sy:1, rot:0, flash:0, glow:0, glowRgb:null};
function _ease(t){ return t<0?0:t>1?1:t*t*(3-2*t); }
function _easeOut(t){ t = t<0?0:t>1?1:t; return 1-(1-t)*(1-t); }
function _animState(ent){
  let an = ent._an;
  if(!an){
    an = ent._an = {lx:ent.x, ly:ent.y, spd:0, ph:Math.random()*6.28, pAtk:0, aDur:0, aKind:0, fired:false,
      pHit:0, hdx:0, hdy:0, sp:null, spT:0, spDur:0, spImpact:0.65, spFired:false, seed:Math.random()*100, lastSeen:0};
  }
  return an;
}
// Dispara una variante especial (jefes/élites): bossHeavyAttack, bossCast, bossCharge,
// bossGroundSlam, bossPhaseTransition. `impactAt` = fracción de la duración donde "pega".
function animTrigger(ent, kind, durMs, impactAt){
  const an = _animState(ent);
  an.sp = kind; an.spT = 0; an.spDur = durMs; an.spImpact = impactAt!==undefined ? impactAt : 0.65; an.spFired = false;
}
// Tipo de ataque según quién es: 1 melee, 2 ranged, 3 cast, 4 cast fuerte (ulti)
function _attackKind(ent, prof){
  if(ent._animCastKind){ const k = ent._animCastKind===2 ? 4 : 3; ent._animCastKind = 0; return k; }
  return prof.basic==="ranged" ? 2 : (prof.basic==="cast" ? 3 : 1);
}

function animPose(ent, prof, isHero){
  const P = POSE, an = _animState(ent), T = prof.T;
  P.ox = 0; P.oy = 0; P.sx = 1; P.sy = 1; P.rot = 0; P.flash = 0; P.glow = 0; P.glowRgb = null;
  const dt = state==="playing" ? animDt : 0;
  // velocidad real a partir del desplazamiento (sincroniza el paso con lo que se mueve de verdad)
  const mdx = ent.x-an.lx, mdy = ent.y-an.ly, md = Math.hypot(mdx,mdy);
  an.lx = ent.x; an.ly = ent.y;
  const inst = (md > 60 || animNow-an.lastSeen > 200) ? 0 : md/(Math.max(8,dt)/1000); // salto/teleport o recién visible -> ignorar
  an.lastSeen = animNow;
  an.spd = an.spd*0.7 + inst*0.3;
  const fx = ent.fx||0, fy = ent.fy!==undefined ? ent.fy : 1;
  const dirS = fx < -0.12 ? -1 : 1;
  const amp = prof.amp, K = prof.sizeK;
  const baseSpd = ent.speed || 160;
  const moving = an.spd > 12;
  const crowd = !isHero && !prof.isBoss && animCrowd > 70;

  // ---- IDLE / WALK ----
  if(moving){
    const stride = (ent.radius||22)*2.2*Math.sqrt(prof.weight);
    an.ph += (an.spd*dt/1000)/stride*Math.PI*2;
    const s = Math.sin(an.ph);
    const bob = Math.abs(s)*2.4*amp*T.walk*K/Math.pow(prof.weight,0.3);
    P.oy -= bob;
    if(prof.weight>1.4 && T.walk>0){ const land = 1-Math.abs(s); P.sy -= land*0.035*T.walk; P.sx += land*0.025*T.walk; }
    const lean = Math.min(1, an.spd/Math.max(40,baseSpd));
    P.rot += dirS*0.055*amp*T.lean*lean;
  } else if(!crowd){
    const t = animNow/1000*(Math.PI*2)/(1.7/prof.speed) + an.seed;
    const br = Math.sin(t);
    const k = T.idle*(prof.hasBob?0.35:1);
    P.sy += br*0.022*amp*k; P.sx -= br*0.011*amp*k;
    P.oy -= Math.max(0,br)*0.9*amp*k*K;
  }

  // ---- ataques (flanco de subida de attackAnim = golpe nuevo) ----
  const atk = ent.attackAnim||0;
  if(atk > an.pAtk + 1){
    const bossAtk = prof.isBoss && atk>=400 && !an.sp;
    if(bossAtk){ animTrigger(ent, ent.ranged||prof.basic!=="melee" ? "bossCast" : "bossHeavyAttack", atk+200, 0.35); an.aKind = 0; }
    else if(!an.sp){ an.aDur = atk; an.aKind = _attackKind(ent, prof); an.fired = false; }
  }
  an.pAtk = atk;
  if(an.aKind && atk>0 && an.aDur>0){
    const p = 1 - atk/an.aDur;
    const L = prof.lunge*K*T.attack;
    const W = Math.min(1.6, 0.6+0.4*prof.weight);
    let fwd = 0;
    if(an.aKind===1){ // MELEE: anticipación, retroceso, avance, impacto, recuperación
      if(p<0.15){ const a=p/0.15; fwd = -0.35*L*_ease(a); P.sx += 0.06*a*W; P.sy -= 0.07*a*W; }
      else if(p<0.35){ const a=(p-0.15)/0.2; fwd = -0.35*L + 1.35*L*_easeOut(a); P.sx -= 0.04; P.sy += 0.06; }
      else if(p<0.45){ fwd = L; P.sx += 0.07*prof.impact*0.6; P.sy -= 0.06*prof.impact*0.6;
        if(!an.fired){ an.fired = true; if(isHero || prof.isBoss) vfxBurst(ent.x+fx*(ent.radius||20), ent.y+fy*(ent.radius||20)*0.6-14, 3, prof.particle, 70, 180, 3, isHero?2:1, 0, 1); } }
      else { const a=(p-0.45)/0.55; fwd = L*(1-_ease(a)); }
    } else if(an.aKind===2){ // RANGED: preparación, carga, disparo, recoil, recuperación
      if(p<0.2){ const a=p/0.2; P.sy -= 0.04*a; P.oy += a; }
      else if(p<0.45){ const a=(p-0.2)/0.25; P.sx += 0.02*a; P.glow = 0.5*a; }
      else if(p<0.6){ const a=(p-0.45)/0.15; fwd = -prof.recoil*6*K*T.attack*_easeOut(a); P.glow = 0.5*(1-a);
        if(!an.fired){ an.fired = true; if(isHero) vfxBurst(ent.x+fx*16, ent.y+fy*10-18, 3, prof.particle, 60, 160, 2, 2, 0, 1); } }
      else { const a=(p-0.6)/0.4; fwd = -prof.recoil*6*K*T.attack*(1-_ease(a)); }
    } else { // CAST (3) / CAST fuerte (4): anticipación, acumulación, ejecución, partículas, recuperación
      const C = prof.cast*(an.aKind===4?1.5:(isHero && prof.basic==="cast" && an.aKind===3 && an.aDur<200 ? 0.5 : 1));
      if(p<0.2){ const a=p/0.2; P.sy -= 0.05*a*C*0.6; P.oy += a*1.2; }
      else if(p<0.55){ const a=(p-0.2)/0.35; P.oy -= 3*C*a; P.sy += 0.03*a*C; P.glow = 0.35+0.45*a*Math.min(1.4,C);
        if(isHero && Math.random()<0.5) vfxConverge(ent.x, ent.y-(ent.radius||20)*1.4, prof.particle, 26*C, 1); }
      else if(p<0.68){ const a=(p-0.55)/0.13; P.oy -= 3*C*(1-a*0.5); const pop = Math.sin(a*Math.PI)*0.06*C; P.sx += pop; P.sy += pop; P.glow = 0.8;
        if(!an.fired){ an.fired = true; vfxBurst(ent.x, ent.y-(ent.radius||20)*1.4, isHero?Math.round(6*C):3, prof.particle, 90*C, 300, 3, isHero?2:(prof.isBoss?1:0), -20, 0);
          if(isHero && an.aKind===4) vfxShock(ent.x, ent.y, 18, 70*C, VFX_PAL[prof.particle]?VFX_PAL[prof.particle][3]:"255,255,255", 380, 1); } }
      else { const a=(p-0.68)/0.32; P.oy -= 1.5*C*(1-_ease(a)); P.glow = 0.8*(1-a); }
      if(P.glow>0) P.glowRgb = (VFX_PAL[prof.particle]||VFX_PAL.spark)[3];
    }
    P.ox += fx*fwd; P.oy += fy*fwd*0.6;
    if(P.glow>0 && !P.glowRgb) P.glowRgb = (VFX_PAL[prof.particle]||VFX_PAL.spark)[3];
  } else if(atk<=0){ an.aKind = 0; ent._animCastKind = 0; }

  // ---- anticipación de habilidades con telegraph ya existentes (cargas, golpes al suelo, canto) ----
  if(ent.chargeTelegraph>0 || ent.chargeTelegraph2>0){
    const sh = (Math.random()-0.5)*1.6*K;
    P.ox += -fx*5*K + sh; P.oy += -fy*3*K; P.sx += 0.05; P.sy -= 0.06;
  } else if(ent.charging || ent.dashing || ent.charging2){
    P.sx += 0.10; P.sy -= 0.08; P.rot += dirS*0.08;
  }
  if(ent.slamTelegraph>0){ const a = 1-ent.slamTelegraph/600; P.oy -= 7*_ease(a)*K; P.sy += 0.05*a; }
  if(ent.dischargeTelegraph>0 || ent.songTelegraph>0 || ent.tentacleTelegraph>0 || ent.sweepTelegraph>0){
    P.glow = Math.max(P.glow, 0.55+0.25*Math.sin(animNow/60)); P.glowRgb = (VFX_PAL[prof.particle]||VFX_PAL.spark)[3];
    P.sy += 0.03*Math.sin(animNow/50);
  }

  // ---- variantes de jefe ----
  if(an.sp){
    an.spT += dt;
    const q = Math.min(1, an.spT/an.spDur), I = an.spImpact;
    const L = prof.lunge*K;
    const rgb = (VFX_PAL[prof.particle]||VFX_PAL.spark)[3];
    if(an.sp==="bossHeavyAttack"){
      if(q<I){ const a=_ease(q/I); P.rot -= dirS*0.12*a; P.oy -= 5*a*K; P.sx += 0.06*a; P.sy += 0.06*a; P.ox -= fx*L*0.3*a; }
      else if(q<I+0.12){ const a=(q-I)/0.12; P.ox += fx*L*1.4*_easeOut(a); P.oy += fy*L*0.8*_easeOut(a); P.rot += dirS*0.10; P.sx += 0.08; P.sy -= 0.08;
        if(!an.spFired){ an.spFired = true; vfxImpactHeavy(ent, prof, 0.8); } }
      else { const a=(q-I-0.12)/(1-I-0.12); P.ox += fx*L*1.4*(1-_ease(a)); P.oy += fy*L*0.8*(1-_ease(a)); }
    } else if(an.sp==="bossCast"){
      if(q<I){ const a=q/I; P.oy -= 7*_ease(a)*K; P.sy += 0.05*a; P.glow = 0.4+0.6*a+0.15*Math.sin(animNow/45); P.glowRgb = rgb;
        if(Math.random()<0.7) vfxConverge(ent.x, ent.y-(ent.radius||40)*1.2, prof.particle, 60*K, 2); }
      else if(q<I+0.12){ const a=(q-I)/0.12; P.oy -= 7*K*(1-a); const pop=Math.sin(a*Math.PI)*0.1; P.sx+=pop; P.sy+=pop; P.glow = 1; P.glowRgb = rgb;
        if(!an.spFired){ an.spFired = true; vfxBurst(ent.x, ent.y-(ent.radius||40), 16, prof.particle, 160, 420, 3, 2, -10, 0); vfxShock(ent.x, ent.y, (ent.radius||40)*0.5, (ent.radius||40)*2.6, rgb, 520, 2); } }
      else { const a=(q-I-0.12)/(1-I-0.12); P.glow = 1-a; P.glowRgb = rgb; }
    } else if(an.sp==="bossCharge"){
      if(q<I){ const a=q/I; P.ox -= fx*L*0.45*_ease(a) + (Math.random()-0.5)*2*K; P.oy -= fy*L*0.2*_ease(a); P.sx += 0.08*a; P.sy -= 0.08*a; }
      else { P.sx += 0.12; P.sy -= 0.1; P.rot += dirS*0.07; }
    } else if(an.sp==="bossGroundSlam"){
      if(q<I){ const a=_ease(q/I); P.oy -= 16*a*K; P.sx -= 0.04*a; P.sy += 0.08*a; }
      else if(q<I+0.08){ const a=(q-I)/0.08; P.oy -= 16*K*(1-a); P.sx += 0.16*a; P.sy -= 0.16*a;
        if(!an.spFired && a>0.6){ an.spFired = true; vfxImpactHeavy(ent, prof, 1); } }
      else { const a=(q-I-0.08)/(1-I-0.08); P.sx += 0.16*(1-_ease(a)); P.sy -= 0.16*(1-_ease(a)); }
    } else if(an.sp==="bossPhaseTransition"){
      P.ox += (Math.random()-0.5)*6*K*(1-q); P.oy += (Math.random()-0.5)*4*K*(1-q);
      const pul = Math.sin(q*Math.PI*10)*0.07*(1-q); P.sx += pul; P.sy += pul;
      P.flash = Math.max(P.flash, 0.7*(1-q)); P.glow = 1-q; P.glowRgb = rgb;
      if(!an.spFired){ an.spFired = true; vfxBurst(ent.x, ent.y-(ent.radius||40), 26, prof.particle, 200, 700, 4, 2, -20, 0);
        vfxShock(ent.x, ent.y, 10, (ent.radius||40)*3.2, rgb, 800, 2); vfxShake(10); }
    }
    if(q>=1) an.sp = null;
  }

  // ---- HIT: flash breve + knockback visual en la dirección del golpe ----
  const hitV = isHero ? (ent.hurtTimer||0) : (ent.hitFlash||0);
  const hitPow = isHero ? 1 : (ent._lastHitPow||1);
  const hitMax = isHero ? 160 : IMPACT_FLASH_MS[hitPow];
  if(hitV > an.pHit + 1){
    const src = isHero ? null : ent.lastHitBy;
    let hx = -fx, hy = -fy;
    if(src){ const dx2 = ent.x-src.x, dy2 = ent.y-src.y, dl = Math.hypot(dx2,dy2)||1; hx = dx2/dl; hy = dy2/dl; }
    an.hdx = hx; an.hdy = hy;
  }
  an.pHit = hitV;
  if(hitV>0){
    const h = hitV/hitMax;
    const powK = [1, 1, 1.45, 2.1, 2.7][hitPow];
    const kb = (isHero?4:6)*h*h*Math.min(1.4, 1.2/prof.weight)*K*powK;
    P.ox += an.hdx*kb; P.oy += an.hdy*kb*0.6;
    P.sx += 0.05*h*powK; P.sy -= 0.05*h*powK;
    if(hitPow>=3) P.rot += (an.hdx>0?1:-1)*0.09*h*powK/2; // un golpe pesado tuerce el cuerpo
    // los jefes reciben golpes todo el tiempo: con el destello completo se veían casi blancos
    // durante toda la pelea (perdían sus colores). Destello tenue para jefes/subjefes.
    const flashMax = isHero ? 0.45 : (prof.isBoss || ent.rank==="subjefe" ? (hitPow>=3 ? 0.35 : 0.22) : (hitPow>=3 ? 0.85 : 0.6));
    P.flash = Math.max(P.flash, Math.max(0, (h-0.35)/0.65)*flashMax);
  }

  // estela de velocidad (cargas, dashes, embestidas)
  if(an.spd > Math.max(300, baseSpd*2.2) && (isHero || prof.isBoss || !crowd)){
    vfxBurst(ent.x-fx*(ent.radius||20)*0.6, ent.y-fy*(ent.radius||20)*0.4-(ent.radius||20)*0.5, 1, prof.particle==="spark"?"spirit":prof.particle, 10, 260, (ent.radius||20)*0.35, isHero||prof.isBoss?1:0, 0, 2);
  }
  return P;
}
function animApply(x, y, P){
  ctx.translate(x+P.ox, y+P.oy);
  if(P.rot) ctx.rotate(P.rot);
  if(P.sx!==1 || P.sy!==1) ctx.scale(P.sx, P.sy);
  ctx.translate(-x, -y);
}
