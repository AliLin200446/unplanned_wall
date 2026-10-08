import {people,personForMailbox} from '../dist/people.js';
// Trusted, versioned fixtures only. No public endpoint can create owner material.
const templates=[
 ['IMAGE','Afternoon fragments','A placeholder study of light, concrete and passing shadows.','light'],
 ['WORK','A small interface','A placeholder study: a quieter place to leave a thought.','interface'],
 ['VIDEO','Between frames','A placeholder experiment in repetition and motion.','frames'],
 ['NOTE','A note to myself','Keep the unfinished things. Sometimes the interesting part is what remains between attempts.'],
 ['LETTER','','I keep thinking about the small details you notice. The marks people leave behind can say so much.'],
 ['LETTER','','That unfinished experiment stayed with me. I hope you keep making room for these quiet things.'],
 ['LETTER','','I passed this building again today. It reminded me of our conversation about things that accumulate.'],
 ['COLLABORATION','','Mock collaboration stationery. No real contact information.']
];
const mixes=[[0,0,3],[1,3],[3],[2,2,6,3],[3,4,5,6],[1],[0,0,0,4],[7,6,5,4,3,2,1,0],[1,2,3],[3,7],[2,2],[1,1,4,5,6],[3,4],[0],[]];
export function seedDirectory(state){
 if(state.directoryVersion===1)return false;
 state.people=people.map(p=>({...p}));
 // Existing visitor records keep their IDs, addresses, moderation and consent.
 for(const l of state.letters){const p=personForMailbox(l.mailboxId);if(p){l.personId??=p.id;l.sourceType??='VISITOR';l.mediaType??='LETTER';l.visibility??='public';}}
 people.forEach((p,index)=>mixes[index].forEach((t,n)=>{
  const id=`a1100000-${String(index+1).padStart(4,'0')}-4000-8000-${String(n+1).padStart(12,'0')}`;
  if(state.letters.some(l=>l.id===id))return;
  const [mediaType,title,message,visual]=templates[t];
  state.letters.push({id,mailboxId:p.mailboxId,personId:p.id,sourceType:t<4?'OWNER':'VISITOR',mediaType,
   content:{title,visual:visual||null},message,optionalUrl:null,allowPinToWall:false,
   visibility:mediaType==='COLLABORATION'?'private':'public',mock:mediaType==='COLLABORATION',
   createdAt:`2026-09-${String(10+n).padStart(2,'0')}T12:00:00.000Z`,status:'visible',wallState:'mailbox'});
 }));
 // Add two distinct, quiet media forms outside the hero mailbox.
 const extra=(index,mediaType,title,message,optionalUrl)=>{const p=people[index];state.letters.push({id:`a1100000-${String(index+1).padStart(4,'0')}-4000-8000-000000000099`,mailboxId:p.mailboxId,personId:p.id,sourceType:'OWNER',mediaType,content:{title,visual:mediaType==='DOCUMENT'?'document':null},message,optionalUrl,allowPinToWall:false,visibility:'public',createdAt:'2026-09-09T12:00:00.000Z',status:'visible',wallState:'mailbox'});};
 extra(5,'LINK','An open notebook','A place to begin looking. Placeholder reference.','https://www.are.na/');
 extra(11,'DOCUMENT','Loose observations','An unfinished prototype notebook.\n\n01 — Watch where people pause.\n02 — Keep the small traces.\n03 — Leave room for another hand.',null);
 state.directoryVersion=1;return true;
}
