"use strict";
/* Alpha product services. Optional network; combat and saves work offline.
 * No account identifiers, chat text, error stacks or URLs enter telemetry. */
const AlphaServices = (() => {
  const BUILD = "alpha-factory-1";
  const bytes = new Uint8Array(16); crypto.getRandomValues(bytes);
  const session = Array.from(bytes, n => n.toString(16).padStart(2,"0")).join("");
  let world = null, offset = 0, queue = [], sending = false, panel = null, poll = null;
  let started = 0, inRun = false, terminal = false, lastState = "", worldPending = false;
  const knownEvents = new Set(["start","login","menu","tutorial_started","tutorial_completed","tutorial_step","tutorial_step_complete","tutorial_abandoned","run_started","death","abandon","victory","defeat","next_arena","codex","skin","croma","set","drop","pickup","skill","talent","equipment","multiplayer","error","heartbeat"]);
  // Automated QA must never contaminate live product metrics or fetch live tuning.
  function productEnabled(){return typeof navigator==="undefined"||!navigator.webdriver||window.__alphaServicesTest===true;}
  function enabled(){try{return productEnabled()&&localStorage.getItem("horda_telemetry")!=="off";}catch{return false;}}
  function emit(name, data={}){
    if(!enabled() || !knownEvents.has(name)) return;
    if(typeof alphaTrainingActive==="function"&&alphaTrainingActive()&&!name.startsWith("tutorial_"))return;
    const event = {name};
    for(const key of ["champion","arena","cosmetic","skill","step"]){if(typeof data[key]==="string"&&/^[a-zA-Z0-9_:.-]{1,80}$/.test(data[key]))event[key]=data[key];}
    for(const key of ["level","durationMs","value"]){if(Number.isFinite(data[key]))event[key]=Math.max(0,Math.min(43200000, data[key]));}
    if(event.cosmetic){event[name==="croma"?"croma":"skin"]=event.cosmetic;delete event.cosmetic;}
    if(event.skill){event.ability=event.skill;delete event.skill;}
    for(const key of ["talent","equipment","set"]){if(typeof data[key]==="string"&&/^[a-zA-Z0-9_-]{1,64}$/.test(data[key]))event[key]=data[key];}
    queue.push(event); if(queue.length>100){const disposable=queue.findIndex(e=>["skill","drop","pickup","heartbeat"].includes(e.name));queue.splice(disposable<0?0:disposable,1);}
  }
  async function flush(){
    if(sending||!queue.length||!enabled()||!accountAvailable())return;
    sending=true;const events=queue.splice(0,25);
    try{await accountFetch("POST","/api/telemetry",{session,build:BUILD,version:BUILD,alpha:"02",events},{auth:false,timeout:6000});}catch{/* Telemetry never blocks a run; bounded best-effort delivery. */}finally{sending=false;}
  }
  function now(){return Date.now()+offset;}
  function activeEvents(){return (world?.events||[]).filter(e=>e.enabled!==false&&e.start<=now()&&now()<e.end);}
  function multiplier(key){
    if(typeof alphaTrainingActive==="function"&&alphaTrainingActive())return 1;
    let value=world?.normalConfig?.[key]??1;
    for(const e of activeEvents())if((!e.arenas?.length||e.arenas.includes(currentArena))&&(!e.wave||runLevel>=e.wave))value*=e.multipliers?.[key]??1;
    return Number.isFinite(value)?Math.max(.1,Math.min(20,value)):1;
  }
  function spawnPool(pool, level){
    if(typeof alphaTrainingActive==="function"&&alphaTrainingActive())return pool;
    const result=pool.map(p=>({...p}));
    for(const e of activeEvents()){
      if(e.arenas?.length&&!e.arenas.includes(currentArena)||level<(e.wave||1))continue;
      for(const type of (e.enemies||[])){
        if(ENEMY_BASE[type]&&["normal","elite","subelite"].includes(ENEMY_BASE[type].rank)&&!result.some(p=>p.t===type))result.push({t:type,w:2});
      }
    }
    return result;
  }
  async function refreshWorld(){
    if(!productEnabled()||worldPending||!accountAvailable())return;worldPending=true;
    try{const r=await accountFetch("GET","/api/world",undefined,{auth:false,timeout:6000});if(r.status===200){world=r.j;offset=(world.serverTime||Date.now())-Date.now();renderNews();}}
    catch{/* retain last known base; temporary events still expire using server clock */}finally{worldPending=false;}
  }
  function renderNews(){
    const host=document.getElementById("alpha-news");if(!host)return;host.replaceChildren();
    for(const m of (world?.messages||[]).filter(m=>m.enabled!==false&&m.start<=now()&&now()<m.end).slice(0,3)){
      const article=document.createElement("article"),text=document.createElement("p");article.className="alpha-news-card"+(m.type==="global"?" alpha-owner":"");text.textContent=(m.type==="global"?"GAME MASTER · ":"")+m.text;article.append(text);
      if(m.image&&(/^(https:\/\/|\/assets\/|assets\/)/.test(m.image))){const img=document.createElement("img");img.src=m.image;img.alt="";img.loading="lazy";article.prepend(img);}host.append(article);
    }
    for(const e of activeEvents().slice(0,2)){const article=document.createElement("article");article.className="alpha-news-card";const p=document.createElement("p");p.textContent="EVENTO · "+e.name+" · "+(e.announcement||e.description);if(e.banner&&/^(https:\/\/|\/?assets\/)/.test(e.banner)){const img=document.createElement("img");img.src=e.banner;img.alt="";img.loading="lazy";article.append(img);}article.append(p);host.append(article);}
    host.hidden=!host.children.length;
  }
  function context(){return {champion:typeof selectedClass!=="undefined"?selectedClass:"",arena:typeof currentArena!=="undefined"?currentArena:"",level:typeof runLevel!=="undefined"?runLevel:1};}
  function onState(next,previous){
    if(typeof alphaTrainingActive==="function"&&alphaTrainingActive())return;
    if(next===lastState)return;lastState=next;
    if(next==="mainmenu")emit("menu");
    if(next==="codex")emit("codex",context());
    if(next==="playing"&&!inRun){inRun=true;terminal=false;started=performance.now();emit("run_started",context());}
    if(inRun&&!terminal&&["victory","gameover"].includes(next)){terminal=true;emit(next==="victory"?"victory":"defeat",{...context(),durationMs:Math.round(performance.now()-started)});}
    if(inRun&&["title","mainmenu","prep","modeselect"].includes(next)){
      if(!terminal)emit("abandon",{...context(),durationMs:Math.round(performance.now()-started)});
      inRun=false;flush();
    }
    if(next!=="playing")renderNews();
    if(panel&&next==="playing")closeChat();
  }
  // Submission can move focus away from a disabled button; Escape remains global
  // while the dialog is open, before gameplay keyboard handlers receive it.
  document.addEventListener("keydown",e=>{if(panel&&e.key==="Escape"){e.preventDefault();e.stopImmediatePropagation();closeChat();}},true);
  function closeChat(){if(poll)clearTimeout(poll);poll=null;if(panel){panel.remove();panel=null;}document.getElementById("alpha-chat-open")?.focus();}
  async function openChat(){
    if(panel)return;if(!acct.session){accountOpen();return;}
    panel=document.createElement("section");panel.className="alpha-chat";panel.setAttribute("role","dialog");panel.setAttribute("aria-label","Chat global Alpha");panel.setAttribute("aria-modal","true");
    panel.innerHTML='<header><h2>CHAT GLOBAL</h2><button type="button" data-close aria-label="Cerrar chat">✕</button></header><p data-status role="status">Conectando…</p><div data-messages role="log" aria-live="polite" tabindex="0"></div><form><label>Mensaje <input maxlength="120" required autocomplete="off"></label><button type="submit">Enviar</button></form>';
    document.body.append(panel);const local=panel,status=local.querySelector('[data-status]'),list=local.querySelector('[data-messages]'),input=local.querySelector('input');
    local.querySelector('[data-close]').onclick=closeChat;
    local.onkeydown=e=>{if(e.key==="Escape")closeChat();if(e.key==="Tab"){const items=[...local.querySelectorAll('button,input,[tabindex="0"]')];const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};
    let lastSignature="";
    async function load(){if(panel!==local)return;try{
      const r=await accountFetch("GET","/api/chat",undefined,{timeout:6000});if(r.status!==200)throw Error(r.j.msg||"Chat no disponible");
      if(panel!==local)return;const messages=r.j.messages||[],signature=JSON.stringify([messages,r.j.pinned]);
      if(signature!==lastSignature){const atBottom=list.scrollHeight-list.scrollTop-list.clientHeight<32;list.replaceChildren();
        const rows=r.j.pinned?[r.j.pinned,...messages.filter(m=>m.id!==r.j.pinned.id)]:messages;
        for(const m of rows){const p=document.createElement("p"),label=document.createElement("b");p.className=m.owner||m.role==="OWNER"?"alpha-owner":"";label.textContent=(m.id===r.j.pinned?.id?"FIJADO · ":"")+(m.name||m.user||"Jugador")+(m.owner||m.role==="OWNER"?" · GAME MASTER":"")+": ";p.append(label,document.createTextNode(m.text||""));list.append(p);}if(atBottom)list.scrollTop=list.scrollHeight;lastSignature=signature;}
      status.textContent="Todos los jugadores de la Alpha. No compartas datos privados.";
    }catch(e){if(panel===local)status.textContent=e.message;}finally{if(panel===local)poll=setTimeout(load,5000);}}
    local.querySelector('form').onsubmit=async e=>{e.preventDefault();const button=e.target.querySelector('button'),text=input.value.trim();if(!text)return;button.disabled=true;
      try{const r=await accountFetch("POST","/api/chat",{text},{timeout:6000});if(r.status!==200&&r.status!==201)throw Error(r.j.msg||"No se pudo enviar");input.value="";if(poll)clearTimeout(poll);await load();}catch(err){status.textContent=err.message;}finally{button.disabled=false;if(panel===local)input.focus();}};
    input.focus();await load();
  }
  function mount(){
    const options=document.getElementById("hub-options");if(options&&!document.getElementById("alpha-chat-open")){
      const button=document.createElement("button");button.id="alpha-chat-open";button.className="btn";button.textContent="Chat global";button.onclick=openChat;options.append(button);
      const label=document.createElement("label");label.className="alpha-privacy";const check=document.createElement("input");check.type="checkbox";check.checked=enabled();check.onchange=()=>{try{localStorage.setItem("horda_telemetry",check.checked?"on":"off");}catch{}if(!check.checked)queue=[];};label.append(check,document.createTextNode(" Compartir métricas anónimas de juego (sin nombre, correo ni mensajes)"));options.append(label);
    }
    const menu=document.getElementById("mainmenu-screen");if(menu&&!document.getElementById("alpha-news")){const host=document.createElement("aside");host.id="alpha-news";host.hidden=true;host.setAttribute("aria-label","Noticias de la Alpha");menu.append(host);}
  }
  window.addEventListener("account-change",()=>{if(acct.session)emit("login");else closeChat();});
  window.addEventListener("error",()=>emit("error"));
  window.addEventListener("unhandledrejection",()=>emit("error"));
  window.addEventListener("horda-alpha",e=>{if(e.detail?.event?.startsWith("tutorial_"))emit(e.detail.event,{step:String(e.detail.step??"start"),durationMs:Number(e.detail.duration||0)*1000});});
  window.addEventListener("horda-stat",e=>{const map={ground_drop:"drop",ground_pick:"pickup"};if(map[e.detail?.k])emit(map[e.detail.k],{...context(),value:e.detail.v});});
  document.addEventListener("visibilitychange",()=>{if(document.hidden)flush();else refreshWorld();});
  window.addEventListener("pagehide",()=>{if(inRun&&!terminal)emit("abandon",{...context(),durationMs:Math.round(performance.now()-started)});flush();});
  mount();emit("start");refreshWorld();
  setInterval(()=>{if(!document.hidden){emit("heartbeat");flush();}},30000);
  setInterval(()=>{if(!document.hidden)refreshWorld();},60000);
  return {emit,flush,multiplier,spawnPool,onState,refreshWorld,activeEvents,openChat,closeChat,build:BUILD};
})();
function alphaWorldMultiplier(key){return AlphaServices.multiplier(key);}
