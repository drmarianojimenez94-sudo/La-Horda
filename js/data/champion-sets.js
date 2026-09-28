"use strict";
/* ============================================================
   js/data/champion-sets.js
   UN SET PROPIO POR GUARDIÁN (verde, 4 piezas, solo lo puede equipar ese guardián).
   Progresión: 2 piezas = bonus útil · 3 piezas = interacción con su kit · 4 piezas (completo) =
   cambia el loop del guardián. El comportamiento vive en js/systems/champion-sets.js.
   Caen en cualquier arena (el botín es cruzado); el set del guardián que estás jugando pesa más
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
  requiem: { champion:"nigromante", name:"Réquiem del Señor de la Muerte", theme:"Nigromante · legión · almas", aura:"90,230,140", full:"requiem",
    lore:"Cada pieza fue cosida con el nombre de un muerto. Todavía responden cuando las llaman.",
    pieces:{arma:"Cetro del Réquiem", casco:"Corona de Huesos", pechera:"Mortaja del Señor", guantes:"Garras de la Tumba"},
    thresholds:[
      {count:2, desc:"+1 esqueleto máximo", mods:()=>[]},
      {count:3, desc:"Gastar almas en un Pacto cura 3% de vida por alma a vos, a tu gólem y a tus esqueletos", mods:()=>[]},
      {count:4, desc:"LEGIÓN SIN FIN: con 5 o más esqueletos, vos y tu ejército reciben 15% menos daño y tus esqueletos golpean 20% más fuerte.", mods:()=>[]}
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
/* SET DE 2 PIEZAS QUE CAMBIA UNA HABILIDAD (reseña del crítico §6.4 #4): con 2 piezas del set de
   su guardián, una habilidad suya se TRANSFORMA. Usa el mismo motor que los refuerzos de habilidad
   (js/systems/boons.js: fx ground/burst/echo/fan/shards/pull/ally/status...), así que corre en el
   anfitrión para cada héroe con SU equipo (el invitado lo trae en su loadout) y nunca daña aliados.
   skill: 0/1/2/"ult" del kit BASE. test: qué mide tools/items/t_synergies.js. */
const CHAMPION_SET_TRANSFORMS = {
  baluarte:     {skill:"ult", name:"Círculo del Desafío", look:"stone", test:"zone",
    text:"el Grito Provocador deja un círculo de piedra 5 s que frena 35% y daña a los provocados",
    fx:[{t:"ground", at:"caster", r:150, dur:5000, dps:0.4, slow:0.35}]},
  nocturno:     {skill:"ult", name:"Niebla del Degollador", look:"poison", test:"zone",
    text:"la Pestilencia Sombría deja una niebla venenosa 4 s donde desaparecés",
    fx:[{t:"ground", at:"origin", r:110, dur:4000, dps:0.35, poison:true}]},
  convergencia: {skill:2, name:"Esfera de Tormenta", look:"storm", test:"zone",
    text:"la Cadena de Relámpago deja una esfera de tormenta 3 s que suelta rayos",
    fx:[{t:"ground", at:"aim", r:100, dur:3000, dps:0.1, zap:{every:450, pct:0.6}}]},
  custodio:     {skill:"ult", name:"Santuario del Custodio", look:"holy", test:"heal",
    text:"la Bendición Suprema deja un santuario 5 s que cura 3% de vida por segundo a los aliados",
    fx:[{t:"ground", at:"caster", r:150, dur:5000, heal:0.03}]},
  marea:        {skill:"ult", name:"Ola Carmesí", look:"blood", test:"dmg",
    text:"el Segador de Almas estalla en una ola de sangre alrededor que desangra",
    fx:[{t:"burst", at:"caster", r:150, pct:0.9, status:{bleed:0.4}}]},
  sistema:      {skill:1, name:"Fragmentos de Código", look:"void", test:"dmg",
    text:"cada infectado por Sobrescribir suelta 4 fragmentos de código en redondo",
    fx:[{t:"shards", at:"hits", n:4, pct:0.35}]},
  profecia:     {skill:0, name:"Aura del Destino", look:"holy", test:"heal",
    text:"Destino Restaurado deja un aura 4 s que cura 2,5% de vida por segundo a los aliados cercanos",
    fx:[{t:"ground", at:"caster", r:140, dur:4000, heal:0.025}]},
  errante:      {skill:0, name:"Corte Doble", look:"steel", test:"dmg",
    text:"el Corte del Rōnin corta dos veces: un eco del corte cae 0,35 s después sobre el rival",
    fx:[{t:"echo", at:"hits", delay:350, r:55, pct:1.0}]},
  manada:       {skill:0, name:"Flecha Gemela", look:"nature", test:"dmg",
    text:"la Flecha Perforante sale doble: una segunda flecha junto a la primera",
    fx:[{t:"fan", n:1, spread:0.06, pct:0.9}]},
  granadero:    {skill:1, name:"Estandarte del Regimiento", look:"holy", test:"heal",
    text:"¡Granaderos, a la carga! planta un estandarte 6 s que cura 1,5% de vida por segundo a los aliados",
    fx:[{t:"ground", at:"caster", r:170, dur:6000, heal:0.015}]},
  requiem:      {skill:0, name:"Siega de Almas", look:"void", test:"pull",
    text:"la Cosecha de Almas arrastra hacia vos a los enemigos del cono",
    fx:[{t:"pull", at:"caster", r:210, px:60}]},
  legion:       {skill:0, name:"Estela de Gas", look:"steam", test:"zone",
    text:"el Equipo de Maniobras deja una estela de gas 3 s que frena 40% y quema donde despegás",
    fx:[{t:"ground", at:"origin", r:95, dur:3000, dps:0.3, slow:0.4, burn:true}]}
};
(function registerChampionSets(){
  for(const id in CHAMPION_SETS){
    const S = CHAMPION_SETS[id];
    const T = CHAMPION_SET_TRANSFORMS[id];
    if(T){ // el texto del bono de 2 piezas lo cuenta (lo muestran la ficha del set, el Códice, la tienda y el inventario)
      const th = S.thresholds.find(x=>x.count===2);
      if(th){ th.desc = `${th.desc} · TRANSFORMA (${T.name}): ${T.text}`; th.transform = id; }
    }
    SET_DB[id] = Object.assign({id, rarity:"legendario"}, S);
    Object.keys(S.pieces).forEach(type=>{
      const key = id+"_"+type;
      DESIGNED_ITEMS[key] = {id:key, champion:S.champion, type, rarity:"legendario", set:id, name:S.pieces[type], lore:S.lore, passiveNames:[]};
    });
  }
})();
// Guardián dueño de un set (o null si es un set universal).
function setChampionAffinity(setId){ const S = SET_DB[setId]; return S && S.champion || null; }
function championSetOf(classKey){ for(const id in SET_DB) if(SET_DB[id].champion===classKey) return id; return null; }
