import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
await mkdir('docs',{recursive:true});
const html=(await readFile('src/index.html','utf8'))
 .replace('<html lang="th">','<html lang="th" data-host="github-pages">')
 .replace('href="/style.css"','href="./style.css"')
 .replace('src="/app.js"','src="./app.js"')
 .replace('href="/"','href="./"');
await writeFile('docs/index.html',html);
for(const name of ['app.js','math.js','style.css','curriculum.js','curriculum-ui.js'])await copyFile('src/'+name,'docs/'+name);
await writeFile('docs/.nojekyll','');
console.log('Built GitHub Pages demo into docs/. No API key or server code is included.');
