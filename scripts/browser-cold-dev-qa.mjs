// Exercise the first browser against a fresh optimizer, without clearing a user's cache.
import {dev} from 'astro';
import {mkdtemp,mkdir,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';

const cache=await mkdtemp(join(tmpdir(),'fieldnotes-cold-dev-'));
const output=resolve(process.env.QA_STYLE_ARTIFACTS||'artifacts/converter-navigation-dev');
await mkdir(output,{recursive:true});
let server,url=null,exitCode=null;
try{
 console.log('Starting development navigation with an isolated, empty Vite cache');
 server=await dev({server:{host:'127.0.0.1',port:0},vite:{cacheDir:join(cache,'vite'),server:{strictPort:true}}});
 url=`http://127.0.0.1:${server.address.port}`;
 const child=Bun.spawn([process.execPath,'scripts/browser-converter-navigation-qa.mjs'],{
  stdout:'inherit',stderr:'inherit',env:{...process.env,QA_URL:url,QA_STYLE_ARTIFACTS:output},
 });
 exitCode=await child.exited;process.exitCode=exitCode;
}finally{
 try{await server?.stop();}
 finally{
  try{
   const metadata=await readFile(join(cache,'vite/deps/_metadata.json'),'utf8').catch(error=>{
    if(error.code==='ENOENT')return null;throw error;
   });
   await writeFile(join(output,'cold-start.json'),JSON.stringify({coldCache:true,url,exitCode,optimizer:metadata?JSON.parse(metadata):null},null,2)+'\n');
  }finally{await rm(cache,{recursive:true,force:true});}
 }
}
