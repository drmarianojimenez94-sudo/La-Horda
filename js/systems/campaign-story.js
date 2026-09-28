"use strict";
/* ============================================================
   js/systems/campaign-story.js
   LA HISTORIA DE LA CAMPAÑA en el ORDEN CANÓNICO (Lore Bible: docs/lore/LA_HORDA_LORE_BIBLE.md;
   estado de la historia: docs/lore/LA_HORDA_STORY_STATE.md).
   - Las CICATRICES DE LA HORDA (término provisional): alteraciones que aparecen cuando el sello se
     debilita. Conectan las arenas: los guardianes las siguen para encontrar cristales y a los antiguos Guardianes.
     Por ahora se expresan con textos, carteles y la voz del Hechicero (no es una mecánica jugable).
   - Prólogo de la Ciudad Maldita (arena 01): tres pantallas antes de la primera ficha del perfil.
   - Cartel de título "ARENA NN" al entrar a cada arena y la Cicatriz que se abre al completarla.
   - La campaña va en TRES ACTOS (STORY_ACTS, js/data/story-text.js); voces, Crónicas y epílogo: story.js.
   Todo es local a cada cliente (textos): no cambia reglas, combate ni red.
   ============================================================ */
// scar = lo que se ve al completar la arena (la Cicatriz que se abre hacia la siguiente); say = lo que dice
// el Hechicero (escena de salida, último paso de la pantalla de victoria: story.js). En las arenas de los
// Guardianes habla con la línea de su cristal (crystalLine, crystals.js) y `say` queda vacío.
// Arco (biblia §5 y §10): ACTO I mentor cálido · ACTO II cada vez más interesado en los cristales que en
// vos · ACTO III ya no disimula del todo. La sospecha va siempre en la última frase.
const CAMPAIGN_STORY = {
  ciudad:   {title:"LA CIUDAD MALDITA", sub:"Todavía es una ciudad viva. Todavía.",
             scar:"El Presentador cae y el humo se abre en una grieta que no se cierra: la primera Cicatriz. Apunta hacia una fábrica que nunca se detuvo.",
             say:"Esa grieta es una Cicatriz: la Horda deja heridas por donde pasa. Seguila y vas a encontrar lo que se perdió. Yo te voy a indicar el camino."},
  fortaleza:{title:"LA FÁBRICA SIN FIN", sub:"La Horda contaminó hasta las máquinas de otra civilización.",
             scar:"En la última cámara cuelga un gancho vacío, del tamaño de una casa: de ahí salió una cadena enorme. La Cicatriz sigue más allá de los hornos, y huele a bosque viejo y a piedra sagrada.",
             say:"Bien hecho. Más allá de los hornos esperan las Ruinas, y en las Ruinas, el primero de los Cuatro. No te detengas en lo que cuelga de los techos."},
  bosque:   {title:"LAS RUINAS CÉLTICAS", sub:"Acá espera el primero de los Cuatro Guardianes.", guardian:1,
             scar:"Con el Primer Cristal, la Cicatriz late distinto. Se hunde bajo tierra, hacia algo que crece y que recuerda.", say:""},
  micelial: {title:"EL REINO FÚNGICO", sub:"El micelio recuerda cosas que nadie le contó.",
             scar:"La Cicatriz sube hacia el frío. Entre las esporas quedaron ecos de los Guardianes… y de alguien más.",
             say:"Esos ecos no importan. Lo que importa es el segundo cristal, en la Arena Gélida."},
  hielo:    {title:"LA ARENA GÉLIDA", sub:"Acá espera el segundo Guardián.", guardian:2,
             scar:"Dos cristales juntos: la Cicatriz se vuelve inestable y arrastra hacia el agua. En el valle de abajo, donde nunca hubo mar, empieza a subir la marea.", say:""},
  acuatica: {title:"LA ARENA ACUÁTICA", sub:"Con dos cristales, la realidad empieza a doblarse.",
             scar:"El agua se retira de golpe y deja ver un camino de piedra que baja. La Cicatriz se hunde en él, hacia un laberinto antiguo.",
             say:"Un laberinto. Allí espera el tercero de los Cuatro. El Leviatán olió los cristales desde el fondo del mar; lo que venga después los va a oler mejor. Cuidalos."},
  laberinto:{title:"EL LABERINTO", sub:"Acá espera el tercer Guardián.", guardian:3,
             scar:"Tres cristales. La Cicatriz se rasga: más allá ya no hay piso, solo el Abismo.", say:""},
  abismo:   {title:"EL ABISMO", sub:"El punto de no retorno.",
             scar:"El mundo se rompe. Debajo de los escombros se abre una mina que baja hacia el calor, y en la primera galería alguien grabó seis nombres.",
             say:"Debajo del Abismo hay minas… y debajo de las minas, una puerta. Otros bajaron antes que vos. Seguí bajando."},
  minas:    {title:"LAS MINAS PROFUNDAS", sub:"La luz es territorio. Y el camino baja al Infierno.",
             scar:"Atravesaste el Umbral. Del otro lado arde la dimensión de la Horda, y en el fondo se oyen cadenas.",
             say:"Cruzaste el Umbral. Ya no hay vuelta atrás. Te espero en el corazón del Infierno. Y traé los cristales."},
  infernal: {title:"LA ARENA INFERNAL", sub:"La dimensión de la Horda. Alguien está encadenado en el fondo.", guardian:4}
};
// Prólogo (Ciudad Maldita, primera partida del perfil): tres pantallas antes de la ficha de la arena.
const CAMPAIGN_PROLOGUE_PAGES = [
  {who:"PRÓLOGO", title:"LA NOCHE EN QUE VOLVIÓ LA HORDA",
    text:"Hace siglos, Cuatro Guardianes encerraron a la Horda en su propia dimensión con cuatro cristales. En la ciudad ya nadie recordaba sus nombres. Esta noche las campanas sonaron solas, y la Horda volvió."},
  {who:"PRÓLOGO", title:"EL HUMO",
    text:"Los guardianes de la ciudad sostuvieron las puertas hasta el amanecer. Cuando el humo se abrió, una figura de luz habló desde adentro: «Los Guardianes están cayendo. Sus cristales tienen que recuperarse, o esto va a pasar en todas partes»."},
  {who:"PRÓLOGO", title:"LA PRIMERA CICATRIZ",
    text:"Donde la Horda pasó, el aire quedó herido: una grieta que no se cierra. La llamaron Cicatriz. Desde esa noche, la ciudad tiene otro nombre: la Ciudad Maldita."}
];
const CAMPAIGN_PROLOGUE = CAMPAIGN_PROLOGUE_PAGES.map(p=>p.text).join(" ");
const CAMPAIGN_ENDING = "El Rey de la Horda cayó y su plan de fundir los cristales fracasó. Pero los cristales no pueden destruirse, " +
  "y la Horda tampoco: es la maldad que existe en el mundo. Los cristales siguen necesitando portadores… Los nuevos guardianes " +
  "empiezan a ocupar el lugar de los Guardianes. El Cristal del Juicio quedó sin dueño: desde ahora podés llevarlo antes de cada partida.";

// Cartel de título al entrar a una arena (nivel 1). Las arenas con cartel propio lo muestran ellas.
const CAMPAIGN_OWN_TITLE = {fortaleza:1, micelial:1, abismo:1, ciudad:1, minas:1};
function campaignTitleCard(){
  if(typeof currentArena!=="undefined") campaignCoopEntryScene();
  if(typeof currentArena==="undefined" || (typeof divinaMode!=="undefined" && divinaMode) || CAMPAIGN_OWN_TITLE[currentArena]) return;
  const S = CAMPAIGN_STORY[currentArena]; if(!S || typeof arenaTitleCard!=="function") return;
  // un tick después: en cooperativo el anfitrión empieza a transmitir eventos recién al terminar startRun
  const arena = currentArena;
  setTimeout(()=>{ if(currentArena===arena && typeof state!=="undefined" && state==="playing") arenaTitleCard("ARENA " + campaignNumberLabel(arena), S.title, S.sub, 4800); }, 0);
}
// (la escena de entrada en cooperativo también arranca en el nivel 1: waves.js → campaignTitleCard)
function campaignArenaKicker(key){ return "ARENA " + campaignNumberLabel(key); }
// Prólogo (Ciudad Maldita): una vez por perfil, al entrar por primera vez a la primera arena jugable.
// En partida solo lo muestra antes, la ficha del Hechicero (run-intro.js). En cooperativo online no hay
// ficha (bloquearía a los demás): el prólogo espera a la primera pantalla de refuerzos, con el juego
// quieto, en vez de taparte media pantalla en pleno combate.
let _campaignPendingPrologue = false;
function campaignMaybePrologue(){
  if(typeof save==="undefined" || save.storyPrologueSeen || currentArena!==ARENA_ORDER[0]) return;
  save.storyPrologueSeen = true; if(typeof persist==="function") persist();
  _campaignPendingPrologue = true;
}
// La llaman las pantallas de refuerzo (buff-choice.js y net-game.js).
function campaignStoryOnBuff(){
  const scr = document.getElementById("buffscreen"); if(!scr) return;
  let el = document.getElementById("buff-story");
  if(!_campaignPendingPrologue){ if(el) el.classList.add("hidden"); return; }
  _campaignPendingPrologue = false;
  if(!el){ el = document.createElement("div"); el.id = "buff-story"; scr.insertBefore(el, document.getElementById("buff-cards")); }
  el.innerHTML = `<div class="bs-who">EL HECHICERO SUPREMO · LA NOCHE EN QUE VOLVIÓ LA HORDA</div><div class="bs-say">«${CAMPAIGN_PROLOGUE}»</div>`;
  el.classList.remove("hidden");
}
// Al completar una arena: la escena de salida (la Cicatriz, lo que dice el Hechicero y la Crónica que se
// encuentra) ya no se tira en pleno cierre de partida, donde la tapaba la pantalla de victoria: se cuenta EN
// esa pantalla (story.js → storyVictoryHtml / storyVictoryScarHtml), y el final de la Infernal abre el epílogo.
function campaignOnVictory(arena, firstClear){ /* la escena de salida vive en la pantalla de victoria (story.js) */ }
// Guardián del Laberinto (subjefe): antes de caer, advierte a los guardianes. Lo que dice lo pone su voz
// (BOSS_VOICES.guardian_laberinto, en el cuadro de voz); el cartel deja claro que fue una advertencia.
function campaignLabyrinthWarning(x, y){
  if(typeof showBanner==="function") setTimeout(()=>showBanner("El Guardián del Laberinto intentó advertirte algo antes de caer"), 900);
}
// Cooperativo online: no hay ficha previa (bloquearía a los demás), así que la escena de entrada de cada
// arena la dice el Hechicero en el cuadro de voz, una vez por perfil, cuando se va el cartel de título.
function campaignCoopEntryScene(){
  if(typeof netMatch==="undefined" || !netMatch || typeof ARENA_BRIEF==="undefined" || typeof storySay!=="function") return;
  if(typeof divinaMode!=="undefined" && divinaMode) return;
  const B = ARENA_BRIEF[currentArena]; if(B && B.say) storySay("hech", B.say, {key:"story_in_" + currentArena, wait:16000});
}
