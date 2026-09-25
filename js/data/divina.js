"use strict";
/* ============================================================
   js/data/divina.js
   DATOS de la Arena Divina: disposición y vida de torres/castillos, daño de torres,
   ritmo y tamaño de las oleadas de minions y jefes divinos.
   ============================================================ */

// ============================================================
// ARENA DIVINA — Fase 2: las torres y el castillo ya tienen vida real y la regla de asedio:
// mientras el equipo tenga al menos UNA de sus dos torres en pie, su castillo es invulnerable.
// Todavía sin enemigos que ataquen (eso es la Fase 3); por ahora el propio básico del jugador
// puede golpear cualquier estructura, para poder probar la regla de verdad.
// ============================================================
const DIVINA_LAYOUT = [
  {type:"castle",   side:"enemy",  x:0,    y:-700, hp:2600},
  {type:"tower",    side:"enemy",  x:-260, y:-560, hp:600},
  {type:"tower",    side:"enemy",  x:260,  y:-560, hp:600},
  // Estructuras intermedias: una torre de avanzada por bando, a mitad de camino entre la
  // base y el centro del mapa. No protegen al castillo (solo lo hacen las 2 torres de base,
  // ver castleProtected) — son un objetivo/obstáculo extra en el camino de las oleadas.
  {type:"midtower", side:"enemy",  x:0,    y:-260, hp:900},
  {type:"midtower", side:"player", x:0,    y:260,  hp:900},
  {type:"castle",   side:"player", x:0,    y:700,  hp:2600},
  {type:"tower",    side:"player", x:-260, y:560,  hp:600},
  {type:"tower",    side:"player", x:260,  y:560,  hp:600}
];

// ---- Torres y castillo: atacan solas a cualquier campeón/minion enemigo a su alcance (nunca
// disparan contra otra estructura). Contra CAMPEONES el daño es porcentual y escalado por
// impacto consecutivo (pedido explícito): 1º 10% de su vida máxima, 2º 25%, 3º 30%, 4º ejecuta
// -así ninguna estructura queda invalidada por cuánto haya escalado el daño del jugador con el
// tiempo, algo que con daño plano fijo (versión anterior) hacía que las torres murieran casi
// instantáneamente contra un equipo ya progresado-. Contra minions de oleada el daño sigue
// siendo plano (no tendría sentido un % de su vida, son descartables).
const DIVINA_TOWER_HIT_PCTS = [0.10, 0.25, 0.30, 1.0]; // el último valor (100%) es la ejecución
const DIVINA_TOWER_HIT_RESET_MS = 9000; // sin recibir un nuevo impacto en este lapso, el contador se reinicia
const DIVINA_WAVE_INTERVAL = 13000; // pedido explícito: oleadas más rápidas (antes 20000ms)
const DIVINA_WAVE_SIZE = 4;

// ---- Nivel 6 de la Arena Divina: en vez de otro equipo de 4 campeones, el rival son los 4
// jefes finales de las arenas normales (uno por bioma), reutilizando sus stats de ENEMY_BASE
// pero envueltos como "campeón divino" -puede recibir daño con damageHero, atacar estructuras,
// retirarse, etc., igual que cualquier otro divinaEnemies- (ver spawnDivinaEnemyTeam).
const DIVINA_BOSS_LEVEL = 6;
const DIVINA_BOSS_TYPES = ["demonio_mayor","angel_caido_hielo","jinete_sin_cabeza","minotauro"];
