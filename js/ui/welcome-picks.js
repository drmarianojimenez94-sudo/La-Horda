"use strict";
/* ============================================================
   js/ui/welcome-picks.js — ELEGIR LOS 3 CAMPEONES DEL PACK DE BIENVENIDA
   El Pack de bienvenida regala 3 campeones a elección (STANDARD que todavía no tenés). El derecho, la lista de candidatos y cada
   entrega los decide el SERVIDOR (server/wallet.js, POST /api/wallet/welcome/claim); acá solo se muestra y se pide.
     · Si el pago ya se acreditó y todavía quedan elecciones, la Tienda muestra "Reclamar mis N campeones" (también tras cerrar
       el juego: el derecho vive en la cuenta, no en este dispositivo) y abre esta pantalla una vez por sesión.
     · Cada elección es independiente e idempotente: se puede elegir ahora una parte y el resto más tarde.
   Sin cajas sorpresa: ves exactamente qué campeón recibís.
   ============================================================ */
const WELCOME_PICKS = { el: null, sel: [], prompted: false, busy: false };

function _wpEsc(s){ return String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function _wpClose(){ if(WELCOME_PICKS.el){ WELCOME_PICKS.el.remove(); WELCOME_PICKS.el = null; } WELCOME_PICKS.sel = []; }
function welcomePicksIsOpen(){ return !!(WELCOME_PICKS.el && WELCOME_PICKS.el.isConnected); }

function _wpRender(){
  const el = WELCOME_PICKS.el, w = premiumWelcomePending(); if(!el) return;
  if(!w){ _wpClose(); return; }
  const left = w.remaining, ids = (w.eligible || []).filter(k => typeof CLASSES !== "undefined" && CLASSES[k]);
  WELCOME_PICKS.sel = WELCOME_PICKS.sel.filter(k => ids.includes(k)).slice(0, left);
  const n = WELCOME_PICKS.sel.length;
  el.innerHTML = `<div class="wp-panel" role="dialog" aria-modal="true" aria-labelledby="wp-title">
    <div class="wp-head"><div><div class="wp-title" id="wp-title">ELEGÍ TUS ${w.entitled > 1 ? w.entitled + " " : ""}CAMPEONES DE REGALO</div>
      <div class="wp-sub">Pack de bienvenida · te quedan <b>${left}</b> por elegir · valen 🪙 ${fmtGold(PRICING.gold.champion)} cada uno en la Tienda. No hay sorpresas: elegís cuáles.</div></div>
      <button type="button" class="shop-btn sec wp-later" data-wp-close>Más tarde</button></div>
    <div class="wp-grid" role="listbox" aria-label="Campeones disponibles">${ids.map(k => {
      const c = CLASSES[k], on = WELCOME_PICKS.sel.includes(k);
      return `<button type="button" class="wp-card ${on ? "on" : ""}" role="option" aria-selected="${on}" data-wp-pick="${k}" style="--hc:${c.color || "#ff7a2e"}">
        <canvas class="champ-anim wp-anim" width="72" height="72" data-class-key="${k}" data-idle="1" data-skin="" style="background:${c.color || "#888"}1c;"></canvas>
        <span class="wp-name" style="color:${c.color || "var(--ui-ink)"}">${_wpEsc(c.name)}</span>
        <span class="wp-role">${_wpEsc((c.role || "").split(".")[0])}</span>
        <span class="wp-mark">${on ? "✔ ELEGIDO" : "Tocá para elegir"}</span></button>`;
    }).join("") || '<div class="inv-empty">Ya tenés todos los campeones disponibles para el regalo.</div>'}</div>
    <div class="wp-foot"><span class="wp-count">Elegidos: <b>${n}</b> de ${left}</span>
      <button type="button" class="shop-btn hot" data-wp-claim ${n && !WELCOME_PICKS.busy ? "" : "disabled"}>${n ? `Reclamar ${n === 1 ? "1 campeón" : n + " campeones"}` : "Elegí al menos uno"}</button></div></div>`;
  if(typeof startChampAnimLoop === "function") startChampAnimLoop();
}
function welcomePicksOpen(){
  if(!premiumWelcomePending()) return false;
  if(welcomePicksIsOpen()) return true;
  const el = document.createElement("div"); el.id = "welcome-picks"; WELCOME_PICKS.el = el;
  document.body.appendChild(el); WELCOME_PICKS.sel = [];
  el.addEventListener("click", async ev => {
    const t = ev.target.closest && ev.target.closest("button, .wp-panel"); if(!t) { if(ev.target === el) _wpClose(); return; }
    if(t.hasAttribute("data-wp-close")){ _wpClose(); return; }
    const pick = t.getAttribute("data-wp-pick");
    if(pick){
      const w = premiumWelcomePending(); if(!w) return;
      const i = WELCOME_PICKS.sel.indexOf(pick);
      if(i >= 0) WELCOME_PICKS.sel.splice(i, 1); else if(WELCOME_PICKS.sel.length < w.remaining) WELCOME_PICKS.sel.push(pick);
      _wpRender(); return;
    }
    if(t.hasAttribute("data-wp-claim") && !t.disabled && !WELCOME_PICKS.busy){
      const chosen = WELCOME_PICKS.sel.slice(), names = chosen.map(k => CLASSES[k].name);
      const ok = await gameConfirm(`¿Reclamar a ${names.join(", ")}? Es un regalo del Pack de bienvenida y no se puede cambiar después.`, { okText: "Reclamar" });
      if(!ok) return;
      WELCOME_PICKS.busy = true; _wpRender();
      let done = 0, fail = null;
      for(const k of chosen){ const r = await premiumWelcomeClaim(k); if(!r.ok){ fail = r.reason; break; } done++; }
      WELCOME_PICKS.busy = false;
      if(done){
        if(typeof playSfx === "function") playSfx("lootLegend");
        if(typeof showNetToast === "function") showNetToast(`🎁 ${done === 1 ? "CAMPEÓN" : done + " CAMPEONES"} DE REGALO · ${names.slice(0, done).join(", ")}`);
      }
      if(fail) await gameAlert(fail + (done ? "" : " No se registró ninguna elección."));
      await premiumRefresh(true);
      WELCOME_PICKS.sel = [];
      if(!premiumWelcomePending()) _wpClose(); else _wpRender();
      if(typeof state !== "undefined" && state === "shop" && typeof renderShop === "function") renderShop();
      if(typeof renderSaveLine === "function") renderSaveLine();
    }
  });
  _wpRender();
  return true;
}
// Cartel arriba de la Tienda: "Reclamar mis N campeones" mientras queden elecciones (sin importar la pestaña).
function welcomePicksMount(panel){
  const w = premiumWelcomePending(); if(!panel || !w) return;
  const box = document.createElement("div"); box.className = "shop-vale-banner wp-banner";
  box.innerHTML = `🎁 <b>Tenés ${w.remaining} campeón${w.remaining > 1 ? "es" : ""} de regalo por elegir</b> (Pack de bienvenida). <button class="shop-btn hot" type="button" data-wp-open>Reclamar mis ${w.remaining} campeón${w.remaining > 1 ? "es" : ""}</button>`;
  panel.insertBefore(box, panel.firstChild);
  box.querySelector("[data-wp-open]").addEventListener("click", () => welcomePicksOpen());
}
if(typeof document !== "undefined") document.addEventListener("premium-change", () => {
  if(welcomePicksIsOpen()){ _wpRender(); return; }
  // una vez por sesión, al estar en la Tienda con el pago ya acreditado y elecciones pendientes
  if(!WELCOME_PICKS.prompted && typeof state !== "undefined" && state === "shop" && PREMIUM.at && premiumWelcomePending()){ WELCOME_PICKS.prompted = true; welcomePicksOpen(); }
});
