import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeProblem,gradeAnswer,parseNumber,TOPICS,FRACTION_SKILLS} from '../src/math.js';
test('answers accept equivalent fractions, decimals and Thai numerals without executing input',()=>{
 assert.equal(gradeAnswer({answer:'3/4'},'6/8'),'correct');
 assert.equal(gradeAnswer({answer:'0.75'},'๓/๔'),'correct');
 assert.equal(gradeAnswer({answer:'1.5'},'1 1/2'),'correct');
 assert.equal(gradeAnswer({answer:'0'},''),'unclear');
 assert.equal(parseNumber('1/0'),null);assert.equal(parseNumber('2+2'),null);assert.equal(parseNumber('alert(1)'),null);
});
test('fraction skills guarantee the selected operation and denominators, including Grade 5 defaults',()=>{
 for(const skill of Object.keys(FRACTION_SKILLS))for(const grade of [4,5])for(const level of [1,2,3])for(let seed=0;seed<250;seed++){
  const p=makeProblem(grade,'fraction',level,seed,skill),n=p.title.match(/\d+/g).map(Number);
  assert.ok(Math.abs(parseNumber(p.answer)-calculate(p.title))<1e-9,JSON.stringify(p));assert.ok(parseNumber(p.answer)>=0);
  if(skill.endsWith('Unlike'))assert.notEqual(n[1],n[3]);if(skill.endsWith('Same'))assert.equal(n[1],n[3]);
  if(skill.startsWith('subtract'))assert.match(p.title,/−/);if(skill.startsWith('add'))assert.match(p.title,/\+/);if(skill==='multiply')assert.match(p.title,/×/);if(skill==='divide')assert.match(p.title,/÷/);
  if(skill==='auto'&&grade===5&&level<3){assert.notEqual(n[1],n[3]);assert.match(p.title,/[+−]/);}
  if(['multiAdd','multiSubtract','multiMixed'].includes(skill)){assert.ok(n.length/2>=4&&n.length/2<=5);const ops=p.title.match(/[+−]/g);assert.equal(ops.length,n.length/2-1);if(skill==='multiAdd')assert.ok(ops.every(o=>o==='+'));if(skill==='multiSubtract')assert.ok(ops.every(o=>o==='−'));if(skill==='multiMixed'){assert.ok(ops.includes('+'));assert.ok(ops.includes('−'));}let balance=n[0]/n[1];for(let i=1;i<n.length/2;i++){balance+=(ops[i-1]==='+'?1:-1)*n[2*i]/n[2*i+1];assert.ok(balance>=-1e-9);}assert.ok(new Set(n.filter((_,i)=>i%2===1)).size>1);}
  assert.equal(p.id,makeProblem(grade,'fraction',level,seed,skill).id);
 }
 const a=makeProblem(5,'fraction',1,1,'addUnlike'),b=makeProblem(5,'fraction',1,1,'subtractUnlike');assert.notEqual(a.id,b.id);
});
// Independent expression parser: validates the displayed problem, not generator internals.
function calculate(text){
 const tokens=text.replaceAll(',','').replaceAll('×','*').replaceAll('÷','/').replaceAll('−','-').match(/\d+(?:\.\d+)?|[()+*/-]/g);let i=0;
 function atom(){if(tokens[i]==='('){i++;const n=sum();assert.equal(tokens[i++],')');return n;}return Number(tokens[i++]);}
 function product(){let n=atom();while(['*','/'].includes(tokens[i])){const op=tokens[i++],r=atom();n=op==='*'?n*r:n/r;}return n;}
 function sum(){let n=product();while(['+','-'].includes(tokens[i])){const op=tokens[i++],r=product();n=op==='+'?n+r:n-r;}return n;}
 const result=sum();assert.equal(i,tokens.length);return result;
}
test('displayed problems have independently checked answers across all 12 topics, grades and levels',()=>{
 for(const grade of [4,5])for(const topic of Object.keys(TOPICS))for(const level of [1,2,3])for(let seed=0;seed<300;seed++){
  const p=makeProblem(grade,topic,level,seed);assert.equal(p.id,makeProblem(grade,topic,level,seed).id);
  const nums=p.title.replaceAll(',','').match(/\d+(?:\.\d+)?/g).map(Number);let expected;
  if(['addition','subtraction','multiply','divide','fraction','decimal','mixed'].includes(topic))expected=calculate(p.title);
  else if(topic==='word')expected=level===1?nums[0]*nums[1]:level===2?nums[0]-nums[1]*nums[2]:(nums[0]*nums[1]+nums[2])/nums[3];
  else if(topic==='time')expected=(nums[2]-nums[0])*60+nums[3]-nums[1];
  else if(topic==='data')expected=level===1?nums.reduce((a,b)=>a+b,0):Math.max(...nums)-Math.min(...nums);
  else if(topic==='geometry')expected=level===1?nums[0]+nums[1]+nums[0]+nums[1]:nums.reduce((a,b)=>a*b,1);
  else if(topic==='measurement'){const factor=p.title.includes('เซนติเมตร')?100:1000;expected=level===3?nums[0]/factor:nums[0]*factor+(nums[1]||0);}
  assert.ok(Math.abs(parseNumber(p.answer)-expected)<1e-9,JSON.stringify(p));
  assert.equal(gradeAnswer(p,p.answer),'correct');assert.equal(gradeAnswer(p,String(expected+1)),'incorrect');
  assert.ok(p.hints.length>=2&&p.hints.every(h=>typeof h==='string'&&h.length>10));assert.ok(p.solution.includes(p.answer));assert.ok(expected>=0);
 }
});
