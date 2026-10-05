"use strict";
// Admin: real user list, user sheet, content grants/revokes, currency, progress, roles, audit query.
// Every route checks an RBAC permission server-side; hiding a button in the client is never relied on.
// Save writes use CAS (baseVersion) and every mutation is recorded in the GM audit log.
const rbac = require("./rbac");
const ent = require("./entitlements");
const adminLevels = require("./admin-levels");

function routes(ctx){
  const {route, mutate, read, audit, fail, text, getStore, summarize, now, isOwner, founders, cosmetics, gameplay, shopCatalog} = ctx;
  const seenAt = ctx.seenAt || (() => 0), ONLINE_MS = 5 * 60000;
  const store = () => getStore();
  const num = v => Number.isSafeInteger(v) ? v : typeof v === "string" && /^\d{1,15}$/.test(v.trim()) ? Number(v) : NaN;

  async function target(idValue){
    const id = num(idValue); if(!Number.isSafeInteger(id) || id < 1) fail("BAD_USER");
    const u = await store().getUser(id); if(!u) fail("NOT_FOUND", 404); return u;
  }
  function publicAccount(u, ops){
    const f = ent.founderOf(founders(), u.id);
    return {id:u.id, user:u.user, name:u.name || u.user, createdAt:u.createdAt, lastLogin:u.lastLogin || 0,
      roles:rbac.rolesOf(u, ops, isOwner), founder:f ? {key:f.key, champion:f.champion} : null, seenAt:seenAt(u.id)};
  }
  function sheet(u, saved, ops){
    let data = null; try{ data = saved ? JSON.parse(saved.data) : null; }catch(e){}
    const d = data || {}, champs = d.champions || {};
    const grants = ent.ledgerChampions(ops, u.id);
    return {
      account:publicAccount(u, ops), email:u.email || null,
      save:saved ? {version:saved.version, updatedAt:saved.updatedAt, summary:saved.summary} : null,
      gold:Math.max(0, Math.floor(+d.gold || 0)), gems:Math.max(0, Math.floor(+d.gems || 0)),
      champions:ent.taxonomy().ids.map(id => {
        const c = champs[id] || {}, m = ent.taxonomy().meta(id);
        return {id, unlocked:!!c.unlocked, level:c.level | 0, xp:Math.max(0, +c.xp || 0), category:m.category, releaseState:m.releaseState, grantable:!!m.grantable,
          grant:grants[id] && !grants[id].revokedAt ? {origin:grants[id].origin, at:grants[id].at} : null};
      }),
      arenasCleared:d.arenasCleared || {}, diffCleared:d.diffCleared || {},
      cosmetics:{cromas:Object.keys(d.cromas || {}).filter(k => d.cromas[k]), unlocks:Object.keys(d.cosmeticUnlocks || {}).filter(k => d.cosmeticUnlocks[k])},
      inventory:{stash:Array.isArray(d.stash) ? d.stash.length : 0, collection:Object.keys(d.collection || {}).length},
      crystals:d.crystals || {}, quests:!!d.quests, codex:{seen:Object.keys((d.codex && d.codex.seen) || {}).length, kills:Object.keys((d.codex && d.codex.kills) || {}).length},
      mailbox:Array.isArray(d.adminMailbox) ? d.adminMailbox : [],
      flags:{starterChosen:!!d.starterChosen, firstRun:d.firstRun ?? null, testStageV1:!!d.testStageV1},
      grantLedger:Object.entries(grants).map(([id, g]) => ({content:id, kind:"champion", ...g}))
    };
  }
  // Load a save, verify the admin's frozen version, apply fn, write with CAS.
  async function editSave(u, baseVersion, fn){
    const saved = await store().getSave(u.id);
    if(!saved) fail("NO_SAVE", 404);
    if(!Number.isSafeInteger(baseVersion) || baseVersion !== saved.version) fail("CONFLICT", 409);
    const data = JSON.parse(saved.data), result = fn(data);
    const put = await store().putSave(u.id, JSON.stringify(data), summarize(data), saved.version, false);
    if(!put.ok) fail("CONFLICT", 409);
    return {version:put.version, result};
  }
  const needConfirm = (body, dangerous) => { if(dangerous && body.confirm !== true) fail("CONFIRMATION_REQUIRED", 428); };
  const reasonOf = body => text(body.reason, 200);

  route("GET", "/api/gm/users", "VIEW_USERS", async({req}) => {
    const qs = new URL(req.url, "http://x").searchParams, q = text(qs.get("q"), 40).toLowerCase(), filter = text(qs.get("filter"), 20);
    const ops = await read(), t = now();
    let users = await store().listUsers();
    users = users.filter(u => !q || u.user.toLowerCase().includes(q) || String(u.name || "").toLowerCase().includes(q) || String(u.id) === q);
    const view = users.map(u => publicAccount(u, ops));
    // online: cuentas con una petición autenticada en los últimos 5 minutos (presencia en memoria del servidor).
    const active = u => Math.max(u.lastLogin, u.seenAt);
    const filtered = view.filter(u => filter === "founder" ? !!u.founder : filter === "staff" ? u.roles.length > 0 : filter === "recent" ? active(u) >= t - 7 * 86400000 : filter === "online" ? u.seenAt >= t - ONLINE_MS : true)
      .sort((a, b) => active(b) - active(a)).slice(0, 100);
    for(const u of filtered){ const m = await store().getSaveMeta(u.id); u.summary = m ? m.summary : null; u.saveVersion = m ? m.version : null; }
    return {users:filtered, total:users.length};
  });
  route("GET", "/api/gm/user", "VIEW_USERS", async({req}) => {
    const u = await target(new URL(req.url, "http://x").searchParams.get("id"));
    const out = sheet(u, await store().getSave(u.id), await read());
    // moneda premium (Brasas): vive en la billetera del servidor, no en el guardado (server/wallet.js)
    if(store().walletGet){ out.premium = (await store().walletGet(u.id)).premium; out.premiumLedger = await store().walletLedger(u.id, 25); }
    return out;
  });
  route("GET", "/api/gm/user/save", "EDIT_USER_PROGRESS", async({req, user}) => {
    const u = await target(new URL(req.url, "http://x").searchParams.get("id")), saved = await store().getSave(u.id);
    await mutate(s => { audit(s, user, "user.inspect_save", {target:u.id, type:"save"}, now()); return null; });
    return {version:saved ? saved.version : 0, data:saved ? JSON.parse(saved.data) : null};
  });

  // Champions: FOUNDER is never grantable or revocable here; ownership is FOUNDER_ENTITLEMENT only.
  route("POST", "/api/gm/user/champion", "GRANT_CONTENT", async({user, body}) => {
    const u = await target(body.id), champion = body.champion, grant = body.action === "grant";
    if(!["grant", "revoke"].includes(body.action)) fail("BAD_ACTION");
    if(!ent.isChampion(champion)) fail("BAD_CHAMPION");
    const m = ent.taxonomy().meta(champion);
    if(m.category === "FOUNDER") fail("FOUNDER_NOT_GRANTABLE", 403);
    if(!grant && !rbac.can(user, await read(), isOwner, "REVOKE_CONTENT")) fail("FORBIDDEN", 403);
    if(grant && !m.grantable) fail("NOT_GRANTABLE", 403);
    needConfirm(body, !grant);
    const origin = grant && body.origin === "EVENT_REWARD" ? "EVENT_REWARD" : "ADMIN_GRANT", reason = reasonOf(body);
    const saved = await store().getSave(u.id);
    let before = false, version = saved ? saved.version : null;
    if(saved){
      const r = await editSave(u, body.baseVersion, d => {
        const c = (d.champions = d.champions || {})[champion] || {};
        const old = !!c.unlocked; d.champions[champion] = Object.assign(c, {unlocked:grant}); return old;
      });
      before = r.result; version = r.version;
    }
    await mutate(s => {
      const g = ((s.grants = s.grants || {})[u.id] = s.grants[u.id] || {champions:{}}).champions;
      if(grant) g[champion] = {origin, by:user.id, at:now(), reason};
      else if(g[champion]) g[champion] = {...g[champion], revokedAt:now(), revokedBy:user.id, revokeReason:reason};
      audit(s, user, grant ? "champion.grant" : "champion.revoke", {target:u.id, type:"champion", content:champion, origin:grant ? origin : undefined, reason, before, after:grant}, now());
      return null;
    });
    return {ok:true, version, champion, unlocked:grant};
  });

  // Category grant ("Regalar toda la Familia"): grants, in one CAS write, every champion of a grantable taxonomy
  // category (FAMILY, ASCENSION, ...) that the target does not own yet. Membership comes from the taxonomy, never from
  // client ids. FOUNDER is rejected; champions individually not grantable (e.g. artPending) are skipped. Same ledger and
  // one champion.grant audit entry per champion (tagged with the category), exactly like single grants.
  route("POST", "/api/gm/user/champion-category", "GRANT_CONTENT", async({user, body}) => {
    const u = await target(body.id), cats = ent.taxonomy().categories, category = body.category;
    if(typeof category !== "string" || !Object.prototype.hasOwnProperty.call(cats, category)) fail("BAD_CATEGORY");
    if(category === "FOUNDER") fail("FOUNDER_NOT_GRANTABLE", 403);
    if(!cats[category].grantable) fail("NOT_GRANTABLE", 403);
    needConfirm(body, true);
    const origin = body.origin === "EVENT_REWARD" ? "EVENT_REWARD" : "ADMIN_GRANT", reason = reasonOf(body);
    const members = ent.taxonomy().ids.filter(id => { const m = ent.taxonomy().meta(id); return m.category === category && m.category !== "FOUNDER" && m.grantable; });
    const saved = await store().getSave(u.id), ledger = ent.ledgerChampions(await read(), u.id);
    let version = saved ? saved.version : null, granted;
    if(saved){
      const owned = JSON.parse(saved.data).champions || {};
      granted = members.filter(id => !(owned[id] && owned[id].unlocked));
      if(granted.length){
        const r = await editSave(u, body.baseVersion, d => { const c = d.champions = d.champions || {}; for(const id of granted) c[id] = Object.assign(c[id] || {}, {unlocked:true}); return null; });
        version = r.version;
      }
    }else granted = members.filter(id => !(ledger[id] && !ledger[id].revokedAt));
    if(granted.length) await mutate(s => {
      const g = ((s.grants = s.grants || {})[u.id] = s.grants[u.id] || {champions:{}}).champions;
      for(const id of granted){
        g[id] = {origin, by:user.id, at:now(), reason};
        audit(s, user, "champion.grant", {target:u.id, type:"champion", content:id, origin, reason, before:false, after:true, details:{category}}, now());
      }
      return null;
    });
    return {ok:true, version, category, granted};
  });

  route("POST", "/api/gm/user/cosmetic", "GRANT_CONTENT", async({user, body}) => {
    const u = await target(body.id), grant = body.action === "grant";
    if(!["grant", "revoke"].includes(body.action)) fail("BAD_ACTION");
    const cosmetic = Object.hasOwn(cosmetics(), body.cosmetic) ? cosmetics()[body.cosmetic] : null; if(!cosmetic) fail("BAD_COSMETIC");
    if(!grant && !rbac.can(user, await read(), isOwner, "REVOKE_CONTENT")) fail("FORBIDDEN", 403);
    needConfirm(body, !grant);
    const r = await editSave(u, body.baseVersion, d => {
      const before = !!(d.cosmeticUnlocks && d.cosmeticUnlocks[cosmetic.id]) || !!(d.cromas && d.cromas[cosmetic.id]);
      d.cosmeticUnlocks = {...d.cosmeticUnlocks}; if(grant) d.cosmeticUnlocks[cosmetic.id] = true; else delete d.cosmeticUnlocks[cosmetic.id];
      if(cosmetic.type === "croma"){ d.cromas = {...d.cromas}; if(grant) d.cromas[cosmetic.id] = true; else delete d.cromas[cosmetic.id]; }
      if(!grant) for(const c of Object.values(d.champions || {})) if(c && (c.cosmeticSkin === cosmetic.id || c.croma === cosmetic.id)){ if(c.cosmeticSkin === cosmetic.id) c.cosmeticSkin = ""; if(c.croma === cosmetic.id) c.croma = null; }
      return before;
    });
    await mutate(s => { audit(s, user, grant ? "cosmetic.grant" : "cosmetic.revoke", {target:u.id, type:cosmetic.type, content:cosmetic.id, origin:grant ? "ADMIN_GRANT" : undefined, reason:reasonOf(body), before:r.result, after:grant}, now()); return null; });
    return {ok:true, version:r.version};
  });

  // Brasas (premium): ACREDITAR un monto (o corregir con uno negativo). Va al libro de la billetera con ref única
  // (reintentar el mismo pedido no acredita dos veces) y al registro de auditoría del panel.
  route("POST", "/api/gm/user/premium", "MODIFY_CURRENCY", async({user, body}) => {
    const u = await target(body.id), amount = body.amount;
    if(!store().walletApply) fail("WALLET_DOWN", 503);
    if(!Number.isSafeInteger(amount) || amount === 0 || Math.abs(amount) > 1000000) fail("BAD_AMOUNT");
    const reason = reasonOf(body); if(!reason) fail("NEED_REASON");
    needConfirm(body, amount < 0);
    const ref = typeof body.ref === "string" && /^[a-zA-Z0-9_.:-]{8,80}$/.test(body.ref) ? body.ref : null; if(!ref) fail("BAD_REF");
    const r = await store().walletApply({userId:u.id, delta:amount, reason:"gm:" + reason, ref:"gm:" + ref, actor:user.id, at:now()});
    if(r.insufficient) fail("INSUFFICIENT", 409);
    if(!r.duplicate) await mutate(s => { audit(s, user, "currency.premium", {target:u.id, type:"premium", reason, before:r.premium - amount, after:r.premium}, now()); return null; });
    return {ok:true, premium:r.premium, repeated:!!r.duplicate};
  });

  route("POST", "/api/gm/user/currency", "MODIFY_CURRENCY", async({user, body}) => {
    const u = await target(body.id), field = body.field === "gems" ? "gems" : "gold", value = body.value;
    if(!Number.isSafeInteger(value) || value < 0 || value > 10000000) fail("BAD_VALUE");
    const saved = await store().getSave(u.id); if(!saved) fail("NO_SAVE", 404);
    const current = Math.max(0, Math.floor(+JSON.parse(saved.data)[field] || 0));
    needConfirm(body, value < current);
    const r = await editSave(u, body.baseVersion, d => { const before = Math.max(0, Math.floor(+d[field] || 0)); d[field] = value; return before; });
    await mutate(s => { audit(s, user, "currency.set", {target:u.id, type:field, reason:reasonOf(body), before:r.result, after:value}, now()); return null; });
    return {ok:true, version:r.version, [field]:value};
  });

  route("POST", "/api/gm/user/level", "EDIT_USER_PROGRESS", async({user, body}) => {
    const u = await target(body.id);
    if(!ent.isChampion(body.champion)) fail("BAD_CHAMPION");
    const saved = await store().getSave(u.id); if(!saved) fail("NO_SAVE", 404);
    const old = (JSON.parse(saved.data).champions || {})[body.champion]?.level | 0;
    needConfirm(body, Number.isInteger(body.level) && body.level < old);
    let next;
    const r = await editSave(u, body.baseVersion, d => {
      try{ next = adminLevels.editLevel(d, body.champion, body.level); }catch(e){ fail("BAD_LEVEL"); }
      Object.assign(d, next); return old;
    });
    await mutate(s => { audit(s, user, "level.set", {target:u.id, type:"champion", content:body.champion, before:r.result, after:body.level}, now()); return null; });
    return {ok:true, version:r.version};
  });

  route("POST", "/api/gm/user/arena", "EDIT_USER_PROGRESS", async({user, body}) => {
    const u = await target(body.id), cleared = body.cleared === true;
    if(!gameplay().arenas.includes(body.arena)) fail("BAD_ARENA");
    needConfirm(body, !cleared);
    const r = await editSave(u, body.baseVersion, d => { const before = !!(d.arenasCleared && d.arenasCleared[body.arena]); d.arenasCleared = {...d.arenasCleared, [body.arena]:cleared}; return before; });
    await mutate(s => { audit(s, user, cleared ? "arena.unlock" : "arena.lock", {target:u.id, type:"arena", content:body.arena, before:r.result, after:cleared}, now()); return null; });
    return {ok:true, version:r.version};
  });

  // Items/sets: the server never fabricates item objects. It queues validated catalog keys in
  // save.adminMailbox; the client materializes them with the same code paths as the shop.
  route("POST", "/api/gm/user/mailbox", "GRANT_CONTENT", async({user, body}) => {
    const u = await target(body.id), kind = body.kind, ref = body.ref;
    if(kind === "item"){ if(!shopCatalog().itemPrices.includes(ref)) fail("BAD_ITEM"); }
    else if(kind === "set"){ if(!shopCatalog().sets.includes(ref)) fail("BAD_SET"); }
    else fail("BAD_KIND");
    const entry = {id:require("crypto").randomUUID(), kind, ref, at:now(), by:user.id, origin:"ADMIN_GRANT", reason:reasonOf(body)};
    const r = await editSave(u, body.baseVersion, d => { d.adminMailbox = (Array.isArray(d.adminMailbox) ? d.adminMailbox : []).slice(-49); d.adminMailbox.push(entry); return null; });
    await mutate(s => { audit(s, user, "mailbox.grant", {target:u.id, type:kind, content:ref, origin:"ADMIN_GRANT", reason:entry.reason}, now()); return null; });
    return {ok:true, version:r.version, entry};
  });

  // Repairs invalid values without inventing progress: negative/NaN currency, out-of-range levels,
  // and server-controlled champion flags (founder / unreleased) re-derived from entitlements.
  route("POST", "/api/gm/user/repair", "EDIT_USER_PROGRESS", async({user, body}) => {
    const u = await target(body.id), ops = await read(), fixes = [];
    const r = await editSave(u, body.baseVersion, d => {
      for(const f of ["gold", "gems"]) if(d[f] !== undefined && !(Number.isFinite(d[f]) && d[f] >= 0)){ fixes.push({field:f, before:d[f], after:0}); d[f] = 0; }
      for(const [k, c] of Object.entries(d.champions || {})){
        if(!c || typeof c !== "object"){ fixes.push({field:"champions." + k, before:c, after:null}); delete d.champions[k]; continue; }
        if(c.level !== undefined && !(Number.isInteger(c.level) && c.level >= 1 && c.level <= 99)){ const v = Math.min(99, Math.max(1, Math.floor(+c.level) || 1)); fixes.push({field:"champions." + k + ".level", before:c.level, after:v}); c.level = v; }
      }
      for(const ch of ent.sanitizeSave(d, ent.entitledChampions(founders(), ops, u.id)).changed) fixes.push({field:"champions." + ch.id + ".unlocked", after:ch.unlocked});
      return fixes;
    });
    await mutate(s => { audit(s, user, "user.repair", {target:u.id, type:"save", details:fixes.slice(0, 50)}, now()); return null; });
    return {ok:true, version:r.version, fixes};
  });

  route("POST", "/api/gm/roles", "MANAGE_ROLES", async({user, body}) => {
    const u = await target(body.id);
    if(!Array.isArray(body.roles) || body.roles.some(r => !rbac.ASSIGNABLE.includes(r))) fail("BAD_ROLES");
    if(isOwner(u)) fail("OWNER_IMMUTABLE", 403);
    needConfirm(body, true);
    return mutate(s => {
      const before = (s.roles = s.roles || {})[u.id] || [], after = [...new Set(body.roles)];
      if(after.length) s.roles[u.id] = after; else delete s.roles[u.id];
      audit(s, user, "roles.set", {target:u.id, type:"roles", before, after}, now());
      return {ok:true, roles:after};
    });
  });

  route("GET", "/api/gm/audit", "VIEW_AUDIT_LOG", async({req}) => {
    const qs = new URL(req.url, "http://x").searchParams, s = await read();
    const actor = num(qs.get("actor")), targetId = num(qs.get("target")), action = text(qs.get("action"), 40), from = num(qs.get("from")), to = num(qs.get("to"));
    const limit = Math.min(500, Math.max(1, num(qs.get("limit")) || 200));
    const rows = s.audit.filter(e => (!Number.isSafeInteger(actor) || e.owner === actor) && (!Number.isSafeInteger(targetId) || e.target === targetId)
      && (!action || String(e.action).startsWith(action)) && (!Number.isSafeInteger(from) || e.at >= from) && (!Number.isSafeInteger(to) || e.at <= to));
    return {entries:rows.slice(-limit).reverse(), total:rows.length};
  });

  route("GET", "/api/gm/founders", "VIEW_USERS", async() => ({founders:Object.values(founders()).map(f => ({key:f.key, champion:f.champion, bound:f.userId !== null, reason:f.reason}))}));

  // Test Lab: authorization + audit only. Sessions run locally with persistence disabled; ownership of
  // FOUNDER/unreleased champions still cannot be written because saves are sanitized on PUT.
  route("POST", "/api/gm/testlab/start", "TEST_CONTENT", async({user, body}) => {
    if(!ent.isChampion(body.champion)) fail("BAD_CHAMPION");
    await mutate(s => { audit(s, user, "testlab.start", {type:"testlab", content:body.champion, details:{arena:text(body.arena, 30), skin:text(body.skin, 60), level:Number.isInteger(body.level) ? body.level : null}}, now()); return null; });
    return {ok:true, champion:body.champion, meta:ent.taxonomy().meta(body.champion)};
  });
  route("GET", "/api/gm/champions", "TEST_CONTENT", async() => ({champions:ent.taxonomy().ids.map(id => ent.taxonomy().meta(id)), categories:ent.taxonomy().categories, states:ent.taxonomy().states}));
}
module.exports = {routes};
