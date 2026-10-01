"use strict";
// Cinco portadores originales. Se registra antes de loadSave: los perfiles antiguos
// reciben entradas nuevas a nivel 1 sin cambiar oro, equipo ni progreso existente.
const PORTADORES = {
  ynara: {name:"Ynara", title:"El Ángel del Silencio", role:"Sanadora de área: estrogonof, agua y santa paciencia.", roleCategory:"soporte", color:"#ed8db5", glow:"#fff0f7", hp:110, dmg:6.3, def:0.12, speed:165, range:300, basic:600, ranged:true, weapon:"Halo Nacarado", set:"santa_paciencia", branches:["Mirada","Recetario","Serenidad"],
    origin:"Los refugios de la Ciudad Maldita", history:"Médica silenciosa y cuidadosa, Ynara sostiene los refugios con luz, agua limpia y estrogonof de pollo. Bajo su halo blanco guarda una paciencia finita y una bondad obstinada. Cura incluso a quien la hizo enojar. Nunca pide perdón: escucha, se queda callada y sigue cuidando.",
    skills:[
      {name:"Mirada fulminante",ico:"✧",kind:"yn_gaze",cost:24,cd:6500,range:190,radius:100,dmgMult:0.65,desc:"Un abanico de luz daña y ralentiza 30% durante 1,5 s. Empuja comunes cercanos; jefes resisten el empuje y limitan el freno al 12%."},
      {name:"Estrogonof reparador",ico:"♨",kind:"yn_stroganoff",cost:32,cd:12000,range:180,radius:115,duration:4800,dmgMult:0.06,desc:"Sirve estrogonof de pollo: cada 600 ms cura 1% de vida y su vapor daña. Dentro reduce daño 8%. Máximo una fuente por Ynara."},
      {name:"No quiero seguir esta conversación",ico:"➜",kind:"yn_leave",cost:26,cd:10000,range:130,radius:32,duration:2400,dmgMult:0.06,desc:"Se desliza por terreno seguro y limpia ralentización. Deja una cortina de agua que daña y frena. No cruza muros ni vacíos."}],
    ultimate:{name:"Santa Paciencia",ico:"★",kind:"yn_patience",cd:36000,radius:170,duration:6000,dmgMult:0.07,desc:"Despliega alas y un santuario móvil. Cura 0,8% por pulso y daña cada 600 ms. Cada golpe recibido por aliados dentro suma paciencia agotada (máximo 8, uno cada 400 ms). Al terminar libera una onda final."},
    voices:["Estoy acá.","Ya está. Comé algo.","…"]},
  myla: {name:"Myla", title:"La Maga del Yogur", role:"Maga de control: yogur, torres y ondas de llanto.", roleCategory:"mago", color:"#e99abb", glow:"#fff1e1", hp:100, dmg:8, def:0.08, speed:162, range:320, basic:560, ranged:true, weapon:"Cuchara Encantada", set:"merienda_magica", branches:["Yogurtería","Torres","Berrinche"],
    origin:"La Ciudad de los Primeros Pasos", history:"Myla descubrió que su merienda podía convertirse en magia. Con una cuchara encantada y una sonrisa desafiante, levanta torres de yogur y cubre de crema los caminos de la Horda. Donde otros ven oscuridad, ella ve una aventura por compartir.",
    skills:[
      {name:"Torre de Yogur", ico:"♜", kind:"my_tower", cost:32, cd:9000, range:200, radius:40, duration:12000, dmgMult:0.50, desc:"Invoca una torre de yogur que dispara y ralentiza. Máximo dos; la tercera reemplaza la más antigua."},
      {name:"Yogurazo", ico:"●", kind:"my_splash", cost:28, cd:6200, range:280, radius:95, duration:3600, dmgMult:1.0, desc:"Lanza yogur al punto elegido: salpica y deja un charco pegajoso que daña y ralentiza."},
      {name:"Burbuja Cremosa", ico:"◉", kind:"my_bubble", cost:26, cd:10000, duration:4500, desc:"Se envuelve en yogur protector: obtiene un escudo y limpia su ralentización."}],
    ultimate:{name:"BERRINCHE", ico:"★", kind:"my_tantrum", cd:34000, range:240, radius:180, duration:6500, dmgMult:0.55, desc:"En pañales y más grande, llora durante 6,5 segundos: cada onda de llanto daña y salpica yogur a su alrededor. Puede moverse; los jefes resisten parte de la ralentización."},
    voices:["¡Yogur para todos!","¿Otra cucharadita?","Necesito… una merienda…"]},
  brasa: {name:"Brasa", title:"La Última Maquinista", role:"Ingeniera de posición: torretas, presión y vapor.", roleCategory:"mago", color:"#c58543", glow:"#ffd28a", hp:108, dmg:10, def:0.09, speed:156, range:310, basic:580, ranged:true, weapon:"Remachadora", set:"ultimo_turno", branches:["Artillería","Vapor","Mantenimiento"],
    origin:"Fábrica Sin Fin", history:"Mantenía las máquinas de la Fábrica. Descubrió que una de sus cadenas no era para un monstruo, sino para alguien que se negó a obedecer. Escapó con los planos: todavía no sabe quién estaba al otro extremo.",
    skills:[
      {name:"Centinela de Latón", ico:"⚙", kind:"br_turret", cost:34, cd:8500, range:190, radius:40, duration:15000, dmgMult:0.65, desc:"Monta una torreta fija con vida propia. Máximo dos; una tercera retira la más antigua."},
      {name:"Purga de Vapor", ico:"♨", kind:"br_purge", cost:28, cd:6500, range:170, radius:110, dmgMult:1.65, desc:"Cono de vapor: descarga la presión y empuja comunes; ralentiza a jefes sin moverlos."},
      {name:"Desmontaje Rápido", ico:"↩", kind:"br_dismantle", cost:18, cd:7500, duration:2200, desc:"Retira la torreta más cercana, recupera parte de su recarga y acelera. Sin torreta también acelera."}],
    ultimate:{name:"Turno de Emergencia", ico:"★", kind:"br_overclock", cd:34000, duration:8000, dmgMult:1.0, desc:"Sobrecarga sus torretas. Sin ninguna, monta una temporal. Después deben enfriarse."},
    voices:["Sé cómo se rompe una máquina. También sé cómo hacerla aguantar.","Terminó el turno. Contemos a los que volvieron.","La válvula… cerrá la válvula…"]},
  eslabon: {name:"El Eslabón", title:"El Carcelero que Abrió la Puerta", role:"Tanque protector: cadenas, custodia y separación.", roleCategory:"tanque", color:"#9195a1", glow:"#e4dfc8", hp:164, dmg:9, def:0.2, speed:145, range:85, basic:650, weapon:"Cadena de Grilletes", set:"juramento_roto", branches:["Custodio","Arrastre","Bastión"],
    origin:"Las celdas de los portadores", history:"Custodió una prisión de portadores mucho después de los Cuatro. Rompió su juramento y abrió las celdas. Conserva un grillete: el peso le recuerda que proteger también puede empezar por abrir una puerta.",
    skills:[
      {name:"Cadena de Retorno", ico:"⛓", kind:"es_hook", cost:26, cd:6500, range:290, dmgMult:1.4, desc:"Engancha y acerca un enemigo. Los jefes reciben daño y ralentización, pero nunca se desplazan."},
      {name:"Línea Infranqueable", ico:"═", kind:"es_line", cost:32, cd:10500, range:180, radius:22, duration:6000, dmgMult:0.35, desc:"Tiende una cadena que frena a quienes la cruzan. No bloquea el movimiento aliado."},
      {name:"Custodia", ico:"🛡", kind:"es_guard", cost:30, cd:10000, range:250, duration:5000, desc:"Absorbe parte del daño del aliado elegido, con presupuesto limitado. Solo, obtiene una guardia menor."}],
    ultimate:{name:"Nadie Queda Atrás", ico:"★", kind:"es_ring", cd:35000, radius:190, duration:6500, dmgMult:0.4, desc:"Un anillo móvil empuja comunes hacia afuera y protege aliados dentro. Reduce su velocidad mientras dura."},
    voices:["La cadena sirve para detenerlos. La puerta, para dejarlos salir.","Esta vez abrí todas las celdas.","No cierres… la puerta…"]},
  morwen: {name:"Morwen", title:"La Destiladora de Ecos", role:"Alquimista: resina, catalizador y reacciones controladas.", roleCategory:"mago", color:"#a46191", glow:"#edd0a5", hp:96, dmg:10, def:0.07, speed:164, range:300, basic:540, ranged:true, weapon:"Aguja de Vidrio", set:"vidrio_negro", branches:["Corrosión","Destilación","Ecos"],
    origin:"Reino Fúngico", history:"Estudiaba las voces que el micelio repite cuando nadie escucha. Aprendió a destilar sus ecos sin entregarse a la Madre Espora. En algunos frascos todavía hay una voz que dice: váyanse, yo me quedo.",
    skills:[
      {name:"Resina Amarga", ico:"●", kind:"mo_resin", cost:26, cd:6000, range:280, radius:100, duration:5000, dmgMult:0.75, desc:"Un frasco marca y ralentiza. Combinar Resina y Catalizador detona una sola reacción y consume ambos."},
      {name:"Sal de Ruptura", ico:"✣", kind:"mo_salt", cost:30, cd:6500, range:200, radius:120, duration:5000, dmgMult:0.9, desc:"Cono de catalizador. Reacciona con Resina, causa daño inmediato y debilita brevemente."},
      {name:"Destilación", ico:"◈", kind:"mo_distill", cost:24, cd:10000, duration:4000, desc:"Consume residuos para ganar escudo y limpiar ralentización o quemadura. Sin residuos da una cubierta menor."}],
    ultimate:{name:"Alambique del Silencio", ico:"★", kind:"mo_alembic", cd:36000, range:240, radius:170, duration:8000, dmgMult:0.4, desc:"Área que prolonga reactivos y permite una onda secundaria por reacción. Sin propagación infinita."},
    voices:["No son hongos hablando. Son personas que todavía no terminaron.","Otro eco que merece ser escuchado.","No destiles… este recuerdo…"]},
  farolero: {name:"El Farolero", title:"La Última Luz", role:"Escolta: luz local, sendas y escudos por pulsos.", roleCategory:"soporte", color:"#bba56e", glow:"#ffe7a5", hp:124, dmg:8, def:0.13, speed:162, range:90, basic:590, weapon:"Piqueta de Guardia", set:"lumbre_persistente", branches:["Explorador","Vigilia","Escolta"],
    origin:"Minas Profundas", history:"Volvió de otra expedición siguiendo el ruido de un yunque. No volvió con todos. Ahora baja otra vez: no promete que la oscuridad desaparezca, promete sostener la luz hasta que pase el último.",
    skills:[
      {name:"Farol de Guardia", ico:"☼", kind:"fa_lantern", cost:28, cd:9500, range:170, radius:120, duration:9000, desc:"Coloca un farol, máximo uno, que protege cerca y da luz débil local. No enciende braseros ni elimina oscuridad especial."},
      {name:"Destello", ico:"✧", kind:"fa_flash", cost:26, cd:7500, range:180, radius:120, dmgMult:1.1, desc:"Cono que desorienta comunes; contra jefes solo aplica ralentización reducida."},
      {name:"Paso Seguro", ico:"➜", kind:"fa_path", cost:30, cd:10500, range:250, radius:42, duration:4500, desc:"Senda que amortigua daño ambiental y ralentizaciones. No atraviesa vacíos ni evita peligros letales."}],
    ultimate:{name:"Vigilia", ico:"★", kind:"fa_vigil", cd:35000, radius:190, duration:7000, desc:"Círculo móvil de luz y pequeños escudos periódicos. No concede inmunidad ni borra mecánicas de arena."},
    voices:["El último cruza conmigo. Esta vez sí.","Hay luz suficiente para contar a todos.","Que alguien… levante el farol…"]},
  iria: {name:"Iria", title:"La Tejedora de Sellos", role:"Control geométrico: anclas, hilos y triángulos.", roleCategory:"mago", color:"#8889c1", glow:"#e3e0ff", hp:100, dmg:10, def:0.07, speed:160, range:320, basic:560, ranged:true, weapon:"Aguja Rúnica", set:"hilo_umbral", branches:["Geometría","Ruptura","Custodia"],
    origin:"Los límites del Laberinto", history:"Reparaba límites pequeños bajo la sombra del Guardián del Laberinto. Encontró puertas que nadie había roto: alguien las abrió desde adentro. Puede sostener una fisura, pero el Sello de los Cuatro pesa más que toda su orden.",
    skills:[
      {name:"Ancla", ico:"◇", kind:"ir_anchor", cost:16, cd:2200, range:250, radius:30, duration:16000, desc:"Coloca un sello, máximo tres. Las anclas cercanas se unen en orden; sus hilos no son paredes."},
      {name:"Tensión", ico:"⌁", kind:"ir_tension", cost:28, cd:8000, radius:80, duration:4500, dmgMult:0.4, desc:"Activa los hilos: ralentizan y marcan a quien cruza. Con menos de dos anclas funciona cerca de Iria."},
      {name:"Corte de Hilo", ico:"✂", kind:"ir_cut", cost:30, cd:9000, range:300, radius:75, dmgMult:2.0, desc:"Consume el ancla más cercana al punto elegido y descarga sus hilos. Cada enemigo recibe un solo golpe."}],
    ultimate:{name:"Sello de los Tres Caminos", ico:"★", kind:"ir_triangle", cd:36000, radius:160, duration:6500, dmgMult:0.55, desc:"Activa un triángulo de daño y control. Sin tres anclas válidas crea uno pequeño propio; no encierra ni desplaza jugadores."},
    voices:["Estas puertas no se rompieron. Alguien las abrió.","Otro hilo que sigue sosteniendo el mundo.","Sostené… el vértice…"]}
};

for(const k in PORTADORES){
  const p = PORTADORES[k];
  // Alpha release gift: these five can be tested immediately, without resetting progression.
  CHAMPION_CATALOG.push({id:k, priceGold:CHAMPION_PRICE_GOLD, unlockedByDefault:true, lore:p.history});
  CLASSES[k] = {name:p.name, hudName:k==="eslabon"?"Eslabón":k==="farolero"?"Farolero":p.name, icon:p.skills[0].ico, color:p.color, glow:p.glow,
    role:p.role, roleCategory:p.roleCategory, baseHP:p.hp, baseDmg:p.dmg, baseDef:p.def, baseSpeed:p.speed, energyMax:110, energyRegen:10,
    hpGrowthMult:p.roleCategory==="tanque"?1.4:p.roleCategory==="soporte"?1.15:0.8, dmgGrowthMult:p.roleCategory==="mago"?1.1:0.8,
    basicRange:p.range, basicCd:p.basic, basicArc:!p.ranged, ranged:!!p.ranged, skills:p.skills, ultimate:p.ultimate, noDivinaFoe:true};
  CLASS_WEAPON_LABEL[k] = p.weapon;
  SCORE_CONFIG[k] = p.roleCategory==="tanque" ? SCORE_CONFIG.tanque : p.roleCategory==="soporte" ? [
    {stat:"shieldAbsorbed",ref:4500,weight:0.35}, {stat:"buffsGranted",ref:45,weight:0.25}, {stat:"alliesSaved",ref:8,weight:0.2}, {stat:"enemiesControlled",ref:35,weight:0.2}
  ] : SCORE_CONFIG.mago;
  CHAMP_ITEM_AFFINITY[k] = Object.assign({}, CHAMP_ITEM_AFFINITY[p.roleCategory==="tanque"?"tanque":p.roleCategory==="soporte"?"soporte":"mago"]);
  const tree = {masteryRequirement:8,nodes:[],masteries:{}};
  p.branches.forEach((name,b)=>{
    const branch = k+"_"+b, pref = k+"_t"+b;
    const powerKey = k==="iria" && b===0 ? "durationMult" : "powerMult";
    const powerLabel = powerKey==="durationMult" ? "duración" : "poder";
    const add = (suffix,title,type,maxRank,cost,req,desc,mods) => tree.nodes.push({id:pref+suffix,branch,type,maxRank,cost,requires:req?pref+req:null,name:title,desc,rankDesc:r=>desc+" · rango "+r,mods});
    add("a",name+": Potencia","common",3,1,null,"+5% "+powerLabel+" por rango de "+p.skills[b].name,r=>[{targetSkill:b,key:powerKey,value:0.05*r}]);
    add("b",name+": Alcance","common",3,1,"a","+5% área/alcance por rango",r=>[{targetSkill:b,key:"areaMult",value:0.05*r}]);
    add("c",name+": Persistencia","common",3,1,"b","+7% duración por rango",r=>[{targetSkill:b,key:"durationMult",value:0.07*r}]);
    add("d",name+": Disciplina","special",5,4,"c","-3% recarga por rango",r=>[{targetSkill:b,key:"cdMult",value:-0.03*r}]);
    add("e",name+": Legado","special",3,4,"d",b===2?"+4% vida por rango":"+3% daño por rango",r=>[{effect:b===2?"hp_mult":"dmg_mult",value:(b===2?0.04:0.03)*r}]);
    tree.masteries[branch] = {id:branch,branch,name:name+" Mayor",desc:"Especializa "+p.skills[b].name+(powerKey==="durationMult"?" con +10% alcance y duración; habilita su miniárbol.":" con +15% poder, +10% alcance y duración; habilita su miniárbol."),miniTree:[
      {id:pref+"m1",maxRank:2,cost:4,requires:null,name:"Técnica Perfecta",desc:"+15% "+powerLabel+" por rango",rankDesc:r=>"+"+(r*15)+"% "+powerLabel,mods:r=>[{targetSkill:b,key:powerKey,value:0.15*r}]},
      {id:pref+"m2",maxRank:2,cost:4,requires:null,name:"Trama Persistente",desc:"+15% duración por rango",rankDesc:r=>"+"+(r*15)+"% duración",mods:r=>[{targetSkill:b,key:"durationMult",value:0.15*r}]},
      {id:pref+"m3",maxRank:2,cost:4,requires:null,name:"Último Recurso",desc:"+12% poder de definitiva por rango",rankDesc:r=>"+"+(r*12)+"% poder de definitiva",mods:r=>[{targetSkill:"ult",key:"powerMult",value:0.12*r}]}]};
  });
  TALENT_TREES[k] = tree;
}

const PORTADOR_SET_DATA = {
  santa_paciencia:{name:"Santa Paciencia",two:"+8% vida máxima",effect:"hp_mult",value:0.08,three:"Estrogonof cura un 10% más",four:"La onda final de Santa Paciencia inflige un 10% más de daño"},
  merienda_magica:{name:"Merienda Mágica",two:"+8% daño de habilidades",effect:"skilldmg_mult",value:0.08,three:"Burbuja Cremosa concede un escudo mayor",four:"BERRINCHE salpica con un 15% más de daño"},
  ultimo_turno:{name:"Último Turno",two:"+12% vida máxima",effect:"hp_mult",value:0.12,three:"Desmontaje deja una purga de vapor",four:"La sobrecarga conecta dos torretas con fuego coordinado"},
  juramento_roto:{name:"Juramento Roto",two:"+12% vida máxima",effect:"hp_mult",value:0.12,three:"Custodia concede escudo al terminar",four:"Proteger suficiente daño prepara una cadena doble contra comunes"},
  vidrio_negro:{name:"Vidrio Negro",two:"+8% daño de habilidades",effect:"skilldmg_mult",value:0.08,three:"Una reacción recupera energía (con enfriamiento)",four:"Destilación prepara un segundo impacto reducido del próximo frasco"},
  lumbre_persistente:{name:"Lumbre Persistente",two:"+10% vida máxima",effect:"hp_mult",value:0.1,three:"Entrar en Paso Seguro concede escudo",four:"Durante Vigilia, absorber daño provoca un pulso extra limitado"},
  hilo_umbral:{name:"Hilo del Umbral",two:"+8% daño de habilidades",effect:"skilldmg_mult",value:0.08,three:"Corte de Hilo concede escudo",four:"Consumir un ancla de la definitiva descarga una vez sus segmentos"}
};
for(const k in PORTADORES){
  const p=PORTADORES[k],id=p.set,d=PORTADOR_SET_DATA[id];
  const S={id,champion:k,name:d.name,theme:p.role,aura:p.color.slice(1).match(/../g).map(x=>parseInt(x,16)).join(","),full:id,lore:p.history,rarity:"legendario",
    pieces:{arma:p.weapon+" del "+d.name,casco:"Insignia del "+d.name,pechera:"Vestidura del "+d.name,botas:"Pasos del "+d.name},
    thresholds:[{count:2,desc:d.two,mods:()=>[{effect:d.effect,value:d.value}]},{count:3,desc:d.three,mods:()=>[]},{count:4,desc:d.four,mods:()=>[]}]};
  CHAMPION_SETS[id]=S; SET_DB[id]=S;
  for(const type in S.pieces){const key=id+"_"+type;DESIGNED_ITEMS[key]={id:key,champion:k,type,rarity:"legendario",set:id,name:S.pieces[type],lore:S.lore,passiveNames:[]};}
}
