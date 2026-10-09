"use strict";
// Ability Gate: auditoría estática, diagnóstica; no sustituye pruebas de combate.
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.resolve(__dirname, "../..");
const read = p => fs.readFileSync(path.join(root,p),"utf8");
const data = read("js/data/champions.js");
const skillsRoot = path.join(root,"js");
function walk(dir){
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
    const p=path.join(dir,e.name);
    return e.isDirectory()?walk(p):e.isFile()&&p.endsWith(".js")?[p]:[];
  });
}
const source=walk(skillsRoot).filter(p=>!p.endsWith("data/champions.js")).map(p=>fs.readFileSync(p,"utf8")).join("\n");
const catalog=[...data.matchAll(/\{id:"([a-z_]+)",\s*priceGold:/g)].map(m=>m[1]);
const kinds=[...data.matchAll(/kind:"([a-z_]+)"/g)].map(m=>m[1]);
const unique=[...new Set(kinds)];
const missing=unique.filter(k=>!source.includes('"'+k+'"')&&!source.includes("'"+k+"'"));
const report={gate:"ABILITY_STATIC",champions:catalog.length,abilityKinds:unique.length,missingHandlerReferences:missing,
 warnings:["La referencia textual de kind no prueba que la habilidad funcione.","El test dinámico debe cubrir daño, cooldown, limpieza, talentos, jefes, coop y PvP."]};
console.log(JSON.stringify(report,null,2));
if(!catalog.length || !unique.length || missing.length)process.exitCode=1;
