"use strict";
/* ============================================================
   js/ui/boss-hud.js
   Presentación de jefes: barra grande arriba al centro (nombre, título, vida con "rastro" del
   daño reciente, marcas de fase, estado: blindado / vulnerable / regenerando / vidas), línea
   de aviso con el ataque en curso y qué hacer, y la GUÍA de aparición con 3 consejos.
   También se usa, más chica, para los subjefes que aparecen solos.
   ============================================================ */
const SUBBOSS_TIPS = {
  kraken_joven:      {epithet:"Guardián del Arrecife", tips:["Atraelo a un CHARCO que brilla y salí antes de la descarga: queda EXPUESTO.", "Anillo violeta = agarre: salí antes de que se cierre (si te agarra, pegale al Kraken).", "Sus refuerzos llegan nadando por la CORRIENTE marcada."]},
  guardian_laberinto:{epithet:"Centinela de Piedra", tips:["Te encierra en un LABERINTO DE PIEDRA: buscá el hueco o esperalo pegado a un pilar.", "Si su PISOTÓN cae junto a sus pilares, los derriba y queda EXPUESTO.", "Las rocas caen donde estás: seguí moviéndote."]},
  doblador_guerrero: {epithet:"Ecos de las runas", tips:["Cada sombra está ATADA a una runa (cuerda roja): mientras arda, recibe menos daño.", "CONTENÉ su runa y esa sombra queda EXPUESTA.", "El Clérigo cura a los demás: su runa primero."]},
  doblador_arquera:  {epithet:"Ecos de las runas", tips:["CONTENÉ la runa atada a la Arquera para exponerla.", "Su abanico de flechas: movete de costado."]},
  doblador_picaro:   {epithet:"Ecos de las runas", tips:["CONTENÉ la runa atada al Pícaro para exponerlo.", "Aparece a tu lado: no te quedes quieto."]},
  doblador_clerigo:  {epithet:"Ecos de las runas", tips:["Cura a las otras sombras: CONTENÉ su runa primero."]},
  dragon_hielo:      {epithet:"Soberano de Hielo", tips:["El Aliento es un cono al frente: rodealo.", "La escarcha se acumula: 4 golpes helados te congelan."]},
  esqueleto_h:       {epithet:"Guardián de la Horda", tips:["Gira su arma cuando estás cerca: alejate a tiempo.", "Embiste en línea recta: movete de costado."]},
  demonio_menor:     {epithet:"Guardián de la Horda", tips:["Hace llover fuego sobre tu posición: no te quedes quieto."]},
  golem:             {epithet:"Guardián de la Horda", tips:["Su Pisotón aturde: salí del círculo.", "Lanza rocas a distancia."]}
};
let hudBoss = null, _bossChip = 1, _bossHintT = 0, _bossIntroT = 0, _bossIntroDelay = 0, _bossPhaseTxt = "";
const _bh = {};
function _bhEl(id){ return _bh[id] || (_bh[id] = document.getElementById(id)); }
// Ficha de presentación del jefe: la forma ACTUAL manda (e.designKey: el Demonio Mayor que nace del Gólem
// es "demonio_final", no el Demonio Mayor suelto) y después el tipo.
function bossHudDesign(e){
  const D = typeof BOSS_DESIGNS!=="undefined" ? BOSS_DESIGNS : {};
  return (e.designKey && (D[e.designKey] || ARENA_BOSS_TIPS[e.designKey])) || D[e.type] || SUBBOSS_TIPS[e.type] || ARENA_BOSS_TIPS[e.type] || null;
}
let _bossHudKey = "";
// Subjefe que una arena presenta con barra grande aunque no sea el "campeón" del nivel (el Titán de las Minas
// deja activeChampion en null a propósito: sus oleadas siguen). Se ignora si murió o ya no está en la partida.
let bossHudFocus = null;
function bossHudShow(e){
  hudBoss = e; _bossChip = 1; _bossHudKey = (e.designKey||e.type) + "|" + e.name;
  const d = bossHudDesign(e);
  const isSub = e.rank!=="jefe";
  const hud = _bhEl("boss-hud");
  hud.classList.remove("hidden"); hud.classList.toggle("sub", isSub);
  _bhEl("boss-name").textContent = e.name;
  _bhEl("boss-epithet").textContent = d && d.epithet ? d.epithet : (isSub ? "Subjefe" : "Jefe");
  // marcas de fase sobre la barra (umbrales de vida del diseño)
  const ticks = _bhEl("boss-ticks"); ticks.innerHTML = "";
  const phases = d && d.phases && !d.byLevPhase ? d.phases : [];
  phases.forEach(p=>{ if(p.hp<0.999){ const t = document.createElement("i"); t.style.left = (p.hp*100)+"%"; ticks.appendChild(t); } });
  _bossPhaseTxt = ""; bossHudStatus();
  // guía de aparición
  if(d && d.tips){
    const intro = _bhEl("boss-intro");
    intro.querySelector(".bi-name").textContent = "CÓMO SOBREVIVIR";
    intro.querySelector(".bi-epithet").textContent = d.epithet || "";
    intro.querySelector(".bi-tips").innerHTML = d.tips.map(t=>`<li>${t}</li>`).join("");
    intro.classList.add("hidden");
    // el jefe entra con su cartel grande: la guía espera a que termine para no pisarlo
    _bossIntroDelay = isSub ? 300 : 2100;
    // si hay un cartel grande de presentación (arenaTitleCard), la guía espera a que se vaya
    _bossIntroDelay = Math.max(_bossIntroDelay, _arenaTitleUntil - performance.now() + 200);
    _bossIntroT = isSub ? 4600 : 7500;
  } else { _bossIntroDelay = 0; _bossIntroT = 0; }
  bossHudHint("", "");
  if(typeof storyBossIntro==="function") storyBossIntro(e); // su presentación (voz del jefe, js/systems/story.js)
}
function bossHudHide(){
  hudBoss = null; _bossIntroDelay = 0; _bossIntroT = 0;
  const hud = _bhEl("boss-hud"); if(hud) hud.classList.add("hidden");
  const intro = _bhEl("boss-intro"); if(intro) intro.classList.add("hidden");
}
function bossHudHint(name, tip){
  const el = _bhEl("boss-hint"); if(!el) return;
  if(!name){ el.innerHTML = ""; el.classList.remove("show"); return; }
  el.innerHTML = `<b>${name}</b>${tip?` — ${tip}`:""}`;
  el.classList.remove("show"); void el.offsetWidth; el.classList.add("show");
  _bossHintT = 2800;
}
function bossHudPhase(ph, n){
  _bossPhaseTxt = n>1 ? `Fase ${ph+1}/${n}` : "";
  bossHudStatus();
  if(typeof storyBossPhase==="function") storyBossPhase(ph); // lo que dice al cambiar de fase (story.js)
}
function bossHudStatus(){
  const e = hudBoss; if(!e) return;
  const bits = [];
  if(_bossPhaseTxt) bits.push(_bossPhaseTxt);
  if(e.type==="leviatan") bits.push(`Vida ${e.acuaticaPhase||1}/3`);
  // la Resurrección Eterna solo existe en las Ruinas (onBossDefeated, run.js): en otra arena no se promete
  if(e.type==="jinete_sin_cabeza" && currentArena==="bosque") bits.push(e.resurrected ? "Vida 2/2" : "Vida 1/2");
  if(e.type==="guardian_ancestral"){ if(e._gdTf > 0) bits.push('<span class="bs-armor">TRANSFORMÁNDOSE</span>'); else if(e._gdDone) bits.push("Corrompido"); }
  if(e._encTag && !e.crashVuln) bits.push('<span class="bs-armor">' + e._encTag + '</span>');
  if(e.crashVuln) bits.push('<span class="bs-vuln">' + (e._expT > 0 ? 'EXPUESTO' : 'VULNERABLE') + '</span>');
  else if(e.dmgTakenMult && e.dmgTakenMult<0.99) bits.push('<span class="bs-armor">BLINDADO</span>');
  if(e.regenTimer>0 && e.type==="demonio_mayor") bits.push('<span class="bs-regen">REGENERANDO</span>');
  if(e.enraged) bits.push('<span class="bs-rage">FURIA</span>');
  const html = bits.join(" · ");
  const el = _bhEl("boss-status");
  if(el && el._last!==html){ el.innerHTML = html; el._last = html; }
}
function updateBossHud(dt){
  // el jefe (o, si no hay, el subjefe activo que apareció solo) es el que manda la barra
  let e = (boss && boss.alive && bossActive) ? boss : null;
  if(!e && bossHudFocus && bossHudFocus.alive && enemies.includes(bossHudFocus)) e = bossHudFocus;
  if(!e && activeChampion && activeChampion.alive && activeChampion.rank==="subjefe" && !enemies.some(o=>o.alive && o!==activeChampion && o.rank==="subjefe")) e = activeChampion;
  if(e !== hudBoss){ if(e) bossHudShow(e); else bossHudHide(); }
  // el mismo cuerpo cambió de forma (Gólem → Rey de la Horda): nombre, epíteto, marcas y consejos nuevos
  else if(e && ((e.designKey||e.type) + "|" + e.name) !== _bossHudKey) bossHudShow(e);
  if(!hudBoss) return;
  const pct = Math.max(0, hudBoss.hp/hudBoss.maxHp);
  if(pct > _bossChip) _bossChip = pct; else _bossChip += (pct-_bossChip)*Math.min(1, dt/450);
  _bhEl("boss-fill").style.width = (pct*100).toFixed(2)+"%";
  _bhEl("boss-chip").style.width = (_bossChip*100).toFixed(2)+"%";
  _bhEl("boss-hud").classList.toggle("armored", !!(hudBoss.dmgTakenMult && hudBoss.dmgTakenMult<0.99));
  _bhEl("boss-hud").classList.toggle("vuln", !!hudBoss.crashVuln);
  bossHudStatus();
  if(_bossHintT>0){ _bossHintT -= dt; if(_bossHintT<=0) _bhEl("boss-hint").classList.remove("show"); }
  if(_bossIntroDelay>0){
    _bossIntroDelay -= dt;
    if(_bossIntroDelay<=0){ const intro = _bhEl("boss-intro"); intro.classList.remove("hidden","fade"); void intro.offsetWidth; }
    return;
  }
  if(_bossIntroT>0){ _bossIntroT -= dt; if(_bossIntroT<=700) _bhEl("boss-intro").classList.add("fade"); if(_bossIntroT<=0) _bhEl("boss-intro").classList.add("hidden"); }
}
