"use strict";
/* ============================================================
   js/assets/vfx-sprites.js
   Carga de las imágenes de efectos visuales de habilidades y jefes (assets/vfx/).
   ============================================================ */

// Lluvia de la Cazadora: 3 frames reales (flecha subiendo / cayendo en lluvia / impacto en
// el suelo), del mismo zip -antes solo se veía el círculo punteado del telegraph-.
const SYLVA_RAIN_IMG = {};
const SYLVA_RAIN_READY = {};
SYLVA_RAIN_IMG.f1 = new Image();
SYLVA_RAIN_READY.f1 = false;
SYLVA_RAIN_IMG.f1.onload = () => { SYLVA_RAIN_READY.f1 = true; };
SYLVA_RAIN_IMG.f1.src = "assets/vfx/cazadora/rain-f1.png";
SYLVA_RAIN_IMG.f2 = new Image();
SYLVA_RAIN_READY.f2 = false;
SYLVA_RAIN_IMG.f2.onload = () => { SYLVA_RAIN_READY.f2 = true; };
SYLVA_RAIN_IMG.f2.src = "assets/vfx/cazadora/rain-f2.png";
SYLVA_RAIN_IMG.f3 = new Image();
SYLVA_RAIN_READY.f3 = false;
SYLVA_RAIN_IMG.f3.onload = () => { SYLVA_RAIN_READY.f3 = true; };
SYLVA_RAIN_IMG.f3.src = "assets/vfx/cazadora/rain-f3.png";
// Trampa del Bosque: 4 frames reales de crecimiento (plantada -> raíces creciendo -> trampa
// formada), del mismo zip -antes solo la mira procedural-.
const SYLVA_TRAP_IMG = {};
const SYLVA_TRAP_READY = {};
SYLVA_TRAP_IMG.f1 = new Image();
SYLVA_TRAP_READY.f1 = false;
SYLVA_TRAP_IMG.f1.onload = () => { SYLVA_TRAP_READY.f1 = true; };
SYLVA_TRAP_IMG.f1.src = "assets/vfx/cazadora/trap-f1.png";
SYLVA_TRAP_IMG.f2 = new Image();
SYLVA_TRAP_READY.f2 = false;
SYLVA_TRAP_IMG.f2.onload = () => { SYLVA_TRAP_READY.f2 = true; };
SYLVA_TRAP_IMG.f2.src = "assets/vfx/cazadora/trap-f2.png";
SYLVA_TRAP_IMG.f3 = new Image();
SYLVA_TRAP_READY.f3 = false;
SYLVA_TRAP_IMG.f3.onload = () => { SYLVA_TRAP_READY.f3 = true; };
SYLVA_TRAP_IMG.f3.src = "assets/vfx/cazadora/trap-f3.png";
SYLVA_TRAP_IMG.f4 = new Image();
SYLVA_TRAP_READY.f4 = false;
SYLVA_TRAP_IMG.f4.onload = () => { SYLVA_TRAP_READY.f4 = true; };
SYLVA_TRAP_IMG.f4.src = "assets/vfx/cazadora/trap-f4.png";// Lobo Espectral (solo existe durante Cacería Salvaje): idle/correr/mordida/salto.

// Animaciones de habilidades del Mago de Hielo y Cristal (jefe de la Arena de Hielo, fase 1):
// tiras de 12 frames (Ventisca, Nova de Hielo, Armadura de Hielo), una imagen por habilidad.
const SKILL_ATLAS_READY = {};
const SKILL_ATLAS_IMG = {};
SKILL_ATLAS_READY["ventisca"] = false;
SKILL_ATLAS_IMG["ventisca"] = new Image();
SKILL_ATLAS_IMG["ventisca"].onload = () => { SKILL_ATLAS_READY["ventisca"] = true; };
SKILL_ATLAS_IMG["ventisca"].src = "assets/vfx/skills/ventisca.png";
SKILL_ATLAS_READY["nova_hielo"] = false;
SKILL_ATLAS_IMG["nova_hielo"] = new Image();
SKILL_ATLAS_IMG["nova_hielo"].onload = () => { SKILL_ATLAS_READY["nova_hielo"] = true; };
SKILL_ATLAS_IMG["nova_hielo"].src = "assets/vfx/skills/nova_hielo.png";
SKILL_ATLAS_READY["armadura_hielo"] = false;
SKILL_ATLAS_IMG["armadura_hielo"] = new Image();
SKILL_ATLAS_IMG["armadura_hielo"].onload = () => { SKILL_ATLAS_READY["armadura_hielo"] = true; };
SKILL_ATLAS_IMG["armadura_hielo"].src = "assets/vfx/skills/armadura_hielo.png";

SKILL_ATLAS_READY["nova_escarcha"] = false;
SKILL_ATLAS_IMG["nova_escarcha"] = new Image();
SKILL_ATLAS_IMG["nova_escarcha"].onload = () => { SKILL_ATLAS_READY["nova_escarcha"] = true; };
SKILL_ATLAS_IMG["nova_escarcha"].src = "assets/vfx/skills/nova_escarcha.png";// Animaciones de habilidades del Dragón de Hielo (Tundraverx, subjefe de la Arena de
// Hielo): a diferencia de SKILL_ATLAS (que se dibuja ENCIMA del sprite normal), estas
// hojas ya traen al dragón dibujado adentro de cada frame (cuerpo + efecto juntos), así
// que reemplazan el sprite normal mientras dura la animación en vez de superponerse.
const BOSS_FX_READY = {};
const BOSS_FX_IMG = {};
BOSS_FX_READY["aliento_hielo"] = false;
BOSS_FX_IMG["aliento_hielo"] = new Image();
BOSS_FX_IMG["aliento_hielo"].onload = () => { BOSS_FX_READY["aliento_hielo"] = true; };
BOSS_FX_IMG["aliento_hielo"].src = "assets/vfx/bosses/aliento_hielo.png";
BOSS_FX_READY["nova_hielo_dragon"] = false;
BOSS_FX_IMG["nova_hielo_dragon"] = new Image();
BOSS_FX_IMG["nova_hielo_dragon"].onload = () => { BOSS_FX_READY["nova_hielo_dragon"] = true; };
BOSS_FX_IMG["nova_hielo_dragon"].src = "assets/vfx/bosses/nova_hielo_dragon.png";
const ASESINO_HAB_IMG = {}, ASESINO_HAB_READY = {};
ASESINO_HAB_READY["trampa"] = false;
ASESINO_HAB_IMG["trampa"] = new Image();
ASESINO_HAB_IMG["trampa"].onload = () => { ASESINO_HAB_READY["trampa"] = true; };
ASESINO_HAB_IMG["trampa"].src = "assets/vfx/guerrero/trampa.png";
ASESINO_HAB_READY["triple_golpe"] = false;
ASESINO_HAB_IMG["triple_golpe"] = new Image();
ASESINO_HAB_IMG["triple_golpe"].onload = () => { ASESINO_HAB_READY["triple_golpe"] = true; };
ASESINO_HAB_IMG["triple_golpe"].src = "assets/vfx/guerrero/triple_golpe.png";
ASESINO_HAB_READY["pestilencia"] = false;
ASESINO_HAB_IMG["pestilencia"] = new Image();
ASESINO_HAB_IMG["pestilencia"].onload = () => { ASESINO_HAB_READY["pestilencia"] = true; };
ASESINO_HAB_IMG["pestilencia"].src = "assets/vfx/guerrero/pestilencia.png";
ASESINO_HAB_READY["corte_sangrante"] = false;
ASESINO_HAB_IMG["corte_sangrante"] = new Image();
ASESINO_HAB_IMG["corte_sangrante"].onload = () => { ASESINO_HAB_READY["corte_sangrante"] = true; };
ASESINO_HAB_IMG["corte_sangrante"].src = "assets/vfx/guerrero/corte_sangrante.png";

const NIGRO_PLAGUE_FX_IMG = {};
const NIGRO_PLAGUE_FX_READY = {};
NIGRO_PLAGUE_FX_IMG.ground1 = new Image(); NIGRO_PLAGUE_FX_READY.ground1=false; NIGRO_PLAGUE_FX_IMG.ground1.onload=()=>{ NIGRO_PLAGUE_FX_READY.ground1=true; };
NIGRO_PLAGUE_FX_IMG.ground1.src = "assets/vfx/nigromante/plague-ground1.png";
NIGRO_PLAGUE_FX_IMG.ground2 = new Image(); NIGRO_PLAGUE_FX_READY.ground2=false; NIGRO_PLAGUE_FX_IMG.ground2.onload=()=>{ NIGRO_PLAGUE_FX_READY.ground2=true; };
NIGRO_PLAGUE_FX_IMG.ground2.src = "assets/vfx/nigromante/plague-ground2.png";
NIGRO_PLAGUE_FX_IMG.ground3 = new Image(); NIGRO_PLAGUE_FX_READY.ground3=false; NIGRO_PLAGUE_FX_IMG.ground3.onload=()=>{ NIGRO_PLAGUE_FX_READY.ground3=true; };
NIGRO_PLAGUE_FX_IMG.ground3.src = "assets/vfx/nigromante/plague-ground3.png";
// Axiom — VFX animados de las habilidades (varios frames por burst, con fundido de
// entrada/salida). activeAxiomVfx guarda instancias activas {key,x,y,age} y se
// dibuja/actualiza cada frame (ver drawAxiomVfxActive/updateAxiomVfx más abajo).
// Las tiras traían dibujado al Axiom anterior (el nene de pelo blanco) adentro de cada frame; con
// el diseño nuevo del Pack 1 se veía el personaje viejo encima: se enmascaró el cuerpo y queda el efecto.
const AXIOM_VFX_IMG = {};
const AXIOM_VFX_READY = {};
AXIOM_VFX_IMG["err404"] = new Image();
AXIOM_VFX_READY["err404"] = false;
AXIOM_VFX_IMG["err404"].onload = () => { AXIOM_VFX_READY["err404"] = true; };
AXIOM_VFX_IMG["err404"].src = "assets/vfx/axiom/err404.png";
AXIOM_VFX_IMG["overwrite"] = new Image();
AXIOM_VFX_READY["overwrite"] = false;
AXIOM_VFX_IMG["overwrite"].onload = () => { AXIOM_VFX_READY["overwrite"] = true; };
AXIOM_VFX_IMG["overwrite"].src = "assets/vfx/axiom/overwrite.png";
AXIOM_VFX_IMG["teleport_out"] = new Image();
AXIOM_VFX_READY["teleport_out"] = false;
AXIOM_VFX_IMG["teleport_out"].onload = () => { AXIOM_VFX_READY["teleport_out"] = true; };
AXIOM_VFX_IMG["teleport_out"].src = "assets/vfx/axiom/teleport_out.png";
AXIOM_VFX_IMG["teleport_in"] = new Image();
AXIOM_VFX_READY["teleport_in"] = false;
AXIOM_VFX_IMG["teleport_in"].onload = () => { AXIOM_VFX_READY["teleport_in"] = true; };
AXIOM_VFX_IMG["teleport_in"].src = "assets/vfx/axiom/teleport_in.png";
AXIOM_VFX_IMG["forcequit"] = new Image();
AXIOM_VFX_READY["forcequit"] = false;
AXIOM_VFX_IMG["forcequit"].onload = () => { AXIOM_VFX_READY["forcequit"] = true; };
AXIOM_VFX_IMG["forcequit"].src = "assets/vfx/axiom/forcequit.png";// Cada burst reproduce TODOS los frames de su animación una sola vez, a un ritmo fijo
// ---------------- Pack de VFX propio (agua/ataque/cast dark fantasy), generado por Claude ----------------
// Técnica: formas vectoriales supersampleadas 4x + glow aditivo real, bajadas con LANCZOS -mismo
// look pintado/suave que el arte real existente (soulFireProj, ronin4, etc.), no pixel-art de bordes duros-.
const NEWFX_IMG = {}, NEWFX_READY = {};
function newfxLoad(key, list){ NEWFX_IMG[key]=[]; NEWFX_READY[key]=0; for(const src of list){ const im=new Image(); im.onload=()=>{ NEWFX_READY[key]++; }; im.src=src; NEWFX_IMG[key].push(im); } }
function newfxReady(key){ const a = NEWFX_IMG[key]; return !!a && NEWFX_READY[key] >= a.length; }
newfxLoad('iceCrystal', [
  "assets/vfx/abilities/iceCrystal_01.png"
]);
newfxLoad('frostRune', [
  "assets/vfx/abilities/frostRune_01.png"
]);
newfxLoad('scytheSlash', [
  "assets/vfx/abilities/scytheSlash_01.png",
  "assets/vfx/abilities/scytheSlash_02.png",
  "assets/vfx/abilities/scytheSlash_03.png",
  "assets/vfx/abilities/scytheSlash_04.png"
]);
newfxLoad('soulReapBurst', [
  "assets/vfx/abilities/soulReapBurst_01.png",
  "assets/vfx/abilities/soulReapBurst_02.png",
  "assets/vfx/abilities/soulReapBurst_03.png",
  "assets/vfx/abilities/soulReapBurst_04.png",
  "assets/vfx/abilities/soulReapBurst_05.png"
]);
newfxLoad('holyHealBurst', [
  "assets/vfx/abilities/holyHealBurst_01.png",
  "assets/vfx/abilities/holyHealBurst_02.png",
  "assets/vfx/abilities/holyHealBurst_03.png",
  "assets/vfx/abilities/holyHealBurst_04.png"
]);
newfxLoad('holyShieldBubble', [
  "assets/vfx/abilities/holyShieldBubble_01.png",
  "assets/vfx/abilities/holyShieldBubble_02.png",
  "assets/vfx/abilities/holyShieldBubble_03.png",
  "assets/vfx/abilities/holyShieldBubble_04.png"
]);
newfxLoad('waterSplash', [
  "assets/vfx/abilities/waterSplash_01.png",
  "assets/vfx/abilities/waterSplash_02.png",
  "assets/vfx/abilities/waterSplash_03.png",
  "assets/vfx/abilities/waterSplash_04.png"
]);

/* ---- dibujo ---- */
const ICE_WALL_IMG = [new Image(), new Image()], ICE_WALL_READY = [false, false];
const FROST_BEAM_IMG = [new Image(), new Image(), new Image()], FROST_BEAM_READY = [false, false, false];
ICE_WALL_IMG.forEach((im,i)=>{ im.onload = ()=>{ ICE_WALL_READY[i] = true; }; });
FROST_BEAM_IMG.forEach((im,i)=>{ im.onload = ()=>{ FROST_BEAM_READY[i] = true; }; });
// Arte real del zip del Demonio de Hielo (recortado a mano: sin el tablero gris ni los
// rótulos que traía pegados): bloque de cristal del Muro y 3 frames del chorro.
ICE_WALL_IMG[0].src = "assets/vfx/bosses/ice-wall_01.png";
ICE_WALL_IMG[1].src = "assets/vfx/bosses/ice-wall_01.png";
FROST_BEAM_IMG[0].src = "assets/vfx/bosses/frost-beam_01.png";
FROST_BEAM_IMG[1].src = "assets/vfx/bosses/frost-beam_02.png";
FROST_BEAM_IMG[2].src = "assets/vfx/bosses/frost-beam_03.png";
