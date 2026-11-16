import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1024,height:1366}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:3000');await page.locator('#paperPage').waitFor();
 assert.equal(await page.locator('[data-topic]').count(),12);assert.equal(await page.locator('#board').evaluate(c=>c.height),1400);
 assert.equal(await page.locator('#penWidth').inputValue(),'3');
 async function draw(){await page.locator('#board').evaluate(c=>window.scrollTo(0,c.getBoundingClientRect().top+scrollY-120));const b=await page.locator('#board').boundingBox();await page.mouse.move(b.x+60,b.y+60);await page.mouse.down();await page.mouse.move(b.x+140,b.y+130,{steps:10});await page.mouse.up();}
 const ink=()=>page.locator('#board').evaluate(c=>c.toDataURL());
 const empty=await ink();await draw();const first=await ink();assert.notEqual(first,empty);
 await page.locator('#addPage').click();assert.equal(await page.locator('#paperPage').textContent(),'หน้า 2 / 2');assert.equal(await ink(),empty);
 await draw();await page.locator('#undo').click();assert.equal(await ink(),empty);await draw();const second=await ink();
 await page.locator('#prevPage').click();assert.equal(await ink(),first);await page.locator('#nextPage').click();assert.equal(await ink(),second);
 await page.locator('#clear').click();assert.equal(await ink(),empty);await page.locator('#prevPage').click();assert.equal(await ink(),first,'clearing page two preserves page one');
 const normalWidth=(await page.locator('#board').boundingBox()).width;await page.locator('#expandBoard').click();assert.equal(await page.locator('#expandBoard').getAttribute('aria-pressed'),'true');assert.ok((await page.locator('#board').boundingBox()).width>normalWidth);assert.equal(await ink(),first);
 await page.locator('#pan').click();assert.equal(await page.locator('#board').evaluate(c=>getComputedStyle(c).touchAction),'pan-y');await page.locator('#pen').click();await page.keyboard.press('Escape');assert.equal(await page.locator('#expandBoard').getAttribute('aria-pressed'),'false');
 for(const topic of ['addition','subtraction','mixed','measurement','geometry','time','data']){await page.locator(`[data-topic="${topic}"]`).click();assert.equal(await page.locator('#paperPage').textContent(),'หน้า 1 / 1');assert.equal(await ink(),empty);assert.ok((await page.locator('#question').textContent()).length>3);if(['geometry','data'].includes(topic))assert.equal(await page.locator('#problemVisual svg').count(),1);}
 await page.locator('[data-topic="geometry"]').click();await page.locator('[data-grade="5"]').click();await page.locator('#level').selectOption('3');assert.match(await page.locator('#question').textContent(),/ปริมาตร/);await page.screenshot({path:'test-results/geometry-paper.png',fullPage:true});
 for(const [w,h]of [[768,1024],[390,844]]){await page.setViewportSize({width:w,height:h});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.locator('#expandBoard').click();assert.equal(await page.evaluate(()=>document.querySelector('.exercise').scrollWidth<=innerWidth),true);await page.keyboard.press('Escape');}
 assert.deepEqual(errors,[]);console.log('Paper checks passed: 12 topic navigation, page isolation/undo/clear, full workspace, pan mode, geometry/data diagrams and responsive widths.');
}finally{await browser.close();}
