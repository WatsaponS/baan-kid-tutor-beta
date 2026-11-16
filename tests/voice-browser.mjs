import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
try{
 const context=await browser.newContext({permissions:['microphone'],viewport:{width:1100,height:1000}});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  const state={sent:[],ready:false,dc:null,hold:false};window.rtcTest=state;
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
 // A new request during generation waits for cancellation acknowledgement.
 await page.evaluate(()=>window.rtcTest.hold=true);await page.locator('#retryReplyBtn').click();await page.waitForTimeout(25);
 const requests=await page.evaluate(()=>window.rtcTest.sent.filter(e=>e.type==='response.create').length);await page.locator('#retryReplyBtn').click();await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>window.rtcTest.sent.filter(e=>e.type==='response.create').length),requests+1);
 await page.evaluate(()=>window.rtcTest.emit({type:'error',error:{code:'invalid_value'}}));assert.match(await page.locator('#voiceCaption').textContent(),/invalid_value/);assert.match(await page.locator('#voiceDebug').textContent(),/ERROR invalid_value/);
 assert.ok(await page.locator('#micSelect option').count()>1);
 await page.locator('#voiceBtn').click();assert.equal(await page.locator('#retryReplyBtn').isDisabled(),true);assert.equal(await page.locator('#micMeter').evaluate(e=>e.value),0);assert.deepEqual(errors,[]);
 await page.locator('#settingsBtn').click();await page.locator('#voiceQuality').selectOption('economy');await page.locator('#microphoneMode').selectOption('headset');await page.locator('#saveSettings').click();await page.locator('#voiceBtn').click();await page.waitForTimeout(300);assert.equal(voiceRequest.voiceQuality,'economy');assert.equal(voiceRequest.microphoneMode,'headset');await page.locator('#voiceBtn').click();
 console.log('Voice browser checks passed: session-ready greeting, committed-audio response, cancellation queue, short item IDs, visible errors, mic enumeration and cleanup. Mock transport only; no paid API calls.');
}finally{await browser.close();}
