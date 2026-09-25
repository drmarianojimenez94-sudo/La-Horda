"use strict";
/* ============================================================
   js/net/net-config.js
   Configuración del multijugador cooperativo (B1). Es PÚBLICA a propósito: no contiene
   secretos, solo la dirección del servidor de salas (server/relay.js).

   serverUrl: dirección wss:// del relay desplegado (ej. "wss://la-horda-relay.onrender.com").
   Vacío = el modo online queda desactivado y el juego sigue funcionando solo, como siempre.
   Para probar sin tocar este archivo: agregar ?server=wss://... a la URL del juego.
   ============================================================ */
const NET_CONFIG = {
  serverUrl: "",
  build: "B1-1" // si el anfitrión y el invitado tienen builds distintos, el servidor no los junta
};
