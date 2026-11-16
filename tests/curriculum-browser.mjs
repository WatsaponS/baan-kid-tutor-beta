import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {P5_SKILLS} from '../src/curriculum.js';
import {makeProblem} from '../src/math.js';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1024,height:1366},hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{crypto.getRandomValues=array=>{array.fill(92);return array;};});
 await page.goto('http://127.0.0.1:3000');await page.locator('[data-grade="5"]').click();assert.equal(await page.locator('#learningMap').isVisible(),true);assert.equal(await page.locator('#learningMap>details').count(),8);
 const counts={};
 for(const [topic,skills]of Object.entries(P5_SKILLS)){
  await page.locator('#lessonSelect').selectOption(topic);
  for(const skill of Object.keys(skills)){
   const selector=topic==='fraction'?'#fractionSkill':'#practiceSkill';await page.locator(selector).selectOption(skill);await page.locator('#level').selectOption('1');
   const p=makeProblem(5,topic,1,92,topic==='fraction'?skill:'auto',topic==='fraction'?'auto':skill);counts[p.answerKind]=(counts[p.answerKind]||0)+1;
   const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('baankid-history')||'[]').length);
   if(p.answerKind==='choice'){await page.locator('#problemVisual .choice-btn').filter({hasText:p.answer}).first().click();assert.equal(await page.locator('#answer').inputValue(),p.answer);}
   else if(p.answerKind==='sequence')await page.locator('#answer').fill(p.answer);
   else if(p.answerKind==='vector'||p.answerKind==='construction'){const fields=page.locator('#problemVisual .graph-fields input');assert.equal(await fields.count(),p.expected.length);for(let i=0;i<p.expected.length;i++)await fields.nth(i).fill(String(p.expected[i]));}
   else if(p.answerKind==='number')await page.locator('#answer').fill(p.answer);
   await page.locator('#checkBtn').click();
   if(p.answerKind==='drawing'){assert.match(await page.locator('#result').textContent(),/ต้องตรวจวิธีสร้างรูป/);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('baankid-history')||'[]').length),before);}
   else assert.match(await page.locator('#result').textContent(),/คำตอบถูกแล้ว/,topic+'/'+skill);
   if(['brokenBar','doubleBar','line','buildBar','alternate','interior','rhombus','trapezoid','composite','buildQuad','prism'].includes(skill))await page.locator('#problemVisual').screenshot({path:`test-results/p5-${topic}-${skill}.png`});
  }
 }
 // Touch construction accepts more than one valid location, not only a saved answer.
 await page.locator('#lessonSelect').selectOption('parallel');await page.locator('#practiceSkill').selectOption('buildParallel');await page.locator('#level').selectOption('1');
 await page.locator('circle[data-x="8"][data-y="6"]').tap();await page.locator('#checkBtn').click();assert.match(await page.locator('#result').textContent(),/คำตอบถูกแล้ว/);
 await page.locator('circle[data-x="8"][data-y="7"]').tap();await page.locator('#checkBtn').click();assert.match(await page.locator('#result').textContent(),/ใกล้แล้ว/);
 // All eight chapter interfaces fit phone/tablet widths; assisted plot inputs remain usable.
 for(const width of [768,390]){await page.setViewportSize({width,height:1024});for(const topic of Object.keys(P5_SKILLS)){await page.locator('#lessonSelect').selectOption(topic);const skill=topic==='data'?'buildBar':topic==='geometry'?'buildQuad':topic==='parallel'?'buildParallel':Object.keys(P5_SKILLS[topic])[0];await page.locator(topic==='fraction'?'#fractionSkill':'#practiceSkill').selectOption(skill);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,topic+' overflow '+width);}}
 await page.setViewportSize({width:1024,height:1366});await page.locator('#learningMap>summary').click();await page.locator('#learningMap>details').filter({has:page.locator('summary',{hasText:'5 · ร้อยละ'})}).locator('summary').click();await page.locator('#learningMap button').filter({hasText:'ส่วนลดและราคาหลังลด'}).click();assert.equal(await page.locator('#lessonSelect').inputValue(),'percent');assert.equal(await page.locator('#practiceSkill').inputValue(),'discount');
 assert.deepEqual(errors,[]);console.log('Curriculum UI checks passed: '+JSON.stringify(counts)+'; eight chapters, plotting, alternative touch constructions, manual tasks excluded from scores, learning map and responsive layouts.');
}finally{await browser.close();}
