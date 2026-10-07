import {paperGeometry,feedSlot,SLOT_PATH_LENGTH} from './paper-physics.js';
import {letterForm} from './letter-forms.js';
import * as THREE from './vendor/three.module.js';
import {createLetterMatter} from './letter-matter.js';
import {createWallLetters} from './wall-letters.js';
import {createLetterReader} from './letter-reader.js';
export function createLetterExperience({scene,camera,renderer,boxes,board,reduced,sound,unlockAudio,openMailbox}){
 const matter=createLetterMatter(scene,boxes,{sound,reduced});
 const desk=document.createElement('section');desk.id='letter-desk';desk.setAttribute('aria-label','Letter paper');
 desk.innerHTML=`<div id="letter-paper" class="paper-face"><button id="paper-pickup" aria-label="Write a letter"><span>WRITE SOMETHING</span></button><div id="letter-writing" hidden><div class="paper-heading"><span>TO SOMEWHERE IN THIS BUILDING</span><button id="letter-close" aria-label="Put the paper back">×</button></div><textarea id="letter-message" aria-label="Your anonymous letter" placeholder="Leave a few words here." spellcheck="true" aria-describedby="paper-error letter-count"></textarea><p id="letter-count"></p><input id="letter-link" type="url" aria-label="Optional link" placeholder="https://" maxlength="2048" hidden><div id="pin-permission"><button type="button" id="keep-mailbox" aria-pressed="true">KEEP IN MAILBOX</button><button type="button" id="may-pin" aria-pressed="false">MAY BE PINNED</button><small>Others may place this letter on the public wall.</small></div><p id="paper-error" role="status" aria-live="polite"></p><div class="paper-footer"><button id="letter-attach">+ ATTACH LINK</button><button id="letter-fold" disabled>FOLD</button></div></div><div id="paper-folds" hidden>${['top','middle','bottom'].map(p=>`<div class="fold-panel ${p}"><div class="fold-front paper-face"><div class="fold-copy"></div></div><div class="fold-back paper-face"></div></div>`).join('')}</div><div id="letter-seal" hidden><p id="delivery-note" role="status" aria-live="polite"></p><div class="seal-actions"><button id="letter-edit">UNFOLD</button><button id="letter-send">SEND</button></div></div></div>`;
 document.body.appendChild(desk);
 const el=id=>desk.querySelector('#'+id),paper=el('letter-paper'),pickup=el('paper-pickup'),writing=el('letter-writing'),message=el('letter-message'),link=el('letter-link'),folds=el('paper-folds'),seal=el('letter-seal'),fold=el('letter-fold'),send=el('letter-send'),note=el('delivery-note'),error=el('paper-error');
 let mode='rest',phase=0,id=crypto.randomUUID(),near=0,time=0,restUntil=0,flight=null,pendingLetter=null;
 let initialized=false,allowPinToWall=false;
 for(const [name,value] of [['keep-mailbox',false],['may-pin',true]])el(name).addEventListener('click',()=>{allowPinToWall=value;id=crypto.randomUUID();el('keep-mailbox').setAttribute('aria-pressed',String(!value));el('may-pin').setAttribute('aria-pressed',String(value));});
 let layout={x:0,y:0,w:440,h:510,scale:.2,rotation:-7},current={...layout};
 const status=document.querySelector('#status'),attention={x:0,y:0};
 const wall=createWallLetters({scene,board,camera,renderer,sound,reduced,canStart:()=>!reader.active&&['rest','delivered'].includes(mode)});
 const reader=createLetterReader({scene,camera,renderer,boxes,matter,wall,reduced,sound,unlockAudio,openMailbox,canStart:()=>!wall.active&&['rest','delivered'].includes(mode),onRefresh:refresh});
 function setMode(value){mode=value;desk.dataset.state=value;document.body.classList.toggle('letter-writing',!['rest','delivered'].includes(value));}
 async function refresh(){try{const r=await fetch('/api/letters',{cache:'no-store'});if(!r.ok)throw Error();const data=await r.json();matter.sync(data,pendingLetter?.id);wall.sync(data.wall||[]);desk.dataset.storage='ready';}catch{desk.dataset.storage='unavailable';status.textContent='The mail could not be reached. Open a mailbox again to retry.';}}
 refresh();setInterval(()=>{if(!document.hidden&&mode==='rest'&&!reader.active)refresh();},30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden&&mode==='rest'&&!reader.active)refresh();});
 function shape(){const vv=window.visualViewport;const width=vv?.width||innerWidth,height=vv?.height||innerHeight;const w=Math.min(440,width-36),h=Math.min(510,height-32);return {w,h:Math.max(270,h),x:(vv?.offsetLeft||0)+width/2,y:(vv?.offsetTop||0)+height/2};}
 function validate(){const chars=Array.from(message.value);if(chars.length>280)message.value=chars.slice(0,280).join('');const length=Array.from(message.value).length;el('letter-count').textContent=length>=230?`${length} / 280`:'';fold.disabled=!message.value.trim();error.textContent='';}
 message.addEventListener('input',()=>{id=crypto.randomUUID();validate();});link.addEventListener('input',()=>{id=crypto.randomUUID();error.textContent='';});
 pickup.addEventListener('click',()=>{if(reader.active||wall.active)return;unlockAudio();setMode('writing');pickup.hidden=true;writing.hidden=false;paper.classList.add('paper-face');message.focus({preventScroll:true});sound('rustle','folded',.04);});
 function putBack(){if(mode!=='writing')return;setMode('rest');writing.hidden=true;pickup.hidden=false;message.blur();pickup.focus({preventScroll:true});}
 el('letter-close').addEventListener('click',putBack);
 document.addEventListener('keydown',e=>{if(mode!=='rest'&&mode!=='delivered'&&e.key==='Escape'){e.stopImmediatePropagation();if(mode==='writing')putBack();else if(mode==='folded')unfold();}},true);
 el('letter-attach').addEventListener('click',()=>{link.hidden=false;el('letter-attach').hidden=true;link.focus({preventScroll:true});});
 function validLink(){if(!link.value.trim())return true;try{const u=new URL(link.value.trim());return /^https?:\/\//i.test(link.value.trim())&&['http:','https:'].includes(u.protocol)&&!u.username&&!u.password&&!/[\s\\]/.test(link.value.trim());}catch{return false;}}
 fold.addEventListener('click',()=>{
  validate();if(fold.disabled)return;if(!validLink()){error.textContent='Use a valid http:// or https:// link.';link.focus();return;}
  // Snapshot plain text only; each hinged third clips the same written sheet.
  folds.querySelectorAll('.fold-copy').forEach(p=>p.textContent=message.value.trim());
  message.blur();link.blur();writing.hidden=true;folds.hidden=false;folds.setAttribute('aria-hidden','true');folds.querySelector('.bottom').style.transform='';folds.querySelector('.top').style.transform='';paper.classList.remove('paper-face');phase=0;setMode('folding');sound('rustle','folded',.065);
 });
 function unfold(){if(mode!=='folded')return;folds.hidden=true;seal.hidden=true;writing.hidden=false;paper.classList.add('paper-face');setMode('writing');message.focus({preventScroll:true});}
 el('letter-edit').addEventListener('click',unfold);
 function positionFlight(){const r=paper.getBoundingClientRect();const ndc=new THREE.Vector3((r.left+r.width/2)/innerWidth*2-1,-(r.top+r.height/2)/innerHeight*2+1,.5);const canvasRect=renderer.domElement.getBoundingClientRect();ndc.x=((r.left+r.width/2-canvasRect.left)/canvasRect.width)*2-1;ndc.y=-((r.top+r.height/2-canvasRect.top)/canvasRect.height)*2+1;ndc.unproject(camera);const dir=ndc.sub(camera.position).normalize();const distance=4;const start=camera.position.clone().addScaledVector(dir,distance);const scale=(2*distance*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)))*(current.w/canvasRect.height)/1.03;return {start,scale,scaleY:scale*(current.h/3/current.w)/(.39/1.03)};}
 send.addEventListener('click',async()=>{
  if(!['folded','failed'].includes(mode))return;setMode('saving');send.disabled=true;el('letter-edit').hidden=true;note.textContent='';send.textContent='SENDING';
  try{
   const r=await fetch('/api/letters',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,message:message.value.trim(),optionalUrl:link.value.trim()||null,allowPinToWall}),signal:AbortSignal.timeout(20000)});
   const response=await r.json();if(!r.ok)throw Error(response.error||'Delivery failed.');
   pendingLetter=response.letter;matter.sync(response,response.letter.id);
   const index=Number(response.letter.mailboxId)-1,b=boxes[index];scene.updateMatrixWorld(true);
   const launch=positionFlight(),start=launch.start,form=letterForm(response.letter.id,response.mailboxes[index].letters.find(l=>l.id===response.letter.id)?.createdAt),scale=launch.scale*1.03/form.width,scaleY=launch.scaleY*.39/form.height,mesh=new THREE.Mesh(paperGeometry(form.width,form.height),matter.material);mesh.position.copy(start);mesh.quaternion.copy(camera.quaternion);mesh.scale.set(scale,scaleY,1);mesh.castShadow=true;scene.add(mesh);
   const slot=b.base.localToWorld(new THREE.Vector3(0,.674,1.10+form.height/2));const projected=slot.clone().project(camera),canvasRect=renderer.domElement.getBoundingClientRect();
   const targetY=canvasRect.top+scrollY+(-projected.y*.5+.5)*canvasRect.height;
   const targetScroll=Math.max(0,Math.min(document.documentElement.scrollHeight-innerHeight,targetY-innerHeight*.45));
   flight={mesh,form,startQuaternion:mesh.quaternion.clone(),clear:b.base.localToWorld(new THREE.Vector3(0,.674,3.3)),start,scale,scaleY,slot,index,startScroll:scrollY,targetScroll,age:0,letter:response.letter,original:mesh.geometry.attributes.position.array.slice()};
   paper.hidden=true;setMode('delivering');sound('rustle','folded',.075);
  }catch(e){setMode('failed');note.textContent='DELIVERY FAILED';note.title='';const detail=document.createElement('span');detail.style.display='block';detail.style.letterSpacing='0';detail.textContent=['TimeoutError','TypeError'].includes(e.name)?'Your letter is still here. Try again.':e.message;note.appendChild(detail);send.textContent='TRY AGAIN';send.disabled=false;send.focus({preventScroll:true});}
 });
 window.addEventListener('pointermove',e=>{if(mode!=='rest')return;const r=paper.getBoundingClientRect();near=Math.max(0,1-Math.hypot(e.clientX-r.left-r.width/2,e.clientY-r.top-r.height/2)/150);});
 const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
 function update(dt){
  time+=dt;matter.update(dt);reader.update(dt);wall.update(dt);paper.style.setProperty('--curl',String(near*22)+'deg');if(!flight){attention.x*=Math.exp(-dt*4);attention.y*=Math.exp(-dt*4);}
  const s=shape();layout.w=s.w;layout.h=s.h;layout.x=s.x;layout.y=s.y;layout.rotation=0;layout.scale=1;
  if(mode==='rest'||mode==='delivered'){
   const v=new THREE.Vector3(-5.35,-4.11,.85).project(camera),r=renderer.domElement.getBoundingClientRect();
   layout.scale=Math.min(.25,105/s.w);layout.rotation=-8+near*2;layout.x=Math.max(65,Math.min(innerWidth-65,r.left+(v.x*.5+.5)*r.width));layout.y=Math.min(innerHeight-80,r.top+(-v.y*.5+.5)*r.height)-near*5;
  }
  if(!initialized){Object.assign(current,layout);initialized=true;paper.style.visibility='visible';}
  const lerp=reduced?1:1-Math.exp(-dt*9);for(const k of ['x','y','scale','rotation'])current[k]+= (layout[k]-current[k])*lerp;current.w=layout.w;current.h=layout.h;
  desk.style.setProperty('--paper-w',current.w+'px');desk.style.setProperty('--paper-h',current.h+'px');paper.style.transform=`translate(${current.x-current.w/2}px,${current.y-current.h/2}px) rotateZ(${current.rotation}deg) rotateX(${(1-current.scale)*8}deg) rotateY(${(1-current.scale)*-5}deg) scale(${current.scale})`;
  if(mode==='folding'){
   phase+=dt;const p=reduced?2:phase;
   folds.querySelector('.bottom').style.transform=`translateZ(1px) rotateX(${180*smooth(p/.8)}deg)`;
   folds.querySelector('.top').style.transform=`translateZ(3px) rotateX(${-180*smooth((p-.75)/.8)}deg)`;
   if(p>=1.55){setMode('folded');seal.hidden=false;send.disabled=false;send.textContent='SEND';note.textContent='';el('letter-edit').hidden=false;send.focus({preventScroll:true});sound('rustle','folded',.025);}
  }
  if(flight){
   const f=flight;f.age+=dt;const t=reduced?4.7:f.age;
   if(innerWidth<600)window.scrollTo(0,THREE.MathUtils.lerp(f.startScroll,f.targetScroll,smooth(t/1.8)));
   if(!reduced){attention.x=THREE.MathUtils.clamp(f.slot.x-camera.position.x,-3,3)*.025*smooth(t);attention.y=THREE.MathUtils.clamp(f.slot.y-camera.position.y,-3,3)*.025*smooth(t);}
   const base=boxes[f.index].base,flat=base.getWorldQuaternion(new THREE.Quaternion()).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI/2,0,0)));
   if(t<1.3){const q=smooth(t/1.3);f.mesh.position.lerpVectors(f.start,f.clear,q);f.mesh.quaternion.slerpQuaternions(f.startQuaternion,flat,q);f.mesh.scale.set(THREE.MathUtils.lerp(f.scale,1,q),THREE.MathUtils.lerp(f.scaleY,1,q),1);}
   else if(t<2.1){f.mesh.position.lerpVectors(f.clear,f.slot,smooth((t-1.3)/.8));f.mesh.quaternion.copy(flat);f.mesh.scale.set(1,1,1);}
   else if(t<4.1){if(!f.feeding){f.feeding=true;base.add(f.mesh);f.mesh.position.set(0,0,0);f.mesh.rotation.set(0,0,0);f.mesh.scale.set(1,1,1);}feedSlot(f.mesh,f.form.width,f.form.height,SLOT_PATH_LENGTH*smooth((t-2.1)/2));if(!f.contact){f.contact=true;sound('contact','folded',.03);}}
   else {if(!f.feeding){f.feeding=true;base.add(f.mesh);f.mesh.position.set(0,0,0);f.mesh.rotation.set(0,0,0);f.mesh.scale.set(1,1,1);}feedSlot(f.mesh,f.form.width,f.form.height,SLOT_PATH_LENGTH);const item=matter.papers.get(f.letter.id),q=smooth((t-4.1)/.5),p=f.mesh.geometry.attributes.position;item.mesh.updateMatrix();for(let j=0;j<p.count;j++){const v=new THREE.Vector3((f.mesh.geometry.attributes.uv.getX(j)-.5)*f.form.width,(f.mesh.geometry.attributes.uv.getY(j)-.5)*f.form.height,j<p.count/2?0:-.0022).applyMatrix4(item.mesh.matrix);p.setXYZ(j,THREE.MathUtils.lerp(p.getX(j),v.x,q),THREE.MathUtils.lerp(p.getY(j),v.y,q),THREE.MathUtils.lerp(p.getZ(j),v.z,q));}p.needsUpdate=true;f.mesh.geometry.computeVertexNormals();}
   if(t>=4.6){matter.reveal(f.letter.id);f.mesh.removeFromParent();f.mesh.geometry.dispose();flight=null;pendingLetter=null;message.value='';link.value='';allowPinToWall=false;el('keep-mailbox').setAttribute('aria-pressed','true');el('may-pin').setAttribute('aria-pressed','false');id=crypto.randomUUID();status.textContent='Your letter has been left in the building.';setMode('delivered');restUntil=time+7;}
  }
  if(mode==='delivered'&&time>restUntil){setMode('rest');paper.hidden=false;pickup.hidden=false;writing.hidden=true;folds.hidden=true;seal.hidden=true;link.hidden=true;el('letter-attach').hidden=false;paper.classList.add('paper-face');validate();}
 }
 return {update,attention,wall,collisionDebug:{collisions:matter.collisions,papers:matter.papers},doorTarget:(i,t)=>matter.doorTarget(i,t),onDoorChange(index,open){matter.onDoorChange(index,open);if(open)refresh();},get active(){return wall.active||reader.active||!['rest','delivered'].includes(mode);}};
}
