"use strict";
function allowed(user){return String(process.env.ADMIN_USERS||"").split(",").map(s=>s.trim().normalize("NFC").toLowerCase()).filter(Boolean).includes(user.key||String(user.user||"").toLowerCase());}
function editLevel(data,key,level){
 if(!Number.isInteger(level)||level<1||level>99||!Object.prototype.hasOwnProperty.call(data.champions||{},key)||!data.champions[key]?.unlocked) throw new Error("BAD_LEVEL");
 const next=JSON.parse(JSON.stringify(data)),c=next.champions[key],old=c.level;
 c.level=level;c.xp=0;
 // A lower level must not retain gated tree power. Return all level points to allocation.
 if(level<old){c.talents={nodes:{},picks:{},mastery:null,masteryNodes:{}};c.treeBonus=0;}
 let remaining=level-1,spent=0;
 for(const m of [...(c.skillMastery||[]),c.ultMastery].filter(Boolean)){ m.alloc=Math.min(Math.max(0,m.alloc|0),remaining);remaining-=m.alloc;spent+=m.alloc; }
 c.talentPoints=Math.max(0,level-1-spent);return next;
}
module.exports={allowed,editLevel};
