/* Guerra de Cristales: deterministic, isolated host-authoritative simulation.
 * No account, campaign, inventory, currency or DOM dependencies. */
(function(root){
  'use strict';
  const VERSION='CW-2', WIDTH=880, HEIGHT=620, DURATION=600;
  const ROLES={
    tanque:{name:'Tanque',hp:240,speed:150,damage:44,range:90,rate:.55,color:'#7bc6ff',skills:['Torbellino','Embestida','Baluarte','Grito del cristal']},
    guerrero:{name:'Asesino',hp:155,speed:195,damage:29,range:100,rate:.48,color:'#ffb18e',skills:['Corte expansivo','Paso sombrío','Trampa de sombras','Pestilencia']},
    mago:{name:'Mago',hp:125,speed:165,damage:21,range:290,rate:.65,color:'#c6a2ff',skills:['Nova elemental','Traslación','Anillo de fuego','Cataclismo']},
    soporte:{name:'Sanadora',hp:165,speed:170,damage:29,range:260,rate:.5,color:'#98f3bd',skills:['Pulso vital','Paso protector','Bendición','Santuario']}
  };
  const SHOP={repair:{name:'Reparar +180',cost:35},upgrade:{name:'Daño de equipo +12%',cost:38},swarm:{name:'Enviar 5 acechadores',cost:16},brute:{name:'Enviar un coloso',cost:42},ward:{name:'Barrera +150',cost:40},surge:{name:'Furia 20 s',cost:50}};
  const POLICIES=['balanced','economy','aggro','turtle'];
  const ECLIPSE_AT=480,ECLIPSE_DPS=3;
  const CATCHUP_GAP=250,CATCHUP_SHARDS=6,MAX_WAVE_SIZE=36;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
  function random(s){s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0;return s.rng/4294967296;}
  function create(slots=[],seed=7){
    const s={version:VERSION,rng:seed>>>0,time:0,wave:0,nextWave:5,id:0,winner:null,ended:false,phase:'preparing',enemies:[],effects:[],pending:[],teams:[0,1].map(()=>({hp:1200,maxHp:1200,shards:30,upgrade:0,purchases:0,sendAt:0,repairAt:0,kills:0,ward:0,wardAt:0,surgeUntil:0,surgeAt:0,assist:0,policy:'balanced'})),heroes:[]};
    const defaults=['tanque','mago','tanque','mago'];
    s.heroes=defaults.map((fallback,i)=>{const slot=slots[i]||{},role=own(ROLES,slot.champ)?slot.champ:fallback,c=ROLES[role];return {slot:i,team:Math.floor(i/2),role,name:String(slot.name||('BOT '+(i+1))).slice(0,24),bot:!slot.connected,x:380+(i%2)*110,y:430,hp:c.hp,maxHp:c.hp,cd:[0,0,0,0],basic:0,stats:{dmg:0,kills:0,heal:0,deaths:0,sent:0},shield:0,shieldUntil:0,respawn:0,dx:0,dy:0,anim:0,botBuy:10+i%2};});
    return s;
  }
  function effect(s,kind,team,x,y,r,color,life=.4,extra={}){s.effects.push(Object.assign({id:++s.id,kind,team,x,y,r,color,until:s.time+life},extra));if(s.effects.length>160)s.effects.shift();}
  function damage(s,e,amount,h){if(e.hp<=0)return;const dealt=Math.min(e.hp,amount);if(h)h.stats.dmg+=dealt;e.hp-=amount;if(e.hp<=0){if(h)h.stats.kills++;const t=s.teams[e.team];t.shards=Math.min(200,t.shards+(e.kind==='brute'?5:1));t.kills++;effect(s,'burst',e.team,e.x,e.y,25,'#e9c56c');}}
  function area(s,h,r,power,slow=0){const c=ROLES[h.role],mult=1+s.teams[h.team].upgrade*.12;for(const e of s.enemies)if(e.team===h.team&&dist(h,e)<=r){damage(s,e,power*mult,h);e.slowUntil=Math.max(e.slowUntil,s.time+slow);}effect(s,'ring',h.team,h.x,h.y,r,c.color,.6);}
  function ability(s,slot,index){
    const h=s.heroes[slot];if(!h||s.ended||h.hp<=0||!Number.isInteger(index)||index<0||index>3||h.cd[index]>0)return false;
    const c=ROLES[h.role];h.cd[index]=[7,6,11,32][index];
    if(index===0){area(s,h,h.role==='mago'?180:135,c.damage*2.5,h.role==='mago'?2:0);if(h.role==='soporte')heal(s,h,42,190);}
    if(index===1){const n=Math.hypot(h.dx,h.dy)||1;h.x=clamp(h.x+(h.dx||0)/n*140,25,WIDTH-25);h.y=clamp(h.y+(h.dx||h.dy?h.dy:-1)/n*140,50,HEIGHT-40);h.shield=35;h.shieldUntil=s.time+2;effect(s,'ring',h.team,h.x,h.y,50,c.color);}
    if(index===2){if(h.role==='tanque'||h.role==='soporte'){for(const a of s.heroes)if(a.team===h.team&&a.hp>0&&dist(a,h)<250){a.shield=70;a.shieldUntil=s.time+5;}area(s,h,150,25);}else{effect(s,'zone',h.team,h.x,h.y,135,c.color,5,{damage:c.damage*.9,nextTick:s.time,owner:slot});}}
    if(index===3){area(s,h,280,c.damage*7,3);if(h.role==='soporte')heal(s,h,90,400);if(h.role==='tanque'){h.shield=160;h.shieldUntil=s.time+7;}}
    return true;
  }
  function heal(s,h,amount,r){for(const a of s.heroes)if(a.team===h.team&&a.hp>0&&dist(a,h)<=r){const before=a.hp;a.hp=Math.min(a.maxHp,a.hp+amount);h.stats.heal+=a.hp-before;}}
  function shopOpen(s){return !s.ended&&(s.wave===0||s.time<s.nextWave-28);}
  function buy(s,slot,key){
    const h=s.heroes[slot];if(!h||!own(SHOP,key)||!shopOpen(s))return false;
    const t=s.teams[h.team],item=SHOP[key];
    if(t.shards<item.cost)return false;
    if(key==='repair'&&(t.hp>=t.maxHp||s.time<t.repairAt))return false;
    if(key==='upgrade'&&t.upgrade>=3)return false;
    if(key==='ward'&&(t.ward>=150||s.time<t.wardAt))return false;
    if(key==='surge'&&(s.time<t.surgeAt||s.time<t.surgeUntil))return false;
    if((key==='swarm'||key==='brute')&&(s.time<t.sendAt||s.pending.filter(p=>p.team!==h.team).length>=2))return false;
    t.shards-=item.cost;t.purchases++;
    if(key==='repair'){t.hp=Math.min(t.maxHp,t.hp+180);t.repairAt=s.time+15;}
    else if(key==='upgrade')t.upgrade++;
    else if(key==='ward'){t.ward=150;t.wardAt=s.time+20;}
    else if(key==='surge'){t.surgeUntil=s.time+20;t.surgeAt=s.time+35;}
    else{h.stats.sent++;t.sendAt=s.time+10;s.pending.push({id:++s.id,team:1-h.team,kind:key,due:s.time+5});}
    return true;
  }
  function spawn(s,team,kind,x){
    if(s.enemies.filter(e=>e.team===team&&e.hp>0).length>=75)return;
    const brute=kind==='brute',scale=1+s.wave*.14;
    s.enemies.push({id:++s.id,team,kind,x:x===undefined?80+random(s)*(WIDTH-160):x,y:55,hp:(brute?330:38)*scale,maxHp:(brute?330:38)*scale,speed:brute?28:34+Math.min(20,s.wave),damage:(brute?20:7)*(1+s.wave*.07),attack:0,slowUntil:0});
  }
  function crystalHit(s,team,amount){const t=s.teams[team];if(t.ward>0){const a=Math.min(t.ward,amount);t.ward-=a;amount-=a;}t.hp=Math.max(0,t.hp-amount);}
  function hitHero(s,h,amount){let absorb=Math.min(h.shield,amount);h.shield-=absorb;h.hp=Math.max(0,h.hp-(amount-absorb));if(!h.hp){h.respawn=s.time+8;h.stats.deaths++;crystalHit(s,h.team,65);effect(s,'burst',h.team,h.x,h.y,70,'#ff7169');}}
  function finish(s){const [a,b]=s.teams;if(a.hp<=0||b.hp<=0||s.time>=DURATION){s.ended=true;s.phase='ended';s.winner=a.hp===b.hp?-1:a.hp>b.hp?0:1;}}
  // Políticas de compra de los bots (también sirven para probar que ninguna estrategia domine).
  function botChoice(s,h,t){
    const low=t.hp<800,p=t.policy;
    if(p==='economy')return low?'repair':t.upgrade<3?'upgrade':t.ward<=0?'ward':'brute';
    if(p==='aggro')return t.hp<500?'repair':s.time>=t.sendAt?(t.shards>=55&&s.wave%2===0?'brute':'swarm'):'upgrade';
    if(p==='turtle')return low?'repair':t.ward<=0?'ward':t.upgrade<3?'upgrade':'surge';
    return low?'repair':t.upgrade<2?'upgrade':t.ward<=0&&t.hp<1000?'ward':'swarm';
  }
  function step(s,dt,inputs={}){
    if(s.ended||!Number.isFinite(dt)||dt<=0)return;s.time+=Math.min(dt,.1);dt=Math.min(dt,.1);
    if(s.time>=s.nextWave){s.wave++;s.nextWave+=35;for(const [i,t] of s.teams.entries()){const gap=s.teams[1-i].hp-t.hp;t.shards=Math.min(200,t.shards+10+(gap>=CATCHUP_GAP?CATCHUP_SHARDS:0));if(gap>=CATCHUP_GAP)t.assist++;}const n=Math.min(MAX_WAVE_SIZE,6+s.wave);for(let i=0;i<n;i++){const x=70+random(s)*(WIDTH-140);spawn(s,0,'grunt',x);spawn(s,1,'grunt',x);}if(s.wave%3===0){spawn(s,0,'brute',440);spawn(s,1,'brute',440);}}
    if(s.time>=ECLIPSE_AT){const k=ECLIPSE_DPS*(1+(s.time-ECLIPSE_AT)/60)*dt;for(let i=0;i<2;i++)crystalHit(s,i,k);} // Eclipse: ambos cristales se apagan, cada vez más rápido
    s.phase=shopOpen(s)?'supply':'combat';
    for(const p of s.pending)if(p.due<=s.time){for(let i=0;i<(p.kind==='swarm'?5:1);i++)spawn(s,p.team,p.kind==='swarm'?'runner':'brute');}
    s.pending=s.pending.filter(p=>p.due>s.time);
    for(const h of s.heroes){
      h.cd=h.cd.map(v=>Math.max(0,v-dt));h.basic=Math.max(0,h.basic-dt);if(s.time>=h.shieldUntil)h.shield=0;
      if(h.hp<=0){if(s.time>=h.respawn){h.hp=h.maxHp;h.x=380+h.slot%2*110;h.y=430;h.shield=100;h.shieldUntil=s.time+3;}else continue;}
      const c=ROLES[h.role],targets=s.enemies.filter(e=>e.team===h.team&&e.hp>0).sort((a,b)=>dist(h,a)-dist(h,b));
      let input=inputs[h.slot]||{};
      if(h.bot){const e=targets[0],goal=e||{x:380+h.slot%2*110,y:350};const d=dist(h,goal);input={x:d>c.range*.65?(goal.x-h.x)/(d||1):0,y:d>c.range*.65?(goal.y-h.y)/(d||1):0};if(e&&d<170)ability(s,h.slot,0);if(e&&targets.length>5)ability(s,h.slot,3);if(e&&h.hp<h.maxHp*.65)ability(s,h.slot,2);
        if(shopOpen(s)&&s.time>=h.botBuy){h.botBuy=s.time+3;const t=s.teams[h.team];buy(s,h.slot,botChoice(s,h,t));}}
      const ix=Number.isFinite(input.x)?clamp(input.x,-1,1):0,iy=Number.isFinite(input.y)?clamp(input.y,-1,1):0,n=Math.max(1,Math.hypot(ix,iy));
      h.moving=!!(ix||iy);if(ix||iy){h.dx=ix/n;h.dy=iy/n;h.anim+=dt;}h.x=clamp(h.x+ix/n*c.speed*dt,25,WIDTH-25);h.y=clamp(h.y+iy/n*c.speed*dt,50,HEIGHT-40);
      const target=targets.find(e=>dist(h,e)<=c.range);
      if(target&&h.basic<=0){h.basic=c.rate*(s.time<s.teams[h.team].surgeUntil?.7:1);damage(s,target,c.damage*(1+s.teams[h.team].upgrade*.12),h);effect(s,'shot',h.team,h.x,h.y,0,c.color,.15,{tx:target.x,ty:target.y});}
    }
    for(const e of s.enemies){
      if(e.hp<=0)continue;e.attack=Math.max(0,e.attack-dt);
      const crystal={x:WIDTH/2,y:HEIGHT-75},victims=s.heroes.filter(h=>h.team===e.team&&h.hp>0&&dist(h,e)<75).sort((a,b)=>dist(a,e)-dist(b,e)),h=victims[0];
      if(h){if(e.attack<=0){hitHero(s,h,e.damage);e.attack=.85;}}
      else{const d=dist(e,crystal);if(d<35){if(e.attack<=0){crystalHit(s,e.team,e.damage*1.5);e.attack=1;effect(s,'ring',e.team,crystal.x,crystal.y,55,'#ff7169');}}else{const speed=e.speed*(e.kind==='runner'?1.5:1)*(e.slowUntil>s.time?.3:1);e.x+=(crystal.x-e.x)/d*speed*dt;e.y+=(crystal.y-e.y)/d*speed*dt;}}
    }
    for(const f of s.effects)if(f.kind==='zone'&&f.nextTick<=s.time&&f.until>s.time){f.nextTick=s.time+.5;for(const e of s.enemies)if(e.team===f.team&&dist(e,f)<f.r)damage(s,e,f.damage*(1+s.teams[f.team].upgrade*.12),s.heroes[f.owner]);}
    s.enemies=s.enemies.filter(e=>e.hp>0);s.effects=s.effects.filter(f=>f.until>s.time);finish(s);
  }
  const api={ECLIPSE_AT,POLICIES,VERSION,WIDTH,HEIGHT,DURATION,ROLES,SHOP,create,step,ability,buy,shopOpen};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CrystalWars=api;
})(typeof globalThis!=='undefined'?globalThis:this);
