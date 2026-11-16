export const TOPICS = { addition:'การบวก', subtraction:'การลบ', multiply:'การคูณ', divide:'การหาร', mixed:'คำนวณระคน', fraction:'เศษส่วน', decimal:'ทศนิยม', measurement:'การวัดและหน่วย', geometry:'พื้นที่และรูปทรง', time:'เวลา', data:'อ่านข้อมูล', word:'โจทย์ปัญหา' };
export function gcd(a,b){while(b){[a,b]=[b,a%b];}return Math.abs(a);}
export function fraction(n,d){const g=gcd(n,d);return d/g===1?String(n/g):`${n/g}/${d/g}`;}
export function makeProblem(grade=4,topic='multiply',level=1,seed=1){
  grade=Number(grade)===5?5:4; topic=TOPICS[topic]?topic:'multiply'; level=Math.max(1,Math.min(3,Number(level)||1));
  let state=Number(seed)>>>0; const rand=(lo,hi)=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return lo+state%(hi-lo+1);};
  let a,b,answer,title,hints,solution,visual=null,unit='';
  if(topic==='addition'||topic==='subtraction'){
    const max=level===1?999:level===2?99999:grade===5?9999999:999999;a=rand(101,max);b=rand(11,max);
    if(topic==='subtraction'&&a<b)[a,b]=[b,a];const add=topic==='addition';answer=String(add?a+b:a-b);title=`${a.toLocaleString('en-US')} ${add?'+':'−'} ${b.toLocaleString('en-US')} = ?`;
    hints=[`จัดตัวเลขให้หลักหน่วย หลักสิบ และหลักร้อยตรงกัน แล้ว${add?'บวก':'ลบ'}จากขวาไปซ้าย`,add?'เมื่อรวมในหลักหนึ่งได้ตั้งแต่สิบ ให้ทดไปหลักถัดไป':'ถ้าตัวตั้งในหลักนั้นน้อยกว่า ให้กระจายหนึ่งหน่วยจากหลักถัดไป'];solution=add?`${a} + ${b} = ${answer} ตรวจด้วย ${answer} − ${b} = ${a}`:`${a} − ${b} = ${answer} ตรวจด้วย ${answer} + ${b} = ${a}`;
  }else if(topic==='multiply'){
    a=rand(level===1?12:102,level===1?89:499);b=rand(2,level===1?9:grade===5&&level===3?39:19);answer=String(a*b);title=`${a} × ${b} = ?`;
    hints=[`เริ่มจากหลักหน่วย คูณ ${b} กับเลขหลักหน่วยของ ${a} ก่อนนะ`,`ลองแยก ${a} เป็น ${a-a%10} + ${a%10} แล้วคูณทีละส่วน`];solution=`ใช้สมบัติการแจกแจง: (${a-a%10} × ${b}) + (${a%10} × ${b}) = ${(a-a%10)*b} + ${(a%10)*b} = ${answer}`;
  }else if(topic==='divide'){
    b=rand(2,level===1?9:15);const q=rand(grade===4?12:21,level===1?49:129);a=b*q;answer=String(q);title=`${a} ÷ ${b} = ?`;
    hints=[`เรากำลังแบ่ง ${a} ออกเป็นกลุ่ม กลุ่มละ ${b} ลองคิดว่ามีกี่กลุ่ม`,`ใช้การคูณย้อนกลับ: ${b} คูณจำนวนใดแล้วได้ ${a}?`];solution=`${a} ÷ ${b} = ${q} ตรวจย้อนกลับ: ${q} × ${b} = ${a}`;
  }else if(topic==='fraction'){
    const d=rand(3,level===1?9:12);a=rand(1,d-2);b=rand(1,d-a-1);
    const mult=grade===5&&level>1?rand(2,3):1;answer=fraction(a+b,d);title=`${a}/${d} + ${b*mult}/${d*mult} = ?`;
    hints=[mult>1?`ทำให้ส่วนเท่ากันก่อน ลองดูว่า ${d*mult} เป็นกี่เท่าของ ${d}`:'เมื่อส่วนเท่ากัน เราบวกจำนวนชิ้นด้านบน แล้วคงขนาดชิ้นเดิมไว้',`ลองวาดแถบแบ่งเป็น ${d} ส่วนเท่า ๆ กัน ระบาย ${a} ส่วน แล้วเพิ่มอีก ${b} ส่วน`];
    solution=`${b*mult}/${d*mult} = ${b}/${d} ดังนั้น ${a}/${d} + ${b}/${d} = ${a+b}/${d} = ${answer}`;visual={type:'fraction',d,a,b};
    if(level>1&&rand(0,1)===1){
      if(grade===5&&level===3){answer=fraction(a*b,d*d);title=`${a}/${d} × ${b}/${d} = ?`;hints=['การคูณเศษส่วน: คูณตัวเศษกับตัวเศษ และตัวส่วนกับตัวส่วน','ลองตัดทอนตัวประกอบร่วมก่อนหรือหลังคูณ'];solution=`(${a} × ${b}) / (${d} × ${d}) = ${a*b}/${d*d} = ${answer}`;visual=null;}
      else {const hi=Math.max(a,b),lo=Math.min(a,b);answer=fraction(hi-lo,d);title=`${hi}/${d} − ${lo*mult}/${d*mult} = ?`;hints=['ทำตัวส่วนให้เท่ากันก่อน แล้วลบตัวเศษ โดยคงตัวส่วนไว้','ลองวาดแถบเศษส่วนแล้วขีดส่วนที่เอาออก'];solution=`${lo*mult}/${d*mult} = ${lo}/${d} ดังนั้น (${hi} − ${lo})/${d} = ${answer}`;visual=null;}
    }
  }else if(topic==='decimal'){
    const scale=grade===5&&level>1?100:10; a=rand(11,level===1?99:399);b=rand(11,99);const digits=scale===100?2:1;
    answer=((a+b)/scale).toFixed(digits);title=`${(a/scale).toFixed(digits)} + ${(b/scale).toFixed(digits)} = ?`;
    hints=['เขียนจุดทศนิยมให้ตรงกัน แล้วบวกทีละหลักจากขวาไปซ้าย','หลักสิบส่วนต้องตรงกับหลักสิบส่วน ระวังการทดเมื่อบวกได้ตั้งแต่ 10'];solution=`บวกตามค่าประจำหลัก: ${a}/${scale} + ${b}/${scale} = ${a+b}/${scale} = ${answer}`;
    if(level>1&&rand(0,1)===1){if(a<b)[a,b]=[b,a];answer=((a-b)/scale).toFixed(digits);title=`${(a/scale).toFixed(digits)} − ${(b/scale).toFixed(digits)} = ?`;hints=['วางจุดทศนิยมให้ตรงกัน แล้วลบจากขวาไปซ้าย','เติมศูนย์ท้ายทศนิยมได้โดยค่าไม่เปลี่ยน แล้วตรวจการกระจายหลัก'];solution=`(${a} − ${b}) / ${scale} = ${answer}`;}
  }else if(topic==='mixed'){
    a=rand(12,99);b=rand(2,9);const c=rand(2,9);const bracket=level>1;title=bracket?`(${a} + ${b}) × ${c} = ?`:`${a} + ${b} × ${c} = ?`;answer=String(bracket?(a+b)*c:a+b*c);hints=[bracket?'คำนวณในวงเล็บก่อน แล้วจึงคูณ':'คูณก่อนบวก ตามลำดับการคำนวณ',bracket?`หาผลรวม ${a} + ${b} ก่อน`:`หาผลคูณ ${b} × ${c} ก่อน`];solution=bracket?`(${a} + ${b}) × ${c} = ${a+b} × ${c} = ${answer}`:`${a} + (${b} × ${c}) = ${a} + ${b*c} = ${answer}`;
    if(level===3){title=`(${a} × ${b} + ${c*b}) ÷ ${b} = ?`;answer=String(a+c);hints=['ทำในวงเล็บก่อน โดยคูณก่อนบวก แล้วค่อยหาร','ตรวจผลด้วยการคูณคำตอบกลับด้วยตัวหาร'];solution=`(${a*b} + ${c*b}) ÷ ${b} = ${(a+c)*b} ÷ ${b} = ${answer}`;}
  }else if(topic==='measurement'){
    const units=[['เมตร','เซนติเมตร',100],['กิโลเมตร','เมตร',1000],['กิโลกรัม','กรัม',1000],['ลิตร','มิลลิลิตร',1000]];const [big,small,factor]=units[rand(0,3)];a=rand(1,level===1?9:35);b=level===1?0:rand(1,factor-1);unit=small;answer=String(a*factor+b);title=`${a} ${big}${b?` ${b} ${small}`:''} เท่ากับกี่${small}?`;hints=[`1 ${big} เท่ากับ ${factor} ${small}`,`แปลง ${a} ${big} เป็น${small}ก่อน${b?' แล้วบวกส่วนที่เหลือ':''}`];solution=`${a} × ${factor}${b?' + '+b:''} = ${answer} ${small}`;
    if(level===3){unit=big;title=`${a*factor+b} ${small} เท่ากับกี่${big}?`;answer=String((a*factor+b)/factor);hints=[`1 ${big} เท่ากับ ${factor} ${small}`,`เปลี่ยนหน่วยเล็กเป็นหน่วยใหญ่ด้วยการหาร ${factor}`];solution=`${a*factor+b} ÷ ${factor} = ${answer} ${big}`;}
  }else if(topic==='geometry'){
    a=rand(3,level===1?12:35);b=rand(2,level===1?9:20);const area=level>1;answer=String(area?a*b:2*(a+b));unit=area?'ตร.ซม.':'ซม.';title=`รูปสี่เหลี่ยมผืนผ้า ยาว ${a} ซม. กว้าง ${b} ซม. มี${area?'พื้นที่':'ความยาวรอบรูป'}เท่าไร?`;hints=[area?'พื้นที่คือจำนวนช่องตารางหน่วยที่ปูเต็มรูป ใช้ ความยาว × ความกว้าง':'รอบรูปคือผลรวมความยาวทั้งสี่ด้าน ด้านตรงข้ามยาวเท่ากัน',area?`ลองนึกถึง ${b} แถว แถวละ ${a} ช่อง`:`รวมความยาวกับความกว้างก่อน แล้วคูณ 2`];solution=area?`${a} × ${b} = ${answer} ตารางเซนติเมตร`:`2 × (${a} + ${b}) = ${answer} เซนติเมตร`;visual={type:'rectangle',a,b};
    if(grade===5&&level===3){const c=rand(2,12);title=`ทรงสี่เหลี่ยมมุมฉาก ยาว ${a} ซม. กว้าง ${b} ซม. สูง ${c} ซม. มีปริมาตรเท่าไร?`;answer=String(a*b*c);unit='ลบ.ซม.';hints=['ปริมาตรทรงสี่เหลี่ยมมุมฉาก = กว้าง × ยาว × สูง','หาพื้นที่ฐานก่อน แล้วคูณจำนวนชั้นตามความสูง'];solution=`${a} × ${b} × ${c} = ${answer} ลูกบาศก์เซนติเมตร`;visual={type:'cuboid',a,b,c};}
  }else if(topic==='time'){
    a=rand(7,18);b=rand(0,11)*5;const duration=rand(3,level===1?9:30)*5;const start=a*60+b,end=start+duration;unit='นาที';title=`เริ่มอ่านหนังสือเวลา ${a}:${String(b).padStart(2,'0')} น. อ่านเสร็จเวลา ${Math.floor(end/60)}:${String(end%60).padStart(2,'0')} น. ใช้เวลากี่นาที?`;answer=String(duration);hints=['1 ชั่วโมงมี 60 นาที ถ้าข้ามชั่วโมงให้แบ่งนับเป็นช่วง','แปลงเวลาเริ่มกับเวลาจบเป็นนาที แล้วหาผลต่าง'];solution=`เวลาเริ่ม ${start} นาที เวลาจบ ${end} นาที ผลต่าง ${end} − ${start} = ${duration} นาที`;
  }else if(topic==='data'){
    a=rand(12,80);b=rand(12,80);const c=rand(12,80);const total=level===1;title=`จำนวนหนังสือที่อ่าน: ห้อง ก ${a} เล่ม ห้อง ข ${b} เล่ม ห้อง ค ${c} เล่ม ${total?'รวมทั้งสามห้องกี่เล่ม?':'ห้องที่อ่านมากที่สุดกับน้อยที่สุดต่างกันกี่เล่ม?'}`;answer=String(total?a+b+c:Math.max(a,b,c)-Math.min(a,b,c));unit='เล่ม';hints=[total?'อ่านค่าของทั้งสามห้องแล้วนำมารวมกัน':'หาค่ามากที่สุดและน้อยที่สุดก่อน',total?'บวกทีละสองจำนวน แล้วบวกจำนวนที่เหลือ':'ผลต่าง = ค่ามากที่สุด − ค่าน้อยที่สุด'];solution=total?`${a} + ${b} + ${c} = ${answer} เล่ม`:`${Math.max(a,b,c)} − ${Math.min(a,b,c)} = ${answer} เล่ม`;visual={type:'bars',values:[a,b,c]};
  }else{
    a=rand(3,level===1?9:18);b=rand(12,level===1?39:89);answer=String(a*b);title=`มีสมุด ${a} แพ็ก แต่ละแพ็กมี ${b} เล่ม มีสมุดทั้งหมดกี่เล่ม?`;unit='เล่ม';
    hints=[`มี ${a} กลุ่มที่เท่ากัน แต่ละกลุ่มมี ${b} เล่ม เราจะรวมทุกกลุ่มด้วยวิธีใด?`,`เขียนเป็นประโยคสัญลักษณ์ ${a} × ${b} แล้วลองคำนวณดูนะ`];solution=`จำนวนทั้งหมด = จำนวนแพ็ก × จำนวนต่อแพ็ก = ${a} × ${b} = ${answer} เล่ม`;
    if(level===2){const price=rand(3,12);title=`มีเงิน ${a*b} บาท ซื้อดินสอ ${a} แท่ง ราคาแท่งละ ${price} บาท เหลือเงินกี่บาท?`;unit='บาท';answer=String(a*b-a*price);hints=['หาค่าดินสอทั้งหมดก่อน แล้วหักออกจากเงินที่มี',`ค่าดินสอ = ${a} × ${price} บาท`];solution=`${a*b} − (${a} × ${price}) = ${a*b} − ${a*price} = ${answer} บาท`;}
    if(level===3){const groups=rand(2,8),extra=rand(1,9);title=`มีขนม ${groups} กล่อง กล่องละ ${b} ชิ้น ได้เพิ่มอีก ${extra*groups} ชิ้น แบ่งให้เด็ก ${groups} คนเท่า ๆ กัน ได้คนละกี่ชิ้น?`;unit='ชิ้น';answer=String(b+extra);hints=['หาขนมทั้งหมดทั้งที่มีและได้เพิ่ม แล้วค่อยแบ่งเท่า ๆ กัน',`เขียนเป็น (${groups} × ${b} + ${extra*groups}) ÷ ${groups}`];solution=`(${groups*b} + ${extra*groups}) ÷ ${groups} = ${answer} ชิ้น` ;}
  }
  return {grade,topic,level,seed:Number(seed)>>>0,title,answer,hints,solution,visual,unit,id:`${grade}-${topic}-${level}-${Number(seed)>>>0}`};
}
export function parseNumber(value){
  if(typeof value!=='string'&&typeof value!=='number')return null;
  let s=String(value).trim().replace(/[๐-๙]/g,c=>String(c.charCodeAt(0)-0xE50)).replace(/,/g,'');
  if(s.length>80)return null;
  const mixed=s.match(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if(mixed){const [a,b,c]=mixed.slice(1).map(Number);return c?Math.sign(a||1)*(Math.abs(a)+b/c):null;}
  const f=s.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/);
  if(f){const n=Number(f[1]),d=Number(f[2]);return d&&Number.isFinite(n/d)?n/d:null;}
  return /^-?\d+(?:\.\d+)?$/.test(s)&&Number.isFinite(Number(s))?Number(s):null;
}
export function gradeAnswer(problem,input){const a=parseNumber(input),b=parseNumber(problem.answer);return a===null||b===null?'unclear':Math.abs(a-b)<1e-9?'correct':'incorrect';}
