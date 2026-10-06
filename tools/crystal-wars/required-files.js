#!/usr/bin/env node
'use strict';
// Guerra de Cristales vive dentro de index.html: para que abra, el servidor tiene que publicar la versión ACTUAL del juego
// (index.html con su pantalla del Coliseo) y estos archivos propios del modo. Este script los lista y verifica que existan en
// el repositorio. crystal-wars.html ya no es una página: solo redirige los enlaces de invitación viejos a index.html?cw=1.
// Uso: node tools/crystal-wars/required-files.js [--json]
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=path.resolve(__dirname,'../..');
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
const files=new Set(['index.html','crystal-wars.html']);
const html=read('index.html');
if(!html.includes('id="crystalwars-screen"')){ console.error('index.html no tiene la pantalla #crystalwars-screen'); process.exit(1); }
for(const m of html.matchAll(/(?:src|href)="([^"#?]+)(?:[?#][^"]*)?"/g)){ if(/crystal-wars/.test(m[1])) files.add(m[1]); }
files.add('js/ai/bot-identity.js'); // nombres de los compañeros que completa el juego (lo usa el Coliseo)
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
