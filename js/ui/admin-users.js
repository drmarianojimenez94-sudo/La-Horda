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
 // Cada fila (conectados o búsqueda) tiene dos acciones directas: «Regalar» (abre UN diálogo de regalos) y «Ficha».
 const ago = ms => { const m = Math.round((Date.now() - ms) / 60000); return m < 1 ? "ahora" : m < 60 ? "hace " + m + " min" : fmtDate(ms); };
 const ONLINE_MS = 5 * 60000;
 function userRow(ctx, u, sheetBox){
  const {node, action} = ctx, can = p => ctx.perms().length === 0 || ctx.perms().includes(p);
  const row = node("article", undefined, "gm-record gm-user-row"), info = node("div", undefined, "gm-user-info");
  const head = node("strong", (u.name || u.user) + " · " + u.user);
  if(u.founder && typeof founderBadgeHTML === "function"){ const b = node("span"); b.innerHTML = founderBadgeHTML(u.founder.key, "sm"); head.append(" ", b); }
  const online = u.seenAt && Date.now() - u.seenAt < ONLINE_MS;
  const bits = [online ? "● Conectado " + ago(u.seenAt) : "Última actividad: " + fmtDate(Math.max(u.lastLogin || 0, u.seenAt || 0))];
  if(u.roles.length) bits.push(u.roles.join(", "));
  if(u.summary) bits.push(`Oro ${u.summary.gold} · Campeones ${u.summary.guardians}`);
  info.append(head, node("p", bits.join(" · "), online ? "gm-online" : "gm-muted"));
  const btns = node("div", undefined, "gm-row-actions");
  if(can("GRANT_CONTENT") || can("MODIFY_CURRENCY")){ const g = action(btns, "🎁 Regalar", ()=>openGift(ctx, u.id, ()=>{ if(sheetBox.dataset.user === String(u.id)) openSheet(ctx, u.id, sheetBox); })); g.setAttribute("aria-label", "Regalar a " + u.user); }
  const f = action(btns, "Ficha", ()=>openSheet(ctx, u.id, sheetBox), "btn secondary"); f.setAttribute("aria-label", "Ver ficha de " + u.user);
  row.append(info, btns); return row;
 }
 async function users(ctx){
  const {panel, node, action, field, select, form, api} = ctx;
  const sheetBox = node("div", undefined, "gm-sheet");
  // Conectados ahora: cuentas con actividad en los últimos 5 minutos (el servidor lo recuerda en memoria).
  const on = panel("Conectados ahora", "Jugadores con el juego abierto en los últimos 5 minutos. «Regalar» abre el diálogo de regalos de esa cuenta.");
  const onList = node("div", undefined, "gm-user-list");
  async function loadOnline(){
   const r = await api("GET", "/users?filter=online");
   onList.replaceChildren(...(r.users.length ? r.users.map(u=>userRow(ctx, u, sheetBox)) : [node("p", "No hay nadie conectado en este momento.", "gm-muted")]));
  }
  action(on, "Actualizar conectados", loadOnline, "btn secondary"); on.append(onList);
  const p = panel("Todas las cuentas", "Buscá por usuario, nombre visible o ID. Se ordenan por actividad reciente.");
  const results = node("div", undefined, "gm-users");
  const search = form(p, "Buscar usuarios", async d=>{
   const r = await api("GET", "/users?q=" + encodeURIComponent(d.q || "") + "&filter=" + encodeURIComponent(d.filter || ""));
   const table = node("div", undefined, "gm-user-list");
   for(const u of r.users) table.append(userRow(ctx, u, sheetBox));
   results.replaceChildren(node("p", `Mostrando ${r.users.length} de ${r.total} cuentas.`, "gm-muted"), table);
  });
  field(search.f, "Buscar", "q", "text");
  select(search.f, "Filtro", "filter", [["", "Todas las cuentas"], ["online", "Conectados ahora"], ["recent", "Activas 7 días"], ["founder", "Fundadores"], ["staff", "Staff (con roles)"]]);
  search.end(); p.append(results, sheetBox);
  await loadOnline();
  search.f.requestSubmit();
  const fp = panel("Fundadores", "Vinculados por ID de cuenta (server/operator-config.json). No se regalan ni se transfieren.");
  try{ const f = await api("GET", "/founders"); ctx.list(fp, f.founders.map(x=>`${x.key.toUpperCase()} → ${x.champion} · ${x.bound ? "VINCULADO" : "SIN VINCULAR"} (${x.reason})`)); }catch(e){ fp.append(node("p", e.message, "gm-error")); }
 }
 /* ---------------- REGALAR (diálogo único) ----------------
    Usa las rutas existentes del servidor (/api/gm/user/champion, /cosmetic, /currency, /premium, /mailbox): no agrega
    privilegios. El servidor vuelve a validar permisos, FOUNDER (nunca concedible), grantable y la versión del guardado. */
 const CAT_ORDER = ["ASCENSION", "STANDARD", "FAMILY", "EVENT", "TESTER", "DEV", "FOUNDER"];
 const CAT_HEAD = {ASCENSION:"ASCENSIÓN", STANDARD:"STANDARD", FAMILY:"FAMILY", EVENT:"EVENTO", TESTER:"TESTER", DEV:"DEV", FOUNDER:"FUNDADORES"};
 const CAT_HINT = {ASCENSION:"Se ganan al final de la campaña o con logros. Regalarlos los desbloquea ya.", FOUNDER:"Los asigna el sistema a su cuenta. No se regalan."};
 const champName = id => (typeof CLASSES !== "undefined" && CLASSES[id]) ? (CLASSES[id].shortName || CLASSES[id].name) : id;
 async function openGift(ctx, id, onChange){
  const {node, api} = ctx, can = p => ctx.perms().length === 0 || ctx.perms().includes(p);
  const root = ctx.root(); root.querySelector(".gm-gift")?.remove();
  const box = node("div", undefined, "gm-confirm gm-gift"); box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true");
  const card = node("div", undefined, "gm-card gm-gift-card"), head = node("header", undefined, "gm-gift-head"), title = node("h2", "Regalar");
  const close = node("button", "✕", "btn secondary gm-gift-close"); close.type = "button"; close.setAttribute("aria-label", "Cerrar regalos");
  head.append(title, close);
  const sub = node("p", "Cargando…", "gm-muted"), tabsBar = node("div", undefined, "gm-gift-tabs"), body = node("div", undefined, "gm-gift-body");
  const status = node("p", undefined, "gm-gift-status"); status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite");
  card.append(head, sub, tabsBar, status, body); box.append(card); root.append(box);
  // Escape cierra (si no hay una confirmación abierta encima). Escucha en document: al redibujar una pestaña el foco puede quedar en body.
  const onKey = e=>{ if(e.key === "Escape" && box.isConnected && !root.querySelector(".gm-confirm:not(.gm-gift)")){ e.preventDefault(); done(); } };
  const prevFocus = document.activeElement, done = ()=>{ document.removeEventListener("keydown", onKey, true); box.remove(); if(prevFocus && prevFocus.isConnected) prevFocus.focus(); };
  close.onclick = done; document.addEventListener("keydown", onKey, true);
  box.addEventListener("click", e=>{ if(e.target === box) done(); });
  const tell = (t, err)=>{ status.textContent = t; status.classList.toggle("gm-error", !!err); };
  // Botón con manejo de errores dentro del diálogo (el aviso del panel queda tapado por el diálogo).
  function btn(parent, label, fn, cls, aria){ const b = node("button", label, cls || "btn"); b.type = "button"; if(aria) b.setAttribute("aria-label", aria);
   b.onclick = async()=>{ b.disabled = true; try{ await fn(); }catch(e){ tell(e.message, true); }finally{ if(b.isConnected) b.disabled = false; } }; parent.append(b); return b; }
  function pick(parent, label, items){ const l = node("label", undefined, "gm-field"); l.append(node("span", label)); const sel = node("select"); for(const [v, t] of items){ const o = node("option", t); o.value = v; sel.append(o); } l.append(sel); parent.append(l); return sel; }
  function input(parent, label, type, value){ const l = node("label", undefined, "gm-field"); l.append(node("span", label)); const i = node("input"); i.type = type; if(value !== undefined) i.value = value; l.append(i); parent.append(l); return i; }
  let s, a, active;
  const v = ()=>s.save ? s.save.version : 0, who = ()=>a.name && a.name !== a.user ? a.name + " (" + a.user + ")" : a.user;
  const needSave = parent => { if(s.save) return false; parent.append(node("p", "Esta cuenta todavía no tiene progreso guardado: tiene que entrar al juego una vez para poder recibir este regalo.", "gm-error")); return true; };
  const ownsCosmetic = c => s.cosmetics.unlocks.includes(c) || s.cosmetics.cromas.includes(c);
  async function refresh(){ s = await api("GET", "/user?id=" + id); a = s.account;
   title.textContent = "Regalar a " + (a.name || a.user); box.setAttribute("aria-label", "Regalar a " + a.user);
   sub.textContent = `${a.user} · #${a.id} · Oro ${s.gold}${s.premium !== undefined ? " · Brasas ✦ " + s.premium : ""}`; }
  async function after(msg){ await refresh(); show(active); tell(msg); if(onChange) onChange(); }
  const form = parent => { const f = node("div", undefined, "gm-form gm-gift-form"); parent.append(f); return f; };
  const sections = {
   "Campeón": {perm:"GRANT_CONTENT", draw(b){
    if(needSave(b)) return;
    const reason = input(form(b), "Motivo (opcional, queda en el registro)", "text");
    for(const cat of CAT_ORDER){
     const list = s.champions.filter(c=>c.category === cat).sort((x, y)=>champName(x.id).localeCompare(champName(y.id)));
     if(!list.length) continue;
     const sec = node("section", undefined, "gm-gift-cat gm-cat-" + cat.toLowerCase()); sec.append(node("h3", CAT_HEAD[cat] || cat));
     if(CAT_HINT[cat]) sec.append(node("p", CAT_HINT[cat], "gm-muted"));
     const grid = node("div", undefined, "gm-gift-grid");
     for(const c of list){
      const name = champName(c.id), row = node("div", undefined, "gm-gift-item" + (c.unlocked ? " gm-owned" : ""));
      const state = c.unlocked ? "Ya lo tiene" : cat === "FOUNDER" ? "No se regala" : !c.grantable ? "No disponible" : cat === "ASCENSION" ? "Bloqueado" : "No lo tiene";
      const label = node("div"); label.append(node("strong", name), node("span", state + (c.releaseState !== "RELEASED" ? " · " + c.releaseState : ""), "gm-gift-state"));
      row.append(label);
      if(!c.unlocked && c.grantable && cat !== "FOUNDER") btn(row, "Regalar", async()=>{
       if(!await confirmDialog(ctx, {title:"Regalar campeón", user:who(), action:"Regalar " + name + (cat === "ASCENSION" ? " (Ascensión)" : ""), before:state === "Bloqueado" ? "bloqueado" : "no lo tiene", after:"lo tiene (regalo del GM)"})) return;
       await api("POST", "/user/champion", {id, champion:c.id, action:"grant", reason:reason.value, baseVersion:v()});
       await after(name + " regalado a " + a.user + ".");
      }, "btn", "Regalar " + name);
      grid.append(row);
     }
     sec.append(grid); b.append(sec);
    }
   }},
   "Apariencia": {perm:"GRANT_CONTENT", draw(b){
    if(needSave(b)) return;
    const f = form(b), all = ctx.cosmetics(), champs = [...new Set(all.map(c=>c.champion).filter(Boolean))].sort((x, y)=>champName(x).localeCompare(champName(y)));
    const filter = pick(f, "Campeón", [["", "Todos"], ...champs.map(c=>[c, champName(c)])]);
    const sel = pick(f, "Apariencia o croma", []);
    const fill = ()=>{ sel.replaceChildren(); for(const c of all.filter(c=>!filter.value || c.champion === filter.value)){ const o = node("option", c.name + " · " + (c.champion ? champName(c.champion) : "general") + " · " + (c.type === "croma" ? "croma" : "skin") + (ownsCosmetic(c.id) ? " (ya la tiene)" : "")); o.value = c.id; o.disabled = ownsCosmetic(c.id); sel.append(o); } const free = [...sel.options].find(o=>!o.disabled); if(free) sel.value = free.value; };
    filter.onchange = fill; fill();
    const reason = input(f, "Motivo (opcional)", "text");
    btn(f, "Regalar apariencia", async()=>{
     const c = all.find(x=>x.id === sel.value); if(!c || ownsCosmetic(c.id)) throw Error("Elegí una apariencia que todavía no tenga.");
     if(!await confirmDialog(ctx, {title:"Regalar apariencia", user:who(), action:"Regalar " + c.name, before:"no la tiene", after:"la tiene"})) return;
     await api("POST", "/user/cosmetic", {id, cosmetic:c.id, action:"grant", reason:reason.value, baseVersion:v()});
     await after(c.name + " regalada a " + a.user + ".");
    });
   }},
   "Oro": {perm:"MODIFY_CURRENCY", draw(b){
    if(needSave(b)) return;
    b.append(node("p", "Oro actual: " + s.gold + ". Lo que regales se suma a lo que ya tiene."));
    const f = form(b), amount = input(f, "Cantidad de oro a regalar", "number", 1000); amount.min = 1; amount.max = 10000000; amount.step = 1; amount.name = "giftGold";
    const reason = input(f, "Motivo (opcional)", "text");
    btn(f, "Regalar oro", async()=>{
     const n = Number(amount.value); if(!Number.isSafeInteger(n) || n < 1) throw Error("Escribí una cantidad entera mayor que 0.");
     const value = Math.min(10000000, s.gold + n);
     if(!await confirmDialog(ctx, {title:"Regalar oro", user:who(), action:"+" + (value - s.gold) + " de oro", before:s.gold, after:value})) return;
     await api("POST", "/user/currency", {id, field:"gold", value, reason:reason.value, baseVersion:v()});
     await after("Oro regalado: ahora tiene " + value + ".");
    });
   }},
   "Brasas ✦": {perm:"MODIFY_CURRENCY", when:()=>s.premium !== undefined, draw(b){
    b.append(node("p", "Saldo actual: " + s.premium + " ✦ (1000 ✦ = 1 skin). Se acredita en la billetera del servidor."));
    const f = form(b), amount = input(f, "Brasas a regalar", "number", 1000); amount.min = 1; amount.max = 1000000; amount.step = 1; amount.name = "giftPremium";
    const reason = input(f, "Motivo (obligatorio)", "text");
    let ref = crypto.randomUUID();
    btn(f, "Regalar Brasas", async()=>{
     const n = Number(amount.value); if(!Number.isSafeInteger(n) || n < 1 || n > 1000000) throw Error("Escribí una cantidad entera entre 1 y 1.000.000.");
     if(!reason.value.trim()) throw Error("El motivo es obligatorio para las Brasas.");
     if(!await confirmDialog(ctx, {title:"Regalar Brasas", user:who(), action:"+" + n + " ✦", before:s.premium + " ✦", after:(s.premium + n) + " ✦"})) return;
     const r = await api("POST", "/user/premium", {id, amount:n, reason:reason.value, ref});
     ref = crypto.randomUUID(); await after(r.repeated ? "Ese envío ya estaba acreditado." : "Brasas regaladas: ahora tiene " + r.premium + " ✦.");
    });
   }},
   "Objeto o set": {perm:"GRANT_CONTENT", draw(b){
    if(needSave(b)) return;
    b.append(node("p", "Llega al buzón del jugador y se entrega la próxima vez que abra el juego."));
    const f = form(b), kind = pick(f, "Tipo", [["set", "Set completo"], ["item", "Objeto"]]), ref = pick(f, "Contenido", []);
    const fill = ()=>{ ref.replaceChildren(); const list = kind.value === "set" ? (ctx.catalog().sets || []) : ((ctx.catalog().priceCatalog || {}).itemPrices || []);
     for(const x of list){ const o = node("option", kind.value === "set" && typeof SET_DB !== "undefined" && SET_DB[x] ? SET_DB[x].name : kind.value === "item" && typeof ITEM_DB !== "undefined" && ITEM_DB[x] ? ITEM_DB[x].name : x); o.value = x; ref.append(o); } };
    kind.onchange = fill; fill();
    const reason = input(f, "Motivo (opcional)", "text");
    btn(f, "Enviar al buzón", async()=>{
     if(!ref.value) throw Error("Elegí un contenido.");
     const label = ref.selectedOptions[0].textContent;
     if(!await confirmDialog(ctx, {title:"Enviar al buzón", user:who(), action:(kind.value === "set" ? "Set: " : "Objeto: ") + label, before:"buzón con " + s.mailbox.length, after:"buzón con " + (s.mailbox.length + 1)})) return;
     await api("POST", "/user/mailbox", {id, kind:kind.value, ref:ref.value, reason:reason.value, baseVersion:v()});
     await after(label + " enviado al buzón de " + a.user + ".");
    });
   }}
  };
  function show(name){
   active = name; tabsBar.replaceChildren(); body.replaceChildren();
   for(const [t, sec] of Object.entries(sections)){ if(!can(sec.perm) || (sec.when && !sec.when())) continue;
    const b = btn(tabsBar, t, ()=>{ tell(""); show(t); }, "btn gm-gift-tab"); b.setAttribute("aria-pressed", String(t === name)); }
   sections[name].draw(body);
   if(!box.contains(document.activeElement)) tabsBar.querySelector("[aria-pressed=true]")?.focus();
  }
  try{ await refresh(); }catch(e){ tell(e.message, true); return; }
  const first = Object.keys(sections).find(t=>can(sections[t].perm) && (!sections[t].when || sections[t].when()));
  if(!first){ tell("Tu cuenta no tiene permiso para regalar.", true); return; }
  show(first); close.focus();
 }
 async function openSheet(ctx, id, box){
  const {node, action, field, select, form, api, say} = ctx, can = p => ctx.perms().length === 0 || ctx.perms().includes(p);
  box.dataset.user = String(id);
  box.replaceChildren(node("p", "Cargando ficha…"));
  const s = await api("GET", "/user?id=" + id), a = s.account, reload = ()=>openSheet(ctx, id, box), v = ()=>s.save ? s.save.version : 0;
  box.replaceChildren();
  const card = node("section", undefined, "gm-card"); box.append(card);
  const h = node("h2", (a.name || a.user) + " · " + a.user);
  if(a.founder && typeof founderBadgeHTML === "function"){ const b = node("span"); b.innerHTML = founderBadgeHTML(a.founder.key, "md"); h.append(" ", b); }
  card.append(h);
  if(can("GRANT_CONTENT") || can("MODIFY_CURRENCY")) action(card, "🎁 Regalar a " + a.user, ()=>openGift(ctx, id, reload));
  ctx.list(card, [`ID interno: ${a.id}`, `Correo: ${s.email || "—"}`, `Alta: ${fmtDate(a.createdAt)}`, `Última actividad: ${fmtDate(Math.max(a.lastLogin || 0, a.seenAt || 0))}`, `Roles: ${a.roles.join(", ") || "jugador"}`,
   `Fundador: ${a.founder ? a.founder.champion + " (FOUNDER_ENTITLEMENT)" : "no"}`, `Guardado en la nube: ${s.save ? "versión " + s.save.version + " · " + fmtDate(s.save.updatedAt) : "sin guardado"}`,
   `Oro: ${s.gold} · Gemas: ${s.gems} · Brasas ✦: ${s.premium ?? "—"}`, `Arenas superadas: ${Object.keys(s.arenasCleared).filter(k=>s.arenasCleared[k]).join(", ") || "ninguna"}`,
   `Inventario: ${s.inventory.stash} objetos · Colección: ${s.inventory.collection} · Códice: ${s.codex.seen} vistos / ${s.codex.kills} derrotados`,
   `Cosméticos: ${s.cosmetics.unlocks.length + s.cosmetics.cromas.length} · Cristales: ${Object.keys(s.crystals).filter(k=>s.crystals[k]).join(", ") || "—"}`,
   `Buzón pendiente: ${s.mailbox.length} · Flags: ${Object.entries(s.flags).map(([k, x])=>k + "=" + x).join(", ")}`]);
  // Campeones que tiene (revocar). Regalar se hace desde «Regalar». Fundadores: sólo lectura.
  const champs = node("section", undefined, "gm-card"); champs.append(node("h3", "Campeones que tiene"), node("p", "Para regalar uno, usá «Regalar». Los Fundadores los asigna el sistema: no se regalan ni se quitan aquí.", "gm-muted"));
  const tbl = node("div", undefined, "gm-champ-grid");
  for(const c of s.champions.filter(c=>c.unlocked)){
   const row = node("div", undefined, "gm-record");
   const name = champName(c.id);
   row.append(node("strong", name), node("p", `${CAT_LABEL(c.category)} · Nv. ${c.level} · ${Math.round(c.xp)} XP${c.grant ? " · " + c.grant.origin : ""}`));
   if(c.category === "FOUNDER") row.append(node("p", "Concesión exclusiva del sistema", "gm-muted"));
   else if(can("REVOKE_CONTENT")) action(row, "Revocar " + name, async()=>{
    if(!await confirmDialog(ctx, {title:"Revocar campeón", user:a.user, action:"Revocar " + name, before:"posee · Nv. " + c.level, after:"no posee (el progreso del campeón se conserva)", danger:true})) return;
    await api("POST", "/user/champion", {id, champion:c.id, action:"revoke", confirm:true, reason:reasonInput.value, baseVersion:v()}); say(name + " revocado."); reload();
   }, "btn secondary");
   tbl.append(row);
  }
  if(!tbl.children.length) tbl.append(node("p", "No tiene campeones desbloqueados.", "gm-muted"));
  const reasonInput = field(champs, "Motivo (opcional, queda en el registro)", "reason", "text");
  champs.append(tbl); box.append(champs);
  // Progreso
  if(can("MODIFY_CURRENCY")){
   const cur = node("section", undefined, "gm-card"); cur.append(node("h3", "Corregir oro y gemas"), node("p", "Fija el valor exacto. Para regalar oro usá «Regalar».", "gm-muted")); box.append(cur);
   const f = form(cur, "Aplicar valor", async d=>{
    const field_ = d.field, value = Number(d.value), before = field_ === "gems" ? s.gems : s.gold;
    if(!Number.isSafeInteger(value) || value < 0) throw Error("Valor inválido.");
    const lower = value < before;
    if(lower && !await confirmDialog(ctx, {title:"Reducir recurso", user:a.user, action:"Fijar " + field_, before, after:value, danger:true})) return;
    await api("POST", "/user/currency", {id, field:field_, value, confirm:lower || undefined, reason:d.reason, baseVersion:v()}); say("Valor actualizado."); reload();
   });
   select(f.f, "Recurso", "field", [["gold", "Oro"], ["gems", "Gemas"]]); const val = field(f.f, "Nuevo valor", "value", "number", s.gold); val.min = 0; val.max = 10000000; val.required = true; field(f.f, "Motivo", "reason", "text"); f.end();
  }
  // Brasas (moneda premium): saldo en la billetera del SERVIDOR (no en el guardado). Acreditar suma un monto con motivo;
  // un monto negativo corrige (pide confirmación). Cada envío lleva una referencia única: reintentar no acredita dos veces.
  if(can("MODIFY_CURRENCY") && s.premium !== undefined){
   const pc = node("section", undefined, "gm-card gm-premium"); box.append(pc);
   pc.append(node("h3", "Brasas ✦ · movimientos y correcciones"), node("p", `Saldo actual: ${s.premium} ✦ · 1000 ✦ = 1 skin. Para regalar usá «Regalar»; acá se corrige (monto negativo descuenta).`));
   if(s.premiumLedger && s.premiumLedger.length) ctx.list(pc, s.premiumLedger.slice(0, 10).map(e => `${fmtDate(e.at)} · ${e.delta > 0 ? "+" : ""}${e.delta} ✦ → ${e.balanceAfter} · ${e.reason}`));
   else pc.append(node("p", "Sin movimientos.", "gm-muted"));
   let pref = crypto.randomUUID();
   const pf = form(pc, "Aplicar corrección", async d=>{
    const amount = Number(d.amount);
    if(!Number.isSafeInteger(amount) || amount === 0 || Math.abs(amount) > 1000000) throw Error("Monto inválido (entero distinto de 0).");
    if(!String(d.reason || "").trim()) throw Error("El motivo es obligatorio: queda en el libro de la billetera y en el registro.");
    const neg = amount < 0;
    if(!await confirmDialog(ctx, {title:neg ? "Descontar Brasas" : "Acreditar Brasas", user:a.user, action:(neg ? "" : "+") + amount + " ✦", before:s.premium + " ✦", after:(s.premium + amount) + " ✦", danger:neg})) return;
    const r = await api("POST", "/user/premium", {id, amount, reason:d.reason, ref:pref, confirm:neg || undefined});
    pref = crypto.randomUUID(); say(r.repeated ? "Ese envío ya estaba acreditado." : `Listo: ${r.premium} ✦.`); reload();
   });
   const am = field(pf.f, "Monto (negativo para corregir)", "amount", "number", 1000); am.step = 1; am.required = true;
   field(pf.f, "Motivo (obligatorio)", "reason", "text"); pf.end();
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
  const ownedCos = ctx.cosmetics().filter(c=>s.cosmetics.unlocks.includes(c.id) || s.cosmetics.cromas.includes(c.id));
  if(can("REVOKE_CONTENT") && ownedCos.length){
   const cos = node("section", undefined, "gm-card"); cos.append(node("h3", "Quitar apariencia")); box.append(cos);
   const cf = form(cos, "Quitar apariencia", async d=>{
    if(!await confirmDialog(ctx, {title:"Revocar apariencia", user:a.user, action:"Revocar " + d.cosmetic, before:"posee", after:"no posee", danger:true})) return;
    await api("POST", "/user/cosmetic", {id, cosmetic:d.cosmetic, action:"revoke", confirm:true, baseVersion:v()}); say("Apariencia quitada."); reload();
   });
   select(cf.f, "Apariencia", "cosmetic", ownedCos.map(c=>[c.id, c.name + " · " + c.type])); cf.end();
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
 return {users, audit, testlab, confirmDialog, openGift};
})();
