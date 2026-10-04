'use strict';
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync('js/storage/save.js','utf8');
const body=source.slice(source.indexOf('function laHordaDevMode()'),source.indexOf('// PEDIDO DEL USUARIO',source.indexOf('function laHordaDevMode()')));
for(const hostname of ['fondalstudios.com','drmarianojimenez94-sudo.github.io','localhost','127.0.0.1','[::1]']){
 const data=new Map([['laHordaDev','1']]);const c=vm.createContext({window:{},URLSearchParams,location:{hostname,search:'?dev=1'},localStorage:{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}});
 vm.runInContext(body,c);assert.equal(vm.runInContext('laHordaDevMode()',c),['localhost','127.0.0.1','[::1]'].includes(hostname));
 c.window.__campaignMode=true;assert.equal(vm.runInContext('laHordaDevMode()',c),false);
}
const portadores=fs.readFileSync('js/data/portadores.js','utf8');assert(!/unlockedByDefault\s*:\s*true/.test(portadores));
console.log('PASS public URLs cannot grant dev progression; localhost debugging preserved; new champions locked by default');
