"use strict";
/* ============================================================
   js/data/champion-presentation.js — PRESENTACIÓN UNIFORME DEL ROSTER
   Cada campeón se presenta igual en Códice, selección, Tienda y regalo inicial:
     NOMBRE · TÍTULO       (título obligatorio)
     tagline               (descripción de tarjeta: 80–170 caracteres, NUNCA copiada de la historia)
     historia del Códice   (300–650 caracteres; los textos canon cortos reciben una frase complementaria)
   Se carga después de registrar todo el roster y antes del normalizador de balance. Lo verifica
   tools/art/roster_gate.js (auditoría de presentación). No cambia ids, estadísticas ni kits.
   ============================================================ */
const CHAMPION_PRESENTATION = {
  tanque:{title:"El Muro de la Puerta Norte", tagline:"Aldric sostiene la primera línea: atrae a la Horda, protege al equipo y arrasa con su torbellino.",
    addendum:"Lleva el escudo abollado de esa noche y no deja que nadie lo enderece: cada golpe es una persona que llegó al otro lado."},
  guerrero:{title:"La Hoja de los Callejones", tagline:"Kael encadena cortes y sangrados, y prepara trampas que castigan a toda una oleada.",
    addendum:"Todavía cobra, pero ahora el precio es otro: que la Horda no vuelva a entrar a su barrio."},
  mago:{title:"El Tejedor Elemental", tagline:"Thalen combina fuego, escarcha y relámpagos para controlar y devastar grupos de enemigos.",
    addendum:"Guarda sus apuntes en dos idiomas que solo él lee, por si el Hechicero vuelve a quemar una biblioteca."},
  soporte:{title:"La Luz del Último Santuario", tagline:"Elyra cura y protege a sus compañeros; la misma luz que los salva purifica a la Horda.",
    addendum:"Reza en voz baja."},
  segador:{title:"El Segador Olvidado", tagline:"Cuanto más cerca de la muerte, más peligroso se vuelve: su guadaña no conoce el cansancio.",
    addendum:"A veces se detiene frente a una tumba sin nombre, como si esperara reconocer la suya."},
  axiom:{title:"El Que Reescribe las Reglas", tagline:"Descubrió que la realidad está construida con reglas y código. No lanza hechizos: reescribe las reglas.",
    addendum:"Lleva una lista de excepciones que no logra explicar; la más larga empieza en las Cicatrices."},
  profeta:{title:"El Oráculo sin Ojos", tagline:"Ve el destino de sus aliados antes de que ocurra. A veces, eso es suficiente para cambiarlo.",
    addendum:"No cuenta todo lo que ve: aprendió que algunas visiones se cumplen justamente por nombrarlas."},
  musashi:{title:"El Rōnin del Bokken", tagline:"Un rōnin veterano que carga un bokken en vez de una katana. Cualquier arma alcanza contra un rival al que se entiende de verdad.",
    addendum:"Cada noche anota en un cuaderno lo que aprendió del enemigo; las páginas sobre la Horda siguen en blanco."},
  cazadora:{title:"La Cazadora de las Ruinas", tagline:"Una tiradora extremadamente móvil que gana velocidad mientras persigue a su presa.",
    addendum:"Deja una flecha clavada en cada sendero que limpia, para que los suyos sepan por dónde volver."},
  nigromante:{title:"El Señor de las Criptas", tagline:"No pelea solo: levanta a los caídos, crea un coloso de piedra y, si hace falta, se vuelve un demonio.",
    addendum:"Devuelve a cada muerto a su tumba cuando termina la pelea; es la única promesa que nunca rompió."},
  libertador:{title:"El Comandante de la Cordillera", tagline:"Un comandante legendario que castiga con disparos devastadores y lidera cargas capaces de quebrar ejércitos.",
    addendum:"Su caballo conoce el camino de vuelta de todas las campañas; él solo conoce el de ida."},
  eren:{title:"El Portador de los Muros", tagline:"Convierte el peligro en furia y domina el campo con movilidad extrema hasta liberar una fuerza monstruosa.",
    addendum:"Escucha los muros antes de cruzarlos: todavía cree oír golpes del otro lado."},
  ynara:{tagline:"Médica silenciosa del halo blanco: cura con luz, agua limpia y estrogonof, y castiga con una mirada.",
    addendum:"Cuando la paciencia se le termina, el halo se abre y los refugios entienden por qué la llaman santa."},
  myla:{tagline:"Maga de la merienda encantada: levanta torres de yogur, cubre de crema el camino y hace berrinches devastadores.",
    addendum:"Sus berrinches asustan más a la Horda que a sus amigos: ellos ya saben que después viene la merienda."},
  brasa:{tagline:"Maquinista de la Fábrica: arma torretas, purga la corrupción y sobrecarga sus máquinas en el momento justo.",
    addendum:"Repara cada torreta con piezas de las máquinas que la Horda corrompió, para que trabajen otra vez del lado correcto."},
  eslabon:{tagline:"Carcelero arrepentido: engancha, traza líneas que nadie cruza y protege a quien más lo necesita.",
    addendum:"Las cadenas que antes cerraban celdas ahora frenan a la Horda; las llaves se las dio a los presos."},
  morwen:{tagline:"Alquimista del Fúngico: mezcla resina y catalizador para provocar reacciones controladas sobre la Horda.",
    addendum:"Etiqueta cada frasco con el nombre de la voz que guarda, para que nadie la confunda con la Madre Espora."},
  farolero:{tagline:"Guía de las expediciones: planta faroles, abre senderos seguros y sostiene la luz hasta que pase el último.",
    addendum:"Cuenta a los que vuelven antes de apagar el farol y, si falta alguno, lo deja encendido toda la noche en la entrada de la mina."},
  iria:{tagline:"Reparadora de sellos: tiende anclas, tensa sus hilos y cierra triángulos de control sobre la Horda.",
    addendum:"Lleva en la muñeca el primer nudo que ató, por si alguna vez tiene que deshacer todo y empezar de nuevo."},
  vesper:{tagline:"Asesina de preparación: hilvana las sombras de los corrompidos, marca grupos y consume las puntadas."},
  nahir:{tagline:"Flanqueador del Laberinto: usa reflejos breves para atacar desde ángulos que la Horda no espera."},
  baltra:{tagline:"Tanque de la campana hundida: convierte cada golpe recibido en ondas que protegen y castigan."},
  maura:{tagline:"Pastora de zarzas: siembra espinas, cura con lo que crece y hace caminar al bosque contra la Horda."},
  dariel:{tagline:"Director de una marcha que no se rinde: alterna notas para curar, proteger y quebrar a la Horda."},
  orsa:{tagline:"Tiradora paciente: perfora y marca a distancia, se afirma y descarga todas las marcas de una vez."},
  tibor:{tagline:"Apicultor de la colmena errante: envía su colonia a picar zonas enteras y la recoge para protegerse."},
  zahra:{tagline:"Forjadora de ceniza: calienta su horno con cada golpe, lo enfría a tiempo y libera el calor acumulado."},
  renko:{tagline:"Zapador incansable: cava trincheras, levanta montículos y entierra a la Horda bajo su propio terreno."},
  sira:{tagline:"Cartógrafa de rutas vivas: dibuja su camino, lo recorre al revés y convierte el mapa en un arma."},
  nano_gm:{tagline:"Regente Fundador: alterna Luz y Oscuridad, reescribe las reglas locales de la Arena y la divide en su Juicio."},
  facu_gm:{tagline:"Regente Fundador: encadena corriente, presión y oleada; el océano responde antes que sus órdenes."},
  aurelia:{tagline:"Arquitecta de luz sólida: deja nodos solares que se unen en triángulos y culmina en una catedral."},
  khepri:{tagline:"Asesino del enjambre: lanza, recoge y viste a sus escarabajos; cada muerte cercana los alimenta."},
  velmira:{tagline:"Reina de las cuatro máscaras: cada rostro es un estado y cambiar de máscara potencia el siguiente acto."},
  vhal:{tagline:"Astrónomo de cuerpo estrellado: acumula Masa sobre la Horda hasta que colapsa sobre sí misma."},
  bront:{tagline:"Armadura viviente: desprende placas protectoras, levanta murallas y se ancla como una ciudadela."},
  oriel:{tagline:"Portera de las Cicatrices: abre pares de portales que llevan a su equipo lejos de la Horda."}
};
// Nombre propio sin epíteto: la identidad de la Biblia (js/data/champion-identity.js) deja CLASSES[id].name
// como "Nombre, título"; las tarjetas muestran el título en su propia línea y no lo repiten.
function championShortName(id){ const c = typeof CLASSES !== "undefined" && CLASSES[id]; return c ? (c.shortName || c.name) : id; }
function championTitle(id){ const c = typeof CLASSES !== "undefined" && CLASSES[id]; return (c && c.title) || ""; }
(function(){
  for(const [id, p] of Object.entries(CHAMPION_PRESENTATION)){
    const c = CLASSES[id]; if(!c) continue;
    const port = typeof PORTADORES !== "undefined" ? PORTADORES[id] : null;
    c.title = p.title || (port && port.title) || c.title || "";
    const cat = CHAMPION_CATALOG.find(x => x.id === id); if(cat && p.tagline) cat.lore = p.tagline;
    const L = CODEX_CHAMP_LORE[id];
    if(L && p.addendum && L.history && !L.history.includes(p.addendum)) L.history = L.history + " " + p.addendum;
  }
})();
