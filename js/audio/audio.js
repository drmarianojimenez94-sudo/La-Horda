"use strict";
/* ============================================================
   js/audio/audio.js
   Audio: música ORIGINAL sintetizada en vivo (Web Audio, sin archivos) y efectos de sonido.

   CADENA — voces de efectos -> sfxIn -> sfxGain (volumen) ─┐
            instrumentos -> bus A/B -> musicDuck -> musicGain ┼-> masterGain (mute) -> compresor de
            "pegamento" -> limitador -> recorte suave (techo -1,1 dBFS: nada satura) -> parlantes.
            ESPACIO: dos reverbs por convolución con impulsos SINTÉTICOS (generados por código, sin
            archivos): una sala corta para los efectos y una más larga para la música. Cada arena
            tiene su espacio (Gélida: caverna brillante; Minas: túnel seco; Abismo: enorme).

   MÚSICA — secuenciador con programación anticipada (lookahead): cuerdas (pad + ostinato en
   staccato + pizzicato) y percusión (bombo, redoblante, platillos, taikos), con MODOS:
   - "menu":    pizzicato tranquilo y pad, sin batería.
   - "wave":    oleadas: ostinato de cuerdas en semicorcheas + batería; se acelera y se llena con
                cada nivel de la arena.
   - "prelude": el último nivel antes del jefe: más lento, timbales, tensión.
   - "boss":    tenebroso: cuerdas graves en semitonos, taikos, pad con la "cuerda que se
                desafina" (la identidad del tema original del juego) y disonancias.
   - "victory" / "defeat": cierre.
   Cada ARENA le pone su identidad al mismo motor (MUSIC_ARENAS): tonalidad y modo, tempo, timbre
   del pad, batería propia y un instrumento característico (Ciudad: campana; Fábrica: yunques y
   pistones; Ruinas: flauta y bodhrán; Fúngico: pulsos húmedos; Gélida: campanas frías; Acuática:
   gotas; Laberinto: piedra y dron; Abismo: dron y oleajes al revés; Minas: picos; Infernal: tambores
   de guerra y metales). Los cambios de modo se cruzan entre dos buses (el viejo se apaga mientras
   entra el nuevo) y la entrada del jefe o la victoria tienen su golpe ("stinger").
   setMusicMode(mode, level) lo pide el juego.

   EFECTOS — cada uno con PRIORIDAD y separación mínima entre repeticiones; hay un tope de
   voces simultáneas y un tope de nodos por cuadro (los de baja prioridad se descartan cuando hay
   mucho ruido, así el celular no se traba). Están armados en CAPAS (transiente + cuerpo + cola),
   con una variación leve de tono y volumen en cada disparo para que no suenen repetidos, y el
   golpe cambia según el MATERIAL del enemigo (carne, húmedo, piedra, hueso, hielo, magia, fuego,
   metal): playSfx(tipo, enemigo). Los eventos grandes (rugido del jefe, ulti, muerte del jefe,
   caída del grupo) bajan un momento la música para oírse.
   Medido con tools/audio/t_audio_mix.js (pico, RMS, nodos, costo por cuadro).
   ============================================================ */
let audioCtx = null, masterGain = null, musicGain = null, sfxGain = null;
let musicBus = null, musicDuck = null, reverbSend = null, _noiseBuf = null;
// El silencio (botón 🔇) también se recuerda en este navegador.
let audioEnabled = (()=>{ try{ return localStorage.getItem("horda_mute")!=="1"; }catch(e){ return true; } })(), musicStarted = false;
// Volumen de música y de efectos (0..1), elegido por el jugador en la pausa y recordado en este navegador.
const AUDIO_BASE = { music:0.34, sfx:0.55 };
// Nivel maestro antes del compresor. Medido con tools/audio/t_audio_mix.js: la partida queda en
// ~-21 dBFS de RMS (se oye bien en el parlante de un celular) y el techo nunca pasa de -1,1 dBFS.
const AUDIO_MASTER = 1.4;
const audioVol = (()=>{ try{ const v = JSON.parse(localStorage.getItem("horda_vol")||"null"); if(v && typeof v.music==="number" && typeof v.sfx==="number") return v; }catch(e){} return { music:1, sfx:1 }; })();
// Nodos internos del motor (se rearman cada vez que se crea el contexto)
const AU = { sfxIn:null, wetLo:null, wetHi:null, roomIn:null, hallIn:null, hallMix:null, buses:[], cur:0, spaceKey:null, spaces:{}, spaceOrder:[], nz:{}, fr:0, frN:0 };
function setAudioVolume(kind, v){
  v = Math.max(0, Math.min(1, +v || 0)); audioVol[kind] = v;
  try{ localStorage.setItem("horda_vol", JSON.stringify(audioVol)); }catch(e){}
  const g = kind==="music" ? musicGain : sfxGain;
  if(g && audioCtx) g.gain.setTargetAtTime(AUDIO_BASE[kind]*v, audioCtx.currentTime, 0.05);
}

/* ---------------- ruido reutilizable (se genera una vez) ---------------- */
// Buffers de 1 s que se reproducen en bucle desde un punto al azar. Vienen ya "coloreados" (rosa,
// marrón, brillante, chisporroteo) para no tener que crear un filtro por cada capa.
function _mkNoise(){
  const sr = audioCtx.sampleRate, n = sr, mk = ()=>audioCtx.createBuffer(1, n, sr);
  const W = mk(), H = mk(), P = mk(), B = mk(), C = mk(), CH_ = mk();
  const w = W.getChannelData(0), h = H.getChannelData(0), p = P.getChannelData(0), b = B.getChannelData(0), c = C.getChannelData(0), ch = CH_.getChannelData(0);
  let b0=0, b1=0, b2=0, b3=0, b4=0, b5=0, br=0;
  for(let i=0;i<n;i++){
    const x = Math.random()*2-1; w[i] = x;
    // rosa (filtro de Paul Kellet) y marrón (integrado con fuga): más cuerpo, menos siseo
    b0 = 0.99886*b0 + x*0.0555179; b1 = 0.99332*b1 + x*0.0750759; b2 = 0.969*b2 + x*0.153852;
    b3 = 0.8665*b3 + x*0.3104856; b4 = 0.55*b4 + x*0.5329522; b5 = -0.7616*b5 - x*0.016898;
    p[i] = b0+b1+b2+b3+b4+b5+x*0.5362;
    br = (br + 0.02*x)/1.02; b[i] = br;
  }
  // chisporroteo: impulsos sueltos que decaen (hielo que se quiebra, fuego, piedra que cruje)
  for(let i=0;i<n;){ i += 20 + Math.floor(Math.random()*260); const a = (0.3+Math.random()*0.7)*(Math.random()<0.5?-1:1), L = 4+Math.floor(Math.random()*40);
    for(let k=0;k<L && i+k<n;k++) c[i+k] += a*(Math.random()*2-1)*(1-k/L); }
  // versiones brillantes (diferencia de muestras = paso-altos suave): chasquidos y cristal
  for(let i=1;i<n;i++){ h[i] = w[i]-w[i-1]; ch[i] = c[i]-c[i-1]; }
  const norm = d=>{ let m = 0; for(let i=0;i<n;i++) m = Math.max(m, Math.abs(d[i])); if(m) for(let i=0;i<n;i++) d[i] /= m; };
  norm(p); norm(b); norm(c); norm(h); norm(ch);
  AU.nz = { white:W, bright:H, pink:P, brown:B, crackle:C, crackleHi:CH_ };
  _noiseBuf = W;
}

/* ---------------- espacio: reverbs con impulso sintético ---------------- */
// Reflexiones tempranas + cola de ruido que decae (-60 dB al final) y se oscurece con el tiempo
// (las altas mueren antes, como en una sala real). Mono (la mitad de costo que estéreo); la
// reverb de la música se abre en estéreo con un retardo corto en un canal.
function _mkIR(len, tone, er, size){
  const sr = audioCtx.sampleRate, n = Math.max(256, Math.floor(sr*len)), ir = audioCtx.createBuffer(1, n, sr);
  const pre = Math.floor(sr*0.006*(size||1)), k = Math.exp(-6.9/n);
  const d = ir.getChannelData(0); let lp = 0, env = 1, a = 0;
  for(let i=pre;i<n;i++){
    if((i & 255)===0 || i===pre){ const fc = tone*(1-0.8*i/n); a = 1-Math.exp(-2*Math.PI*fc/sr); }
    lp += a*((Math.random()*2-1) - lp); d[i] = lp*env; env *= k;
  }
  for(let j=0;j<8;j++){ const q = pre + Math.floor(sr*(0.004 + Math.random()*0.045*(size||1))); if(q<n) d[q] += (er||0.4)*Math.pow(0.72, j)*(Math.random()<0.5?-1:1); }
  return ir;
}
// Cambia el espacio de la arena: el nuevo entra y el viejo se apaga y se desenchufa de la entrada
// (queda armado: volver a un espacio ya visto no cuesta nada; armar uno cuesta ~15 ms la primera vez).
function _spacePlug(s, on){
  if(!s || s.on===on) return; s.on = on;
  try{ if(on){ AU.hallIn.connect(s.h); AU.roomIn.connect(s.r); } else { AU.hallIn.disconnect(s.h); AU.roomIn.disconnect(s.r); } }catch(e){}
}
// Arma (sin enchufar) el espacio de una arena. Como mucho 3 armados: se tira el más viejo que no suene.
function _buildSpace(key){
  if(!audioCtx) return null;
  let s = AU.spaces[key];
  if(s){ AU.spaceOrder.splice(AU.spaceOrder.indexOf(key), 1); AU.spaceOrder.push(key); return s; }
  const P = MUSIC_ARENAS[key] || MUSIC_ARENAS._;
  s = AU.spaces[key] = { key, on:false, h:audioCtx.createConvolver(), r:audioCtx.createConvolver(), ho:audioCtx.createGain(), ro:audioCtx.createGain() };
  s.h.buffer = _mkIR(P.hall[0], P.hall[1], P.hall[2], P.hall[3]); s.r.buffer = _mkIR(P.room[0], P.room[1], P.room[2], P.room[3]);
  s.ho.gain.value = 0.0001; s.ro.gain.value = 0.0001;
  s.h.connect(s.ho); s.ho.connect(AU.hallMix); s.r.connect(s.ro); s.ro.connect(sfxGain);
  AU.spaceOrder.push(key);
  while(AU.spaceOrder.length > 3){
    const k = AU.spaceOrder.find(x=>x!==key && !AU.spaces[x].on); if(!k) break;
    AU.spaceOrder.splice(AU.spaceOrder.indexOf(k), 1); const d = AU.spaces[k]; delete AU.spaces[k];
    try{ d.ho.disconnect(); d.ro.disconnect(); d.h.disconnect(); d.r.disconnect(); }catch(e){}
  }
  return s;
}
// En los menús (Sala previa, elección de arena…) se arma de antemano el espacio de la arena elegida,
// así al entrar a la partida no hay que armarlo en el mismo cuadro en que arranca todo.
function _prewarmSpace(){
  const k = _musicArenaFor("wave");
  if(!audioCtx || AU.spaces[k]) return;
  clearTimeout(AU.warmT); AU.warmT = setTimeout(()=>{ if(audioCtx && !AU.spaces[k] && (typeof state==="undefined" || state!=="playing")) _buildSpace(k); }, 300);
}
function _setSpace(key){
  if(!audioCtx || AU.spaceKey===key) return;
  const now = audioCtx.currentTime, P = MUSIC_ARENAS[key] || MUSIC_ARENAS._, old = AU.spaces[AU.spaceKey];
  AU.spaceKey = key;
  if(old){
    old.ho.gain.cancelScheduledValues(now); old.ho.gain.setTargetAtTime(0.0001, now, 0.35);
    old.ro.gain.cancelScheduledValues(now); old.ro.gain.setTargetAtTime(0.0001, now, 0.25);
    setTimeout(()=>{ if(AU.spaceKey!==old.key && AU.spaces[old.key]===old) _spacePlug(old, false); }, 2600);
  }
  const s = _buildSpace(key);
  _spacePlug(s, true);
  for(const [g, v, secs] of [[s.ho.gain, 0.9*(P.wet||1), 0.6], [s.ro.gain, 0.75*(P.wet||1), 0.3]]){
    g.cancelScheduledValues(now); g.setValueAtTime(Math.max(0.0001, g.value), now); g.linearRampToValueAtTime(v, now+secs);
  }
}

// Recorte suave: lineal hasta 0,7 (-3 dBFS) y después se curva hasta un techo de 0,88 (-1,1 dBFS). La entrada
// se atenúa x0,5 antes, así la curva cubre hasta +6 dBFS: pase lo que pase, nada llega a saturar.
function _mkClipper(){
  const N = 2048, cv = new Float32Array(N), k = 0.7, c = 0.88;
  for(let i=0;i<N;i++){ const u = (i/(N-1)*2-1)*2, a = Math.abs(u); cv[i] = Math.sign(u)*(a<=k ? a : k + (c-k)*Math.tanh((a-k)/(c-k))); }
  const ws = audioCtx.createWaveShaper(); ws.curve = cv; ws.oversample = "none";
  const pre = audioCtx.createGain(); pre.gain.value = 0.5; pre.connect(ws);
  return { input:pre, output:ws };
}
function initAudio(){
  if(audioCtx){
    if(audioCtx.state==="suspended") audioCtx.resume().catch(()=>{});
    return;
  }
  try{
    audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    // maestro: compresor de "pegamento" -> limitador -> recorte suave de seguridad
    const glue = audioCtx.createDynamicsCompressor();
    glue.threshold.value = -16; glue.knee.value = 12; glue.ratio.value = 2.5; glue.attack.value = 0.006; glue.release.value = 0.25;
    const lim = audioCtx.createDynamicsCompressor();
    lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.0015; lim.release.value = 0.09;
    const clip = _mkClipper();
    glue.connect(lim); lim.connect(clip.input); clip.output.connect(audioCtx.destination);
    masterGain = audioCtx.createGain(); masterGain.gain.value = audioEnabled?AUDIO_MASTER:0; masterGain.connect(glue);
    // música: dos buses (A/B) para cruzar modos; cada uno con su envío a la reverb larga
    musicGain = audioCtx.createGain(); musicGain.gain.value = AUDIO_BASE.music*audioVol.music; musicGain.connect(masterGain);
    musicDuck = audioCtx.createGain(); musicDuck.gain.value = 1; musicDuck.connect(musicGain);
    AU.hallIn = audioCtx.createBiquadFilter(); AU.hallIn.type = "highpass"; AU.hallIn.frequency.value = 200;
    // salida de la reverb de música: mono -> estéreo (canal derecho 13 ms más tarde)
    AU.hallMix = audioCtx.createGain(); const mg = audioCtx.createChannelMerger(2), dl = audioCtx.createDelay(0.05); dl.delayTime.value = 0.013;
    AU.hallMix.connect(mg, 0, 0); AU.hallMix.connect(dl); dl.connect(mg, 0, 1); mg.connect(musicDuck);
    AU.buses = [0,1].map(()=>{ const dry = audioCtx.createGain(), rev = audioCtx.createGain(); dry.gain.value = 0; rev.gain.value = 0; dry.connect(musicDuck); rev.connect(AU.hallIn); return { dry, rev }; });
    AU.buses.forEach(b=>{ b.send = audioCtx.createGain(); b.send.gain.value = 0.32; b.send.connect(b.rev); });
    AU.cur = 0; musicBus = AU.buses[0].dry; reverbSend = AU.buses[0].send;
    // efectos: entrada común -> volumen; un poco de todo va a la sala corta, las colas van más
    sfxGain = audioCtx.createGain(); sfxGain.gain.value = AUDIO_BASE.sfx*audioVol.sfx; sfxGain.connect(masterGain);
    AU.sfxIn = audioCtx.createGain(); AU.sfxIn.connect(sfxGain);
    AU.roomIn = audioCtx.createBiquadFilter(); AU.roomIn.type = "highpass"; AU.roomIn.frequency.value = 280;
    const send = audioCtx.createGain(); send.gain.value = 0.1; AU.sfxIn.connect(send); send.connect(AU.roomIn);
    AU.wetLo = audioCtx.createGain(); AU.wetLo.gain.value = 0.3; AU.wetLo.connect(AU.roomIn);
    AU.wetHi = audioCtx.createGain(); AU.wetHi.gain.value = 0.75; AU.wetHi.connect(AU.roomIn);
    AU.spaceKey = null; AU.spaces = {}; AU.spaceOrder = []; AU.fr = 0; AU.frN = 0;
    _mkNoise();
    _setSpace("_");
    // En iPhone/Safari el contexto arranca "suspendido": resume() tiene que llamarse durante el
    // mismo toque del usuario que lo crea (por eso va acá adentro).
    if(audioCtx.state==="suspended") audioCtx.resume().catch(()=>{});
  }catch(e){ console.error("No se pudo crear el audio:", e); audioCtx = null; }
}
// iPhone/Safari: al volver de otra app, de una llamada o con la pantalla bloqueada, el contexto queda
// "suspended"/"interrupted" y el juego sigue mudo. Se reanuda al volver a la pestaña y en el próximo toque.
function _audioWake(){ if(audioCtx && audioCtx.state!=="running" && audioCtx.state!=="closed") audioCtx.resume().catch(()=>{}); }
document.addEventListener("visibilitychange", ()=>{ if(!document.hidden) _audioWake(); });
["touchend", "pointerup", "keydown"].forEach(ev=>document.addEventListener(ev, _audioWake, {passive:true, capture:true}));
function setAudioEnabled(on){
  audioEnabled = on;
  try{ localStorage.setItem("horda_mute", on ? "0" : "1"); }catch(e){}
  if(audioCtx && audioCtx.state==="suspended") audioCtx.resume().catch(()=>{});
  if(masterGain) masterGain.gain.setTargetAtTime(on?AUDIO_MASTER:0, audioCtx.currentTime, 0.05);
  const btn = document.getElementById("mute-btn");
  if(btn) btn.textContent = on ? "🔊" : "🔇";
}
// el ícono arranca como quedó guardado
(()=>{ const btn = document.getElementById("mute-btn"); if(btn && !audioEnabled) btn.textContent = "🔇"; })();

/* ---------------- bloques de síntesis ---------------- */
const _mf = m => 440*Math.pow(2, (m-69)/12);
// Envolvente sin clicks: arranca casi en cero, sube lineal, cae exponencial hasta casi cero.
function _env(g, t, a, peak, hold, rel){
  a = Math.max(0.0015, a); peak = Math.max(0.00011, peak);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t+a);
  if(hold>0) g.gain.setValueAtTime(peak, t+a+hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t+a+hold+Math.max(0.005, rel));
}
// Variación del disparo actual (la aplica playSfx a todas las capas, también a los ARENA_SFX):
// p = tono, v = volumen, n = nodos creados (para el tope por cuadro).
const _sv = { on:false, p:1, v:1, n:0 };
function _nz(t, buf, len, vol, dest, ftype, freq, q, attack, rate){
  let r = rate||1; attack = attack||0.002;
  if(_sv.on){ vol *= _sv.v; if(freq) freq *= _sv.p; r *= _sv.p; _sv.n += ftype ? 3 : 2; }
  const s = audioCtx.createBufferSource(); s.buffer = buf || _noiseBuf; s.loop = true; if(r!==1) s.playbackRate.value = r;
  const g = audioCtx.createGain(); _env(g, t, attack, vol, 0, len);
  if(ftype){ const f = audioCtx.createBiquadFilter(); f.type = ftype; f.frequency.value = Math.min(20000, freq); if(q) f.Q.value = q; s.connect(f); f.connect(g); }
  else s.connect(g);
  g.connect(dest||musicBus);
  s.start(t, Math.random()*0.9); s.stop(t+attack+len+0.05);
  return g;
}
function _noise(t, len, vol, ftype, freq, q, dest){ return _nz(t, _noiseBuf, len, vol, dest, ftype, freq, q); }
function _tone(t, type, f0, f1, len, vol, dest, attack){
  attack = attack||0.003;
  if(_sv.on){ f0 *= _sv.p; if(f1) f1 *= _sv.p; vol *= _sv.v; _sv.n += 2; }
  const o = audioCtx.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(f0, t); if(f1 && f1!==f0) o.frequency.exponentialRampToValueAtTime(f1, t+len);
  const g = audioCtx.createGain(); _env(g, t, attack, vol, 0, len);
  o.connect(g); g.connect(dest||musicBus); o.start(t); o.stop(t+attack+len+0.05);
  return g;
}

/* ---------------- instrumentos (música) ---------------- */
// Pad de cuerdas: dos osciladores desafinados por nota, filtro suave, ataque lento. `detune`:
// arranca desafinado y se afina (la cuerda que "se acuerda" su nota, del tema original).
function mPad(notes, t, dur, vol, cutoff, detune, wave, lfo){
  const f = audioCtx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = cutoff||1100; f.Q.value = lfo ? 4 : 0.5;
  const g = audioCtx.createGain(); _env(g, t, Math.min(0.6, dur*0.3), vol*Math.min(1, 3/notes.length), dur*0.45, dur*0.5);
  f.connect(g); g.connect(musicBus); g.connect(reverbSend);
  if(lfo){ // filtro que "respira" (Reino Fúngico)
    const l = audioCtx.createOscillator(), lg = audioCtx.createGain(); l.frequency.value = lfo; lg.gain.value = (cutoff||1100)*0.45;
    l.connect(lg); lg.connect(f.frequency); l.start(t); l.stop(t+dur+0.1);
  }
  for(const n of notes){
    for(const c of [-7, 7]){
      const o = audioCtx.createOscillator(); o.type = wave||"sawtooth";
      const fr = _mf(n);
      if(detune){ o.frequency.setValueAtTime(fr*Math.pow(2, detune/1200), t); o.frequency.exponentialRampToValueAtTime(fr, t+Math.min(2.2, dur*0.8)); }
      else o.frequency.value = fr;
      o.detune.value = c; o.connect(f); o.start(t); o.stop(t+dur+0.1);
    }
  }
}
// Cuerda en staccato / marcato (ostinato)
function mStac(n, t, len, vol, cutoff, type){
  const o = audioCtx.createOscillator(); o.type = type||"sawtooth"; o.frequency.value = _mf(n);
  const f = audioCtx.createBiquadFilter(); f.type = "lowpass"; f.frequency.setValueAtTime(cutoff||2200, t); f.frequency.exponentialRampToValueAtTime((cutoff||2200)*0.45, t+len);
  const g = audioCtx.createGain(); _env(g, t, 0.008, vol, len*0.3, len*0.7);
  o.connect(f); f.connect(g); g.connect(musicBus); g.connect(reverbSend);
  o.start(t); o.stop(t+len+0.05);
}
// Pizzicato (cuerda pulsada)
function mPizz(n, t, vol){
  const o = audioCtx.createOscillator(); o.type = "triangle"; o.frequency.value = _mf(n);
  const g = audioCtx.createGain(); _env(g, t, 0.004, vol, 0, 0.32);
  o.connect(g); g.connect(musicBus); g.connect(reverbSend); o.start(t); o.stop(t+0.4);
}
// Campana FM: portadora + moduladora inarmónica (ratio 3,5 = campana fría; 1,41 = campana de iglesia)
function iBell(n, t, vol, dur, ratio, bright){
  const f = _mf(n), c = audioCtx.createOscillator(), m = audioCtx.createOscillator(), mg = audioCtx.createGain(), g = audioCtx.createGain();
  c.frequency.value = f; m.frequency.value = f*(ratio||3.5);
  mg.gain.setValueAtTime(f*(bright||2), t); mg.gain.exponentialRampToValueAtTime(f*0.04, t+dur*0.6);
  m.connect(mg); mg.connect(c.frequency);
  _env(g, t, 0.003, vol, 0, dur);
  c.connect(g); g.connect(musicBus); g.connect(reverbSend);
  c.start(t); m.start(t); c.stop(t+dur+0.1); m.stop(t+dur+0.1);
}
// Pulso húmedo (Reino Fúngico): "blup" resonante que cae de tono
function iPulse(n, t, vol, len){
  const f = _mf(n), o = audioCtx.createOscillator(); o.type = "sawtooth";
  o.frequency.setValueAtTime(f*1.5, t); o.frequency.exponentialRampToValueAtTime(f, t+0.05);
  const fl = audioCtx.createBiquadFilter(); fl.type = "lowpass"; fl.Q.value = 13;
  fl.frequency.setValueAtTime(Math.min(8000, f*9), t); fl.frequency.exponentialRampToValueAtTime(f*1.3, t+len*0.8);
  const g = audioCtx.createGain(); _env(g, t, 0.004, vol, 0, len);
  o.connect(fl); fl.connect(g); g.connect(musicBus); g.connect(reverbSend); o.start(t); o.stop(t+len+0.08);
}
// Gota (Acuática, Minas, Fúngico): senoidal cortita que sube de tono
function iDrip(t, vol, f){ _tone(t, "sine", f, f*1.7, 0.07, vol).connect(reverbSend); }
// Yunque / metal (Fábrica, Minas): parciales inarmónicos que suenan un rato
function iAnvil(t, vol, f){
  _tone(t, "triangle", f, f*0.996, 0.4, vol).connect(reverbSend);
  _tone(t, "sine", f*2.76, f*2.75, 0.22, vol*0.45); _tone(t, "sine", f*5.4, f*5.38, 0.1, vol*0.25);
  _nz(t,AU.nz.bright,0.018,vol*0.9,musicBus);
}
// Flauta (Ruinas Célticas): senoidal con vibrato que entra de a poco y un soplo al principio
function iFlute(n, t, len, vol){
  const f = _mf(n), o = audioCtx.createOscillator(); o.type = "sine"; o.frequency.value = f;
  const lfo = audioCtx.createOscillator(), lg = audioCtx.createGain(); lfo.frequency.value = 5.3;
  lg.gain.setValueAtTime(0.0001, t); lg.gain.linearRampToValueAtTime(f*0.012, t+len*0.6);
  lfo.connect(lg); lg.connect(o.frequency);
  const g = audioCtx.createGain(); _env(g, t, 0.04, vol, len*0.45, len*0.5);
  o.connect(g); g.connect(musicBus); g.connect(reverbSend);
  o.start(t); lfo.start(t); o.stop(t+len+0.1); lfo.stop(t+len+0.1);
  _nz(t, AU.nz.pink, 0.07, vol*0.35, reverbSend, "bandpass", f*2, 2);
}
// Metales de guerra (Infernal): pila de sierras con el filtro que se abre y se cierra
function iBrass(notes, t, len, vol, cutoff){
  const fl = audioCtx.createBiquadFilter(); fl.type = "lowpass"; fl.Q.value = 2.5;
  fl.frequency.setValueAtTime(180, t); fl.frequency.exponentialRampToValueAtTime(cutoff||1600, t+0.07); fl.frequency.exponentialRampToValueAtTime((cutoff||1600)*0.35, t+len);
  const g = audioCtx.createGain(); _env(g, t, 0.025, vol, len*0.35, len*0.65);
  fl.connect(g); g.connect(musicBus); g.connect(reverbSend);
  for(const n of notes) for(const d of [-9, 9]){ const o = audioCtx.createOscillator(); o.type = "sawtooth"; o.frequency.value = _mf(n); o.detune.value = d; o.connect(fl); o.start(t); o.stop(t+len+0.1); }
}
// Dron grave con quinta (Laberinto, Abismo, Acuática)
function iDrone(n, t, len, vol, cutoff){
  const fl = audioCtx.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = cutoff||300;
  const g = audioCtx.createGain(); _env(g, t, len*0.35, vol, len*0.3, len*0.35);
  fl.connect(g); g.connect(musicBus); g.connect(reverbSend);
  for(const m of [n, n+7]){ const o = audioCtx.createOscillator(); o.type = "sawtooth"; o.frequency.value = _mf(m); o.detune.value = m===n ? -6 : 6; o.connect(fl); o.start(t); o.stop(t+len+0.1); }
}
// Oleaje "al revés" (Abismo): ruido que crece y se corta justo en el tiempo fuerte
function iSwell(t, len, vol, f){
  const g = _nz(t, AU.nz.pink, 0.04, vol, musicBus, "bandpass", f||700, 1.2, len);
  g.connect(reverbSend);
}
function dKick(t, v){ _tone(t, "sine", 130, 42, 0.28, 0.9*v); }
function dSnare(t, v){ _noise(t, 0.16, 0.35*v, "bandpass", 1900, 0.8).connect(reverbSend); _tone(t, "triangle", 200, 150, 0.08, 0.25*v); }
function dHat(t, v){ _noise(t, 0.035, 0.12*v, "highpass", 7500); }
function dTaiko(t, v){ _tone(t, "sine", 95, 52, 0.55, 0.95*v); _noise(t, 0.12, 0.2*v, "lowpass", 600).connect(reverbSend); }
function dTimp(t, v){ const g = _tone(t, "sine", 82, 74, 0.9, 0.6*v); g.connect(reverbSend); }
function dTom(t, f, v){ _tone(t, "sine", f, f*0.6, 0.3, 0.7*v); _nz(t,AU.nz.brown,0.06,0.25*v,musicBus,0,0,0,0,0.82); }
function dBlock(t, f, v){ _nz(t, AU.nz.white, 0.035, 0.3*v, musicBus, "bandpass", f, 7); _tone(t, "sine", f*0.5, f*0.45, 0.05, 0.12*v); }
// Batería según la arena (kit): el mismo ritmo, otro "cuarto de máquinas"
function kKick(t, v, P){
  if(P.kit==="wet" || P.kit==="sub"){ _tone(t, "sine", 110, 38, 0.36, 0.85*v); return; }
  if(P.kit==="glass"){ _tone(t, "sine", 120, 45, 0.22, 0.7*v); return; }
  dKick(t, v); if(P.kit==="war") dTom(t, 62, 0.45*v);
}
function kSnare(t, v, P){
  switch(P.kit){
    case "forge": iAnvil(t, 0.07*v, 470); _nz(t, AU.nz.pink, 0.1, 0.22*v, musicBus, "bandpass", 1500, 1.2); return;
    case "mine":  iAnvil(t, 0.06*v, 880); _nz(t, AU.nz.crackle, 0.12, 0.3*v, musicBus, "bandpass", 1200, 0.8); return;
    case "tribal": dTom(t, 175, 0.75*v); _nz(t, AU.nz.pink, 0.06, 0.12*v, musicBus, "bandpass", 1100, 1); return;
    case "wet": _nz(t, AU.nz.pink, 0.14, 0.32*v, musicBus, "lowpass", 750, 7).connect(reverbSend); _tone(t, "sine", 360, 120, 0.1, 0.18*v); return;
    case "glass": _nz(t,AU.nz.bright,0.08,0.22*v,musicBus).connect(reverbSend); _tone(t, "sine", 2640, 2600, 0.12, 0.04*v); return;
    case "sub": _nz(t, AU.nz.pink, 0.2, 0.34*v, musicBus, "lowpass", 800).connect(reverbSend); return;
    case "stone": dBlock(t, 620, 1.1*v); _tone(t, "sine", 140, 70, 0.12, 0.3*v); return;
    case "void": _tone(t, "sine", 70, 40, 0.5, 0.5*v); _nz(t,AU.nz.brown,0.4,0.2*v,reverbSend,0,0,0,0,0.45); return;
    case "war": dSnare(t, v); dTaiko(t, 0.45*v); return;
    default: dSnare(t, v);
  }
}
function kHat(t, v, P){
  switch(P.kit){
    case "forge": _nz(t, AU.nz.white, 0.018, 0.14*v, musicBus, "bandpass", 5200, 9); return; // tic mecánico
    case "tribal": _nz(t, AU.nz.white, 0.05, 0.07*v, musicBus, "bandpass", 6500, 1.5); return; // sonajero
    case "wet": if(v>0.8) iDrip(t, 0.02*v, 1200+Math.random()*900); return;
    case "glass": _tone(t, "sine", 6200+Math.random()*1500, 0, 0.025, 0.018*v); return;
    case "stone": dBlock(t, 1800, 0.35*v); return;
    case "mine": if(v>0.8) dBlock(t, 2400, 0.25*v); return;
    case "sub": case "void": return;
    default: dHat(t, v);
  }
}

/* ---------------- armonía y patrones ---------------- */
// cada acorde: [bajo, [voces del pad]] (en La; cada arena transpone)
const CH = {
  Am:[45,[57,60,64]], F:[41,[57,60,65]], C:[48,[55,60,64]], G:[43,[55,59,62]],
  Dm:[38,[57,62,65]], E:[40,[56,59,64]], Em:[40,[55,59,64]], Bb:[46,[58,62,65]],
  D:[38,[57,62,66]], Gm:[43,[55,58,62]], Ebm:[39,[58,63,66]], Am9:[45,[57,60,64,71]],
  Fmaj7:[41,[57,60,64]], Em7:[40,[55,59,62]], Cm:[48,[55,60,63]]
};
const MUSIC_MODES = {
  menu:    {bpm:74,  prog:["Am","Em","F","E"]},
  wave:    {bpm:110, prog:["Am","F","C","G"]},
  prelude: {bpm:88,  prog:["Dm","Am","Bb","E"]},
  boss:    {bpm:96,  prog:["Am","Am","Bb","E"]},
  victory: {bpm:92,  prog:["C","G","Am","F"]},
  defeat:  {bpm:60,  prog:["Am","Dm","Am","E"]}
};
// IDENTIDAD POR ARENA (CAMPAIGN_ORDER): tr = transposición (tonalidad), tempo = multiplicador,
// bright = brillo del pad, padWave = timbre, kit = batería, prog = progresiones propias por modo,
// layer = instrumento característico, hall / room = espacio [largo s, brillo Hz, reflexiones, tamaño].
const PENTA = [0,3,5,7,10,12,15,17];
// frases de la flauta de las Ruinas: [paso, grado de la pentatónica, duración en pasos]
const FLUTE_PH = [[[0,4,4],[4,3,2],[6,2,2],[8,1,6],[14,0,2]], [[0,2,3],[3,3,1],[4,4,4],[8,5,3],[11,4,1],[12,2,4]]];
// bajo del jefe en semitonos (cuerdas graves que se arrastran)
const BOSS_LOW = [0,0,1,0, 0,1,3,1, 0,0,1,0, 6,5,3,1];
const MUSIC_ARENAS = {
  _:        { tr:0, tempo:1, bright:1, kit:"std", hall:[2.0, 5200, 0.35, 1.2], room:[0.7, 6500, 0.5, 0.8] },
  // Ciudad Maldita — La eólico; campana de la ciudad que dobla
  ciudad:   { tr:0, tempo:1, bright:1, kit:"std", hall:[1.9, 4800, 0.45, 1.2], room:[0.8, 6000, 0.55, 1],
    layer(md, s, bar, t, sd, bass, pad){ if(s===0 && (bar%2===0 || md==="boss")) iBell(bass+12, t, md==="boss" ? 0.08 : 0.06, 4, 1.41, 1.4); } },
  // Fábrica Sin Fin — Sol frigio, más rápida; pistones en onda cuadrada, yunques y vapor
  fortaleza:{ tr:-2, tempo:1.07, bright:1.1, kit:"forge", hall:[1.3, 6500, 0.6, 0.8], room:[0.55, 7500, 0.7, 0.6],
    prog:{ wave:["Am","Bb","Am","G"], prelude:["Am","Bb","Gm","Bb"], boss:["Am","Bb","Am","E"] },
    layer(md, s, bar, t, sd, bass){
      if(s%2===0) mStac(bass + (s%8===4 ? 7 : 0), t, sd*0.7, 0.06, 420, "square");
      if(s===6 || s===14) iAnvil(t, 0.045, 620);
      if(bar%4===3 && s===8) _nz(t, AU.nz.white, sd*5, 0.04, reverbSend, "highpass", 3500, 0, sd*2);
    } },
  // Ruinas Célticas / Élficas — Si dórico; flauta pentatónica y bodhrán
  bosque:   { tr:2, tempo:0.95, bright:0.9, kit:"tribal", hall:[1.7, 4200, 0.25, 1.4], room:[0.6, 5000, 0.3, 1],
    prog:{ wave:["Am","D","Am","G"], prelude:["Am","G","D","E"], boss:["Am","D","F","E"] },
    layer(md, s, bar, t, sd, bass, pad){
      const ph = FLUTE_PH[bar%2], root = 69 + 2 + (md==="boss" ? -12 : 0);
      for(const p of ph) if(p[0]===s) iFlute(root + PENTA[p[1]], t, sd*p[2]*0.95, md==="boss" ? 0.05 : 0.04);
    } },
  // Reino Fúngico — Si bemol, lento y oscuro; pulsos húmedos, pad que respira, gotas
  micelial: { tr:1, tempo:0.86, bright:0.55, padWave:"square", padLfo:0.35, kit:"wet", hall:[1.9, 2600, 0.3, 1.1], room:[0.75, 3000, 0.4, 0.9], wet:1.1,
    prog:{ wave:["Am","Am","F","E"], prelude:["Am","F","Bb","E"], boss:["Am","Bb","Am","Bb"] },
    layer(md, s, bar, t, sd, bass, pad){
      if(s===0 || s===3 || s===6 || s===10 || s===13) iPulse(pad[(s/3|0)%pad.length]-12, t, md==="boss" ? 0.07 : 0.055, sd*2.4);
      if(s===8 && bar%2===0) iDrip(t, 0.025, 1300+Math.random()*900);
    } },
  // Arena Gélida — Do, acordes abiertos; campanas frías y viento
  hielo:    { tr:3, tempo:0.94, bright:1.35, padWave:"triangle", kit:"glass", hall:[2.6, 9000, 0.3, 1.5], room:[0.9, 10000, 0.45, 1.2],
    prog:{ wave:["Am9","Fmaj7","C","Em7"], prelude:["Am9","Fmaj7","Dm","E"], boss:["Am","Fmaj7","Bb","E"] },
    layer(md, s, bar, t, sd, bass, pad){
      if(s%4===0) iBell(pad[(s/4)%pad.length]+24, t, 0.03, 2.4, 3.5, 2.4);
      if(md==="boss" && s===8 && bar%2===1) iBell(pad[2]+13, t, 0.03, 3, 3.5, 3);
      if(s===0 && bar%4===0) _nz(t, AU.nz.pink, sd*10, 0.025, reverbSend, "bandpass", 900, 3, sd*6);
    } },
  // Arena Acuática — Sol sostenido, lenta y sumergida; pad de vidrio, batería bajo el agua,
  // burbujas en pentatónica y, con el jefe, el canto de algo enorme que se desliza allá abajo
  acuatica: { tr:-1, tempo:0.9, bright:1.1, padWave:"triangle", kit:"sub", hall:[2.4, 5500, 0.25, 1.4], room:[0.8, 5000, 0.35, 1.1], wet:1.1,
    prog:{ wave:["Am","Em","F","G"], prelude:["Am","F","Dm","E"], boss:["Am","F","E","E"] },
    layer(md, s, bar, t, sd, bass, pad){
      if(s%2===1 && Math.random()<0.45) iDrip(t, 0.022, _mf(81 - 1 + PENTA[(Math.random()*6)|0]));
      if(s===0 && bar%2===0) iDrone(bass, t, sd*32, 0.03, 900);
      if(md==="boss" && s===4 && bar%2===0) _tone(t, "sine", _mf(pad[0]), _mf(pad[0]-5), sd*20, 0.05, reverbSend, sd*6);
    } },
  // Laberinto — Do sostenido frigio; percusión de piedra y dron de quinta
  laberinto:{ tr:4, tempo:1, bright:0.85, kit:"stone", hall:[1.4, 4000, 0.7, 0.9], room:[0.6, 4500, 0.8, 0.7],
    prog:{ wave:["Am","Bb","Gm","Am"], prelude:["Am","Bb","Am","E"], boss:["Am","Bb","E","Am"] },
    layer(md, s, bar, t, sd, bass){
      if(s===0 && bar%2===0) iDrone(bass-12, t, sd*32, 0.06, 300);
      if(s===2 || s===5 || s===11) dBlock(t, 1000 + (s%3)*260, 0.5);
      if(bar%4===3 && s===12) _nz(t, AU.nz.brown, sd*4, 0.08, reverbSend, "bandpass", 500, 1.5, sd);
    } },
  // Abismo — Fa, tritonos; dron del vacío, oleajes al revés y un susurro agudo
  abismo:   { tr:-4, tempo:0.85, bright:0.7, kit:"void", hall:[2.8, 3500, 0.2, 1.8], room:[1.0, 4000, 0.3, 1.4], wet:1.15,
    prog:{ wave:["Am","Ebm","Am","Bb"], prelude:["Am","Ebm","Bb","E"], boss:["Am","Ebm","Bb","E"] },
    layer(md, s, bar, t, sd, bass, pad){
      if(s===0 && bar%2===0) iDrone(bass-12, t, sd*32, 0.07, 220);
      if(s===0 && bar%2===1) iSwell(t, sd*16, 0.06, 600);
      if(s===8 && bar%4===2) _tone(t, "sine", _mf(pad[0]+18), 0, 1.6, 0.02, reverbSend, 0.4);
    } },
  // Minas Profundas — Fa sostenido armónico; picos contra la roca y tambor de trabajo
  minas:    { tr:-3, tempo:1.04, bright:0.9, kit:"mine", hall:[1.3, 3800, 0.65, 0.8], room:[0.5, 4200, 0.75, 0.6],
    prog:{ wave:["Am","Dm","E","Am"], prelude:["Am","F","Dm","E"], boss:["Am","F","E","E"] },
    layer(md, s, bar, t, sd){
      if(s%4===0) dTom(t, 72, 0.5);
      if(s===7 || s===15) iAnvil(t, 0.04, 1040 + (bar%2)*140);
      if(s%2===1 && Math.random()<0.08) iDrip(t, 0.018, 1100+Math.random()*800);
    } },
  // Arena Infernal — Mi frigio dominante, la más rápida; tambores de guerra, metales y toms
  infernal: { tr:-5, tempo:1.1, bright:1.2, kit:"war", hall:[2.2, 4000, 0.4, 1.4], room:[0.7, 4500, 0.5, 1],
    prog:{ wave:["Am","Bb","Am","E"], prelude:["Am","Bb","Dm","E"], boss:["Am","Bb","E","E"] },
    layer(md, s, bar, t, sd, bass, pad){
      if(s===0 || s===10) iBrass([pad[0]-12, pad[0]-5], t, sd*3, 0.05, 1500);
      if(s===3 || s===6 || s===11 || s===14) dTaiko(t, 0.4);
      if(md==="boss" && s>=9 && s%2===1) dTom(t, 120-(s-9)*9, 0.5);
    } }
};
const M = {mode:"off", level:1, next:0, step:0, bar:0, timer:null, pending:null, arena:"_", P:MUSIC_ARENAS._};
function _stepDur(){
  const md = MUSIC_MODES[M.mode]; let bpm = md ? md.bpm : 80;
  if(M.mode==="wave" || M.mode==="prelude" || M.mode==="boss") bpm *= (M.P.tempo||1);
  if(M.mode==="wave") bpm += Math.min(18, (M.level-1)*2);
  return 60/bpm/4;
}
function _playStep(s, bar, t){
  const md = MUSIC_MODES[M.mode]; if(!md) return;
  const P = M.P || MUSIC_ARENAS._, arenaOn = M.mode!=="menu";
  const prog = (arenaOn && P.prog && P.prog[M.mode]) || md.prog;
  const ch0 = CH[prog[bar % prog.length]] || CH.Am, tr = arenaOn ? (P.tr||0) : 0;
  const bass = ch0[0]+tr, pad = ch0[1].map(n=>n+tr);
  const sd = _stepDur(), barLen = sd*16, lvl = M.level, br = arenaOn ? (P.bright||1) : 1, pw = arenaOn ? P.padWave : null, pl = arenaOn ? P.padLfo : 0;
  if(M.mode==="menu"){
    if(s===0) mPad(pad, t, barLen*1.05, 0.1, 1000);
    if(s%2===0){ const arp = [pad[0], pad[1], pad[2], pad[1]+12, pad[2], pad[1], pad[0]+12, pad[2]]; mPizz(arp[(s/2)|0]+12, t, 0.24); }
    if(s===0) mStac(bass, t, barLen*0.9, 0.16, 500, "triangle");
  } else if(M.mode==="wave"){
    if(s===0) mPad(pad, t, barLen*1.02, 0.045, 1300*br, 0, pw, pl);
    // ostinato de cuerdas en semicorcheas (acentos en cada tiempo)
    const tones = [pad[0], pad[2], pad[1], pad[2]];
    const n = (s>=12 && bar%2===1) ? [pad[2]+12, pad[1]+12, pad[2], pad[1]][s-12] : tones[s%4];
    mStac(n+12, t, sd*0.9, s%4===0 ? 0.075 : 0.045, 2600*br);
    if(s%2===0) mStac(bass + (s%8===6 ? 12 : 0), t, sd*1.6, 0.11, 600);
    // batería: más llena cuanto más alto el nivel
    if(s===0 || s===8 || (lvl>=4 && s===10) || (lvl>=7 && s===3)) kKick(t, 1, P);
    if(s===4 || s===12) kSnare(t, 1, P);
    if(bar%4===3 && s>=13) kSnare(t, 0.5 + (s-13)*0.2, P);
    if(lvl>=6 ? true : s%2===0) kHat(t, s%4===2 ? 1 : 0.6, P);
  } else if(M.mode==="prelude"){
    if(s===0) mPad(pad, t, barLen*1.05, 0.11, 1000*br, -35, pw, pl);
    if(s%4===0) mStac(bass, t, sd*3, 0.2, 500);
    if(s===0 || (bar%2===1 && s===12)) dTimp(t, 1.3);
    if(s%4===2) mStac(pad[2]+12, t, sd*0.8, 0.07, 1800*br);
  } else if(M.mode==="boss"){
    // pad oscuro que se desafina y se afina (tema original), cuerdas graves en semitonos
    if(s===0) mPad(bar%2===0 ? pad : [pad[0]-12, pad[1], pad[2]+1], t, barLen*1.05, 0.055, 800*br, -55, pw, pl);
    if(s%2===0 || s>=12) mStac(bass + BOSS_LOW[s], t, sd*1.4, s%4===0 ? 0.13 : 0.08, 700);
    if(s===0 || s===3 || s===6 || s===8 || s===11 || s===14) dTaiko(t, s===0||s===8 ? 0.85 : 0.5);
    if(s===12) { kSnare(t, 0.9, P); kKick(t, 0.8, P); }
    if(s%4===2) kHat(t, 0.4, P);
    // chillido de cuerdas agudas disonantes cada 4 compases
    if(bar%4===3 && s===8) mStac(pad[2]+25, t, barLen*0.5, 0.03, 3200);
  } else if(M.mode==="victory"){
    if(s===0) mPad(pad.map(x=>x+12), t, barLen*1.05, 0.09, 1600);
    if(s%2===0){ const arp = [pad[0], pad[1], pad[2], pad[1]]; mPizz(arp[(s/2)%4]+24, t, 0.22); }
    if(s===0) dTimp(t, 0.6);
    if(bar>=7 && s===15) _musicRequest("menu", 1, t);
  } else if(M.mode==="defeat"){
    if(s===0) mPad(pad, t, barLen*1.1, 0.11, 700, -40);
    if(s===0) mStac(bass-12, t, barLen*0.9, 0.2, 320, "triangle");
  }
  // instrumento característico de la arena (oleadas, preludio y jefe)
  if(P.layer && (M.mode==="wave" || M.mode==="boss" || M.mode==="prelude") && (M.mode!=="prelude" || s%2===0)) P.layer(M.mode, s, bar, t, sd, bass, pad, lvl);
}
// Golpe de entrada (stinger) del jefe y de la victoria
function _sting(kind, t){
  const tr = M.P.tr||0;
  if(kind==="boss"){
    _tone(t, "sine", 72, 28, 1.3, 0.85); dTaiko(t, 1); dTaiko(t+0.18, 0.6);
    iBrass([33+tr, 34+tr, 45+tr], t, 1.4, 0.09, 1100);
    _nz(t,AU.nz.bright,1.8,0.04,reverbSend,0,0,0, 0.02);
  } else if(kind==="victory"){
    _nz(t,AU.nz.bright,1.4,0.05,musicBus,0,0,0, 0.35).connect(reverbSend);
    dTimp(t, 1); dTimp(t+0.12, 0.7);
  }
}
function _schedTick(){
  if(!audioCtx || M.mode==="off") return;
  const now = audioCtx.currentTime;
  if(M.next < now - 0.3) M.next = now + 0.05; // la pestaña estuvo pausada: retoma sin ráfaga
  while(M.next < now + 0.14){
    if(M.pending && M.pending.at <= M.next + 0.001){ const p = M.pending; M.pending = null; _musicSwitch(p, M.next); }
    // durante el cruce no se programan notas del modo viejo (sus colas se apagan en el otro bus);
    // en silencio (🔇) no se crean nodos
    if(!M.pending && audioEnabled){ try{ _playStep(M.step, M.bar, M.next); }catch(e){} }
    M.next += _stepDur();
    if(++M.step >= 16){ M.step = 0; M.bar++; }
  }
}
function _musicArenaFor(mode){
  if(mode==="menu") return "_";
  return (typeof currentArena!=="undefined" && MUSIC_ARENAS[currentArena]) ? currentArena : "_";
}
// Cuánto dura cada cruce: fo = fundido del viejo, gap = cuándo entra el nuevo, fi = su fundido
function _musicTrans(from, to){
  if(to==="boss") return {fo:0.45, gap:0.2, fi:0.3, sting:"boss"};
  if(to==="victory") return {fo:1.1, gap:0.45, fi:0.35, sting:"victory"};
  if(to==="defeat") return {fo:1.0, gap:0.6, fi:1.6};
  if(to==="prelude") return {fo:1.2, gap:0.6, fi:1.4};
  if(from==="boss" && to==="wave") return {fo:1.2, gap:0.7, fi:1.4};
  return {fo:0.7, gap:0.4, fi:1.0};
}
function _fadeOut(g, t, secs){
  if(g.cancelAndHoldAtTime) g.cancelAndHoldAtTime(t); else g.cancelScheduledValues(t);
  g.setTargetAtTime(0, t, secs/4);
}
function _musicRequest(mode, level, now){
  const arena = _musicArenaFor(mode);
  if(M.mode==="off"){ M.pending = {mode, level, arena, at:now+0.05, fi:0.8}; M.next = now+0.05; M.mode = mode; return; }
  if(M.pending){ Object.assign(M.pending, {mode, level, arena}, _musicTrans(M.mode, mode), {at:M.pending.at}); return; }
  const tr = _musicTrans(M.mode, mode), b = AU.buses[AU.cur];
  _fadeOut(b.dry.gain, now, tr.fo); _fadeOut(b.rev.gain, now, tr.fo*1.4);
  AU.cur ^= 1; // el modo nuevo entra por el otro bus
  M.pending = {mode, level, arena, at:now+tr.gap, fi:tr.fi, sting:tr.sting};
}
function _musicSwitch(p, t){
  M.mode = p.mode; M.level = p.level||1; M.step = 0; M.bar = 0;
  M.arena = p.arena; M.P = MUSIC_ARENAS[p.arena] || MUSIC_ARENAS._;
  const b = AU.buses[AU.cur]; musicBus = b.dry; reverbSend = b.send;
  for(const g of [b.dry.gain, b.rev.gain]){ g.cancelScheduledValues(t); g.setValueAtTime(0.0001, t); g.linearRampToValueAtTime(1, t+(p.fi||0.8)); }
  _setSpace(p.arena);
  if(p.sting && audioEnabled) _sting(p.sting, t);
}
// El juego pide el clima: "menu" | "wave" | "prelude" | "boss" | "victory" | "defeat".
function setMusicMode(mode, level){
  if(mode==="normal") mode = "wave"; // el Abismo lo pide así al caer el Carcelero
  if(!audioCtx || !MUSIC_MODES[mode]) { M.wanted = mode; M.wantedLevel = level; return; }
  const arena = _musicArenaFor(mode);
  if(M.mode===mode && !M.pending && M.arena===arena){ M.level = level||M.level; return; }
  if(M.pending && M.pending.mode===mode && M.pending.arena===arena){ M.pending.level = level||1; return; }
  _musicRequest(mode, level, audioCtx.currentTime);
}
// Pausa: la música baja; al volver, sube.
function musicOnState(s){
  if(!audioCtx) return;
  const now = audioCtx.currentTime;
  musicDuck.gain.setTargetAtTime(s==="paused" ? 0.35 : 1, now, 0.12);
  if(s==="gameover"){ playSfx("playerDeath"); setMusicMode("defeat"); }
  else if(s==="playing"){
    // entrar a jugar desde un menú (p.ej. la Arena Divina, que no pasa por beginLevel)
    const cur = M.pending ? M.pending.mode : M.mode;
    if(cur==="menu" || cur==="defeat" || cur==="off") setMusicMode("wave", typeof runLevel==="number" ? runLevel : 1);
  }
  else if(s!=="paused" && s!=="buff" && s!=="victory") setMusicMode("menu");
  if(s!=="playing" && s!=="paused") _prewarmSpace();
}
function startMusic(){
  initAudio();
  if(!audioCtx){ showBanner("🔇 El navegador bloqueó el audio"); return; }
  if(musicStarted) return;
  musicStarted = true;
  M.timer = setInterval(_schedTick, 25);
  setMusicMode(M.wanted || "menu", M.wantedLevel);
}
// Compatibilidad con la versión anterior (la usaba el tema de fondo)
function playDetuneString(baseFreq, cents, duration, delay){
  if(!audioCtx) return; const t = audioCtx.currentTime + (delay||0);
  const m = 69 + 12*Math.log2(baseFreq/440); mPad([m], t, duration, 0.08, 850, cents);
}

/* ---------------- efectos ---------------- */
// p = prioridad (1 baja … 5 imprescindible), gap = ms mínimos entre dos del mismo tipo
const SFX_CFG = {
  hit:{p:1,gap:70}, crit:{p:2,gap:80}, kill:{p:1,gap:55}, heavy:{p:2,gap:90}, cast:{p:2,gap:60},
  eliteKill:{p:3,gap:120}, bigKill:{p:4,gap:300}, bossRoar:{p:5,gap:700}, bossDeath:{p:5,gap:1500},
  hurt:{p:3,gap:140}, hurtHeavy:{p:4,gap:250}, ready:{p:2,gap:120}, deny:{p:2,gap:150}, boom:{p:3,gap:120},
  clear:{p:4,gap:800}, heal:{p:2,gap:200}, shield:{p:2,gap:200}, potion:{p:2,gap:120},
  levelup:{p:4,gap:400}, victory:{p:5,gap:1000}, ult:{p:4,gap:300},
  playerDeath:{p:5,gap:2000}, // cae el grupo (pantalla de derrota)
  // El Libertador / Eren (sintetizados, sin archivos de audio)
  musket:{p:3,gap:120}, musketOfficer:{p:4,gap:150}, blade:{p:1,gap:70}, bugle:{p:4,gap:800}, gallop:{p:3,gap:400},
  hook:{p:2,gap:90}, roar:{p:4,gap:600}, stomp:{p:3,gap:140}, punch:{p:2,gap:90}, thunder:{p:5,gap:800},
  // Botín: cada rareza suena distinto (la revelación se oye aunque no se mire la pantalla)
  chestDrop:{p:4,gap:300}, chestShake:{p:3,gap:90}, chestOpen:{p:5,gap:300},
  lootCommon:{p:2,gap:60}, lootRare:{p:3,gap:80}, lootVeryRare:{p:4,gap:120}, lootLegend:{p:5,gap:300},
  lootMythic:{p:5,gap:500}, lootSet:{p:5,gap:500}, lootUnique:{p:5,gap:1200},
  // Combate: estados y gore
  freeze:{p:2,gap:120}, shatter:{p:3,gap:110}, splat:{p:1,gap:45}, gib:{p:2,gap:90}, burnDeath:{p:1,gap:80}, zap:{p:2,gap:90},
  threat:{p:4,gap:900}, emergencyHeal:{p:4,gap:500}, skillHit:{p:2,gap:70},
  crystal:{p:5,gap:800} // cristal de un Guardián
};
// Afinados (melodías, avisos de interfaz, botín): sin variación de tono, así no desafinan.
const SFX_TUNED = { ready:1, deny:1, clear:1, levelup:1, victory:1, heal:1, shield:1, potion:1, bugle:1, threat:1, emergencyHeal:1,
  crystal:1, chestOpen:1, lootCommon:1, lootRare:1, lootVeryRare:1, lootLegend:1, lootMythic:1, lootSet:1, lootUnique:1 };
const _sfxLast = {}; let _sfxVoices = [];
const SFX_MAX_VOICES = 12;
// Tope de nodos nuevos por cuadro (~16 ms) según prioridad: crear nodos cuesta en el hilo principal
// (~0,05 ms cada uno en escritorio, varias veces más en un celular). Lo imprescindible siempre pasa.
const SFX_FRAME_NODES = [0, 24, 34, 48, 1e9, 1e9];
function _duck(amount, ms){
  const now = audioCtx.currentTime;
  musicDuck.gain.cancelScheduledValues(now);
  musicDuck.gain.setTargetAtTime(amount, now, 0.03);
  musicDuck.gain.setTargetAtTime(state==="paused" ? 0.35 : 1, now + ms/1000, 0.25);
}
function _wet(g, hi){ g.connect(hi ? AU.wetHi : AU.wetLo); return g; }
// Material del golpe (carne, húmedo, piedra, hueso, caparazón, hielo, magia, fuego, metal). El juego
// pasa una ETIQUETA de texto (sfxMatTag(enemigo)): así viaja liviana a los invitados en red.
const SFX_MAT = { flesh:"flesh", rot:"wet", leaf:"wet", water:"wet", micSpore:"wet", micRoot:"wet", micBlood:"wet", ink:"wet", wet:"wet",
  chitin:"shell", shell:"shell", bone:"bone", wood:"bone", rock:"stone", stone:"stone", sand:"stone",
  ice:"ice", crystal:"ice", spirit:"magic", shadow:"magic", arcane:"magic", holy:"magic", shock:"magic", magic:"magic",
  ember:"fire", micEmber:"fire", fire:"fire", metal:"metal", armor:"metal" };
// "material" o "material|fuego/rayo/hielo" (el tipo de daño del golpe, si es elemental)
function sfxMatTag(e){
  if(!e || typeof e!=="object") return null;
  let m = e.material;
  if(!m){ try{ if(typeof animProfileOf==="function") m = animProfileOf(e).material; }catch(err){} }
  const k = e._lastDmgKind;
  return (SFX_MAT[m] || "flesh") + (k==="fire" || k==="lightning" || k==="ice" ? "|"+k : "");
}
function _sfxMat(x){
  if(!x) return null;
  if(typeof x==="object") x = sfxMatTag(x);
  return SFX_MAT[String(x).split("|")[0]] || "flesh";
}
// Arma del que pega (el jugador): filo, contundente, magia o proyectil
const SFX_WEAPON = { guerrero:"blade", musashi:"blade", asesino:"blade", segador:"blade", libertador:"blade",
  tanque:"blunt", eren:"blunt", mago:"magic", nigromante:"magic", profeta:"magic", axiom:"magic", soporte:"magic", cazadora:"shot" };
function _sub(t, f0, len, vol, D){ // sub-grave corto + su armónico (para que se sienta en parlantes chicos)
  _tone(t, "sine", f0, Math.max(28, f0*0.5), len, vol, D, 0.004);
  _tone(t, "triangle", f0*2, f0*0.9, len*0.45, vol*0.22, D, 0.003);
}
function _click(t, vol, D){ _nz(t, AU.nz.bright, 0.012, vol, D, 0, 0, 0, 0.0015); } // transiente (sin filtro: ruido ya brillante)
// Capa de material: k = intensidad (0,6 roce … 1,8 crítico/pesado)
function _matHit(t, mat, k, D){
  const W = AU.nz;
  switch(mat){
    case "wet":   _tone(t,"sine",420,110,0.12,0.2*k,D); _nz(t,W.pink,0.14,0.34*k,D,"lowpass",700,6); _tone(t+0.035,"sine",900,1500,0.05,0.05*k,D); break;
    case "stone": _nz(t,W.crackle,0.12,0.4*k,D,"bandpass",1500,0.8); _nz(t,W.brown,0.16,0.34*k,D,0,0,0,0,0.82); _tone(t,"sine",115,48,0.1,0.28*k,D); break;
    case "bone":  _nz(t,W.white,0.035,0.24*k,D,"bandpass",2300,5); _tone(t,"triangle",540,300,0.05,0.15*k,D); _nz(t,W.crackleHi,0.07,0.2*k,D); break;
    case "shell": _nz(t,W.white,0.03,0.24*k,D,"bandpass",1900,4); _tone(t,"triangle",380,210,0.06,0.18*k,D); _nz(t,W.brown,0.1,0.26*k,D,0,0,0,0,0.73); break;
    case "ice":   _nz(t,W.crackleHi,0.1,0.34*k,D); _wet(_tone(t,"sine",2600,2520,0.18,0.06*k,D),0); _tone(t,"sine",3900,3820,0.12,0.04*k,D); _nz(t,W.bright,0.04,0.12*k,D); break;
    case "magic": _wet(_tone(t,"triangle",880,1320,0.16,0.07*k,D),1); _tone(t,"triangle",1330,1980,0.14,0.045*k,D); _nz(t,W.white,0.1,0.14*k,D,"bandpass",2600,3); _tone(t,"sine",220,110,0.1,0.18*k,D); break;
    case "fire":  _nz(t,W.crackleHi,0.24,0.22*k,D); _nz(t,W.brown,0.18,0.3*k,D,0,0,0,0,0.55); _tone(t,"sine",150,60,0.08,0.22*k,D); break;
    case "metal": { const f = 560 + Math.random()*260;
      _wet(_tone(t,"triangle",f,f*0.995,0.26,0.1*k,D),0); _tone(t,"sine",f*2.76,f*2.74,0.16,0.05*k,D); _tone(t,"sine",f*5.4,f*5.37,0.09,0.03*k,D); _click(t,0.22*k,D,3000); break; }
    default:      _tone(t,"sine",150,55,0.09,0.32*k,D); _nz(t,W.brown,0.1,0.34*k,D); if(k>1.2) _nz(t,W.white,0.03,0.12*k,D,"bandpass",1800,1.5); // carne
  }
}
function _weaponHit(t, w, k, D){
  const W = AU.nz;
  if(w==="blade"){ _nz(t,W.white,0.05,0.11*k,D,"bandpass",3800,2.5); _tone(t,"triangle",1250,700,0.04,0.035*k,D); }
  else if(w==="blunt"){ _tone(t,"sine",95,45,0.12,0.3*k,D); _nz(t,W.brown,0.08,0.2*k,D,0,0,0,0,0.45); }
  else if(w==="magic"){ _tone(t,"triangle",700,1050,0.08,0.06*k,D); }
  else if(w==="shot"){ _nz(t,W.white,0.03,0.14*k,D,"bandpass",2500,3); _tone(t,"triangle",340,180,0.04,0.1*k,D); }
  else _tone(t,"triangle",320,90,0.08,0.16*k,D);
}
// Tipo de daño con el que murió / se le pegó (fuego, rayo, hielo): un toque extra
function _kindHit(t, x, D){
  if(x && typeof x==="object") x = sfxMatTag(x);
  const k = typeof x==="string" ? x.split("|")[1] : null;
  if(k==="fire") _nz(t,AU.nz.crackleHi,0.18,0.14,D);
  else if(k==="lightning") _nz(t,AU.nz.white,0.08,0.1,D,"bandpass",3400,4);
  else if(k==="ice") _tone(t,"sine",2900,2850,0.1,0.035,D);
}
function playSfx(type, src){
  if(!audioCtx) return;
  const cfg = SFX_CFG[type] || ARENA_SFX[type]; if(!cfg) return;
  const nowMs = performance.now();
  if(_sfxLast[type] && nowMs - _sfxLast[type] < cfg.gap) return;
  const t0 = audioCtx.currentTime;
  _sfxVoices = _sfxVoices.filter(v=>v > t0);
  if(_sfxVoices.length >= SFX_MAX_VOICES && cfg.p < 3) return; // mucho ruido: solo pasa lo importante
  const fr = (nowMs/16)|0; if(fr!==AU.fr){ AU.fr = fr; AU.frN = 0; }
  if(AU.frN >= (SFX_FRAME_NODES[cfg.p]||1e9)) return;             // este cuadro ya creó demasiados nodos
  _sfxLast[type] = nowMs;
  if(!audioEnabled) return; // en silencio no se crea nada
  const D = AU.sfxIn, W = AU.nz;
  // variación por disparo: tono ±5% en golpes (±3% en los de arena, 0 en los afinados), volumen 0..-1,7 dB
  const pv = SFX_TUNED[type] ? 0 : (SFX_CFG[type] ? 0.05 : 0.03);
  _sv.on = true; _sv.p = 1 + (Math.random()*2-1)*pv; _sv.v = 1 - Math.random()*0.18; _sv.n = 0;
  let len = 0.15;
  try{
  switch(type){
    case "hit": { const m = _sfxMat(src) || "flesh", w = (typeof player!=="undefined" && player && SFX_WEAPON[player.classKey]) || null;
      _click(t0,0.1,D,2600); _weaponHit(t0,w,1,D); _matHit(t0,m,0.8,D); len=0.12; break; }
    case "crit": { const m = _sfxMat(src) || "flesh";
      _click(t0,0.3,D,3200); _wet(_nz(t0,W.white,0.2,0.2,D,"bandpass",3300,14),0); _matHit(t0,m,1.5,D); _sub(t0,72,0.16,0.34,D); _kindHit(t0,src,D); len=0.22; break; }
    case "heavy": _click(t0,0.18,D,1800); _sub(t0,62,0.28,0.55,D); _tone(t0,"triangle",180,70,0.12,0.2,D); _wet(_nz(t0,W.brown,0.2,0.3,D,0,0,0,0,0.82),0); len=0.3; break;
    case "kill": { const m = _sfxMat(src) || "flesh";
      _matHit(t0,m,1,D); _tone(t0+0.01,"triangle",620,300,0.06,0.08,D); _kindHit(t0,src,D); len=0.14; break; }
    case "eliteKill": { const m = _sfxMat(src) || "flesh";
      _click(t0,0.25,D,2000); _sub(t0,58,0.36,0.5,D); _matHit(t0,m,1.6,D);
      _wet(_tone(t0+0.02,"triangle",660,660,0.16,0.12,D),1); _wet(_tone(t0+0.09,"triangle",990,990,0.24,0.1,D),1); len=0.4; break; }
    case "bigKill":
      _click(t0,0.3,D,1500); _sub(t0,52,0.75,0.7,D); _wet(_nz(t0,W.brown,0.6,0.4,D,0,0,0,0,0.59),1); _nz(t0+0.02,W.crackle,0.35,0.18,D,"bandpass",1400,0.7);
      _wet(_tone(t0+0.05,"triangle",1320,1320,0.5,0.07,D),1); _duck(0.6,500); len=0.8; break;
    case "bossRoar": {
      // gruñido: dos sierras desafinadas con temblor, formante nasal, cola en la sala y sub-grave
      const f = audioCtx.createBiquadFilter(); f.type="lowpass"; f.Q.value = 3; f.frequency.setValueAtTime(380,t0); f.frequency.linearRampToValueAtTime(900,t0+0.25); f.frequency.exponentialRampToValueAtTime(300,t0+1.2);
      const g = audioCtx.createGain(); _env(g,t0,0.12,0.5*_sv.v,0.4,0.75); f.connect(g); g.connect(D); _wet(g,1);
      const lfo = audioCtx.createOscillator(); lfo.frequency.value = 23; const lg = audioCtx.createGain(); lg.gain.value = 9; lfo.connect(lg);
      for(const d of [0, 7]){ const o = audioCtx.createOscillator(); o.type="sawtooth"; o.detune.value = d*3; o.frequency.setValueAtTime(78*_sv.p+d,t0); o.frequency.exponentialRampToValueAtTime(46*_sv.p,t0+1.1); lg.connect(o.frequency); o.connect(f); o.start(t0); o.stop(t0+1.35); }
      lfo.start(t0); lfo.stop(t0+1.35); _sv.n += 8;
      _nz(t0,W.pink,1.0,0.22,D,"bandpass",620,2.5,0.08); _nz(t0,W.brown,1.1,0.3,D,"lowpass",300,0,0.1); _sub(t0,48,1.0,0.4,D);
      _duck(0.45,1100); len=1.35; break;
    }
    case "bossDeath":
      _click(t0,0.35,D,1400); _sub(t0,90,1.6,0.75,D); _wet(_nz(t0,W.brown,1.8,0.45,D,0,0,0,0,0.44),1); _nz(t0,W.crackle,0.9,0.2,D,"bandpass",1000,0.6);
      _wet(_tone(t0,"sawtooth",220,38,1.4,0.1,D),1);
      _sub(t0+0.38,60,0.8,0.5,D); _nz(t0+0.38,W.brown,0.9,0.3,D,0,0,0,0,0.64); // se desploma
      [440,523.25,659.25].forEach((f,i)=>_wet(_tone(t0+0.6+i*0.09,"triangle",f,f,1.5,0.09,D,0.08),1));
      _duck(0.3,2100); len=2.2; break;
    case "playerDeath":
      _sub(t0,70,1.2,0.6,D); _wet(_nz(t0,W.brown,1.4,0.3,D,"lowpass",400,0,0.02),1);
      [[220,207.65],[261.63,246.94],[311.13,293.66]].forEach((p,i)=>_wet(_tone(t0+0.15+i*0.05,"sawtooth",p[0],p[1],1.6,0.035,D,0.1),1));
      _tone(t0+0.5,"sine",55,50,0.12,0.4,D); _tone(t0+0.85,"sine",55,50,0.12,0.3,D); // último latido
      _duck(0.25,1600); len=1.8; break;
    case "hurt": _tone(t0,"square",160,50,0.13,0.16,D); _matHit(t0,"flesh",0.7,D); len=0.15; break;
    case "hurtHeavy": _click(t0,0.2,D,1500); _tone(t0,"square",170,48,0.16,0.18,D); _sub(t0,85,0.3,0.5,D); _matHit(t0,"flesh",1.2,D); _duck(0.75,260); len=0.32; break;
    case "ready": _tone(t0,"sine",880,880,0.06,0.1,D); _tone(t0+0.06,"sine",1320,1320,0.09,0.1,D); len=0.16; break;
    case "deny": { _tone(t0,"square",190,170,0.07,0.08,D); _tone(t0+0.08,"square",140,130,0.08,0.08,D); len=0.17; break; }
    case "boom": _click(t0,0.3,D,1500); _sub(t0,58,0.42,0.55,D); _wet(_nz(t0,W.brown,0.45,0.4,D,0,0,0,0,0.68),1); _nz(t0+0.03,W.crackleHi,0.6,0.14,D); len=0.65; break;
    case "clear": [523.25,659.25,783.99,1046.5].forEach((f,i)=>_wet(_tone(t0+i*0.07,"triangle",f,f,0.35,0.18,D),1)); _noise(t0+0.25,0.4,0.05,"highpass",6000,0,D); len=0.7; break;
    case "heal": _tone(t0,"sine",660,990,0.25,0.14,D,0.02); _wet(_tone(t0,"sine",990,1485,0.25,0.07,D,0.02),1); len=0.27; break;
    case "shield": _tone(t0,"triangle",440,440,0.3,0.12,D,0.02); _wet(_tone(t0,"triangle",660,660,0.3,0.08,D,0.02),0); len=0.32; break;
    case "potion": _tone(t0,"sine",520,880,0.2,0.3,D,0.03); _tone(t0+0.02,"sine",1400,2100,0.06,0.04,D); len=0.22; break;
    case "levelup": case "victory": {
      const notes = type==="victory" ? [392,523.25,659.25,783.99,1046.5] : [523.25,659.25,783.99,1046.5];
      notes.forEach((f,i)=>_wet(_tone(t0+i*0.1,"triangle",f,f,0.5,0.26,D,0.02),1));
      if(type==="victory") _duck(0.4,900);
      len=0.1*notes.length+0.5; break;
    }
    case "cast": {
      const o = audioCtx.createOscillator(); const g = audioCtx.createGain(); const f = audioCtx.createBiquadFilter(); f.type="lowpass"; f.Q.value = 4;
      f.frequency.setValueAtTime(700,t0); f.frequency.exponentialRampToValueAtTime(2600,t0+0.15);
      o.type="sawtooth"; o.frequency.setValueAtTime(260*_sv.p,t0); o.frequency.exponentialRampToValueAtTime(520*_sv.p,t0+0.15);
      _env(g,t0,0.02,0.18*_sv.v,0,0.2); o.connect(f); f.connect(g); g.connect(D); _wet(g,0); o.start(t0); o.stop(t0+0.28); _sv.n += 3;
      _nz(t0,W.white,0.18,0.06,D,"bandpass",3000,2,0.06); len=0.26; break;
    }
    // ---- El Libertador ----
    case "musket": case "musketOfficer": {
      const big = type==="musketOfficer";
      _click(t0,0.35,D,1200); _wet(_noise(t0,big?0.32:0.22,big?0.5:0.4,"lowpass",big?1800:2400,0,D),1); _sub(t0,big?120:150,big?0.3:0.22,big?0.5:0.36,D);
      _noise(t0+0.02,0.5,0.08,"highpass",3000,0,D); if(big) _tone(t0+0.03,"triangle",880,660,0.18,0.08,D);
      len = big?0.5:0.4; break;
    }
    case "blade": _noise(t0,0.07,0.16,"bandpass",4200,2,D); _tone(t0,"triangle",1400,700,0.06,0.05,D); len=0.08; break;
    case "bugle": {
      // clarín: arpegio de caballería (do-mi-sol-do)
      [392,523.25,659.25,783.99].forEach((f,i)=>{ _wet(_tone(t0+i*0.12,"square",f,f,0.14,0.06,D,0.01),1); _tone(t0+i*0.12,"sawtooth",f,f,0.14,0.035,D,0.01); });
      _wet(_tone(t0+0.48,"square",783.99,783.99,0.42,0.07,D,0.02),1); len=0.95; break;
    }
    case "gallop": for(let i=0;i<6;i++){ _noise(t0+i*0.11,0.05,0.2,"lowpass",420,0,D); _tone(t0+i*0.11,"sine",90,60,0.06,0.2,D); } len=0.7; break;
    // ---- Eren ----
    case "hook": _noise(t0,0.18,0.12,"bandpass",2600,6,D); _tone(t0,"sawtooth",1800,520,0.16,0.04,D); len=0.2; break;
    case "punch": _click(t0,0.2,D,1500); _sub(t0,110,0.14,0.42,D); _noise(t0,0.1,0.2,"lowpass",800,0,D); len=0.16; break;
    case "stomp": _click(t0,0.25,D,1200); _sub(t0,66,0.38,0.6,D); _wet(_nz(t0,W.brown,0.32,0.36,D,0,0,0,0,0.45),1); _duck(0.7,250); len=0.4; break;
    case "roar": {
      const o = audioCtx.createOscillator(); o.type="sawtooth"; o.frequency.setValueAtTime(110*_sv.p,t0); o.frequency.exponentialRampToValueAtTime(60*_sv.p,t0+0.9);
      const f = audioCtx.createBiquadFilter(); f.type="lowpass"; f.frequency.value=700;
      const g = audioCtx.createGain(); _env(g,t0,0.08,0.45*_sv.v,0.3,0.6);
      o.connect(f); f.connect(g); g.connect(D); _wet(g,1); o.start(t0); o.stop(t0+1.05); _sv.n += 3;
      _noise(t0,0.8,0.2,"bandpass",600,0.8,D); _duck(0.5,800); len=1.0; break;
    }
    case "thunder": _click(t0,0.35,D,2000); _wet(_nz(t0,W.brown,1.1,0.55,D,0,0,0,0,1.0),1); _sub(t0,60,1.0,0.55,D); _nz(t0,W.crackleHi,0.5,0.3,D); _duck(0.35,1000); len=1.1; break;
    // ---- Botín ----
    case "chestDrop": _sub(t0,80,0.3,0.5,D); _noise(t0,0.2,0.25,"lowpass",600,0,D); _matHit(t0+0.02,"bone",0.6,D); len=0.32; break;
    case "chestShake": _noise(t0,0.06,0.12,"bandpass",900,2,D); _tone(t0,"square",140,120,0.05,0.05,D); len=0.07; break;
    case "crystal": _wet(_tone(t0,"sine",660,660,0.5,0.1,D),1); _tone(t0+0.08,"sine",990,990,0.6,0.08,D); _wet(_tone(t0+0.16,"triangle",1320,1760,0.8,0.07,D,0.05),1); _noise(t0,0.5,0.08,"highpass",5000,0,D); len=0.9; break;
    case "chestOpen": _noise(t0,0.35,0.22,"bandpass",700,1.2,D); _tone(t0,"triangle",220,440,0.3,0.1,D); _wet(_tone(t0+0.18,"sine",880,1320,0.4,0.08,D,0.04),1); len=0.6; break;
    case "lootCommon": _tone(t0,"triangle",520,520,0.08,0.08,D); len=0.1; break;
    case "lootRare": _tone(t0,"triangle",660,660,0.1,0.1,D); _wet(_tone(t0+0.08,"triangle",990,990,0.14,0.09,D),0); len=0.24; break;
    case "lootVeryRare": [659.25,830.6,987.8].forEach((f,i)=>_wet(_tone(t0+i*0.07,"triangle",f,f,0.22,0.12,D,0.01),0)); len=0.4; break;
    case "lootLegend":
      [523.25,659.25,783.99,1046.5,1318.5].forEach((f,i)=>_wet(_tone(t0+i*0.08,"triangle",f,f,0.5,0.16,D,0.01),1));
      _sub(t0,130,0.6,0.3,D); _noise(t0+0.35,0.6,0.06,"highpass",6500,0,D); _duck(0.4,1100); len=1.0; break;
    case "lootMythic":
      _tone(t0,"sawtooth",65,40,1.2,0.3,D,0.05); _wet(_noise(t0,0.9,0.25,"lowpass",500,0,D),1);
      [392,466.2,587.3,784,932.3].forEach((f,i)=>_wet(_tone(t0+0.3+i*0.11,"triangle",f,f,0.8,0.16,D,0.02),1));
      _duck(0.25,1800); len=1.6; break;
    case "lootSet":
      [523.25,659.25,783.99].forEach((f,i)=>_wet(_tone(t0+i*0.12,"sine",f,f,0.9,0.14,D,0.04),1));
      [1046.5,1318.5,1568].forEach((f,i)=>_tone(t0+0.45+i*0.1,"triangle",f,f,0.9,0.1,D,0.02));
      _noise(t0+0.4,1.0,0.07,"highpass",7000,0,D); _duck(0.25,1800); len=1.6; break;
    case "lootUnique":
      _tone(t0,"sine",55,30,2.2,0.5,D,0.2); _noise(t0,1.8,0.25,"lowpass",380,0,D);
      [261.6,311.1,392,466.2,523.25,622.3,784].forEach((f,i)=>_wet(_tone(t0+0.6+i*0.14,"triangle",f,f,1.4,0.15,D,0.03),1));
      _tone(t0+1.6,"sawtooth",1046.5,1046.5,1.2,0.05,D,0.1); _noise(t0+1.5,1.4,0.08,"highpass",7500,0,D);
      _duck(0.15,3200); len=3.0; break;
    // ---- Estados y gore ----
    case "freeze": _tone(t0,"triangle",1800,2600,0.18,0.07,D); _nz(t0,W.crackleHi,0.15,0.14,D); len=0.2; break;
    case "shatter": _matHit(t0,"ice",1.4,D); _wet(_tone(t0+0.02,"triangle",3100,1400,0.15,0.05,D),1); _tone(t0,"sine",120,55,0.1,0.2,D); len=0.25; break;
    case "splat": _matHit(t0,"wet",0.8,D); len=0.13; break;
    case "gib": _matHit(t0,"flesh",1.5,D); _matHit(t0+0.04,"wet",0.9,D); _nz(t0+0.05,W.crackle,0.08,0.16,D,"bandpass",1600,2); len=0.22; break;
    case "burnDeath": _matHit(t0,"fire",1.1,D); _nz(t0,W.pink,0.35,0.1,D,"bandpass",1200,0.6,0.05); len=0.38; break;
    case "zap": _nz(t0,W.white,0.12,0.14,D,"bandpass",3200,4); _tone(t0,"square",1400,700,0.1,0.05,D); _nz(t0,W.crackleHi,0.1,0.14,D); len=0.14; break;
    case "skillHit": _click(t0,0.14,D,2000); _sub(t0,105,0.13,0.3,D); _nz(t0,W.pink,0.08,0.16,D,"bandpass",1400,1); len=0.14; break;
    case "threat": _tone(t0,"square",330,330,0.09,0.09,D); _tone(t0+0.12,"square",247,247,0.12,0.09,D); len=0.26; break;
    case "emergencyHeal": _tone(t0,"sine",440,880,0.35,0.18,D,0.02); _wet(_tone(t0+0.05,"sine",660,1320,0.35,0.1,D,0.02),1); _noise(t0,0.3,0.05,"highpass",6000,0,D); len=0.4; break;
    default:
      // sonidos propios de una arena (ARENA_SFX, p.ej. La Fortaleza): mismo control de prioridad/voces
      if(cfg.play) len = cfg.play(t0, D) || 0.3;
      break;
    case "ult":
      _click(t0,0.25,D,1500); _tone(t0,"sawtooth",85,42,0.7,0.36,D,0.06); _sub(t0,55,0.5,0.4,D); _wet(_nz(t0,W.pink,0.6,0.18,D,"bandpass",900,0.7),1); _wet(_tone(t0+0.1,"triangle",660,990,0.5,0.08,D,0.05),1);
      _duck(0.5,700); len=0.75; break;
  }
  } finally { _sv.on = false; AU.frN += _sv.n; }
  _sfxVoices.push(t0+len);
}
