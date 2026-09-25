"use strict";
/* ============================================================
   js/ui/title-scene.js
   Pantalla de título: un ejército de héroes pixelados (el arte real de los 10 campeones, en
   tres filas de profundidad) marchando hacia la horda, que se asoma desde la oscuridad con
   ojos rojos. Brasas que suben y resplandor de fuego. Solo se anima mientras el título está a
   la vista (~30 fps) y se ajusta al tamaño/densidad de la pantalla.
   ============================================================ */
const TITLE_HERO_KEYS = ["guerrero","tanque","mago","soporte","segador","axiom","profeta","musashi","cazadora","nigromante"];
let _titleRaf = null, _titleLast = 0, _titleCast = null, _titleEmbers = [], _titleEyes = [];
// Cada set de arte viene a otra escala: se mide la altura real (píxeles opacos) de cada campeón
// una vez cargado su arte y se normaliza, para que el ejército se vea parejo.
const _titleNorm = {}; let _titleNormAt = 0;

function _titleMeasure(){
  const N = 420, c = document.createElement("canvas"); c.width = N; c.height = N;
  const g = c.getContext("2d");
  for(const key of TITLE_HERO_KEYS){
    if(_titleNorm[key]) continue;
    g.clearRect(0,0,N,N);
    // se mide a la escala a la que se dibuja de verdad (algunos sets no escalan en forma lineal)
    try{ drawChampFigure(g, key, N/2, N-20, 3, 1, 300, true); }catch(_){ continue; }
    const d = g.getImageData(0,0,N,N).data;
    let top = -1, bot = -1;
    for(let y=0;y<N && top<0;y++) for(let x=0;x<N;x++) if(d[(y*N+x)*4+3] > 40){ top = y; break; }
    for(let y=N-1;y>=0 && bot<0;y--) for(let x=0;x<N;x++) if(d[(y*N+x)*4+3] > 40){ bot = y; break; }
    if(top >= 0 && bot > top + 8) _titleNorm[key] = 102/(bot-top+1); // altura de referencia a escala 3
  }
}
function _titleSetup(cvs){
  const dpr = Math.min(2, window.devicePixelRatio||1);
  const w = cvs.clientWidth, h = cvs.clientHeight;
  if(!w || !h) return false;
  if(cvs.width !== Math.round(w*dpr) || cvs.height !== Math.round(h*dpr)){ cvs.width = Math.round(w*dpr); cvs.height = Math.round(h*dpr); _titleCast = null; }
  if(_titleCast) return true;
  const W = cvs.width, H = cvs.height, unit = Math.min(W/844, H/390);
  // tres filas: atrás (chicas, oscuras), medio y adelante (grandes). Mezcla de campeones.
  const rows = [
    {n:12, y:0.55, s:0.95, a:0.55, spd:10},
    {n:10, y:0.67, s:1.3,  a:0.8,  spd:16},
    {n:8,  y:0.80, s:1.7,  a:1.0,  spd:24}
  ];
  _titleCast = [];
  let k = 0;
  rows.forEach((r, ri)=>{
    const span = W*0.8, x0 = W*0.01;
    for(let i=0;i<r.n;i++){
      const key = TITLE_HERO_KEYS[(k++ * 3 + ri) % TITLE_HERO_KEYS.length];
      _titleCast.push({key, row:ri, baseX: x0 + span*(i+0.5)/r.n + (ri%2?span/r.n*0.5:0), y:H*r.y + (i%2)*H*0.012,
        s:r.s*unit*1.25, a:r.a, spd:r.spd*unit, t:Math.random()*4000, ph:Math.random()*6.28});
    }
  });
  _titleCast.sort((a,b)=>a.row-b.row || a.y-b.y);
  _titleEmbers = [];
  for(let i=0;i<46;i++) _titleEmbers.push({x:Math.random()*W, y:H*(0.4+Math.random()*0.6), v:(18+Math.random()*40)*unit, s:(1+Math.random()*2.2)*unit, ph:Math.random()*6.28});
  _titleEyes = [];
  for(let i=0;i<9;i++) _titleEyes.push({x:W*(0.83+Math.random()*0.15), y:H*(0.4+Math.random()*0.4), s:(2+Math.random()*2)*unit, ph:Math.random()*6.28, blink:Math.random()*5000});
  return true;
}
function _titleFrame(now){
  const scr = document.getElementById("title-screen"), cvs = document.getElementById("title-canvas");
  if(!cvs || !scr || scr.classList.contains("hidden")){ _titleRaf = null; return; }
  _titleRaf = requestAnimationFrame(_titleFrame);
  if(now - _titleLast < 33) return; // ~30 fps: suficiente para un fondo y ahorra batería
  const dt = Math.min(100, now - (_titleLast||now)); _titleLast = now;
  if(!_titleSetup(cvs)) return;
  const g = cvs.getContext("2d"), W = cvs.width, H = cvs.height;
  g.clearRect(0, 0, W, H);
  g.imageSmoothingEnabled = false;
  // suelo: franja oscura con resplandor de fuego al frente
  const gr = g.createLinearGradient(0, H*0.6, 0, H);
  gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(0.35, "rgba(20,8,4,0.55)"); gr.addColorStop(1, "rgba(40,12,4,0.85)");
  g.fillStyle = gr; g.fillRect(0, H*0.6, W, H*0.4);
  // la horda: ojos rojos que parpadean en la oscuridad (derecha)
  const fog = g.createRadialGradient(W*1.02, H*0.72, 0, W*1.02, H*0.72, W*0.34);
  fog.addColorStop(0, "rgba(0,0,0,0.7)"); fog.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = fog; g.fillRect(W*0.6, 0, W*0.4, H);
  for(const e of _titleEyes){
    e.blink -= dt; if(e.blink < -140) e.blink = 2500 + Math.random()*4500;
    if(e.blink < 0) continue;
    const a = 0.55 + 0.45*Math.sin(now/400 + e.ph);
    g.fillStyle = `rgba(255,${40+Math.round(40*a)},20,${a})`;
    g.fillRect(e.x, e.y, e.s*2, e.s); g.fillRect(e.x + e.s*4, e.y, e.s*2, e.s);
  }
  // ejército de héroes marchando (caminata en el lugar + avance lento que da la vuelta); las
  // filas de atrás, más chicas y más transparentes, dan profundidad.
  // mientras dice "Cargando…" no se dibuja ningún campeón: así nunca aparece un arte a medio
  // cargar (o el respaldo viejo); el ejército entra recién con el arte definitivo.
  const contBtn = document.getElementById("title-continue-btn");
  const loading = !!(contBtn && contBtn.disabled && /Cargando/.test(contBtn.textContent));
  if(!loading && now - _titleNormAt > 800 && TITLE_HERO_KEYS.some(k=>!_titleNorm[k])){ _titleNormAt = now; _titleMeasure(); }
  for(const c of _titleCast){
    if(loading) break;
    c.t += dt;
    const drift = ((c.t*c.spd/1000) % (W*0.08)) - W*0.04;
    const x = c.baseX + drift, bob = Math.sin(c.t/160 + c.ph)*1.2;
    g.save();
    g.globalAlpha = c.a;
    const sc = c.s * Math.max(0.45, Math.min(2.2, _titleNorm[c.key] || 1));
    g.globalAlpha = c.a*0.45; g.fillStyle = "#000";
    g.beginPath(); g.ellipse(x, c.y + 2, 11*sc, 3.2*sc, 0, 0, Math.PI*2); g.fill();
    g.globalAlpha = c.a;
    if(_titleNorm[c.key]) { try{ drawChampFigure(g, c.key, x, c.y + bob, sc, 1, c.t, true); }catch(_){} }
    g.restore();
  }
  // brasas subiendo
  g.globalCompositeOperation = "lighter";
  for(const b of _titleEmbers){
    b.y -= b.v*dt/1000; b.x += Math.sin(now/700 + b.ph)*0.4;
    if(b.y < H*0.25){ b.y = H*(0.85+Math.random()*0.15); b.x = Math.random()*W; }
    const a = Math.min(1, (b.y - H*0.25)/(H*0.3));
    g.fillStyle = `rgba(255,${120+((b.ph*40)|0)%80},40,${0.75*a})`;
    g.fillRect(b.x, b.y, b.s, b.s);
  }
  g.globalCompositeOperation = "source-over";
}
function startTitleScene(){
  if(_titleRaf) return;
  _titleLast = 0;
  _titleRaf = requestAnimationFrame(_titleFrame);
}
window.addEventListener("resize", ()=>{ _titleCast = null; });
// el título es la primera pantalla: arranca apenas carga, y vuelve cada vez que se lo muestra
startTitleScene();
