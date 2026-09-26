"use strict";
/* ============================================================
   js/ui/item-icons.js
   ÍCONOS DE OBJETO (provisorios, procedurales, en pixel-art).
   Objetivo: que cada objeto se reconozca ("esa es ESA armadura"), no el mismo emoji con otros números.
   - SILUETA según qué pieza es (espada, hacha, arco, bastón, corona, capucha, túnica, garras,
     sandalias...), leída del nombre/diseño del objeto.
   - MATERIAL según su elemento/familia (fuego, hielo, rayo, sangrado, luz, arcano, podredumbre,
     acero) o el color de su set; detalles (gema, filo, remaches) según su identidad (hash estable).
   - MARCO según su categoría (Común blanco … Mítico rojo, Set verde, Único violeta con brillo).
   Se dibuja en una grilla de 32×32 con contorno y luz automáticos y se cachea como imagen.
   ARTE FINAL: cada objeto tiene su ficha y prompt en LA_HORDA_ITEM_ASSET_MANIFEST.md. Cuando un
   ícono real exista, se registra en ITEM_ICON_ART[designId] y reemplaza a este sin tocar la UI.
   ============================================================ */
const ITEM_ICON_ART = {}; // designId -> "assets/items/<id>.png" (arte final; hoy vacío)
const _ICON_CACHE = {};

// Palabra del nombre -> silueta (el primer match gana; el orden importa)
const ICON_SHAPE_WORDS = [
  ["Arco","bow"],["Fusil","gun"],["Guadaña","scythe"],["Hacha","axe"],["Martillo","hammer"],["Pala","shovel"],
  ["Grimorio","book"],["Orbe","orb"],["Núcleo","orb"],["Cáliz","chalice"],["Lágrima","gem"],["Cristal","gem"],["Corazón","heart"],["Esquirla","dagger"],["Ascua","orb"],
  ["Báculo","staff"],["Bastón","staff"],["Cetro","scepter"],["Bokken","sword"],["Espada","sword"],["Hojas","dualblade"],["Hoja","sword"],["Filo","sword"],["Colmillo","dagger"],["Daga","dagger"],["Cadena","chain"],
  ["Pavés","shield_tower"],["Égida","shield_round"],["Rodela","shield_round"],["Escudo","shield_kite"],["Bastión","shield_tower"],["Muro","shield_tower"],
  ["Corona","crown"],["Diadema","circlet"],["Aureola","circlet"],["Mitra","crown"],["Morrión","helm"],["Kasa","hat"],["Visor","mask"],["Máscara","mask"],["Capucha","hood"],["Velo","hood"],["Yelmo","helm"],["Casco","helm"],["Ojo","circlet"],
  ["Túnica","robe"],["Hábito","robe"],["Mortaja","robe"],["Manto","cloak"],["Casaca","robe"],["Arnés","chest"],["Piel","chest"],["Peto","chest"],["Pechera","chest"],["Coraza","chest"],["Cota","chest"],["Yugo","chest"],
  ["Garras","claws"],["Manos","claws"],["Dedos","gloves"],["Sellos","gloves"],["Puños","gauntlet"],["Guanteletes","gauntlet"],["Tekko","gloves"],["Empuñaduras","gloves"],["Brazal","gauntlet"],["Brazales","gauntlet"],["Guantes","gloves"],
  ["Sandalias","sandals"],["Waraji","sandals"],["Pasos","boots"],["Pisada","boots"],["Grebas","boots"],["Botas","boots"]
];
const ICON_TYPE_SHAPE = {arma:"sword", escudo:"shield_kite", casco:"helm", pechera:"chest", guantes:"gloves", botas:"boots"};
// Material por elemento/familia: [oscuro, base, claro, acento]
const ICON_MATERIAL = {
  fire:["#6b1d0c","#c8461c","#ff9a4a","#ffe08a"], ice:["#1d4a6b","#4aa8d8","#bfefff","#ffffff"], lightning:["#6b5410","#d8b020","#fff080","#ffffff"],
  bleed:["#4a0c10","#a8202c","#f05050","#ffc0b0"], holy:["#6b5420","#d8b050","#fff0b0","#ffffff"], arcane:["#3a1d6b","#8a50d8","#d0a8ff","#ffffff"],
  rot:["#2e1a3a","#7a3a9a","#c890e0","#b0ff90"], physical:["#2e333a","#7a8290","#c8d0dc","#ffffff"], leather:["#3a2414","#7a5030","#b88858","#e8c890"],
  cloth:["#2a2238","#5a4a78","#9a88c0","#e0d0ff"], wood:["#3a2410","#80562c","#c0905a","#e8d0a0"]
};
function _iconHash(s){ let h = 2166136261; for(let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h>>>0; }
function _hexToArr(h){ const n = parseInt(h.slice(1), 16); return [(n>>16)&255, (n>>8)&255, n&255]; }
function _shade(hex, k){ const a = _hexToArr(hex); const f = v=>Math.max(0, Math.min(255, Math.round(k>=0 ? v + (255-v)*k : v*(1+k)))); return "#" + a.map(f).map(v=>v.toString(16).padStart(2,"0")).join(""); }
function itemIconShape(it){
  const name = (it && it.name) || "";
  for(const [w, s] of ICON_SHAPE_WORDS) if(name.indexOf(w) >= 0) return s;
  if(it && it.noun) for(const [w, s] of ICON_SHAPE_WORDS) if(it.noun===w) return s;
  return ICON_TYPE_SHAPE[it && it.type] || "sword";
}
// Sin elemento declarado: el material sale de lo que el nombre promete ("Cristal de Invierno" = hielo)
const ICON_NAME_MATERIAL = [
  [/Invierno|Hielo|Escarcha|Glacia|Gélid/i, "ice"], [/Fuego|Llama|Ascua|Brasa|Infern|Ígne|Forja/i, "fire"], [/Tormenta|Rayo|Trueno|Relámpago/i, "lightning"],
  [/Sangr|Carmes|Roj/i, "bleed"], [/Augurio|Profec|Luz|Alba|Sol|Divin|Sagrad|Aureola/i, "holy"], [/Sombra|Noche|Arcan|Vacío|Abismo|Eclipse/i, "arcane"],
  [/Espora|Micel|Plaga|Pútrid|Podred/i, "rot"]
];
function itemIconMaterial(it){
  if(it && it.set && SET_DB[it.set] && SET_DB[it.set].aura){
    const rgb = SET_DB[it.set].aura.split(",").map(Number), hex = "#" + rgb.map(v=>v.toString(16).padStart(2,"0")).join("");
    return [_shade(hex,-0.62), _shade(hex,-0.2), _shade(hex,0.35), "#ffffff"];
  }
  const el = it && it.element;
  if(el && ICON_MATERIAL[el]) return ICON_MATERIAL[el];
  for(const [re, m] of ICON_NAME_MATERIAL) if(re.test((it && it.name) || "")) return ICON_MATERIAL[m];
  const t = it && it.type;
  if(t==="pechera" && /Túnica|Manto|Hábito|Mortaja|Casaca/.test(it.name||"")) return ICON_MATERIAL.cloth;
  if((t==="guantes" || t==="botas") && !/Guantelete|Grebas|Brazal/.test(it.name||"")) return ICON_MATERIAL.leather;
  return ICON_MATERIAL.physical;
}
// ---- pintor de 32x32 ----
function _painter(){
  const c = document.createElement("canvas"); c.width = c.height = 32;
  const g = c.getContext("2d");
  return {c, g,
    r(x, y, w, h, col){ g.fillStyle = col; g.fillRect(x|0, y|0, w|0, h|0); },
    p(x, y, col){ g.fillStyle = col; g.fillRect(x|0, y|0, 1, 1); },
    line(x0, y0, x1, y1, col, w){ w = w||1; const n = Math.max(Math.abs(x1-x0), Math.abs(y1-y0)); for(let i=0;i<=n;i++){ const t = n ? i/n : 0; g.fillStyle = col; g.fillRect(Math.round(x0+(x1-x0)*t - (w-1)/2), Math.round(y0+(y1-y0)*t - (w-1)/2), w, w); } },
    ell(cx, cy, rx, ry, col){ g.fillStyle = col; for(let y=-ry;y<=ry;y++){ const w = Math.round(rx*Math.sqrt(Math.max(0, 1 - (y*y)/(ry*ry)))); g.fillRect(cx-w, cy+y, w*2+1, 1); } }
  };
}
// Contorno oscuro de 1 px + luz arriba-izquierda (automático sobre la silueta pintada)
function _finish(P, outline){
  const d = P.g.getImageData(0, 0, 32, 32), px = d.data, A = i=>px[i*4+3] > 0;
  const out = new Uint8ClampedArray(px);
  const o = _hexToArr(outline);
  for(let y=0;y<32;y++) for(let x=0;x<32;x++){
    const i = y*32+x;
    if(A(i)){
      // luz: borde superior/izquierdo más claro, inferior/derecho más oscuro
      const up = y>0 && A(i-32), left = x>0 && A(i-1), down = y<31 && A(i+32), right = x<31 && A(i+1);
      const k = (!up || !left) ? 0.28 : ((!down || !right) ? -0.22 : 0);
      if(k){ for(let c=0;c<3;c++){ const v = px[i*4+c]; out[i*4+c] = k>0 ? v + (255-v)*k : v*(1+k); } }
      continue;
    }
    const n = (x>0 && A(i-1)) || (x<31 && A(i+1)) || (y>0 && A(i-32)) || (y<31 && A(i+32));
    if(n){ out[i*4] = o[0]; out[i*4+1] = o[1]; out[i*4+2] = o[2]; out[i*4+3] = 255; }
  }
  d.data.set(out); P.g.putImageData(d, 0, 0);
}
// ---- siluetas (M = [oscuro, base, claro, acento], v = variante estable 0..255, gem = color de gema) ----
const ICON_SHAPES = {
  sword(P, M, v, gem){ const L = 6 + (v%3); P.line(9, 23, 22, L, M[2], 3); P.line(10, 23, 22, L+1, M[1], 1); P.line(6, 20, 13, 27, "#6b4a2a", 2); P.r(7, 24, 3, 3, "#4a3018"); P.line(5, 19, 13, 27, M[0], 1); P.r(10, 21, 3, 3, gem); },
  dualblade(P, M, v, gem){ P.line(7, 24, 18, 6, M[2], 2); P.line(24, 24, 13, 6, M[1], 2); P.r(6, 23, 4, 3, "#4a3018"); P.r(22, 23, 4, 3, "#4a3018"); P.p(15, 15, gem); },
  dagger(P, M, v, gem){ P.line(11, 22, 21, 9, M[2], 3); P.line(12, 22, 21, 10, M[1], 1); P.line(8, 20, 14, 25, "#6b4a2a", 2); P.r(8, 23, 3, 3, "#4a3018"); P.p(13, 20, gem); },
  axe(P, M, v, gem){ P.line(9, 27, 20, 7, "#80562c", 2); P.ell(20, 10, 6, 5, M[1]); P.ell(21, 10, 4, 3, M[2]); P.r(18, 8, 2, 5, M[0]); P.p(19, 11, gem); },
  hammer(P, M, v, gem){ P.line(10, 27, 18, 11, "#80562c", 2); P.r(12, 5, 13, 8, M[1]); P.r(13, 6, 11, 3, M[2]); P.r(17, 7, 3, 4, gem); },
  scythe(P, M, v, gem){ P.line(10, 28, 19, 5, "#6b4a2a", 2); P.line(19, 5, 27, 9, M[2], 3); P.line(27, 9, 25, 16, M[1], 2); P.p(18, 7, gem); },
  staff(P, M, v, gem){ P.line(11, 28, 18, 8, "#80562c", 2); P.ell(19, 7, 4, 4, M[1]); P.ell(19, 7, 2, 2, gem); P.p(18, 5, "#ffffff"); P.line(15, 11, 23, 5, M[0], 1); },
  scepter(P, M, v, gem){ P.line(11, 27, 18, 11, M[1], 2); P.r(15, 5, 7, 7, M[2]); P.r(16, 6, 5, 5, gem); P.r(14, 11, 9, 2, M[0]); },
  bow(P, M, v, gem){ for(let i=0;i<=20;i++){ const a = -1.1 + i*0.11, x = 11 + Math.cos(a)*10, y = 16 + Math.sin(a)*12; P.r(x, y, 2, 2, M[1]); } P.line(15, 5, 15, 27, "#e8e0c8", 1); P.r(9, 15, 3, 3, gem); },
  gun(P, M, v, gem){ P.line(5, 22, 26, 9, M[1], 2); P.line(6, 22, 12, 19, "#80562c", 4); P.r(16, 13, 3, 3, M[2]); P.p(25, 9, "#ffffff"); P.p(11, 20, gem); },
  shovel(P, M, v, gem){ P.line(10, 27, 19, 11, "#80562c", 2); P.ell(21, 8, 5, 5, M[1]); P.ell(21, 7, 3, 3, M[2]); P.p(9, 27, gem); },
  orb(P, M, v, gem){ P.ell(16, 15, 8, 8, M[1]); P.ell(15, 13, 5, 5, M[2]); P.ell(17, 17, 3, 3, gem); P.r(11, 24, 10, 3, M[0]); },
  gem(P, M, v, gem){ P.line(16, 5, 24, 15, M[1], 3); P.line(24, 15, 16, 27, M[0], 3); P.line(16, 27, 8, 15, M[1], 3); P.line(8, 15, 16, 5, M[2], 3); P.ell(16, 16, 5, 7, M[2]); P.ell(15, 13, 2, 3, "#ffffff"); if(v%2) P.r(15, 18, 3, 3, gem); },
  heart(P, M, v, gem){ P.ell(12, 12, 5, 5, M[1]); P.ell(20, 12, 5, 5, M[1]); for(let y=0;y<11;y++) P.r(8+y*0.75, 13+y, 16-y*1.5, 1, M[1]); P.ell(12, 11, 2, 2, M[2]); P.p(16, 18, gem); },
  chalice(P, M, v, gem){ P.ell(16, 9, 8, 4, M[1]); P.r(9, 9, 15, 5, M[1]); P.ell(16, 13, 6, 3, M[1]); P.r(15, 15, 3, 7, M[0]); P.r(11, 22, 11, 3, M[1]); P.ell(16, 8, 5, 2, gem); },
  book(P, M, v, gem){ P.r(8, 6, 17, 21, M[0]); P.r(9, 7, 15, 19, M[1]); P.r(11, 9, 11, 3, M[2]); P.r(14, 15, 5, 5, gem); P.r(9, 25, 16, 2, "#e8e0c8"); },
  chain(P, M, v, gem){ for(let i=0;i<5;i++){ P.ell(8+i*4, 22-i*4, 3, 2, i%2 ? M[1] : M[2]); } P.p(24, 6, gem); },
  shield_kite(P, M, v, gem){ for(let y=0;y<22;y++){ const w = y<12 ? 11 : 11 - (y-12)*1.1; P.r(16-w, 5+y, w*2, 1, M[1]); } P.r(15, 6, 2, 18, M[2]); P.r(8, 10, 16, 2, M[2]); P.ell(16, 11, 2, 2, gem); },
  shield_round(P, M, v, gem){ P.ell(16, 16, 11, 11, M[1]); P.ell(16, 16, 8, 8, M[0]); P.ell(16, 16, 6, 6, M[1]); P.ell(16, 16, 2, 2, gem); for(let i=0;i<8;i++){ const a = i*0.785; P.p(16+Math.cos(a)*9.5, 16+Math.sin(a)*9.5, M[2]); } },
  shield_tower(P, M, v, gem){ P.r(8, 4, 16, 24, M[1]); P.r(9, 5, 14, 3, M[2]); P.r(15, 5, 2, 22, M[0]); P.r(9, 14, 14, 2, M[0]); P.r(14, 10, 4, 4, gem); },
  helm(P, M, v, gem){ P.ell(16, 14, 9, 9, M[1]); P.r(7, 14, 19, 9, M[1]); P.r(9, 16, 15, 3, "#15121a"); P.r(15, 5, 2, 16, M[2]); P.p(16, 9, gem); if(v%2) P.r(14, 2, 4, 4, "#c8461c"); },
  crown(P, M, v, gem){ P.r(7, 16, 19, 8, M[1]); for(let i=0;i<5;i++) P.r(7+i*4, 9 + (i%2)*3, 3, 8, M[1]); P.r(7, 20, 19, 2, M[2]); P.r(15, 17, 3, 3, gem); P.p(9, 18, "#ffffff"); P.p(23, 18, "#ffffff"); },
  circlet(P, M, v, gem){ P.ell(16, 17, 11, 5, M[1]); P.ell(16, 17, 8, 3, "rgba(0,0,0,0)"); P.g.clearRect(9, 15, 15, 4); P.r(14, 9, 5, 6, M[2]); P.r(15, 10, 3, 4, gem); },
  hood(P, M, v, gem){ P.ell(16, 14, 10, 11, M[1]); P.r(6, 16, 21, 10, M[1]); P.ell(16, 18, 5, 6, "#0c0a12"); P.p(14, 18, gem); P.p(18, 18, gem); P.line(16, 3, 21, 8, M[2], 1); },
  hat(P, M, v, gem){ P.ell(16, 20, 13, 4, M[1]); P.ell(16, 14, 6, 6, M[1]); P.ell(16, 12, 3, 3, M[2]); P.p(16, 19, gem); },
  mask(P, M, v, gem){ P.ell(16, 15, 9, 11, M[1]); P.r(10, 13, 5, 3, "#0c0a12"); P.r(18, 13, 5, 3, "#0c0a12"); P.line(16, 17, 16, 23, M[0], 1); P.p(12, 14, gem); P.p(20, 14, gem); },
  chest(P, M, v, gem){ P.r(8, 7, 17, 19, M[1]); P.r(4, 7, 6, 8, M[1]); P.r(23, 7, 6, 8, M[1]); P.g.clearRect(13, 5, 7, 4); P.r(15, 9, 3, 15, M[2]); P.r(9, 16, 15, 2, M[0]); P.r(15, 12, 3, 3, gem); },
  robe(P, M, v, gem){ for(let y=0;y<22;y++){ const w = 6 + y*0.45; P.r(16-w, 6+y, w*2, 1, M[1]); } P.r(4, 8, 5, 9, M[1]); P.r(24, 8, 5, 9, M[1]); P.r(15, 8, 3, 19, M[2]); P.r(10, 15, 13, 2, gem); },
  cloak(P, M, v, gem){ for(let y=0;y<23;y++){ const w = 5 + y*0.5; P.r(16-w, 5+y, w*2, 1, M[1]); } P.ell(16, 8, 5, 3, M[2]); P.r(15, 7, 3, 3, gem); P.line(10, 12, 7, 27, M[0], 1); P.line(22, 12, 25, 27, M[0], 1); },
  gloves(P, M, v, gem){ P.r(9, 12, 12, 13, M[1]); for(let i=0;i<4;i++) P.r(9+i*3, 6 + (i===0?3:0), 3, 7, M[1]); P.r(20, 13, 5, 4, M[1]); P.r(9, 22, 12, 4, M[0]); P.r(12, 16, 4, 3, gem); },
  gauntlet(P, M, v, gem){ P.r(8, 11, 15, 15, M[1]); for(let i=0;i<4;i++) P.r(8+i*4, 5, 3, 7, M[2]); P.r(22, 13, 5, 5, M[1]); P.r(8, 20, 15, 2, M[0]); P.r(13, 14, 4, 4, gem); },
  claws(P, M, v, gem){ P.r(8, 14, 13, 12, M[1]); for(let i=0;i<4;i++) P.line(9+i*3, 14, 7+i*4, 4, M[2], 1); P.r(8, 22, 13, 3, M[0]); P.p(14, 18, gem); },
  boots(P, M, v, gem){ P.r(10, 5, 9, 16, M[1]); P.r(10, 19, 16, 7, M[1]); P.r(10, 5, 9, 3, M[2]); P.r(10, 24, 17, 2, M[0]); P.p(14, 12, gem); if(v%2) P.r(8, 8, 3, 3, M[2]); },
  sandals(P, M, v, gem){ P.r(7, 22, 20, 4, M[0]); P.line(9, 22, 17, 12, M[1], 2); P.line(24, 22, 16, 12, M[1], 2); P.line(12, 17, 21, 17, M[2], 1); P.p(16, 12, gem); }
};
const ICON_GEM_COLORS = ["#ff4d6a","#4dd8ff","#7dff8a","#ffd84d","#c07dff","#ffffff"];
// Clave de ícono estable por identidad (dos copias del mismo objeto = mismo ícono)
function itemIconKey(it){ return (it.designId || (it.noun||"") + "|" + (it.family||"") + "|" + it.type + "|" + (it.name||"")) + "|" + itemTier(it); }
function itemIconURL(it){
  if(!it) return "";
  if(it.designId && ITEM_ICON_ART[it.designId]) return ITEM_ICON_ART[it.designId];
  const key = itemIconKey(it);
  if(_ICON_CACHE[key]) return _ICON_CACHE[key];
  try{
    const P = _painter(), M = itemIconMaterial(it), v = _iconHash(key) & 255;
    const gem = it.set ? "#9dffb0" : (it.unique ? "#e0b0ff" : (it.element==="fire" ? "#ffd06a" : ICON_GEM_COLORS[v % ICON_GEM_COLORS.length]));
    (ICON_SHAPES[itemIconShape(it)] || ICON_SHAPES.sword)(P, M, v, gem);
    _finish(P, "#0c0a0e");
    // lienzo final 64x64: fondo por categoría + ícono ×2 + marco
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d"); g.imageSmoothingEnabled = false;
    const col = typeof itemColor==="function" ? itemColor(it) : "#e8e8ec", tier = itemTier(it);
    const bg = g.createRadialGradient(32, 30, 4, 32, 32, 34);
    bg.addColorStop(0, _shade(col.length===7 ? col : "#888888", -0.55)); bg.addColorStop(1, "#0c0a10");
    g.fillStyle = bg; g.fillRect(0, 0, 64, 64);
    if(tier==="mitico" || tier==="unico" || tier==="set" || tier==="legendario"){ g.globalAlpha = tier==="legendario" ? 0.25 : 0.4; g.fillStyle = col; g.beginPath(); g.arc(32, 32, 22, 0, Math.PI*2); g.fill(); g.globalAlpha = 1; }
    g.drawImage(P.c, 0, 0, 32, 32, 0, 0, 64, 64);
    g.strokeStyle = col; g.lineWidth = tier==="comun" ? 2 : (tier==="raro" || tier==="muyraro" ? 3 : 4); g.strokeRect(1.5, 1.5, 61, 61);
    if(tier==="set"){ g.fillStyle = col; g.beginPath(); g.moveTo(52, 4); g.lineTo(60, 4); g.lineTo(60, 12); g.closePath(); g.fill(); }
    if(tier==="unico"){ g.fillStyle = "#fff"; g.fillRect(56, 4, 4, 4); g.fillRect(4, 56, 4, 4); }
    return (_ICON_CACHE[key] = c.toDataURL());
  }catch(err){ return ""; }
}
function itemIconHTML(it, cls){
  const url = itemIconURL(it);
  return url ? `<img class="item-icon-img ${cls||""}" src="${url}" alt="" draggable="false">` : `<span class="item-icon">${it && it.icon || "?"}</span>`;
}
