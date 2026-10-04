"use strict";
/* ============================================================
   js/ui/champion-select.js
   Selección de guardián con vista previa animada y línea de guardado.
   ============================================================ */

/* ============================================================
   MENU: champion select
   ============================================================ */
function renderChampGrid(){
  const grid = document.getElementById("champ-grid");
  grid.innerHTML = "";
  if(typeof ensureOwnedSelection==="function") ensureOwnedSelection();
  // Solo el catálogo público + lo que ya es tuyo (nunca internos sin publicar). Categorías: champion-taxonomy.js.
  CHAMPION_CATALOG.map(c=>c.id).filter(key=>CLASSES[key] && save.champions[key] && (championPlayable(key) && (shopChampionVisible(key)))).forEach(key=>{
    const cls = CLASSES[key];
    const champ = save.champions[key];
    const owned = champ.unlocked!==false;
    const meta = championMeta(key), grantOnly = !meta.purchasable;
    const card = document.createElement("div");
    card.className = "champ-card" + (key===selectedClass && owned ? " selected":"") + (owned ? "" : " locked");
    card.innerHTML = `
      <canvas class="champ-preview" width="104" height="104" style="background:${cls.color}22;" data-class-key="${key}"></canvas>
      <div class="champ-name">${championShortName(key)}</div><div class="champ-title">${championTitle(key)}</div>
      <div class="champ-role">${cls.role}</div><details class="champ-guide"><summary>Habilidades y estilo</summary>${championGuideHTML(key)}</details>
      <div class="champ-lvl">${typeof HUB_ROLE_LABEL!=="undefined" && HUB_ROLE_LABEL[cls.roleCategory] ? HUB_ROLE_LABEL[cls.roleCategory] + " · " : ""}${owned ? `Nv. ${champ.level}` : grantOnly ? `🔒 ${meta.category==="FOUNDER" ? "Se concede" : "No disponible"}` : `🔒 Tienda · 🪙 ${fmtGold(shopChampionPrice(key))}`}</div>${meta.category==="FOUNDER" && typeof founderBadgeHTML==="function" ? `<div class="champ-founder">${founderBadgeHTML(meta.founderKey,"sm")}</div>` : meta.badge ? `<span class="category-badge cat-${meta.category}">${meta.badge}</span>` : ""}
    `;
    card.addEventListener("click", (ev)=>{
      if(ev.target.closest("details")) return;
      // modo campaña: los guardianes que no tenés se compran en la Tienda
      if(!owned){ if(typeof showNetToast==="function") showNetToast(grantOnly ? (meta.inspectNotice || `${cls.name} no está a la venta.`) : `${cls.name} está bloqueado: se desbloquea en la Tienda por ${fmtGold(shopChampionPrice(key))} de oro.`); return; }
      selectedClass = key; if(typeof netRememberChamp==="function") netRememberChamp(key); renderChampGrid();
    });
    grid.appendChild(card);
  });
  startChampPreviewLoop();
}
// Previsualización animada de cada guardián en la grilla de selección: en vez de un ícono
// fijo, dibuja al personaje real de costado (mirando a la derecha) con su propio ciclo de
// caminata, reusando el mismo arte/atlas que se ve en la partida -no un dibujo aparte-.
// Para eso se pisa momentáneamente la variable global `ctx` (el resto del juego dibuja
// siempre sobre el canvas principal) para que apunte al canvas chiquito de la tarjeta.
let champPreviewLoopRunning = false;
function drawChampionPreviewFrame(cvs, key){
  const pctx = cvs.getContext("2d");
  pctx.clearRect(0,0,cvs.width,cvs.height);
  drawChampFigure(pctx, key, cvs.width/2, cvs.height*0.86, 2.0, 1, performance.now()%100000, true);
}
// Dibuja a un guardián con su arte real sobre cualquier canvas (vista previa de la selección y
// la pantalla de título). `fx` = hacia dónde mira (1 derecha, -1 izquierda).
// extra (opcional): estado de animación para las previews del Códice (attackAnim, *CastKind, spinTimer,
// _codexSkin...). Se copia sobre el héroe falso: el dibujo es el mismo camino que en partida.
function drawChampFigure(pctx, key, x, y, scale, fx, animT, moving, extra){
  const cls = CLASSES[key];
  if(!cls || champPackPending(key)) return;
  const fake = {
    x, y, fx, fy:0, moving,
    animT, attackAnim:0, hurtTimer:0,
    classKey:key, cls, scale, radius:12*scale, // algunos sets (Musashi, Sylva, Nigromante) se dimensionan por el radio
    colossalTimer:0, growTimer:0, spinTimer:0, stealthTimer:0
  };
  if(extra) Object.assign(fake, extra);
  const saved = ctx;
  ctx = pctx;
  try{
    if(fake._codexSkin && typeof drawSetSkin==="function" && drawSetSkin(fake, scale, 1)){
      // skin de set de un guardián de atlas viejo (Mago, Asesino, Sanadora, Tanque): preview del Códice
    }
    else if(PORTADORES[key]) drawPortador(fake, scale, 1);
    else if(key==="mago") drawMagoAtlas(fake, scale, 1);
    else if(key==="soporte") drawSoporteAtlas(fake, scale, 1);
    else if(key==="segador") drawSegadorReal(fake, scale, 1);
    else if(key==="axiom") drawAxiomReal(fake, scale, 1);
    else if(key==="profeta") drawProfetaAtlas(fake, scale, 1);
    else if(key==="musashi" && drawMusashiReal(fake, scale, 1)){
      // Musashi: con su sprite real, igual que en partida.
    }
    else if(key==="cazadora" && drawSylvaReal(fake, scale, 1)){
      // Sylva: con su sprite real, igual que en partida.
    }
    else if(key==="libertador" && drawLibertador(fake, scale, 1)){}
    else if(key==="eren" && drawEren(fake, scale, 1)){}
    else if(key==="nigromante" && drawNigromanteReal(fake, scale, 1)){
      // Nigromante: con su sprite real, igual que en partida.
    }
    else if(DIR_ATLASES[key]) drawDirAtlasHero(DIR_ATLASES[key], fake, scale, 1);
    else {
      // Guardianes sin atlas de bitmap propio usan el sprite procedural genérico (GRIDS/PAL,
      // ver buildSprites). buildSprites() antes solo se llamaba desde startRun(): en la primera
      // visita a un menú SPRITES todavía no existía y la figura quedaba en negro.
      if(!SPRITES[key]) buildSprites();
      const img = heroFrame(fake);
      if(img){
        drawOutline(SPRITES[key], fake.x, fake.y, scale, fx < 0);
        drawSprite(img, fake.x, fake.y, scale, fx < 0);
      }
    }
  } finally {
    ctx = saved;
  }
}
function startChampPreviewLoop(){
  if(champPreviewLoopRunning) return;
  champPreviewLoopRunning = true;
  function tick(){
    const grid = document.getElementById("champ-grid");
    if(!grid || grid.offsetParent===null){ champPreviewLoopRunning = false; return; }
    grid.querySelectorAll(".champ-preview").forEach(cvs=>{
      drawChampionPreviewFrame(cvs, cvs.dataset.classKey);
    });
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
function renderSaveLine(){
  const totalRelics = Object.values(save.relics).reduce((a,b)=>a+b,0);
  document.getElementById("save-line").innerHTML =
    `Oro: <b>${save.gold}</b> &nbsp;·&nbsp; Reliquias permanentes: <b>${totalRelics}</b><br>El progreso se intenta guardar solo en este dispositivo/navegador — si lo abrís desde otro lugar (u otro navegador no lo conserva), usá el código de guardado de abajo.`;
}
