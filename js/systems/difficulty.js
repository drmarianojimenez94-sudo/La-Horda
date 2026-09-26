"use strict";
/* ============================================================
   js/systems/difficulty.js
   Dificultad de la partida. Antes los enemigos solo sumaban hasta +120% de vida según el nivel
   de los campeones, mientras el daño de un campeón crece ~5x (nivel 30) y hasta ~14x con
   maestrías: con campeones subidos el juego se volvía trivial (y con nivel bajo, imposible).
   Ahora la horda sigue el PODER REAL del equipo (daño y vida de los 4 héroes que entran, con
   sus maestrías), sin alcanzarlo del todo: subir de nivel sigue sintiéndose, pero la arena
   sigue siendo un desafío. Se calcula una sola vez al empezar la partida.
   >>> Perillas generales de balance: DIFF.
   ============================================================ */
const DIFF = {
  hpFollow: 0.4,    // cuánto del poder ofensivo del equipo se traslada a la vida enemiga (menos = el nivel del campeón pesa más;
                    // era 0.66: con 0.4, en campañas de prueba el nivel 30 gana ~52% vs ~40% y el nivel 10 no cambia)
  dmgFollow: 0.45,  // cuánto de la vida del equipo se traslada al daño enemigo
  // Dificultad general: sube con el nivel promedio de los campeones (de x1.0 en nivel 1 hasta
  // el valor indicado desde el nivel 10). Con campeones nuevos no se castiga de más.
  enemyDmg: 1.22,   // +22% de daño enemigo
  enemyHp: 1.12,    // +12% de vida enemiga
  spawn: 0.86,      // intervalo entre apariciones (menor = más enemigos)
  // Tope por golpe de enemigos comunes y de élite (% de la vida máx. del héroe, antes de
  // defensa): la horda mata por cantidad y por no moverse, nunca de 2-3 golpes sueltos.
  hitCap: {normal:0.12, subelite:0.2},
  bossHp: 2.3,      // jefes: mucho más duraderos (pelean contra 4 héroes)
  subbossHp: 1.6,   // subjefes
  // Ajuste por jefe para que las peleas duren parecido: el Leviatán tiene 3 vidas y el Jinete 2
  // (cada vida vuelve a llenar la barra); el Mago se transforma en el Ángel.
  bossHpType: {leviatan:0.45, jinete_sin_cabeza:0.8, guardian_ancestral:0.9, mago_hielo_cristal:1.0, angel_caido_hielo:1.2, minotauro:1.3, demonio_mayor:1.5, caballero:0.95, madre_espora:0.9},
  // El daño de jefes y subjefes se ancla a la vida de referencia del equipo (mitad la del jugador,
  // mitad el promedio de los 4: el que pierde la partida es el jugador, y un tanque no debería
  // volver letales los golpes para una maga). Un ataque x1.0 del jefe quita este % de esa vida:
  // siempre PESA, pero nunca borra de un golpe. Sube con la dificultad de la arena.
  bossDmgPct: {bosque:0.09, acuatica:0.10, fortaleza:0.102, micelial:0.104, hielo:0.105, laberinto:0.11, infernal:0.12},
  subbossDmgPct: 0.065,
  bossBasicMult: 0.5, // sus ataques comunes (proyectil/golpe) pegan la mitad que sus habilidades
  // REJUGAR / FARMEAR (BUGFIX 01): escalado dinámico PARCIAL. Si el grupo entra muy por encima del
  // nivel esperado de la arena (campaña calibrada a ~nivel 40 al final), la horda sigue un poco más
  // su poder: +0,6% de seguimiento por nivel de diferencia, con tope. Nunca 1:1: subir de nivel
  // sigue haciendo más fácil la arena (se limpia más rápido), pero no la vuelve trivial.
  arenaLevel: {bosque:1, acuatica:6, fortaleza:12, micelial:17, hielo:23, laberinto:28, infernal:34},
  replayFollowPerLvl: 0.006, replayFollowMax: 0.15
};
let runDifficulty = {hp:1, dmg:1, spawnRate:1, xp:1, off:1, def:1};
function computePartyPower(){
  let off = 0, def = 0, n = 0;
  for(const h of heroes){
    const cls = CLASSES[h.classKey]; if(!cls) continue;
    const dmgRatio = h.baseDmg / cls.baseDmg / (h.isBot ? 0.72 : 1);
    const hpRatio = h.maxHp / cls.baseHP / (h.isBot ? 1.15 : 1);
    let ap = 0; for(const k of [0,1,2,"ult"]) ap += allocPowerMult(effectiveMasteryFor(h.classKey, k)); ap /= 4;
    off += dmgRatio * (1 + 0.45*(ap-1));
    def += hpRatio;
    n++;
  }
  return n ? {off:off/n, def:def/n} : {off:1, def:1};
}
function setupRunDifficulty(){
  const p = computePartyPower();
  const avgLevel = heroes.length ? heroes.reduce((s,h)=> s + ((save.champions[h.classKey]||{}).level||1), 0) / heroes.length : 1;
  const over = Math.max(0, avgLevel-1), ramp = Math.min(1, over/9);
  // medida de GRUPO: p (poder) y avgLevel ya promedian a TODOS los héroes de la partida (humanos
  // remotos incluidos; los bots cuentan con su descuento), así el multijugador escala por el equipo
  const gap = Math.max(0, avgLevel - ((typeof currentArena!=="undefined" && DIFF.arenaLevel[currentArena]) || 1));
  const rf = Math.min(DIFF.replayFollowMax, gap*DIFF.replayFollowPerLvl);
  runDifficulty = {
    hp: (1 + (DIFF.enemyHp-1)*ramp) * (1 + Math.max(0, p.off-1)*(DIFF.hpFollow + rf)),
    dmg: (1 + (DIFF.enemyDmg-1)*ramp) * (1 + Math.max(0, p.def-1)*(DIFF.dmgFollow + rf*0.75)),
    replayGap: gap, replayFollow: rf,
    spawnRate: DIFF.spawn * (1 - Math.min(0.3, over*0.008)),
    xp: 1 + Math.min(1.5, over*0.022),
    off: p.off, def: p.def,
    avgHp: heroes.length ? (player.maxHp + heroes.reduce((s,h)=>s+h.maxHp,0)/heroes.length)/2 : 150
  };
}
// Compatibilidad: el resto del juego (aparición de enemigos, Arena Divina) lo consulta por acá.
function partyLevelScale(){ return runDifficulty; }
