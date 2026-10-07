import * as THREE from './vendor/three.module.js';
import {letterForm} from './letter-forms.js';
const HISTORY='unplanned-real-mail-v1',HANDLING='unplanned-letter-handling-v1';
export function createLetterMatter(scene,boxes,{sound=()=>{},reduced=false}={}){
 const papers=new Map(),falling=[],counts=Array(15).fill(0),compression=Array(15).fill(0),pending=new Map();let history={},handling={orders:{},touched:{}};let ready=false,hovered=null;
 try{history=JSON.parse(sessionStorage.getItem(HISTORY)||'{}');handling=JSON.parse(sessionStorage.getItem(HANDLING)||'null')||handling;}catch{}
 const material=new THREE.MeshStandardMaterial({color:'#e9dfc7',roughness:.98,side:THREE.DoubleSide}),materials=new Map(),geometries=new Map();
 const persist=()=>{try{sessionStorage.setItem(HISTORY,JSON.stringify(history));sessionStorage.setItem(HANDLING,JSON.stringify(handling));}catch{}};
 function geometry(form,detailed,lifted=false){const key=form.kind+':'+detailed+':'+lifted;if(geometries.has(key))return geometries.get(key);const g=new THREE.PlaneGeometry(form.width,form.height,detailed?10:1,detailed?6:1);if(detailed){const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i)/form.width+.5,y=p.getY(i)/form.height+.5;p.setZ(i,Math.sin(x*Math.PI)*.009+Math.max(0,x+y-1.65)*(lifted?.14:.08));}g.computeVertexNormals();}geometries.set(key,g);return g;}
 function surface(form){const key=form.kind+':'+Math.floor(form.age*8);if(materials.has(key))return materials.get(key);const color=new THREE.Color(form.color).lerp(new THREE.Color('#cabc93'),Math.floor(form.age*8)/8*.2);const mat=new THREE.MeshStandardMaterial({color,roughness:.96,side:THREE.DoubleSide});materials.set(key,mat);return mat;}
 function inside(index){const order=handling.orders[index]||[];return [...papers.values()].filter(p=>p.index===index&&!p.fallen&&!p.held).sort((a,b)=>{const ai=order.indexOf(a.id),bi=order.indexOf(b.id);return (ai<0?1000+a.ordinal:ai)-(bi<0?1000+b.ordinal:bi);});}
 function reachable(){const result=[];if(!ready)return result;for(let i=0;i<15;i++)if(boxes[i].open&&Math.abs(boxes[i].angle||0)>.55)result.push(...inside(i).slice(-3));result.push(...[...papers.values()].filter(p=>p.fallen&&!p.held&&!p.falling));return result.filter(p=>p.mesh.visible);}
 function setDetail(item,value){const g=geometry(item.form,value,hovered===item.id);if(value&&!item.mesh.material.map&&typeof document!=='undefined'){const c=document.createElement('canvas');c.width=384;c.height=240;const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,384,240);ctx.strokeStyle='rgba(99,86,64,.24)';ctx.lineWidth=1.8;ctx.beginPath();if(item.form.kind.includes('envelope')){ctx.moveTo(4,4);ctx.lineTo(192,126);ctx.lineTo(380,4);ctx.moveTo(4,236);ctx.lineTo(110,148);ctx.moveTo(380,236);ctx.lineTo(274,148);}else{ctx.moveTo(8,120);ctx.lineTo(376,120);if(item.form.kind==='small-card')ctx.strokeRect(323,16,41,48);}ctx.stroke();const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;item.mesh.material.map=t;item.mesh.material.needsUpdate=true;}if(item.mesh.geometry!==g)item.mesh.geometry=g;}
 function layout(index){const stack=inside(index),c=stack.length;stack.forEach((item,n)=>{
  const f=item.form,handled=handling.touched[item.id],front=n>=c-3;
  const open=boxes[index].open;
  const x=(c<=3?(n-(c-1)/2)*.21:((n*7)%5-2)*.035)+f.offset+(handled?.offset||0);
  const y=-.70+f.height/2+(c<=3?n*.085:Math.min(n,21)*.045);
  const z=.33+(c<=3?.075+n*.004:n*.0045)+(hovered===item.id?.025:0);
  item.home.position.set(x,y,z);item.home.rotation.set(-.035-(c>18?.06:0)-(hovered===item.id?.025:0),0,f.turn+(handled?.turn||0));
  item.mesh.position.lerp(item.home.position,item.settling?.12:1);item.mesh.rotation.copy(item.home.rotation);
  if(hovered&&hovered!==item.id&&front)item.mesh.position.z-=.004;
  if(compression[index]>0)item.mesh.position.z-=Math.sin(compression[index]*Math.PI)*(.008+counts[index]*.0006);
  setDetail(item,open&&front);item.mesh.visible=!item.incoming;
 });}
 function make(letter,index,ordinal){const form=letterForm(letter.id,letter.createdAt),mesh=new THREE.Mesh(geometry(form,false),surface(form));mesh.castShadow=true;mesh.receiveShadow=true;
  const item={id:letter.id,index,ordinal,form,mesh,fallen:false,held:false,home:{position:new THREE.Vector3(),rotation:new THREE.Euler()}};mesh.userData.letterId=item.id;papers.set(item.id,item);boxes[index].base.add(mesh);
  if(history[item.id]){scene.add(mesh);mesh.position.fromArray(history[item.id].position);if(mesh.position.y<-4.15){mesh.position.y=-4.12;mesh.position.z=.86;history[item.id].position=mesh.position.toArray();}mesh.rotation.fromArray(history[item.id].rotation);mesh.rotation.x=-.95;history[item.id].rotation=mesh.rotation.toArray();item.fallen=true;setDetail(item,true);}return item;
 }
 function sync(state,hiddenId){
  const present=new Set(state.mailboxes.flatMap(b=>b.letters.map(l=>l.id)));
  for(const [id,item]of papers)if(!present.has(id)&&!item.held){item.mesh.removeFromParent();papers.delete(id);delete history[id];delete handling.touched[id];}
  for(const mailbox of state.mailboxes){const i=Number(mailbox.id)-1;if(i<0||i>=15)continue;counts[i]=mailbox.letters.length;mailbox.letters.forEach((letter,n)=>{const item=papers.get(letter.id)||make(letter,i,n);item.ordinal=n;item.incoming=letter.id===hiddenId;if(!item.held)item.mesh.visible=!item.incoming;});layout(i);boxes[i].button.dataset.letters=String(counts[i]);}
  ready=true;persist();
 }
 function spill(index){const stack=inside(index);if(stack.length<19)return;const candidates=stack.slice(-Math.min(6,stack.length-15));scene.updateMatrixWorld(true);
  candidates.forEach((item,n)=>{item.fallen=true;item.falling=true;setDetail(item,true);scene.attach(item.mesh);const start=item.mesh.position.clone(),end=new THREE.Vector3(start.x+(n-2)*.16,-4.12+n*.013,.84+n*.034),rotation=[-.95,0,(n-2)*.14,'XYZ'];history[item.id]={position:end.toArray(),rotation};falling.push({item,start,end,age:-n*.09,rotation});});persist();layout(index);
 }
 function onDoorChange(index,open){layout(index);if(open&&counts[index]>=19)pending.set(index,0);if(!open)pending.delete(index);}
 function update(dt){
  for(const [index,age]of pending){if(!boxes[index].open){pending.delete(index);continue;}pending.set(index,age+dt);if(age+dt>.35&&(Math.abs(boxes[index].angle||0)>.55||reduced)){pending.delete(index);spill(index);}}
  for(const item of papers.values())item.settling=Math.max(0,(item.settling||0)-dt);
  for(let i=0;i<15;i++){compression[i]=Math.max(0,compression[i]-dt*1.7);layout(i);
   // Preserve the approved exterior. Open interiors contain only real mail.
   for(const item of boxes[i].mail.moving)item.mesh.visible=!boxes[i].open&&!item.fallen;
  }
  for(let i=falling.length-1;i>=0;i--){const a=falling[i];a.age+=dt;if(a.age<0)continue;const t=reduced?1:Math.min(1,a.age/1.05);a.item.mesh.position.lerpVectors(a.start,a.end,t);a.item.mesh.position.y=THREE.MathUtils.lerp(a.start.y,a.end.y,t*t);a.item.mesh.position.z=Math.max(.77,a.item.mesh.position.z);a.item.mesh.rotation.set(-.95*t,Math.sin(t*9)*.13*(1-t),a.rotation[2]*t+Math.sin(t*12)*.12*(1-t));if(t===1){a.item.mesh.position.copy(a.end);a.item.mesh.rotation.fromArray(a.rotation);a.item.falling=false;sound('impact','folded',.035);falling.splice(i,1);}}
 }
 function hold(id){const item=papers.get(id);if(!item||!reachable().includes(item))return null;scene.updateMatrixWorld(true);item.held=true;item.source={position:item.mesh.getWorldPosition(new THREE.Vector3()),quaternion:item.mesh.getWorldQuaternion(new THREE.Quaternion())};scene.attach(item.mesh);setDetail(item,true);hovered=null;compression[item.index]=1;layout(item.index);return item;}
 function returnTarget(item){const stack=inside(item.index);handling.orders[item.index]=[item.id,...stack.map(p=>p.id)];handling.touched[item.id]={offset:((item.form.hash%5)-2)*.012,turn:((item.form.hash%7)-3)*.01};delete history[item.id];item.fallen=false;item.held=false;boxes[item.index].base.add(item.mesh);layout(item.index);const target={position:item.mesh.getWorldPosition(new THREE.Vector3()),quaternion:item.mesh.getWorldQuaternion(new THREE.Quaternion())};item.held=true;scene.attach(item.mesh);persist();return target;}
 function finishReturn(item){item.held=false;item.fallen=false;item.mesh.visible=true;boxes[item.index].base.add(item.mesh);compression[item.index]=1;layout(item.index);persist();}
 return {remove(id){const p=papers.get(id);if(p){p.mesh.removeFromParent();papers.delete(id);for(const item of inside(p.index))item.settling=1;delete history[id];compression[p.index]=1;counts[p.index]=Math.max(0,counts[p.index]-1);persist();}},sync,update,onDoorChange,counts,papers,reachable,hold,returnTarget,finishReturn,hover(id){hovered=id;},get ready(){return ready;},compress(index){compression[index]=1;},reveal(id){const p=papers.get(id);if(p){p.incoming=false;p.mesh.visible=true;compression[p.index]=1;}},material};
}
