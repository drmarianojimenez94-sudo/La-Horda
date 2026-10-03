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
  if(c.cosmeticSkin !== undefined) c.cosmeticSkin = "";
  if(typeof invalidatePassiveCache==="function") invalidatePassiveCache();
  persist();
  cromaAfterEquip(k);
  if(typeof AlphaServices!=="undefined") AlphaServices.emit("croma", {champion:k, cosmetic:id || "original"});
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

// Presentation-only catalog. It never loads atlases or mutates equipment/stats.
// Commercial fields remain inactive throughout Alpha.
const COSMETIC_SET_STORIES = {
  merienda_magica:"Myla reunió las cucharas perdidas de su primera aventura y organizó una merienda para los guardianes. La colección guarda el recuerdo de esa mesa compartida.",
  santa_paciencia:"Ynara conservó las insignias de cada refugio que sostuvo abierto durante el asedio. Unidas, recuerdan las noches en que cocinar también fue una forma de resistir.",
  manada:"En un bosque que aprendió a arder sin morir, Sylva recogió una pluma de fuego. Ahora sus flechas señalan el camino de regreso entre las cenizas.",
  errante:"Musashi dejó su antigua armadura bajo un cerezo sin flores. Esta vestimenta pertenece al viaje que comenzó después de su último duelo.",
  legion:"Al otro lado del muro, Eren encontró una posibilidad distinta de su transformación. La piel de la bestia conserva las marcas de aquella primera noche.",
  sistema:"Axiom recompiló su propio cuerpo para cruzar una fractura imposible. Las líneas de esta apariencia son las costuras que le permiten regresar.",
  profecia:"La Profeta vistió los colores de un futuro que consiguió impedir. Cada hilo recuerda una vida que ya no tendrá que perderse.",
  convergencia:"En la noche en que las dos torres ardieron, el mago unió sus insignias. Esta vestidura celebra la tregua entre la llama y el invierno.",
  marea:"El Segador regresó de una costa donde los muertos no tenían nombre. La sal oscura de su armadura recuerda a quienes decidió dejar descansar.",
  nocturno:"El asesino abandonó sus viejas insignias al entrar en la ciudad sitiada. Su nueva máscara pertenece a quienes nunca pudieron huir.",
  custodio:"La sanadora recogió los estandartes del santuario y los convirtió en un manto. Bajo sus costuras todavía se reconocen las promesas de sus antiguos guardianes.",
  baluarte:"El Último Juramento fue forjado con las placas recuperadas de la puerta norte. El tanque lleva sus abolladuras para recordar a quienes permanecieron a su lado.",
  requiem:"El Rey Sin Tumba rechazó la corona de los sepulcros y levantó su propia corte. Sus vestiduras guardan el polvo de un reino que solo existe al anochecer.",
  granadero:"El Granadero del Alba atravesó la cordillera antes del primer sol. El blanco de su uniforme conserva la memoria de aquella nieve y de quienes abrieron el paso.",
  ultimo_turno:"Brasa encendió la última caldera cuando todos habían abandonado la fábrica. El uniforme de maquinista conserva las chispas de ese turno que se negó a terminar.",
  juramento_roto:"El Eslabón abrió las puertas que había jurado custodiar. Lleva las llaves sobre la armadura para que nadie vuelva a cerrar esas celdas.",
  vidrio_negro:"Morwen destiló el silencio de una ciudad vacía y lo selló en vidrio negro. Sus nuevas ropas protegen los frascos que jamás deben romperse.",
  lumbre_persistente:"El Farolero acompañó la última expedición más allá de las señales conocidas. Su abrigo lleva remiendos de cada viajero que consiguió traer de vuelta.",
  hilo_umbral:"Iria tejió tres caminos sobre una misma capa para no olvidar las rutas que había cerrado. Sus puntadas brillan cuando un sendero vuelve a abrirse."
};
function cosmeticIsSetCroma(d){
  if(!d || !d.packs || typeof CHAMP_PACK==="undefined") return false;
  const pairs = Object.entries(d.packs);
  return pairs.length > 0 && pairs.every(([base,skin])=>CHAMP_PACK[skin] && CHAMP_PACK[skin].cromaOf === base);
}
function cosmeticArtPending(d){
  if(!d || !d.packs || typeof CHAMP_PACK==="undefined") return false;
  if(cosmeticIsSetCroma(d)) return true;
  const pairs = Object.entries(d.packs);
  return pairs.length > 0 && pairs.every(([base,skin])=>{
    const a = CHAMP_PACK[base], b = CHAMP_PACK[skin];
    return a && b && a.atlas && b.atlas && a.atlas.src && a.atlas.src === b.atlas.src;
  });
}
function cosmeticMetadata(id){
  const croma = Object.prototype.hasOwnProperty.call(CROMA_SKINS,id) && CROMA_SKINS[id], skin = typeof SET_SKINS!=="undefined" && Object.prototype.hasOwnProperty.call(SET_SKINS,id) && SET_SKINS[id];
  const d = croma || skin; if(!d) return null;
  const set = !croma && typeof SET_DB!=="undefined" ? SET_DB[id] : null;
  const champion = d.champ || (set && set.champion) || null;
  const sources = !croma && typeof SET_ARENA_WEIGHTS!=="undefined"
    ? Object.keys(SET_ARENA_WEIGHTS).filter(a=>(SET_ARENA_WEIGHTS[a][id]||0)>0) : [];
  const fx = !croma && typeof SKIN_FX_SRC!=="undefined" && Object.keys(SKIN_FX_SRC).some(k=>k.startsWith("sk_"+id+"_"));
  return {
    id, champion, name:d.name || id, type:croma ? "CROMA" : cosmeticIsSetCroma(d) ? "CROMA DE SET" : "SKIN DE SET",
    rarity:d.rarity || (croma ? "Común" : "Set"), tagline:d.tagline || (croma ? "Otra paleta, el mismo guardián" : "La memoria de una colección"),
    lore:d.lore || COSMETIC_SET_STORIES[id] || "Historia de esta apariencia pendiente de completar.",
    artPending:!croma && cosmeticArtPending(d),
    lorePending:!d.lore && !COSMETIC_SET_STORIES[id], visualTheme:d.visualTheme || (croma ? d.crystal : set && set.theme) || d.name,
    unlockSource:croma ? "Galería · oro obtenido jugando" : "Reunir " + (set ? set.name : id),
    sourceArenas:sources, collection:d.collection || (croma ? "Cristales de los Guardianes" : set ? set.name : id),
    vfxProfile:fx ? "Variantes visuales del set" : "Original", sfxProfile:d.sfxProfile || "Original",
    preview:d.preview || d.src || null, premiumPrice:null, currency:null, availability:"alpha-preview",
    featured:false, creator:d.creator || null, limited:false,
    owned:croma ? cromaOwned(id) : (typeof skinOwnedFull==="function" ? skinOwnedFull(id) : typeof shopSetMissing==="function" && !shopSetMissing(id).length)
  };
}
function cosmeticCatalog(){
  return [...new Set([...Object.keys(typeof SET_SKINS!=="undefined" ? SET_SKINS : {}), ...Object.keys(CROMA_SKINS)])].map(cosmeticMetadata);
}
