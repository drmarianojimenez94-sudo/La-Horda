'use strict';
// Explicit isolated workshop. Never writes production index or changes live profiles.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),port=Number(process.env.EXPEDITION_PORT||8806);
const injected=['catalog','register','runtime','render'].map(n=>`<script src="js/champions/expedition/${n}.js"></script>`).join('\n');
http.createServer((req,res)=>{try{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 let data=fs.readFileSync(file);const ext=path.extname(file);
 if(file===path.join(root,'index.html'))data=data.toString().replace('<script src="js/systems/champion-entry-balance.js">',injected+'\n<script src="js/systems/champion-entry-balance.js">').replace('</body>','<div style="position:fixed;top:0;left:0;z-index:999999;background:#201526;color:#ffe5a0;padding:5px;pointer-events:none;font:12px sans-serif">TALLER · 10 CANDIDATOS · ARTE PROVISIONAL · NO APROBADOS</div></body>');
 if(file===path.join(root,'js/skills/abilities.js'))data=data.toString().replace('switch(sk.kind){','switch(sk.kind){\n case "expedition": expeditionCast(caster,sk,isUlt,dmg,AREA,DUR,POWER); break;');
 res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json','.ogg':'audio/ogg','.mp3':'audio/mpeg'})[ext]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);
 }catch(e){res.writeHead(404).end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log('Expedition workshop http://127.0.0.1:'+port));
