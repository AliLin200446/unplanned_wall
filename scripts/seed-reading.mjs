// Real private development data for visual testing. Never touches production.
import {transact} from '../server/store.js';import {randomUUID} from 'node:crypto';
if(process.env.VERCEL_ENV==='production'||process.env.VERCEL)throw Error('Development credentials only.');
const {state}=await transact(s=>{
 for(const [mailboxId,count]of [['2',1],['3',5],['4',12],['5',21]]){
  const current=s.letters.filter(l=>l.mailboxId===mailboxId&&(!l.status||l.status==='visible')).length;
  for(let n=current;n<count;n++)s.letters.push({id:randomUUID(),mailboxId,message:n===0?'The afternoon rain left everything a little quieter.\n\nSomeone was here before you.':'A small piece of the day, left here for whoever finds it.\n\nTake your time.',optionalUrl:n%3===0?'https://example.com/':null,createdAt:new Date(Date.now()-n*40*86400000).toISOString(),status:'visible',testFixture:'reading-v1'});
 }
 if(!s.letters.some(l=>l.testFixture==='reading-hidden'))for(const status of ['hidden','pending'])s.letters.push({id:randomUUID(),mailboxId:'1',message:'This must never leave private storage.',optionalUrl:null,createdAt:new Date().toISOString(),status,testFixture:'reading-hidden'});
 return {};
});
console.log('Private development fixtures ready: visible mailboxes 1–5 =',Array.from({length:5},(_,i)=>state.letters.filter(l=>l.mailboxId===String(i+1)&&(!l.status||l.status==='visible')).length));
