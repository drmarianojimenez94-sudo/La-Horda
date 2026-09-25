"use strict";
/* ============================================================
   js/assets/champion-sprites.js
   Carga de los sprites reales de campeones, invocaciones y formas especiales
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
   REDRAW (hojas "La Horda — estilo oficial", docs/ART_REPLACEMENT_QUEUE.md): un atlas por campeón,
   grilla de cuadros del mismo tamaño con los pies en la misma línea (anchor). refH = alto del cuerpo
   de referencia (cabeza a pies) para escalar igual que el resto del roster. Solo cambia el dibujo:
   habilidades, tiempos y VFX siguen siendo los del código. Recortado con tools/art/sheet_extract.py.
   ============================================================ */
function champPackLoadAtlas(key, src, meta){
  const img = new Image();
  const P = { atlas:img, fw:meta.w, fh:meta.h, cols:meta.cols, refH:meta.refH, anchor:meta.anchor, sets:meta.sets, ready:false };
  img.onload = ()=>{ P.ready = true; };
  img.onerror = ()=>{ P.failed = true; }; // solo entonces se usa el arte anterior como respaldo
  img.src = src;
  CHAMP_PACK[key] = P;
}
// El arte redibujado de este campeón todavía está bajando: no se dibuja NADA (antes se veía un
// instante el arte viejo descartado, ej. en el título mientras decía "Cargando…").
function champPackPending(key){ const P = CHAMP_PACK[key]; return !!(P && !P.ready && !P.failed); }
champPackLoadAtlas("segador", "assets/sprites/champions/segador/v2/atlas.png", {"w":91,"h":107,"cols":8,"refH":75,"anchor":0.9439,"sets":{"idle_down":[17,18,19,20],"idle_side":[29],"idle_left":[25],"idle_up":[33],"walk_down":[21,22,23,24],"walk_side":[29,30,31,32],"walk_left":[25,26,27,28],"walk_up":[33,34,35,36],"attack_side":[0,1,2,3],"cast_side":[4,5,6],"hit_down":[13,14,15,16],"death_down":[7,8,9,10,11,12]}});
champPackLoadAtlas("musashi", "assets/sprites/champions/musashi/v2/atlas.png", {"w":91,"h":91,"cols":8,"refH":84,"anchor":0.9451,"sets":{"idle_down":[17,18,19,20],"idle_side":[29],"idle_left":[25],"idle_up":[33],"walk_down":[21,22,23,24],"walk_side":[29,30,31,32],"walk_left":[25,26,27,28],"walk_up":[33,34,35,36],"attack_side":[0,1,2,3],"cast_side":[4,5,6],"hit_down":[13,14,15,16],"death_down":[7,8,9,10,11,12]}});
champPackLoadAtlas("profeta", "assets/sprites/champions/profeta/v2/atlas.png", {"w":93,"h":133,"cols":8,"refH":76,"anchor":0.9098,"sets":{"idle_down":[17,18,19,20],"idle_side":[29],"idle_left":[25],"idle_up":[33],"walk_down":[21,22,23,24],"walk_side":[29,30,31,32],"walk_left":[25,26,27,28],"walk_up":[33,34,35,36],"attack_side":[0,1,2,3],"cast_side":[4,5,6],"hit_down":[13,14,15,16],"death_down":[7,8,9,10,11,12]}});
champPackLoadAtlas("cazadora", "assets/sprites/champions/cazadora/v2/atlas.png", {"w":90,"h":94,"cols":8,"refH":79,"anchor":0.9362,"sets":{"idle_down":[17,18,19,20],"idle_side":[30],"idle_left":[26],"idle_up":[34],"walk_down":[22,23,24,25],"walk_side":[30,31,32,33],"walk_left":[26,27,28,29],"walk_up":[34,35,36,37],"attack_side":[0,1,2,3],"cast_side":[4,5,6],"hit_down":[13,14,15,16],"death_down":[7,8,9,10,11,12],"aim":[21]}});
champPackLoadAtlas("axiom", "assets/sprites/champions/axiom/v2/atlas.png", {"w":88,"h":99,"cols":8,"refH":76,"anchor":0.9394,"sets":{"idle_down":[17,18,19,20],"idle_side":[29],"idle_left":[25],"idle_up":[33],"walk_down":[21,22,23,24],"walk_side":[29,30,31,32],"walk_left":[25,26,27,28],"walk_up":[33,34,35,36],"attack_side":[0,1,2,3],"cast_side":[4,5,6],"hit_down":[13,14,15,16],"death_down":[7,8,9,10,11,12]}});
champPackLoadAtlas("nigromante", "assets/sprites/champions/nigromante/v2/atlas.png", {"w":161,"h":114,"cols":8,"refH":82,"anchor":0.9386,"sets":{"idle_down":[18,19,20,21],"idle_side":[31],"idle_left":[34],"idle_up":[37],"walk_down":[26,27,28,29,30],"walk_side":[31,32,33],"walk_left":[34,35,36],"walk_up":[37,38,41],"walk_up_left":[39,40],"attack_side":[0,1,2,3],"cast_side":[4,5,6,7],"hit_down":[14,15,16,17],"death_down":[8,9,10,11,12,13],"ult":[22,23,24,25]}});
champPackLoadAtlas("nigro_skel", "assets/sprites/champions/nigromante/skeleton/v2/atlas.png", {"w":63,"h":95,"cols":6,"refH":75,"anchor":0.9368,"sets":{"warrior_idle":[4],"warrior_walk":[4,5],"warrior_atk":[3],"mage_idle":[1],"mage_walk":[1,2],"mage_atk":[0]}});

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
NIGRO_SKEL_IMG.spawnMage.src = "assets/sprites/champions/nigromante/skeleton/spawnMage.png";const NIGRO_GOLEM_IMG = {};
const NIGRO_GOLEM_READY = {};
NIGRO_GOLEM_IMG.stone = new Image(); NIGRO_GOLEM_READY.stone=false; NIGRO_GOLEM_IMG.stone.onload=()=>{ NIGRO_GOLEM_READY.stone=true; };
NIGRO_GOLEM_IMG.stone.src = "assets/sprites/champions/nigromante/golem/stone.png";
NIGRO_GOLEM_IMG.stoneAtk = new Image(); NIGRO_GOLEM_READY.stoneAtk=false; NIGRO_GOLEM_IMG.stoneAtk.onload=()=>{ NIGRO_GOLEM_READY.stoneAtk=true; };
NIGRO_GOLEM_IMG.stoneAtk.src = "assets/sprites/champions/nigromante/golem/stoneAtk.png";
NIGRO_GOLEM_IMG.fire = new Image(); NIGRO_GOLEM_READY.fire=false; NIGRO_GOLEM_IMG.fire.onload=()=>{ NIGRO_GOLEM_READY.fire=true; };
NIGRO_GOLEM_IMG.fire.src = "assets/sprites/champions/nigromante/golem/fire.png";
NIGRO_GOLEM_IMG.ice = new Image(); NIGRO_GOLEM_READY.ice=false; NIGRO_GOLEM_IMG.ice.onload=()=>{ NIGRO_GOLEM_READY.ice=true; };
NIGRO_GOLEM_IMG.ice.src = "assets/sprites/champions/nigromante/golem/ice.png";

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
