"use strict";
/* ============================================================
   js/arenas/acuatica/acu-currents.js
   ARENA ACUÁTICA — "EL AGUA DECIDE HACIA DÓNDE VAS"

   Zonas de corriente que cambian con cada nivel (las decide el anfitrión):
   - LINEAL: una franja que arrastra en una dirección.
   - REMOLINO: tira hacia su centro girando (salir cuesta; sirve para juntar enemigos).
   - ANILLO: una corriente circular alrededor del centro de la arena.
   - CHORRO: una boca que avisa (1,1 s, línea) y dispara un empujón fuerte en línea recta.
   Las corrientes empujan a TODOS: héroes y enemigos (los jefes no se mueven). Usarlas a favor
   (arrastrar la horda, escapar rápido) es la idea.
   ZONAS CONDUCTORAS (charcos cargados): cada tanto avisan (círculo amarillo, 1,2 s) y
   descargan: a los héroes adentro les pega poco y los frena; a los enemigos les pega fuerte y
   los aturde. La Cadena Eléctrica de la anguila salta más lejos si el primer golpeado está
   parado en uno. Atraer a la horda al charco antes de la descarga = jugar con el agua.
   Red: el invitado aplica las corrientes a SU campeón (predicción) y el anfitrión no se lo
   corrige; enemigos, bots y chorros los mueve el anfitrión.
   Arte: procedural (sin sprites de corriente todavía, ver LA_HORDA_MISSING_ASSETS.md).
   ============================================================ */
const ACU_CFG = {
  lineal:   { len:440, w:110, push:78 },
  remolino: { r:150, pull:58, swirl:62 },
  anillo:   { r1:520, r2:650, push:52 },
  chorro:   { len:320, w:62, every:[6500, 9000], warn:1100, knock:150 },
  charco:   { r:108, every:[7500, 10500], warn:1200, heroPct:0.05, enemyPct:0.12, bossPct:0.015, stun:750 },
  enemyMult: 0.6
};
const ACU = { zones:[], seq:1, lvl:0 };

function acuRand(a, b){ return a + Math.random()*(b-a); }
function acuFreeSpot(margin, avoid){
  for(let t=0;t<40;t++){
    const a = Math.random()*Math.PI*2, r = Math.random()*760;
    const x = Math.cos(a)*r*1.18, y = Math.sin(a)*r*0.82;
    if(!aidInside(x, y, margin)) continue;
    if(ACU.zones.some(z=>Math.hypot(z.x-x, z.y-y) < (avoid||260))) continue;
    if(aidSolids.some(s=>Math.hypot(s.x-x, s.y-y) < s.r+60)) continue;
    return {x:Math.round(x), y:Math.round(y)};
  }
  return null;
}
function acuAdd(type, extra){
  const p = type==="anillo" ? {x:0, y:0} : acuFreeSpot(type==="lineal" ? 200 : 140, type==="anillo" ? 0 : 280);
  if(!p) return null;
  const a = Math.random()*Math.PI*2;
  const z = Object.assign({id:ACU.seq++, type, x:p.x, y:p.y, dx:Math.cos(a), dy:Math.sin(a), t:0, warn:0, seed:(Math.random()*1e6)|0}, extra||{});
  if(type==="chorro") z.t = acuRand(ACU_CFG.chorro.every[0], ACU_CFG.chorro.every[1]);
  if(type==="charco") z.t = acuRand(ACU_CFG.charco.every[0], ACU_CFG.charco.every[1]);
  ACU.zones.push(z);
  return z;
}
// Disposición por nivel: se va sumando de a una idea.
function acuLayout(lv){
  ACU.zones = [];
  acuAdd("lineal");
  if(lv >= 2) acuAdd("remolino");
  if(lv >= 3) acuAdd("charco");
  if(lv >= 4){ acuAdd("anillo"); acuAdd("lineal"); }
  if(lv >= 5) acuAdd("chorro");
  if(lv >= 6) acuAdd("charco");
  if(lv >= 7){ acuAdd("chorro"); acuAdd("remolino"); }
  ACU.lvl = lv;
}
function acuRunStart(){ ACU.seq = 1; acuLayout(runLevel||1); }
function acuGuestStart(){ ACU.zones = []; ACU.lvl = 0; }
function acuBeginLevel(){ if(runLevel !== ACU.lvl) acuLayout(runLevel); }

// Empuje de las corrientes continuas en (x,y). Devuelve {x,y} en u/s (o null).
function acuFlowAt(x, y){
  let vx = 0, vy = 0, any = false;
  for(const z of ACU.zones){
    if(z.type==="lineal"){
      const C = ACU_CFG.lineal, rx = x-z.x, ry = y-z.y;
      const t = rx*z.dx + ry*z.dy, p = -rx*z.dy + ry*z.dx;
      if(Math.abs(t) < C.len/2 && Math.abs(p) < C.w/2){ const edge = Math.min(1, (C.len/2 - Math.abs(t))/60); vx += z.dx*C.push*edge; vy += z.dy*C.push*edge; any = true; }
    } else if(z.type==="remolino"){
      const C = ACU_CFG.remolino, rx = x-z.x, ry = (y-z.y)*1.25, d = Math.hypot(rx, ry);
      if(d < C.r && d > 4){ const k = 1 - d/C.r*0.6; vx += (-rx/d*C.pull + -ry/d*C.swirl)*k; vy += (-ry/d*C.pull + rx/d*C.swirl)*k/1.25; any = true; }
    } else if(z.type==="anillo"){
      const C = ACU_CFG.anillo, nx = x/1.18, ny = y/0.82, d = Math.hypot(nx, ny);
      if(d > C.r1 && d < C.r2){ vx += -ny/d*C.push*1.18; vy += nx/d*C.push*0.82; any = true; }
    }
  }
  return any ? {x:vx, y:vy} : null;
}
function acuPush(ent, mult, dt){
  const f = acuFlowAt(ent.x, ent.y); if(!f) return;
  const rule = 1 + 0.05*arenaRuleStacks();
  ent.x += f.x*mult*rule*dt/1000; ent.y += f.y*mult*rule*dt/1000;
  clampToArena(ent); if(typeof resolveWallCollision==="function") resolveWallCollision(ent);
}
function acuInCharco(x, y){
  for(const z of ACU.zones) if(z.type==="charco" && Math.hypot(x-z.x, (y-z.y)*1.25) < ACU_CFG.charco.r) return z;
  return null;
}
function acuUpdate(dt){
  reactionsWetZones(dt); // charcos y corrientes mojan a la horda (Conducción con el rayo)
  if(runEnding) return;
  // corrientes: jugador local, bots y enemigos (los invitados se empujan solos, ver acuGuestUpdate)
  // (aturdido = p.ej. agarrado por el Kraken: no se lo arrastra)
  for(const h of heroes){ if(h.alive && !h.isRemote && !h.duelActive && !(h.stunTimer>0)) acuPush(h, 1, dt); }
  for(const e of enemies){ if(e.alive && e.rank!=="jefe" && e.rank!=="subjefe") acuPush(e, ACU_CFG.enemyMult, dt); }
  // chorros y charcos
  for(const z of ACU.zones){
    if(z.type==="chorro"){
      const C = ACU_CFG.chorro;
      if(z.warn > 0){
        z.warn -= dt;
        if(z.warn <= 0) acuFireJet(z);
      } else {
        z.t -= dt;
        if(z.t <= 0){
          z.t = acuRand(C.every[0], C.every[1]); z.warn = C.warn;
          vfxTelegraph({shape:2, x:z.x, y:z.y, dx:z.dx, dy:z.dy, len:C.len, r:C.w/2, dur:C.warn, rgb:"120,220,255"});
          playSfx("acuJetWarn");
        }
      }
    } else if(z.type==="charco"){
      const C = ACU_CFG.charco;
      if(z.warn > 0){
        z.warn -= dt;
        if(z.warn <= 0) acuDischarge(z);
      } else {
        z.t -= dt;
        if(z.t <= 0){
          z.t = acuRand(C.every[0], C.every[1]); z.warn = C.warn;
          vfxTelegraph({shape:0, x:z.x, y:z.y, r:C.r, dur:C.warn, rgb:"255,232,106"});
          playSfx("acuCharge");
        }
      }
    }
  }
  acuTut();
}
function acuInJet(z, x, y){
  const C = ACU_CFG.chorro, rx = x-z.x, ry = y-z.y, t = rx*z.dx + ry*z.dy, p = -rx*z.dy + ry*z.dx;
  return t > -20 && t < C.len && Math.abs(p) < C.w/2 + 10;
}
function acuFireJet(z){
  const C = ACU_CFG.chorro;
  for(const h of heroes){ if(h.alive && acuInJet(z, h.x, h.y)){ h.x += z.dx*C.knock; h.y += z.dy*C.knock; clampToArena(h); resolveWallCollision(h); } }
  for(const e of enemies){ if(e.alive && e.rank!=="jefe" && acuInJet(z, e.x, e.y)){ const k = e.rank==="subjefe" ? 0.4 : 1; e.x += z.dx*C.knock*k; e.y += z.dy*C.knock*k; clampToArena(e); } }
  for(let i=0;i<5;i++){ const t = i/4*C.len; vfxBurst(z.x+z.dx*t, z.y+z.dy*t, 5, "water", 140, 420, 3, 1, -30, 0); }
  playSfx("acuJet");
}
function acuDischarge(z){
  const C = ACU_CFG.charco;
  let hitE = 0;
  for(const h of heroes){
    if(!h.alive || Math.hypot(h.x-z.x, (h.y-z.y)*1.25) > C.r) continue;
    damageHero(h, h.maxHp*C.heroPct, {x:z.x, y:z.y});
    h.slowAmt = Math.max(h.slowAmt||0, 0.3); h.slowTimer = Math.max(h.slowTimer||0, 1000);
  }
  for(const e of enemies){
    if(!e.alive || Math.hypot(e.x-z.x, (e.y-z.y)*1.25) > C.r) continue;
    const boss = e.rank==="jefe";
    damageEnemy(e, Math.max(1, e.maxHp*(boss ? C.bossPct : C.enemyPct)), {src:player, critChanceOverride:0, fromProc:true});
    if(!boss) e.stunTimer = Math.max(e.stunTimer||0, e.rank==="subjefe" ? C.stun*0.4 : C.stun);
    hitE++;
  }
  vfxShock(z.x, z.y, 10, C.r, "255,232,106", 420, 3);
  for(let i=0;i<5;i++){ const a = Math.random()*Math.PI*2, r = Math.random()*C.r; particles.push({x:z.x, y:z.y, x2:z.x+Math.cos(a)*r, y2:z.y+Math.sin(a)*r*0.8, life:200, bolt:true, color:"#ffe86a"}); }
  playSfx("acuZap");
  if(hitE >= 3) floatText(z.x, z.y-60, `¡Descarga! ×${hitE}`, "crit");
}
function acuGuestUpdate(dt){
  // predicción: el invitado arrastra a su propio campeón con las mismas corrientes
  if(player && player.alive && !player.duelActive && !(player.stunTimer>0)) acuPush(player, 1, dt);
  if(acuaCurrent && acuaCurrent.active && player && player.alive){
    const push = 34*(1+0.09*arenaRuleStacks());
    player.x += acuaCurrent.dx*push*dt/1000; player.y += acuaCurrent.dy*push*dt/1000; clampToArena(player);
  }
  for(const z of ACU.zones){ if(z.warn > 0) z.warn -= dt; }
  acuTut();
}
function acuTut(){
  if(!player || !player.alive) return;
  if(acuFlowAt(player.x, player.y)) tutSay("current", "Estás en una CORRIENTE: el agua te empuja. A favor te movés rápido; en contra, te frena.", "Usá las corrientes para moverte… o para arrastrar a la horda", 9000);
  const c = acuInCharco(player.x, player.y);
  if(c && c.warn > 0) tutSay("charco", "Ese charco brilla porque está por dar una DESCARGA eléctrica.", "Salí del charco antes de la descarga (a ellos les duele más)", 8000);
}
// Bots: no quedarse en el ojo del remolino (los avisos de chorros y charcos ya los esquivan).
function acuBotDanger(x, y, pad){
  for(const z of ACU.zones){
    if(z.type!=="remolino") continue;
    const d = Math.hypot(x-z.x, (y-z.y)*1.25);
    if(d < ACU_CFG.remolino.r*0.55 + pad*0.5) return {x:(x-z.x)/(d||1), y:(y-z.y)/(d||1)};
  }
  return null;
}
// ---- red ----
function acuNetState(){ return {z:ACU.zones.map(z=>[z.id, z.type, z.x, z.y, +z.dx.toFixed(3), +z.dy.toFixed(3), Math.max(0, z.warn|0), z.seed]), l:ACU.lvl}; }
function acuApplyNetState(s){
  if(!s || !s.z) return;
  ACU.lvl = s.l;
  const old = {}; for(const z of ACU.zones) old[z.id] = z;
  ACU.zones = s.z.map(a=>{ const z = old[a[0]] || {id:a[0], t:0}; z.type = a[1]; z.x = a[2]; z.y = a[3]; z.dx = a[4]; z.dy = a[5]; if(a[6] > 0 && !(z.warn > 0)) z.warn = a[6]; else if(a[6] <= 0) z.warn = 0; z.seed = a[7]; return z; });
}
// ---- dibujo ----
function acuDrawGround(now){
  for(const z of ACU.zones){
    if(z.type==="lineal"){
      const C = ACU_CFG.lineal; if(!inView(z.x, z.y, C.len)) continue;
      ctx.save(); ctx.translate(z.x, z.y); ctx.rotate(Math.atan2(z.dy, z.dx));
      ctx.fillStyle = "rgba(140,220,255,0.14)"; ctx.fillRect(-C.len/2, -C.w/2, C.len, C.w);
      ctx.strokeStyle = "rgba(190,240,255,0.35)"; ctx.lineWidth = 2; ctx.setLineDash([12, 10]);
      ctx.beginPath(); ctx.moveTo(-C.len/2, -C.w/2); ctx.lineTo(C.len/2, -C.w/2); ctx.moveTo(-C.len/2, C.w/2); ctx.lineTo(C.len/2, C.w/2); ctx.stroke(); ctx.setLineDash([]);
      // chevrones que corren en la dirección del flujo (borde oscuro + claro: se leen sobre cualquier piso)
      const off = (now*C.push) % 70;
      for(let row=-1; row<=1; row+=2){
        const yy = row*C.w*0.22;
        for(let xx=-C.len/2 + off + (row>0?35:0); xx < C.len/2 - 20; xx += 70){
          const X = Math.round(xx), Y = Math.round(yy);
          for(const [lw, col] of [[5, "rgba(10,40,60,0.45)"], [3, "rgba(215,248,255,0.8)"]]){
            ctx.lineWidth = lw; ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(X, Y-9); ctx.lineTo(X+11, Y); ctx.lineTo(X, Y+9); ctx.stroke();
          }
        }
      }
      ctx.restore();
    } else if(z.type==="remolino"){
      const C = ACU_CFG.remolino; if(!inView(z.x, z.y, C.r+20)) continue;
      ctx.save(); ctx.translate(z.x, z.y); ctx.scale(1, 0.8);
      ctx.fillStyle = "rgba(20,70,110,0.28)"; ctx.beginPath(); ctx.arc(0, 0, C.r, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = "rgba(170,230,255,0.55)"; ctx.lineWidth = 2;
      for(let arm=0; arm<3; arm++){
        ctx.beginPath();
        for(let k=0;k<=24;k++){ const t = k/24, a = arm*2.094 + now*1.6 + t*4.2, r = C.r*(1-t*0.85); const x = Math.cos(a)*r, y = Math.sin(a)*r; if(k===0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(5,20,35,0.55)"; ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    } else if(z.type==="anillo"){
      const C = ACU_CFG.anillo, rm = (C.r1+C.r2)/2;
      ctx.save(); ctx.scale(1.18, 0.82);
      ctx.strokeStyle = "rgba(140,220,255,0.08)"; ctx.lineWidth = C.r2-C.r1; ctx.beginPath(); ctx.arc(0, 0, rm, 0, Math.PI*2); ctx.stroke();
      ctx.strokeStyle = "rgba(190,240,255,0.4)"; ctx.lineWidth = 2; ctx.setLineDash([18, 30]); ctx.lineDashOffset = -now*C.push;
      ctx.beginPath(); ctx.arc(0, 0, rm, 0, Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
    } else if(z.type==="chorro"){
      if(!inView(z.x, z.y, 60)) continue;
      // boca en el piso (burbujea más fuerte cuando está por disparar)
      ctx.save(); ctx.fillStyle = "#0c2a3a"; ctx.beginPath(); ctx.ellipse(z.x, z.y, 18, 9, 0, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = z.warn > 0 ? "#bff0ff" : "#4a9ab8"; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = "#6fc8e8"; ctx.fillRect(Math.round(z.x + z.dx*22)-2, Math.round(z.y + z.dy*22)-2, 4, 4); ctx.restore();
      if(Math.random() < (z.warn > 0 ? 0.6 : 0.08)) particles.push({x:z.x+(Math.random()-0.5)*14, y:z.y, vx:z.dx*20, vy:-30, life:500, color:"#cfeeff"});
    } else if(z.type==="charco"){
      const C = ACU_CFG.charco; if(!inView(z.x, z.y, C.r+20)) continue;
      const charged = z.warn > 0, pulse = 0.5 + 0.5*Math.sin(now*(charged ? 24 : 3) + z.seed);
      ctx.save(); ctx.translate(z.x, z.y); ctx.scale(1, 0.8);
      ctx.fillStyle = charged ? `rgba(255,232,106,${0.18 + 0.14*pulse})` : "rgba(90,200,230,0.22)";
      ctx.beginPath(); ctx.arc(0, 0, C.r, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = charged ? "rgba(255,240,150,0.9)" : "rgba(160,235,255,0.6)"; ctx.lineWidth = 2; ctx.stroke();
      // chispas quietas (símbolo de "conduce")
      const rnd = _infRng(z.seed);
      ctx.fillStyle = charged ? "#fff6c0" : "#ffe86a";
      for(let i=0;i<6;i++){ const a = rnd()*6.283, r = rnd()*C.r*0.8; if(charged || Math.sin(now*5 + i) > 0.3) ctx.fillRect(Math.round(Math.cos(a)*r)-1, Math.round(Math.sin(a)*r)-3, 2, 6); }
      ctx.restore();
    }
  }
}

Object.assign(ARENA_SFX, {
  acuJetWarn: {p:2, gap:500, play:(t,D)=>{ for(let i=0;i<8;i++) _noise(t+i*0.1,0.08,0.12,"bandpass",500+i*80,2,D); return 0.9; }},
  acuJet:     {p:3, gap:300, play:(t,D)=>{ _noise(t,0.5,0.3,"bandpass",700,0.7,D); _tone(t,"sine",180,60,0.4,0.15,D); return 0.5; }},
  acuCharge:  {p:3, gap:500, play:(t,D)=>{ _tone(t,"sawtooth",120,480,1.1,0.05,D,0.3); _noise(t,1.1,0.05,"highpass",4000,0,D); return 1.1; }},
  acuZap:     {p:4, gap:300, play:(t,D)=>{ _noise(t,0.25,0.3,"highpass",2500,0,D); _tone(t,"square",880,110,0.2,0.1,D); return 0.3; }}
});

// Etiqueta ambiental "lightning" (js/systems/env-tags.js): un rayo sobre un enemigo parado en un charco
// lo descarga contra los ENEMIGOS de ese charco (los héroes no sufren esta descarga). Enfriamiento por charco.
envOn("lightning", "acuatica", (x, y, src)=>{
  const z = acuInCharco(x, y); if(!z || (z.zapCd||0) > runElapsedMs) return;
  z.zapCd = runElapsedMs + 3000;
  const C = ACU_CFG.charco; let n = 0;
  for(const e of enemies){
    if(!e.alive || Math.hypot(e.x-z.x, (e.y-z.y)*1.25) > C.r) continue;
    const boss = e.rank==="jefe";
    damageEnemy(e, Math.max(1, e.maxHp*(boss ? C.bossPct : C.enemyPct)), {src:src||player, critChanceOverride:0, fromProc:true});
    if(!boss) e.stunTimer = Math.max(e.stunTimer||0, C.stun*0.8);
    n++;
  }
  vfxShock(z.x, z.y, 10, C.r, "255,232,106", 380, 3); playSfx("acuZap");
  if(n) floatText(z.x, z.y-60, `¡Conduce! ×${n}`, "crit");
});

ARENA_EXT.acuatica = {
  runStart: acuRunStart,
  guestStart: acuGuestStart,
  beginLevel: acuBeginLevel,
  update: acuUpdate,
  guestUpdate: acuGuestUpdate,
  drawGround: acuDrawGround,
  botDanger: acuBotDanger,
  netState: acuNetState,
  applyNetState: acuApplyNetState
};
