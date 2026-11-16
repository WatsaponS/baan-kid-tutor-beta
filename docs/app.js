import {makeProblem,gradeAnswer,TOPICS,FRACTION_SKILLS} from './math.js';
const $=id=>document.getElementById(id);
const staticDemo=document.documentElement.dataset.host==='github-pages';
const symbols={addition:'+',subtraction:'−',multiply:'×',divide:'÷',mixed:'( )',fraction:'½',decimal:'.0',measurement:'↔',geometry:'▱',time:'◷',data:'▥',word:'≋'};
const menu=document.querySelector('.lesson-menu');menu.querySelectorAll('[data-topic]').forEach(b=>b.remove());
for(const [key,label]of Object.entries(TOPICS)){const button=document.createElement('button');button.className='topic';button.dataset.topic=key;button.title=label;button.setAttribute('aria-label',label);const icon=document.createElement('span');icon.textContent=symbols[key];button.append(icon,document.createTextNode(' '+label));menu.append(button);}
const topicPicker=document.createElement('label');topicPicker.className='topic-picker';topicPicker.textContent='เรื่อง ';const lessonSelect=document.createElement('select');lessonSelect.id='lessonSelect';lessonSelect.setAttribute('aria-label','เลือกเรื่องที่อยากฝึก');for(const [key,label]of Object.entries(TOPICS))lessonSelect.append(new Option(label,key));topicPicker.append(lessonSelect);document.querySelector('.exercise-meta').prepend(topicPicker);
document.querySelector('.beta').textContent='1.0';document.querySelector('.footer-right').textContent='MATH PRACTICE / 1.0';document.querySelector('.setting-notice').firstChild.textContent='ชุดฝึก 1.0 · AI สำหรับผู้ใหญ่ทดลอง';
let paperPages=[[]],pageIndex=0;const recentTitles=new Set();
let fractionSkill='auto';const fractionPicker=document.createElement('label');fractionPicker.className='topic-picker hidden';fractionPicker.textContent='ฝึกเศษส่วน ';const fractionSelect=document.createElement('select');fractionSelect.id='fractionSkill';fractionSelect.setAttribute('aria-label','เลือกทักษะเศษส่วน');for(const [key,label]of Object.entries(FRACTION_SKILLS))fractionSelect.append(new Option(label,key));fractionPicker.append(fractionSelect);document.querySelector('.exercise-meta').after(fractionPicker);
let config={mode:'demo',hasKey:false},grade=4,topic='multiply',level=1,problem,number=0,hintIndex=0,solved=false,attempted=new Set(),revision=0,strokes=[],current=null,color='#344c40',tool='pen',penSeen=0,autoTimer,reviewAbort,reviewBusy=false,lastReview=0,aiChecks=0;
let history=[];try{const h=JSON.parse(localStorage.getItem('baankid-history')||'[]');if(Array.isArray(h))history=h.filter(x=>x&&typeof x.title==='string'&&typeof x.correct==='boolean'&&Number.isFinite(x.at)).slice(-300);}catch{}
let prefs={readAloud:false,adaptive:true,voiceQuality:'quality',microphoneMode:'tablet'};try{Object.assign(prefs,JSON.parse(localStorage.getItem('baankid-prefs')||'{}'));}catch{}
let adultConsent=false,toastTimer,voice=null,voiceConnecting=false,voiceGeneration=0,ttsEnabled=prefs.readAloud;
const canvas=$('board'),ctx=canvas.getContext('2d');
function addVoicePreferences(){
  const block=document.createElement('div');block.className='voice-preferences';
  const title=document.createElement('h3');title.textContent='ภาษาไทยและคุณภาพเสียง';block.append(title);
  for(const [id,label,options]of [['voiceQuality','โมเดลครูเสียง',[['quality','คุณภาพ · รุ่นเต็ม'],['economy','ประหยัด · Mini']]],['microphoneMode','ลักษณะไมโครโฟน',[['tablet','ไมค์แท็บเล็ต / ไมค์ในเครื่อง'],['headset','หูฟังที่มีไมค์ใกล้ปาก']]]]){
    const row=document.createElement('label');row.className='setting-row';row.htmlFor=id;const span=document.createElement('span');span.textContent=label;const select=document.createElement('select');select.id=id;for(const [value,text]of options)select.append(new Option(text,value));row.append(span,select);block.append(row);
  }
  const note=document.createElement('p');note.className='muted';note.textContent='โหมดคุณภาพใช้เครดิตเสียงมากกว่า Mini มีค่าถอดเสียงเพิ่ม จับจบประโยคเร็วขึ้น และเรียก GPT-6.1 ช่วยเฉพาะคำถามที่ต้องคิดละเอียด (คิดค่า API เพิ่มและอาจรอนานขึ้น)';block.append(note);
  const parent=document.querySelector('.settings-body');parent.insertBefore(block,parent.querySelector('.setting-row'));
  const heard=document.createElement('div');heard.id='heardSpeech';heard.className='heard-speech';heard.setAttribute('aria-live','polite');heard.textContent='ข้อความถอดเสียงไทยจะแสดงที่นี่ · อาจคลาดเคลื่อนจากเสียงจริง';document.querySelector('.audio-tools').append(heard);
}
addVoicePreferences();
function persist(){try{localStorage.setItem('baankid-history',JSON.stringify(history.slice(-300)));}catch{toast('พื้นที่เก็บข้อมูลเต็ม ประวัติรอบนี้จะอยู่จนกว่าจะปิดหน้า');}}
function toast(text){$('toast').textContent=text;$('toast').classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.add('hidden'),4500);}
function aiReady(){return config.mode==='adult-test'&&adultConsent;}
function spec(){return {grade:problem.grade,topic:problem.topic,level:problem.level,seed:problem.seed,fractionSkill:problem.fractionSkill};}
function say(text){if(!ttsEnabled||voice)return;if(!('speechSynthesis'in window)){toast('เบราว์เซอร์นี้ไม่มีเสียงอ่าน ใช้ข้อความได้ครับ');return;}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='th-TH';u.rate=.88;const v=speechSynthesis.getVoices().find(v=>v.lang.startsWith('th'));if(v)u.voice=v;u.onerror=()=>toast('เสียงอ่านไม่พร้อม ใช้คำใบ้บนหน้าจอได้ครับ');speechSynthesis.speak(u);}
function coach(text,speak=true){$('coachMessage').textContent=text;if(speak)say(text);}
function showResult(text,status=''){const box=$('result');box.className='result '+status;box.textContent=text;}
function refreshMode(){
  const live=aiReady();$('modePill').replaceChildren();const dot=document.createElement('i');$('modePill').append(dot,live?' AI · ผู้ใหญ่ทดลอง':' โหมดสาธิต');$('coachMode').textContent=live?'AI TEST':'DEMO';
  $('aiNote').textContent=live?'AI อาจอ่านผิด โปรดยืนยันสิ่งที่อ่านก่อนบันทึกผล':'สาธิตคำใบ้สำเร็จรูป · ยังไม่อ่านลายมือ';
  $('voiceCaption').textContent=live?'เปิดไมค์เพื่อคุยกับ AI · มีค่าใช้งาน API':'โหมดสาธิต · ลองฟังคำใบ้จากเสียงของเครื่อง';
  $('autoCheck').disabled=!live;if(!live)$('autoCheck').checked=false;
  $('connectionStatus').textContent=config.mode==='adult-test'?'เซิร์ฟเวอร์พร้อม · ยืนยันโหมดผู้ใหญ่ทดลองเพื่อเปิด AI':config.hasKey?'พบ API key แล้ว · ยังไม่ได้เปิด AI_ADULT_TEST_ENABLED':'ยังไม่มี API key · ใช้โหมดสาธิตได้ครบทั้งโจทย์และกระดาน';
}
async function loadConfig(){if(staticDemo){config={mode:'demo',hasKey:false};refreshMode();$('connectionStatus').textContent='GitHub Pages · โหมดสาธิต ไม่ส่งภาพหรือเสียงไป OpenAI การเปิด AI จริงต้องมี backend แยก';$('adultConsent').disabled=true;return;}try{const r=await fetch('/api/config');if(!r.ok)throw Error();config=await r.json();refreshMode();}catch{toast('ตรวจการเชื่อมต่อไม่ได้ ใช้โหมดสาธิตไปก่อนได้ครับ');}}
function todaySolved(){const day=new Date().toDateString();return new Set(history.filter(h=>h.correct&&new Date(h.at).toDateString()===day).map(h=>h.id)).size;}
function updateProgress(){const count=todaySolved();$('sessionLabel').textContent=`วันนี้สำเร็จแล้ว ${count} ข้อ`;$('progressDots').querySelectorAll('i').forEach((d,i)=>d.classList.toggle('done',i<Math.min(5,count)));}
function record(correct,source){const key=String($('answer').value).trim()+'|'+correct+'|'+source;if(attempted.has(key)||solved)return;attempted.add(key);history.push({id:problem.id,title:problem.title,grade,topic,level,correct,helped:hintIndex>0,source,at:Date.now()});history=history.slice(-300);persist();if(correct)solved=true;updateProgress();}
function stopReply(){cancelTutor();if(voice?.ready&&voice.dc.readyState==='open'){voice.nextPrompt=null;clearTimeout(voice.replyTimer);if((voice.responding||voice.pendingResponse)&&!voice.cancelRequested){voice.cancelRequested=true;sendEvent({type:'response.cancel'});}sendEvent({type:'output_audio_buffer.clear'});}$('remoteAudio').muted=true;}
function changed(){revision++;clearTimeout(autoTimer);reviewAbort?.abort();stopReply();$('boardState').textContent='กำลังคิดและเขียน…';if(aiReady()&&$('autoCheck').checked)autoTimer=setTimeout(()=>reviewBoard(true),1800);}
function invalidate(){revision++;clearTimeout(autoTimer);reviewAbort?.abort();stopReply();}
function newProblem(){
  invalidate();if(prefs.adaptive&&solved&&level<3){const recent=history.filter(h=>h.topic===topic&&h.grade===grade).slice(-3);if(recent.length===3&&recent.every(h=>h.correct&&!h.helped)&&new Set(recent.map(h=>h.id)).size===3){level++;$('level').value=String(level);toast('ทำได้ด้วยตัวเอง 3 ข้อติดแล้ว ลองระดับถัดไปกัน!');}}
  for(let tries=0;tries<20;tries++){problem=makeProblem(grade,topic,level,crypto.getRandomValues(new Uint32Array(1))[0],fractionSkill);if(!recentTitles.has(problem.title))break;}recentTitles.add(problem.title);if(recentTitles.size>200)recentTitles.delete(recentTitles.values().next().value);
  fractionPicker.classList.toggle('hidden',topic!=='fraction');fractionSelect.value=fractionSkill;
  number++;hintIndex=0;solved=false;attempted.clear();paperPages=[[]];pageIndex=0;strokes=paperPages[0];current=null;draw();updatePaper();$('answer').value='';$('result').className='result hidden';$('transcription').classList.add('hidden');$('question').textContent=problem.title;$('question').classList.toggle('word-question',['word','measurement','geometry','time','data'].includes(topic));$('questionNumber').textContent=`ข้อที่ ${String(number).padStart(2,'0')}`;$('topicBadge').textContent=symbols[topic]+' '+TOPICS[topic];$('answerUnit').textContent=problem.unit;$('answer').placeholder=topic==='fraction'?'เช่น 3/4':'เช่น 144';$('answer').inputMode=topic==='fraction'?'text':'decimal';$('boardState').textContent='พร้อมให้ลองคิด';renderProblemVisual();
  document.querySelectorAll('[data-topic]').forEach(b=>b.classList.toggle('active',b.dataset.topic===topic));
  lessonSelect.value=topic;
  renderMixedQuestion();
  coach('เริ่มจากสิ่งที่รู้ก่อนนะ ลองเขียนวิธีคิดบนกระดาน หรือกดขอคำใบ้ได้เลย',false);updateTip();
  if(voice?.dc.readyState==='open')sendEvent({type:'conversation.item.create',item:{type:'message',role:'user',content:[{type:'input_text',text:'เปลี่ยนโจทย์แล้ว ภาพและคำตอบเก่าห้ามใช้กับข้อนี้ โจทย์ใหม่: '+problem.title}]}});
}
function updateTip(){const titles={addition:'บวกตามค่าประจำหลัก',subtraction:'ตรวจการลบด้วยการบวก',multiply:'แยกจำนวน ช่วยให้คิดง่ายขึ้น',divide:'การคูณช่วยตรวจการหาร',mixed:'ลำดับการคำนวณสำคัญ',fraction:'ทุกส่วนต้องมีขนาดเท่ากัน',decimal:'จัดจุดให้ตรงกัน',measurement:'เปลี่ยนหน่วยให้เหมือนกัน',geometry:'แยกรอบรูป พื้นที่ และปริมาตร',time:'หนึ่งชั่วโมงมีหกสิบนาที',data:'อ่านค่าก่อนเลือกวิธีคำนวณ',word:'วาดกลุ่ม ช่วยให้เห็นโจทย์'};$('tipTitle').textContent=titles[topic];$('tipText').textContent=problem.hints[1];$('visual').replaceChildren();if(problem.visual?.type==='fraction'){const v=problem.visual;for(let i=0;i<v.d;i++){const el=document.createElement('i');el.className=i<v.a?'a':i<v.a+v.b?'b':'';el.title=`ส่วนที่ ${i+1} จาก ${v.d}`;$('visual').append(el);}}}
function renderMixedQuestion(){
  const question=$('question');question.classList.toggle('mixed-question',Boolean(problem.mixedTerms));question.setAttribute('aria-label',problem.title);
  $('answerFormat').textContent=topic==='fraction'?'พิมพ์จำนวนคละ เช่น 2 1/3 หรือเศษส่วน เช่น 7/3 ได้':'พิมพ์คำตอบเพื่อให้ระบบตรวจได้ทันที';
  if(!problem.mixedTerms)return;$('answer').placeholder='เช่น 2 1/3';question.replaceChildren();
  for(const [i,t]of problem.mixedTerms.entries()){
    if(i){const op=document.createElement('span');op.className='mixed-op';op.textContent=problem.mixedOperator;op.setAttribute('aria-hidden','true');question.append(op);}
    const number=document.createElement('span');number.className='mixed-number';number.setAttribute('aria-hidden','true');const whole=document.createElement('span');whole.textContent=t.whole;const f=document.createElement('span');f.className='stacked-fraction';const n=document.createElement('span'),d=document.createElement('span');n.textContent=t.n;d.textContent=t.d;f.append(n,d);number.append(whole,f);question.append(number);
  }
  const tail=document.createElement('span');tail.textContent='= ?';tail.setAttribute('aria-hidden','true');question.append(tail);
}
function renderProblemVisual(){
  const box=$('problemVisual');box.replaceChildren();const v=problem.visual;box.classList.toggle('hidden',!v||v.type==='fraction');if(!v||v.type==='fraction')return;
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 360 160');svg.setAttribute('role','img');svg.setAttribute('aria-label',v.type==='bars'?'แผนภูมิหนังสือของสามห้อง':'ภาพประกอบ ขนาดตามป้าย ไม่วัดจากภาพ');
  const shape=(name,attrs,text)=>{const el=document.createElementNS(svg.namespaceURI,name);for(const [k,value]of Object.entries(attrs))el.setAttribute(k,String(value));if(text!==undefined)el.textContent=text;svg.append(el);};
  if(v.type==='bars'){v.values.forEach((value,i)=>{const y=15+i*42;shape('text',{x:5,y:y+20},['ก','ข','ค'][i]);shape('rect',{x:35,y,width:value*2.7,height:26,rx:4,fill:'#dce8c9'});shape('text',{x:45+value*2.7,y:y+20},value+' เล่ม');});}
  else {shape('rect',{x:60,y:45,width:190,height:85,fill:'#edf3e6',stroke:'#66805a','stroke-width':2});shape('text',{x:120,y:150},v.a+' ซม.');shape('text',{x:5,y:92},(v.type==='cuboid'?v.c:v.b)+' ซม.');if(v.type==='cuboid'){shape('path',{d:'M60 45L100 15H290V100L250 130M250 45L290 15',fill:'none',stroke:'#66805a','stroke-width':2});shape('text',{x:295,y:125},v.b+' ซม.');}shape('text',{x:130,y:30},'ภาพประกอบ');}
  box.append(svg);
}
function updatePaper(){$('paperPage').textContent=`หน้า ${pageIndex+1} / ${paperPages.length}`;$('prevPage').disabled=pageIndex===0;$('nextPage').disabled=pageIndex===paperPages.length-1;$('addPage').disabled=paperPages.length>=12;}
function turnPage(index){if(current||index<0||index>=paperPages.length)return;paperPages[pageIndex]=strokes;pageIndex=index;strokes=paperPages[pageIndex];invalidate();draw();updatePaper();$('transcription').classList.add('hidden');$('result').classList.add('hidden');$('boardState').textContent='AI ดูเฉพาะหน้าที่เปิดอยู่';}
function hint(){const text=problem.hints[Math.min(hintIndex,problem.hints.length-1)];hintIndex++;coach(text);showResult('☼ '+text);if(voice?.dc.readyState==='open')voiceAsk('ช่วยอธิบายคำใบ้นี้สั้น ๆ โดยยังไม่เฉลย: '+text);}
function drawStroke(c,s){if(!s.points.length)return;c.save();c.globalCompositeOperation=s.tool==='eraser'?'destination-out':'source-over';c.lineWidth=s.width;c.strokeStyle=s.color;c.fillStyle=s.color;c.lineCap='round';c.lineJoin='round';if(s.points.length===1){c.beginPath();c.arc(s.points[0].x,s.points[0].y,s.width/2,0,Math.PI*2);c.fill();}else{c.beginPath();c.moveTo(s.points[0].x,s.points[0].y);for(const p of s.points.slice(1))c.lineTo(p.x,p.y);c.stroke();}c.restore();}
function draw(){ctx.clearRect(0,0,canvas.width,canvas.height);for(const s of strokes)drawStroke(ctx,s);if(current)drawStroke(ctx,current);$('boardPlaceholder').classList.toggle('hidden',strokes.length>0||Boolean(current));$('undo').disabled=strokes.length===0;}
function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height};}
canvas.addEventListener('pointerdown',e=>{if(current||tool==='pan'||e.button>0||(e.pointerType==='touch'&&Date.now()-penSeen<2500))return;if(e.pointerType==='pen')penSeen=Date.now();e.preventDefault();canvas.setPointerCapture(e.pointerId);current={id:e.pointerId,tool,color,width:tool==='eraser'?36:Number($('penWidth').value)*1.5,points:[point(e)]};changed();draw();});
canvas.addEventListener('pointermove',e=>{if(!current||current.id!==e.pointerId)return;e.preventDefault();for(const v of e.getCoalescedEvents?.()||[e])current.points.push(point(v));if(current.points.length>10000){strokes.push(current);current={...current,points:[point(e)]};}draw();});
function endStroke(e){if(!current||current.id!==e.pointerId)return;strokes.push(current);current=null;draw();changed();$('boardState').textContent=aiReady()&&$('autoCheck').checked?'รอตรวจเมื่อเขียนจบ…':'เขียนต่อได้ หรือกดตรวจคำตอบ';}
canvas.addEventListener('pointerup',endStroke);canvas.addEventListener('pointercancel',endStroke);
function boardImage(){
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;let left=canvas.width,top=canvas.height,right=0,bottom=0;
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(pixels[(y*canvas.width+x)*4+3]){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
  if(left>right){left=0;top=0;right=canvas.width-1;bottom=canvas.height-1;}
  left=Math.max(0,left-45);top=Math.max(0,top-45);right=Math.min(canvas.width,right+46);bottom=Math.min(canvas.height,bottom+46);
  const w=right-left,h=bottom-top,scale=Math.min(1,900/w,1050/h),c=document.createElement('canvas');c.width=Math.max(1,Math.round(w*scale));c.height=Math.max(1,Math.round(h*scale));const g=c.getContext('2d');g.fillStyle='white';g.fillRect(0,0,c.width,c.height);g.drawImage(canvas,left,top,w,h,0,0,c.width,c.height);return c.toDataURL('image/png');
}
function boardHasInk(){const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;for(let i=3;i<pixels.length;i+=4)if(pixels[i])return true;return false;}
function typedCheck(){const input=$('answer').value.trim();const verdict=gradeAnswer(problem,input);if(verdict==='unclear'){showResult('ลองพิมพ์เฉพาะตัวเลข หรือเศษส่วน เช่น 3/4 เพื่อให้ตรวจได้ครับ');return;}if(verdict==='correct'){record(true,'typed');showResult('✓ คำตอบถูกแล้ว! '+problem.solution,'correct');coach('ทำได้แล้ว! ลองอธิบายดูนะว่าเราเลือกใช้วิธีนี้เพราะอะไร');}else{record(false,'typed');hintIndex++;showResult('ใกล้แล้ว ลองตรวจอีกครั้งนะ · '+problem.hints[0],'incorrect');coach(problem.hints[0]);}if(voice?.dc.readyState==='open')voiceAsk('ระบบตรวจคำตอบที่พิมพ์ได้ผล '+verdict+' ช่วยให้กำลังใจหรือให้คำใบ้สั้น ๆ ไม่เฉลยเพิ่ม');}
async function reviewBoard(auto=false,question=''){
  if(!aiReady()){if(!auto)showResult('โหมดสาธิตยังอ่านลายมือไม่ได้ครับ เขียนวิธีคิดบนกระดาน แล้วพิมพ์คำตอบในช่องด้านล่างเพื่อตรวจ');return;}
  if(current)return;
  if(!boardHasInk()){if(!auto)toast('เขียนบนกระดานก่อน แล้วครูคิดจะช่วยดูครับ');return;}
  if(reviewBusy){if(auto)autoTimer=setTimeout(()=>reviewBoard(true),2200);return;}
  if(auto&&Date.now()-lastReview<7000){autoTimer=setTimeout(()=>reviewBoard(true),7100-(Date.now()-lastReview));return;}
  if(aiChecks>=50){$('autoCheck').checked=false;toast('ครบ 50 ครั้งในหน้านี้แล้ว พักก่อนเพื่อควบคุมค่า API');return;}
  const rev=revision,id=problem.id;reviewAbort=new AbortController();reviewBusy=true;lastReview=Date.now();aiChecks++;$('checkBtn').disabled=true;$('boardState').textContent='ครูคิดกำลังดูกระดาน…';
  const timeout=setTimeout(()=>reviewAbort?.abort(),40000);
  try{
    const r=await fetch('/api/review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({problem:spec(),image:boardImage(),revision:rev,adultConsent,question:`ภาพเฉพาะหน้าที่ ${pageIndex+1} จาก ${paperPages.length} หน้า อย่าอ้างว่าเห็นหน้าอื่น ${question}`}),signal:reviewAbort.signal});const data=await r.json();if(!r.ok)throw Error(data.error||'ตรวจไม่สำเร็จ');
    if(rev!==revision||id!==problem.id||current)return;
    hintIndex++;$('boardState').textContent='ตรวจภาพล่าสุดแล้ว · '+new Date().toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'});coach(data.feedback||'ลองเขียนขั้นถัดไปให้ดูหน่อยนะ',!auto);$('transcription').classList.remove('hidden');$('transcription').textContent='AI อ่านว่า: '+data.transcription;
    if(data.uncertain){showResult('ครูคิดยังอ่านบางจุดไม่ชัด ลองเขียนตัวเลขให้ห่างขึ้นหรือพิมพ์คำตอบยืนยันนะ');}
    else if(data.final_answer!==null&&data.verdict!=='unclear'){
      showResult(`AI อ่านคำตอบสุดท้ายว่า ${data.final_answer} · ตรงกับที่เขียนไหม?`);const btn=document.createElement('button');btn.className='secondary-btn';btn.textContent='ใช่ ตรวจคำตอบนี้';btn.onclick=()=>{if(rev!==revision||id!==problem.id){toast('กระดานเปลี่ยนแล้ว กรุณาตรวจใหม่');return;}$('answer').value=data.final_answer;typedCheck();};$('result').append(document.createElement('br'),btn);
    }else if(!auto)showResult(data.feedback||'เขียนวิธีคิดต่ออีกนิด แล้วลองตรวจใหม่ครับ');
  }catch(e){if(e.name!=='AbortError'&&rev===revision){$('boardState').textContent='ยังตรวจไม่ได้ ลองอีกครั้ง';if(auto){$('autoCheck').checked=false;toast('พักการตรวจอัตโนมัติ: '+e.message);}else showResult(e.message);}}
  finally{clearTimeout(timeout);reviewBusy=false;$('checkBtn').disabled=false;}
}
async function check(){clearTimeout(autoTimer);if($('answer').value.trim())typedCheck();else await reviewBoard();}
function sendEvent(event){if(voice?.dc.readyState==='open')voice.dc.send(JSON.stringify(event));}
function sendBoardContext(text='ภาพกระดานล่าสุด ใช้แทนภาพก่อนหน้า'){
  if(!voice||voice.dc.readyState!=='open')return false;
  const key=JSON.stringify([problem.id,revision,pageIndex,$('answer').value,Boolean(current)]);
  if(voice.boardKey===key){sendEvent({type:'conversation.item.create',item:{type:'message',role:'user',content:[{type:'input_text',text}]}});return true;}
  if(voice.boardItem){sendEvent({type:'conversation.item.delete',item_id:voice.boardItem});voice.boardItem=null;}
  const itemId='board_'+crypto.randomUUID().replaceAll('-','').slice(0,24);
  const content=[{type:'input_text',text:`${text}\nโจทย์: ${problem.title}\nภาพเฉพาะหน้า ${pageIndex+1} จาก ${paperPages.length} ห้ามอ้างว่าเห็นหน้าอื่น\nกระดานรุ่น ${revision} ${current?'กำลังเขียน ห้ามตัดสิน':'เขียนจบช่วงนี้แล้ว'}\nคำตอบที่พิมพ์: ${$('answer').value||'ยังไม่มี'}`}];
  if(boardHasInk()){const image=boardImage();if(image.length<55000)content.push({type:'input_image',image_url:image});else{content[0].text+='\nภาพใหญ่เกินช่องเสียง ยังไม่ส่งภาพ ห้ามอ้างว่าเห็นลายมือล่าสุด';toast('ภาพกระดานใหญ่ ใช้ปุ่มตรวจคำตอบเพื่ออ่านลายมือแทน');}}
  sendEvent({type:'conversation.item.create',item:{id:itemId,type:'message',role:'user',content}});voice.boardItem=itemId;voice.boardKey=key;return true;
}
function cancelTutor(){const job=voice?.tutorJob;if(!job)return;voice.tutorJob=null;job.controller.abort();sendEvent({type:'conversation.item.create',item:{type:'function_call_output',call_id:job.callId,output:JSON.stringify({error:'cancelled',instruction:'ผู้เรียนพูดต่อหรือกระดานเปลี่ยนแล้ว ห้ามใช้คำแนะนำเก่า'})}});}
async function consultTutor(call){
  const v=voice;if(!v||!call.call_id)return;
  const job={callId:call.call_id,controller:new AbortController(),revision,id:problem.id};v.tutorJob=job;
  $('voiceCaption').textContent='กำลังให้ GPT-6.1 ช่วยคิดวิธีอธิบาย…';voiceLog('math_coach start');
  const timer=setTimeout(()=>job.controller.abort(),30000);let output;
  try{
    const args=JSON.parse(call.arguments||'{}');
    if(typeof args.question!=='string'||!args.question.trim())throw Error('คำถามไม่ครบ');
    const body={problem:spec(),adultConsent,question:`ภาพเฉพาะหน้า ${pageIndex+1}/${paperPages.length} ห้ามอ้างหน้าอื่น\n${args.question}`,revision};if(boardHasInk())body.image=boardImage();
    const r=await fetch('/api/tutor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:job.controller.signal});const data=await r.json();
    if(!r.ok)throw Error(data.error||'ขอคำแนะนำไม่ได้');
    if(data.problemId!==job.id||data.revision!==job.revision)throw Error('บริบทเปลี่ยนแล้ว');
    output={advice:data.advice};voiceLog('math_coach completed');
  }catch(e){output={error:'unavailable',instruction:'บอกว่าขอคำแนะนำเพิ่มเติมไม่สำเร็จ ห้ามอ้างว่า GPT-6.1 ช่วยตรวจแล้ว'};if(voice===v&&v.tutorJob===job)toast(e.name==='AbortError'?'คิดละเอียดหมดเวลา ลองถามใหม่ครับ':e.message);}
  finally{clearTimeout(timer);}
  if(voice!==v||v.tutorJob!==job)return;v.tutorJob=null;
  sendEvent({type:'conversation.item.create',item:{type:'function_call_output',call_id:call.call_id,output:JSON.stringify(output)}});
  v.pendingResponse=true;sendEvent({type:'response.create',response:{output_modalities:['audio'],tool_choice:'none'}});
  v.replyTimer=setTimeout(()=>{if(voice===v)voiceIssue('reply_timeout','ยังไม่ได้เสียงตอบ ลองกดให้ครูพูดอีกครั้ง');},20000);
}
function voiceLog(text){const lines=$('voiceDebug').textContent.split('\n').filter(s=>s!=='ยังไม่เชื่อมต่อ');lines.push(new Date().toLocaleTimeString('th-TH')+' '+text);$('voiceDebug').textContent=lines.slice(-18).join('\n');}
function voiceIssue(code,message){voiceLog('ERROR '+String(code||'unknown').replace(/[^a-zA-Z0-9_.-]/g,'').slice(0,90));$('voiceCaption').textContent=message;toast(message);}
async function playRemote(){const audio=$('remoteAudio');audio.muted=false;try{await audio.play();$('resumeAudioBtn').classList.add('hidden');voiceLog('audio.play OK');}catch{$('resumeAudioBtn').classList.remove('hidden');voiceIssue('playback_blocked','เบราว์เซอร์ยังไม่เล่นเสียง กด “เปิดเสียงตอบ”');}}
async function listMics(){try{const devices=await navigator.mediaDevices.enumerateDevices();const selected=$('micSelect').value;$('micSelect').replaceChildren(new Option('ค่าเริ่มต้นของเครื่อง',''));for(const d of devices.filter(d=>d.kind==='audioinput'&&d.deviceId))$('micSelect').append(new Option(d.label||'ไมโครโฟน '+$('micSelect').options.length,d.deviceId));$('micSelect').value=selected;}catch{}}
function startMeter(v){try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;v.audioContext=new Audio();v.audioContext.resume().catch(()=>{});const analyser=v.audioContext.createAnalyser();analyser.fftSize=256;v.audioContext.createMediaStreamSource(v.stream).connect(analyser);const data=new Uint8Array(analyser.fftSize);v.meterTimer=setInterval(()=>{if(voice!==v)return;analyser.getByteTimeDomainData(data);const rms=Math.sqrt(data.reduce((sum,x)=>sum+((x-128)/128)**2,0)/data.length);$('micMeter').value=Math.min(1,rms*5);$('micLabel').textContent=v.muted?'ปิดไมค์อยู่':rms>.008?'รับเสียงจากไมค์ได้':'เปิดไมค์แล้ว · สัญญาณเบา/เงียบ';},150);}catch{voiceLog('mic meter unavailable');}}
function voiceAsk(text){if(!voice?.ready){$('voiceCaption').textContent='รอ AI เตรียม session ให้พร้อมก่อนครับ';return;}stopReply();if(voice.responding||voice.pendingResponse){voice.nextPrompt=text;return;}if(!sendBoardContext(text))return;voice.pendingResponse=true;voice.cancelRequested=false;$('remoteAudio').muted=false;$('voiceCaption').textContent='ส่งคำถามแล้ว รอครูคิดตอบ…';voiceLog('request response');sendEvent({type:'response.create',response:{output_modalities:['audio']}});const v=voice;v.replyTimer=setTimeout(()=>{if(voice===v)voiceIssue('reply_timeout','ยังไม่ได้คำตอบใน 20 วินาที ดูสถานะเสียงหรือกดให้ครูพูดอีกครั้ง');},20000);}
function stopVoice(message='จบการคุยแล้ว'){voiceGeneration++;voiceConnecting=false;if(voice){cancelTutor();clearTimeout(voice.timeout);clearTimeout(voice.connectTimer);clearTimeout(voice.replyTimer);clearInterval(voice.meterTimer);voice.audioContext?.close().catch(()=>{});voice.dc.onclose=null;voice.dc.close();voice.pc.close();voice.stream.getTracks().forEach(t=>t.stop());voice=null;}$('remoteAudio').srcObject=null;$('voiceBtn').classList.remove('connected');$('voiceBtn').replaceChildren();const s=document.createElement('span');s.textContent='♩';$('voiceBtn').append(s,' คุยกับครูคิด');$('voiceControls').classList.add('hidden');$('voiceCaption').textContent=message;$('voiceBtn').disabled=false;$('retryReplyBtn').disabled=true;$('resumeAudioBtn').classList.add('hidden');$('micMeter').value=0;$('micLabel').textContent='ยังไม่เปิดไมค์';$('muteBtn').textContent='ปิดไมค์';}
async function startVoice(){
  if(voice||voiceConnecting){stopVoice();return;}
  if(!aiReady()){ttsEnabled=true;prefs.readAloud=true;$('readAloud').checked=true;hint();toast('นี่คือเสียงอ่านของเครื่อง ยังไม่ใช่ AI โต้ตอบ · เปิด AI ได้ในตั้งค่าผู้ปกครอง');return;}
  if(!navigator.mediaDevices?.getUserMedia||!window.RTCPeerConnection){toast('การคุยเสียงต้องใช้เบราว์เซอร์ที่รองรับและ HTTPS หรือ localhost');return;}
  const generation=++voiceGeneration;voiceConnecting=true;$('voiceBtn').disabled=true;$('voiceCaption').textContent='กำลังขอใช้ไมโครโฟนและเชื่อมต่อ…';
  let stream,pc;
  try{
    const mic=$('micSelect').value;
    stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:{ideal:1},...(mic?{deviceId:{exact:mic}}:{})}});
    if(generation!==voiceGeneration){stream.getTracks().forEach(t=>t.stop());return;}
    pc=new RTCPeerConnection();const dc=pc.createDataChannel('oai-events');const v={pc,dc,stream,ready:false,responding:false,pendingResponse:false,cancelRequested:false,nextPrompt:null,boardItem:null,transcript:'',inputItem:null,inputTranscript:'',muted:false,timeout:null,connectTimer:null};voice=v;voiceLog('microphone granted · '+(prefs.voiceQuality==='economy'?'Mini':'quality')+' · th');$('heardSpeech').textContent='พร้อมฟังภาษาไทย · รอให้พูดจบก่อนตอบ';startMeter(v);listMics();
    v.connectTimer=setTimeout(()=>{if(voice===v){stopVoice('เชื่อมต่อหมดเวลา ลองเปิดใหม่ครับ');}},45000);
    pc.ontrack=e=>{if(voice!==v)return;$('remoteAudio').srcObject=e.streams[0]||new MediaStream([e.track]);voiceLog('remote audio track');playRemote();};
    stream.getTracks().forEach(t=>pc.addTrack(t,stream));
    dc.onopen=()=>{if(voice!==v)return;voiceLog('data channel open');voiceConnecting=false;$('voiceBtn').disabled=false;$('voiceBtn').classList.add('connected');$('voiceBtn').textContent='◼ จบการคุย';$('voiceControls').classList.remove('hidden');$('voiceCaption').textContent='เชื่อมต่อแล้ว รอ AI เตรียม session…';v.timeout=setTimeout(()=>{stopVoice('ครบ 10 นาทีแล้ว พักสายเพื่อควบคุมค่าใช้จ่าย');},600000);};
    dc.onclose=()=>{if(voice===v)stopVoice('การเชื่อมต่อสิ้นสุดแล้ว');};
    pc.onconnectionstatechange=()=>{if(voice!==v)return;voiceLog('WebRTC '+pc.connectionState);if(['failed','closed'].includes(pc.connectionState))stopVoice('การเชื่อมต่อเสียงขัดข้อง ลองใหม่ครับ');};
    dc.onmessage=e=>{let m;try{m=JSON.parse(e.data);}catch{return;}if(voice!==v)return;
      if(!m.type?.endsWith('.delta'))voiceLog(m.type||'unknown event');
      if(m.type==='session.created'&&!v.ready){v.ready=true;clearTimeout(v.connectTimer);$('retryReplyBtn').disabled=false;voiceAsk('ทักทายสั้น ๆ บอกว่าเป็นครู AI แล้วชวนลองทำโจทย์นี้ ไม่เฉลย');}
      if(m.type==='input_audio_buffer.speech_started'){v.turnStarted=performance.now();v.speechEnd=null;stopReply();$('voiceCaption').textContent='กำลังฟังเราอยู่…';}
      if(m.type==='input_audio_buffer.speech_stopped'){v.speechEnd=performance.now();$('voiceCaption').textContent='ได้ยินแล้ว กำลังรับเสียงให้ครบ…';}
      if(m.type==='input_audio_buffer.committed'){v.inputItem=m.item_id||null;v.inputTranscript='';voiceAsk('ผู้เรียนพูดจบและรับเสียงครบแล้ว ตอบคำถามจากเสียงไทยล่าสุดของผู้เรียน ใช้ภาพกระดานนี้ประกอบ หากฟังไม่ชัดให้ถามยืนยันเฉพาะจุด ไม่เริ่มอธิบายใหม่ทั้งหมด');}
      if(m.type==='conversation.item.input_audio_transcription.delta'&&(!v.inputItem||m.item_id===v.inputItem)){v.inputTranscript+=m.delta||'';$('heardSpeech').textContent='ถอดเสียงไทย: '+v.inputTranscript;}
      if(m.type==='conversation.item.input_audio_transcription.completed'&&(!v.inputItem||m.item_id===v.inputItem)){$('heardSpeech').textContent='ถอดเสียงล่าสุด: '+(m.transcript||'(ไม่พบคำพูดชัดเจน)')+'\nหากไม่ตรง พิมพ์แก้ไขในช่องถามครูคิดได้';}
      if(m.type==='conversation.item.input_audio_transcription.failed')$('heardSpeech').textContent='ยังถอดเสียงไม่ได้ แต่ครูยังรับเสียงโดยตรงได้ ลองพูดใหม่หรือพิมพ์คำถาม';
      if(m.type==='response.created'){v.responding=true;v.pendingResponse=false;v.transcript='';if(v.cancelRequested)sendEvent({type:'response.cancel'});}
      if(['response.output_audio_transcript.delta','response.audio_transcript.delta'].includes(m.type)){clearTimeout(v.replyTimer);v.transcript+=m.delta;coach(v.transcript,false);}
      if(m.type==='output_audio_buffer.started'){if(v.speechEnd!==null&&v.speechEnd!==undefined){voiceLog('speech_stopped -> audio_buffer.started '+Math.round(performance.now()-v.speechEnd)+' ms (excludes end-of-turn detection)');v.speechEnd=null;}clearTimeout(v.replyTimer);$('voiceCaption').textContent='ครูคิดกำลังพูด…';playRemote();}
      if(m.type==='response.done'){const cancelled=v.cancelRequested;v.responding=false;v.pendingResponse=false;v.cancelRequested=false;clearTimeout(v.replyTimer);const next=v.nextPrompt;v.nextPrompt=null;if(m.response?.status==='failed'){const code=m.response?.status_details?.error?.code||'response_failed';voiceIssue(code,'AI ตอบไม่สำเร็จ ('+code+')');}else if(next){voiceAsk(next);}else if(!cancelled&&m.response?.status==='completed'&&m.response?.output?.some(o=>o.type==='function_call'&&o.name==='math_coach')){const calls=m.response.output.filter(o=>o.type==='function_call');for(const extra of calls.slice(1))sendEvent({type:'conversation.item.create',item:{type:'function_call_output',call_id:extra.call_id,output:JSON.stringify({error:'one_consultation_per_turn'})}});consultTutor(calls[0]);}else $('voiceCaption').textContent='AI กำลังฟัง · พูดถามต่อได้เลย';}
      if(m.type==='error'){const code=m.error?.code||'realtime_error';if(code!=='response_cancel_not_active'){v.pendingResponse=false;clearTimeout(v.replyTimer);voiceIssue(code,'เสียง AI ขัดข้อง ('+code+') ดูสถานะการเชื่อมต่อเสียง');}}
    };
    const offer=await pc.createOffer();await pc.setLocalDescription(offer);
    await new Promise(resolve=>{if(pc.iceGatheringState==='complete')return resolve();const timer=setTimeout(resolve,2500);pc.addEventListener('icegatheringstatechange',()=>{if(pc.iceGatheringState==='complete'){clearTimeout(timer);resolve();}});});
    if(voice!==v)return;
    const r=await fetch('/api/voice',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sdp:pc.localDescription.sdp,problem:spec(),adultConsent,voiceQuality:prefs.voiceQuality==='economy'?'economy':'quality',microphoneMode:prefs.microphoneMode==='headset'?'headset':'tablet'}),signal:AbortSignal.timeout(40000)});
    if(!r.ok){const data=await r.json();throw Error(data.error||'เชื่อมต่อเสียงไม่สำเร็จ');}
    const answer=await r.text();if(voice!==v)return;await pc.setRemoteDescription({type:'answer',sdp:answer});
  }catch(e){stream?.getTracks().forEach(t=>t.stop());pc?.close();stopVoice('ยังเปิดเสียงไม่ได้');toast(e.name==='NotAllowedError'?'กรุณาอนุญาตใช้ไมโครโฟนในเบราว์เซอร์':e.message||'เชื่อมต่อเสียงไม่ได้');}
}
function historyView(){stopVoice();$('learnView').classList.add('hidden');$('historyView').classList.remove('hidden');$('learnNav').classList.remove('active');$('historyNav').classList.add('active');$('stats').replaceChildren();const correct=history.filter(h=>h.correct);for(const [value,label]of [[new Set(correct.map(h=>h.id)).size,'ข้อที่ทำสำเร็จ'],[history.length,'ครั้งที่ลองตอบ'],[new Set(correct.filter(h=>!h.helped).map(h=>h.id)).size,'ข้อที่ทำได้โดยไม่ขอคำใบ้']]){const d=document.createElement('div');d.className='stat';const strong=document.createElement('strong');strong.textContent=value;const span=document.createElement('span');span.textContent=label;d.append(strong,span);$('stats').append(d);}
  $('historyList').replaceChildren();if(!history.length){const d=document.createElement('div');d.className='empty-state';d.textContent='สมุดหน้านี้ยังว่างอยู่ 🌱 เริ่มฝึกข้อแรก แล้วกลับมาดูก้าวเล็ก ๆ ของเรา';$('historyList').append(d);}
  for(const h of [...history].reverse().slice(0,60)){const row=document.createElement('div');row.className='history-item';const text=document.createElement('div');text.textContent=h.title;const sub=document.createElement('small');sub.textContent=`ป.${h.grade} · ${TOPICS[h.topic]||'คณิตศาสตร์'} · ${new Date(h.at).toLocaleString('th-TH',{dateStyle:'short',timeStyle:'short'})}${h.helped?' · ใช้คำใบ้':''}`;text.append(sub);const tag=document.createElement('span');tag.className='tag'+(h.correct?'':' retry');tag.textContent=h.correct?'✓ สำเร็จแล้ว':'กำลังฝึก';row.append(text,tag);$('historyList').append(row);}}
function learnView(){$('learnView').classList.remove('hidden');$('historyView').classList.add('hidden');$('learnNav').classList.add('active');$('historyNav').classList.remove('active');}
document.querySelectorAll('[data-topic]').forEach(b=>b.onclick=()=>{topic=b.dataset.topic;solved=false;learnView();newProblem();});
document.querySelectorAll('[data-grade]').forEach(b=>b.onclick=()=>{grade=Number(b.dataset.grade);solved=false;document.querySelectorAll('[data-grade]').forEach(v=>v.classList.toggle('active',v===b));newProblem();});
$('level').onchange=()=>{level=Number($('level').value);solved=false;newProblem();};
lessonSelect.onchange=()=>{topic=lessonSelect.value;solved=false;learnView();newProblem();};
fractionSelect.onchange=()=>{fractionSkill=fractionSelect.value;solved=false;newProblem();};
$('nextBtn').onclick=newProblem;$('checkBtn').onclick=check;$('hintBtn').onclick=hint;
$('answer').onkeydown=e=>{if(e.key==='Enter')check();};$('answer').oninput=()=>{invalidate();};
function selectTool(value){if(current)return;tool=value;for(const name of ['pen','eraser','pan'])$(name).classList.toggle('active',name===value);canvas.classList.toggle('pan-mode',value==='pan');}
const pan=document.createElement('button');pan.id='pan';pan.className='tool';pan.textContent='↕';pan.title='เลื่อนกระดาษ';pan.setAttribute('aria-label','เลื่อนกระดาษ');$('eraser').after(pan);pan.onclick=()=>selectTool('pan');
$('penWidth').min='1';$('penWidth').max='8';$('penWidth').value='3';
$('pen').onclick=()=>selectTool('pen');
$('eraser').onclick=()=>selectTool('eraser');
$('prevPage').onclick=()=>turnPage(pageIndex-1);$('nextPage').onclick=()=>turnPage(pageIndex+1);
$('addPage').onclick=()=>{if(current||paperPages.length>=12)return;paperPages.push([]);turnPage(paperPages.length-1);};
function expandPaper(expanded){document.body.classList.toggle('writing-mode',expanded);$('expandBoard').setAttribute('aria-pressed',String(expanded));$('expandBoard').textContent=expanded?'↙ กลับห้องเรียน':'⤢ ขยายพื้นที่เขียน';}
$('expandBoard').onclick=()=>expandPaper(!document.body.classList.contains('writing-mode'));
document.addEventListener('keydown',e=>{if(e.key==='Escape')expandPaper(false);});
const paperVoice=document.createElement('button');paperVoice.id='paperVoice';paperVoice.textContent='♩ คุยกับครูคิด';paperVoice.onclick=()=>$('voiceBtn').click();$('expandBoard').before(paperVoice);
const paperStatus=document.createElement('p');paperStatus.className='paper-voice-status';paperStatus.setAttribute('aria-live','polite');document.querySelector('.paper-controls').after(paperStatus);
new MutationObserver(()=>{paperVoice.textContent=voice?'◼ จบการคุย':'♩ คุยกับครูคิด';paperVoice.disabled=$('voiceBtn').disabled;paperStatus.textContent=$('voiceCaption').textContent;}).observe($('voiceCaption'),{childList:true,subtree:true,characterData:true});
document.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{color=b.dataset.color;$('pen').click();document.querySelectorAll('[data-color]').forEach(v=>v.classList.toggle('active',v===b));});
$('undo').onclick=()=>{current=null;strokes.pop();draw();changed();};$('clear').onclick=()=>{current=null;strokes=[];draw();changed();$('boardState').textContent='กระดานใหม่ พร้อมให้ลองคิด';};
$('autoCheck').onchange=()=>{clearTimeout(autoTimer);if($('autoCheck').checked){toast('จะตรวจหลังหยุดเขียน โดยเว้นอย่างน้อย 7 วินาทีต่อครั้ง');if(strokes.length)autoTimer=setTimeout(()=>reviewBoard(true),1800);}};
$('voiceBtn').onclick=startVoice;$('stopSpeechBtn').onclick=stopReply;
$('retryReplyBtn').onclick=()=>voiceAsk('ช่วยทักทายและอธิบายโจทย์ปัจจุบันสั้น ๆ โดยยังไม่เฉลย');
$('resumeAudioBtn').onclick=playRemote;
$('micSelect').onchange=()=>{if(voice||voiceConnecting)stopVoice('เปลี่ยนไมค์แล้ว กดคุยกับครูคิดเพื่อเริ่มใหม่');};
$('testSpeakerBtn').onclick=async()=>{try{const Audio=window.AudioContext||window.webkitAudioContext;const a=new Audio();await a.resume();const oscillator=a.createOscillator(),gain=a.createGain();oscillator.frequency.value=520;gain.gain.value=.08;oscillator.connect(gain);gain.connect(a.destination);oscillator.start();oscillator.stop(a.currentTime+.35);oscillator.onended=()=>a.close();toast('ควรได้ยินเสียงติ๊ดสั้น ๆ ถ้าไม่ได้ยิน ให้ตรวจระดับเสียงและลำโพงของเครื่อง');}catch{toast('เปิดเสียงทดสอบไม่ได้ กรุณาตรวจสิทธิ์เสียงของเบราว์เซอร์');}};
$('muteBtn').onclick=()=>{if(!voice)return;voice.muted=!voice.muted;voice.stream.getAudioTracks().forEach(t=>t.enabled=!voice.muted);$('muteBtn').textContent=voice.muted?'เปิดไมค์':'ปิดไมค์';$('voiceCaption').textContent=voice.muted?'ปิดไมค์แล้ว · การเชื่อมต่อยังทำงาน':'AI กำลังฟัง';};
$('chatForm').onsubmit=e=>{e.preventDefault();const text=$('chatInput').value.trim();if(!text)return;$('chatInput').value='';hintIndex++;if(voice?.dc.readyState==='open'){voiceAsk('คำถามของผู้เรียน: '+text);}else if(aiReady()){reviewBoard(false,text);}else{coach('ตอนนี้เป็นโหมดสาธิต ลองใช้แนวทางนี้ก่อนนะ: '+problem.hints[Math.min(hintIndex-1,1)]);toast('คำตอบนี้เป็นคำใบ้สำเร็จรูป ยังไม่ได้ส่งคำถามให้ AI');}};
$('historyNav').onclick=historyView;$('learnNav').onclick=learnView;$('backLearn').onclick=learnView;
$('deleteHistory').onclick=()=>{if(confirm('ลบประวัติการฝึกทั้งหมดในเบราว์เซอร์นี้หรือไม่?')){history=[];persist();updateProgress();historyView();}};
function openSettings(){$('readAloud').checked=prefs.readAloud;$('adaptive').checked=prefs.adaptive;$('adultConsent').checked=adultConsent;$('voiceQuality').value=prefs.voiceQuality==='economy'?'economy':'quality';$('microphoneMode').value=prefs.microphoneMode==='headset'?'headset':'tablet';$('settings').showModal();}
$('settingsBtn').onclick=openSettings;$('avatar').onclick=openSettings;
$('saveSettings').onclick=()=>{const nextConsent=$('adultConsent').checked;if(adultConsent!==nextConsent||prefs.voiceQuality!==$('voiceQuality').value||prefs.microphoneMode!==$('microphoneMode').value){stopVoice();invalidate();}adultConsent=nextConsent;prefs={readAloud:$('readAloud').checked,adaptive:$('adaptive').checked,voiceQuality:$('voiceQuality').value,microphoneMode:$('microphoneMode').value};ttsEnabled=prefs.readAloud;try{localStorage.setItem('baankid-prefs',JSON.stringify(prefs));}catch{}refreshMode();$('settings').close();toast(aiReady()?'เปิดโหมด AI สำหรับผู้ใหญ่ทดลองแล้ว':'บันทึกแล้ว · ใช้โหมดสาธิต');};
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopVoice('พักการคุยเมื่อออกจากหน้า');clearTimeout(autoTimer);reviewAbort?.abort();if('speechSynthesis'in window)speechSynthesis.cancel();}});
window.addEventListener('pagehide',()=>stopVoice());
newProblem();updateProgress();refreshMode();loadConfig();
