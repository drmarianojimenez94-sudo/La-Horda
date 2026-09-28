"use strict";
/* ============================================================
   js/arenas/arena-layouts.js
   TRAZADO AL AZAR (reseña §6.4 #7: "mapas con trazado al azar, no solo decorado").
   En las cinco arenas de coliseo (Bosque, Gélida, Laberinto —sin muros nuevos: solo pilares en las
   plazas—, Acuática e Infernal) la semilla de la partida elige uno de 4 PATRONES de obstáculos
   sólidos (columnas, menhires, agujas de hielo, obeliscos) y, además, lo espeja o no. Cambia por dónde
   se camina, dónde se pelea de espaldas a una columna y por dónde llega la horda.
   Cuándo: SIEMPRE en la Horda Infinita y en la campaña en Pesadilla/Infierno (Normal queda como fue
   diseñada y calibrada). En cooperativo lo decide el anfitrión: viaja en {k:"start"} como `lay` (la
   semilla ya viajaba: netMatch.seed), así el invitado arma exactamente lo mismo aunque todavía no sepa
   que la partida es de la Horda Infinita.
   SEGURIDAD (todo determinístico, sin Math.random):
     - cada pilar respeta distancia al centro (salida de los héroes y del jefe), al borde del octágono,
       a los sólidos y muros fijos, a los puntos de las mecánicas (braseros de la Gélida) y a los otros
       pilares (pasos anchos);
     - después de cada pilar se verifica la NAVEGACIÓN con una grilla más exigente que la de los
       enemigos (bordes inflados 40 u en vez de 20): si alguna celda que antes se alcanzaba desde el
       centro deja de alcanzarse (un bolsillo, un pasillo cerrado), ese pilar no se pone.
   Los pilares son sólidos de aidSolids: colisión de héroes y enemigos, campo de flujo, bots y el
   ubicador de las mecánicas (aidBlocked) los ven como a cualquier otro obstáculo del escenario.
   ============================================================ */
const AID_LAYOUT_ARENAS = {
  bosque:    { r:16, art:i=>aidArtMenhir(i%5),     rot:0.00 },
  hielo:     { r:18, art:i=>aidArtIcePillar(i%5),  rot:0.30 },
  laberinto: { r:15, art:()=>aidArtObelisk(),      rot:0.00 },
  acuatica:  { r:17, art:i=>aidArtSunkColumn(i%4), rot:0.20 },
  infernal:  { r:20, art:i=>aidArtInfColumn(i%4),  rot:0.39 }
};
// Patrones: cada uno propone candidatos en coordenadas de anillo (radio, ángulo) por orden de
// preferencia (aidOnRing los estira al óvalo del coliseo) y se ponen hasta `n` que pasen los filtros.
// Muchos candidatos: cada arena tiene su arquitectura fija y el patrón se acomoda alrededor.
const _layRing = (rs, k, a0) => rs.flatMap((rr, j) => Array.from({length:k}, (_, i) => [rr, a0 + (i + (j % 2)*0.5)*2*Math.PI/k]));
const AID_LAYOUT_PATTERNS = [
  { name:"Cruz de pasillos", n:8, pts:()=>[0, Math.PI/2, Math.PI, -Math.PI/2].flatMap(a => [[440,a+0.14],[440,a-0.14],[560,a+0.2],[560,a-0.2],[660,a+0.1],[660,a-0.1],[500,a],[620,a]]) },
  { name:"Anillo roto",      n:7, pts:()=>_layRing([520, 600, 460], 12, Math.PI/12) },
  { name:"Bosquecillos",     n:9, pts:()=>[0,1,2,3].flatMap(k => { const a = Math.PI/4 + k*Math.PI/2; return [[560,a],[660,a+0.12],[660,a-0.12],[480,a+0.2],[480,a-0.2],[620,a+0.3],[620,a-0.3]]; }) },
  { name:"Zigzag",           n:8, pts:()=>Array.from({length:16}, (_, k) => [k%2 ? 640 : 440, k*Math.PI/8 + 0.2]) }
];
// Laberinto: sin muros nuevos. Sus pasillos (entre el anillo interior y el exterior) son angostos: los
// pilares van por el medio del pasillo (radio de anillo ~510-545), distintos tramos según el patrón.
const AID_LAYOUT_PATTERNS_LAB = [
  { name:"Pasillo norte y sur", n:6, pts:()=>_layRing([530, 515], 24, Math.PI/2 + 0.13) },
  { name:"Columnata",           n:7, pts:()=>_layRing([540, 520], 20, 0.05) },
  { name:"Cuatro plazas",       n:6, pts:()=>_layRing([525, 545], 16, Math.PI/4) },
  { name:"Pasillo este y oeste",n:6, pts:()=>_layRing([520, 535], 24, 0.13) }
];
const AID_LAYOUT_PAD = 40;       // grilla de verificación (la de los enemigos usa 20)
const AID_LAYOUT_CLEAR = 90;     // paso mínimo (borde a borde) entre un pilar y otro sólido (la grilla lo confirma)
let aidLayoutInfo = null;        // {arena, pattern, mirror, placed, rejected} de la última partida (pruebas / red)

function mapLayoutOn(){
  if(typeof window!=="undefined" && window.__layForce!==undefined) return !!window.__layForce; // pruebas (t_identity LAY=1)
  if(typeof netMatch!=="undefined" && netMatch && netMatch.role==="guest") return !!netMatch.lay;
  if(typeof endlessOn==="function" && endlessOn()) return true;
  const d = typeof diffCurrent==="function" ? diffCurrent() : "normal";
  return d==="pesadilla" || d==="infierno";
}
// Celdas alcanzables desde el centro con los sólidos/muros actuales (bordes inflados `pad`).
function _layReach(pad){
  // grilla del coliseo (AID_NAV puede tener todavía la de otra arena: se rearma después, en aidNavBuild)
  const N = AID_NAV_DEFAULT, W = N.W, H = N.H, C = AID_NAV.cell, n = W*H;
  const blocked = new Uint8Array(n);
  for(let j=0;j<H;j++) for(let i=0;i<W;i++){
    const x = N.x0 + (i+0.5)*C, y = N.y0 + (j+0.5)*C;
    let b = !aidInside(x, y, 0);
    if(!b) for(const s of aidSolids){ if(Math.hypot(s.x-x, s.y-y) < s.r+pad){ b = true; break; } }
    if(!b) for(const w of labyrinthWalls){ if(aidPointInWall(w, x, y, pad)){ b = true; break; } }
    blocked[j*W+i] = b ? 1 : 0;
  }
  const seen = new Uint8Array(n), q = new Int32Array(n);
  const c0 = Math.floor((0-N.x0)/C) + Math.floor((0-N.y0)/C)*W;
  let qh = 0, qt = 0;
  if(!blocked[c0]){ seen[c0] = 1; q[qt++] = c0; }
  while(qh < qt){
    const c = q[qh++], i = c % W, j = (c - i)/W;
    const nb = [i>0 ? c-1 : -1, i<W-1 ? c+1 : -1, j>0 ? c-W : -1, j<H-1 ? c+W : -1];
    for(const k of nb) if(k >= 0 && !blocked[k] && !seen[k]){ seen[k] = 1; q[qt++] = k; }
  }
  return {seen, blocked};
}
// Puntos que las mecánicas de la arena necesitan libres (fijos, no dependen del escenario).
function _layReserved(arena){
  const out = [];
  if(arena==="hielo" && typeof HIE_CFG!=="undefined"){
    for(const t of HIE_CFG.brazierTurns) for(const a of HIE_CFG.braziers){ const p = aidOnRing(HIE_CFG.ring, HIE_CFG.ring, a + t); out.push({x:p.x, y:p.y, r:110}); }
  }
  return out;
}
function aidLayoutBuild(){
  aidLayoutInfo = null;
  const A = currentArena, L = AID_LAYOUT_ARENAS[A];
  if(!L || !mapLayoutOn() || typeof mapVariantPick!=="function" || !runMapSeed()) return;
  const combo = mapVariantPick("lay_" + A, AID_LAYOUT_PATTERNS.length*2);
  const pi = combo >> 1, P = (A==="laberinto" ? AID_LAYOUT_PATTERNS_LAB : AID_LAYOUT_PATTERNS)[pi], mirror = (combo & 1) === 1;
  const reserved = _layReserved(A);
  const base = _layReach(AID_LAYOUT_PAD);
  const fixedN = aidSolids.length;
  const placed = [], rejected = [];
  P.pts().forEach(([rr, ang], i)=>{
    if(placed.length >= P.n) return;
    const a = (mirror ? Math.PI - ang : ang) + L.rot;
    const p = aidOnRing(rr, rr, a), x = Math.round(p.x), y = Math.round(p.y), r = L.r;
    const why =
      Math.hypot(x/1.18, y/0.82) < 300 ? "centro" :
      !aidInside(x, y, r + 120) ? "borde" :
      aidSolids.some((s, k)=>Math.hypot(s.x-x, s.y-y) < s.r + r + (k < fixedN ? AID_LAYOUT_CLEAR : AID_LAYOUT_CLEAR + 20)) ? "solido" :
      labyrinthWalls.some(w=>aidPointInWall(w, x, y, r + AID_LAYOUT_CLEAR)) ? "muro" :
      reserved.some(q=>Math.hypot(q.x-x, q.y-y) < q.r + r) ? "mecanica" : "";
    if(why){ rejected.push({i, why}); return; }
    aidSolids.push({x, y, r, lay:true});
    // navegación: nada de lo que se alcanzaba antes puede quedar encerrado
    // (las celdas que tapa el propio pilar no cuentan: solo las que siguen libres y quedaron aisladas)
    const now = _layReach(AID_LAYOUT_PAD);
    for(let c=0;c<base.seen.length;c++) if(base.seen[c] && !now.blocked[c] && !now.seen[c]){ aidSolids.pop(); rejected.push({i, why:"encierra"}); return; }
    placed.push({x, y, r, i});
  });
  // arte: la misma pieza de la arena (sólida, con su sombra y orden por profundidad)
  for(const q of placed){
    // el decorado alto sin colisión (corales, cristales) que caía encima del pilar se saca; lo sólido
    // fijo nunca está tan cerca (los pilares guardan AID_LAYOUT_CLEAR de todo sólido)
    aidProps = aidProps.filter(pr=>Math.hypot(pr.x-q.x, pr.y-q.y) > q.r + 26);
    aidProp(L.art(q.i), q.x, q.y, {flip: (q.i % 2)===1});
  }
  aidLayoutInfo = {arena:A, pattern:pi, name:P.name, mirror, placed:placed.length, rejected};
}
