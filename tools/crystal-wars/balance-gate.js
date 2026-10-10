'use strict';
/* Puerta de balance de Guerra de Cristales (CI). Simula partidas de bots y falla si:
 * un rol queda fuera de 40–60 % de victorias, una política de compra domina (<38 % o >62 %), el lado 1 o 2 domina,
 * hay demasiados empates o partidas que no terminan en cristal, o la duración media se sale del rango objetivo.
 * Los bots miden el modo, no a humanos: no reemplaza partidas reales. */
const C=require('../../js/modes/crystal-wars/simulation'),assert=require('node:assert/strict');
const roles=Object.keys(C.ROLES),P=C.POLICIES;
const seedOffset=Number(process.env.CW_BALANCE_SEED_OFFSET||0);
assert(Number.isSafeInteger(seedOffset),'invalid seed offset');
const run=(slots,seed,pa,pb)=>{const s=C.create(slots,seed+seedOffset);if(pa)s.teams[0].policy=pa;if(pb)s.teams[1].policy=pb;while(!s.ended&&s.time<C.DURATION+1)C.step(s,1/30);return s;};
const pct=(a,b)=>b?a/b*100:0,fail=[];
// CW-3: requested faster matches, target mean 3–6.5 minutes; role/side/policy ceilings unchanged.
// roles: todas las parejas, N semillas
{const pairs=[];for(let i=0;i<4;i++)for(let j=i;j<4;j++)pairs.push([roles[i],roles[j]]);
 const w={},g={};roles.forEach(r=>{w[r]=0;g[r]=0;});let games=0,cr=0,tm=0,draws=0;
 for(let a=0;a<pairs.length;a++)for(let b=a+1;b<pairs.length;b++)for(let n=1;n<=6;n++){const p=pairs[a],q=pairs[b];
  const s=run([{champ:p[0]},{champ:p[1]},{champ:q[0]},{champ:q[1]}],n*7919+a*31+b);games++;tm+=s.time;if(s.teams[0].hp<=0||s.teams[1].hp<=0)cr++;if(s.winner===-1)draws++;
  for(const x of [...p,...q])g[x]++;if(s.winner>=0)for(const x of(s.winner===0?p:q))w[x]++;}
 const wr=Object.fromEntries(roles.map(r=>[r,pct(w[r],g[r])]));console.log('roles %',Object.fromEntries(Object.entries(wr).map(([k,v])=>[k,Math.round(v)])),'partidas',games,'cristal %',Math.round(pct(cr,games)),'empates %',Math.round(pct(draws,games)),'duración media s',Math.round(tm/games));
 for(const [r,v] of Object.entries(wr))if(v<40||v>60)fail.push('rol '+r+' '+Math.round(v)+'%');
 if(pct(cr,games)<90)fail.push('pocas partidas terminan en cristal');if(pct(draws,games)>3)fail.push('demasiados empates');
 if(tm/games<180||tm/games>390)fail.push('duración media fuera de rango');}
// políticas de compra
{const w={},g={};P.forEach(p=>{w[p]=0;g[p]=0;});
 for(const a of P)for(const b of P){if(a===b)continue;for(let n=1;n<=32;n++){const s=run([{champ:roles[n%4]},{champ:roles[(n+1)%4]},{champ:roles[(n+2)%4]},{champ:roles[(n+3)%4]}],n*104729+P.indexOf(a)*13+P.indexOf(b),a,b);g[a]++;g[b]++;if(s.winner>=0)w[s.winner===0?a:b]++;}}
 const wr=Object.fromEntries(P.map(p=>[p,pct(w[p],g[p])]));console.log('políticas %',Object.fromEntries(Object.entries(wr).map(([k,v])=>[k,Math.round(v)])));
 for(const [p,v] of Object.entries(wr))if(v<36||v>64)fail.push('política '+p+' '+Math.round(v)+'%');}
// lado: composiciones espejo
{let w=[0,0];for(let i=0;i<4;i++)for(let j=i;j<4;j++)for(let n=1;n<=15;n++){const s=run([{champ:roles[i]},{champ:roles[j]},{champ:roles[i]},{champ:roles[j]}],n*977+i*13+j+5000);if(s.winner>=0)w[s.winner]++;}
 const side=pct(w[0],w[0]+w[1]);console.log('espejo lado 1 %',Math.round(side));if(side<40||side>60)fail.push('ventaja de lado '+Math.round(side)+'%');}
if(fail.length){console.error('BALANCE FAIL:',fail.join(' · '));process.exit(1);}console.log('PASS balance gate de Guerra de Cristales');
