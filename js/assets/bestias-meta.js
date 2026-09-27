"use strict";
/* GENERADO por tools/art/hoja_bestias/build.py (no editar a mano). Hoja IMG 1-3 del equipo:
   Hadas de Escarcha, Enjambre de Hadas (verde/rosa/oro), Cù-Sìth, muertes del Laberinto y efectos.
   Va DESPUÉS de canon-sheets-meta.js y ANTES de boss-sheets.js (que carga BOSS_SHEET_ATLAS). */
Object.assign(BOSS_SHEET_ATLAS, {
  hada_escarcha: {"src":"assets/sprites/enemies/hielo/hada_escarcha/atlas.png","hMul":2.9,"meta":{"w":53,"h":82,"cols":8,"refH":64,"anchor":0.9756,"sets":{"idle":[0,1,2,1],"walk":[0,1,2,1],"atk":[2,0],"hit":[1],"death":[3,4,5,6]}}},
  enjambre_hadas: {"src":"assets/sprites/enemies/bosque/enjambre_hadas/v3/atlas.png","hMul":2.8,"meta":{"w":55,"h":56,"cols":8,"refH":43,"anchor":0.9643,"sets":{"idle":[0,1,2,3],"walk":[0,1,2,3],"atk":[2,0],"hit":[1],"death":[0,4,5,6]}}},
  enjambre_hadas_rosa: {"src":"assets/sprites/enemies/bosque/enjambre_hadas/v3/atlas.png","hMul":2.8,"meta":{"w":55,"h":56,"cols":8,"refH":43,"anchor":0.9643,"sets":{"idle":[7,8,9,10],"walk":[7,8,9,10],"atk":[9,7],"hit":[8],"death":[7,11,12,13]}}},
  enjambre_hadas_oro: {"src":"assets/sprites/enemies/bosque/enjambre_hadas/v3/atlas.png","hMul":2.8,"meta":{"w":55,"h":56,"cols":8,"refH":43,"anchor":0.9643,"sets":{"idle":[14,15,16,17],"walk":[14,15,16,17],"atk":[16,14],"hit":[15],"death":[14,18,19,20]}}},
  cu_sith: {"src":"assets/sprites/enemies/bosque/cu_sith/v3/atlas.png","hMul":2.45,"meta":{"w":109,"h":60,"cols":8,"refH":52,"anchor":0.9667,"sets":{"idle":[0,1],"walk":[0,2,1,3],"atk":[4,5],"hit":[6,7],"howl":[5],"death":[8,9,10,11]}}},
});
Object.assign(BOSS_SHEET_FX, {
  hbDragAliento: {"ground":false,"srcs":["assets/vfx/enemies/hielo/hbDragAliento_0.png","assets/vfx/enemies/hielo/hbDragAliento_1.png"]},
  hbAngelPrisma: {"ground":true,"srcs":["assets/vfx/enemies/hielo/hbAngelPrisma_0.png"]},
  hbCuMordida: {"ground":false,"srcs":["assets/vfx/enemies/bosque/hbCuMordida_0.png"]},
  hbDamaHechizo: {"ground":false,"srcs":["assets/vfx/enemies/bosque/hbDamaHechizo_0.png"]},
});
// Muertes de 4 cuadros para cuerpos que siguen con su arte de siempre (drawDeathPack).
const DEATH_PACK_META = {
  esfinge: {"src":"assets/sprites/enemies/laberinto/esfinge/muerte/atlas.png","hMul":2.55,"meta":{"w":54,"h":80,"cols":8,"refH":76,"anchor":0.975,"sets":{"death":[0,1,2,3],"walk":[0]}}},
  medusa: {"src":"assets/sprites/enemies/laberinto/medusa/muerte/atlas.png","hMul":2.5,"meta":{"w":60,"h":81,"cols":8,"refH":77,"anchor":0.9753,"sets":{"death":[0,1,2,3],"walk":[0]}}},
  druida_arena: {"src":"assets/sprites/enemies/laberinto/druida_arena/muerte/atlas.png","hMul":2.5,"meta":{"w":57,"h":91,"cols":8,"refH":87,"anchor":0.978,"sets":{"death":[0,1,2,3],"walk":[0]}}},
};
