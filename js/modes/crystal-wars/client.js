/* Browser adapter: shared relay protocol, separate CW build and no account writes. */
(function(){
'use strict';
const C=CrystalWars,$=id=>document.getElementById(id),q=new URLSearchParams(location.search);
// Direct invitations also go through the first-run tutorial. Preserve the room
// and relay across the round trip; never accept an arbitrary redirect URL.
if(!HordaOnboarding.storedReady()){
 const start=new URL('index.html',location.href);start.searchParams.set('next','crystal-wars');
 for(const key of ['room','server'])if(q.has(key))start.searchParams.set(key,q.get(key));
 location.replace(start.href);return;
}
const skeletons=[1,2,3,4].map(i=>{const img=new Image();img.src='assets/sprites/enemies/infernal/esqueleto_h/walk'+i+'.png';return img;});
const golem=new Image();golem.src='assets/sprites/enemies/laberinto/golem_piedra/walk-strip.png';
// Arte del juego reutilizado (sin assets nuevos): piso de piedra de las Minas, portal de la Horda del Abismo y el
// cristal del Ángel (recoloreado a ámbar una vez al cargar: sin ctx.filter, que Safari no soporta en canvas).
const floorImg=new Image();floorImg.src='assets/vfx/minas/tex_piso_superior.png';
const portalImg=new Image();portalImg.src='assets/vfx/abismo/portal_activo_0.png';
const crystalImg=new Image();crystalImg.src='assets/vfx/bosses/hielo/bsAngelPillar_1.png';
let crystalAmber=null,floorPat=null;
crystalImg.onload=()=>{try{const c=document.createElement('canvas');c.width=crystalImg.naturalWidth;c.height=crystalImg.naturalHeight;const g=c.getContext('2d');g.drawImage(crystalImg,0,0);const d=g.getImageData(0,0,c.width,c.height),a=d.data;for(let i=0;i<a.length;i+=4){const r=a[i],gg=a[i+1],b=a[i+2];a[i]=b;a[i+1]=Math.round((gg+b)/2*0.78);a[i+2]=Math.round(r*0.55);}g.putImageData(d,0,0);crystalAmber=c;}catch(e){crystalAmber=null;}};
const images={};for(const k of Object.keys(C.ROLES)){const img=new Image();img.src='assets/sprites/champions/'+k+'/atlas.png';images[k]=img;const o=document.createElement('option');o.value=k;o.textContent=C.ROLES[k].name;$('champ').appendChild(o);}
let sim=null,ws=null,room=null,slot=0,host=false,offline=true,viewOther=false,inputs={},keys={},joy={x:0,y:0},last=0,acc=0,lastSend=0,lastSnap=0,matchId='',snapshotN=0,lastN=-1,shownResult=false,sound=false,audio=null,connection=null,retryTimer=0,closing=false;
const remoteTimes={},lastActions={};
let clientId;try{clientId=sessionStorage.getItem('cw-client');if(!clientId){clientId=crypto.randomUUID();sessionStorage.setItem('cw-client',clientId);}}catch{clientId=String(Math.random()).slice(2);}
function status(s){$('status').textContent=s;}
function send(m){if(ws&&ws.readyState===WebSocket.OPEN){ws.send(JSON.stringify(m));return true;}return false;}
function message(d,to){return send({t:'msg',d,to});}
function kit(){const r=C.ROLES[$('champ').value];$('kit').textContent=r.skills.join(' · ');if(room)send({t:'update',champ:$('champ').value,ready:false});}
$('champ').onchange=kit;kit();
function server(){const raw=q.get('server')||NET_CONFIG.serverUrl;const u=new URL(raw);if(!['ws:','wss:'].includes(u.protocol))throw Error('Dirección de servidor inválida');return u.href;}
function identity(){return {protocol:1,build:C.VERSION,champ:$('champ').value,name:$('name').value.trim()||'Guardián',level:1,clientId};}
async function connect(){
 if(ws&&ws.readyState===1)return;if(connection)return connection;closing=false;
 connection=new Promise((resolve,reject)=>{let socket;try{socket=new WebSocket(server());}catch(e){reject(e);return;}ws=socket;
 const timer=setTimeout(()=>{socket.close();reject(Error('El servidor no respondió. Podés entrenar con bots.'));},12000);
 socket.onopen=()=>{clearTimeout(timer);resolve();};socket.onerror=()=>{clearTimeout(timer);reject(Error('No se pudo conectar al servidor.'));};
 socket.onmessage=e=>{try{receive(JSON.parse(e.data));}catch(err){console.error('CW message',err);status('No se pudo procesar un mensaje de la sala.');}};
 socket.onclose=()=>{clearTimeout(timer);reject(Error('Conexión cerrada'));if(closing)return;if(room&&!host){status('Conexión perdida. Intentando recuperar tu lugar…');retryTimer=setTimeout(()=>joinRoom(room.code).catch(e=>status(e.message)),1600);}else if(sim&&!sim.ended&&!offline){abort('El anfitrión perdió la conexión.');disconnect();}else{room=null;renderRoom();status('Conexión cerrada. Podés crear otra sala.');}};
 });try{await connection;}finally{connection=null;}
}
function parseCode(v){try{return new URL(v).searchParams.get('room')||'';}catch{return v.trim().toUpperCase();}}
async function joinRoom(code){await connect();send(Object.assign(identity(),{t:'join',code:parseCode(code)}));}
$('create').onclick=async()=>{try{status('Conectando…');await connect();send(Object.assign(identity(),{t:'create',arena:'crystal-wars',public:false}));}catch(e){status(e.message);}};
$('join').onclick=async()=>{const code=parseCode($('code').value);if(!/^[A-Z0-9]{6}$/.test(code)){status('Ingresá un código de seis letras/números o una invitación.');return;}try{await joinRoom(code);}catch(e){status(e.message);}};
$('name').onchange=()=>{if(room)send({t:'update',name:$('name').value.trim()||'Guardián',ready:false});};
function renderRoom(){
 $('room').hidden=!room;$('create').disabled=!!room;$('join').disabled=!!room;$('practice').disabled=!!room;
 if(!room)return;$('room-code').textContent=room.code;$('slots').replaceChildren();room.slots.forEach((p,i)=>{const el=document.createElement('div');el.className='slot'+(i>1?' amber':'');el.textContent='J'+(i+1)+' · '+(p&&p.connected?(p.name+' · '+(C.ROLES[p.champ]?.name||'Tanque')+' · '+(p.ready?'LISTO':'Preparando')):'BOT');$('slots').appendChild(el);});
 $('start').hidden=!host;$('ready').hidden=host;$('ready').textContent=room.slots[slot]?.ready?'✔ LISTO':'ESTOY LISTO';$('start').disabled=room.state!=='lobby'||room.slots.some((p,i)=>i>0&&p&&p.connected&&!p.ready);
 $('champ').disabled=room.state!=='lobby';$('name').disabled=room.state!=='lobby';
}
$('ready').onclick=()=>send({t:'update',ready:!room.slots[slot]?.ready});
$('copy').onclick=async()=>{const u=new URL(location.href);u.searchParams.set('room',room.code);try{await navigator.clipboard.writeText(u.href);status('Invitación copiada.');}catch{status('Invitación: '+u.href);}};
function disconnect(){closing=true;clearTimeout(retryTimer);if(ws){send({t:'leave'});ws.close();}ws=null;room=null;connection=null;host=false;offline=true;$('champ').disabled=false;$('name').disabled=false;renderRoom();}
$('leave').onclick=()=>{disconnect();status('Saliste de la sala.');};
function receive(m){
 if(m.t==='error'){const errors={NOT_FOUND:'No existe esa sala.',BUILD:'Ese código pertenece a otro modo o versión. Abrí la invitación de Guerra de Cristales.',ROOM_FULL:'La sala ya tiene cuatro jugadores.',STARTED:'La partida ya comenzó.',VERSION:'El servidor necesita actualizarse.',ORIGIN:'El servidor no admite esta dirección del juego.',HOST_RECONNECT:'El anfitrión debe crear una sala nueva.'};status(errors[m.code]||('No se pudo completar: '+m.code));return;}
 if(m.t==='joined'){room=m.room;slot=m.slot;host=!!m.host;offline=false;renderRoom();status('Conectado · Equipo '+(slot<2?'Zafiro':'Ámbar'));if(!host)message({k:'cw-sync'});return;}
 if(m.t==='room'){room=m.room;renderRoom();if(host&&sim&&!sim.ended){for(const h of sim.heroes){h.bot=!room.slots[h.slot]?.connected;if(h.bot){delete inputs[h.slot];delete remoteTimes[h.slot];}}}if(room.state==='lobby'&&sim){sim=null;closeResult();showLobby();status('Sala lista para la revancha.');}return;}
 if(m.t==='closed'){if(sim&&!sim.ended)abort('La sala se cerró: '+m.reason);disconnect();return;}
 if(m.t!=='msg'||!m.d)return;const d=m.d;
 if(host){
  if(!sim||sim.ended){if(d.k==='cw-sync'&&sim)message({k:'cw-state',id:matchId,n:++snapshotN,state:sim},m.from);return;}
  const h=sim.heroes[m.from];if(!h||m.from===0||!room.slots[m.from]?.connected)return;
  if(d.k==='cw-sync'){h.bot=false;message({k:'cw-state',id:matchId,n:++snapshotN,state:sim},m.from);return;}
  if(d.id!==matchId)return;
  if(d.k==='cw-input'){if(Number.isFinite(d.x)&&Number.isFinite(d.y)){inputs[m.from]={x:Math.max(-1,Math.min(1,d.x)),y:Math.max(-1,Math.min(1,d.y))};remoteTimes[m.from]=performance.now();}return;}
  if(d.k==='cw-action'){const now=performance.now();if(now-(lastActions[m.from]||0)<100)return;lastActions[m.from]=now;if(d.action==='skill')C.ability(sim,m.from,d.value);if(d.action==='buy')C.buy(sim,m.from,d.value);}
 }else if(m.from===0&&d.k==='cw-state'&&d.state?.version===C.VERSION){
  if(d.id===matchId&&d.n<=lastN)return;if(d.id!==matchId){matchId=d.id;lastN=-1;shownResult=false;closeResult();}lastN=d.n;lastSnap=performance.now();const starting=!sim||$('game').hidden;sim=d.state;if(starting)showGame();if(sim.ended)showResult();
 }
}
function begin(){
 offline=!room;host=!!room;slot=0;inputs={};for(const k of Object.keys(remoteTimes))delete remoteTimes[k];sim=C.create(room?room.slots:[{connected:true,champ:$('champ').value,name:$('name').value||'Guardián'}],crypto.getRandomValues(new Uint32Array(1))[0]);
 matchId=crypto.randomUUID();snapshotN=0;shownResult=false;viewOther=false;acc=0;last=performance.now();closeResult();showGame();if(room){send({t:'start'});broadcast();}
}
$('practice').onclick=begin;$('start').onclick=()=>{if(host&&room?.state==='lobby'&&!$('start').disabled)begin();};
function showGame(){ $('lobby').hidden=true;$('game').hidden=false;drawControls(); }
function showLobby(){ $('lobby').hidden=false;$('game').hidden=true;keys={};joy={x:0,y:0};renderRoom(); }
function closeResult(){if($('result').open)$('result').close();}
function showResult(){if(shownResult)return;shownResult=true;const team=sim.heroes[slot].team;$('result-title').textContent=sim.winner===-1?'EMPATE':sim.winner===team?'CRISTAL VICTORIOSO':'CRISTAL DERROTADO';$('result-detail').textContent='Zafiro '+Math.ceil(sim.teams[0].hp)+' · Ámbar '+Math.ceil(sim.teams[1].hp)+' · '+sim.wave+' oleadas. Esta prueba no modifica tu campaña.';$('rematch').textContent=offline?'VOLVER A ENTRENAR':host?'VOLVER A LA SALA':'ESPERAR EN LA SALA';$('result').showModal();beep(sim.winner===team?660:180);}
function abort(reason){if(sim)sim.ended=true;shownResult=true;$('result-title').textContent='PARTIDA INTERRUMPIDA';$('result-detail').textContent=reason+' No se registra victoria ni derrota.';if(!$('result').open)$('result').showModal();}
$('rematch').onclick=()=>{closeResult();if(room&&host)send({t:'lobby',arena:'crystal-wars'});sim=null;showLobby();};
$('result').addEventListener('cancel',e=>e.preventDefault());
$('quit').onclick=()=>{if(!confirm('¿Abandonar la partida? Si sos anfitrión, se cerrará para todos.'))return;disconnect();sim=null;closeResult();showLobby();};
$('view').onclick=()=>{viewOther=!viewOther;$('view').textContent=viewOther?'Mi arena':'Ver rival';};
function act(action,value){if(!sim||sim.ended||viewOther)return;if(offline||host){const ok=action==='skill'?C.ability(sim,slot,value):C.buy(sim,slot,value);if(ok)beep(action==='buy'?430:580);return;}message({k:'cw-action',id:matchId,action,value});}
function drawControls(){
 $('skills').replaceChildren();sim.heroes[slot]&&C.ROLES[sim.heroes[slot].role].skills.forEach((name,i)=>{const b=document.createElement('button');b.dataset.index=i;b.textContent=(i+1)+' · '+name;b.onclick=()=>act('skill',i);$('skills').appendChild(b);});
 $('shop').replaceChildren();for(const [key,item]of Object.entries(C.SHOP)){const b=document.createElement('button');b.dataset.key=key;b.textContent=item.name+' · '+item.cost+' ◆';b.onclick=()=>act('buy',key);$('shop').appendChild(b);}
}
function movement(){let x=joy.x+(keys.d||keys.ArrowRight?1:0)-(keys.a||keys.ArrowLeft?1:0),y=joy.y+(keys.s||keys.ArrowDown?1:0)-(keys.w||keys.ArrowUp?1:0);const n=Math.max(1,Math.hypot(x,y));return {x:x/n,y:y/n};}
window.addEventListener('keydown',e=>{if(!sim||sim.ended||/INPUT|SELECT/.test(e.target.tagName))return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();keys[e.key.length===1?e.key.toLowerCase():e.key]=true;if(!e.repeat&&/^[1-4]$/.test(e.key))act('skill',+e.key-1);});
window.addEventListener('keyup',e=>{delete keys[e.key.length===1?e.key.toLowerCase():e.key];});
window.addEventListener('blur',()=>{keys={};joy={x:0,y:0};if(!offline&&!host)message({k:'cw-input',id:matchId,x:0,y:0});});
const stick=$('joystick');let pointer=null;
function stickMove(e){const r=stick.getBoundingClientRect(),radius=r.width*.35;joy={x:Math.max(-1,Math.min(1,(e.clientX-r.left-r.width/2)/radius)),y:Math.max(-1,Math.min(1,(e.clientY-r.top-r.height/2)/radius))};stick.querySelector('i').style.transform='translate('+joy.x*radius+'px,'+joy.y*radius+'px)';}
stick.onpointerdown=e=>{pointer=e.pointerId;stick.setPointerCapture(pointer);stickMove(e);};stick.onpointermove=e=>{if(e.pointerId===pointer)stickMove(e);};function release(){pointer=null;joy={x:0,y:0};stick.querySelector('i').style.transform='';}stick.onpointerup=release;stick.onpointercancel=release;stick.onlostpointercapture=release;
$('sound').onclick=()=>{sound=!sound;$('sound').textContent='Sonido: '+(sound?'encendido':'apagado');$('sound').setAttribute('aria-pressed',String(sound));if(sound){audio=audio||new(window.AudioContext||window.webkitAudioContext)();audio.resume();beep(440);}};
function beep(freq){if(!sound||!audio)return;const o=audio.createOscillator(),g=audio.createGain();o.type='triangle';o.frequency.value=freq;g.gain.setValueAtTime(.05,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.14);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+.15);}
const canvas=$('battle'),ctx=canvas.getContext('2d');
function sprite(h){const meta=CW_ATLAS[h.role],im=images[h.role];if(!meta||!im.complete||!im.naturalWidth)return false;const moving=h.moving,dir=Math.abs(h.dx)>Math.abs(h.dy)?h.dx<0?'left':'right':h.dy<0?'up':'down';const clip=meta.animations[(moving?'walk_':'idle_')+dir]||meta.animations.idle||Object.values(meta.animations)[0];const frame=meta.frames[clip.frames[Math.floor((moving?h.anim:sim.time)*(clip.fps||6))%clip.frames.length]];if(!frame)return false;const scale=76/(meta.referenceHeight||frame.h);ctx.save();ctx.translate(h.x,h.y);if(clip.flip)ctx.scale(-1,1);ctx.drawImage(im,frame.x,frame.y,frame.w,frame.h,-(frame.pivotX||frame.w/2)*scale,-(frame.pivotY||frame.h)*scale,frame.w*scale,frame.h*scale);ctx.restore();return true;}
function render(){
 if(!sim)return;const me=sim.heroes[slot];if(!me)return;const team=viewOther?1-me.team:me.team,t=sim.teams[me.team];
 const box=canvas.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);if(canvas.width!==Math.round(box.width*dpr)||canvas.height!==Math.round(box.height*dpr)){canvas.width=Math.round(box.width*dpr);canvas.height=Math.round(box.height*dpr);}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#111723';ctx.fillRect(0,0,box.width,box.height);const scale=Math.min(box.width/C.WIDTH,box.height/C.HEIGHT);ctx.translate((box.width-C.WIDTH*scale)/2,(box.height-C.HEIGHT*scale)/2);ctx.scale(scale,scale);ctx.imageSmoothingEnabled=false;
 ctx.fillStyle='#202937';ctx.fillRect(18,35,C.WIDTH-36,C.HEIGHT-55);ctx.save();ctx.beginPath();ctx.rect(20,38,840,560);ctx.clip();
 if(floorImg.complete&&floorImg.naturalWidth){if(!floorPat){const t=document.createElement('canvas');t.width=t.height=128;const g=t.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(floorImg,0,0,128,128);floorPat=ctx.createPattern(t,'repeat');}ctx.fillStyle=floorPat;ctx.fillRect(20,38,840,560);ctx.fillStyle='rgba(8,12,20,.38)';ctx.fillRect(20,38,840,560);}
 else{ctx.strokeStyle='#2b3749';ctx.lineWidth=2;for(let x=30;x<880;x+=55){for(let y=45;y<610;y+=40){ctx.strokeRect(x+(y%80?0:25),y,51,36);}}}
 const vg=ctx.createRadialGradient(440,330,120,440,330,520);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.55)');ctx.fillStyle=vg;ctx.fillRect(20,38,840,560);
 ctx.restore();const color=team===0?'#70c9ff':'#ffb86a';ctx.strokeStyle=color;ctx.lineWidth=4;ctx.strokeRect(20,38,840,560);
 if(portalImg.complete&&portalImg.naturalWidth){for(const px of [160,440,720]){const k=1+Math.sin(sim.time*2.4+px)*.03;ctx.drawImage(portalImg,px-50*k,24,100*k,96*k);}}else{ctx.fillStyle='#080c13';ctx.fillRect(55,38,770,22);}
 ctx.fillStyle=color;ctx.font='10px "Press Start 2P", monospace';ctx.textAlign='center';ctx.fillText('PORTALES DE LA HORDA',440,22);
 const pulse=1+Math.sin(sim.time*3)*.04;ctx.save();ctx.translate(440,545);ctx.scale(pulse,pulse);ctx.fillStyle='#17222f';ctx.beginPath();ctx.ellipse(0,10,65,23,0,0,Math.PI*2);ctx.fill();ctx.shadowColor=color;ctx.shadowBlur=20;const cimg=team===0?crystalImg:crystalAmber;if(cimg&&(cimg.width||cimg.naturalWidth)&&(team!==0||crystalAmber)){const w=33*2.6,h=75*2.6;ctx.drawImage(cimg,-w/2,-h+12,w,h);}else{ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,-67);ctx.lineTo(25,-25);ctx.lineTo(0,9);ctx.lineTo(-25,-25);ctx.closePath();ctx.fill();ctx.strokeStyle='#eef8ff';ctx.stroke();}ctx.shadowBlur=0;
 {const tt=sim.teams[team],f=Math.max(0,tt.hp/tt.maxHp);if(f<0.5){ctx.strokeStyle='rgba(255,255,255,'+(0.5-f).toFixed(2)+')';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-6,-120);ctx.lineTo(4,-90);ctx.lineTo(-3,-70);ctx.lineTo(7,-40);ctx.stroke();}}ctx.restore();
 for(const f of sim.effects.filter(f=>f.team===team)){ctx.save();ctx.strokeStyle=f.color;ctx.fillStyle=f.color;ctx.globalAlpha=f.kind==='zone'?.16:.7;ctx.lineWidth=3;ctx.beginPath();if(f.kind==='shot'){ctx.moveTo(f.x,f.y-25);ctx.lineTo(f.tx,f.ty-15);ctx.stroke();}else{ctx.arc(f.x,f.y,f.r,0,Math.PI*2);if(f.kind==='zone')ctx.fill();else ctx.stroke();}ctx.restore();}
 const entities=[...sim.enemies.filter(e=>e.team===team),...sim.heroes.filter(h=>h.team===team)].sort((a,b)=>a.y-b.y);
 for(const e of entities){if(e.role){ctx.globalAlpha=e.hp>0?1:.25;if(!sprite(e)){ctx.fillStyle=C.ROLES[e.role].color;ctx.fillRect(e.x-14,e.y-36,28,36);}ctx.globalAlpha=1;ctx.fillStyle='#080d15';ctx.fillRect(e.x-25,e.y-86,50,5);ctx.fillStyle=e.slot===slot?'#ffffff':color;ctx.fillRect(e.x-25,e.y-86,50*e.hp/e.maxHp,5);ctx.font='8px "Press Start 2P", monospace';ctx.textAlign='center';ctx.fillText(e.name,e.x,e.y-92);if(e.shield>0){ctx.strokeStyle='#a9f5ff';ctx.beginPath();ctx.arc(e.x,e.y-22,31,0,Math.PI*2);ctx.stroke();}}else{const brute=e.kind==='brute',r=brute?23:12;const img=brute?golem:skeletons[Math.floor(sim.time*8+e.id)%4];if(img.complete&&img.naturalWidth){if(brute){const frame=Math.floor(sim.time*10+e.id)%55;ctx.drawImage(img,frame*75,0,75,61,e.x-42,e.y-65,84,68);}else{const height=e.kind==='runner'?43:48,w=height*img.naturalWidth/img.naturalHeight;ctx.drawImage(img,e.x-w/2,e.y-height,w,height);}}else{ctx.fillStyle='#648375';ctx.fillRect(e.x-r,e.y-r*2,r*2,r*2);}ctx.fillStyle='#111';ctx.fillRect(e.x-r,e.y-r*2-8,r*2,3);ctx.fillStyle='#ed8b72';ctx.fillRect(e.x-r,e.y-r*2-8,r*2*e.hp/e.maxHp,3);}}
 for(const [i,key]of ['blue','amber'].entries()){$(key+'-hp').textContent=Math.ceil(sim.teams[i].hp)+' / 1200';$(key+'-meter').value=sim.teams[i].hp;}
 const left=Math.max(0,Math.ceil(C.DURATION-sim.time));$('clock').textContent=Math.floor(left/60)+':'+String(left%60).padStart(2,'0');$('wave').textContent='Oleada '+sim.wave;
 $('shards').textContent='◆ '+t.shards+' fragmentos · Mejora '+t.upgrade+'/3';const supply=C.shopOpen(sim);$('phase').textContent=supply?'SUMINISTROS · '+Math.ceil(sim.wave===0?sim.nextWave-sim.time:sim.nextWave-28-sim.time)+' s':'Suministros en '+Math.ceil(sim.nextWave-sim.time)+' s';
 const incoming=sim.pending.filter(p=>p.team===team);$('notice').textContent=incoming.length?'⚠ '+incoming.map(p=>(p.kind==='brute'?'COLOSO':'ACECHADORES')+' EN '+Math.ceil(p.due-sim.time)+' s').join(' · '):viewOther?'OBSERVANDO AL RIVAL · Volvé a tu arena para actuar':(!offline&&!host&&performance.now()-lastSnap>3000?'Esperando al anfitrión…':'Defendé el cristal · '+(team===0?'ZAFIRO':'ÁMBAR'));
 $('vital').textContent=me.hp>0?'VIDA '+Math.ceil(me.hp)+' / '+me.maxHp:'CAÍDO · Regresás en '+Math.max(0,Math.ceil(me.respawn-sim.time))+' s';
 [...$('skills').children].forEach((b,i)=>{b.disabled=sim.ended||me.hp<=0||me.cd[i]>0||viewOther;b.textContent=(i+1)+' · '+C.ROLES[me.role].skills[i]+(me.cd[i]>0?' ('+Math.ceil(me.cd[i])+'s)':'');});
 [...$('shop').children].forEach(b=>{const k=b.dataset.key;b.disabled=!supply||viewOther||t.shards<C.SHOP[k].cost||(k==='upgrade'&&t.upgrade>=3)||(k==='repair'&&(t.hp>=t.maxHp||sim.time<t.repairAt))||(['swarm','brute'].includes(k)&&sim.time<t.sendAt);});
}
function broadcast(){message({k:'cw-state',id:matchId,n:++snapshotN,state:sim});}
function frame(now){const dt=Math.min(.15,Math.max(0,(now-(last||now))/1000));last=now;if(sim){if(!sim.ended){const move=viewOther?{x:0,y:0}:movement();inputs[slot]=move;if(offline||host){for(const h of sim.heroes)if(h.slot!==slot&&!h.bot&&now-(remoteTimes[h.slot]||0)>350)inputs[h.slot]={x:0,y:0};acc+=dt;while(acc>=1/30&&!sim.ended){C.step(sim,1/30,inputs);acc-=1/30;}if(sim.ended){showResult();if(host)broadcast();}if(host&&now-lastSend>100){lastSend=now;broadcast();}}else if(now-lastSend>60){lastSend=now;message({k:'cw-input',id:matchId,...move});}}render();}requestAnimationFrame(frame);}
if(q.get('room')){$('code').value=q.get('room');status('Elegí tu nombre y campeón; después tocá UNIRSE.');}
// Preserve the explicitly selected test server when returning to the main game.
if(q.get('server'))$('back').href='index.html?server='+encodeURIComponent(q.get('server'));
requestAnimationFrame(frame);
})();
