import {finiteGeometry} from './paper-physics.js';
import * as THREE from './vendor/three.module.js';
const SPILL_BOXES=new Set([3,11]);
const RELAX_BOXES=new Set([1,6,7,13]);
const KEY='unplanned-mail-history-v1';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const profiles={envelope:{gravity:12,flutter:.006,turn:.12},advert:{gravity:8.8,flutter:.055,turn:.7},receipt:{gravity:11.6,flutter:.035,turn:1.8},folded:{gravity:10.4,flutter:.025,turn:.38},card:{gravity:13.4,flutter:.003,turn:.10},newspaper:{gravity:8.6,flutter:.042,turn:.48}};
export function createSpillSystem(scene,boxes,{sound=()=>{},storage=null,reduced=false,physicalMailOnly=false,onState=()=>{}}={}){
 let restored;try{restored=JSON.parse(storage?.getItem(KEY)||'null');}catch{}
 const states=boxes.map((b,i)=>({opened:false,openCount:0,spilled:false,remainingMail:b.mail.moving.length,fallenMail:[],...(restored?.version===1?restored.boxes?.[i]:{})}));
 const pending=new Map(),active=[],settled=[];let tick=0,accumulator=0;
 function persist(){try{storage?.setItem(KEY,JSON.stringify({version:1,boxes:states}));}catch{}}
 function emit(){onState({active:active.length,pending:pending.size,fallen:states.reduce((n,s)=>n+s.fallenMail.length,0),spilled:states.filter(s=>s.spilled).length});}
 function serialize(a){return {id:a.id,kind:a.kind,placement:a.placement,position:a.mesh.position.toArray(),rotation:[a.mesh.rotation.x,a.mesh.rotation.y,a.mesh.rotation.z],parent:a.placement==='door'?a.index:null};}
 function applyRecord(index,record){const item=boxes[index].mail.moving.find(m=>m.id===record.id);if(!item)return;item.fallen=true;const mesh=item.mesh;const parent=record.placement==='door'?boxes[index].pivot:scene;parent.add(mesh);mesh.position.fromArray(record.position);mesh.rotation.set(...record.rotation);settled.push({mesh,index,id:record.id,placement:record.placement});}
 for(let i=0;i<boxes.length;i++){const b=boxes[i],s=states[i];if(s.spilled){b.rest=0;if(!physicalMailOnly)for(const record of s.fallenMail)applyRecord(i,record);}b.open=!!s.opened;b.target=b.open?-1.39:b.rest;b.angle=b.target;b.pivot.rotation.y=b.angle;b.button.setAttribute('aria-expanded',String(b.open));}
 scene.updateMatrixWorld(true);
 function destination(index,ordinal,total,item){const b=boxes[index],placement=ordinal===total-1?'door':ordinal===total-2?'frame':'ground';const mesh=item.mesh;const h=item.height||.6;
  if(placement==='door')return {placement,position:new THREE.Vector3(.83,-.65-h*.25,.08),rotation:new THREE.Euler(-.30,.03,.14)};
  if(placement==='frame'){const below=boxes[index+3]||b;return {placement,position:below.base.localToWorld(new THREE.Vector3(.23,.68-h*.38,.64)),rotation:new THREE.Euler(-.13,0,-.16)};}
  const start=mesh.getWorldPosition(new THREE.Vector3()),phase=(index*13+ordinal*7)%17;const x=clamp(start.x+(phase-8)*.066,-6.2,.25),z=1.02+(ordinal%3)*.14+(index===3?.13:0),rx=-1.29+(ordinal%3)*.055;
  const overlaps=settled.filter(p=>p.placement==='ground'&&Math.abs(p.mesh.position.x-x)<.6&&Math.abs(p.mesh.position.z-z)<.5).length;
  return {placement,position:new THREE.Vector3(x,-4.96+h*Math.cos(rx)*.50+(overlaps+ordinal)*.004,z),rotation:new THREE.Euler(rx,(phase-8)*.036,(phase-8)*.079)};
 }
 function releaseBatch(index){const b=boxes[index],s=states[index];if(s.spilled)return;scene.updateMatrixWorld(true);
  const order=index===11?[8,6,9,5,4,3,2,1]:[7,6,5,3,2,1,0];const members=order.map(j=>b.mail.moving.find(m=>m.role==='body'&&m.order===j)).filter(Boolean);
  s.spilled=true;b.rest=0;s.remainingMail=b.mail.moving.length-members.length;
  const kinds=index===11?['envelope','folded','receipt','envelope','card','advert','newspaper','envelope']:['envelope','advert','card','newspaper','folded','envelope','receipt'];
  members.forEach((item,n)=>{const target=destination(index,n,members.length,item);item.fallen=true;const mesh=item.mesh;scene.attach(mesh);const source=mesh.position.clone(),sourceRotation=mesh.rotation.clone(),kind=kinds[n];
   const a={index,id:item.id,item,mesh,kind,...target,source,sourceRotation,target:target.position.clone(),targetRotation:target.rotation.clone(),age:-n*.048,started:false,impact:false,resting:false,profile:profiles[kind],original:mesh.geometry.attributes.position.array.slice(),height:item.height||.6};
   a.end=target.position.clone();if(target.placement==='door')a.end=b.pivot.localToWorld(a.end);
   a.duration=.15+Math.sqrt(Math.max(.04,2*Math.max(.08,source.y-a.end.y)/a.profile.gravity));
   active.push(a);
   // Persist final destinations immediately, so reloading during a fall never respawns mail.
   s.fallenMail.push({id:a.id,kind,placement:a.placement,position:target.position.toArray(),rotation:[target.rotation.x,target.rotation.y,target.rotation.z],parent:target.placement==='door'?index:null});
  });persist();emit();
 }
 function onDoorChange(index,open,{release=true}={}){const s=states[index];s.opened=open;if(open)s.openCount++;if(open&&release&&!physicalMailOnly&&SPILL_BOXES.has(index)&&!s.spilled&&!pending.has(index))pending.set(index,{time:0});if(!open&&!s.spilled)pending.delete(index);persist();emit();}
 function doorTarget(index,target){const p=pending.get(index);return p&&p.time<.18?boxes[index].rest-.035:target;}
 function flex(a,t,amount){const attr=a.mesh.geometry.attributes.position,uv=a.mesh.geometry.attributes.uv,src=a.original;const amp=a.profile.flutter*amount;for(let i=0;i<attr.count;i++){const u=uv.getX(i),v=uv.getY(i);let bend=Math.sin(u*Math.PI)*Math.sin(v*5+t*(a.kind==='receipt'?19:12))*amp;if(a.kind==='folded')bend+=Math.abs(u-.5)*.065*amount;attr.setZ(i,src[i*3+2]+bend);}finiteGeometry(a.mesh.geometry,src,.08);attr.needsUpdate=true;a.mesh.geometry.computeVertexNormals();}
 function finish(a){flex(a,a.age,0);a.mesh.position.copy(a.target);a.mesh.rotation.copy(a.targetRotation);if(a.placement==='door')boxes[a.index].pivot.add(a.mesh);
  const record=serialize(a);const slot=states[a.index].fallenMail.findIndex(r=>r.id===a.id);states[a.index].fallenMail[slot]=record;settled.push({mesh:a.mesh,index:a.index,id:a.id,placement:a.placement});a.done=true;persist();}
 function step(dt){tick+=dt;for(const [index,p]of pending){p.time+=dt;const b=boxes[index];if(!b.open){pending.delete(index);continue;}if(p.time>=.35&&-b.angle>.52){pending.delete(index);releaseBatch(index);}}
  scene.updateMatrixWorld(true);
  for(const a of active){a.age+=dt;if(a.age<0)continue;if(!a.started){a.started=true;sound('rustle',a.kind,.04);}
   if(reduced){finish(a);continue;}const t=a.age,b=boxes[a.index];let end=a.target.clone();if(a.placement==='door')end=b.pivot.localToWorld(end);
   const travel=Math.max(.10,a.duration-.15),fallTime=Math.max(0,t-.15),q=clamp(fallTime/travel,0,1),clear=smooth(t/.15);
   const land=t>=a.duration;const endRotation=a.targetRotation.clone();if(a.placement==='door'){const qDoor=b.pivot.getWorldQuaternion(new THREE.Quaternion()).multiply(new THREE.Quaternion().setFromEuler(a.targetRotation));endRotation.setFromQuaternion(qDoor);}
   if(!land){a.mesh.position.x=THREE.MathUtils.lerp(a.source.x,end.x,smooth(q));a.mesh.position.y=a.source.y-.035*clear-(a.source.y-end.y-.035)*q*q;a.mesh.position.z=THREE.MathUtils.lerp(a.source.z,Math.max(.82,end.z),clear);
    const air=Math.sin(Math.PI*q)*a.profile.flutter;a.mesh.position.x+=Math.sin(t*11+a.index)*air;a.mesh.position.z+=Math.sin(t*13)*air;
    a.mesh.rotation.set(THREE.MathUtils.lerp(a.sourceRotation.x,a.targetRotation.x,smooth(q))+Math.sin(t*9)*a.profile.turn*Math.sin(Math.PI*q),a.sourceRotation.y+Math.sin(t*7)*a.profile.turn*.4*Math.sin(Math.PI*q),THREE.MathUtils.lerp(a.sourceRotation.z,a.targetRotation.z,q)+Math.sin(t*12)*a.profile.turn*.25*Math.sin(Math.PI*q));
    // Clear the door's physical slab rather than allowing its plane to cut the sheet.
    if(t<.36){const local=b.pivot.worldToLocal(a.mesh.position.clone());if(local.x>0&&local.x<1.55&&Math.abs(local.y)<.76&&Math.abs(local.z)<.055){local.z=.065;a.mesh.position.copy(b.pivot.localToWorld(local));if(!a.doorContact){sound('contact',a.kind,.025);a.doorContact=true;}}}
    // The front edges of lower compartments deflect sheets into the aisle.
    if(t>.15&&a.mesh.position.z<.72)a.mesh.position.z=.72;
    flex(a,t,Math.sin(Math.PI*q));
   }else{if(!a.impact){a.impact=true;sound(a.placement==='ground'?'impact':'contact',a.kind,.035);}const rest=t-a.duration,settle=smooth(rest/.24);a.mesh.position.copy(end);a.mesh.position.y+=Math.sin(clamp(rest/.24,0,1)*Math.PI)*Math.exp(-rest*10)*(a.placement==='ground'?.065:.018);a.mesh.position.x+=(1-settle)*.025;a.mesh.rotation.copy(endRotation);flex(a,t,(1-settle)*.15);if(rest>=.24)finish(a);}
  }
  // Cheap pairwise edge contacts, only for the capped moving set; never touch sleepers.
  for(let i=0;i<active.length;i++)for(let j=i+1;j<active.length;j++){const a=active[i],b=active[j];if(a.done||b.done||a.age<.15||b.age<.15||a.impact||b.impact)continue;const delta=a.mesh.position.clone().sub(b.mesh.position);if(Math.abs(delta.x)<.18&&Math.abs(delta.y)<.10&&Math.abs(delta.z)<.025){a.mesh.position.z+=.014;b.mesh.position.z-=.009;}}
  const oldLength=active.length;for(let i=active.length-1;i>=0;i--)if(active[i].done)active.splice(i,1);if(oldLength!==active.length)emit();
 }
 function update(dt){if(!active.length&&!pending.size)return;accumulator+=Math.min(dt,.1);while(accumulator>=1/120){step(1/120);accumulator-=1/120;}}
 function relaxation(index,amount){return states[index].spilled||RELAX_BOXES.has(index)||SPILL_BOXES.has(index)?amount:amount*.18;}
 function snapshot(){return {active:active.length,pending:pending.size,boxes:JSON.parse(JSON.stringify(states))};}
 emit();return {onDoorChange,doorTarget,update,relaxation,snapshot,persist};
}
