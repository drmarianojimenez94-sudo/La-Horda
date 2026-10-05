"use strict";
/* ============================================================
   js/net/fondal-telemetry.js
   AVISOS AL PANEL DEL ESTUDIO (fondalstudios.com). Solo avisos: no toca reglas, controles,
   balance, economía ni apariencia.

   En fondalstudios.com el juego vive en /la-horda/jugar/, en el mismo dominio que la web. Ahí
   existen el medidor /medir.js (window.fondalMedir) y la ruta /api/presencia. Este archivo:

     1. MEDIDOR. Carga /medir.js y le avisa: juego abierto, menú listo, empieza una partida,
        termina (completada | salida | desconexion | error), pausa, cambio de control y cada
        señal de control. El tiempo activo, los FPS, las salidas al cerrar la pestaña y los
        errores no atrapados los mide /medir.js solo.
     2. JUGANDO AHORA. Cada 30 s mientras la pestaña se ve, y cuando cambia el modo, avisa a
        /api/presencia en qué modo está ("menu" en menús y Sala). Al cerrar la pestaña, "me fui".

   FUERA de fondalstudios.com (GitHub Pages, un servidor local, pruebas) no hace NADA: no pide
   /medir.js ni /api/presencia, así que no hay errores ni pedidos fallidos. Y si en fondal algo
   falla (sin internet, 404, 429), se ignora en silencio: nunca traba ni le avisa nada al jugador.

   SIN DATOS PERSONALES: ni nombre, ni email, ni la cuenta. Solo modo, arena, campeón, control y
   cantidad de bots. El id de presencia se inventa al abrir y vive SOLO en memoria (no va a
   localStorage): al recargar es otro. Respeta la opción "Compartir métricas anónimas de juego"
   (horda_telemetry) y no cuenta navegadores automáticos (pruebas), igual que AlphaServices.

   Se carga PRIMERO (antes que el resto de los scripts) para avisar "abierto" apenas arranca; los
   enganches con el juego se arman cuando ya cargó todo (DOMContentLoaded). screens.js llama a
   fondalOnState(nuevo, anterior) en cada cambio de pantalla.
   ============================================================ */
const FondalTelemetry = (() => {
  const JUEGO = "la-horda";
  const VERSION = "1.0.0";
  // Un texto por modalidad: minúsculas y guiones, hasta 24 caracteres (lo que acepta el panel).
  const MODOS = Object.freeze({
    menu: "menu",                               // menús, Sala, tienda, resultados (solo presencia)
    historia: "historia",                       // campaña con compañeros bots
    historiaEnLinea: "historia-en-linea",       // campaña cooperativa en línea
    infinita: "horda-infinita",                 // Horda Infinita con bots
    infinitaEnLinea: "horda-infinita-en-linea", // Horda Infinita cooperativa en línea
    divina: "arena-divina",                     // Arena Divina
    tutorial: "tutorial"                        // entrenamiento inicial
  });
  const MODO_VALIDO = /^[a-z0-9-]{1,24}$/;
  const PRESENCIA_CADA_MS = 30000;
  // Pantallas "dentro de la partida" (para el modo de presencia); el resto es menú.
  const EN_PARTIDA = ["playing", "paused", "buff"];

  // ---------------- ¿se avisa? ----------------
  const enFondal = typeof location !== "undefined" && /^https?:$/.test(location.protocol) && location.pathname.indexOf("/la-horda/jugar") === 0;
  // Se consulta muy seguido (cada toque): la respuesta se recuerda 2 segundos.
  let permisoVisto = 0, permiso = false;
  function permitido(){
    if(!enFondal) return false;
    const t = Date.now();
    if(t - permisoVisto < 2000) return permiso;
    permisoVisto = t;
    try{
      // Las pruebas automáticas no ensucian los números (salvo la prueba de estos avisos).
      if(navigator.webdriver && window.__fondalTelemetryTest !== true) permiso = false;
      else permiso = localStorage.getItem("horda_telemetry") !== "off";
    }catch(e){ permiso = false; }
    return permiso;
  }
  const slug = (v, max) => String(v == null ? "" : v).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, max || 32);

  // ---------------- 1. MEDIDOR (/medir.js) ----------------
  // Las llamadas hechas antes de que termine de cargar /medir.js esperan en una cola corta.
  let cargando = false, cola = [];
  function medidor(){ const m = window.fondalMedir; return m && m.juego ? m.juego : null; }
  function llamar(nombre){
    try{
      if(!permitido()) return;
      const args = Array.prototype.slice.call(arguments, 1);
      const j = medidor();
      if(j){ if(typeof j[nombre] === "function") j[nombre].apply(j, args); return; }
      if(cargando && nombre !== "senal" && cola.length < 40) cola.push([nombre, args]);
    }catch(e){ /* nunca rompe el juego */ }
  }
  function vaciarCola(){
    const pendientes = cola; cola = []; cargando = false;
    for(const [nombre, args] of pendientes){ try{ const j = medidor(); if(j && typeof j[nombre] === "function") j[nombre].apply(j, args); }catch(e){} }
  }
  function cargarMedidor(){
    if(!enFondal || medidor() || cargando) return;
    try{
      cargando = true;
      const s = document.createElement("script");
      s.src = "/medir.js";
      s.onload = vaciarCola;
      s.onerror = () => { cargando = false; cola = []; }; // no está: el juego sigue igual
      (document.head || document.documentElement).appendChild(s);
    }catch(e){ cargando = false; cola = []; }
  }

  // ---------------- la partida en curso ----------------
  let partida = null;       // {modo} mientras hay una partida avisada
  let motivoFin = null;     // "desconexion" | "salida" si se sabe por qué terminó
  let control = null;       // "tactil" | "teclado"
  let menuListo = false;

  function modoDePartida(){
    try{
      if(typeof alphaTrainingActive === "function" && alphaTrainingActive()) return MODOS.tutorial;
      if(typeof divinaMode !== "undefined" && divinaMode) return MODOS.divina;
      const enLinea = typeof netMatch !== "undefined" && !!netMatch && netMatch.role !== "host-offline";
      const infinita = typeof endlessOn === "function" && endlessOn();
      if(infinita) return enLinea ? MODOS.infinitaEnLinea : MODOS.infinita;
      return enLinea ? MODOS.historiaEnLinea : MODOS.historia;
    }catch(e){ return MODOS.historia; }
  }
  // Compañeros de equipo que maneja la máquina (los enemigos de la horda no cuentan).
  function botsDelEquipo(){
    try{
      if(typeof netMatch !== "undefined" && netMatch && Array.isArray(netMatch.slots)) return netMatch.slots.filter(s => s && s.kind === "bot").length;
      if(typeof heroes !== "undefined" && Array.isArray(heroes) && typeof player !== "undefined" && player) return heroes.filter(h => h && h !== player && !h.isRemote).length;
    }catch(e){}
    return 0;
  }
  function controlInicial(){
    if(control) return control;
    let tactil = false;
    try{ tactil = "ontouchstart" in window || navigator.maxTouchPoints > 0; }catch(e){}
    control = tactil ? "tactil" : "teclado";
    return control;
  }
  function datosDeInicio(){
    let mapa = "", especie = "";
    try{ mapa = slug(typeof currentArena !== "undefined" ? currentArena : ""); }catch(e){}
    try{ especie = slug((typeof player !== "undefined" && player && player.classKey) || (typeof selectedClass !== "undefined" ? selectedClass : "")); }catch(e){}
    return { modo: modoDePartida(), mapa: mapa || undefined, especie: especie || undefined, control: controlInicial(), bots: botsDelEquipo() };
  }
  function empezar(){
    const d = datosDeInicio();
    if(!MODO_VALIDO.test(d.modo)) return;
    partida = { modo: d.modo };
    motivoFin = null;
    llamar("inicio", d);
    presenciaRevisar();
  }
  function terminar(resultado){
    if(!partida) return;
    partida = null;
    llamar("fin", motivoFin || resultado);
    motivoFin = null;
    presenciaRevisar();
  }

  /** Lo llama setState (js/ui/screens.js) en cada cambio de pantalla. */
  function onState(nuevo, anterior){
    if(!enFondal) return;
    try{
      if(nuevo === "playing"){
        if(!partida) empezar();
        llamar("pausa", false);
      }else if(nuevo === "paused"){
        llamar("pausa", true);
      }else if(partida){
        // Fin según las reglas (victoria, derrota, resultados de la Horda Infinita)…
        if(nuevo === "victory" || nuevo === "gameover" || nuevo === "endless") terminar("completada");
        // …o el jugador se fue antes del final (abandonar, volver al menú o a la Sala).
        else if(EN_PARTIDA.indexOf(nuevo) < 0) terminar("salida");
      }
      if(EN_PARTIDA.indexOf(nuevo) < 0 || !partida) presenciaRevisar();
    }catch(e){ /* nunca rompe el juego */ }
  }

  // ---------------- enganches con el juego (cuando ya cargó todo) ----------------
  // Envuelve una función global para saber POR QUÉ termina la partida, sin cambiar lo que hace.
  function antesDe(nombre, aviso){
    try{
      const base = window[nombre];
      if(typeof base !== "function") return;
      window[nombre] = function(){ try{ aviso.apply(this, arguments); }catch(e){} return base.apply(this, arguments); };
    }catch(e){}
  }
  function enganchar(){
    // Invitado: se cortó la conexión o el anfitrión se fue (el anfitrión sigue jugando con bots).
    antesDe("netOnMatchClosed", () => { try{ if(partida && typeof netIsHost === "function" && !netIsHost()) motivoFin = "desconexion"; }catch(e){} });
    // Horda Infinita: "Terminar" desde la pausa también va a resultados; eso es una salida.
    antesDe("endlessEndRun", (motivo) => { if(partida && motivo === "quit") motivoFin = "salida"; });

    // Señales de control y qué control se usa. Escuchas pasivas: no frenan ni cambian la entrada.
    const jugando = () => partida && typeof state !== "undefined" && state === "playing";
    const usar = (c) => { if(c !== control){ control = c; llamar("control", c); } };
    const opciones = { capture: true, passive: true };
    window.addEventListener("keydown", () => { if(jugando()){ usar("teclado"); llamar("senal"); } }, opciones);
    window.addEventListener("pointerdown", (ev) => { if(jugando()){ if(ev.pointerType === "touch") usar("tactil"); llamar("senal"); } }, opciones);
    window.addEventListener("touchstart", () => { if(jugando()){ usar("tactil"); llamar("senal"); } }, opciones);
    window.addEventListener("touchmove", () => { if(jugando()) llamar("senal"); }, opciones);
    // El dedo quieto sobre el joystick no genera eventos: mientras esté apoyado, sigue habiendo señal.
    setInterval(() => { try{ if(jugando() && typeof joyActive !== "undefined" && joyActive) llamar("senal"); }catch(e){} }, 2000);

    // "Listo": terminó la primera carga y ya se puede tocar para jugar.
    const mirarListo = setInterval(() => {
      try{
        if(menuListo){ clearInterval(mirarListo); return; }
        const cargado = typeof ASSET_LOAD === "undefined" || ASSET_LOAD.core.done >= ASSET_LOAD.core.total;
        if(cargado){ menuListo = true; clearInterval(mirarListo); llamar("listo"); }
      }catch(e){ clearInterval(mirarListo); }
    }, 250);
  }

  // ---------------- 2. JUGANDO AHORA (/api/presencia) ----------------
  // Id al azar, inventado al abrir y SOLO en memoria (nunca en localStorage).
  const presenciaId = (() => {
    try{ const b = new Uint8Array(16); crypto.getRandomValues(b); return Array.from(b, n => n.toString(16).padStart(2, "0")).join(""); }
    catch(e){ return (Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)).slice(0, 32); }
  })();
  let presenciaAvisado = null, presenciaUltimo = 0, presenciaFuera = false;
  function modoDePresencia(){
    try{
      if(partida && typeof state !== "undefined" && EN_PARTIDA.indexOf(state) >= 0 && MODO_VALIDO.test(partida.modo)) return partida.modo;
    }catch(e){}
    return MODOS.menu;
  }
  function presenciaEnviar(datos){
    try{
      const p = fetch("/api/presencia", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos), cache: "no-store", keepalive: true });
      if(p && typeof p.catch === "function") p.catch(() => {}); // sin internet, 404, 429: nada
    }catch(e){ /* nada */ }
  }
  /** Avisa si cambió el modo o si pasaron 30 s (se llama una vez por segundo y en cada cambio de pantalla). */
  function presenciaRevisar(){
    try{
      if(presenciaFuera || !permitido() || document.visibilityState !== "visible") return;
      const modo = modoDePresencia(), t = Date.now();
      if(modo === presenciaAvisado && t - presenciaUltimo < PRESENCIA_CADA_MS) return;
      presenciaAvisado = modo; presenciaUltimo = t;
      presenciaEnviar({ id: presenciaId, juego: JUEGO, modo });
    }catch(e){ /* nada */ }
  }
  function presenciaSalir(){
    try{
      if(presenciaFuera || presenciaAvisado === null) return;
      presenciaFuera = true;
      const cuerpo = JSON.stringify({ id: presenciaId, salir: true });
      if(navigator.sendBeacon && navigator.sendBeacon("/api/presencia", new Blob([cuerpo], { type: "application/json" }))) return;
      presenciaEnviar({ id: presenciaId, salir: true });
    }catch(e){ /* nada */ }
  }

  // ---------------- arranque ----------------
  try{
    if(enFondal){
      cargarMedidor();
      llamar("abierto", { juego: JUEGO, version: VERSION });
      setInterval(() => presenciaRevisar(), 1000);
      document.addEventListener("visibilitychange", () => { if(document.visibilityState === "visible") presenciaRevisar(); });
      window.addEventListener("pagehide", (ev) => { if(!(ev && ev.persisted)) presenciaSalir(); });
      // Volvió con "atrás" (la página se recuperó del historial): otra vez presente.
      window.addEventListener("pageshow", (ev) => { if(ev && ev.persisted){ presenciaFuera = false; presenciaAvisado = null; presenciaRevisar(); } });
      if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", enganchar, { once: true });
      else enganchar();
      presenciaRevisar();
    }
  }catch(e){ /* nunca rompe el juego */ }

  return { onState, MODOS, MODO_VALIDO, activo: enFondal,
    // Para el juego (opcional) y para las pruebas:
    error(mensaje){ llamar("error", String(mensaje == null ? "error" : mensaje).slice(0, 160)); },
    estado(){ return { enFondal, permitido: permitido(), partida: partida ? partida.modo : null, control, presenciaModo: presenciaAvisado, presenciaId, menuListo }; } };
})();
/** Lo llama setState (js/ui/screens.js). Fuera de fondalstudios.com no hace nada. */
function fondalOnState(nuevo, anterior){ FondalTelemetry.onState(nuevo, anterior); }
