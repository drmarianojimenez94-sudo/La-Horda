"use strict";
/* ============================================================
   js/data/body-swaps.js
   CUERPOS PRESTADOS (tabla de reemplazo, fácil de revertir).
   Algunos personajes todavía no tienen arte para animarse (1 cuadro por estado, ataque = pose quieta,
   sin golpe ni muerte) o tienen arte de otra resolución que en pantalla se ve en bloques. Para que en el
   playtest nadie vea un personaje "tieso", acá se les presta el CUERPO de otro personaje que sí está
   completo y cumple el mismo papel (tamaño, velocidad, cuerpo a cuerpo o a distancia), recoloreado una
   vez al cargar con la paleta de su arena para que no parezca copiado de otra.
   Solo cambia lo que se DIBUJA: vida, daño, IA, mecánicas, hitbox, red y guardado siguen siendo los del
   personaje original (e.type no cambia nunca; el anfitrión y los invitados resuelven lo mismo por tipo).

   Cómo funciona: cada entrada arma un atlas derivado "bs_<clave>" en ENEMY_ATLAS_PACK (celdas del
   donante, otra paleta). drawEnemyAtlasPack lo usa en lugar del atlas propio y drawEnemyBody salta los
   dibujos viejos de ese tipo (sprites sueltos, tiras, muertes aparte). Los ganchos de arena (salir del
   suelo, tejados, espejismos, emerger del vacío...) siguen funcionando: reciben al enemigo original y
   dibujan con drawEnemyAtlasPack. La clave puede ser un tipo de ENEMY_BASE o una paleta alternativa
   (e.atlasKey: los actos del Presentador).

   REVERTIR cuando llegue el arte nuevo: borrar la entrada (o este archivo y su <script> en index.html).
   Para comparar en vivo: index.html?bodyswap=0 apaga todos los préstamos.
   Qué pedirle al artista por cada uno: docs/ART_COMMISSION_BRIEF.md.

   Campos de cada entrada:
     body     donante. Sirve un atlas por sets (ENEMY_ATLAS_PACK), una tira del Laberinto
              (REAL_ANIM_ATLASES), la grilla 4x6 del atlas infernal (ENEMY_ANIM_ATLASES) o recortes
              sueltos de PACK_ANIM (se arma una grilla al cargar)
     tint     recoloreo HSL: hue (grados a sumar) o hueTo (tono fijo; satTo = saturación mínima),
              ranges [[desde, hasta, grados a sumar]] (solo esos tonos), sat/lum (multiplicadores),
              minSat (hue/hueTo solo en píxeles con esa saturación o más: grises y blancos quedan)
     hMul     alto dibujado / radio (si no, el del donante)
     sets     alias de animaciones con nombre que pide la IA del original: {nombreOriginal:"nombreDonante"}
     death    estilo de muerte de la animación genérica ("frames" = la del atlas, sin caer de costado)
     name     nombre nuevo (si el cuerpo prestado ya no corresponde al nombre de antes)
     codex    campos del Códice que se reemplazan (lore, family, behavior...)
     brief    id de la ficha en docs/ART_COMMISSION_BRIEF.md
   ============================================================ */
const BODY_SWAPS = {
  /* ---- 01 · Ciudad Maldita: el Presentador (3 actos), la Dama del Telón (y sus espejismos), el Maestro de
     Ceremonias y el Tramoyista ya tienen arte propio a la densidad del juego (tools/art/pixrig): sin préstamo. ---- */

  /* ---- 06 · Arena Acuática: comunes y élite (1–2 cuadros quietos + 1 de ataque, sin golpe ni muerte) ---- */
  tiburon_joven: {body:"esqueleto_h", brief:"P0-05", hMul:2.5,
    tint:{hueTo:168, satTo:0.28, minSat:0.08, lum:0.92}, death:"frames",
    name:"Ahogado de las Ruinas",
    codex:{family:"Muerto del agua",
      lore:"Soldados que se hundieron con las ruinas. El agua inestable no los deja descansar: se arrastran por el fondo, rápidos y en jauría, con percebes donde antes tenían armadura.",
      origin:"Los escombros sumergidos de la Arena Acuática.",
      horde:"Presas del Leviatán convertidas en cazadores.",
      behavior:"Rápido, ataca de frente y en grupo.", attacks:["Zarpazo"]}},
  tiburon_blanco: {body:"demonio_hielo_fuego", brief:"P0-06", hMul:2.6,
    tint:{hueTo:176, satTo:0.4, minSat:0.1, lum:0.85}, death:"frames",
    name:"Tritón de las Fosas",
    codex:{family:"Criatura abisal",
      lore:"El más grande de los cazadores de las fosas: medio hombre, medio bestia, con un tridente de coral negro. Dicen que el Leviatán lo dejó vivir para que cace por él.",
      origin:"Las fosas más profundas.",
      horde:"El cazador favorito del Leviatán.",
      behavior:"Élite: embiste en línea recta y ensarta con el tridente.", attacks:["Embestida","Estocada de tridente"]}},
  cangrejo_acorazado: {body:"arana", brief:"P0-07", hMul:2.35,
    tint:{hue:-14, sat:1.3, lum:1.02}, death:"frames",
    name:"Cangrejo Araña",
    codex:{lore:"Cangrejos de patas larguísimas que crecieron dentro de las armaduras de los soldados ahogados: el caparazón es de hierro oxidado y los ojos, brasas bajo el agua.",
      behavior:"Lento y duro; se clava en el lugar y pincha."}},
  medusa_electrica: {body:"acechador", brief:"P0-08", hMul:2.8,
    tint:{hue:-38, sat:1.15, lum:1.08}, death:"frames"},
  sirena_abisal: {body:"medusa", brief:"P0-09", hMul:2.6,
    tint:{hueTo:192, satTo:0.38, minSat:0.08, lum:0.95}},

  /* ---- 08 · Abismo: élite (1 cuadro de caminar, arte a 4–5x). El Carcelero ya tiene arte propio (tools/art/pixrig). ---- */
  ab_jinete: {body:"jinete_sin_cabeza", brief:"P0-10", hMul:3.0,
    tint:{hue:52, sat:1.1, lum:1.0},
    sets:{prep:"front", charge:"walk", impact:"atk", turn:"hit"}, death:"frames"},
  /* ---- 07 · Laberinto: élite sin ataque, golpe ni muerte propios ---- */
  esfinge: {body:"cu_sith", brief:"P1-01", hMul:2.5,
    tint:{hueTo:42, satTo:0.5, minSat:0.08, lum:1.05}, death:"frames",
    codex:{lore:"La Esfinge del Laberinto: cuerpo de león de arena y melena que arde como las antorchas del Guardián. Custodiaba los caminos; ahora los cierra."}},
};

// ?bodyswap=0 en la URL apaga todos los préstamos (para comparar con el arte original)
const BODY_SWAP_ON = (()=>{ try{ return !/[?&]bodyswap=0\b/.test(location.search); }catch(err){ return true; } })();

/* ---------------- recoloreo (una vez por atlas, al cargar) ---------------- */
function _bsRecolor(img, T){
  const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d", {willReadFrequently:true}); g.drawImage(img, 0, 0);
  if(!T) return c;
  const d = g.getImageData(0, 0, w, h), p = d.data;
  const sat = T.sat === undefined ? 1 : T.sat, lum = T.lum === undefined ? 1 : T.lum, minSat = T.minSat || 0;
  for(let i=0;i<p.length;i+=4){
    if(p[i+3] < 8) continue;
    const r = p[i]/255, gg = p[i+1]/255, b = p[i+2]/255;
    const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), l = (mx + mn)/2;
    let hh = 0, s = 0;
    if(mx !== mn){
      const dd = mx - mn; s = l > 0.5 ? dd/(2 - mx - mn) : dd/(mx + mn);
      hh = mx === r ? (gg - b)/dd + (gg < b ? 6 : 0) : (mx === gg ? (b - r)/dd + 2 : (r - gg)/dd + 4); hh *= 60;
    }
    if(s >= minSat){
      if(T.hueTo !== undefined){ hh = T.hueTo; if(T.satTo !== undefined) s = Math.max(s, T.satTo); }
      else if(T.hue) hh = (hh + T.hue + 360) % 360;
      if(T.ranges) for(const R of T.ranges) if(hh >= R[0] && hh < R[1]){ hh = (hh + R[2] + 360) % 360; break; }
    }
    s = Math.max(0, Math.min(1, s*sat));
    const L = Math.max(0, Math.min(1, l*lum));
    const q = L < 0.5 ? L*(1 + s) : L + s - L*s, pp = 2*L - q, hk = hh/360;
    const f = (t)=>{ t = ((t % 1) + 1) % 1; return t < 1/6 ? pp + (q - pp)*6*t : t < 1/2 ? q : t < 2/3 ? pp + (q - pp)*(2/3 - t)*6 : pp; };
    p[i] = Math.round(f(hk + 1/3)*255); p[i+1] = Math.round(f(hk)*255); p[i+2] = Math.round(f(hk - 1/3)*255);
  }
  g.putImageData(d, 0, 0);
  return c;
}

/* ---------------- donantes: todo se lleva a la forma de un atlas por sets ---------------- */
// Cuadros sueltos del mismo personaje -> una grilla. Cada cuadro se ubica con su punto de apoyo (foot =
// fracción de su alto donde están los pies, la misma que usa drawPackSprite) sobre la misma línea.
function _bsLooseSheet(sets, foot){
  const list = [], idx = {};
  for(const k in sets){ idx[k] = []; for(const im of sets[k]){ idx[k].push(list.length); list.push(im); } }
  let fw = 0, top = 0, bot = 0;
  for(const im of list){ fw = Math.max(fw, im.naturalWidth); top = Math.max(top, im.naturalHeight*foot); bot = Math.max(bot, im.naturalHeight*(1 - foot)); }
  fw += 2; top = Math.ceil(top) + 1; const fh = top + Math.ceil(bot) + 1;
  const cols = Math.min(8, list.length), rows = Math.ceil(list.length/cols);
  const c = document.createElement("canvas"); c.width = cols*fw; c.height = rows*fh;
  const g = c.getContext("2d"); g.imageSmoothingEnabled = false;
  list.forEach((im, i)=>{ const x = (i % cols)*fw, y = Math.floor(i/cols)*fh; g.drawImage(im, x + Math.round((fw - im.naturalWidth)/2), y + Math.round(top - im.naturalHeight*foot)); });
  c._srcImg = list[0];
  return {img:c, fw, fh, cols, sets:idx, anchor:top/fh};
}
// Devuelve {atlas, fw, fh, cols, refH, anchor, sets, hMul} del donante, o null si todavía no cargó.
function _bsDonor(name){
  const D = ENEMY_ATLAS_PACK[name];
  if(D && !D.bodyOf){
    if(!D.ready) return null;
    if(typeof packDeriveDirSets === "function") packDeriveDirSets(D); // vistas de frente/espalda ya recortadas
    return {atlas:D.atlas, fw:D.fw, fh:D.fh, cols:D.cols, refH:D.refH, anchor:D.anchor, sets:D.sets, hMul:D.hMul};
  }
  // tira del Laberinto: una fila de cuadros; las vistas por dirección ya están separadas (REAL_ANIM_SETS)
  const R = typeof REAL_ANIM_ATLASES !== "undefined" && REAL_ANIM_ATLASES[name];
  if(R){
    if(!R.ready()) return null;
    const d = REAL_ANIM_DEF[name], S = REAL_ANIM_SETS[name] || {};
    const sets = {walk:S.side, walk_down:S.down, walk_up:S.up, idle:S.down || S.side, atk:S.atk, hit:S.hit};
    for(const k in sets) if(!sets[k]) delete sets[k];
    return {atlas:R.img, fw:d.w, fh:d.h, cols:d.frames, refH:d.h, anchor:0.92, sets, hMul:2.6, flipNat:(S.sideNat||1) < 0};
  }
  // grilla 4x6 del atlas infernal (caminar/atacar en 3 direcciones)
  const G = typeof ENEMY_ANIM_ATLASES !== "undefined" && ENEMY_ANIM_ATLASES[name];
  if(G){
    if(!G.ready()) return null;
    const F = ENEMY_ATLAS_FRAME;
    return {atlas:G.img, fw:F, fh:F, cols:ENEMY_ATLAS_COLS, refH:F, anchor:0.85, hMul:2.7*(ENEMY_ATLAS_SIZE_MUL[name]||1),
      sets:{idle:[0,1,2,3], walk:[4,5,6,7], walk_down:[0,1,2,3], walk_up:[8,9,10,11], atk:[16,17,18,19], atk_down:[12,13,14,15], atk_up:[20,21,22,23]}};
  }
  // recortes sueltos (PACK_ANIM: Zombi, Esqueleto Cornudo, Demonio de Hielo...): se arma la grilla al cargar
  const A = typeof PACK_ANIM !== "undefined" && PACK_ANIM[name];
  if(A){
    const keys = [].concat(A.walk || [], A.idle || [], A.atk || [], A.hit || [], A.death || []);
    if(!keys.length || keys.some(k => !A.ready[k] || !A.img[k] || !A.img[k].naturalWidth)) return null;
    const pick = (arr)=> (arr || []).map(k => A.img[k]);
    const L = _bsLooseSheet({walk:pick(A.walk), idle:pick(A.idle), atk:pick(A.atk), hit:pick(A.hit), death:pick(A.death)}, 0.92);
    for(const k in L.sets) if(!L.sets[k].length) delete L.sets[k];
    return {atlas:L.img, fw:L.fw, fh:L.fh, cols:L.cols, refH:A.img[A.walk[0]].naturalHeight, anchor:L.anchor, sets:L.sets, hMul:A.hMul || 2.6};
  }
  return null;
}

/* ---------------- atlas derivados ---------------- */
function _bsBuild(key){
  const S = BODY_SWAPS[key], P = ENEMY_ATLAS_PACK["bs_" + key];
  if(!P || P.ready) return true;
  const D = _bsDonor(S.body);
  if(!D) return false;
  try{
    let src = D.atlas;
    if(D.flipNat){ // el perfil del donante mira a la izquierda: se espeja la hoja entera cuadro por cuadro
      const c = document.createElement("canvas"); c.width = src.naturalWidth || src.width; c.height = src.naturalHeight || src.height;
      const g = c.getContext("2d"); g.imageSmoothingEnabled = false;
      const n = Math.floor(c.width/D.fw);
      for(let i=0;i<n;i++){ g.save(); g.translate((i + 1)*D.fw, 0); g.scale(-1, 1); g.drawImage(src, i*D.fw, 0, D.fw, D.fh, 0, 0, D.fw, D.fh); g.restore(); }
      c._srcImg = src; src = c;
    }
    const c = _bsRecolor(src, S.tint);
    c._srcImg = src._srcImg || src; // de qué arte real sale (lo lee tools/art/enemy_coverage.js)
    const sets = {};
    for(const k in D.sets) if(Array.isArray(D.sets[k]) && D.sets[k].length) sets[k] = D.sets[k].slice();
    for(const k in (S.sets || {})) if(sets[S.sets[k]]) sets[k] = sets[S.sets[k]];
    Object.assign(P, {atlas:c, fw:D.fw, fh:D.fh, cols:D.cols, refH:D.refH, anchor:D.anchor, sets, hMul:S.hMul || D.hMul || 2.6});
    if(typeof _PACK_DIR_DONE !== "undefined") _PACK_DIR_DONE.add(sets); // grilla ya resuelta: no re-derivar sobre el lienzo
    P.ready = true;
  }catch(err){ console.warn("body-swaps", key, err && err.message); P.failed = true; }
  return true;
}
function _bsInit(){
  const pending = [];
  for(const key in BODY_SWAPS){
    const S = BODY_SWAPS[key];
    if(!ENEMY_BASE[key] && !ENEMY_ATLAS_PACK[key]){ console.warn("body-swaps: clave desconocida", key); continue; }
    ENEMY_ATLAS_PACK["bs_" + key] = {atlas:null, sets:{}, ready:false, bodyOf:key};
    if(!_bsBuild(key)) pending.push(key);
    if(!BODY_SWAP_ON || !ENEMY_BASE[key]) continue;
    // nombre y Códice: el personaje pasa a llamarse como lo que se ve
    if(S.name) ENEMY_BASE[key].name = S.name;
    // muerte: si el donante tiene cuadros de muerte, que se vean enteros (sin caer de costado encima)
    if(S.death && typeof ANIM_PROFILES !== "undefined") ANIM_PROFILES[key] = Object.assign({}, ANIM_PROFILES[key] || {}, {death:S.death});
    if(S.codex && typeof CODEX_CREATURES !== "undefined" && CODEX_CREATURES[key]) Object.assign(CODEX_CREATURES[key], S.codex);
  }
  // los donantes cargan en paralelo: se arma cada atlas apenas su donante está listo
  if(pending.length){
    let n = 0;
    const tick = ()=>{ for(let i=pending.length-1;i>=0;i--) if(_bsBuild(pending[i])) pending.splice(i, 1); if(pending.length && n++ < 600) setTimeout(tick, 100); };
    setTimeout(tick, 100);
  }
}
_bsInit();

// Clave del atlas prestado (o null si no tiene préstamo, está apagado o todavía no cargó).
function bodySwapKey(key){
  if(!key || !BODY_SWAP_ON || !BODY_SWAPS[key]) return null;
  const P = ENEMY_ATLAS_PACK["bs_" + key];
  return P && P.ready ? "bs_" + key : null;
}
// ¿Se dibuja con un cuerpo prestado? (sin esperar a que cargue: para decisiones fijas como el balanceo)
function bodySwapped(key){ return BODY_SWAP_ON && !!BODY_SWAPS[key]; }
// ¿Todos los atlas prestados están armados? (pruebas y capturas)
function bodySwapsReady(){ for(const k in BODY_SWAPS){ const P = ENEMY_ATLAS_PACK["bs_" + k]; if(P && !P.ready && !P.failed) return false; } return true; }
