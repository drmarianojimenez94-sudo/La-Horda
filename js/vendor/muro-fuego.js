/* Módulo de terceros: Muro de Fuego (arte + animación, imagen embebida) */
/* Atlas embebido: funciona sin fetch ni dependencias. Tiempo en segundos. */
(function(g){
const image=new Image(); image.src="assets/vfx/vendor/muro-fuego.png";
const animations={"lanzamiento": {"frames": [0, 1, 2, 3], "fps": 8, "loop": false}, "formacion": {"frames": [4, 5, 6, 7], "fps": 8, "loop": false}, "activo": {"frames": [8, 9, 10, 11], "fps": 10, "loop": true}, "extincion": {"frames": [12], "fps": 3, "loop": false}, "quemadura": {"frames": [13, 14], "fps": 8, "loop": true}};
function draw(ctx,name,time,x,y,size=160){
 const a=animations[name]; if(!a) throw Error('Animación desconocida: '+name);
 if(!image.complete || !image.naturalWidth) return;
 let n=Math.max(0,Math.floor(time*a.fps));n=a.loop?n%a.frames.length:Math.min(n,a.frames.length-1);
 const f=a.frames[n];ctx.save();ctx.imageSmoothingEnabled=false;
 ctx.drawImage(image,(f%4)*256,Math.floor(f/4)*256,256,256,x-size*.5,y-size*.9,size,size);ctx.restore();
}
// Solo presentación visual. El juego debe calcular colisión, daño y enfriamiento.
function drawWall(ctx,age,x,y,size=200,duration=4){
 if(age<0 || age>=duration+.35)return;
 if(age<.5)draw(ctx,'formacion',age,x,y,size);
 else if(age<duration)draw(ctx,'activo',age-.5,x,y,size);
 else {ctx.save();ctx.globalAlpha*=1-(age-duration)/.35;draw(ctx,'extincion',age-duration,x,y,size);ctx.restore();}
}
g.MuroFuego={image,animations,draw,drawWall};
})(globalThis);

