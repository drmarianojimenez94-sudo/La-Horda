"use strict";
/* ============================================================
   js/rendering/anim-atlas.js
   Motor genérico de animación por atlas (frames, fps, loops, eventos).
   ============================================================ */

/* ============================================================
   ANIM ATLAS — motor genérico de animación (PRUEBA PILOTO, ver auditoría)
   ============================================================
   El juego tenía ~11 sistemas de animación distintos, cada uno reinventado a mano
   cuando llegaba un pack de arte nuevo (Mago, Sanador, Tanque/Asesino, enemigos del
   Laberinto, habilidades de Axiom/Dragón/Demonio de Hielo, etc.), cada uno con su
   propio esquema de frames/fps/anchor/flip. Esto es el arranque de consolidarlos en
   UNA sola API reutilizable, migrando de a un campeón por vez para no romper nada.

   Esta capa es puro RENDER: no sabe nada de vida, daño, cooldowns ni reglas de juego.
   Cada campeón/enemigo sigue decidiendo por su cuenta "qué clip tocar ahora" (idle vs
   walk vs cast...) exactamente igual que antes -eso es lógica de juego, no de dibujo-,
   y se lo pasa a este motor como un simple string.

   Formato de una animación ("clip"):
     { frames:[{x,y,w,h,pivotX,pivotY?,hitbox?}], fps, loop, events?:{frameIdx:"nombre"} }
   - frames: recortes dentro del atlas PNG (mismo formato que ya usaban Mago/Sanador).
   - fps/loop: ritmo de reproducción, e si repite o se queda en el último frame.
   - events: dispara un evento por nombre la primera vez que la reproducción PASA por
     ese frame (p.ej. el instante exacto en que un ataque "conecta"), para poder
     enganchar partículas/sonido/screen-shake sin acoplar esa lógica al dibujo mismo.
   - hitbox (opcional, por frame): dato que el motor expone pero NO aplica solo -quien
     llama decide si lo usa para algo, las habilidades actuales siguen con su propio
     sistema de daño por radio/tiempo, sin depender de esto.
   ============================================================ */
// Índice de frame dentro de un clip para un instante animT (ms transcurridos en ese estado).
function animFrameIndex(clip, animT){
  const stepMs = 1000/clip.fps;
  let n = Math.floor((animT||0)/stepMs);
  return clip.loop ? n % clip.frames.length : Math.min(n, clip.frames.length-1);
}
// Dispara los eventos de frame definidos en el clip una sola vez por cruce de frame (no en
// cada llamada a render): `cursor` es un objeto {n} que el que llama conserva entre frames.
function animFireEvents(clip, n, cursor, onEvent){
  if(!clip.events || !onEvent || cursor.n===n) return;
  cursor.n = n;
  const ev = clip.events[n];
  if(ev) onEvent(ev, n);
}
// Dibuja el frame `n` de `clip`, anclado por pivotX/pivotY (por defecto: centrado horizontal,
// apoyado abajo -"bottom-center", igual que ya hacían Mago/Sanador a mano).
function drawAnimFrame(atlas, clip, n, x, y, drawScale, flip, alpha){
  const f = clip.frames[n];
  const s = (atlas.def.targetHeight * (drawScale/2.0)) / atlas.def.referenceHeight;
  const pivotX = f.pivotX!==undefined ? f.pivotX : f.w/2;
  const pivotY = f.pivotY!==undefined ? f.pivotY : f.h;
  ctx.save();
  ctx.globalAlpha = (alpha!==undefined ? alpha : 1)*ANIM_ALPHA_MUL;
  ctx.imageSmoothingEnabled = false;
  ctx.translate(x, y);
  ctx.scale(flip ? -1 : 1, 1);
  ctx.drawImage(atlas.img, f.x, f.y, f.w, f.h, -pivotX*s, -pivotY*s, f.w*s, f.h*s);
  ctx.restore();
}
// API de alto nivel: reproduce `clipName` para `entity` (necesita x,y,fx,animT) y lo dibuja.
// Devuelve false si el atlas todavía no cargó (mismo contrato que los drawXReal/drawXAtlas
// de siempre, para que el llamador pueda caer a un sprite de respaldo mientras tanto).
function drawAnimAtlas(atlas, clipName, entity, drawScale, alpha, onEvent){
  if(!atlas.ready()) return false;
  const clip = atlas.def.clips[clipName] || atlas.def.clips[atlas.def.defaultClip];
  const n = animFrameIndex(clip, entity.animT);
  if(onEvent){
    entity._animCursor = entity._animCursor || {};
    const cur = entity._animCursor[clipName] || (entity._animCursor[clipName] = {n:-1});
    animFireEvents(clip, n, cur, (ev)=>onEvent(ev, clipName, n));
  }
  // Un clip puede fijar su propio espejo (p.ej. "walk_left" reusa los frames de "walk_right"
  // espejados, sin importar hacia dónde mire el personaje); si no lo fija, se usa el criterio
  // de siempre (espejar según el signo de fx).
  const flip = clip.flip!==undefined ? clip.flip : (entity.fx < -0.12);
  drawAnimFrame(atlas, clip, n, entity.x, entity.y, drawScale, flip, alpha);
  return true;
}
// Envuelve una imagen YA existente (evita re-embeber el mismo PNG dos veces en base64).
function wrapAnimImage(img, readyGetter, def){ return { img, ready:readyGetter, def }; }
// Dibuja el frame `n` de `clip` con tamaño y ancla EXPLÍCITOS (ratio 0-1 del ancho/alto del
// propio dibujo, no un pivote en píxeles del atlas) — el criterio que ya usaban enemigos y
// efectos (tamaño proporcional al radio de colisión o al radio de una habilidad), a diferencia
// de drawAnimFrame (pivote fijo + targetHeight), el criterio de los sprites de campeones.
// Mismo animFrameIndex/animFireEvents de siempre por debajo: es el mismo reloj de animación.
function drawAnimFrameSized(img, clip, n, x, y, w, h, anchorXRatio, anchorYRatio, flip, alpha, rotation){
  const f = clip.frames[n];
  ctx.save();
  if(alpha!==undefined) ctx.globalAlpha = alpha*ANIM_ALPHA_MUL;
  ctx.imageSmoothingEnabled = false;
  ctx.translate(x, y);
  if(rotation) ctx.rotate(rotation); // p.ej. un segmento de rayo estirado entre dos puntos
  if(flip) ctx.scale(-1,1);
  ctx.drawImage(img, f.x, f.y, f.w, f.h, -w*anchorXRatio, -h*anchorYRatio, w, h);
  ctx.restore();
}
// Adaptador: arma clips a partir de una grilla uniforme (cols x celda de frameW x frameH)
// más un mapa de animaciones por índice de frame -mismo esquema que ya usaban, cada uno por
// su lado, ENEMY_ATLAS/SKILL_ATLAS/BOSS_FX/AXIOM_VFX/REAL_ANIM (ver auditoría).
function buildAnimDefFromGrid(cols, frameW, frameH, animDefs){
  const clips = {};
  for(const name in animDefs){
    const a = animDefs[name];
    clips[name] = {
      frames: a.frames.map(i => ({ x:(i%cols)*frameW, y:Math.floor(i/cols)*frameH, w:frameW, h:frameH })),
      fps:a.fps, loop:a.loop, flip:a.flip
    };
  }
  return { clips, defaultClip: Object.keys(clips)[0] };
}
// Un solo clip en tira horizontal (N frames de w x h, uno al lado del otro) — esquema que
// usaban, cada uno reinventado a mano, SKILL_ATLAS/BOSS_FX/AXIOM_VFX/REAL_ANIM: habilidades
// del Mago/Dragón/Demonio de Hielo, bursts de Axiom, ciclo de caminata del Laberinto.
function buildStripClip(frames, w, h, fps, loop, flip){
  const arr = [];
  for(let i=0;i<frames;i++) arr.push({x:i*w, y:0, w, h});
  return { frames: arr, fps: fps||20, loop: !!loop, flip };
}
// Variante para animaciones que normalizan la DURACIÓN total del ciclo en vez de un fps fijo
// (así una hoja de 6 frames y otra de 55 se ven igual de "rápidas" en pantalla) — el criterio
// que ya usaba REAL_ANIM para los monstruos del Laberinto.
function buildStripClipByDuration(frames, w, h, loopMs, flip){
  return buildStripClip(frames, w, h, frames/(loopMs/1000), true, flip);
}
// Cuenta de frames SIN recortar al último (a diferencia de animFrameIndex): sirve para saber
// si una animación sin loop ya terminó de reproducirse del todo, no solo mostrar su último
// frame congelado -lo que ya hacían a mano BOSS_FX/SKILL_ATLAS antes de esta migración.
function animRawFrameCount(clip, animT){ return Math.floor((animT||0)/(1000/clip.fps)); }
// Adaptador: convierte el esquema viejo (tabla de frames + índices por animación, el que ya
// usaban Mago/Sanador/Tanque/Asesino) al nuevo formato de clips, sin tocar ni un solo número
// de las coordenadas de recorte -son datos, cero riesgo de reescribirlos a mano de nuevo.
function buildAnimDefFromLegacy(legacy, targetHeight, events){
  const clips = {};
  for(const name in legacy.animations){
    const anim = legacy.animations[name];
    clips[name] = { frames: anim.frames.map(i=>legacy.frames[i]), fps:anim.fps, loop:anim.loop, flip:anim.flip, events: events && events[name] };
  }
  return { referenceHeight: legacy.referenceHeight, targetHeight, clips, defaultClip:"idle" };
}
