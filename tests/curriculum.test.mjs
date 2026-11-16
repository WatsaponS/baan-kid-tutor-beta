import {test} from 'node:test';
import assert from 'node:assert/strict';
import {P5_SKILLS,P5_UNITS,P5_INDICATORS} from '../src/curriculum.js';
import {makeProblem,gradeAnswer,parseNumber} from '../src/math.js';
function calc(text){const t=text.replace(/(\d+)\s+(\d+)\/(\d+)/g,'($1+$2/$3)').match(/\d+(?:\.\d+)?|[()+−×÷/]/g);let i=0;const atom=()=>{if(t[i]==='('){i++;const n=sum();assert.equal(t[i++],')');return n;}return +t[i++];};const mul=()=>{let n=atom();while(['×','÷','/'].includes(t[i])){const op=t[i++],r=atom();n=op==='×'?n*r:n/r;}return n;};const sum=()=>{let n=mul();while(['+','−'].includes(t[i])){const op=t[i++],r=mul();n=op==='+'?n+r:n-r;}return n;};const n=sum();assert.equal(i,t.length);return n;}
const unitValue={'เมตร':100,'เซนติเมตร':1,'มิลลิเมตร':.1,'กิโลเมตร':100000,'กิโลกรัม':1000,'กรัม':1,'ลิตร':1000,'มิลลิลิตร':1,'ลูกบาศก์เมตร':1000000,'ลูกบาศก์เซนติเมตร':1};
function converted(p,n){const source=p.title.match(/^[\d.]+ (.+?) เท่ากับ/)[1];assert.ok(source in unitValue&&p.unit in unitValue);return n[0]*unitValue[source]/unitValue[p.unit];}
function independent(p){
 const t=p.title,n=(t.match(/\d+(?:\.\d+)?/g)||[]).map(Number),s=p.curriculumSkill;
 if(p.topic==='fraction'){
  if(s==='compare'){const q=t.split(' : ')[1].split(' □ ').map(parseNumber);return q[0]<q[1]?'<':q[0]>q[1]?'>':'=';}
  if(s==='order')return t.split(': ')[1].split(' ; ').sort((a,b)=>parseNumber(a)-parseNumber(b));
  if(s==='ofNumber')return n[0]*n[1]/n[2];
  if(s==='reciprocal')return n[1]/n[0];
  if(['fractionBrackets','mixedWithFraction'].includes(s))return calc(t);
  return (n[0]/n[1]-n[2]/n[3])/n[4];
 }
 if(p.topic==='decimal'){
  if(s==='convert')return n[0]/n[1];
  if(s==='place'){const digits=String(n[1].toFixed(3)).split('.')[1];return Number(digits[n[0]-1])/10**n[0];}
  if(s==='round'){const places=t.includes('จำนวนเต็ม')?0:n[1],factor=10**places;return Math.floor(n[0]*factor+.5+1e-9)/factor;}
  if(s==='estimate'){const a=Math.floor(n[0]+.5),b=Math.floor(n[1]+.5);return t.includes('×')?a*b:a+b;}
  if(['add','subtract','multiply','divide','powers'].includes(s))return calc(t);
  if(['length','weight'].includes(s))return converted(p,n);
  if(s==='lengthWord'||s==='weightWord')return n[0]-n[1]/(s==='weightWord'?1000:100);
  return n[2]-n[0]*n[1];
 }
 if(p.topic==='proportion'){if(s==='unitRate')return n[1]/n[0];if(s==='proportionWord')return n[2]/(n[0]/n[1]);return n[1]/n[0]*n[2];}
 if(p.topic==='percent'){
  if(s==='meaning')return t.includes('/100')?n[0]/n[1]*100:t.includes('ทศนิยม')?n[0]*100:n[0]/n[1]*100;
  if(s==='of')return n[0]*n[1]/100;
  if(s==='discount')return t.includes('ลดราคาไป')?n[0]*n[1]/100:n[0]*(100-n[1])/100;
  if(s==='profit'||s==='loss'){if(t.includes('คิดเป็นร้อยละ'))return Math.abs(n[1]-n[0])/n[0]*100;return n[0]*(100+(s==='loss'?-n[1]:n[1]))/100;}
  return n[0]*(100-n[1])/100/n[2];
 }
 if(p.topic==='data'){
  const d=p.diagram;if(p.answerKind==='vector')return p.table.rows[0];if(s==='lineWord')return t.includes('สองวันแรก')?d.series[0][0]+d.series[0][1]:t.includes('วันแรกและวันสุดท้าย')?Math.abs(d.series[0][0]-d.series[0].at(-1)):Math.max(...d.series[0])-Math.min(...d.series[0]);const index=d.labels.findIndex(label=>t.includes('วัน'+label));assert.ok(index>=0);return s==='doubleBar'?Math.abs(d.series[0][index]-d.series[1][index]):d.series[0][index];
 }
 if(p.topic==='parallel'){if(s==='perpendicular')return p.diagram.mode==='perpendicular'?'ตั้งฉาก':'ขนาน';if(s==='alternate')return n[0];if(s==='interior')return 180-n[0];if(s==='distance')return p.diagram.distance;return p.expected;}
 if(p.topic==='geometry'){
  if(s==='classify'){if(t.includes('มุมฉาก 4 มุม'))return t.includes('ด้านเท่ากัน 4 ด้าน')?'จัตุรัส':'ผืนผ้า';if(t.includes('ด้านเท่ากัน 4 ด้าน'))return 'ขนมเปียกปูน';if(t.includes('เพียง 1 คู่'))return 'คางหมู';if(t.includes('ด้านประชิดเท่ากัน'))return 'รูปว่าว';return 'ด้านขนาน';}
  if(s==='diagonal'){if(t.includes('คางหมู'))return 'เท่ากัน แต่ไม่แบ่งครึ่งกัน';if(t.includes('รูปว่าว'))return 'ตั้งฉาก และมีเพียงเส้นหนึ่งแบ่งครึ่งอีกเส้น';if(t.includes('ด้านขนานที่'))return 'แบ่งครึ่งกัน แต่ไม่เท่ากันและไม่ตั้งฉาก';if(t.includes('ขนมเปียกปูนที่'))return 'ตั้งฉากและแบ่งครึ่งกัน แต่ไม่เท่ากัน';return t.includes('ที่ไม่ใช่จัตุรัส')?'เท่ากันและแบ่งครึ่งกัน แต่ไม่ตั้งฉาก':'เท่ากัน ตั้งฉาก และแบ่งครึ่งกัน';}
  if(s==='drawQuad')return 'manual';if(s==='buildQuad'){const v=p.diagram;return [v.b[0]+v.offset,v.a[1]+v.height,v.a[0]+v.offset,v.a[1]+v.height];}
  if(s==='perimeter')return n.length===1?4*n[0]:t.includes('คางหมู')?n[0]+n[1]+2*n[2]:n[0]+n[1]+n[0]+n[1];if(s==='composite')return n[0]*n[1]-n[2]*n[3];if(s==='areaWord')return n[0]*n[1]*n[2];if(s==='trapezoid')return (n[0]+n[1])/2*n[2];return n[0]*n[1];
 }
 if(p.topic==='volume'){
  if(s==='prism')return t.includes('จุดยอด')?2*n[0]:t.includes('สัน')?3*n[0]:n[0]+2;
  if(s==='identifySolid')return t.includes('สองมิติ')?'สี่เหลี่ยมผืนผ้า':t.includes('ข้อใดเป็นปริซึม')?'ทรงสี่เหลี่ยมมุมฉาก':'เป็นรูปหลายเหลี่ยมที่เท่ากันทุกประการและขนานกัน';
  if(s==='drawPrism')return 'manual';if(s==='units')return converted(p,n);if(s==='missing')return n[0]/(n[1]*n[2]);if(s==='capacity')return n[0]*n[1]*n[2]/1000;if(s==='volumeWord')return n[0]*n[1]*(n[2]-n[3])/1000;return n[0]*n[1]*n[2];
 }
 throw Error('Missing independent check '+p.topic+'/'+s);
}
test('all Grade 5 chapter skills are implemented and independently checked from givens',()=>{
 assert.equal(Object.keys(P5_UNITS).length,8);assert.equal(new Set(Object.values(P5_INDICATORS).flat()).size,19);
 let checked=0;
 for(const [topic,skills]of Object.entries(P5_SKILLS))for(const skill of Object.keys(skills))for(const level of [1,2,3])for(let seed=0;seed<180;seed++){
  const p=makeProblem(5,topic,level,seed,topic==='fraction'?skill:'auto',topic==='fraction'?'auto':skill),expected=independent(p);
  assert.equal(p.curriculumSkill,skill);assert.equal(p.title,makeProblem(5,topic,level,seed,topic==='fraction'?skill:'auto',topic==='fraction'?'auto':skill).title);assert.ok(p.hints.length>=2&&p.hints.every(x=>x.length>=10));assert.ok(p.solution.length>5);
  if(p.answerKind==='drawing'){assert.equal(gradeAnswer(p,''),'manual');assert.ok(p.rubric.length>=3);}
  else if(p.answerKind==='choice'){assert.equal(p.answer,expected);assert.equal(gradeAnswer(p,expected),'correct');assert.equal(gradeAnswer(p,''),'unclear');const wrong=p.choices.find(c=>c.value!==expected);assert.equal(gradeAnswer(p,wrong.value),'incorrect');}
  else if(p.answerKind==='sequence'){assert.deepEqual(p.expected.map(parseNumber),expected.map(parseNumber));assert.equal(gradeAnswer(p,expected.join(';')),'correct');assert.equal(gradeAnswer(p,[...expected].reverse().join(';')),'incorrect');}
  else if(['vector','construction'].includes(p.answerKind)){assert.deepEqual(p.expected,expected);assert.equal(gradeAnswer(p,JSON.stringify(expected)),'correct');assert.equal(gradeAnswer(p,'[]'),'unclear');}
  else {assert.ok(Number.isFinite(expected),p.title);assert.ok(Math.abs(parseNumber(p.answer)-expected)<1e-8,JSON.stringify(p));assert.equal(gradeAnswer(p,String(expected)),'correct');assert.equal(gradeAnswer(p,String(expected+1)),'incorrect');}
  checked++;
 }
 console.log('Independently checked Grade 5 cases: '+checked);
});
test('construction grading accepts alternative valid lines and rejects bad coordinates',()=>{
 for(const skill of ['buildParallel','buildPerpendicular'])for(const level of [1,2,3]){
  const p=makeProblem(5,'parallel',level,7,'auto',skill),v=p.diagram,dx=(v.b[0]-v.a[0])/2,dy=(v.b[1]-v.a[1])/2;
  const alternative=skill==='buildParallel'?[v.p[0]+dx,v.p[1]+dy]:[v.p[0]+dy,v.p[1]-dx];assert.equal(gradeAnswer(p,JSON.stringify(alternative)),'correct');assert.equal(gradeAnswer(p,JSON.stringify(v.p)),'incorrect');assert.equal(gradeAnswer(p,'[-1,5]'),'incorrect');assert.equal(gradeAnswer(p,'[null,5]'),'unclear');
 }
});
test('rounding tie cases and decimal operations stay in the Grade 5 decimal range',()=>{
 for(let seed=0;seed<1000;seed++)for(const skill of ['convert','multiply','divide','powers']){const p=makeProblem(5,'decimal',3,seed,'auto',skill);const scaled=parseNumber(p.answer)*1000;assert.ok(Math.abs(scaled-Math.round(scaled))<1e-7,p.title);}
});
