import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
try{
 const context=await browser.newContext({permissions:['microphone'],viewport:{width:1100,height:1000}});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  const state={sent:[],ready:false,dc:null,hold:false,spoken:[]};window.rtcTest=state;
  window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
  Object.defineProperty(window,'speechSynthesis',{value:{cancel(){},getVoices(){return [{lang:'th-TH'}];},speak(u){state.spoken.push(u.text);}}});
  state.emit=m=>state.dc.onmessage?.({data:JSON.stringify(m)});
  class Channel{
   constructor(){this.readyState='connecting';}
   send(raw){const event=JSON.parse(raw);state.sent.push(event);
    if(!state.ready)throw Error('command before session readiness');
    if(event.type==='response.create'){
     setTimeout(()=>{state.emit({type:'response.created'});if(state.hold)return;state.emit({type:'response.output_audio_transcript.delta',delta:'VOICE_TEST_REPLY'});state.emit({type:'response.done',response:{status:'completed'}});},10);
    }
    if(event.type==='response.cancel')setTimeout(()=>state.emit({type:'response.done',response:{status:'cancelled'}}),30);
   }
   close(){this.readyState='closed';}
  }
  window.RTCPeerConnection=class{
   constructor(){this.iceGatheringState='complete';this.connectionState='new';}
   createDataChannel(){state.dc=new Channel();return state.dc;}
   addTrack(){}
   async createOffer(){return {type:'offer',sdp:'v=0\r\nmock-offer'};}
   async setLocalDescription(o){this.localDescription=o;}
   async setRemoteDescription(){this.connectionState='connected';state.dc.readyState='open';state.dc.onopen?.();setTimeout(()=>{state.ready=true;state.emit({type:'session.created'});},100);}
   close(){this.connectionState='closed';}
  };
 });
 await page.route('**/api/config',r=>r.fulfill({json:{mode:'adult-test',hasKey:true,accessReady:true,adultTestEnabled:true}}));
 let voiceRequest;await page.route('**/api/voice',r=>{voiceRequest=r.request().postDataJSON();return r.fulfill({contentType:'application/sdp',body:'v=0\r\nmock-answer'});});
 await page.goto('http://127.0.0.1:3000');await page.locator('#settingsBtn').click();await page.locator('#adultConsent').check();await page.locator('#saveSettings').click();await page.locator('#voiceBtn').click();
 await page.waitForFunction(()=>document.getElementById('coachMessage').textContent==='VOICE_TEST_REPLY');
 assert.equal(voiceRequest.voiceQuality,'quality');assert.equal(voiceRequest.microphoneMode,'tablet');
 let sent=await page.evaluate(()=>window.rtcTest.sent);assert.equal(sent.filter(e=>e.type==='response.create').length,1);assert.ok(sent.filter(e=>e.item?.id).every(e=>e.item.id.length<=32));
 const count=sent.length;await page.evaluate(()=>window.rtcTest.emit({type:'input_audio_buffer.speech_stopped'}));await page.waitForTimeout(50);assert.equal(await page.evaluate(()=>window.rtcTest.sent.length),count);
 await page.evaluate(()=>window.rtcTest.emit({type:'input_audio_buffer.committed',item_id:'thai-turn'}));await page.waitForTimeout(60);assert.equal(await page.evaluate(()=>window.rtcTest.sent.filter(e=>e.type==='response.create').length),2);
 await page.evaluate(()=>window.rtcTest.emit({type:'conversation.item.input_audio_transcription.completed',item_id:'thai-turn',transcript:'เจ็ดสิบแปดคูณห้า ต้องทดไหม'}));assert.match(await page.locator('#heardSpeech').textContent(),/เจ็ดสิบแปดคูณห้า/);
 await page.evaluate(()=>window.rtcTest.emit({type:'conversation.item.input_audio_transcription.completed',item_id:'old-turn',transcript:'OLD_TRANSCRIPT'}));assert.ok(!(await page.locator('#heardSpeech').textContent()).includes('OLD_TRANSCRIPT'));
 assert.equal(await page.evaluate(()=>window.rtcTest.sent.filter(e=>e.item?.id?.startsWith('board_')).length),1,'unchanged board context is reused');
 let tutorRequest,delayTutor=false,tutorCalls=0;
 const {makeProblem}=await import('../src/math.js');
 await page.route('**/api/tutor',async r=>{tutorCalls++;tutorRequest=r.request().postDataJSON();if(delayTutor)await new Promise(resolve=>setTimeout(resolve,250));const p=tutorRequest.problem;await r.fulfill({json:{advice:'TOOL_ADVICE',problemId:makeProblem(p.grade,p.topic,p.level,p.seed).id,revision:tutorRequest.revision}}).catch(()=>{});});
 const tool=call_id=>({type:'response.done',response:{status:'completed',output:[{type:'function_call',name:'math_coach',call_id,arguments:JSON.stringify({question:'ทำไมต้องทด'})}]}});
 await page.evaluate(m=>window.rtcTest.emit(m),tool('call_math'));
 await page.waitForFunction(()=>window.rtcTest.sent.some(e=>e.item?.call_id==='call_math'&&e.item.output.includes('TOOL_ADVICE')));
 assert.match(tutorRequest.question,/ทำไมต้องทด/);assert.match(tutorRequest.question,/1\/1/);await page.waitForTimeout(50);
 assert.equal(await page.evaluate(()=>window.rtcTest.sent.filter(e=>e.type==='response.create').at(-1).response.tool_choice),'none');
 delayTutor=true;await page.evaluate(m=>window.rtcTest.emit(m),tool('call_cancel'));
 await page.waitForFunction(()=>document.getElementById('voiceCaption').textContent.includes('GPT-6.1'));
 await page.evaluate(()=>window.rtcTest.emit({type:'input_audio_buffer.speech_started'}));await page.waitForTimeout(350);
 const cancelled=await page.evaluate(()=>window.rtcTest.sent.filter(e=>e.item?.call_id==='call_cancel'));
 assert.equal(cancelled.length,1);assert.match(cancelled[0].item.output,/cancelled/);
 await page.evaluate(()=>{window.rtcTest.emit({type:'input_audio_buffer.speech_stopped'});window.rtcTest.emit({type:'output_audio_buffer.started'});});assert.match(await page.locator('#voiceDebug').textContent(),/excludes end-of-turn detection/);
 // A new request during generation waits for cancellation acknowledgement.
 await page.evaluate(()=>window.rtcTest.hold=true);await page.locator('#retryReplyBtn').click();await page.waitForTimeout(25);
 const requests=await page.evaluate(()=>window.rtcTest.sent.filter(e=>e.type==='response.create').length);await page.locator('#retryReplyBtn').click();await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>window.rtcTest.sent.filter(e=>e.type==='response.create').length),requests+1);
 await page.evaluate(()=>window.rtcTest.emit({type:'error',error:{code:'invalid_value'}}));assert.match(await page.locator('#voiceCaption').textContent(),/invalid_value/);assert.match(await page.locator('#voiceDebug').textContent(),/ERROR invalid_value/);
 assert.ok(await page.locator('#micSelect option').count()>1);
 await page.locator('#voiceBtn').click();assert.equal(await page.locator('#retryReplyBtn').isDisabled(),true);assert.equal(await page.locator('#micMeter').evaluate(e=>e.value),0);assert.deepEqual(errors,[]);
 await page.locator('#settingsBtn').click();await page.locator('#voiceQuality').selectOption('economy');await page.locator('#microphoneMode').selectOption('headset');await page.locator('#saveSettings').click();await page.locator('#voiceBtn').click();await page.waitForTimeout(300);assert.equal(voiceRequest.voiceQuality,'economy');assert.equal(voiceRequest.microphoneMode,'headset');await page.locator('#voiceBtn').click();
 // In local verification mode neither Realtime nor a reasoning tool may replace the exact verdict.
 await page.evaluate(()=>window.rtcTest.hold=false);await page.locator('#voiceBtn').click();await page.waitForTimeout(300);await page.locator('#localMath>summary').click();
 for(const [field,value]of Object.entries({whole:'3',numerator:'1',denominator:'4',writtenNumerator:'15',writtenDenominator:'4'}))await page.locator(`[data-field="${field}"]`).fill(value);
 await page.locator('#confirmLocalInk').click();const verifiedHint=await page.locator('#localMathStatus').textContent();assert.match(verifiedHint,/3 คูณ 4/);
 const beforeLocal=await page.evaluate(()=>window.rtcTest.sent.filter(e=>e.type==='response.create').length),beforeTutor=tutorCalls;
 await page.evaluate(()=>window.rtcTest.emit({type:'input_audio_buffer.committed',item_id:'verify-step'}));await page.waitForTimeout(50);
 assert.equal(await page.evaluate(()=>window.rtcTest.sent.filter(e=>e.type==='response.create').length),beforeLocal);assert.equal(await page.evaluate(()=>window.rtcTest.spoken.at(-1)),verifiedHint);
 await page.evaluate(()=>{window.rtcTest.emit({type:'response.output_audio_transcript.delta',delta:'FORGED CORRECT'});window.rtcTest.emit({type:'output_audio_buffer.started'});});assert.equal(await page.locator('#remoteAudio').evaluate(e=>e.muted),true);assert.equal(await page.locator('#coachMessage').textContent(),verifiedHint);
 await page.evaluate(m=>window.rtcTest.emit(m),tool('local_math'));await page.waitForTimeout(60);assert.equal(tutorCalls,beforeTutor);
 const localSent=await page.evaluate(()=>window.rtcTest.sent);assert.ok(localSent.some(e=>e.item?.content?.some(c=>c.text?.includes('3 1/4 = 15/4')&&c.text?.includes('incorrect'))));
 assert.deepEqual(errors,[]);await page.locator('#voiceBtn').click();
 console.log('Voice browser checks passed: existing transport flows plus shared deterministic state, identical local spoken hint, muted unsolicited AI verdicts and no extra tutor API calls. Mock transport and speech only.');
}finally{await browser.close();}
