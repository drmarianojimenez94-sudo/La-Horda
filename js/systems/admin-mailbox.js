"use strict";
/* ============================================================
   js/systems/admin-mailbox.js
   Buzón de concesiones administrativas. El servidor nunca fabrica objetos: deja claves de catálogo
   validadas en save.adminMailbox (server/admin-users.js → /api/gm/user/mailbox) y el cliente las
   materializa con las mismas funciones de la Tienda, sin cobrar oro. Cada entrada se entrega una vez.
   ============================================================ */
function adminMailboxDeliver(){
  if(typeof save === "undefined" || !save || !Array.isArray(save.adminMailbox) || !save.adminMailbox.length) return 0;
  if(typeof state !== "undefined" && (state === "playing" || state === "paused")) return 0;
  if(typeof testLabActive === "function" && testLabActive()) return 0;
  const keep = [], got = [];
  for(const entry of save.adminMailbox){
    try{
      if(!entry || typeof entry.ref !== "string"){ continue; }
      const items = [];
      if(entry.kind === "item"){
        const e = shopCatalog().find(x=>x.key === entry.ref); if(!e) continue;
        items.push(e.kind === "designed" ? makeDesignedItem(e.id) : makeItem(e.type, "legendario", null, {noun:e.noun}));
      }else if(entry.kind === "set"){
        if(typeof setPieceIds !== "function") { keep.push(entry); continue; }
        for(const id of setPieceIds(entry.ref)) items.push(makeDesignedItem(id));
      }else continue;
      if(stashItems().length + items.length > INVENTORY_CAPACITY){ keep.push(entry); continue; }
      for(const it of items){ it.gift = entry.origin || "ADMIN_GRANT"; addItemToInventory(null, it); }
      got.push(items.map(i=>i.name).join(", "));
    }catch(e){ keep.push(entry); }
  }
  save.adminMailbox = keep;
  if(got.length){ persist(); if(typeof showNetToast === "function") showNetToast("🎁 Regalo de la administración: " + got.join(" · ") + (keep.length ? " (el resto espera lugar en el inventario)" : "")); }
  return got.length;
}
if(typeof window !== "undefined"){
  window.addEventListener("account-change", ()=>setTimeout(adminMailboxDeliver, 500));
  setInterval(adminMailboxDeliver, 20000);
  setTimeout(adminMailboxDeliver, 1500);
}
