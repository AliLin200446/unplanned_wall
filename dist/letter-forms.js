export function letterHash(id){let h=2166136261;for(const c of id)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
const forms=[
 {kind:'cream-envelope',width:.92,height:.40,color:'#e8dfc9'},
 {kind:'large-envelope',width:1.13,height:.51,color:'#e8e5da'},
 {kind:'folded-sheet',width:1.02,height:.39,color:'#ebe3d2'},
 {kind:'narrow-note',width:.69,height:.43,color:'#e1d8c4'},
 {kind:'small-card',width:.83,height:.47,color:'#dedbcf'},
 {kind:'receipt-fold',width:.49,height:.58,color:'#eae5d9'}
];
export function letterForm(id,createdAt,now=Date.now()){
 const hash=letterHash(id),age=Math.min(1,Math.max(0,(now-Date.parse(createdAt||new Date(now).toISOString()))/(86400000*365*6)))||0;
 return {...forms[hash%forms.length],hash,age,turn:((hash>>>8)%11-5)*.007,offset:((hash>>>12)%9-4)*.009};
}
