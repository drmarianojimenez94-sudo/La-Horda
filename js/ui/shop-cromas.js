"use strict";
/* ============================================================
   js/ui/shop-cromas.js
   CROMAS en la Tienda (pestaña Skins): productos cosméticos que se compran sueltos con ORO DEL
   JUEGO (js/systems/cromas.js). Bloque autocontenido: renderShopSkins lo monta con una sola línea
   (shopCromaMount), así la vitrina de la Tienda se puede rediseñar sin tocar esta lógica; los
   datos para otra vitrina salen de shopCromaProducts().
   ============================================================ */
// Productos listos para cualquier vitrina: {id, champ, champName, name, lore, crystal, crystalLabel,
// color, price, preview, owned, equipped, champOwned, hiddenBySet}
function shopCromaProducts(){
  if(typeof CROMA_SKINS==="undefined") return [];
  return Object.keys(CROMA_SKINS).filter(id=>CLASSES[CROMA_SKINS[id].champ]).map(id=>{
    const d = CROMA_SKINS[id], C = CROMA_CRYSTALS[d.crystal] || {label:d.crystal, color:"#ccc"}, ch = save.champions[d.champ];
    return {id, champ:d.champ, champName:CLASSES[d.champ].name, name:d.name, lore:d.lore, crystal:d.crystal,
      kind:cosmeticAppearanceLabel(id), crystalLabel:C.label, color:C.color, price:cromaPrice(id), preview:d.preview, owned:cromaOwned(id),
      equipped:cromaIsEquipped(id), champOwned:!!(ch && ch.unlocked), hiddenBySet:cromaHiddenBySet(d.champ)};
  });
}
function _cromaEsc(s){ return String(s==null ? "" : s).replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }
function shopCromaCardHTML(p){
  let action;
  if(!p.owned) action = `<button class="shop-btn" data-croma-buy="${p.id}" ${save.gold < p.price ? "disabled" : ""}>Comprar · 🪙 ${fmtGold(p.price)}</button>${typeof _shopVoucherBtn==="function" ? _shopVoucherBtn(p.id) : ""}`;
  else if(!p.champOwned) action = `<div class="shop-item-sub">Comprada: conseguí a <b>${_cromaEsc(p.champName)}</b> en la pestaña Guardianes para usarla.</div>`;
  else if(p.equipped) action = `<button class="shop-btn sec" data-croma-off="${p.id}">Quitar</button>`;
  else action = `<button class="shop-btn" data-croma-on="${p.id}">EQUIPAR</button>`;
  const st = p.equipped ? `✔ EQUIPADA en ${_cromaEsc(p.champName)}${p.hiddenBySet ? " · la tapa la skin de set completo mientras lo lleves" : ""}` : (p.owned ? "🔓 Comprada" : "No comprada");
  return `<div class="shop-skin shop-croma ${p.equipped ? "active" : ""}" data-croma-card="${p.id}">
    <img class="shop-skin-img" src="${p.preview}" alt="">
    <canvas class="champ-anim shop-skin-anim" width="84" height="84" data-class-key="${p.champ}" data-skin="${p.id}" data-idle="1"></canvas>
    <div class="shop-skin-info">
      <div class="shop-skin-name">${_cromaEsc(p.name)}</div>
      <div class="shop-item-sub"><span style="color:${p.color}">◆ ${_cromaEsc(p.crystalLabel)}</span> · ${_cromaEsc(p.kind)} de ${_cromaEsc(p.champName)} · cosmético, no da poder</div>
      <div class="shop-item-sub" style="font-style:italic">${_cromaEsc(p.lore)}</div>
      <div class="shop-st ${p.equipped ? "own" : ""}">${st}</div>
      <div class="shop-skin-equip">${action}</div>
    </div></div>`;
}
function shopCromaSectionHTML(){
  const list = shopCromaProducts(); if(!list.length) return "";
  return `<div class="lobby-note" style="margin-top:10px">🎨 APARIENCIAS · trajes y equipamiento con diseño propio. Se compran sueltas con oro y se equipan por guardián.</div>
    <div class="shop-skin-list shop-croma-list">${list.map(shopCromaCardHTML).join("")}</div>`;
}
// Monta el bloque al final del panel de Skins y conecta sus botones.
function shopCromaMount(panel){
  if(!panel) return;
  const html = shopCromaSectionHTML(); if(!html) return;
  const box = document.createElement("div"); box.className = "shop-croma-box"; box.innerHTML = html;
  panel.appendChild(box);
  box.querySelectorAll("[data-croma-buy]").forEach(b=> b.addEventListener("click", ()=>{
    const id = b.getAttribute("data-croma-buy"), d = CROMA_SKINS[id];
    const quotedPrice=cromaPrice(id);
    gameConfirm(`¿Comprar la ${cosmeticAppearanceLabel(id).toLowerCase()} ${d.name} por ${fmtGold(quotedPrice)} de oro?`, {okText:"Comprar"}).then(ok=>{
      if(!ok) return;
      const r = cromaBuy(id, quotedPrice); if(!r.ok){ gameAlert(r.reason); return; }
      const ch = save.champions[d.champ];
      if(ch && ch.unlocked) cromaEquip(d.champ, id); // recién comprada: se pone en su guardián
      if(typeof playSfx==="function") playSfx("levelup");
      if(typeof showNetToast==="function") showNetToast(`🎨 ${cosmeticAppearanceLabel(id).toUpperCase()} ${d.name}${ch && ch.unlocked ? " · equipada" : " · comprada"} (−${fmtGold(quotedPrice)} de oro)`);
      _cromaRefresh();
    });
  }));
  box.querySelectorAll("[data-croma-on]").forEach(b=> b.addEventListener("click", ()=>{
    const id = b.getAttribute("data-croma-on"), d = CROMA_SKINS[id];
    if(!cromaEquip(d.champ, id)){ gameAlert("No se pudo equipar esa croma."); return; }
    if(typeof playSfx==="function") playSfx("levelup");
    if(typeof showNetToast==="function") showNetToast(`🎨 ${cosmeticAppearanceLabel(id).toUpperCase()} EQUIPADA · ${d.name}`);
    _cromaRefresh();
  }));
  box.querySelectorAll("[data-croma-off]").forEach(b=> b.addEventListener("click", ()=>{
    const d = CROMA_SKINS[b.getAttribute("data-croma-off")];
    cromaEquip(d.champ, null);
    if(typeof showNetToast==="function") showNetToast(`${CLASSES[d.champ].name} vuelve a su apariencia original`);
    _cromaRefresh();
  }));
}
function _cromaRefresh(){
  if(typeof state!=="undefined" && state==="shop" && typeof renderShop==="function") renderShop();
  if(typeof renderSaveLine==="function") renderSaveLine();
}
