// Run a bounded CI shard against an already-started preview; never own someone else's server.
import {mkdir,writeFile} from 'node:fs/promises';
import {browserSuites} from './browser-ci-suites.ts';
const suite=process.argv[2];
if(!Object.hasOwn(browserSuites,suite))throw new Error(`Unknown browser suite ${JSON.stringify(suite)}; choose ${Object.keys(browserSuites).join(', ')}`);
const checks=[],started=performance.now();await mkdir('artifacts',{recursive:true});
try{
 for(const script of browserSuites[suite]){
  console.log(`\n[${suite}] ${script}`);const start=performance.now();
  const child=Bun.spawn([process.execPath,script],{stdout:'inherit',stderr:'inherit',env:process.env}),exitCode=await child.exited;
  const durationMs=Math.round(performance.now()-start);checks.push({script,exitCode,durationMs});
  console.log(`[${suite}] ${exitCode===0?'PASS':'FAIL'} ${script} (${(durationMs/1000).toFixed(1)}s)`);
  if(exitCode!==0){process.exitCode=exitCode;break;}
 }
}finally{
 await writeFile(`artifacts/ci-suite-${suite}.json`,JSON.stringify({suite,durationMs:Math.round(performance.now()-started),checks},null,2)+'\n');
}
