import * as THREE from './vendor/three.module.js';
export const THICKNESS=.0022;
export const INTERIOR=new THREE.Box3(new THREE.Vector3(-.728,-.713,.269),new THREE.Vector3(.728,.566,.395));
export const CLEAR_Z=2.65, FLOOR_Y=-4.97;
const clamp=THREE.MathUtils.clamp;
export function paperGeometry(w,h,detailed=true,curl=0){
 w=clamp(Number.isFinite(w)?w:.9,.1,1.3);h=clamp(Number.isFinite(h)?h:.4,.1,2);
 const nx=detailed?10:1,ny=detailed?12:1,positions=[],uv=[],indices=[];
 curl=clamp(Number.isFinite(curl)?curl:0,0,.008);
 for(let side=0;side<2;side++)for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++){const u=x/nx,v=y/ny;positions.push((u-.5)*w,(v-.5)*h,Math.sin(u*Math.PI)*.0003+Math.max(0,u+v-1.7)*curl-side*THICKNESS);uv.push(u,v);}
 const n=(nx+1)*(ny+1);for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){const a=y*(nx+1)+x,b=a+1,c=a+nx+1,d=c+1;indices.push(a,b,d,a,d,c,a+n,d+n,b+n,a+n,c+n,d+n);}
 const edge=[];for(let x=0;x<=nx;x++)edge.push(x);for(let y=1;y<=ny;y++)edge.push(y*(nx+1)+nx);for(let x=nx-1;x>=0;x--)edge.push(ny*(nx+1)+x);for(let y=ny-1;y>0;y--)edge.push(y*(nx+1));for(let i=0;i<edge.length;i++){const a=edge[i],b=edge[(i+1)%edge.length];indices.push(a,a+n,b+n,a,b+n,b);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingBox();return g;
}
export function finiteGeometry(g,reference,maxDisplacement=.08){const p=g.attributes.position;let repaired=false;for(let i=0;i<p.array.length;i++){const original=reference?.[i]??0,value=p.array[i];if(!Number.isFinite(value)||Math.abs(value-original)>maxDisplacement){p.array[i]=Number.isFinite(value)?clamp(value,original-maxDisplacement,original+maxDisplacement):original;repaired=true;}}if(repaired)p.needsUpdate=true;g.computeBoundingBox();return !repaired;}
export function localBounds(mesh,parent){mesh.updateWorldMatrix(true,false);parent.updateWorldMatrix(true,false);mesh.geometry.computeBoundingBox();const matrix=parent.matrixWorld.clone().invert().multiply(mesh.matrixWorld);return mesh.geometry.boundingBox.clone().applyMatrix4(matrix);}
export function fitInterior(mesh,parent,bounds=INTERIOR){bounds=bounds.clone().expandByScalar(-.00001);
 const b=localBounds(mesh,parent),delta=new THREE.Vector3();for(const key of ['x','y','z']){if(b.max[key]-b.min[key]>bounds.max[key]-bounds.min[key]+1e-5)throw Error('Paper exceeds its compartment');if(b.min[key]<bounds.min[key])delta[key]=bounds.min[key]-b.min[key];if(b.max[key]+delta[key]>bounds.max[key])delta[key]+=bounds.max[key]-b.max[key]-delta[key];}
 const origin=parent.localToWorld(new THREE.Vector3()),world=parent.localToWorld(delta).sub(origin);mesh.position.add(mesh.parent.worldToLocal(mesh.getWorldPosition(new THREE.Vector3()).add(world)).sub(mesh.position));return localBounds(mesh,parent);
}
function shape(bounds,matrix,name){const center=bounds.getCenter(new THREE.Vector3()).applyMatrix4(matrix),half=bounds.getSize(new THREE.Vector3()).multiplyScalar(.5),axes=[new THREE.Vector3(1,0,0),new THREE.Vector3(0,1,0),new THREE.Vector3(0,0,1)];axes.forEach((v,i)=>{v.applyMatrix3(new THREE.Matrix3().setFromMatrix4(matrix));half.setComponent(i,half.getComponent(i)*v.length());v.normalize();});return {center,half,axes,name};}
export function intersects(a,b,margin=.00005){const d=b.center.clone().sub(a.center),axes=[...a.axes,...b.axes];for(const u of a.axes)for(const v of b.axes){const n=u.clone().cross(v);if(n.lengthSq()>1e-12)axes.push(n.normalize());}for(const n of axes){const ra=a.axes.reduce((s,v,i)=>s+Math.abs(n.dot(v))*a.half.getComponent(i),0),rb=b.axes.reduce((s,v,i)=>s+Math.abs(n.dot(v))*b.half.getComponent(i),0);if(Math.abs(d.dot(n))>=ra+rb-margin)return false;}return true;}
export function meshShape(mesh){mesh.updateWorldMatrix(true,false);mesh.geometry.computeBoundingBox();return shape(mesh.geometry.boundingBox,mesh.matrixWorld,'paper');}
export function createPaperCollisions(boxes){
 const definitions=boxes.map((b,i)=>{const parts=[];const add=(name,min,max,parent=b.base)=>parts.push({name:`${i+1}:${name}`,bounds:new THREE.Box3(new THREE.Vector3(...min),new THREE.Vector3(...max)),parent});
 add('back',[-.785,-.755,.2315],[.785,.755,.2565]);add('left',[-.845,-.82,.02],[-.754,.82,.405]);add('right',[.754,-.82,.02],[.845,.82,.405]);add('bottom',[-.79,-.760,.195],[.79,-.726,.445]);add('top',[-.79,.76,.02],[.79,.86,.405]);add('front-left',[-.806,-.82,.36],[-.755,.82,.414]);add('front-right',[.755,-.82,.36],[.806,.82,.414]);add('slot-top',[-.78,.711,.31],[.78,.765,.47]);const lip=.706-[.105,.134,.091,.111,.12][i%5];add('slot-lip',[-.77,lip-.0105,.4445],[.77,lip+.0105,.5095]);if(b.pivot)add('door',[-.0015,-.67,-.018],[1.5335,.67,.035],b.pivot);return parts;});
 const all=()=>definitions.flat().map(p=>{p.parent.updateWorldMatrix(true,false);return shape(p.bounds,p.parent.matrixWorld,p.name);});
 function contacts(mesh,index){const s=meshShape(mesh);return (index===undefined?all():definitions[index].map(p=>{p.parent.updateWorldMatrix(true,false);return shape(p.bounds,p.parent.matrixWorld,p.name);})).filter(p=>intersects(s,p));}
 function exitPose(item){const b=boxes[item.index],oldPosition=item.mesh.position.clone(),oldRotation=item.mesh.rotation.clone();const parent=item.mesh.parent;sceneAttachTo(b.base,item.mesh);item.mesh.rotation.set(0,0,0);const half=item.form.width/2;item.mesh.position.set(INTERIOR.max.x-half-.008,clamp(item.home.position.y,INTERIOR.min.y+item.form.height/2+.005,INTERIOR.max.y-item.form.height/2-.005),Math.max(.278,item.mesh.position.z));const inside=item.mesh.position.clone();let valid=true;
 const swept=shape(new THREE.Box3(new THREE.Vector3(inside.x-half-.002,inside.y-item.form.height/2-.002,inside.z-.003),new THREE.Vector3(inside.x+half+.002,inside.y+item.form.height/2+.002,CLEAR_Z+.003)),b.base.matrixWorld,'paper exit corridor');valid=!all().some(c=>intersects(swept,c));
 const outside=inside.clone();outside.z=CLEAR_Z;parent.attach(item.mesh);item.mesh.position.copy(oldPosition);item.mesh.rotation.copy(oldRotation);return valid?{inside:b.base.localToWorld(inside),outside:b.base.localToWorld(outside),quaternion:b.base.getWorldQuaternion(new THREE.Quaternion())}:null;}
 function safeGround(item,ordinal=0){const h=item.form.height,w=item.form.width;return {position:new THREE.Vector3(clamp(item.mesh.getWorldPosition(new THREE.Vector3()).x,-5.7,.0),FLOOR_Y+THICKNESS+.004*(ordinal%12),3.1+Math.floor(ordinal/12)*1.4+(ordinal%3)*.018),rotation:new THREE.Euler(-Math.PI/2,0,((item.form.hash%9)-4)*.025)};}
 return {definitions,contacts,exitPose,safeGround,all};
}
function sceneAttachTo(parent,mesh){parent.attach(mesh);}
// Arc-length path: the sheet is fed horizontally through the actual slot, then
// turns behind the lip and descends entirely behind the closed door.
export function slotPoint(distance){const outside=1.10,cornerZ=.435,r=.045,slotY=.674,straight=outside-cornerZ;if(distance<straight)return {y:slotY,z:outside-distance,ny:1,nz:0};if(distance<straight+r*Math.PI/2){const a=(distance-straight)/r;return {y:slotY-r+r*Math.cos(a),z:cornerZ-r*Math.sin(a),ny:Math.cos(a),nz:-Math.sin(a)};}return {y:slotY-r-(distance-straight-r*Math.PI/2),z:cornerZ-r,ny:0,nz:-1};}
export const SLOT_PATH_LENGTH=1.10-.435+.045*Math.PI/2+(.674-.045+.70);
export function feedSlot(mesh,width,height,feed){feed=clamp(Number.isFinite(feed)?feed:0,0,SLOT_PATH_LENGTH);width=clamp(Number.isFinite(width)?width:.9,.1,1.3);height=clamp(Number.isFinite(height)?height:.4,.1,2);const p=mesh.geometry.attributes.position,uv=mesh.geometry.attributes.uv,n=p.count/2;for(let i=0;i<p.count;i++){const v=uv.getY(i),q=slotPoint(feed-v*height),thickness=i<n?THICKNESS/2:-THICKNESS/2;p.setXYZ(i,(uv.getX(i)-.5)*width,q.y+q.ny*thickness,q.z+q.nz*thickness);}p.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingBox();}
