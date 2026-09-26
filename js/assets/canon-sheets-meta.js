"use strict";
/* GENERADO por tools/art/pack_canon/build.py (no editar a mano). Canon elegido en
   LA_HORDA_SPRITE_CANON.md; se suma a los atlas de las hojas de jefes. */
Object.assign(BOSS_SHEET_ATLAS, {
  minotauro: {src:"assets/sprites/bosses/laberinto/minotauro/v3/atlas.png", hMul:2.7, meta:{"w":146,"h":91,"cols":8,"refH":72,"anchor":0.978,"sets":{"idle":[0,1,2,3],"walk":[4,5,6,7],"walk_down":[0,1,2,3],"walk_up":[8,9,10,11],"atk":[12,13,14,15],"hit":[16,17],"death":[18,19,20,21],"run":[22,23,24,25],"heavy":[26,27,28,29],"seismic":[30,31,32,33],"charge":[34,35,36,37]}}},
  dragoncito_hielo: {src:"assets/sprites/enemies/hielo/dragoncito_hielo/v2/atlas.png", hMul:3.2, meta:{"w":94,"h":104,"cols":8,"refH":81,"anchor":0.9808,"sets":{"idle":[0,1,2,3],"walk":[0,1,2,3],"walk_down":[4,5,6,7],"walk_up":[8,9,10,11],"atk":[12,13],"hit":[14,15],"death":[16,17,18,19]}}},
  angel_hielo: {src:"assets/sprites/enemies/hielo/angel_hielo/v2/atlas.png", hMul:3.0, meta:{"w":125,"h":122,"cols":8,"refH":104,"anchor":0.9836,"sets":{"idle":[0,1,2,3],"walk":[4,5,6,7],"walk_down":[0,1,2,3],"walk_up":[8,9,10,11],"atk":[12,13],"cast":[14,15,16],"hit":[17,18],"death":[19,20,21,22]}}},
  enjambre_hadas: {src:"assets/sprites/enemies/bosque/enjambre_hadas/v2/atlas.png", hMul:2.8, meta:{"w":205,"h":80,"cols":8,"refH":79,"anchor":0.975,"sets":{"idle":[0,1,2,3],"walk":[0,1,2,3],"atk":[4,5],"hit":[6],"death":[7,8,9,10]}}},
  cu_sith: {src:"assets/sprites/enemies/bosque/cu_sith/v2/atlas.png", hMul:2.3, meta:{"w":129,"h":79,"cols":8,"refH":60,"anchor":0.9747,"sets":{"idle":[0,1],"walk":[0,1,2,3],"atk":[4,5],"hit":[6],"death":[7,8,9,10]}}},
  golem: {src:"assets/sprites/enemies/infernal/golem/v2/atlas.png", hMul:2.6, meta:{"w":86,"h":84,"cols":8,"refH":58,"anchor":0.9762,"sets":{"idle":[0,1,2,3],"walk":[0,1,2,3],"atk":[4],"hit":[0],"death":[5,6,7,8]}}},
  golem_piedra: {src:"assets/sprites/enemies/laberinto/golem_piedra/v2/atlas.png", hMul:2.6, meta:{"w":96,"h":72,"cols":8,"refH":64,"anchor":0.9722,"sets":{"idle":[0,1],"walk":[0,1,2,3,4],"atk":[5,6],"hit":[0],"death":[0]}}},
});
Object.assign(BOSS_SHEET_FX, {
  csMinoWave: {ground:true, srcs:["assets/vfx/bosses/laberinto/csMinoWave_0.png"]},
  csMinoAxe: {ground:false, srcs:["assets/vfx/bosses/laberinto/csMinoAxe_0.png"]},
  csMinoDust: {ground:false, srcs:["assets/vfx/bosses/laberinto/csMinoDust_0.png", "assets/vfx/bosses/laberinto/csMinoDust_1.png"]},
  csMinoTrail: {ground:true, srcs:["assets/vfx/bosses/laberinto/csMinoTrail_0.png"]},
  csMinoRage: {ground:false, srcs:["assets/vfx/bosses/laberinto/csMinoRage_0.png"]},
  csDragoncitoShot: {ground:false, srcs:["assets/vfx/enemies/hielo/csDragoncitoShot_0.png", "assets/vfx/enemies/hielo/csDragoncitoShot_1.png", "assets/vfx/enemies/hielo/csDragoncitoShot_2.png"]},
  csDragoncitoHit: {ground:false, srcs:["assets/vfx/enemies/hielo/csDragoncitoHit_0.png", "assets/vfx/enemies/hielo/csDragoncitoHit_1.png"]},
  csAngelShot: {ground:false, srcs:["assets/vfx/enemies/hielo/csAngelShot_0.png", "assets/vfx/enemies/hielo/csAngelShot_1.png"]},
  csAngelNova: {ground:false, srcs:["assets/vfx/enemies/hielo/csAngelNova_0.png"]},
  csHadaShot: {ground:false, srcs:["assets/vfx/enemies/bosque/csHadaShot_0.png", "assets/vfx/enemies/bosque/csHadaShot_1.png"]},
  csHadaBurst: {ground:false, srcs:["assets/vfx/enemies/bosque/csHadaBurst_0.png"]},
  csGolemFireShot: {ground:false, srcs:["assets/vfx/enemies/infernal/csGolemFireShot_0.png"]},
  csGolemFireHit: {ground:false, srcs:["assets/vfx/enemies/infernal/csGolemFireHit_0.png"]},
  csRockImpact: {ground:true, srcs:["assets/vfx/enemies/laberinto/csRockImpact_0.png", "assets/vfx/enemies/laberinto/csRockImpact_1.png", "assets/vfx/enemies/laberinto/csRockImpact_2.png"]},
});
const ENEMY_PROJ_SPRITE = {"dragoncito_hielo": "csDragoncitoShot", "angel_hielo": "csAngelShot", "enjambre_hadas": "csHadaShot", "cristal_volador": "bsMagoLance"};
