"use strict";
/* ============================================================
   js/arenas/coliseum/coliseum-hud.js
   COLISEO en el motor real — lo que se suma al HUD de siempre (que no se toca): marcador de los cuatro equipos con sus puntos,
   ronda y reloj, mapa de los dos fosos (se ve el otro duelo aunque no estés), barra de espectador y pantalla de resultado.
   Todo con letra de 14 px o más y botones de 48 px o más.
   ============================================================ */
let _colHud = null;
function colHudBuild(){
  if(_colHud) return _colHud;
  const el = document.createElement("div"); el.id = "col-hud"; el.className = "lanes-hud col-hud hidden";
  el.innerHTML =
    '<div class="col-score" role="status" aria-live="polite"><div class="col-teams"></div><div class="col-mid"><strong class="col-round"></strong><span class="col-clock"></span></div></div>' +
    '<div class="ln-note col-note" role="status"></div>' +
    '<div class="ln-feed col-feed" aria-live="polite"></div>' +
    '<div class="col-spec hidden"><button type="button" class="col-prev" aria-label="Luchador anterior">‹</button><span class="col-spec-name"></span><button type="button" class="col-next" aria-label="Luchador siguiente">›</button><button type="button" class="col-pit">OTRO DUELO</button></div>' +
    '<div class="ln-rival col-map"><canvas width="330" height="96"></canvas></div>';
  document.body.appendChild(el);
  el.querySelector(".col-prev").addEventListener("click", ()=>colSpecNext(-1));
  el.querySelector(".col-next").addEventListener("click", ()=>colSpecNext(1));
  el.querySelector(".col-pit").addEventListener("click", ()=>colSpecPit());
  _colHud = el; return el;
}
function colHudShow(){ const el = colHudBuild(); el.classList.remove("hidden"); document.body.classList.add("lanes-on"); document.body.dataset.mode = "coliseo"; const lv = document.getElementById("hud-level"), sp = lv && lv.parentElement; if(sp) sp.innerHTML = 'Ronda <b id="hud-level">0</b> · Vencidos <b id="hud-kills">0</b>'; }
function colHudSync(s){ if(_colHud) _colHud.style.display = (s === "playing" && LN && LN.mode === "coliseo") ? "" : "none"; }
function colHudHide(){ if(_colHud){ _colHud.classList.add("hidden"); } const r = document.getElementById("col-result"); if(r) r.classList.add("hidden"); }
function _colClock(ms){ const left = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(left / 60) + ":" + String(left % 60).padStart(2, "0"); }

function colHudTick(){
  const L = LN; if(!L || !_colHud || !L.col || !player) return;
  const el = _colHud, c = L.col, q = s=>el.querySelector(s);
  // los cuatro equipos: el tuyo primero, con sus puntos
  q(".col-teams").innerHTML = L.team.map(T=>{
    const inMine = c.pairs[0].includes(T.team), inOther = c.pairs[1].includes(T.team), mine = T.team === player.team;
    const pips = Array.from({length:COL.WIN_POINTS}, (_, i)=>'<em class="' + (i < T.points ? "on" : "off") + '">●</em>').join("");
    return '<div class="col-team' + (mine ? " me" : "") + (c.phase === "fight" && (inMine || inOther) ? " fighting" : "") + '" style="--tc:' + lanesTeamColor(T.team) + '"><b>' + (mine ? "TU EQUIPO" : lanesTeamName(T.team)) + '</b><span>' + pips + '</span></div>';
  }).join("");
  q(".col-round").textContent = "RONDA " + c.round;
  q(".col-clock").textContent = c.phase === "prep" ? "Preparate…" : c.phase === "inter" ? "Resultados" : (c.ringR < COL.PIT_R - 2 ? "¡ANILLO CERRÁNDOSE!" : _colClock(COL.ROUND_MS - (L.t - c.t0)));
  const pair = c.pairs[0];
  q(".col-note").textContent = c.phase === "inter" ? c.last : (c.phase === "prep" ? "Tu duelo: " + (pair[0] === 0 ? "TU EQUIPO" : lanesTeamName(pair[0])) + " vs " + lanesTeamName(pair[1]) : (c.res[0] ? "Tu duelo terminó · mirá el otro" : ""));
  q(".col-feed").innerHTML = L.feed.filter(f=>L.t - f.t < 9000).slice(-3).map(f=>'<div style="color:' + lanesTeamColor(f.team) + '">' + f.text + '</div>').join("");
  // espectador (solo si caíste en plena pelea)
  const spec = q(".col-spec"), watching = !player.alive && c.phase === "fight" && c.spec;
  spec.classList.toggle("hidden", !watching);
  if(watching) q(".col-spec-name").textContent = "ESPECTANDO · " + heroLabel(c.spec) + " (" + (c.spec.team === player.team ? "tu equipo" : lanesTeamName(c.spec.team)) + ")";
  colDrawMap();
}
// Los dos fosos en miniatura: luchadores vivos, el anillo y de quién es cada equipo.
function colDrawMap(){
  const cv = _colHud && _colHud.querySelector(".col-map canvas"); if(!cv || !LN) return;
  const g = cv.getContext("2d"), W = cv.width, H = cv.height, sx = W / COL.W, sy = H / COL.H, c = LN.col;
  g.clearRect(0, 0, W, H); g.fillStyle = "#10141d"; g.fillRect(0, 0, W, H);
  for(let pit = 0; pit < 2; pit++){
    const p = colPitCenter(pit);
    g.fillStyle = "#222a3a"; g.beginPath(); g.ellipse(p.x * sx, p.y * sy, COL.PIT_R * sx, COL.PIT_R * sy, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = c.ringR < COL.PIT_R - 2 ? "#ff6a5a" : "rgba(255,255,255,.4)"; g.lineWidth = 2; g.beginPath(); g.ellipse(p.x * sx, p.y * sy, c.ringR * sx, c.ringR * sy, 0, 0, Math.PI * 2); g.stroke();
    g.font = "bold 12px sans-serif"; g.textAlign = "center"; g.fillStyle = "rgba(255,255,255,.7)"; g.fillText(pit === 0 ? "A" : "B", p.x * sx, (p.y - COL.PIT_R - 14) * sy + 4);
  }
  for(const h of heroes){ if(h.team == null) continue; g.fillStyle = h.alive ? "#fff" : "#444"; g.beginPath(); g.arc(h.x * sx, h.y * sy, h === player ? 5.5 : 4.5, 0, Math.PI * 2); g.fill(); g.strokeStyle = lanesTeamColor(h.team); g.lineWidth = 2; g.stroke(); }
}

/* ---------------- resultado ---------------- */
function colShowResult(){
  const L = LN; if(!L) return;
  let r = document.getElementById("col-result");
  if(!r){ r = document.createElement("div"); r.id = "col-result"; r.className = "lanes-result hidden"; document.body.appendChild(r); }
  const mine = player.team, won = L.winner === mine, draw = L.winner === -1, st = colStanding();
  const rows = st.map((T, i)=>{
    const names = heroes.filter(h=>h.team === T.team).map(h=>heroLabel(h)).join(" + ");
    return '<tr' + (T.team === mine ? ' class="me"' : '') + '><td>' + (i + 1) + '. ' + (T.team === mine ? "TU EQUIPO" : lanesTeamName(T.team)) + '<br><small>' + names + '</small></td><td>' + T.points + '</td><td>' + T.wins + '/' + T.duels + '</td><td>' + T.pk + '</td></tr>';
  }).join("");
  r.innerHTML = '<div class="ln-res-card"><div class="ln-res-kicker">COLISEO</div><h2>' + (draw ? "EMPATE" : won ? "¡CAMPEONES!" : lanesTeamName(L.winner) + " GANA") + '</h2>' +
    '<p>' + c_rounds(L) + ' rondas · gana quien llega a ' + COL.WIN_POINTS + ' puntos</p>' +
    '<table><thead><tr><th>Equipo</th><th>Puntos</th><th>Duelos ganados</th><th>Bajas</th></tr></thead><tbody>' + rows + '</tbody></table>' +
    '<div class="ln-res-btns"><button type="button" class="ln-again">REVANCHA</button><button type="button" class="ln-exit">VOLVER AL MENÚ</button></div></div>';
  r.classList.remove("hidden");
  r.querySelector(".ln-exit").onclick = ()=>{ r.classList.add("hidden"); lanesStop("mainmenu"); };
  r.querySelector(".ln-again").onclick = ()=>{ r.classList.add("hidden"); const s = L.setup; lanesStop(); colStart({champ:s.mine, mate:s.mate, rivals:s.rivals}); };
}
function c_rounds(L){ return L.col ? L.col.round : 0; }
