// Optional integration check against the private DEVELOPMENT collection only.
import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {readState,transact} from '../server/store.js';import {appendLetter,validate} from '../server/letters.js';
if(process.env.VERCEL_ENV==='production'||process.env.VERCEL)throw Error('Run locally with development credentials only.');
const ids=Array.from({length:5},()=>randomUUID());
try{
 const results=await Promise.allSettled(ids.map((id,i)=>transact(s=>appendLetter(s,validate({id,mailboxId:'15',message:'Concurrent storage test '+i,optionalUrl:null}),'test-'+id))));
 for(const r of results)if(r.status==='rejected')throw r.reason;
 const {state}=await readState();for(const id of ids)assert.equal(state.letters.filter(l=>l.id===id).length,1);
 const l=state.letters.find(l=>l.id===ids[0]);assert((await transact(s=>appendLetter(s,validate({id:l.id,mailboxId:'15',message:l.message,optionalUrl:null}),'retry-test'))).result.replay);
 console.log('PASS: 5 simultaneous real-storage writes survive; retry adds no duplicate.');
}finally{await transact(s=>{s.letters=s.letters.filter(l=>!ids.includes(l.id));for(const id of ids)delete s.limits['test-'+id];return {};});}
