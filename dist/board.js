import * as THREE from './vendor/three.module.js';
// The backing records removal; the separate paper meshes record later arrivals.
export function createBoardSurface(board){
 const copies=[],loader=new THREE.TextureLoader();
 function texture(path){const t=loader.load(path,loaded=>{for(const copy of copies)if(copy.source===loaded.source)copy.needsUpdate=true;});t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;}
 const backing=texture('assets/board-backing.png');
 const back=new THREE.Mesh(new THREE.PlaneGeometry(3.82,5.12),new THREE.MeshStandardMaterial({map:backing,roughness:.98,bumpMap:backing,bumpScale:.008}));back.position.z=.075;back.receiveShadow=true;board.add(back);
 const atlas=texture('assets/notice-papers.png');
 function paperMap(cell){const t=atlas.clone();t.repeat.set(.496,.496);t.offset.set((cell%2)*.5+.002,cell<2?.502:.002);copies.push(t);if(atlas.image)t.needsUpdate=true;return t;}
 const maps=[0,1,2,3].map(paperMap);
 function paper({x,y,w,h,cell=1,rotation=0,age=.1,peel=0,peelCorner='br',z=.102,cut=null}){
  let geo;
  if(cut){const shape=new THREE.Shape();cut.forEach(([u,v],i)=>{const xx=(u-.5)*w,yy=(v-.5)*h;i===0?shape.moveTo(xx,yy):shape.lineTo(xx,yy);});shape.closePath();geo=new THREE.ShapeGeometry(shape);const p=geo.attributes.position,uv=geo.attributes.uv;for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/w+.5,p.getY(i)/h+.5);}
  else geo=new THREE.PlaneGeometry(w,h,16,20);
  const p=geo.attributes.position;
  for(let i=0;i<p.count;i++){let xx=p.getX(i),yy=p.getY(i),u=xx/w+.5,v=yy/h+.5;let edge=peelCorner==='br'?Math.max(0,u-v-.40):Math.max(0,u+v-1.38);let lift=peel*edge*edge;let zz=.002*Math.sin(u*Math.PI)*Math.sin(v*Math.PI*2)+lift;
   if(peel){xx-=lift*.13;yy+=peelCorner==='br'?lift*.40:-lift*.30;}
   p.setXYZ(i,xx,yy,zz);
  }geo.computeVertexNormals();
  const group=new THREE.Group();group.position.set(x,y,z);group.rotation.z=rotation;board.add(group);
  const front=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({map:maps[cell],color:new THREE.Color().setRGB(1-age*.18,.98-age*.19,.93-age*.22),roughness:.97,side:THREE.FrontSide}));front.castShadow=true;front.receiveShadow=true;group.add(front);
  const reverse=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:new THREE.Color().setRGB(.78-age*.1,.75-age*.1,.66-age*.1),roughness:1,side:THREE.BackSide}));reverse.position.z=-.003;reverse.castShadow=true;reverse.receiveShadow=true;group.add(reverse);
  return group;
 }
 function tape(parent,x,y,w,h,age=0,rot=0,z=.009){const color=age>.5?'#a89a65':'#d4d5bf';const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h,2,2),new THREE.MeshStandardMaterial({color,transparent:true,opacity:age>.5?.35:.19,roughness:age>.5?.74:.27,side:THREE.DoubleSide,depthWrite:false}));m.position.set(x,y,z);m.rotation.z=rot;m.receiveShadow=true;parent.add(m);return m;}
 // Upper-left notice survived a damp season: recognizably complete, faded.
 const old=paper({x:-1.10,y:1.55,w:1.16,h:1.62,cell:1,rotation:.021,age:.72,peel:.035,peelCorner:'tr',cut:[[0,0],[.87,0],[.88,.07],[.97,.055],[1,.12],[1,1],[0,1]]});
 tape(old,-.43,.79,.32,.12,.9,-.07);tape(old,.42,.79,.26,.11,.9,.035);tape(old,-.49,-.66,.13,.26,.7,-.09);
 // Older upper-right paper, with its lower-right fastening gone.
 const highPeel=paper({x:1.03,y:1.19,w:1.00,h:1.47,cell:2,rotation:-.063,age:.50,peel:.62,peelCorner:'tr',z:.105});
 tape(highPeel,-.36,.70,.27,.12,.7,.04);tape(highPeel,.34,.70,.23,.12,.8,-.08);
 // Lower remnant was ripped downwards; its torn outline remembers a rectangle.
 paper({x:.48,y:-.82,w:1.40,h:1.20,cell:2,rotation:.025,age:.8,z:.094,cut:[[0,1],[1,1],[1,.68],[.91,.70],[.85,.67],[.80,.72],[.61,.69],[.54,.73],[.42,.68],[.37,.74],[.18,.71],[.12,.75],[0,.73]]});
 paper({x:-1.00,y:-1.08,w:1.25,h:1.47,cell:1,rotation:-.015,age:.76,z:.092,cut:[[0,0],[.91,0],[.86,.14],[.74,.19],[.71,.34],[.60,.29],[.57,.50],[.45,.54],[.41,.77],[.29,.81],[.24,1],[0,1]]});
 paper({x:.42,y:-2.04,w:1.16,h:.72,cell:3,rotation:.05,age:.72,z:.098,cut:[[0,0],[1,0],[1,.60],[.86,.65],[.76,.63],[.69,.70],[.59,.69],[.43,.78],[.26,.76],[.17,.87],[0,.85]]});
 // Latest rental notice overlaps the top of an older removal scar.
 const orange=paper({x:.71,y:.32,w:1.37,h:1.81,cell:0,rotation:-.026,age:.05,peel:.055,z:.119});
 tape(orange,-.46,.87,.28,.105,.12,-.04);tape(orange,.48,.87,.28,.11,.1,.05);tape(orange,-.50,-.82,.23,.10,.2,-.03);
 // A tiny update was stuck onto the rental notice later.
 const pink=new THREE.Mesh(new THREE.PlaneGeometry(.19,.105),new THREE.MeshStandardMaterial({color:'#c8858f',roughness:1}));pink.position.set(.46,-.62,.012);pink.rotation.z=.065;orange.add(pink);tape(orange,.46,-.60,.07,.16,.08,-.04,.016);
 // Second peeling sheet: its upper-right corner has released from old tape.
 const lowPeel=paper({x:-.86,y:-1.12,w:1.05,h:1.29,cell:2,rotation:.043,age:.35,peel:.46,peelCorner:'tr',z:.119});
 tape(lowPeel,-.41,.61,.22,.105,.65,.03);tape(lowPeel,-.40,-.58,.13,.25,.7,-.02);tape(lowPeel,.40,-.59,.20,.09,.6,-.06);
 // A small nearly complete pale-yellow notice arrived between removals.
 const small=paper({x:1.30,y:-1.70,w:.67,h:.83,cell:3,rotation:-.062,age:.33,peel:.025,z:.107});
 tape(small,-.20,.39,.22,.075,.42,-.025);tape(small,.22,.38,.16,.08,.5,.06);
 // Two retained fastenings mark a missing lower notice, without more paper.
 tape(board,.03,-1.42,.20,.09,.95,-.045,.083);tape(board,.66,-1.44,.19,.08,.9,.024,.083);
 return {backing:back,posters:board.children.length};
}
