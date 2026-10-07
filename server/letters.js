import {publicWall} from './wall.js';
import {createHmac, randomInt} from 'node:crypto';
export const CAPACITY=24;
export const MAILBOX_IDS=Array.from({length:15},(_,i)=>String(i+1));
export class LetterError extends Error {constructor(status,message){super(message);this.status=status;}}
export function validate(body){
 if(!body||typeof body!=='object'||Array.isArray(body))throw new LetterError(400,'Invalid letter.');
 if(typeof body.message!=='string')throw new LetterError(400,'Write something first.');
 const message=body.message.trim();
 if(!message||Array.from(message).length>280||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(message))throw new LetterError(400,'Use 1–280 characters.');
 if(typeof body.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id))throw new LetterError(400,'Invalid delivery ID.');
 let optionalUrl=null;
 if(body.optionalUrl!==undefined&&body.optionalUrl!==null&&body.optionalUrl!==''){
  if(typeof body.optionalUrl!=='string'||body.optionalUrl.length>2048)throw new LetterError(400,'Use a valid http or https link.');
  const value=body.optionalUrl.trim();
  try{const u=new URL(value);if(!/^https?:\/\//i.test(value)||!['http:','https:'].includes(u.protocol)||u.username||u.password||/[\s\\\u0000-\u001f]/u.test(value)||!u.hostname)throw Error();optionalUrl=u.href;}catch{throw new LetterError(400,'Use a valid http or https link.');}
 }
 if(body.allowPinToWall!==undefined&&typeof body.allowPinToWall!=='boolean')throw new LetterError(400,'Invalid permission.'); return {id:body.id,message,optionalUrl,allowPinToWall:body.allowPinToWall===true};
}
export const emptyState=()=>({version:1,letters:[],limits:{}});
// Records written before reading was introduced are grandfathered as visible.
export const isVisible=letter=>letter.status===undefined||letter.status==='visible';
export function readLetter(state,id){
 if(typeof id!=='string'||!/^[0-9a-f-]{36}$/i.test(id))throw new LetterError(404,'This paper is no longer available.');
 const letter=state.letters.find(l=>l.id===id&&isVisible(l));
 if(!letter)throw new LetterError(404,'This paper is no longer available.');
 let optionalUrl=null;try{optionalUrl=validate({id:letter.id,message:letter.message,optionalUrl:letter.optionalUrl}).optionalUrl;}catch{}
 return {message:letter.message,optionalUrl,createdAt:letter.createdAt,allowPinToWall:letter.allowPinToWall===true,wallState:letter.wallState||'mailbox'};
}
export function publicState(state){return {mailboxes:MAILBOX_IDS.map(id=>({id,capacity:CAPACITY,letters:state.letters.filter(l=>l.mailboxId===id&&isVisible(l)&&(!l.wallState||l.wallState==='mailbox')).map(l=>({id:l.id,createdAt:l.createdAt}))})),wall:publicWall(state)};}
export function chooseMailbox(letters,random=()=>randomInt(1000000)/1000000){
 const all=MAILBOX_IDS.map(id=>({id,count:letters.filter(l=>l.mailboxId===id&&(!l.wallState||l.wallState==='mailbox')).length})).filter(b=>b.count<CAPACITY);
 if(!all.length)throw new LetterError(409,'The mailboxes are full. Try another day.');
 const roll=random(),category=roll<.7?0:roll<.9?1:2;
 const pools=[all.filter(b=>b.count<13),all.filter(b=>b.count>=8&&b.count<19),all.filter(b=>b.count>=19)];
 const pool=pools[category].length?pools[category]:all;
 // Stable, unequal arrival preferences produce pockets of accumulation.
 const weights=pool.map(b=>[1,1.5,.7,2.1,.8,1.2,1.6,.9,.6,1.3,.8,2.4,1.2,1.8,.9][Number(b.id)-1]);
 let pick=random()*weights.reduce((a,b)=>a+b,0);return (pool.find((b,i)=>(pick-=weights[i])<0)||pool.at(-1)).id;
}
export function clientKey(ip,secret,now=Date.now()){return createHmac('sha256',secret).update(`${Math.floor(now/86400000)}:${ip}`).digest('hex');}
export function appendLetter(state,input,key,now=Date.now(),random){
 const existing=state.letters.find(l=>l.id===input.id);
 if(existing){if(existing.message!==input.message||existing.optionalUrl!==input.optionalUrl||(existing.allowPinToWall===true)!==(input.allowPinToWall===true))throw new LetterError(409,'This delivery ID was already used.');return {letter:existing,replay:true};}
 state.limits=Object.fromEntries(Object.entries(state.limits).filter(([,v])=>v.reset>now));
 const limit=state.limits[key];
 if(limit&&(limit.count>=5||now-limit.last<15000))throw new LetterError(429,'Please let the paper settle. Try again in a little while.');
 const letter={...input,mailboxId:chooseMailbox(state.letters,random),createdAt:new Date(now).toISOString(),status:'visible',wallState:'mailbox'};
 state.letters.push(letter);state.limits[key]={count:(limit?.count||0)+1,last:now,reset:limit?.reset||now+3600000};
 return {letter,replay:false};
}
