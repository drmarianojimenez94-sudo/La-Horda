"use strict";
/* ============================================================
   js/systems/skill-evolution.js
   IDENTIDAD POR CAMPEÓN + EVOLUCIÓN DE HABILIDADES (Nv. 1 / 3 / 5 / 7 / 10).
   Antes subir una habilidad era solo "más número" (daño, área, cooldown). Ahora cada hito
   cambia CÓMO juega la habilidad, con la firma propia del campeón:
     Nv.1   la habilidad base.
     Nv.3   FIRMA        los golpes de la habilidad dejan el estado propio del campeón (sangrado del
                         Asesino, aturdida del Tanque, quemadura/escarcha/descarga del Mago según el
                         elemento, marca de la Cazadora...). Esos estados habilitan las REACCIONES
                         de los compañeros (hielo + golpe pesado, sangrado + golpe pesado...).
     Nv.5   ÍMPETU       rematar con la habilidad le recorta 25% del enfriamiento restante (una vez
                         por lanzamiento). En la ulti: devuelve algo de carga.
     Nv.7   RESONANCIA   golpear con la habilidad a un enemigo que YA tiene tu firma lo hace estallar
                         (25% del golpe alrededor, del color del campeón).
     Nv.10  FORMA FINAL  cada 3er lanzamiento sale potenciado: +50% de poder, +20% de área y un
                         destello propio.
   Los tiers visuales de ability-vfx.js usan los mismos hitos (tierOf: 3/5/7).
   IDENTIDAD: cada campeón tiene su forma de proyectil y estela (flecha, daga, orbe, runa,
   glifo, bala con humo, alma...), además del color y la paleta de impacto que ya tenía.
   Todo corre donde corre la simulación (anfitrión); los invitados lo ven por lo replicado.
   >>> Balance: EVO_CFG y CHAMP_IDENTITY.
   ============================================================ */
const EVO_MILESTONES = [3, 5, 7, 10];
const EVO_CFG = {castWindow:3000, impetuCdCut:0.25, ultRefund:0.08, ultRefundMax:0.25, resoPct:0.25, resoR:72, resoIcd:350, finalEvery:3, finalPower:1.5, finalArea:1.2};
// sig: estado propio · proj: forma del proyectil
const CHAMP_IDENTITY = {
  tanque:     {sig:"stagger", proj:"slug"},
  guerrero:   {sig:"bleed",   proj:"dagger"},
  mago:       {sig:"element", proj:"orb"},
  soporte:    {sig:"mark",    proj:"wisp"},
  segador:    {sig:"bleed",   proj:"crescent"},
  axiom:      {sig:"shock",   proj:"glyph"},
  profeta:    {sig:"mark",    proj:"rune"},
  musashi:    {sig:"bleed",   proj:"dagger"},
  cazadora:   {sig:"mark",    proj:"arrow"},
  nigromante: {sig:"wither",  proj:"soul"},
  libertador: {sig:"stagger", proj:"bullet"},
  eren:       {sig:"bleed",   proj:"dagger"}
};
const EVO_SIG_LABEL = {stagger:"aturde", bleed:"sangrado", burn:"quemadura", chill:"escarcha", shock:"descarga", mark:"marca (+10% daño recibido)", wither:"marchitar (+10% daño recibido)", element:"estado de su elemento"};

function evoLevelOf(classKey, key){
  if(!classKey || !save.champions[classKey]) return 0;
  return allocLevel(effectiveMasteryFor(classKey, key));
}
function evoSigFor(h, sk){
  const id = CHAMP_IDENTITY[h.classKey]; if(!id) return null;
  if(id.sig!=="element") return id.sig;
  const el = sk && sk.element;
  return el==="ice" ? "chill" : el==="lightning" ? "shock" : "burn";
}
// Al lanzar: nivel efectivo, contador para la Forma final y ventana en la que los golpes cuentan
// como "de esta habilidad". Devuelve los multiplicadores de poder/área para castAbility.
function skillEvoOnCast(caster, key, sk, isUlt){
  const out = {power:1, area:1};
  if(!caster || !caster.classKey || divinaMode) return out;
  const lvl = evoLevelOf(caster.classKey, key);
  const cnt = caster._evoCount || (caster._evoCount = {});
  cnt[key] = (cnt[key]||0) + 1;
  const final = lvl >= 10 && cnt[key] % EVO_CFG.finalEvery === 0;
  caster._evo = {lvl, key, sk, isUlt:!!isUlt, at:runElapsedMs, cdDone:false, refund:0, final};
  if(final){
    out.power = EVO_CFG.finalPower; out.area = EVO_CFG.finalArea;
    const rgb = hexToRgb(caster.cls.glow||"#ffffff");
    vfxShock(caster.x, caster.y, 12, 120, rgb, 520, caster===player ? 2 : 1);
    vfxBurst(caster.x, caster.y-24, 16, (animProfileOf(caster).particle||"spark"), 170, 520, 3.5, caster===player ? 2 : 0, -40, 1);
    if(caster===player) floatText(caster.x, caster.y-64, "★ FORMA FINAL", "crit");
    if(caster===player || inView(caster.x, caster.y, 0)) playSfx("skillHit");
  }
  return out;
}
function _evoActive(src, opts){
  if(!src || !src.classKey || !src._evo || opts.fromBasic || opts.fromProc || opts.fromReaction) return null;
  const ev = src._evo;
  return runElapsedMs - ev.at <= EVO_CFG.castWindow ? ev : null;
}
function evoHasSig(e, sig, src){
  switch(sig){
    case "bleed": return e.bleedTimer > 0;
    case "burn": return e.burnTimer > 0;
    case "chill": return e.slowTimer > 0 && (e.slowAmt||0) >= 0.25;
    case "shock": return e.shockedTimer > 0;
    case "stagger": return (e._evoStagT||0) > runElapsedMs;
    case "mark": case "wither": return (e._evoMarkT||0) > runElapsedMs;
  }
  return false;
}
function evoApplySig(e, sig, src){
  const base = src.baseDmg * runStats.dmgMult * (src.buffDmgMult||1);
  const big = e.rank==="jefe" || e.rank==="subjefe";
  switch(sig){
    case "bleed": e.bleedTimer = Math.max(e.bleedTimer||0, 2500); e.bleedDmg = Math.max(e.bleedDmg||0, base*0.25); e.bleedSrc = src; break;
    case "burn": e.burnTimer = Math.max(e.burnTimer||0, 2200); e.burnDmg = Math.max(e.burnDmg||0, base*0.25); e.burnSrc = src; break;
    case "chill": e.slowAmt = Math.max(e.slowAmt||0, 0.3); e.slowTimer = Math.max(e.slowTimer||0, 1400); e.slowBy = src; break;
    case "shock": e.shockedTimer = Math.max(e.shockedTimer||0, 1500); if(!big && e.rank!=="elite") e.stunTimer = Math.max(e.stunTimer||0, 160); break;
    case "stagger": e._evoStagT = runElapsedMs + 1200; if(!big && e.rank!=="elite") e.stunTimer = Math.max(e.stunTimer||0, 220); else { e.slowAmt = Math.max(e.slowAmt||0, 0.2); e.slowTimer = Math.max(e.slowTimer||0, 900); } break;
    case "mark": case "wither": e._evoMarkT = runElapsedMs + 3000; e._evoMarkBy = src; e._evoMarkKind = sig; break;
  }
}
// Marca/marchitar: +10% de daño recibido (lo lee damageEnemy).
function evoDmgTakenMult(e){ return (e._evoMarkT||0) > runElapsedMs ? 1.1 : 1; }
// Tras un golpe de habilidad (lo llama damageEnemy).
function skillEvoOnHit(src, e, dmg, opts){
  const ev = _evoActive(src, opts); if(!ev || ev.lvl < 3) return;
  e._evoHitBy = src; e._evoHitAt = runElapsedMs;
  const sig = evoSigFor(src, ev.sk);
  // Nv.7 Resonancia: el enemigo ya tenía tu firma -> estalla (mira el estado ANTES de renovarlo)
  if(ev.lvl >= 7 && e.alive && evoHasSig(e, sig, src) && (src._evoResoAt===undefined || runElapsedMs - src._evoResoAt > EVO_CFG.resoIcd)){
    src._evoResoAt = runElapsedMs;
    const R = EVO_CFG.resoR, d = dmg*EVO_CFG.resoPct;
    for(const o of enemies){ if(!o.alive || Math.hypot(o.x-e.x, o.y-e.y) > R) continue; damageEnemy(o, d, {src, fromProc:true}); }
    if(inView(e.x, e.y, 40)){ vfxShock(e.x, e.y, 6, R, hexToRgb(src.cls.glow||"#ffffff"), 300, src===player ? 1 : 0); vfxBurst(e.x, e.y-16, 8, (animProfileOf(src).particle||"spark"), 150, 320, 3, src===player ? 1 : 0, -20, 0); }
  }
  if(e.alive) evoApplySig(e, sig, src);
}
// Al morir un enemigo (lo llama killEnemy): Nv.5 Ímpetu.
function skillEvoOnKill(e){
  const src = e._evoHitBy; if(!src || !src._evo || e._evoHitAt===undefined || runElapsedMs - e._evoHitAt > 400) return;
  const ev = src._evo; if(ev.lvl < 5 || runElapsedMs - ev.at > EVO_CFG.castWindow) return;
  if(ev.isUlt){
    if(ev.refund >= EVO_CFG.ultRefundMax) return;
    const r = Math.min(EVO_CFG.ultRefund, EVO_CFG.ultRefundMax - ev.refund); ev.refund += r;
    src.ultCharge = Math.min(src.ultMax, (src.ultCharge||0) + src.ultMax*r);
    return;
  }
  if(ev.cdDone || !src.cds || typeof ev.key!=="number") return;
  ev.cdDone = true;
  src.cds[ev.key] = (src.cds[ev.key]||0) * (1 - EVO_CFG.impetuCdCut);
  if(src===player) floatText(src.x, src.y-48, "ímpetu", null);
}
// Texto de los hitos para la UI de habilidades.
function skillEvoLines(classKey, sk, idx){
  const sig = evoSigFor({classKey}, sk), isUlt = idx==="ult";
  return [
    {lvl:3, name:"Firma", txt:`sus golpes dejan ${EVO_SIG_LABEL[sig]||sig}`},
    {lvl:5, name:"Ímpetu", txt: isUlt ? "cada baja devuelve 8% de carga (hasta 25%)" : "rematar con ella recorta 25% su enfriamiento"},
    {lvl:7, name:"Resonancia", txt:"golpear a un enemigo con tu firma lo hace estallar"},
    {lvl:10, name:"Forma final", txt:"cada 3er lanzamiento: +50% poder y +20% área"}
  ];
}
function skillEvoHTML(classKey, sk, idx, lvl){
  // en celular no hay "hover": se lee siempre el texto del PRÓXIMO hito; los demás, por título
  const lines = skillEvoLines(classKey, sk, idx), next = lines.find(l=>lvl < l.lvl);
  return `<div class="evo-lines">` + lines.map(l=>`<span class="evo ${lvl>=l.lvl?"on":""} ${l===next?"next":""}" title="${l.txt}">Nv.${l.lvl} ${l.name}<i>: ${l.txt}</i></span>`).join("") + `</div>`;
}

/* ---- Proyectiles con identidad (los dibuja entities.js) ---- */
function projStyleOf(p){
  if(p.enemy || p.projStyle===null) return null;
  if(p.projStyle) return p.projStyle;
  const s = p.src; const id = s && s.classKey && CHAMP_IDENTITY[s.classKey];
  return id ? id.proj : null;
}
// Dibuja la forma propia (ya con la estela genérica de fondo). Devuelve false si no hay estilo.
function drawProjStyle(p, style, r){
  const ang = Math.atan2(p.vy||0, p.vx||0), c = p.color || "#ffffff", t = animNow;
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(ang);
  switch(style){
    case "arrow":
      ctx.fillStyle = "#e8e0c8"; ctx.fillRect(-r*2.6, -1, r*3.2, 2);
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(r*1.4, 0); ctx.lineTo(r*0.4, -r*0.7); ctx.lineTo(r*0.4, r*0.7); ctx.closePath(); ctx.fill();
      ctx.fillRect(-r*2.8, -r*0.6, r*0.6, r*0.35); ctx.fillRect(-r*2.8, r*0.25, r*0.6, r*0.35);
      break;
    case "dagger":
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(r*1.8, 0); ctx.lineTo(-r*0.6, -r*0.45); ctx.lineTo(-r*0.6, r*0.45); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, -0.5, r*1.4, 1);
      break;
    case "orb": {
      const k = 1 + 0.18*Math.sin(t/60);
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, r*0.8*k, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.fillRect(-r*0.25, -r*0.25, r*0.5, r*0.5);
      ctx.fillStyle = c; for(let i=0;i<3;i++){ const a = t/120 + i*2.1; ctx.fillRect(Math.cos(a)*r*1.4-1, Math.sin(a)*r*1.4-1, 2, 2); }
      break;
    }
    case "wisp":
      ctx.globalAlpha = 0.8; ctx.strokeStyle = c; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, r*1.1, 0, Math.PI*2); ctx.stroke();
      ctx.globalAlpha = 1; ctx.fillStyle = "#ffffff"; ctx.fillRect(-r*0.3, -r*0.3, r*0.6, r*0.6);
      break;
    case "crescent":
      ctx.strokeStyle = c; ctx.lineWidth = Math.max(2, r*0.5); ctx.beginPath(); ctx.arc(-r*0.4, 0, r*1.2, -1.1, 1.1); ctx.stroke();
      break;
    case "glyph":
      ctx.rotate(t/140 - ang); ctx.strokeStyle = c; ctx.lineWidth = 1.5; ctx.strokeRect(-r*0.8, -r*0.8, r*1.6, r*1.6);
      ctx.fillStyle = "#ffffff"; ctx.fillRect(-r*0.3, -r*0.3, r*0.6, r*0.6);
      ctx.rotate(-(t/140 - ang)); ctx.globalAlpha = 0.6; ctx.fillStyle = c; for(let i=1;i<=3;i++) ctx.fillRect(-r*1.3*i-1, -1, 2, 2);
      break;
    case "rune":
      ctx.rotate(t/220 - ang); ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(0, -r*1.2); ctx.lineTo(r*0.8, 0); ctx.lineTo(0, r*1.2); ctx.lineTo(-r*0.8, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#ffffff"; ctx.fillRect(-1, -r*0.6, 2, r*1.2);
      break;
    case "soul": {
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(r*0.3, 0, r*0.75, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 0.55; for(let i=1;i<=4;i++){ ctx.fillRect(-r*0.6*i, Math.sin(t/70 + i)*r*0.5 - 1, 2.5, 2.5); }
      ctx.globalAlpha = 1; ctx.fillStyle = "#0a1a10"; ctx.fillRect(r*0.1, -r*0.3, 2, 2); ctx.fillRect(r*0.5, -r*0.3, 2, 2);
      break;
    }
    case "bullet":
      ctx.fillStyle = "#fff4c8"; ctx.fillRect(-r*0.5, -r*0.3, r*1.2, r*0.6);
      ctx.globalAlpha = 0.35; ctx.fillStyle = "#bdb4a8"; for(let i=1;i<=3;i++){ const s = 2 + i; ctx.fillRect(-r*1.4*i - s/2, Math.sin(t/90 + i*1.7)*1.5 - s/2, s, s); }
      break;
    case "slug":
      ctx.fillStyle = c; ctx.fillRect(-r*0.9, -r*0.7, r*1.8, r*1.4);
      ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.fillRect(r*0.2, -r*0.3, r*0.5, r*0.6);
      break;
    default: ctx.restore(); return false;
  }
  ctx.restore();
  return true;
}
