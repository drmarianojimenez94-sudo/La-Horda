"use strict";
/* ============================================================
   js/audio/music-score.js
   PARTITURA de la música de La Horda, escrita como DATOS. La interpreta el secuenciador de
   js/audio/audio.js (instrumentos sintetizados, sin archivos). Acá solo hay notas.

   LEITMOTIV — "La Horda" (4 + 4 compases, pregunta y respuesta). Está escrito en GRADOS de la
   escala, no en notas: cada pieza lo lee en su propio MODO y así se transforma solo:
     título (eólico, lento, trompa y coro) · menú (dórico, flauta y pizzicato: el 6.º grado sube y
     se aclara) · victoria (jónico, metales: triunfal) · derrota (eólico, lento y corto) ·
     Hechicero (LOCRIO en 3/4: el 5.º grado cae medio tono y el motivo queda con un tritono adentro;
     su pantalla previa es el mismo vals en LIDIO: "angelical", pero el tritono ya estaba ahí).

   NOTACIÓN
   - Melodías: "grado[octava][alteración]:duración" separados por espacios. Grados 1..7; ' sube una
     octava y , baja; # y b alteran medio tono; r = silencio. Duración en semicorcheas y se
     arrastra (si una nota no dice duración usa la de la anterior). | es solo una barra de compás.
   - Acordes: "[b|#]grado[calidad][7|9]:duración" (sin duración = un compás entero). Se arman con
     la escala de la pieza; calidad M mayor, m menor, d disminuido, s sus4. Las voces del pad se
     conducen solas (voice leading: cada voz va a la nota del acorde nueva más cercana).
   - Arpegios: índices de la voz del acorde (0 = la más grave), ' = una octava arriba, r = silencio.
     Acompañamiento (comp): x = el acorde entero, r = silencio (el "um-pa-pa" del vals).
   - Bajo: R fundamental, F quinta, T tercera, O octava, S séptima, A nota de aproximación al acorde
     que viene, +n / -n semitonos desde la fundamental, r silencio.
   - Batería: una cadena por instrumento, un carácter por semicorchea (se repite si es más corta):
     X acento, x normal, - fantasma, r redoble, . nada. k bombo, s redoblante, h charles, o charles
     abierto, T taiko, t toms (bajan de tono en el compás), m timbal (afinado al acorde), c platillo,
     g gong, b bloque. f4 / f8 = REDOBLES (fills) que reemplazan esas pistas en el último compás de
     cada 4 / de cada 8.
   - Capas: lv = intensidad mínima (0..1: cuántos enemigos hay y el nivel), ph / phx = fase del jefe
     mínima / máxima (1..3, según su vida o su forma). Así la música se llena sola con la pelea.
   - Formas: form = orden de secciones (A/B/...: el loop largo no se repite idéntico); pform = una
     forma por fase del jefe; then = pieza que sigue al terminar; loop = desde qué sección repite.
   ============================================================ */

const MUSIC_SCALES = {
  ionian:[0,2,4,5,7,9,11], dorian:[0,2,3,5,7,9,10], phrygian:[0,1,3,5,7,8,10], lydian:[0,2,4,6,7,9,11],
  mixolydian:[0,2,4,5,7,9,10], aeolian:[0,2,3,5,7,8,10], harmonic:[0,2,3,5,7,8,11],
  locrian:[0,1,3,5,6,8,10], phrygdom:[0,1,4,5,7,8,10]
};

const MUSIC_MOTIFS = {
  // cabeza del leitmotiv (la usan los golpes de entrada)
  head:   "1:4 5 6:6 5:2",
  // LEITMOTIV — pregunta: sube a la quinta, suspira en el 6.º grado, cae y vuelve a subir
  horda:  "1:4 5 6:6 5:2 | 4:4 3 2:6 5,:2 | 1:4 5 6 7:2 1':2 | 2':6 3':2 1':8",
  // respuesta abierta (termina en la quinta: el loop sigue) y respuesta que cierra (cadencia)
  resp:   "3':4 2' 1' 7 | 6:6 5:2 4:8 | 3:4 4 5 6:2 7:2 | 5:12 r:4",
  cad:    "3':4 2' 1' 7 | 6:6 5:2 4:8 | 3:4 4 5 6:2 7:2 | 2:4 7,:4 1:8",
  // contramelodía de las oleadas (sección B): corcheas con brío, pregunta y respuesta en 8 compases
  brio:   "5:2 6 5 3 1':4 7:2 6 | 5:6 3:2 4:8 | 6:2 7 6 4 2':4 1':2 7 | 1':12 r:4 | " +
          "3':2 2' 1' 7 1':4 5 | 6:6 7:2 1':8 | 2':2 1' 7 6 5:4 3' | 2':16",
  // canción de cuna del menú (sección C)
  lull:   "3':6 2':2 1':4 5 | 6:6 5:2 3:8 | 4:6 3:2 2:4 5,:4 | 1:16 | 3':6 2':2 1':4 5 | 6:6 7:2 1':8 | 2':6 1':2 7:4 5 | 1':16",
  // puente de las oleadas (sección C): la cabeza aumentada en los metales graves
  headAug:"1:8 5:8 | 6:12 5:4",
  // victoria: el leitmotiv apretado en ritmo de fanfarria
  vic:    "1:2 1 5:4 6:6 5:2 | 4:4 3 2 5, | 1:4 5 6 7:2 1':2 | 2':4 3' 1':8",
  // derrota: la cabeza que se hunde
  defe:   "1':8 5:8 | 6:12 5:4 | 4:8 3:8 | 2:8 7,:4 1:4",
  // Hechicero: el leitmotiv convertido en VALS (3/4, 12 semicorcheas por compás)
  hwaltz: "1:4 5 6 | 5:12 | 4:4 3 2 | 5,:12 | 1:4 5 6 | 7:4 1' 2' | 3':8 2':4 | 1':12",
  hwresp: "3':4 2' 1' | 7:12 | 6:4 5 4 | 3:12 | 2:4 3 4 | 5:4 6 7 | 1':12 | 1:12",
  // tensión del preludio: nota repetida que respira
  toll:   "1':2 r 1' r 7 r 1':4 | 1':16"
};

// Batería base reutilizable (oleadas)
const _DR_WAVE = { k:"X.....x.X.x.....", s:"....X.......X...",
  f4:{ s:"....X.......X-xx" }, f8:{ s:"....X...-.x-XxXX", t:"........x.x.x..." } };

const MUSIC_SCORE = {
  /* ---------- TÍTULO: el leitmotiv lento y solemne (trompa, coro, timbales y gong) ---------- */
  title: { bpm:60, key:57, scale:"aeolian", then:"menu", seam:true, echo:0,
    form:["A","B"],
    sec:{
      A:{ bars:8, ch:"1 | 7 | 6 | 5M:8 1:8 | 6 | 4 | 3 | 5M",
        parts:[
          { p:"pad", i:"strings", v:0.085, c:900, dt:-25 },
          { p:"bass", i:"low", pat:"R:16", v:0.13 },
          { p:"mel", i:"horn", m:["horda","resp"], o:0, v:0.075 },
          { p:"dr", m:"X...............", g:"X...............", f4:{ m:"X...........x-x-" }, f8:{ m:"X.......x-x-xxXX", g:"X..............." } }
        ] },
      B:{ bars:8, ch:"1 | 7 | 6 | 5M:8 1:8 | 6 | 4 | 3 | 5M:8 1:8",
        parts:[
          { p:"pad", i:"choir", v:0.07, c:2200 },
          { p:"pad", i:"strings", v:0.05, c:700, o:-12 },
          { p:"bass", i:"low", pat:"R:8 F:8", v:0.12 },
          { p:"arp", i:"harp", pat:"0:2 1 2 3 2 1 0' 1'", o:12, v:0.05 },
          { p:"mel", i:"choirL", m:["horda","cad"], o:12, v:0.06 },
          { p:"mel", i:"horn", m:["horda","cad"], o:0, hz:-2, v:0.04 },
          { p:"dr", m:"X.......x.......", f8:{ m:"X.......xxxxXXXX" } }
        ] }
    } },

  /* ---------- MENÚ: dórico, pizzicato y flauta; canción de cuna en la C ---------- */
  menu: { bpm:80, key:57, scale:"dorian", swing:0.12, echo:3,
    form:["A","B","C","B2"],
    sec:{
      A:{ bars:4, ch:"1 | 4 | 1 | 4",
        parts:[
          { p:"pad", i:"strings", v:0.09, c:1000 },
          { p:"arp", i:"pizz", pat:"0:2 1 2 1' 2 1 0' 2", o:12, v:0.27 },
          { p:"bass", i:"pizz", pat:"R:8 F:8", o:0, v:0.32 }
        ] },
      B:{ bars:8, ch:"1 | 7 | 4 | 5:8 1:8 | 3 | 4 | 3 | 5",
        parts:[
          { p:"pad", i:"strings", v:0.08, c:1100 },
          { p:"arp", i:"pizz", pat:"0:2 1 2 1' 2 1 0' 2", o:12, v:0.22 },
          { p:"bass", i:"pizz", pat:"R:6 F:2 O:4 F:4", o:0, v:0.3 },
          { p:"mel", i:"flute", m:["horda","resp"], o:12, v:0.075, e:1 }
        ] },
      C:{ bars:8, ch:"3 | 4 | 7 | 1 | 3 | 4 | 5 | 1",
        parts:[
          { p:"pad", i:"glass", v:0.08, c:1500 },
          { p:"arp", i:"harp", pat:"0:2 2 1' 2 0' 2 1' 2", o:0, v:0.08 },
          { p:"bass", i:"pizz", pat:"R:8 F:4 A:4", o:0, v:0.3 },
          { p:"mel", i:"celesta", m:"lull", o:12, v:0.06, e:1 },
          { p:"dr", b:"....x.......x.-.", v:0.6 }
        ] },
      B2:{ from:"B", add:[ { p:"mel", i:"bell", m:["horda","cad"], o:24, v:0.02 } ], ch:"1 | 7 | 4 | 5:8 1:8 | 3 | 4 | 3 | 5:8 1:8",
        swap:{ 3:{ p:"mel", i:"flute", m:["horda","cad"], o:12, v:0.075, e:1 } } }
    } },

  /* ---------- PANTALLA PREVIA: el Hechicero "angelical" (su vals en LIDIO: arpa, coro y celesta) ---------- */
  intro: { bpm:80, steps:12, key:52, scale:"lydian", echo:3,
    form:["A","B"],
    sec:{
      A:{ bars:8, ch:"1 | 5 | 2 | 5 | 1 | 6 | 2 | 1",
        parts:[
          { p:"pad", i:"choir", v:0.06, c:2600 },
          { p:"arp", i:"harp", pat:"0:2 1 2 0' 2 1", o:12, v:0.055 },
          { p:"bass", i:"low", pat:"R:12", o:0, v:0.09 },
          { p:"mel", i:"celesta", m:"hwaltz", o:12, v:0.05, e:1 },
          { p:"dr", g:"X...........", v:0.4, every:8 }
        ] },
      B:{ bars:8, ch:"6 | 7 | 4 | 3 | 2 | 5 | 1 | 1",
        parts:[
          { p:"pad", i:"choir", v:0.065, c:2800 },
          { p:"pad", i:"glass", v:0.04, c:1800, o:12 },
          { p:"arp", i:"harp", pat:"0:2 1 2 1' 2 1", o:12, v:0.05 },
          { p:"bass", i:"low", pat:"R:8 F:4", o:0, v:0.08 },
          { p:"mel", i:"choirL", m:"hwresp", o:12, v:0.055 },
          { p:"mel", i:"celesta", m:"hwresp", o:24, hz:-2, v:0.02, e:1 }
        ] }
    } },

  /* ---------- OLEADAS: ostinato, bajo, batería; la melodía y las capas entran con la horda ---------- */
  wave: { bpm:110, key:57, scale:"aeolian", arena:true, echo:3,
    form:["A","B","A2","C"],
    sec:{
      A:{ bars:8, ch:"1 | 7 | 6 | 5M:8 1:8 | 6 | 4 | 3 | 5M",
        parts:[
          { p:"pad", i:"strings", v:0.042, c:1300 },
          { p:"arp", i:"stac", pat:"0 2 1 2", o:12, v:0.05, acc:1.6, c:2600 },
          { p:"bass", i:"stac", pat:"R:2 R R R R R O R", v:0.11 },
          { p:"mel", i:"lead", m:["horda","resp"], o:12, v:0.042, e:1, lv:0.12 },
          { p:"dr", k:_DR_WAVE.k, s:_DR_WAVE.s, f4:_DR_WAVE.f4, f8:_DR_WAVE.f8 },
          { p:"dr", h:"x.x.x.x.x.x.x.x.", lv:0.2 },
          { p:"dr", k:"...x......x....x", h:"-x-x-x-x-x-x-x-x", lv:0.55, v:0.7 },
          { p:"stab", i:"brass", o:-12, v:0.05, lv:0.7 }
        ] },
      B:{ bars:8, ch:"4 | 6 | 4 | 1 | 6 | 7 | 4 | 5M",
        parts:[
          { p:"pad", i:"strings", v:0.045, c:1500 },
          { p:"arp", i:"stac", pat:"0 1 2 1' 2 1 0' 1", o:12, v:0.045, acc:1.6, c:2800 },
          { p:"bass", i:"stac", pat:"R:2 R F R O R F A", v:0.11 },
          { p:"mel", i:"lead", m:"brio", o:12, v:0.04, e:1, lv:0.25 },
          { p:"mel", i:"pluck", m:"brio", o:0, v:0.05, lv:0, lvx:0.25 },
          { p:"dr", k:"X..x..x.X..x..x.", s:"....X.......X..-", f4:{ s:"....X.......Xxx-" }, f8:{ s:"....X.......rrXX", t:"........X.x.x.x." } },
          { p:"dr", h:"x-x-x-x-x-x-x-x-", lv:0.3 },
          { p:"pad", i:"choir", v:0.04, c:2400, lv:0.75 }
        ] },
      A2:{ bars:8, ch:"1 | 7 | 6 | 5M:8 1:8 | 6 | 4 | 3 | 5M:8 1:8",
        parts:[
          { p:"pad", i:"strings", v:0.045, c:1500 },
          { p:"arp", i:"stac", pat:"0 2 1 2 0' 2 1 2", o:12, v:0.05, acc:1.6, c:3000 },
          { p:"bass", i:"stac", pat:"R:2 R O R R R O A", v:0.11 },
          { p:"mel", i:"lead", m:["horda","cad"], o:24, v:0.04, e:1 },
          { p:"mel", i:"lead", m:["horda","cad"], o:24, hz:-2, v:0.026, lv:0.45 },
          { p:"mel", i:"brass", m:["horda","cad"], o:0, v:0.035, lv:0.7 },
          { p:"dr", k:_DR_WAVE.k, s:_DR_WAVE.s, h:"x.x.x.x.x.x.x.x.", f4:_DR_WAVE.f4, f8:_DR_WAVE.f8 },
          { p:"dr", k:"...x......x....x", h:"-x-x-x-x-x-x-x-x", c:"X...............", lv:0.55, v:0.7, every:4 },
          { p:"stab", i:"brass", o:-12, v:0.05, lv:0.6 }
        ] },
      // puente: medio tiempo, taikos, la cabeza aumentada en los metales graves; redoble que crece
      C:{ bars:8, ch:"1 | 6 | 1 | 6 | 4 | 6 | 5M | 5M",
        parts:[
          { p:"pad", i:"strings", v:0.055, c:900, dt:-30 },
          { p:"bass", i:"low", pat:"R:8 R:4 F:4", v:0.12 },
          { p:"mel", i:"brass", m:"headAug", o:-12, v:0.05 },
          { p:"arp", i:"pluck", pat:"0:4 2 1' 2", o:12, v:0.045, lv:0.3 },
          { p:"dr", T:"X.......x.......", s:"........X.......", f8:{ s:"x-x-x-x-xxxxXXXX", T:"X.......X.X.XXXX" } },
          { p:"dr", h:"..x...x...x...x.", lv:0.4 }
        ] }
    } },

  /* ---------- PRELUDIO (nivel 10): timbales, el leitmotiv en el registro grave, trémolo ---------- */
  prelude: { bpm:84, key:57, scale:"harmonic", arena:true, echo:0,
    form:["A","B"],
    sec:{
      A:{ bars:8, ch:"1 | 7 | 6 | 5M:8 1:8 | 6 | 4 | 2d | 5M",
        parts:[
          { p:"pad", i:"strings", v:0.1, c:1000, dt:-35 },
          { p:"mel", i:"low", m:["horda","resp"], o:-12, v:0.1 },
          { p:"dr", m:"X...x...X...x.x.", v:0.9, f8:{ m:"X...x...x-x-xxXX" } },
          { p:"arp", i:"stac", pat:"2' 2' 2' 2'", o:12, v:0.022, c:1800, lv:0.3 }
        ] },
      B:{ bars:8, ch:"1 | 2d | 6 | 5M | 1 | 4 | b2M | 5M",
        parts:[
          { p:"pad", i:"strings", v:0.09, c:1100, dt:-45 },
          { p:"bass", i:"stac", pat:"R:4 R R +1", v:0.15, c:500 },
          { p:"arp", i:"stac", pat:"2' 2' 2' 2'", o:12, v:0.026, c:2000 },
          { p:"mel", i:"horn", m:"toll", o:0, v:0.06 },
          { p:"dr", k:"X..x............", m:"X.......x.......", f4:{ m:"X.......x-x-x-xx" }, f8:{ m:"X...x...xxxxXXXX" } }
        ] }
    } },

  /* ---------- JEFE (cada arena lo tiñe): 3 fases que suman capas según la vida del jefe ---------- */
  boss: { bpm:124, key:57, scale:"harmonic", arena:true, echo:3,
    pform:{ 1:["P1","P1b"], 2:["P2","P2b"], 3:["P3","P3b"] },
    sec:{
      // fase 1: cuerdas graves que se arrastran en semitonos, taikos, la cabeza en los metales
      P1:{ bars:8, ch:"1 | b2M | 1 | 5M | 1 | b2M | 6 | 5M",
        parts:[
          { p:"pad", i:"strings", v:0.05, c:800, dt:-55 },
          { p:"bass", i:"stac", pat:"R R +1 R R +1 +3 +1 R R +1 R +6 +5 +3 +1", v:0.1, c:700, acc:1.5 },
          { p:"mel", i:"brass", m:"head", o:-12, v:0.05, every:2 },
          { p:"dr", T:"X..x..x.X..x..x.", f4:{ T:"X..x..x.X.xxXXXX" }, f8:{ T:"X..x..x.XxXxXXXX", s:"............XXXX" } },
          { p:"dr", s:"............x...", h:"..x...x...x...x.", lv:0.4 }
        ] },
      P1b:{ from:"P1", ch:"1 | b2M | 1 | 5M | 6 | b2M | 4 | 5M",
        add:[ { p:"arp", i:"stac", pat:"2' 1' 0' 1'", o:12, v:0.03, c:2400, lv:0.35 } ] },
      // fase 2: backbeat, el leitmotiv entero en el lead doblado por los metales
      P2:{ bars:8, ch:"1 | 7 | 6 | 5M:8 1:8 | 6 | 4 | b2M | 5M",
        parts:[
          { p:"pad", i:"strings", v:0.05, c:1100, dt:-40 },
          { p:"bass", i:"stac", pat:"R R O R R +1 O R R R O R +6 +5 +3 +1", v:0.12, c:800, acc:1.5 },
          { p:"mel", i:"lead", m:["horda","resp"], o:12, v:0.045, e:1 },
          { p:"mel", i:"brass", m:["horda","resp"], o:-12, v:0.035 },
          { p:"dr", k:"X.....x.X.x.....", s:"....X.......X...", T:"X..x..x.X..x..x.", h:"x-x-x-x-x-x-x-x-",
            f4:{ s:"....X.......Xxxx" }, f8:{ s:"....X...xxXXxxXX", t:"........X.x.x.x." } },
          { p:"pad", i:"choir", v:0.035, c:2200, lv:0.5 }
        ] },
      P2b:{ from:"P2", ch:"4 | 6 | 4 | 1 | 6 | 7 | b2M | 5M",
        swap:{ 2:{ p:"mel", i:"lead", m:"brio", o:12, v:0.042, e:1 }, 3:{ p:"arp", i:"stac", pat:"0 1 2 1' 2 1 0' 1", o:12, v:0.035, c:2600 } } },
      // fase 3: todo adentro — doble bombo, coro, platillo en cada compás, melodía a dos voces, más rápido
      P3:{ bars:8, tempo:1.07, ch:"1 | 7 | 6 | 5M:8 1:8 | 6 | 4 | b2M | 5M:8 1:8",
        parts:[
          { p:"pad", i:"choir", v:0.055, c:2600 },
          { p:"pad", i:"strings", v:0.04, c:1400, dt:-30, o:-12 },
          { p:"bass", i:"stac", pat:"R R O R", v:0.11, c:900, acc:1.4 },
          { p:"arp", i:"stac", pat:"0' 2 1' 2 2' 2 1' 2", o:12, v:0.03, c:3200 },
          { p:"mel", i:"lead", m:["horda","cad"], o:24, v:0.04, e:1 },
          { p:"mel", i:"lead", m:["horda","cad"], o:24, hz:-2, v:0.028 },
          { p:"mel", i:"brass", m:["horda","cad"], o:0, v:0.04 },
          { p:"dr", k:"X.x.X.x.X.x.X.x.", s:"....X.......X...", T:"X..x..x.X..x..x.", h:"xxxxxxxxxxxxxxxx", c:"X...............",
            f4:{ s:"....X.......XXXX" }, f8:{ s:"....X...rrrrXXXX", t:"....X.x.X.x.X.x." } }
        ] },
      P3b:{ from:"P3", ch:"4 | 6 | 4 | 1 | 6 | 7 | b2M | 5M", swap:{ 4:{ p:"mel", i:"lead", m:"brio", o:24, v:0.04, e:1 }, 5:{ p:"mel", i:"lead", m:"brio", o:24, hz:-2, v:0.026 } } }
    } },

  /* ---------- HECHICERO SUPREMO: el vals corrompido (LOCRIO); forma 3 rompe el compás a 4/4 ---------- */
  sorcerer: { bpm:132, steps:12, key:52, scale:"locrian", echo:3,
    pform:{ 1:["H1","H1b"], 2:["H2","H2b"], 3:["H3","H3b"] },
    sec:{
      // forma 1 (Ángel Corrompido / el subjefe): vals de órgano, campana del tritono, pad que se desafina
      H1:{ bars:8, ch:"1d | 5 | 4 | 5 | 1d | 6 | 2 | 1d",
        parts:[
          { p:"pad", i:"strings", v:0.075, c:1000, dt:-60 },
          { p:"bass", i:"low", pat:"R:4 r:8", v:0.2 },
          { p:"comp", i:"organ", pat:"r:4 x x", v:0.05, len:0.5 },
          { p:"mel", i:"organ", m:"hwaltz", o:12, v:0.075 },
          { p:"dr", T:"X...........", b:"....x...x...", lv:0.3 },
          { p:"toll", i:"bell", v:0.07, every:2 }
        ] },
      H1b:{ from:"H1", ch:"6 | 7 | 4 | 3 | 2 | 5 | 1d | 1d",
        swap:{ 3:{ p:"mel", i:"choirL", m:"hwresp", o:12, v:0.075 } },
        add:[ { p:"mel", i:"organ", m:"hwresp", o:0, hz:-2, v:0.025, lv:0.4 } ] },
      // forma 2 (Golem de Cuerpos): el vals se vuelve pesado — taikos, yunques, metales y coro grave
      H2:{ bars:8, ch:"1d | 5 | 4 | 5 | 1d | 6 | 2 | 1d",
        parts:[
          { p:"pad", i:"choir", v:0.05, c:1600, o:-12 },
          { p:"pad", i:"strings", v:0.04, c:900, dt:-60 },
          { p:"bass", i:"stac", pat:"R:4 +1 R", v:0.13, c:600 },
          { p:"comp", i:"organ", pat:"r:4 x x", v:0.03, len:0.5 },
          { p:"mel", i:"brass", m:"hwaltz", o:0, v:0.05 },
          { p:"mel", i:"organ", m:"hwaltz", o:12, v:0.03 },
          { p:"dr", T:"X...x...x...", k:"X...........", s:"........X...", f4:{ T:"X...x...XxXX" }, f8:{ T:"X...XxXxXXXX", c:"X..........." } },
          { p:"anvil", v:0.045 }
        ] },
      H2b:{ from:"H2", ch:"6 | 7 | 4 | 3 | 2 | 5 | 1d | 1d",
        swap:{ 4:{ p:"mel", i:"brass", m:"hwresp", o:0, v:0.05 }, 5:{ p:"mel", i:"choirL", m:"hwresp", o:12, v:0.045 } } },
      // forma 3 (Demonio Mayor): el vals se rompe a 4/4, doble bombo, el leitmotiv locrio a dos voces
      H3:{ bars:8, steps:16, tempo:1.06, ch:"1d | 7 | 6 | 2:8 1d:8 | 6 | 4 | 3 | 5",
        parts:[
          { p:"pad", i:"choir", v:0.055, c:2600 },
          { p:"pad", i:"strings", v:0.04, c:1200, dt:-60, o:-12 },
          { p:"bass", i:"stac", pat:"R R +1 R R +6 R +1", v:0.11, c:800, acc:1.4 },
          { p:"arp", i:"stac", pat:"0' 2 1' 2", o:12, v:0.03, c:3000 },
          { p:"mel", i:"organ", m:["horda","resp"], o:12, v:0.045 },
          { p:"mel", i:"brass", m:["horda","resp"], o:-12, v:0.04 },
          { p:"mel", i:"lead", m:["horda","resp"], o:24, hz:-2, v:0.022, lv:0.35 },
          { p:"dr", k:"X.x.X.x.X.x.X.x.", s:"....X.......X...", T:"X..x..x.X..x..x.", h:"x-x-x-x-x-x-x-x-", c:"X...............",
            f4:{ s:"....X.......XXXX" }, f8:{ s:"....X...rrrrXXXX", t:"....X.x.X.x.X.x.", g:"X..............." } }
        ] },
      H3b:{ from:"H3", ch:"6 | 4 | 3 | 5 | 1d | 7 | 2 | 1d", swap:{ 4:{ p:"mel", i:"organ", m:["resp","cad"], o:12, v:0.045 }, 5:{ p:"mel", i:"brass", m:["resp","cad"], o:-12, v:0.04 }, 6:{ p:"mel", i:"lead", m:["resp","cad"], o:24, hz:-2, v:0.022, lv:0.35 } } }
    } },

  /* ---------- VICTORIA: el leitmotiv en MAYOR, fanfarria de metales; después, el menú ---------- */
  victory: { bpm:104, key:60, scale:"ionian", then:"menu", echo:3,
    form:["A","B"],
    sec:{
      A:{ bars:4, ch:"1 | 4:8 5:8 | 6:8 4:8 | 5:8 1:8",
        parts:[
          { p:"pad", i:"strings", v:0.06, c:1800, o:12 },
          { p:"bass", i:"stac", pat:"R:4 F O F", v:0.1, c:900 },
          { p:"mel", i:"brass", m:"vic", o:0, v:0.07 },
          { p:"mel", i:"brass", m:"vic", o:0, hz:-2, v:0.04 },
          { p:"arp", i:"harp", pat:"0 1 2 0' 1' 2' 1' 0'", o:12, v:0.04 },
          { p:"dr", m:"X.......X...x-x-", s:"x..x-x.xx..x-x.x", c:"X...............", v:0.8, f4:{ m:"X...x...xxxxXXXX", s:"x..x-x.xrrrrXXXX" } }
        ] },
      B:{ bars:4, ch:"4 | 1 | 4 | 1",
        parts:[
          { p:"pad", i:"glass", v:0.07, c:2000, o:12 },
          { p:"arp", i:"harp", pat:"0:2 1 2 1' 2 1 0' 2", o:12, v:0.045 },
          { p:"bass", i:"pizz", pat:"R:8 F:8", v:0.22 },
          { p:"mel", i:"bell", m:"head", o:12, v:0.04, e:1 }
        ] }
    } },

  /* ---------- DERROTA: la cabeza que se hunde (4 compases) y después casi silencio ---------- */
  defeat: { bpm:56, key:57, scale:"aeolian", loop:1, echo:0,
    form:["A","T"],
    sec:{
      A:{ bars:4, ch:"1 | 6 | 4 | 5M:8 1:8",
        parts:[
          { p:"pad", i:"strings", v:0.1, c:700, dt:-40 },
          { p:"bass", i:"low", pat:"R:16", o:-12, v:0.14 },
          { p:"mel", i:"horn", m:"defe", o:0, v:0.07 },
          { p:"dr", m:"X...............", g:"X...............", every:4 }
        ] },
      T:{ bars:2, ch:"1 | 1",
        parts:[ { p:"pad", i:"strings", v:0.06, c:500, dt:-30, every:2 }, { p:"bass", i:"low", pat:"R:32", o:-12, v:0.07, every:2 } ] }
    } }
};

// GOLPES (stingers): frases cortas que se tocan sobre la TONALIDAD y el ACORDE que esté sonando
// (así una subida de nivel no desafina con la música). m = motivo (grados, en el modo `scale`
// desde la fundamental del acorde actual), i = instrumento, o = octava, arp = arpegio del acorde.
const MUSIC_STINGERS = {
  boss:    { bpm:150, scale:"phrygian", m:"1:2 5 6:4 5:8", i:"brass", o:-12, v:0.09, hit:"taiko", gong:1 },
  levelup: { bpm:200, arp:"0:1 1 2 0' 1' 2' 0'':4", i:"harp", o:12, v:0.1, top:"bell" },
  crystal: { bpm:120, scale:"lydian", m:"5':2 1'' 2'' 3'':6", i:"celesta", o:0, v:0.07, pad:"choir" },
  legend:  { bpm:150, scale:"ionian", m:"1:2 1:1 1 5:4 6:2 5:6", i:"brass", o:0, v:0.08, arp:"0:1 1 2 0' 1' 2'", top:"bell" },
  victory: { bpm:150, scale:"ionian", m:"5,:2 1 3 5:4 1':8", i:"brass", o:0, v:0.08, hit:"timp" }
};
