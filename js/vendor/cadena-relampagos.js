/* Módulo de terceros: Cadena de Relámpagos (arte + animación, imagen embebida) */
(function(g){
const image=new Image();image.src='assets/vfx/vendor/cadena-relampagos.png';
const animations={"lanzamiento": {"frames": [0, 1, 2, 3], "fps": 8, "loop": false}, "rayo": {"frames": [4, 5, 6, 7], "fps": 16, "loop": true}, "electrificado": {"frames": [8, 9, 10, 11], "fps": 10, "loop": true}, "impacto": {"frames": [12, 13], "fps": 10, "loop": false}, "carga": {"frames": [14], "fps": 1, "loop": true}};
function draw(ctx,name,time,x,y,width=128,height=width){
const a=animations[name];if(!a)throw Error('Animación desconocida: '+name);
if(!image.complete||!image.naturalWidth)return;
let n=Math.max(0,Math.floor(time*a.fps));n=a.loop?n%a.frames.length:Math.min(n,a.frames.length-1);const f=a.frames[n];
ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(image,f%4*256,Math.floor(f/4)*256,256,256,x-width/2,y-height/2,width,height);ctx.restore();}
function drawLink(ctx,time,a,b,thickness=55){const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d<1)return;ctx.save();ctx.translate((a.x+b.x)/2,(a.y+b.y)/2);ctx.rotate(Math.atan2(dy,dx));draw(ctx,'rayo',time,0,0,d*1.2,thickness);ctx.restore();}
function drawChain(ctx,time,points,thickness=55){for(let i=1;i<points.length;i++)drawLink(ctx,time+i*.03,points[i-1],points[i],thickness);}
g.CadenaRelampagos={image,animations,draw,drawLink,drawChain};
})(globalThis);

