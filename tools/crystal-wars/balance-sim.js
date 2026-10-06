'use strict';
/* Simulación de balance de Guerra de Cristales: todas las parejas de roles, ambos lados, muchas semillas.
 * Mide victoria por pareja, empates, duración, cómo termina (cristal / tiempo), ventaja del primer lado y remontadas.
 * Uso: node tools/crystal-wars/balance-sim.js [semillas=40] [--json]. Los bots son simples: miden el modo, no a humanos. */
const C=require('../../js/modes/crystal-wars/simulation');
const N=Number(process.argv[2])>0?Number(process.argv[2]):40,JSON_OUT=process.argv.includes('--json');
const roles=Object.keys(C.ROLES),pairs=[];for(let i=0;i<roles.length;i++)for(let j=i;j<roles.length;j++)pairs.push([roles[i],roles[j]]);
function play(a,b,seed){
  const s=C.create([{champ:a[0]},{champ:a[1]},{champ:b[0]},{champ:b[1]}],seed);
  let lead=0,maxLead=[0,0],comeback=false,firstLeader=null;
  while(!s.ended&&s.time<601){C.step(s,1/30);
    const d=s.teams[0].hp-s.teams[1].hp;if(s.time>120&&Math.abs(d)>150&&firstLeader===null)firstLeader=d>0?0:1;}
  const end=s.teams[0].hp<=0||s.teams[1].hp<=0?'cristal':'tiempo';
  if(firstLeader!==null&&s.winner!==-1&&s.winner!==firstLeader)comeback=true;
  return {winner:s.winner,time:s.time,end,hp:[s.teams[0].hp,s.teams[1].hp],comeback,decided:firstLeader!==null,kills:[s.teams[0].kills,s.teams[1].kills]};
}
const out={games:0,draws:0,crystalEnds:0,timeSum:0,sideWins:[0,0],comebacks:0,decided:0,pairs:{},roleWins:{}};
for(const r of roles)out.roleWins[r]={w:0,g:0};
for(const p of pairs)for(const q of pairs){ if(p===q&&pairs.indexOf(p)>=0&&false)continue;
  const key=p.join('+')+' vs '+q.join('+');if(pairs.indexOf(p)>pairs.indexOf(q))continue;
  const row={w:0,l:0,d:0,time:0,n:0};
  for(let seed=1;seed<=N;seed++){const r=play(p,q,seed*7919+pairs.indexOf(p)*31+pairs.indexOf(q));
    out.games++;row.n++;row.time+=r.time;out.timeSum+=r.time;if(r.end==='cristal')out.crystalEnds++;
    if(r.winner===-1){out.draws++;row.d++;}else{out.sideWins[r.winner]++;if(r.winner===0)row.w++;else row.l++;
      const win=r.winner===0?p:q,lose=r.winner===0?q:p;for(const x of win){out.roleWins[x].w++;}for(const x of [...p,...q])out.roleWins[x].g++;}
    if(r.decided){out.decided++;if(r.comeback)out.comebacks++;}
    if(r.winner===-1)for(const x of [...p,...q])out.roleWins[x].g+=0;}
  out.pairs[key]=row;}
const pct=(a,b)=>b?Math.round(a/b*1000)/10:0;
const rep={games:out.games,empates_pct:pct(out.draws,out.games),terminan_por_cristal_pct:pct(out.crystalEnds,out.games),duracion_media_s:Math.round(out.timeSum/out.games),
  victorias_lado0_pct:pct(out.sideWins[0],out.sideWins[0]+out.sideWins[1]),remontadas_pct:pct(out.comebacks,out.decided),
  rol_winrate_pct:Object.fromEntries(roles.map(r=>[r,pct(out.roleWins[r].w,out.roleWins[r].g)]))};
if(JSON_OUT)console.log(JSON.stringify({rep,pairs:out.pairs},null,1));else{console.log(rep);for(const [k,v] of Object.entries(out.pairs))console.log(k.padEnd(28),'W',v.w,'L',v.l,'D',v.d,'~',Math.round(v.time/v.n)+'s');}
