"use strict";
/* ============================================================
   js/arenas/lanes/lanes-hud.js
   GUERRA DE CRISTALES en el motor real — lo que se suma al HUD de siempre (que no se toca):
   marcador de los dos cristales, fragmentos y suministros, vista del carril rival y pantalla de resultado.
   Todo con letra de 14 px o más y botones de 48 px o más.
   ============================================================ */
let _lnHud = null;
function lanesHudBuild(){
  if(_lnHud) return _lnHud;
  const root = document.body; // fuera de #hud (z-index 10) para quedar sobre los controles táctiles
  const el = document.createElement("div"); el.id = "lanes-hud"; el.className = "lanes-hud hidden";
  el.innerHTML =
    '<div class="ln-score" role="status" aria-live="polite">' +
      '<div class="ln-team ln-blue"><b>ZAFIRO</b><span class="ln-pips"></span><span class="ln-hp"></span><i class="ln-bar"><u></u></i></div>' +
      '<div class="ln-clock"><strong class="ln-time">18:00</strong><span class="ln-wave"></span><span class="ln-epics"></span></div>' +
      '<div class="ln-team ln-amber"><b>ÁMBAR</b><span class="ln-pips"></span><span class="ln-hp"></span><i class="ln-bar"><u></u></i></div>' +
    '</div>' +
    '<div class="ln-note" role="status"></div>' +
    '<div class="ln-feed" aria-live="polite"></div>' +
    '<div class="ln-cards hidden" role="group" aria-label="Carta de horda"><div class="ln-cards-title">CARTA DE HORDA <small>potenciá a las criaturas que mandás contra el rival</small></div><div class="ln-cards-row"></div><i class="ln-cards-timer"><u></u></i></div>' +
    '<button type="button" class="ln-chip" aria-expanded="false"><span class="ln-shards">◆ 0</span><span class="ln-phase">Suministros</span></button>' +
    '<button type="button" class="ln-recall" aria-label="Volver a la base (B)"><b>B</b><span>VOLVER</span></button>' +
    '<div class="ln-shop hidden"></div>' +
    '<div class="ln-rival"><canvas width="240" height="180"></canvas><div class="ln-horde"></div></div>';
  root.appendChild(el);
  const shop = el.querySelector(".ln-shop");
  const hint = document.createElement("div"); hint.className = "ln-shop-hint"; hint.textContent = "OBJETOS: se compran en tu base o estando caído (B vuelve) · PEDIDOS: desde donde estés"; shop.appendChild(hint);
  const mk = (key, name, extra)=>{ const b = document.createElement("button"); b.type = "button"; b.dataset.key = key; b.className = "ln-buy" + extra; b.innerHTML = '<b>' + name + '</b><span></span><small></small>';
    b.addEventListener("click", ()=>{ if(player) lanesBuy(player.team, key, player); lanesHudTick(); }); shop.appendChild(b); return b; };
  for(const id of LANES_ITEM_ORDER) mk("item:" + id, LANES_ITEMS[id].name, " ln-item");
  for(const [key, it] of Object.entries(LANES.SHOP)) mk(key, it.name, key === "swarm" || key === "brute" ? " ln-send" : "");
  el.querySelector(".ln-recall").addEventListener("click", ()=>{ if(player) lanesRecallRequest(player); });
  if(!window._lnKeyB){ window._lnKeyB = true; addEventListener("keydown", ev=>{ if((ev.key === "b" || ev.key === "B") && LN && LN.mode !== "coliseo" && state === "playing" && player && !ev.repeat) lanesRecallRequest(player); }); }
  const chip = el.querySelector(".ln-chip");
  chip.addEventListener("click", ()=>{ const open = shop.classList.toggle("hidden") === false; chip.setAttribute("aria-expanded", String(open)); el.classList.toggle("ln-shop-open", open); });
  _lnHud = el; return el;
}
function _lnPill(on){ const lv = document.getElementById("hud-level"), sp = lv && lv.parentElement; if(!sp) return;
  sp.innerHTML = on ? 'Oleada <b id="hud-level">0</b> · Vencidos <b id="hud-kills">0</b>' : 'Nivel <b id="hud-level">1</b>/10 · Vencidos <b id="hud-kills">0</b>'; }
function lanesHudShow(){ const el = lanesHudBuild(); el.classList.remove("hidden"); document.body.classList.add("lanes-on"); document.body.dataset.mode = (typeof LN !== "undefined" && LN && LN.mode === "coliseo") ? "coliseo" : "cristales"; _lnPill(true); }
function lanesHudSync(s){
  if(_lnHud) _lnHud.style.display = (s === "playing" && LN && LN.mode !== "coliseo") ? "" : "none";
  if(typeof colHudSync === "function") colHudSync(s);
  // se fue de la Sala sin jugar (salió de la sala, cerró el menú): se devuelve el guardado real
  if(LN && LN.lobby && s !== "prep" && !(typeof netMatch !== "undefined" && netMatch) && !(typeof netInRoom === "function" && netInRoom())) lanesRestore();
}
function lanesHudHide(){ _lnPill(false); if(typeof colHudHide === "function") colHudHide(); if(_lnHud) _lnHud.classList.add("hidden"); document.body.classList.remove("lanes-on"); delete document.body.dataset.mode; const r = document.getElementById("lanes-result"); if(r) r.classList.add("hidden"); }
function _lnMin(ms){ const t = Math.ceil(ms / 1000); return Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0"); }
function _lnClock(ms){ const left = Math.max(0, Math.ceil((LANES.TIME_LIMIT_MS - ms) / 1000)); return Math.floor(left / 60) + ":" + String(left % 60).padStart(2, "0"); }

let _lnOfferKey = "";
function lanesHudTick(){
  if(LN && LN.mode === "coliseo"){ if(typeof colHudTick === "function") colHudTick(); return; }
  const L = LN; if(!L || !_lnHud || !player || !L.team.length) return;
  const el = _lnHud, q = s=>el.querySelector(s), me = player.team != null ? player.team : 0, T = L.team[me];
  [0, 1].forEach(i=>{
    const c = L.team[i].S[9], t = el.querySelectorAll(".ln-team")[i];
    t.querySelector(".ln-hp").textContent = Math.ceil(c.hp) + (c.ward > 0 ? " +" + Math.ceil(c.ward) : "");
    t.querySelector(".ln-bar u").style.width = Math.max(0, c.hp / c.maxHp * 100) + "%";
    const ex = L.team[i].S[9], nTw = L.team[i].S.filter(s=>s.kind === "tower" && s.alive).length;
    t.querySelector(".ln-pips").innerHTML = '<em class="on">▲</em> ' + nTw + '/9 torres' + (ex && lanesExposed(ex) ? ' · <em class="off" style="color:#ff8a7a">¡EXPUESTO!</em>' : '');
  });
  q(".ln-time").textContent = _lnClock(L.t);
  q(".ln-wave").textContent = L.t >= LANES.ECLIPSE_MS ? "☀ ECLIPSE" : "Oleada " + L.wave;
  q(".ln-shards").textContent = "◆ " + Math.floor(player.gold || 0) + " oro";
  q(".ln-phase").textContent = "Nv " + (player.mlvl || LANES.LEVEL0) + (player.mlvl >= LANES.LEVEL_MAX ? " · MÁX" : " · XP " + Math.floor((player.mxp || 0) / lanesLevelNeed(player.mlvl) * 100) + " %") + " · TIENDA";
  // objetivos épicos y bendiciones de equipo
  if(L.epics){ q(".ln-epics").textContent = L.epics.map(ep=>{ const d = LANES_EPICS[ep.id], on = ep.mon && ep.mon.alive; return (d.key === "dragon" ? "🐉 " : "👑 ") + (on ? "VIVO" : _lnMin(Math.max(0, ep.respawnAt - L.t))); }).join("  "); }
  const rc = q(".ln-recall"); rc.classList.toggle("on", !!player._recall); rc.disabled = !player.alive;
  for(const b of el.querySelectorAll(".ln-buy")){
    const key = b.dataset.key, sp = b.querySelector("span");
    if(key.indexOf("item:") === 0){ const it = LANES_ITEMS[key.slice(5)], tier = player[it.field] || 0; sp.textContent = tier >= 3 ? "MÁX" : it.costs[tier] + " ◆ · Nv " + (tier + 1); b.title = it.desc; }
    else { sp.textContent = LANES.SHOP[key].cost + " ◆"; b.title = LANES.SHOP[key].desc; }
    b.disabled = !lanesCanBuy(me, key, player);
  }
  const bf = []; if(T.buffs.dragon > L.t) bf.push("Dragón +10 % daño " + _lnMin(T.buffs.dragon - L.t)); if(T.buffs.rey > L.t) bf.push("Rey Coloso " + _lnMin(T.buffs.rey - L.t)); if(player._lnBuff && player._lnBuff.until > L.t) bf.push("Gigante +12 % " + _lnMin(player._lnBuff.until - L.t));
  q(".ln-note").textContent = L.t >= LANES.ECLIPSE_MS ? "Los dos cristales se apagan cada vez más rápido" : (bf.length ? "★ " + bf.join(" · ") : (L.t < 20000 ? "Tu horda sale sola por los tres carriles. Acompañala y derribá torres." : (player._recall ? "Volviendo a la base… no te muevas" : "")));
  const foes = L.feed.filter(f=>L.t - f.t < 9000).slice(-3);
  q(".ln-feed").innerHTML = foes.map(f=>'<div style="color:' + lanesTeamColor(f.team) + '">' + f.text + '</div>').join("");
  // carta de horda
  const cards = q(".ln-cards"), key = T.offer ? T.offer.join(",") + "@" + T.offerAt : "";
  if(T.offer){
    if(key !== _lnOfferKey){
      _lnOfferKey = key;
      q(".ln-cards-row").innerHTML = T.offer.map((id, i)=>{ const c = LANES_CARDS[id], n = (T.cards[id] || 0);
        return '<button type="button" class="ln-card" data-i="' + i + '"><span class="ln-card-ico">' + c.icon + '</span><b>' + c.name + '</b><span class="ln-card-desc">' + c.desc + '</span><small>' + (n ? "Nivel " + (n + 1) + "/" + c.max : "Nueva") + '</small></button>'; }).join("");
      for(const b of q(".ln-cards-row").querySelectorAll(".ln-card")) b.addEventListener("click", ()=>{ const i = +b.dataset.i; if(!lanesNetCardRequest(i)) lanesPickCard(me, i); lanesHudTick(); });
    }
    cards.classList.remove("hidden");
    if(!q(".ln-shop").classList.contains("hidden")){ q(".ln-shop").classList.add("hidden"); el.classList.remove("ln-shop-open"); q(".ln-chip").setAttribute("aria-expanded", "false"); }   // la carta manda: cierra la tienda
    q(".ln-cards-timer u").style.width = Math.max(0, 100 - (L.t - T.offerAt) / LANES.CARD_AUTO_MS * 100) + "%";
  } else { cards.classList.add("hidden"); _lnOfferKey = ""; }
  // horda propia: cartas ya tomadas
  const taken = Object.keys(T.cards).filter(id=>T.cards[id] > 0).map(id=>'<span title="' + LANES_CARDS[id].name + '">' + LANES_CARDS[id].icon + (T.cards[id] > 1 ? "×" + T.cards[id] : "") + '</span>').join("");
  q(".ln-horde").innerHTML = '<b>TU HORDA</b> ' + (taken || '<i>sin cartas todavía</i>');
  lanesDrawMap();
}
// Mapa completo en miniatura: carriles, río, selva, torres, hordas, héroes y objetivos (se ve todo el tiempo, aunque estés lejos).
function lanesDrawMap(){
  const cv = _lnHud && _lnHud.querySelector(".ln-rival canvas"); if(!cv || !LN) return;
  const g = cv.getContext("2d"), W = cv.width, H = cv.height, sx = W / LANES.W, sy = H / LANES.H;
  g.clearRect(0, 0, W, H); g.fillStyle = "#12261a"; g.fillRect(0, 0, W, H);
  g.strokeStyle = "rgba(70,140,205,.55)"; g.lineWidth = 15; g.beginPath(); g.moveTo(0, 0); g.lineTo(W, H); g.stroke();
  g.lineCap = "round"; g.lineJoin = "round";
  for(let l = 0; l < 3; l++){ g.beginPath(); LANES_PATHS[l].pts.forEach((q, i)=>{ if(i) g.lineTo(q[0] * sx, q[1] * sy); else g.moveTo(q[0] * sx, q[1] * sy); }); g.strokeStyle = "#7a8296"; g.lineWidth = 8; g.stroke(); }
  g.strokeStyle = "#5a6b88"; g.lineWidth = 2; g.strokeRect(1, 1, W - 2, H - 2);
  for(const cd of LANES_CAMPS){ const camp = LN.camps && LN.camps[cd.id], on = camp ? camp.mons.some(m=>m.alive) : (enemies.some(e=>e.alive && e.campId === cd.id)); g.fillStyle = on ? "#e8c46a" : "#5a5030"; g.beginPath(); g.arc(cd.x * sx, cd.y * sy, 3, 0, Math.PI * 2); g.fill(); }
  for(const ed of LANES_EPICS){ const on = enemies.some(e=>e.alive && e.epicId === ed.id); g.fillStyle = on ? "#d89bff" : "#4a3560"; g.beginPath(); g.moveTo(ed.x * sx, ed.y * sy - 7); g.lineTo(ed.x * sx + 6, ed.y * sy + 5); g.lineTo(ed.x * sx - 6, ed.y * sy + 5); g.closePath(); g.fill(); }
  for(const T of LN.team) for(const s of T.S){
    if(!s.alive) continue; g.fillStyle = lanesTeamColor(s.team);
    if(s.kind === "crystal"){ const x = s.x * sx, y = s.y * sy; g.beginPath(); g.moveTo(x, y - 9); g.lineTo(x + 7, y); g.lineTo(x, y + 9); g.lineTo(x - 7, y); g.closePath(); g.fill(); }
    else { g.fillRect(s.x * sx - 3, s.y * sy - 3, 6, 6); }
  }
  for(const e of enemies){ if(!e.alive || e.lanesProxy || e.team == null || e.team === 2) continue; g.fillStyle = lanesTeamColor(e.team); const z = e.isBrute ? 4 : 2; g.fillRect(e.x * sx - z / 2, e.y * sy - z / 2, z, z); }
  for(const h of heroes){ if(h.team == null) continue; g.fillStyle = h.alive ? "#fff" : "#555"; g.beginPath(); g.arc(h.x * sx, h.y * sy, h === player ? 5 : 4, 0, Math.PI * 2); g.fill(); g.strokeStyle = lanesTeamColor(h.team); g.lineWidth = 2; g.stroke(); }
  if(player){ const vw = (typeof VIEW_WORLD_SHORT !== "undefined" ? VIEW_WORLD_SHORT : 650) * 1.8, vh = vw * 0.56; g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = 1; g.strokeRect((player.x - vw / 2) * sx, (player.y - vh / 2) * sy, vw * sx, vh * sy); }
}

/* ---------------- resultado ---------------- */
function lanesShowResult(){
  const L = LN; if(!L) return;
  let r = document.getElementById("lanes-result");
  if(!r){ r = document.createElement("div"); r.id = "lanes-result"; r.className = "lanes-result hidden"; document.body.appendChild(r); }
  const mine = player.team != null ? player.team : 0, won = L.winner === mine, draw = L.winner === -1;
  const rows = heroes.map(h=>{ const s = h.stats || {}; return '<tr' + (h === player ? ' class="me"' : '') + '><td>' + heroLabel(h) + '</td><td>' + (h.team ? "Ámbar" : "Zafiro") + '</td><td>' + (h.mlvl || "-") + '</td><td>' + Math.round(s.dmgDealt || s.dmg || 0) + '</td><td>' + (s.kills || 0) + '</td><td>' + Math.round(s.healed || s.heal || 0) + '</td></tr>'; }).join("");
  r.innerHTML = '<div class="ln-res-card"><div class="ln-res-kicker">GUERRA DE CRISTALES</div><h2>' + (draw ? "EMPATE" : won ? "¡VICTORIA!" : "CRISTAL CAÍDO") + '</h2>' +
    '<p>Zafiro ' + Math.ceil(L.team[0].S[9].hp) + ' · Ámbar ' + Math.ceil(L.team[1].S[9].hp) + ' · torres en pie ' + lanesTowersAlive(0) + '–' + lanesTowersAlive(1) + ' · bajas de héroes ' + L.team[0].pk + '–' + L.team[1].pk + ' · ' + (L.why === "tiempo" ? "decidida por tiempo" : "cristal destruido") + '</p>' +
    '<table><thead><tr><th>Jugador</th><th>Equipo</th><th>Nv</th><th>Daño</th><th>Bajas</th><th>Cura</th></tr></thead><tbody>' + rows + '</tbody></table>' +
    '<div class="ln-res-btns"><button type="button" class="ln-again">REVANCHA</button><button type="button" class="ln-exit">VOLVER AL MENÚ</button></div></div>';
  r.classList.remove("hidden");
  const online = !!(typeof netMatch !== "undefined" && netMatch);
  if(online){ r.querySelector(".ln-again").textContent = "VOLVER A LA SALA"; r.querySelector(".ln-exit").textContent = "SALIR DE LA SALA"; }
  r.querySelector(".ln-exit").onclick = ()=>{ r.classList.add("hidden"); if(online){ lanesLeaveOnline(true); } else lanesStop("mainmenu"); };
  r.querySelector(".ln-again").onclick = ()=>{ r.classList.add("hidden"); if(online){ lanesLeaveOnline(false); return; } const s = L.setup; lanesStop(); lanesStart({champ:s.mine, mate:s.mate, rivals:s.rivals, size:s.size}); };
}
