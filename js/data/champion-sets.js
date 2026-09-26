"use strict";
/* ============================================================
   js/data/champion-sets.js
   UN SET PROPIO POR CAMPEÓN (verde, 4 piezas, solo lo puede equipar ese campeón).
   Progresión: 2 piezas = bonus útil · 3 piezas = interacción con su kit · 4 piezas (completo) =
   cambia el loop del campeón. El comportamiento vive en js/systems/champion-sets.js.
   Caen en cualquier arena (el botín es cruzado); el set del campeón que estás jugando pesa más
   (ver SET_CHAMPION_BIAS en js/systems/loot.js).
   ============================================================ */
const CHAMPION_SETS = {
  baluarte: { champion:"tanque", name:"Baluarte Inquebrantable", theme:"Tanque · masa · control", aura:"170,200,235", full:"baluarte",
    lore:"Nadie recuerda el nombre del caballero. Sí recuerdan que la horda nunca pasó de donde él estaba parado.",
    pieces:{escudo:"Pavés del Baluarte", casco:"Yelmo del Baluarte", pechera:"Coraza del Baluarte", botas:"Grebas del Baluarte"},
    thresholds:[
      {count:2, desc:"+15% vida máxima", mods:()=>[{effect:"hp_mult", value:0.15}]},
      {count:3, desc:"Tus habilidades empujan y hacen tambalear: +250 ms de aturdimiento a comunes y élites", mods:()=>[]},
      {count:4, desc:"GOLPE SÍSMICO: cada 3er golpe básico es un pisotón que daña, empuja y aturde a su alrededor. Con el Grito de Guerra activo, la onda es el doble de grande.", mods:()=>[]}
    ]},
  nocturno: { champion:"guerrero", name:"Sombra Nocturna", theme:"Asesino · sangrado · desaparecer", aura:"150,60,90", full:"nocturno",
    lore:"Los guardias hablan de una sombra que sangra. Nunca dicen de quién es la sangre.",
    pieces:{arma:"Colmillo Nocturno", casco:"Capucha Nocturna", guantes:"Guantes del Degollador", botas:"Pasos Nocturnos"},
    thresholds:[
      {count:2, desc:"+8% probabilidad de crítico", mods:()=>[{effect:"crit_chance_add", value:0.08}]},
      {count:3, desc:"Tus habilidades contra enemigos que sangran son críticos asegurados", mods:()=>[]},
      {count:4, desc:"SOMBRA LETAL: matar a un élite o subjefe te vuelve invisible 1,5 s (la horda te pierde) y reinicia Triple Golpe.", mods:()=>[]}
    ]},
  convergencia: { champion:"mago", name:"Convergencia Elemental", theme:"Mago · fuego + hielo + rayo", aura:"200,150,255", full:"convergencia",
    lore:"Tres escuelas que se odiaban. Un mago que se negó a elegir.",
    pieces:{arma:"Bastón de la Convergencia", casco:"Capucha Tricolor", pechera:"Túnica de los Tres Elementos", guantes:"Sellos Elementales"},
    thresholds:[
      {count:2, desc:"+10% daño de habilidades", mods:()=>[{effect:"skilldmg_mult", value:0.10}]},
      {count:3, desc:"Cambiar de elemento potencia: después de usar un elemento distinto al anterior, tus habilidades hacen +25% de daño por 4 s", mods:()=>[]},
      {count:4, desc:"CONVERGENCIA: golpear a un mismo enemigo con fuego, hielo y rayo en menos de 4 s lo hace estallar (área, 250% de daño, congela y deja ardiendo).", mods:()=>[]}
    ]},
  custodio: { champion:"soporte", name:"Bendición del Custodio", theme:"Soporte · salvar a tiempo", aura:"255,235,160", full:"custodio",
    lore:"El Custodio nunca levantó un arma. Nunca le hizo falta: nadie a su lado caía.",
    pieces:{arma:"Báculo del Custodio", casco:"Mitra del Custodio", pechera:"Hábito del Custodio", botas:"Sandalias del Custodio"},
    thresholds:[
      {count:2, desc:"+12% curación realizada", mods:()=>[{effect:"heal_mult", value:0.12}]},
      {count:3, desc:"Bendición de Guerra y Escudo Sagrado también curan 6% de vida por segundo durante 3 s", mods:()=>[]},
      {count:4, desc:"ÁNGEL GUARDIÁN: cuando un aliado cerca tuyo baja de 30% de vida, recibe un escudo sagrado del 25% y 20% menos daño por 3 s (una vez cada 15 s por aliado).", mods:()=>[]}
    ]},
  marea: { champion:"segador", name:"Marea Roja", theme:"Berserker · riesgo · furia", aura:"220,40,40", full:"marea",
    lore:"Cuanto más le quitan, más toma.",
    pieces:{arma:"Guadaña de la Marea", pechera:"Coraza Carmesí", guantes:"Garras de la Marea", botas:"Botas del Olvido"},
    thresholds:[
      {count:2, desc:"+20% Furia generada", mods:()=>[]},
      {count:3, desc:"Con más de 50% de Furia, tus golpes básicos hacen sangrar", mods:()=>[]},
      {count:4, desc:"MAREA ROJA: cada baja con menos de 50% de vida suma Sangre (hasta 10): +3% daño y +1,5% robo de vida por carga. Con 10, tu próximo Tajo es un TAJO DE LA MUERTE: doble alcance y remata comunes y élites bajo 30%.", mods:()=>[]}
    ]},
  sistema: { champion:"axiom", name:"Acceso Raíz", theme:"Axiom · reglas rotas", aura:"70,240,210", full:"sistema",
    lore:"Un conjunto de permisos que nadie debería tener. Axiom los tiene todos.",
    pieces:{arma:"Núcleo Raíz", casco:"Visor de Depuración", guantes:"Guantes de Compilación", botas:"Pasos Asíncronos"},
    thresholds:[
      {count:2, desc:"−8% enfriamiento de habilidades", mods:()=>[{effect:"cd_mult", value:0.08}]},
      {count:3, desc:"Teletransporte deja un GLITCH donde estabas: colapsa a los 0,7 s, daña y ralentiza", mods:()=>[]},
      {count:4, desc:"RECURSIÓN: cada enemigo infectado por Sobrescribir que muere contagia el código a 2 enemigos cercanos y reduce 1 s el enfriamiento de Error 404.", mods:()=>[]}
    ]},
  profecia: { champion:"profeta", name:"La Última Profecía", theme:"Profeta · destino · salvar", aura:"120,240,220", full:"profecia",
    lore:"La última profecía no hablaba del fin del mundo. Hablaba de alguien que se negaba a dejarlo terminar.",
    pieces:{casco:"Velo de la Profecía", pechera:"Manto del Augurio", guantes:"Brazales del Destino", botas:"Pasos del Presagio"},
    thresholds:[
      {count:2, desc:"+12% curación realizada", mods:()=>[{effect:"heal_mult", value:0.12}]},
      {count:3, desc:"Cada Giro del Presagio cura 4% de vida a los aliados cercanos", mods:()=>[]},
      {count:4, desc:"PROFECÍA CUMPLIDA: cuando un aliado cerca tuyo recibe un golpe letal, sobrevive con 1 de vida y queda inmune 1,5 s (una vez cada 40 s).", mods:()=>[]}
    ]},
  errante: { champion:"musashi", name:"El Rōnin Errante", theme:"Musashi · paciencia · un solo corte", aura:"160,210,255", full:"errante",
    lore:"Caminó treinta años sin desenvainar. La única vez que lo hizo, no hizo falta una segunda.",
    pieces:{arma:"Bokken del Errante", casco:"Kasa del Errante", guantes:"Tekko del Errante", botas:"Waraji del Errante"},
    thresholds:[
      {count:2, desc:"+10% velocidad de ataque", mods:()=>[{effect:"atkspeed_mult", value:0.10}]},
      {count:3, desc:"Un Paso Perfecto reinicia el enfriamiento de Corte del Rōnin", mods:()=>[]},
      {count:4, desc:"IAIJUTSU: tras 1,2 s sin atacar, tu próximo básico es un corte desenvainado: crítico asegurado con +150% de daño crítico que corta en línea a todos hasta 160.", mods:()=>[]}
    ]},
  manada: { champion:"cazadora", name:"La Manada", theme:"Cazadora · marca → presa → lobo", aura:"140,220,120", full:"manada",
    lore:"Nunca caza sola. A veces el lobo es el que dispara.",
    pieces:{arma:"Arco de la Manada", casco:"Capucha del Rastreador", guantes:"Guantes de la Cuerda Tensa", botas:"Botas del Sendero"},
    thresholds:[
      {count:2, desc:"+8% velocidad de movimiento", mods:()=>[{effect:"speed_mult", value:0.08}]},
      {count:3, desc:"Lo que atrapa la Trampa del Bosque pasa a ser tu Presa, y tus flechas contra una presa atrapada son críticas", mods:()=>[]},
      {count:4, desc:"MANADA: al acorralar a tu Presa (Rastreo al máximo) aparece el Lobo Espectral por 6 s; mientras esté, tus flechas contra la Presa rebotan a 2 enemigos cercanos.", mods:()=>[]}
    ]},
  granadero: { champion:"libertador", name:"Uniforme del Granadero", theme:"Libertador · disparo pesado", aura:"90,130,220", full:"granadero",
    lore:"Azul de casaca, blanco de correaje. Lo reconocían antes de oír el disparo.",
    pieces:{arma:"Fusil del Granadero", casco:"Morrión del Granadero", pechera:"Casaca Azul", botas:"Botas de Caballería"},
    thresholds:[
      {count:2, desc:"+10% daño", mods:()=>[{effect:"dmg_mult", value:0.10}]},
      {count:3, desc:"Tus disparos de fusil aturden 0,4 s a comunes y élites", mods:()=>[]},
      {count:4, desc:"FUEGO A DISCRECIÓN: cada disparo de fusil que mata recarga el arma al instante.", mods:()=>[]}
    ]},
  legion: { champion:"eren", name:"Legión de Reconocimiento", theme:"Eren · maniobras · el Portador", aura:"200,90,60", full:"legion",
    lore:"Las alas en la espalda no son un adorno: son una promesa de volver.",
    pieces:{arma:"Hojas de la Legión", pechera:"Arnés de Maniobras", guantes:"Empuñaduras de la Legión", botas:"Botas de la Legión"},
    thresholds:[
      {count:2, desc:"+15% Furia generada", mods:()=>[]},
      {count:3, desc:"Cada Equipo de Maniobras que corta a 3 o más enemigos reduce su enfriamiento a la mitad", mods:()=>[]},
      {count:4, desc:"EL PORTADOR ETERNO: la forma titánica dura 30% más y cada baja transformado te cura 2% de la vida.", mods:()=>[]}
    ]}
};
(function registerChampionSets(){
  for(const id in CHAMPION_SETS){
    const S = CHAMPION_SETS[id];
    SET_DB[id] = Object.assign({id, rarity:"legendario"}, S);
    Object.keys(S.pieces).forEach(type=>{
      const key = id+"_"+type;
      DESIGNED_ITEMS[key] = {id:key, champion:S.champion, type, rarity:"legendario", set:id, name:S.pieces[type], lore:S.lore, passiveNames:[]};
    });
  }
})();
// Campeón dueño de un set (o null si es un set universal).
function setChampionAffinity(setId){ const S = SET_DB[setId]; return S && S.champion || null; }
function championSetOf(classKey){ for(const id in SET_DB) if(SET_DB[id].champion===classKey) return id; return null; }
