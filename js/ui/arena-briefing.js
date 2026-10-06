"use strict";
/* ============================================================
   js/ui/arena-briefing.js
   BRIEFING PRE-ARENA (UX Bible §Briefing, Arena Bible §7). Completa la ficha del Hechicero
   (js/ui/run-intro.js: lore, lo que te mata / ayuda, objetivo) con los datos de la Arena Factory
   (js/arenas/common/arena-blueprints.js): imagen de la arena, MECÁNICA ESPECIAL, PELIGRO con su aviso,
   JEFE y BOTÍN DESTACADO (set de afinidad con piezas ✓ / ? y dónde caen las que faltan; si el set se
   puede comprar, la ruta gratuita se nombra primero). Máximo de información con mínimo texto.
   Lee solo datos existentes: ARENA_BLUEPRINTS, SET_ARENA_WEIGHTS, SET_DB, shopSetMissing, save.
   ============================================================ */
function _abrEsc(s){ return String(s==null ? "" : s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
// Set destacado de una arena: el de mayor afinidad que todavía no está completo (si todos lo están, el primero).
function arenaFeaturedSet(arena){
  const sets = typeof arenaLootSets==="function" ? arenaLootSets(arena, 4) : [];
  if(!sets.length || typeof SET_DB==="undefined") return null;
  const miss = id=>typeof shopSetMissing==="function" ? shopSetMissing(id) : [];
  const pick = sets.find(s=>SET_DB[s.id] && miss(s.id).length) || sets.find(s=>SET_DB[s.id]);
  if(!pick) return null;
  const S = SET_DB[pick.id], missing = miss(pick.id);
  const pieces = Object.entries(S.pieces||{}).map(([slot, name])=>({slot, name, owned:!missing.includes(pick.id+"_"+slot)}));
  const also = Object.keys(SET_ARENA_WEIGHTS).filter(a=>a!==arena && (SET_ARENA_WEIGHTS[a][pick.id]||0) > 0)
    .sort((a,b)=>SET_ARENA_WEIGHTS[b][pick.id]-SET_ARENA_WEIGHTS[a][pick.id]).slice(0, 3)
    .map(a=>(ARENA_MODS[a] && ARENA_MODS[a].label) || a);
  return {id:pick.id, name:S.name, pieces, owned:pieces.filter(p=>p.owned).length, also};
}
// Regla corta: la primera cláusula de una frase (antes de ";" o ":"), para la ficha compacta.
function _abrShort(t, max){ const s = String(t||"").split(/;|: /)[0].replace(/\.$/, ""); return s.length > (max||70) ? s.slice(0, (max||70) - 1).replace(/\s+\S*$/, "") + "…" : s; }
function arenaBriefingHTML(arena){
  const B = typeof arenaBlueprint==="function" ? arenaBlueprint(arena) : null;
  if(!B) return "";
  const cell = (cls, k, title, sub, extra)=>`<div class="abr-cell ${cls}"><b class="abr-k ${cls}">${k}</b><span class="abr-t">${_abrEsc(title)}</span>${sub ? `<span class="abr-s">${_abrEsc(sub)}</span>` : ""}${extra||""}</div>`;
  const cells = [];
  cells.push(cell("mech", "✦ MECÁNICA", B.primary.name, _abrShort(B.primary.rule)));
  if(B.hazard) cells.push(cell("haz", "⚠ PELIGRO", B.hazard.name, "Aviso: " + _abrShort(B.hazard.telegraph, 60)));
  if(B.boss && B.boss.name) cells.push(cell("boss", "♛ JEFE", B.boss.name, _abrShort(B.boss.arena, 60)));
  const F = arenaFeaturedSet(arena);
  if(F){
    const chips = F.pieces.map(p=>`<span class="abr-piece ${p.owned ? "own" : "miss"}" title="${_abrEsc(p.name)}">${p.owned ? "✓" : "?"} ${_abrEsc(p.slot)}</span>`).join("");
    cells.push(cell("loot", "◆ BOTÍN DESTACADO", F.name + " · " + F.owned + "/" + F.pieces.length,
      "Cae acá" + (F.also.length ? " y en " + F.also.slice(0, 2).join(", ") : ""), `<div class="abr-pieces">${chips}</div>`));
  }
  const seen = typeof arenaTutorialSeen==="function" && arenaTutorialSeen(arena);
  const tut = B.tutorial && B.tutorial.steps && B.tutorial.steps.length && !seen && typeof ARENA_TUT_DRIVERS!=="undefined" && ARENA_TUT_DRIVERS[arena]
    ? `<div class="abr-tut">▶ Primera vez: el Hechicero te enseña la regla de esta arena jugando.</div>` : "";
  return `<div class="abr-grid">${cells.join("")}</div>${tut}`;
}
function arenaBriefingDecorate(el, arena){
  const card = el.querySelector(".ri-card"); if(!card) return;
  let box = card.querySelector(".abr");
  if(!box){
    box = document.createElement("div"); box.className = "abr";
    const anchor = el.querySelector(".ri-crystals") ? el.querySelector(".ri-help").closest(".ri-row") : null;
    if(anchor && anchor.nextSibling) card.insertBefore(box, anchor.nextSibling); else card.appendChild(box);
  }
  box.innerHTML = arenaBriefingHTML(arena);
  let img = card.querySelector(".abr-img");
  if(!img){ img = document.createElement("div"); img.className = "abr-img"; card.insertBefore(img, card.firstChild); }
  img.style.backgroundImage = `url('assets/ui/codex/arenas/${arena}.jpg')`;
  img.classList.toggle("hidden", !(typeof ARENA_BLUEPRINTS!=="undefined" && ARENA_BLUEPRINTS[arena]));
  box.classList.remove("hidden");
}
(function hookRunIntro(){
  if(typeof runIntroFill!=="function") return;
  const base = runIntroFill;
  runIntroFill = function(el, arena, B){
    const r = base.apply(this, arguments);
    const card = el.querySelector(".ri-card");
    if(RUN_INTRO.prologue){ const b = card && card.querySelector(".abr"); if(b) b.classList.add("hidden"); const i = card && card.querySelector(".abr-img"); if(i) i.classList.add("hidden"); }
    else arenaBriefingDecorate(el, arena);
    if(!RUN_INTRO.prologue && typeof telemetryEvent==="function") telemetryEvent("arena_briefing_shown", {arena});
    return r;
  };
})();
