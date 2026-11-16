import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
try { process.loadEnvFile('.env'); } catch(e) { if(e.code!=='ENOENT') throw e; }
await import('./build.mjs');
const worker=(await import(pathToFileURL(process.cwd()+'/dist/server/index.js'))).default;
const host=process.env.HOST||'127.0.0.1'; const port=Number(process.env.PORT||3000);
createServer(async(req,res)=>{try {
  const chunks=[]; let size=0;
  for await(const c of req) { size+=c.length; if(size>2_500_000) {res.writeHead(413);res.end();return;} chunks.push(c); }
  const request=new Request('http://'+req.headers.host+req.url,{method:req.method,headers:req.headers,...(chunks.length?{body:Buffer.concat(chunks),duplex:'half'}:{})});
  const response=await worker.fetch(request,{...process.env,LOCAL_DEV:'true'},{});
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
}catch{res.writeHead(500);res.end('Local server error');}}).listen(port,host,()=>console.log(`บ้านคิด beta: http://${host}:${port}`));
