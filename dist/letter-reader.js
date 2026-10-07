import * as THREE from './vendor/three.module.js';
const easePin=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function createLetterReader({scene,camera,renderer,boxes,matter,wall,reduced,sound,unlockAudio,openMailbox,canStart,onRefresh}){
 const access=document.createElement('div');access.id='letter-access';access.setAttribute('aria-label','Reachable paper');document.body.appendChild(access);
 const desk=document.createElement('section');desk.id='letter-reading-desk';desk.setAttribute('aria-label','Opened paper');desk.hidden=true;
 // Only static markup is inserted. All stored content uses textContent.
 desk.innerHTML=`<article id="reading-paper" tabindex="-1" aria-label="A letter"><div id="reading-folds" aria-hidden="true">${['top','middle','bottom'].map(p=>`<div class="fold-panel ${p}"><div class="fold-front paper-face"><div class="fold-copy"></div></div><div class="fold-back paper-face"></div></div>`).join('')}</div><div id="reading-content" hidden><div id="read-message"></div><footer><time id="read-date"></time><a id="read-link" target="_blank" rel="noopener noreferrer" hidden>ATTACHED →</a></footer></div><div id="reading-actions"><span id="reading-note" role="status" aria-live="polite"></span><button id="letter-unfold" hidden>UNFOLD</button><button id="letter-retry" hidden>TRY AGAIN</button><button id="letter-pin" hidden>PIN TO WALL</button><button id="letter-put-back" aria-label="Put letter back">PUT BACK</button></div></article>`;document.body.appendChild(desk);
 const el=id=>desk.querySelector('#'+id),paper=el('reading-paper'),folds=el('reading-folds'),content=el('reading-content'),note=el('reading-note'),unfoldButton=el('letter-unfold'),back=el('letter-put-back'),retry=el('letter-retry');
 const pin=el('letter-pin');let pinResponse=null,pinFailed=false;
 const buttons=new Map(),ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let mode='idle',selected=null,record=null,phase=0,request=0,down=null;
 const status=document.querySelector('#status');
 function setMode(next){mode=next;desk.dataset.state=next;document.body.classList.toggle('letter-reading',next!=='idle');}
 function dimensions(){const v=window.visualViewport;return {w:Math.min(440,(v?.width||innerWidth)-36),h:Math.max(290,Math.min(510,(v?.height||innerHeight)-32)),x:(v?.offsetLeft||0)+(v?.width||innerWidth)/2,y:(v?.offsetTop||0)+(v?.height||innerHeight)/2};}
 function targetInWorld(){const s=dimensions(),r=renderer.domElement.getBoundingClientRect(),v=new THREE.Vector3((s.x-r.left)/r.width*2-1,-(s.y-r.top)/r.height*2+1,.5).unproject(camera).sub(camera.position).normalize();return {position:camera.position.clone().addScaledVector(v,4),scaleX:2*4*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*s.w/r.height/selected.form.width,scaleY:2*4*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*(s.h/3)/r.height/selected.form.height};}
 function hit(e){if(mode!=='idle'||!canStart())return null;const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);const candidates=matter.reachable();return ray.intersectObjects(candidates.map(p=>p.mesh),false)[0]?.object.userData.letterId||null;}
 renderer.domElement.addEventListener('pointermove',e=>{const id=hit(e);matter.hover(id);if(id){renderer.domElement.style.cursor='pointer';e.stopImmediatePropagation();}},true);
 renderer.domElement.addEventListener('pointerleave',()=>matter.hover(null),true);
 renderer.domElement.addEventListener('pointerdown',e=>{const id=hit(e);down=id?{id,x:e.clientX,y:e.clientY}:null;if(id)e.stopImmediatePropagation();},true);
 renderer.domElement.addEventListener('pointerup',e=>{if(!down)return;const d=down;down=null;e.stopImmediatePropagation();if(Math.hypot(e.clientX-d.x,e.clientY-d.y)<10&&hit(e)===d.id)pick(d.id);},true);
 renderer.domElement.addEventListener('pointercancel',()=>down=null,true);
 async function load(){
  const generation=++request;record=null;note.textContent='';retry.hidden=true;unfoldButton.hidden=true;
  try{const r=await fetch('/api/letters',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'read',id:selected.id}),signal:AbortSignal.timeout(15000)});const data=await r.json();if(generation!==request||mode==='idle'||mode==='returning'||mode==='refolding')return;
   if(!r.ok)throw Error(r.status===404?'This paper is no longer available.':'The words could not be opened.');
   record=data.letter;if(record.wallState!=='mailbox'){reconcileMoved();return;}if(mode==='folded'){unfoldButton.hidden=false;status.textContent='The letter is ready to unfold.';if(document.activeElement===back)unfoldButton.focus({preventScroll:true});}
  }catch(e){if(generation!==request)return;note.textContent=e.name==='Error'?e.message:'The words could not be opened.';retry.hidden=false;}
 }
 function pick(id){if(mode!=='idle'||!canStart())return;const item=matter.hold(id);if(!item)return;selected=item;pin.hidden=true;pinFailed=false;if(!boxes[item.index].open)openMailbox(item.index);unlockAudio();setMode('extracting');phase=0;desk.hidden=true;content.hidden=true;back.disabled=false;retry.hidden=true;unfoldButton.hidden=true;record=null;note.textContent='';load();sound('rustle','folded',.045);}
 function foldedPose(){folds.querySelector('.bottom').style.transform='translateZ(1px) rotateX(180deg)';folds.querySelector('.top').style.transform='translateZ(3px) rotateX(-180deg)';}
 function showPaper(){selected.mesh.visible=false;desk.hidden=false;content.hidden=true;folds.hidden=false;folds.querySelectorAll('.fold-copy').forEach(p=>p.textContent='');foldedPose();paper.style.setProperty('--paper-tint',selected.mesh.material.color.getStyle());setMode('folded');unfoldButton.hidden=!record;(record?unfoldButton:back).focus({preventScroll:true});}
 function openPaper(){if(mode!=='folded'||!record)return;phase=0;setMode('unfolding');unfoldButton.hidden=true;retry.hidden=true;back.disabled=true;sound('rustle','folded',.045);folds.querySelectorAll('.fold-copy').forEach(p=>p.textContent=record.message);}
 unfoldButton.addEventListener('click',openPaper);retry.addEventListener('click',()=>pinFailed?pinPaper():load());
 function showContent(){setMode('reading');folds.hidden=true;content.hidden=false;paper.classList.add('paper-face');el('read-message').textContent=record.message;
  const date=new Date(record.createdAt);el('read-date').textContent=Number.isFinite(date.getTime())?date.toLocaleDateString('en-US',{month:'short',day:'2-digit',year:'numeric'}).toUpperCase():'';
  const link=el('read-link');link.hidden=true;link.removeAttribute('href');if(record.optionalUrl){try{const u=new URL(record.optionalUrl);if(/^https?:\/\//i.test(record.optionalUrl)&&['http:','https:'].includes(u.protocol)&&!u.username&&!u.password&&!/[\s\\]/.test(record.optionalUrl)){link.href=u.href;link.hidden=false;}}catch{}}
  pin.hidden=record.allowPinToWall!==true||record.wallState!=='mailbox';back.disabled=false;paper.focus({preventScroll:true});
 }
 async function pinPaper(){
 if(mode!=='reading'||!record?.allowPinToWall)return;
 pin.disabled=true;back.disabled=true;retry.hidden=true;note.textContent='';setMode('pin-saving');
 try{const r=await fetch('/api/letters',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'pin',id:selected.id}),signal:AbortSignal.timeout(20000)});const data=await r.json();if(!r.ok)throw Error(data.error);pinResponse=data;pinFailed=false;pin.hidden=true;paper.classList.remove('paper-face');content.hidden=true;folds.hidden=false;folds.querySelectorAll('.fold-copy').forEach(p=>p.textContent=record.message);phase=0;setMode('pin-folding');sound('rustle','folded',.04);
 }catch{setMode('reading');pinFailed=true;pin.hidden=true;note.textContent="COULDN'T PIN";retry.hidden=false;back.disabled=false;}finally{pin.disabled=false;}
 }
 pin.addEventListener('click',pinPaper);
 function reconcileMoved(){++request;matter.remove(selected.id);selected=null;record=null;desk.hidden=true;content.hidden=true;paper.classList.remove('paper-face');setMode('idle');status.textContent='This letter has already moved to the wall.';onRefresh();}
 async function putBack(){if(!['folded','reading'].includes(mode))return;if(pinFailed){back.disabled=true;try{const r=await fetch('/api/letters',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'read',id:selected.id}),signal:AbortSignal.timeout(4000)});const data=await r.json();if(r.ok&&data.letter.wallState!=='mailbox'){reconcileMoved();return;}}catch{}back.disabled=false;}++request;pin.hidden=true;retry.hidden=true;unfoldButton.hidden=true;note.textContent='';back.disabled=true;phase=0;
  if(mode==='reading'){paper.classList.remove('paper-face');content.hidden=true;folds.hidden=false;folds.querySelectorAll('.fold-copy').forEach(p=>p.textContent=record.message);folds.querySelector('.bottom').style.transform='';folds.querySelector('.top').style.transform='';setMode('refolding');sound('rustle','folded',.04);}else startReturn();
 }
 back.addEventListener('click',putBack);document.addEventListener('keydown',e=>{if(mode!=='idle'&&e.key==='Escape'){e.stopImmediatePropagation();putBack();}},true);
 function startReturn(){phase=0;desk.hidden=true;setMode('returning');const t=targetInWorld();selected.mesh.visible=true;selected.mesh.position.copy(t.position);selected.mesh.quaternion.copy(camera.quaternion);selected.mesh.scale.set(t.scaleX,t.scaleY,1);selected.returnStart=selected.mesh.position.clone();selected.returnQuat=selected.mesh.quaternion.clone();selected.returnScale=selected.mesh.scale.clone();selected.target=matter.returnTarget(selected);const v=selected.target.position.clone().project(camera),r=renderer.domElement.getBoundingClientRect();selected.startScroll=scrollY;selected.targetScroll=Math.max(0,Math.min(document.documentElement.scrollHeight-innerHeight,scrollY+r.top+(-v.y*.5+.5)*r.height-innerHeight*.45));selected.mesh.position.copy(selected.returnStart);selected.mesh.quaternion.copy(selected.returnQuat);selected.mesh.scale.copy(selected.returnScale);sound('rustle','folded',.04);}
 function finish(){const index=selected.index;selected.mesh.scale.set(1,1,1);matter.finishReturn(selected);selected=null;record=null;desk.hidden=true;content.hidden=true;paper.classList.remove('paper-face');el('read-message').textContent='';el('read-link').removeAttribute('href');folds.querySelectorAll('.fold-copy').forEach(p=>p.textContent='');setMode('idle');sound('contact','folded',.025);status.textContent='The letter is back in the mailbox.';boxes[index].button.focus({preventScroll:true});onRefresh();}
 function updateAccess(){
  const reachable=mode==='idle'&&canStart()?matter.reachable():[],ids=new Set(reachable.map(p=>p.id));for(const [id,b]of buttons)if(!ids.has(id)){b.remove();buttons.delete(id);}
  const r=renderer.domElement.getBoundingClientRect();for(const item of reachable){let b=buttons.get(item.id);if(!b){b=document.createElement('button');b.className='physical-letter-control';b.dataset.fallen=String(item.fallen);b.setAttribute('aria-label','Open letter, '+item.form.kind.replaceAll('-',' '));b.addEventListener('click',()=>pick(item.id));b.addEventListener('focus',()=>matter.hover(item.id));b.addEventListener('blur',()=>matter.hover(null));access.appendChild(b);buttons.set(item.id,b);}const v=item.mesh.getWorldPosition(new THREE.Vector3()).project(camera);b.style.left=(r.left+(v.x*.5+.5)*r.width-22)+'px';b.style.top=(r.top+(-v.y*.5+.5)*r.height-20)+'px';}
 }
 function update(dt){
  updateAccess();if(mode==='idle')return;phase+=dt;const s=dimensions();desk.style.setProperty('--paper-w',s.w+'px');desk.style.setProperty('--paper-h',s.h+'px');paper.style.left=(s.x-s.w/2)+'px';paper.style.top=(s.y-s.h/2)+'px';
  if(mode==='extracting'){
   const t=reduced?1:Math.min(1,phase/2.2),route=selected.route,target=targetInWorld();
   if(t<.2){selected.mesh.position.lerpVectors(selected.source.position,route.inside,smooth(t/.2));selected.mesh.quaternion.slerpQuaternions(selected.source.quaternion,route.quaternion,smooth(t/.2));}else if(t<.6){selected.mesh.position.lerpVectors(route.inside,route.outside,smooth((t-.2)/.4));selected.mesh.quaternion.copy(route.quaternion);}else{const q=smooth((t-.6)/.4);selected.mesh.position.lerpVectors(route.outside,target.position,q);selected.mesh.quaternion.slerpQuaternions(route.quaternion,camera.quaternion,q);selected.mesh.scale.set(THREE.MathUtils.lerp(1,target.scaleX,q),THREE.MathUtils.lerp(1,target.scaleY,q),1);}
   if(t===1)showPaper();
  }else if(mode==='unfolding'){
   const t=reduced?2:phase;folds.querySelector('.top').style.transform=`translateZ(3px) rotateX(${-180*(1-smooth(t/.7))}deg)`;folds.querySelector('.bottom').style.transform=`translateZ(1px) rotateX(${180*(1-smooth((t-.65)/.7))}deg)`;if(t>=1.4)showContent();
  }else if(mode==='refolding'){
   const t=reduced?2:phase;folds.querySelector('.bottom').style.transform=`translateZ(1px) rotateX(${180*smooth(t/.7)}deg)`;folds.querySelector('.top').style.transform=`translateZ(3px) rotateX(${-180*smooth((t-.65)/.7)}deg)`;if(t>=1.4)startReturn();
   }else if(mode==='pin-folding'){
 const t=reduced?1:easePin(phase/.85);folds.querySelector('.bottom').style.transform=`rotateX(${55*t}deg)`;folds.querySelector('.top').style.transform=`rotateX(${-35*t}deg)`;
 if(t===1){const target=targetInWorld();desk.hidden=true;selected.mesh.visible=true;selected.mesh.position.copy(target.position);selected.mesh.quaternion.copy(camera.quaternion);selected.mesh.scale.set(target.scaleX,target.scaleY,1);matter.remove(selected.id);scene.add(selected.mesh);setMode('pinning');wall.pin(selected,pinResponse.wall,()=>{selected=null;record=null;pinResponse=null;setMode('idle');status.textContent='The letter is pinned to the wall.';onRefresh();});}
 }else if(mode==='returning'){

   const t=reduced?1:Math.min(1,phase/2.2),target=selected.target; if(innerWidth<600)window.scrollTo(0,THREE.MathUtils.lerp(selected.startScroll,selected.targetScroll,t));const route=target.route||selected.route;
   if(t<.4){const q=smooth(t/.4);selected.mesh.position.lerpVectors(selected.returnStart,route.outside,q);selected.mesh.quaternion.slerpQuaternions(selected.returnQuat,route.quaternion,q);selected.mesh.scale.lerpVectors(selected.returnScale,new THREE.Vector3(1,1,1),q);}else if(t<.8){selected.mesh.position.lerpVectors(route.outside,route.inside,smooth((t-.4)/.4));selected.mesh.quaternion.copy(route.quaternion);}else{selected.mesh.position.lerpVectors(route.inside,target.position,smooth((t-.8)/.2));selected.mesh.quaternion.slerpQuaternions(route.quaternion,target.quaternion,smooth((t-.8)/.2));}if(t===1)finish();
  }
 }
 return {update,get active(){return mode!=='idle';}};
}
