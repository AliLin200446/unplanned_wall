import * as THREE from './vendor/three.module.js';
// Quantities follow delivery history, not a repeating row or column pattern.
export const mailCounts=[2,6,1,8,4,2,5,7,0,4,1,10,6,8,2];
const histories=[
 {side:-1,lean:-.05,low:true}, {side:1,lean:.08}, {side:-1,lean:-.12,large:true},
 {side:-1,lean:-.11}, {side:1,lean:.13,low:true}, {side:1,lean:.03,low:true},
 {side:-1,lean:-.03}, {side:1,lean:.09}, {side:1,lean:0},
 {side:-1,lean:-.14}, {side:1,lean:.03,low:true}, {side:-1,lean:-.04,hero:true},
 {side:1,lean:.04,low:true}, {side:-1,lean:-.08}, {side:1,lean:.13}
];
const cache=new Map();
function printing(code){if(cache.has(code))return cache.get(code);const c=document.createElement('canvas');c.width=512;c.height=640;const g=c.getContext('2d'),kind=code%10;
 g.fillStyle=['#eee9dd','#e8e1d1','#e9e8e0','#ece5d7'][code%4];g.fillRect(0,0,512,640);
 // 40% blank envelopes; 30% sparse bills; 20% dense print; 10% stamps.
 if(kind<4){g.strokeStyle='#c0b9a9';g.lineWidth=1.3;g.beginPath();g.moveTo(8,9);g.lineTo(250,228);g.lineTo(502,9);g.moveTo(8,630);g.lineTo(164,381);g.moveTo(502,630);g.lineTo(343,386);g.stroke();if(code%3===0){g.fillStyle='#c6c0b2';g.fillRect(315,430,92,2);g.fillRect(315,442,72,2);}}
 else if(kind<7){g.strokeStyle='#b3b1a7';g.lineWidth=1;g.strokeRect(39,82,432,102);g.strokeRect(39,335,432,190);g.fillStyle='#77776f';g.font='14px sans-serif';g.fillText(kind===4?'繳費通知':'收件資料',42,48);for(let k=0;k<6;k++){g.fillRect(43,225+k*13,124+(k%3)*49,1.3);g.fillRect(49,366+k*24,365-(k%2)*90,1);}for(let x=49;x<470;x+=7)g.fillRect(x,557,(x%4)+1,31);}
 else if(kind<9){g.fillStyle='#64655f';g.font='10px serif';const line='社區生活通知事項及日常服務資訊';for(let col=0;col<3;col++)for(let row=0;row<38;row++)g.fillText(line.slice(0,10),24+col*163,28+row*15);g.fillStyle='#898b80';g.fillRect(26,73,140,93);}
 else{g.strokeStyle='#937b72';g.lineWidth=2;g.strokeRect(280,58,154,83);g.fillStyle='#937b72';g.font='24px serif';g.fillText('已收',310,111);g.strokeStyle='#64645d';g.lineWidth=1.3;g.beginPath();g.moveTo(96,379);g.bezierCurveTo(184,347,155,413,258,370);g.stroke();}
 if(code%3===0){g.fillStyle='rgba(99,85,61,.04)';g.fillRect(0,311,512,3);g.fillStyle='rgba(255,255,249,.3)';g.fillRect(0,314,512,2);}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;cache.set(code,t);return t;
}
// A thin closed shell, with a bowed face, real edge thickness and optional dog-ear.
function sheet(w,h,code,age,bow=.013,dog=false){const nx=10,ny=14,front=[],uv=[],indices=[];
 for(let iy=0;iy<=ny;iy++)for(let ix=0;ix<=nx;ix++){const u=ix/nx,v=iy/ny;let x=(u-.5)*w,y=(v-.5)*h;
 if(code%7===0&&ix===nx)x-=.004*(iy%3);
 let z=bow*Math.sin(u*Math.PI)*Math.sin(v*Math.PI*.65);
 if(dog&&u>.74&&v>.76){const fold=Math.max(0,u+v-1.77);z+=fold*.15;y-=fold*.09;}
 front.push(x,y,z);uv.push(u,v);}
 const count=front.length/3,positions=[...front,...front.map((n,i)=>i%3===2?n-.0022:n)],uvs=[...uv,...uv];
 for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){let a=y*(nx+1)+x,b=a+1,d=a+nx+1,e=d+1;indices.push(a,b,e,a,e,d,a+count,e+count,b+count,a+count,d+count,e+count);}
 const boundary=[];for(let x=0;x<=nx;x++)boundary.push(x);for(let y=1;y<=ny;y++)boundary.push(y*(nx+1)+nx);for(let x=nx-1;x>=0;x--)boundary.push(ny*(nx+1)+x);for(let y=ny-1;y>0;y--)boundary.push(y*(nx+1));
 for(let j=0;j<boundary.length;j++){const a=boundary[j],b=boundary[(j+1)%boundary.length];indices.push(a,a+count,b+count,a,b+count,b);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();
 const tint=new THREE.Color().setRGB(.88-age*.27,.86-age*.28,.79-age*.29);
 const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:tint,map:printing(code),roughness:.99,side:THREE.DoubleSide}));mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
}
const formats=[[1.10,.46],[.81,.35],[1.16,.62],[.70,.48],[.99,.39],[.20,.83],[1.27,.77],[.58,.29],[1.08,.51],[.84,.40]];
export function createMailboxMail(base,index){const count=mailCounts[index],history=histories[index],group=new THREE.Group();base.add(group);const moving=[];
 for(let j=0;j<count;j++){
  const age=count===1?.35:1-j/Math.max(1,count-1);let code=(index*7+j*3)%30;let [w,h]=formats[(index*3+j*7)%formats.length];
  if(history.large){w=1.26;h=1.02;code=6;}
  if(count>=4&&count<7){h=(index%3===0?.84:.73)-j*.047+(j%2)*.03;}
  if(history.low){h*=.65;w*=.93;}
  if(count>=7){h=.92-j*.043+(j%3)*.045;w=.96+(j%4)*.069;}
  if(history.hero){h=1.18-j*.045+(j%3)*.029;w=1.12+(j%3)*.043;}
  if(history.hero&&j===count-1){w=.19;h=1.19;code=14;}
  // Every lower edge is supported by the floor; front arrivals obscure old mail.
  const rz=history.lean*(.35+.65*j/Math.max(1,count-1));
  const xLimit=(1.49-w*Math.cos(rz)-h*Math.abs(Math.sin(rz)))/2;
  let x=history.side*Math.max(.01,xLimit-.014)*(j%3===0?.65:1);
  const y=-.714+(h*Math.cos(rz)+w*Math.abs(Math.sin(rz)))/2+(j%3)*.006;
  const z=.279+(count===1?.025:j*(history.hero?.0115:.13/Math.max(1,count-1)));
  const m=sheet(w,h,code,age,.010+(j%3)*.006,j%4===0);m.position.set(x,y,z);m.rotation.set(0,history.side*.017,rz);group.add(m);
  moving.push({mesh:m,z,y,rx:m.rotation.x,response:j>=count-3?(.55+(j%3)*.20):.10});
  // A folded-back leaflet stays attached along its lower crease.
  if((history.hero&&j===7)||(index===3&&j===4)){const flap=sheet(w*.91,h*.28,code,age,.019,true);flap.position.set(x,y+h*.36,z+.018);flap.rotation.set(-.40,0,rz);group.add(flap);moving.push({mesh:flap,z:flap.position.z,y:flap.position.y,rx:-.40,response:1});}
 }
 // Five deliveries have caught on the slot lip. The strip bends around it.
 const caught={1:{w:.68,length:.42,n:1},3:{w:.87,length:.35,n:2},7:{w:1.10,length:.31,n:3},11:{w:.90,length:.52,n:2},14:{w:.62,length:.37,n:1}}[index];
 if(caught){for(let n=0;n<caught.n;n++){const w=caught.w-n*.026,code=(index+n*7)%30,mesh=sheet(w,caught.length,code,.20+n*.17,.006,n===0);const p=mesh.geometry.attributes.position;
 // Top enters the cavity; middle rides the lip; free end turns outward/down.
 for(let k=0;k<p.count;k++){const v=mesh.geometry.attributes.uv.getY(k);let yy,zz;if(v<.42){yy=.40+v/.42*.21;zz=.355+v/.42*.083;}else if(v<.67){yy=.61+(v-.42)/.25*.071;zz=.438+(v-.42)/.25*.072;}else{yy=.681-(v-.67)/.33*(index===11?.14:.055);zz=.510+(v-.67)/.33*.079;}p.setY(k,yy+n*.005);p.setZ(k,zz+(k>=p.count/2?-.0022:0)+n*.006);}
 p.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.position.x=index===7?.13:-.15+(n*.008);mesh.rotation.z=index===14?-.045:index===3?.035:0;group.add(mesh);moving.push({mesh,z:0,y:0,rx:0,response:.18});}}
 return {group,moving,relax:0,velocity:0};
}
export function updateMailboxMail(mail,openAmount,dt,reduced){const target=Math.max(0,Math.min(1,openAmount));if(reduced)mail.relax=target;else{mail.velocity+=(target-mail.relax)*48*dt;mail.velocity*=Math.exp(-12*dt);mail.relax+=mail.velocity*dt;}
 for(const item of mail.moving){const a=mail.relax*item.response;item.mesh.position.z=item.z+a*.006;item.mesh.position.y=item.y-a*.003;item.mesh.rotation.x=item.rx-a*.012;}
}
