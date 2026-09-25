"use strict";
/* ============================================================
   js/audio/audio.js
   Audio: música ambiental original sintetizada (Web Audio) y efectos de sonido.
   ============================================================ */

/* ============================================================
   AUDIO — música ambiental ORIGINAL (compuesta acá, sintetizada con Web Audio API;
   NO es una reproducción de ninguna pista existente) + efectos breves.
   Inspirada en el clima de "cuerda desafinada que se va afinando": cada nota del pad
   arranca unos centavos desafinada y converge a su tono real en un par de segundos,
   sobre un drone grave sostenido. Todo generado por osciladores, nada de audio grabado.
   ============================================================ */
let audioCtx = null, masterGain = null, musicGain = null, sfxGain = null;
let audioEnabled = true, musicStarted = false, musicLoopTimer = null, padOscs = [];
function initAudio(){
  if(audioCtx){
    if(audioCtx.state==="suspended") audioCtx.resume().catch(()=>{});
    return;
  }
  try{
    audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    masterGain = audioCtx.createGain(); masterGain.gain.value = audioEnabled?1:0;
    masterGain.connect(audioCtx.destination);
    musicGain = audioCtx.createGain(); musicGain.gain.value = 0.32;
    musicGain.connect(masterGain);
    sfxGain = audioCtx.createGain(); sfxGain.gain.value = 0.55;
    sfxGain.connect(masterGain);
    // En iPhone/Safari (y algunos Android) el contexto arranca "suspendido" por política
    // del navegador: sin este resume() explícito, ningún sonido se escucha nunca, aunque
    // el código de arriba no tire ningún error. Tiene que llamarse durante el mismo toque
    // del usuario que crea el contexto, por eso va acá adentro.
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
// Una "cuerda" que arranca desafinada y converge a su tono real en ~2.5s, como un
// instrumento acordándose en vivo. Se llama repetidas veces con variaciones (ver startMusic).
function playDetuneString(baseFreq, startDetuneCents, duration, delay){
  if(!audioCtx) return;
  const t0 = audioCtx.currentTime + (delay||0);
  const osc = audioCtx.createOscillator();
  osc.type = "sawtooth";
  const filt = audioCtx.createBiquadFilter();
  filt.type = "lowpass"; filt.frequency.value = 850; filt.Q.value = 0.6;
  const g = audioCtx.createGain();
  osc.connect(filt); filt.connect(g); g.connect(musicGain);
  const detuneMult = Math.pow(2, startDetuneCents/1200);
  osc.frequency.setValueAtTime(baseFreq*detuneMult, t0);
  osc.frequency.exponentialRampToValueAtTime(baseFreq, t0+2.3);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(0.45, t0+0.5);
  g.gain.linearRampToValueAtTime(0.22, t0+2.3);
  g.gain.linearRampToValueAtTime(0.0001, t0+duration);
  osc.start(t0); osc.stop(t0+duration+0.1);
}
function startMusic(){
  initAudio();
  if(!audioCtx){
    showBanner("🔇 El navegador bloqueó el audio");
    return;
  }
  // Diagnóstico visible: mostrar el estado real del audio ~400ms después de intentar
  // resumirlo (le da tiempo a resume() a resolver), para saber de verdad qué está pasando
  // en vez de seguir adivinando arreglos a ciegas.
  setTimeout(()=>{
    if(audioCtx.state==="running") showBanner("🔊 Audio activo");
    else showBanner("🔇 Audio: "+audioCtx.state+" (avisame este mensaje)");
  }, 400);
  if(musicStarted) return;
  musicStarted = true;
  const root = 55; // La grave, drone sostenido de fondo
  [root, root*1.5, root*2].forEach((f,i)=>{
    const osc = audioCtx.createOscillator();
    osc.type = "sine"; osc.frequency.value = f;
    const g = audioCtx.createGain(); g.gain.value = i===0 ? 0.09 : 0.04;
    osc.connect(g); g.connect(musicGain);
    osc.start(); padOscs.push(osc);
  });
  const notes = [220.00, 246.94, 261.63, 293.66]; // clima menor/frigio oscuro
  // Un solo track continuo: DOS voces de "cuerda desafinándose" que se van turnando sin
  // pausas entre sí (apenas una termina, ya hay otra sonando, a veces superpuestas), para
  // que la inquietud sea constante en vez de un evento esporádico cada tantos segundos.
  function cycleVoice(delayMs){
    if(!musicStarted) return;
    const n = notes[(Math.random()*notes.length)|0];
    const dur = 4.5 + Math.random()*2.5;
    playDetuneString(n, -65-Math.random()*45, dur, 0);
    if(Math.random()<0.35) playDetuneString(n*0.5, -50-Math.random()*30, dur+0.6, 0.4);
    musicLoopTimer = setTimeout(()=>cycleVoice(0), (dur*1000) - 900 + Math.random()*600);
  }
  cycleVoice(0);
  setTimeout(()=>cycleVoice(0), 2600); // segunda voz arrancando desfasada, para que se crucen
}
// Efectos breves, todos sintetizados (sin archivos de audio externos)
function playSfx(type){
  if(!audioCtx) return;
  const t0 = audioCtx.currentTime;
  if(type==="potion"){
    const osc = audioCtx.createOscillator(); const g = audioCtx.createGain();
    osc.type="sine"; osc.frequency.setValueAtTime(520,t0); osc.frequency.exponentialRampToValueAtTime(880,t0+0.18);
    g.gain.setValueAtTime(0.0001,t0); g.gain.linearRampToValueAtTime(0.35,t0+0.03); g.gain.exponentialRampToValueAtTime(0.0001,t0+0.22);
    osc.connect(g); g.connect(sfxGain); osc.start(t0); osc.stop(t0+0.25);
  } else if(type==="levelup" || type==="victory"){
    const notes = type==="victory" ? [392,523.25,659.25,783.99,1046.5] : [523.25,659.25,783.99,1046.5];
    notes.forEach((f,i)=>{
      const o=audioCtx.createOscillator(), gg=audioCtx.createGain();
      o.type="triangle"; o.frequency.value=f;
      gg.gain.setValueAtTime(0.0001,t0+i*0.1);
      gg.gain.linearRampToValueAtTime(0.3,t0+i*0.1+0.02);
      gg.gain.exponentialRampToValueAtTime(0.0001,t0+i*0.1+0.5);
      o.connect(gg); gg.connect(sfxGain); o.start(t0+i*0.1); o.stop(t0+i*0.1+0.52);
    });
  } else if(type==="cast"){
    const osc = audioCtx.createOscillator(); const g = audioCtx.createGain();
    const filt = audioCtx.createBiquadFilter(); filt.type="lowpass"; filt.frequency.value=1800;
    osc.type="sawtooth"; osc.frequency.setValueAtTime(260,t0); osc.frequency.exponentialRampToValueAtTime(520,t0+0.15);
    g.gain.setValueAtTime(0.0001,t0); g.gain.linearRampToValueAtTime(0.26,t0+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t0+0.22);
    osc.connect(filt); filt.connect(g); g.connect(sfxGain); osc.start(t0); osc.stop(t0+0.24);
  } else if(type==="ult"){
    const osc = audioCtx.createOscillator(); const g = audioCtx.createGain();
    osc.type="sawtooth"; osc.frequency.setValueAtTime(85,t0); osc.frequency.exponentialRampToValueAtTime(42,t0+0.6);
    g.gain.setValueAtTime(0.0001,t0); g.gain.linearRampToValueAtTime(0.48,t0+0.08); g.gain.exponentialRampToValueAtTime(0.0001,t0+0.7);
    osc.connect(g); g.connect(sfxGain); osc.start(t0); osc.stop(t0+0.72);
  } else if(type==="hurt"){
    const osc = audioCtx.createOscillator(); const g = audioCtx.createGain();
    osc.type="square"; osc.frequency.setValueAtTime(160,t0); osc.frequency.exponentialRampToValueAtTime(50,t0+0.1);
    g.gain.setValueAtTime(0.32,t0); g.gain.exponentialRampToValueAtTime(0.0001,t0+0.13);
    osc.connect(g); g.connect(sfxGain); osc.start(t0); osc.stop(t0+0.14);
  } else if(type==="hit"){
    const osc = audioCtx.createOscillator(); const g = audioCtx.createGain();
    osc.type="triangle"; osc.frequency.setValueAtTime(320,t0); osc.frequency.exponentialRampToValueAtTime(90,t0+0.08);
    g.gain.setValueAtTime(0.22,t0); g.gain.exponentialRampToValueAtTime(0.0001,t0+0.09);
    osc.connect(g); g.connect(sfxGain); osc.start(t0); osc.stop(t0+0.1);
  } else if(type==="crit"){
    const osc = audioCtx.createOscillator(); const g = audioCtx.createGain();
    osc.type="sawtooth"; osc.frequency.setValueAtTime(500,t0); osc.frequency.exponentialRampToValueAtTime(180,t0+0.1);
    g.gain.setValueAtTime(0.3,t0); g.gain.exponentialRampToValueAtTime(0.0001,t0+0.12);
    osc.connect(g); g.connect(sfxGain); osc.start(t0); osc.stop(t0+0.13);
  }
}
