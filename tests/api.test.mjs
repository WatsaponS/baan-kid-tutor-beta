import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeProblem} from '../src/math.js';
import rawWorker from '../dist/server/index.js';
const accessContext={access:{getIdentity:async()=>({email:'owner@example.test'})}};
const worker={fetch:(request,env,ctx=accessContext)=>rawWorker.fetch(request,env,ctx)};
const base='https://tutor.example';
const request=(path,body={},origin=base,actor='test')=>new Request(base+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','oai-authenticated-user-id':actor},body:JSON.stringify(body)});
const env={OPENAI_API_KEY:'fake-test-only',AI_ADULT_TEST_ENABLED:'true'};
test('demo is default and never exposes a configured secret',async()=>{
 const r=await worker.fetch(new Request(base+'/api/config'),{OPENAI_API_KEY:'secret-marker'});const text=await r.text();assert.ok(!text.includes('secret-marker'));assert.equal(JSON.parse(text).mode,'demo');
 const res=await worker.fetch(request('/api/review',{problem:makeProblem()}),{});assert.equal(res.status,503);
});
test('rejects cross-origin and anonymous paid calls',async()=>{
 assert.equal((await worker.fetch(request('/api/review',{},'https://other.example'),env)).status,403);
 const r=new Request(base+'/api/review',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:'{}'});assert.equal((await worker.fetch(r,env,{})).status,401);
});
test('spoofed identity headers and local flag on a public URL cannot authenticate',async()=>{
 const spoof=request('/api/review',{});
 assert.equal((await rawWorker.fetch(spoof,env,{})).status,401);
 assert.equal((await rawWorker.fetch(request('/api/review',{}),{...env,LOCAL_DEV:'true'},{})).status,401);
 const invalid={access:{getIdentity:async()=>{throw Error('unavailable');}}};
 assert.equal((await rawWorker.fetch(request('/api/review',{}),env,invalid)).status,401);
 const cfg=await(await rawWorker.fetch(new Request(base+'/api/config'),env,{})).json();
 assert.equal(cfg.mode,'demo');assert.equal(cfg.accessReady,false);
 const ready=await(await worker.fetch(new Request(base+'/api/config'),env)).json();assert.equal(ready.mode,'adult-test');assert.equal(ready.accessReady,true);
});
test('local development bypass is restricted to loopback',async()=>{
 const req=new Request('http://127.0.0.1:3000/api/review',{method:'POST',headers:{Origin:'http://127.0.0.1:3000','Content-Type':'application/json'},body:JSON.stringify({problem:makeProblem()})});
 assert.equal((await rawWorker.fetch(req,{LOCAL_DEV:'true'},{})).status,503);
});
test('review uses trusted server answer, propagates uncertain reads, and handles API failure',async()=>{
 const realFetch=globalThis.fetch;const p=makeProblem(4,'multiply',1,33);let sent;
 try{
  globalThis.fetch=async(url,options)=>{sent=JSON.parse(options.body);return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({transcription:'test',final_answer:p.answer,uncertain:false,feedback:'ลองตรวจด้วยการแยกจำนวน'})}]}]});};
  const data={problem:{...p,answer:'-999'},adultConsent:true,image:'data:image/png;base64,AA==',revision:3};
  const res=await worker.fetch(request('/api/review',data),env);assert.equal(res.status,200);assert.equal((await res.json()).verdict,'correct');assert.equal(sent.store,false);
  globalThis.fetch=async()=>Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({transcription:'?',final_answer:p.answer,uncertain:true,feedback:'ช่วยเขียนใหม่'})}]}]});
  assert.equal((await(await worker.fetch(request('/api/review',data),env)).json()).verdict,'unclear');
  globalThis.fetch=async()=>new Response('billing details should not leak',{status:429});
  const limited=await worker.fetch(request('/api/review',data),env);assert.equal(limited.status,429);assert.ok(!(await limited.text()).includes('billing details'));
 }finally{globalThis.fetch=realFetch;}
});
test('voice creates the server-configured session without giving a key to the browser',async()=>{
 const realFetch=globalThis.fetch;let session;
 try{
  globalThis.fetch=async(url,opts)=>{assert.equal(url,'https://api.openai.com/v1/realtime/calls');session=JSON.parse(opts.body.get('session'));return new Response('v=0\r\nmock-answer',{headers:{'Content-Type':'application/sdp'}});};
  const r=await worker.fetch(request('/api/voice',{problem:makeProblem(),adultConsent:true,sdp:'v=0\r\ntest'}),env);
  assert.equal(r.status,200);assert.equal(session.audio.input.turn_detection.create_response,false);assert.equal(session.model,'gpt-realtime-2.1');assert.equal(session.audio.input.turn_detection.type,'semantic_vad');assert.equal(session.audio.input.turn_detection.eagerness,'high');assert.equal(session.audio.input.transcription.language,'th');assert.equal(session.audio.input.noise_reduction.type,'far_field');assert.match(session.instructions,/ภาษาไทย/);assert.ok(!(await r.text()).includes(env.OPENAI_API_KEY));
  const economy=await worker.fetch(request('/api/voice',{problem:makeProblem(),adultConsent:true,sdp:'v=0\r\ntest',voiceQuality:'economy',microphoneMode:'headset'}),env);
  assert.equal(economy.status,200);assert.equal(session.model,'gpt-realtime-2.1-mini');assert.equal(session.audio.input.noise_reduction.type,'near_field');
 }finally{globalThis.fetch=realFetch;}
});
test('rejects external image URLs and invalid problem specs before forwarding',async()=>{
 const p=makeProblem();const r=await worker.fetch(request('/api/review',{problem:p,adultConsent:true,image:'https://attacker.example/image'}),env);assert.equal(r.status,400);
 const bad=await worker.fetch(request('/api/review',{problem:{...p,grade:99},adultConsent:true,image:'data:image/png;base64,AA=='}),env);assert.equal(bad.status,400);
});
test('reasoning consultation requires identity, consent and bounded input; uses server problem',async()=>{
 const p=makeProblem(4,'multiply',1,71);const body={problem:{...p,solution:'FORGED'},question:'ทำไมต้องทด',adultConsent:true,revision:7};
 assert.equal((await rawWorker.fetch(request('/api/tutor',body),env,{})).status,401);
 const realFetch=globalThis.fetch;let sent;
 try{
  globalThis.fetch=async(url,opts)=>{assert.equal(url,'https://api.openai.com/v1/responses');sent=JSON.parse(opts.body);return Response.json({status:'completed',output:[{content:[{type:'output_text',text:'แยกหลักหน่วยกับหลักสิบก่อนครับ'}]}]});};
  const result=await worker.fetch(request('/api/tutor',body),env);assert.equal(result.status,200);assert.equal((await result.json()).revision,7);
  assert.equal(sent.model,'gpt-6.1-sol');assert.equal(sent.reasoning.effort,'low');assert.equal(sent.store,false);assert.ok(!JSON.stringify(sent).includes('FORGED'));
  assert.equal((await worker.fetch(request('/api/tutor',{...body,adultConsent:false}),env)).status,503);
  assert.equal((await worker.fetch(request('/api/tutor',{...body,question:'x'.repeat(2401)}),env)).status,400);
  assert.equal((await worker.fetch(request('/api/tutor',{...body,image:'https://invalid.example/a.png'}),env)).status,400);
  globalThis.fetch=async()=>Response.json({status:'incomplete',output:[]});
  assert.equal((await worker.fetch(request('/api/tutor',body),env)).status,502);
 }finally{globalThis.fetch=realFetch;}
});
test('new practice topics are supported by the authenticated AI review contract',async()=>{
 const realFetch=globalThis.fetch;
 try{for(const topic of ['addition','subtraction','mixed','measurement','geometry','time','data','fraction']){
  const p=makeProblem(5,topic,3,92,topic==='fraction'?'multiMixed':'auto');
  globalThis.fetch=async()=>Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({transcription:'test',final_answer:p.answer,uncertain:false,feedback:'ตรวจขั้นตอนอีกครั้ง'})}]}]});
  const ctx={access:{getIdentity:async()=>({email:topic+'@example.test'})}};
  const r=await rawWorker.fetch(request('/api/review',{problem:p,adultConsent:true,image:'data:image/png;base64,AA=='}),env,ctx);assert.equal(r.status,200,topic);assert.equal((await r.json()).verdict,'correct',topic);
 }}finally{globalThis.fetch=realFetch;}
});
