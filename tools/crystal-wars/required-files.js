#!/usr/bin/env node
'use strict';
// Lista los archivos que el servidor tiene que publicar para que "Guerra de Cristales" abra (crystal-wars.html y todo lo
// que carga) y verifica que existan en el repositorio. Sirve para el paso de publicar el juego: si el servidor responde
// "No esta: /crystal-wars.html", es que falta publicar esta lista.
// Uso: node tools/crystal-wars/required-files.js [--json]
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=path.resolve(__dirname,'../..');
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
const files=new Set(['crystal-wars.html']);
const html=read('crystal-wars.html');
for(const m of html.matchAll(/(?:src|href)="([^"#?]+)(?:[?#][^"]*)?"/g)){ if(!/^(https?:)?\/\//.test(m[1])&&!m[1].startsWith('index.html')) files.add(m[1]); }
const client=read('js/modes/crystal-wars/client.js');
for(const m of client.matchAll(/'(assets\/[^']*\.(?:png|webp|jpg|ogg|mp3))'/g)) files.add(m[1]);
// imágenes armadas con un número o con la clase: walk1..4 del esqueleto y el atlas de cada rol
for(let i=1;i<=4;i++) files.add(`assets/sprites/enemies/infernal/esqueleto_h/walk${i}.png`);
const ctx={window:{},console};ctx.globalThis=ctx;vm.createContext(ctx);
try{ vm.runInContext(read('js/modes/crystal-wars/simulation.js')+';this.__CW=typeof CrystalWars!=="undefined"?CrystalWars:null;',ctx); }catch(e){}
const roles=ctx.__CW&&ctx.__CW.ROLES?Object.keys(ctx.__CW.ROLES):[];
for(const k of roles) files.add(`assets/sprites/champions/${k}/atlas.png`);
const list=[...files].sort(),missing=list.filter(f=>!fs.existsSync(path.join(ROOT,f)));
if(process.argv.includes('--json')) console.log(JSON.stringify({files:list,missing},null,1));
else{ console.log(`Guerra de Cristales necesita ${list.length} archivos:`);for(const f of list) console.log((missing.includes(f)?'  FALTA  ':'  ')+f); }
if(!roles.length){ console.error('No se pudieron leer los roles de simulation.js'); process.exit(1); }
if(missing.length){ console.error(`Faltan ${missing.length} archivos en el repositorio.`); process.exit(1); }
