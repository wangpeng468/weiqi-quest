/* Bundled-button speech: all clips are local APK files. No speech API or network. */
(()=>{
'use strict';
const clips=window.VOICE_FILES,KEY='weiqi-memory-v2-button-voice';
const control=document.getElementById('voiceToggle'),icon=document.getElementById('voiceIcon'),label=document.getElementById('voiceLabel');
let enabled=true;try{enabled=localStorage.getItem(KEY)!=='off';}catch(e){}
const player=new Audio();player.preload='none';const bridge=window.GoAndroid;const nativeVoice=!!(bridge&&typeof bridge.playVoice==='function');let lastKey='',lastTime=0,serial=0,spoken=0,lastError='';
const normalize=s=>String(s||'').replace(/[^\u4e00-\u9fffA-Za-z0-9]/g,'');
function update(){control.setAttribute('aria-pressed',String(enabled));control.setAttribute('aria-label',enabled?'关闭按钮语音':'打开按钮语音');control.title=enabled?'点击关闭按钮语音':'点击打开按钮语音';icon.textContent=enabled?'🔊':'🔇';label.textContent=enabled?'语音开':'语音关';}
function stop(){serial++;if(nativeVoice){try{bridge.stopVoice();}catch(e){}}player.pause();try{player.currentTime=0;}catch(e){} }
function say(text,force=false){if(!enabled&&!force)return false;let key=normalize(text);if(!clips[key])return false;const now=Date.now();if(key===lastKey&&now-lastTime<90)return true;stop();lastKey=key;lastTime=now;lastError='';spoken++;if(nativeVoice){try{if(bridge.playVoice(clips[key].split('/').pop()))return true;}catch(e){lastError=String(e);}}player.src=clips[key];const token=serial;const p=player.play();if(p&&p.catch)p.catch(e=>{if(token!==serial)return;lastError=e.name||'播放失败';console.warn('本地按钮语音播放失败',e);});return true;}
function setEnabled(on,announce=true){enabled=!!on;try{localStorage.setItem(KEY,enabled?'on':'off');}catch(e){}if(!enabled)stop();update();if(enabled&&announce)say('语音已开启');}
control.addEventListener('click',()=>setEnabled(!enabled));
function buttonText(el){if(el.matches('.level-card'))return el.querySelector('strong')?.textContent||'';return el.getAttribute('data-say')||el.textContent||'';}
document.addEventListener('click',event=>{
 const el=event.target.closest('button,summary,label.file-button,[data-read-name]');
 if(!el||el===control||el.id==='soundToggle'||el.disabled||!enabled)return;
 const text=buttonText(el);
 if(!say(text)&&(el.matches('.level-card')||el.hasAttribute('data-read-name')))say('打开棋谱');
},true);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
update();
window.ButtonVoice={say,stop,setEnabled,buttonText,normalize,has:text=>!!clips[normalize(text)],get enabled(){return enabled;},get count(){return Object.keys(clips).length;},get lastKey(){return lastKey;},get spoken(){return spoken;},get paused(){return nativeVoice?!bridge.isVoicePlaying():player.paused;},get lastError(){return lastError;},get duration(){return nativeVoice?bridge.voiceDurationMs()/1000:player.duration;}};
})();
