"use strict";
/* ============================================================
   js/ui/game-dialog.js
   Diálogos propios del juego: reemplazan confirm()/alert() nativos, que en el celular rompen
   la estética (cartel gris del sistema). Mismo estilo pixel oscuro que los menús.

   gameConfirm(mensaje, {okText, cancelText, danger}) -> Promise<boolean>
   gameAlert(mensaje, {okText})                       -> Promise<void>

   - Un solo diálogo a la vez: si llega otro mientras hay uno abierto, queda en cola.
   - Enter = aceptar, Escape = cancelar (en un aviso, Escape también lo cierra).
   - El texto se muestra con textContent (sin HTML) y respeta los saltos de línea "\n".
   - Gancho para pruebas automáticas: con window.__autoConfirm === true o
     localStorage "laHordaAutoConfirm" === "1", gameConfirm responde true al instante y
     gameAlert se resuelve sin mostrar nada (reemplaza a page.on('dialog', d=>d.accept())).
   ============================================================ */

const GAME_DIALOG = { queue: [], cur: null, el: null, openedAt: 0, prevFocus: null };

function gameDialogAutoConfirm(){
  try{ if(window.__autoConfirm === true) return true; }catch(e){}
  try{ return localStorage.getItem("laHordaAutoConfirm") === "1"; }catch(e){ return false; }
}
// En modo auto-confirmación la respuesta se entrega SINCRÓNICAMENTE (como hacía confirm() nativo):
// .then(cb) ejecuta cb en el acto, así una prueba que hace click y lee el estado en el mismo
// evaluate ve el mismo resultado que antes. Los mensajes quedan en window.__gameDialogLog.
function _gameDialogAutoAnswer(kind, message, value){
  try{ (window.__gameDialogLog = window.__gameDialogLog || []).push({ kind, message:String(message) }); }catch(e){}
  const p = Promise.resolve(value);
  return {
    then(onOk){ return Promise.resolve(typeof onOk === "function" ? onOk(value) : value); },
    catch(){ return p; },
    finally(f){ if(typeof f === "function") f(); return p; }
  };
}
function gameConfirm(message, opts){
  if(gameDialogAutoConfirm()) return _gameDialogAutoAnswer("confirm", message, true);
  return new Promise(resolve=> _gameDialogPush({ kind:"confirm", message, opts:opts||{}, resolve }));
}
function gameAlert(message, opts){
  if(gameDialogAutoConfirm()) return _gameDialogAutoAnswer("alert", message, undefined);
  return new Promise(resolve=> _gameDialogPush({ kind:"alert", message, opts:opts||{}, resolve:()=>resolve() }));
}
function gameDialogIsOpen(){ return !!GAME_DIALOG.cur; }

function _gameDialogPush(req){
  GAME_DIALOG.queue.push(req);
  if(!GAME_DIALOG.cur) _gameDialogNext();
}
function _gameDialogEl(){
  if(GAME_DIALOG.el && GAME_DIALOG.el.isConnected) return GAME_DIALOG.el;
  const el = document.createElement("div");
  el.id = "game-dialog";
  el.className = "hidden";
  el.innerHTML = `<div class="gd-panel" role="alertdialog" aria-modal="true" aria-labelledby="gd-msg">
      <div class="gd-title"></div>
      <div class="gd-msg" id="gd-msg"></div>
      <div class="gd-actions">
        <button type="button" class="btn secondary gd-btn gd-cancel"></button>
        <button type="button" class="btn gd-btn gd-ok"></button>
      </div>
    </div>`;
  el.querySelector(".gd-ok").addEventListener("click", ev=>{ ev.stopPropagation(); _gameDialogClose(true, true); });
  el.querySelector(".gd-cancel").addEventListener("click", ev=>{ ev.stopPropagation(); _gameDialogClose(false, true); });
  // que los toques no lleguen a lo que hay detrás (joystick, lobby, canvas)
  for(const t of ["pointerdown","touchstart","click"]) el.addEventListener(t, ev=> ev.stopPropagation(), {passive:true});
  document.body.appendChild(el);
  GAME_DIALOG.el = el;
  return el;
}
function _gameDialogNext(){
  const req = GAME_DIALOG.queue.shift();
  if(!req){ GAME_DIALOG.cur = null; return; }
  GAME_DIALOG.cur = req;
  const el = _gameDialogEl(), o = req.opts, isConfirm = req.kind === "confirm";
  el.querySelector(".gd-msg").textContent = String(req.message == null ? "" : req.message);
  const title = el.querySelector(".gd-title");
  title.textContent = o.title || (o.danger ? "⚠ Atención" : (isConfirm ? "Confirmar" : "Aviso"));
  const ok = el.querySelector(".gd-ok"), cancel = el.querySelector(".gd-cancel");
  ok.textContent = o.okText || (isConfirm ? "Aceptar" : "Entendido");
  cancel.textContent = o.cancelText || "Cancelar";
  cancel.classList.toggle("hidden", !isConfirm);
  el.classList.toggle("gd-danger", !!o.danger);
  el.classList.toggle("gd-alert", !isConfirm);
  el.querySelector(".gd-msg").scrollTop = 0;
  el.classList.remove("hidden");
  GAME_DIALOG.openedAt = Date.now();
  GAME_DIALOG.prevFocus = document.activeElement;
  try{ ok.focus({preventScroll:true}); }catch(e){}
}
function _gameDialogClose(value, fromPointer){
  const req = GAME_DIALOG.cur; if(!req) return;
  // evita que el mismo toque que abrió el diálogo lo conteste sin querer
  if(fromPointer && Date.now() - GAME_DIALOG.openedAt < 250) return;
  GAME_DIALOG.cur = null;
  const el = GAME_DIALOG.el;
  if(el) el.classList.add("hidden");
  const pf = GAME_DIALOG.prevFocus; GAME_DIALOG.prevFocus = null;
  if(pf && pf.isConnected && typeof pf.focus === "function"){ try{ pf.focus({preventScroll:true}); }catch(e){} }
  try{ req.resolve(req.kind === "confirm" ? !!value : undefined); }
  finally{ if(GAME_DIALOG.queue.length) setTimeout(()=>{ if(!GAME_DIALOG.cur) _gameDialogNext(); }, 0); }
}
// Teclado: se captura antes que el resto del juego (pausa, Hechicero, chat...) mientras hay diálogo
window.addEventListener("keydown", ev=>{
  if(!GAME_DIALOG.cur) return;
  const k = ev.key;
  if(k === "Enter" || k === "NumpadEnter"){
    // si el foco está en "Cancelar", Enter lo activa (comportamiento estándar de los botones)
    const onCancel = GAME_DIALOG.el && document.activeElement === GAME_DIALOG.el.querySelector(".gd-cancel");
    ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
    if(!ev.repeat) _gameDialogClose(!onCancel, false);
  } else if(k === "Escape" || k === "Esc"){
    ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
    _gameDialogClose(false, false);
  } else if(k === " " || k === "Tab" || k === "ArrowLeft" || k === "ArrowRight"){
    // navegación entre los dos botones; no dejamos que el juego reciba estas teclas
    ev.stopPropagation(); ev.stopImmediatePropagation();
    if(k === "ArrowLeft" || k === "ArrowRight"){
      ev.preventDefault();
      const el = GAME_DIALOG.el, ok = el.querySelector(".gd-ok"), cancel = el.querySelector(".gd-cancel");
      if(GAME_DIALOG.cur.kind === "confirm") (document.activeElement === ok ? cancel : ok).focus({preventScroll:true});
    }
  } else {
    // el resto de las teclas (movimiento, habilidades) no deben disparar nada detrás del diálogo
    ev.stopPropagation(); ev.stopImmediatePropagation();
  }
}, true);
