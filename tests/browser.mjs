import {chromium,devices} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
await mkdir('test-results',{recursive:true});
const browser=await chromium.launch({headless:true});
const errors=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100},deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:3000');
 await page.getByText('วันนี้ มาคิดไปด้วยกัน').waitFor();
 assert.equal(await page.locator('#autoCheck').isDisabled(),true);
 const title=await page.locator('#question').textContent();const nums=title.match(/\d+/g).map(Number);const answer=nums[0]*nums[1];
 await page.locator('#answer').fill(String(answer+1));await page.locator('#checkBtn').click();assert.match(await page.locator('#result').textContent(),/ใกล้แล้ว/);
 await page.locator('#answer').fill(String(answer));await page.locator('#checkBtn').click();assert.match(await page.locator('#result').textContent(),/คำตอบถูกแล้ว/);
 await page.locator('#checkBtn').click();await page.locator('#historyNav').click();assert.equal(await page.locator('.history-item').count(),2);
 await page.locator('#backLearn').click();await page.locator('#nextBtn').click();
 const box=await page.locator('#board').boundingBox();await page.mouse.move(box.x+55,box.y+55);await page.mouse.down();await page.mouse.move(box.x+100,box.y+120,{steps:8});await page.mouse.up();
 assert.equal(await page.locator('#boardPlaceholder').isVisible(),false);await page.locator('#undo').click();assert.equal(await page.locator('#boardPlaceholder').isVisible(),true);
 await page.locator('#checkBtn').click();assert.match(await page.locator('#result').textContent(),/ยังอ่านลายมือไม่ได้/);
 await page.locator('#hintBtn').click();assert.match(await page.locator('#result').textContent(),/☼/);
 await page.locator('[data-topic="fraction"]').click();await page.locator('#fractionSkill').selectOption('addSame');let fractions=(await page.locator('#question').textContent()).match(/\d+/g).map(Number);await page.locator('#answer').fill(`${2*(fractions[0]+fractions[2])}/${2*fractions[1]}`);await page.locator('#checkBtn').click();assert.match(await page.locator('#result').textContent(),/คำตอบถูกแล้ว/);
 await page.locator('[data-grade="5"]').click();await page.locator('#level').selectOption('3');await page.locator('[data-topic="decimal"]').click();
 await page.locator('#practiceSkill').selectOption('add');assert.match(await page.locator('#question').textContent(),/\d+\.\d{3}/);
 await page.locator('#settingsBtn').click();assert.equal(await page.locator('#settings').isVisible(),true);assert.match(await page.locator('#connectionStatus').textContent(),/ยังไม่มี API key/);await page.locator('#saveSettings').click();
 await page.locator('[data-topic="multiply"]').click();await page.locator('#level').selectOption('1');await page.screenshot({path:'test-results/desktop.png',fullPage:true});
 for(const [name,w,h] of [['tablet',1024,1366],['mobile',390,844]]){await page.setViewportSize({width:w,height:h});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,name+' overflow');await page.screenshot({path:`test-results/${name}.png`,fullPage:true});}
 await page.setViewportSize({width:1440,height:1100});
 await page.route('**/api/config',r=>r.fulfill({json:{mode:'adult-test',hasKey:true,adultTestEnabled:true}}));await page.reload();await page.locator('#settingsBtn').click();await page.locator('#adultConsent').check();await page.locator('#saveSettings').click();assert.equal(await page.locator('#autoCheck').isEnabled(),true);
 const b=await page.locator('#board').boundingBox();await page.mouse.move(b.x+50,b.y+50);await page.mouse.down();await page.mouse.move(b.x+110,b.y+110,{steps:4});await page.mouse.up();
 let received=false;await page.route('**/api/review',async route=>{received=true;const data=route.request().postDataJSON();await new Promise(r=>setTimeout(r,500));try{await route.fulfill({json:{revision:data.revision,problemId:'old',transcription:'STALE MARKER',feedback:'STALE MARKER',final_answer:'1',uncertain:false,verdict:'incorrect'}});}catch{}});
 await page.locator('#checkBtn').click();await page.waitForTimeout(100);assert.equal(received,true);await page.locator('[data-topic="word"]').click();await page.waitForTimeout(700);assert.ok(!(await page.locator('#coachMessage').textContent()).includes('STALE'));
 // A fresh readable answer must be confirmed; merely reading it never records a grade.
 await page.unroute('**/api/review');const wbox=await page.locator('#board').boundingBox();await page.mouse.move(wbox.x+70,wbox.y+70);await page.mouse.down();await page.mouse.move(wbox.x+140,wbox.y+80,{steps:4});await page.mouse.up();
 const wordNums=(await page.locator('#question').textContent()).match(/\d+/g).map(Number);const final=String(wordNums[0]*wordNums[1]);
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('baankid-history')||'[]').length);
 await page.route('**/api/review',r=>{const d=r.request().postDataJSON();return r.fulfill({json:{revision:d.revision,transcription:'ลายมือทดสอบ',feedback:'ลองตรวจการคูณย้อนกลับนะ',final_answer:final,uncertain:false,verdict:'correct'}});});
 await page.locator('#checkBtn').click();await page.getByText('ใช่ ตรวจคำตอบนี้').waitFor();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('baankid-history')||'[]').length),before);await page.getByText('ใช่ ตรวจคำตอบนี้').click();assert.match(await page.locator('#result').textContent(),/คำตอบถูกแล้ว/);
 assert.deepEqual(errors,[]);console.log('Browser checks passed: drawing/undo, demo boundaries, grading, history, fractions, grades, responsive layout, stale-result cancellation and AI confirmation.');
}finally{await browser.close();}
