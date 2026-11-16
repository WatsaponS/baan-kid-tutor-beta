export const TOPICS = { multiply:'การคูณ', divide:'การหาร', fraction:'เศษส่วน', decimal:'ทศนิยม', word:'โจทย์ปัญหา' };
export function gcd(a,b){while(b){[a,b]=[b,a%b];}return Math.abs(a);}
export function fraction(n,d){const g=gcd(n,d);return d/g===1?String(n/g):`${n/g}/${d/g}`;}
export function makeProblem(grade=4,topic='multiply',level=1,seed=1){
  grade=Number(grade)===5?5:4; topic=TOPICS[topic]?topic:'multiply'; level=Math.max(1,Math.min(3,Number(level)||1));
  let state=Number(seed)>>>0; const rand=(lo,hi)=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return lo+state%(hi-lo+1);};
  let a,b,answer,title,hints,solution,visual=null,unit='';
  if(topic==='multiply'){
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
  }else if(topic==='decimal'){
    const scale=grade===5&&level>1?100:10; a=rand(11,level===1?99:399);b=rand(11,99);const digits=scale===100?2:1;
    answer=((a+b)/scale).toFixed(digits);title=`${(a/scale).toFixed(digits)} + ${(b/scale).toFixed(digits)} = ?`;
    hints=['เขียนจุดทศนิยมให้ตรงกัน แล้วบวกทีละหลักจากขวาไปซ้าย','หลักสิบส่วนต้องตรงกับหลักสิบส่วน ระวังการทดเมื่อบวกได้ตั้งแต่ 10'];solution=`บวกตามค่าประจำหลัก: ${a}/${scale} + ${b}/${scale} = ${a+b}/${scale} = ${answer}`;
  }else{
    a=rand(3,level===1?9:18);b=rand(12,level===1?39:89);answer=String(a*b);title=`มีสมุด ${a} แพ็ก แต่ละแพ็กมี ${b} เล่ม มีสมุดทั้งหมดกี่เล่ม?`;unit='เล่ม';
    hints=[`มี ${a} กลุ่มที่เท่ากัน แต่ละกลุ่มมี ${b} เล่ม เราจะรวมทุกกลุ่มด้วยวิธีใด?`,`เขียนเป็นประโยคสัญลักษณ์ ${a} × ${b} แล้วลองคำนวณดูนะ`];solution=`จำนวนทั้งหมด = จำนวนแพ็ก × จำนวนต่อแพ็ก = ${a} × ${b} = ${answer} เล่ม`;
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
