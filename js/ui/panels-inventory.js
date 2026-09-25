"use strict";
/* ============================================================
   js/ui/panels-inventory.js
   Pantalla de pausa: inventario, equipamiento, comparación, fusión y estadísticas.
   ============================================================ */

// Pestaña "Inventario"/"Equipamiento": ranuras equipadas + lista de objetos del campeón.
let compareOpenUid = null; // qué tarjeta tiene la comparación abierta

// Foto completa de las estadísticas RESULTANTES de un campeón (sección 5: "qué gano y qué
// pierdo"). Se apoya en las mismas fórmulas reales de combate (computePlayerStats/passiveSum),
// nunca en una copia aparte -así la comparación nunca puede mentir respecto de lo que pasa en
// partida-. energyRegen/critChance parten de sus bases reales (cls.energyRegen, 0.04 de
// runStats) para que el número mostrado sea el efectivo, no solo el bonus.
function snapshotChampStats(classKey){
  const base = computePlayerStats(classKey);
  const cls = CLASSES[classKey];
  return {
    dmg: Math.round(base.dmg),
    hp: base.hp,
    def: Math.round((1-(1-Math.min(0.6,base.def))*(1-Math.min(0.5,passiveSum(classKey,"def_add"))))*1000)/10,
    shield: Math.round(base.hp*(base.shieldPct||0)),
    atkspeed: Math.round((1+passiveSum(classKey,"atkspeed_mult"))*1000)/10,
    movespeed: Math.round(base.speed),
    cdr: Math.round(Math.min(0.6,Math.max(0,passiveSum(classKey,"cd_mult")))*1000)/10,
    lifesteal: Math.round(passiveSum(classKey,"lifesteal_add")*1000)/10,
    healMult: Math.round(passiveSum(classKey,"heal_mult")*1000)/10,
    critChance: Math.round((0.04+passiveSum(classKey,"crit_chance_add"))*1000)/10,
    critMult: Math.round((1.8+passiveSum(classKey,"crit_mult_add"))*100)/100,
    energy: Math.round(cls.energyMax*(1+passiveSum(classKey,"energy_mult")))
  };
}
const STAT_ROWS = [
  {key:"dmg",       label:"Daño",                 fmt:v=>Math.round(v)},
  {key:"hp",        label:"Vida máxima",          fmt:v=>Math.round(v)},
  {key:"def",       label:"Defensa",              fmt:v=>v+"%"},
  {key:"shield",    label:"Escudo (casco+escudo)",fmt:v=>Math.round(v)},
  {key:"atkspeed",  label:"Velocidad de ataque",  fmt:v=>v+"%"},
  {key:"movespeed", label:"Velocidad de movimiento", fmt:v=>Math.round(v)},
  {key:"cdr",       label:"Reducción de cooldown",fmt:v=>v+"%"},
  {key:"lifesteal", label:"Robo de vida",         fmt:v=>v+"%"},
  {key:"healMult",  label:"Curación realizada",   fmt:v=>(v>=0?"+":"")+v+"%"},
  {key:"critChance",label:"Prob. crítico",        fmt:v=>v+"%"},
  {key:"critMult",  label:"Daño crítico",         fmt:v=>"x"+v},
  {key:"energy",    label:"Recurso máximo",       fmt:v=>Math.round(v)}
];
// Compara "lo que hay ahora" contra "lo que pasaría si equipo `candidate`": equipa
// hipotéticamente (sin persistir), toma la foto, y desequipa -mismo criterio que ya usa
// talentModsSignature para invalidar su caché automáticamente-.
function compareItemsFull(classKey, candidate){
  const champ = save.champions[classKey];
  const prevUid = champ.equipment[candidate.type];
  const before = snapshotChampStats(classKey);
  champ.equipment[candidate.type] = candidate.uid;
  const after = snapshotChampStats(classKey);
  champ.equipment[candidate.type] = prevUid;
  return {before, after};
}
function compareItemsHTML(classKey, candidate){
  const { before, after } = compareItemsFull(classKey, candidate);
  const rows = STAT_ROWS.map(r=>{
    const b = before[r.key], a = after[r.key];
    if(Math.abs(a-b) < 0.001) return null; // no mostrar filas sin cambio, para no saturar la tarjeta
    const cls = a>b ? "up" : "down";
    const arrow = a>b ? "▲" : "▼";
    return `<div class="compare-line ${cls}">${r.label}: ${r.fmt(b)} → ${r.fmt(a)} ${arrow}</div>`;
  }).filter(Boolean).join("");
  const current = equippedItem(classKey, candidate.type);
  const curPassives = current ? (current.passives.length + (current.mythicPassive?1:0)) : 0;
  const newPassives = candidate.passives.length + (candidate.mythicPassive?1:0);
  const passiveDiff = newPassives - curPassives;
  const skillModNote = candidate.skillMods ? `<div class="compare-line up">Modifica una habilidad puntual (ver descripción)</div>` : "";
  const setNote = candidate.set ? (()=>{
    const beforeCount = equippedSetCount(classKey, candidate.set);
    const champ = save.champions[classKey]; const prevUid = champ.equipment[candidate.type];
    champ.equipment[candidate.type] = candidate.uid;
    const afterCount = equippedSetCount(classKey, candidate.set);
    champ.equipment[candidate.type] = prevUid;
    return `<div class="compare-line ${afterCount>beforeCount?"up":"neutral"}">Set "${SET_DB[candidate.set].name}": ${beforeCount} → ${afterCount} piezas</div>`;
  })() : "";
  return `<div class="item-compare">
      <div class="compare-col-title">Si equipás esto, cambia:</div>
      ${rows || '<div class="compare-line neutral">Sin cambios en estadísticas base</div>'}
      <div class="compare-line ${passiveDiff>0?"up":(passiveDiff<0?"down":"neutral")}">Pasivas: ${curPassives} → ${newPassives}</div>
      ${skillModNote}${setNote}
    </div>`;
}
// Grilla de las 6 ranuras equipadas (sección 3/4), compartida por Pausa->Inventario y por la
// pantalla de Equipamiento previa a la arena -misma estructura de datos, mismo HTML-.
// unequipAttr es el nombre del atributo data- que usa cada pantalla para su propio handler
// (difieren porque unequipItem debe refrescar cosas distintas según haya o no partida en curso).
function renderEquipmentGridHTML(classKey, unequipAttr){
  let html = '<div class="inv-slots">';
  EQUIP_SLOT_TYPES.forEach(type=>{
    const it = equippedItem(classKey, type);
    const meta = ITEM_TYPES[type];
    const label = type==="arma" ? weaponLabelFor(classKey) : meta.label;
    if(it){
      const rm = RARITY_META[it.rarity];
      const borderColor = it.set ? "#3ddc71" : rm.color;
      html += `<div class="inv-slot filled ${it.set?"set-item":""}" style="border-color:${borderColor};">
        <span class="slot-icon">${it.icon}</span>
        <span style="color:${borderColor}; font-weight:700;">${label}</span>
        <span class="slot-item-name">${it.name}${it.set?' <span class="set-badge">SET</span>':""}</span>
        <button data-${unequipAttr}="${type}">Quitar</button>
      </div>`;
    } else {
      html += `<div class="inv-slot"><span class="slot-icon">${meta.icon}</span><span>${label}</span><span class="slot-item-name">vacío</span></div>`;
    }
  });
  html += '</div>';
  return html;
}
// Panel de progreso de sets (sección 7/8): solo se muestran los sets con al menos 1 pieza
// puesta, y cada umbral se recalcula en caliente -nunca queda un bonus fantasma-.
function renderSetPanelHTML(classKey){
  const activeIds = activeSetIdsFor(classKey);
  if(!activeIds.length) return "";
  return activeIds.map(id=>setDetailHTML(classKey, id)).join("");
}
// Detalle de un set: piezas (✓ equipada · ◐ en el inventario · □ falta), bonus por cantidad de
// piezas EQUIPADAS (los activos en verde) y, si hay repetidas, la reforja. Es el "me falta una".
function setDetailHTML(classKey, setId){
  const S = SET_DB[setId]; if(!S) return "";
  const champ = save.champions[classKey];
  const owned = ownedDesignIds(classKey);
  const eqIds = new Set(EQUIP_SLOT_TYPES.map(t=>{ const it = equippedItem(classKey, t); return it && it.set===setId ? it.designId : null; }).filter(Boolean));
  const n = eqIds.size, total = setPieceCount(setId);
  const pieces = setPieceIds(setId).map(id=>{
    const d = DESIGNED_ITEMS[id], st = eqIds.has(id) ? "✓" : (owned.has(id) ? "◐" : "□");
    return `<div class="sp-piece ${owned.has(id)?"have":"miss"}">${st} ${d.name} <span style="opacity:.6">(${ITEM_TYPES[d.type].label})</span></div>`;
  }).join("");
  const bonuses = S.thresholds.map((th,i)=>{
    const full = i===S.thresholds.length-1;
    return `<div class="sp-bonus ${n>=th.count?"on":""}">${full?"SET COMPLETO":"BONUS"} ${th.count}/${total} — ${th.desc}</div>`;
  }).join("");
  const dup = setDuplicateInfo(classKey, setId);
  const reforge = (dup.dupes.length>=2 && dup.missing.length) ? `<div class="sp-reforge"><button data-reforge="${setId}">Reforjar: 2 repetidas → 1 pieza que te falta</button></div>` : "";
  return `<div class="set-panel"><div class="sp-title">SET: ${S.name} — ${n}/${total} equipadas</div>
    ${S.theme?`<div class="sp-theme">${S.theme}</div>`:""}${pieces}${bonuses}${reforge}</div>`;
}
// Barra de fusión (sección 18): agrupa lo fusionable y ofrece un botón por grupo. fuseAttr
// distingue el data- atributo entre las dos pantallas que la usan (igual que unequipAttr).
function renderFusionHTML(classKey, fuseAttr){
  const groups = fusableGroups(classKey);
  if(!groups.length) return "";
  let html = '<div class="fuse-bar"><div class="set-title">Fusión disponible — 3 iguales → siguiente rareza</div>';
  groups.forEach(g=>{
    const sample = g[0];
    const meta = ITEM_TYPES[sample.type];
    const rm = RARITY_META[sample.rarity];
    const nextRm = RARITY_META[RARITIES[rarityIndex(sample.rarity)+1]];
    html += `<div class="fuse-row">
      <span>${meta.icon} ${meta.label} <span style="color:${rm.color}">${rm.label}</span> x${g.length} → <span style="color:${nextRm.color}">${nextRm.label}</span></span>
      <button data-${fuseAttr}="${sample.type}|${sample.rarity}">Fusionar 3</button>
    </div>`;
  });
  html += '</div>';
  return html;
}
// Maneja el click de un botón de fusión: toma el grupo type|rarity, usa las 3 primeras
// unidades disponibles y ejecuta la fusión real (fuseItems ya valida todo de nuevo por las dudas).
function handleFuseClick(classKey, groupKey){
  const [type, rarity] = groupKey.split("|");
  const champ = save.champions[classKey];
  const uids = (champ.inventory||[]).filter(it=>it.type===type && it.rarity===rarity && !it.designed).slice(0,3).map(it=>it.uid);
  if(uids.length!==3) return;
  const result = fuseItems(classKey, uids);
  if(!result.ok) alert(result.reason||"No se pudo fusionar.");
}
function renderInventoryPanel(){
  const panel = document.getElementById("inventory-panel");
  if(!panel || !player) return;
  const classKey = player.classKey;
  const champ = save.champions[classKey];
  champ.inventory = champ.inventory || [];
  champ.equipment = Object.assign(mkEquipment(), champ.equipment||{});

  let html = renderEquipmentGridHTML(classKey, "unequip");
  html += renderSetPanelHTML(classKey);

  const full = champ.inventory.length >= INVENTORY_CAPACITY;
  html += `<div class="inv-capacity">Inventario: ${champ.inventory.length}/${INVENTORY_CAPACITY}${full?" — lleno":""}</div>`;
  html += renderFusionHTML(classKey, "fuse");

  if(!champ.inventory.length){
    html += '<div class="inv-empty">Todavía no tenés objetos. Salen del cofre del jefe al ganar una arena: mejor calificación y arenas más difíciles, mejores probabilidades.</div>';
  } else {
    html += '<div class="inv-list">';
    champ.inventory.slice().reverse().forEach(it=>{
      const rm = RARITY_META[it.rarity];
      const equipped = champ.equipment[it.type] === it.uid;
      const passiveTxt = itemPassivesHTML(it);
      const comparing = compareOpenUid === it.uid;
      html += `<div class="inv-card ${it.set?"set-item":""}" data-compare-toggle="${it.uid}" style="border-left-color:${it.set?"#3ddc71":rm.color};">
        <span class="item-icon">${it.icon}</span>
        <div class="item-meta">
          <div class="item-name" style="color:${it.set?"#3ddc71":rm.color};">${it.name}${it.set?' <span class="set-badge">SET</span>':""}</div>
          <div class="item-stat">${it.set?"Set":rm.label} · +${Math.round(it.value*100)}% ${ITEM_TYPES[it.type].statLabel}</div>
          ${it.desc ? `<div class="item-desc">${it.desc}</div>` : ""}
          ${(it.set && comparing) ? setDetailHTML(classKey, it.set) : ""}
          ${passiveTxt ? `<div class="item-passives">${passiveTxt}</div>` : ""}
          ${(!equipped && comparing) ? compareItemsHTML(classKey, it) : ""}
          <div class="vic-item-actions">
            <button data-sell="${it.uid}">Vender (+${SELL_VALUE[it.rarity]||10}o)</button>
            <button data-discard="${it.uid}">Descartar</button>
          </div>
        </div>
        <button data-equip="${it.uid}" class="${equipped?"equipped":""}">${equipped?"Equipado":"Equipar"}</button>
      </div>`;
    });
    html += '</div>';
  }

  html += `<button class="inv-debug-btn" id="inv-debug-gen" ${full?"disabled":""}>[Prueba] Generar objeto al azar — para testear sin esperar a derrotar un subjefe</button>`;

  panel.innerHTML = html;

  panel.querySelectorAll(".inv-card").forEach(card=>{
    card.addEventListener("click", (ev)=>{
      if(ev.target.closest("button")) return; // los botones tienen su propio manejador
      const uid = card.getAttribute("data-compare-toggle");
      compareOpenUid = (compareOpenUid===uid) ? null : uid;
      renderInventoryPanel();
    });
  });
  panel.querySelectorAll("[data-equip]").forEach(btn=>{
    btn.addEventListener("click", (ev)=>{
      ev.stopPropagation();
      equipItem(classKey, btn.getAttribute("data-equip"));
      refreshEquippedStats();
      compareOpenUid = null;
      renderInventoryPanel();
      renderStatsPanel();
    });
  });
  panel.querySelectorAll("[data-unequip]").forEach(btn=>{
    btn.addEventListener("click", (ev)=>{
      ev.stopPropagation();
      unequipItem(classKey, btn.getAttribute("data-unequip"));
      refreshEquippedStats();
      renderInventoryPanel();
      renderStatsPanel();
    });
  });
  panel.querySelectorAll("[data-sell]").forEach(btn=>{
    btn.addEventListener("click", (ev)=>{
      ev.stopPropagation();
      const uid = btn.getAttribute("data-sell");
      if(!confirm("¿Vender este objeto? No se puede deshacer.")) return;
      sellItem(classKey, uid);
      refreshEquippedStats();
      compareOpenUid = null;
      renderInventoryPanel();
      renderStatsPanel();
      renderSaveLine();
    });
  });
  panel.querySelectorAll("[data-discard]").forEach(btn=>{
    btn.addEventListener("click", (ev)=>{
      ev.stopPropagation();
      const uid = btn.getAttribute("data-discard");
      if(!confirm("¿Descartar este objeto sin recompensa? No se puede deshacer.")) return;
      discardItem(classKey, uid);
      refreshEquippedStats();
      compareOpenUid = null;
      renderInventoryPanel();
      renderStatsPanel();
    });
  });
  panel.querySelectorAll("[data-reforge]").forEach(btn=>{
    btn.addEventListener("click", (ev)=>{
      ev.stopPropagation();
      const r = reforgeSetDuplicates(classKey, btn.getAttribute("data-reforge"));
      if(r.ok){ floatText(player.x, player.y-60, "¡"+r.item.name+"!", "heal"); playSfx("shield"); }
      renderInventoryPanel();
    });
  });
  panel.querySelectorAll("[data-fuse]").forEach(btn=>{
    btn.addEventListener("click", (ev)=>{
      ev.stopPropagation();
      handleFuseClick(classKey, btn.getAttribute("data-fuse"));
      refreshEquippedStats();
      renderInventoryPanel();
      renderStatsPanel();
    });
  });
  const dbg = document.getElementById("inv-debug-gen");
  if(dbg) dbg.addEventListener("click", ()=>{
    const tier = LOOT_TIERS[Math.floor(Math.random()*LOOT_TIERS.length)];
    const spec = tier==="set" ? Object.assign({tier}, _rollSetPiece("infernal", ownedDesignIds(classKey), Math.random)) : {tier};
    const item = materializeLoot(spec, classKey);
    addItemToInventory(classKey, item);
    renderInventoryPanel();
  });
}

// Fase 4: pestaña "Estadísticas" — desglosa base del campeón vs. bonus de objetos equipados.
function renderStatsPanel(){
  const panel = document.getElementById("stats-panel");
  if(!panel || !player) return;
  const classKey = player.classKey;
  const cls = CLASSES[classKey];
  const champ = save.champions[classKey];
  const lvl = champ.level;
  const baseDmgNoItem = cls.baseDmg + (lvl-1)*0.95;
  const baseHpVal = Math.round(cls.baseHP + (lvl-1)*7.5);
  const weapon = equippedItem(classKey, "arma");
  const helmet = equippedItem(classKey, "casco");
  const shieldIt = equippedItem(classKey, "escudo");
  const full = computePlayerStats(classKey); // ya incluye reliquias + bonus de objetos
  const shieldAmount = Math.round(full.hp * (full.shieldPct||0));

  panel.innerHTML = `
    <div class="stat-block">
      <div class="stat-block-title">Daño</div>
      <div class="stat-row"><span>Base (Nv. ${lvl})</span><b>${Math.round(baseDmgNoItem)}</b></div>
      <div class="stat-row highlight"><span>Arma equipada</span><b>${weapon ? `+${Math.round(weapon.value*100)}% — ${weapon.name}` : "sin equipar"}</b></div>
      <div class="stat-row total"><span>Daño final</span><b>${Math.round(full.dmg)}</b></div>
    </div>
    <div class="stat-block">
      <div class="stat-block-title">Vida y escudo</div>
      <div class="stat-row"><span>Vida máxima</span><b>${baseHpVal}</b></div>
      <div class="stat-row highlight"><span>Casco equipado</span><b>${helmet ? `+${Math.round(helmet.value*100)}% — ${helmet.name}` : "sin equipar"}</b></div>
      <div class="stat-row highlight"><span>Escudo equipado</span><b>${shieldIt ? `+${Math.round(shieldIt.value*100)}% — ${shieldIt.name}` : "sin equipar"}</b></div>
      <div class="stat-row total"><span>Escudo permanente</span><b>${shieldAmount}</b></div>
    </div>
    <div class="stat-block">
      <div class="stat-block-title">Otros</div>
      <div class="stat-row"><span>Defensa</span><b>${Math.round(full.def*100)}%</b></div>
      <div class="stat-row"><span>Velocidad</span><b>${Math.round(full.speed)}</b></div>
      <div class="stat-row"><span>Puntos de talento disponibles</span><b>${champ.talentPoints}</b></div>
    </div>
    ${classKey==="musashi" ? renderMusashiRoninStatsBlock(player) : ""}`;
}
// Bloque propio de Musashi en Estadísticas (sección 26): progresión INTRAPARTIDA, se reinicia
// cada partida nueva -por eso lee directo de player.stats.duelVictories, no de `save`-.
function renderMusashiRoninStatsBlock(h){
  const v = (h.stats && h.stats.duelVictories) || 0;
  const dmgPct = Math.round(v*5);
  const critPct = Math.round(musashiRoninCritChanceBonus(v)*1000)/10;
  const critDmgPct = Math.round(v*10);
  return `<div class="stat-block">
      <div class="stat-block-title">Senda del Rōnin</div>
      <div class="stat-row"><span>Victorias de Duelo</span><b>${v}</b></div>
      <div class="stat-row"><span>Daño acumulado</span><b>+${dmgPct}%</b></div>
      <div class="stat-row"><span>Probabilidad crítica acumulada</span><b>+${critPct}%</b></div>
      <div class="stat-row"><span>Daño crítico acumulado</span><b>+${critDmgPct}%</b></div>
    </div>`;
}
