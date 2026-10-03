'use strict';
// Read initialized registries, including late champion registrations; never writes saves.
const fs=require('node:fs');let chromium;try{({chromium}=require('playwright'));}catch(e){({chromium}=require(process.env.PLAYWRIGHT_MODULE||'/opt/node22/lib/node_modules/playwright'));}
(async()=>{
 const base=process.env.FACTORY_BASE_URL;if(!base)throw Error('Set FACTORY_BASE_URL to your local repository server');
 if(!['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname))throw Error('Local audit only');
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(),args:['--no-sandbox']});
 try{
  const page=await browser.newPage(),pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));await page.goto(base);await page.waitForFunction(()=>typeof CLASSES!=='undefined'&&typeof TALENT_TREES!=='undefined');
  const roster=await page.evaluate(()=>Object.entries(CLASSES).map(([id,c])=>{
   const issues=[],abilities=[...(c.skills||[]),c.ultimate].filter(Boolean);
   if(!c.name||!c.roleCategory)issues.push('missing name or role');
   if(c.skills?.length!==3||!c.ultimate)issues.push('incomplete kit');
   if(abilities.some(a=>!a.name||!a.desc||!Number.isFinite(a.cd)))issues.push('ability missing description or cooldown');
   if(typeof CODEX_CHAMP_LORE==='undefined'||!CODEX_CHAMP_LORE[id]?.history)issues.push('missing Codex history');
   if(!TALENT_TREES[id])issues.push('missing talent tree');
   const sets=typeof CHAMPION_SETS==='undefined'?[]:Object.entries(CHAMPION_SETS).filter(([,s])=>s.champion===id).map(([key])=>key);if(!sets.length)issues.push('missing champion set');
   const hordeCandidate=abilities.some(a=>a.radius>0||a.outerR>0||a.jumps>1||a.chainRadius>0)||!!c.basicArc;
   return{id,name:c.name,role:c.roleCategory,sets,issues,hordeReview:hordeCandidate?'candidate; gameplay verification required':'manual gameplay review required'};
  }));
  const result={schemaVersion:1,scope:'runtime registrations only; not gameplay/visual approval',roster,pageErrors};if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({champions:roster.length,issues:roster.filter(c=>c.issues.length),pageErrors},null,2));if(pageErrors.length||roster.some(c=>c.issues.length))process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
