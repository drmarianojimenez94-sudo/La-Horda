"use strict";
/* ============================================================
   js/ui/admin-users.js — Panel GM: USUARIOS (lista real del servidor + ficha + acciones),
   AUDITORÍA (consulta del registro del servidor, solo lectura) y TEST LAB.
   Todo texto de usuario se inserta con textContent. Las acciones peligrosas piden confirmación con
   usuario, acción, valor actual y valor nuevo; el servidor además exige confirm:true (428 si falta).
   ============================================================ */
window.GMExt = (function(){
 const fmtDate = ms => ms ? new Date(ms).toLocaleString() : "—";
 const CAT_LABEL = k => (typeof CHAMPION_CATEGORIES!=="undefined" && CHAMPION_CATEGORIES[k]) ? CHAMPION_CATEGORIES[k].label : k;
 function confirmDialog(ctx, {title, user, action, before, after, danger}){
  return new Promise(resolve=>{
   const root = ctx.root(), box = ctx.node("div", undefined, "gm-confirm"); box.setAttribute("role", "alertdialog"); box.setAttribute("aria-modal", "true");
   const card = ctx.node("div", undefined, "gm-card" + (danger ? " gm-danger" : ""));
   card.append(ctx.node("h2", title || "Confirmar acción"));
   for(const [k, v] of [["Usuario", user], ["Acción", action], ["Valor actual", before], ["Valor nuevo", after]]) if(v !== undefined){ const p = ctx.node("p"); p.append(ctx.node("b", k + ": "), document.createTextNode(String(v))); card.append(p); }
   const done = ok => { box.remove(); resolve(ok); };
   ctx.action(card, "Confirmar", ()=>done(true), "btn" + (danger ? " danger" : ""));
   ctx.action(card, "Cancelar", ()=>done(false), "btn secondary");
   box.append(card); root.append(box); card.querySelector("button").focus();
   box.addEventListener("keydown", e=>{ if(e.key === "Escape") done(false); });
  });
 }
 /* ---------------- USUARIOS ---------------- */
 async function users(ctx){
  const {panel, node, action, field, select, form, api, say} = ctx, can = p => ctx.perms().length === 0 || ctx.perms().includes(p);
  const p = panel("Usuarios", "Lista real de cuentas del servidor. Buscá por usuario, nombre visible o ID interno.");
  const results = node("div", undefined, "gm-users"), sheetBox = node("div", undefined, "gm-sheet");
  const search = form(p, "Buscar usuarios", async d=>{
   const r = await api("GET", "/users?q=" + encodeURIComponent(d.q || "") + "&filter=" + encodeURIComponent(d.filter || ""));
   results.replaceChildren(node("p", `Mostrando ${r.users.length} de ${r.total} cuentas.`));
   const table = node("div", undefined, "gm-user-list");
   for(const u of r.users){
    const row = node("article", undefined, "gm-record gm-user-row");
    const head = node("h3", (u.name || u.user) + " · " + u.user + " · #" + u.id);
    if(u.founder && typeof founderBadgeHTML === "function"){ const b = node("span"); b.innerHTML = founderBadgeHTML(u.founder.key, "sm"); head.append(" ", b); }
    row.append(head, node("p", `Roles: ${u.roles.join(", ") || "jugador"} · Alta: ${fmtDate(u.createdAt)} · Última actividad: ${fmtDate(u.lastLogin)}`));
    if(u.summary) row.append(node("p", `Oro ${u.summary.gold} · Nivel máx. ${u.summary.maxLevel} · Campeones ${u.summary.guardians} · Arenas ${u.summary.arenas}`));
    action(row, "Ver ficha de " + u.user, ()=>openSheet(ctx, u.id, sheetBox));
    table.append(row);
   }
   results.append(table);
  });
  field(search.f, "Buscar", "q", "text");
  select(search.f, "Filtro", "filter", [["", "Todas las cuentas"], ["founder", "Fundadores"], ["staff", "Staff (con roles)"], ["recent", "Activas 7 días"]]);
  search.end(); p.append(results, sheetBox);
  const fp = panel("Fundadores", "Vinculación por ID estable de cuenta (server/operator-config.json). Nunca por nombre visible y nunca transferibles.");
  try{ const f = await api("GET", "/founders"); ctx.list(fp, f.founders.map(x=>`${x.key.toUpperCase()} → ${x.champion} · ${x.bound ? "VINCULADO" : "SIN VINCULAR"} (${x.reason})`)); }catch(e){ fp.append(node("p", e.message, "gm-error")); }
  if(!can("VIEW_USERS")) p.append(node("p", "Sin permiso para ver usuarios.", "gm-error"));
 }
 async function openSheet(ctx, id, box){
  const {node, action, field, select, form, api, say} = ctx, can = p => ctx.perms().length === 0 || ctx.perms().includes(p);
  box.replaceChildren(node("p", "Cargando ficha…"));
  const s = await api("GET", "/user?id=" + id), a = s.account, reload = ()=>openSheet(ctx, id, box), v = ()=>s.save ? s.save.version : 0;
  box.replaceChildren();
  const card = node("section", undefined, "gm-card"); box.append(card);
  const h = node("h2", (a.name || a.user) + " · " + a.user);
  if(a.founder && typeof founderBadgeHTML === "function"){ const b = node("span"); b.innerHTML = founderBadgeHTML(a.founder.key, "md"); h.append(" ", b); }
  card.append(h);
  ctx.list(card, [`ID interno: ${a.id}`, `Correo: ${s.email || "—"}`, `Alta: ${fmtDate(a.createdAt)}`, `Última actividad: ${fmtDate(a.lastLogin)}`, `Roles: ${a.roles.join(", ") || "jugador"}`,
   `Fundador: ${a.founder ? a.founder.champion + " (FOUNDER_ENTITLEMENT)" : "no"}`, `Guardado en la nube: ${s.save ? "versión " + s.save.version + " · " + fmtDate(s.save.updatedAt) : "sin guardado"}`,
   `Oro: ${s.gold} · Gemas: ${s.gems}`, `Arenas superadas: ${Object.keys(s.arenasCleared).filter(k=>s.arenasCleared[k]).join(", ") || "ninguna"}`,
   `Inventario: ${s.inventory.stash} objetos · Colección: ${s.inventory.collection} · Códice: ${s.codex.seen} vistos / ${s.codex.kills} derrotados`,
   `Cosméticos: ${s.cosmetics.unlocks.length + s.cosmetics.cromas.length} · Cristales: ${Object.keys(s.crystals).filter(k=>s.crystals[k]).join(", ") || "—"}`,
   `Buzón pendiente: ${s.mailbox.length} · Flags: ${Object.entries(s.flags).map(([k, x])=>k + "=" + x).join(", ")}`]);
  // Campeones: conceder / revocar. Fundadores: sólo lectura.
  const champs = node("section", undefined, "gm-card"); champs.append(node("h3", "Campeones"), node("p", "Conceder o revocar desde la ficha. Los Fundadores los asigna el sistema a su cuenta: no se conceden ni se revocan aquí."));
  const tbl = node("div", undefined, "gm-champ-grid");
  for(const c of s.champions){
   const row = node("div", undefined, "gm-record");
   const name = (typeof CLASSES !== "undefined" && CLASSES[c.id] ? CLASSES[c.id].name : c.id);
   row.append(node("strong", name), node("p", `${CAT_LABEL(c.category)} · ${c.releaseState} · ${c.unlocked ? "POSEE · Nv. " + c.level + " · " + Math.round(c.xp) + " XP" : "no posee"}${c.grant ? " · " + c.grant.origin : ""}`));
   if(c.category === "FOUNDER") row.append(node("p", "Concesión exclusiva del sistema", "gm-muted"));
   else if(!c.unlocked && c.grantable && can("GRANT_CONTENT")) action(row, "Conceder " + name, async()=>{
    if(!await confirmDialog(ctx, {title:"Conceder campeón", user:a.user, action:"Conceder " + name, before:"no posee", after:"posee (ADMIN_GRANT)"})) return;
    await api("POST", "/user/champion", {id, champion:c.id, action:"grant", reason:reasonInput.value, baseVersion:v()}); say(name + " concedido."); reload();
   });
   else if(c.unlocked && can("REVOKE_CONTENT")) action(row, "Revocar " + name, async()=>{
    if(!await confirmDialog(ctx, {title:"Revocar campeón", user:a.user, action:"Revocar " + name, before:"posee · Nv. " + c.level, after:"no posee (el progreso del campeón se conserva)", danger:true})) return;
    await api("POST", "/user/champion", {id, champion:c.id, action:"revoke", confirm:true, reason:reasonInput.value, baseVersion:v()}); say(name + " revocado."); reload();
   }, "btn secondary");
   tbl.append(row);
  }
  const reasonInput = field(champs, "Motivo (opcional, queda en el registro)", "reason", "text");
  champs.append(tbl); box.append(champs);
  // Progreso
  if(can("MODIFY_CURRENCY")){
   const cur = node("section", undefined, "gm-card"); cur.append(node("h3", "Oro y gemas")); box.append(cur);
   const f = form(cur, "Aplicar valor", async d=>{
    const field_ = d.field, value = Number(d.value), before = field_ === "gems" ? s.gems : s.gold;
    if(!Number.isSafeInteger(value) || value < 0) throw Error("Valor inválido.");
    const lower = value < before;
    if(lower && !await confirmDialog(ctx, {title:"Reducir recurso", user:a.user, action:"Fijar " + field_, before, after:value, danger:true})) return;
    await api("POST", "/user/currency", {id, field:field_, value, confirm:lower || undefined, reason:d.reason, baseVersion:v()}); say("Valor actualizado."); reload();
   });
   select(f.f, "Recurso", "field", [["gold", "Oro"], ["gems", "Gemas"]]); const val = field(f.f, "Nuevo valor", "value", "number", s.gold); val.min = 0; val.max = 10000000; val.required = true; field(f.f, "Motivo", "reason", "text"); f.end();
  }
  if(can("EDIT_USER_PROGRESS")){
   const prog = node("section", undefined, "gm-card"); prog.append(node("h3", "Progreso")); box.append(prog);
   const owned = s.champions.filter(c=>c.unlocked);
   const lv = form(prog, "Aplicar nivel", async d=>{
    const c = owned.find(x=>x.id === d.champion), level = Number(d.level); if(!c) throw Error("Elegí un campeón que posea.");
    const lower = level < c.level;
    if(lower && !await confirmDialog(ctx, {title:"Bajar nivel", user:a.user, action:"Nivel de " + c.id, before:c.level, after:level + " (talentos reiniciados)", danger:true})) return;
    await api("POST", "/user/level", {id, champion:c.id, level, confirm:lower || undefined, baseVersion:v()}); say("Nivel actualizado."); reload();
   });
   select(lv.f, "Campeón", "champion", owned.map(c=>[c.id, c.id + " · Nv. " + c.level])); const li = field(lv.f, "Nivel", "level", "number", 1); li.min = 1; li.max = 99; li.required = true; lv.end();
   const ar = form(prog, "Aplicar arena", async d=>{
    const cleared = d.state === "1", before = !!s.arenasCleared[d.arena];
    if(!cleared && !await confirmDialog(ctx, {title:"Bloquear arena", user:a.user, action:"Arena " + d.arena, before:before ? "superada" : "no superada", after:"bloqueada", danger:true})) return;
    await api("POST", "/user/arena", {id, arena:d.arena, cleared, confirm:!cleared || undefined, baseVersion:v()}); say("Arena actualizada."); reload();
   });
   select(ar.f, "Arena", "arena", (ctx.catalog().arenas || []).map(x=>[x, x + (s.arenasCleared[x] ? " ✔" : "")])); select(ar.f, "Estado", "state", [["1", "Desbloquear (superada)"], ["0", "Bloquear"]]); ar.end();
   action(prog, "Reparar estados inválidos", async()=>{
    if(!await confirmDialog(ctx, {title:"Reparar guardado", user:a.user, action:"Corregir valores inválidos (oro negativo, niveles fuera de rango, propiedad de Fundadores/no publicados)", before:"actual", after:"corregido"})) return;
    const r = await api("POST", "/user/repair", {id, baseVersion:v()}); say("Reparación: " + (r.fixes.length ? r.fixes.length + " correcciones" : "nada que corregir")); reload();
   }, "btn secondary");
   action(prog, "Inspeccionar guardado en la nube", async()=>{
    const r = await api("GET", "/user/save?id=" + id); const pre = node("pre", JSON.stringify(r.data, null, 1).slice(0, 60000), "gm-pre"); prog.append(pre);
   }, "btn secondary");
  }
  if(can("GRANT_CONTENT")){
   const cos = node("section", undefined, "gm-card"); cos.append(node("h3", "Skins, ítems y sets")); box.append(cos);
   const cf = form(cos, "Aplicar apariencia", async d=>{
    const revoke = d.mode === "revoke", owns = s.cosmetics.unlocks.includes(d.cosmetic) || s.cosmetics.cromas.includes(d.cosmetic);
    if(revoke && !await confirmDialog(ctx, {title:"Revocar apariencia", user:a.user, action:"Revocar " + d.cosmetic, before:owns ? "posee" : "no posee", after:"no posee", danger:true})) return;
    await api("POST", "/user/cosmetic", {id, cosmetic:d.cosmetic, action:revoke ? "revoke" : "grant", confirm:revoke || undefined, baseVersion:v()}); say("Apariencia actualizada."); reload();
   });
   select(cf.f, "Apariencia", "cosmetic", ctx.cosmetics().map(c=>[c.id, c.name + " · " + c.type + (s.cosmetics.unlocks.includes(c.id) || s.cosmetics.cromas.includes(c.id) ? " ✔" : "")]));
   select(cf.f, "Acción", "mode", [["grant", "Conceder"], ["revoke", "Revocar"]]); cf.end();
   const mf = form(cos, "Enviar al buzón", async d=>{ await api("POST", "/user/mailbox", {id, kind:d.kind, ref:d.ref, reason:d.reason, baseVersion:v()}); say("Enviado al buzón: se entrega al abrir el juego."); reload(); });
   const kind = select(mf.f, "Tipo", "kind", [["set", "Set completo"], ["item", "Objeto"]]), ref = select(mf.f, "Contenido", "ref", []);
   const fill = ()=>{ ref.replaceChildren(); const list = kind.value === "set" ? (ctx.catalog().sets || []) : ((ctx.catalog().priceCatalog || {}).itemPrices || []); for(const x of list){ const o = node("option", kind.value === "set" && typeof SET_DB !== "undefined" && SET_DB[x] ? SET_DB[x].name : x); o.value = x; ref.append(o); } };
   kind.onchange = fill; fill(); field(mf.f, "Motivo", "reason", "text"); mf.end();
  }
  if(can("MANAGE_ROLES")){
   const rl = node("section", undefined, "gm-card gm-danger"); rl.append(node("h3", "Roles y permisos"), node("p", "ADMIN: todo salvo roles · SUPPORT: ver usuarios, auditoría y conceder · TESTER: Test Lab. FOUNDER es identidad, no un permiso.")); box.append(rl);
   const rf = form(rl, "Guardar roles", async d=>{
    const roles = ["ADMIN", "SUPPORT", "TESTER"].filter(r=>d[r] === "on");
    if(!await confirmDialog(ctx, {title:"Modificar permisos", user:a.user, action:"Roles", before:a.roles.join(", ") || "jugador", after:roles.join(", ") || "jugador", danger:true})) return;
    await api("POST", "/roles", {id, roles, confirm:true}); say("Roles actualizados."); reload();
   });
   for(const r of ["ADMIN", "SUPPORT", "TESTER"]){ const i = field(rf.f, r, r, "checkbox"); i.checked = a.roles.includes(r); }
   rf.end();
  }
  box.scrollIntoView({block:"start"});
 }
 /* ---------------- AUDITORÍA ---------------- */
 async function audit(ctx){
  const {panel, node, field, form, api} = ctx;
  const p = panel("Registro de auditoría", "Registrado por el servidor; no se edita desde el panel. Filtrá por administrador (ID), usuario afectado (ID), acción y fecha.");
  const out = node("div");
  const f = form(p, "Consultar", async d=>{
   const q = new URLSearchParams();
   if(d.actor) q.set("actor", d.actor); if(d.target) q.set("target", d.target); if(d.action) q.set("action", d.action);
   if(d.from) q.set("from", String(new Date(d.from).getTime())); if(d.to) q.set("to", String(new Date(d.to).getTime()));
   const r = await api("GET", "/audit?" + q.toString());
   out.replaceChildren(node("p", `${r.entries.length} de ${r.total} registros.`));
   for(const e of r.entries){
    const row = node("article", undefined, "gm-record");
    row.append(node("strong", `${fmtDate(e.at)} · ${e.action}`), node("p", `Actor: ${e.actor || "#" + e.owner}${e.target ? " · Usuario #" + e.target : ""}${e.type ? " · " + e.type : ""}${e.content ? " · " + e.content : ""}${e.origin ? " · " + e.origin : ""}`));
    if(e.before !== undefined || e.after !== undefined) row.append(node("p", `Antes: ${JSON.stringify(e.before)} → Después: ${JSON.stringify(e.after)}`));
    if(e.reason) row.append(node("p", "Motivo: " + e.reason));
    out.append(row);
   }
  });
  field(f.f, "Administrador (ID)", "actor", "number"); field(f.f, "Usuario afectado (ID)", "target", "number");
  field(f.f, "Acción (prefijo: champion, currency, roles, reset…)", "action", "text"); field(f.f, "Desde", "from", "datetime-local"); field(f.f, "Hasta", "to", "datetime-local");
  f.end(); p.append(out); f.f.requestSubmit();
 }
 /* ---------------- TEST LAB ---------------- */
 async function testlab(ctx){
  const {panel, node, field, select, form, api, say} = ctx;
  const p = panel("GM / Test Lab", "SESIÓN DE TEST: nada de lo que pase se guarda (recursos, XP, botín ni progreso). Al volver al menú se restaura tu progreso real. Podés probar cualquier categoría y estado, incluso campeones sin publicar.");
  const champs = testLabChampions();
  const f = form(p, "Iniciar sesión de test", async d=>{
   await api("POST", "/testlab/start", {champion:d.champion, arena:d.arena, skin:d.skin, level:Number(d.level)});
   const cfg = {champion:d.champion, skin:d.skin, level:Number(d.level), talents:d.talents, arena:d.arena, difficulty:d.difficulty, equipment:d.equipment, startLevel:Number(d.startLevel), mods:{enemyHp:Number(d.enemyHp), spawnRate:Number(d.spawnRate), enemyDamage:Number(d.enemyDamage)}};
   location.hash = ""; // cierra el panel
   setTimeout(()=>{ try{ testLabStart(cfg); }catch(e){ if(typeof gameAlert === "function") gameAlert(e.message); } }, 50);
  });
  const cat = select(f.f, "Categoría", "category", [["", "Todas"], ...Object.keys(CHAMPION_CATEGORIES).map(k=>[k, CHAMPION_CATEGORIES[k].label])]);
  const champ = select(f.f, "Campeón", "champion", []), skin = select(f.f, "Apariencia", "skin", []);
  const fillChamps = ()=>{ champ.replaceChildren(); for(const c of champs.filter(c=>!cat.value || c.category === cat.value)){ const o = node("option", `${c.name} · ${CAT_LABEL(c.category)} · ${c.releaseState}`); o.value = c.id; champ.append(o); } fillSkins(); };
  const fillSkins = ()=>{ skin.replaceChildren(); for(const [v, t] of testLabSkins(champ.value)){ const o = node("option", t); o.value = v; skin.append(o); } };
  cat.onchange = fillChamps; champ.onchange = fillSkins; fillChamps();
  const lv = field(f.f, "Nivel", "level", "number", 20); lv.min = 1; lv.max = 99;
  select(f.f, "Talentos", "talents", [["none", "Sin talentos"], ["max", "Árbol completo + maestría"]]);
  select(f.f, "Equipamiento", "equipment", [["none", "Sin equipo"], ["set", "Set propio completo (si existe)"]]);
  select(f.f, "Arena", "arena", (typeof ARENA_ORDER !== "undefined" ? ARENA_ORDER : ["bosque"]).map(a=>[a, ARENA_MODS[a] ? (ARENA_MODS[a].name || a) : a]));
  select(f.f, "Dificultad", "difficulty", Object.keys(typeof DIFF_TIERS !== "undefined" ? DIFF_TIERS : {normal:1}).map(k=>[k, k]));
  const wave = field(f.f, "Empezar en el nivel de arena (oleada)", "startLevel", "number", 1); wave.min = 1; wave.max = 10;
  for(const [k, l] of [["enemyHp", "Vida de enemigos ×"], ["enemyDamage", "Daño de enemigos ×"], ["spawnRate", "Aparición de enemigos ×"]]){ const i = field(f.f, l, k, "number", 1); i.min = .1; i.max = 10; i.step = .1; }
  f.end();
  if(typeof testLabActive === "function" && testLabActive()) p.append(node("p", "Hay una sesión de test activa: volvé al menú para terminarla.", "gm-error"));
 }
 return {users, audit, testlab, confirmDialog};
})();
