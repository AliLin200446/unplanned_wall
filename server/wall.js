import {LetterError,isVisible,readLetter} from './letters.js';
import {letterForm,letterHash} from '../dist/letter-forms.js';
const DAY=86400000;
const wallItem=l=>['pinned','covered','removed'].includes(l.wallState);
export function wallLife(l,now=Date.now()){
 const years=Math.max(0,(now-Date.parse(l.pinnedAt)))/(DAY*365);
 return {age:Math.min(1,years/8),remnant:years>=12,ghost:years>=20||l.wallState==='removed'};
}
export function publicWall(state,now=Date.now()){
 return state.letters.filter(l=>wallItem(l)&&l.allowPinToWall===true&&isVisible(l)).map(l=>({id:l.id,createdAt:l.createdAt,pinnedAt:l.pinnedAt,wallX:l.wallX,wallY:l.wallY,rotation:l.rotation,layer:l.layer,width:l.width,height:l.height,attachmentType:l.attachmentType,wallState:l.wallState,...wallLife(l,now),...(!wallLife(l,now).ghost?readLetter(state,l.id):{})}));
}
const intersection=(a,b)=>Math.max(0,Math.min(a.wallX+a.width/2,b.wallX+b.width/2)-Math.max(a.wallX-a.width/2,b.wallX-b.width/2))*Math.max(0,Math.min(a.wallY+a.height/2,b.wallY+b.height/2)-Math.max(a.wallY-a.height/2,b.wallY-b.height/2));
export function pinLetter(state,id,now=Date.now()){
 const l=state.letters.find(l=>l.id===id&&isVisible(l));
 if(!l)throw new LetterError(404,'This paper is no longer available.');
 if(l.allowPinToWall!==true)throw new LetterError(403,'This letter must stay in its mailbox.');
 if(wallItem(l))return {id:l.id,alreadyPinned:true,replay:true};
 const form=letterForm(l.id,l.createdAt),width=form.width,height=Math.max(.85,form.height*2.2),old=state.letters.filter(wallItem),hash=letterHash(id);
 let best=null;
 for(let i=0;i<120;i++){
  const n=(hash+i*2654435761)>>>0,x=-1.8+width/2+((n%997)/996)*(3.6-width),y=-2.4+height/2+(((n>>>10)%991)/990)*(4.8-height);
  const c={wallX:x,wallY:y,width,height};let score=0,valid=true;
  for(const b of old){const ratio=intersection(c,b)/(b.width*b.height);const days=(now-Date.parse(b.pinnedAt))/DAY;if(days<1&&ratio>.12){valid=false;break;}score+=ratio*(days<1?60:Math.max(.2,8/(1+days/30)));}
  if(valid&&(!best||score<best.score))best={...c,score};
 }
 if(!best)throw new LetterError(409,'The fresh paper needs time. Try another day.');
 Object.assign(l,{wallState:'pinned',wallX:best.wallX,wallY:best.wallY,width,height,rotation:((hash>>>7)%15-7)*.012,attachmentType:'tack',pinnedAt:new Date(now).toISOString(),layer:old.reduce((n,b)=>Math.max(n,b.layer||0),0)+1});
 for(const b of old)if(b.wallState!=='removed'&&intersection(l,b)/(b.width*b.height)>.55)b.wallState='covered';
 return {id:l.id,alreadyPinned:false};
}
