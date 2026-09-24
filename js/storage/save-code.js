"use strict";
/* ============================================================
   js/storage/save-code.js
   Exportar/importar el progreso como código de texto (botones del menú).
   ============================================================ */

// Guardado manual por código: además del localStorage automático (que en algunos contextos
// -como abrir el juego siempre desde un link o una vista previa- puede no persistir entre
// sesiones), esto permite copiar todo el progreso como texto y restaurarlo a mano después.
function serializeSaveCode(){
  return btoa(unescape(encodeURIComponent(JSON.stringify(save))));
}
function applySaveCode(code){
  const parsed = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
  if(!parsed || !parsed.champions) throw new Error("formato inválido");
  localStorage.setItem(SAVE_KEY, JSON.stringify(parsed));
  loadSave();
}
document.getElementById("export-save-btn").addEventListener("click", ()=>{
  const code = serializeSaveCode();
  const finish = ()=> alert("Código copiado. Guardalo en Notas — con eso podés restaurar tu progreso (nivel, ítems, oro) en cualquier momento, aunque el navegador borre los datos.");
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(code).then(finish).catch(()=> prompt("Copiá este código a mano (seleccionalo todo):", code));
  } else {
    prompt("Copiá este código a mano (seleccionalo todo):", code);
  }
});
document.getElementById("import-save-btn").addEventListener("click", ()=>{
  const code = prompt("Pegá acá tu código de guardado:");
  if(!code) return;
  try{
    applySaveCode(code);
    renderChampGrid(); renderSaveLine();
    alert("¡Progreso restaurado!");
  }catch(e){
    alert("Ese código no es válido o está incompleto.");
  }
});
