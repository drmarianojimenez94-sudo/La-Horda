"use strict";
/* ============================================================
   js/assets/champion-sprites.js
   Carga de los sprites reales de guardianes, invocaciones y formas especiales
   (assets/sprites/champions/). Cada imagen tiene su bandera READY.
   ============================================================ */

// Musashi: sprites reales recortados (idle/run x2/ataque básico x5/hurt/death), llegaron
// en un segundo ZIP ya prolijos (transparencia real, un PNG por pose) — reemplaza el
// sprite procedural GRIDS.musashi/PAL.musashi como imagen PRINCIPAL (el procedural queda
// de respaldo silencioso si algo no cargara). Mismo patrón que Segador/Axiom
// (draw3DirRealSprite) pero con más poses propias: acá se arma un mini-atlas manual con
// una sola imagen por estado en vez de una grilla, ya que las 4 habilidades tienen su
// propio feedback (partículas/afterimages) hecho a mano y no dependen de más frames.
const MUSASHI_REAL_IMG = {};
const MUSASHI_REAL_READY = {};
MUSASHI_REAL_IMG.idle = new Image();
MUSASHI_REAL_READY.idle = false;
MUSASHI_REAL_IMG.idle.onload = () => { MUSASHI_REAL_READY.idle = true; };
MUSASHI_REAL_IMG.idle.src = "assets/sprites/champions/musashi/idle.png";
MUSASHI_REAL_IMG.run1 = new Image();
MUSASHI_REAL_READY.run1 = false;
MUSASHI_REAL_IMG.run1.onload = () => { MUSASHI_REAL_READY.run1 = true; };
MUSASHI_REAL_IMG.run1.src = "assets/sprites/champions/musashi/run1.png";
MUSASHI_REAL_IMG.run2 = new Image();
MUSASHI_REAL_READY.run2 = false;
MUSASHI_REAL_IMG.run2.onload = () => { MUSASHI_REAL_READY.run2 = true; };
MUSASHI_REAL_IMG.run2.src = "assets/sprites/champions/musashi/run2.png";
MUSASHI_REAL_IMG.hurt = new Image();
MUSASHI_REAL_READY.hurt = false;
MUSASHI_REAL_IMG.hurt.onload = () => { MUSASHI_REAL_READY.hurt = true; };
MUSASHI_REAL_IMG.hurt.src = "assets/sprites/champions/musashi/hurt.png";
MUSASHI_REAL_IMG.death = new Image();
MUSASHI_REAL_READY.death = false;
MUSASHI_REAL_IMG.death.onload = () => { MUSASHI_REAL_READY.death = true; };
MUSASHI_REAL_IMG.death.src = "assets/sprites/champions/musashi/death.png";
MUSASHI_REAL_IMG.basic1 = new Image();
MUSASHI_REAL_READY.basic1 = false;
MUSASHI_REAL_IMG.basic1.onload = () => { MUSASHI_REAL_READY.basic1 = true; };
MUSASHI_REAL_IMG.basic1.src = "assets/sprites/champions/musashi/basic1.png";
MUSASHI_REAL_IMG.basic2 = new Image();
MUSASHI_REAL_READY.basic2 = false;
MUSASHI_REAL_IMG.basic2.onload = () => { MUSASHI_REAL_READY.basic2 = true; };
MUSASHI_REAL_IMG.basic2.src = "assets/sprites/champions/musashi/basic2.png";
MUSASHI_REAL_IMG.basic3 = new Image();
MUSASHI_REAL_READY.basic3 = false;
MUSASHI_REAL_IMG.basic3.onload = () => { MUSASHI_REAL_READY.basic3 = true; };
MUSASHI_REAL_IMG.basic3.src = "assets/sprites/champions/musashi/basic3.png";
MUSASHI_REAL_IMG.basic4 = new Image();
MUSASHI_REAL_READY.basic4 = false;
MUSASHI_REAL_IMG.basic4.onload = () => { MUSASHI_REAL_READY.basic4 = true; };
MUSASHI_REAL_IMG.basic4.src = "assets/sprites/champions/musashi/basic4.png";
MUSASHI_REAL_IMG.basic5 = new Image();
MUSASHI_REAL_READY.basic5 = false;
MUSASHI_REAL_IMG.basic5.onload = () => { MUSASHI_REAL_READY.basic5 = true; };
MUSASHI_REAL_IMG.basic5.src = "assets/sprites/champions/musashi/basic5.png";

// Arte real adicional (mismos zips originales de Musashi, ya subidos, sin usar hasta ahora):
// poses de Corte del Rōnin/Paso Fantasma/Mil Cortes (windup/impacto de cada habilidad, ya con
// la silueta de Musashi incluida en el frame -mismo criterio que BOSS_FX: van en REEMPLAZO del
// sprite normal mientras dura la pose, no superpuestas-) y dos "banners" decorativos de Último
// Duelo (portal de entrada / destello de victoria), estos sí superpuestos aparte del cuerpo.
MUSASHI_REAL_IMG.ronin1 = new Image();
MUSASHI_REAL_READY.ronin1 = false;
MUSASHI_REAL_IMG.ronin1.onload = () => { MUSASHI_REAL_READY.ronin1 = true; };
MUSASHI_REAL_IMG.ronin1.src = "assets/sprites/champions/musashi/ronin1.png";
MUSASHI_REAL_IMG.ronin2 = new Image();
MUSASHI_REAL_READY.ronin2 = false;
MUSASHI_REAL_IMG.ronin2.onload = () => { MUSASHI_REAL_READY.ronin2 = true; };
MUSASHI_REAL_IMG.ronin2.src = "assets/sprites/champions/musashi/ronin2.png";
MUSASHI_REAL_IMG.ronin3 = new Image();
MUSASHI_REAL_READY.ronin3 = false;
MUSASHI_REAL_IMG.ronin3.onload = () => { MUSASHI_REAL_READY.ronin3 = true; };
MUSASHI_REAL_IMG.ronin3.src = "assets/sprites/champions/musashi/ronin3.png";
MUSASHI_REAL_IMG.ronin4 = new Image();
MUSASHI_REAL_READY.ronin4 = false;
MUSASHI_REAL_IMG.ronin4.onload = () => { MUSASHI_REAL_READY.ronin4 = true; };
MUSASHI_REAL_IMG.ronin4.src = "assets/sprites/champions/musashi/ronin4.png";
MUSASHI_REAL_IMG.ghost1 = new Image();
MUSASHI_REAL_READY.ghost1 = false;
MUSASHI_REAL_IMG.ghost1.onload = () => { MUSASHI_REAL_READY.ghost1 = true; };
MUSASHI_REAL_IMG.ghost1.src = "assets/sprites/champions/musashi/ghost1.png";
MUSASHI_REAL_IMG.ghost2 = new Image();
MUSASHI_REAL_READY.ghost2 = false;
MUSASHI_REAL_IMG.ghost2.onload = () => { MUSASHI_REAL_READY.ghost2 = true; };
MUSASHI_REAL_IMG.ghost2.src = "assets/sprites/champions/musashi/ghost2.png";
MUSASHI_REAL_IMG.ghost3 = new Image();
MUSASHI_REAL_READY.ghost3 = false;
MUSASHI_REAL_IMG.ghost3.onload = () => { MUSASHI_REAL_READY.ghost3 = true; };
MUSASHI_REAL_IMG.ghost3.src = "assets/sprites/champions/musashi/ghost3.png";
MUSASHI_REAL_IMG.ghost4 = new Image();
MUSASHI_REAL_READY.ghost4 = false;
MUSASHI_REAL_IMG.ghost4.onload = () => { MUSASHI_REAL_READY.ghost4 = true; };
MUSASHI_REAL_IMG.ghost4.src = "assets/sprites/champions/musashi/ghost4.png";
MUSASHI_REAL_IMG.thousand1 = new Image();
MUSASHI_REAL_READY.thousand1 = false;
MUSASHI_REAL_IMG.thousand1.onload = () => { MUSASHI_REAL_READY.thousand1 = true; };
MUSASHI_REAL_IMG.thousand1.src = "assets/sprites/champions/musashi/thousand1.png";
MUSASHI_REAL_IMG.thousand2 = new Image();
MUSASHI_REAL_READY.thousand2 = false;
MUSASHI_REAL_IMG.thousand2.onload = () => { MUSASHI_REAL_READY.thousand2 = true; };
MUSASHI_REAL_IMG.thousand2.src = "assets/sprites/champions/musashi/thousand2.png";
MUSASHI_REAL_IMG.thousand3 = new Image();
MUSASHI_REAL_READY.thousand3 = false;
MUSASHI_REAL_IMG.thousand3.onload = () => { MUSASHI_REAL_READY.thousand3 = true; };
MUSASHI_REAL_IMG.thousand3.src = "assets/sprites/champions/musashi/thousand3.png";
MUSASHI_REAL_IMG.thousand4 = new Image();
MUSASHI_REAL_READY.thousand4 = false;
MUSASHI_REAL_IMG.thousand4.onload = () => { MUSASHI_REAL_READY.thousand4 = true; };
MUSASHI_REAL_IMG.thousand4.src = "assets/sprites/champions/musashi/thousand4.png";
MUSASHI_REAL_IMG.ultiPortal = new Image();
MUSASHI_REAL_READY.ultiPortal = false;
MUSASHI_REAL_IMG.ultiPortal.onload = () => { MUSASHI_REAL_READY.ultiPortal = true; };
MUSASHI_REAL_IMG.ultiPortal.src = "assets/sprites/champions/musashi/ultiPortal.png";
MUSASHI_REAL_IMG.ultiFinish = new Image();
MUSASHI_REAL_READY.ultiFinish = false;
MUSASHI_REAL_IMG.ultiFinish.onload = () => { MUSASHI_REAL_READY.ultiFinish = true; };
MUSASHI_REAL_IMG.ultiFinish.src = "assets/sprites/champions/musashi/ultiFinish.png";
// Sylva, La Cazadora del Bosque: sprites reales recortados (idle/run x2/combo de ataque
// x6/lobo espectral x3), llegaron ya prolijos en PNGs separados por pose (algunos eran
// tiras de varios cuadros parejos, recortadas automáticamente con PIL antes de insertar).
// Mismo patrón que Musashi/Segador/Axiom: una imagen completa por estado, sin grilla.
const SYLVA_REAL_IMG = {};
const SYLVA_REAL_READY = {};
SYLVA_REAL_IMG.idle = new Image();
SYLVA_REAL_READY.idle = false;
SYLVA_REAL_IMG.idle.onload = () => { SYLVA_REAL_READY.idle = true; };
SYLVA_REAL_IMG.idle.src = "assets/sprites/champions/cazadora/idle.png";
SYLVA_REAL_IMG.run1 = new Image();
SYLVA_REAL_READY.run1 = false;
SYLVA_REAL_IMG.run1.onload = () => { SYLVA_REAL_READY.run1 = true; };
SYLVA_REAL_IMG.run1.src = "assets/sprites/champions/cazadora/run1.png";
SYLVA_REAL_IMG.run2 = new Image();
SYLVA_REAL_READY.run2 = false;
SYLVA_REAL_IMG.run2.onload = () => { SYLVA_REAL_READY.run2 = true; };
SYLVA_REAL_IMG.run2.src = "assets/sprites/champions/cazadora/run2.png";
SYLVA_REAL_IMG.atk1 = new Image();
SYLVA_REAL_READY.atk1 = false;
SYLVA_REAL_IMG.atk1.onload = () => { SYLVA_REAL_READY.atk1 = true; };
SYLVA_REAL_IMG.atk1.src = "assets/sprites/champions/cazadora/atk1.png";
SYLVA_REAL_IMG.atk2 = new Image();
SYLVA_REAL_READY.atk2 = false;
SYLVA_REAL_IMG.atk2.onload = () => { SYLVA_REAL_READY.atk2 = true; };
SYLVA_REAL_IMG.atk2.src = "assets/sprites/champions/cazadora/atk2.png";
SYLVA_REAL_IMG.atk3 = new Image();
SYLVA_REAL_READY.atk3 = false;
SYLVA_REAL_IMG.atk3.onload = () => { SYLVA_REAL_READY.atk3 = true; };
SYLVA_REAL_IMG.atk3.src = "assets/sprites/champions/cazadora/atk3.png";
SYLVA_REAL_IMG.atk4 = new Image();
SYLVA_REAL_READY.atk4 = false;
SYLVA_REAL_IMG.atk4.onload = () => { SYLVA_REAL_READY.atk4 = true; };
SYLVA_REAL_IMG.atk4.src = "assets/sprites/champions/cazadora/atk4.png";
SYLVA_REAL_IMG.atk5 = new Image();
SYLVA_REAL_READY.atk5 = false;
SYLVA_REAL_IMG.atk5.onload = () => { SYLVA_REAL_READY.atk5 = true; };
SYLVA_REAL_IMG.atk5.src = "assets/sprites/champions/cazadora/atk5.png";
SYLVA_REAL_IMG.atk6 = new Image();
SYLVA_REAL_READY.atk6 = false;
SYLVA_REAL_IMG.atk6.onload = () => { SYLVA_REAL_READY.atk6 = true; };
SYLVA_REAL_IMG.atk6.src = "assets/sprites/champions/cazadora/atk6.png";

// Arte real adicional (mismo zip original de Sylva, sin usar hasta ahora): pose de puntería
// (chargeAim, mientras carga Flecha Perforante), 2 frames de disparo (release1/2, reemplazan
// su cuerpo durante el breve instante del disparo) e impacto crítico sobre la Presa
// (piercingCrit, decorativo). Recortados a mano para sacar el texto de rótulo que traían
// pegado arriba (p.ej. "IMPACTO EN PRESA (CRÍTICO)") -ver piercingCrit-.
SYLVA_REAL_IMG.chargeAim = new Image();
SYLVA_REAL_READY.chargeAim = false;
SYLVA_REAL_IMG.chargeAim.onload = () => { SYLVA_REAL_READY.chargeAim = true; };
SYLVA_REAL_IMG.chargeAim.src = "assets/sprites/champions/cazadora/chargeAim.png";
SYLVA_REAL_IMG.release1 = new Image();
SYLVA_REAL_READY.release1 = false;
SYLVA_REAL_IMG.release1.onload = () => { SYLVA_REAL_READY.release1 = true; };
SYLVA_REAL_IMG.release1.src = "assets/sprites/champions/cazadora/release1.png";
SYLVA_REAL_IMG.release2 = new Image();
SYLVA_REAL_READY.release2 = false;
SYLVA_REAL_IMG.release2.onload = () => { SYLVA_REAL_READY.release2 = true; };
SYLVA_REAL_IMG.release2.src = "assets/sprites/champions/cazadora/release2.png";
SYLVA_REAL_IMG.piercingCrit = new Image();
SYLVA_REAL_READY.piercingCrit = false;
SYLVA_REAL_IMG.piercingCrit.onload = () => { SYLVA_REAL_READY.piercingCrit = true; };
SYLVA_REAL_IMG.piercingCrit.src = "assets/sprites/champions/cazadora/piercingCrit.png";
const WOLF_REAL_IMG = {};
const WOLF_REAL_READY = {};
WOLF_REAL_IMG.idle = new Image();
WOLF_REAL_READY.idle = false;
WOLF_REAL_IMG.idle.onload = () => { WOLF_REAL_READY.idle = true; };
WOLF_REAL_IMG.idle.src = "assets/sprites/champions/cazadora/wolf/idle.png";
WOLF_REAL_IMG.run = new Image();
WOLF_REAL_READY.run = false;
WOLF_REAL_IMG.run.onload = () => { WOLF_REAL_READY.run = true; };
WOLF_REAL_IMG.run.src = "assets/sprites/champions/cazadora/wolf/run.png";
WOLF_REAL_IMG.bite = new Image();
WOLF_REAL_READY.bite = false;
WOLF_REAL_IMG.bite.onload = () => { WOLF_REAL_READY.bite = true; };
WOLF_REAL_IMG.bite.src = "assets/sprites/champions/cazadora/wolf/bite.png";
WOLF_REAL_IMG.jump = new Image();
WOLF_REAL_READY.jump = false;
WOLF_REAL_IMG.jump.onload = () => { WOLF_REAL_READY.jump = true; };
WOLF_REAL_IMG.jump.src = "assets/sprites/champions/cazadora/wolf/jump.png";
const MAGO_IMG = new Image();
let MAGO_IMG_READY = false;
MAGO_IMG.onload = () => { MAGO_IMG_READY = true; };
MAGO_IMG.src = "assets/sprites/champions/mago/atlas.png";
const SOPORTE_IMG = new Image();
let SOPORTE_IMG_READY = false;
SOPORTE_IMG.onload = () => { SOPORTE_IMG_READY = true; };
SOPORTE_IMG.src = "assets/sprites/champions/soporte/atlas.png";
const TANQUE_IMG = new Image();
let TANQUE_IMG_READY = false;
TANQUE_IMG.onload = () => { TANQUE_IMG_READY = true; };
TANQUE_IMG.src = "assets/sprites/champions/tanque/atlas.png";
const GUERRERO_IMG = new Image();
let GUERRERO_IMG_READY = false;
GUERRERO_IMG.onload = () => { GUERRERO_IMG_READY = true; };
GUERRERO_IMG.src = "assets/sprites/champions/guerrero/atlas.png";
const PROFETA_IMG = new Image();
let PROFETA_IMG_READY = false;
PROFETA_IMG.onload = () => { PROFETA_IMG_READY = true; };
PROFETA_IMG.src = "assets/sprites/champions/profeta/atlas.png";

// Segador Olvidado ("Berserk"): sprite real de 3 direcciones (abajo/derecha/arriba, con
// espejo para izquierda), reemplaza al sprite procedural viejo que se veía cortado a la
// mitad. Por ahora un frame estático por dirección (sin ciclo de caminar todavía).
const SEGADOR_REAL_IMG = {down:new Image(), right:new Image(), up:new Image()};
const SEGADOR_REAL_READY = {down:false, right:false, up:false};
["down","right","up"].forEach(dir=>{
  SEGADOR_REAL_IMG[dir].onload = () => { SEGADOR_REAL_READY[dir] = true; };
});

SEGADOR_REAL_IMG["down"].src = "assets/sprites/champions/segador/dir-down.png";
SEGADOR_REAL_IMG["right"].src = "assets/sprites/champions/segador/dir-right.png";
SEGADOR_REAL_IMG["up"].src = "assets/sprites/champions/segador/dir-up.png";
/* ============================================================
   SEGADOR y AXIOM — animaciones nuevas (Pack 1, pedido explícito: cambiar SOLO la apariencia
   y las animaciones; las habilidades, su lógica y sus efectos visuales quedan exactamente
   como estaban). Quieto / caminar / ataque / cast / golpe / muerte en 3 direcciones (abajo,
   perfil mirando a la derecha -se espeja para la izquierda-, arriba). Los recortes venían de
   una hoja JPEG con grilla: se limpiaron líneas de grilla y restos de celdas vecinas, y se
   dejaron afuera los frames que venían partidos. Si por algo no cargaran, se sigue usando el
   arte anterior (draw3DirRealSprite) como respaldo.
   ============================================================ */
const CHAMP_PACK = {};

/* ============================================================
   REDRAW (hojas "La Horda — estilo oficial", docs/ART_REPLACEMENT_QUEUE.md): un atlas por guardián,
   grilla de cuadros del mismo tamaño con los pies en la misma línea (anchor). refH = alto del cuerpo
   de referencia (cabeza a pies) para escalar igual que el resto del roster. Solo cambia el dibujo:
   habilidades, tiempos y VFX siguen siendo los del código. Recortado con tools/art/sheet_extract.py.
   ============================================================ */
// Arreglos de datos por pack (ver champPackNormalize más abajo). Auditoría: tools/art/skin_audit.js.
// Las hojas de las skins de set traían columnas de vista mezcladas (la "izquierda" mirando a la derecha,
// "espalda" de frente, perfiles de 3/4): se arma el perfil derecho con cuadros que de verdad miran a la
// derecha y la izquierda sale de su espejo. CP_M(i) = cuadro i espejado.
const CP_M = i => ~i;
const CHAMP_PACK_FIX = {
  // Asesino, Jack el Destripador: TODAS las columnas miran a la derecha (no hay izquierda ni espalda).
  // Caminata de 4 pasos con los cuadros de caminar/correr de las columnas que miran igual.
  // Muerte: 37/40 venían partidos y 41 con restos del fondo -> de pie, cayendo, tendido (36, 38, 39).
  skin_nocturno: { left:"mirror", up:"down", turn:["down"], drop:[37, 40, 41],
    sets:{ walk_side:[8, 14, 11, 17], walk_down:[6, 12, 10, 16], run:[8, 14, 11, 17] } },
  // Musashi, Samurái Legendario: la izquierda mira a la derecha; el "perfil" quieto (2) y de golpe (32)
  // son de frente: el perfil derecho real es la columna 3/4 (1, 7, 31). Ataque/lanzar de frente con el
  // filo hacia la derecha (18, 24) y el paso largo (12) se espejan al mirar a la izquierda.
  skin_errante: { left:"mirror", turnFrames:[12, 18, 24],
    sets:{ idle_side:[1], walk_side:[7, 13, 8, 12], attack_side:[1, 20, 20], cast_side:[1, 26, 26], hit_side:[31],
           run:[12, 13, 15, 16], walk_up:[10, 4, 17, 4] } },
  // Sylva, Flecha de Fuego: izquierda dudosa (17/23 de frente) -> espejo; ataque de espalda = lanzar de
  // espalda; el lanzar de frente (24) venía agujereado -> 27.
  skin_manada: { left:"mirror", turnFrames:[6, 12, 18],
    sets:{ walk_side:[8, 14, 7, 13], run:[12, 13, 14, 15], walk_up:[10, 3, 10, 4], attack_up:[4, 28, 28], cast_down:[0, 27, 27] } },
  // Eren, Titán Bestia: frente, 3/4 y perfil miran a la derecha; la "izquierda" es espalda de 3/4.
  skin_legion: { left:"mirror", turn:["down"],
    sets:{ walk_side:[8, 14, 7, 13], walk_down:[6, 12, 7, 13], walk_up:[10, 16, 11, 17], run:[12, 13, 14, 13] } },
  // La Profeta, Ángel Caído: la izquierda mira a la derecha; correr de frente/espalda eran perfiles y la
  // caminata de "espalda" (10) es de frente: arriba alterna las dos espaldas reales (4, 29).
  skin_profecia: { left:"mirror",
    sets:{ walk_side:[8, 12, 11, 13], walk_down:[6, 0, 7, 1], walk_up:[4, 29], attack_down:[0, 21, 21], run:[12, 13, 14, 15] } },
  // Segador, Leónidas: el "perfil" es espalda de 3/4; el perfil derecho real es la columna 3/4 (1, 7, 19, 25, 31)
  // y el frente también mira a la derecha. 40 traía una mancha negra suelta.
  skin_marea: { left:"mirror", turn:["down"], drop:[40],
    sets:{ idle_side:[1], walk_side:[7, 13, 1, 12], attack_side:[1, 19, 19], cast_side:[1, 25, 25], hit_side:[31],
           walk_up:[10, 4], run:[12, 13, 14, 15] } },
  // Axiom, Skin Z: 13 y 23 venían partidos (cabeza suelta); no hay espalda real ("espalda" = de frente).
  skin_sistema: { left:"mirror", up:"down", drop:[13, 23], turnFrames:[17],
    sets:{ walk_side:[7, 12, 6, 14], walk_down:[8, 10], run:[7, 12, 6, 14], hit_side:[24], hit_down:[25] } },
  // Mago, Ángel Arcano: la izquierda es correcta salvo el quieto (5 mira a la derecha); el frente es de 3/4
  // hacia la derecha.
  skin_convergencia: { turn:["down"], sets:{ idle_left:[CP_M(2)], attack_left:[CP_M(2), 23, 23], cast_left:[CP_M(2), 23, 23] } },
};
/* ---- Relleno de huecos del atlas (solo espeja / clona cuadros que ya existen, nunca inventa arte) ----
   En los arrays de sets, un índice NEGATIVO n es el cuadro ~n (= -n-1) ESPEJADO horizontalmente
   (champPackDrawFrame lo resuelve). Reglas genéricas, para todo pack:
   - Una sola vista horizontal: la otra es su espejo (izquierda = perfil espejado, o al revés).
   - Estado sin una dirección: champPackSet cae a la vista más parecida (arriba -> perfil -> frente).
   - Estados que faltan: correr = caminar, lanzar = ataque (reposo + golpe), ataque = lanzar,
     golpe/caminar = reposo, reposo = primer cuadro de caminar.
   - Caminatas de 1-2 cuadros se rellenan a 4 intercalando el reposo de esa vista (a,i,b,i).
   Arreglos por pack (CHAMP_PACK_FIX, auditados con tools/art/skin_audit.js), todos opcionales:
     left:"mirror"  la "izquierda" del atlas mira igual que el perfil: se descarta y se espeja el perfil
     side:"mirror"  al revés: el perfil está mal, se usa la izquierda espejada
     up:"down"|"side"  no hay vista de espalda real: arriba usa el frente (o el perfil)
     turn:["down","up"]  esas vistas están dibujadas de 3/4 hacia la derecha: se espejan al mirar a la izquierda
     turnFrames:[i...]  lo mismo, solo para esos cuadros (p.ej. un ataque de perfil dentro del set de frente)
     drop:[i...]    cuadros rotos: afuera de todos los sets
     sets:{...}     sets explícitos (después del drop, antes del relleno) */
const CP_DIRS = ["down","side","left","up"];
const CP_STATES = ["idle","walk","run","attack","cast","hit","death"];
const cpMirror = arr => arr.map(v => ~v);
function champPackNormalize(src, fix){
  fix = fix || {};
  const drop = new Set(fix.drop || []), S = {};
  for(const k in src){ const a = src[k].filter(v => !drop.has(v) && !drop.has(~v)); if(a.length) S[k] = a.slice(); }
  if(fix.sets) for(const k in fix.sets) S[k] = fix.sets[k].slice();
  if(fix.left === "mirror") for(const st of CP_STATES){ delete S[st+"_left"]; delete S[st+"_up_left"]; }
  if(fix.side === "mirror") for(const st of CP_STATES) delete S[st+"_side"];
  if(fix.up) for(const st of CP_STATES){ delete S[st+"_up"]; delete S[st+"_up_left"]; }
  const has = (st, d) => !!S[st+"_"+d], anyDir = st => CP_DIRS.some(d => has(st, d));
  // estados que faltan: se clonan del más cercano, por dirección
  const cloneState = (to, from, fn) => { if(anyDir(to) || !anyDir(from)) return; for(const d of CP_DIRS) if(has(from, d)) S[to+"_"+d] = fn(S[from+"_"+d], d); };
  cloneState("idle", "walk", a => a.slice(0, 1));
  cloneState("walk", "idle", a => a.slice());
  cloneState("attack", "cast", a => a.slice());
  cloneState("cast", "attack", a => a.slice());
  cloneState("hit", "idle", a => a.slice(0, 1));
  // caminata corta: se intercala el reposo de esa vista (paso - apoyo - paso - apoyo)
  const pad = (arr, idle) => {
    if(!arr || arr.length >= 4) return arr;
    const i = idle && idle.find(v => arr.indexOf(v) < 0);
    if(i === undefined) return arr.length === 1 ? arr : arr.length === 2 ? arr : [arr[0], arr[1], arr[2], arr[1]];
    return arr.length === 1 ? [arr[0], i, arr[0], i] : arr.length === 2 ? [arr[0], i, arr[1], i] : arr.concat([i]);
  };
  for(const d of CP_DIRS.concat(["up_left"])) if(S["walk_"+d]) S["walk_"+d] = pad(S["walk_"+d], S["idle_"+d]);
  if(S.run && !S.run_down) S.run = pad(S.run, S.idle_side);
  if(!S.run && S.walk_side) S.run = S.walk_side.slice();
  // una sola vista horizontal: la otra es su espejo
  for(const st of CP_STATES){
    if(has(st, "side") && !has(st, "left")) S[st+"_left"] = cpMirror(S[st+"_side"]);
    else if(has(st, "left") && !has(st, "side")) S[st+"_side"] = cpMirror(S[st+"_left"]);
  }
  // frente/espalda dibujados de 3/4 hacia la derecha (toda la vista o cuadros sueltos): variante
  // "<set>_l" con esos cuadros espejados, para cuando el guardián mira a la izquierda
  const turn = new Set(fix.turn || []), tf = new Set(fix.turnFrames || []);
  for(const st of CP_STATES) for(const d of ["down", "up"]){
    const a = S[st+"_"+d]; if(!a) continue;
    if(turn.has(d) || a.some(v => tf.has(v))) S[st+"_"+d+"_l"] = a.map(v => (turn.has(d) || tf.has(v)) ? ~v : v);
  }
  return S;
}
// Punto de apoyo horizontal (mediana de los píxeles de piernas y torso): el cuadro se ancla ahí -y se
// espeja alrededor de ahí-, así el cuerpo queda sobre el mismo punto mire a donde mire (los cuadros
// vienen centrados por su caja, que se corre con el arma o la capa). Se usa UN valor por set (la
// mediana de sus cuadros) para no agregar vaivén dentro de un ciclo: dentro del set los cuadros
// conservan su posición relativa de siempre.
function champPackFeet(P){
  const raw = {};
  P.footX = {};
  try{
    const img = P.atlas, W = img.naturalWidth, H = img.naturalHeight; if(!W || !H) return;
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d", {willReadFrequently:true}); g.drawImage(img, 0, 0);
    const D = g.getImageData(0, 0, W, H).data, n = Math.floor(W/P.fw)*Math.floor(H/P.fh);
    for(let v=0; v<n; v++){
      const x0 = (v % P.cols)*P.fw, y0 = Math.floor(v/P.cols)*P.fh;
      let top = -1, bot = -1, minX = P.fw, maxX = -1;
      for(let y=0; y<P.fh; y++) for(let x=0; x<P.fw; x++) if(D[((y0+y)*W + x0+x)*4+3] > 100){ if(top < 0) top = y; bot = y; if(x < minX) minX = x; if(x > maxX) maxX = x; }
      if(top < 0) continue;
      const cols = new Array(P.fw).fill(0), yA = Math.round(bot - (bot-top)*0.6); let tot = 0;
      for(let y=yA; y<=bot; y++) for(let x=0; x<P.fw; x++) if(D[((y0+y)*W + x0+x)*4+3] > 100){ cols[x]++; tot++; }
      let acc = 0, med = (minX+maxX)/2;
      for(let x=0; x<P.fw; x++){ acc += cols[x]; if(acc*2 >= tot){ med = x + 0.5; break; } }
      const box = (minX+maxX+1)/2, lim = P.fw*0.18;
      raw[v] = Math.max(box-lim, Math.min(box+lim, med))/P.fw;
    }
  }catch(e){ return; /* sin acceso a los píxeles (file://): centro de la caja, como antes */ }
  const rank = k => /^walk_/.test(k) ? 0 : /^idle_/.test(k) ? 1 : /^run/.test(k) ? 2 : 3; // el ciclo de caminar manda
  const keys = Object.keys(P.sets).sort((a, b) => rank(a) - rank(b));
  for(const k of keys){
    const vs = P.sets[k].map(v => v < 0 ? ~v : v).filter(v => raw[v] !== undefined);
    if(!vs.length) continue;
    const m = vs.map(v => raw[v]).sort((a, b) => a - b)[vs.length >> 1];
    for(const v of vs) if(P.footX[v] === undefined) P.footX[v] = m;
  }
}
function champPackLoadAtlas(key, src, meta){
  const img = new Image(), fix = Object.assign({}, CHAMP_PACK_FIX[key], meta.fix);
  const P = { atlas:img, fw:meta.w, fh:meta.h, cols:meta.cols, refH:meta.refH, anchor:meta.anchor, sets:champPackNormalize(meta.sets, fix),
              rawSets:meta.sets, upFrom:fix.up || null, fix, ready:false };
  img.onload = ()=>{ P.ready = true; };
  img.onerror = ()=>{ P.failed = true; }; // solo entonces se usa el arte anterior como respaldo
  img.src = src;
  CHAMP_PACK[key] = P;
}
// El arte redibujado de este guardián todavía está bajando: no se dibuja NADA (antes se veía un
// instante el arte viejo descartado, ej. en el título mientras decía "Cargando…").
function champPackPending(key){ const P = CHAMP_PACK[key]; return !!(P && !P.ready && !P.failed); }
champPackLoadAtlas("segador", "assets/sprites/champions/segador/v2/atlas.png", {"w":91,"h":107,"cols":8,"refH":75,"anchor":0.9439,"sets":{"idle_down":[17,18,19,20],"idle_side":[29],"idle_left":[25],"idle_up":[33],"walk_down":[21,22,23,24],"walk_side":[29,30,31,32],"walk_left":[25,26,27,28],"walk_up":[33,34,35,36],"attack_side":[0,1,2,3],"cast_side":[4,5,6],"hit_down":[13,14,15,16],"death_down":[7,8,9,10,11,12]}});
champPackLoadAtlas("musashi", "assets/sprites/champions/musashi/v2/atlas.png", {"w":91,"h":91,"cols":8,"refH":84,"anchor":0.9451,"sets":{"idle_down":[17,18,19,20],"idle_side":[29],"idle_left":[25],"idle_up":[33],"walk_down":[21,22,23,24],"walk_side":[29,30,31,32],"walk_left":[25,26,27,28],"walk_up":[33,34,35,36],"attack_side":[0,1,2,3],"cast_side":[4,5,6],"hit_down":[13,14,15,16],"death_down":[7,8,9,10,11,12]}});
champPackLoadAtlas("profeta", "assets/sprites/champions/profeta/v2/atlas.png", {"w":93,"h":133,"cols":8,"refH":76,"anchor":0.9098,"sets":{"idle_down":[17,18,19,20],"idle_side":[29],"idle_left":[25],"idle_up":[33],"walk_down":[21,22,23,24],"walk_side":[29,30,31,32],"walk_left":[25,26,27,28],"walk_up":[33,34,35,36],"attack_side":[0,1,2,3],"cast_side":[4,5,6],"hit_down":[13,14,15,16],"death_down":[7,8,9,10,11,12]}});
champPackLoadAtlas("cazadora", "assets/sprites/champions/cazadora/v2/atlas.png", {"w":90,"h":94,"cols":8,"refH":79,"anchor":0.9362,"sets":{"idle_down":[17,18,19,20],"idle_side":[30],"idle_left":[26],"idle_up":[34],"walk_down":[22,23,24,25],"walk_side":[30,31,32,33],"walk_left":[26,27,28,29],"walk_up":[34,35,36,37],"attack_side":[0,1,2,3],"cast_side":[4,5,6],"hit_down":[13,14,15,16],"death_down":[7,8,9,10,11,12],"aim":[21]}});
champPackLoadAtlas("axiom", "assets/sprites/champions/axiom/v2/atlas.png", {"w":88,"h":99,"cols":8,"refH":76,"anchor":0.9394,"sets":{"idle_down":[17,18,19,20],"idle_side":[29],"idle_left":[25],"idle_up":[33],"walk_down":[21,22,23,24],"walk_side":[29,30,31,32],"walk_left":[25,26,27,28],"walk_up":[33,34,35,36],"attack_side":[0,1,2,3],"cast_side":[4,5,6],"hit_down":[13,14,15,16],"death_down":[7,8,9,10,11,12]}});
champPackLoadAtlas("nigromante", "assets/sprites/champions/nigromante/v2/atlas.png", {"w":161,"h":114,"cols":8,"refH":82,"anchor":0.9386,"sets":{"idle_down":[18,19,20,21],"idle_side":[31],"idle_left":[34],"idle_up":[37],"walk_down":[26,27,28,29,30],"walk_side":[31,32,33],"walk_left":[34,35,36],"walk_up":[37,38,41],"walk_up_left":[39,40],"attack_side":[0,1,2,3],"cast_side":[4,5,6,7],"hit_down":[14,15,16,17],"death_down":[8,9,10,11,12,13],"ult":[22,23,24,25]}});
champPackLoadAtlas("nigro_skel", "assets/sprites/champions/nigromante/skeleton/v2/atlas.png", {"w":63,"h":95,"cols":6,"refH":75,"anchor":0.9368,"sets":{"warrior_idle":[4],"warrior_walk":[4,5],"warrior_atk":[3],"mage_idle":[1],"mage_walk":[1,2],"mage_atk":[0]}});

// El Libertador (José de San Martín) y Eren: tools/art/redraw/build_se.py (hojas en art-source/redraw/).
// libertador_horse = a caballo (Carga de San Lorenzo / forma montada); eren_titan = El Portador.
champPackLoadAtlas("libertador", "assets/sprites/champions/libertador/v2/atlas.png", {"w":103,"h":98,"cols":8,"refH":79,"anchor":0.9388,"sets":{"idle_down":[34,35,36,37],"idle_side":[53],"idle_left":[49],"idle_up":[57],"walk_down":[45,46,47,48],"walk_side":[53,54,55,56],"walk_left":[49,50,51,52],"walk_up":[57,58,59,60],"attack_side":[30,31,32,33],"cast_side":[25,26,27],"aim":[0,1,2,3],"fire":[30,31,32,33],"reload":[38,39,40,41,42,43],"bayo_pre":[12,13,14,15],"bayo_emb":[4,5,6,7],"bayo_imp":[8,9,10,11],"bayo_rem":[16,17,18,19],"command":[25,26,27,28,29],"cabral":[20,21,22,23,24],"ult_cast":[44]}});
champPackLoadAtlas("libertador_horse", "assets/sprites/champions/libertador/v2/horse.png", {"w":125,"h":102,"cols":8,"refH":91,"anchor":0.9412,"sets":{"mount":[9,10,11,12],"charge":[0,1,2,3,4],"dismount":[5,6,7,8],"m_idle":[13],"m_atk":[14,15,16],"m_run":[17,1,2]}});
champPackLoadAtlas("eren", "assets/sprites/champions/eren/v2/atlas.png", {"w":128,"h":111,"cols":8,"refH":68,"anchor":0.8919,"sets":{"idle_down":[31,32,33],"idle_side":[52],"idle_left":[47],"idle_up":[57],"walk_down":[42,43,44,45,46],"walk_side":[52,53,54,55,56],"walk_left":[47,48,49,50,51],"walk_up":[57,58,59,60,61],"run":[38,39,40,41],"attack_side":[6,7,8,9],"cast_side":[3,4,5],"aim":[3,4,5],"hit_down":[20,21],"death_down":[14,15,16],"hook_prep":[27,28],"hook_launch":[26],"hook_fly":[22,23,24],"hook_slash":[29,30],"hook_land":[25],"instinct":[34,35,36,37],"advance":[0,1,2],"bite":[10,11,12,13],"exhausted":[17,18,19]}});
champPackLoadAtlas("eren_titan", "assets/sprites/champions/eren/v2/titan.png", {"w":148,"h":136,"cols":8,"refH":126,"anchor":0.9412,"sets":{"idle_down":[20,21],"walk_down":[20,21],"walk_side":[22,23,24],"walk_up":[25,26,27],"atk":[28,29,30],"sismo":[6,7,8,9],"terremoto":[10,11,12,13],"retumbar":[0,1,2,3,4],"roar":[5],"tf":[14,15,16,17,18,19]}});
// Efectos recortados de las mismas hojas (imágenes sueltas): SE_FX.<nombre>, ver seFx().
const SE_FX = {};
function seFxLoad(dir, names){ for(const n of names){ const im = new Image(); im.src = dir + n + ".png"; SE_FX[n] = im; } }
seFxLoad("assets/sprites/champions/libertador/v2/fx/", ["blood_01", "blood_02", "buff_icon_01", "buff_icon_02", "buff_icon_03", "buff_icon_04", "dust_01", "dust_02", "dust_03", "frost_01", "frost_02", "shot_01", "smoke_04", "spectral_01", "spectral_02", "spectral_03", "spectral_04", "spectral_05"]);
seFxLoad("assets/sprites/champions/eren/v2/fx/", ["fx_blood_01", "fx_blood_02", "fx_bolt_01", "fx_bolt_02", "fx_cable_01", "fx_crack_01", "fx_crack_02", "fx_crack_03", "fx_dust_l_01", "fx_hook_01", "fx_impact_01", "fx_rocks_01", "fx_slash_01", "fx_steam_01", "fx_steam_02", "fx_steam_03", "fx_steam_04", "fx_wind_01", "shadows_01", "step_01", "step_02", "step_03"]);
function seFx(n){ const im = SE_FX[n]; return im && im.complete && im.naturalWidth ? im : null; }

// Sylva, La Cazadora del Bosque: mismo patrón (una imagen por estado). El combo básico cicla
// 6 frames durante attackAnim -se acelera solo porque attackAnim ya dura menos con más
// velocidad de ataque (ver triggerBasic), sin necesitar un sistema de animación aparte-.

/* ============================================================
   NIGROMANTE — sprites reales recortados (Nigromante_Sprites_V2). Mismo patron que
   MUSASHI_REAL_IMG/SYLVA_REAL_IMG: una imagen estatica por pose/estado, sin motor de
   grilla -drawAnimFrameSized ya sabe dibujar un solo frame sintetico por imagen-.
   ============================================================ */
const NIGRO_IMG = {};
const NIGRO_READY = {};
NIGRO_IMG.idle = new Image(); NIGRO_READY.idle=false; NIGRO_IMG.idle.onload=()=>{ NIGRO_READY.idle=true; };
NIGRO_IMG.idle.src = "assets/sprites/champions/nigromante/idle.png";
NIGRO_IMG.walk1 = new Image(); NIGRO_READY.walk1=false; NIGRO_IMG.walk1.onload=()=>{ NIGRO_READY.walk1=true; };
NIGRO_IMG.walk1.src = "assets/sprites/champions/nigromante/walk1.png";
NIGRO_IMG.walk2 = new Image(); NIGRO_READY.walk2=false; NIGRO_IMG.walk2.onload=()=>{ NIGRO_READY.walk2=true; };
NIGRO_IMG.walk2.src = "assets/sprites/champions/nigromante/walk2.png";
NIGRO_IMG.run1 = new Image(); NIGRO_READY.run1=false; NIGRO_IMG.run1.onload=()=>{ NIGRO_READY.run1=true; };
NIGRO_IMG.run1.src = "assets/sprites/champions/nigromante/run1.png";
NIGRO_IMG.run2 = new Image(); NIGRO_READY.run2=false; NIGRO_IMG.run2.onload=()=>{ NIGRO_READY.run2=true; };
NIGRO_IMG.run2.src = "assets/sprites/champions/nigromante/run2.png";
NIGRO_IMG.basic1 = new Image(); NIGRO_READY.basic1=false; NIGRO_IMG.basic1.onload=()=>{ NIGRO_READY.basic1=true; };
NIGRO_IMG.basic1.src = "assets/sprites/champions/nigromante/basic1.png";
NIGRO_IMG.basic2 = new Image(); NIGRO_READY.basic2=false; NIGRO_IMG.basic2.onload=()=>{ NIGRO_READY.basic2=true; };
NIGRO_IMG.basic2.src = "assets/sprites/champions/nigromante/basic2.png";
NIGRO_IMG.basic3 = new Image(); NIGRO_READY.basic3=false; NIGRO_IMG.basic3.onload=()=>{ NIGRO_READY.basic3=true; };
NIGRO_IMG.basic3.src = "assets/sprites/champions/nigromante/basic3.png";
NIGRO_IMG.basic4 = new Image(); NIGRO_READY.basic4=false; NIGRO_IMG.basic4.onload=()=>{ NIGRO_READY.basic4=true; };
NIGRO_IMG.basic4.src = "assets/sprites/champions/nigromante/basic4.png";
NIGRO_IMG.basic5 = new Image(); NIGRO_READY.basic5=false; NIGRO_IMG.basic5.onload=()=>{ NIGRO_READY.basic5=true; };
NIGRO_IMG.basic5.src = "assets/sprites/champions/nigromante/basic5.png";
NIGRO_IMG.hurt = new Image(); NIGRO_READY.hurt=false; NIGRO_IMG.hurt.onload=()=>{ NIGRO_READY.hurt=true; };
NIGRO_IMG.hurt.src = "assets/sprites/champions/nigromante/hurt.png";
NIGRO_IMG.death = new Image(); NIGRO_READY.death=false; NIGRO_IMG.death.onload=()=>{ NIGRO_READY.death=true; };
NIGRO_IMG.death.src = "assets/sprites/champions/nigromante/death.png";
NIGRO_IMG.castSkeleton1 = new Image(); NIGRO_READY.castSkeleton1=false; NIGRO_IMG.castSkeleton1.onload=()=>{ NIGRO_READY.castSkeleton1=true; };
NIGRO_IMG.castSkeleton1.src = "assets/sprites/champions/nigromante/castSkeleton1.png";
NIGRO_IMG.castSkeleton2 = new Image(); NIGRO_READY.castSkeleton2=false; NIGRO_IMG.castSkeleton2.onload=()=>{ NIGRO_READY.castSkeleton2=true; };
NIGRO_IMG.castSkeleton2.src = "assets/sprites/champions/nigromante/castSkeleton2.png";
NIGRO_IMG.castSkeleton3 = new Image(); NIGRO_READY.castSkeleton3=false; NIGRO_IMG.castSkeleton3.onload=()=>{ NIGRO_READY.castSkeleton3=true; };
NIGRO_IMG.castSkeleton3.src = "assets/sprites/champions/nigromante/castSkeleton3.png";
NIGRO_IMG.castGolem1 = new Image(); NIGRO_READY.castGolem1=false; NIGRO_IMG.castGolem1.onload=()=>{ NIGRO_READY.castGolem1=true; };
NIGRO_IMG.castGolem1.src = "assets/sprites/champions/nigromante/castGolem1.png";
NIGRO_IMG.castGolem2 = new Image(); NIGRO_READY.castGolem2=false; NIGRO_IMG.castGolem2.onload=()=>{ NIGRO_READY.castGolem2=true; };
NIGRO_IMG.castGolem2.src = "assets/sprites/champions/nigromante/castGolem2.png";
NIGRO_IMG.castPlague1 = new Image(); NIGRO_READY.castPlague1=false; NIGRO_IMG.castPlague1.onload=()=>{ NIGRO_READY.castPlague1=true; };
NIGRO_IMG.castPlague1.src = "assets/sprites/champions/nigromante/castPlague1.png";
NIGRO_IMG.castPlague2 = new Image(); NIGRO_READY.castPlague2=false; NIGRO_IMG.castPlague2.onload=()=>{ NIGRO_READY.castPlague2=true; };
NIGRO_IMG.castPlague2.src = "assets/sprites/champions/nigromante/castPlague2.png";
NIGRO_IMG.ultTransform1 = new Image(); NIGRO_READY.ultTransform1=false; NIGRO_IMG.ultTransform1.onload=()=>{ NIGRO_READY.ultTransform1=true; };
NIGRO_IMG.ultTransform1.src = "assets/sprites/champions/nigromante/ultTransform1.png";
NIGRO_IMG.ultTransform2 = new Image(); NIGRO_READY.ultTransform2=false; NIGRO_IMG.ultTransform2.onload=()=>{ NIGRO_READY.ultTransform2=true; };
NIGRO_IMG.ultTransform2.src = "assets/sprites/champions/nigromante/ultTransform2.png";
NIGRO_IMG.ultTransform3 = new Image(); NIGRO_READY.ultTransform3=false; NIGRO_IMG.ultTransform3.onload=()=>{ NIGRO_READY.ultTransform3=true; };
NIGRO_IMG.ultTransform3.src = "assets/sprites/champions/nigromante/ultTransform3.png";
NIGRO_IMG.ultTransform4 = new Image(); NIGRO_READY.ultTransform4=false; NIGRO_IMG.ultTransform4.onload=()=>{ NIGRO_READY.ultTransform4=true; };
NIGRO_IMG.ultTransform4.src = "assets/sprites/champions/nigromante/ultTransform4.png";

// Ciclo de idle (5 frames) y caminata (6 frames) reales -antes un solo frame quieto y una
// alternancia de 2 frames-, mismo zip del Nigromante, sin usar hasta ahora.
NIGRO_IMG.idleA1 = new Image();
NIGRO_READY.idleA1 = false;
NIGRO_IMG.idleA1.onload = () => { NIGRO_READY.idleA1 = true; };
NIGRO_IMG.idleA1.src = "assets/sprites/champions/nigromante/idleA1.png";
NIGRO_IMG.idleA2 = new Image();
NIGRO_READY.idleA2 = false;
NIGRO_IMG.idleA2.onload = () => { NIGRO_READY.idleA2 = true; };
NIGRO_IMG.idleA2.src = "assets/sprites/champions/nigromante/idleA2.png";
NIGRO_IMG.idleA3 = new Image();
NIGRO_READY.idleA3 = false;
NIGRO_IMG.idleA3.onload = () => { NIGRO_READY.idleA3 = true; };
NIGRO_IMG.idleA3.src = "assets/sprites/champions/nigromante/idleA3.png";
NIGRO_IMG.idleA4 = new Image();
NIGRO_READY.idleA4 = false;
NIGRO_IMG.idleA4.onload = () => { NIGRO_READY.idleA4 = true; };
NIGRO_IMG.idleA4.src = "assets/sprites/champions/nigromante/idleA4.png";
NIGRO_IMG.idleA5 = new Image();
NIGRO_READY.idleA5 = false;
NIGRO_IMG.idleA5.onload = () => { NIGRO_READY.idleA5 = true; };
NIGRO_IMG.idleA5.src = "assets/sprites/champions/nigromante/idleA5.png";
NIGRO_IMG.walkA1 = new Image();
NIGRO_READY.walkA1 = false;
NIGRO_IMG.walkA1.onload = () => { NIGRO_READY.walkA1 = true; };
NIGRO_IMG.walkA1.src = "assets/sprites/champions/nigromante/walk1.png";
NIGRO_IMG.walkA2 = new Image();
NIGRO_READY.walkA2 = false;
NIGRO_IMG.walkA2.onload = () => { NIGRO_READY.walkA2 = true; };
NIGRO_IMG.walkA2.src = "assets/sprites/champions/nigromante/walkA2.png";
NIGRO_IMG.walkA3 = new Image();
NIGRO_READY.walkA3 = false;
NIGRO_IMG.walkA3.onload = () => { NIGRO_READY.walkA3 = true; };
NIGRO_IMG.walkA3.src = "assets/sprites/champions/nigromante/walkA3.png";
NIGRO_IMG.walkA4 = new Image();
NIGRO_READY.walkA4 = false;
NIGRO_IMG.walkA4.onload = () => { NIGRO_READY.walkA4 = true; };
NIGRO_IMG.walkA4.src = "assets/sprites/champions/nigromante/walk2.png";
NIGRO_IMG.walkA5 = new Image();
NIGRO_READY.walkA5 = false;
NIGRO_IMG.walkA5.onload = () => { NIGRO_READY.walkA5 = true; };
NIGRO_IMG.walkA5.src = "assets/sprites/champions/nigromante/walkA5.png";
NIGRO_IMG.walkA6 = new Image();
NIGRO_READY.walkA6 = false;
NIGRO_IMG.walkA6.onload = () => { NIGRO_READY.walkA6 = true; };
NIGRO_IMG.walkA6.src = "assets/sprites/champions/nigromante/walkA6.png";
const NIGRO_SKEL_IMG = {};
const NIGRO_SKEL_READY = {};
NIGRO_SKEL_IMG.warrior = new Image(); NIGRO_SKEL_READY.warrior=false; NIGRO_SKEL_IMG.warrior.onload=()=>{ NIGRO_SKEL_READY.warrior=true; };
NIGRO_SKEL_IMG.warrior.src = "assets/sprites/champions/nigromante/skeleton/warrior.png";
NIGRO_SKEL_IMG.warriorAtk = new Image(); NIGRO_SKEL_READY.warriorAtk=false; NIGRO_SKEL_IMG.warriorAtk.onload=()=>{ NIGRO_SKEL_READY.warriorAtk=true; };
NIGRO_SKEL_IMG.warriorAtk.src = "assets/sprites/champions/nigromante/skeleton/warriorAtk.png";
NIGRO_SKEL_IMG.mage = new Image(); NIGRO_SKEL_READY.mage=false; NIGRO_SKEL_IMG.mage.onload=()=>{ NIGRO_SKEL_READY.mage=true; };
NIGRO_SKEL_IMG.mage.src = "assets/sprites/champions/nigromante/skeleton/mage.png";
NIGRO_SKEL_IMG.mageAtk = new Image(); NIGRO_SKEL_READY.mageAtk=false; NIGRO_SKEL_IMG.mageAtk.onload=()=>{ NIGRO_SKEL_READY.mageAtk=true; };
NIGRO_SKEL_IMG.mageAtk.src = "assets/sprites/champions/nigromante/skeleton/mageAtk.png";

// Caminata real (2 frames) del esqueleto guerrero invocado -antes pose quieta todo el
// tiempo- y ráfaga de materialización al invocar cada esqueleto (spawnWarrior/spawnMage).
NIGRO_SKEL_IMG.walk1 = new Image();
NIGRO_SKEL_READY.walk1 = false;
NIGRO_SKEL_IMG.walk1.onload = () => { NIGRO_SKEL_READY.walk1 = true; };
NIGRO_SKEL_IMG.walk1.src = "assets/sprites/champions/nigromante/skeleton/walk1.png";
NIGRO_SKEL_IMG.walk2 = new Image();
NIGRO_SKEL_READY.walk2 = false;
NIGRO_SKEL_IMG.walk2.onload = () => { NIGRO_SKEL_READY.walk2 = true; };
NIGRO_SKEL_IMG.walk2.src = "assets/sprites/champions/nigromante/skeleton/walk2.png";
NIGRO_SKEL_IMG.spawnWarrior = new Image();
NIGRO_SKEL_READY.spawnWarrior = false;
NIGRO_SKEL_IMG.spawnWarrior.onload = () => { NIGRO_SKEL_READY.spawnWarrior = true; };
NIGRO_SKEL_IMG.spawnWarrior.src = "assets/sprites/champions/nigromante/skeleton/spawnWarrior.png";
NIGRO_SKEL_IMG.spawnMage = new Image();
NIGRO_SKEL_READY.spawnMage = false;
NIGRO_SKEL_IMG.spawnMage.onload = () => { NIGRO_SKEL_READY.spawnMage = true; };
NIGRO_SKEL_IMG.spawnMage.src = "assets/sprites/champions/nigromante/skeleton/spawnMage.png";
const NIGRO_GOLEM_IMG = {};
const NIGRO_GOLEM_READY = {};
// Gólem del Nigromante: un atlas por elemento (piedra = subjefe del Laberinto con 4 direcciones,
// caminata, golpe, escombros e impacto; fuego y hielo = variantes con idle/caminata, ataque y
// muerte). Datos: js/assets/nigro-golems-meta.js (tools/art/nigromante_golems/build.py).
// Tormenta y Plaga usan el de piedra recoloreado (nigro-elements.js).
const NIGRO_GOLEM_ATLAS = {};
function nigroGolemAtlasLoad(key){
  const M = NIGRO_GOLEM_META[key], img = new Image();
  const A = { img, meta:M, ready:false, failed:false, clips:null };
  img.onload = ()=>{ A.ready = true; };
  img.onerror = ()=>{ A.failed = true; };
  img.src = M.src;
  NIGRO_GOLEM_ATLAS[key] = A;
}
for(const k of ["stone", "fire", "ice"]) nigroGolemAtlasLoad(k);

// Ráfaga de materialización real al invocar el Golem (antes sin usar).
NIGRO_GOLEM_IMG.spawn = new Image();
NIGRO_GOLEM_READY.spawn = false;
NIGRO_GOLEM_IMG.spawn.onload = () => { NIGRO_GOLEM_READY.spawn = true; };
NIGRO_GOLEM_IMG.spawn.src = "assets/sprites/champions/nigromante/golem/spawn.png";
const NIGRO_DEMON_IMG = {};
const NIGRO_DEMON_READY = {};
NIGRO_DEMON_IMG.idle = new Image(); NIGRO_DEMON_READY.idle=false; NIGRO_DEMON_IMG.idle.onload=()=>{ NIGRO_DEMON_READY.idle=true; };
NIGRO_DEMON_IMG.idle.src = "assets/sprites/champions/nigromante/demon/idle.png";
NIGRO_DEMON_IMG.attack1 = new Image(); NIGRO_DEMON_READY.attack1=false; NIGRO_DEMON_IMG.attack1.onload=()=>{ NIGRO_DEMON_READY.attack1=true; };
NIGRO_DEMON_IMG.attack1.src = "assets/sprites/champions/nigromante/demon/attack1.png";
NIGRO_DEMON_IMG.attack2 = new Image(); NIGRO_DEMON_READY.attack2=false; NIGRO_DEMON_IMG.attack2.onload=()=>{ NIGRO_DEMON_READY.attack2=true; };
NIGRO_DEMON_IMG.attack2.src = "assets/sprites/champions/nigromante/demon/attack2.png";
NIGRO_DEMON_IMG.soulFireCast = new Image(); NIGRO_DEMON_READY.soulFireCast=false; NIGRO_DEMON_IMG.soulFireCast.onload=()=>{ NIGRO_DEMON_READY.soulFireCast=true; };
NIGRO_DEMON_IMG.soulFireCast.src = "assets/sprites/champions/nigromante/demon/soulFireCast.png";
NIGRO_DEMON_IMG.soulFireProj = new Image(); NIGRO_DEMON_READY.soulFireProj=false; NIGRO_DEMON_IMG.soulFireProj.onload=()=>{ NIGRO_DEMON_READY.soulFireProj=true; };
NIGRO_DEMON_IMG.soulFireProj.src = "assets/sprites/champions/nigromante/demon/soulFireProj.png";
NIGRO_DEMON_IMG.slam = new Image(); NIGRO_DEMON_READY.slam=false; NIGRO_DEMON_IMG.slam.onload=()=>{ NIGRO_DEMON_READY.slam=true; };
NIGRO_DEMON_IMG.slam.src = "assets/sprites/champions/nigromante/demon/slam.png";
NIGRO_DEMON_IMG.slash = new Image(); NIGRO_DEMON_READY.slash=false; NIGRO_DEMON_IMG.slash.onload=()=>{ NIGRO_DEMON_READY.slash=true; };
NIGRO_DEMON_IMG.slash.src = "assets/sprites/champions/nigromante/demon/slash.png";

// Axiom: sprite real (llegó en un zip aparte, ya recortado con alfa real) — 3 direcciones
// estáticas, con espejo para izquierda, mismo patrón que el Segador.
const AXIOM_REAL_IMG = {down:new Image(), right:new Image(), up:new Image()};
const AXIOM_REAL_READY = {down:false, right:false, up:false};
["down","right","up"].forEach(dir=>{
  AXIOM_REAL_IMG[dir].onload = () => { AXIOM_REAL_READY[dir] = true; };
});

AXIOM_REAL_IMG["down"].src = "assets/sprites/champions/axiom/dir-down.png";
AXIOM_REAL_IMG["right"].src = "assets/sprites/champions/axiom/dir-right.png";
AXIOM_REAL_IMG["up"].src = "assets/sprites/champions/axiom/dir-up.png";
