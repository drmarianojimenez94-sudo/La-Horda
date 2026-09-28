"use strict";
/* ============================================================
   js/ui/panels-skills.js
   Paneles de habilidades (niveles/maestría) y ÁRBOL DE TALENTOS de un guardián. Se usan fuera
   de la partida: en la Sala (antes de entrar) y en la ficha de Mis Guardianes. En partida las
   habilidades se suben con los "+" del HUD (ver js/ui/hud.js) y los talentos no se tocan.
   ============================================================ */

// Habilidades: nivel invertido (0-10), nivel de uso y qué da el próximo punto.
// rerender: qué volver a dibujar después de invertir un punto.
function renderSkillsPanel(panel, classKey, rerender){
  if(!panel) return;
  const cls = CLASSES[classKey];
  const champ = save.champions[classKey];
  const items = cls.skills.map((sk,i)=>({sk, idx:i, m:champ.skillMastery[i]}))
    .concat([{sk:cls.ultimate, idx:"ult", m:champ.ultMastery}]);
  let html = `<div class="talent-points">Puntos disponibles: <b>${champ.talentPoints}</b> <span class="tp-note">(1 por nivel de guardián; el árbol de talentos tiene sus propios puntos)</span></div><div class="mastery-list">`;
  items.forEach(({sk,idx,m})=>{
    const tLvl = allocLevel(m);
    const tMaxed = tLvl>=TALENT_MAX;
    const need = useXpThreshold(m.useLvl);
    const usePct = Math.min(100, m.useXp/need*100);
    const lock = skillInvestLockReason(classKey, idx);
    const canInvest = !lock;
    const statNow = skillStatLine(sk, m);
    const nextM = {useXp:0, useLvl:m.useLvl, alloc: Math.min(TALENT_MAX, m.alloc+1)};
    const statNext = tMaxed ? "" : `<span class="mastery-next"> → ${skillStatLine(sk, nextM)}</span>`;
    const useBonusPct = Math.round((usePowerMult(m)-1)*100);
    const iconImg = SKILL_ICON_IMG[sk.name];
    const iconHtml = iconImg ? `<img src="${iconImg}" style="width:100%;height:100%;object-fit:contain;image-rendering:pixelated;">` : sk.ico;
    const ultLock = (idx==="ult" && champ.level < ULT_POINTS_MIN_LEVEL) ? `<div class="talent-lock-reason">🔒 ${lock}</div>` : "";
    html += `
      <div class="mastery-row">
        <div class="mastery-icon">${iconHtml}</div>
        <div class="mastery-info">
          <div class="mastery-name"><span>${sk.name}</span><span class="mastery-lvl">${tMaxed?"Nv. MÁX":"Nv. "+tLvl+"/"+TALENT_MAX}</span></div>
          <div class="mastery-bar-track"><div class="mastery-bar-fill" style="width:${usePct}%"></div></div>
          <div class="mastery-stats"><b>${statNow}</b>${statNext}</div>
          <div class="mastery-use">Uso Nv. ${m.useLvl} · +${useBonusPct}% daño permanente por práctica</div>
          ${(()=>{ const t = talentSynergySkillLine(classKey, idx); return t ? `<div class="mastery-syn">⇄ ${t}</div>` : ""; })()}
          ${skillEvoHTML(classKey, sk, idx, tLvl)}
          ${ultLock}
        </div>
        <button class="mastery-plus ${canInvest?"ready":""}" ${canInvest?"":"disabled"} data-idx="${idx}">+</button>
      </div>`;
  });
  html += "</div>";
  panel.innerHTML = html;
  panel.querySelectorAll(".mastery-plus.ready").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const raw = btn.getAttribute("data-idx");
      if(investTalentPoint(classKey, raw==="ult" ? "ult" : parseInt(raw))) rerender();
    });
  });
}

/* ============================================================
   ÁRBOL DE TALENTOS
   Raíz (el guardián) -> 3 ramas en columnas, cada una una cadena de nodos unidos por una línea
   (común -> común -> común -> especial...), las bifurcaciones exclusivas lado a lado ("elegí
   uno") y, coronando cada rama, su Maestría (nivel 90) con su mini-árbol si es la elegida.
   Cada nodo: ícono con su rango, nombre y explicación al lado.
   ============================================================ */
const TALENT_GLYPH_BY_KEY = {powerMult:"⚔", areaMult:"◎", durationMult:"⏳", cdMult:"⟳", jumpBonus:"ϟ"};
const TALENT_GLYPH_BY_EFFECT = {dmg_mult:"⚔", skilldmg_mult:"✧", cd_mult:"⟳", def_add:"🛡", atkspeed_mult:"»",
  lifesteal_add:"🩸", heal_mult:"✚", hp_mult:"❤", speed_mult:"➶", energy_mult:"💧", crit_chance_add:"✦", crit_mult_add:"✦"};
function talentGlyph(node){
  let mods = [];
  try{ mods = node.mods(1) || []; }catch(e){}
  const m = mods[0];
  if(!m) return node.type==="special" ? "★" : "•";
  if(m.flag) return "★";
  if(m.key && TALENT_GLYPH_BY_KEY[m.key]) return TALENT_GLYPH_BY_KEY[m.key];
  if(m.effect && TALENT_GLYPH_BY_EFFECT[m.effect]) return TALENT_GLYPH_BY_EFFECT[m.effect];
  return "•";
}
// Nombre legible de a qué habilidad/ulti apunta un nodo (para mostrar "afecta: X").
function talentSkillLabel(classKey, targetSkill){
  if(targetSkill===undefined) return "";
  const cls = CLASSES[classKey];
  if(targetSkill==="ult") return cls.ultimate.name;
  return cls.skills[targetSkill] ? cls.skills[targetSkill].name : "";
}
function talentBranchLabel(branch){
  return branch.replace(/_/g," ").replace(/\b\w/g, c=>c.toUpperCase());
}
function talentNodeHTML(classKey, node, rank, lockReason, isMastery){
  const maxed = rank>=node.maxRank;
  const locked = !!lockReason && lockReason!=="MÁX";
  const avail = !locked && !maxed;
  const targets = [];
  try{
    (node.mods(Math.max(1,rank||1))||[]).forEach(m=>{ if(m.targetSkill!==undefined){ const l=talentSkillLabel(classKey,m.targetSkill); if(l && !targets.includes(l)) targets.push(l); } });
  }catch(e){}
  const effect = rank>0 ? `<div class="tt-eff"><b>Ahora:</b> ${node.rankDesc(rank)}</div>` : "";
  const next = maxed ? "" : `<div class="tt-eff next">${rank>0?"Siguiente":"Rango 1"}: ${node.rankDesc(rank+1)}</div>`;
  const cls = ["tt-node", node.type==="special"?"special":"common", maxed?"maxed":(rank>0?"owned":(avail?"avail":"locked"))];
  const reason = locked ? `<div class="tt-lock">🔒 ${lockReason}</div>` : "";
  // Sinergias (estilo Diablo II): este nodo, como fuente, potencia otra habilidad por cada punto.
  const syns = isMastery ? [] : talentSynergiesFromNode(classKey, node.id);
  const synLines = syns.map(s=>{
    const word = s.what || TALENT_SYNERGY_WORD[s.key] || "efecto";
    return `Sinergia: cada punto da +${_synPct(s.per)}% ${word} a ${talentSynergySkillName(classKey, s)} (ahora +${_synPct(talentSynergyValue(classKey, s))}%)`;
  });
  const synHTML = synLines.map(t=>`<div class="tt-syn">⇄ ${t}</div>`).join("");
  const tip = [node.name + " — " + node.desc].concat(synLines.length ? ["Sinergias:"].concat(synLines.map(t=>"· "+t.replace(/^Sinergia: /,""))) : []).join("\n");
  return `<div class="${cls.join(" ")}" data-node="${node.id}" title="${tip.replace(/"/g,"&quot;")}">
    <div class="tt-ico">${maxed?"✔":talentGlyph(node)}<span class="tt-rank">${rank}/${node.maxRank}</span></div>
    <div class="tt-txt">
      <div class="tt-name">${node.name}${node.type==="special"?' <span class="talent-badge special">Especial</span>':""}${node.cost>1?` <span class="tt-cost">${node.cost} pts</span>`:""}</div>
      <div class="tt-desc">${node.desc}${targets.length?` <i>(${targets.join(", ")})</i>`:""}</div>
      ${effect}${next}${synHTML}${reason}
    </div>
    ${avail ? `<button class="tt-buy mastery-plus ready" data-node="${node.id}" data-mastery="${isMastery?"1":"0"}">+</button>` : ""}
  </div>`;
}
// Lista de nodos de una rama -> HTML de la cadena, agrupando pares exclusivos en una bifurcación.
function talentChainHTML(classKey, nodes, rankOf, lockOf, isMastery){
  let html = "", i = 0;
  while(i < nodes.length){
    const n = nodes[i];
    // bifurcación: el nodo y los que excluye (2 o más) se dibujan juntos, una sola vez
    const group = n.exclusiveWith ? [n].concat([].concat(n.exclusiveWith).map(id=>nodes.find(o=>o.id===id)).filter(Boolean)) : null;
    if(group && group.length > 1 && group.every(o=>nodes.indexOf(o) >= i)){
      html += `<div class="tt-fork${group.length > 2 ? " tt-fork-multi" : ""}"><div class="tt-fork-label">Elegí uno (permanente)</div>
        ${group.map(o=>talentNodeHTML(classKey, o, rankOf(o), lockOf(o), isMastery)).join(`<div class="tt-fork-or">o</div>`)}</div>`;
      i++; continue;
    }
    if(group && group.length > 1){ i++; continue; } // ya dibujado junto a su bifurcación
    html += talentNodeHTML(classKey, n, rankOf(n), lockOf(n), isMastery);
    i++;
  }
  return html;
}
function renderTalentTree(panel, classKey, rerender){
  if(!panel) return;
  const cls = CLASSES[classKey];
  const champ = save.champions[classKey];
  const tree = talentTreeFor(classKey);
  if(!tree){ panel.innerHTML = `<div class="talent-lock-banner">Este guardián todavía no tiene árbol de talentos.</div>`; return; }
  const st = talentState(classKey);
  const branches = [...new Set(tree.nodes.map(n=>n.branch))];
  let html = `<div class="tt-wrap">
    <div class="tt-root" style="border-color:${cls.color};"><span class="tt-root-ico" style="color:${cls.color};">${cls.icon}</span>
      <span><b>${cls.name}</b> · Nv. ${champ.level} · Puntos de talento: <b>${treePointsAvailable(classKey)}</b></span></div>`;
  // Talentos tempranos: el árbol se abre en el nivel 5 y cada escalón de rama se abre con el nivel
  // (TALENT_TIER_LEVELS). La franja dice qué falta para el próximo, así se ve la build crecer.
  const nextTier = talentNextTierUnlock(classKey);
  if(champ.level < TALENT_TREE_MIN_LEVEL){
    html += `<div class="talent-lock-banner">🔒 El primer punto de talento llega en el nivel ${TALENT_TREE_MIN_LEVEL} (te faltan ${TALENT_TREE_MIN_LEVEL-champ.level}). Ya podés ver todo el árbol y planear tu build.</div>`;
  } else {
    html += `<div class="talent-lock-banner tt-progress">1 punto de talento por nivel (+1 extra en cada nivel redondo). Escalones de cada rama: ${TALENT_TIER_LEVELS.map((lv,i)=>`<b class="${champ.level>=lv?"tt-tier-on":""}">${i+1}º Nv.${lv}</b>`).join(" · ")}${nextTier ? ` — el ${nextTier.tier}º se abre en el nivel ${nextTier.level}.` : " — todos abiertos."}</div>`;
  }
  // Sinergias del guardián (estilo Diablo II) con su valor actual, y el reinicio del árbol por oro.
  const synList = talentSynergies(classKey);
  if(synList.length){
    html += `<div class="tt-synergies"><div class="tt-syn-title">⇄ Sinergias</div>${synList.map(s=>{
      const on = talentSynergyValue(classKey, s) > 0;
      return `<div class="tt-syn-row${on?" on":""}">${talentSynergyText(classKey, s)}</div>`;
    }).join("")}</div>`;
  }
  {
    const spent = treePointsSpent(classKey), cost = talentRespecCost(classKey), why = talentRespecLockReason(classKey);
    const costTxt = cost > 0 ? `🪙 ${typeof fmtGold==="function" ? fmtGold(cost) : cost}` : "gratis (el primero)";
    const ptsTxt = spent===1 ? "el punto invertido" : `los ${spent} puntos invertidos`;
    html += `<div class="tt-respec"><span>Reiniciar el árbol te devuelve ${spent>0 ? ptsTxt : "lo invertido"} · ${costTxt}</span>
      <button class="btn tt-respec-btn" ${why?`disabled title="${why.replace(/"/g,"&quot;")}"`:""}>↺ Reiniciar árbol</button></div>`;
  }
  html += `<div class="tt-cols">`;
  branches.forEach(branch=>{
    const inv = branchInvestment(classKey, branch);
    const nodes = tree.nodes.filter(n=>n.branch===branch);
    html += `<div class="tt-col"><div class="tt-branch"><span>${talentBranchLabel(branch)}</span><small>${inv} pts</small></div><div class="tt-chain">`;
    html += talentChainHTML(classKey, nodes, n=>st.nodes[n.id]||0, n=>talentNodeLockReason(classKey, n), false);
    // Corona de la rama: su Maestría
    const mastery = Object.values(tree.masteries||{}).find(m=>m.branch===branch);
    if(mastery){
      const chosen = st.mastery===mastery.id, otherChosen = st.mastery && !chosen;
      const canPick = canPickMastery(classKey, mastery.id);
      const reason = chosen ? "" : (otherChosen ? "Bloqueada: elegiste otra Maestría" : masteryLockReason(classKey, mastery.id));
      html += `<div class="tt-node tt-crown ${chosen?"maxed":(canPick?"avail":"locked")}">
        <div class="tt-ico">♛</div>
        <div class="tt-txt"><div class="tt-name">Maestría: ${mastery.name}${chosen?" ✔":""}</div>
          <div class="tt-desc">${mastery.desc}</div>
          ${reason?`<div class="tt-lock">🔒 ${reason}</div>`:""}
          ${canPick?`<button class="btn wide mastery-pick-btn" data-mastery-id="${mastery.id}">Elegir Maestría (permanente)</button>`:""}
        </div></div>`;
      if(chosen){
        html += talentChainHTML(classKey, mastery.miniTree, n=>st.masteryNodes[n.id]||0, n=>masteryMiniLockReason(classKey, n), true);
      }
    }
    html += `</div></div>`;
  });
  html += `</div></div>`;
  panel.innerHTML = html;
  panel.querySelectorAll(".tt-buy").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const nodeId = btn.getAttribute("data-node");
      const isMastery = btn.getAttribute("data-mastery")==="1";
      const buyFn = isMastery ? buyMasteryNode : buyTalentNode;
      const done = res=>{
        if(res.ok) rerender();
        else if(res.reason) gameAlert(res.reason);
      };
      const res = buyFn(classKey, nodeId, false);
      if(res.needsConfirm){
        const node = isMastery ? masteryMiniNodeById(classKey, nodeId) : talentNodeById(classKey, nodeId);
        const msg = isMastery
          ? `Vas a invertir un punto de Maestría en "${node.name}". Esta decisión es permanente. ¿Deseas continuar?`
          : `"${node.name}" es una elección irreversible: bloqueará permanentemente su alternativa. ¿Deseas continuar?`;
        gameConfirm(msg, {okText:"Continuar", danger:true}).then(ok=>{ if(ok) done(buyFn(classKey, nodeId, true)); });
        return;
      }
      done(res);
    });
  });
  panel.querySelectorAll(".tt-respec-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const res = talentRespec(classKey, false);
      if(!res.needsConfirm){ if(res.reason) gameAlert(res.reason); return; }
      const costTxt = res.cost > 0 ? `Cuesta 🪙 ${typeof fmtGold==="function" ? fmtGold(res.cost) : res.cost} de oro.` : "Este primer reinicio es gratis.";
      gameConfirm(`Vas a reiniciar el árbol de talentos de ${cls.name}: ${res.refund===1 ? "se te devuelve el punto invertido para usarlo de nuevo" : `se te devuelven los ${res.refund} puntos invertidos para repartirlos de nuevo`} (la Maestría elegida se conserva). ${costTxt} ¿Continuar?`, {okText:"Reiniciar"}).then(ok=>{
        if(!ok) return;
        const r2 = talentRespec(classKey, true);
        if(r2.ok) rerender(); else if(r2.reason) gameAlert(r2.reason);
      });
    });
  });
  panel.querySelectorAll(".mastery-pick-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const masteryId = btn.getAttribute("data-mastery-id");
      const done = res=>{
        if(res.ok) rerender();
        else if(res.reason) gameAlert(res.reason);
      };
      const res = pickMastery(classKey, masteryId, false);
      if(res.needsConfirm){
        const m = tree.masteries[masteryId];
        gameConfirm(`Vas a convertirte en "${m.name}". Esta decisión es PERMANENTE: las otras dos Maestrías quedarán bloqueadas para siempre en este guardián. ¿Deseas continuar?`, {okText:"Continuar", danger:true}).then(ok=>{
          if(ok) done(pickMastery(classKey, masteryId, true));
        });
        return;
      }
      done(res);
    });
  });
}
// Resumen numérico de una habilidad para un objeto de maestría dado (real o hipotético, para
// previsualizar el próximo nivel sin mutar el estado guardado).
function skillStatLine(sk, m){
  const POWER = masteryPowerMult(m), AREA = masteryAreaMult(m), DUR = masteryDurationMult(m);
  const powerLabel = sk.dmgMult ? "Daño" : (sk.healPct||sk.hpBonusPct||sk.shieldPct) ? "Efecto" : null;
  const parts = powerLabel ? [`${powerLabel} ×${POWER.toFixed(2)}`] : [];
  if(sk.duration) parts.push(`Dur. ${(sk.duration*DUR/1000).toFixed(1)}s`);
  if(sk.radius) parts.push(`Área ${Math.round(sk.radius*AREA)}px`);
  if(sk.range) parts.push(`Alcance ${Math.round(sk.range*AREA)}px`);
  if(sk.jumps) parts.push(`Saltos ${sk.jumps + masteryJumpBonus(m)}`);
  return parts.join(" · ");
}
