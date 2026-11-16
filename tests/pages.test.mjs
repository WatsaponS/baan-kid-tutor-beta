import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
test('Pages artifact uses project-relative assets and explicitly selects offline demo mode',async()=>{
 const html=await readFile('docs/index.html','utf8');
 assert.ok(html.includes('data-host="github-pages"'));
 assert.ok(html.includes('src="./app.js"'));
 assert.ok(html.includes('href="./style.css"'));
 assert.ok(!html.includes('href="/"'));
 const files=(await readdir('docs')).sort();
 assert.deepEqual(files,['.nojekyll','app.js','curriculum-ui.js','curriculum.js','index.html','math.js','style.css']);
 const js=await readFile('docs/app.js','utf8');
 assert.ok(js.includes("if(staticDemo){config={mode:'demo',hasKey:false}"));
});
