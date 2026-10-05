"use strict";
/* ============================================================
   js/data/boons.js
   DATOS de los REFUERZOS DE HABILIDAD (bendiciones al estilo Hades, reseña del crítico #4):
   cada guardián tiene refuerzos que TRANSFORMAN una habilidad suya ("la Nova deja escarcha en
   el piso", "el Tajo rebota a 2 enemigos"...), con rareza (común / raro / épico) y DÚOS: tener
   los dos refuerzos relacionados habilita uno más fuerte.
   El motor (js/systems/boons.js) es genérico: cada refuerzo es una lista de efectos (fx) que se
   disparan al lanzar la habilidad. Los valores en arreglo [común, raro, épico] se eligen por
   rareza. "u" = daño base del héroe escalado (su daño, sus refuerzos y la maestría de ESA
   habilidad), el mismo para todas: así un refuerzo vale lo mismo en cualquier guardián.

   Efectos (fx.t):
     ground  zona en el piso: {at, r|rMul, dur, dps(u/s), slow, burn, poison, bleed, heal(%vida/s),
             zap:{every,pct}, look}
     bounce  rebotes desde lo que golpeó la habilidad: {n, pct (del golpe), range, status, look}
     status  estados a lo golpeado (on:"hits") o en un área (on:"area", r|rMul): {poison, bleed,
             burn (u/s), slow, stun (ms), vuln (+daño recibido)}
     burst   estallido inmediato: {at, r, pct(u), status, knock}
     echo    estallido demorado: {at, delay, r|rMul, pct(u), status}
     shards  N esquirlas en redondo desde un punto: {at, n, pct(u)}
     fan     N proyectiles extra en abanico hacia donde apunta: {n, spread, pct(u)}
     line    corte a lo largo del camino recorrido (origen -> destino): {w, pct(u), status}
     pull    atrae a los enemigos hacia un punto: {at, r|rMul, px}
     ally    a los aliados cercanos: {at, r, shield (% vida máx), heal (% vida máx)}
   at: "caster" (donde queda el héroe), "origin" (donde estaba al lanzar), "aim" (punto apuntado),
       "hits" (cada enemigo golpeado, hasta 3), "ahead" (adelante, a mitad del alcance), "golem".
   Regla del juego: nada de fuego amigo, nada de explosión de cadáveres (el "estallido" del
   Nigromante es del PROPIO esqueleto al caer), sin dash universal.
   ============================================================ */
const BOON_RARITIES = [
  {id:"comun", name:"Común", color:"#cfc3a8"},
  {id:"raro",  name:"Raro",  color:"#5fb0ff"},
  {id:"epico", name:"Épico", color:"#c77dff"}
];
// Colores por "look" (efecto en canvas: zona con píxeles, rayos, anillos). [base, brillo]
const BOON_LOOKS = {
  frost:["#7fd4ff","#e8f8ff"], fire:["#ff6a3d","#ffcf5c"], poison:["#3fcf6e","#b6ff6a"],
  holy:["#ffd76a","#fff6d0"], void:["#3ad6c4","#b06cff"], blood:["#b01e1e","#ff5c4a"],
  storm:["#ffe36a","#9fc4ff"], stone:["#9a8262","#d8c8a8"], nature:["#4f8f3e","#c8f0a8"],
  steel:["#9fc8e8","#ffffff"], steam:["#d8d8d8","#ffb08a"]
};
// skill: índice 0/1/2 o "ult" del kit BASE del guardián (el refuerzo se ata al NOMBRE de esa
// habilidad: Eren transformado usa otro kit y no dispara refuerzos de su forma humana).
const BOONS = [
  /* ---------------- TANQUE ---------------- */
  {id:"tq_vortice", champ:"tanque", skill:0, name:"Torbellino Succionador", look:"stone",
    desc:r=>`El Torbellino atrae hacia vos a los enemigos cercanos (${["45","60","75"][r]} px).`,
    fx:[{t:"pull", at:"caster", rMul:1.8, px:[45,60,75]}], test:"pull"},
  {id:"tq_estela", champ:"tanque", skill:1, name:"Estela Sísmica", look:"stone",
    desc:r=>`La Embestida deja una grieta donde aterriza: ralentiza ${[35,45,55][r]}% y daña ${[30,45,60][r]}% de tu daño por segundo.`,
    fx:[{t:"ground", at:"caster", r:80, dur:[3000,4000,5000], dps:[0.3,0.45,0.6], slow:[0.35,0.45,0.55]}], test:"zone"},
  {id:"tq_trueno", champ:"tanque", skill:2, name:"Grito Atronador", look:"storm",
    desc:r=>`El Grito de Guerra suelta una onda que aturde ${[0.5,0.75,1][r]} s a los enemigos cercanos.`,
    fx:[{t:"burst", at:"caster", r:130, pct:[0.6,0.9,1.2], status:{stun:[500,750,1000]}}], test:"stun"},
  {id:"tq_coraza", champ:"tanque", skill:2, name:"Coraza Compartida", look:"steel",
    desc:r=>`El Grito de Guerra da un escudo del ${[8,12,16][r]}% de la vida máxima a los aliados cercanos.`,
    fx:[{t:"ally", at:"caster", r:230, shield:[0.08,0.12,0.16]}], test:"shield"},
  {id:"tq_desafio", champ:"tanque", skill:"ult", name:"Desafío Brutal", look:"blood",
    desc:r=>`Los provocados por el Grito Provocador reciben +${[15,22,30][r]}% de daño de todos.`,
    fx:[{t:"status", on:"area", rMul:1, status:{vuln:[0.15,0.22,0.30], vulnMs:6000}}], test:"vuln"},
  {id:"tq_duo", champ:"tanque", skill:0, name:"Ojo de la Tormenta", duo:["tq_vortice","tq_estela"], look:"stone",
    desc:r=>"El Torbellino abre grietas bajo tus pies: lo que atrae queda frenado y recibe daño.",
    fx:[{t:"ground", at:"caster", rMul:1, dur:3500, dps:0.7, slow:0.5}], test:"zone"},

  /* ---------------- ASESINO ---------------- */
  {id:"as_rebote", champ:"guerrero", skill:0, name:"Filo Rebotante", look:"blood",
    desc:r=>`El Corte Sangrante rebota a ${[1,2,3][r]} enemigo(s) más, con sangrado.`,
    fx:[{t:"bounce", n:[1,2,3], pct:[0.6,0.7,0.8], range:200, status:{bleed:0.4}}], test:"hits"},
  {id:"as_veneno", champ:"guerrero", skill:1, name:"Hoja Envenenada", look:"poison",
    desc:r=>`El Triple Golpe envenena: ${[35,50,70][r]}% de tu daño por segundo durante 4 s.`,
    fx:[{t:"status", on:"hits", status:{poison:[0.35,0.5,0.7]}}], test:"poison"},
  {id:"as_humo", champ:"guerrero", skill:2, name:"Trampa de Humo", look:"poison",
    desc:r=>`La Trampa de Área suelta una nube venenosa (${[4,5,6][r]} s).`,
    fx:[{t:"ground", at:"aim", r:85, dur:[4000,5000,6000], dps:[0.3,0.4,0.55], poison:true}], test:"zone"},
  {id:"as_final", champ:"guerrero", skill:1, name:"Tajo Final", look:"blood",
    desc:r=>`El último golpe del Triple Golpe estalla alrededor del objetivo (${[80,95,110][r]} px).`,
    fx:[{t:"burst", at:"hits", r:[80,95,110], pct:[0.8,1.1,1.4]}], test:"hits"},
  {id:"as_duo", champ:"guerrero", skill:0, name:"Toxina en Cadena", duo:["as_rebote","as_veneno"], look:"poison",
    desc:r=>"El Corte Sangrante salta a 2 enemigos más y los deja envenenados.",
    fx:[{t:"bounce", n:2, pct:0.7, range:220, status:{poison:0.6}}], test:"poison"},

  /* ---------------- MAGO ---------------- */
  {id:"mg_escarcha", champ:"mago", skill:1, name:"Escarcha Persistente", look:"frost",
    desc:r=>`La Nova de Escarcha deja escarcha en el piso ${[3,4,5][r]} s: ralentiza ${[40,50,60][r]}% y hiela.`,
    fx:[{t:"ground", at:"caster", rMul:0.9, dur:[3000,4000,5000], dps:[0.25,0.35,0.5], slow:[0.4,0.5,0.6]}], test:"zone"},
  {id:"mg_bifurcada", champ:"mago", skill:2, name:"Relámpago Bifurcado", look:"storm",
    desc:r=>`La Cadena de Relámpago salta a ${[2,3,4][r]} enemigos más.`,
    fx:[{t:"bounce", n:[2,3,4], pct:[0.55,0.65,0.75], range:220}], test:"hits"},
  {id:"mg_estatica", champ:"mago", skill:2, name:"Descarga Paralizante", look:"storm",
    desc:r=>`La Cadena de Relámpago aturde ${[0.35,0.5,0.7][r]} s a cada alcanzado.`,
    fx:[{t:"status", on:"hits", status:{stun:[350,500,700]}}], test:"stun"},
  {id:"mg_erupcion", champ:"mago", skill:0, name:"Erupción", look:"fire",
    desc:r=>`Al alzarse, el Muro de Fuego estalla y deja ardiendo a los de adentro.`,
    fx:[{t:"burst", at:"aim", r:95, pct:[0.7,1.0,1.3], status:{burn:[0.3,0.45,0.6]}}], test:"burn"},
  {id:"mg_duo", champ:"mago", skill:1, name:"Tormenta Helada", duo:["mg_escarcha","mg_bifurcada"], look:"storm",
    desc:r=>"La escarcha de la Nova descarga rayos sobre los que la pisan.",
    fx:[{t:"ground", at:"caster", rMul:0.9, dur:4000, dps:0.1, slow:0.3, zap:{every:600, pct:0.9}}], test:"zone"},

  /* ---------------- SOPORTE ---------------- */
  {id:"sp_manantial", champ:"soporte", skill:0, name:"Manantial Sagrado", look:"holy",
    desc:r=>`La Alba Purificadora deja un manantial que cura ${[2,3,4][r]}% de la vida por segundo (${[3,4,5][r]} s).`,
    fx:[{t:"ground", at:"caster", r:120, dur:[3000,4000,5000], heal:[0.02,0.03,0.04]}], test:"heal"},
  {id:"sp_juicio", champ:"soporte", skill:0, name:"Luz Punitiva", look:"holy",
    desc:r=>`La Alba Purificadora también quema a los enemigos cercanos.`,
    fx:[{t:"burst", at:"caster", r:150, pct:[0.6,0.9,1.2], status:{burn:[0.25,0.35,0.5]}}], test:"burn"},
  {id:"sp_marca", champ:"soporte", skill:1, name:"Estandarte de Caza", look:"fire",
    desc:r=>`La Bendición de Guerra marca a los enemigos cercanos: reciben +${[12,18,25][r]}% de daño y van más lento.`,
    fx:[{t:"status", on:"area", rMul:0.7, status:{vuln:[0.12,0.18,0.25], vulnMs:5500, slow:0.3}}], test:"vuln"},
  {id:"sp_egida", champ:"soporte", skill:2, name:"Égida Cegadora", look:"holy",
    desc:r=>`El Escudo Sagrado estalla en luz: aturde ${[0.4,0.6,0.8][r]} s a los enemigos cercanos.`,
    fx:[{t:"burst", at:"caster", r:120, pct:[0.4,0.6,0.8], status:{stun:[400,600,800]}}], test:"stun"},
  {id:"sp_duo", champ:"soporte", skill:0, name:"Tierra Consagrada", duo:["sp_manantial","sp_juicio"], look:"holy",
    desc:r=>"El manantial también quema a los enemigos que lo pisan.",
    fx:[{t:"ground", at:"caster", r:130, dur:4000, heal:0.02, dps:0.45, burn:true}], test:"zone"},

  /* ---------------- SEGADOR ---------------- */
  {id:"sg_rebote", champ:"segador", skill:0, name:"Tajo Rebotante", look:"blood",
    desc:r=>`El Tajo del Segador rebota a ${[2,2,3][r]} enemigos más (${[50,65,80][r]}% del golpe).`,
    fx:[{t:"bounce", n:[2,2,3], pct:[0.5,0.65,0.8], range:210}], test:"hits"},
  {id:"sg_sangria", champ:"segador", skill:0, name:"Tajo Sangriento", look:"blood",
    desc:r=>`El Tajo del Segador deja sangrando: ${[30,45,60][r]}% de tu daño por segundo.`,
    fx:[{t:"status", on:"hits", status:{bleed:[0.3,0.45,0.6]}}], test:"bleed"},
  {id:"sg_espinas", champ:"segador", skill:1, name:"Armadura de Espinas", look:"blood",
    desc:r=>`Al activar la Armadura de la Furia, una onda de sangre daña y ralentiza alrededor.`,
    fx:[{t:"burst", at:"caster", r:[110,125,140], pct:[0.6,0.85,1.1], status:{slow:0.4}}], test:"dmg"},
  {id:"sg_charco", champ:"segador", skill:2, name:"Charco Carmesí", look:"blood",
    desc:r=>`El Último Aliento deja un charco de sangre que daña a los enemigos y te cura ${[1.5,2,3][r]}% por segundo.`,
    fx:[{t:"ground", at:"caster", r:110, dur:[3000,4000,5000], dps:[0.3,0.45,0.6], heal:[0.015,0.02,0.03]}], test:"zone"},
  {id:"sg_duo", champ:"segador", skill:0, name:"Hemorragia en Cadena", duo:["sg_rebote","sg_sangria"], look:"blood",
    desc:r=>"Cada rebote del Tajo desangra y salta una vez más.",
    fx:[{t:"bounce", n:2, pct:0.6, range:230, status:{bleed:0.5}}], test:"bleed"},

  /* ---------------- AXIOM ---------------- */
  {id:"ax_residuo", champ:"axiom", skill:0, name:"Residuo Corrupto", look:"void",
    desc:r=>`Error 404 deja el piso corrupto ${[3.5,4.5,5.5][r]} s: ralentiza ${[30,40,50][r]}% y daña.`,
    fx:[{t:"ground", at:"aim", rMul:0.85, dur:[3500,4500,5500], dps:[0.25,0.35,0.5], slow:[0.3,0.4,0.5]}], test:"zone"},
  {id:"ax_exploit", champ:"axiom", skill:1, name:"Exploit", look:"void",
    desc:r=>`Los infectados por Sobrescribir quedan expuestos: +${[15,20,28][r]}% de daño recibido.`,
    fx:[{t:"status", on:"hits", status:{vuln:[0.15,0.20,0.28], vulnMs:4000}}], test:"vuln"},
  {id:"ax_rastro", champ:"axiom", skill:2, name:"Rastro de Datos", look:"void",
    desc:r=>`El Teletransporte deja un paquete en el punto de salida que explota al instante siguiente.`,
    fx:[{t:"echo", at:"origin", delay:400, r:[80,95,110], pct:[0.8,1.1,1.4]}], test:"dmg"},
  {id:"ax_llegada", champ:"axiom", skill:2, name:"Aterrizaje Forzado", look:"storm",
    desc:r=>`Al llegar, el Teletransporte suelta un pulso que ralentiza ${[40,50,60][r]}%.`,
    fx:[{t:"burst", at:"caster", r:[90,105,120], pct:[0.5,0.7,0.9], status:{slow:[0.4,0.5,0.6]}}], test:"slow"},
  {id:"ax_duo", champ:"axiom", skill:2, name:"Colapso de Memoria", duo:["ax_residuo","ax_rastro"], look:"void",
    desc:r=>"El punto de salida del Teletransporte queda corrupto: zona que frena y daña.",
    fx:[{t:"ground", at:"origin", r:100, dur:4000, dps:0.45, slow:0.45}], test:"zone"},

  /* ---------------- LA PROFETA ---------------- */
  {id:"pf_halo", champ:"profeta", skill:0, name:"Halo del Destino", look:"holy",
    desc:r=>`Destino Restaurado también da un escudo del ${[8,12,16][r]}% de la vida máxima a los aliados cercanos.`,
    fx:[{t:"ally", at:"caster", r:230, shield:[0.08,0.12,0.16]}], test:"shield"},
  {id:"pf_revelacion", champ:"profeta", skill:1, name:"Revelación", look:"holy",
    desc:r=>`La Visión del Inmortal aturde ${[0.5,0.7,0.9][r]} s a los enemigos que te rodean.`,
    fx:[{t:"burst", at:"caster", r:[120,140,160], pct:[0.4,0.55,0.7], status:{stun:[500,700,900]}}], test:"stun"},
  {id:"pf_presagio", champ:"profeta", skill:2, name:"Augurio Cortante", look:"holy",
    desc:r=>`La Danza del Augurio lanza ${[4,6,8][r]} cuchillas de luz alrededor.`,
    fx:[{t:"shards", at:"caster", n:[4,6,8], pct:[0.5,0.6,0.7]}], test:"dmg"},
  {id:"pf_eco", champ:"profeta", skill:2, name:"Eco del Augurio", look:"void",
    desc:r=>`La Danza del Augurio se repite sola 0,6 s después.`,
    fx:[{t:"echo", at:"caster", delay:600, rMul:1, pct:[0.5,0.7,0.9]}], test:"dmg"},
  {id:"pf_duo", champ:"profeta", skill:2, name:"Constelación", duo:["pf_presagio","pf_eco"], look:"holy",
    desc:r=>"La Danza deja un círculo de estrellas que fulmina a quien lo pise.",
    fx:[{t:"ground", at:"caster", rMul:1, dur:3500, dps:0.1, zap:{every:500, pct:0.8}}], test:"zone"},

  /* ---------------- MUSASHI ---------------- */
  {id:"ms_viento", champ:"musashi", skill:0, name:"Corte de Viento", look:"steel",
    desc:r=>`El Corte del Rōnin sigue de largo y alcanza a ${[1,2,3][r]} rival(es) cercano(s).`,
    fx:[{t:"bounce", n:[1,2,3], pct:[0.6,0.7,0.8], range:200}], test:"hits"},
  {id:"ms_filo", champ:"musashi", skill:1, name:"Filo Fantasma", look:"steel",
    desc:r=>`El Paso Fantasma corta a todo lo que atraviesa en su camino.`,
    fx:[{t:"line", w:44, pct:[0.8,1.1,1.4]}], test:"hits"},
  {id:"ms_sangre", champ:"musashi", skill:2, name:"Mil Heridas", look:"blood",
    desc:r=>`Mil Cortes deja sangrando: ${[35,50,70][r]}% de tu daño por segundo.`,
    fx:[{t:"status", on:"hits", status:{bleed:[0.35,0.5,0.7]}}], test:"bleed"},
  {id:"ms_vendaval", champ:"musashi", skill:2, name:"Vendaval de Acero", look:"steel",
    desc:r=>`Mil Cortes deja un remolino de acero que sigue cortando ${[2,2.8,3.6][r]} s.`,
    fx:[{t:"ground", at:"caster", rMul:0.8, dur:[2000,2800,3600], dps:[0.5,0.7,0.9]}], test:"zone"},
  {id:"ms_duo", champ:"musashi", skill:1, name:"Senda Carmesí", duo:["ms_filo","ms_sangre"], look:"blood",
    desc:r=>"El camino del Paso Fantasma queda marcado: cada corte desangra.",
    fx:[{t:"line", w:54, pct:1.2, status:{bleed:0.6}}], test:"bleed"},

  /* ---------------- LA CAZADORA ---------------- */
  {id:"cz_abanico", champ:"cazadora", skill:0, name:"Abanico de Flechas", look:"nature",
    desc:r=>`La Flecha Perforante sale con ${[2,2,4][r]} flechas más en abanico.`,
    fx:[{t:"fan", n:[2,2,4], spread:0.22, pct:[0.8,1.0,1.2]}], test:"dmg"},
  {id:"cz_raices", champ:"cazadora", skill:1, name:"Brote Trampero", look:"nature",
    desc:r=>`La Trampa del Bosque brota al colocarse y enreda ${[0.5,0.7,0.9][r]} s a los cercanos.`,
    fx:[{t:"burst", at:"aim", r:90, pct:[0.4,0.6,0.8], status:{stun:[500,700,900]}}], test:"hits"},
  {id:"cz_zarzal", champ:"cazadora", skill:1, name:"Zarzal", look:"nature",
    desc:r=>`La Trampa del Bosque deja un zarzal que ralentiza 45% y lastima (${[4,5,6][r]} s).`,
    fx:[{t:"ground", at:"aim", r:[80,90,100], dur:[4000,5000,6000], dps:[0.3,0.4,0.55], slow:0.45}], test:"zone"},
  {id:"cz_puas", champ:"cazadora", skill:2, name:"Lluvia de Púas", look:"steel",
    desc:r=>`La Lluvia de la Cazadora deja púas clavadas en el piso (${[3,4,5][r]} s) que desangran.`,
    fx:[{t:"ground", at:"aim", rMul:0.8, dur:[3000,4000,5000], dps:[0.3,0.4,0.55], bleed:true}], test:"zone"},
  {id:"cz_duo", champ:"cazadora", skill:2, name:"Bosque Vengativo", duo:["cz_zarzal","cz_puas"], look:"nature",
    desc:r=>"Donde cae la Lluvia brota un zarzal enorme que frena a la horda.",
    fx:[{t:"ground", at:"aim", rMul:1.1, dur:5000, dps:0.6, slow:0.5}], test:"zone"},

  /* ---------------- NIGROMANTE ---------------- */
  {id:"ng_huesos", champ:"nigromante", skill:0, minion:true, name:"Huesos Tóxicos", look:"poison",
    desc:r=>`Tus esqueletos, al caer, estallan en una nube de veneno (${[3,3.5,4][r]} s). Es su propio cuerpo: no usa cadáveres.`,
    fx:[{t:"ground", at:"caster", r:[60,75,90], dur:[3000,3500,4000], dps:[0.25,0.35,0.5], poison:true}], test:"minion"},
  {id:"ng_cosecha", champ:"nigromante", skill:0, name:"Cosecha Pútrida", look:"poison",
    desc:r=>`La Cosecha de Almas envenena: ${[30,45,60][r]}% de tu daño por segundo.`,
    fx:[{t:"status", on:"hits", status:{poison:[0.3,0.45,0.6]}}], test:"poison"},
  {id:"ng_coloso", champ:"nigromante", skill:1, name:"Pisotón del Coloso", look:"stone",
    desc:r=>`Al armarse o saltar, el Gólem suelta una onda que aturde ${[0.4,0.6,0.8][r]} s.`,
    fx:[{t:"burst", at:"golem", r:[100,115,130], pct:[0.5,0.7,0.9], status:{stun:[400,600,800]}}], test:"stun"},
  {id:"ng_niebla", champ:"nigromante", skill:2, name:"Niebla Pútrida", look:"poison",
    desc:r=>`La Plaga deja una niebla que ralentiza ${[30,40,50][r]}% (${[4,5,6][r]} s).`,
    fx:[{t:"ground", at:"aim", rMul:0.9, dur:[4000,5000,6000], dps:[0.15,0.22,0.3], slow:[0.3,0.4,0.5], poison:true}], test:"zone"},
  {id:"ng_duo", champ:"nigromante", skill:0, minion:true, name:"Osario Pestilente", duo:["ng_huesos","ng_niebla"], look:"poison",
    desc:r=>"Cada esqueleto que cae suelta además una onda venenosa que frena a la horda.",
    fx:[{t:"burst", at:"caster", r:95, pct:0.8, status:{poison:0.5, slow:0.4}}], test:"minion"},

  /* ---------------- EL LIBERTADOR ---------------- */
  {id:"lb_metralla", champ:"libertador", skill:0, name:"Bayoneta con Metralla", look:"fire",
    desc:r=>`Al lanzar la Bayoneta disparás ${[3,4,5][r]} perdigones en abanico.`,
    fx:[{t:"fan", n:[3,4,5], spread:0.3, pct:[0.45,0.55,0.65]}], test:"dmg"},
  {id:"lb_clarin", champ:"libertador", skill:1, name:"Clarín de Guerra", look:"storm",
    desc:r=>`El toque de los Granaderos empuja y ralentiza a los enemigos cercanos.`,
    fx:[{t:"burst", at:"caster", r:[130,150,170], pct:[0.4,0.55,0.7], status:{slow:0.4}, knock:40}], test:"slow"},
  {id:"lb_bandera", champ:"libertador", skill:1, name:"Bandera en Alto", look:"holy",
    desc:r=>`Los Granaderos además dan un escudo del ${[6,9,12][r]}% de la vida máxima al equipo cercano.`,
    fx:[{t:"ally", at:"caster", r:300, shield:[0.06,0.09,0.12]}], test:"shield"},
  {id:"lb_polvareda", champ:"libertador", skill:2, name:"Polvareda", look:"stone",
    desc:r=>`La Carga de San Lorenzo levanta una polvareda en su camino: ralentiza ${[35,45,55][r]}% y ahoga.`,
    fx:[{t:"ground", at:"ahead", r:110, dur:[3000,4000,5000], dps:[0.2,0.3,0.4], slow:[0.35,0.45,0.55]}], test:"zone"},
  {id:"lb_duo", champ:"libertador", skill:1, name:"Descarga de Fusilería", duo:["lb_metralla","lb_clarin"], look:"fire",
    desc:r=>"Al sonar el clarín, los Granaderos disparan una descarga en redondo.",
    fx:[{t:"shards", at:"caster", n:8, pct:0.65}], test:"dmg"},

  /* ---------------- EREN ---------------- */
  {id:"er_cuchillas", champ:"eren", skill:0, name:"Cuchillas Giratorias", look:"steel",
    desc:r=>`Al disparar los ganchos, cortás en redondo (${[80,95,110][r]} px) y dejás sangrando.`,
    fx:[{t:"burst", at:"origin", r:[80,95,110], pct:[0.6,0.85,1.1], status:{bleed:0.3}}], test:"dmg"},
  {id:"er_vapor", champ:"eren", skill:1, name:"Vapor Hirviente", look:"steam",
    desc:r=>`El Instinto de Supervivencia suelta vapor hirviente alrededor (${[3,4,5][r]} s).`,
    fx:[{t:"ground", at:"caster", r:100, dur:[3000,4000,5000], dps:[0.3,0.45,0.6], burn:true}], test:"zone"},
  {id:"er_grito", champ:"eren", skill:2, name:"Grito Ensordecedor", look:"storm",
    desc:r=>`¡Avancen! aturde ${[0.4,0.6,0.8][r]} s a los enemigos cercanos.`,
    fx:[{t:"burst", at:"caster", r:[120,140,160], pct:[0.3,0.45,0.6], status:{stun:[400,600,800]}}], test:"stun"},
  {id:"er_juramento", champ:"eren", skill:2, name:"Juramento", look:"steel",
    desc:r=>`¡Avancen! da un escudo del ${[6,9,12][r]}% de la vida máxima a los aliados cercanos.`,
    fx:[{t:"ally", at:"caster", r:260, shield:[0.06,0.09,0.12]}], test:"shield"},
  {id:"er_duo", champ:"eren", skill:2, name:"Rugido de Vapor", duo:["er_vapor","er_grito"], look:"steam",
    desc:r=>"El grito deja una nube de vapor que quema y frena alrededor.",
    fx:[{t:"ground", at:"caster", r:140, dur:4000, dps:0.5, burn:true, slow:0.3}], test:"zone"}
];
const BOON_BY_ID = {};
BOONS.forEach(b=>{ BOON_BY_ID[b.id] = b; });
// New guardians use the same bounded, rarity-aware boon engine as the original roster.
const PORTADOR_BOON_KITS = {
 myla:{look:"frost",names:["Yogur persistente","Merienda compartida","Burbuja resonante","BERRINCHE protector"]},
 brasa:{look:"fire",names:["Torre de brasas","Purga expansiva","Chispas de desmontaje","Blindaje del taller"]},
 eslabon:{look:"steel",names:["Gancho resonante","Línea compartida","Hierro protector","Círculo de hierro"]},
 morwen:{look:"poison",names:["Resina persistente","Sal resonante","Destilación protectora","Alambique extendido"]},
 farolero:{look:"holy",names:["Farol protector","Destello resonante","Paso de refugio","Última luz"]},
 iria:{look:"void",names:["Ancla persistente","Tensión resonante","Corte protector","Triángulo seguro"]},
 ynara:{look:"holy",names:["Mirada resonante","Mesa compartida","Retirada protectora","Paciencia radiante"]}
};
for(const [champ,k] of Object.entries(PORTADOR_BOON_KITS)){
 const defs=[
  {skill:0,fx:[{t:"ground",at:"caster",r:[90,105,120],dur:[2000,2500,3000],dps:[.15,.2,.25],slow:.12}],desc:r=>`La primera habilidad deja una zona de control: ${[2,2.5,3][r]} s, ralentización 12% y daño gradual.`,test:"zone"},
  {skill:1,fx:[{t:"echo",at:"ahead",delay:350,r:[95,110,125],pct:[.3,.4,.5]}],desc:r=>`La segunda habilidad añade un estallido demorado de daño en área (${[30,40,50][r]}% de su unidad de daño).`,test:"dmg"},
  {skill:2,fx:[{t:"ally",at:"caster",r:210,shield:[.03,.05,.07]}],desc:r=>`La tercera habilidad protege aliados cercanos con un escudo del ${[3,5,7][r]}% de su vida.`,test:"shield"},
  {skill:"ult",fx:[{t:"ground",at:"caster",r:160,dur:[2500,3000,3500],dps:[.2,.3,.4]}],desc:r=>`La definitiva deja una zona de daño durante ${[2.5,3,3.5][r]} s.`,test:"zone"},
  {skill:1,duo:[champ+"_ref_0",champ+"_ref_2"],fx:[{t:"ally",at:"caster",r:210,shield:.05},{t:"burst",at:"caster",r:115,pct:.35}],desc:()=>"Dúo: la segunda habilidad libera un pulso de daño y protege al equipo con un escudo del 5%.",test:"shield"}
 ];
 defs.forEach((d,i)=>{const b={id:champ+"_ref_"+i,champ,look:k.look,name:i===4?"Pacto de "+k.names[0]:k.names[i],...d};BOONS.push(b);BOON_BY_ID[b.id]=b;});
}
