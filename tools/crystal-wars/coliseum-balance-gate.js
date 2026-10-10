'use strict';
const assert=require('node:assert/strict'),C=require('../../js/modes/crystal-wars/simulation');
const roles=['tanque','guerrero','mago','soporte'],pairs=[];for(let i=0;i<4;i++)for(let j=i;j<4;j++)pairs.push([roles[i],roles[j]]);
const report={version:C.VERSION,mode:'coliseum',step:1/30,damageScale:C.DAMAGE_SCALE,games:0,roles:{},mirrorWins:[0,0],draws:0,seconds:0};roles.forEach(r=>report.roles[r]={wins:0,games:0});
function run(champs,seed){const s=C.create(champs.map(champ=>({champ})),seed,{mode:'coliseum'});while(!s.ended&&s.time<C.DURATION+1)C.step(s,1/30);assert(s.ended);return s;}
for(let a=0;a<pairs.length;a++)for(let b=a+1;b<pairs.length;b++)for(let n=1;n<=2;n++)for(let side=0;side<2;side++){const p=pairs[side?b:a],q=pairs[side?a:b],s=run(p.concat(q),n*7919+a*31+b);report.games++;report.seconds+=s.time;if(s.winner===-1)report.draws++;for(const r of p.concat(q))report.roles[r].games++;if(s.winner>=0)for(const r of(s.winner===0?p:q))report.roles[r].wins++;}
for(const p of pairs)for(let seed=1;seed<=6;seed++){const s=run(p.concat(p),seed);if(s.winner>=0)report.mirrorWins[s.winner]++;}
for(const r of Object.values(report.roles))r.winRate=r.wins/r.games*100;report.averageSeconds=report.seconds/report.games;report.mirrorSide0=report.mirrorWins[0]/(report.mirrorWins[0]+report.mirrorWins[1])*100;
console.log(JSON.stringify(report,null,2));
for(const [role,r] of Object.entries(report.roles))assert(r.winRate>=40&&r.winRate<=60,role+' win rate '+r.winRate.toFixed(1));assert(report.mirrorSide0>=40&&report.mirrorSide0<=60,'mirror side bias');assert(report.draws/report.games<=.05,'draw rate');assert(report.averageSeconds>=60&&report.averageSeconds<=300,'duration');console.log('PASS Coliseum balance gate (bot sample, not human ranked certification)');
