import { readFile, mkdir, writeFile, copyFile } from 'node:fs/promises';
const html = await readFile('src/index.html','utf8');
const css = await readFile('src/style.css','utf8');
const js = await readFile('src/app.js','utf8');
const math = await readFile('src/math.js','utf8');
const worker = await readFile('src/worker.js','utf8');
const assets = {'/': [html,'text/html; charset=utf-8'], '/style.css': [css,'text/css; charset=utf-8'], '/app.js': [js,'text/javascript; charset=utf-8'], '/math.js': [math,'text/javascript; charset=utf-8']};
await mkdir('dist/server',{recursive:true});
await mkdir('dist/.openai',{recursive:true});
await writeFile('dist/server/index.js',worker.replace("import { makeProblem, gradeAnswer } from './math.js';", math.replaceAll('export ','' )+'\nconst ASSETS = '+JSON.stringify(assets)+';'));
try { await copyFile('.openai/hosting.json','dist/.openai/hosting.json'); }
catch (e) { if (e.code !== 'ENOENT') throw e; }
console.log('Built Worker with embedded application assets.');
