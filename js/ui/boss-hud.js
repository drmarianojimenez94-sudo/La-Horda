"use strict";
/* ============================================================
   js/ui/boss-hud.js
   Presentación de jefes: barra grande arriba al centro (nombre, título, vida con "rastro" del
   daño reciente, marcas de fase, estado: blindado / vulnerable / regenerando / vidas), línea
   de aviso con el ataque en curso y qué hacer, y la GUÍA de aparición con 3 consejos.
   También se usa, más chica, para los subjefes que aparecen solos.
   ============================================================ */
const SUBBOSS_TIPS = {
  kraken_joven:      {epithet:"Guardián del Arrecife", tips:["Si te agarra, pegale al Kraken para soltarte.", "El Barrido cubre todo su alrededor: alejate cuando brilla.", "Invoca refuerzos: no te quedes rodeado."]},
  guardian_laberinto:{epithet:"Centinela de Piedra", tips:["El Pisotón aturde: salí del círculo antes de que caiga.", "Las rocas caen donde estás: seguí moviéndote."]},
  dragon_hielo:      {epithet:"Soberano de Hielo", tips:["El Aliento es un cono al frente: rodealo.", "La escarcha se acumula: 4 golpes helados te congelan."]},
  esqueleto_h:       {epithet:"Campeón de la Horda", tips:["Gira su arma cuando estás cerca: alejate a tiempo.", "Embiste en línea recta: movete de costado."]},
  demonio_menor:     {epithet:"Campeón de la Horda", tips:["Hace llover fuego sobre tu posición: no te quedes quieto."]},
  golem:             {epithet:"Campeón de la Horda", tips:["Su Pisotón aturde: salí del círculo.", "Lanza rocas a distancia."]}
};
let hudBoss = null, _bossChip = 1, _bossHintT = 0, _bossIntroT = 0, _bossIntroDelay = 0, _bossPhaseTxt = "";
const _bh = {};
function _bhEl(id){ return _bh[id] || (_bh[id] = document.getElementById(id)); }
function bossHudShow(e){
  hudBoss = e; _bossChip = 1;
  const d = (typeof BOSS_DESIGNS!=="undefined" && BOSS_DESIGNS[e.type]) || SUBBOSS_TIPS[e.type] || null;
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
    _bossIntroT = isSub ? 4600 : 7500;
  } else { _bossIntroDelay = 0; _bossIntroT = 0; }
  bossHudHint("", "");
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
}
function bossHudStatus(){
  const e = hudBoss; if(!e) return;
  const bits = [];
  if(_bossPhaseTxt) bits.push(_bossPhaseTxt);
  if(e.type==="leviatan") bits.push(`Vida ${e.acuaticaPhase||1}/3`);
  if(e.type==="jinete_sin_cabeza") bits.push(e.resurrected ? "Vida 2/2" : "Vida 1/2");
  if(e.crashVuln) bits.push('<span class="bs-vuln">VULNERABLE</span>');
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
  if(!e && activeChampion && activeChampion.alive && activeChampion.rank==="subjefe" && !enemies.some(o=>o.alive && o!==activeChampion && o.rank==="subjefe")) e = activeChampion;
  if(e !== hudBoss){ if(e) bossHudShow(e); else bossHudHide(); }
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
