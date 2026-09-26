"use strict";
/* GENERADO por tools/art/skins_sets/extract.py (no editar a mano).
   Skins de set completo: atlas con el mismo formato que el del campeón base (CHAMP_PACK).
   SET_SKINS[set].packs remapea la clave del atlas base a la de la skin (ver set-effects.js). */
champPackLoadAtlas("skin_manada", "assets/sprites/champions/cazadora/skins/manada/atlas.png", {"w":76,"h":61,"cols":8,"refH":57,"anchor":0.9672,"sets":{"idle_down":[0],"walk_down":[6,12],"attack_down":[0,18,18],"cast_down":[0,24,24],"hit_down":[30],"idle_side":[2],"walk_side":[8,14],"attack_side":[2,20,20],"cast_side":[2,26,26],"hit_side":[32],"idle_left":[5],"walk_left":[11,17],"attack_left":[5,23,23],"cast_left":[5,29,29],"hit_left":[35],"idle_up":[4],"walk_up":[10,16],"attack_up":[4,22,22],"cast_up":[4,28,28],"hit_up":[34],"death_down":[36,37,38,39,40,41],"run":[8,14],"aim":[26]}});
champPackLoadAtlas("skin_errante", "assets/sprites/champions/musashi/skins/errante/atlas.png", {"w":76,"h":66,"cols":8,"refH":56,"anchor":0.9697,"sets":{"idle_down":[0],"walk_down":[6,12],"attack_down":[0,18,18],"cast_down":[0,24,24],"hit_down":[30],"idle_side":[2],"walk_side":[8,14],"attack_side":[2,20,20],"cast_side":[2,26,26],"hit_side":[32],"idle_left":[5],"walk_left":[11,17],"attack_left":[5,23,23],"cast_left":[5,29,29],"hit_left":[35],"idle_up":[4],"walk_up":[10,16],"attack_up":[4,22,22],"cast_up":[4,28,28],"hit_up":[34],"death_down":[36,37,38,39,40,41],"run":[8,14]}});
champPackLoadAtlas("skin_legion", "assets/sprites/champions/eren/skins/legion/atlas.png", {"w":71,"h":71,"cols":8,"refH":54,"anchor":0.9718,"sets":{"idle_down":[0],"walk_down":[6,12],"attack_down":[0,18,18],"cast_down":[0,24,24],"hit_down":[30],"idle_side":[2],"walk_side":[8,14],"attack_side":[2,20,20],"cast_side":[2,26,26],"hit_side":[32],"idle_left":[5],"walk_left":[11,17],"attack_left":[5,23,23],"cast_left":[5,29,29],"hit_left":[35],"idle_up":[4],"walk_up":[10,16],"attack_up":[4,22,22],"cast_up":[4,28,28],"hit_up":[34],"death_down":[36,37,38,39,40,41],"run":[8,14],"hook_prep":[2,26],"hook_launch":[20],"hook_fly":[8,14],"hook_slash":[20,20],"hook_land":[2],"instinct":[2,26,26],"advance":[8,14],"bite":[2,26,26],"exhausted":[30,30],"aim":[26]}});
champPackLoadAtlas("skin_legion_titan", "assets/sprites/champions/eren/skins/legion/titan.png", {"w":110,"h":53,"cols":8,"refH":51,"anchor":0.9623,"sets":{"idle_down":[0,1,2],"walk_down":[6,7,8],"walk_side":[6,7,8],"walk_up":[6,7,8],"atk":[12,13,14,15],"sismo":[20,21,22,23,24],"terremoto":[25,26,27,28],"retumbar":[16,17,18,19],"roar":[0],"tf":[37,38,39,40,41],"hit_down":[29,30,31],"death_down":[33,34,35,36]}});
champPackLoadAtlas("skin_sistema", "assets/sprites/champions/axiom/skins/sistema/atlas.png", {"w":69,"h":64,"cols":8,"refH":60,"anchor":0.9688,"sets":{"idle_down":[0],"walk_down":[11],"attack_down":[0,17,17],"hit_down":[23],"idle_side":[2],"walk_side":[7,13],"attack_side":[2,19,19],"idle_left":[5],"walk_left":[10,16],"attack_left":[5,22,22],"hit_left":[27],"idle_up":[4],"walk_up":[9,15],"attack_up":[4,21,21],"hit_up":[26],"death_down":[28,29,30,31,32,33],"run":[7,13]}});
Object.assign(SET_SKINS, {
 "manada": {
  "champ": "cazadora",
  "name": "Sylva, Flecha de Fuego",
  "src": "assets/sprites/champions/cazadora/skins/manada/preview.png",
  "preview": "assets/sprites/champions/cazadora/skins/manada/preview.png",
  "packs": {
   "cazadora": "skin_manada"
  }
 },
 "errante": {
  "champ": "musashi",
  "name": "Musashi, Samurái Legendario",
  "src": "assets/sprites/champions/musashi/skins/errante/preview.png",
  "preview": "assets/sprites/champions/musashi/skins/errante/preview.png",
  "packs": {
   "musashi": "skin_errante"
  }
 },
 "legion": {
  "champ": "eren",
  "name": "Eren, Titán Bestia",
  "src": "assets/sprites/champions/eren/skins/legion/preview.png",
  "preview": "assets/sprites/champions/eren/skins/legion/preview.png",
  "packs": {
   "eren": "skin_legion",
   "eren_titan": "skin_legion_titan"
  }
 },
 "sistema": {
  "champ": "axiom",
  "name": "Axiom, Skin Z · Realidad Corrupta",
  "src": "assets/sprites/champions/axiom/skins/sistema/preview.png",
  "preview": "assets/sprites/champions/axiom/skins/sistema/preview.png",
  "packs": {
   "axiom": "skin_sistema"
  }
 }
});
