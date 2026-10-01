"use strict";
(function(){
 const options=document.getElementById("hub-options");if(!options)return;
 const button=document.createElement("button");button.className="btn";button.textContent="Administración";button.hidden=true;options.appendChild(button);
 async function status(){button.hidden=true;if(!acct.session)return;try{const r=await accountFetch("GET","/api/admin/status");button.hidden=!(r.status===200&&r.j.admin);}catch{}}
 window.addEventListener("account-change",status);document.addEventListener("account-change",status);status();
 button.onclick=()=>{
  const modal=document.createElement("div");modal.className="admin-modal";modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");
  modal.innerHTML='<h2>Administración · niveles</h2><p>Consultá un usuario del juego. Al bajar niveles se reinicia su árbol de talentos; conserva objetos y oro. Debe salir de la partida y cargar el progreso de la nube tras el cambio.</p><label>Usuario <input id="admin-user" autocomplete="off"></label><button id="admin-load">Consultar perfil</button><label>Héroe <select id="admin-hero"></select></label><label>Nivel <input id="admin-level" type="number" min="1" max="99"></label><button id="admin-save" disabled>Aplicar nivel</button><p id="admin-message" role="status"></p><button id="admin-close">Cerrar</button>';
  document.body.appendChild(modal);let profile=null;
  const q=id=>modal.querySelector('#admin-'+id);q('close').onclick=()=>{modal.remove();button.focus();};
  function fill(p){profile=p;q('hero').innerHTML=p.champions.filter(c=>c.unlocked).map(c=>`<option value="${guideEsc(c.key)}">${guideEsc(CLASSES[c.key]?.name||c.key)} · Nv. ${c.level}</option>`).join('');q('hero').onchange=()=>{q('level').value=profile.champions.find(c=>c.key===q('hero').value)?.level||1;};q('hero').onchange();q('save').disabled=false;}
  q('load').onclick=async()=>{q('save').disabled=true;try{const r=await accountFetch('POST','/api/admin/profile',{user:q('user').value.trim()});if(r.status!==200)throw Error(r.j.msg);fill(r.j);q('message').textContent='Perfil cargado.';}catch(e){q('message').textContent=e.message;}};
  q('save').onclick=async()=>{if(!profile)return;q('save').disabled=true;try{const r=await accountFetch('POST','/api/admin/level',{user:profile.user,champion:q('hero').value,level:Number(q('level').value),baseVersion:profile.version});if(r.status!==200)throw Error(r.j.msg);fill(r.j);q('message').textContent='Nivel guardado en la nube. El jugador debe sincronizar su perfil.';}catch(e){profile=null;q('message').textContent=e.message;}};
 };
})();
