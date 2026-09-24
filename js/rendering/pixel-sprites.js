"use strict";
/* ============================================================
   js/rendering/pixel-sprites.js
   Sprites de pixel art procedural (canvas generados desde las grillas) y dibujo
   básico de personajes: contorno, luz de borde, sombra.
   ============================================================ */

// Copia de una paleta donde todo es blanco: sirve de silueta para el destello de impacto
function whitePal(pal){
  const out = {};
  Object.keys(pal).forEach(k=>{ out[k] = "#ffffff"; });
  return out;
}

// Silueta negra: se dibuja algo más grande detrás del sprite para darle contorno
function darkPal(pal){
  const out = {};
  Object.keys(pal).forEach(k=>{ out[k] = "#05060a"; });
  return out;
}

// Paleta filtrada que sólo pinta ciertas letras (equipo/heridas) en blanco y deja todo lo demás
// transparente: sirve para construir una capa extra de brillo pulsante sobre el sprite base.
function shinePal(pal, keys){
  const out = {};
  keys.forEach(k=>{ if(pal[k]) out[k] = "#ffffff"; });
  return out;
}
const SHINE_KEYS = {
  esqueleto:["h","s"], esqueleto_h:["h","s"], zombie:["w"],
  // Héroes: el brillo resalta el detalle mágico/metálico propio de cada clase (letras de las
  // paletas generadas para el rediseño de alta resolución)
  guerrero:["e","f","n"],  // brillo de ojos + filo de las dagas
  tanque:["e","n"],        // filo de la espada + acentos dorados del escudo/cinturón
  mago:["f","c"],          // orbe del bastón
  soporte:["d","p"],       // hoja luminosa del bastón sanador
  segador:["e","f"],       // ojos y aura carmesí, más intensos con Furia
  axiom:["e","f","n"]      // ojos, aura y cabello, todo con el mismo brillo cian intenso
};

// Al caminar hacia arriba sólo se ve la nuca: la cara y los ojos se pintan
// del color de la capucha/pelo, así el personaje se ve de espaldas.
const BACK_HEAD = {
  guerrero:"g", tanque:"f", mago:"h", soporte:"e",
  esqueleto:"a", esqueleto_h:"a", zombie:"n",
  demonio_menor:"b", golem:"b", demonio_mago:"t", demonio_mayor:"b"
};
// Letras que representan ojos/rostro a ocultar al ver al personaje de espaldas. Los 4 héroes
// nuevos usan paletas generadas por separado; los enemigos siguen con las letras clásicas.
const FACE_LETTERS = {
  guerrero:["e","f"], tanque:[], mago:[], soporte:[]
};
function backPal(pal, entityKey){
  const head = pal[BACK_HEAD[entityKey]] || pal.a || "#333333";
  const out = Object.assign({}, pal);
  const letters = FACE_LETTERS[entityKey] || ["s","t","g","w"];
  letters.forEach(k=>{ if(out[k]) out[k] = head; });
  return out;
}

function makeSpriteCanvas(rows, pal, opts){
  opts = opts||{};
  const res = opts.res || SPR;
  const amt = opts.amt || 1;   // magnitud de bob/lean/legShift, en píxeles de grilla (se duplica en sprites de mayor resolución)
  const c = document.createElement("canvas");
  c.width = res*SPR_PX; c.height = res*SPR_PX;
  const g = c.getContext("2d");
  const legRow = opts.legRow===undefined ? Math.round(res*0.75) : opts.legRow;
  for(let y=0;y<rows.length;y++){
    const row = rows[y];
    const bob = (opts.bob && y < legRow) ? -amt : 0;
    const lean = opts.lean ? opts.lean*amt : 0;
    const shift = (y >= legRow) ? ((opts.legShift||0)*amt) : lean;
    for(let x=0;x<row.length;x++){
      const ch = row[x];
      const col = pal[ch];
      if(ch==="." || !col) continue;
      g.fillStyle = col;
      g.fillRect((x+shift)*SPR_PX, (y+bob)*SPR_PX, SPR_PX, SPR_PX);
    }
  }
  return c;
}

const SPRITES = {};

const ENEMY_SPRITE = {
  esqueleto:"esqueleto", zombie:"zombie", esqueleto_h:"esqueleto_h",
  demonio_menor:"demonio_menor", golem:"golem", demonio_mago:"demonio_mago",
  demonio_mayor:"demonio_mayor"
};
function buildSprites(){
  const mk = (gridKey, palKey, hi) => {
    const pal = PAL[palKey], grid = GRIDS[gridKey];
    const bpal = backPal(pal, palKey);
    const base = hi ? {res:32, legRow:24, amt:2} : {};
    const walkOpts = [base, Object.assign({}, base, {legShift:1, bob:true}), base, Object.assign({}, base, {legShift:-1, bob:true})];
    return {
      walk: walkOpts.map(o=>makeSpriteCanvas(grid, pal, o)),
      back: walkOpts.map(o=>makeSpriteCanvas(grid, bpal, o)),
      attack: GRIDS[gridKey+"_atk"]
        ? makeSpriteCanvas(GRIDS[gridKey+"_atk"], pal, base)
        : makeSpriteCanvas(grid, pal, Object.assign({}, base, {lean:1, bob:true})),
      hurt: makeSpriteCanvas(grid, pal, Object.assign({}, base, {lean:-1})),
      flash: makeSpriteCanvas(grid, whitePal(pal), base),
      outline: makeSpriteCanvas(grid, darkPal(pal), base)
    };
  };
  Object.keys(CLASSES).forEach(key=>{ SPRITES[key] = mk(key, key, true); });
  Object.keys(ENEMY_SPRITE).forEach(type=>{ SPRITES["enemy_"+type] = mk(ENEMY_SPRITE[type], ENEMY_SPRITE[type]); });
  // Capa extra de brillo pulsante: arma/equipo de los héroes y de los enemigos que aparecen al principio
  Object.keys(SHINE_KEYS).forEach(type=>{
    if(CLASSES[type]){
      SPRITES[type].shine = makeSpriteCanvas(GRIDS[type], shinePal(PAL[type], SHINE_KEYS[type]), {res:32, legRow:24, amt:2});
    } else {
      const gridKey = ENEMY_SPRITE[type], pal = PAL[gridKey];
      SPRITES["enemy_"+type].shine = makeSpriteCanvas(GRIDS[gridKey], shinePal(pal, SHINE_KEYS[type]), {});
    }
  });
}

// Dibuja la silueta oscura un poco más grande por detrás: da contorno al sprite
function drawOutline(sp, x, y, scale, flip){
  if(!sp || !sp.outline) return;
  ctx.save();
  ctx.globalAlpha = 0.75*ANIM_ALPHA_MUL;
  drawSprite(sp.outline, x, y, scale*1.07, flip);
  ctx.restore();
}

// Capa extra de luz: una silueta clara, muy sutil y desplazada hacia
// la esquina superior-izquierda, que le da al pixel art una sensación
// de bisel/profundidad sin tener que rehacer cada sprite a mano.
function drawRimLight(sp, x, y, scale, flip){
  if(!sp || !sp.flash) return;
  ctx.save();
  ctx.globalAlpha = 0.20*ANIM_ALPHA_MUL;
  drawSprite(sp.flash, x-1, y-2, scale, flip);
  ctx.restore();
}

function drawSprite(img, x, y, scale, flip, tint){
  const w = img.width/SPR_PX*scale, h = img.height/SPR_PX*scale;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(x, y);
  if(flip) ctx.scale(-1,1);
  ctx.drawImage(img, -w/2, -h*0.74, w, h);
  ctx.restore();
}

function drawShadow(x, y, rx){
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath();
  ctx.ellipse(x, y+4, rx, rx*0.38, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
}
