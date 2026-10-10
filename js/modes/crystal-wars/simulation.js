/* Guerra de Cristales: deterministic, isolated host-authoritative simulation.
 * No account, campaign, inventory, currency or DOM dependencies. */
(function(root){
  'use strict';
  const VERSION='CW-4', WIDTH=880, HEIGHT=620, DURATION=420;
  const BASE_ROLES={
    tanque:{name:'Tanque',hp:240,speed:150,damage:44,range:90,rate:.55,color:'#7bc6ff',skills:['Torbellino','Embestida','Baluarte','Grito del cristal']},
    guerrero:{name:'Asesino',hp:155,speed:195,damage:29,range:100,rate:.48,color:'#ffb18e',skills:['Corte expansivo','Paso sombrío','Trampa de sombras','Pestilencia']},
    mago:{name:'Mago',hp:125,speed:165,damage:21,range:290,rate:.65,color:'#c6a2ff',skills:['Nova elemental','Traslación','Anillo de fuego','Cataclismo']},
    soporte:{name:'Sanadora',hp:165,speed:170,damage:22,range:260,rate:.5,color:'#98f3bd',skills:['Pulso vital','Paso protector','Bendición','Santuario']}
  };
  const ROLES=(root.CW_ROSTER||(typeof module!=='undefined'&&module.exports?require('./roster.js'):null)||{ROLES:BASE_ROLES}).ROLES;
  const SHOP={meteor:{name:'Carta: Meteorito',cost:24,card:true},frost:{name:'Carta: Escarcha',cost:18,card:true},repair:{name:'Reparar +180',cost:35},upgrade:{name:'Daño de equipo +12%',cost:38},swarm:{name:'Enviar 5 acechadores',cost:16},brute:{name:'Enviar un coloso',cost:42},ward:{name:'Barrera +125',cost:40},surge:{name:'Furia 20 s',cost:50}};
  const DAMAGE_SCALE=Object.freeze({crystal:Object.freeze({tanque:1.4,guerrero:.70,mago:.92,soporte:1.12}),coliseum:Object.freeze({tanque:.68,guerrero:1.35,mago:1.3,soporte:.8}),pvpDamage:.42,pvpHeal:.45,pvpShield:.55});
  const POLICIES=['balanced','economy','aggro','turtle'];
  const ECLIPSE_AT=300,ECLIPSE_DPS=3;
  const FIRST_WAVE=.75,WAVE_INTERVAL=24,SUPPLY_WINDOW=7,SEND_DELAY=3;
  const CATCHUP_GAP=250,CATCHUP_SHARDS=6,MAX_WAVE_SIZE=36;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
  function random(s){s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0;return s.rng/4294967296;}
  function create(slots=[],seed=7,options={}){
    const s={version:VERSION,mode:options.mode==='coliseum'?'coliseum':'crystal',monsters:options.monsters!==false,scoreLimit:15,obstacles:[{x:190,y:195,w:105,h:55},{x:585,y:195,w:105,h:55},{x:190,y:395,w:105,h:55},{x:585,y:395,w:105,h:55}],projectiles:[],rng:seed>>>0,tick:seed&1,time:0,wave:0,nextWave:FIRST_WAVE,id:0,winner:null,ended:false,phase:'preparing',enemies:[],effects:[],pending:[],teams:[0,1].map(()=>({score:0,cardAt:0,hp:1200,maxHp:1200,shards:30,upgrade:0,purchases:0,sendAt:0,repairAt:0,kills:0,ward:0,wardAt:0,surgeUntil:0,surgeAt:0,assist:0,policy:'balanced'})),heroes:[]};
    const defaults=['tanque','mago','tanque','mago'];
    s.heroes=defaults.map((fallback,i)=>{const slot=slots[i]||{},role=own(ROLES,slot.champ)&&(!ROLES[slot.champ].ownerOnly||slot.founder===ROLES[slot.champ].founder)?slot.champ:fallback,c=ROLES[role];return {slot:i,team:Math.floor(i/2),role,name:String(slot.name||('BOT '+(i+1))).slice(0,24),bot:!slot.connected,x:380+(i%2)*110,y:300,hp:c.hp,maxHp:c.hp,cd:[0,0,0,0],basic:0,stats:{dmg:0,kills:0,heal:0,deaths:0,sent:0},shield:0,slowUntil:0,shieldUntil:0,respawn:0,dx:0,dy:0,anim:0,botBuy:10+i%2};});
    if(s.mode==='coliseum')for(const h of s.heroes){h.x=h.team===0?110:770;h.y=260+h.slot%2*100;}
    return s;
  }
  function blocked(s,x,y,r=16){return s.obstacles.some(o=>x>o.x-r&&x<o.x+o.w+r&&y>o.y-r&&y<o.y+o.h+r);}
  function clearShot(s,a,b){const steps=Math.ceil(dist(a,b)/12);for(let i=1;i<steps;i++)if(blocked(s,a.x+(b.x-a.x)*i/steps,a.y+(b.y-a.y)*i/steps,0))return false;return true;}
  function move(s,h,x,y){const dx=x-h.x,dy=y-h.y,n=Math.max(1,Math.ceil(Math.hypot(dx,dy)/8));for(let i=0;i<n;i++){const nx=clamp(h.x+dx/n,25,WIDTH-25),ny=clamp(h.y+dy/n,50,HEIGHT-40);if(!blocked(s,nx,h.y))h.x=nx;if(!blocked(s,h.x,ny))h.y=ny;}}
  function hostile(s,h,e){return e.slot!==undefined?s.mode==='coliseum'&&e.team!==h.team:e.team===h.team||e.team===-1;}
  function targetsFor(s,h){return s.enemies.concat(s.mode==='coliseum'?s.heroes:[]).filter(e=>e.hp>0&&hostile(s,h,e));}
  function effect(s,kind,team,x,y,r,color,life=.4,extra={}){s.effects.push(Object.assign({id:++s.id,kind,team,x,y,r,color,until:s.time+life},extra));if(s.effects.length>160)s.effects.shift();}
  function damage(s,e,amount,h,fixed=false){if(e.hp<=0)return;if(!fixed&&h&&s.mode!=='coliseum'){const role=ROLES[h.role].archetype||h.role;amount*=DAMAGE_SCALE.crystal[role]||1;}if(e.slot!==undefined){amount*=s.mode==='coliseum'?DAMAGE_SCALE.pvpDamage:1;if(s.mode==='coliseum'&&h&&!fixed)amount*=DAMAGE_SCALE.coliseum[ROLES[h.role].archetype||h.role]||1;if(h)h.stats.dmg+=Math.min(e.hp,Math.max(0,amount-e.shield));hitHero(s,e,amount,h);return;}const dealt=Math.min(e.hp,amount);if(h)h.stats.dmg+=dealt;e.hp-=amount;if(e.hp<=0){if(h)h.stats.kills++;const t=s.teams[e.team===-1?(h?h.team:0):e.team];t.shards=Math.min(200,t.shards+(e.kind==='brute'?5:1));t.kills++;effect(s,'burst',e.team,e.x,e.y,25,'#e9c56c');}}
  function area(s,h,r,power,slow=0){const c=ROLES[h.role],mult=1+s.teams[h.team].upgrade*.12;for(const e of targetsFor(s,h))if(dist(h,e)<=r){damage(s,e,power*mult,h);if(slow>0){e.slowUntil=Math.max(e.slowUntil||0,s.time+slow);e.slowFactor=e.slot!==undefined?.55:.3;}}effect(s,'ring',h.team,h.x,h.y,r,c.color,.6);}
  function ability(s,slot,index){
    const h=s.heroes[slot];if(!h||s.ended||h.hp<=0||!Number.isInteger(index)||index<0||index>3||h.cd[index]>0)return false;
    const c=ROLES[h.role];h.cd[index]=[7,6,11,c.signature==='surge'?37:32][index];
    if(index===0){area(s,h,(c.archetype||h.role)==='mago'?180:135,c.damage*2.5,(c.archetype||h.role)==='mago'?2:0);if((c.archetype||h.role)==='soporte')heal(s,h,42,190);}
    if(index===1){const n=Math.hypot(h.dx,h.dy)||1;move(s,h,h.x+(h.dx||0)/n*140,h.y+(h.dx||h.dy?h.dy:-1)/n*140);h.shield=35*(c.signature==='bulwark'?1.15:1)*(s.mode==='coliseum'?DAMAGE_SCALE.pvpShield:1);h.shieldUntil=s.time+2;effect(s,'ring',h.team,h.x,h.y,50,c.color);}
    if(index===2){if((c.archetype||h.role)==='tanque'||(c.archetype||h.role)==='soporte'){for(const a of s.heroes)if(a.team===h.team&&a.hp>0&&dist(a,h)<250){a.shield=70*(c.signature==='bulwark'?1.15:1)*(s.mode==='coliseum'?DAMAGE_SCALE.pvpShield:1);a.shieldUntil=s.time+5;}area(s,h,150,25);}else{effect(s,'zone',h.team,h.x,h.y,135,c.color,c.signature==='aftermath'?4:5,{damage:c.damage*.9*(c.signature==='aftermath'?1.25:1),nextTick:s.time,owner:slot});}}
    if(index===3){area(s,h,280,c.damage*7*(c.signature==='surge'?1.15:1),3);if((c.archetype||h.role)==='soporte')heal(s,h,90,400);if((c.archetype||h.role)==='tanque'){h.shield=160*(c.signature==='bulwark'?1.15:1)*(s.mode==='coliseum'?DAMAGE_SCALE.pvpShield:1);h.shieldUntil=s.time+7;}}
    return true;
  }
  function heal(s,h,amount,r){if(s.mode==='coliseum')amount*=DAMAGE_SCALE.pvpHeal;if(ROLES[h.role].signature==='renewal')amount*=1.2;for(const a of s.heroes)if(a.team===h.team&&a.hp>0&&dist(a,h)<=r){const before=a.hp;a.hp=Math.min(a.maxHp,a.hp+amount);h.stats.heal+=a.hp-before;}}
  function shopOpen(s){return !s.ended&&(s.mode==='coliseum'||s.wave===0||s.time<s.nextWave-(WAVE_INTERVAL-SUPPLY_WINDOW));}
  function buy(s,slot,key){
    const h=s.heroes[slot];if(!h||h.hp<=0||s.ended||!own(SHOP,key)||(!SHOP[key].card&&!shopOpen(s)))return false;if(s.mode==='coliseum'&&!SHOP[key].card&&key!=='surge')return false;
    const t=s.teams[h.team],item=SHOP[key];
    if(t.shards<item.cost)return false;if(item.card){if(s.time<t.cardAt)return false;const opponents=s.heroes.filter(a=>a.team!==h.team&&a.hp>0),target=opponents.sort((a,b)=>a.hp-b.hp||a.slot-b.slot)[0];if(!target)return false;t.shards-=item.cost;t.purchases++;t.cardAt=s.time+8;h.stats.sent++;s.projectiles.push({id:++s.id,team:1-h.team,kind:key,x:target.x,y:target.y,sx:h.x,sy:h.y,r:key==='meteor'?100:125,start:s.time,due:s.time+1.35,owner:slot});return true;}
    if(key==='repair'&&(t.hp>=t.maxHp||s.time<t.repairAt))return false;
    if(key==='upgrade'&&t.upgrade>=3)return false;
    if(key==='ward'&&(t.ward>=125||s.time<t.wardAt))return false;
    if(key==='surge'&&(s.time<t.surgeAt||s.time<t.surgeUntil))return false;
    if((key==='swarm'||key==='brute')&&(s.time<t.sendAt||s.pending.filter(p=>p.team!==h.team).length>=2))return false;
    t.shards-=item.cost;t.purchases++;
    if(key==='repair'){t.hp=Math.min(t.maxHp,t.hp+180);t.repairAt=s.time+15;}
    else if(key==='upgrade')t.upgrade++;
    else if(key==='ward'){t.ward=125;t.wardAt=s.time+20;}
    else if(key==='surge'){t.surgeUntil=s.time+20;t.surgeAt=s.time+35;}
    else{h.stats.sent++;t.sendAt=s.time+10;s.pending.push({id:++s.id,team:1-h.team,kind:key,due:s.time+SEND_DELAY,sender:slot});}
    return true;
  }
  function spawn(s,team,kind,x,sentBy=null){
    if(s.enemies.filter(e=>e.team===team&&e.hp>0).length>=75)return;
    const brute=kind==='brute',scale=1+s.wave*.14;
    s.enemies.push({id:++s.id,team,kind,sentBy,x:x===undefined?80+random(s)*(WIDTH-160):x,y:55,hp:(brute?330:38)*scale,maxHp:(brute?330:38)*scale,speed:brute?44:52+Math.min(20,s.wave),damage:(brute?20:7)*(1+s.wave*.07),attack:0,slowUntil:0});
  }
  function crystalHit(s,team,amount){const t=s.teams[team];if(t.ward>0){const a=Math.min(t.ward,amount);t.ward-=a;amount-=a;}t.hp=Math.max(0,t.hp-amount);}
  function hitHero(s,h,amount,attacker){if(h.hp<=0)return;if(attacker&&attacker.team!==h.team){h.lastAttacker=attacker.slot;h.lastHitAt=s.time;}else if(s.mode==='coliseum'&&h.lastAttacker!==undefined&&s.time-h.lastHitAt<=5)attacker=s.heroes[h.lastAttacker];let absorb=Math.min(h.shield,amount);h.shield-=absorb;h.hp=Math.max(0,h.hp-(amount-absorb));if(!h.hp){h.respawn=s.time+(s.mode==='coliseum'?5:8);h.stats.deaths++;if(s.mode==='coliseum'){if(attacker&&attacker.team!==h.team){s.teams[attacker.team].score++;s.teams[attacker.team].shards=Math.min(200,s.teams[attacker.team].shards+8);attacker.stats.kills++;}}else crystalHit(s,h.team,65);effect(s,'burst',h.team,h.x,h.y,70,'#ff7169');}}
  function finish(s){const [a,b]=s.teams;if(s.mode==='coliseum'){if(a.score>=s.scoreLimit||b.score>=s.scoreLimit||s.time>=DURATION){s.ended=true;s.phase='ended';s.winner=a.score===b.score?-1:a.score>b.score?0:1;}return;}if(a.hp<=0||b.hp<=0||s.time>=DURATION){s.ended=true;s.phase='ended';s.winner=a.hp===b.hp?-1:a.hp>b.hp?0:1;}}
  // Políticas de compra de los bots (también sirven para probar que ninguna estrategia domine).
  function botChoice(s,h,t){
    const low=t.hp<800,p=t.policy;
    // In the faster opening, the third investment must wait until a defence is established.
    if(p==='economy')return low?'repair':t.upgrade<(s.wave>=5?3:2)?'upgrade':t.ward<=0?'ward':'brute';
    if(p==='aggro')return t.hp<500?'repair':s.time>=t.sendAt?(t.shards>=55&&s.wave%2===0?'brute':'swarm'):'upgrade';
    if(p==='turtle')return low?'repair':t.ward<=0?'ward':t.upgrade<3?'upgrade':'surge';
    return low?'repair':t.upgrade<2?'upgrade':t.ward<=0&&t.hp<1000?'ward':'swarm';
  }
  function step(s,dt,inputs={}){
    if(s.ended||!Number.isFinite(dt)||dt<=0)return;s.time+=Math.min(dt,.1);dt=Math.min(dt,.1);s.tick++;
    if(s.mode!=='coliseum'&&s.time>=s.nextWave){s.wave++;s.nextWave+=WAVE_INTERVAL;for(const [i,t] of s.teams.entries()){const gap=s.teams[1-i].hp-t.hp;t.shards=Math.min(200,t.shards+10+(gap>=CATCHUP_GAP?CATCHUP_SHARDS:0));if(gap>=CATCHUP_GAP)t.assist++;}const n=Math.min(MAX_WAVE_SIZE,6+s.wave);for(let i=0;i<n;i++){const x=70+random(s)*(WIDTH-140);spawn(s,0,'grunt',x);spawn(s,1,'grunt',x);}if(s.wave%3===0){spawn(s,0,'brute',440);spawn(s,1,'brute',440);}}
    if(s.mode!=='coliseum'&&s.time>=ECLIPSE_AT){const k=ECLIPSE_DPS*(1+(s.time-ECLIPSE_AT)/60)*dt;for(let i=0;i<2;i++)crystalHit(s,i,k);} // Eclipse: ambos cristales se apagan, cada vez más rápido
    if(s.mode==='coliseum'&&s.time>=s.nextWave){s.wave++;s.nextWave+=24;for(const t of s.teams)t.shards=Math.min(200,t.shards+12);if(s.monsters){spawn(s,-1,'grunt',410);spawn(s,-1,'grunt',470);}}
    s.phase=s.mode==='coliseum'?'combat':shopOpen(s)?'supply':'combat';
    for(const p of s.projectiles)if(p.due<=s.time){for(const h of s.heroes)if(h.team===p.team&&h.hp>0&&dist(h,p)<p.r){if(p.kind==='meteor')damage(s,h,48,s.heroes[p.owner],true);else{damage(s,h,15,s.heroes[p.owner],true);h.slowUntil=s.time+2.5;h.slowFactor=.55;}}effect(s,'ring',p.team,p.x,p.y,p.r,p.kind==='meteor'?'#ff8b59':'#8ae8ff',.8);}
    s.projectiles=s.projectiles.filter(p=>p.due>s.time);
    for(const p of s.pending)if(p.due<=s.time){for(let i=0;i<(p.kind==='swarm'?5:1);i++)spawn(s,p.team,p.kind==='swarm'?'runner':'brute',undefined,p.sender);}
    s.pending=s.pending.filter(p=>p.due>s.time);
    const turn=s.mode==='coliseum'&&s.tick%2?s.heroes.slice().reverse():s.heroes;
    for(const h of turn){
      h.cd=h.cd.map(v=>Math.max(0,v-dt));h.basic=Math.max(0,h.basic-dt);if(s.time>=h.shieldUntil)h.shield=0;
      if(h.hp<=0){if(s.time>=h.respawn){h.lastAttacker=undefined;h.lastHitAt=-100;h.hp=h.maxHp;h.x=s.mode==='coliseum'?(h.team===0?110:770):380+h.slot%2*110;h.y=s.mode==='coliseum'?260+h.slot%2*100:430;h.shield=100;h.shieldUntil=s.time+3;}else continue;}
      const c=ROLES[h.role],targets=targetsFor(s,h).sort((a,b)=>dist(h,a)-dist(h,b));
      let input=inputs[h.slot]||{};
      if(h.bot){const e=targets[0],goal=e||{x:380+h.slot%2*110,y:350};const d=dist(h,goal);const approach=d>c.range*.65?1:s.mode==='coliseum'&&c.range>150&&e&&d<c.range*.45?-1:0;input={x:approach*(goal.x-h.x)/(d||1),y:approach*(goal.y-h.y)/(d||1)};if(e&&d<170)ability(s,h.slot,0);if(e&&(targets.length>5||(s.mode==='coliseum'&&d<240)))ability(s,h.slot,3);if(e&&h.hp<h.maxHp*.65)ability(s,h.slot,2);
        if(s.time>=h.botBuy&&(shopOpen(s)||s.mode==='coliseum')){h.botBuy=s.time+3;const t=s.teams[h.team];buy(s,h.slot,s.mode==='coliseum'?(h.slot%2?'frost':'meteor'):botChoice(s,h,t));}}
      const ix=Number.isFinite(input.x)?clamp(input.x,-1,1):0,iy=Number.isFinite(input.y)?clamp(input.y,-1,1):0,n=Math.max(1,Math.hypot(ix,iy));
      if(h.bot&&blocked(s,h.x+ix*30,h.y+iy*30)){const edge=s.obstacles.find(o=>h.x+ix*30>o.x-20&&h.x+ix*30<o.x+o.w+20&&h.y+iy*30>o.y-20&&h.y+iy*30<o.y+o.h+20);if(edge){const route=h.x<WIDTH/2?edge.x-35:edge.x+edge.w+35;move(s,h,h.x+Math.sign(route-h.x)*c.speed*dt,h.y);}}h.moving=!!(ix||iy);if(ix||iy){h.dx=ix/n;h.dy=iy/n;h.anim+=dt;}const speed=c.speed*(h.slowUntil>s.time?(h.slowFactor||.55):1)*(c.signature==='bulwark'&&h.shield>0?.92:1);move(s,h,h.x+ix/n*speed*dt,h.y+iy/n*speed*dt);
      const target=targets.find(e=>dist(h,e)<=c.range&&clearShot(s,h,e));
      if(target&&h.basic<=0){h.basic=c.rate*(s.time<s.teams[h.team].surgeUntil?.7:1);let power=c.damage*(1+s.teams[h.team].upgrade*.12);h.attacks=(h.attacks||0)+1;const sig=c.signature;if(sig==='execution')power*=target.hp<target.maxHp*.35?1.18:.92;if(sig==='focus')power*=dist(h,target)>c.range*.6?1.12:.88;if(sig==='siphon'||sig==='frost')power*=.9;if(sig==='tempo')power*=h.attacks%3===0?1.3:.85;if(sig==='momentum')power*=h.moving?1.1:.9;if(sig==='renewal')power*=.88;const before=target.hp;damage(s,target,power,h);if(sig==='siphon'){const recovered=Math.min(h.maxHp-h.hp,Math.min(before,Math.max(0,before-target.hp))*.08);h.hp+=recovered;h.stats.heal+=recovered;}if(sig==='frost'){target.slowUntil=Math.max(target.slowUntil||0,s.time+.45);target.slowFactor=.7;}effect(s,'shot',h.team,h.x,h.y,0,c.color,.15,{tx:target.x,ty:target.y});}
    }
    for(const e of s.enemies){
      if(e.hp<=0)continue;e.attack=Math.max(0,e.attack-dt);
      const crystal=e.team===-1?(s.heroes.filter(h=>h.hp>0).sort((a,b)=>dist(a,e)-dist(b,e))[0]||{x:440,y:310}):{x:WIDTH/2,y:HEIGHT-75},victims=s.heroes.filter(h=>(e.team===-1||h.team===e.team)&&h.hp>0&&dist(h,e)<75).sort((a,b)=>dist(a,e)-dist(b,e)),h=victims[0];
      if(h){if(e.attack<=0){hitHero(s,h,e.damage);e.attack=.85;}}
      else{const d=dist(e,crystal);if(d<35&&e.team!==-1){if(e.attack<=0){crystalHit(s,e.team,e.damage*1.5);e.attack=1;effect(s,'ring',e.team,crystal.x,crystal.y,55,'#ff7169');}}else{const speed=e.speed*(e.kind==='runner'?1.5:1)*(e.slowUntil>s.time?(e.slowFactor||.3):1);const ox=e.x,oy=e.y;move(s,e,e.x+(crystal.x-e.x)/(d||1)*speed*dt,e.y+(crystal.y-e.y)/(d||1)*speed*dt);if(Math.hypot(e.x-ox,e.y-oy)<speed*dt*.3){const side=e.x<WIDTH/2?-1:1;move(s,e,e.x+side*speed*dt,e.y);}}}
    }
    for(const f of s.effects)if(f.kind==='zone'&&f.nextTick<=s.time&&f.until>s.time){f.nextTick=s.time+.5;for(const e of targetsFor(s,s.heroes[f.owner]))if(dist(e,f)<f.r)damage(s,e,f.damage*(1+s.teams[f.team].upgrade*.12),s.heroes[f.owner]);}
    s.enemies=s.enemies.filter(e=>e.hp>0);s.effects=s.effects.filter(f=>f.until>s.time);finish(s);
  }
  const api={DAMAGE_SCALE,FIRST_WAVE,WAVE_INTERVAL,SUPPLY_WINDOW,SEND_DELAY,ECLIPSE_AT,POLICIES,VERSION,WIDTH,HEIGHT,DURATION,ROLES,SHOP,create,step,ability,buy,castCard:buy,shopOpen,blocked,clearShot};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CrystalWars=api;
})(typeof globalThis!=='undefined'?globalThis:this);
