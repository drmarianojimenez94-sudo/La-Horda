"use strict";
// Server authority over champions whose ownership cannot come from a client purchase:
// FOUNDER (operator config, FOUNDER_ENTITLEMENT), EVENT and unreleased champions (grant ledger).
// The client save stays the source of everything else; this module only forces these flags.
const fs = require("fs");
const path = require("path");
const vm = require("vm");

let TAXONOMY;
function taxonomy(){
  if(TAXONOMY) return TAXONOMY;
  const c = {Date, Object, isFinite}; vm.createContext(c);
  const file = path.join(__dirname, "../js/data/champion-taxonomy.js");
  vm.runInContext(fs.readFileSync(file, "utf8"), c, {timeout:1000, filename:"champion-taxonomy.js"});
  const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, "../docs/production/shop-catalog.json"), "utf8"));
  const ids = [...new Set([...catalog.championPrices, ...Object.keys(c.CHAMPION_TAXONOMY)])].sort();
  TAXONOMY = {
    ids, categories:c.CHAMPION_CATEGORIES, origins:[...c.GRANT_ORIGINS], states:[...c.CHAMPION_RELEASE_STATES],
    meta:id => c.championMeta(id), requiresGrant:id => c.championRequiresServerGrant(id),
    founders:Object.keys(c.CHAMPION_TAXONOMY).filter(id => c.championMeta(id).category === "FOUNDER").map(id => ({champion:id, key:c.championMeta(id).founderKey}))
  };
  return TAXONOMY;
}
const isChampion = id => typeof id === "string" && taxonomy().ids.includes(id);
const userKey = u => String(u || "").normalize("NFC").toLowerCase();

// operator-config.json: {"founders":{"nano":{"account":"NanoGM"},"facu":{"account":null,"accountId":null}}}
// accountId (immutable numeric id) wins over account (login handle, resolved ONCE at startup).
// No match or a missing account leaves the founder unbound; nothing is ever guessed or created.
async function resolveFounders(store, config, log){
  const out = {};
  for(const {champion, key} of taxonomy().founders){
    const cfg = (config && config[key]) || {};
    let userId = null, reason = "NOT_CONFIGURED";
    if(Number.isSafeInteger(cfg.accountId)){
      const u = await store.getUser(cfg.accountId); userId = u ? u.id : null; reason = u ? "BOUND_BY_ID" : "ACCOUNT_ID_NOT_FOUND";
    }else if(typeof cfg.account === "string" && cfg.account.trim()){
      const u = await store.getUserByKey(userKey(cfg.account.trim())); userId = u ? u.id : null; reason = u ? "BOUND_BY_ACCOUNT" : "ACCOUNT_NOT_FOUND";
    }
    out[key] = {key, champion, userId, reason};
    if(log) log("FOUNDER_POLICY", {founder:key, bound:userId !== null, reason});
  }
  return out;
}
function founderOf(bindings, userId){
  for(const b of Object.values(bindings || {})) if(userId != null && b.userId === userId) return b;
  return null;
}

// Ledger rows live in GM operations state: s.grants[userId].champions[id] = {origin, by, at, reason}.
function ledgerChampions(ops, userId){ return (ops && ops.grants && ops.grants[userId] && ops.grants[userId].champions) || {}; }
function entitledChampions(bindings, ops, userId){
  const out = {};
  for(const [id, g] of Object.entries(ledgerChampions(ops, userId))) if(!g.revokedAt && isChampion(id) && taxonomy().meta(id).category !== "FOUNDER") out[id] = g.origin;
  const f = founderOf(bindings, userId); if(f) out[f.champion] = "FOUNDER_ENTITLEMENT";
  return out;
}
// Forces server-controlled champion flags. Never touches progress fields of other champions and
// keeps level/xp of a locked entry so a later valid grant restores it.
function sanitizeSave(data, entitled){
  if(!data || typeof data !== "object") return {data, changed:[]};
  const changed = [];
  const champs = data.champions && typeof data.champions === "object" ? data.champions : (data.champions = {});
  for(const id of taxonomy().ids){
    if(!taxonomy().requiresGrant(id)) continue;
    const c = champs[id], allowed = Object.hasOwn(entitled, id);
    if(allowed && !(c && c.unlocked)){ champs[id] = Object.assign({}, c || {}, {unlocked:true}); changed.push({id, unlocked:true}); }
    else if(!allowed && c && c.unlocked){ c.unlocked = false; changed.push({id, unlocked:false}); }
  }
  return {data, changed};
}
module.exports = {taxonomy, isChampion, resolveFounders, founderOf, entitledChampions, sanitizeSave, ledgerChampions};
