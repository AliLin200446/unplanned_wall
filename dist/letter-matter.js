import * as THREE from './vendor/three.module.js';
const HISTORY='unplanned-real-mail-v1';
export function createLetterMatter(scene,boxes,{sound=()=>{},reduced=false}={}){
 const papers=new Map(),falling=[],counts=Array(15).fill(0),compression=Array(15).fill(0);let history={};
 try{history=JSON.parse(sessionStorage.getItem(HISTORY)||'{}');}catch{}
 const material=new THREE.MeshStandardMaterial({color:'#e9dfc7',roughness:.98,side:THREE.DoubleSide});
 const persist=()=>{try{sessionStorage.setItem(HISTORY,JSON.stringify(history));}catch{}};
 function make(id,index,ordinal){
  const geometry=new THREE.PlaneGeometry(1.03,.39,8,4),p=geometry.attributes.position;
  for(let i=0;i<p.count;i++)p.setZ(i,Math.sin(p.getX(i)*3)*.008);
  geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;
  const item={id,index,ordinal,mesh,fallen:false};papers.set(id,item);boxes[index].base.add(mesh);place(item);
  if(history[id]){scene.add(mesh);mesh.position.fromArray(history[id].position);mesh.rotation.fromArray(history[id].rotation);item.fallen=true;}
  return item;
 }
 function place(item){if(item.fallen)return;const n=item.ordinal,c=counts[item.index];
  // Fresh folded sheets overlap at different heights; crowded arrivals catch the slot.
  item.mesh.position.set(((n*7)%5-2)*.031,-.49+Math.min(n,20)*.048,.417+n*.0006);
  item.mesh.rotation.set(-.06-(c>18?.08:0),((n*3)%5-2)*.019,((n*7)%7-3)*.018);
 }
 function sync(state,hiddenId){for(const mailbox of state.mailboxes){const i=Number(mailbox.id)-1;if(i<0||i>=15)continue;counts[i]=mailbox.letters.length;mailbox.letters.forEach((letter,n)=>{const item=papers.get(letter.id)||make(letter.id,i,n);item.ordinal=n;place(item);item.mesh.visible=letter.id!==hiddenId;});boxes[i].button.dataset.letters=String(counts[i]);}}
 function onDoorChange(index,open){
  if(!open||counts[index]<19)return;
  const inside=[...papers.values()].filter(p=>p.index===index&&!p.fallen);if(inside.length<19)return;
  const candidates=inside.slice(-Math.min(6,inside.length-15));
  candidates.forEach((item,n)=>{
   item.fallen=true;scene.updateMatrixWorld(true);scene.attach(item.mesh);
   const start=item.mesh.position.clone(),end=new THREE.Vector3(start.x+(n-2)*.13,-4.83+n*.012,1.05+n*.045);
   const rotation=[-1.3,0,(n-2)*.13,'XYZ'];history[item.id]={position:end.toArray(),rotation};
   falling.push({item,start,end,age:-.38-n*.09,rotation});
  });persist();
 }
 function update(dt){
  for(let i=0;i<15;i++){const a=compression[i];if(a>0){for(const item of boxes[i].mail.moving)if(!item.fallen)item.mesh.position.z-=Math.sin(a*Math.PI)*(.008+counts[i]*.0008);for(const item of papers.values())if(item.index===i&&!item.fallen){place(item);item.mesh.position.z-=Math.sin(a*Math.PI)*.018;}compression[i]=Math.max(0,a-dt*1.7);}}
  for(let i=falling.length-1;i>=0;i--){const a=falling[i];a.age+=dt;if(a.age<0)continue;const t=reduced?1:Math.min(1,a.age/1.05);a.item.mesh.position.lerpVectors(a.start,a.end,t);a.item.mesh.position.y=THREE.MathUtils.lerp(a.start.y,a.end.y,t*t);a.item.mesh.position.z=Math.max(.77,a.item.mesh.position.z);a.item.mesh.rotation.set(-1.3*t,Math.sin(t*9)*.13*(1-t),a.rotation[2]*t+Math.sin(t*12)*.12*(1-t));if(t===1){a.item.mesh.position.copy(a.end);a.item.mesh.rotation.fromArray(a.rotation);sound('impact','folded',.035);falling.splice(i,1);}}
 }
 return {sync,update,onDoorChange,counts,papers,compress(index){compression[index]=1;},reveal(id){const p=papers.get(id);if(p){p.mesh.visible=true;compression[p.index]=1;}},material};
}
