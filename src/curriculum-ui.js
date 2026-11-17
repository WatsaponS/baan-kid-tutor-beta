const ns='http://www.w3.org/2000/svg';
function node(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
function svgNode(tag,attrs={},text){const e=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,String(v));if(text!==undefined)e.textContent=text;return e;}
function svgRoot(label,w=600,h=300){const s=svgNode('svg',{viewBox:`0 0 ${w} ${h}`,role:'img','aria-label':label});return s;}
function shape(s,tag,attrs,text){const e=svgNode(tag,attrs,text);s.append(e);return e;}
function line(s,x1,y1,x2,y2,extra={}){return shape(s,'line',{x1,y1,x2,y2,stroke:'#59486b','stroke-width':2,...extra});}
function label(s,x,y,text,extra={}){return shape(s,'text',{x,y,'font-size':14,fill:'#372c42',...extra},text);}
export function renderCurriculumTask(p,box,input,onChange){
 input.type='text';input.closest('.answer-input').classList.remove('hidden');
 if(!p.curriculumSkill)return;
 box.replaceChildren();box.classList.remove('hidden');
 const format=document.getElementById('answerFormat');
 if(p.answerKind==='number')format.textContent='พิมพ์เฉพาะจำนวน หน่วยแสดงไว้ด้านข้าง';
 if(p.answerKind==='sequence'){input.placeholder='เช่น 1/4; 1/2; 3/4';format.textContent='คั่นแต่ละจำนวนด้วย ; เช่น 1/4; 1/2; 3/4';}
 if(p.diagram){const figure=renderDiagram(p.diagram,p.title);if(figure)box.append(figure);}
 if(p.answerKind==='choice'){
  input.type='hidden';input.closest('.answer-input').classList.add('hidden');format.textContent='เลือกคำตอบ แล้วกดตรวจคำตอบ';
  const group=node('div',undefined,'answer-choices');group.setAttribute('role','group');group.setAttribute('aria-label','เลือกคำตอบ');
  for(const c of p.choices){const b=node('button',c.label,'choice-btn');b.type='button';b.dataset.value=c.value;b.setAttribute('aria-pressed','false');b.onclick=()=>{input.value=c.value;for(const other of group.children)other.setAttribute('aria-pressed',String(other===b));onChange();};group.append(b);}box.append(group);
 }
 if(['vector','construction'].includes(p.answerKind)){
  input.type='hidden';input.closest('.answer-input').classList.add('hidden');format.textContent='กำหนดจุดหรือกรอกค่าด้านบน แล้วกดตรวจคำตอบ';
  if(p.answerKind==='vector')renderChartActivity(p,box,input,onChange);else renderConstruction(p,box,input,onChange);
 }
 if(p.answerKind==='drawing'){
  input.type='hidden';input.closest('.answer-input').classList.add('hidden');format.textContent='งานสร้างรูป · ต้องตรวจวิธีทำ ไม่ให้คะแนนอัตโนมัติ';
  const task=node('div',undefined,'manual-rubric');task.append(node('strong','เขียนบนกระดาน แล้วตรวจเงื่อนไขเหล่านี้'));
  for(const item of p.rubric){const row=node('label');const check=node('input');check.type='checkbox';row.append(check,node('span',item));task.append(row);}task.append(node('p','เครื่องหมายถูกเป็นรายการตรวจด้วยตนเอง ผู้ปกครองหรือครูควรตรวจความยาว มุม และขั้นตอนอีกครั้ง'));box.append(task);
 }
 if(p.diagram&&p.answerKind!=='construction'&&p.diagram.type!=='chart')box.append(node('p','ภาพประกอบอาจไม่ตามมาตราส่วน ให้ใช้ค่าที่ระบุในโจทย์','figure-note'));
}
export function renderDiagram(v,title){
 if(v.type==='chart')return v.build?null:chart(v,v.series,title);
 const s=svgRoot(title);
 if(v.type==='lines'){
  if(v.mode==='perpendicular'){line(s,80,150,500,150);line(s,290,30,290,260);shape(s,'path',{d:'M290 130H310V150',fill:'none',stroke:'#796191','stroke-width':2});label(s,320,135,'90°');}
  else {line(s,60,80,530,80);line(s,60,220,530,220);label(s,460,70,'∥');label(s,460,210,'∥');if(v.mode==='distance'){line(s,210,80,210,220);shape(s,'path',{d:'M210 100H230V80',fill:'none',stroke:'#796191'});label(s,230,155,v.distance+' ซม.');line(s,340,80,410,220,{'stroke-dasharray':'5 4',stroke:'#ac9270'});label(s,420,155,'เส้นเฉียง');}}
 }else if(v.type==='angles'){
  const theta=v.angle*Math.PI/180,ax=250,ay=70,by=220,bx=ax+(by-ay)/Math.tan(theta),r=32;
  line(s,40,ay,560,ay);line(s,40,by,560,by);line(s,ax-55*Math.cos(theta),ay-55*Math.sin(theta),bx+55*Math.cos(theta),by+55*Math.sin(theta));label(s,500,ay-8,'∥');label(s,500,by-8,'∥');
  const arc=(cx,cy,start,end,text)=>{const x1=cx+r*Math.cos(start),y1=cy+r*Math.sin(start),x2=cx+r*Math.cos(end),y2=cy+r*Math.sin(end);shape(s,'path',{d:`M${x1} ${y1} A${r} ${r} 0 0 1 ${x2} ${y2}`,fill:'none',stroke:'#c28c56','stroke-width':2});const middle=(start+end)/2;label(s,cx+54*Math.cos(middle),cy+54*Math.sin(middle),text);};
  arc(ax,ay,0,theta,v.angle+'°');if(v.mode==='alternate')arc(bx,by,Math.PI,Math.PI+theta,'x');else arc(bx,by,Math.PI+theta,2*Math.PI,'x');
 }else if(v.type==='polygon'){
  const b=v.base,h=v.height,offset=Math.sqrt((v.shape==='rhombus'?b:v.side)**2-h*h),scale=Math.min(380/(b+offset),160/h),x=70,y=220;
  const points=[[x,y],[x+b*scale,y],[x+(b+offset)*scale,y-h*scale],[x+offset*scale,y-h*scale]];
  shape(s,'polygon',{points:points.map(p=>p.join(',')).join(' '),fill:'#ece6f3',stroke:'#634f77','stroke-width':2});line(s,x+offset*scale,y,x+offset*scale,y-h*scale,{'stroke-dasharray':'4 4'});shape(s,'path',{d:`M${x+offset*scale} ${y-12}h12v12`,fill:'none',stroke:'#796191'});label(s,x+b*scale/2,y+25,v.base+' ซม. (ฐาน)');label(s,x+offset*scale+10,y-h*scale/2,'สูง '+v.height+' ซม.');if(v.shape==='parallelogram')label(s,x+(b+offset/2)*scale+10,y-h*scale/2,'ด้าน '+v.side+' ซม.');
 }else if(v.type==='rectangle'){
  const k=Math.min(350/v.a,180/v.b),x=100,y=230;shape(s,'rect',{x,y:y-v.b*k,width:v.a*k,height:v.b*k,fill:'#ece6f3',stroke:'#634f77','stroke-width':2});label(s,x+v.a*k/2,y+25,v.a+' ซม.');label(s,15,y-v.b*k/2,v.b+' ซม.');
 }else if(v.type==='trapezoid'){
  const k=Math.min(360/v.base,170/v.height),x=100,y=240,W=v.base*k,H=v.height*k,T=v.top*k,left=x+(W-T)/2;
  shape(s,'polygon',{points:[[x,y],[x+W,y],[left+T,y-H],[left,y-H]].map(p=>p.join(',')).join(' '),fill:'#ece6f3',stroke:'#634f77','stroke-width':2});line(s,left,y,left,y-H,{'stroke-dasharray':'4 4'});label(s,x+W/2,y+24,v.base+' ซม.');label(s,left+T/2,y-H-12,v.top+' ซม.');label(s,left+8,y-H/2,'สูง '+v.height+' ซม.');
 }else if(v.type==='composite'){
  const k=Math.min(340/v.width,180/v.height),x=90,y=240,W=v.width*k,H=v.height*k,CW=v.cutW*k,CH=v.cutH*k;
  shape(s,'polygon',{points:[[x,y],[x+W,y],[x+W,y-H+CH],[x+W-CW,y-H+CH],[x+W-CW,y-H],[x,y-H]].map(p=>p.join(',')).join(' '),fill:'#ece6f3',stroke:'#634f77','stroke-width':2});shape(s,'rect',{x:x+W-CW,y:y-H,width:CW,height:CH,fill:'#fff5e9',stroke:'#c89a69','stroke-dasharray':'5 4'});label(s,x+W/2,y+25,v.width+' ซม.');label(s,10,y-H/2,v.height+' ซม.');label(s,x+W-CW/2,y-H-10,v.cutW+' ซม.');label(s,x+W+8,y-H+CH/2,v.cutH+' ซม.');
 }else if(v.type==='cuboid'){
  shape(s,'path',{d:'M130 110L200 50H440V200L370 260H130ZM130 110H370V260M370 110L440 50',fill:'#ece6f3',stroke:'#634f77','stroke-width':2});line(s,200,50,200,200,{'stroke-dasharray':'5 4'});line(s,200,200,130,260,{'stroke-dasharray':'5 4'});line(s,200,200,440,200,{'stroke-dasharray':'5 4'});label(s,235,285,v.a+' ซม.');label(s,40,190,v.c+' ซม.');label(s,430,250,v.b+' ซม.');
 }else if(v.type==='prism'){
  const n=v.sides,front=Array.from({length:n},(_,i)=>[210+80*Math.cos(2*Math.PI*i/n-Math.PI/2),180+80*Math.sin(2*Math.PI*i/n-Math.PI/2)]),back=front.map(([x,y])=>[x+150,y-60]);
  shape(s,'polygon',{points:back.map(p=>p.join(',')).join(' '),fill:'#f2edf6',stroke:'#8d77a4','stroke-dasharray':'4 4'});for(let i=0;i<n;i++)line(s,...front[i],...back[i]);shape(s,'polygon',{points:front.map(p=>p.join(',')).join(' '),fill:'#dfd2ec',stroke:'#634f77','stroke-width':2});label(s,170,290,'ฐาน '+n+' เหลี่ยม');
 }else return null;
 return s;
}
function chart(v,series,title){
 const W=600,H=340,left=65,right=30,top=30,bottom=65,gw=W-left-right,gh=H-top-bottom,base=v.base||0,max=v.max||60,n=v.labels.length;
 const s=svgRoot(title+': '+v.labels.map((label,i)=>label+' '+series.map(row=>row[i]).join('/')).join(', '),W,H);
 const y=value=>H-bottom-(value-base)/(max-base)*gh,x=i=>left+(i+.5)*gw/n;
 for(let value=base;value<=max;value+=v.step){line(s,left,y(value),W-right,y(value),{stroke:'#ded6e7','stroke-width':1});label(s,left-10,y(value)+5,value,{'text-anchor':'end'});}
 line(s,left,top,left,H-bottom);line(s,left,H-bottom,W-right,H-bottom);label(s,10,20,v.unit||'จำนวน');
 const colors=['#81679b','#d39b69'];
 if(base){label(s,left-12,H-bottom+22,'0',{'text-anchor':'end'});shape(s,'path',{d:`M${left-6} ${H-bottom-5}l12 -5l-12 -5l12 -5`,fill:'none',stroke:'#59486b','stroke-width':2});label(s,left+12,H-bottom+40,'ย่นระยะ 0–'+base);}
 v.labels.forEach((text,i)=>label(s,x(i),H-bottom+24,text,{'text-anchor':'middle','font-size':12}));
 series.forEach((row,j)=>{
  if(v.chart==='line'){const pts=row.map((value,i)=>[x(i),y(value)]);shape(s,'polyline',{points:pts.map(p=>p.join(',')).join(' '),fill:'none',stroke:colors[j],'stroke-width':3});pts.forEach(([cx,cy])=>shape(s,'circle',{cx,cy,r:5,fill:colors[j]}));}
  else {const bw=Math.min(45,gw/n/(series.length+1));row.forEach((value,i)=>shape(s,'rect',{x:x(i)+(j-series.length/2)*bw,y:y(value),width:bw-3,height:Math.max(0,y(base)-y(value)),fill:colors[j]}));}
  label(s,150+j*180,18,(v.names?.[j]||'ชุด '+(j+1)),{fill:colors[j]});
 });
 return s;
}
function renderChartActivity(p,box,input,onChange){
 const v=p.diagram,table=node('table',undefined,'data-table'),head=node('tr');head.append(node('th','วัน'));v.labels.forEach(l=>head.append(node('th',l)));table.append(head);const row=node('tr');row.append(node('th','เล่ม'));p.table.rows[0].forEach(x=>row.append(node('td',x)));table.append(row);box.append(table);
 const panel=node('div',undefined,'graph-builder'),frame=node('div'),fields=node('div',undefined,'graph-fields');let values=Array(v.labels.length).fill(null);
 const update=()=>{input.value=JSON.stringify(values.every(v=>v!==null)?values:[]);frame.replaceChildren(chart({...v,base:0},[values.map(x=>x??0)],'กราฟที่กำลังสร้าง'));onChange();};
 const inputs=v.labels.map((l,i)=>{const label=node('label',l);const field=node('input');field.type='number';field.min='0';field.max=String(v.max);field.step='1';field.setAttribute('aria-label','ค่ากราฟ '+l);field.oninput=()=>{values[i]=field.value===''?null:Number(field.value);update();};label.append(field);fields.append(label);return field;});
 frame.append(chart({...v,base:0},[values.map(()=>0)],'พื้นที่สร้างกราฟ'));frame.onclick=e=>{const svg=frame.querySelector('svg'),r=svg.getBoundingClientRect(),x=(e.clientX-r.left)*600/r.width,y=(e.clientY-r.top)*340/r.height,index=Math.floor((x-65)/(505/v.labels.length));if(index<0||index>=v.labels.length||y<30||y>275)return;const value=Math.max(0,Math.min(v.max,Math.round((275-y)/245*v.max)));values[index]=value;inputs[index].value=String(value);update();};panel.append(frame,fields);box.append(panel,node('p','แตะระดับในกราฟ หรือกรอกค่าทีละวันเพื่อปรับตำแหน่งให้ตรงข้อมูล','figure-note'));
}
function renderConstruction(p,box,input,onChange){
 const v=p.diagram,frame=node('div',undefined,'construction-board'),fields=node('div',undefined,'graph-fields'),selected=[];
 const count=v.mode==='quad'?4:2,labels=v.mode==='quad'?['C: ช่องแนวนอน','C: ช่องแนวตั้ง','D: ช่องแนวนอน','D: ช่องแนวตั้ง']:['Q: ช่องแนวนอน','Q: ช่องแนวตั้ง'];
 const inputs=labels.map((text,i)=>{const l=node('label',text),f=node('input');f.type='number';f.min='0';f.max=String(v.grid);f.step='1';f.setAttribute('aria-label',text);f.oninput=()=>{selected[i]=f.value===''?undefined:Number(f.value);render();input.value=JSON.stringify(Array.from({length:count},(_,j)=>selected[j]??null));onChange();};l.append(f);fields.append(l);return f;});
 function render(){
  const s=svgRoot('ตารางสร้างรูป 1 ช่อง = 1 หน่วย',440,440),pos=([x,y])=>[40+x*36,400-y*36];s.setAttribute('role','group');
  for(let i=0;i<=v.grid;i++){line(s,40+i*36,40,40+i*36,400,{stroke:'#e0d9e8','stroke-width':1});line(s,40,400-i*36,400,400-i*36,{stroke:'#e0d9e8','stroke-width':1});label(s,40+i*36,422,i,{'text-anchor':'middle','font-size':11});label(s,25,404-i*36,i,{'font-size':11});}
  const point=(q,text,color='#5c4a6e')=>{const [cx,cy]=pos(q);shape(s,'circle',{cx,cy,r:5,fill:color});label(s,cx+7,cy-8,text);};
  line(s,...pos(v.a),...pos(v.b));point(v.a,'A');point(v.b,'B');if(v.p)point(v.p,'P');
  if(v.mode==='quad'&&selected.filter(Number.isFinite).length===4){const points=[v.a,v.b,selected.slice(0,2),selected.slice(2,4)];shape(s,'polygon',{points:points.map(q=>pos(q).join(',')).join(' '),fill:'#d8c9e866',stroke:'#c28c56','stroke-width':2});point(points[2],'C');point(points[3],'D');}
  else if(v.p&&Array.from({length:2},(_,i)=>selected[i]).every(Number.isFinite)){line(s,...pos(v.p),...pos(selected),{stroke:'#c28c56'});point(selected,'Q','#c28c56');}
  for(let x=0;x<=v.grid;x++)for(let y=0;y<=v.grid;y++){
   const [cx,cy]=pos([x,y]);const hit=shape(s,'circle',{cx,cy,r:11,fill:'transparent',role:'button',tabindex:0,'aria-label':`เลือกจุด ${x}, ${y}`,'data-x':x,'data-y':y});
   const choose=()=>{const start=v.mode==='quad'&&selected.length===2?2:0;if(start===0)selected.length=0;selected[start]=x;selected[start+1]=y;inputs.forEach((f,i)=>f.value=selected[i]===undefined?'':String(selected[i]));render();input.value=JSON.stringify(selected.length===count?selected:[]);onChange();};hit.onclick=choose;hit.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}};
  }
  frame.replaceChildren(s);
 }
 render();box.append(frame,fields,node('p',v.mode==='quad'?'แตะจุด C แล้ว D หรือกรอกพิกัดทีละจุด':'แตะจุด Q หรือกรอกพิกัด เลือกคำตอบที่ตรงเงื่อนไขได้หลายตำแหน่ง','figure-note'));
}
