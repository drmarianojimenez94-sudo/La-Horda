'use strict';
// Deterministic mirror/side-swapped bot sample. This reports balance; it is not certification of human PvP.
const C=require('../../js/modes/crystal-wars/simulation');
const bases=['tanque','guerrero','mago','soporte'],profiles=Object.keys(C.ROLES);
const seeds=[17,991],report={version:C.VERSION,step:.1,method:'Exploratory: each champion versus its reference archetype, same ally, four allies, two seeds, both sides. Not a human PvP balance gate.',modes:{}};
function run(champs,seed,mode){const s=C.create(champs.map(champ=>({champ,founder:C.ROLES[champ].founder})),seed,{mode});if(s.heroes.some((h,i)=>h.role!==champs[i]))throw Error('Roster fixture fallback');while(!s.ended&&s.time<C.DURATION+1)C.step(s,.1);if(!s.ended||s.heroes.some(h=>!Number.isFinite(h.hp)||!Number.isFinite(h.x)))throw Error('Invalid simulation '+champs);return s;}
for(const mode of ['crystal','coliseum']){const out={profiles:{},archetypes:{},games:0,sideWins:[0,0],draws:0,seconds:0};
 for(const role of bases)out.archetypes[role]={wins:0,games:0};
 for(const profile of profiles){const p={wins:0,games:0,damage:0,deaths:0};for(const seed of seeds)for(const ally of bases)for(let side=0;side<2;side++){const pair=[profile,ally],rival=[C.ROLES[profile].archetype||profile,ally],champs=side?rival.concat(pair):pair.concat(rival),s=run(champs,seed,mode);p.games++;out.games++;out.seconds+=s.time;const score=s.winner===-1?.5:s.winner===side?1:0;p.wins+=score;p.damage+=s.heroes[side*2].stats.dmg;p.deaths+=s.heroes[side*2].stats.deaths;if(s.winner===-1)out.draws++;else out.sideWins[s.winner]++;const a=out.archetypes[C.ROLES[profile].archetype||profile];a.games++;a.wins+=score;}p.winRate=+(p.wins/p.games*100).toFixed(1);p.averageDamage=Math.round(p.damage/p.games);p.averageDeaths=+(p.deaths/p.games).toFixed(1);out.profiles[profile]=p;}
 for(const a of Object.values(out.archetypes))a.winRate=+(a.wins/a.games*100).toFixed(1);out.averageSeconds=Math.round(out.seconds/out.games);report.modes[mode]=out;
}
console.log(JSON.stringify(report,null,2));
