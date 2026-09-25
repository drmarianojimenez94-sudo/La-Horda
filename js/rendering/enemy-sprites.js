"use strict";
/* ============================================================
   js/rendering/enemy-sprites.js
   Cómo se DIBUJA cada enemigo con su arte real (atlas, packs, sprites estáticos,
   criaturas acuáticas, animaciones de habilidades de jefes).
   ============================================================ */

/* ============================================================
   ENEMIGOS — sprites reales del usuario (5 tipos: esqueleto, demonio_menor,
   demonio_mayor, demonio_mago, golem). Atlas reescalados y recomprimidos acá
   (quedaron ~1.9MB en vez de ~4.3MB) para no pasar el límite de tamaño del
   artifact publicado. Reemplaza SOLO el dibujo; vida, daño, IA y colisiones de
   estos enemigos no cambian. zombie y esqueleto_h no vinieron en este paquete,
   así que siguen con el sprite procedural de siempre.
   ============================================================ */
const ENEMY_ATLAS_FRAME = 119; // tamaño de cada celda en el atlas reescalado (4 cols x 6 filas)
const ENEMY_ATLAS_COLS = 4;
const ENEMY_ANIM_DEF = {
  caminar_abajo:     {frames:[0,1,2,3],     fps:8,  loop:true,  flip:false},
  caminar_derecha:   {frames:[4,5,6,7],     fps:8,  loop:true,  flip:false},
  caminar_arriba:    {frames:[8,9,10,11],   fps:8,  loop:true,  flip:false},
  caminar_izquierda: {frames:[4,5,6,7],     fps:8,  loop:true,  flip:true},
  atacar_abajo:      {frames:[12,13,14,15], fps:10, loop:false, flip:false},
  atacar_derecha:    {frames:[16,17,18,19], fps:10, loop:false, flip:false},
  atacar_arriba:     {frames:[20,21,22,23], fps:10, loop:false, flip:false},
  atacar_izquierda:  {frames:[16,17,18,19], fps:10, loop:false, flip:true}
};

// Lobo Ártico (Arena de Hielo, nivel 1): a diferencia de los 5 tipos de arriba (grilla
// compartida 119x119), esta hoja tiene su propia celda (ver ENEMY_ATLAS_GRID) porque los
// frames originales no eran cuadrados de 119px -- drawEnemyAtlas usa ENEMY_ATLAS_GRID[e.type]
// cuando existe, si no cae al tamaño global de siempre.
const ENEMY_ATLAS_GRID = { lobo_artico: {cols:4, w:96, h:105} };
// Dirección cardinal dominante a partir del vector de mirada del enemigo
function enemyAtlasDir(e){
  const fx = e.fx||0, fy = e.fy!==undefined?e.fy:1;
  if(Math.abs(fx) > Math.abs(fy)) return fx>0 ? "derecha" : "izquierda";
  return fy>0 ? "abajo" : "arriba";
}
// Un AnimAtlas por tipo, armado con el adaptador de grilla -mismo ENEMY_ANIM_DEF de siempre
// (compartido por los 6 tipos), con la celda global de 119x119 salvo que el tipo tenga la suya
// propia en ENEMY_ATLAS_GRID (caso del Lobo Ártico).
const ENEMY_ANIM_ATLASES = {};
for(const _t in ENEMY_ATLAS_IMG){
  const g = ENEMY_ATLAS_GRID[_t];
  ENEMY_ANIM_ATLASES[_t] = {
    img: ENEMY_ATLAS_IMG[_t], ready: ()=>ENEMY_ATLAS_READY[_t],
    def: buildAnimDefFromGrid(g?g.cols:ENEMY_ATLAS_COLS, g?g.w:ENEMY_ATLAS_FRAME, g?g.h:ENEMY_ATLAS_FRAME, ENEMY_ANIM_DEF)
  };
}
const REAL_ANIM_DEF = {
  golem_piedra: {frames:55, w:75, h:61},
  esfinge: {frames:31, w:82, h:72},
  medusa: {frames:33, w:79, h:72},
  druida_arena: {frames:30, w:81, h:70},
  escorpion_gigante: {frames:16, w:55, h:44},
  minotauro: {frames:20, w:81, h:74},
};
// Ídem para los monstruos del Laberinto Maldito y el Minotauro, con la duración de ciclo
// normalizada (mismo criterio de siempre: 1100ms de vuelta completa sin importar cuántos
// frames traiga cada hoja).
const REAL_ANIM_ATLASES = {};
for(const _t in REAL_ANIM_DEF){
  const d = REAL_ANIM_DEF[_t];
  REAL_ANIM_ATLASES[_t] = { img: REAL_ANIM_IMG[_t], ready:()=>REAL_ANIM_READY[_t], clip: buildStripClipByDuration(d.frames, d.w, d.h, 1100) };
}

// Dibuja el ciclo de caminata real (N frames, con los pies ya anclados abajo al armar la
// hoja) para los monstruos propios del Laberinto Maldito y el Minotauro. La duración del
// ciclo completo es la misma para todos sin importar cuántos frames traiga cada hoja, para
// que no se vean más lentos o más rápidos entre sí por pura casualidad del arte (ver
// buildStripClipByDuration, que arma el clip con un fps ya calculado para eso).
// Estas tiras NO son un único ciclo: mezclan vistas de frente, de espalda, de perfil (algunas
// mirando a la izquierda y otras a la derecha), poses de ataque y recortes sueltos. Reproducir
// la tira entera como caminata hacía que el monstruo girara sobre sí mismo sin parar. Acá se
// separan los frames por vista (verificados uno por uno contra el arte): down/up/side, y
// sideNat dice hacia dónde mira el arte original de perfil (1 = derecha, -1 = izquierda).
// atk (opcional) = frames de ataque/cast reales; si no hay, el ataque lo marca AnimFX.
const REAL_ANIM_SETS = {
  minotauro:         { side:[8,9,10,11,12,13,14,15,16,17,18,19], sideNat:1, up:[4,5,6] },
  esfinge:           { down:[0,1,2,3], up:[4,5,7,8,9], side:[17,19,20,21], sideNat:1 },
  medusa:            { down:[0,1,2,3], up:[4,5,6,7,8], side:[20,21,22,23,24], sideNat:1, atk:[9,10,11,12] },
  druida_arena:      { down:[0,1,2,3], up:[4,5,6,7,8], side:[20,21,22,23,26,29], sideNat:1, atk:[9,10,11,12] },
  // perfil: solo frames que miran a la izquierda (antes se mezclaban 4 y 12, que miran a la derecha,
  // y el escorpión se daba vuelta a cada paso)
  escorpion_gigante: { down:[0,1,8], side:[5,6,7,6], sideNat:-1 },
  golem_piedra:      { down:[1], side:[24,26,28], sideNat:-1 },
};
for(const _t in REAL_ANIM_SETS){
  const d = REAL_ANIM_DEF[_t], set = REAL_ANIM_SETS[_t], atlas = REAL_ANIM_ATLASES[_t];
  if(!d || !atlas) continue;
  const mk = (idx, fps) => idx ? { frames: idx.map(i => ({x:i*d.w, y:0, w:d.w, h:d.h})), fps, loop:true } : null;
  atlas.dirClips = { down: mk(set.down, 7), up: mk(set.up, 7), side: mk(set.side, 9), atk: mk(set.atk, 10) };
  atlas.sideNat = set.sideNat;
}
function drawRealAnimSprite(e){
  const atlas = REAL_ANIM_ATLASES[e.type];
  if(!atlas || !atlas.ready()) return false;
  let clip = atlas.clip, flip = e.fx < -0.12;
  const dc = atlas.dirClips;
  if(dc){
    // vista según la dirección, con histéresis para que no parpadee en diagonales
    const ax = Math.abs(e.fx||0), ay = Math.abs(e.fy||0);
    let dir = e._rdir||0; // 0 perfil, 1 abajo, 2 arriba
    if(dir===0){ if(ay > ax*1.3) dir = e.fy>0 ? 1 : 2; }
    else if(ax > ay*1.3) dir = 0; else dir = e.fy>0 ? 1 : 2;
    e._rdir = dir;
    if(e.fx < -0.12) e._rfaceL = true; else if(e.fx > 0.12) e._rfaceL = false;
    if(e.attackAnim>0 && dc.atk){ clip = dc.atk; flip = false; }
    else if(dir===1 && dc.down){ clip = dc.down; flip = false; }
    else if(dir===2 && dc.up){ clip = dc.up; flip = false; }
    else { clip = dc.side; flip = atlas.sideNat>0 ? !!e._rfaceL : !e._rfaceL; }
  }
  const n = animFrameIndex(clip, e.animT);
  const f = clip.frames[0];
  const targetH = e.radius*2.6;
  const s = targetH/f.h;
  drawAnimFrameSized(atlas.img, clip, n, e.x, e.y, f.w*s, f.h*s, 0.5, 0.92, flip, undefined);
  return true;
}
const PACK_ANIM = {
  duende_bosque: { img:PACK_DUENDE_IMG, ready:PACK_DUENDE_READY,
    walk:["walk1","walk2","walk3","walk4","walk5"], idle:["idle1","idle2","idle3"],
    atk:["atk1","atk2","atk3","atk4"], hit:["hit1"], death:["death1","death2","death3"] },
  // Packs 3-4: Guardián del Laberinto (antes prestaba el Gólem), Zombi y Esqueleto Cornudo (antes
  // dibujados por código), y Gólem de Hielo / Demonio de Hielo / Ent (antes 1 solo frame).
  guardian_laberinto: { img:PACK_GUARDIAN_IMG, ready:PACK_GUARDIAN_READY,
    walk:["walk1", "walk2", "walk3", "walk4"], idle:["idle1", "idle2", "idle3", "idle2"],
    atk:["atk1", "atk2", "atk3", "atk4", "atk5"], hit:["hit1", "hit2"], death:["death1", "death2", "death3", "death4", "death5"] },
  zombie: { img:PACK_ZOMBI_IMG, ready:PACK_ZOMBI_READY,
    walk:["walk1", "walk2", "walk3", "walk2"], idle:["idle1", "idle2", "idle3", "idle4"],
    atk:["atk1", "atk2", "atk3"], hit:["hit1"], death:["death1", "death2", "death3"] },
  esqueleto_h: { img:PACK_ESQC_IMG, ready:PACK_ESQC_READY,
    walk:["walk1", "walk2", "walk3", "walk4"], idle:["idle1", "idle2", "idle3", "idle4"],
    atk:["atk1", "atk2", "atk3"], hit:["hit1", "hit2"], death:["death1", "death2", "death3"] },
  golem_hielo: { img:PACK_GOLEMH_IMG, ready:PACK_GOLEMH_READY,
    walk:["walk1", "walk2", "walk3", "walk2"], idle:["idle1", "idle2"],
    atk:["atk1", "atk2", "atk3", "atk4"], hit:["hit1", "hit2"], death:["death1", "death2", "death3", "death4"] },
  demonio_hielo_fuego: { img:PACK_DEMH_IMG, ready:PACK_DEMH_READY,
    walk:["walk1", "walk2", "walk3", "walk2"], idle:["idle1", "idle2", "idle3"],
    atk:["atk1", "atk2", "atk3"], hit:["hit1", "hit2"], death:["death1", "death2", "death3", "death4"] },
  // cuadrúpedo: más ancho que alto, así que se escala a menos alto que un humanoide del mismo radio
  bestia_bosque: { img:PACK_BESTIA_IMG, ready:PACK_BESTIA_READY, hMul:2.1,
    walk:["walk1","walk2","walk3","walk4","walk5"], idle:["idle1","idle2","idle3","idle4"],
    atk:["atk1","atk2","atk3"], hit:["hit1"], death:["death1","death2","death3","death4"] },
  ent: { img:PACK_TREANT_IMG, ready:PACK_TREANT_READY,
    walk:["walk1", "walk2", "walk3", "walk4"], idle:["idle1", "idle2", "idle3", "idle4"],
    atk:["atk1", "atk2", "atk3", "atk4"], hit:["hit1", "hit2"], death:["death1", "death2", "death3", "death4", "death5"] },
};
// Atlas del redraw (Dama del Bosque / Doppelgängers): mismas reglas de estado que el pack de abajo.
function drawEnemyAtlasPack(e){
  const P = ENEMY_ATLAS_PACK[e.type];
  if(!P || !P.ready) return false;
  if(e.attackAnim > (e._pkAtkLast||0)) e._pkAtkMax = e.attackAnim;
  e._pkAtkLast = e.attackAnim;
  let arr, n;
  if(!e.alive){
    arr = P.sets.death;
    if(e._dyingP != null) n = Math.floor(e._dyingP*arr.length*1.25);
    else { if(!e._diedAt) e._diedAt = animNow; n = Math.floor((animNow-e._diedAt)/220); }
  } else if(e.attackAnim>0){
    arr = P.sets.atk; n = Math.floor(Math.max(0, Math.min(0.999, 1 - e.attackAnim/(e._pkAtkMax||280)))*arr.length);
  } else if(e.hitFlash>55){
    arr = P.sets.hit; n = 0;
  } else if(e.stunTimer>0){
    arr = P.sets.idle; n = Math.floor((e.animT||0)/220);
  } else {
    arr = P.sets.walk; n = Math.floor((e.animT||0)/140);
  }
  const v = e.alive ? arr[n % arr.length] : arr[Math.min(arr.length-1, n)];
  const s = e.radius*2.6/P.refH;
  const clip = {frames:[{x:(v % P.cols)*P.fw, y:Math.floor(v/P.cols)*P.fh, w:P.fw, h:P.fh}]};
  drawAnimFrameSized(P.atlas, clip, 0, e.x, e.y, P.fw*s, P.fh*s, 0.5, P.anchor, e.fx < -0.12, undefined);
  return true;
}
function drawPackSprite(e){
  if(drawEnemyAtlasPack(e)) return true;
  const d = PACK_ANIM[e.type];
  if(!d || !d.ready.walk1) return false;
  let key;
  // el ataque arranca con distinta duración según el enemigo (260-500ms): se toma el valor inicial
  // de cada golpe como referencia para repartir los frames a lo largo de todo el golpe
  if(e.attackAnim > (e._pkAtkLast||0)) e._pkAtkMax = e.attackAnim;
  e._pkAtkLast = e.attackAnim;
  if(!e.alive){
    let i;
    if(e._dyingP != null) i = Math.floor(e._dyingP*d.death.length*1.25); // atado a la duración de la muerte
    else { if(!e._diedAt) e._diedAt = animNow; i = Math.floor((animNow-e._diedAt)/220); }
    key = d.death[Math.min(d.death.length-1, i)];
  } else if(e.attackAnim>0){
    const p = Math.max(0, Math.min(0.999, 1 - e.attackAnim/(e._pkAtkMax||280)));
    key = d.atk[Math.floor(p*d.atk.length)];
  } else if(e.hitFlash>55){
    key = d.hit[0];
  } else if(e.stunTimer>0){
    key = d.idle[Math.floor((e.animT||0)/220)%d.idle.length];
  } else {
    key = d.walk[Math.floor((e.animT||0)/120)%d.walk.length];
  }
  const img = d.img[key];
  if(!img || !d.ready[key]) return false;
  // misma escala para todos los frames (tomada del primer frame de caminata), así los recortes
  // de distinto alto -p.ej. la muerte tendido en el piso- no cambian de tamaño el personaje
  const s = e.radius*(d.hMul||2.6)/d.img.walk1.height;
  drawAnimFrameSized(img, {frames:[{x:0, y:0, w:img.width, h:img.height}]}, 0, e.x, e.y, img.width*s, img.height*s, 0.5, 0.92, e.fx < -0.12, undefined);
  return true;
}

// Dibuja el sprite real (frame único, con leve balanceo y espejo por dirección) para los
// tipos de Hielo/Bosque que ya tienen arte limpio pero un solo frame (sin ciclo de
// caminata). Devuelve false si no aplica, para que drawEnemy caiga al sprite prestado
// (visualAlias) en el resto de los casos.
// Migrado a drawAnimFrameSized (mismo primitivo que usan enemigos con atlas real): el
// "clip" de un solo frame se arma al vuelo -no hace falta tabla ni grilla para esto- y el
// balanceo (bob) queda como detalle propio de este wrapper, fuera del motor genérico.
function drawIceRealSprite(e){
  if(!ICE_REAL_READY[e.type]) return false;
  const img = ICE_REAL_IMG[e.type];
  const targetH = e.radius*2.6;
  const s = targetH/img.height;
  const bob = Math.sin((e.animT||0)/220)*2;
  const clip = { frames: [{x:0, y:0, w:img.width, h:img.height}] };
  drawAnimFrameSized(img, clip, 0, e.x, e.y+bob, img.width*s, img.height*s, 0.5, 0.92, e.fx < -0.12, undefined);
  return true;
}

// Dibuja, superpuesto sobre el jefe, el frame que corresponda de la animación de habilidad
// activa (Ventisca / Nova de Hielo / Armadura de Hielo del Mago de Hielo y Cristal). No
// devuelve nada: es un efecto encima del sprite normal, no un reemplazo.
function drawBossSkillAnim(e){
  const sk = e.skillAnim;
  if(!sk) return;
  const atlas = SKILL_ATLASES[sk.name];
  if(!atlas || !atlas.ready()) return;
  const clip = atlas.clip;
  // Con muy pocos frames (p.ej. la Nova de Escarcha, 1 sola imagen) la duración normal
  // (frames/fps) sería un parpadeo casi invisible, así que se sostiene un mínimo razonable.
  const holdMs = Math.max((1000/clip.fps)*clip.frames.length, clip.frames.length<=2 ? 450 : 0);
  if(sk.t >= holdMs){ e.skillAnim = null; return; }
  const n = animFrameIndex(clip, sk.t);
  const f = clip.frames[0];
  const targetH = e.radius*3.4;
  const s = targetH/f.h;
  drawAnimFrameSized(atlas.img, clip, n, e.x, e.y - e.radius*0.5, f.w*s, f.h*s, 0.5, 0.5, false, undefined);
}

// Arena Acuática: sprites reales para los 5 comunes + la élite (Tiburón Joven/Blanco, Medusa
// Eléctrica, Cangrejo Acorazado, Sirena Abisal). Mismo patrón de "una imagen por pose" que ya
// usan Musashi/Sylva/Nigromante -acá solo idle/ataque, alcanza para la escala de estos enemigos
// comunes-. La Anguila Eléctrica, el Kraken Joven y el Leviatán no pasan por acá: usan
// visualAlias a una silueta ya existente (ver ENEMY_BASE) como placeholder hasta tener arte propio.
// Segundo frame de idle (recortes reales adicionales del mismo pack, antes sin usar) para las
// 4 criaturas comunes que solo tenían una pose quieta: alternando de a poco (450ms) se ve un
// nado/pulso sutil en vez de quedar totalmente estáticas entre ataques.
// (el idle2 del Tiburón Blanco es otra toma -de cuerpo entero y más lejos- y al reescalarlo al alto
// del idle1 se veía gigante y pixelado: se deja fuera)
const ACUA_IDLE2 = { tiburon_joven:"tiburonJovenIdle2", cangrejo_acorazado:"cangrejoIdle2", medusa_electrica:"medusaIdle2" };
function drawAcuaticaReal(e){
  let idleKey, atkKey;
  if(e.type==="tiburon_joven"){ idleKey="tiburonJovenIdle"; atkKey="tiburonJovenAtk"; }
  else if(e.type==="tiburon_blanco"){ idleKey="tiburonBlancoIdle"; atkKey="tiburonBlancoAtk"; }
  else if(e.type==="cangrejo_acorazado"){ idleKey="cangrejoIdle"; atkKey="cangrejoAtk"; }
  else if(e.type==="medusa_electrica"){ idleKey="medusaIdle"; atkKey="medusaAtk"; }
  else if(e.type==="sirena_abisal"){ idleKey="sirenaIdle"; atkKey="sirenaAtk"; }
  else if(e.type==="anguila_electrica" || e.type==="kraken_joven" || e.type==="leviatan") return drawAcua2(e);
  else return false;
  if(!ACUA_READY[idleKey]) return false;
  const idleKey2 = ACUA_IDLE2[e.type];
  if(!(e.attackAnim>0) && idleKey2 && ACUA_READY[idleKey2] && Math.floor((e.animT||0)/450)%2===1) idleKey = idleKey2;
  const img = (e.attackAnim>0 && ACUA_READY[atkKey]) ? ACUA_IMG[atkKey] : ACUA_IMG[idleKey];
  const flip = e.fx < -0.12;
  const targetH = e.radius*2.6;
  const sc = targetH/img.height;
  const clip = { frames: [{x:0,y:0,w:img.width,h:img.height}] };
  drawAnimFrameSized(img, clip, 0, e.x, e.y, img.width*sc, img.height*sc, 0.5, 0.72, flip, e.hitFlash>60?0.6:1);
  return true;
}
function drawEnemyAtlas(e){
  const atlas = ENEMY_ANIM_ATLASES[e.type];
  if(!atlas || !atlas.ready()) return false;
  const dir = enemyAtlasDir(e);
  const state = e.attackAnim>0 ? "atacar" : "caminar";
  const clip = atlas.def.clips[state+"_"+dir];
  const n = animFrameIndex(clip, e.animT);
  const size = e.radius*2.7; // tamaño visual proporcional al radio de colisión ya existente
  const sizeH = size*(clip.frames[n].h/clip.frames[n].w);
  drawAnimFrameSized(atlas.img, clip, n, e.x, e.y, size, sizeH, 0.5, 0.85, clip.flip, undefined);
  return true;
}

/* ---------------- Arena Acuática: sprites reales de Anguila Eléctrica, Kraken Joven y Leviatán ---------------- */
function acua2Ready(k){ const a = ACUA2_IMG[k]; return !!a && ACUA2_READY[k] >= a.length; }
function acua2Pick(k, i){ const a = ACUA2_IMG[k]; const n = a.length; return a[((i%n)+n)%n]; }
function drawAcua2(e){
  const t = e.animT||0;
  const dyingP = e._dyingP;
  const dying = e.alive===false && dyingP!==undefined;
  if(e.type==="anguila_electrica"){
    if(!acua2Ready("eelIdle")) return false;
    let img;
    if(dying && acua2Ready("eelDeath")) img = acua2Pick("eelDeath", Math.min(4, Math.floor(dyingP*5)));
    else if(e.dashing && acua2Ready("eelDash")) img = acua2Pick("eelDash", Math.floor(t/70));
    else if(e.attackAnim>0 && acua2Ready("eelAtk")) img = acua2Pick("eelAtk", 0);
    else if(e.hitFlash>50 && acua2Ready("eelHurt")) img = acua2Pick("eelHurt", 1); // el #0 es un recorte parcial de la cabeza
    else img = acua2Pick("eelIdle", Math.floor(t/130));
    const fx = e.fx||0, fy = e.fy||0, flip = fx < -0.12;
    let rot = flip ? Math.atan2(-fy, -fx) : Math.atan2(fy, fx);
    rot = Math.max(-0.55, Math.min(0.55, rot));
    const w = e.radius*4.4, h = w*img.height/img.width;
    drawImgSized(img, e.x, e.y-h*0.2, h, 0.5, 0.6, flip, undefined, rot);
    return true;
  }
  if(e.type==="kraken_joven"){
    if(!acua2Ready("krIdle")) return false;
    let img;
    if(dying && acua2Ready("krDeath")) img = acua2Pick("krDeath", Math.min(4, Math.floor(dyingP*5)));
    else if(e.hitFlash>50 && acua2Ready("krHurt")) img = acua2Pick("krHurt", Math.floor(t/110));
    else img = acua2Pick("krIdle", Math.floor(t/240));
    // escala fija tomada del primer idle: los recortes miden entre 47 y 64px de alto y, escalados
    // cada uno a su propio alto, el cuerpo "latía" de tamaño entre frames
    const ref = ACUA2_IMG.krIdle[0].height;
    drawImgSized(img, e.x, e.y, e.radius*2.5*img.height/ref, 0.5, 0.82, false, undefined);
    return true;
  }
  if(e.type==="leviatan"){
    if(!acua2Ready("levHead")) return false;
    const phase = e.acuaticaPhase||1;
    const fx = e.fx||0, fy = e.fy||0;
    const R = e.radius;
    // sombra enorme bajo la superficie: sugiere un cuerpo mucho más grande que lo que asoma
    ctx.save();
    ctx.globalAlpha = 0.28*ANIM_ALPHA_MUL;
    ctx.fillStyle = "#02121c";
    ctx.beginPath(); ctx.ellipse(e.x-fx*R*1.8, e.y-fy*R*0.9+10, R*3.4, R*1.1, Math.atan2(fy,fx)*0.35, 0, Math.PI*2); ctx.fill();
    ctx.restore();
    let img, nativeLeft = true, h = R*2.2;
    if(dying && acua2Ready("levDeath")){ img = acua2Pick("levDeath", Math.min(2, Math.floor(dyingP*3))); } // el #3 trae restos del fondo de la hoja
    else if(e.charging2 && acua2Ready("levDash")){ img = acua2Pick("levDash", Math.floor(t/90)); nativeLeft = false; }
    else if((e.biteTelegraph>0 || (e.attackAnim>0 && e._lastAtk==="bite")) && acua2Ready("levBite")){ img = acua2Pick("levBite", 0); nativeLeft = false; }
    else if(e.hitFlash>55 && acua2Ready("levHit")){ img = acua2Pick("levHit", 0); }
    else if(phase>=3 && acua2Ready("levP3")){ img = acua2Pick("levP3", 0); h = R*2.0; }
    else if(phase===2 && acua2Ready("levP2")){ img = acua2Pick("levP2", Math.floor(t/420)); }
    else img = acua2Pick("levHead", Math.floor(t/520));
    const flip = nativeLeft ? fx > 0.12 : fx < -0.12;
    // arcos del cuerpo que asoman detrás de la cabeza (fases 1-2), para que se lea gigante
    if(!dying && phase<3 && acua2Ready("levCoil")){
      const px = -fy, py = fx;
      for(let k=0;k<2;k++){
        const back = R*(1.7+k*1.5), wob = Math.sin(t/600+k*1.7)*R*0.35;
        const cimg = acua2Pick("levCoil", k);
        drawImgSized(cimg, e.x-fx*back+px*wob, e.y-fy*back*0.6+py*wob*0.5+8, R*(1.5-k*0.25), 0.5, 0.92, (k===1)!==flip, undefined);
      }
    }
    drawImgSized(img, e.x, e.y, h, 0.5, 0.86, flip, undefined);
    return true;
  }
  return false;
}
// Tentáculos/agarre del Kraken y ola del Leviatán dibujados sobre el mundo (no reemplazan al cuerpo).
function drawAcua2Overlays(){
  if(currentArena!=="acuatica") return;
  for(const e of enemies){
    if(!e.alive) continue;
    if(e.type==="kraken_joven" && e.grabbedHero && e.grabbedHero.alive && acua2Ready("krGrab")){
      const g = e.grabbedHero;
      const bob = Math.sin(animNow/140)*2;
      drawImgSized(acua2Pick("krGrab", 0), g.x+6, g.y+10+bob, 96, 0.5, 0.95, g.x<e.x, 0.95);
    }
  }
}
