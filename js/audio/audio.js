"use strict";
/* ============================================================
   js/audio/audio.js
   Audio: música ORIGINAL sintetizada en vivo (Web Audio, sin archivos) y efectos de sonido.

   MÚSICA — secuenciador con programación anticipada (lookahead): cuerdas (pad + ostinato en
   staccato + pizzicato) y percusión (bombo, redoblante, platillos, taikos), con MODOS:
   - "menu":    pizzicato tranquilo y pad, sin batería.
   - "wave":    oleadas: ostinato de cuerdas en semicorcheas + batería; se acelera y se llena con
                cada nivel de la arena.
   - "prelude": el último nivel antes del jefe: más lento, timbales, tensión.
   - "boss":    tenebroso: cuerdas graves en semitonos, taikos, pad con la "cuerda que se
                desafina" (la identidad del tema original del juego) y disonancias.
   - "victory" / "defeat": cierre.
   Los cambios de modo se hacen con un fundido corto; setMusicMode(mode, level) lo pide el juego.

   EFECTOS — cada uno con PRIORIDAD y separación mínima entre repeticiones; hay un tope de
   voces simultáneas (los de baja prioridad se descartan cuando hay mucho ruido) y los eventos
   grandes (rugido del jefe, ulti, muerte del jefe) bajan un momento la música para oírse.
   ============================================================ */
let audioCtx = null, masterGain = null, musicGain = null, sfxGain = null;
let musicBus = null, musicDuck = null, reverbSend = null, _noiseBuf = null;
let audioEnabled = true, musicStarted = false;

function _mkReverb(){
  const len = Math.floor(audioCtx.sampleRate*2.2), ir = audioCtx.createBuffer(2, len, audioCtx.sampleRate);
  for(let c=0;c<2;c++){ const d = ir.getChannelData(c); for(let i=0;i<len;i++) d[i] = (Math.random()*2-1)*Math.pow(1-i/len, 3); }
  const conv = audioCtx.createConvolver(); conv.buffer = ir; return conv;
}
function initAudio(){
  if(audioCtx){
    if(audioCtx.state==="suspended") audioCtx.resume().catch(()=>{});
    return;
  }
  try{
    audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    const comp = audioCtx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
    comp.connect(audioCtx.destination);
    masterGain = audioCtx.createGain(); masterGain.gain.value = audioEnabled?1:0; masterGain.connect(comp);
    musicGain = audioCtx.createGain(); musicGain.gain.value = 0.34; musicGain.connect(masterGain);
    musicDuck = audioCtx.createGain(); musicDuck.gain.value = 1; musicDuck.connect(musicGain);
    musicBus = audioCtx.createGain(); musicBus.gain.value = 0; musicBus.connect(musicDuck);
    const rev = _mkReverb(); const revOut = audioCtx.createGain(); revOut.gain.value = 0.9;
    reverbSend = audioCtx.createGain(); reverbSend.gain.value = 0.32;
    reverbSend.connect(rev); rev.connect(revOut); revOut.connect(musicDuck);
    sfxGain = audioCtx.createGain(); sfxGain.gain.value = 0.55; sfxGain.connect(masterGain);
    _noiseBuf = audioCtx.createBuffer(1, audioCtx.sampleRate, audioCtx.sampleRate);
    const nd = _noiseBuf.getChannelData(0); for(let i=0;i<nd.length;i++) nd[i] = Math.random()*2-1;
    // En iPhone/Safari el contexto arranca "suspendido": resume() tiene que llamarse durante el
    // mismo toque del usuario que lo crea (por eso va acá adentro).
    if(audioCtx.state==="suspended") audioCtx.resume().catch(()=>{});
  }catch(e){ console.error("No se pudo crear el audio:", e); audioCtx = null; }
}
function setAudioEnabled(on){
  audioEnabled = on;
  if(audioCtx && audioCtx.state==="suspended") audioCtx.resume().catch(()=>{});
  if(masterGain) masterGain.gain.setTargetAtTime(on?1:0, audioCtx.currentTime, 0.05);
  const btn = document.getElementById("mute-btn");
  if(btn) btn.textContent = on ? "🔊" : "🔇";
}

/* ---------------- instrumentos (música) ---------------- */
const _mf = m => 440*Math.pow(2, (m-69)/12);
function _env(g, t, a, peak, hold, rel){
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t+a);
  if(hold>0) g.gain.setValueAtTime(peak, t+a+hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t+a+hold+rel);
}
// Pad de cuerdas: dos sierras desafinadas por nota, filtro suave, ataque lento. `detune`:
// arranca desafinado y se afina (la cuerda que "se acuerda" su nota, del tema original).
function mPad(notes, t, dur, vol, cutoff, detune){
  const f = audioCtx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = cutoff||1100; f.Q.value = 0.5;
  const g = audioCtx.createGain(); _env(g, t, Math.min(0.6, dur*0.3), vol, dur*0.45, dur*0.5);
  f.connect(g); g.connect(musicBus); g.connect(reverbSend);
  for(const n of notes){
    for(const c of [-7, 7]){
      const o = audioCtx.createOscillator(); o.type = "sawtooth";
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
function _noise(t, len, vol, ftype, freq, q, dest){
  const s = audioCtx.createBufferSource(); s.buffer = _noiseBuf;
  const f = audioCtx.createBiquadFilter(); f.type = ftype; f.frequency.value = freq; if(q) f.Q.value = q;
  const g = audioCtx.createGain(); _env(g, t, 0.002, vol, 0, len);
  s.connect(f); f.connect(g); g.connect(dest||musicBus);
  s.start(t, Math.random()*0.5); s.stop(t+len+0.05);
  return g;
}
function _tone(t, type, f0, f1, len, vol, dest, attack){
  const o = audioCtx.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(f0, t); if(f1) o.frequency.exponentialRampToValueAtTime(f1, t+len);
  const g = audioCtx.createGain(); _env(g, t, attack||0.003, vol, 0, len);
  o.connect(g); g.connect(dest||musicBus); o.start(t); o.stop(t+len+0.05);
  return g;
}
function dKick(t, v){ _tone(t, "sine", 130, 42, 0.28, 0.9*v); }
function dSnare(t, v){ _noise(t, 0.16, 0.35*v, "bandpass", 1900, 0.8).connect(reverbSend); _tone(t, "triangle", 200, 150, 0.08, 0.25*v); }
function dHat(t, v){ _noise(t, 0.035, 0.12*v, "highpass", 7500); }
function dTaiko(t, v){ _tone(t, "sine", 95, 52, 0.55, 0.95*v); _noise(t, 0.12, 0.2*v, "lowpass", 600).connect(reverbSend); }
function dTimp(t, v){ const g = _tone(t, "sine", 82, 74, 0.9, 0.6*v); g.connect(reverbSend); }

/* ---------------- armonía y patrones ---------------- */
// cada acorde: [bajo, [voces del pad]]
const CH = {
  Am:[45,[57,60,64]], F:[41,[57,60,65]], C:[48,[55,60,64]], G:[43,[55,59,62]],
  Dm:[38,[57,62,65]], E:[40,[56,59,64]], Em:[40,[55,59,64]], Bb:[46,[58,62,65]]
};
const MUSIC_MODES = {
  menu:    {bpm:74,  prog:["Am","Em","F","E"]},
  wave:    {bpm:110, prog:["Am","F","C","G"]},
  prelude: {bpm:88,  prog:["Dm","Am","Bb","E"]},
  boss:    {bpm:96,  prog:["Am","Am","Bb","E"]},
  victory: {bpm:92,  prog:["C","G","Am","F"]},
  defeat:  {bpm:60,  prog:["Am","Dm","Am","E"]}
};
const M = {mode:"off", level:1, next:0, step:0, bar:0, timer:null, pending:null};
function _stepDur(){ const md = MUSIC_MODES[M.mode]; let bpm = md ? md.bpm : 80; if(M.mode==="wave") bpm += Math.min(18, (M.level-1)*2); return 60/bpm/4; }
function _playStep(s, bar, t){
  const md = MUSIC_MODES[M.mode]; if(!md) return;
  const ch = CH[md.prog[bar % md.prog.length]], bass = ch[0], pad = ch[1];
  const sd = _stepDur(), barLen = sd*16, lvl = M.level;
  if(M.mode==="menu"){
    if(s===0) mPad(pad, t, barLen*1.05, 0.1, 1000);
    if(s%2===0){ const arp = [pad[0], pad[1], pad[2], pad[1]+12, pad[2], pad[1], pad[0]+12, pad[2]]; mPizz(arp[(s/2)|0]+12, t, 0.24); }
    if(s===0) mStac(bass, t, barLen*0.9, 0.16, 500, "triangle");
  } else if(M.mode==="wave"){
    if(s===0) mPad(pad, t, barLen*1.02, 0.045, 1300);
    // ostinato de cuerdas en semicorcheas (acentos en cada tiempo)
    const tones = [pad[0], pad[2], pad[1], pad[2]];
    const n = (s>=12 && bar%2===1) ? [pad[2]+12, pad[1]+12, pad[2], pad[1]][s-12] : tones[s%4];
    mStac(n+12, t, sd*0.9, s%4===0 ? 0.075 : 0.045, 2600);
    if(s%2===0) mStac(bass + (s%8===6 ? 12 : 0), t, sd*1.6, 0.11, 600);
    // batería: más llena cuanto más alto el nivel
    if(s===0 || s===8 || (lvl>=4 && s===10) || (lvl>=7 && s===3)) dKick(t, 1);
    if(s===4 || s===12) dSnare(t, 1);
    if(bar%4===3 && s>=13) dSnare(t, 0.5 + (s-13)*0.2);
    if(lvl>=6 ? true : s%2===0) dHat(t, s%4===2 ? 1 : 0.6);
  } else if(M.mode==="prelude"){
    if(s===0) mPad(pad, t, barLen*1.05, 0.11, 1000, -35);
    if(s%4===0) mStac(bass, t, sd*3, 0.2, 500);
    if(s===0 || (bar%2===1 && s===12)) dTimp(t, 1.3);
    if(s%4===2) mStac(pad[2]+12, t, sd*0.8, 0.07, 1800);
  } else if(M.mode==="boss"){
    // pad oscuro que se desafina y se afina (tema original), cuerdas graves en semitonos
    if(s===0) mPad(bar%2===0 ? pad : [pad[0]-12, pad[1], pad[2]+1], t, barLen*1.05, 0.055, 800, -55);
    const low = [0,0,1,0, 0,1,3,1, 0,0,1,0, 6,5,3,1];
    if(s%2===0 || s>=12) mStac(bass - 12 + low[s] + 12, t, sd*1.4, s%4===0 ? 0.13 : 0.08, 700);
    if([0,3,6,8,11,14].includes(s)) dTaiko(t, s===0||s===8 ? 0.85 : 0.5);
    if(s===12) { dSnare(t, 0.9); dKick(t, 0.8); }
    if(s%4===2) dHat(t, 0.4);
    // chillido de cuerdas agudas disonantes cada 4 compases
    if(bar%4===3 && s===8) mStac(pad[2]+25, t, barLen*0.5, 0.03, 3200);
  } else if(M.mode==="victory"){
    if(s===0) mPad(pad.map(x=>x+12), t, barLen*1.05, 0.09, 1600);
    if(s%2===0){ const arp = [pad[0], pad[1], pad[2], pad[1]]; mPizz(arp[(s/2)%4]+24, t, 0.22); }
    if(s===0) dTimp(t, 0.6);
    if(bar>=7 && s===15){ M.pending = {mode:"menu", level:1, at:0}; }
  } else if(M.mode==="defeat"){
    if(s===0) mPad(pad, t, barLen*1.1, 0.11, 700, -40);
    if(s===0) mStac(bass-12, t, barLen*0.9, 0.2, 320, "triangle");
  }
}
function _schedTick(){
  if(!audioCtx || M.mode==="off") return;
  const now = audioCtx.currentTime;
  if(M.next < now - 0.3) M.next = now + 0.05; // la pestaña estuvo pausada: retoma sin ráfaga
  while(M.next < now + 0.14){
    if(M.pending && (M.pending.at<=M.next)){
      const p = M.pending; M.pending = null;
      M.mode = p.mode; M.level = p.level||1; M.step = 0; M.bar = 0;
      musicBus.gain.cancelScheduledValues(M.next);
      musicBus.gain.setValueAtTime(0.0001, M.next); musicBus.gain.linearRampToValueAtTime(1, M.next+0.8);
    }
    try{ _playStep(M.step, M.bar, M.next); }catch(e){}
    M.next += _stepDur();
    if(++M.step >= 16){ M.step = 0; M.bar++; }
  }
}
// El juego pide el clima: "menu" | "wave" | "prelude" | "boss" | "victory" | "defeat".
function setMusicMode(mode, level){
  if(!audioCtx || !MUSIC_MODES[mode]) { M.wanted = mode; M.wantedLevel = level; return; }
  if(M.mode===mode && !M.pending){ M.level = level||M.level; return; }
  if(M.pending && M.pending.mode===mode){ M.pending.level = level||1; return; }
  const now = audioCtx.currentTime;
  if(M.mode==="off"){ M.pending = {mode, level, at:0}; M.next = now+0.05; M.mode = mode; }
  else {
    musicBus.gain.cancelScheduledValues(now);
    musicBus.gain.setValueAtTime(musicBus.gain.value, now); musicBus.gain.linearRampToValueAtTime(0.0001, now+0.35);
    M.pending = {mode, level, at:now+0.38};
  }
}
// Pausa: la música baja; al volver, sube.
function musicOnState(s){
  if(!audioCtx) return;
  const now = audioCtx.currentTime;
  musicDuck.gain.setTargetAtTime(s==="paused" ? 0.35 : 1, now, 0.12);
  if(s==="gameover") setMusicMode("defeat");
  else if(s==="playing"){
    // entrar a jugar desde un menú (p.ej. la Arena Divina, que no pasa por beginLevel)
    const cur = M.pending ? M.pending.mode : M.mode;
    if(cur==="menu" || cur==="defeat" || cur==="off") setMusicMode("wave", typeof runLevel==="number" ? runLevel : 1);
  }
  else if(s!=="paused" && s!=="buff" && s!=="victory") setMusicMode("menu");
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
  // El Libertador / Eren (sintetizados, sin archivos de audio)
  musket:{p:3,gap:120}, musketOfficer:{p:4,gap:150}, blade:{p:1,gap:70}, bugle:{p:4,gap:800}, gallop:{p:3,gap:400},
  hook:{p:2,gap:90}, roar:{p:4,gap:600}, stomp:{p:3,gap:140}, punch:{p:2,gap:90}, thunder:{p:5,gap:800},
  // Botín: cada rareza suena distinto (la revelación se oye aunque no se mire la pantalla)
  chestDrop:{p:4,gap:300}, chestShake:{p:3,gap:90}, chestOpen:{p:5,gap:300},
  lootCommon:{p:2,gap:60}, lootRare:{p:3,gap:80}, lootVeryRare:{p:4,gap:120}, lootLegend:{p:5,gap:300},
  lootMythic:{p:5,gap:500}, lootSet:{p:5,gap:500}, lootUnique:{p:5,gap:1200},
  // Combate: estados y gore
  freeze:{p:2,gap:120}, shatter:{p:3,gap:110}, splat:{p:1,gap:45}, gib:{p:2,gap:90}, burnDeath:{p:1,gap:80}, zap:{p:2,gap:90},
  threat:{p:4,gap:900}, emergencyHeal:{p:4,gap:500}
};
const _sfxLast = {}; let _sfxVoices = [];
const SFX_MAX_VOICES = 12;
function _duck(amount, ms){
  const now = audioCtx.currentTime;
  musicDuck.gain.cancelScheduledValues(now);
  musicDuck.gain.setTargetAtTime(amount, now, 0.03);
  musicDuck.gain.setTargetAtTime(state==="paused" ? 0.35 : 1, now + ms/1000, 0.25);
}
function playSfx(type){
  if(!audioCtx) return;
  const cfg = SFX_CFG[type] || ARENA_SFX[type]; if(!cfg) return;
  const nowMs = performance.now();
  if(_sfxLast[type] && nowMs - _sfxLast[type] < cfg.gap) return;
  const t0 = audioCtx.currentTime;
  _sfxVoices = _sfxVoices.filter(v=>v > t0);
  if(_sfxVoices.length >= SFX_MAX_VOICES && cfg.p < 3) return; // mucho ruido: solo pasa lo importante
  _sfxLast[type] = nowMs;
  const D = sfxGain;
  let len = 0.15;
  switch(type){
    case "hit": _tone(t0,"triangle",320,90,0.08,0.2,D); _noise(t0,0.03,0.08,"highpass",2500,0,D); len=0.09; break;
    case "crit": _tone(t0,"square",760,210,0.1,0.14,D); _noise(t0,0.06,0.14,"bandpass",3200,1,D); len=0.12; break;
    case "heavy": _tone(t0,"sine",150,44,0.22,0.5,D); _noise(t0,0.14,0.18,"lowpass",900,0,D); len=0.24; break;
    case "kill": _noise(t0,0.08,0.12,"bandpass",1300,1.2,D); _tone(t0,"triangle",620,300,0.06,0.1,D); len=0.09; break;
    case "eliteKill": _tone(t0,"sine",130,45,0.25,0.45,D); _tone(t0+0.02,"triangle",660,660,0.14,0.14,D); _tone(t0+0.09,"triangle",990,990,0.2,0.12,D); len=0.3; break;
    case "bigKill": _tone(t0,"sine",95,32,0.7,0.7,D); _noise(t0,0.55,0.3,"lowpass",650,0,D); _tone(t0+0.05,"triangle",1320,1320,0.45,0.08,D); _duck(0.6,500); len=0.7; break;
    case "bossRoar": {
      const o = audioCtx.createOscillator(); o.type="sawtooth"; o.frequency.setValueAtTime(78,t0); o.frequency.exponentialRampToValueAtTime(48,t0+1.1);
      const lfo = audioCtx.createOscillator(); lfo.frequency.value = 23; const lg = audioCtx.createGain(); lg.gain.value = 9; lfo.connect(lg); lg.connect(o.frequency);
      const f = audioCtx.createBiquadFilter(); f.type="lowpass"; f.frequency.value=520;
      const g = audioCtx.createGain(); _env(g,t0,0.12,0.55,0.4,0.7);
      o.connect(f); f.connect(g); g.connect(D); o.start(t0); lfo.start(t0); o.stop(t0+1.3); lfo.stop(t0+1.3);
      _noise(t0,1.0,0.22,"lowpass",420,0,D); _duck(0.45,1100); len=1.3; break;
    }
    case "bossDeath":
      _tone(t0,"sine",90,28,1.6,0.75,D); _noise(t0,1.4,0.35,"lowpass",500,0,D);
      _tone(t0,"sawtooth",220,40,1.4,0.12,D);
      [440,554.37,659.25].forEach((f,i)=>_tone(t0+0.5+i*0.08,"triangle",f,f,1.4,0.1,D,0.05));
      _duck(0.3,1900); len=2; break;
    case "hurt": _tone(t0,"square",160,50,0.13,0.22,D); len=0.14; break;
    case "hurtHeavy": _tone(t0,"square",170,48,0.16,0.24,D); _tone(t0,"sine",95,38,0.28,0.5,D); len=0.3; break;
    case "ready": _tone(t0,"sine",880,880,0.06,0.1,D); _tone(t0+0.06,"sine",1320,1320,0.09,0.1,D); len=0.16; break;
    case "deny": { const g = _tone(t0,"square",190,170,0.07,0.08,D); _tone(t0+0.08,"square",140,130,0.08,0.08,D); len=0.17; break; }
    case "boom": _noise(t0,0.35,0.3,"lowpass",700,0,D); _tone(t0,"sine",110,38,0.35,0.45,D); len=0.36; break;
    case "clear": [523.25,659.25,783.99,1046.5].forEach((f,i)=>_tone(t0+i*0.07,"triangle",f,f,0.35,0.18,D)); _noise(t0+0.25,0.4,0.05,"highpass",6000,0,D); len=0.7; break;
    case "heal": _tone(t0,"sine",660,990,0.25,0.14,D,0.02); _tone(t0,"sine",990,1485,0.25,0.07,D,0.02); len=0.27; break;
    case "shield": _tone(t0,"triangle",440,440,0.3,0.12,D,0.02); _tone(t0,"triangle",660,660,0.3,0.08,D,0.02); len=0.32; break;
    case "potion": _tone(t0,"sine",520,880,0.2,0.3,D,0.03); len=0.22; break;
    case "levelup": case "victory": {
      const notes = type==="victory" ? [392,523.25,659.25,783.99,1046.5] : [523.25,659.25,783.99,1046.5];
      notes.forEach((f,i)=>_tone(t0+i*0.1,"triangle",f,f,0.5,0.28,D,0.02));
      if(type==="victory") _duck(0.4,900);
      len=0.1*notes.length+0.5; break;
    }
    case "cast": {
      const o = audioCtx.createOscillator(); const g = audioCtx.createGain(); const f = audioCtx.createBiquadFilter(); f.type="lowpass"; f.frequency.value=1800;
      o.type="sawtooth"; o.frequency.setValueAtTime(260,t0); o.frequency.exponentialRampToValueAtTime(520,t0+0.15);
      _env(g,t0,0.02,0.22,0,0.2); o.connect(f); f.connect(g); g.connect(D); o.start(t0); o.stop(t0+0.24); len=0.24; break;
    }
    // ---- El Libertador ----
    case "musket": case "musketOfficer": {
      const big = type==="musketOfficer";
      _noise(t0,big?0.32:0.22,big?0.5:0.4,"lowpass",big?1800:2400,0,D); _tone(t0,"sine",big?120:150,38,big?0.3:0.22,big?0.55:0.4,D);
      _noise(t0+0.02,0.5,0.08,"highpass",3000,0,D); if(big) _tone(t0+0.03,"triangle",880,660,0.18,0.08,D);
      len = big?0.5:0.4; break;
    }
    case "blade": _noise(t0,0.07,0.16,"bandpass",4200,2,D); _tone(t0,"triangle",1400,700,0.06,0.05,D); len=0.08; break;
    case "bugle": {
      // clarín: arpegio de caballería (do-mi-sol-do)
      [392,523.25,659.25,783.99].forEach((f,i)=>{ _tone(t0+i*0.12,"square",f,f,0.14,0.06,D,0.01); _tone(t0+i*0.12,"sawtooth",f,f,0.14,0.035,D,0.01); });
      _tone(t0+0.48,"square",783.99,783.99,0.42,0.07,D,0.02); len=0.95; break;
    }
    case "gallop": for(let i=0;i<6;i++){ _noise(t0+i*0.11,0.05,0.2,"lowpass",420,0,D); _tone(t0+i*0.11,"sine",90,60,0.06,0.2,D); } len=0.7; break;
    // ---- Eren ----
    case "hook": _noise(t0,0.18,0.12,"bandpass",2600,6,D); _tone(t0,"sawtooth",1800,520,0.16,0.04,D); len=0.2; break;
    case "punch": _tone(t0,"sine",110,50,0.14,0.45,D); _noise(t0,0.1,0.2,"lowpass",800,0,D); len=0.16; break;
    case "stomp": _tone(t0,"sine",70,32,0.35,0.6,D); _noise(t0,0.3,0.3,"lowpass",500,0,D); _duck(0.7,250); len=0.36; break;
    case "roar": {
      const o = audioCtx.createOscillator(); o.type="sawtooth"; o.frequency.setValueAtTime(110,t0); o.frequency.exponentialRampToValueAtTime(60,t0+0.9);
      const f = audioCtx.createBiquadFilter(); f.type="lowpass"; f.frequency.value=700;
      const g = audioCtx.createGain(); _env(g,t0,0.08,0.45,0.3,0.6);
      o.connect(f); f.connect(g); g.connect(D); o.start(t0); o.stop(t0+1.0);
      _noise(t0,0.8,0.2,"bandpass",600,0.8,D); _duck(0.5,800); len=1.0; break;
    }
    case "thunder": _noise(t0,1.1,0.55,"lowpass",1500,0,D); _tone(t0,"sine",60,28,1.0,0.6,D); _noise(t0,0.08,0.4,"highpass",2000,0,D); _duck(0.35,1000); len=1.1; break;
    // ---- Botín ----
    case "chestDrop": _tone(t0,"sine",80,40,0.3,0.55,D); _noise(t0,0.2,0.25,"lowpass",600,0,D); _noise(t0+0.02,0.06,0.12,"bandpass",2400,3,D); len=0.32; break;
    case "chestShake": _noise(t0,0.06,0.12,"bandpass",900,2,D); _tone(t0,"square",140,120,0.05,0.05,D); len=0.07; break;
    case "chestOpen": _noise(t0,0.35,0.22,"bandpass",700,1.2,D); _tone(t0,"triangle",220,440,0.3,0.1,D); _tone(t0+0.18,"sine",880,1320,0.4,0.08,D,0.04); len=0.6; break;
    case "lootCommon": _tone(t0,"triangle",520,520,0.08,0.08,D); len=0.1; break;
    case "lootRare": _tone(t0,"triangle",660,660,0.1,0.1,D); _tone(t0+0.08,"triangle",990,990,0.14,0.09,D); len=0.24; break;
    case "lootVeryRare": [659.25,830.6,987.8].forEach((f,i)=>_tone(t0+i*0.07,"triangle",f,f,0.22,0.12,D,0.01)); len=0.4; break;
    case "lootLegend":
      [523.25,659.25,783.99,1046.5,1318.5].forEach((f,i)=>_tone(t0+i*0.08,"triangle",f,f,0.5,0.16,D,0.01));
      _tone(t0,"sine",130,65,0.6,0.35,D); _noise(t0+0.35,0.6,0.06,"highpass",6500,0,D); _duck(0.4,1100); len=1.0; break;
    case "lootMythic":
      _tone(t0,"sawtooth",65,40,1.2,0.3,D,0.05); _noise(t0,0.9,0.25,"lowpass",500,0,D);
      [392,466.2,587.3,784,932.3].forEach((f,i)=>_tone(t0+0.3+i*0.11,"triangle",f,f,0.8,0.16,D,0.02));
      _duck(0.25,1800); len=1.6; break;
    case "lootSet":
      [523.25,659.25,783.99].forEach((f,i)=>_tone(t0+i*0.12,"sine",f,f,0.9,0.14,D,0.04));
      [1046.5,1318.5,1568].forEach((f,i)=>_tone(t0+0.45+i*0.1,"triangle",f,f,0.9,0.1,D,0.02));
      _noise(t0+0.4,1.0,0.07,"highpass",7000,0,D); _duck(0.25,1800); len=1.6; break;
    case "lootUnique":
      _tone(t0,"sine",55,30,2.2,0.5,D,0.2); _noise(t0,1.8,0.25,"lowpass",380,0,D);
      [261.6,311.1,392,466.2,523.25,622.3,784].forEach((f,i)=>_tone(t0+0.6+i*0.14,"triangle",f,f,1.4,0.15,D,0.03));
      _tone(t0+1.6,"sawtooth",1046.5,1046.5,1.2,0.05,D,0.1); _noise(t0+1.5,1.4,0.08,"highpass",7500,0,D);
      _duck(0.15,3200); len=3.0; break;
    // ---- Estados y gore ----
    case "freeze": _tone(t0,"triangle",1800,2600,0.18,0.07,D); _noise(t0,0.15,0.1,"highpass",5000,0,D); len=0.2; break;
    case "shatter": _noise(t0,0.22,0.3,"highpass",3500,0,D); _tone(t0,"triangle",2400,900,0.2,0.08,D); _tone(t0+0.03,"triangle",3100,1400,0.15,0.05,D); len=0.25; break;
    case "splat": _noise(t0,0.09,0.14,"lowpass",700,0,D); _tone(t0,"sine",180,70,0.08,0.12,D); len=0.1; break;
    case "gib": _noise(t0,0.16,0.22,"lowpass",900,0,D); _tone(t0,"sine",120,45,0.14,0.22,D); _noise(t0+0.05,0.1,0.1,"bandpass",1600,2,D); len=0.2; break;
    case "burnDeath": _noise(t0,0.35,0.12,"bandpass",1200,0.6,D); _tone(t0,"sawtooth",200,90,0.25,0.04,D); len=0.36; break;
    case "zap": _noise(t0,0.12,0.14,"bandpass",3200,4,D); _tone(t0,"square",1400,700,0.1,0.05,D); len=0.13; break;
    case "threat": _tone(t0,"square",330,330,0.09,0.09,D); _tone(t0+0.12,"square",247,247,0.12,0.09,D); len=0.26; break;
    case "emergencyHeal": _tone(t0,"sine",440,880,0.35,0.18,D,0.02); _tone(t0+0.05,"sine",660,1320,0.35,0.1,D,0.02); _noise(t0,0.3,0.05,"highpass",6000,0,D); len=0.4; break;
    default:
      // sonidos propios de una arena (ARENA_SFX, p.ej. La Fortaleza): mismo control de prioridad/voces
      if(cfg.play) len = cfg.play(t0, D) || 0.3;
      break;
    case "ult":
      _tone(t0,"sawtooth",85,42,0.7,0.42,D,0.06); _noise(t0,0.6,0.18,"bandpass",900,0.7,D); _tone(t0+0.1,"triangle",660,990,0.5,0.08,D,0.05);
      _duck(0.5,700); len=0.75; break;
  }
  _sfxVoices.push(t0+len);
}
