"use strict";
/* ============================================================
   js/systems/cromas.js
   CROMAS: variantes de color de un guardián, derivadas por RECOLOREO de paleta de su atlas
   (tools/art/cromas/build.py -> js/assets/croma-skins-meta.js). No son skins de set: se compran
   sueltas con ORO DEL JUEGO en la Tienda y se equipan por guardián. Cosmético puro: no dan poder
   (nunca plata real, sin pay-to-win). Paletas ligadas a los cristales de los Guardianes:
   Ancestral (verde), Escarcha (celeste), Piedra (ámbar), Juicio (oro blanco).

   Reglas:
   - Guardado: save.cromas = {id:true} (compradas, de la cuenta) y save.champions[k].croma = id|null
     (la equipada en ese guardián).
   - La skin de set COMPLETO manda: si el set con arte está completo se ve la skin; si no, la croma.
   - Se dibuja por el mismo camino que las skins de set (activeSetSkin / setSkinPackKey en
     set-effects.js): guardianes con atlas propio (CHAMP_PACK) -> atlas clonado con otra imagen;
     guardianes de atlas viejo (Tanque) -> la imagen recoloreada reemplaza a la base (cromaImage).
   - Red: el invitado manda su croma en el loadout (netBuildLoadout.croma); el anfitrión la pone en
     el registro del guardián y viaja en el héroe como `skinSet`, igual que una skin de set.
   - Carga perezosa: el PNG de una croma baja recién cuando alguien la usa o se previsualiza.
   >>> Precio: CROMA_SKINS[id].price (lo fija el generador).
   ============================================================ */
const CROMA_SKINS = {};
const CROMA_CRYSTALS = {
  ancestral:{label:"Cristal Ancestral", short:"Ancestral", color:"#6fd08c"},
  escarcha: {label:"Cristal de Escarcha", short:"Escarcha", color:"#9fdcff"},
  piedra:   {label:"Cristal de Piedra", short:"Piedra", color:"#e3a64c"},
  juicio:   {label:"Cristal del Juicio", short:"Juicio", color:"#f3ead0"}
};

// Definición de una skin por id (de set o croma). La de croma se "arma" la primera vez que se pide.
function skinDefOf(id){
  if(!id) return null;
  if(typeof SET_SKINS!=="undefined" && SET_SKINS[id]) return SET_SKINS[id];
  const d = CROMA_SKINS[id];
  return d ? cromaEnsureLoaded(id) : null;
}
function isCromaId(id){ return !!(id && CROMA_SKINS[id]); }
// Arma la croma: por cada archivo, si hay un atlas base con esa clave (CHAMP_PACK) se clona su meta
// con la imagen recoloreada; si no, es una imagen suelta de un guardián de atlas viejo.
function cromaEnsureLoaded(id){
  const d = CROMA_SKINS[id]; if(!d) return null;
  if(d._built) return d;
  d._built = true; d.croma = true; d.id = id; d.packs = {}; d.imgs = {};
  for(const k in (d.files||{})){
    const src = d.files[k];
    if(typeof CHAMP_PACK!=="undefined" && CHAMP_PACK[k] && typeof champPackCloneAtlas==="function"){
      const key = "croma_" + id + (k === d.champ ? "" : "_" + k);
      if(!CHAMP_PACK[key]) champPackCloneAtlas(key, k, src);
      d.packs[k] = key;
    } else {
      const im = new Image(); im.src = src; d.imgs[k] = im;
    }
  }
  return d;
}
function cromaLoadAll(){ for(const id in CROMA_SKINS) cromaEnsureLoaded(id); }
// Imagen recoloreada `key` de la croma activa del héroe (atlas viejos), o null (usar la base).
function cromaImage(h, key){
  if(typeof activeSetSkin!=="function") return null;
  const d = activeSetSkin(h); if(!d || !d.croma || !d.imgs) return null;
  const im = d.imgs[key];
  return im && im.complete && im.naturalWidth ? im : null;
}

/* ---------------- guardado ---------------- */
function cromaIdsFor(k){ return Object.keys(CROMA_SKINS).filter(id=>CROMA_SKINS[id].champ===k); }
function cromaOwned(id){ return !!(save.cromas && save.cromas[id]); }
function cromaPrice(id){ const d = CROMA_SKINS[id]; return d ? (d.price|0) : 0; }
// Croma equipada en el guardián `k` (del guardado activo: el propio, o el loadout de un invitado
// mientras el anfitrión simula la partida). Solo ids válidos y del guardián correcto.
function cromaEquippedId(k){
  const c = save && save.champions && save.champions[k]; if(!c || !c.croma) return null;
  const d = CROMA_SKINS[c.croma];
  return d && d.champ === k ? c.croma : null;
}
function cromaIsEquipped(id){ const d = CROMA_SKINS[id]; return !!(d && cromaEquippedId(d.champ) === id); }
function cromaBuy(id){
  const d = CROMA_SKINS[id];
  if(!d) return {ok:false, reason:"Esa croma no existe"};
  if(typeof state!=="undefined" && state==="playing") return {ok:false, reason:"La tienda se usa fuera de la partida"};
  if(cromaOwned(id)) return {ok:false, reason:"Ya es tuya"};
  const price = cromaPrice(id);
  if((save.gold||0) < price) return {ok:false, reason:`No te alcanza el oro (tenés ${save.gold||0}, cuesta ${price})`};
  save.gold -= price;
  save.cromas = Object.assign({}, save.cromas, {[id]:true});
  persist();
  return {ok:true};
}
// Equipa (o saca, con id=null) la croma del guardián `k`. Solo cromas compradas y de ese guardián.
function cromaEquip(k, id){
  const c = save.champions[k]; if(!c) return false;
  if(id){ const d = CROMA_SKINS[id]; if(!d || d.champ !== k || !cromaOwned(id)) return false; cromaEnsureLoaded(id); }
  c.croma = id || null;
  if(typeof invalidatePassiveCache==="function") invalidatePassiveCache();
  persist();
  cromaAfterEquip(k);
  return true;
}
// En la Sala online: que los demás la vean ya (el loadout lleva la skin/croma).
function cromaAfterEquip(k){
  if(typeof netInRoom==="function" && netInRoom() && typeof net!=="undefined"){
    if(net.role==="guest" && k===selectedClass && typeof netSendLoadout==="function") netSendLoadout(true);
    else if(net.role==="host" && typeof netHostBroadcastCos==="function") netHostBroadcastCos(false);
  }
}
// Una skin de set completo tapa a la croma: se avisa en la tarjeta.
function cromaHiddenBySet(k){
  if(typeof activeSetSkinId!=="function") return false;
  const id = activeSetSkinId({classKey:k});
  return !!(id && !isCromaId(id));
}
