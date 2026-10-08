// Prototype identities. Stable IDs and addresses are shared by the scene and server.
export const people = ['MIKA','DAVID','YUKI','SOFIA','JUNE','TOM','MAYA','ALI LIN','NOAH','REN','LEO','MIN','EVA','KAI','AN'].map((name,i)=>({
 id:i===7?'ali-lin':name.toLowerCase().replaceAll(' ','-'),name,mailboxId:String(i+1),
 address:['66-1','66-2','66-3','68-1','68-2','68-3','69-1','69-2','69-3','70-1','70-2','70-3','71-1','71-2','71-3'][i],
 shortRole:['PHOTOGRAPHER','DESIGNER','ILLUSTRATOR','FILMMAKER','WRITER','DESIGNER','PHOTOGRAPHER','DESIGN ENGINEER','CREATIVE TECHNOLOGIST','WRITER','FILMMAKER','DESIGNER','ILLUSTRATOR','PHOTOGRAPHER','WRITER'][i],
 location:'',availableForWork:true
}));
export const personForMailbox=id=>people.find(p=>p.mailboxId===String(id));
