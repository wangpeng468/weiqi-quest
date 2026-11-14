/* Sound-only regression test: no speakers, network or Android permissions needed. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync('web-src/sfx.js','utf8');
const html=fs.readFileSync('assets/index.html','utf8');
const practice=fs.readFileSync('web-src/app.js','utf8');
const battle=fs.readFileSync('web-src/battle.js','utf8');

assert.match(html,/id="voiceToggle"[\s\S]*id="soundToggle"/);
assert.match(html,/<script src="sfx\.js"><\/script>/);
assert.match(practice,/fx\('finish'\)/);
assert.match(practice,/fx\('correct'\)/);
assert.match(battle,/fx\('capture'/);
assert.match(battle,/fx\('undo'\)/);

function harness(initial,hasAudio){
 const values=Object.assign({},initial);
 let nodeCount=0,created=0,stopped=0,gainSet=0,makePlay=0;
 const events={},attrs={};
 const control={
   attributes:attrs,
   setAttribute(k,v){attrs[k]=v},
   addEventListener(k,v){events[k]=v}
 };
 const icon={textContent:''},label={textContent:''};
 const doc={
   hidden:false,
   getElementById(id){return {soundToggle:control,soundIcon:icon,soundLabel:label}[id]},
   addEventListener(k,v){events['document:'+k]=v}
 };
 const param={value:0,setValueAtTime(){gainSet++},exponentialRampToValueAtTime(){},linearRampToValueAtTime(){}};
 function makeNode(){
   nodeCount++;
   return {frequency:param,gain:param,connect(){},start(){makePlay++},stop(){stopped++},set type(v){},set buffer(v){}};
 }
 function AudioContext(){
   created++;this.sampleRate=44100;this.currentTime=0;this.state='running';this.destination={};
   this.createGain=makeNode;this.createOscillator=makeNode;
   this.createBiquadFilter=makeNode;this.createBufferSource=makeNode;
   this.createBuffer=()=>({getChannelData:()=>new Float32Array(3308)});
   this.resume=()=>Promise.resolve();this.suspend=()=>Promise.resolve();
 }
 const root={AudioContext:hasAudio?AudioContext:undefined};
 const storage={getItem:k=>values[k]||null,setItem:(k,v)=>{values[k]=v;}};
 vm.runInNewContext(code,{window:root,document:doc,localStorage:storage,console,Date,Math,Float32Array});
 return {sfx:root.SoundFX,events,attrs,control,icon,label,values,doc,get created(){return created;},get started(){return makePlay;},get stopped(){return stopped;},get gainSet(){return gainSet;}};
}
const key='weiqi-memory-v2-sound-effects';
const first=harness({},true);
assert.equal(first.sfx.enabled,true);assert.equal(first.attrs['aria-pressed'],'true');
assert.equal(first.sfx.play('stone'),true);assert.equal(first.created,1);
assert(first.started>0,'stone makes nodes start');
assert.equal(first.sfx.play('capture'),true);assert(first.started>3);
first.events.click();assert.equal(first.sfx.enabled,false);assert.equal(first.icon.textContent,'🔕');
const muted=first.started;assert.equal(first.sfx.play('finish'),false);assert.equal(first.started,muted);
assert.equal(first.values[key],'off');
first.events.click();assert.equal(first.sfx.enabled,true);assert.equal(first.values[key],'on');
assert(first.started>muted,'switching back on previews a quiet sound');
first.doc.hidden=true;assert.equal(first.sfx.play('hint'),false,'background should remain silent');
assert.equal(first.gainSet>0,true);
const restored=harness({[key]:'off'},true);assert.equal(restored.sfx.enabled,false);
assert.equal(restored.sfx.play('stone'),false);assert.equal(restored.created,0,'off does not create an audio context');
const fallback=harness({},false);assert.equal(fallback.sfx.supported,false);assert.equal(fallback.sfx.play('stone'),false);
assert(!/fetch\(|XMLHttpRequest|https?:\/\//.test(code),'audio must not require network');
console.log('PASS independent voice/sfx controls, events, persistence, mute, background, unsupported WebView, offline effects');
