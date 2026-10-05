"use strict";
/* ============================================================
   js/data/boons-heroes.js — REFUERZOS DE HABILIDAD de los campeones de Expedición y Ascensión (Fundadores incluidos)
   Mismo motor y mismas reglas que los del roster original (js/data/boons.js, js/systems/boons.js): cada carta
   transforma UNA habilidad nombrada, con rareza común/raro/épico, y cada campeón tiene 4 cartas + 1 dúo.
   Formato compacto por campeón: [habilidad, nombre, look, prueba, fx, descripción(r)]; la 5.ª es el dúo de las
   cartas indicadas en "duo". Los valores en arreglo [común, raro, épico] los elige el motor por rareza.
   ============================================================ */
const _R = (a, r) => a[r];
const HERO_BOONS = {
  nano_gm:{duo:[0,3], cards:[
    [0,"Sentencia Encadenada","void","hits",[{t:"bounce",n:[1,2,3],pct:[.4,.5,.6],range:170,status:{vuln:.12,vulnMs:4000}}],r=>`La Sentencia Umbría rebota a ${_R([1,2,3],r)} enemigos más y los deja vulnerables (+12% de daño recibido).`],
    [1,"Edicto Ardiente","holy","zone",[{t:"ground",at:"aim",r:[90,105,120],dur:[3000,3500,4000],dps:[.3,.4,.5],burn:true}],r=>`El Edicto de Luz deja el suelo ardiendo ${_R([3,3.5,4],r)} s: quema a los enemigos que lo pisan.`],
    [2,"Inversión Traicionera","void","hits",[{t:"line",w:44,pct:[.5,.7,.9],status:{slow:.3}}],r=>`La Inversión corta todo el camino entre su origen y su destino (${_R([50,70,90],r)}% de daño) y frena.`],
    ["ult","Veredicto Final","holy","stun",[{t:"echo",at:"caster",delay:900,rMul:1,pct:[1,1.4,1.8],status:{stun:[500,750,1000]}}],r=>`El Juicio del GM cierra con un veredicto que estalla en toda la zona y aturde ${_R([.5,.75,1],r)} s.`],
    [0,"Regente del Umbral","holy","shield",[{t:"burst",at:"caster",r:150,pct:.8,status:{vuln:.2,vulnMs:5000}},{t:"ally",at:"caster",r:240,shield:.08}],r=>"Dúo: la Sentencia Umbría también estalla alrededor de Nano (vulnerables +20%) y escuda 8% a los aliados."]]},
  facu_gm:{duo:[0,1], cards:[
    [0,"Resaca Profunda","frost","pull",[{t:"pull",at:"aim",rMul:1.4,px:[40,55,70]}],r=>`La Corriente de Resaca arrastra a la Horda hacia el centro del canal (${_R([40,55,70],r)} px).`],
    [1,"Fosa Helada","frost","zone",[{t:"ground",at:"aim",r:[95,110,125],dur:[3000,3500,4000],dps:[.25,.35,.45],slow:[.3,.4,.5]}],r=>`La Presión Abisal deja una fosa de agua helada: frena ${_R([30,40,50],r)}% y daña.`],
    [2,"Estela de Espuma","frost","hits",[{t:"line",w:56,pct:[.6,.8,1],status:{slow:.35}}],r=>`Cabalgar la Ola deja una estela que golpea (${_R([60,80,100],r)}% de daño) y frena a todo lo que cruza.`],
    ["ult","Marea Viva","frost","shield",[{t:"ally",at:"caster",r:280,shield:[.08,.12,.16]}],r=>`El Océano Reclama la Arena escuda ${_R([8,12,16],r)}% de vida a todos los aliados cercanos.`],
    [1,"Leviatán Hambriento","void","pull",[{t:"pull",at:"aim",rMul:1.6,px:70},{t:"burst",at:"aim",r:120,pct:.7}],r=>"Dúo: la Presión Abisal traga a la Horda hacia la fosa y la aplasta con un mordisco del leviatán."]]},
  aurelia:{duo:[0,1], cards:[
    [0,"Prisma Facetado","holy","hits",[{t:"shards",at:"aim",n:[3,4,6],pct:[.3,.35,.4]}],r=>`Cada Prisma se rompe en ${_R([3,4,6],r)} esquirlas de luz que salen en redondo.`],
    [1,"Haz Abrasador","fire","burn",[{t:"status",on:"hits",status:{burn:[.3,.45,.6]}}],r=>`La Refracción quema a los enemigos que atraviesa (${_R([30,45,60],r)}% de daño por segundo).`],
    [2,"Senda de Luz","holy","hits",[{t:"line",w:40,pct:[.6,.8,1]}],r=>`El Paso Luminal deja una senda de luz sólida que daña (${_R([60,80,100],r)}%) todo el trayecto.`],
    ["ult","Bendición del Vitral","holy","shield",[{t:"ally",at:"caster",r:260,shield:[.08,.12,.16]}],r=>`La Catedral del Sol escuda ${_R([8,12,16],r)}% de vida a los aliados cercanos.`],
    [0,"Geometría Sagrada","holy","dmg",[{t:"echo",at:"aim",delay:500,r:130,pct:.9,status:{vuln:.15,vulnMs:4000}}],r=>"Dúo: el Prisma vuelve a brillar medio segundo después: estalla y deja a la Horda vulnerable."]]},
  khepri:{duo:[0,2], cards:[
    [0,"Plaga Hambrienta","poison","poison",[{t:"status",on:"hits",status:{poison:[.3,.45,.6]}}],r=>`El Enjambre envenena a quien pica (${_R([30,45,60],r)}% de daño por segundo).`],
    [1,"Espinas del Caparazón","nature","dmg",[{t:"burst",at:"caster",r:115,pct:[.5,.7,.9],status:{bleed:.25}}],r=>`El Caparazón Vivo suelta espinas alrededor (${_R([50,70,90],r)}% de daño) que hacen sangrar.`],
    [2,"Estela Zumbante","poison","hits",[{t:"line",w:42,pct:[.5,.7,.9],status:{poison:.3}}],r=>`El Vuelo de Élitros deja un rastro de escarabajos que daña (${_R([50,70,90],r)}%) y envenena.`],
    ["ult","Noche de Escarabajos","poison","zone",[{t:"ground",at:"caster",r:170,dur:[3000,3500,4000],dps:[.3,.4,.5],poison:true}],r=>`El Eclipse de Escarabajos deja el suelo infestado ${_R([3,3.5,4],r)} s.`],
    [0,"Reina del Enjambre","poison","hits",[{t:"fan",n:4,spread:.6,pct:.45}],r=>"Dúo: el Enjambre lanza cuatro escarabajos más en abanico."]]},
  velmira:{duo:[0,1], cards:[
    [0,"Máscara Rebotante","void","hits",[{t:"bounce",n:[1,2,3],pct:[.45,.55,.65],range:170}],r=>`La Máscara Arrojada rebota a ${_R([1,2,3],r)} enemigos más.`],
    [1,"Coro del Terror","void","stun",[{t:"status",on:"area",rMul:1,status:{stun:[300,450,600]}}],r=>`El Coro de Rostros paraliza de miedo ${_R([.3,.45,.6],r)} s a los enemigos cercanos.`],
    [2,"Telón Rasgado","void","dmg",[{t:"burst",at:"caster",r:120,pct:[.5,.7,.9]}],r=>`El Cambio de Rostro rasga el telón: estalla alrededor (${_R([50,70,90],r)}% de daño).`],
    ["ult","Ovación","holy","shield",[{t:"ally",at:"caster",r:260,shield:[.08,.12,.16]}],r=>`El Gran Teatro escuda ${_R([8,12,16],r)}% de vida al público aliado.`],
    [0,"Mascarada Total","void","dmg",[{t:"echo",at:"aim",delay:400,r:120,pct:.8,status:{vuln:.15,vulnMs:4000}}],r=>"Dúo: la máscara deja una copia que estalla y deja a la Horda vulnerable."]]},
  vhal:{duo:[1,3], cards:[
    [0,"Lluvia de Meteoritos","storm","dmg",[{t:"echo",at:"aim",delay:500,r:[80,95,110],pct:[.5,.7,.9]}],r=>`La Estrella Errante deja caer un meteorito medio segundo después (${_R([50,70,90],r)}% de daño en área).`],
    [1,"Horizonte de Sucesos","void","pull",[{t:"pull",at:"aim",rMul:1.5,px:[40,55,70]}],r=>`El Pozo Gravitatorio atrae a la Horda desde más lejos (${_R([40,55,70],r)} px).`],
    [2,"Anillo de Escombros","stone","hits",[{t:"shards",at:"caster",n:[4,6,8],pct:[.3,.35,.4]}],r=>`La Órbita suelta ${_R([4,6,8],r)} escombros en redondo.`],
    ["ult","Supernova","storm","stun",[{t:"burst",at:"aim",r:180,pct:[1,1.3,1.6],status:{stun:[400,600,800]}}],r=>`El Colapso termina en una supernova que aturde ${_R([.4,.6,.8],r)} s.`],
    [1,"Gravedad Absoluta","void","zone",[{t:"ground",at:"aim",r:120,dur:3500,dps:.4,slow:.5}],r=>"Dúo: el Pozo Gravitatorio deja un campo que frena 50% y aplasta."]]},
  bront:{duo:[0,2], cards:[
    [0,"Placa Afilada","steel","bleed",[{t:"status",on:"hits",status:{bleed:[.25,.35,.45]}}],r=>`La Placa Arrojada hace sangrar a quien corta (${_R([25,35,45],r)}% de daño por segundo).`],
    [1,"Muro Erizado","stone","zone",[{t:"ground",at:"ahead",r:[85,100,115],dur:[3000,3500,4000],dps:[.3,.4,.5],slow:.3}],r=>`El Muro de Placas deja el suelo erizado de púas ${_R([3,3.5,4],r)} s.`],
    [2,"Cristal Resonante","steel","shield",[{t:"ally",at:"caster",r:220,shield:[.06,.09,.12]}],r=>`El Pulso del Cristal escuda ${_R([6,9,12],r)}% de vida a los aliados cercanos.`],
    ["ult","Bastión Inquebrantable","stone","stun",[{t:"status",on:"area",rMul:1,status:{stun:[500,750,1000]}}],r=>`La Ciudadela, al anclarse, aturde ${_R([.5,.75,1],r)} s a los enemigos alrededor.`],
    [0,"Coloso de Cristal","steel","shield",[{t:"burst",at:"caster",r:140,pct:.7},{t:"ally",at:"caster",r:220,shield:.08}],r=>"Dúo: la Placa Arrojada hace vibrar el cristal: estalla alrededor y escuda 8% al equipo."]]},
  oriel:{duo:[0,1], cards:[
    [0,"Cicatriz Sangrante","blood","zone",[{t:"ground",at:"aim",r:[85,100,115],dur:[3000,3500,4000],dps:[.3,.4,.5],bleed:true}],r=>`Abrir Cicatriz deja una herida en el suelo que hace sangrar ${_R([3,3.5,4],r)} s.`],
    [1,"Eco Doble","void","dmg",[{t:"echo",at:"caster",delay:450,rMul:1,pct:[.5,.7,.9]}],r=>`El Eco de la Cicatriz pulsa una segunda vez (${_R([50,70,90],r)}% de daño).`],
    [2,"Desgarro","blood","hits",[{t:"line",w:44,pct:[.5,.7,.9],status:{vuln:.12,vulnMs:4000}}],r=>`El Paso entre Mundos desgarra el camino (${_R([50,70,90],r)}%) y deja vulnerables.`],
    ["ult","Puerta de los Caídos","holy","shield",[{t:"ally",at:"caster",r:260,shield:[.08,.12,.16]}],r=>`La Gran Cicatriz escuda ${_R([8,12,16],r)}% de vida a los aliados.`],
    [0,"Herida del Mundo","void","pull",[{t:"pull",at:"aim",rMul:1.5,px:65},{t:"burst",at:"aim",r:110,pct:.7}],r=>"Dúo: la Cicatriz traga a la Horda hacia adentro y se cierra de golpe."]]},
  saelis:{duo:[0,1], cards:[
    [0,"Plumas Afiladas","steel","bleed",[{t:"status",on:"hits",status:{bleed:[.25,.35,.45]}}],r=>`El Abanico de Plumas hace sangrar (${_R([25,35,45],r)}% de daño por segundo).`],
    [1,"Viento Cortante","steel","hits",[{t:"shards",at:"caster",n:[4,6,8],pct:[.3,.35,.4]}],r=>`La Ráfaga Ascendente suelta ${_R([4,6,8],r)} plumas cortantes en redondo.`],
    [2,"Plumaje Protector","holy","shield",[{t:"ally",at:"caster",r:200,shield:[.06,.09,.12]}],r=>`El Llamado del Plumaje escuda ${_R([6,9,12],r)}% de vida a los aliados cercanos.`],
    ["ult","Tormenta de Plumas","holy","dmg",[{t:"fan",n:[4,6,8],spread:.9,pct:[.4,.45,.5]}],r=>`El Cielo de Plumas también dispara ${_R([4,6,8],r)} plumas en abanico.`],
    [0,"Bandada","holy","dmg",[{t:"echo",at:"aim",delay:450,r:120,pct:.8},{t:"fan",n:3,spread:.5,pct:.4}],r=>"Dúo: el abanico vuelve como una bandada que estalla sobre la Horda."]]},
  vesper:{duo:[0,2], cards:[
    [0,"Agujas Envenenadas","poison","poison",[{t:"status",on:"hits",status:{poison:[.3,.45,.6]}}],r=>`Las Agujas de penumbra envenenan (${_R([30,45,60],r)}% de daño por segundo).`],
    [1,"Costura Ardiente","fire","hits",[{t:"line",w:40,pct:[.5,.7,.9],status:{burn:.3}}],r=>`La Costura de fuga quema todo el camino (${_R([50,70,90],r)}% de daño).`],
    [2,"Hilo Suelto","void","hits",[{t:"bounce",n:[1,2,3],pct:[.45,.55,.65],range:170}],r=>`Deshilachar salta a ${_R([1,2,3],r)} enemigos más.`],
    ["ult","Telar de Sombras","void","zone",[{t:"ground",at:"caster",r:170,dur:[3000,3500,4000],dps:[.3,.4,.5],slow:.3}],r=>`La última puntada deja un telar de sombras ${_R([3,3.5,4],r)} s que frena y daña.`],
    [0,"Patrón Completo","void","dmg",[{t:"burst",at:"caster",r:130,pct:.8,status:{vuln:.2,vulnMs:5000}}],r=>"Dúo: las agujas cierran el patrón: estallido alrededor y vulnerables +20%."]]},
  nahir:{duo:[0,3], cards:[
    [0,"Astillas de Espejo","steel","hits",[{t:"bounce",n:[1,2,3],pct:[.4,.5,.6],range:170}],r=>`Las Astillas errantes rebotan a ${_R([1,2,3],r)} enemigos más.`],
    [1,"Reflejo Afilado","steel","dmg",[{t:"burst",at:"origin",r:100,pct:[.5,.7,.9]}],r=>`El Reflejo fugitivo estalla donde lo dejaste (${_R([50,70,90],r)}% de daño).`],
    [2,"Corte Profundo","blood","bleed",[{t:"status",on:"hits",status:{bleed:[.25,.35,.45]}}],r=>`El Corte cruzado hace sangrar (${_R([25,35,45],r)}% de daño por segundo).`],
    ["ult","Sala de Espejos","steel","hits",[{t:"shards",at:"caster",n:[4,6,8],pct:[.3,.35,.4]}],r=>`La Galería de nadie suelta ${_R([4,6,8],r)} astillas en redondo.`],
    [0,"Mil Reflejos","steel","hits",[{t:"fan",n:4,spread:.7,pct:.45}],r=>"Dúo: las Astillas errantes salen en un abanico de cuatro más."]]},
  baltra:{duo:[0,2], cards:[
    [0,"Tañido Aturdidor","storm","stun",[{t:"status",on:"area",rMul:1,status:{stun:[300,450,600]}}],r=>`El Bronce vivo aturde ${_R([.3,.45,.6],r)} s a los enemigos que alcanza.`],
    [1,"Campana Protectora","steel","shield",[{t:"ally",at:"caster",r:200,shield:[.06,.09,.12]}],r=>`Bajo la campana escuda ${_R([6,9,12],r)}% de vida a los aliados cercanos.`],
    [2,"Eco del Badajo","stone","dmg",[{t:"echo",at:"ahead",delay:400,r:[90,105,120],pct:[.5,.7,.9]}],r=>`El Badajo de retorno vuelve a sonar adelante (${_R([50,70,90],r)}% de daño).`],
    ["ult","Campanada Final","storm","pull",[{t:"pull",at:"caster",rMul:1.4,px:[40,55,70]}],r=>`Que todos la escuchen atrae a la Horda hacia la campana (${_R([40,55,70],r)} px).`],
    [0,"Bronce Ancestral","stone","dmg",[{t:"burst",at:"caster",r:150,pct:.9,knock:true}],r=>"Dúo: el Bronce vivo suena dos veces: estallido que empuja."]]},
  maura:{duo:[0,2], cards:[
    [0,"Raíces Espinosas","nature","zone",[{t:"ground",at:"aim",r:[85,100,115],dur:[3000,3500,4000],dps:[.3,.4,.5],slow:.25}],r=>`Las Raíces de paso dejan espinas en el suelo ${_R([3,3.5,4],r)} s.`],
    [1,"Corteza Compartida","nature","shield",[{t:"ally",at:"caster",r:200,shield:[.06,.09,.12]}],r=>`La Corteza prestada también escuda ${_R([6,9,12],r)}% a los aliados cercanos.`],
    [2,"Poda Sangrante","blood","bleed",[{t:"status",on:"hits",status:{bleed:[.25,.35,.45]}}],r=>`La Poda necesaria hace sangrar (${_R([25,35,45],r)}% de daño por segundo).`],
    ["ult","Bosque Voraz","nature","pull",[{t:"pull",at:"caster",rMul:1.4,px:[40,55,70]}],r=>`El bosque camina y arrastra a la Horda hacia sus raíces (${_R([40,55,70],r)} px).`],
    [0,"Jardín Salvaje","nature","zone",[{t:"ground",at:"aim",r:130,dur:4000,dps:.4,poison:true,slow:.3}],r=>"Dúo: las raíces crecen en un jardín venenoso que frena."]]},
  dariel:{duo:[0,2], cards:[
    [0,"Disonancia","storm","vuln",[{t:"status",on:"hits",status:{vuln:[.12,.18,.24],vulnMs:5000}}],r=>`La Nota discordante deja a la Horda desafinada: +${_R([12,18,24],r)}% de daño recibido.`],
    [1,"Marcha Triunfal","holy","shield",[{t:"ally",at:"caster",r:220,shield:[.06,.09,.12]}],r=>`La Marcha de salida escuda ${_R([6,9,12],r)}% de vida al equipo.`],
    [2,"Estribillo Resonante","storm","dmg",[{t:"echo",at:"caster",delay:450,rMul:1,pct:[.5,.7,.9]}],r=>`Volver al estribillo suena otra vez (${_R([50,70,90],r)}% de daño).`],
    ["ult","Gran Final","holy","stun",[{t:"status",on:"area",rMul:1,status:{stun:[400,600,800]}}],r=>`Todavía hay una salida: el acorde final aturde ${_R([.4,.6,.8],r)} s.`],
    [0,"Sinfonía","storm","dmg",[{t:"burst",at:"caster",r:140,pct:.8,status:{vuln:.15,vulnMs:4000}}],r=>"Dúo: la nota y el estribillo se juntan en un acorde que estalla alrededor."]]},
  orsa:{duo:[0,2], cards:[
    [0,"Perno Encadenado","storm","hits",[{t:"bounce",n:[1,2,3],pct:[.4,.5,.6],range:180}],r=>`El Perno conductor salta a ${_R([1,2,3],r)} enemigos más.`],
    [1,"Culata Firme","stone","dmg",[{t:"burst",at:"caster",r:110,pct:[.5,.7,.9],knock:true}],r=>`Apoyar la culata sacude el suelo (${_R([50,70,90],r)}% de daño) y empuja.`],
    [2,"Sobrecarga","storm","stun",[{t:"status",on:"area",rMul:1,status:{stun:[300,450,600]}}],r=>`Cerrar el circuito electrocuta y aturde ${_R([.3,.45,.6],r)} s.`],
    ["ult","Tormenta Eléctrica","storm","zone",[{t:"ground",at:"caster",r:170,dur:[3000,3500,4000],dps:[.3,.4,.5],zap:{every:600,pct:.4}}],r=>`La Tormenta de rescate deja el suelo electrificado ${_R([3,3.5,4],r)} s.`],
    [0,"Cadena de Rayos","storm","hits",[{t:"fan",n:3,spread:.5,pct:.5}],r=>"Dúo: el perno se divide en tres rayos."]]},
  tibor:{duo:[0,2], cards:[
    [0,"Aguijones","poison","poison",[{t:"status",on:"hits",status:{poison:[.3,.45,.6]}}],r=>`La Nube obrera envenena (${_R([30,45,60],r)}% de daño por segundo).`],
    [1,"Colmena Protectora","nature","shield",[{t:"ally",at:"caster",r:200,shield:[.06,.09,.12]}],r=>`Volvé a casa escuda ${_R([6,9,12],r)}% de vida a los aliados cercanos.`],
    [2,"Polen Pegajoso","nature","zone",[{t:"ground",at:"aim",r:[90,105,120],dur:[3000,3500,4000],dps:[.2,.3,.4],slow:[.3,.4,.5]}],r=>`El Polen de aviso deja el suelo pegajoso: frena ${_R([30,40,50],r)}%.`],
    ["ult","Enjambre Real","poison","dmg",[{t:"fan",n:[4,6,8],spread:.9,pct:[.4,.45,.5]}],r=>`El cielo zumba: ${_R([4,6,8],r)} abejas salen en abanico.`],
    [0,"Reina Obrera","poison","dmg",[{t:"burst",at:"aim",r:130,pct:.8,status:{poison:.4}}],r=>"Dúo: la nube estalla en un enjambre que envenena."]]},
  zahra:{duo:[0,2], cards:[
    [0,"Brasas Vivas","fire","zone",[{t:"ground",at:"ahead",r:[85,100,115],dur:[3000,3500,4000],dps:[.3,.4,.5],burn:true}],r=>`La Boca de horno deja brasas encendidas ${_R([3,3.5,4],r)} s.`],
    [1,"Vapor Protector","steam","shield",[{t:"ally",at:"caster",r:200,shield:[.06,.09,.12]}],r=>`Enfriar suelta vapor que escuda ${_R([6,9,12],r)}% a los aliados cercanos.`],
    [2,"Huella Ardiente","fire","hits",[{t:"line",w:40,pct:[.5,.7,.9],status:{burn:.3}}],r=>`El Paso de ceniza quema todo el camino (${_R([50,70,90],r)}%).`],
    ["ult","Explosión de Caldera","fire","stun",[{t:"burst",at:"caster",r:170,pct:[.8,1,1.2],status:{stun:[400,600,800]}}],r=>`Abrir todas las válvulas termina en una explosión que aturde ${_R([.4,.6,.8],r)} s.`],
    [0,"Forja Viva","fire","dmg",[{t:"echo",at:"ahead",delay:450,r:120,pct:.8,status:{burn:.4}}],r=>"Dúo: el horno escupe una segunda llamarada."]]},
  renko:{duo:[0,1], cards:[
    [0,"Surco Profundo","stone","slow",[{t:"status",on:"hits",status:{slow:[.3,.4,.5]}}],r=>`El Surco de contención frena ${_R([30,40,50],r)}% a quien atrapa.`],
    [1,"Montículo Explosivo","stone","dmg",[{t:"echo",at:"aim",delay:500,r:[90,105,120],pct:[.5,.7,.9]}],r=>`El Montículo revienta medio segundo después (${_R([50,70,90],r)}% de daño en área).`],
    [2,"Tierra Removida","stone","zone",[{t:"ground",at:"caster",r:[95,110,125],dur:[3000,3500,4000],dps:[.25,.35,.45],slow:.3}],r=>`Devolver a la tierra deja el suelo removido ${_R([3,3.5,4],r)} s.`],
    ["ult","Terremoto","stone","stun",[{t:"status",on:"area",rMul:1,status:{stun:[400,600,800]}}],r=>`Aquí siguen los nombres: el suelo tiembla y aturde ${_R([.4,.6,.8],r)} s.`],
    [0,"Derrumbe","stone","pull",[{t:"pull",at:"aim",rMul:1.4,px:60},{t:"burst",at:"aim",r:110,pct:.7}],r=>"Dúo: la tierra se hunde: atrae a la Horda al surco y la aplasta."]]},
  sira:{duo:[0,1], cards:[
    [0,"Tinta Corrosiva","poison","poison",[{t:"status",on:"hits",status:{poison:[.3,.45,.6]}}],r=>`La Línea de tinta corroe (${_R([30,45,60],r)}% de daño por segundo).`],
    [1,"Atajo Cortante","void","hits",[{t:"line",w:40,pct:[.5,.7,.9]}],r=>`Volver sobre los pasos corta todo el camino recorrido (${_R([50,70,90],r)}%).`],
    [2,"Borrón","void","dmg",[{t:"burst",at:"caster",r:120,pct:[.5,.7,.9]}],r=>`Borrar el camino estalla alrededor (${_R([50,70,90],r)}% de daño).`],
    ["ult","Mapa Viviente","holy","shield",[{t:"ally",at:"caster",r:260,shield:[.08,.12,.16]}],r=>`El Atlas de los ausentes escuda ${_R([8,12,16],r)}% de vida a los aliados.`],
    [0,"Cartografía","void","hits",[{t:"shards",at:"caster",n:6,pct:.35}],r=>"Dúo: la tinta salpica seis gotas en redondo."]]}
};
for(const [champ, k] of Object.entries(HERO_BOONS)){
  const ids = k.cards.slice(0,4).map((_,i)=>champ+"_bn_"+i);
  k.cards.forEach((c,i)=>{
    const [skill, name, look, test, fx, desc] = c;
    const b = {id:champ+"_bn_"+i, champ, skill, name, look, test, fx, desc};
    if(i === 4) b.duo = [ids[k.duo[0]], ids[k.duo[1]]];
    BOONS.push(b); BOON_BY_ID[b.id] = b;
  });
}
