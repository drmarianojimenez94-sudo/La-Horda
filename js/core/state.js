"use strict";
/* ============================================================
   js/core/state.js
   Estado global de la partida en curso (jugador, enemigos, proyectiles, nivel,
   temporizadores, arena elegida...). Lo leen y escriben casi todos los sistemas.
   ============================================================ */

let currentArena = "bosque"; // arranca en la primera arena por defecto

/* ============================================================
   GAME STATE
   ============================================================ */
let state = "menu"; // title | modeselect | menu | prep | playing | buff | paused | gameover | victory
let selectedClass = "guerrero";
let player, enemies, projectiles, particles, embers;
let allies, heroes, potions, fireWalls, traps;
let axiomZones; // zonas con demora/agrupamiento de Axiom (Error 404 y Bug de Colisión) — mismo patrón que traps/fireWalls, propio para no tocar el de otros campeones
let sylvaRainZones; // Lluvia de la Cazadora: zona con demora que converge en la Presa al estallar, mismo patrón que axiomZones pero propio de Sylva
let chainFX, sparkFX; // efectos con sprites reales: segmentos de rayo (CadenaRelampagos) y ráfagas puntuales
let asesinoFx; // efectos con sprites reales de las 4 habilidades del Asesino
let runLevel, runWave, levelTimer, levelDuration, spawnTimer, kills, bossActive, boss, subjefesDefeated, arenaHazardTimer;
let screenShake = 0; // se usa en el sismo del Laberinto Maldito (ver updateArenaHazards/render)
let divinaMode = false; // true mientras se explora la Arena Divina (Fase 1: sin oleadas ni combate)
let axiomForceQuitFlash = 0; // ms restantes del breve efecto de inversión de color (Force Quit)
let axiomFreezeTimer = 0; let axiomFreezeCaster = null; // Force Quit: nadie salvo el que la lanzó actúa mientras dura
let axiomForceQuitPending = null; // {dmg,radius,eliteMult}: el golpe real se aplica recién cuando termina el congelamiento
let runElapsedMs = 0; // cronómetro de la partida actual, para saber cuánto dura
let runStats; // temp multipliers from buffs this run
let facing = {x:0,y:-1};
let lastTime = 0;
