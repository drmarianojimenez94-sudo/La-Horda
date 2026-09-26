"use strict";
/* ============================================================
   js/systems/campaign-story.js
   LA HISTORIA DE LA CAMPAÑA en el ORDEN CANÓNICO (Lore Bible: docs/lore/LA_HORDA_LORE_BIBLE.md;
   estado de la historia: docs/lore/LA_HORDA_STORY_STATE.md).
   - Las CICATRICES DE LA HORDA (término provisional): alteraciones que aparecen cuando el sello se
     debilita. Conectan las arenas: los campeones las siguen para encontrar cristales y Guardianes.
     Por ahora se expresan con textos, carteles y la voz del Hechicero (no es una mecánica jugable).
   - Prólogo de la Ciudad Maldita (arena 01, en construcción): se cuenta antes de la primera arena
     jugable hasta que la Ciudad exista como arena.
   - Cartel de título "ARENA NN" al entrar a cada arena y la Cicatriz que se abre al completarla.
   Todo es local a cada cliente (textos): no cambia reglas, combate ni red.
   ============================================================ */
const CAMPAIGN_STORY = {
  ciudad:   {title:"LA CIUDAD MALDITA", sub:"Todavía es una ciudad viva. Todavía."},
  fortaleza:{title:"LA FÁBRICA SIN FIN", sub:"La Horda contaminó hasta las máquinas de otra civilización.",
             scar:"La Cicatriz sigue más allá de los hornos: huele a bosque viejo y a piedra sagrada.",
             say:"¿Ves la grieta en el aire? Es una Cicatriz. Seguila: nos lleva a las Ruinas, donde espera el primero de los Cuatro."},
  bosque:   {title:"LAS RUINAS CÉLTICAS", sub:"Acá espera el primero de los Cuatro Guardianes.", guardian:1,
             scar:"Con el Primer Cristal, la Cicatriz late distinto: se hunde bajo tierra, hacia algo que crece.",
             say:"El primer cristal. La Cicatriz ahora lo siente… y reacciona. Sigámosla hacia abajo."},
  micelial: {title:"EL REINO FÚNGICO", sub:"El micelio recuerda cosas que nadie le contó.",
             scar:"La Cicatriz sube hacia el frío. Entre las esporas quedaron ecos de los Guardianes… y de alguien más.",
             say:"Esos ecos no importan. Lo que importa es el segundo cristal, en la Arena Gélida."},
  hielo:    {title:"LA ARENA GÉLIDA", sub:"Acá espera el segundo Guardián.", guardian:2,
             scar:"Dos cristales juntos: la Cicatriz se vuelve inestable y arrastra hacia el agua.",
             say:"Dos cristales. ¿Por qué me mirás así? Lo que dijo el Mago antes de caer eran delirios de la Horda."},
  acuatica: {title:"LA ARENA ACUÁTICA", sub:"Con dos cristales, la realidad empieza a doblarse.",
             scar:"La Cicatriz desciende por unas minas olvidadas, hacia un laberinto de piedra.",
             say:"Las Minas Profundas… otros buscaron los cristales antes que vos. No terminaron bien. Seguí bajando."},
  minas:    {title:"LAS MINAS PROFUNDAS", sub:"El descenso hacia el territorio del tercer Guardián."},
  laberinto:{title:"EL LABERINTO", sub:"Acá espera el tercer Guardián.", guardian:3,
             scar:"Tres cristales. La Cicatriz se rasga: más allá ya no hay piso, solo el Abismo.",
             say:"Tres. Con los tres juntos, la Cicatriz va a ser la más grande de todas. No te detengas ahora."},
  abismo:   {title:"EL ABISMO", sub:"El punto de no retorno.",
             scar:"El mundo se rompe. Los campeones cruzan hacia la dimensión de la Horda.",
             say:"Cruzaste. Ya no hay vuelta atrás. Te espero en el corazón del Infierno."},
  infernal: {title:"LA ARENA INFERNAL", sub:"La dimensión de la Horda. Alguien está encadenado en el fondo.", guardian:4}
};
const CAMPAIGN_PROLOGUE = "La Horda volvió a la ciudad donde estaban los campeones. La defendieron, pero algo quedó roto: " +
  "en medio del humo apareció la proyección del Hechicero Supremo. Los antiguos Guardianes están cayendo, dijo, y los cristales " +
  "que mantienen limitada a la Horda tienen que recuperarse. Donde la Horda pasó quedó una CICATRIZ, y marca el camino. " +
  "La ciudad ya no es la misma: desde ese día la llaman la Ciudad Maldita.";
const CAMPAIGN_ENDING = "El Rey de la Horda cayó y su plan de fundir los cristales fracasó. Pero los cristales no pueden destruirse, " +
  "y la Horda tampoco: es la maldad que existe en el mundo. Los cristales siguen necesitando portadores… Los nuevos campeones " +
  "empiezan a ocupar el lugar de los Guardianes.";

// Cartel de título al entrar a una arena (nivel 1). Las arenas con cartel propio lo muestran ellas.
const CAMPAIGN_OWN_TITLE = {fortaleza:1, micelial:1, abismo:1};
function campaignTitleCard(){
  if(typeof currentArena==="undefined" || (typeof divinaMode!=="undefined" && divinaMode) || CAMPAIGN_OWN_TITLE[currentArena]) return;
  const S = CAMPAIGN_STORY[currentArena]; if(!S || typeof arenaTitleCard!=="function") return;
  // un tick después: en cooperativo el anfitrión empieza a transmitir eventos recién al terminar startRun
  const arena = currentArena;
  setTimeout(()=>{ if(currentArena===arena && typeof state!=="undefined" && state==="playing") arenaTitleCard("ARENA " + campaignNumberLabel(arena), S.title, S.sub, 4800); }, 0);
}
function campaignArenaKicker(key){ return "ARENA " + campaignNumberLabel(key); }
// Prólogo (Ciudad Maldita): una vez por perfil, al entrar por primera vez a la primera arena jugable.
function campaignMaybePrologue(){
  if(typeof save==="undefined" || save.storyPrologueSeen || currentArena!==ARENA_ORDER[0]) return;
  save.storyPrologueSeen = true; if(typeof persist==="function") persist();
  if(typeof tutSay==="function") setTimeout(()=>{ try{ tutSay("story_prologue", CAMPAIGN_PROLOGUE, null, 16000, true); }catch(e){} }, 5600);
}
// Al completar una arena por primera vez: la Cicatriz que se abre hacia la siguiente.
function campaignOnVictory(arena, firstClear){
  const S = CAMPAIGN_STORY[arena]; if(!S) return;
  if(arena==="infernal"){
    if(typeof tutSay==="function") setTimeout(()=>{ try{ tutSay("story_ending", CAMPAIGN_ENDING, null, 16000, true); }catch(e){} }, 1600);
    return;
  }
  if(S.scar && typeof showBanner==="function") setTimeout(()=>showBanner("✦ " + S.scar), firstClear ? 5200 : 2600);
  if(firstClear && S.say && typeof tutSay==="function") setTimeout(()=>{ try{ tutSay("story_after_" + arena, S.say, null, 11000, true); }catch(e){} }, 7600);
}
// Guardián del Laberinto (subjefe): antes de caer, advierte a los campeones.
function campaignLabyrinthWarning(x, y){
  if(typeof floatText==="function") floatText(x, y - 90, "«El que te guía… no le entregues los cristales…»", "crit");
  if(typeof showBanner==="function") setTimeout(()=>showBanner("El Guardián del Laberinto intentó advertirte algo antes de caer"), 900);
}
