"use strict";
/* ============================================================
   js/rendering/champion-sprites.js
   Cómo se DIBUJA el cuerpo de cada guardián con su arte real (atlas, direcciones,
   poses de habilidad, caída/muerte, invocaciones del Nigromante, lobo de Sylva).
   ============================================================ */

/* ============================================================
   MAGO — sprites reales provistos por el usuario (atlas PNG + JSON)
   Reemplaza SOLO el dibujo del Mago; estadísticas, hitbox, controles
   y habilidades siguen exactamente igual que antes.

   PRUEBA PILOTO de migración al motor ANIM ATLAS de arriba: magoAtlasFrame/drawMagoAtlas/
   drawMagoFallen conservan exactamente la misma firma de siempre (los siguen llamando
   drawHero, la previsualización de guardianes y el dibujo de cadáveres, sin cambios ahí),
   pero ahora delegan en el motor genérico en vez de tener su propia lógica de frames a
   mano. Se agrega además UN evento de ejemplo ("cast_release", en el clip "cast") que
   dispara una ráfaga de partículas en el momento exacto en que el Mago suelta el
   hechizo -puramente visual: el daño real de las habilidades lo sigue resolviendo
   castAbility con su propio timer, sin depender de esto para nada.
   ============================================================ */
const MAGO_ATLAS = {"image": "mago.png", "imageSize": [1254, 1254], "referenceHeight": 270, "anchor": "bottom-center", "frames": [{"x": 54, "y": 32, "w": 225, "h": 264, "pivotX": 111}, {"x": 362, "y": 33, "w": 223, "h": 263, "pivotX": 113}, {"x": 678, "y": 32, "w": 218, "h": 264, "pivotX": 107}, {"x": 987, "y": 32, "w": 220, "h": 264, "pivotX": 108}, {"x": 50, "y": 343, "w": 238, "h": 269, "pivotX": 115}, {"x": 364, "y": 347, "w": 227, "h": 265, "pivotX": 111}, {"x": 669, "y": 344, "w": 231, "h": 269, "pivotX": 116}, {"x": 982, "y": 346, "w": 232, "h": 266, "pivotX": 113}, {"x": 45, "y": 664, "w": 243, "h": 256, "pivotX": 120}, {"x": 358, "y": 621, "w": 228, "h": 299, "pivotX": 117}, {"x": 645, "y": 688, "w": 341, "h": 232, "pivotX": 120}, {"x": 996, "y": 665, "w": 213, "h": 255, "pivotX": 99}, {"x": 55, "y": 1009, "w": 221, "h": 209, "pivotX": 110}, {"x": 358, "y": 1038, "w": 213, "h": 183, "pivotX": 117}, {"x": 646, "y": 1042, "w": 245, "h": 179, "pivotX": 119}, {"x": 951, "y": 1110, "w": 276, "h": 111, "pivotX": 134}], "animations": {"idle": {"frames": [0, 1, 2, 3], "fps": 4, "loop": true}, "walk": {"frames": [4, 5, 6, 7], "fps": 8, "loop": true}, "cast": {"frames": [8, 9, 10, 11], "fps": 8, "loop": false}, "hurt": {"frames": [12], "fps": 6, "loop": false}, "death": {"frames": [12, 13, 14, 15], "fps": 6, "loop": false}}};
const MAGO_TARGET_HEIGHT = 70; // altura visible aproximada en unidades de mundo, a escala normal (drawScale=2.0)

// Definición + atlas del Mago en el formato nuevo, construida a partir de la misma tabla de
// frames/animaciones de siempre (MAGO_ATLAS) vía el adaptador -ni un número tocado a mano.
// El evento "cast_release" en el frame relativo 2 del clip "cast" (de 4 frames, a 8fps: cae
// justo antes de que termine la animación de lanzar) dispara una ráfaga de partículas; el
// daño real de la habilidad NO depende de esto, lo sigue resolviendo castAbility aparte.
const MAGO_ANIM_DEF = buildAnimDefFromLegacy(MAGO_ATLAS, MAGO_TARGET_HEIGHT, { cast: {2:"cast_release"} });
const MAGO_ANIM_ATLAS = wrapAnimImage(MAGO_IMG, ()=>MAGO_IMG_READY, MAGO_ANIM_DEF);

// Qué clip tocar según el estado actual del Mago (reposo/caminar/lanzar/daño) — esto sigue
// siendo decisión del propio guardián, el motor de animación no sabe nada de estas reglas.
function magoResolveClip(h){
  if(h.attackAnim>0) return "cast";
  if(h.hurtTimer>0) return "hurt";
  if(h.moving) return "walk";
  return "idle";
}
function magoCastReleaseFx(eventName, h){
  if(eventName!=="cast_release") return;
  const a = Math.random()*Math.PI*2;
  for(let i=0;i<6;i++){
    particles.push({x:h.x, y:h.y-40, vx:Math.cos(a+i)*70, vy:Math.sin(a+i)*70-30, life:280, color:h.cls.glow});
  }
}
// Dibuja al Mago usando el atlas real (vía el motor genérico de animación); misma firma que
// antes, así que drawHero/la previsualización de guardianes no necesitan cambiar nada.
function drawMagoAtlas(h, drawScale, alpha){
  return drawAnimAtlas(MAGO_ANIM_ATLAS, magoResolveClip(h), h, drawScale, alpha, (ev)=>magoCastReleaseFx(ev,h));
}
// Cuadro final de la animación de muerte (mago caído, ya boca abajo en el propio arte)
function drawMagoFallen(h, alpha){
  if(!MAGO_IMG_READY) return false;
  const clip = MAGO_ANIM_DEF.clips.death;
  drawAnimFrame(MAGO_ANIM_ATLAS, clip, clip.frames.length-1, h.x, h.y, 2.0, h.fx < -0.12, alpha);
  return true;
}

/* ============================================================
   SANADOR (soporte) — sprites reales provistos por el usuario (atlas propio,
   armado a partir de recortes limpiados de fondo). Reemplaza SOLO el dibujo
   del Sanador; estadísticas, hitbox, controles y habilidades no cambian.
   No se recibieron frames de muerte limpios: el Sanador caído sigue usando
   el sprite procedural existente (fallback ya presente en el motor).
   ============================================================ */
const SOPORTE_ATLAS = {"image": "soporte_atlas.png", "imageSize": [818, 122], "referenceHeight": 114, "anchor": "bottom-center", "frames": [{"x": 4, "y": 4, "w": 147, "h": 114, "pivotX": 74}, {"x": 155, "y": 4, "w": 175, "h": 114, "pivotX": 88}, {"x": 334, "y": 4, "w": 130, "h": 114, "pivotX": 65}, {"x": 468, "y": 12, "w": 111, "h": 106, "pivotX": 56}, {"x": 583, "y": 12, "w": 114, "h": 106, "pivotX": 57}, {"x": 701, "y": 12, "w": 113, "h": 106, "pivotX": 56}], "animations": {"idle": {"frames": [0], "fps": 1, "loop": true}, "walk": {"frames": [0, 1, 2], "fps": 7, "loop": true}, "cast": {"frames": [1, 0], "fps": 8, "loop": false}, "hurt": {"frames": [0], "fps": 6, "loop": false}}};
// (Consistencia visual V1: los cuadros 3-5 del atlas -lanzar- son otro dibujo -cara, bastón y
// halo blanco distintos-. Mientras no haya arte de lanzamiento en el mismo estilo, lanzar usa
// sus propios cuadros de reposo/caminata + el efecto de lanzamiento del juego. VISUAL_ART_REWORK.md)
const SOPORTE_TARGET_HEIGHT = 70; // mismo criterio de tamaño en pantalla que el Mago

// Migrado al motor genérico AnimAtlas (ver más arriba, junto al Mago) — mismo esquema,
// misma técnica de adaptador sin tocar las coordenadas de recorte.
const SOPORTE_ANIM_DEF = buildAnimDefFromLegacy(SOPORTE_ATLAS, SOPORTE_TARGET_HEIGHT);
const SOPORTE_ANIM_ATLAS = wrapAnimImage(SOPORTE_IMG, ()=>SOPORTE_IMG_READY, SOPORTE_ANIM_DEF);
function soporteResolveClip(h){
  if(h.attackAnim>0) return "cast";
  if(h.hurtTimer>0) return "hurt";
  if(h.moving) return "walk";
  return "idle";
}
// Dibuja al Sanador usando su atlas real, anclado por los pies
function drawSoporteAtlas(h, drawScale, alpha){
  return drawAnimAtlas(SOPORTE_ANIM_ATLAS, soporteResolveClip(h), h, drawScale, alpha);
}

/* ============================================================
   CABALLERO (tanque) y ASESINO (guerrero) — sprites reales del usuario,
   atlas de 4 direcciones (abajo/derecha/arriba + espejo izquierda) con transparencia
   real. Mismo criterio que Mago/Sanador: reemplaza SOLO el dibujo, nada de
   estadísticas/hitbox/controles/habilidades. Sin frames de daño ni muerte en el
   paquete -> esos dos estados siguen el fallback ya existente en el motor.
   ============================================================ */
const TANQUE_ATLAS = {"image": "caballerito.png", "imageSize": [1024, 1536], "referenceHeight": 200, "frames": [{"x": 32, "y": 43, "w": 168, "h": 202, "pivotX": 93, "pivotY": 202}, {"x": 300, "y": 42, "w": 160, "h": 203, "pivotX": 85, "pivotY": 203}, {"x": 561, "y": 42, "w": 157, "h": 203, "pivotX": 84, "pivotY": 203}, {"x": 819, "y": 43, "w": 165, "h": 202, "pivotX": 86, "pivotY": 202}, {"x": 46, "y": 280, "w": 151, "h": 215, "pivotX": 79, "pivotY": 215}, {"x": 301, "y": 280, "w": 153, "h": 216, "pivotX": 84, "pivotY": 216}, {"x": 561, "y": 280, "w": 154, "h": 213, "pivotX": 84, "pivotY": 213}, {"x": 818, "y": 280, "w": 151, "h": 216, "pivotX": 87, "pivotY": 216}, {"x": 44, "y": 527, "w": 182, "h": 211, "pivotX": 81, "pivotY": 211}, {"x": 302, "y": 527, "w": 180, "h": 211, "pivotX": 83, "pivotY": 211}, {"x": 563, "y": 527, "w": 178, "h": 211, "pivotX": 82, "pivotY": 211}, {"x": 822, "y": 527, "w": 173, "h": 211, "pivotX": 83, "pivotY": 211}, {"x": 32, "y": 787, "w": 178, "h": 202, "pivotX": 93, "pivotY": 202}, {"x": 296, "y": 755, "w": 170, "h": 234, "pivotX": 89, "pivotY": 234}, {"x": 551, "y": 786, "w": 217, "h": 203, "pivotX": 94, "pivotY": 203}, {"x": 801, "y": 786, "w": 183, "h": 203, "pivotX": 104, "pivotY": 203}, {"x": 40, "y": 1023, "w": 209, "h": 204, "pivotX": 85, "pivotY": 204}, {"x": 311, "y": 994, "w": 159, "h": 228, "pivotX": 74, "pivotY": 228}, {"x": 557, "y": 1023, "w": 244, "h": 204, "pivotX": 88, "pivotY": 204}, {"x": 811, "y": 1023, "w": 197, "h": 200, "pivotX": 94, "pivotY": 200}, {"x": 43, "y": 1269, "w": 175, "h": 205, "pivotX": 82, "pivotY": 205}, {"x": 303, "y": 1237, "w": 179, "h": 239, "pivotX": 82, "pivotY": 239}, {"x": 553, "y": 1251, "w": 212, "h": 224, "pivotX": 92, "pivotY": 224}, {"x": 815, "y": 1268, "w": 185, "h": 208, "pivotX": 90, "pivotY": 208}], "animations": {"idle_down": {"frames": [0], "fps": 1, "loop": true, "flip": false}, "walk_down": {"frames": [0, 1, 2, 3], "fps": 8, "loop": true, "flip": false}, "attack_down": {"frames": [12, 13, 14, 15], "fps": 10, "loop": false, "flip": false}, "idle_right": {"frames": [4], "fps": 1, "loop": true, "flip": false}, "walk_right": {"frames": [4, 5, 6, 7], "fps": 8, "loop": true, "flip": false}, "attack_right": {"frames": [16, 17, 18, 19], "fps": 10, "loop": false, "flip": false}, "idle_up": {"frames": [8], "fps": 1, "loop": true, "flip": false}, "walk_up": {"frames": [8, 9, 10, 11], "fps": 8, "loop": true, "flip": false}, "attack_up": {"frames": [20, 21, 22, 23], "fps": 10, "loop": false, "flip": false}, "idle_left": {"frames": [4], "fps": 1, "loop": true, "flip": true}, "walk_left": {"frames": [4, 5, 6, 7], "fps": 8, "loop": true, "flip": true}, "attack_left": {"frames": [16, 17, 18, 19], "fps": 10, "loop": false, "flip": true}}};

const GUERRERO_ATLAS = {"image": "asesino.png", "imageSize": [1024, 1536], "referenceHeight": 220, "frames": [{"x": 58, "y": 23, "w": 168, "h": 228, "pivotX": 87, "pivotY": 228}, {"x": 303, "y": 25, "w": 172, "h": 226, "pivotX": 92, "pivotY": 226}, {"x": 548, "y": 23, "w": 171, "h": 228, "pivotX": 87, "pivotY": 228}, {"x": 795, "y": 25, "w": 173, "h": 226, "pivotX": 90, "pivotY": 226}, {"x": 45, "y": 276, "w": 189, "h": 217, "pivotX": 100, "pivotY": 217}, {"x": 289, "y": 276, "w": 191, "h": 217, "pivotX": 106, "pivotY": 217}, {"x": 530, "y": 276, "w": 191, "h": 217, "pivotX": 105, "pivotY": 217}, {"x": 788, "y": 276, "w": 185, "h": 217, "pivotX": 97, "pivotY": 217}, {"x": 58, "y": 522, "w": 172, "h": 225, "pivotX": 87, "pivotY": 225}, {"x": 297, "y": 520, "w": 178, "h": 228, "pivotX": 98, "pivotY": 228}, {"x": 548, "y": 520, "w": 176, "h": 228, "pivotX": 87, "pivotY": 228}, {"x": 794, "y": 521, "w": 173, "h": 229, "pivotX": 91, "pivotY": 229}, {"x": 31, "y": 772, "w": 223, "h": 220, "pivotX": 114, "pivotY": 220}, {"x": 276, "y": 777, "w": 216, "h": 225, "pivotX": 119, "pivotY": 225}, {"x": 535, "y": 772, "w": 216, "h": 221, "pivotX": 100, "pivotY": 221}, {"x": 777, "y": 777, "w": 221, "h": 222, "pivotX": 108, "pivotY": 222}, {"x": 47, "y": 1024, "w": 191, "h": 219, "pivotX": 98, "pivotY": 219}, {"x": 299, "y": 1023, "w": 193, "h": 226, "pivotX": 96, "pivotY": 226}, {"x": 524, "y": 1024, "w": 244, "h": 222, "pivotX": 111, "pivotY": 222}, {"x": 793, "y": 1024, "w": 190, "h": 225, "pivotX": 92, "pivotY": 225}, {"x": 41, "y": 1265, "w": 200, "h": 226, "pivotX": 104, "pivotY": 226}, {"x": 285, "y": 1270, "w": 194, "h": 224, "pivotX": 110, "pivotY": 224}, {"x": 524, "y": 1270, "w": 241, "h": 226, "pivotX": 111, "pivotY": 226}, {"x": 786, "y": 1266, "w": 196, "h": 230, "pivotX": 99, "pivotY": 230}], "animations": {"idle_down": {"frames": [0], "fps": 1, "loop": true, "flip": false}, "walk_down": {"frames": [0, 1, 2, 3], "fps": 8, "loop": true, "flip": false}, "attack_down": {"frames": [12, 13, 14, 15], "fps": 10, "loop": false, "flip": false}, "idle_right": {"frames": [4], "fps": 1, "loop": true, "flip": false}, "walk_right": {"frames": [4, 5, 6, 7], "fps": 8, "loop": true, "flip": false}, "attack_right": {"frames": [16, 17, 18, 19], "fps": 10, "loop": false, "flip": false}, "idle_up": {"frames": [8], "fps": 1, "loop": true, "flip": false}, "walk_up": {"frames": [8, 9, 10, 11], "fps": 8, "loop": true, "flip": false}, "attack_up": {"frames": [20, 21, 22, 23], "fps": 10, "loop": false, "flip": false}, "idle_left": {"frames": [4], "fps": 1, "loop": true, "flip": true}, "walk_left": {"frames": [4, 5, 6, 7], "fps": 8, "loop": true, "flip": true}, "attack_left": {"frames": [16, 17, 18, 19], "fps": 10, "loop": false, "flip": true}}};

// Registro genérico de "atlas de 4 direcciones" por clase: agregar una clase nueva de este
// tipo es sumar una entrada acá, sin escribir funciones nuevas.
// Migrado al motor genérico AnimAtlas. Cada entrada de DIR_ATLASES conserva los mismos
// campos de siempre (atlas/img/ready/targetHeight, por si algo más los lee) más el
// animAtlas ya armado -mismo adaptador que Mago/Sanador, esta vez con clips con sufijo de
// dirección (walk_right, attack_down, etc.) y su propio "flip" por clip para la izquierda.
const DIR_ATLASES = {
  tanque:   { atlas: TANQUE_ATLAS,   img: TANQUE_IMG,   ready: () => TANQUE_IMG_READY,   targetHeight: 66,
              animAtlas: wrapAnimImage(TANQUE_IMG, ()=>TANQUE_IMG_READY, buildAnimDefFromLegacy(TANQUE_ATLAS, 66)) },
  guerrero: { atlas: GUERRERO_ATLAS, img: GUERRERO_IMG, ready: () => GUERRERO_IMG_READY, targetHeight: 66,
              animAtlas: wrapAnimImage(GUERRERO_IMG, ()=>GUERRERO_IMG_READY, buildAnimDefFromLegacy(GUERRERO_ATLAS, 66)) }
};
// Resuelve la dirección visual (abajo/derecha/izquierda/arriba) a partir del vector de mirada
function dirAtlasDirection(h){
  if(Math.abs(h.fy) > Math.abs(h.fx)) return h.fy < 0 ? "up" : "down";
  return h.fx < 0 ? "left" : "right";
}
// Elige qué clip tocar según el estado actual del héroe. El paquete no trae frames de daño
// ni de muerte (aclarado en su propio LEEME): en esos casos se usa reposo/caminar, tal como
// indica la instrucción del paquete ("no reinterpretar el diseño").
function dirAtlasResolveClip(animAtlas, h){
  const dir = dirAtlasDirection(h);
  let state = "idle";
  if(h.attackAnim>0) state = "attack";
  else if(h.moving) state = "walk";
  const name = state+"_"+dir;
  return animAtlas.def.clips[name] ? name : "idle_"+dir;
}

/* ============================================================
   LA PROFETA — sanadora de apoyo cuerpo a cuerpo, sprites reales provistos por el
   usuario (arte recortado a mano por el propio paquete: "sprites_recortados"). Reemplaza
   SOLO el dibujo (mismo criterio que Mago/Sanador/Tanque/Asesino): estadísticas, hitbox,
   controles y habilidades se definen aparte en CLASSES.profeta / castAbility.

   El paquete original trae hojas de referencia/concepto (vistas de frente-espalda-lado,
   ilustraciones grandes por habilidad, progresión visual, detalle de arma, expresiones)
   que NO son sprites de juego recortables cuadro a cuadro -son arte de presentación, cada
   una con su propio texto de título horneado encima-. Lo único directamente utilizable como
   ciclo de animación real son las 5 hojas de acción (idle/caminando/corriendo/ataque
   básico "Danza del Ocho"/giro de carga completa) y los 4 íconos cuadrados de habilidad:
   de ahí sale este atlas. El resto (ilustraciones grandes, hoja de progresión, detalle del
   arma, expresiones en pixel) se usó como referencia de color/diseño para las partículas
   procedurales de sus habilidades -mismo criterio que ya usa el resto del roster (Mago,
   Tanque, etc.), que tampoco tiene sprites propios por habilidad-, no como recorte directo.
   Fondo oscuro del paquete removido por flood-fill (no era un solo color plano) + textos de
   título de cada hoja recortados, ambos pasos automáticos, cero retoque a mano de la ropa.
   ============================================================ */
// Limpieza (sprint de integración visual): sin fragmentos de guadaña del frame vecino ni
// líneas de grilla, y la caminata (1-3) reescalada 15% -venía dibujada más chica que el idle-.
const PROFETA_ATLAS_FRAMES = [
  {"x":0,"y":8,"w":52,"h":76},
  {"x":158,"y":13,"w":43,"h":71},
  {"x":316,"y":13,"w":49,"h":71},
  {"x":474,"y":17,"w":86,"h":67},
  {"x":632,"y":23,"w":64,"h":61},
  {"x":0,"y":104,"w":59,"h":64},
  {"x":158,"y":104,"w":69,"h":64},
  {"x":316,"y":104,"w":52,"h":64},
  {"x":474,"y":99,"w":85,"h":69},
  {"x":632,"y":84,"w":158,"h":84}
];
const PROFETA_ATLAS = {
  image: "profeta_atlas.png", referenceHeight: 84,
  frames: PROFETA_ATLAS_FRAMES,
  animations: {
    idle:   { frames:[0],       fps:4,  loop:true  },
    walk:   { frames:[1,3,2],   fps:6,  loop:true  },
    attack: { frames:[4,5,6,7], fps:12, loop:false },
    spin:   { frames:[8,9],     fps:7,  loop:false }
  }
};
const PROFETA_TARGET_HEIGHT = 68; // altura visible aprox. a escala normal (drawScale=2.0), mismo criterio que MAGO_TARGET_HEIGHT
const PROFETA_ANIM_DEF = buildAnimDefFromLegacy(PROFETA_ATLAS, PROFETA_TARGET_HEIGHT, {});
const PROFETA_ANIM_ATLAS = wrapAnimImage(PROFETA_IMG, ()=>PROFETA_IMG_READY, PROFETA_ANIM_DEF);
// Elige el clip según el estado actual: el "giro del Presagio" (combo del básico, ver
// triggerBasic) y el giro de la Danza del Augurio comparten el mismo clip visual "spin".
function profetaResolveClip(h){
  if(h.profetaSpinFxTimer>0) return "spin";
  if(h.attackAnim>0) return "attack";
  if(h.moving) return "walk";
  return "idle";
}
function drawProfetaAtlas(h, drawScale, alpha){
  if(drawChampPack("profeta", h, drawScale, alpha)) return true;
  return drawAnimAtlas(PROFETA_ANIM_ATLAS, profetaResolveClip(h), h, drawScale, alpha);
}

function drawDirAtlasHero(entry, h, drawScale, alpha){
  return drawAnimAtlas(entry.animAtlas, dirAtlasResolveClip(entry.animAtlas, h), h, drawScale, alpha);
}
// Overlays de las 3 habilidades reales del Caballero (Torbellino/Estampida/Grito de Guerra):
// reemplazan momentáneamente el sprite de dirección mientras esas habilidades están activas.
// Solo dibuja; no toca daño, duración ni ninguna otra regla de combate.
function drawKnightAbilityFx(h, drawScale, alpha){
  if(typeof CaballeritoHabilidades==="undefined" || h.classKey!=="tanque") return false;
  const size = 120 * (drawScale/2.0);
  ctx.save();
  ctx.globalAlpha = alpha!==undefined ? alpha : 1;
  ctx.imageSmoothingEnabled = false;
  let drew = true;
  if(h.dashFxTimer>0){
    const age = (1050 - h.dashFxTimer)/1000;
    CaballeritoHabilidades.drawDash(ctx, age, h.x, h.y, size, h.dashFxFlip);
  } else if(h.spinTimer>0){
    const age = Math.max(0, (h.spinMaxTimer - h.spinTimer))/1000;
    CaballeritoHabilidades.draw(ctx, "torbellino", "activo", age, h.x, h.y, size);
  } else if(h.growTimer>0 && h.growMaxTimer>0){
    const age = Math.max(0, (h.growMaxTimer - h.growTimer))/1000;
    CaballeritoHabilidades.draw(ctx, "grito", "activo", age, h.x, h.y, size);
  } else {
    drew = false;
  }
  ctx.restore();
  return drew;
}
// Dirección de la pose (abajo / perfil / arriba) con histéresis, para que no parpadee en diagonal.
function champPackDir(h){
  const fx = h.fx||0, fy = (h.fy===undefined ? 1 : h.fy), ax = Math.abs(fx), ay = Math.abs(fy);
  let dir = h._pdir || "down";
  if(dir==="side"){ if(ay > ax*1.3) dir = fy < 0 ? "up" : "down"; }
  else if(ax > ay*1.3) dir = "side";
  else dir = fy < -0.15 ? "up" : "down";
  h._pdir = dir;
  if(fx < -0.12) h._pleft = true; else if(fx > 0.12) h._pleft = false;
  return dir;
}
function champPackScale(P, h, drawScale){
  return h.radius*2.7*(drawScale/(h.scale||2.0))/(P.refH || P.sets.idle_down[0].height);
}
// Set para estado+dirección. Los sets ya vienen completos desde champPackNormalize (izquierda propia
// o perfil espejado, estados clonados); acá solo se elige la vista y, si falta, la más parecida:
// arriba -> (fix.up) -> perfil -> frente; frente -> perfil. Frente/espalda dibujados de 3/4 hacia la
// derecha traen su variante "_l" (espejada) para cuando mira a la izquierda.
function champPackSet(P, st, dir, h){
  const left = !!(h && h._pleft);
  if(P.sets[st] && !P.sets[st+"_down"] && !P.sets[st+"_side"]) return {arr:P.sets[st], flip:left};
  if(dir==="up" && left && P.sets[st+"_up_left"]) return {arr:P.sets[st+"_up_left"], flip:false};
  const horiz = left ? "left" : "side";
  const order = dir==="side" ? [horiz, "down", "up"]
              : dir==="up" ? (P.upFrom==="down" ? ["up", "down", horiz] : ["up", horiz, "down"])
              : ["down", horiz, "up"];
  for(const d of order){
    const arr = (left && P.sets[st+"_"+d+"_l"]) || P.sets[st+"_"+d];
    if(arr) return {arr, flip:false};
  }
  return null;
}
// Un cuadro del pack: en modo atlas `v` es el índice de la grilla (negativo = ~v espejado) y se ancla
// en su punto de apoyo (champPackFeet); en el modo viejo (Axiom), una imagen.
function champPackDrawFrame(P, v, x, y, s, flip, alpha){
  if(P.atlas){
    if(v < 0){ v = ~v; flip = !flip; }
    if(!P.footX && P.ready) champPackFeet(P);
    const ax = (P.footX && P.footX[v]) || 0.5;
    const clip = {frames:[{x:(v % P.cols)*P.fw, y:Math.floor(v/P.cols)*P.fh, w:P.fw, h:P.fh}]};
    drawAnimFrameSized(P.atlas, clip, 0, x, y, P.fw*s, P.fh*s, ax, P.anchor, flip, alpha);
  } else {
    drawAnimFrameSized(v, {frames:[{x:0, y:0, w:v.width, h:v.height}]}, 0, x, y, v.width*s, v.height*s, 0.5, 0.94, flip, alpha);
  }
}
// ¿El ataque en curso es un lanzamiento? abilities.js marca _packCastUntil con el reloj del ANFITRIÓN
// (en red los invitados reciben ese número, que en su reloj no significa nada): se usa solo como aviso
// de "hubo un lanzamiento nuevo" y cada cliente arma su propio vencimiento con el attackAnim que queda.
function champPackCasting(h){
  const u = h._packCastUntil || 0;
  if(u === Infinity) return true; // previews del Códice
  if(u !== h._pcuSeen){ h._pcuSeen = u; h._pcuLocal = u ? animNow + Math.max(0, h.attackAnim||0) : 0; }
  return animNow < (h._pcuLocal||0);
}
function drawChampPack(key, h, drawScale, alpha){
  const base = h._codexPack || key; // preview del Códice: otro atlas del mismo guardián (a caballo, El Portador)
  const P = CHAMP_PACK[typeof setSkinPackKey==="function" ? setSkinPackKey(h, base) : base]; // skin de set completo

  if(!P || !P.ready) return false;
  // preview del Códice: una animación con nombre del atlas (disparo, gancho, orden de mando...), en loop
  if(h._codexSet && P.sets[h._codexSet]){
    const arr = P.sets[h._codexSet], n = Math.floor((h._codexT||0)/(h._codexFps||140)) % arr.length;
    champPackDrawFrame(P, arr[n], h.x, h.y, champPackScale(P, h, drawScale), false, alpha);
    return true;
  }
  const dir = champPackDir(h);
  // detecta el comienzo de cada ataque/cast para conocer su duración real (varía con la velocidad de ataque)
  const a = h.attackAnim||0;
  if(a > (h._aPrev||0)+1) h._aDur = a;
  h._aPrev = a;
  let st, prog = null;
  if(h.hurtTimer>0){ st = "hit"; prog = 1 - h.hurtTimer/160; }
  else if(a>0){ st = champPackCasting(h) ? "cast" : "attack"; prog = 1 - a/(h._aDur||a); }
  else if(h.sylvaCharging && P.sets.aim) st = "aim";
  else st = h.moving ? "walk" : "idle";
  const pick = champPackSet(P, st, dir, h) || (st==="cast" && champPackSet(P, "attack", dir, h)) || champPackSet(P, "idle", dir, h);
  const arr = pick.arr;
  let n;
  if(prog!==null) n = Math.min(arr.length-1, Math.max(0, Math.floor(prog*arr.length)));
  else if(st==="walk") n = Math.floor((h.animT||0)/130) % arr.length;
  else n = Math.floor(animNow/230) % arr.length;
  champPackDrawFrame(P, arr[n], h.x, h.y, champPackScale(P, h, drawScale), pick.flip, alpha);
  return true;
}
// Muerte con los frames reales (en vez del sprite de pie rotado): queda tendido semitransparente.
function drawChampPackDeath(h){
  const P = CHAMP_PACK[typeof setSkinPackKey==="function" ? setSkinPackKey(h, h.classKey) : h.classKey];
  if(!P || !P.ready) return false;
  if(!h._deadAt){ h._deadAt = animNow; vfxBurst(h.x, h.y-20, 12, "blood", 120, 420, 3, 2, -30, 0); }
  const pick = champPackSet(P, "death", h._pdir || "down", h);
  if(!pick) return false;
  const arr = pick.arr, t = animNow - h._deadAt, n = Math.min(arr.length-1, Math.floor(t/170));
  const done = t > arr.length*170;
  champPackDrawFrame(P, arr[n], h.x, h.y, champPackScale(P, h, h.scale||2.0), pick.flip, done ? 0.55 : 1);
  return true;
}

// Sprite real de un solo frame por dirección (abajo/derecha/arriba, espejado para
// izquierda) sin ciclo de caminata -Segador y Axiom (ver más abajo) tenían cada uno su
// propia copia idéntica de esta función; ahora es una sola, parametrizada por sus imágenes.
function draw3DirRealSprite(imgs, ready, h, drawScale, alpha){
  if(!ready.down || !ready.right || !ready.up) return false;
  const fx = h.fx||0, fy = h.fy||1;
  let img, flip = false;
  if(Math.abs(fy) >= Math.abs(fx)){
    img = fy < -0.15 ? imgs.up : imgs.down;
  } else {
    img = imgs.right;
    flip = fx < 0;
  }
  const targetH = h.radius*2.7*(drawScale/(h.scale||2.0));
  const s = targetH/img.height;
  const clip = { frames: [{x:0, y:0, w:img.width, h:img.height}] };
  drawAnimFrameSized(img, clip, 0, h.x, h.y, img.width*s, img.height*s, 0.5, 0.94, flip, alpha);
  return true;
}
function drawSegadorReal(h, drawScale, alpha){
  return drawChampPack("segador", h, drawScale, alpha) || draw3DirRealSprite(SEGADOR_REAL_IMG, SEGADOR_REAL_READY, h, drawScale, alpha);
}

// Selecciona y dibuja la pose real de Musashi según su estado (ancla abajo-centro, igual que
// el resto de sprites reales del roster vía drawAnimFrameSized). Si por lo que sea la imagen
// base (idle) no cargó todavía, devuelve false y drawHero() cae al sprite procedural de
// respaldo (GRIDS.musashi/PAL.musashi) en vez de dejar al personaje invisible.
function drawMusashiReal(h, drawScale, alpha){
  if(drawChampPack("musashi", h, drawScale, alpha)) return true;
  if(!MUSASHI_REAL_READY.idle) return false;
  let img;
  if(h.hurtTimer>0 && MUSASHI_REAL_READY.hurt){
    img = MUSASHI_REAL_IMG.hurt;
  } else if(h.attackAnim>0 && h.musashiCastKind==="ronin" && MUSASHI_REAL_READY.ronin1){
    // Corte del Rōnin: windup -> tajo -> recuperación (las 3 poses ya traen la silueta de
    // Musashi adentro del frame, igual que castSkeleton/castGolem del Nigromante: reemplazan
    // el cuerpo normal mientras dura, no se superponen).
    const seq = ["ronin1","ronin2","ronin3"];
    const progress = Math.max(0, Math.min(0.999, 1 - h.attackAnim/(h.musashiCastDur||260)));
    img = MUSASHI_REAL_IMG[seq[Math.floor(progress*seq.length)]];
  } else if(h.attackAnim>0 && h.musashiCastKind==="thousand" && MUSASHI_REAL_READY.thousand1){
    // Mil Cortes: las 4 poses ya traen el remolino de cortes alrededor de Musashi.
    const seq = ["thousand1","thousand2","thousand3","thousand4"];
    const progress = Math.max(0, Math.min(0.999, 1 - h.attackAnim/(h.musashiCastDur||400)));
    img = MUSASHI_REAL_IMG[seq[Math.floor(progress*seq.length)]];
  } else if(h.attackAnim>0 && MUSASHI_REAL_READY.basic1){
    // (basic1-3 vienen cortados por el borde del recorte -medio cuerpo-: el tajo usa los dos
    // cuadros completos. Ver VISUAL_ART_REWORK.md)
    const seq = ["basic4","basic5"];
    const progress = Math.max(0, Math.min(0.999, 1 - h.attackAnim/190));
    const n = Math.floor(progress*seq.length);
    const key = seq[n] || seq[seq.length-1];
    img = MUSASHI_REAL_READY[key] ? MUSASHI_REAL_IMG[key] : MUSASHI_REAL_IMG.idle;
  } else if(h.moving && MUSASHI_REAL_READY.run1 && MUSASHI_REAL_READY.run2){
    img = (Math.floor((h.animT||0)/140)%2===0) ? MUSASHI_REAL_IMG.run1 : MUSASHI_REAL_IMG.run2;
  } else {
    img = MUSASHI_REAL_IMG.idle;
  }
  const flip = (h.fx||0) < -0.12;
  const targetH = h.radius*2.7*(drawScale/(h.scale||2.0));
  const s = targetH/img.height;
  const clip = { frames: [{x:0, y:0, w:img.width, h:img.height}] };
  drawAnimFrameSized(img, clip, 0, h.x, h.y, img.width*s, img.height*s, 0.5, 0.94, flip, alpha);
  return true;
}
// Estelas de Paso Fantasma (musashiAfterimages, ver musashiSpawnAfterimage): quedaban
// acumulándose en la lista pero nunca se dibujaban -bug real, la habilidad no mostraba nada
// distinto al cruzar al enemigo-. Arte real (ghost1, silueta borrosa) con fundido de salida.
function drawMusashiAfterimages(){
  const P = CHAMP_PACK.musashi;
  if(P && P.ready){
    // la estela usa el atlas de la skin de set del Musashi que la dejó (antes: siempre el Musashi base)
    const owner = typeof heroes!=="undefined" && heroes ? heroes.find(h=>h.classKey==="musashi") : null;
    const SK = owner && typeof setSkinPackKey==="function" ? CHAMP_PACK[setSkinPackKey(owner, "musashi")] : null;
    const Q = SK && SK.ready && SK.sets.walk_side ? SK : P;
    const s = 78/Q.refH;
    for(const a of musashiAfterimages){
      const alpha = Math.max(0, a.life/a.maxLife) * 0.45;
      if(alpha<=0.02) continue;
      champPackDrawFrame(Q, Q.sets.walk_side[1] !== undefined ? Q.sets.walk_side[1] : Q.sets.walk_side[0], a.x, a.y, s, a.fx<-0.12, alpha);
    }
    return;
  }
  if(!MUSASHI_REAL_READY.ghost1) return;
  const img = MUSASHI_REAL_IMG.ghost1;
  const s = 78/img.height; // mismo orden de tamaño que el cuerpo real de Musashi
  const clip = { frames: [{x:0, y:0, w:img.width, h:img.height}] };
  for(const a of musashiAfterimages){
    const alpha = Math.max(0, a.life/a.maxLife) * 0.55;
    if(alpha<=0.02) continue;
    drawAnimFrameSized(img, clip, 0, a.x, a.y, img.width*s, img.height*s, 0.5, 0.94, a.fx<-0.12, alpha);
  }
}


// Nigromante — cuerpo principal: mismo patron drawXReal que Musashi/Sylva (una imagen estatica
// por pose), con estados extra para las 3 animaciones de invocacion/plaga (h.nigroCastKind, se
// fija en cada case del switch de castAbility junto al attackAnim generico) y la secuencia de
// transformacion de la ultimate (h.nigroTransformTimer, ver enterAbyssForm).
function drawNigromanteReal(h, drawScale, alpha){
  const P = CHAMP_PACK.nigromante;
  if(P && P.ready){
    // Encarnación del Abismo: la pose "especial/ultimate" de la hoja mientras dura la transformación
    if(h.nigroTransformTimer>0 && P.sets.ult){
      const arr = P.sets.ult, prog = Math.max(0, Math.min(0.999, 1-h.nigroTransformTimer/NIGRO_TRANSFORM_MS));
      champPackDrawFrame(P, arr[Math.floor(prog*arr.length)], h.x, h.y, champPackScale(P, h, drawScale), (h.fx||0) < -0.12, alpha);
      return true;
    }
    return drawChampPack("nigromante", h, drawScale, alpha);
  }
  if(!NIGRO_READY.idle) return false;
  let img, clipW = 0;
  if(h.nigroTransformTimer>0 && NIGRO_READY.ultTransform1){
    const seq = ["ultTransform1","ultTransform2","ultTransform3","ultTransform4"];
    const progress = Math.max(0, Math.min(0.999, 1-h.nigroTransformTimer/NIGRO_TRANSFORM_MS));
    const key = seq[Math.floor(progress*seq.length)] || seq[seq.length-1];
    img = NIGRO_READY[key] ? NIGRO_IMG[key] : NIGRO_IMG.idle;
  } else if(h.hurtTimer>0 && NIGRO_READY.hurt){
    img = NIGRO_IMG.hurt;
  } else if(h.attackAnim>0 && h.nigroCastKind==="skeleton" && NIGRO_READY.castSkeleton1){
    const seq = ["castSkeleton1","castSkeleton2","castSkeleton3"];
    const progress = Math.max(0, Math.min(0.999, 1-h.attackAnim/320));
    img = NIGRO_IMG[seq[Math.floor(progress*seq.length)]];
  } else if(h.attackAnim>0 && h.nigroCastKind==="golem" && NIGRO_READY.castGolem1){
    const seq = ["castGolem1","castGolem2"];
    const progress = Math.max(0, Math.min(0.999, 1-h.attackAnim/320));
    img = NIGRO_IMG[seq[Math.floor(progress*seq.length)]];
  } else if(h.attackAnim>0 && h.nigroCastKind==="plague" && NIGRO_READY.castPlague1){
    const seq = ["castPlague1","castPlague2"];
    const progress = Math.max(0, Math.min(0.999, 1-h.attackAnim/320));
    img = NIGRO_IMG[seq[Math.floor(progress*seq.length)]];
  } else if(h.attackAnim>0 && NIGRO_READY.basic5){
    // (basic1-4 vienen cortados por el borde izquierdo y basic1 trae una línea de la grilla:
    // el ataque usa el único cuadro completo, basic5, recortado al cuerpo -sin el proyectil
    // pintado, que el juego ya dibuja aparte-. Ver VISUAL_ART_REWORK.md)
    img = NIGRO_IMG.basic5; clipW = 99;
  } else if(h.moving && NIGRO_READY.walkA6){
    // Ciclo de caminata real de 6 frames (antes solo 2, walk1/walk2) -mismo zip, sin usar-.
    const seq = ["walkA1","walkA2","walkA3","walkA4","walkA5","walkA6"];
    img = NIGRO_IMG[seq[Math.floor((h.animT||0)/120)%seq.length]];
  } else if(h.moving && NIGRO_READY.walk1 && NIGRO_READY.walk2){
    img = (Math.floor((h.animT||0)/140)%2===0) ? NIGRO_IMG.walk1 : NIGRO_IMG.walk2;
  } else if(NIGRO_READY.idleA5){
    // Ciclo de idle real de 5 frames (antes un solo frame quieto) -mismo zip, sin usar-.
    // (idleA2-A5 traen pedazos del frame vecino -otro Nigromante y bastones sueltos-: el ciclo
    // queda con los dos frames limpios, misma pose y mismo bastón)
    const seq = ["idle","idleA1"];
    img = NIGRO_IMG[seq[Math.floor((h.animT||0)/420)%seq.length]];
  } else {
    img = NIGRO_IMG.idle;
  }
  const flip = (h.fx||0) < -0.12;
  const targetH = h.radius*2.7*(drawScale/(h.scale||2.0));
  const s = targetH/img.height, w = clipW || img.width;
  const clip = { frames: [{x:0, y:0, w, h:img.height}] };
  drawAnimFrameSized(img, clip, 0, h.x, h.y, w*s, img.height*s, 0.5, 0.94, flip, alpha);
  return true;
}
// Nigromante transformado — "Demonio Nigromántico" (Encarnación del Abismo). Reemplaza el
// dibujo normal mientras h.nigroDemonForm esté activo (ver enterAbyssForm/exitAbyssForm).
function drawNigromanteDemon(h, drawScale, alpha){
  if(!NIGRO_DEMON_READY.idle) return false;
  let img;
  if(h.attackAnim>0 && h.nigroCastKind==="demonSlam" && NIGRO_DEMON_READY.slam){
    // (el recorte "slam" trae el cartel de texto de la hoja y otro demonio al lado)
    img = NIGRO_DEMON_IMG.attack1;
  } else if(h.attackAnim>0 && h.nigroCastKind==="demonSoulFire" && NIGRO_DEMON_READY.soulFireCast){
    img = NIGRO_DEMON_IMG.soulFireCast;
  } else if(h.attackAnim>0 && NIGRO_DEMON_READY.attack1){
    img = (Math.floor((h.animT||0)/90)%2===0) ? NIGRO_DEMON_IMG.attack1 : NIGRO_DEMON_IMG.attack2;
  } else {
    img = NIGRO_DEMON_IMG.idle;
  }
  const flip = (h.fx||0) < -0.12;
  const targetH = h.radius*2.9*(drawScale/(h.scale||2.0));
  const s = targetH/img.height;
  const clip = { frames: [{x:0, y:0, w:img.width, h:img.height}] };
  const el = typeof nigromanteGolemSkin==="function" ? nigromanteGolemSkin(h) : "stone"; // la forma demoníaca toma el elemento del gólem
  nigroDrawElementAura(h.x, h.y, el, targetH*0.42, animNow/1000);
  drawAnimFrameSized(img, clip, 0, h.x, h.y, img.width*s, img.height*s, 0.5, 0.94, flip, alpha);
  nigroDrawElementDetail(h.x, h.y, el, targetH, animNow/1000);
  return true;
}
// Pose real de muerte (cuerpo tendido) de Musashi y del Nigromante: arte que ya venía embebido
// pero nunca se mostraba (caían con el sprite de pie rotado). El recorte se limita al área útil
// del PNG, fuera quedan restos del corte original (una línea y un fragmento suelto).
const FALLEN_REAL = {
  musashi:    { img:()=>MUSASHI_REAL_READY.death && MUSASHI_REAL_IMG.death, clip:{ frames:[{x:26, y:56, w:114, h:38}] } },
  nigromante: { img:()=>NIGRO_READY.death && NIGRO_IMG.death, clip:{ frames:[{x:8, y:80, w:122, h:43}] } },
};
function drawRealFallen(h, alpha){
  const d = FALLEN_REAL[h.classKey]; if(!d) return false;
  const img = d.img(); if(!img) return false;
  const f = d.clip.frames[0];
  const w = h.radius*2.7, hh = w*f.h/f.w;
  drawAnimFrameSized(img, d.clip, 0, h.x, h.y, w, hh, 0.5, 0.85, (h.fx||0) < -0.12, alpha);
  return true;
}
// Guardián caído (propio o, en la Arena Divina, rival): reacción al golpe, caída de costado y
// queda tendido semitransparente, o la pose real de muerte cuando existe arte para eso.
function drawFallenHero(h){
  const skinPack = typeof setSkinPackKey==="function" && setSkinPackKey(h, h.classKey) !== h.classKey;
  if((CHAMP_PACK[h.classKey] || skinPack) && drawChampPackDeath(h)) return; // muerte con sus frames reales (o los de su skin de set)
  if(h.classKey==="mago" && drawMagoFallen(h, 0.5)) return; // el propio arte ya lo muestra boca abajo
  // DEATH del guardián con su propio sprite real: reacción al golpe, caída de costado y
  // queda tendido semitransparente (antes: siempre el sprite procedural, fuera cual fuera el arte).
  if(!h._deadAt){ h._deadAt = animNow; vfxBurst(h.x, h.y-20, 12, "blood", 120, 420, 3, 2, -30, 0); }
  const dp = Math.min(1, (animNow-h._deadAt)/620);
  const side = (h.fx||0) < -0.12 ? -1 : 1;
  const fall = _ease(Math.max(0, (dp-0.15)/0.85));
  // con pose real de muerte: el cuerpo que cae se funde con el arte tendido y queda ese
  const realFallen = !!(FALLEN_REAL[h.classKey] && FALLEN_REAL[h.classKey].img());
  if(realFallen && dp>=1){ drawRealFallen(h, 0.55); return; }
  ctx.save();
  ctx.translate(h.x - side*6*Math.sin(Math.min(1,dp/0.15)*Math.PI), h.y);
  ctx.rotate(-side*Math.PI/2*fall);
  ctx.translate(-h.x, -h.y);
  const m = ANIM_ALPHA_MUL;
  ANIM_ALPHA_MUL = realFallen ? 1-fall : 1-0.5*fall; ctx.globalAlpha = ANIM_ALPHA_MUL;
  drawHeroBody(h, h.scale, false, false);
  ANIM_ALPHA_MUL = m;
  ctx.restore();
  if(realFallen && fall>0) drawRealFallen(h, 0.55*fall);
}
// Esqueletos invocados (Levantar Esqueletos): entidades livianas propias (no son "heroes"),
// mismo criterio que el Lobo Espectral de Sylva -objeto simple con x/y/hp/IA, dibujado y
// actualizado aparte del pipeline de heroes/enemigos-.
function drawSkeletonMinion(sk){
  const isMage = sk.type==="mage";
  const SP = CHAMP_PACK.nigro_skel;
  if(SP && SP.ready){
    if(sk._ph===undefined) sk._ph = (++_nigroPhaseSeq*317) % 1000;
    const pre = isMage ? "mage_" : "warrior_";
    const arr = sk.attackAnim>0 ? SP.sets[pre+"atk"] : sk.moving ? SP.sets[pre+"walk"] : SP.sets[pre+"idle"];
    // cada esqueleto con su propio paso (antes marchaban todos al mismo compás)
    const v = arr[Math.floor((animNow + sk._ph)/180) % arr.length];
    const targetH = 46*(sk.scale||1), s = targetH/SP.refH;
    const rise = Math.min(1, (sk.age||0)/NIGRO_SKEL_RISE_MS);
    drawShadow(sk.x, sk.y, 16*(0.4 + 0.6*rise));
    nigroSummonMark(sk.x, sk.y, 15);
    sk._animKey = "nigro_skel";
    const Pk = animPose(sk, animProfileOf(sk), false);
    ctx.save();
    if(rise < 1){
      // sale de la tierra: se ve de los pies para arriba a medida que sube
      ctx.beginPath(); ctx.rect(sk.x - 50, sk.y - targetH*1.3, 100, targetH*1.3 + 6); ctx.clip();
      ctx.translate(0, targetH*(1 - _ease(rise)));
    }
    animApply(sk.x, sk.y, Pk);
    champPackDrawFrame(SP, v, sk.x, sk.y, s, (sk.fx||0) < -0.12, sk.hitFlash>0?0.6:1);
    ctx.restore();
    if(sk.hp<sk.maxHp){
      ctx.fillStyle="rgba(0,0,0,0.5)"; ctx.fillRect(sk.x-16,sk.y-targetH-10,32,4);
      ctx.fillStyle="#7ad48a"; ctx.fillRect(sk.x-16,sk.y-targetH-10,32*Math.max(0,sk.hp/sk.maxHp),4);
    }
    return;
  }
  if(!NIGRO_SKEL_READY.warrior) return;
  let img;
  // (el recorte "mageAtk" mezcla pedazos de dos frames: atacando, el mago usa su pose normal
  // y el ataque se lee por el proyectil)
  if(sk.attackAnim>0){ img = isMage ? NIGRO_SKEL_IMG.mage : NIGRO_SKEL_IMG.warriorAtk; }
  else if(!isMage && sk.moving && NIGRO_SKEL_READY.walk1){
    // Pose real de caminata del esqueleto guerrero (el balanceo lo pone AnimFX). El recorte
    // "walk2" era medio esqueleto cortado por la grilla y no se usa.
    img = NIGRO_SKEL_IMG.walk1;
  }
  else { img = isMage ? NIGRO_SKEL_IMG.mage : NIGRO_SKEL_IMG.warrior; }
  const flip = (sk.fx||0) < -0.12;
  const targetH = 46*(sk.scale||1); // (Réquiem del Sepulturero: el Esqueleto Élite es más grande)
  const s = targetH/img.height;
  const clip = { frames: [{x:0,y:0,w:img.width,h:img.height}] };
  drawShadow(sk.x, sk.y, 16);
  sk._animKey = "nigro_skel";
  const Pk = animPose(sk, animProfileOf(sk), false);
  ctx.save(); animApply(sk.x, sk.y, Pk);
  drawAnimFrameSized(img, clip, 0, sk.x, sk.y, img.width*s, img.height*s, 0.5, 0.92, flip, sk.hitFlash>0?0.6:1);
  ctx.restore();
  if(sk.hp<sk.maxHp){
    ctx.fillStyle="rgba(0,0,0,0.5)"; ctx.fillRect(sk.x-16,sk.y-targetH-10,32,4);
    ctx.fillStyle="#7ad48a"; ctx.fillRect(sk.x-16,sk.y-targetH-10,32*Math.max(0,sk.hp/sk.maxHp),4);
  }
}
// ============================================================
// Gólem invocado (Gólem de Carne): único, con el arte de su elemento (Maestro de Gólems, ver
// nigromanteGolemSkin() y nigro-elements.js). Atlas por gólem (js/assets/nigro-golems-meta.js):
//   - Piedra: frente / perfil / espalda, caminata de 5 cuadros, golpe en 2 tiempos con el impacto
//     de la hoja en el piso, se arma de los escombros al aparecer y se deshace en ellos al morir.
//   - Fuego / Hielo: idle-caminata, ataque (chorro de fuego / rayo y estallido de hielo al objetivo),
//     aparece con su muerte al revés (brasas / cristales que se juntan) y muere con sus 4 cuadros.
//   - Tormenta / Plaga: el de piedra recoloreado.
// Todo esto es solo dibujo: vida, daño, alcance y tiempos siguen siendo los de nigromante.js.
// ============================================================
const NIGRO_GOLEM_BODY_H = 92;      // alto del cuerpo en el mundo (~1,4 veces un guardián)
const NIGRO_GOLEM_RISE_STEP = 120;  // ms por cuadro al armarse
const NIGRO_GOLEM_DEATH_STEP = 150; // ms por cuadro al deshacerse
const NIGRO_SKEL_RISE_MS = 300;     // el esqueleto sale de la tierra
let _nigroPhaseSeq = 0;
const nigroGolemRemains = [];       // gólems y esqueletos que se deshacen (muerte / absorción): solo visual
const nigroGolemFx = [];            // impactos, chorros y rayos de los golpes del gólem: solo visual

function nigroGolemClip(A, idx){
  if(!A.clips) A.clips = [];
  let c = A.clips[idx];
  if(!c){ const f = A.meta.frames[idx]; c = A.clips[idx] = { frames:[{x:f[0], y:f[1], w:f[2], h:f[3]}], w:f[2], h:f[3], ax:f[4]/f[2], ay:f[5]/f[3] }; }
  return c;
}
function nigroGolemDraw(A, idx, x, y, s, flip, alpha, rot, ax, ay){
  const c = nigroGolemClip(A, idx);
  drawAnimFrameSized(A.img, c, 0, x, y, c.w*s, c.h*s, ax!==undefined ? ax : c.ax, ay!==undefined ? ay : c.ay, flip, alpha, rot);
}
function nigroGolemScale(A){ return NIGRO_GOLEM_BODY_H / A.meta.refH; }
// Cuadros con los que se arma: los escombros (piedra) o la muerte al revés (fuego, hielo).
function nigroGolemRiseSet(A){
  const S = A.meta.sets;
  if(S.rise) return S.rise;
  if(!S._riseRev && S.death) S._riseRev = S.death.slice().reverse();
  return S._riseRev || null;
}
// Marca de invocación: un óvalo verde tenue a los pies, para distinguir el ejército propio de la
// horda sobre los pisos oscuros (Minas, Abismo, Infernal) sin tapar el sprite.
function nigroSummonMark(x, y, r){
  ctx.save();
  ctx.globalAlpha = 0.32*ANIM_ALPHA_MUL; ctx.strokeStyle = "#5ae68c"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(x, y + 3, r, r*0.36, 0, 0, Math.PI*2); ctx.stroke();
  ctx.restore();
}

// Pose actual del gólem: {idx, flip}. Dirección con la misma histéresis que los guardianes.
function nigroGolemPose(g, A){
  const S = A.meta.sets, t = animNow;
  const dir = champPackDir(g), left = !!g._pleft;
  const rise = nigroGolemRiseSet(A);
  const age = g.age||0;
  if(rise && age < rise.length*NIGRO_GOLEM_RISE_STEP) return { idx:rise[Math.floor(age/NIGRO_GOLEM_RISE_STEP)], flip:left };
  const a = g.attackAnim||0;
  if(a > 0 && S.atk){
    // golpe: carga (40 %) y descarga; los cuadros miran a la derecha y se espejan hacia la izquierda
    const prog = 1 - a/(g._aDur||a), arr = S.atk;
    return { idx:arr[Math.min(arr.length-1, Math.floor(prog*arr.length*1.25))], flip:left };
  }
  if(S.walk_side){ // piedra: 4 direcciones
    if(g.moving){
      const arr = dir==="side" ? S.walk_side : (dir==="up" ? S.walk_up : S.walk_down);
      return { idx:arr[Math.floor((t + g._ph)/(dir==="side" ? 140 : 230)) % arr.length], flip:dir==="side" && left };
    }
    const arr = S["idle_"+dir] || S.idle_down;
    return { idx:arr[Math.floor((t + g._ph)/420) % arr.length], flip:dir==="side" && left };
  }
  const arr = g.moving ? S.walk : S.idle;
  return { idx:arr[Math.floor((t + g._ph)/(g.moving ? 150 : 460)) % arr.length], flip:left };
}

// Golpe nuevo (flanco de subida de attackAnim): el efecto propio de cada gólem.
function nigroGolemAttackFx(g, A){
  const S = A.meta.sets, big = !!g.slamBig, s = nigroGolemScale(A);
  g.slamBig = false;
  const dx = g._pleft ? -1 : 1;
  const T = g.target && g.target.alive ? g.target : null;
  const tx = T ? T.x : g.x + (g.fx||1)*70, ty = T ? T.y : g.y + (g.fy||0)*70;
  if(nigroGolemFx.length > 10) nigroGolemFx.shift();
  if(big){
    // ¡Aplasta!: cae en el lugar -impacto de piedra, o el estallido de brasas / cristales del piso-
    if(S.fx_slam) nigroGolemFx.push({ kind:"frames", A, arr:S.fx_slam, x:g.x, y:g.y + 4, s:s*1.35, t0:animNow, step:95, add:false });
    else nigroGolemFx.push({ kind:"frames", A, arr:[S.death[S.death.length-1]], x:g.x, y:g.y + 4, s:s*1.2, t0:animNow, step:380, add:true });
    return;
  }
  if(S.fx_slam){
    // el puño llega al piso en el segundo cuadro del golpe (40 % de la animación)
    nigroGolemFx.push({ kind:"frames", A, arr:S.fx_slam, x:g.x + dx*40, y:g.y + 6, s:s*0.62, t0:animNow + (g._aDur||320)*0.4, step:90, add:false });
  } else if(S.fx_stream){
    nigroGolemFx.push({ kind:"stream", A, idx:S.fx_stream[0], x:g.x + dx*22, y:g.y - 34, tx, ty:ty - 18, t0:animNow + 40, dur:340 });
  } else if(S.fx_bolt){
    nigroGolemFx.push({ kind:"bolt", A, idx:S.fx_bolt[0], x:g.x + dx*24, y:g.y - 30, tx, ty:ty - 18, t0:animNow + 60, dur:200 });
    nigroGolemFx.push({ kind:"burst", A, idx:S.fx_burst[0], x:tx, y:ty - 14, t0:animNow + 250, dur:280 });
  }
}

function drawGolemReal(g){
  const skin = g.skin||"stone";
  const A = nigroGolemAtlas(skin); // (nigro-elements.js) null mientras baja su arte
  if(!A) return;
  if(g._ph===undefined) g._ph = (++_nigroPhaseSeq*433) % 1000;
  const a = g.attackAnim||0;
  if(a > (g._aPrev||0) + 1){ g._aDur = a; nigroGolemAttackFx(g, A); }
  g._aPrev = a;
  const s = nigroGolemScale(A), H = NIGRO_GOLEM_BODY_H;
  const P = nigroGolemPose(g, A);
  drawShadow(g.x, g.y, 30);
  nigroSummonMark(g.x, g.y, 30);
  nigroDrawElementAura(g.x, g.y, skin, 36, animNow/1000);
  g._animKey = "nigro_golem";
  const Pg = animPose(g, animProfileOf(g), false);
  ctx.save(); animApply(g.x, g.y, Pg);
  nigroGolemDraw(A, P.idx, g.x, g.y, s, P.flip, 1);
  if(g.hitFlash>0){ // golpe recibido: destello claro sobre la silueta (antes: el gólem se volvía medio transparente)
    ctx.globalCompositeOperation = "lighter";
    nigroGolemDraw(A, P.idx, g.x, g.y, s, P.flip, 0.35);
  }
  ctx.restore();
  nigroDrawElementDetail(g.x, g.y, skin, H, animNow/1000);
  if(g.hp<g.maxHp){
    ctx.fillStyle="rgba(0,0,0,0.5)"; ctx.fillRect(g.x-26,g.y-H-14,52,5);
    ctx.fillStyle="#8fae7a"; ctx.fillRect(g.x-26,g.y-H-14,52*Math.max(0,g.hp/g.maxHp),5);
  }
}

// El gólem muere o lo absorbe la Encarnación del Abismo: se deshace con sus cuadros reales
// (escombros / brasas / cristales) en vez de desaparecer de golpe.
function nigroGolemDeathFx(g){
  const A = nigroGolemAtlas(g.skin||"stone");
  if(!A || !A.meta.sets.death) return;
  if(nigroGolemRemains.length > 12) nigroGolemRemains.shift();
  nigroGolemRemains.push({ kind:"golem", A, x:g.x, y:g.y, flip:!!g._pleft, t0:animNow, arr:A.meta.sets.death });
  vfxBurst(g.x, g.y - 30, 12, g.skin==="fire" ? "ember" : (g.skin==="ice" ? "ice" : "rock"), 140, 520, 3.5, 1, -30, 0);
}
// Esqueleto que cae: se desarma hundiéndose en la tierra con una lluvia de huesos.
function nigroSkeletonDeathFx(sk){
  const SP = CHAMP_PACK.nigro_skel;
  if(!SP || !SP.ready) return;
  if(nigroGolemRemains.length > 12) nigroGolemRemains.shift();
  const arr = SP.sets[sk.type==="mage" ? "mage_idle" : "warrior_idle"];
  nigroGolemRemains.push({ kind:"skel", SP, v:arr[0], x:sk.x, y:sk.y, flip:(sk.fx||0) < -0.12, t0:animNow, s:46*(sk.scale||1)/SP.refH, h:46*(sk.scale||1) });
  vfxBurst(sk.x, sk.y - 22, 8, "bone", 110, 420, 3, 1, -40, 0);
}
function nigroRemainsDone(r){
  const t = animNow - r.t0;
  return r.kind==="golem" ? t > r.arr.length*NIGRO_GOLEM_DEATH_STEP + 420 : t > 420;
}
function drawNigroRemains(r){
  const t = animNow - r.t0;
  if(r.kind==="golem"){
    const n = Math.min(r.arr.length-1, Math.floor(t/NIGRO_GOLEM_DEATH_STEP));
    const hold = t - r.arr.length*NIGRO_GOLEM_DEATH_STEP;
    const alpha = hold > 0 ? Math.max(0, 1 - hold/420) : 1;
    drawShadow(r.x, r.y, 30*alpha);
    nigroGolemDraw(r.A, r.arr[n], r.x, r.y, nigroGolemScale(r.A), r.flip, alpha);
  } else {
    const k = Math.min(1, t/420), sink = _ease(k);
    ctx.save();
    ctx.beginPath(); ctx.rect(r.x - 50, r.y - r.h*1.4, 100, r.h*1.4 + 4); ctx.clip();
    ctx.translate(r.x, r.y + r.h*0.55*sink); ctx.rotate((r.flip ? -1 : 1)*0.35*sink); ctx.translate(-r.x, -r.y);
    champPackDrawFrame(r.SP, r.v, r.x, r.y, r.s, r.flip, 1 - k*0.85);
    ctx.restore();
  }
}
// Efectos de los golpes del gólem (encima de las entidades).
function drawNigroGolemFx(){
  for(let i = nigroGolemFx.length - 1; i >= 0; i--){
    const f = nigroGolemFx[i], t = animNow - f.t0;
    if(t < 0) continue;
    const dur = f.kind==="frames" ? f.arr.length*f.step + 120 : f.dur;
    if(t > dur){ nigroGolemFx.splice(i, 1); continue; }
    if(!inView(f.x, f.y, 200)) continue;
    const k = t/dur;
    ctx.save();
    if(f.kind==="frames"){
      if(f.add) ctx.globalCompositeOperation = "lighter";
      const n = Math.min(f.arr.length-1, Math.floor(t/f.step));
      nigroGolemDraw(f.A, f.arr[n], f.x, f.y, f.s, false, k > 0.75 ? (1 - k)/0.25 : 1);
    } else if(f.kind==="stream"){
      // el chorro sale de la mano y se estira hasta el objetivo
      ctx.globalCompositeOperation = "lighter";
      const c = nigroGolemClip(f.A, f.idx), L = Math.max(90, Math.hypot(f.tx - f.x, f.ty - f.y));
      const grow = Math.min(1, k/0.3), sx = L*grow/c.w, sy = Math.min(1.4, Math.max(0.7, sx))*0.9;
      const ang = Math.atan2(f.ty - f.y, f.tx - f.x);
      drawAnimFrameSized(f.A.img, c, 0, f.x, f.y, c.w*sx, c.h*sy, 0, 0.62, false, k > 0.6 ? (1 - k)/0.4 : 1, ang);
    } else if(f.kind==="bolt"){
      ctx.globalCompositeOperation = "lighter";
      const c = nigroGolemClip(f.A, f.idx), s = 1.3;
      const x = f.x + (f.tx - f.x)*k, y = f.y + (f.ty - f.y)*k;
      drawAnimFrameSized(f.A.img, c, 0, x, y, c.w*s, c.h*s, 0.8, 0.5, false, 1, Math.atan2(f.ty - f.y, f.tx - f.x));
    } else if(f.kind==="burst"){
      ctx.globalCompositeOperation = "lighter";
      const c = nigroGolemClip(f.A, f.idx), s = 1.1 + 0.35*k;
      drawAnimFrameSized(f.A.img, c, 0, f.x, f.y, c.w*s, c.h*s, 0.72, 0.55, false, 1 - k*k);
    }
    ctx.restore();
  }
}

function drawSylvaReal(h, drawScale, alpha){
  if(drawChampPack("cazadora", h, drawScale, alpha)) return true;
  if(!SYLVA_REAL_READY.idle) return false;
  let img;
  if(h.sylvaCharging && SYLVA_REAL_READY.chargeAim){
    // Flecha Perforante cargando (mantiene pulsado): antes no se veía nada distinto -bug real,
    // la habilidad "cargar" no mostraba ningún cambio en el cuerpo de Sylva-.
    img = SYLVA_REAL_IMG.chargeAim;
  } else if(h.attackAnim>0 && h.sylvaCastKind==="piercing" && SYLVA_REAL_READY.release1){
    // Disparo de Flecha Perforante ya soltada: 2 poses reales en vez de caer directo en el
    // combo básico (que no correspondía a esta habilidad).
    const seq = ["release1","release2"];
    const progress = Math.max(0, Math.min(0.999, 1 - h.attackAnim/(h.sylvaCastDur||180)));
    img = SYLVA_REAL_IMG[seq[Math.floor(progress*seq.length)]];
  } else if(h.attackAnim>0 && SYLVA_REAL_READY.atk1){
    const seq = ["atk1","atk2","atk3","atk4","atk5","atk6"];
    const progress = Math.max(0, Math.min(0.999, 1 - h.attackAnim/190));
    const key = seq[Math.floor(progress*seq.length)] || seq[seq.length-1];
    img = SYLVA_REAL_READY[key] ? SYLVA_REAL_IMG[key] : SYLVA_REAL_IMG.idle;
  } else if(h.moving && SYLVA_REAL_READY.run1 && SYLVA_REAL_READY.run2){
    img = (Math.floor((h.animT||0)/110)%2===0) ? SYLVA_REAL_IMG.run1 : SYLVA_REAL_IMG.run2;
  } else {
    img = SYLVA_REAL_IMG.idle;
  }
  const flip = (h.fx||0) < -0.12;
  const targetH = h.radius*2.7*(drawScale/(h.scale||2.0));
  const s = targetH/img.height;
  const clip = { frames: [{x:0, y:0, w:img.width, h:img.height}] };
  drawAnimFrameSized(img, clip, 0, h.x, h.y, img.width*s, img.height*s, 0.5, 0.94, flip, alpha);
  return true;
}
// Lobo Espectral (Cacería Salvaje): entidad liviana propia (no vive en `enemies` ni `heroes`,
// ver wolfState en makeHero/updateSylvaWolf), con su propio set de 4 poses reales.
function drawSpectralWolf(w){
  if(!WOLF_REAL_READY.idle) return;
  let img;
  if(w.biteTimer>0 && WOLF_REAL_READY.bite) img = WOLF_REAL_IMG.bite;
  else if(w.jumping && WOLF_REAL_READY.jump) img = WOLF_REAL_IMG.jump;
  // (el recorte "run" venía sin cabeza, cortado por la grilla: corriendo usa la pose de perfil)
  else img = WOLF_REAL_IMG.idle;
  const flip = (w.fx||0) < -0.12;
  // escala fija por píxel (la del idle original, 54px sobre 62): los recortes ya no traen el
  // texto de la hoja debajo, y así las 3 poses se ven del mismo tamaño
  const s = 54/62;
  const clip = { frames: [{x:0,y:0,w:img.width,h:img.height}] };
  drawShadow(w.x, w.y, 22);
  drawAnimFrameSized(img, clip, 0, w.x, w.y, img.width*s, img.height*s, 0.5, 0.95, flip, 0.92);
}

function drawAxiomReal(h, drawScale, alpha){
  return drawChampPack("axiom", h, drawScale, alpha) || draw3DirRealSprite(AXIOM_REAL_IMG, AXIOM_REAL_READY, h, drawScale, alpha);
}
