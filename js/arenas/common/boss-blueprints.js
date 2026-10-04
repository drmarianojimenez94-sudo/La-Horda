"use strict";
/* ============================================================
   js/arenas/common/boss-blueprints.js
   BOSS FACTORY — ficha de datos (BossDefinition) de cada jefe y subjefe. Game Bible: docs/bible/BOSS_BIBLE.md.

   Regla de la casa: JEFE + ARENA = ENCUENTRO. Un jefe que podría pelear igual en cualquier arena está
   incompleto. Cada ficha declara QUÉ partes de su arena usa (o lo castigan) como "ganchos"; el código los
   marca con bossArenaEvent(id) (js/systems/boss-arena-hooks.js) y tools/bible/boss-validator.js los
   comprueba en una pelea REAL: una ficha que promete algo que el código no hace queda en FAIL.

   No duplica valores: vida/daño en ENEMY_BASE, fases y ataques en BOSS_DESIGNS / controladores de cada
   arena, epítetos y consejos en BOSS_DESIGNS / SUBBOSS_TIPS / ARENA_BOSS_TIPS, la relación general con la
   arena en ARENA_BLUEPRINTS[arena].boss. Esto es la DEFINICIÓN de diseño que los une.

   Campos (todos obligatorios salvo ?):
     arena, rank ("jefe"|"subjefe"), level      dónde y cuándo aparece (nivel de la campaña)
     name, fantasy                               nombre y la fantasía que vende (una frase)
     rule                                        LA regla de su pelea, en una frase (lo que el jugador aprende)
     hooks [{id, mode, uses, effect}]            relación con la arena. mode:
                                                   auto   pasa sola en una pelea real (el validador la EXIGE)
                                                   player la provoca una decisión del jugador (el validador la informa;
                                                          tests propios la prueban: tools/bosses/t_boss_arena_hooks.js)
                                                   phase  depende de llegar a una fase de vida (se informa)
     counterplay [..]                            qué hace el jugador para ganar (no "pegar más")
     presentation {entrance, titleCard, death}   cómo entra, si tiene cartel grande, cómo muere
     art {src, borrowed?, brief?, grade, why}    estado del arte según docs/ART_BIBLE.md: PASS | FIX | REDRAW
                                                   (la densidad de píxel la mide tools/art/arena_lineup.js)
     status {grade, why}                         auditoría de diseño: PASS | FIX | REWORK (actualizar al cambiar)
     members?                                    otros tipos del mismo encuentro (los cuatro Doppelgängers)
     sim?                                        false = modo propio sin simulación de campaña (Arena Divina)
     after?                                      tipo que hay que vencer antes (formas encadenadas: el validador no la
                                                   alcanza en su ventana y la informa como "posterior")
   ============================================================ */
const BOSS_BLUEPRINTS = {
  /* ---------------- 01 · CIUDAD MALDITA ---------------- */
  cm_presentador:{arena:"ciudad", rank:"jefe", level:10, name:"El Presentador",
    fantasy:"El dueño del espectáculo: la ciudad en llamas es su teatro y vos, el número principal.",
    rule:"La función se corta: interrumpí el GRAN NÚMERO o devolvele el cometa, y cubrite tras los pilares en la OVACIÓN.",
    hooks:[
      {id:"cm_presentador.estructura", mode:"auto", uses:"estructuras críticas", effect:"el Gran Número lanza el cometa contra una estructura en pie"},
      {id:"cm_presentador.publico", mode:"phase", uses:"civiles rescatados", effect:"acto III: el público espectral es menor cuantos más civiles salvaste"},
      {id:"cm_presentador.ovacion", mode:"phase", uses:"pilares del escenario", effect:"OVACIÓN: quien no esté detrás de un pilar recibe el golpe"},
      {id:"cm_presentador.corte", mode:"player", uses:"—", effect:"cortar el Gran Número con daño lo deja EXPUESTO"},
      {id:"cm_presentador.reflejo", mode:"player", uses:"estructuras", effect:"interceptar el cometa lo devuelve: EXPUESTO"}],
    counterplay:["Rescatar civiles en los niveles previos (menos público en el acto III)", "Cortar o devolver el Gran Número", "Pilar entre vos y él en la Ovación"],
    presentation:{entrance:"preludio de reflector y aplausos (5,2 s)", titleCard:true, death:"secuencia propia de 9,5 s según el rescate"},
    art:{src:"assets/sprites/arenas/ciudad/cm_presentador*/atlas.png", borrowed:"mago_hielo_cristal (recoloreado por acto)", brief:"P0-01", grade:"REDRAW", why:"su arte propio es de 32 px dibujado a 4–5×: se ve en bloques; hoy usa el cuerpo del Mago de Hielo recoloreado"},
    status:{grade:"PASS", why:"pelea de escenario con pilares, estructuras y rescate; pendiente: arte propio y aviso de los abanicos de proyectiles"}},
  cm_maestro:{arena:"ciudad", rank:"subjefe", level:9, name:"Maestro de Ceremonias",
    fantasy:"El que dirige la función: marca a la víctima y el Tramoyista le tira la escenografía encima.",
    rule:"Su MARCA (reflector) sigue a un guardián: llevala adentro de un REFUGIO en pie y el escudo verde la anula.",
    hooks:[
      {id:"cm_maestro.escena", mode:"auto", uses:"escenografía (Tramoyista)", effect:"cada marca le ordena al Tramoyista tirar decorado sobre el marcado"},
      {id:"cm_maestro.refugio", mode:"player", uses:"refugios (zonas seguras)", effect:"la marca no atraviesa el escudo de un refugio en pie"}],
    counterplay:["Correr al refugio con la marca encima", "Matarlo primero para que el Tramoyista no tenga a quién seguir"],
    presentation:{entrance:"telón (3,2 s)", titleCard:false, death:"enfurece al Tramoyista"},
    art:{src:"assets/sprites/arenas/ciudad/cm_maestro/atlas.png", borrowed:"druida_arena", brief:"P0-03", grade:"REDRAW", why:"arte de 24 px dibujado a 5×"},
    status:{grade:"PASS", why:"dirige la escena con el Tramoyista; los refugios lo contrarrestan"}},
  cm_tramoyista:{arena:"ciudad", rank:"subjefe", level:9, name:"El Tramoyista",
    fantasy:"El que mueve la escenografía: derrumba la ciudad encima de los que la defienden.",
    rule:"Sus golpes y decorados rompen las estructuras: pelealo lejos de lo que tenés que proteger.",
    hooks:[{id:"cm_tramoyista.estructura", mode:"auto", uses:"estructuras críticas", effect:"el golpe y la escenografía que tira dañan estructuras"}],
    counterplay:["Alejarlo de las estructuras", "Matar primero al Maestro o al Tramoyista: el otro se enfurece"],
    presentation:{entrance:"telón (3,2 s)", titleCard:false, death:"genérica"},
    art:{src:"assets/sprites/arenas/ciudad/cm_tramoyista/atlas.png", borrowed:"automata", brief:"P0-04", grade:"REDRAW", why:"arte de 32×46 px dibujado a ~5×"},
    status:{grade:"PASS", why:"amenaza las estructuras de la Ciudad"}},
  cm_dama:{after:"cm_tramoyista", arena:"ciudad", rank:"subjefe", level:9, name:"La Dama del Telón",
    fantasy:"La que baja el telón: espejismos, oscuridad y la ciudad cayendo en línea.",
    rule:"Su línea de telón rompe estructuras; los espejismos tienen 1 de vida: limpiá rápido.",
    hooks:[{id:"cm_dama.estructura", mode:"auto", uses:"estructuras críticas", effect:"la línea del telón daña estructuras"}],
    counterplay:["Romper los espejismos", "Salir de la zona oscura"],
    presentation:{entrance:"apagón (3,4 s)", titleCard:false, death:"revelación del Presentador"},
    art:{src:"assets/sprites/arenas/ciudad/cm_dama/atlas.png", borrowed:"dama_bosque", brief:"P0-02", grade:"REDRAW", why:"arte de 27 px dibujado a ~5×"},
    status:{grade:"PASS", why:"usa las estructuras"}},

  /* ---------------- 02 · FÁBRICA SIN FIN ---------------- */
  dragon_forja:{arena:"fortaleza", rank:"subjefe", level:6, name:"Dragón de la Forja",
    fantasy:"La caldera viva de la Fábrica: revienta el horno para salir a cazarte.",
    rule:"Rodealo: su aliento barre el frente y bombardea a quien se aleja.",
    hooks:[{id:"dragon_forja.horno", mode:"auto", uses:"puerta del horno", effect:"entra reventando la compuerta del horno (queda rota)"}],
    counterplay:["Pegarle de costado", "No alejarse: el bombardeo castiga la distancia"],
    presentation:{entrance:"3 golpes en la compuerta del horno", titleCard:true, death:"explota y abre la compuerta de voladura"},
    art:{src:"assets/sprites/arenas/fortaleza/dragon_forja/atlas.png", grade:"FIX", why:"arte propio completo; densidad de píxel ×3 la del campeón (límite)"},
    status:{grade:"PASS", why:"usa el horno y vuelve en el nivel 10 a recalentar al Caballero"}},
  caballero:{arena:"fortaleza", rank:"jefe", level:10, name:"El Caballero de la Armadura Oxidada",
    fantasy:"El carcelero eterno de la Fábrica: su armadura se oxida, su máquina no.",
    rule:"No le pegues cuando brilla azul; calentalo con el Dragón y enfrialo con las válvulas (SHOCK TÉRMICO); atraelo a sus propias trampas.",
    hooks:[
      {id:"caballero.camara", mode:"auto", uses:"compuerta del trono y trampas de la cámara", effect:"la compuerta se cierra al despertar; su fase 2 despierta las trampas"},
      {id:"caballero.valvula", mode:"player", uses:"válvulas de vapor del sector 6", effect:"con 100 de calor, el vapor provoca SHOCK TÉRMICO: EXPUESTO"},
      {id:"caballero.trampa", mode:"player", uses:"prensa, engranaje, cadena, forja", effect:"si una trampa en marcha lo alcanza: daño y aturdimiento (1 vez cada 9 s)"}],
    counterplay:["Esperar el contraataque azul", "Llevarlo a las trampas que despierta", "Válvula después del aliento del Dragón"],
    presentation:{entrance:"portazo → silencio → engranajes → se levanta (3,2 s)", titleCard:true, death:"onda y engranajes (genérica)"},
    art:{src:"assets/sprites/arenas/fortaleza/caballero/atlas.png", grade:"PASS", why:"hoja propia con 13 estados; densidad ×2,1"},
    status:{grade:"PASS", why:"la Fábrica entera es su arma y su debilidad (trampas nuevas: antes nunca lo tocaban)"}},

  /* ---------------- 03 · RUINAS (BOSQUE) ---------------- */
  jinete_sin_cabeza:{sim:false, arena:"divina", rank:"jefe", level:6, name:"Jinete Sin Cabeza",
    fantasy:"El jinete de las calabazas de fuego, uno de los cuatro jefes del equipo divino.",
    rule:"En la Arena Divina es un guardián rival del asedio: torres y castillo lo castigan como a cualquier campeón.",
    hooks:[],
    counterplay:["Pelearlo bajo tus torres", "Cortar su Sendero de Fuego de costado"],
    presentation:{entrance:"equipo divino (nivel 6 de la Arena Divina)", titleCard:false, death:"la de guardián divino"},
    art:{src:"assets/sprites/bosses/bosque/jinete_sin_cabeza/v2/atlas.png", grade:"PASS", why:"hoja propia; densidad ×1,9"},
    status:{grade:"FIX", why:"ya no es el jefe de las Ruinas: su kit (Resurrección Eterna, cacería) solo vive en código del Bosque y en la Divina pelea como guardián envuelto, sin relación con la arena de asedio"}},
  doblador_guerrero:{members:["doblador_arquera", "doblador_picaro", "doblador_clerigo"], arena:"bosque", rank:"subjefe", level:9, name:"Doppelgängers",
    fantasy:"Cuatro sombras con la forma de los campeones originales.",
    rule:"Cada sombra está ATADA a una runa que la protege: contené su runa para exponerla (el Clérigo cura a los demás).",
    hooks:[
      {id:"doblador_guerrero.runas", mode:"auto", uses:"menhires rúnicos", effect:"al aparecer, cada sombra enciende y se ata a una runa: −40 % de daño mientras arda"},
      {id:"doblador_guerrero.contencion", mode:"player", uses:"menhires rúnicos (acción Contener)", effect:"contener la runa de una sombra: EXPUESTA y sin escudo"}],
    counterplay:["Contener primero la runa del Clérigo", "Esquivar el aturdimiento del Guerrero"],
    presentation:{entrance:"aparecen juntos, sin cartel", titleCard:true, death:"genérica"},
    art:{src:"assets/sprites/bosses/bosque/doblador_*/v2/atlas.png", grade:"PASS", why:"hojas propias; sin fila de golpe recibido"},
    status:{grade:"PASS", why:"rediseñado: ecos de las runas (antes, pelea genérica); pendiente: cartel de entrada y barra mientras quedan varios"}},
  guardian_ancestral:{arena:"bosque", rank:"jefe", level:10, name:"Guardián Ancestral Corrompido",
    fantasy:"El bosque que recuerda: las runas que lo protegían ahora lo alimentan.",
    rule:"Las runas encendidas lo blindan: PURIFICALAS (acción contextual) para dejarlo expuesto; sus propios golpes las rompen.",
    hooks:[
      {id:"guardian_ancestral.rearma", mode:"auto", uses:"menhires rúnicos", effect:"vuelve a encender runas cada 11–17 s (escudo y regeneración)"},
      {id:"guardian_ancestral.runa_rota", mode:"auto", uses:"menhires rúnicos", effect:"sus golpes y el Golpe del Bosque rompen runas cercanas"},
      {id:"guardian_ancestral.purifica", mode:"player", uses:"menhires rúnicos", effect:"purificar una runa: 3,5 % de su vida y EXPUESTO"}],
    counterplay:["Purificar runas", "Pelear lejos de las runas encendidas", "Cortar las raíces corriendo"],
    presentation:{entrance:"las runas se desbordan y convergen (4,6 s)", titleCard:true, death:"genérica + cristal"},
    art:{src:"assets/sprites/bosses/bosque/guardian_ancestral/atlas.png (+ atlas_furia)", grade:"PASS", why:"hoja propia con transformación; densidad ×2,4"},
    status:{grade:"PASS", why:"las runas son su escudo y su debilidad"}},

  /* ---------------- 04 · REINO FÚNGICO ---------------- */
  micelio:{arena:"micelial", rank:"subjefe", level:6, name:"Micelio Primigenio",
    fantasy:"La colonia se arma un cuerpo con los muertos del Reino.",
    rule:"Cortá sus raíces de absorción o se cura; no dejes que germine núcleos.",
    hooks:[
      {id:"micelio.cadaveres", mode:"auto", uses:"cadáveres del Reino", effect:"se arma arrastrando 4 cadáveres"},
      {id:"micelio.germina", mode:"auto", uses:"núcleos de la colonia", effect:"siembra un núcleo nuevo"},
      {id:"micelio.raices", mode:"player", uses:"raíces de absorción", effect:"cortar una raíz corta su curación"}],
    counterplay:["Cortar raíces", "Romper núcleos jóvenes"],
    presentation:{entrance:"se arma con cadáveres (5,2 s)", titleCard:true, death:"se hunde y florece el ecosistema"},
    art:{src:"assets/sprites/arenas/micelial/micelio/atlas.png", grade:"FIX", why:"densidad ×2,6 (límite)"},
    status:{grade:"PASS", why:"nace del Reino y lo alimenta"}},
  madre_espora:{arena:"micelial", rank:"jefe", level:10, name:"La Madre Espora",
    fantasy:"El Reino entero es su cuerpo: la estructura del centro respira.",
    rule:"Su RED de núcleos la blinda: cortalos todos y el corazón queda abierto.",
    hooks:[
      {id:"madre_espora.floracion", mode:"phase", uses:"ecosistema (hongos)", effect:"FLORACIÓN: todos los hongos maduran a la vez"},
      {id:"madre_espora.infeccion", mode:"phase", uses:"suelo infectado", effect:"fase 3: la zona sana se achica"},
      {id:"madre_espora.nucleos", mode:"player", uses:"núcleos de la colonia", effect:"con todos cortados, corazón EXPUESTO ×1,8"}],
    counterplay:["Cortar núcleos", "Salir de las nubes", "Daño máximo con el corazón abierto"],
    presentation:{entrance:"latidos que aceleran (17 s) + revelación (9 s)", titleCard:true, death:"secuencia propia de 10,5 s: el Reino se apaga"},
    art:{src:"assets/sprites/arenas/micelial/mother/mp_full.png (+ partes)", grade:"PASS", why:"retrato estructural de 440 px por partes; es el escenario, no un sprite de unidad"},
    status:{grade:"PASS", why:"estándar de oro: el jefe ES la arena"}},

  /* ---------------- 05 · ARENA GÉLIDA ---------------- */
  mago_hielo_cristal:{arena:"hielo", rank:"jefe", level:10, name:"Mago de Hielo y Cristal",
    fantasy:"El Custodio del Invierno: congela el último calor que te queda.",
    rule:"GRAN HELADA: refugiate junto a un brasero o rompé los 3 focos para cortarla y exponerlo.",
    hooks:[
      {id:"mago_hielo_cristal.brasero", mode:"auto", uses:"braseros", effect:"congela el brasero encendido más cercano (nunca el último)"},
      {id:"mago_hielo_cristal.focos", mode:"player", uses:"focos de hielo", effect:"romper los 3 focos: EXPUESTO ×1,7"}],
    counterplay:["Mantener braseros encendidos", "Romper focos", "Moverse: el frío sube quieto"],
    presentation:{entrance:"aparece en un borde (genérica)", titleCard:true, death:"se transforma en el Demonio Gélido"},
    art:{src:"assets/sprites/bosses/hielo/mago_hielo_cristal/v2/atlas.png", grade:"PASS", why:"hoja propia de 10 estados; densidad ×1,3"},
    status:{grade:"PASS", why:"pelea por el calor; pendiente: entrada con cartel propio"}},
  angel_caido_hielo:{after:"mago_hielo_cristal", arena:"hielo", rank:"jefe", level:10, name:"Demonio Gélido — Ángel Caído",
    fantasy:"La forma final del Mago: alas de escarcha que apagan el fuego.",
    rule:"Su coraza se derrite junto a un brasero encendido: pelealo al lado del fuego antes de que lo apague.",
    hooks:[
      {id:"angel_caido_hielo.fuego", mode:"player", uses:"braseros", effect:"junto a un brasero encendido recibe ×1,4 (si no, coraza −25 %)"},
      {id:"angel_caido_hielo.apaga", mode:"player", uses:"braseros", effect:"tras 4,5 s junto al fuego, lo apaga con las alas"}],
    counterplay:["Llevarlo al fuego", "Encender otro brasero cuando apaga uno"],
    presentation:{entrance:"transformación del Mago", titleCard:false, death:"genérica + cristal"},
    art:{src:"assets/sprites/bosses/hielo/angel_caido_hielo/v2/atlas.png", grade:"PASS", why:"hoja propia; densidad ×1,8"},
    status:{grade:"PASS", why:"el fuego es su debilidad y su objetivo"}},

  dragon_hielo:{arena:"hielo", rank:"subjefe", level:6, name:"Tundraverx, Soberano de Hielo",
    fantasy:"El dragón que duerme sobre el paso: sus escamas no conocen el calor… hasta que se lo acercan.",
    rule:"Lejos del fuego sus ESCAMAS DE ESCARCHA lo protegen: pelealo junto a un brasero encendido (y que su aliento no lo apague).",
    hooks:[
      {id:"dragon_hielo.frio", mode:"auto", uses:"frío por quietud", effect:"AURA DE INVIERNO: cerca de él el frío sube aunque te muevas"},
      {id:"dragon_hielo.brasero", mode:"player", uses:"braseros", effect:"su Aliento de Hielo congela el brasero encendido del cono (nunca el último)"},
      {id:"dragon_hielo.fuego", mode:"player", uses:"braseros", effect:"junto a un brasero encendido se derrite: ×1,35 (si no, −30 %)"}],
    counterplay:["Pelearlo al lado del fuego", "Ponerse de costado al aliento para no exponer el brasero"],
    presentation:{entrance:"guardián del nivel 6", titleCard:true, death:"genérica"},
    art:{src:"assets/sprites/enemies/hielo/dragon_hielo/v2/atlas.png", grade:"PASS", why:"hoja propia; densidad ×1,5"},
    status:{grade:"PASS", why:"enseña el fuego que el Demonio Gélido evalúa en el nivel 10 (antes: élite agrandado sin relación con la arena)"}},

  /* ---------------- 06 · ARENA ACUÁTICA ---------------- */
  kraken_joven:{arena:"acuatica", rank:"subjefe", level:6, name:"Kraken Joven",
    fantasy:"El guardián del arrecife pesca con el agua: corrientes que traen cazadores y charcos que lo electrocutan.",
    rule:"Atraelo a un CHARCO cargado justo antes de la descarga: queda EXPUESTO.",
    hooks:[
      {id:"kraken_joven.corriente", mode:"auto", uses:"corrientes (lineal / remolino)", effect:"sus refuerzos llegan nadando por la corriente más cercana (aviso de 0,9 s)"},
      {id:"kraken_joven.charco", mode:"player", uses:"charcos cargados", effect:"si descarga con él adentro: EXPUESTO ×1,6 (4,2 s)"}],
    counterplay:["Pararse cerca de un charco que brilla y salir a último momento", "Esquivar el tentáculo (golpea donde estabas)", "Salir del anillo violeta antes del agarre"],
    presentation:{entrance:"cartel '¡EMERGE!'", titleCard:true, death:"cuadros propios"},
    art:{src:"assets/sprites/bosses/acuatica/kraken_joven/*.png", brief:"F-08", grade:"FIX", why:"densidad ×2,8; sin pose de ataque del cuerpo"},
    status:{grade:"PASS", why:"rediseñado: antes era un perseguidor genérico con agarre sin aviso"}},
  leviatan:{arena:"acuatica", rank:"jefe", level:10, name:"Leviatán",
    fantasy:"El Kraken adulto ronda la orilla; la marea responde a cada vida que pierde.",
    rule:"Neutralizá sus tentáculos para exponer el núcleo; en cada MAREA el agua se da vuelta y los charcos castigan a los tentáculos.",
    hooks:[
      {id:"leviatan.charco", mode:"auto", uses:"charcos cargados", effect:"un tentáculo nace en un charco: la descarga le saca 45 %"},
      {id:"leviatan.marea", mode:"phase", uses:"corrientes y charcos", effect:"cada vida nueva: corrientes invertidas y todos los charcos se cargan"},
      {id:"leviatan.tentaculos", mode:"player", uses:"—", effect:"sin tentáculos: NÚCLEO EXPUESTO ×1,8"}],
    counterplay:["Romper tentáculos (los de los charcos, con la descarga)", "Releer las corrientes después de cada marea"],
    presentation:{entrance:"cartel '¡EMERGE DE LAS PROFUNDIDADES!'", titleCard:true, death:"cuadros propios"},
    art:{src:"assets/sprites/bosses/acuatica/leviatan/*.png", brief:"F-08", grade:"FIX", why:"densidad ×3,9; tentáculos con la hoja del Kraken"},
    status:{grade:"PASS", why:"tentáculos con roles + marea nueva (antes ignoraba las corrientes de su propia arena)"}},

  /* ---------------- 07 · LABERINTO ---------------- */
  guardian_laberinto:{arena:"laberinto", rank:"subjefe", level:6, name:"Guardián del Laberinto",
    fantasy:"El Centinela de Piedra cierra el Laberinto a su alrededor… y el Laberinto no lo aguanta.",
    rule:"Te encierra en un LABERINTO DE PIEDRA; si su Pisotón cae junto a los pilares, los derriba y queda EXPUESTO.",
    hooks:[
      {id:"guardian_laberinto.muro", mode:"auto", uses:"pilares de piedra (muros que se cierran)", effect:"levanta un anillo de pilares con un hueco alrededor de un guardián"},
      {id:"guardian_laberinto.derrumbe", mode:"player", uses:"sus pilares", effect:"su Pisotón junto a los pilares los derriba: EXPUESTO ×1,5"}],
    counterplay:["Esperarlo pegado a un pilar y esquivar el pisotón a último momento", "Salir por el hueco si el equipo está afuera"],
    presentation:{entrance:"cartel", titleCard:true, death:"5 cuadros propios + aviso del Laberinto"},
    art:{src:"assets/sprites/bosses/laberinto/guardian_laberinto/*.png", grade:"PASS", why:"cuadros propios; densidad ×2,3"},
    status:{grade:"PASS", why:"rediseñado: antes era pisotón + rocas, sin nada del Laberinto (su poder sólo aparecía robado en Infernal)"}},
  minotauro:{arena:"laberinto", rank:"jefe", level:10, name:"Minotauro",
    fantasy:"El Señor del Laberinto embiste contra sus propias paredes.",
    rule:"Hacelo chocar contra las paredes AGRIETADAS: las derriba y queda EXPUESTO.",
    hooks:[
      {id:"minotauro.muro", mode:"player", uses:"paredes agrietadas", effect:"embestida contra una agrietada: la derriba y EXPUESTO ×1,7"},
      {id:"minotauro.colapso", mode:"phase", uses:"laberinto central", effect:"al 25 % el centro se derrumba: campo abierto"}],
    counterplay:["Pararse delante de una pared agrietada y esquivar a último momento"],
    presentation:{entrance:"cartel + paredes agrietadas", titleCard:true, death:"colapso genérico"},
    art:{src:"assets/sprites/bosses/laberinto/minotauro/v3/atlas.png", grade:"FIX", why:"densidad ×3; el escáner marca halo claro en el atlas v3"},
    status:{grade:"PASS", why:"las paredes son su debilidad"}},

  /* ---------------- 08 · ABISMO ---------------- */
  ab_carcelero:{arena:"abismo", rank:"subjefe", level:9, name:"El Carcelero del Vacío",
    fantasy:"Encadena el Abismo: arrastra al vacío y rompe el piso con sus cadenas.",
    rule:"Si te engancha te arrastra al borde: soltate con una habilidad; sus cadenas rompen plataformas.",
    hooks:[
      {id:"ab_carcelero.gancho", mode:"auto", uses:"vacío y borde", effect:"el GANCHO arrastra hacia el borde"},
      {id:"ab_carcelero.plataformas", mode:"auto", uses:"plataformas", effect:"su pisotón y la ruptura de cadenas tiran plataformas"}],
    counterplay:["Habilidad para soltarse", "Pelear en plataformas firmes"],
    presentation:{entrance:"sube del vacío (3,6 s)", titleCard:true, death:"cadenas rotas + el Ojo se abre"},
    art:{src:"assets/sprites/arenas/abismo/ab_carcelero/atlas.png", borrowed:"carcelero (Fábrica)", brief:"P0-11", grade:"REDRAW", why:"arte propio de 37 px dibujado a ~5,6×; hoy usa un común de la Fábrica recoloreado"},
    status:{grade:"PASS", why:"el vacío es su arma"}},
  ab_morador:{arena:"abismo", rank:"jefe", level:10, name:"El Que Mora Debajo",
    fantasy:"El ojo bajo el Abismo: el terreno es lo que se juega.",
    rule:"Rompé sus tentáculos para abrirle el ojo; conservá piso.",
    hooks:[
      {id:"ab_morador.plataformas", mode:"auto", uses:"plataformas", effect:"tentáculos, esquirlas y patrones rompen el piso"},
      {id:"ab_morador.jinete", mode:"phase", uses:"el Jinete del Abismo", effect:"desde la fase 2 el Jinete cruza y empuja al vacío"},
      {id:"ab_morador.tentaculo", mode:"player", uses:"—", effect:"romper un tentáculo: el ojo se abre (EXPUESTO ×1,5)"}],
    counterplay:["Leer grietas", "Romper tentáculos", "Volver a piso firme"],
    presentation:{entrance:"preludio de 9,5 s: el ojo se abre", titleCard:true, death:"secuencia propia de 9 s"},
    art:{src:"assets/vfx/abismo/ojo_*.png + tex_carne.png", grade:"PASS", why:"cuerpo propio armado por partes (ojo animado)"},
    status:{grade:"PASS", why:"usa casi todo el Abismo"}},

  /* ---------------- 09 · MINAS PROFUNDAS ---------------- */
  mn_titan:{arena:"minas", rank:"subjefe", level:8, name:"Titán de Piedra",
    fantasy:"La roca misma se levanta: apaga la luz que te mantiene vivo.",
    rule:"Su PISOTÓN apaga las luces: esquivá y volvé a encender.",
    hooks:[
      {id:"mn_titan.luces", mode:"auto", uses:"luces / braseros", effect:"pisotón y golpe apagan las luces cercanas"},
      {id:"mn_titan.derrumbe", mode:"phase", uses:"escombros sólidos", effect:"desde el 50 %: escombros temporales (nunca cierran pasillos)"}],
    counterplay:["Reencender luces", "No pelear en la oscuridad"],
    presentation:{entrance:"retumbo (2,8 s)", titleCard:true, death:"cuadros propios + sacudida"},
    art:{src:"assets/sprites/arenas/minas/mn_titan/atlas.png", brief:"R-01", grade:"REDRAW", why:"densidad ×5,0 la del roster: arte de 47×63 px dibujado a 153 u; en pantalla se ve en bloques al lado de los campeones"},
    status:{grade:"PASS", why:"ataca la luz (la regla de las Minas); barra grande arreglada (antes nunca aparecía)"}},
  mn_cerbero:{arena:"minas", rank:"jefe", level:10, name:"Cerbero, Guardián del Umbral",
    fantasy:"El perro del Umbral: en la oscuridad es uno, en la luz son tres.",
    rule:"Iluminado por varias luces a la vez, sus sombras se separan y queda EXPUESTO; a oscuras es más rápido.",
    hooks:[
      {id:"mn_cerbero.oscuridad", mode:"auto", uses:"oscuridad / luces", effect:"apaga luces y se potencia a oscuras"},
      {id:"mn_cerbero.luz", mode:"player", uses:"luces", effect:"medidor de exposición lleno: EXPUESTO ×1,75"}],
    counterplay:["Encender braseros y llevarlo a la luz"],
    presentation:{entrance:"cadenas y triple rugido (6,2 s)", titleCard:true, death:"fundido propio + portal"},
    art:{src:"assets/sprites/arenas/minas/mn_cerbero/atlas.png", brief:"F-01", grade:"REDRAW", why:"densidad ×5,4 la del roster: arte de 54×67 px dibujado a 181 u (el outlier más grande del juego)"},
    status:{grade:"PASS", why:"la luz es su debilidad"}},

  /* ---------------- 10 · ARENA INFERNAL ---------------- */
  esqueleto_h:{arena:"infernal", rank:"subjefe", level:4, name:"Esqueleto Cornudo (Guardián de la Horda)",
    fantasy:"El primer guardián de la Horda sale de una fisura con los cuernos por delante.",
    rule:"Su EMBESTIDA ÓSEA contra una barricada de basalto lo estampa: aturdido y vulnerable.",
    hooks:[
      {id:"esqueleto_h.fisura", mode:"auto", uses:"fisuras", effect:"aparece saliendo de una fisura abierta"},
      {id:"esqueleto_h.barricada", mode:"player", uses:"barricadas de basalto", effect:"embestida contra el basalto: aturdido 2,2 s y vulnerable"}],
    counterplay:["Pararse delante de una barricada y esquivar la embestida a último momento"],
    presentation:{entrance:"sale de una fisura", titleCard:true, death:"genérica"},
    art:{src:"assets/sprites/enemies/infernal/esqueleto_h/walk*.png", grade:"PASS", why:"cuadros propios; densidad ×1,7"},
    status:{grade:"PASS", why:"enseña el choque contra el basalto que el Gólem de Cuerpos evalúa (antes: élite agrandado genérico)"}},
  demonio_menor:{arena:"infernal", rank:"subjefe", level:7, name:"Demonio Menor (Guardián de la Horda)",
    fantasy:"El que alimenta los portales: con una fisura abierta al lado, no hay forma de bajarlo.",
    rule:"Alimenta las fisuras y se protege con ellas: SELLÁ la fisura junto a él y queda EXPUESTO.",
    hooks:[
      {id:"demonio_menor.fisura", mode:"auto", uses:"fisuras", effect:"abre o agranda una fisura cada ~11 s (aviso en el piso)"},
      {id:"demonio_menor.sello", mode:"player", uses:"fisuras (acción Cerrar)", effect:"sellar una fisura cerca de él: EXPUESTO ×1,5"}],
    counterplay:["Sellar la fisura que lo protege", "Moverse: su Lluvia Infernal cae donde estás"],
    presentation:{entrance:"guardián del nivel 7", titleCard:true, death:"genérica"},
    art:{src:"assets/sprites/enemies/infernal/demonio_menor/atlas.png", grade:"PASS", why:"hoja propia; densidad ×0,8"},
    status:{grade:"PASS", why:"enseña el \"cerrá la fisura\" que el Hechicero y el Rey de la Horda evalúan"}},
  hechicero_supremo:{arena:"infernal", rank:"subjefe", level:9, name:"El Hechicero Supremo",
    fantasy:"El guía que te trajo hasta acá abre los portales de la Horda con sus propias manos.",
    rule:"Sus GRIETAS lo alimentan (recibe menos daño): cerralas con la acción de la arena y queda EXPUESTO.",
    hooks:[
      {id:"hechicero_supremo.fisura", mode:"auto", uses:"fisuras", effect:"GRIETA CONJURADA: abre una fisura real cerca de un guardián (aviso 1,7 s)"},
      {id:"hechicero_supremo.sello", mode:"player", uses:"fisuras (acción Cerrar)", effect:"sellar una grieta suya: EXPUESTO ×1,55"}],
    counterplay:["Cerrar sus grietas (el calor quema: que cierre el más resistente)", "Esquivar los círculos sagrados"],
    presentation:{entrance:"revelación (1,8 s) + cartel de traición", titleCard:true, death:"no muere: huye"},
    art:{src:"assets/sprites/bosses/infernal/hechicero/atlas.png", grade:"PASS", why:"hoja propia; alfa corregido a 0/255 (tenía 5,7 % de píxeles semitransparentes, ART_BIBLE §6)"},
    status:{grade:"PASS", why:"rediseñado: antes ignoraba toda la arena (las fisuras se pausaban en su pelea)"}},
  angel_corrompido:{arena:"infernal", rank:"jefe", level:10, name:"El Ángel Corrompido (forma 1)",
    fantasy:"El Hechicero con los poderes robados de los Cuatro Guardianes.",
    rule:"CONVERGENCIA: rompé los 4 focos antes de que termine el ritual.",
    hooks:[
      {id:"angel_corrompido.convergencia", mode:"auto", uses:"focos de cristal", effect:"invoca los 4 focos de la Convergencia"},
      {id:"angel_corrompido.focos", mode:"player", uses:"focos de cristal", effect:"ritual interrumpido: EXPUESTO ×1,7"}],
    counterplay:["Romper focos", "Leer qué poder de Guardián está usando"],
    presentation:{entrance:"ascenso: roba los cristales (3,8 s)", titleCard:false, death:"se convierte en el Gólem de Cuerpos"},
    art:{src:"assets/sprites/bosses/infernal/hechicero/atlas.png (recoloreado)", brief:"F-02", grade:"REDRAW", why:"es el Hechicero recoloreado con alas procedurales: no tiene cuerpo propio"},
    status:{grade:"PASS", why:"usa los poderes de las otras arenas"}},
  golem_cuerpos:{after:"angel_corrompido", arena:"infernal", rank:"jefe", level:10, name:"Gólem de Cuerpos (forma 2)",
    fantasy:"Los cuerpos de la Horda caída, cosidos en un examen final.",
    rule:"EL EXAMEN: cortá el Número, hacelo chocar contra las barricadas o rompé la Red.",
    hooks:[
      {id:"golem_cuerpos.barricada", mode:"player", uses:"barricadas de basalto", effect:"embestida contra una barricada: EXPUESTO"},
      {id:"golem_cuerpos.numero", mode:"player", uses:"—", effect:"cortar el Número con daño: EXPUESTO"},
      {id:"golem_cuerpos.red", mode:"player", uses:"focos", effect:"romper la Red: EXPUESTO"}],
    counterplay:["Resolver el examen que plantea en cada ciclo"],
    presentation:{entrance:"cinemática (2,6 s)", titleCard:false, death:"se rompe y nace el Rey de la Horda"},
    art:{src:"assets/sprites/bosses/infernal/hechicero/golem/atlas.png", borrowed:"golem_cristal (recoloreado)", brief:"P0-12", grade:"REDRAW", why:"su hoja propia es de 1 cuadro por estado"},
    status:{grade:"PASS", why:"usa las barricadas de basalto"}},
  demonio_mayor:{after:"golem_cuerpos", arena:"infernal", rank:"jefe", level:10, name:"Rey de la Horda (forma final)",
    fantasy:"La Horda entera bebe de las fisuras: ciérralas y el núcleo queda desnudo.",
    rule:"Las 3 fisuras le dan HORDA, VIDA y PIEL: cerralas todas y queda EXPUESTO.",
    hooks:[
      {id:"demonio_mayor.fisuras_poder", mode:"auto", uses:"fisuras", effect:"cada fisura le da un poder (invocar, regenerar, piel)"},
      {id:"demonio_mayor.fisuras", mode:"player", uses:"fisuras (acción Cerrar)", effect:"las 3 cerradas: EXPUESTO ×1,8"}],
    counterplay:["Cerrar las fisuras empezando por la que más pesa (VIDA si está bajo)"],
    presentation:{entrance:"nace del Gólem roto", titleCard:false, death:"colapso genérico + final de campaña"},
    art:{src:"assets/sprites/bosses/infernal/demonio_mayor/atlas.png", brief:"F-03", grade:"FIX", why:"sin poses de golpe ni de lanzar; densidad ×2,4"},
    status:{grade:"PASS", why:"las fisuras son su fuerza"}}
};
// Orden de presentación (campaña, subjefe antes que jefe)
const BOSS_BLUEPRINT_ORDER = Object.keys(BOSS_BLUEPRINTS);
function bossBlueprint(type){ return BOSS_BLUEPRINTS[type] || null; }
// Validación de la FICHA (estructura). Lo que pasa en la pelea lo mide el validador.
function validateBossBlueprint(type){
  const B = BOSS_BLUEPRINTS[type], out = [];
  const add = (level, msg)=>out.push({level, msg});
  if(!B){ add("FAIL", "sin ficha"); return out; }
  if(typeof ENEMY_BASE!=="undefined" && !ENEMY_BASE[type]) add("FAIL", "el tipo no existe en ENEMY_BASE");
  for(const k of ["arena","rank","level","name","fantasy","rule","counterplay","presentation","art","status"]) if(B[k]===undefined || B[k]==="") add("FAIL", "falta " + k);
  if(!Array.isArray(B.hooks)) add("FAIL", "hooks no es una lista");
  else {
    if(!B.hooks.length) add(B.status && B.status.grade==="PASS" ? "FAIL" : "WARNING", "ningún gancho con su arena (BOSS + ARENA = ENCUENTRO)");
    if(B.hooks.length && !B.hooks.some(h=>h.mode==="auto")) add("WARNING", "ningún gancho 'auto': la arena sólo importa si el jugador la busca");
    const seen = new Set();
    for(const h of B.hooks){
      if(!h.id || !/^[a-z_]+\.[a-z_]+$/.test(h.id)) add("FAIL", "gancho con id inválido: " + h.id);
      if(seen.has(h.id)) add("FAIL", "gancho repetido: " + h.id); seen.add(h.id);
      if(!["auto","player","phase"].includes(h.mode)) add("FAIL", "modo inválido en " + h.id);
      if(!h.effect) add("FAIL", "gancho sin efecto: " + h.id);
    }
  }
  if(B.art && !["PASS","FIX","REDRAW"].includes(B.art.grade)) add("FAIL", "art.grade inválido");
  if(B.art && B.art.grade==="REDRAW" && !B.art.brief) add("WARNING", "REDRAW sin ficha de encargo (docs/ART_COMMISSION_BRIEF.md)");
  if(B.status && !["PASS","FIX","REWORK"].includes(B.status.grade)) add("FAIL", "status.grade inválido");
  if(typeof ARENA_BLUEPRINTS!=="undefined" && !ARENA_BLUEPRINTS[B.arena]) add("FAIL", "arena desconocida: " + B.arena);
  return out;
}

// Cartel grande de presentación (mismo que usan Ciudad, Fábrica, Abismo, Minas e Infernal) para los jefes y
// subjefes que entraban solo con un banner. Texto: nombre de la ficha + epíteto del HUD (la forma actual).
function bossTitleCard(e, kicker){
  const B = e && BOSS_BLUEPRINTS[e.type]; if(!B || typeof arenaTitleCard!=="function") return false;
  const d = typeof bossHudDesign==="function" ? bossHudDesign(e) : null;
  arenaTitleCard(kicker || (B.rank==="jefe" ? "JEFE" : "SUBJEFE"), String(e.name || B.name).toUpperCase(), (d && d.epithet) || B.fantasy, 4200);
  return true;
}
