"use strict";
/* ============================================================
   js/ui/founder-presence.js
   PRESENCIA DE LOS GAME MASTERS (Los Regentes Fundadores).
   - Banner cinematográfico de LOBBY y de ARENA cuando entra un Fundador verificado por el servidor
     (relay: server/presence.js agrupa llegadas simultáneas y no repite por reconexión).
   - Insignia FOUNDER / GM reutilizable (founderBadgeHTML) para sala, marcador, perfil, chat y panel.
   - No bloquea el juego: pointer-events:none, arriba del centro, duración configurable.
   - Respeta "Reducir movimiento" y "Reducir efectos intensos" (sin destellos, menos partículas).
   Solo muestra datos públicos que manda el servidor: nombre visible y clave de Fundador.
   ============================================================ */
const FOUNDER_PRESENCE = {
  durationMs: 3400,          // duración total (configurable internamente)
  reducedDurationMs: 2200,
  dedupeMs: 20000,           // red duplicada / rollback: mismo banner dentro de esta ventana no se repite
  maxParticles: 70,
  profiles: {
    nano: { title: "NANO GM — FUNDADOR", epithet: "El Regente del Umbral", line: "La luz decide quién se queda. La sombra, quién se va.", a: "#fff4d6", b: "#1b1124", accent: "#e8c56a", sfx: "founder_nano" },
    facu: { title: "FACU GM — FUNDADOR", epithet: "El Soberano de las Mareas", line: "El océano no me obedece. Me reconoce.", a: "#7ff3ff", b: "#06243a", accent: "#2fd3c6", sfx: "founder_facu" }
  }
};
const _fpSeen = new Map();
function _fpEsc(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c])); }
function _fpReduced(){ return typeof JUICE !== "undefined" && (JUICE.reduceMotion || JUICE.reduceFx); }
// Insignia compacta. size: "sm" (marcador/HUD/chat), "md" (sala/perfil), "lg" (colección/inspección).
function founderBadgeHTML(key, size){
  const p = Object.prototype.hasOwnProperty.call(FOUNDER_PRESENCE.profiles, key) ? FOUNDER_PRESENCE.profiles[key] : null; if(!p) return "";
  return `<span class="founder-badge founder-${key} fb-${size || "sm"}" title="${_fpEsc(p.title)} · ${_fpEsc(p.epithet)}" aria-label="Fundador Game Master"><i aria-hidden="true">${key === "nano" ? "◐" : "≋"}</i>${size === "sm" ? "GM" : "FOUNDER · GM"}</span>`;
}
function founderPresenceShow(scope, founders, roomKey){
  founders = (Array.isArray(founders) ? founders : []).filter(f => f && Object.prototype.hasOwnProperty.call(FOUNDER_PRESENCE.profiles, f.key));
  if(!founders.length || typeof document === "undefined") return false;
  const sig = (roomKey || "solo") + "|" + scope + "|" + founders.map(f => f.key).sort().join("+"), now = Date.now();
  for(const [k, t] of _fpSeen) if(now - t > FOUNDER_PRESENCE.dedupeMs) _fpSeen.delete(k);
  if(_fpSeen.has(sig)) return false;
  _fpSeen.set(sig, now);
  const both = founders.length > 1;
  const head = both ? `LOS GAME MASTERS HAN ENTRADO ${scope === "arena" ? "EN LA ARENA" : "EN EL LOBBY"}` : `EL GAME MASTER HA ENTRADO ${scope === "arena" ? "EN LA ARENA" : "EN EL LOBBY"}`;
  const old = document.getElementById("founder-presence"); if(old) old.remove();
  const el = document.createElement("div");
  el.id = "founder-presence";
  el.className = "founder-presence fp-" + scope + (both ? " fp-both" : " fp-" + founders[0].key) + (_fpReduced() ? " fp-reduced" : "");
  el.setAttribute("role", "status"); el.setAttribute("aria-live", "polite");
  el.innerHTML = `<canvas class="fp-fx" aria-hidden="true"></canvas>
    <div class="fp-plate">
      <div class="fp-head">${head}</div>
      <div class="fp-names">${founders.map(f => { const p = FOUNDER_PRESENCE.profiles[f.key];
        return `<div class="fp-name fp-n-${f.key}"><canvas class="fp-sigil" data-key="${f.key}" width="48" height="48" aria-hidden="true"></canvas><div><b>${_fpEsc(p.title)}</b><small>${_fpEsc(p.epithet)}</small></div></div>`; }).join(both ? '<div class="fp-join" aria-hidden="true">✦</div>' : "")}</div>
      ${!both ? `<div class="fp-line">«${_fpEsc(FOUNDER_PRESENCE.profiles[founders[0].key].line)}»</div>` : `<div class="fp-line">La luz y la marea se reconocen.</div>`}
    </div>`;
  document.body.appendChild(el);
  el.querySelectorAll(".fp-sigil").forEach(c => founderDrawSigil(c, c.dataset.key));
  const dur = _fpReduced() ? FOUNDER_PRESENCE.reducedDurationMs : FOUNDER_PRESENCE.durationMs;
  el.style.setProperty("--fp-dur", dur + "ms");
  if(typeof playSfx === "function") for(const f of founders) playSfx(FOUNDER_PRESENCE.profiles[f.key].sfx);
  _fpParticles(el.querySelector(".fp-fx"), founders.map(f => f.key), dur);
  setTimeout(() => el.remove(), dur + 80);
  return true;
}
// Sello vectorial (no reemplaza el retrato del atlas: sirve hasta que el arte encargado pase el Gate).
function founderDrawSigil(c, key){
  const g = c.getContext("2d"); if(!g) return; const w = c.width, h = c.height; g.clearRect(0, 0, w, h);
  g.lineWidth = 2;
  if(key === "nano"){
    // ala de luz (izquierda) y ala de sombra (derecha) alrededor de un núcleo: formas distintas, no solo color
    g.fillStyle = "#fff4d6"; g.beginPath(); g.moveTo(24, 26); for(let i = 0; i < 4; i++){ g.lineTo(6 + i * 3, 10 + i * 7); g.lineTo(14 + i * 2, 16 + i * 6); } g.closePath(); g.fill();
    g.fillStyle = "#1b1124"; g.strokeStyle = "#e8c56a"; g.beginPath(); g.moveTo(24, 26); for(let i = 0; i < 4; i++){ g.lineTo(42 - i * 3, 8 + i * 8); g.lineTo(36 - i * 2, 15 + i * 7); } g.closePath(); g.fill(); g.stroke();
    g.fillStyle = "#e8c56a"; g.beginPath(); g.arc(24, 26, 4, 0, Math.PI * 2); g.fill();
  } else {
    // cresta de ola sobre presión abisal
    g.strokeStyle = "#7ff3ff"; g.fillStyle = "#06243a";
    g.beginPath(); g.moveTo(4, 38); g.bezierCurveTo(10, 14, 30, 6, 40, 20); g.bezierCurveTo(30, 16, 26, 26, 34, 30); g.bezierCurveTo(24, 34, 14, 36, 44, 40); g.lineTo(4, 44); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = "#2fd3c6"; for(let i = 0; i < 5; i++){ g.beginPath(); g.arc(10 + i * 7, 41 - (i % 2) * 2, 1.5, 0, Math.PI * 2); g.fill(); }
  }
}
function _fpParticles(cv, keys, dur){
  if(!cv || !cv.getContext) return;
  const reduced = _fpReduced(), n = reduced ? 16 : FOUNDER_PRESENCE.maxParticles;
  const fit = () => { cv.width = Math.min(900, cv.clientWidth || 600); cv.height = Math.min(260, cv.clientHeight || 200); };
  fit();
  const g = cv.getContext("2d"), parts = [], t0 = performance.now(), W = cv.width, H = cv.height;
  for(let i = 0; i < n; i++){
    const k = keys[i % keys.length], side = keys.length > 1 ? (k === "nano" ? -1 : 1) : (i % 2 ? 1 : -1);
    parts.push({ k, x: W / 2 + side * (W * 0.45) * Math.random(), y: H * (0.25 + Math.random() * 0.6), vx: -side * (20 + Math.random() * 50), vy: (Math.random() - 0.5) * 20, life: 0.6 + Math.random() * 0.8, phase: Math.random() * 6.28, dark: i % 2 === 0 });
  }
  (function frame(now){
    if(!cv.isConnected) return;
    const t = (now - t0) / 1000; if(t * 1000 > dur) return;
    g.clearRect(0, 0, W, H);
    for(const p of parts){
      const a = Math.max(0, Math.min(1, t / 0.3)) * Math.max(0, 1 - Math.max(0, t - p.life * dur / 1000 * 0.6) / 0.6);
      if(a <= 0) continue;
      const x = p.x + p.vx * t, y = p.y + p.vy * t + (p.k === "facu" ? Math.sin(t * 3 + p.phase) * 6 : 0);
      g.globalAlpha = a;
      if(p.k === "nano"){
        // pluma clara / esquirla oscura: dos FORMAS distintas
        g.fillStyle = p.dark ? "#1b1124" : "#fff4d6";
        if(p.dark){ g.fillRect(x - 1, y - 3, 2, 6); g.fillStyle = "#e8c56a"; g.fillRect(x - 1, y - 3, 2, 1); }
        else { g.beginPath(); g.ellipse(x, y, 4, 1.5, p.phase, 0, Math.PI * 2); g.fill(); }
      } else {
        g.fillStyle = p.dark ? "#2fd3c6" : "#7ff3ff";
        g.beginPath(); g.arc(x, y, p.dark ? 1.6 : 2.6, 0, Math.PI * 2); g.fill();
        if(!p.dark){ g.strokeStyle = "rgba(127,243,255,.5)"; g.beginPath(); g.arc(x, y, 5 + t * 6 % 6, 0, Math.PI * 2); g.stroke(); }
      }
    }
    g.globalAlpha = 1;
    requestAnimationFrame(frame);
  })(t0);
}
// Partida solo/anfitrión: banner de ARENA una vez por partida para la cuenta Fundadora.
let _fpRunToken = 0;
function founderPresenceOnRunStart(){
  if(typeof net !== "undefined" && net.role) return; // online: lo manda el relay a todos (server/presence.js)
  const id = typeof accountIdentity === "function" ? accountIdentity() : null;
  if(!id || !id.founder) return;
  const name = (typeof accountState === "function" && accountState().name) || "";
  founderPresenceShow("arena", [{ key: id.founder.key, name }], "solo-" + (++_fpRunToken));
}
if(typeof ARENA_SFX !== "undefined" && typeof _tone === "function"){
  // Firma sonora distintiva (síntesis propia, mezcla compartida: respeta mute y prioridades).
  ARENA_SFX.founder_nano = { p: 3, gap: 1500, play(t, D){ _tone(t, "sine", 220, 440, .5, .05, D); _tone(t + .12, "triangle", 110, 55, .7, .05, D); _tone(t + .35, "sine", 660, 880, .6, .035, D); _tone(t + .55, "sine", 330, 330, .9, .03, D); return 1.4; } };
  ARENA_SFX.founder_facu = { p: 3, gap: 1500, play(t, D){ _tone(t, "sine", 98, 65, 1.0, .06, D); _tone(t + .2, "triangle", 392, 523, .5, .03, D); _tone(t + .45, "sine", 784, 587, .7, .025, D); _tone(t + .7, "sine", 1046, 880, .4, .02, D); return 1.5; } };
}
