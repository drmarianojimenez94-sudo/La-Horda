"use strict";
/* ============================================================
   js/data/camp-text.js
   EL CAMPAMENTO DE LOS PORTADORES (datos, no lógica: js/systems/camp.js). Canon:
   docs/lore/LA_HORDA_LORE_BIBLE.md §15. Una pantalla entre arena y arena de la campaña, junto a una
   fogata, con tres personajes que hablan de lo que pasó y de lo que viene:
   - EL HECHICERO: la voz del humo (es una proyección: nunca toca el suelo, biblia §5). Mentor que se
     va enfriando acto por acto; la sospecha va en la última frase. Después del final ya no está: el
     humo solo repite lo que dijo (CAMP_SMOKE).
   - ANSELMO, el herrero de la puerta norte: habla de fierro y de botín. Sus pistas de sets son
     VERDAD: nombran sets que caen en la arena siguiente (SET_ARENA_WEIGHTS, js/data/loot.js; lo
     verifica tools/items/t_camp.js).
   - VEDA, la vidente: plañidera de la Ciudad que no se volvió de la Horda. Lloraba a los muertos por
     oficio; desde la noche de las campanas los llora antes. Profecías del tramo siguiente y de los
     Guardianes caídos.
   Cada arena tiene una línea por personaje (CAMP_LINES) y cada uno suma una reactiva: el Hechicero
   según el cristal que llevás, el herrero según tu guardián, la vidente según los civiles perdidos
   (Ciudad) o los Guardianes que ya duermen. {n} = número de la partida (civiles perdidos).
   ============================================================ */
const CAMP_WHO = {
  hech:  {name:"EL HECHICERO", role:"una voz en el humo", color:"#ffd98a"},
  smith: {name:"ANSELMO", role:"el herrero de la puerta norte", color:"#ffb070"},
  seer:  {name:"VEDA", role:"la vidente", color:"#c9b4ff"},
  smoke: {name:"EL HUMO", role:"ya no habla nadie adentro", color:"#b8b0a4"}
};

/* ---------------- una línea por personaje y por arena ---------------- */
const CAMP_LINES = {
  ciudad:{
    hech:"Descansá. Esta fogata es lo único que la Horda todavía no aprendió a apagar. Mañana seguís la Cicatriz hasta una fábrica que nunca se detuvo; yo voy a estar en el humo, como esta noche. Si alguna vez no me ves, no me busques: yo te encuentro.",
    smith:"Anselmo. Forjé las bisagras de la puerta norte, y aguantaron tres noches. En la Fábrica Sin Fin todavía se templa metal bueno: si ves una pieza del Corazón del Coloso o del Juramento del Guardián, traémela antes de venderla. Un set entero pelea distinto.",
    seer:"Me llamo Veda. Lloraba a los muertos por oficio; desde la noche de las campanas, los lloro antes. Mañana vas a entrar a una prisión cuyo guardián juró que nadie saldría. Va a cumplir: él tampoco sale."},
  fortaleza:{
    hech:"El Caballero cumplió su juramento hasta el final. Así son los que custodian cosas: se olvidan de para quién. En las Ruinas te espera el primer Guardián caído, y su cristal. Traémelo. Yo sé cuidarlo mejor que nadie.",
    smith:"Vi el gancho vacío en la última cámara. Esa cadena la hizo gente que sabía: eslabones que no se funden. En las Ruinas los elfos dejaban ofrendas, y dicen que ahí todavía aparecen piezas de la Profecía del Alba y de la Sombra del Cazador. Si te sobran duplicados de un set, traelos: se reforjan.",
    seer:"Los árboles de las Ruinas se acuerdan de un hombre de luz que los visitó tres noches. Cuando el Guardián te hable, escuchalo entero. Es la última vez que va a poder hablar."},
  bosque:{
    hech:"El primer cristal. ¿Sentís cómo calienta? Es el sello, que vuelve a latir. El Guardián te pidió que no se lo dieras a nadie: hacía siglos que deliraba. Mañana bajás al Reino Fúngico. No te detengas a escuchar a las esporas.",
    smith:"Ese cristal te cambió la forma de agarrar el mango; lo noto desde acá. Abajo, en el Reino Fúngico, se pudren las cosas lindas, pero salen el Réquiem del Sepulturero y el Ojo del Arcano. Juntá piezas del mismo set: cada par que sumás despierta algo.",
    seer:"El Guardián de la niebla ya duerme. Le quedan dos hermanos de este lado, y uno del otro. Las esporas te van a repetir sus voces. Todas dicen la verdad: no saben decir otra cosa."},
  micelial:{
    hech:"Ruido. Las esporas repiten lo que oyeron, como un loro repite un nombre. Lo que importa es el segundo cristal, en la Arena Gélida. Allá arriba, un Mago espera a alguien desde hace siglos. Que espere.",
    smith:"El micelio se comió la hoja de mi mejor cuchillo en una sola noche. En el hielo no se pudre nada: el metal se vuelve quebradizo, y el Pacto del Glaciar aparece más que en ningún otro lado. Si te cae una pieza, no la vendas por la plata del día.",
    seer:"Oí la cuarta voz, la tranquila. Dijo «yo me quedo». No lo dijo como quien se sacrifica: lo dijo como quien se queda con algo. Arriba, en el frío, alguien escribe cartas que nadie contesta. Buscalas."},
  hielo:{
    hech:"El Mago preguntó por alguien antes de caer. Los que pasan siglos solos le hablan a cualquier sombra. Con dos cristales el mundo empieza a doblarse: mañana vas a ver agua donde nunca la hubo. Cuidalos a ellos antes que a vos.",
    smith:"Escarcha en las junturas: dejame ver esa guarda. Donde vas ahora el agua se mete por todos lados; allá sale la Tempestad Eterna, piezas que llevan el rayo de un enemigo a otro. Si te llegan Gemas, subile el nivel a lo que ya usás antes de salir a buscar algo nuevo.",
    seer:"Soñé con un valle y un faro sin barcos. El agua va a seguir el brillo que llevás en la bolsa, no a vos. Dos Guardianes duermen. El tercero todavía levanta muros, y ya no sabe para quién."},
  acuatica:{
    hech:"El Leviatán olió los cristales desde el fondo del mar; lo que venga después los va a oler mejor. En el Laberinto espera el tercer Guardián, y la piedra ya le comió el juicio. Traé ese cristal. Traémelo.",
    smith:"Sal en todo, hasta en las costuras. Mañana es el Laberinto: en sus pasillos todavía aparece el Rey del Laberinto, piezas para los que nunca se quedan quietos, y a veces el Corazón del Coloso. Probá otro set antes de entrar; en la Sala te lo cambiás.",
    seer:"Una farera me dejó su bitácora en un sueño: el mar llegó cuando alguien se llevó el segundo cristal. No lo trajo la Horda, portador. Lo trajiste vos. Todo lo que cargás dobla el mundo."},
  laberinto:{
    hech:"Tres. Ya casi. El del Laberinto te habló de llaves y de cuentas: deliraba, como los otros dos. No importa lo que pienses de mí. Importa que la Cicatriz se rasgó, y del otro lado del Abismo ya no hay piso. Bajá.",
    smith:"Cuatro llaves, dijo el Guardián. Hice cerraduras toda mi vida: una llave que sobra es una llave que alguien copió. En el Abismo el Ojo del Arcano y el Rey del Laberinto caen seguido. Andá con lo mejor que tengas, que de allá no se vuelve igual.",
    seer:"Los tres Guardianes de este lado ya duermen. El que falta no está en ninguna tumba que yo pueda ver. Lo busco en el fuego, y el fuego se aparta, como si alguien estuviera sentado adentro."},
  abismo:{
    hech:"Seis nombres en la roca, ¿no? Eran buenos. Obedientes. Llegaron lejos, pero no lo suficiente. Vos sí vas a llegar. En las Minas la luz es tuya: no se la prestes a nadie.",
    smith:"Mi abuelo bajó a esas Minas y volvió sin nombre. Decía que en el fondo se oía a alguien golpear un yunque, encadenado. Llevá el Corazón del Coloso si lo tenés, o la Sangre del Berserker si sos de los que no retroceden.",
    seer:"Vi seis sombras bajando, con una lámpara cada una. Se apagan de a una. La última escribió algo antes de apagarse: «éramos una llave». Vos también sos una llave, portador. Falta saber de qué puerta."},
  minas:{
    hech:"Cruzaste el Umbral. Ya no necesito hablarte desde el humo: del otro lado te voy a ver con mis propios ojos. Traé los cristales. Los tres. Esta vez no te lo pido.",
    smith:"Esa voz encadenada que se oía desde abajo… golpea como golpea un herrero. Conozco el ritmo. Allá adentro dicen que caen las piezas del Set de Lucifer; con las seis, se pelea como pelea el fuego. No me pidas que te acompañe: mis manos sirven de este lado.",
    seer:"Mañana el que te guía va a tener cara. No lo mires a los ojos: mirale las manos. Las manos dicen lo que alguien quiere. Las suyas están vacías, portador, y tienen hambre."},
  infernal:{
    hech:"El humo de la fogata sube derecho, sin forma. Por primera vez desde la Ciudad, nadie habla desde adentro.",
    smith:"Mirá esto: un eslabón de la cadena del Forjador. Se aflojó solo. No lo pienso fundir; lo voy a colgar sobre la puerta norte, para que nadie se olvide. Dicen que en las gradas de oro caen piezas de todos los sets. Si subís, traeme algo lindo.",
    seer:"Ya no lloro antes. Los veo llegar y los lloro cuando se van, como antes de la noche de las campanas. Hay unas gradas de oro que no puedo ver, portador. Por primera vez, no sé qué viene. Me gusta."}
};
// Sets que nombra el herrero en cada arena (se verifican contra la arena SIGUIENTE en SET_ARENA_WEIGHTS;
// después del final, contra la Arena Divina).
const CAMP_SMITH_SETS = {ciudad:["coloso","guardian"], fortaleza:["alba","cazador"], bosque:["sepulturero","arcano"],
  micelial:["glaciar"], hielo:["tempestad"], acuatica:["laberinto","coloso"], laberinto:["arcano","laberinto"],
  abismo:["coloso","berserker"], minas:["lucifer"], infernal:[]};

/* ---------------- líneas que reaccionan a la partida ---------------- */
// El Hechicero, según el cristal que llevás encima (Resonancia: crystal-resonance.js).
const CAMP_HECH_CRYSTAL = {
  ancestral:"Llevás el Cristal Ancestral encima. Te cura cuando nadie te pega, ¿no? Así era él: paciente. Acordate de que la paciencia también se gasta.",
  escarcha:"Llevás el de Escarcha. Todo lo que se te acerca se vuelve lento. Él también era así: frenaba al mundo para no tener que seguirlo. No te acostumbres.",
  piedra:"El Cristal de Piedra te cubre. Un buen escudo, hasta que un día no sentís nada del otro lado. Él lo aprendió tarde.",
  none:"No llevás ningún cristal encima. ¿Desconfiás de ellos, o de mí? Las dos cosas son razonables. Solo una es útil."
};
// El herrero, según el guardián con el que jugaste (clave = la de CLASSES).
const CAMP_SMITH_HERO = {
  tanque:"Ese escudo tiene más abolladuras que mi yunque. Dejámelo esta noche: mañana va a aguantar una puerta más.",
  guerrero:"Buen filo, mala guarda. Los que pelean como vos se cortan los dedos antes que el cuello. Te la ajusto.",
  mago:"De fuego sé lo que sale de una fragua, nada más. Pero ese báculo tiene una rajadura que hasta yo veo.",
  soporte:"Tus vendas están más gastadas que tus armas. Eso habla bien de vos. Te dejé tiras nuevas en la mochila.",
  segador:"Esa guadaña no la hizo nadie de este siglo. No la toco: hay herramientas que eligen a su dueño.",
  axiom:"No entiendo cómo funciona tu arma, y eso que abrí relojes de la Fábrica. Algo adentro zumba como una colmena.",
  profeta:"Tus manos tiemblan antes de cada golpe, como si ya supieras dónde va a caer. Al fierro no le gusta que lo apuren.",
  musashi:"Una sola hoja, y la cuidás como a un hijo. Te presto mi piedra de afilar; devolvémela con el mismo respeto.",
  cazadora:"Cuerdas de tripa, de las del bosque. Mañana te trenzo una con crin, que en el frío no se corta.",
  nigromante:"Los huesos que llevás colgando no los templé yo, y no pienso preguntar de dónde salieron.",
  libertador:"Un sable de caballería, tan lejos de cualquier caballo. Te enderezo la punta; la cordillera, no.",
  eren:"Esas hojas son para cortar algo mucho más grande que un hombre. Ojalá no tengas que usarlas para eso."
};
// La vidente, en la Ciudad: los civiles que se perdieron en esta partida.
const CAMP_SEER_CIVILIANS = {
  lost:"Esta noche lloro a {n} de la Ciudad. No te lo digo para que te pese: te lo digo para que alguien los nombre.",
  none:"Esta noche no tengo a quién llorar. Hacía años que no me pasaba. Gracias, portador."
};
// La vidente, fuera de la Ciudad: los Guardianes que ya duermen (cuántos cristales tenés).
const CAMP_SEER_FALLEN = [
  "Todavía no llevás ningún cristal. Los Guardianes te esperan despiertos, y eso es lo peor que les puede pasar.",
  "Uno de los Cuatro ya duerme. Lo veo tranquilo, por primera vez en siglos. Los otros te sienten venir.",
  "Dos duermen. El que levanta muros cuenta llaves en la oscuridad, y las cuentas no le cierran.",
  "Los tres de este lado duermen. Del que falta no veo tumba: veo un trono."
];
const CAMP_SEER_AFTER = "Los cuatro duermen, portador. Hasta el que no quería.";
// Después del final, el Hechicero ya no está: el humo repite lo que dijo en ese mismo campamento.
const CAMP_SMOKE = "El humo todavía toma su forma un momento, y repite lo que dijo acá la primera vez: «{t}»";
