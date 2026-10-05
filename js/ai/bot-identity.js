"use strict";
/* ============================================================
   js/ai/bot-identity.js — NOMBRES DE LOS COMPAÑEROS CONTROLADOS POR EL JUEGO
   Los compañeros que completa el juego se muestran como cualquier otro jugador: un nombre propio (HUD, avisos, etiqueta
   sobre el personaje), sin carteles de "BOT" durante la partida. El nombre es estable por guardián durante la sesión
   (si el Mago-compañero se llamaba "Nico_44", sigue siendo "Nico_44" en la próxima partida) y nunca repite el de un humano
   de la sala. Sin historias personales ni mensajes que afirmen ser una persona.
   La transparencia es general, no por personaje: la Sala dice que los lugares libres los completa el juego, Opciones lo
   explica y el resultado de la partida avisa cuando hubo compañeros del juego (botDisclosureText).
   ============================================================ */
const BOT_NAME_POOL = [
  "Nico_44","Lucía","xDarkWolf","Kaito","Sofi.R","Mateo","Aylin","Nadia","Tomás","JunHo","Priya","Amara","Bruno","Camila",
  "Rafa_93","Yuki","Leandro","Inés","Dante","Maite","Santi","Valu","ElTano","Ivo","Pilar","Joaquín","Mei","Thiago","Ana.B",
  "Gonza","Ximena","Orión","Facu_R","Lola","Matías","Noor","Cata","Zoe","Agus","Emi","Luz","Dani_S","Rocío","Fede","Abril",
  "Hugo","Jazmín","Lauti","Mora","Bauti","Kira","Selene","Dylan","Mía","Nacho","Ramiro","Tania","Ulises","Vera","Wanda",
  "Tobi","Juli","Marcos","Paz","Renzo","Sasha","Teo","Ailén","Beto","Carla","Diego_G","Elena","Flor","Gael","Hana","Ian",
  "Jime","Kevin","Lara","Milo","Nora","Olivia","Pablo","Quim","Rita","Sol","Tato","Uma","Vico","Wilo","Yael","Zaira",
  "Arturo","Belén","Cris","Delfi","Enzo","Fran","Gime","Hernán","Isa","Jonás","Lucho","Male","Nahue","Oli","Pipo",
  "Ro","Silvi","Tincho","Vale_M","Alma","Boris","Caro","Dario","Eva","Fabi","Gabi","Hilda","Iker","Jade","Karim","Lía",
  "Manu","Nuria","Omar","Pau","Rosa","Saúl","Tessa","Ursula","Vlad","Yara","Zack","Ludmi","Mailén","Nicky","Ori","Puma_7",
  "Lobo","Sombra_X","Halcón","Brasa_22","Rayo","Tormenta","Nube","Fénix_9","Ceniza","Duna"
];
const _botNameByClass = {};        // sesión: guardián → nombre
let _botNameQueue = null;
function _botShuffled(){ const a = BOT_NAME_POOL.slice(); for(let i = a.length - 1; i > 0; i--){ const j = (Math.random()*(i+1))|0; [a[i], a[j]] = [a[j], a[i]]; } return a; }
// Nombre del compañero que juega con `classKey`. `avoid`: nombres que no puede usar (humanos de la sala, otros compañeros).
function botNameFor(classKey, avoid){
  const bad = new Set((avoid || []).filter(Boolean).map(n=>String(n).toLowerCase()));
  for(const k of Object.keys(_botNameByClass)) if(k !== classKey) bad.add(_botNameByClass[k].toLowerCase());
  const keep = _botNameByClass[classKey];
  if(keep && !bad.has(keep.toLowerCase())) return keep;
  for(let guard = 0; guard < 400; guard++){
    if(!_botNameQueue || !_botNameQueue.length) _botNameQueue = _botShuffled();
    const n = _botNameQueue.pop();
    if(!bad.has(n.toLowerCase())){ _botNameByClass[classKey] = n; return n; }
  }
  return (_botNameByClass[classKey] = "Jugador" + ((Math.random()*900 + 100)|0));
}
// Aviso general (no por personaje) para el resultado de la partida: solo si hubo compañeros controlados por el juego.
function botDisclosureText(){
  const any = typeof heroes !== "undefined" && heroes && heroes.some(h=>h && h.isBot && !h.isDivineFoe && h!==player);
  return any ? "Esta partida incluyó compañeros controlados por el juego." : "";
}
