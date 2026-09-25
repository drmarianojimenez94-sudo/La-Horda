"use strict";
/* ============================================================
   js/ui/champion-select.js
   Selección de campeón con vista previa animada y línea de guardado.
   ============================================================ */

/* ============================================================
   MENU: champion select
   ============================================================ */
function renderChampGrid(){
  const grid = document.getElementById("champ-grid");
  grid.innerHTML = "";
  Object.keys(CLASSES).forEach(key=>{
    const cls = CLASSES[key];
    const champ = save.champions[key];
    const card = document.createElement("div");
    card.className = "champ-card" + (key===selectedClass ? " selected":"");
    card.innerHTML = `
      <canvas class="champ-preview" width="104" height="104" style="background:${cls.color}22;" data-class-key="${key}"></canvas>
      <div class="champ-name">${cls.name}</div>
      <div class="champ-role">${cls.role}</div>
      <div class="champ-lvl">Nv. ${champ.level}</div>
    `;
    card.addEventListener("click", ()=>{ selectedClass = key; renderChampGrid(); });
    grid.appendChild(card);
  });
  startChampPreviewLoop();
}
// Previsualización animada de cada campeón en la grilla de selección: en vez de un ícono
// fijo, dibuja al personaje real de costado (mirando a la derecha) con su propio ciclo de
// caminata, reusando el mismo arte/atlas que se ve en la partida -no un dibujo aparte-.
// Para eso se pisa momentáneamente la variable global `ctx` (el resto del juego dibuja
// siempre sobre el canvas principal) para que apunte al canvas chiquito de la tarjeta.
let champPreviewLoopRunning = false;
function drawChampionPreviewFrame(cvs, key){
  const cls = CLASSES[key];
  if(!cls) return;
  const pctx = cvs.getContext("2d");
  pctx.clearRect(0,0,cvs.width,cvs.height);
  const fake = {
    x: cvs.width/2, y: cvs.height*0.86, fx:1, fy:0, moving:true,
    animT: performance.now()%100000, attackAnim:0, hurtTimer:0,
    classKey:key, cls, scale:2.0, radius:24,
    colossalTimer:0, growTimer:0, spinTimer:0, stealthTimer:0
  };
  const saved = ctx;
  ctx = pctx;
  try{
    if(key==="mago") drawMagoAtlas(fake, 2.0, 1);
    else if(key==="soporte") drawSoporteAtlas(fake, 2.0, 1);
    else if(key==="segador") drawSegadorReal(fake, 2.0, 1);
    else if(key==="axiom") drawAxiomReal(fake, 2.0, 1);
    else if(key==="profeta") drawProfetaAtlas(fake, 2.0, 1);
    else if(key==="musashi" && drawMusashiReal(fake, 2.0, 1)){
      // Musashi: vista previa con su sprite real (idle), igual que en partida.
    }
    else if(key==="cazadora" && drawSylvaReal(fake, 2.0, 1)){
      // Sylva: vista previa con su sprite real (idle), igual que en partida.
    }
    else if(key==="nigromante" && drawNigromanteReal(fake, 2.0, 1)){
      // Nigromante: vista previa con su sprite real (idle), igual que en partida.
    }
    else if(DIR_ATLASES[key]) drawDirAtlasHero(DIR_ATLASES[key], fake, 2.0, 1);
    else {
      // Campeones sin atlas de bitmap propio usan el sprite procedural genérico (GRIDS/PAL,
      // ver buildSprites) -mismo camino que ya usa drawHero() para la partida real-. BUG real
      // encontrado en testing: buildSprites()
      // hasta ahora solo se llamaba de forma perezosa desde startRun(), así que en la
      // PRIMERA visita a la pantalla de selección (antes de arrancar cualquier partida)
      // SPRITES todavía no existía y la vista previa quedaba en negro. Mismo guard perezoso
      // que ya usa startRun(), disparado acá también.
      if(!SPRITES[key]) buildSprites();
      const img = heroFrame(fake);
      if(img){
        drawOutline(SPRITES[key], fake.x, fake.y, 2.0, false);
        drawSprite(img, fake.x, fake.y, 2.0, false);
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
