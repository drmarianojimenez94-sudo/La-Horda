"use strict";
/* ============================================================
   js/data/enemies.js
   DATOS de enemigos: estadísticas base de cada tipo (vida, daño, velocidad, rango,
   XP, oro, rango de élite/jefe) y color de sus proyectiles.
   >>> Acá se ajusta el balance de enemigos, élites y jefes.
   ============================================================ */

// Bestiario de la Arena Infernal, ordenado de menor a mayor dificultad
// Color visual del proyectil enemigo según la criatura (solo cosmético: daño/velocidad no cambian).
const ENEMY_PROJ_COLOR = {cristal_volador:"#bfe8ff", dragoncito_hielo:"#8fd0ff", angel_hielo:"#bfe8ff", mago_hielo_cristal:"#bfe8ff", angel_caido_hielo:"#bfe8ff", dragon_hielo:"#8fd0ff",
  enjambre_hadas:"#e0a0ff", dama_bosque:"#8fd46a", doblador_arquera:"#c9d8ff", doblador_clerigo:"#fff0a0",
  medusa:"#8fe0a0", druida_arena:"#e0c070", esfinge:"#ffd76a", sirena_abisal:"#7fd0e0", jinete_sin_cabeza:"#b0a0ff", guardian_ancestral:"#8ee07a"};
const ENEMY_BASE = {
  esqueleto:     {name:"Esqueleto",        rank:"normal",   hp:26,  dmg:7,  speed:84, radius:22, xp:3,  gold:1,  scale:3.2, color:"#ece4cc", ranged:false},
  zombie:        {name:"Zombi",            rank:"normal",   hp:52,  dmg:9,  speed:58, radius:24, xp:6,  gold:2,  scale:3.4, color:"#6d7d55", ranged:false},
  esqueleto_h:   {name:"Esqueleto Cornudo",rank:"subelite", hp:88,  dmg:12, speed:76, radius:28, xp:11, gold:4,  scale:3.8, color:"#ded4b4", ranged:false},
  demonio_menor: {name:"Demonio Menor",    rank:"subelite", hp:110, dmg:15, speed:98, radius:28, xp:16, gold:6,  scale:3.8, color:"#d94a1e", ranged:false},
  golem:         {name:"Gólem",            rank:"elite",    hp:320, dmg:22, speed:46, radius:38, xp:34, gold:14, scale:5.0, color:"#6b6f52", ranged:false, dropsItem:true},
  demonio_mago:  {name:"Demonio Hechicero",rank:"elite",    hp:140, dmg:16, speed:58, radius:28, xp:30, gold:12, scale:4.0, color:"#8a63ad", ranged:true, range:300, projSpeed:250, dropsItem:true},
  demonio_mayor: {name:"Demonio Mayor",    rank:"jefe",     hp:3200,dmg:30, speed:54, radius:70, xp:320,gold:150, scale:9.0, color:"#b02a20", ranged:true, range:320, projSpeed:260, dropsItem:true},

  // --- Arena de Hielo: roster nuevo (según la clasificación de 10 niveles que mandaste).
  // "visualAlias" apunta al sprite procedural de un enemigo ya existente, como marcador
  // visual TEMPORAL, hasta que integre el arte real de las hojas que mandaste — la lógica
  // de combate/rango/rol ya queda definitiva. El jefe final es en 2 fases (ver
  // startBossFight/onBossDefeated): Mago de Hielo y Cristal -> Ángel Caído de Hielo.
  lobo_artico:        {name:"Lobo Ártico",              rank:"normal",   hp:16,  dmg:5,  speed:112, radius:18, xp:3,  gold:1,  scale:2.8, color:"#cfe4ee", ranged:false, visualAlias:"esqueleto"},
  golem_hielo:        {name:"Gólem de Hielo",           rank:"normal",   hp:62,  dmg:9,  speed:44,  radius:24, xp:6,  gold:2,  scale:3.4, color:"#8fc4e0", ranged:false, visualAlias:"zombie", slowOnHit:0.25},
  dragoncito_hielo:   {name:"Dragoncito de Hielo",      rank:"subelite", hp:48,  dmg:8,  speed:104, radius:20, xp:9,  gold:3,  scale:3.2, color:"#a8dcff", ranged:true, range:260, projSpeed:240, visualAlias:"esqueleto_h"},
  angel_hielo:        {name:"Ángel de Hielo y Cristal", rank:"elite",    hp:110, dmg:13, speed:66,  radius:26, xp:16, gold:6,  scale:3.8, color:"#9ec8e8", ranged:true, range:280, projSpeed:230, visualAlias:"demonio_menor", freezeOnHit:true},
  demonio_hielo_fuego:{name:"Demonio de Hielo y Fuego", rank:"elite",    hp:150, dmg:15, speed:96,  radius:28, xp:22, gold:9,  scale:4.0, color:"#4a6ea8", ranged:false, dropsItem:true, visualAlias:"demonio_mago", slowOnHit:0.3, burnOnHit:true},
  dragon_hielo:       {name:"Tundraverx, Soberano de Hielo", rank:"elite", hp:420, dmg:20, speed:50, radius:44, xp:60, gold:24, scale:6.0, color:"#7fc0f0", ranged:true, range:320, projSpeed:260, dropsItem:true, visualAlias:"golem"},
  mago_hielo_cristal: {name:"Mago de Hielo y Cristal",  rank:"jefe",     hp:1500,dmg:20, speed:56,  radius:40, xp:0,  gold:0,  scale:4.2, color:"#c9e6ff", ranged:true, range:320, projSpeed:270, visualAlias:"demonio_mago"},
  // Guardianes de cristal del Mago (los invoca en combate; no salen en las oleadas normales)
  golem_cristal:      {name:"Gólem de Cristal",         rank:"normal",   hp:62,  dmg:9,  speed:44,  radius:24, xp:6,  gold:2,  scale:3.4, color:"#6fa8e8", ranged:false, visualAlias:"zombie", slowOnHit:0.25},
  cristal_servo:      {name:"Servo de Cristal",         rank:"normal",   hp:26,  dmg:6,  speed:92,  radius:16, xp:3,  gold:1,  scale:2.6, color:"#9ec8ff", ranged:false, visualAlias:"esqueleto", slowOnHit:0.15},
  cristal_volador:    {name:"Cristal Volador",          rank:"normal",   hp:20,  dmg:6,  speed:84,  radius:15, xp:3,  gold:1,  scale:2.6, color:"#bfe8ff", ranged:true, range:240, projSpeed:250, visualAlias:"esqueleto_h"},
  angel_caido_hielo:  {name:"Ángel Caído de Hielo",     rank:"jefe",     hp:2600,dmg:26, speed:48,  radius:68, xp:280,gold:130, scale:8.5, color:"#bfe0f5", ranged:true, range:300, projSpeed:250, dropsItem:true, visualAlias:"demonio_mayor"},

  // --- Ruinas del Bosque: roster nuevo. "visualAlias" apunta a un sprite procedural existente
  // como marcador visual TEMPORAL, hasta que integre las hojas reales que mandaste — la
  // lógica de combate/rango/rol ya queda definitiva.
  duende_bosque:   {name:"Duende del Bosque",  rank:"normal",   hp:18,  dmg:5,  speed:88,  radius:18, xp:3,  gold:1, scale:2.8, color:"#7a9a4a", ranged:false, visualAlias:"esqueleto"},
  enjambre_hadas:  {name:"Enjambre de Hadas",  rank:"normal",   hp:14,  dmg:4,  speed:78,  radius:16, xp:4,  gold:1, scale:2.6, color:"#d68ce0", ranged:true, range:230, projSpeed:220, visualAlias:"esqueleto_h"},
  bestia_bosque:   {name:"Bestia del Bosque",  rank:"subelite", hp:46,  dmg:9,  speed:118, radius:22, xp:8,  gold:3, scale:3.2, color:"#8a6a42", ranged:false, visualAlias:"zombie"},
  cu_sith:         {name:"Cù-Sìth",            rank:"subelite", hp:64,  dmg:11, speed:110, radius:25, xp:12, gold:4, scale:3.6, color:"#3e6b3e", ranged:false, visualAlias:"demonio_menor"},
  ent:             {name:"Ent",                rank:"elite",    hp:340, dmg:19, speed:38,  radius:38, xp:32, gold:13,scale:5.2, color:"#5a4a2e", ranged:false, dropsItem:true, visualAlias:"golem"},
  dama_bosque:     {name:"Dama del Bosque",    rank:"elite",    hp:150, dmg:16, speed:60,  radius:27, xp:30, gold:12,scale:4.0, color:"#2e3a2e", ranged:true, range:300, projSpeed:240, dropsItem:true, visualAlias:"demonio_mago"},

  // Subjefes del nivel 9: 4 "dobladores" espectrales aparecen JUNTOS (no de a uno), copiando
  // el rol de un guerrero/arquera/pícaro/clérigo. Ver el spawn especial en update().
  doblador_guerrero:{name:"Doppelgänger — Guerrero", rank:"subjefe", hp:260, dmg:16, speed:80,  radius:26, xp:26, gold:10, scale:3.8, color:"#8a8a8a", ranged:false, visualAlias:"esqueleto_h"},
  doblador_arquera: {name:"Doppelgänger — Arquera",  rank:"subjefe", hp:190, dmg:14, speed:74,  radius:24, xp:26, gold:10, scale:3.8, color:"#9a9a9a", ranged:true, range:300, projSpeed:260, visualAlias:"demonio_menor"},
  doblador_picaro:  {name:"Doppelgänger — Pícaro",   rank:"subjefe", hp:170, dmg:15, speed:128, radius:23, xp:26, gold:10, scale:3.7, color:"#707070", ranged:false, visualAlias:"demonio_mago"},
  doblador_clerigo: {name:"Doppelgänger — Clérigo",  rank:"subjefe", hp:200, dmg:12, speed:70,  radius:24, xp:26, gold:10, scale:3.8, color:"#b0b0b0", ranged:true, range:280, projSpeed:230, visualAlias:"golem"},

  // Jefe final (nivel 10): Jinete Sin Cabeza. "Resurrección Eterna": la primera vez que
  // llega a 0 de vida no muere -renace con la vida al máximo y +30% de daño hecho Y
  // recibido, una fase de furia más letal pero también más frágil- (ver onBossDefeated).
  // Jefe del Bosque (BUGFIX 01): el protector del círculo de runas, consumido por la corrupción que
  // las runas desataron. 3 fases con transformación a mitad de pelea (js/skills/boss-guardian.js).
  // El Jinete Sin Cabeza queda en el juego (Arena Divina y como respaldo) con todo su arte y código.
  guardian_ancestral:{name:"Guardián Ancestral Corrompido", rank:"jefe", hp:3600,dmg:32, speed:54, radius:74, xp:0, gold:0, scale:9.5, color:"#3f6a3a", ranged:true, range:320, projSpeed:300, dropsItem:true, visualAlias:"dama_bosque"},
  jinete_sin_cabeza:{name:"Jinete Sin Cabeza",  rank:"jefe",     hp:3400,dmg:32, speed:58,  radius:74, xp:0,  gold:0,   scale:9.5, color:"#5a5a62", ranged:true, range:330, projSpeed:270, dropsItem:true, visualAlias:"demonio_mayor"},

  // --- Laberinto Maldito: roster propio con arte real integrado vía REAL_ANIM, con la misma
  // progresión de niveles 1/2/3/5/7 que ya usaba spawnPoolForLaberinto cuando era un "rejunte"
  // del resto de arenas. visualAlias queda solo como respaldo para el primer instante antes
  // de que termine de decodificar la imagen real (igual que en Hielo/Bosque).
  escorpion_gigante: {name:"Escorpión Gigante", rank:"normal",   hp:22,  dmg:6,  speed:100, radius:20, xp:4,  gold:1,  scale:2.8, color:"#c99a4a", ranged:false, visualAlias:"esqueleto"},
  golem_piedra:      {name:"Gólem de Piedra",   rank:"normal",   hp:74,  dmg:11, speed:40,  radius:30, xp:7,  gold:3,  scale:3.6, color:"#8a8a82", ranged:false, visualAlias:"golem"},
  medusa:            {name:"Medusa",            rank:"subelite", hp:52,  dmg:10, speed:86,  radius:24, xp:12, gold:4,  scale:3.4, color:"#5a8a5e", ranged:true, range:260, projSpeed:230, visualAlias:"demonio_menor"},
  druida_arena:      {name:"Druida de Arena",   rank:"elite",    hp:120, dmg:14, speed:56,  radius:26, xp:20, gold:8,  scale:3.8, color:"#c2a05a", ranged:true, range:290, projSpeed:240, visualAlias:"demonio_mago"},
  esfinge:           {name:"Esfinge",           rank:"elite",    hp:170, dmg:17, speed:92,  radius:34, xp:34, gold:14, scale:4.4, color:"#b3923f", ranged:true, range:300, projSpeed:260, dropsItem:true, visualAlias:"golem"},
  guardian_laberinto:{name:"Guardián del Laberinto", rank:"subjefe", hp:820,  dmg:22, speed:52, radius:40, xp:70,  gold:28,  scale:5.4, color:"#8a7a5a", ranged:false, dropsItem:true, visualAlias:"golem"},
  minotauro:         {name:"Minotauro",              rank:"jefe",    hp:3800,dmg:34, speed:64, radius:72, xp:360, gold:170, scale:9.0, color:"#7a4a2e", ranged:false, dropsItem:true, visualAlias:"demonio_mayor"},
  // ---- Arena Acuática: roster propio, todo con sprites reales (ver drawAcuaticaReal/drawAcua2).
  // En la Anguila Eléctrica, el Kraken Joven y el Leviatán, visualAlias queda solo como respaldo
  // para el primer instante antes de que terminen de decodificar sus imágenes reales.
  tiburon_joven:     {name:"Tiburón Joven",     rank:"normal",  hp:24,  dmg:7,  speed:132, radius:22, xp:4,  gold:1,  scale:3.0, color:"#4a78a8", ranged:false},
  medusa_electrica:  {name:"Medusa Eléctrica",  rank:"normal",  hp:34,  dmg:6,  speed:50,  radius:22, xp:5,  gold:2,  scale:3.0, color:"#8a6fd8", ranged:false},
  cangrejo_acorazado:{name:"Cangrejo Acorazado",rank:"normal",  hp:74,  dmg:10, speed:42,  radius:26, xp:7,  gold:2,  scale:3.4, color:"#b0402c", ranged:false},
  sirena_abisal:     {name:"Sirena Abisal",     rank:"normal",  hp:30,  dmg:8,  speed:70,  radius:22, xp:6,  gold:2,  scale:3.0, color:"#3a5a8a", ranged:true, range:280, projSpeed:230},
  anguila_electrica: {name:"Anguila Eléctrica", rank:"normal",  hp:26,  dmg:8,  speed:150, radius:20, xp:6,  gold:2,  scale:2.8, color:"#3a7a8a", ranged:false, visualAlias:"esqueleto_h"},
  tiburon_blanco:    {name:"Tiburón Blanco",    rank:"elite",   hp:190, dmg:16, speed:112, radius:34, xp:26, gold:10, scale:4.2, color:"#dfe6ec", ranged:false, dropsItem:true},
  kraken_joven:      {name:"Kraken Joven",      rank:"subjefe", hp:1150,dmg:20, speed:22,  radius:60, xp:80, gold:32,  scale:6.4, color:"#6a3a6e", ranged:false, dropsItem:true, visualAlias:"golem"},
  leviatan:          {name:"Leviatán",          rank:"jefe",    hp:5200,dmg:30, speed:34,  radius:90, xp:400,gold:190, scale:10.0,color:"#2a5a6e", ranged:false, dropsItem:true, visualAlias:"demonio_mayor"}
};
