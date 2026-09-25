"use strict";
/* ============================================================
   js/data/pixel-art.js
   DATOS del pixel art procedural (grillas 16x16 y paletas por clase/enemigo) que se
   usa cuando no hay sprite real.
   ============================================================ */

/* ============================================================
   PIXEL ART — SPRITES DE PERSONAJES Y ENEMIGOS
   Cada sprite es una grilla 16x16 de caracteres con paleta por clase.
   ============================================================ */
const SPR = 16, SPR_PX = 4;

const PAL = {
  // Asesino encapuchado con dagas
  guerrero:{k:"#05070a", a:"#16221d", b:"#243328", c:"#33473a", d:"#455e4b", s:"#b8845c", t:"#8f6244", m:"#cfd9e0", l:"#8b96a0", n:"#4a3828", g:"#7dffa8"},
  // Caballero de armadura azul
  tanque:{k:"#070910", a:"#16305c", b:"#27508f", c:"#3f6fc0", d:"#6a9ce0", s:"#e0ac7a", t:"#b3814f", r:"#6b3f1e", q:"#8f5a2c", m:"#c8d2dc", l:"#8d98a4", n:"#7a4a28", g:"#efe8d4"},
  // Mago de sombrero puntiagudo
  mago:{k:"#09060f", a:"#54248c", b:"#7a3cbe", c:"#9b5ee0", d:"#b98cf0", s:"#d9a878", t:"#a87c52", r:"#1c2e66", q:"#2f4a9e", e:"#4668c4", m:"#7a5230", n:"#4e3520", g:"#9fe0ff", w:"#e8f6ff"},
  // Sanador de túnica blanca y verde
  soporte:{k:"#0a120c", a:"#f2eee4", b:"#d6d0c0", c:"#b4ad9a", d:"#3f8a55", e:"#57ad6e", f:"#2a6640", s:"#dfb188", t:"#b08560", r:"#7a4a28", m:"#8df0a8", n:"#6b4a2a", w:"#e8ffe8"},
  // Esqueleto con escudo y espada
  esqueleto:{k:"#12100e", a:"#ece4cc", b:"#cfc5a6", c:"#a89d80", d:"#7d735c", r:"#7a4a24", q:"#5c3718", m:"#b9c4cc", l:"#8b959d", n:"#5c4626", g:"#12100e", h:"#e8c98a", s:"#f5fbff"},
  // Zombi putrefacto
  zombie:{k:"#0a0d06", a:"#5f7048", b:"#465632", c:"#7d8d5e", d:"#2e3820", n:"#241f16", v:"#7a1e1e", w:"#c23030", g:"#dcd27a", s:"#4a5636"},
  // Esqueleto cornudo (subélite)
  esqueleto_h:{k:"#0e0b09", a:"#ded4b4", b:"#b8ad8c", c:"#8d836a", d:"#6a614c", r:"#7a4a24", q:"#5c3718", m:"#b9c4cc", l:"#8b959d", n:"#5c4626", g:"#ff3a26", h:"#e8c98a", s:"#f5fbff"},
  // Demonio menor
  demonio_menor:{k:"#160604", a:"#d94a1e", b:"#b0350f", c:"#f07a3a", d:"#8a2408", r:"#4a2a18", q:"#2e1a0e", m:"#c9b090", g:"#ffd83a", n:"#5c3a1a"},
  // Gólem de piedra
  golem:{k:"#0c0e09", a:"#767a5a", b:"#585c40", c:"#939870", d:"#3a3d28", e:"#a8ae86", g:"#242a1a", m:"#5f6448", n:"#8a8f6a"},
  // Demonio hechicero
  demonio_mago:{k:"#0a0510", a:"#5a3a80", b:"#3e2860", c:"#7a53a8", d:"#2a1a42", s:"#9a3a2a", t:"#6e2418", r:"#c8a44a", q:"#8a6f28", m:"#5a3a1c", n:"#3a230e", g:"#ff9a2a", w:"#ffe08a", h:"#8a6f52"},
  // Demonio mayor (jefe final)
  demonio_mayor:{k:"#0a0303", a:"#a3241a", b:"#6e120d", c:"#d1543c", d:"#4a0c09", m:"#cfc39c", l:"#9c8f68", g:"#ffcf3a", w:"#f2ecd8", p:"#2a0808", q:"#500e0e", r:"#150404", f:"#ff9a2a"},
};

// Paletas de los 4 héroes, rediseñadas a mayor resolución y detalle (ver GRIDS más abajo).
// Se asignan aquí, sobrescribiendo las entradas equivalentes del objeto PAL de arriba.
PAL.tanque = {a:"#0a090d", b:"#3f6fc0", c:"#78a8e0", d:"#373f4a", e:"#ced8e0", f:"#96a3b1", g:"#5f6b78", h:"#7a4a24", i:"#16305c", j:"#5c3718", k:"#9a6a3a", l:"#27508f", m:"#efe8d4", n:"#c9a227", o:"#4a2e18", p:"#321e10"};
PAL.guerrero = {a:"#08070a", b:"#3a473a", c:"#0c110c", d:"#242f24", e:"#c8ffdc", f:"#7dffa8", g:"#334738", h:"#1a241d", i:"#161e16", j:"#4a2e18", k:"#7a4a28", l:"#9a6a3a", m:"#b8845c", n:"#cfd9e0", o:"#8b96a0", p:"#454e58"};
// Axiom: cabello plateado, ojos y aura cian intenso, armadura oscura elegante. Placeholder
// visual -reusa la silueta delgada del Asesino (GRIDS.guerrero, mismo mecanismo que ya usa
// segador = GRIDS.guerrero)- con paleta 100% propia, hasta tener arte real para reemplazarla.
PAL.axiom = {a:"#05060c", b:"#1a2440", c:"#0a0e18", d:"#2c3e66", e:"#5ac8ff", f:"#bff5ff", g:"#243252", h:"#131a2c", i:"#0d1320", j:"#33405c", k:"#4a5878", l:"#6a7ea0", m:"#e8d8c8", n:"#f0f4fa", o:"#a8b8cc", p:"#5c6c88"};
PAL.mago = {a:"#0a070f", b:"#1c103a", c:"#96dcff", d:"#78d2ff", e:"#301c5c", f:"#dcf5ff", g:"#5aaaff", h:"#6c4aa8", i:"#5a3c28", j:"#e0b284", k:"#3a2618", l:"#b88a60", m:"#4a3080", n:"#c9a227", o:"#ffd66e"};
PAL.soporte = {a:"#0a0c0a", b:"#fffffa", c:"#8ce696", d:"#c8ffc8", e:"#b4ac9b", f:"#e6e1d2", g:"#784a2c", h:"#e0b284", i:"#b88a60", j:"#966e42", k:"#20663a", l:"#3aa05a", m:"#64482a", n:"#c4beac", o:"#ece8dc", p:"#78dc8c", q:"#d6b45a"};
// El Segador Olvidado: berserker de armadura de hierro ennegrecido, con ojos y aura carmesí.
PAL.segador = {a:"#050405", b:"#2a2422", c:"#0a0808", d:"#1c1816", e:"#ff5c4a", f:"#c62828", g:"#3a322e", h:"#171412", i:"#121010", j:"#3a2418", k:"#6a4428", l:"#8a6038", m:"#b8845c", n:"#9aa0a8", o:"#5a6068", p:"#2e3238"};

const GRIDS = {};

GRIDS.tanque = [
".............abccba.............",
"............aabbbbaa............",
"...........addeeeeeea...........",
"...........addeeeeeea...........",
"...........addffffeea...........",
"...........addffffeea.......aa..",
"...........addaeeaeea......aefa.",
"...........addffffeea......aefa.",
"...........addffffeea......aefa.",
"...aaa.....addgddgeea......aefa.",
"..ahhha....addgddgeea......aefa.",
".ahhhhha.aaaaggggggaaaa....aefa.",
"ahhhhhhhaddfeeggggeefdda...aefa.",
"hhhhhhhhhddiibbbbbbccdda...aefa.",
"hjjjhhkkhddiibbbbbbccdda...aefa.",
"hjjjhhkkhddiibllllbccdda...aefa.",
"hjgmmmgkhllllblmmlblllla...aefa.",
"hjgnmmgkhllllbmmmmblllla...aefa.",
"hjmmnmmkhllllbmmmmbllllaa..aefa.",
"hjmmmmmkhllllblmmlbeeeeeea.aefa.",
"hjgmmmgkffffffllllbeeeeeea.aefa.",
"hjgmmmgkffffffbbbbbffffffa.aefa.",
"hjjjhhkkffffffnnnnoffffffaannnna",
"ajjjhhkkffffffnnnnoooaaaa.anoona",
".ahhhhhaaaaaiiiiaiiiia.....aooa.",
"..aahha....aiiiiaiiiia.....aooa.",
"....aa.....aggggagggga....annnna",
"...........aggggagggga....annnna",
"...........aeeeeaeeeea.....aaaa.",
"..........aoooooaoooooa.........",
"..........aopppoaopppoa.........",
"..........aoooooaoooooa.........",
];
GRIDS.tanque_atk = [
".............abccba.............",
"............aabbbbaa............",
"...........addeeeeeea...........",
"...........addeeeeeea.....fe....",
"...........addffffeea......fe...",
"...........addffffeea......fe...",
"...........addaeeaeea.......fe..",
"...........addffffeea.......fe..",
"...........addffffeea........fe.",
"...aaa.....addgddgeea........fe.",
"..ahhha....addgddgeea........fe.",
".ahhhhha.aaaaggggggaaaa.....fe..",
"ahhhhhhhaddfeeggggeefdda....fe..",
"hhhhhhhhhddiibbbbbbccdda...fe...",
"hjjjhhkkhddiibbbbbbccdda.nnnn...",
"hjjjhhkkhddiibllllbccdda.ooon...",
"hjgmmmgkhllllblmmlblllla.ooo....",
"hjgnmmgkhllllbmmmmblllla.ooo....",
"hjmmnmmkhllllbmmmmbllllaaooo....",
"hjmmmmmkhllllblmmlbeeeeeea......",
"hjgmmmgkffffffllllbeeeeeea......",
"hjgmmmgkffffffbbbbbffffffa......",
"hjjjhhkkffffffnnnnoffffffa......",
"ajjjhhkkffffffnnnnoooaaaa.......",
".ahhhhhaaaaaiiiiaiiiia..........",
"..aahha....aiiiiaiiiia..........",
"....aa.....aggggagggga..........",
"...........aggggagggga..........",
"...........aeeeeaeeeea..........",
"..........aoooooaoooooa.........",
"..........aopppoaopppoa.........",
"..........aoooooaoooooa.........",
];

GRIDS.guerrero = [
"................................",
"................................",
"............aaaaaaaa............",
"...........abbbbbbbba...........",
"...........abbbbbbbba...........",
"...........accddddbba...........",
"...........acaaaaaaba...........",
"...........acaeffeaba...........",
"...........acaffffaba...........",
"........aaaacaaaaaabaaaa........",
".......aggghcaaaaaabhggga.......",
".......aggghiiiiiiiihggga.......",
".......aggghiiiiiiiihggga.......",
".......agccddjkkkklddccga.......",
".......agccddjkkkklddccga.......",
".......agccddjcjjclddccga.......",
".......agccddjcjjclddccga.......",
".......agmmmmjjccjlmmmmga.......",
".......agmmmmjjccjlmmmmga.......",
"....aa.agmmmmjjccjlmmmmga.aa....",
"...anoaagjjjjppooppjjjjgaaona...",
"...anoaagjjjjppooppjjjjgaaona...",
"...anoaagjjjppppppppjjjgaaona...",
"...anoaaggghpcciiddphgggaaona...",
"...anoaaggghhcciiddhhgggaaona...",
"...anoaaggghhcciiddhhgggaaona...",
"...anoaahhhhhcciiddhhhhhaaona...",
"...ajjjahhhhhjjjjjjhhhhhajjja...",
"...ajjjahhhhhjjjjjjhhhhhajjja...",
"....aaaahhhhjjjjjjjjhhhhaaaa....",
"........ahhhjjjjjjjjhhha........",
".........aahaaaaaaaahaa.........",
];
GRIDS.guerrero_atk = [
"................................",
"................................",
"............aaaaaaaa............",
"...........abbbbbbbba...........",
"...........abbbbbbbba...........",
"...........accddddbba...........",
"...........acaaaaaaba...........",
"...........acaeffeaba...........",
"...........acaffffaba...........",
"........aaaacaaaaaabaaaa........",
".......aggghcaaaaaabhggga.......",
".......aggghiiiiiiiihggga.......",
".......aggghiiiiiiiihggga.......",
".......agccddjkkkklddccga.......",
".......agccddjkkkklddccga.......",
".......agccddjcjjclddccga.......",
".......agccddjcjjclddccga.......",
"......nagmmmmjjccjlmmmmgan......",
"......o.gnmmmjjccjlmmmng.o......",
"........gommnjjccjlnmmog........",
"........gjjjoppnnppojjjg........",
".....jjjgjjjjnpoopnjjjjgjjj.....",
".....jjjgjjjpoppppopjjjgjjj.....",
"........ggghpcciiddphggg........",
"........ggghhcciiddhhggg........",
"........ggghhcciiddhhggg........",
"........hhhhhcciiddhhhhh........",
"........hhhhhjjjjjjhhhhh........",
"........hhhhhjjjjjjhhhhh........",
"........hhhhjjjjjjjjhhhh........",
"........ahhhjjjjjjjjhhha........",
".........aahaaaaaaaahaa.........",
];

// Musashi, El Espadachín Maldito: sprite pixel-art propio (no reutiliza la silueta del
// Asesino como Segador/Axiom) generado con el mismo motor procedural GRIDS/PAL que el resto
// del roster -pixel-crisp, mismo tamaño de grilla, misma canalización walk/attack/hurt/flash
// automática de makeSpriteCanvas-. El material del ZIP de referencia es arte conceptual
// pintado (proporciones realistas, sombreado suave, sin grilla de frames ni transparencia),
// no un spritesheet listo para el motor de bitmaps (AnimAtlas); se usó como referencia de
// paleta/silueta (kimono azul celeste, hakama oscura, piel tostada, pelo negro despeinado
// con un pequeño rodete, bokken de madera) para este sprite en vez de forzar la ilustración
// pintada dentro del motor de bitmaps -ver el informe final para más detalle-.
GRIDS.musashi = [
"................................",
"..........aa......aa...........",
".........aaaa....aaaa..........",
"........aaaaaaaaaaaaaaa........",
".......aaaaaaaaaaaaaaaaa.......",
".......aassssssssssssaa........",
".......aassssssssssssaa........",
".......aasseessssseesaa........",
"........assssssssssssaa........",
"........aassqqqqqqssaa.........",
".........aassssssssaa..........",
"..........aassssssaa...........",
"...........aatttaa.............",
"..........bbbcccbbb............",
".........bbbcccccbbbn..........",
"........bbbccdddccbbbnn........",
".......bbbccdddddccbbnn........",
".......bbccccccccccccbnn.......",
".......bcccccccccccccc.........",
".......brrrrrrrrrrrrrrb........",
".......brrrrrrrrrrrrrrb........",
".......bbccccccccccccbb........",
".......sbc.........cbs.........",
"........bb.........bb..........",
".......gg...........gg.........",
".......gg...........gg.........",
".......ll...........ll.........",
".......ll...........ll.........",
".......ll...........ll.........",
".......ll...........ll.........",
".......mm...........mm.........",
"................................",
];
// Variante de ataque: el bokken sale de su funda y aparece el corte diagonal (mismo patrón
// que ya usan tanque_atk/guerrero_atk -una grilla aparte con la extensión del arma-).
GRIDS.musashi_atk = [
"................................",
"..........aa......aa...........",
".........aaaa....aaaa.........n",
"........aaaaaaaaaaaaaaa......nn",
".......aaaaaaaaaaaaaaaaa....nn.",
".......aassssssssssssaa....nn..",
".......aassssssssssssaa...nn...",
".......aasseessssseesaa..nn....",
"........assssssssssssaa.nn.....",
"........aassqqqqqqssaa.nn......",
".........aassssssssaa.nn.......",
"..........aassssssaann.........",
"...........aatttaann...........",
"..........bbbcccbbnn...........",
".........bbbcccccbnn...........",
"........bbbccdddccbnn..........",
".......bbbccdddddccnn..........",
".......bbccccccccccnn..........",
".......bccccccccccnnb..........",
".......brrrrrrrrrrnrb..........",
".......brrrrrrrrrrrrb..........",
".......bbccccccccccbb..........",
".......sbc.........cbs.........",
"........bb.........bb..........",
".......gg...........gg.........",
".......gg...........gg.........",
".......ll...........ll.........",
".......ll...........ll.........",
".......ll...........ll.........",
".......ll...........ll.........",
".......mm...........mm.........",
"................................",
];
PAL.musashi = {
  a:"#171018", s:"#d6a878", e:"#241812", q:"#6b4a34",
  b:"#5aa8d8", c:"#3d7fb0", d:"#245878", n:"#a88248",
  r:"#7a2020", g:"#2a2a30", l:"#1c1c20", m:"#7a5a30", t:"#b8845c"
};

// Sylva, La Cazadora del Bosque: reusa temporalmente la silueta esbelta del Asesino (mismo
// patrón ya usado 3 veces en este roster para arrancar un campeón nuevo sin arte propio de
// respaldo) con paleta verde bosque/cuero. Es solo el RESPALDO silencioso: la imagen principal
// es su sprite real (SYLVA_REAL_IMG, ver más abajo), esto solo se ve si algo no cargara.
PAL.cazadora = {a:"#0d140d", b:"#3a5a34", c:"#5c8a52", d:"#24391f", e:"#c9a876", f:"#8a6a3a", g:"#2e4a2a", h:"#16220f", i:"#101a0c", j:"#5c3a1e", k:"#8a5a2e", l:"#a87840", m:"#c99a68", n:"#e8d8b8", o:"#7a9a68", p:"#3e5a34"};
GRIDS.cazadora = GRIDS.guerrero;

// Nigromante: mismo patrón de respaldo silencioso (reuso de silueta + paleta nueva) — la imagen
// principal es su sprite real (NIGRO_IMG, ver más abajo), esto solo se ve si algo no cargara.
PAL.nigromante = {a:"#0a0f0c", b:"#243024", c:"#3a4a3a", d:"#141c14", e:"#50e68c", f:"#2a8a5a", g:"#1c2a1c", h:"#0e140e", i:"#0a0c0a", j:"#3a2a1e", k:"#5a4a2e", l:"#7a6840", m:"#8ea87a", n:"#c8e8d8", o:"#4a6a5a", p:"#243a30"};
GRIDS.nigromante = GRIDS.guerrero;
// El Libertador / Eren: mismo respaldo silencioso (su arte real es CHAMP_PACK.libertador / .eren).
PAL.libertador = Object.assign({}, PAL.nigromante, {b:"#1c2a5a", c:"#2f4f9a", d:"#141c3a", e:"#f0e0b0", f:"#c8a040", g:"#1a2440"});
GRIDS.libertador = GRIDS.guerrero;
PAL.eren = Object.assign({}, PAL.nigromante, {b:"#3a4a2a", c:"#5a6a3a", d:"#2a3420", e:"#e0d0c0", f:"#8a4a2e", g:"#2e3a22"});
GRIDS.eren = GRIDS.guerrero;

// El Segador Olvidado reutiliza la silueta del Asesino (misma malla de píxeles) con una paleta
// propia oscura y roja: armadura pesada de hierro ennegrecido y ojos/aura carmesí. Es un
// compromiso deliberado -las referencias que se subieron tenían la armadura casi del mismo
// tono que su propio fondo, así que la limpieza automática de transparencia no era confiable-
// pero mantiene la identidad visual pedida (armadura oscura, ojos rojos, espadón) con
// transparencia 100% limpia, igual que el resto del roster.
GRIDS.segador = GRIDS.guerrero;
GRIDS.segador_atk = GRIDS.guerrero_atk;
GRIDS.axiom = GRIDS.guerrero;
GRIDS.axiom_atk = GRIDS.guerrero_atk;

GRIDS.mago = [
".............abbbba.............",
".............abbbba.............",
".............abcbba.....aaaa....",
"............aabbcbaa...adccda...",
"...........aeeeeeeeea..adffda...",
".........aaggggggggggaaadffda...",
"........ahhhhhhhhhhhhhhadffda...",
"........ahhhhhhhhhhhhhhadddda...",
"........aaaaaaaaaaaaaaaaaiia....",
".........aaaajjjjjjaaaa.akia....",
"............ajajjaja....aiia....",
"............ajjjjjja....aiia....",
"...........aallllllaa...akia....",
"..........abbeeeeeehha..aiia....",
"..........abbeeeeeehha..aiia....",
"........aaabbmmnnmmhhaaaakia....",
".......abbmmbmmnnmmhmmhhaiia....",
".......abbmmbmeonemhmmhhaiia....",
".......abbmmbmennemhmmhhakia....",
".......abbmmbmennemhmmhhaiia....",
".......abbmmkkkcgkkkmmhhaiia....",
".......abbmmkkkggkkkmmhhakia....",
".......ajjjjbmennemhjjjjaiia....",
".......ajjjjbmeonemhjjjjaiia....",
".......ajjjjbmennemhjjjjakia....",
"........aaabbmmnnmmhhaaaaiia....",
".........aabbmmnnmmhhaa.aiia....",
"........abbbbbeeeehhhhhaakia....",
".......aebbbbbeeeehhhhheaaa.....",
".......aebbbbbeeeehhhhhea.......",
"........abbbbbeeeehhhhha........",
"........abbbbbeeeehhhhha........",
];
GRIDS.mago_atk = [
".............abbbba.............",
".............abbbba.............",
".............abcbba.............",
"............aabbcbaa............",
"...........aeeeeeeeea...........",
".........aaggggggggggaa.........",
"........ahhhhhhhhhhhhhh.........",
"........ahhhhhhhhhhhhhh.........",
"........aaaaaaaaaaaaaaa.........",
".........aaaajjjjjjacaa..c......",
"............ajajjajaddddddia....",
"............ajjjjjjadffffdia....",
"...........aalllllladffffdia....",
"..........abbeeeeeehdffffdia....",
"..........abbeeeeeehddddddia....",
"........aaabbmmnnmmhddddddia....",
".......abbmmbmmnnmmhmmghaiia....",
".......abbmmbmeonemhmmhgaiia....",
".......abbmmbmennemhmmhhakia....",
".......abbmmbmennemhmmhhaiia....",
".......abbmmkkkcgkkkmmhhaiia....",
".......abbmmkkkggkkkmmhhakia....",
".......ajjjjbmennemhjjjjaiia....",
".......ajjjjbmeonemhjjjjaiia....",
".......ajjjjbmennemhjjjjakia....",
"........aaabbmmnnmmhhaaaaiia....",
".........aabbmmnnmmhhaa.aiia....",
"........abbbbbeeeehhhhhaakia....",
".......aebbbbbeeeehhhhheaaa.....",
".......aebbbbbeeeehhhhhea.......",
"........abbbbbeeeehhhhha........",
"........abbbbbeeeehhhhha........",
];

GRIDS.soporte = [
"................................",
"................................",
"............aaaaaaaa............",
"...........abbbbbbbba..aaaaaa...",
"...........abbbbbbbba.accdccca..",
"...........aeeffffbba.acddddca..",
"...........aeeggggbba.acddddca..",
"...........aehahhahba.acddddca..",
"...........aehhhhhhba.acccdcca..",
"...........aeiiiiiiba.acccccca..",
"...........aeiiiiiiba..aajjaa...",
"..........akkkllllkkka..ajja....",
"..........akkkllllkkka..amja....",
"..........annoolloobba..ajja....",
"........aaannoolloobbaaaajja....",
".......akkllnonllnobllppamja....",
".......akkllnonplnobllppajja....",
".......akkllnonllnobllppajja....",
".......akkllnonllnobllppamja....",
".......akkllnonlpnobllppajja....",
".......akkllqqqkkqqqllppajja....",
".......ahhhhqqqkkqqqhhhhamja....",
".......ahhhhnonplnobhhhhajja....",
".......ahhhhnonllnobhhhhajja....",
"........aaannoolloobbaaaamja....",
".........aannoolloobbaa.ajja....",
"........annnnnnnnnbbbbbaajja....",
".......annnnnnnnnnbbbbbnamja....",
".......annnnnnnnnnbbbbbnajja....",
"........akkkkkkkkkkkkkka.aa.....",
"........akkkkkkkkkkkkkka........",
"........akkkkkkkkkkkkkka........",
];
GRIDS.soporte_atk = [
"................................",
"................................",
"............aaaaaaaa............",
"...........abbbbbbbba..aaaaaa...",
"...........abbbbbbbba.a......a..",
"...........aeeffffbba.a......a..",
"...........aeeggggbba.a......a..",
"...........aehahhahba.a......a..",
"...........aehhhhhhba.a......a..",
"...........aeiiiiiibd.a..d...a..",
"...........aeiiiiiibccccccjaa...",
"..........akkkllllkkcddddcja....",
"..........akkkllllkkcddddcja....",
"..........annoolloobcddddcja....",
"........aaannoolloobccccccja....",
".......akkllnonllnobccccccja....",
".......akkllnonplnobllcpajja....",
".......akkllnonllnobllpcajja....",
".......akkllnonllnobllppamja....",
".......akkllnonlpnobllppajja....",
".......akkllqqqkkqqqllppajja....",
".......ahhhhqqqkkqqqhhhhamja....",
".......ahhhhnonplnobhhhhajja....",
".......ahhhhnonllnobhhhhajja....",
"........aaannoolloobbaaaamja....",
".........aannoolloobbaa.ajja....",
"........annnnnnnnnbbbbbaajja....",
".......annnnnnnnnnbbbbbnamja....",
".......annnnnnnnnnbbbbbnajja....",
"........akkkkkkkkkkkkkka.aa.....",
"........akkkkkkkkkkkkkka........",
"........akkkkkkkkkkkkkka........",
];
// La Profeta usa sprites reales (PROFETA_ATLAS, ver drawProfetaAtlas) para TODO su dibujo en
// juego -este procedural nunca llega a mostrarse-, pero buildSprites() igual arma un sprite
// de respaldo para cada clase sin excepción, así que necesita paleta/grilla propias para no
// romper: mismo criterio placeholder que ya usa Axiom (reutiliza otra silueta ya existente en
// vez de dibujar una grilla nueva que jamás se ve).
PAL.profeta = PAL.soporte;
GRIDS.profeta = GRIDS.soporte;
GRIDS.profeta_atk = GRIDS.soporte_atk;

GRIDS.esqueleto = [
".....kkkkkk.....",
"....kaaabbbk....",
"....kagabgbk....",
"....kaaggbbk....",
"......kbbk......",
"....kaaabbbkmk..",
".kkk.kaaaak.mk..",
".hqr.kkcckk.sl..",
".rnr.kaaaak.mk..",
".rrq.kkcckk.mk..",
".kkk.kbbbbk.nn..",
"................",
"................",
".....kbkkak.....",
".....kbkkak.....",
".....kkkkkk....."
];

GRIDS.esqueleto_atk = [
".....kkkkkk.....",
"....kaaabbbk....",
"....kagabgbk....",
"....kaaggbbk....",
"......kbbk......",
"....kaaabbbk....",
".kkk.kaaaakmmmmm",
".hqr.kkcckksmmmm",
".rnr.kaaaakn....",
".rrq.kkcckk.....",
".kkk.kbbbbk.....",
"................",
"................",
".....kbkkak.....",
".....kbkkak.....",
".....kkkkkk....."
];

GRIDS.zombie = [
".....nnnnnn.....",
"....kaaaccck....",
"....kaaacvck....",
"....kagacgck....",
"....kadkddak....",
"...kaaaaaaaak...",
".aaaccccbbbbbbb.",
".aaacwccbbbbbbb.",
".aaaccccbbbbbbb.",
".saaccccvbbbbsb.",
".kkkccccbvbbkkk.",
"...kccccbbbbk...",
"...knnnnnnnnk...",
"....kbk..kak....",
"....kbk..kak....",
"....kkk..kkk...."
];

GRIDS.zombie_atk = [
".....nnnnnn.....",
"....kaaaccck....",
"....kaaacvck....",
"....kagacgck....",
"....kadkddak....",
"aaaaaaaaaaaabbbb",
"saaaccccbbbbbbbb",
"kkkkcwccbbbbkkkk",
"...kccccbbbbk...",
"...kccccvbbbk...",
"...kccccbvbbk...",
"...kccccbbbbk...",
"...knnnnnnnnk...",
"....kbk..kak....",
"....kbk..kak....",
"....kkk..kkk...."
];

GRIDS.esqueleto_h = [
"...aa......aa...",
"...aakkkkkkaa...",
"...bkaaabbbkb...",
"....kagabgbk....",
"....kaaggbbk....",
"......kbbk......",
"....kaaabbbkmk..",
".kkk.kaaaak.mk..",
".hqr.kkcckk.sl..",
".rnr.kaaaak.mk..",
".rrq.kkcckk.mk..",
".kkk.kbbbbk.nn..",
"................",
".....kbkkak.....",
".....kbkkak.....",
".....kkkkkk....."
];

GRIDS.esqueleto_h_atk = [
"...aa......aa...",
"...aakkkkkkaa...",
"...bkaaabbbkb...",
"....kagabgbk....",
"....kaaggbbk....",
"......kbbk......",
"....kaaabbbk....",
".kkk.kaaaakmmmmm",
".hqr.kkcckksmmmm",
".rnr.kaaaakn....",
".rrq.kkcckk.....",
".kkk.kbbbbk.....",
"................",
".....kbkkak.....",
".....kbkkak.....",
".....kkkkkk....."
];

GRIDS.demonio_menor = [
"...bb......bb...",
"...bbkkkkkkbb...",
"....kccabbbk....",
"....kcgabgbk....",
"....kaaddbbk....",
"....kammmmbk....",
"...kcccaaaaak...",
"..akkcccbbbkkb..",
"..akkrrrrrrkmb..",
"..akkrrrrrrknn..",
"..kckcccbbbknn..",
"....kqqqqqqknn..",
"....kbk..kdk....",
"....kbk..kdk....",
"....kbk..kdk....",
"....kkk..kkk...."
];

GRIDS.demonio_menor_atk = [
"...bb......bb...",
"...bbkkkkkkbb...",
"....kccabbbk....",
"....kcgabgbk....",
"....kaaddbbk.mmm",
"....kammmmbnnmmm",
"...kcccaaaannmmm",
"....kcccbbbk....",
"..akkrrrrrrk....",
"..kkkrrrrrrk....",
"....kcccbbbk....",
"....kqqqqqqk....",
"....kbk..kdk....",
"....kbk..kdk....",
"....kbk..kdk....",
"....kkk..kkk...."
];

GRIDS.golem = [
"................",
".....gggggg.....",
".....gbaaag.....",
".....gbnnag.....",
".....gbbbbg.....",
".gggggggggggggg.",
".gccccccaaaaaag.",
"ggccccccabbbbbgg",
"bbccmmmcabbbnbaa",
"bbccmmmcadddbbaa",
"bbcnccccadddbbaa",
"bbccccccabbbbbaa",
"gggcccccabbbbggg",
"bbbgaaaggbbbgaaa",
"bbbgaaaggbbbgaaa",
"...gggggggggg..."
];

GRIDS.golem_atk = [
"................",
".....gggggg.....",
".....gbaaag.....",
".....gbnnag.....",
".....gbbbbg.gggg",
".ggggggggggggaaa",
".gccccccaaaagaaa",
".gccccccabbbgaaa",
"ggccmmmcabbbnbg.",
"bbccmmmcadddbbg.",
"bbcnccccadddbbg.",
"bbccccccabbbbbg.",
"gggcccccabbbbbg.",
"bbbgaaaggbbbg...",
"bbbgaaaggbbbg...",
"...gggggggggg..."
];

GRIDS.demonio_mago = [
"..hh.......gwwg.",
"..hhdddddddgwwg.",
"...nkssstttgwwg.",
"....ksgstgtgggg.",
"....kssstttkmm..",
"....ksswwsskmm..",
"..kccccaaaaamm..",
"..kccccaabbbmm..",
"..kccccqabbbmm..",
"..kccccrrbbbmm..",
"..kccccaqbbbmm..",
"..krrrrrrrrrmm..",
"..kccccaabbbmm..",
"..kccccaabbbmm..",
"...kkk.kk.kkk...",
"................"
];

GRIDS.demonio_mago_atk = [
"..hh........hh..",
"..hhddddddddhh..",
"...nkssstttkn...",
"....ksgstgtk....",
"....kssstttk.ggg",
"....ksswwssk.gww",
"..kccccaaaaaagww",
"..kccccaabbbmggg",
"..kccccqabbbmm..",
"..kccccrrbbbmm..",
"..kccccaqbbbmm..",
"..krrrrrrrrrmm..",
"..kccccaabbbmm..",
"..kccccaabbbmm..",
"...kkk.kk.kkk...",
"................"
];

GRIDS.demonio_mayor = [
"....mm....mm....",
"....mkkkkkkm....",
"....lkaacckl....",
".....kgacgk.....",
".....kaacck.....",
".rrrrrawwarrrrr.",
".rppppkaakppppr.",
".rpqqqkaakqqqpr.",
".rpqqqkfakqqqpr.",
".rpqqqkafkqqqpr.",
".rpqqqkaakqqqpr.",
".rpqqqkaakqqqpr.",
".rppppddddppppr.",
".rrrrrakkbrrrrr.",
"......akkb......",
"......kkkk......"
];

GRIDS.demonio_mayor_atk = [
"....mm....mm....",
"....mkkkkkkm....",
"rrrrrraaccrrrrrr",
"rpppppgacgpppppr",
"rpqqqqaaccqqqqpr",
"rpqqqqkddkqqqqpr",
"rpqqqqkaakqqqqpr",
"rpqqqqkaakqqqqpr",
"rpppppkfakpppppr",
"rrrrrrkafkrrrrrr",
"......kaak......",
"......kaak......",
"......dddd......",
"......akkb......",
"......akkb......",
"......kkkk......"
];

function normalizeGrid(rows){
  return rows.map(r=>{
    r = String(r);
    if(r.length < SPR) r = r + ".".repeat(SPR-r.length);
    return r.slice(0, SPR);
  });
}
Object.keys(GRIDS).forEach(k=> GRIDS[k] = normalizeGrid(GRIDS[k]));
