import {pinLetter} from '../server/wall.js';
import {validate,readLetter,appendLetter,publicState,clientKey,LetterError} from '../server/letters.js';
import {readState,transact} from '../server/store.js';
export const config={maxDuration:30};
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Robots-Tag','noindex, nofollow');
 const send=(code,body)=>{res.statusCode=code;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(body));};
 try{
  if(req.method==='GET'){send(200,publicState((await readState()).state));return;}
  if(req.method!=='POST'){res.setHeader('Allow','GET, POST');send(405,{error:'Method not allowed.'});return;}
  const origin=req.headers.origin;
  const allowed=new Set(['https://unplannedwall.alilinlab.com','https://unplannedwall.vercel.app',...(process.env.VERCEL_URL?[`https://${process.env.VERCEL_URL}`]:[]),...(process.env.NODE_ENV!=='production'&&!process.env.VERCEL?['http://127.0.0.1:4173','http://localhost:4173','http://127.0.0.1:4174','http://localhost:4174']:[])]);
  if(!origin||!allowed.has(origin))throw new LetterError(403,'This letter must be sent from the wall.');
  if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))throw new LetterError(415,'Use JSON.');
  if(Number(req.headers['content-length'])>4096)throw new LetterError(413,'Letter is too large.');
  let body=req.body;
  if(body===undefined){let length=0,chunks=[];for await(const chunk of req){length+=chunk.length;if(length>4096)throw new LetterError(413,'Letter is too large.');chunks.push(chunk);}body=Buffer.concat(chunks).toString('utf8');}
  if(Buffer.byteLength(typeof body==='string'?body:JSON.stringify(body))>4096)throw new LetterError(413,'Letter is too large.');
  if(typeof body==='string'){try{body=JSON.parse(body);}catch{throw new LetterError(400,'Invalid letter.');}}
  if(body?.action==='read'){send(200,{letter:readLetter((await readState()).state,body.id)});return;}
  if(body?.action==='pin'){const {result,state}=await transact(s=>pinLetter(s,body.id));send(200,{letter:result,...publicState(state)});return;}
  const input=validate(body);
  const secret=process.env.LETTER_RATE_SECRET||process.env.BLOB_READ_WRITE_TOKEN;
  if(!secret)throw Error('Storage credentials missing');
  // Vercel overwrites x-vercel-forwarded-for; do not trust a client-selected IP.
  const ip=process.env.VERCEL?(req.headers['x-vercel-forwarded-for']||'unknown'):req.socket?.remoteAddress||'local';
  const key=clientKey(String(ip),secret);
  const {result,state}=await transact(s=>appendLetter(s,input,key));
  send(result.replay?200:201,{letter:{id:result.letter.id,mailboxId:result.letter.mailboxId},...publicState(state)});
 }catch(e){if(!(e instanceof LetterError))console.error('Letter storage unavailable:',e.name);send(e.status||503,{error:e instanceof LetterError?e.message:'Delivery failed. Your letter is still here. Try again.'});}
}
