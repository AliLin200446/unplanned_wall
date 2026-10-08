// Original prototype studies, drawn as printed matter; no claimed client work.
export function artifactCanvas(visual='light',title='',mediaType='IMAGE'){
 const canvas=document.createElement('canvas');canvas.width=960;canvas.height=640;const c=canvas.getContext('2d');
 c.fillStyle='#eee9dc';c.fillRect(0,0,960,640);
 if(visual==='light'){
  c.save();c.beginPath();c.rect(34,30,892,533);c.clip();
  const g=c.createLinearGradient(0,20,930,580);g.addColorStop(0,'#b1aaa0');g.addColorStop(.47,'#ddd4bd');g.addColorStop(1,'#676d69');c.fillStyle=g;c.fillRect(0,0,960,580);
  c.fillStyle='#515952';c.fillRect(95,0,170,580);c.fillStyle='#283b35';c.fillRect(114,58,130,510);
  c.fillStyle='#c6c0ae';c.beginPath();c.moveTo(280,0);c.lineTo(890,0);c.lineTo(447,580);c.lineTo(279,580);c.fill();
  c.fillStyle='#e6dabb';c.beginPath();c.moveTo(334,0);c.lineTo(714,0);c.lineTo(272,580);c.lineTo(190,580);c.fill();
  c.strokeStyle='#595e52';c.lineWidth=7;for(let i=0;i<5;i++){c.beginPath();c.moveTo(300+i*115,0);c.lineTo(90+i*115,580);c.stroke();}
  c.fillStyle='#a09f8e';c.fillRect(0,480,960,9);c.fillStyle='#6a6f62';c.fillRect(0,493,960,80);
  let n=761;for(let i=0;i<16000;i++){n=(n*1664525+1013904223)>>>0;const x=n%960;n=(n*1664525+1013904223)>>>0;const y=n%580;c.fillStyle=i%2?'rgba(255,255,240,.045)':'rgba(20,27,20,.055)';c.fillRect(x,y,1.5,1.5);}c.restore();
 }else if(visual==='interface'){
  c.fillStyle='#30392f';c.font='22px monospace';c.fillText('a place for a thought',65,86);c.fillRect(65,110,830,2);
  c.font='76px Georgia';c.fillText('Leave room.',65,225);c.font='24px Georgia';c.fillText('The unfinished is an invitation.',70,279);
  c.strokeStyle='#8e9480';c.strokeRect(66,339,510,162);c.font='18px monospace';c.fillText('Write something small…',91,379);c.fillStyle='#adb2a0';c.fillRect(607,339,286,162);c.fillStyle='#495443';c.font='18px monospace';c.fillText('return when ready',625,465);
 }else if(visual==='frames'){
  c.fillStyle='#282c29';c.fillRect(28,30,904,534);for(let y=0;y<2;y++)for(let x=0;x<4;x++){const a=52+x*222,b=66+y*245;c.fillStyle='#989b83';c.fillRect(a,b,190,184);c.fillStyle='#343e37';c.beginPath();c.arc(a+52+x*20,b+85,45+y*10,0,Math.PI*2);c.fill();c.strokeStyle='#d6d0b6';c.lineWidth=2;c.beginPath();c.moveTo(a,b+110-x*12);c.lineTo(a+190,b+50+x*16);c.stroke();c.fillStyle='#c8c6ad';c.font='13px monospace';c.fillText('0'+(y*4+x+1),a,b+207);}
 }else if(visual==='document'){
  c.fillStyle='#45473e';c.font='44px Georgia';c.fillText('Loose observations',68,123);c.font='22px monospace';for(let i=0;i<6;i++)c.fillText(['01  Watch where people pause.','02  Keep the small traces.','03  Leave room for another hand.','','    An unfinished notebook.','    September, 2026'][i],68,211+i*47);
  c.strokeStyle='#6e716b';c.lineWidth=5;c.strokeRect(40,33,67,10);c.strokeStyle='#bbbdb4';c.lineWidth=2;c.strokeRect(40,31,67,8);
 }else {c.fillStyle='#47473d';c.font='38px Georgia';c.fillText(title||'An open notebook',60,230);c.font='20px monospace';c.fillText('a place to begin looking →',60,310);}
 c.fillStyle='#55584c';c.font='17px monospace';c.fillText(title||'study / 01',36,608);c.font='14px monospace';c.fillText('PROTOTYPE STUDY',733,608);return canvas;
}
