"use strict";
/* GENERADO por tools/art/hielo_jefes/build.py (no editar a mano).
   Atlas de las hojas de jefes de art-source/hielo_jefes/ y sus efectos. */
const BOSS_SHEET_ATLAS = {
  mago_hielo_cristal: {src:"assets/sprites/bosses/hielo/mago_hielo_cristal/v2/atlas.png", hMul:2.7, meta:{"w":120,"h":102,"cols":8,"refH":95,"anchor":0.9804,"sets":{"idle":[0,1,2,1],"walk":[3,4,5,6,7],"atk":[8,9,10],"hit":[11],"death":[12,13,14],"cast":[15,16,17,18],"nova":[19,11,20],"canal":[21,22,23,24],"encase":[25,26,27,28],"muro":[29,30,31]}}},
  angel_caido_hielo: {src:"assets/sprites/bosses/hielo/angel_caido_hielo/v2/atlas.png", hMul:2.3, meta:{"w":159,"h":130,"cols":8,"refH":95,"anchor":0.9846,"sets":{"idle":[0,1,2,1],"walk":[3,4,5,6,7],"atk":[8,9,10],"hit":[11],"death":[12,13,14,15,16,17,18,19],"cast":[20,21,22,23],"fly":[24,25,26,27],"wing":[28,29,30],"storm":[31,32,33,34],"transf":[35,36,37,38,39],"aura":[40,41,42,43],"freeze":[44,45,46],"recov":[11,47,48,49]}}},
  jinete_sin_cabeza: {src:"assets/sprites/bosses/bosque/jinete_sin_cabeza/v2/atlas.png", hMul:2.2, meta:{"w":82,"h":74,"cols":8,"refH":73,"anchor":0.973,"sets":{"idle":[0,1],"walk":[0,1,2,3],"atk":[4,5,6],"hit":[2],"death":[7,8,9,10,11],"front":[12,13,14]}}},
  dragon_hielo: {src:"assets/sprites/enemies/hielo/dragon_hielo/v2/atlas.png", hMul:1.9, meta:{"w":124,"h":93,"cols":8,"refH":57,"anchor":0.9785,"sets":{"idle":[0,1],"walk":[0,1,2,3],"atk":[4,5,6],"hit":[2],"death":[7,8,9,10,11],"front":[12,13]}}},
  golem_cristal: {src:"assets/sprites/enemies/hielo/golem_cristal/atlas.png", hMul:2.6, meta:{"w":93,"h":101,"cols":8,"refH":77,"anchor":0.9802,"sets":{"idle":[0,1],"walk":[2,3,4,5],"atk":[6,7,8,9],"hit":[10],"death":[11,12,13,14,15],"stomp":[16,17,18,19],"throw":[20,21],"charge":[22,23,24]}}},
  cristal_servo: {src:"assets/sprites/enemies/hielo/cristal_servo/atlas.png", hMul:2.6, meta:{"w":57,"h":74,"cols":8,"refH":71,"anchor":0.973,"sets":{"idle":[0,1,2],"walk":[3,4,5,6],"atk":[7,8],"hit":[9],"death":[10,11,12]}}},
  cristal_volador: {src:"assets/sprites/enemies/hielo/cristal_volador/atlas.png", hMul:2.4, meta:{"w":72,"h":105,"cols":8,"refH":72,"anchor":0.981,"sets":{"idle":[0,1,2],"walk":[3,4,5,6],"atk":[7,8,9,10],"hit":[0],"death":[11,12,13,14]}}},
};
const BOSS_SHEET_FX = {
  bsMagoLance: {ground:false, srcs:["assets/vfx/bosses/hielo/bsMagoLance_0.png", "assets/vfx/bosses/hielo/bsMagoLance_1.png", "assets/vfx/bosses/hielo/bsMagoLance_2.png", "assets/vfx/bosses/hielo/bsMagoLance_3.png", "assets/vfx/bosses/hielo/bsMagoLance_4.png", "assets/vfx/bosses/hielo/bsMagoLance_5.png"]},
  bsMagoBurst: {ground:false, srcs:["assets/vfx/bosses/hielo/bsMagoBurst_0.png", "assets/vfx/bosses/hielo/bsMagoBurst_1.png", "assets/vfx/bosses/hielo/bsMagoBurst_2.png"]},
  bsMagoRune: {ground:true, srcs:["assets/vfx/bosses/hielo/bsMagoRune_0.png", "assets/vfx/bosses/hielo/bsMagoRune_1.png"]},
  bsMagoImpact: {ground:false, srcs:["assets/vfx/bosses/hielo/bsMagoImpact_0.png", "assets/vfx/bosses/hielo/bsMagoImpact_1.png", "assets/vfx/bosses/hielo/bsMagoImpact_2.png"]},
  bsMagoWall: {ground:false, srcs:["assets/vfx/bosses/hielo/bsMagoWall_0.png", "assets/vfx/bosses/hielo/bsMagoWall_1.png", "assets/vfx/bosses/hielo/bsMagoWall_2.png", "assets/vfx/bosses/hielo/bsMagoWall_3.png"]},
  bsMagoCrystal: {ground:false, srcs:["assets/vfx/bosses/hielo/bsMagoCrystal_0.png", "assets/vfx/bosses/hielo/bsMagoCrystal_1.png", "assets/vfx/bosses/hielo/bsMagoCrystal_2.png", "assets/vfx/bosses/hielo/bsMagoCrystal_3.png"]},
  bsAngelNova: {ground:false, srcs:["assets/vfx/bosses/hielo/bsAngelNova_0.png", "assets/vfx/bosses/hielo/bsAngelNova_1.png", "assets/vfx/bosses/hielo/bsAngelNova_2.png", "assets/vfx/bosses/hielo/bsAngelNova_3.png"]},
  bsAngelPillar: {ground:false, srcs:["assets/vfx/bosses/hielo/bsAngelPillar_0.png", "assets/vfx/bosses/hielo/bsAngelPillar_1.png", "assets/vfx/bosses/hielo/bsAngelPillar_2.png", "assets/vfx/bosses/hielo/bsAngelPillar_3.png", "assets/vfx/bosses/hielo/bsAngelPillar_4.png", "assets/vfx/bosses/hielo/bsAngelPillar_5.png"]},
  bsAngelRune: {ground:true, srcs:["assets/vfx/bosses/hielo/bsAngelRune_0.png", "assets/vfx/bosses/hielo/bsAngelRune_1.png", "assets/vfx/bosses/hielo/bsAngelRune_2.png"]},
  bsAngelBurst: {ground:false, srcs:["assets/vfx/bosses/hielo/bsAngelBurst_0.png", "assets/vfx/bosses/hielo/bsAngelBurst_1.png", "assets/vfx/bosses/hielo/bsAngelBurst_2.png", "assets/vfx/bosses/hielo/bsAngelBurst_3.png", "assets/vfx/bosses/hielo/bsAngelBurst_4.png"]},
  bsAngelImpact: {ground:false, srcs:["assets/vfx/bosses/hielo/bsAngelImpact_0.png", "assets/vfx/bosses/hielo/bsAngelImpact_1.png", "assets/vfx/bosses/hielo/bsAngelImpact_2.png", "assets/vfx/bosses/hielo/bsAngelImpact_3.png"]},
  bsAngelWalls: {ground:false, srcs:["assets/vfx/bosses/hielo/bsAngelWalls_0.png", "assets/vfx/bosses/hielo/bsAngelWalls_1.png", "assets/vfx/bosses/hielo/bsAngelWalls_2.png", "assets/vfx/bosses/hielo/bsAngelWalls_3.png", "assets/vfx/bosses/hielo/bsAngelWalls_4.png", "assets/vfx/bosses/hielo/bsAngelWalls_5.png"]},
};
