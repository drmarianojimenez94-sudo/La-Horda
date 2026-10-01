const fs=require('fs');
const visual=JSON.parse(fs.readFileSync('docs/vfx/combat-visual-results.json','utf8'));
const combat=JSON.parse(fs.readFileSync('docs/vfx/combat-results.json','utf8'));
const regression=JSON.parse(fs.readFileSync('docs/vfx/myla-regression-results.json','utf8'));
const reference=JSON.parse(fs.readFileSync('docs/balance/champion-entry-reference.json','utf8'));
const means=Object.fromEntries([...new Set(combat.runs.map(r=>r.champion))].map(k=>{
 const runs=combat.runs.filter(r=>r.champion===k);
 return[k,{samples:runs.length,meanDamage:runs.reduce((s,r)=>s+r.damage,0)/runs.length,survived:runs.filter(r=>r.alive).length}];
}));
const failures=visual.checks.concat(regression.checks).filter(c=>!c.ok);
const errors=[...visual.errors,...combat.errors,...regression.errors];
const report={base:'66a0296',scope:'VFX/HUD regression, not competitive balance certification',referenceVersion:reference.version,
 checks:visual.checks.length,regressionChecks:regression.checks.length,skills:visual.skills.length,simulations:combat.runs.length,
 failures,errors,means,visualReport:'combat-visual-results.json',simulationReport:'combat-results.json',regressionReport:'myla-regression-results.json'};
fs.writeFileSync('docs/vfx/combat-audit-results.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if(failures.length||errors.length||combat.runs.length!==54||combat.runs.some(r=>r.error||!Number.isFinite(r.damage)))process.exitCode=1;
