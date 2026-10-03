"use strict";
// Founder presence for multiplayer rooms. Identity comes from a verified account session, never from
// the free-text slot name. Only public data leaves the server: display name and founder key.
// Anti-spam: a founder is announced once per room in the lobby (rejoins, refreshes and reconnects
// never repeat it) and once per match start in the arena; arrivals inside GROUP_MS share one banner.
const GROUP_MS = 1200;
function create({resolve, requiresGrant, broadcast, groupMs = GROUP_MS, setTimer = setTimeout}){
  async function identify(ws, token){
    let id = null;
    try{ id = await resolve(token); }catch(e){ id = null; }
    ws._identity = id ? {name:id.name, founder:id.founder ? id.founder.key : null, grantOnly:id.grantOnly || []} : null;
    return ws._identity;
  }
  // Grant-only champions (FOUNDER / unreleased) are accepted only from a verified entitled account.
  function champAllowed(ws, champ){
    if(!champ || !requiresGrant(champ)) return true;
    return !!(ws._identity && ws._identity.grantOnly.includes(champ));
  }
  function memberFounder(ws){ return ws._identity ? ws._identity.founder : null; }
  function founderView(m){ return {key:m.founder, name:m.name}; }
  // Called when a member really joins (not a reconnect to a preserved slot).
  function joined(room, member){
    if(!member.founder) return;
    room.founderAnnounced = room.founderAnnounced || new Set();
    if(room.founderAnnounced.has(member.founder)) return;
    room.founderAnnounced.add(member.founder);
    (room.founderQueue = room.founderQueue || []).push(member.founder);
    if(room.founderTimer) return;
    room.founderTimer = setTimer(() => {
      room.founderTimer = null;
      const keys = room.founderQueue.splice(0);
      const founders = room.slots.filter(m => m && m.founder && keys.includes(m.founder)).map(founderView);
      if(founders.length) broadcast(room, {t:"presence", scope:"lobby", founders});
    }, groupMs);
  }
  function started(room){
    const founders = room.slots.filter(m => m && m.ws && m.founder).map(founderView);
    if(founders.length) broadcast(room, {t:"presence", scope:"arena", founders});
  }
  return {identify, champAllowed, memberFounder, joined, started};
}
module.exports = {create, GROUP_MS};
