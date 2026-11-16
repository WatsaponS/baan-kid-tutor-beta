import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1024,height:1366}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:3000');await page.locator('[data-grade="5"]').click();await page.locator('#lessonSelect').selectOption('fraction');
 assert.equal(await page.locator('#fractionSkill').isVisible(),true);
 for(const skill of ['auto','addUnlike','subtractUnlike','addSame','subtractSame','multiply','divide','multiAdd','multiSubtract','multiMixed']){
  await page.locator('#fractionSkill').selectOption(skill);
  for(let i=0;i<4;i++){
   const title=await page.locator('#question').textContent(),n=title.match(/\d+/g).map(Number);let answer;
   if(['auto','addUnlike','subtractUnlike'].includes(skill))assert.notEqual(n[1],n[3],title);
   if(skill.endsWith('Same'))assert.equal(n[1],n[3],title);
   if(skill.startsWith('add'))assert.match(title,/\+/);if(skill.startsWith('subtract'))assert.match(title,/−/);
   if(title.includes('+')||title.includes('−')){const den=n.filter((_,i)=>i%2===1).reduce((a,b)=>a*b,1),ops=title.match(/[+−]/g);let numerator=n[0]*(den/n[1]);for(let j=1;j<n.length/2;j++)numerator+=(ops[j-1]==='+'?1:-1)*n[j*2]*(den/n[j*2+1]);answer=`${numerator}/${den}`;}
   else if(title.includes('×'))answer=`${n[0]*n[2]}/${n[1]*n[3]}`;
   else answer=`${n[0]*n[3]}/${n[1]*n[2]}`;
   await page.locator('#answer').fill(answer);await page.locator('#checkBtn').click();assert.match(await page.locator('#result').textContent(),/คำตอบถูกแล้ว/);await page.locator('#nextBtn').click();
  }
 }
 await page.locator('#fractionSkill').selectOption('multiMixed');await page.locator('#level').selectOption('3');await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'long fraction expression must wrap');
 await page.locator('#lessonSelect').selectOption('multiply');assert.equal(await page.locator('#fractionSkill').isVisible(),false);assert.deepEqual(errors,[]);
 console.log('Fraction browser checks passed: selectable operations, unlike denominators, equivalent-answer grading and next-question continuity.');
}finally{await browser.close();}
