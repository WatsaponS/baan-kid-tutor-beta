import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const prefix='/baan-kid-tutor-beta/';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css'};
const server=createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');
 if(!url.pathname.startsWith(prefix))throw Error();
 const filename=url.pathname.slice(prefix.length)||'index.html';
 if(!['index.html','app.js','style.css','math.js'].includes(filename))throw Error();
 const text=await readFile('docs/'+filename);res.setHeader('Content-Type',types[filename.slice(filename.lastIndexOf('.'))]);res.end(text);
}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1024,height:1366}});
 const errors=[],apiCalls=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/api/'))apiCalls.push(r.url());});
 await page.goto(`http://127.0.0.1:${server.address().port}${prefix}`);
 await page.locator('#question').waitFor();
 const nums=(await page.locator('#question').textContent()).match(/\d+/g).map(Number);
 await page.locator('#answer').fill(String(nums[0]*nums[1]));await page.locator('#checkBtn').click();assert.match(await page.locator('#result').textContent(),/คำตอบถูกแล้ว/);
 await page.locator('#settingsBtn').click();assert.match(await page.locator('#connectionStatus').textContent(),/GitHub Pages/);assert.equal(await page.locator('#adultConsent').isDisabled(),true);await page.locator('#saveSettings').click();
 await page.locator('#nextBtn').click();await page.locator('#checkBtn').click();assert.match(await page.locator('#result').textContent(),/ยังอ่านลายมือไม่ได้/);
 assert.deepEqual(errors,[]);assert.deepEqual(apiCalls,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 console.log('Pages browser checks passed under /baan-kid-tutor-beta/: relative modules/assets, grading, settings and zero API calls.');
}finally{await browser.close();server.close();}
