import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeProblem,gradeAnswer,parseNumber} from '../src/math.js';
test('answers accept equivalent fractions, decimals and Thai numerals without executing input',()=>{
 assert.equal(gradeAnswer({answer:'3/4'},'6/8'),'correct');
 assert.equal(gradeAnswer({answer:'0.75'},'๓/๔'),'correct');
 assert.equal(gradeAnswer({answer:'1.5'},'1 1/2'),'correct');
 assert.equal(gradeAnswer({answer:'0'},''),'unclear');
 assert.equal(parseNumber('1/0'),null);assert.equal(parseNumber('2+2'),null);assert.equal(parseNumber('alert(1)'),null);
});
test('generated arithmetic has independently checked answers across both grades and levels',()=>{
 for(const grade of [4,5])for(const topic of ['multiply','divide','fraction','decimal','word'])for(const level of [1,2,3])for(let seed=0;seed<150;seed++){
  const p=makeProblem(grade,topic,level,seed);assert.equal(p.id,makeProblem(grade,topic,level,seed).id);
  const nums=p.title.match(/\d+(?:\.\d+)?/g).map(Number);let expected;
  if(topic==='fraction')expected=nums[0]/nums[1]+nums[2]/nums[3];
  else if(topic==='multiply'||topic==='word')expected=nums[0]*nums[1];
  else if(topic==='divide'){expected=nums[0]/nums[1];assert.equal(expected,Math.floor(expected));}
  else expected=nums[0]+nums[1];
  assert.ok(Math.abs(parseNumber(p.answer)-expected)<1e-9,JSON.stringify(p));
  assert.equal(gradeAnswer(p,p.answer),'correct');assert.equal(gradeAnswer(p,String(expected+1)),'incorrect');
 }
});
