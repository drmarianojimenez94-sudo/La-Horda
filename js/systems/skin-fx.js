"use strict";
/* ============================================================
   js/systems/skin-fx.js
   HABILIDADES CON LA SKIN DE SET: misma mecánica, otro aspecto.
   Con el set completo del dueño (activeSetSkin, set-effects.js) cada lanzamiento del guardián:
   - suma los efectos pintados de la hoja de la skin (panel "Efectos y proyectiles", recortados por
     tools/art/skins_sets/fx.py -> skin-fx-meta.js) en el lugar que corresponde: frente al
     guardián (tajos), sobre él (auras/sellos), en el punto de impacto (zonas, trampas, cadenas) o
     como arte del proyectil;
   - tiñe con el color de la skin lo que el kit ya dibuja en ese lanzamiento (partículas,
     proyectiles, ráfagas y ondas del VFX central, destello de lanzamiento). La sangre y el
     material de los enemigos no se tocan.
   No cambia daño, área, duración ni objetivos: solo lee lo que el lanzamiento creó. Si un set
   algún día modifica una habilidad (pasiva de set), esa lógica vive en set-effects.js y esto
   sigue dibujando encima de lo que resulte.
   Red: vfxSprite/vfxBurst/vfxShock ya se retransmiten a los invitados (net-game.js); este archivo
   carga DESPUÉS de net-game.js para que el color de la skin viaje en los argumentos.
   ============================================================ */

// Carga diferida de los cuadros: solo cuando una skin se usa (o un invitado recibe su efecto).
const SKIN_FX_LOADED = {};
function skinFxLoadSet(setId){
  if(SKIN_FX_LOADED[setId]) return; SKIN_FX_LOADED[setId] = true;
  for(const k in SKIN_FX_SRC){
    if(k.indexOf("sk_" + setId + "_") !== 0) continue;
    const E = VFX_SPR_EXTRA[k]; if(E._imgs) continue;
    E._imgs = SKIN_FX_SRC[k].srcs.map(s=>{ const im = new Image(); im.src = s; return im; });
  }
}
for(const k in SKIN_FX_SRC){
  const setId = k.split("_")[1], E = { ground: SKIN_FX_SRC[k].ground, _imgs: null };
  Object.defineProperty(E, "imgs", { get(){ if(!E._imgs) skinFxLoadSet(setId); return E._imgs; } });
  E.ready = ()=>{ const a = E.imgs; return !!a && a.every(im=>im.complete && im.naturalWidth > 0); };
  VFX_SPR_EXTRA[k] = E;
}

/* ---- Plan por skin ----
   tint: color de la skin (null = se respeta el color elemental del kit, p.ej. el Mago).
   basic / 0 / 1 / 2 / ult: pasos {c: clip, m: modo, h: alto en px, d: ms, n: copias}
     modos: front (delante, girado hacia donde mira) · self (sobre el guardián, lo sigue) ·
            feet (en el piso del guardián) · aim (punto de impacto: zonas/trampas/cadenas que creó
            el lanzamiento; si no hay, el enemigo apuntado o delante) · proj (arte del proyectil) ·
            origin / dest (antes / después de un salto). */
const SKIN_FX_PLAN = {
  manada: { tint:"#ff7a1e",                               // Sylva, Flecha de Fuego
    basic:[{c:"arrow", m:"proj", h:2.2}],
    0:[{c:"bigarrow", m:"proj", h:3.2}, {c:"burst", m:"front", h:60, d:360}],
    1:[{c:"sigil", m:"aim", h:54, d:900}, {c:"burst", m:"aim", h:64, d:420}],
    2:[{c:"rain", m:"aim", h:110, d:900, fps:6}],
    ult:[{c:"phoenix", m:"self", h:120, d:1100}, {c:"swirl", m:"aim", h:120, d:800}] },
  errante: { tint:"#ff4468",                              // Musashi, Samurái Legendario
    basic:[{c:"slash", m:"front", h:52, d:220}],
    0:[{c:"bigslash", m:"front", h:78, d:320}],
    1:[{c:"petals", m:"origin", h:34, d:700, fps:8}, {c:"petals", m:"dest", h:34, d:700, fps:8}],
    2:[{c:"cuts", m:"aim", h:86, d:700, fps:9}, {c:"burst", m:"aim", h:70, d:500}],
    ult:[{c:"ring", m:"feet", h:60, d:1200}, {c:"pillar", m:"self", h:150, d:1000}] },
  legion: { tint:"#e0a060",                               // Eren, Titán Bestia
    0:[{c:"streak", m:"front", h:18, d:300}],
    1:[{c:"ring", m:"feet", h:40, d:800}],
    2:[{c:"spikes", m:"dest", h:84, d:600}],
    ult:[{c:"bigring", m:"feet", h:70, d:1100}, {c:"quake", m:"self", h:130, d:900}] },
  sistema: { tint:"#e040ff",                              // Axiom, Skin Z
    basic:[{c:"orb", m:"proj", h:2.6}],
    0:[{c:"eye", m:"aim", h:46, d:900}, {c:"sigil", m:"aim", h:60, d:700}],
    1:[{c:"pillar", m:"self", h:110, d:700}],
    2:[{c:"portal", m:"origin", h:100, d:600}, {c:"shard", m:"dest", h:70, d:600}],
    ult:[{c:"bigpillar", m:"self", h:160, d:1200}, {c:"cube", m:"aim", h:90, d:900}] },
  profecia: { tint:"#b45cff",                             // La Profeta, Ángel Caído
    basic:[{c:"slash", m:"front", h:52, d:220}],
    0:[{c:"cross", m:"feet", h:60, d:1000}, {c:"beams", m:"self", h:110, d:800, fps:6}],
    1:[{c:"sigil", m:"self", h:96, d:1000}],
    2:[{c:"spin", m:"self", h:84, d:600, fps:10}],
    ult:[{c:"eruption", m:"feet", h:120, d:1300}, {c:"swords", m:"self", h:120, d:1200, fps:5}, {c:"star", m:"aim", h:90, d:900}] },
  convergencia: { tint:null, glow:"#ffe9a8",              // Mago, Ángel Arcano (fuego/hielo/rayo se leen igual, en su versión celestial)
    basic:[{c:"star", m:"proj", h:3.0}],
    0:[{c:"flames", m:"aim", h:96, d:1400, fps:8, n:6}],
    1:[{c:"icering", m:"feet", h:70, d:900}, {c:"crown", m:"self", h:90, d:700}],
    2:[{c:"spark", m:"aim", h:54, d:420, fps:12}],
    ult:[{c:"rune", m:"aim", h:110, d:1400}, {c:"light", m:"aim", h:150, d:1200, fps:6}] },
  marea: { tint:"#ff3030",                                // Segador, Leónidas
    basic:[{c:"slash", m:"front", h:40, d:220}],
    0:[{c:"bigslash", m:"front", h:84, d:340}],
    1:[{c:"whirl", m:"feet", h:56, d:1000}, {c:"star", m:"self", h:70, d:500}],
    2:[{c:"burst", m:"self", h:96, d:600, fps:6}, {c:"vortex", m:"feet", h:70, d:800}],
    ult:[{c:"spears", m:"self", h:130, d:1400, fps:5}, {c:"whirl", m:"feet", h:80, d:1400}] },
  nocturno: { tint:"#e0213a",                             // Asesino, Jack el Destripador
    basic:[{c:"slash", m:"front", h:48, d:220}],
    0:[{c:"bigslash", m:"front", h:70, d:300}, {c:"blood", m:"aim", h:40, d:500}],
    1:[{c:"triple", m:"front", h:74, d:380}],
    2:[{c:"sigil", m:"aim", h:56, d:1400}, {c:"star", m:"aim", h:50, d:400}],
    ult:[{c:"mist", m:"self", h:90, d:1400, fps:4}] },
  custodio: { tint:"#ff8fb8",                             // Sanadora, Ángel del Alba
    basic:[{c:"orb", m:"proj", h:3.0}],
    0:[{c:"cross", m:"feet", h:76, d:1100}, {c:"pillars", m:"self", h:110, d:900, fps:6}],
    1:[{c:"heart", m:"self", h:70, d:900}],
    2:[{c:"shield", m:"self", h:80, d:1000, fps:6}],
    ult:[{c:"dome", m:"feet", h:120, d:1500}, {c:"bigcross", m:"self", h:110, d:1100}] },
};

// ---- color de la skin (conversión HSL, con caché) ----
const _skinTintCache = {};
function _hexRgb(h){ h = h.replace("#",""); if(h.length===3) h = h.split("").map(c=>c+c).join(""); const n = parseInt(h, 16); return [(n>>16)&255, (n>>8)&255, n&255]; }
function _rgbHsl(r, g, b){ r/=255; g/=255; b/=255; const mx = Math.max(r,g,b), mn = Math.min(r,g,b), l = (mx+mn)/2; let h = 0, s = 0;
  if(mx !== mn){ const d = mx-mn; s = l > 0.5 ? d/(2-mx-mn) : d/(mx+mn);
    h = mx===r ? (g-b)/d + (g<b?6:0) : mx===g ? (b-r)/d + 2 : (r-g)/d + 4; h /= 6; }
  return [h, s, l]; }
function _hslRgb(h, s, l){ if(s===0){ const v = Math.round(l*255); return [v,v,v]; }
  const f = (p, q, t)=>{ if(t<0) t+=1; if(t>1) t-=1; return t<1/6 ? p+(q-p)*6*t : t<1/2 ? q : t<2/3 ? p+(q-p)*(2/3-t)*6 : p; };
  const q = l < 0.5 ? l*(1+s) : l+s-l*s, p = 2*l-q; return [f(p,q,h+1/3), f(p,q,h), f(p,q,h-1/3)].map(v=>Math.round(v*255)); }
// Mismo brillo del color original, con el tono de la skin (blanco sigue blanco: es el alma del efecto).
function skinTintColor(col, tint){
  if(typeof col !== "string" || !tint) return col;
  const key = tint + col; if(_skinTintCache[key] !== undefined) return _skinTintCache[key];
  let rgb = null, fmt = 0;
  if(col[0] === "#" && (col.length === 7 || col.length === 4)) rgb = _hexRgb(col);
  else if(/^\d+\s*,\s*\d+\s*,\s*\d+$/.test(col)){ rgb = col.split(",").map(Number); fmt = 1; }
  if(!rgb) return (_skinTintCache[key] = col);
  const [, s, l] = _rgbHsl(rgb[0], rgb[1], rgb[2]), T = _rgbHsl(..._hexRgb(tint));
  const out = _hslRgb(T[0], Math.max(s*0.5, T[1]*(l > 0.86 ? 0.35 : 0.9)), l);
  return (_skinTintCache[key] = fmt ? out.join(",") : "#" + out.map(v=>v.toString(16).padStart(2,"0")).join(""));
}
const SKIN_FX_KEEP_PAL = new Set(["blood","flesh","bone","rot","rock","gore"]);
let SKIN_TINT = null;   // activo solo mientras dura un lanzamiento con skin

function skinFxOf(h){
  if(!h || !h.classKey || typeof activeSetSkin !== "function") return null;
  const d = activeSetSkin(h); if(!d) return null;
  for(const setId in SET_SKINS){ if(SET_SKINS[setId] === d){ const P = SKIN_FX_PLAN[setId]; return P ? {setId, P} : null; } }
  return null;
}

// Ráfagas y ondas del VFX central: el color viaja en los argumentos (los invitados lo reciben igual).
(function(){
  const burst = window.vfxBurst, shock = window.vfxShock, conv = window.vfxConverge, heroRgb = window.fxHeroRgb;
  window.vfxBurst = function(x, y, n, pal, ...rest){
    if(SKIN_TINT && !SKIN_FX_KEEP_PAL.has(pal)) pal = "t_" + SKIN_TINT;
    return burst.call(this, x, y, n, pal, ...rest);
  };
  window.vfxShock = function(x, y, r0, r1, rgb, ...rest){
    if(SKIN_TINT) rgb = skinTintColor(rgb, SKIN_TINT);
    return shock.call(this, x, y, r0, r1, rgb, ...rest);
  };
  if(conv) window.vfxConverge = function(x, y, pal, ...rest){
    if(SKIN_TINT && !SKIN_FX_KEEP_PAL.has(pal)){ pal = "t_" + SKIN_TINT; if(!VFX_PAL[pal]) _vfxPalFromKey(pal); }
    return conv.call(this, x, y, pal, ...rest);
  };
  // destello de lanzamiento / color de identidad del guardián
  window.fxHeroRgb = function(h){
    const s = skinFxOf(h);
    if(s && (s.P.glow || s.P.tint)) return hexToRgb(s.P.glow || s.P.tint);
    return heroRgb(h);
  };
})();

// ---- colocación de los efectos ----
function _skinFxArrays(){
  const out = [];
  try{ out.push(["fireWalls", fireWalls]); }catch(e){}
  try{ out.push(["traps", traps]); }catch(e){}
  try{ out.push(["axiomZones", axiomZones]); }catch(e){}
  try{ out.push(["sylvaRainZones", sylvaRainZones]); }catch(e){}
  try{ out.push(["chainFX", chainFX]); }catch(e){}
  try{ out.push(["sparkFX", sparkFX]); }catch(e){}
  try{ out.push(["asesinoFx", asesinoFx]); }catch(e){}
  return out;
}
function _skinFxSnap(){
  const s = {particles: particles.length, projectiles: projectiles.length, arr: []};
  for(const [, a] of _skinFxArrays()) s.arr.push([a, a.length]);
  return s;
}
function _skinFxAimPoints(caster, snap){
  const pts = [];
  for(const [a, n0] of snap.arr){
    for(let i=n0; i<a.length && pts.length<4; i++){
      const z = a[i]; if(!z) continue;
      if(z.x2 !== undefined) pts.push({x:z.x2, y:z.y2, r:0});
      else if(z.x !== undefined) pts.push({x:z.x, y:z.y, r:z.outerR || z.radius || 0});
    }
  }
  if(!pts.length){
    const t = typeof nearestEnemyTo === "function" ? nearestEnemyTo(caster, 360) : null;
    if(caster.aim && caster.aim.x !== undefined) pts.push({x:caster.aim.x, y:caster.aim.y, r:0});
    else if(t) pts.push({x:t.x, y:t.y, r:0});
    else pts.push({x:caster.x + (caster.fx||1)*110, y:caster.y + (caster.fy||0)*110, r:0});
  }
  return pts;
}
function _skinFxPlay(key, x, y, st, o){
  const fps = st.fps || 0, ground = VFX_SPR_EXTRA[key] && VFX_SPR_EXTRA[key].ground;
  vfxSprite(key, 0, x, y, st.h, st.d || 500, o.follow || null, o.grow === undefined ? 0.25 : o.grow,
            !!o.flip, o.anchorY !== undefined ? o.anchorY : (ground ? 0.5 : 0.85), fps, 0, 0, o.rot || 0);
}
function skinFxRun(caster, steps, setId, snap, pre){
  if(!steps) return;
  const ang = Math.atan2(caster.fy || 0, caster.fx || 1);
  // mirando a la izquierda el guardián se dibuja ESPEJADO (champPackDrawFrame): el efecto también se
  // espeja en vez de girar 180° (un tajo girado quedaría patas arriba) y lo que va sobre él lo sigue.
  const left = caster._pleft !== undefined ? !!caster._pleft : (caster.fx || 0) < -0.12;
  const frontRot = left ? ang - Math.PI : ang;
  for(const st of steps){
    const key = "sk_" + setId + "_" + st.c; if(!VFX_SPR_EXTRA[key]) continue;
    switch(st.m){
      case "proj":
        for(let i=snap.projectiles; i<projectiles.length; i++){
          const p = projectiles[i]; if(!p || p.enemy || (p.src && p.src !== caster)) continue;
          p.sprite = key; p.sprH = st.h;
        }
        break;
      case "front": {
        const d = st.dist || 34;
        _skinFxPlay(key, caster.x + Math.cos(ang)*d, caster.y + Math.sin(ang)*d - 14, st, {rot:frontRot, flip:left, grow:0.15, anchorY:0.5});
        break; }
      case "self": _skinFxPlay(key, caster.x, caster.y + 6, st, {follow:caster, flip:left}); break;
      case "feet": _skinFxPlay(key, caster.x, caster.y + 4, st, {follow:caster, anchorY:0.5, flip:left}); break;
      case "origin": _skinFxPlay(key, pre.x, pre.y + 6, st, {flip:left}); break;
      case "dest": _skinFxPlay(key, caster.x, caster.y + 6, st, {flip:left}); break;
      case "aim": {
        const pts = _skinFxAimPoints(caster, snap);
        const n = st.n || 1;
        for(const q of pts.slice(0, 3)){
          if(n > 1 && q.r > 20){   // anillo (Muro de Fuego): copias alrededor del borde
            for(let k=0;k<n;k++){ const a = k/n*Math.PI*2; _skinFxPlay(key, q.x + Math.cos(a)*q.r, q.y + Math.sin(a)*q.r*0.62, st, {}); }
          } else _skinFxPlay(key, q.x, q.y + 4, st, {});
        }
        break; }
    }
  }
}
// Tiñe lo que el lanzamiento dejó en partículas y proyectiles (misma forma, color de la skin).
function _skinFxRecolor(snap, caster, tint){
  if(!tint) return;
  for(let i=snap.particles; i<particles.length; i++){
    const p = particles[i]; if(!p || p.blood || p.gore) continue;
    if(p.color) p.color = skinTintColor(p.color, tint);
  }
  for(let i=snap.projectiles; i<projectiles.length; i++){
    const p = projectiles[i]; if(!p || p.enemy || (p.src && p.src !== caster)) continue;
    if(p.color) p.color = skinTintColor(p.color, tint);
  }
}

// Envoltorios: el lanzamiento corre igual; antes se toma una foto de las listas y después se
// decora lo nuevo. Sin skin activa no hacen nada más que llamar al original.
(function(){
  const cast = castAbility, basic = triggerBasic;
  window.castAbility = function(caster, sk, isUlt, idx){
    const s = caster && caster.alive !== false ? skinFxOf(caster) : null;
    if(!s) return cast.apply(this, arguments);
    const snap = _skinFxSnap(), pre = {x:caster.x, y:caster.y}, prevTint = SKIN_TINT;
    skinFxLoadSet(s.setId);
    SKIN_TINT = s.P.tint || null;
    let r;
    try{ r = cast.apply(this, arguments); }
    finally{
      SKIN_TINT = prevTint;
      try{
        _skinFxRecolor(snap, caster, s.P.tint);
        skinFxRun(caster, s.P[isUlt ? "ult" : (idx===undefined ? 0 : idx)], s.setId, snap, pre);
      }catch(e){ console.warn("skin-fx", e); }
    }
    return r;
  };
  window.triggerBasic = function(caster){
    const h = caster || player;
    const s = h && h.alive ? skinFxOf(h) : null;
    if(!s) return basic.apply(this, arguments);
    const cd0 = h.basicCd, snap = _skinFxSnap(), prevTint = SKIN_TINT;
    SKIN_TINT = s.P.tint || null;
    let r;
    try{ r = basic.apply(this, arguments); }
    finally{
      SKIN_TINT = prevTint;
      if(h.basicCd > (cd0||0) + 1){   // hubo golpe/disparo
        try{ _skinFxRecolor(snap, h, s.P.tint); skinFxRun(h, s.P.basic, s.setId, snap, {x:h.x, y:h.y}); }catch(e){ console.warn("skin-fx", e); }
      }
    }
    return r;
  };
})();
// Al empezar la partida se bajan de antemano los efectos de las skins en juego.
(function(){
  const start = window.startRun; if(typeof start !== "function") return;
  window.startRun = function(){
    const r = start.apply(this, arguments);
    try{ for(const h of (typeof heroes !== "undefined" ? heroes : [player])){ const s = skinFxOf(h); if(s) skinFxLoadSet(s.setId); } }catch(e){}
    return r;
  };
})();
