import {artifactCanvas} from './artifact-art.js';
import {paperGeometry,fitInterior,INTERIOR,CLEAR_Z,createPaperCollisions} from './paper-physics.js';
import * as THREE from './vendor/three.module.js';
import {letterForm} from './letter-forms.js';
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const HISTORY='unplanned-real-mail-v1',HANDLING='unplanned-letter-handling-v1';
export function createLetterMatter(scene,boxes,{sound=()=>{},reduced=false}={}){
 const collisions=createPaperCollisions(boxes);const papers=new Map(),falling=[],counts=Array(15).fill(0),compression=Array(15).fill(0),pending=new Map();let history={},handling={orders:{},touched:{}};let ready=false,hovered=null;
 try{history=JSON.parse(sessionStorage.getItem(HISTORY)||'{}');handling=JSON.parse(sessionStorage.getItem(HANDLING)||'null')||handling;}catch{}
 const material=new THREE.MeshStandardMaterial({color:'#e9dfc7',roughness:.98,side:THREE.DoubleSide}),materials=new Map(),geometries=new Map();
 const persist=()=>{try{sessionStorage.setItem(HISTORY,JSON.stringify(history));sessionStorage.setItem(HANDLING,JSON.stringify(handling));}catch{}};
 function geometry(form,detailed,lifted=false){const key=form.kind+':'+detailed; if(!geometries.has(key))geometries.set(key,paperGeometry(form.width,form.height,detailed,0));return geometries.get(key);}
 function surface(form,letter={}){const key=(letter.visual||'')+':'+form.kind+':'+Math.floor(form.age*8);if(materials.has(key))return materials.get(key);const color=new THREE.Color(form.color).lerp(new THREE.Color('#cabc93'),Math.floor(form.age*8)/8*.2);const mat=new THREE.MeshStandardMaterial({color,roughness:.96,side:THREE.DoubleSide});if(letter.sourceType==='OWNER'&&['IMAGE','WORK','VIDEO','DOCUMENT','LINK'].includes(letter.mediaType)&&typeof document!=='undefined'){mat.map=new THREE.CanvasTexture(artifactCanvas(letter.visual,'',letter.mediaType));mat.map.colorSpace=THREE.SRGBColorSpace;mat.color.set('#ffffff');}materials.set(key,mat);return mat;}
 function inside(index){const order=handling.orders[index]||[];return [...papers.values()].filter(p=>p.index===index&&!p.fallen&&!p.held).sort((a,b)=>{const ai=order.indexOf(a.id),bi=order.indexOf(b.id);return (ai<0?1000+a.ordinal:ai)-(bi<0?1000+b.ordinal:bi);});}
 function reachable(){const result=[];if(!ready)return result;for(let i=0;i<15;i++)if(boxes[i].open&&Math.abs(boxes[i].angle||0)>1.385)result.push(...inside(i).slice(-1));result.push(...[...papers.values()].filter(p=>p.aside&&p.parkAge>=.75).slice(-1));result.push(...[...papers.values()].filter(p=>p.fallen&&!p.held&&!p.falling));return result.filter(p=>p.mesh.visible);}
 function setDetail(item,value){const g=geometry(item.form,value,hovered===item.id);if(value&&!item.mesh.material.map&&typeof document!=='undefined'){const c=document.createElement('canvas');c.width=384;c.height=240;const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,384,240);ctx.strokeStyle='rgba(99,86,64,.24)';ctx.lineWidth=1.8;ctx.beginPath();if(item.form.kind.includes('envelope')){ctx.moveTo(4,4);ctx.lineTo(192,126);ctx.lineTo(380,4);ctx.moveTo(4,236);ctx.lineTo(110,148);ctx.moveTo(380,236);ctx.lineTo(274,148);}else{ctx.moveTo(8,120);ctx.lineTo(376,120);if(item.form.kind==='small-card')ctx.strokeRect(323,16,41,48);}ctx.stroke();if(item.form.kind==='collaboration-envelope'){ctx.fillStyle='#33392f';ctx.fillRect(310,24,42,46);ctx.fillStyle='#ed4382';ctx.fillRect(351,24,10,14);}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;item.mesh.material.map=t;item.mesh.material.needsUpdate=true;}if(item.mesh.geometry!==g)item.mesh.geometry=g;}
 function layout(index){const stack=inside(index),c=stack.length;stack.forEach((item,n)=>{
  const f=item.form,handled=handling.touched[item.id],front=n>=c-3;
  const open=boxes[index].open;
  const x=(c<=3?(n-(c-1)/2)*.21:((n*7)%5-2)*.035)+f.offset+(handled?.offset||0);
  const y=Math.min(.53-f.height/2,-.70+f.height/2+(c<=3?n*.06:Math.min(n,21)*.031));
  const z=.278+n*.0047;
  item.home.position.set(x,y,z);item.home.rotation.set(0,0,f.turn+(handled?.turn||0));
  item.mesh.position.lerp(item.home.position,item.settling?.12:1);item.mesh.rotation.copy(item.home.rotation);


  setDetail(item,open&&front);fitInterior(item.mesh,boxes[index].base);item.home.position.copy(item.mesh.position);item.mesh.visible=!item.incoming;
 });}
 function make(letter,index,ordinal){const form=letterForm(letter.id,letter.createdAt,Date.now(),letter),mesh=new THREE.Mesh(geometry(form,false),surface(form,letter));mesh.castShadow=true;mesh.receiveShadow=true;
  const item={metadata:letter,id:letter.id,index,ordinal,form,mesh,fallen:false,held:false,home:{position:new THREE.Vector3(),rotation:new THREE.Euler()}};mesh.userData.letterId=item.id;papers.set(item.id,item);boxes[index].base.add(mesh);
  if(history[item.id]){scene.add(mesh);const saved=history[item.id],valid=saved.version===2&&saved.position?.length===3&&saved.position.every(Number.isFinite)&&saved.position[1]>=-4.97&&saved.position[1]<-4.85&&saved.position[2]>=3&&saved.position[2]<50&&saved.position[0]>=-6.5&&saved.position[0]<=.75&&saved.rotation?.[0]===-Math.PI/2&&saved.rotation[1]===0&&Number.isFinite(saved.rotation[2])&&Math.abs(saved.rotation[2])<=.2;const target=collisions.safeGround(item,[...papers.values()].filter(p=>p.fallen).length);if(valid){mesh.position.fromArray(saved.position);mesh.rotation.fromArray(saved.rotation);}else{mesh.position.copy(target.position);mesh.rotation.copy(target.rotation);}history[item.id]={version:2,position:mesh.position.toArray(),rotation:mesh.rotation.toArray()};item.fallen=true;setDetail(item,true);}return item;
 }
 function sync(state,hiddenId){
  const present=new Set(state.mailboxes.flatMap(b=>b.letters.map(l=>l.id)));
  for(const [id,item]of papers)if(!present.has(id)&&!item.held){item.mesh.removeFromParent();papers.delete(id);delete history[id];delete handling.touched[id];}
  for(const mailbox of state.mailboxes){const i=Number(mailbox.id)-1;if(i<0||i>=15)continue;counts[i]=mailbox.letters.length;mailbox.letters.forEach((letter,n)=>{const item=papers.get(letter.id)||make(letter,i,n);item.metadata=letter;item.ordinal=n;item.incoming=letter.id===hiddenId;if(!item.held)item.mesh.visible=!item.incoming;});layout(i);boxes[i].button.dataset.letters=String(counts[i]);}
  ready=true;persist();
 }
 function spill(index){const stack=inside(index);if(stack.length<19)return;const candidates=stack.filter(p=>!p.incoming).slice(-Math.min(6,stack.length-15)).reverse();scene.updateMatrixWorld(true);
  for(const item of candidates){const route=collisions.exitPose(item);if(!route)continue;item.fallen=true;item.falling=true;setDetail(item,true);scene.attach(item.mesh);const start=item.mesh.position.clone(),quaternion=item.mesh.quaternion.clone(),target=collisions.safeGround(item,[...papers.values()].filter(p=>p.fallen).length-1);history[item.id]={version:2,position:target.position.toArray(),rotation:target.rotation.toArray()};falling.push({item,start,quaternion,route,target,age:-falling.filter(f=>f.item.index===index).length*.8});}persist();layout(index);
 }
 function onDoorChange(index,open){layout(index);if(open&&counts[index]>=19)pending.set(index,0);if(!open)pending.delete(index);}
 function update(dt){dt=Number.isFinite(dt)?Math.max(0,Math.min(dt,reduced?2:.1)):0;
  for(const [index,age]of pending){if(!boxes[index].open){pending.delete(index);continue;}pending.set(index,age+dt);if(age+dt>.35&&(Math.abs(boxes[index].angle||0)>1.385||reduced)){if(!falling.some(f=>f.item.index%3===index%3)){pending.delete(index);spill(index);}}}
  for(const item of papers.values()){if(item.aside&&item.parkTarget){item.parkAge+=dt;const t=reduced?1:smooth(item.parkAge/.75);item.mesh.position.lerpVectors(item.parkStart,item.parkTarget,t);item.mesh.scale.lerpVectors(item.parkScale,new THREE.Vector3(1,1,1),t);item.mesh.quaternion.slerpQuaternions(item.parkQuat,new THREE.Quaternion(),t);}}
  for(const item of papers.values())item.settling=Math.max(0,(item.settling||0)-dt);
  for(let i=0;i<15;i++){compression[i]=Math.max(0,compression[i]-dt*1.7);layout(i);
   // Preserve the approved exterior. Open interiors contain only real mail.
   for(const item of boxes[i].mail.moving)item.mesh.visible=!item.fallen&&(item.role==='slot'||(Math.abs(boxes[i].angle||0)<.12&&counts[i]===0));
  }
  for(let i=falling.length-1;i>=0;i--){const a=falling[i];a.age+=dt;if(a.age<0)continue;const t=reduced?5:a.age,mesh=a.item.mesh;
   if(t<.45){mesh.position.lerpVectors(a.start,a.route.inside,smooth(t/.45));mesh.quaternion.slerpQuaternions(a.quaternion,a.route.quaternion,smooth(t/.45));}
   else if(t<1.6){mesh.position.lerpVectors(a.route.inside,a.route.outside,smooth((t-.45)/1.15));mesh.quaternion.copy(a.route.quaternion);}
   else{const q=smooth((t-1.6)/1.7);mesh.position.lerpVectors(a.route.outside,a.target.position,q);mesh.position.y=THREE.MathUtils.lerp(a.route.outside.y,a.target.position.y,q*q);mesh.quaternion.slerpQuaternions(a.route.quaternion,new THREE.Quaternion().setFromEuler(a.target.rotation),q);}
   if(t>=3.3){mesh.position.copy(a.target.position);mesh.rotation.copy(a.target.rotation);a.item.falling=false;sound('impact','folded',.035);falling.splice(i,1);}
  }
 }
 function hold(id){const item=papers.get(id);if(!item||!reachable().includes(item))return null;scene.updateMatrixWorld(true);const route=(item.fallen||item.aside)?{inside:item.mesh.getWorldPosition(new THREE.Vector3()),outside:item.mesh.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,.7,.35)),quaternion:item.mesh.getWorldQuaternion(new THREE.Quaternion())}:collisions.exitPose(item);if(!route)return null;item.route=route;item.aside=false;item.held=true;item.source={position:item.mesh.getWorldPosition(new THREE.Vector3()),quaternion:item.mesh.getWorldQuaternion(new THREE.Quaternion())};scene.attach(item.mesh);setDetail(item,true);hovered=null;compression[item.index]=1;layout(item.index);return item;}
 function park(item){item.aside=true;item.held=true;item.parkScale=item.mesh.scale.clone();item.mesh.visible=true;const n=[...papers.values()].filter(p=>p.aside&&p!==item).length;item.parkTarget=new THREE.Vector3(-3.8,-3.65,3.4+n*.012);item.parkStart=item.mesh.position.clone();item.parkQuat=item.mesh.quaternion.clone();item.parkAge=0;}
 function returnTarget(item){item.mesh.scale.set(1,1,1);const stack=inside(item.index);handling.orders[item.index]=[...stack.map(p=>p.id),item.id];handling.touched[item.id]={offset:((item.form.hash%5)-2)*.012,turn:((item.form.hash%7)-3)*.01};delete history[item.id];item.fallen=false;item.held=false;boxes[item.index].base.add(item.mesh);layout(item.index);const target={position:item.mesh.getWorldPosition(new THREE.Vector3()),quaternion:item.mesh.getWorldQuaternion(new THREE.Quaternion())};target.route=collisions.exitPose(item);item.held=true;scene.attach(item.mesh);persist();return target;}
 function finishReturn(item){item.held=false;item.fallen=false;item.mesh.visible=true;boxes[item.index].base.add(item.mesh);compression[item.index]=1;layout(item.index);persist();}
 return {park,aside:index=>[...papers.values()].filter(p=>(index===undefined||p.index===index)&&p.aside),collisions,doorTarget(index,target){return falling.some(f=>f.item.index===index&&f.age<1.7)?-1.39:target;},remove(id){const p=papers.get(id);if(p){p.mesh.removeFromParent();papers.delete(id);for(const item of inside(p.index))item.settling=1;delete history[id];compression[p.index]=1;counts[p.index]=Math.max(0,counts[p.index]-1);persist();}},sync,update,onDoorChange,counts,papers,reachable,hold,returnTarget,finishReturn,hover(id){hovered=id;},get ready(){return ready;},compress(index){compression[index]=1;},reveal(id){const p=papers.get(id);if(p){p.incoming=false;p.mesh.visible=true;compression[p.index]=1;}},material};
}
