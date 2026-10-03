"use strict";
/* ============================================================
   js/data/champion-identity.js
   CHAMPION STANDARD — fuente única de PRESENTACIÓN de cada campeón (Game Bible:
   docs/bible/CHAMPION_BIBLE.md). No toca estadísticas, habilidades ni balance: solo nombre,
   título, frase de catálogo, origen, historia del Códice, ataque básico y pasiva.

   Formato canónico:
     name     nombre propio (1-2 palabras). Es lo que lee el HUD.
     title    epíteto en minúscula con artículo ("el Último Bastión"). Menús: "Nombre, título".
     tagline  1 frase (60-130 caracteres) para catálogo / tienda / selección.
     origin   lugar de origen legible (nunca una clave interna como "ciudad").
     lore     historia del Códice: 3-4 frases, 260-480 caracteres. Herida -> don -> motivo.
     basic    {name, desc} ataque básico.
     passive  {name, ico, desc} rasgo permanente. Solo se escribe una pasiva que EXISTE en el
              código (las de los clásicos viven en CLASSIC_PASSIVES, js/data/champion-tuning.js).

   Se aplica una vez al cargar, después de registrar a todos los campeones (portadores y
   expedición) y antes del normalizador de entrada (js/systems/champion-entry-balance.js).
   Cambios de nombres/lore registrados en docs/bible/AUDIT_LOG.md.
   ============================================================ */
const CHAMPION_IDENTITY = {
  tanque:{ name:"Aldric", title:"el Último Bastión", origin:"Muralla de la Ciudad Maldita",
    tagline:"Sostiene la primera línea: atrae a la Horda, protege al equipo y arrasa con su torbellino.",
    lore:"Aldric era capitán de la guardia cuando la Horda volvió a la Ciudad Maldita. Sostuvo la puerta norte tres noches seguidas, hasta que el escudo le quedó soldado al brazo. Nadie sabe cómo sigue en pie. Desde entonces camina delante de todos: dice que ya tiene la costumbre de recibir los golpes y que prefiere que sean suyos.",
    basic:{name:"Golpe de Escudo", desc:"Golpe corto en arco: alcanza a todos los enemigos frente a él."},
    passive:{name:"Bastión", ico:"🛡", desc:"Los aliados a menos de 200 u de Aldric reciben 8% menos daño."} },
  guerrero:{ name:"Kael", title:"la Daga Carmesí", origin:"Los callejones de la Ciudad Maldita",
    tagline:"Encadena cortes y sangrados, y prepara trampas que castigan a toda una oleada.",
    lore:"Kael cobraba por desaparecer a la gente equivocada. Cuando la ciudad cayó descubrió que los monstruos también sangran, y que él sabe exactamente dónde cortar. No pelea por los Guardianes ni por la gloria: pelea porque nadie le paga mejor que la venganza, y porque la Horda se llevó lo único que no estaba en venta.",
    basic:{name:"Puñalada", desc:"Corte rápido a un solo objetivo."},
    passive:{name:"Depredador", ico:"🩸", desc:"Sus ataques básicos hacen 15% más de daño a enemigos que sangran o están envenenados."} },
  mago:{ name:"Thalen", title:"el Tejedor Elemental", origin:"La Torre de las Dos Llamas",
    tagline:"Combina fuego, escarcha y relámpagos para controlar y devastar grupos de enemigos.",
    lore:"Thalen estudió el fuego y el hielo como opuestos hasta entender que son el mismo idioma. Leyó sobre los Cuatro Guardianes en libros que el Hechicero Supremo había prohibido, y es de los pocos que sospecha que la historia oficial está incompleta. Cada hechizo que lanza es también una pregunta que todavía nadie le responde.",
    basic:{name:"Proyectil Arcano", desc:"Disparo mágico a distancia contra el enemigo más cercano."},
    passive:{name:"Maestro Elemental", ico:"✶", desc:"Las reacciones que provoca (Vapor, Quiebre, Conducción) pegan más: su bonus de daño crece 50%."} },
  soporte:{ name:"Elyra", title:"la Guardiana del Alba", origin:"El Santuario del Alba",
    tagline:"Cura y protege a sus compañeros; la misma luz que los salva purifica a la Horda.",
    lore:"Elyra era la sanadora del último santuario que resistió en la ciudad. Aprendió que una bendición a tiempo salva más vidas que cualquier espada, y que la luz que cierra heridas también quema a lo que la Horda corrompió. Su juramento es sencillo y obstinado: que ninguna vida se pierda sin que alguien haya luchado por ella.",
    basic:{name:"Rayo de Alba", desc:"Disparo de luz a distancia."},
    passive:{name:"Gracia del Alba", ico:"✚", desc:"Sus curaciones a aliados con menos de 35% de vida curan 25% más."} },
  segador:{ name:"Segador", title:"el Olvidado", origin:"Un campo de batalla que nadie recuerda",
    tagline:"Cuanto más cerca de la muerte, más peligroso se vuelve.",
    lore:"Nadie sabe su nombre, ni siquiera él. Despertó entre los muertos de una guerra olvidada con una guadaña en las manos y una furia que no se apaga. La Horda lo reconoce como algo propio y lo teme por eso mismo. Cuanto más cerca está de volver a morir, más se parece a lo que los monstruos sueñan cuando sueñan con un cazador.",
    basic:{name:"Siega", desc:"Tajo amplio en arco a corta distancia."},
    passive:{name:"Furia", ico:"🩸", desc:"No regenera energía sola: la Furia se gana golpeando y recibiendo daño. Pelear es su recurso."} },
  axiom:{ name:"Axiom", title:"el Reescritor", origin:"Más allá de la realidad conocida",
    tagline:"Descubrió que la realidad está construida con reglas. No lanza hechizos: reescribe las reglas.",
    lore:"Axiom descubrió que el mundo está construido con reglas, y que las reglas se pueden reescribir. Para él la Horda es un error en el sistema: una línea de código que alguien dejó abierta a propósito. Cada vez que corrige una zona del mapa encuentra otra firma del mismo autor. Quiere encontrar a quien la escribió antes de que termine el programa.",
    basic:{name:"Paquete Corrupto", desc:"Disparo a distancia contra el enemigo más cercano."},
    passive:{name:"Recompilar", ico:"↻", desc:"Cada enemigo que muere por sus habilidades le devuelve 3 de energía (hasta 15 por segundo)."} },
  profeta:{ name:"Ismara", title:"la Profeta Ciega", origin:"El Oráculo sin ojos",
    tagline:"Ve el destino de sus aliados antes de que ocurra. A veces, eso alcanza para cambiarlo.",
    lore:"Ismara entregó los ojos al Oráculo a cambio de ver unos segundos más adelante. A veces le alcanza para cambiar el destino de un aliado, y a veces solo para verlo venir. Pelea cuerpo a cuerpo porque nadie más está tan cerca del golpe que va a llegar. Sus visiones sobre los cristales la despiertan de noche: siempre terminan en el mismo lugar, en llamas.",
    basic:{name:"Hoja del Augurio", desc:"Corte cuerpo a cuerpo a un solo objetivo."},
    passive:{name:"Presagio", ico:"☾", desc:"Cada 4 golpes básicos consecutivos dispara sola un giro extra que golpea en área."} },
  musashi:{ name:"Musashi", title:"el Rōnin del Bokken", origin:"Un camino sin señor",
    tagline:"Un rōnin que carga un bokken en vez de una katana: elige un rival, lo estudia y lo termina.",
    lore:"Musashi cruzó cien duelos para llegar a la Ciudad Maldita y ganó todos sin desenvainar una hoja de verdad. Cree que cualquier arma alcanza contra un rival al que se entiende por completo. Elige uno, lo estudia y lo termina de un solo corte. Ahora busca al único adversario que todavía no entiende: la Horda, que nunca pelea dos veces igual.",
    basic:{name:"Combo del Bokken", desc:"Cadena muy rápida de golpes a un objetivo; el tercero pega más fuerte."},
    passive:{name:"Marca de Duelo", ico:"⚔", desc:"Marca a su rival: golpearlo acumula Concentración (hasta 10), que aumenta su daño contra ese objetivo."} },
  cazadora:{ name:"Sylva", title:"la Cazadora del Bosque", origin:"Los bosques de las Ruinas",
    tagline:"Tiradora extremadamente móvil que gana velocidad mientras persigue a su presa.",
    lore:"Sylva creció entre los menhires de las Ruinas Célticas, antes de que se pudrieran. Conoce cada sendero, cada rastro y cada presa del bosque viejo. Volvió persiguiendo a la Horda y encontró al Guardián Ancestral convertido en otra cosa. Todavía no se lo perdona, y por eso nunca deja de moverse: quedarse quieta sería empezar a llorarlo.",
    basic:{name:"Flecha", desc:"Disparo a distancia; cuanto más Impulso, más rápido dispara."},
    passive:{name:"Instinto de Caza", ico:"🏹", desc:"Rastreo marca a su Presa e Impulso crece mientras se mueve o ataca: más velocidad y cadencia."} },
  nigromante:{ name:"Ilvar", title:"el Señor de las Criptas", origin:"Las criptas bajo la ciudad",
    tagline:"No pelea solo: levanta a los caídos, crea un coloso de carne y, si hace falta, se vuelve un demonio.",
    lore:"Ilvar creció cuidando las criptas bajo la ciudad. Los vivos le tienen miedo; los muertos le obedecen. Levanta a los caídos, cose gólems con lo que queda y, si hace falta, deja que el Abismo lo use de puerta. Dice que la Horda y él hacen exactamente lo mismo, con una única diferencia: él les pide permiso a los muertos.",
    basic:{name:"Proyectil de Hueso", desc:"Disparo a distancia contra el enemigo más cercano."},
    passive:{name:"Necromancia", ico:"☠", desc:"Los enemigos caídos dejan cadáveres: sus esqueletos se levantan solos de los cuerpos cercanos."} },
  libertador:{ name:"San Martín", title:"el Libertador", origin:"Del otro lado de la Cordillera",
    tagline:"Un comandante legendario: disparos devastadores, bayoneta y cargas que quiebran ejércitos.",
    lore:"José de San Martín ya cruzó una cordillera entera para liberar a medio continente. Ahora cruza otra, más extraña, para llegar a la Ciudad Maldita. Castiga con disparos lentos y devastadores, y lidera cargas capaces de quebrar ejércitos. Frente a la Horda repite lo mismo que dijo siempre: seamos libres, que lo demás no importa nada.",
    basic:{name:"Fusil de Granadero", desc:"Disparo lento y potente; cada 4 impactos el siguiente es un Disparo de Oficial."},
    passive:{name:"Soldado Cabral", ico:"🎖", desc:"Una vez por partida, un golpe mortal lo deja en 1 de vida, invulnerable 2 s y más rápido."} },
  eren:{ name:"Eren", title:"el Indómito", origin:"Detrás de los muros",
    tagline:"Convierte el peligro en furia hasta liberar una fuerza monstruosa capaz de hacer temblar la arena.",
    lore:"Eren creció encerrado entre muros mientras algo enorme golpeaba del otro lado. Convierte el peligro en furia y la furia en velocidad. Cuando no alcanza, libera algo que no debería llevar adentro: El Portador. No quiere salvar el mundo ni heredar a los Cuatro; quiere que nada, nunca más, vuelva a encerrarlo.",
    basic:{name:"Doble Hoja", desc:"Combo de tres cortes en arco; el tercero carga más Furia."},
    passive:{name:"Seguir Adelante", ico:"⚡", desc:"Con menos de 25% de vida gana velocidad, daño y más Furia."} },
  ynara:{ name:"Ynara", title:"la Médica de los Refugios", origin:"Los refugios de la Ciudad Maldita",
    tagline:"Médica silenciosa: cura, protege y nunca pide perdón." },
  myla:{ name:"Myla", title:"la Niña de la Cuchara", origin:"La Ciudad de los Primeros Pasos",
    tagline:"Maga de control: torres de yogur, charcos pegajosos y un berrinche que sacude la arena.",
    lore:"Myla descubrió que su merienda podía convertirse en magia. Con una cuchara encantada y una sonrisa desafiante levanta torres de yogur y cubre de crema los caminos de la Horda. Los adultos de los refugios dicen que es demasiado chica para pelear; ella responde que los monstruos también le tienen miedo a un berrinche. Donde otros ven oscuridad, ve una aventura por compartir." },
  brasa:{ name:"Brasa", title:"la Mecánica Fugitiva", origin:"La Fábrica Sin Fin",
    tagline:"Torretas, purgas y desarmes: convierte la maquinaria de la Fábrica contra la Horda.",
    lore:"Brasa mantenía las máquinas de la Fábrica Sin Fin. Un día descubrió que una de sus cadenas no estaba hecha para un monstruo, sino para alguien que se había negado a obedecer. Escapó con los planos bajo el brazo y una llave inglesa que nunca suelta. Todavía no sabe quién estaba del otro lado de esa cadena, y desarma cada máquina de la Horda buscando la respuesta." },
  eslabon:{ name:"Garren", title:"el Eslabón", origin:"Las celdas de los portadores",
    tagline:"Carcelero que abrió las celdas: ganchos, líneas y un grillete que protege al equipo.",
    lore:"Garren custodió una prisión de portadores mucho después de los Cuatro. Lo llamaban el Eslabón porque nada salía de las celdas sin pasar por él. Una noche rompió su juramento y abrió todas las puertas. Conserva un grillete atado al brazo: el peso le recuerda que proteger también puede empezar por abrir una puerta." },
  morwen:{ name:"Morwen", title:"la Destiladora de Ecos", origin:"El Reino Fúngico",
    tagline:"Alquimista de reactivos: resina, sal y destilados que reaccionan entre sí.",
    lore:"Morwen estudiaba las voces que el micelio repite cuando nadie escucha. Aprendió a destilar sus ecos en frascos sin entregarse a la Madre Espora, y descubrió que cada reactivo recuerda a quien lo pronunció. Viaja con un alambique a la espalda y etiqueta cada frasco con un nombre. En algunos todavía hay una voz que dice: váyanse, yo me quedo." },
  farolero:{ name:"Tobías", title:"el Farolero", origin:"Las Minas Profundas",
    tagline:"Sostiene la luz para el equipo: linternas, destellos y caminos seguros en la oscuridad.",
    lore:"Tobías encendía los faroles de las Minas Profundas. Volvió de otra expedición siguiendo el ruido de un yunque y no volvió con todos. Ahora baja otra vez con la misma lámpara. No promete que la oscuridad desaparezca: promete sostener la luz hasta que pase el último, y quedarse un rato más por si alguien vuelve." },
  iria:{ name:"Iria", title:"la Tejedora de Límites", origin:"Los límites del Laberinto",
    tagline:"Ancla, tensa y corta: une puntos del mapa con hilos que castigan a quien los cruza.",
    lore:"Iria reparaba límites pequeños bajo la sombra del Guardián del Laberinto: umbrales, cerrojos, costuras entre un pasillo y otro. Un día encontró puertas que nadie había roto, abiertas desde adentro. Aprendió a anclar hilos entre tres puntos y a sostener una fisura el tiempo justo para que alguien cruce. Sabe que el Sello de los Cuatro pesa más que toda su orden, y lo sostiene igual." },
  vesper:{ name:"Vesper", title:"la Costurera de Sombras", origin:"El teatro de la Ciudad Maldita",
    tagline:"Asesina de preparación: marca grupos, cose una salida y consume los hilos.",
    lore:"Vesper remendaba los trajes del teatro de la Ciudad. La noche del regreso encontró a su hermana frente a un espejo: el cuerpo seguía allí, pero la sombra ya se movía sola. Intentó sujetarla con el hilo con el que cosía nombres dentro de los abrigos. Desde entonces hilvana las sombras de los corrompidos, y sigue cada Cicatriz preguntándose cuánto queda de una persona." },
  nahir:{ name:"Nahir", title:"el Restaurador de Espejos", origin:"Las galerías del Laberinto",
    tagline:"Asesino de reflejos: sus fragmentos de espejo repiten cada golpe.",
    lore:"Nahir restauraba espejos antes de entrar al Laberinto. En una galería encontró su propia imagen varios pasos por delante, arrodillada ante una figura que no aparecía en el cristal. Rompió el espejo, pero tres fragmentos conservaron aquel gesto: los lleva en las muñecas y cada uno repite lo que él hace. Busca una salida que su reflejo todavía no conozca." },
  baltra:{ name:"Baltra", title:"la Campana Sumergida", origin:"La costa de la Arena Acuática",
    tagline:"Tanque de señal: una campana-escafandra que sostiene al equipo bajo presión.",
    lore:"Baltra cuidaba la campana de aviso de un poblado de la costa. Cuando el agua apareció donde antes había calles, se ató al badajo para seguir tocando mientras los demás subían. La encontraron dentro de la campana, respirando una bolsa de aire que nadie supo explicar. Convirtió el bronce en escafandra: su señal no promete victoria, promete que alguien sostiene la otra punta." },
  maura:{ name:"Maura", title:"la Pastora de Espinas", origin:"Las Ruinas Célticas",
    tagline:"Tanque de zarzas: abre veredas estrechas y protege lo vivo sin dejar que lo ocupe todo.",
    lore:"Maura guiaba rebaños por senderos que ya no figuran en los mapas. Al volver a las Ruinas encontró las cercas convertidas en espinas y un camino que parecía respirar. No intentó dominar el bosque: cortó una vereda tan estrecha que solo se pasaba de a uno, y por ella salieron todos. Desde esa noche las zarzas crecen en su cayado, y ella las poda cada mañana." },
  dariel:{ name:"Dáriel", title:"el Último Compás", origin:"El teatro de la Ciudad Maldita",
    tagline:"Soporte de ritmo: marca el compás que coordina al equipo y lo saca del peligro.",
    lore:"Dáriel dirigía la música entre escenas. Cuando el Presentador dejó de permitir que el público se levantara, cambió el final de una melodía por la señal de evacuación de los tramoyistas, y unos pocos siguieron el ritmo hasta las puertas de servicio. Él salió último, marcando el compás. Ahora viaja con los portadores tocando una canción que sabe callarse cuando todos cruzaron." },
  orsa:{ name:"Orsa", title:"la Guardacables", origin:"Las Minas Profundas",
    tagline:"Asesina de ballesta: almacena descargas en el metal y responde a quien golpee desde abajo.",
    lore:"Orsa revisaba los cables que llevaban señales entre los niveles de las Minas. Durante un apagón oyó tres golpes en una línea cortada hacía años, bajó con una bobina a la espalda y encontró una cuadrilla que repetía el mismo turno sin recordar cómo había empezado. Solo uno siguió el cable hasta la luz. Hoy su ballesta guarda descargas para que siempre quede una respuesta." },
  tibor:{ name:"Tibor", title:"el Rey sin Corona", origin:"Los apiarios del Reino Fúngico",
    tagline:"Mago de enjambre: abejas que marcan, protegen el aire limpio y castigan a la colonia.",
    lore:"A Tibor lo llamaban rey porque era incapaz de dar una orden a sus abejas: les abría las cajas y esperaba. Cuando el micelio empezó a repetir voces humanas, una colonia se instaló en su carro y las demás quedaron cubiertas de cera gris. Las conduce por donde el aire todavía deja pasar la luz. Si encuentra un lugar seguro, piensa dejar allí la colmena y marcharse sin corona." },
  zahra:{ name:"Zahra", title:"la Mano de la Válvula", origin:"Los hornos de la Fábrica Sin Fin",
    tagline:"Maga de calor contenido: descarga ráfagas cortas y cuenta antes de volver a abrir el puño.",
    lore:"Zahra abría las compuertas de los hornos de la Fábrica al final de cada turno. Una noche los indicadores dejaron de bajar y los capataces ordenaron mantener la línea. Ella arrancó el cierre de una válvula y sostuvo la salida mientras sus compañeros escapaban. Su guante absorbió un calor que vuelve cada vez que una Cicatriz está cerca, y aprendió a soltarlo de a poco." },
  renko:{ name:"Renko", title:"el Jardinero de Nombres", origin:"El cementerio de la Ciudad Maldita",
    tagline:"Tanque de surcos: contiene el avance enemigo sin cerrar nunca una salida.",
    lore:"Renko anotaba nombres para quienes ya no podían hacerlo. Cuando el cementerio empezó a devolver las lápidas al camino, dejó de cavar: no iba a entregar más recuerdos a una tierra que los repetía mal. Cargó las placas pequeñas en un carro y llevó a los vivos hasta la puerta norte. Busca un lugar donde dejar esos nombres y volver a llamarse, simplemente, jardinero." },
  sira:{ name:"Sira", title:"la Cartógrafa del Regreso", origin:"Las entradas del Laberinto",
    tagline:"Maga de rutas: marca el camino de vuelta y borra los que dejaron de ser seguros.",
    lore:"El padre de Sira volvió del Laberinto con un mapa en blanco, señaló caminos que nadie más veía y un día salió sin abrigo. Sira siguió su última marca y encontró otras en muros, telas y huesos: no indicaban adónde ir, sino dónde alguien había conseguido regresar. Desde entonces registra sus propios pasos y borra las rutas que ya no son seguras." }
};
// Bandas del estándar (también las usa el validador: tools/bible/champion-validator.js).
const CHAMPION_STANDARD = {
  loreMin:260, loreMax:480, taglineMin:40, taglineMax:130,
  nameMaxWords:2, titlePattern:/^(el|la|los|las) [A-ZÁÉÍÓÚÑ]/,
  roleCategories:["tanque","asesino","mago","soporte"],
  abilityDescMax:200, abilityShortMax:90
};
function championDisplayName(key){
  const id = CHAMPION_IDENTITY[key];
  return id ? id.name + ", " + id.title : (CLASSES[key] && CLASSES[key].name) || key;
}
// Skins: el nombre es SOLO el de la apariencia ("Bastión Ancestral"); la UI muestra el campeón aparte
// (tienda, Códice, sala). Antes convivían "Tanque, …", "La Profeta, …", "Vesper — …" y nombres sin prefijo.
const SKIN_NAME_OLD_PREFIXES = ["Tanque","Asesino","Mago","Soporte","Sanadora","Nigromante","El Libertador","La Profeta","La Cazadora","Segador Olvidado","El Eslabón","El Farolero"];
function normalizeSkinName(name, champKey){
  const m = /^(.+?)(?:, | — )(.+)$/.exec(String(name||""));
  if(!m) return name;
  const id = CHAMPION_IDENTITY[champKey];
  const known = new Set(SKIN_NAME_OLD_PREFIXES);
  if(id) known.add(id.name);
  if(typeof CLASSES!=="undefined" && CLASSES[champKey]) known.add(CLASSES[champKey].hudName||"");
  return known.has(m[1].trim()) && m[2].trim() ? m[2].trim() : name;
}
function applySkinNameStandard(){
  let n = 0;
  for(const reg of [typeof CROMA_SKINS!=="undefined" ? CROMA_SKINS : null, typeof SET_SKINS!=="undefined" ? SET_SKINS : null]){
    if(!reg) continue;
    for(const d of Object.values(reg)){ if(!d || !d.name) continue; const nn = normalizeSkinName(d.name, d.champ); if(nn !== d.name){ d.name = nn; n++; } }
  }
  return n;
}
function applyChampionIdentity(){
  const report = [];
  for(const [key, id] of Object.entries(CHAMPION_IDENTITY)){
    const c = typeof CLASSES!=="undefined" && CLASSES[key];
    if(!c){ report.push({key, missing:true}); continue; }
    const before = c.name;
    c.shortName = id.name; c.title = id.title; c.hudName = id.name;
    c.name = id.name + ", " + id.title;
    if(id.tagline) c.tagline = id.tagline;
    if(id.basic) c.basicAttack = id.basic;
    if(id.passive && !c.passive) c.passive = id.passive; // nunca pisa una pasiva ya registrada
    if(typeof CODEX_CHAMP_LORE!=="undefined"){
      const L = CODEX_CHAMP_LORE[key] || (CODEX_CHAMP_LORE[key] = {});
      if(id.origin) L.origin = id.origin;
      if(id.lore) L.history = id.lore;
    }
    if(typeof CHAMPION_CATALOG!=="undefined"){
      const row = CHAMPION_CATALOG.find(r=>r.id===key);
      if(row && id.tagline) row.lore = id.tagline;
    }
    if(before !== c.name) report.push({key, from:before, to:c.name});
  }
  return report;
}
const CHAMPION_IDENTITY_CHANGES = applyChampionIdentity();
const SKIN_NAMES_NORMALIZED = applySkinNameStandard();
