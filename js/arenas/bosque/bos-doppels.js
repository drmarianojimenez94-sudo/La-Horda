"use strict";
/* ============================================================
   js/arenas/bosque/bos-doppels.js
   BOSS IDENTITY — LOS DOPPELGÄNGERS (subjefes, nivel 9 de las Ruinas). REGLA: CADA SOMBRA ES EL ECO DE UNA RUNA.
   Ficha: BOSS_BLUEPRINTS.doblador_guerrero (js/arenas/common/boss-blueprints.js).
   Al aparecer, cada Doppelgänger se ATA a un menhir rúnico del círculo y lo enciende (rojo). Mientras su
   runa arda, una cuerda roja los une y la sombra recibe menos daño (−40 %). CONTENER esa runa (la acción
   de siempre de las Ruinas, "Contener") rompe el lazo: la sombra queda EXPUESTA y pierde el escudo para
   siempre. La decisión es la del Bosque (contener runas) pero ahora es táctica: a quién desatás primero
   (el Clérigo cura a los demás).
   Anfitrión: decide el lazo y la exposición. El estado de las runas y el lazo (r.dop, por índice de tipo)
   viajan en bosNetState, así el invitado también ve la cuerda roja.
   ============================================================ */
const BOS_DOP = { shield:0.6, exposeMs:3500, exposeMult:1.5,
  types:["doblador_guerrero", "doblador_arquera", "doblador_picaro", "doblador_clerigo"],
  label:{doblador_guerrero:"GUERRERO", doblador_arquera:"ARQUERA", doblador_picaro:"PÍCARO", doblador_clerigo:"CLÉRIGO"} };
function bosDoppelOf(r){ return r.dop ? enemies.find(e=>e.alive && e.type===r.dop) || null : null; }
// Llamado al aparecer los cuatro (update.js): cada uno toma la runa libre más cercana y la enciende.
function bosDoppelBind(list){
  if(currentArena!=="bosque" || !BOS.runes.length) return;
  const free = BOS.runes.slice();
  let n = 0;
  for(const e of list){
    if(!e || !free.length) continue;
    let bi = 0, bd = Infinity;
    free.forEach((r, i)=>{ const d = Math.hypot(r.x - e.x, r.y - e.y); if(d < bd){ bd = d; bi = i; } });
    const r = free.splice(bi, 1)[0];
    bosSetState(r, "active"); r.dop = e.type; r.flash = 700;
    vfxShock(r.x, r.y, 20, 200, "230,60,50", 600, 2);
    vfxTelegraph({shape:2, x:r.x, y:r.y, dx:(e.x - r.x)/(bd||1), dy:(e.y - r.y)/(bd||1), len:bd, r:8, dur:700, rgb:"230,60,50"});
    n++;
  }
  if(n){
    playSfx("bosRuneFire");
    showBanner("Cada sombra está ATADA a una runa: CONTENELA para exponerla");
    bossArenaEvent("doblador_guerrero.runas", list[0]);
    if(typeof tutSay==="function" && !tutSeen("bos_dop_runes")) tutSay("bos_dop_runes", "Los Doppelgängers son ecos de las runas: mientras su runa arda, reciben menos daño. CONTENÉ la runa atada (la cuerda roja) y esa sombra queda EXPUESTA.", null, 11000, true);
  }
}
// Cada frame (bosUpdate, anfitrión): escudo mientras la runa arde; al contenerla, exposición.
function bosDoppelRule(){
  for(const r of BOS.runes){
    if(!r.dop) continue;
    const e = bosDoppelOf(r);
    if(!e){ r.dop = null; continue; }
    if(bosIsLit(r) || r.st==="arming"){
      if(!(e._expT > 0)){ e._encMult = BOS_DOP.shield; e._encTag = "ATADO A SU RUNA (−40 %)"; }
    } else {
      r.dop = null; e._encMult = 1; e._encTag = null;
      bossExpose(e, BOS_DOP.exposeMs, BOS_DOP.exposeMult, "ᛉ ¡RUNA CONTENIDA! " + (BOS_DOP.label[e.type] || "La sombra") + " queda EXPUESTO");
      bossArenaEvent("doblador_guerrero.contencion", e);
    }
  }
}
// Cuerda roja runa → sombra (se dibuja desde bosDrawTall, sobre el menhir).
function bosDoppelDrawTether(r, now){
  const e = bosDoppelOf(r); if(!e || !bosIsLit(r)) return;
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = `rgba(255,70,50,${0.35 + 0.2*Math.sin(now*6 + r.x)})`; ctx.lineWidth = 3; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -now*40;
  ctx.beginPath(); ctx.moveTo(r.mx, r.my - 70); ctx.lineTo(e.x, e.y - (e.radius||24)*1.6); ctx.stroke();
  ctx.restore();
}
