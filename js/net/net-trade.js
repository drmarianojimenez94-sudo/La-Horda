"use strict";
/* ============================================================
   js/net/net-trade.js
   INTERCAMBIO EN LA SALA (sin plata real): un jugador le DA un objeto de su inventario de cuenta a
   otro jugador de su sala online. Solo en la Sala, entre partidas (pestaña Sala online, #net-trade).
   Flujo: A elige a quién y qué → B ve el objeto completo y ACEPTA (1ª confirmación) → A CONFIRMA la
   entrega (2ª) → el relay se lo pasa a B → B lo guarda → recién ahí A lo pierde.
   El diseño antiduplicación completo está en server/trades.js. Del lado del juego:
   - save.trades.esc[id]: lo que A ya sacó de su inventario y está "en camino". No se puede usar,
     vender ni volver a dar. Si el intercambio se anula, vuelve al inventario tal cual.
   - save.trades.pend[id]: lo que B recibió y todavía no se confirmó. Recién con el "commit" del
     relay pasa al inventario, con un uid NUEVO derivado del id (aplicarlo dos veces no duplica).
   - Si se corta la conexión, al volver a conectarse cada uno pregunta cómo terminó (con la clave
     secreta de su lado) y completa o deshace su parte. Nadie pierde nada.
   OBJETOS LIGADOS A LA CUENTA (no se pueden dar): Únicos, piezas de set (arman las skins) y los
   re-tirados con la Mística (la Mística ata el objeto a quien pagó el oro). Tampoco lo equipado.
   ============================================================ */
const netTrade = { out:null, inc:null, log:[], html:"", resumeAt:0 };
const TRADE_WHY = {
  rejected:"rechazó el objeto", cancel_giver:"canceló la oferta", cancel_taker:"canceló el intercambio",
  left:"salió de la sala", started:"comenzó la partida", timeout:"se cortó la entrega (tiempo agotado)",
  full:"tiene el inventario lleno", refused:"no pudo recibirlo", gone:"ya no está en la sala",
  giver_lost:"se cortó la conexión", status:"quedó anulado", late:"llegó tarde"
};
const TRADE_ERRORS = {
  TRADE_BOUND:"Ese objeto está ligado a tu cuenta: no se puede dar.", TRADE_BURNED:"Ese objeto ya lo diste antes (copia vieja del guardado): no se puede volver a dar.",
  TRADE_BUSY:"Ya hay un intercambio en curso con ese jugador.", TRADE_BUSY_ITEM:"Ese objeto ya está en otro intercambio.",
  TRADE_SLOW:"Más despacio: esperá un momento antes de ofrecer otro objeto.", TRADE_TOO_BIG:"Ese objeto no se puede enviar.",
  TRADE_BAD_ITEM:"Ese objeto no se puede enviar.", TRADE_NO_TARGET:"Ese jugador ya no está en la sala.",
  TRADE_NOT_LOBBY:"El intercambio se usa en la Sala, entre partidas.", TRADE_GONE:"Ese intercambio ya no existe.", NO_ROOM:"Tenés que estar en una sala online."
};

function _trEsc(s){ return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function _tradeSave(){
  if(!save.trades || typeof save.trades!=="object") save.trades = {};
  const t = save.trades;
  if(!t.esc || typeof t.esc!=="object") t.esc = {};
  if(!t.pend || typeof t.pend!=="object") t.pend = {};
  return t;
}
// Solo lee: no crea save.trades (si lo creara, el siguiente guardado escribiría un campo nuevo aunque no haya
// intercambios, y el entrenamiento —que no debe tocar el guardado real— lo terminaba persistiendo).
function tradePendingCount(){ const t = save.trades; if(!t || typeof t!=="object") return 0; return Object.keys(t.esc||{}).length + Object.keys(t.pend||{}).length; }

/* ---------------- qué se puede dar ---------------- */
// Motivo por el que el objeto queda ligado a la cuenta (o null). Mismas reglas que el relay.
function tradeBoundOf(it){
  if(!it) return "No existe";
  if(it.rarity==="unico" || it.unique) return "Único: ligado a tu cuenta";
  if(it.set) return "Pieza de set (skin): ligada a tu cuenta";
  if(typeof it.rerollIdx==="number" || (it.rerolls|0) > 0) return "Re-tirado con la Mística: ligado a tu cuenta";
  if(it.bound || it.placeholder) return "Ligado a tu cuenta";
  return null;
}
function tradeBoundReason(it){
  const b = tradeBoundOf(it); if(b) return b;
  const by = itemEquippedBy(it.uid);
  if(by) return `Lo lleva puesto ${(CLASSES[by]||{}).name||by}: quitáselo primero`;
  return null;
}
// Copia segura de un objeto que llega de OTRO jugador: sin HTML en los textos, con tipo y rareza
// válidos y valores dentro de lo posible en el juego. null si no sirve.
function tradeCleanItem(raw){
  let it; try{ it = JSON.parse(JSON.stringify(raw)); }catch(e){ return null; }
  if(!it || typeof it!=="object" || Array.isArray(it)) return null;
  const walk = (v, d)=>{
    if(d > 6) return null;
    if(typeof v==="string") return v.replace(/[<>"`]/g, "").slice(0, 300);
    if(typeof v==="number") return Number.isFinite(v) ? v : 0;
    if(Array.isArray(v)) return v.slice(0, 24).map(x=>walk(x, d+1));
    if(v && typeof v==="object"){
      for(const k of Object.keys(v)){ if(k==="__proto__" || k==="constructor" || k==="prototype") delete v[k]; else v[k] = walk(v[k], d+1); }
      return v;
    }
    return v;
  };
  walk(it, 0);
  if(!ITEM_TYPES[it.type] || !RARITIES.includes(it.rarity) || tradeBoundOf(it)) return null;
  if(it.designed && !(typeof DESIGNED_ITEMS!=="undefined" && DESIGNED_ITEMS[it.designId])) return null;
  it.level = Math.max(1, Math.min(ITEM_MAX_LEVEL, it.level|0 || 1));
  const vmax = RARITY_VALUES[it.type].unico;
  if(typeof it.value!=="number" || it.value < 0) it.value = RARITY_VALUES[it.type][it.rarity] || 0;
  it.value = Math.min(it.value, vmax);
  if(!Array.isArray(it.affixes)) it.affixes = []; else it.affixes = it.affixes.filter(a=>a && typeof a.id==="string").slice(0, 8);
  if(!Array.isArray(it.passives)) it.passives = []; else it.passives = it.passives.filter(p=>p && typeof p==="object").slice(0, 8);
  it.icon = ITEM_TYPES[it.type].icon;
  it.statKey = it.statKey || it.type;
  if(typeof it.name!=="string" || !it.name) it.name = ITEM_TYPES[it.type].label;
  delete it.rerollIdx; delete it.rerolls; delete it.bound;
  return it;
}
function tradeableItems(){ return stashItems().filter(it=>!tradeBoundReason(it)); }

/* ---------------- acciones ---------------- */
function _trCanTrade(){
  return netInRoom() && net.room && net.room.state==="lobby" && state==="prep" && !(typeof netMatch!=="undefined" && netMatch);
}
function netTradeOffer(to, uid){
  if(!_trCanTrade()) return {ok:false, reason:TRADE_ERRORS.TRADE_NOT_LOBBY};
  if(netTrade.out || netTrade.inc) return {ok:false, reason:"Terminá primero el intercambio que tenés en curso."};
  const other = net.room.slots[to];
  if(to===net.slot || !other || !other.connected) return {ok:false, reason:TRADE_ERRORS.TRADE_NO_TARGET};
  const it = findStashItem(uid);
  const why = it ? tradeBoundReason(it) : "Ese objeto ya no está en tu inventario.";
  if(why) return {ok:false, reason:why};
  const item = JSON.parse(JSON.stringify(it));
  const o = netTrade.out = {id:null, k:null, to, toName:other.name, uid, item, st:"sending", at:performance.now()};
  netSend({t:"trade", op:"offer", to, item});
  // Un relay viejo no conoce {t:"trade"} y no contesta nada: antes la oferta quedaba para siempre en
  // "Esperando que acepte…" con Cancelar deshabilitado. El relay nuevo contesta "sent" al instante.
  setTimeout(()=>{
    if(netTrade.out!==o || o.st!=="sending") return;
    netTrade.out = null; netTrade.unsupported = true;
    showNetToast("⚠ " + TRADE_NOT_ON_SERVER);
    netRenderTrade();
  }, 8000);
  netRenderTrade();
  return {ok:true};
}
function netTradeCancel(){
  const o = netTrade.out, i = netTrade.inc;
  if(o && o.id && (o.st==="offered" || o.st==="accepted")) netSend({t:"trade", op:"cancel", id:o.id});
  else if(i && i.st==="accepted") netSend({t:"trade", op:"cancel", id:i.id});
}
function netTradeReject(){ const i = netTrade.inc; if(i && i.st==="offered"){ netSend({t:"trade", op:"reject", id:i.id}); } }
// 1ª confirmación: el que recibe acepta.
function netTradeAccept(){
  const i = netTrade.inc; if(!i || i.st!=="offered") return;
  if(stashFull()){ showNetToast(`Tu inventario está lleno (${INVENTORY_CAPACITY}/${INVENTORY_CAPACITY}): vendé o descartá algo para recibirlo.`); return; }
  gameConfirm(`¿Aceptás «${i.item.name}» de ${i.fromName}?\nVa a tu inventario de cuenta cuando ${i.fromName} confirme la entrega.`, {okText:"Aceptar"}).then(ok=>{
    if(!ok || netTrade.inc!==i || i.st!=="offered") return;
    i.st = "accepting"; netSend({t:"trade", op:"accept", id:i.id}); netRenderTrade();
  });
}
// 2ª confirmación: el que da confirma la entrega. Recién acá el objeto sale de su inventario ("en camino").
function netTradeConfirm(){
  const o = netTrade.out; if(!o || o.st!=="accepted") return;
  gameConfirm(`¿Le das «${o.item.name}» a ${o.toName}?\nLo perdés cuando lo reciba. No se puede deshacer.`, {okText:"Dar", danger:true}).then(ok=>{
    if(!ok || netTrade.out!==o || o.st!=="accepted") return;
    if(!_trCanTrade()){ netTradeCancel(); return; }
    const it = findStashItem(o.uid), why = it ? tradeBoundReason(it) : "ya no está en tu inventario";
    if(why){ showNetToast("No se pudo dar el objeto: " + why); netTradeCancel(); return; }
    const T = _tradeSave();
    T.esc[o.id] = {k:o.k, item:JSON.parse(JSON.stringify(it)), to:o.toName, at:Date.now()};
    removeItemFromInventory(null, o.uid, false); // guarda (con el objeto ya "en camino" en save.trades)
    persistNow();
    o.st = "delivering"; o.at = performance.now();
    netSend({t:"trade", op:"confirm", id:o.id, k:o.k});
    if(typeof renderPrepTabs==="function") try{ renderPrepTabs(); }catch(e){}
    netRenderTrade();
  });
}

/* ---------------- guardado: completar o deshacer ---------------- */
function _trRestore(id, why){
  const T = _tradeSave(), e = T.esc[id]; if(!e) return false;
  delete T.esc[id];
  if(e.item && !findStashItem(e.item.uid)) stashItems().push(e.item); // vuelve aunque el inventario esté lleno
  if(typeof invalidatePassiveCache==="function") invalidatePassiveCache();
  persistNow();
  _trLog(`↩ «${e.item ? e.item.name : "objeto"}» volvió a tu inventario${why ? " (" + why + ")" : ""}.`);
  return true;
}
function _trDone(id){
  const T = _tradeSave(), e = T.esc[id]; if(!e) return false;
  delete T.esc[id]; persistNow();
  _trLog(`✔ ${e.to} recibió «${e.item ? e.item.name : "objeto"}».`);
  if(typeof window!=="undefined") try{ window.dispatchEvent(new CustomEvent("horda-stat", {detail:{k:"trade_give", v:1}})); }catch(x){}
  return true;
}
function _trNewUid(id){ return "it_t" + String(id).replace(/[^a-f0-9]/g, "").slice(0, 16); }
function _trApply(id){
  const T = _tradeSave(), p = T.pend[id]; if(!p) return false;
  if(!p.applied){
    const it = p.item; it.uid = _trNewUid(id);
    if(!findStashItem(it.uid)){
      stashItems().push(it);
      if(typeof collectionRegister==="function") try{ collectionRegister(it); }catch(e){}
    }
    p.applied = true;
    persistNow();
    _trLog(`✔ Recibiste «${it.name}» de ${p.from}.`);
    showNetToast(`🎁 Recibiste «${it.name}» de ${p.from}: está en tu inventario.`);
    if(typeof renderPrepTabs==="function") try{ renderPrepTabs(); }catch(e){}
  }
  netSend({t:"trade", op:"applied", id, k:p.k});
  return true;
}
function _trDropPend(id){ const T = _tradeSave(); if(T.pend[id] && !T.pend[id].applied){ delete T.pend[id]; persistNow(); return true; } return false; }
// Al conectarse (o cada tanto mientras quede algo a mitad): preguntar cómo terminó cada intercambio.
function netTradeResume(force){
  if(net.status!=="open") return;
  const T = _tradeSave(), now = performance.now();
  if(!force && now - netTrade.resumeAt < 8000) return;
  netTrade.resumeAt = now;
  for(const id in T.esc){
    const o = netTrade.out;
    if(o && o.id===id && o.st==="delivering" && now - o.at < 25000) continue; // en curso: el relay avisa solo
    netSend({t:"trade", op:"status", id, k:T.esc[id].k});
  }
  for(const id in T.pend){
    const p = T.pend[id];
    netSend({t:"trade", op: p.applied ? "applied" : "got", id, k:p.k});
  }
}

/* ---------------- mensajes del relay ---------------- */
function _trLog(txt){ netTrade.log.push(txt); if(netTrade.log.length > 4) netTrade.log.shift(); }
function _trClearLive(id){
  if(netTrade.out && netTrade.out.id===id) netTrade.out = null;
  if(netTrade.inc && netTrade.inc.id===id) netTrade.inc = null;
}
const TRADE_NOT_ON_SERVER = "El intercambio todavía no está disponible en el servidor (hay que actualizarlo).";
function netTradeOnMsg(m){
  netTrade.unsupported = false; // contestó: el servidor sí sabe intercambiar
  const T = _tradeSave(), id = m.id;
  switch(m.op){
    case "sent": {
      const o = netTrade.out;
      if(o && o.st==="sending"){ o.id = id; o.k = m.k; o.st = "offered"; }
      break;
    }
    case "offer": {
      const item = tradeCleanItem(m.item);
      if(!item || netTrade.inc || !_trCanTrade()){ netSend({t:"trade", op:"reject", id}); break; }
      netTrade.inc = {id, from:m.from, fromName:m.fromName, item, st:"offered"};
      showNetToast(`🤝 ${m.fromName} te ofrece «${item.name}»: miralo en la pestaña Sala online.`);
      break;
    }
    case "accepting": if(netTrade.inc && netTrade.inc.id===id) netTrade.inc.st = "accepted"; break;
    case "accepted": {
      const o = netTrade.out;
      if(o && o.id===id){ o.st = "accepted"; showNetToast(`${o.toName} aceptó «${o.item.name}»: confirmá la entrega.`); }
      break;
    }
    case "deliver": { // al que recibe: guardarlo "por llegar" y avisar (got = el commit lo decide el relay)
      const item = tradeCleanItem(m.item);
      if(!item){ netSend({t:"trade", op:"refuse", id, k:m.k}); break; }
      if(stashFull()){ netSend({t:"trade", op:"refuse", id, k:m.k, why:"full"}); break; }
      if(!T.pend[id]){ T.pend[id] = {k:m.k, item, from:m.fromName || (netTrade.inc||{}).fromName || "otro jugador", at:Date.now()}; persistNow(); }
      if(netTrade.inc && netTrade.inc.id===id) netTrade.inc.st = "receiving";
      netSend({t:"trade", op:"got", id, k:m.k});
      break;
    }
    case "commit": _trApply(id); break;
    case "ok": if(T.pend[id]){ delete T.pend[id]; persistNow(); } _trClearLive(id); break;
    case "done": {
      const o = netTrade.out, name = o && o.id===id ? o.toName : null;
      if(_trDone(id)) showNetToast(`✔ ${name || "El otro jugador"} recibió tu objeto.`);
      _trClearLive(id);
      break;
    }
    case "wait": break; // ya se confirmó: falta que el otro lo aplique (se vuelve a preguntar)
    case "abort": case "unknown": {
      const why = m.op==="unknown" ? "el servidor ya no lo recuerda" : (TRADE_WHY[m.why] || "se anuló");
      const o = netTrade.out, i = netTrade.inc;
      const who = o && o.id===id ? o.toName : (i && i.id===id ? i.fromName : "");
      const restored = _trRestore(id, "intercambio anulado");
      _trDropPend(id);
      if(o && o.id===id){
        const mine = m.why==="cancel_giver";
        showNetToast(mine ? "Cancelaste la oferta." : `Intercambio anulado: ${who} ${why}.` + (restored ? ` «${o.item.name}» sigue en tu inventario.` : ""));
      } else if(i && i.id===id){
        showNetToast(m.why==="cancel_taker" || m.why==="rejected" ? "Listo: no lo recibiste." : `Intercambio anulado: ${who} ${why}.`);
      } else if(restored) showNetToast("Un intercambio que quedó a mitad se anuló: el objeto volvió a tu inventario.");
      _trClearLive(id);
      break;
    }
  }
  netRenderTrade();
}
netOn("trade", netTradeOnMsg);
netOn("tradeError", (m)=>{
  if(/^TRADE_/.test(m.code||"")) netTrade.unsupported = false;
  const txt = TRADE_ERRORS[m.code] || ("No se pudo: " + m.code);
  if(/^ROOMS_/.test(m.code||"")) return;
  const o = netTrade.out;
  if(o && (o.st==="sending" || (m.id && o.id===m.id))) netTrade.out = null;
  if(m.code==="TRADE_GONE" && netTrade.inc && (!m.id || netTrade.inc.id===m.id)) netTrade.inc = null;
  showNetToast("⚠ " + txt);
  netRenderTrade();
});
netOn("open", ()=>{ if(tradePendingCount()) setTimeout(()=> netTradeResume(true), 300); });
// Cada tanto, si quedó algo a mitad y hay conexión: volver a preguntar.
setInterval(()=>{ try{ if(net.status==="open" && tradePendingCount()) netTradeResume(false); }catch(e){} }, 4000);
// Al abrir el juego con un intercambio a mitad (se cerró la pestaña, se cortó Internet…): conectarse
// solo para terminarlo. Sin servidor configurado queda guardado hasta la próxima conexión.
setTimeout(()=>{
  try{ if(typeof save!=="undefined" && save && tradePendingCount() && netAvailable()) netConnect(null, 30000).then(()=> netTradeResume(true)).catch(()=>{}); }catch(e){}
}, 2500);

/* ---------------- interfaz (pestaña Sala online) ---------------- */
function _trItemHTML(it){
  const col = itemColor(it);
  return `<span class="tr-item" style="--ic:${col}">${itemIconHTML(it, "tr-ico")}<span class="tr-item-txt"><span class="tr-item-name" style="color:${col}">${_trEsc(it.name)}</span>
    <span class="tr-item-sub">${itemTierLabel(it)} · ${ITEM_TYPES[it.type].label} · Nv. ${itemLevel(it)}${itemAffixes(it).length ? ` · ${itemAffixes(it).length} afijo${itemAffixes(it).length>1?"s":""}` : ""}</span></span></span>`;
}
function netRenderTrade(){
  const box = document.getElementById("net-trade"); if(!box) return;
  if(!netInRoom()){ netTrade.out = null; netTrade.inc = null; } // lo que quedó "en camino" sigue en save.trades
  const inRoom = netInRoom() && state==="prep";
  // la pestaña Sala online avisa si hay algo que responder (te ofrecen algo / aceptaron lo tuyo)
  const tab = document.querySelector('[data-prep-sec="online"]');
  if(tab) tab.classList.toggle("trade-ask", !!((netTrade.inc && netTrade.inc.st==="offered") || (netTrade.out && netTrade.out.st==="accepted")));
  const T = _tradeSave();
  const esc = Object.keys(T.esc).filter(id=>!(netTrade.out && netTrade.out.id===id));
  const show = inRoom;
  box.classList.toggle("hidden", !show);
  if(!show){ netTrade.html = ""; box.innerHTML = ""; return; }
  const o = netTrade.out, i = netTrade.inc;
  let body = "";
  if(net.room.state!=="lobby"){
    body = `<div class="net-hint">El intercambio se usa en la Sala, entre partidas.</div>`;
  } else if(i){
    const who = `<b style="color:${NET_SLOT_COLORS[i.from]||"#ccc"}">${_trEsc(i.fromName)}</b>`;
    body = `<div class="tr-card in">${_trItemHTML(i.item)}</div>`;
    if(i.st==="offered") body = `<div class="tr-line">${who} te ofrece:</div>${body}
      <div class="net-row"><button class="btn small secondary" id="tr-view">Ver ficha</button>
        <button class="btn small ready-on" id="tr-accept" ${stashFull()?"disabled":""}>✔ ACEPTAR</button>
        <button class="btn small secondary" id="tr-reject">Rechazar</button></div>
      ${stashFull() ? `<div class="net-err">Tu inventario está lleno (${INVENTORY_CAPACITY}/${INVENTORY_CAPACITY}): liberá un lugar para aceptar.</div>` : ""}`;
    else if(i.st==="accepting" || i.st==="accepted") body = `<div class="tr-line">Aceptaste lo de ${who}. Esperando que confirme la entrega…</div>${body}
      <div class="net-row"><button class="btn small secondary" id="tr-view">Ver ficha</button><button class="btn small secondary" id="tr-cancel">Cancelar</button></div>`;
    else body = `<div class="tr-line">Recibiendo de ${who}…</div>${body}`;
  } else if(o){
    const who = `<b style="color:${NET_SLOT_COLORS[o.to]||"#ccc"}">${_trEsc(o.toName)}</b>`;
    const card = `<div class="tr-card out">${_trItemHTML(o.item)}</div>`;
    if(o.st==="sending" || o.st==="offered") body = `<div class="tr-line">Le ofreciste a ${who}. Esperando que acepte…</div>${card}
      <div class="net-row"><button class="btn small secondary" id="tr-cancel" ${o.st==="sending"?"disabled":""}>Cancelar oferta</button></div>`;
    else if(o.st==="accepted") body = `<div class="tr-line">${who} aceptó. ¿Se lo das? Lo perdés cuando lo reciba.</div>${card}
      <div class="net-row"><button class="btn small ready-on" id="tr-confirm">✔ CONFIRMAR ENTREGA</button><button class="btn small secondary" id="tr-cancel">Cancelar</button></div>`;
    else body = `<div class="tr-line">Entregando a ${who}…</div>${card}`;
  } else {
    const others = net.room.slots.map((s,k)=>({s,k})).filter(x=>x.s && x.s.connected && x.k!==net.slot);
    const n = tradeableItems().length;
    body = netTrade.unsupported ? `<div class="net-hint">${TRADE_NOT_ON_SERVER}</div>` : others.length
      ? `<div class="tr-line">Darle un objeto de tu inventario a:</div><div class="net-row tr-targets">${others.map(x=>`<button class="btn small tr-to" data-tr-to="${x.k}" style="border-color:${NET_SLOT_COLORS[x.k]}" ${n?"":"disabled"}>${_trEsc(x.s.name)}</button>`).join("")}</div>
        <div class="net-hint">${n ? `${n} objeto${n===1?"":"s"} para dar.` : "No tenés objetos para dar (lo equipado y lo ligado a tu cuenta no se puede)."} Sin oro ni plata: es un regalo. Los dos confirman.</div>`
      : `<div class="net-hint">Cuando haya otro jugador en la sala le vas a poder dar un objeto de tu inventario.</div>`;
  }
  const pending = esc.map(id=>`<div class="tr-pending">⏳ «${_trEsc((T.esc[id].item||{}).name||"objeto")}» en camino a ${_trEsc(T.esc[id].to)}: se completa cuando el servidor confirme (si se anula, vuelve a tu inventario).</div>`).join("")
    + Object.keys(T.pend).filter(id=>!(i && i.id===id)).map(id=>`<div class="tr-pending">⏳ «${_trEsc((T.pend[id].item||{}).name||"objeto")}» de ${_trEsc(T.pend[id].from)}: esperando la confirmación del servidor.</div>`).join("");
  const log = netTrade.log.map(l=>`<div class="tr-log">${_trEsc(l)}</div>`).join("");
  const html = `<div class="tr-head">🤝 INTERCAMBIO <span class="tr-sub">regalo entre jugadores de la sala</span></div>${body}${pending}${log}`;
  if(html===netTrade.html && box.innerHTML) return;
  netTrade.html = html; box.innerHTML = html;
  const on = (id, fn)=>{ const b = document.getElementById(id); if(b) b.addEventListener("click", fn); };
  on("tr-accept", netTradeAccept); on("tr-reject", netTradeReject); on("tr-cancel", netTradeCancel); on("tr-confirm", netTradeConfirm);
  on("tr-view", ()=>{ if(netTrade.inc) netTradeShowItem(netTrade.inc.item); });
  box.querySelectorAll("[data-tr-to]").forEach(b=> b.addEventListener("click", ()=> netTradeOpenPicker(+b.getAttribute("data-tr-to"))));
}
// Ficha completa de un objeto que no es tuyo (el que te ofrecen): la misma vista previa, sin acciones.
function netTradeShowItem(it, extraBtn){
  let el = document.getElementById("item-preview");
  if(!el){ el = document.createElement("div"); el.id = "item-preview"; document.body.appendChild(el); }
  el.innerHTML = `<div class="ip-backdrop" data-ip-close></div><div class="ip-panel">${itemDetailHTML(it, null, {shop:true})}
    <div class="ip-actions">${extraBtn||""}<button data-ip-close>Cerrar</button></div></div>`;
  el.classList.remove("hidden");
  const close = ()=>{ el.classList.add("hidden"); el.innerHTML = ""; };
  el.querySelectorAll("[data-ip-close]").forEach(b=>b.addEventListener("click", close));
  return {el, close};
}
// Elegir qué dar: lo que se puede, y abajo lo que no (con el motivo).
function netTradeOpenPicker(to){
  const other = net.room && net.room.slots[to]; if(!other) return;
  let el = document.getElementById("item-preview");
  if(!el){ el = document.createElement("div"); el.id = "item-preview"; document.body.appendChild(el); }
  const ok = tradeableItems().slice().sort((a,b)=> rarityIndex(b.rarity)-rarityIndex(a.rarity));
  const bound = stashItems().filter(it=>tradeBoundReason(it));
  el.innerHTML = `<div class="ip-backdrop" data-ip-close></div><div class="ip-panel tr-picker">
    <div class="ip-h">¿QUÉ LE DAS A ${_trEsc(other.name).toUpperCase()}?</div>
    <div class="tr-grid">${ok.map(it=>`<button class="tr-pick" data-tr-pick="${_trEsc(it.uid)}">${_trItemHTML(it)}</button>`).join("") || `<div class="net-hint">No tenés objetos para dar.</div>`}</div>
    ${bound.length ? `<div class="ip-h tr-bound-h">NO SE PUEDEN DAR (${bound.length})</div><div class="tr-grid">${bound.map(it=>`<div class="tr-pick off">${_trItemHTML(it)}<span class="tr-why">${_trEsc(tradeBoundReason(it))}</span></div>`).join("")}</div>` : ""}
    <div class="ip-actions"><button data-ip-close>Cerrar</button></div></div>`;
  el.classList.remove("hidden");
  const close = ()=>{ el.classList.add("hidden"); el.innerHTML = ""; };
  el.querySelectorAll("[data-ip-close]").forEach(b=>b.addEventListener("click", close));
  el.querySelectorAll("[data-tr-pick]").forEach(b=> b.addEventListener("click", ()=>{
    const it = findStashItem(b.getAttribute("data-tr-pick")); if(!it) return;
    const v = netTradeShowItem(it, `<button class="primary" id="tr-offer-go">🤝 Ofrecer a ${_trEsc(other.name)}</button><button id="tr-offer-back">‹ Volver</button>`);
    v.el.querySelector("#tr-offer-back").addEventListener("click", ()=> netTradeOpenPicker(to));
    v.el.querySelector("#tr-offer-go").addEventListener("click", ()=>{
      v.close();
      const r = netTradeOffer(to, it.uid);
      if(!r.ok) showNetToast("⚠ " + r.reason);
    });
  }));
}
