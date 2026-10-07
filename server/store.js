import {get,put,BlobPreconditionFailedError} from '@vercel/blob';
import {emptyState,LetterError} from './letters.js';
const pathname=()=>process.env.VERCEL_ENV==='production'?'letters/production-v1.json':'letters/development-v1.json';
export async function readState(){
 const result=await get(pathname(),{access:'private',useCache:false});
 if(!result)return {state:emptyState(),etag:null};
 const state=await new Response(result.stream).json();
 if(state.version!==1||!Array.isArray(state.letters)||!state.limits)throw Error('Invalid stored state');
 // Blob's compressed GET may prefix the stored entity tag with W/.
 // Conditional writes compare the original storage tag, not the transfer encoding.
 return {state,etag:result.blob.etag.replace(/^W\//,'')};
}
export async function transact(change){
 for(let attempt=0;attempt<7;attempt++){
  const {state,etag}=await readState();const result=change(state);if(result.replay)return {result,state};
  try{await put(pathname(),JSON.stringify(state),{access:'private',contentType:'application/json',addRandomSuffix:false,allowOverwrite:!!etag,...(etag?{ifMatch:etag}:{}),cacheControlMaxAge:60});return {result,state};}
  catch(e){if(!(e instanceof BlobPreconditionFailedError||/already exists|conflicting operation/i.test(e.message)))throw e;await new Promise(r=>setTimeout(r,100+Math.random()*200*(attempt+1)));}
 }
 throw new LetterError(503,'The mail slot is busy. Try again.');
}
