"""Desktop Chromium, APK subresources served by test interception, simulated Android bridge.
Not an Android runtime test. Top-level navigation is disabled by this environment's
browser policy: the harness uses set_content + a test-only base URL/CSP host.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import zipfile,mimetypes,json,time,re,base64,hashlib
R=Path(__file__).parent; APK=next((R/'dist').glob('*.apk'));Z=zipfile.ZipFile(APK);OUT=R/'tests-repair';OUT.mkdir(exist_ok=True)
ORIGIN='https://appassets.androidplatform.net';BASE=ORIGIN+'/assets/'
HTML=Z.read('assets/index.html').decode()
TESTHTML=HTML.replace("'self'","'self' "+ORIGIN).replace("base-uri 'none'","base-uri "+ORIGIN).replace('<script src="boot.js">','<base href="'+BASE+'"><script src="boot.js">')
REPORT={'environment':'Desktop Chromium forced offline. APK resource interception; top-level set_content with test-only base/CSP. Android bridge, localStorage and persistence are mocked. No real Android runtime/emulator available.','realAndroidTested':False}
MOCK='''seed=>{
const m=Object.assign({},seed||{});const storage={getItem(k){return Object.prototype.hasOwnProperty.call(m,k)?m[k]:null;},setItem(k,v){m[k]=String(v);},removeItem(k){delete m[k];},key(i){return Object.keys(m)[i]||null;},get length(){return Object.keys(m).length;}};
Object.defineProperty(window,'localStorage',{value:storage,configurable:true});window.mockStore=m;window.nativeEvents=[];window.nativeReady=false;window.nativeErrors=[];window.lastExport=null;
window.GoAndroid={loadProgress(){return m['native-progress']||'';},saveProgress(v){m['native-progress']=v;return true;},loadDocuments(){return m['native-documents']||'[]';},saveDocuments(v){m['native-documents']=v;return true;},ready(){nativeReady=true;nativeEvents.push('ready');},reportError(e){nativeErrors.push(e);},exportFile(name,text,mime){window.lastExport={name,text,mime};return true;}};
}'''
NATIVEVOICE='''()=>{window.nativeAudio={sequence:0,playing:false,last:'',duration:2000};GoAndroid.playVoice=f=>{nativeAudio.sequence++;nativeAudio.last=f;nativeAudio.playing=true;return true;};GoAndroid.stopVoice=()=>{nativeAudio.sequence++;nativeAudio.playing=false;};GoAndroid.isVoicePlaying=()=>nativeAudio.playing;GoAndroid.voiceDurationMs=()=>nativeAudio.duration;}'''
def wait(page,s,timeout=10):
 end=time.monotonic()+timeout
 while time.monotonic()<end:
  if page.evaluate(s):return
  page.wait_for_timeout(40)
 raise AssertionError('wait failed: '+s)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
 ctx=browser.new_context(viewport={'width':1280,'height':800},offline=True)
 requests=[];external=[];errors=[];failure={}
 def serve(route):
  u=route.request.url;requests.append(u)
  if not u.startswith(BASE):external.append(u);route.abort();return
  name='assets/'+u[len(BASE):].split('?')[0]
  if failure.get('file')==name:route.fulfill(status=404,body='test: missing resource');return
  try:data=Z.read(name)
  except KeyError:route.fulfill(status=404,body='missing');return
  typ=mimetypes.guess_type(name)[0] or 'text/plain'
  route.fulfill(status=200,body=data,content_type=typ,headers={'Cache-Control':'no-store','Access-Control-Allow-Origin':'*'})
 ctx.route('**/*',serve)
 def create(seed=None,native_voice=False,compat=False,storage_denied=False,expect_ready=True):
  q=ctx.new_page();q.on('pageerror',lambda e:errors.append(str(e)))
  q.evaluate(MOCK,seed or {})
  if native_voice:q.evaluate(NATIVEVOICE)
  if compat:q.evaluate('''()=>{delete Blob.prototype.text;delete Blob.prototype.arrayBuffer;delete Object.entries;delete Object.values;delete Array.prototype.includes;delete String.prototype.padStart;delete Element.prototype.prepend;delete Element.prototype.append;delete Element.prototype.replaceWith;}''')
  if storage_denied:q.evaluate('''()=>{Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new Error('test storage denied');}});}''')
  q.set_content(TESTHTML,wait_until='load')
  if expect_ready:wait(q,'window.GoTrainer && AppBoot.state().ready && window.nativeReady');q.wait_for_timeout(80)
  return q
 page=create()
 initial=list(requests);assert not any('/audio/' in x for x in initial),initial
 REPORT['initialLoad']={'htmlBytes':len(Z.read('assets/index.html')),'initialResourceRequests':len(initial),'allStartupBytes':len(Z.read('assets/index.html'))+sum(len(Z.read('assets/'+u[len(BASE):])) for u in initial),'audioFilesLoadedAtStartup':0,'readyCallback':page.evaluate('nativeReady')}
 assert REPORT['initialLoad']['allStartupBytes']<1100000
 REPORT['catalog']=page.evaluate('({levels:GoTrainer.levels.length,offline:GoTrainer.levels.filter(l=>!!l.game).length,voiceKeys:ButtonVoice.count})');assert REPORT['catalog']=={'levels':548,'offline':548,'voiceKeys':556}
 REPORT['allBuiltinOpened']=page.evaluate('''async()=>{let count=0;for(const l of GoTrainer.levels){await GoTrainer.loadLevel(l.id,{focus:false});if(GoTrainer.current.level.id!==l.id)throw Error(l.id);if(GoTrainer.current.game.boards.length<2)throw Error('board '+l.id);count++;}return count;}''');assert REPORT['allBuiltinOpened']==548
 first=page.evaluate('GoTrainer.levels[0].id');second=page.evaluate('GoTrainer.levels[1].id');classic=page.evaluate('GoTrainer.levels.find(l=>l.group==="classic").id')
 page.evaluate('id=>GoTrainer.loadLevel(id,{focus:false})',first)
 page.click('#forwardLevel');wait(page,'ButtonVoice.duration>0 && !ButtonVoice.paused');assert page.evaluate('GoTrainer.current.level.id')==second
 assert any('/audio/' in x for x in requests)
 page.click('#previousLevel');assert page.evaluate('GoTrainer.current.level.id')==first
 page.click('#voiceToggle');assert page.evaluate('!ButtonVoice.enabled && ButtonVoice.paused');spoken=page.evaluate('ButtonVoice.spoken');page.click('#nextMove');assert page.evaluate('ButtonVoice.spoken')==spoken
 seed=page.evaluate('mockStore');page.close();page=create(seed);assert not page.evaluate('ButtonVoice.enabled');page.click('#voiceToggle')
 # Click the rendered board, complete/replay/next and retain best grade.
 page.click('#startTraining')
 while page.evaluate('GoTrainer.mode')=='training':
  pt=page.evaluate('''()=>{let t=GoTrainer,c=t.current,m=c.game.moves[c.start+t.at],g=t.geometry,r=document.querySelector('#board').getBoundingClientRect();return {p:m.p,x:r.x+(g.margin+(m.p%g.n-g.x0)*g.step)/600*r.width,y:r.y+(g.margin+(Math.floor(m.p/g.n)-g.y0)*g.step)/600*r.height};}''')
  if pt['p']<0:page.click('#pass')
  else:page.mouse.click(pt['x'],pt['y'])
 assert page.evaluate('id=>GoTrainer.state.records[id].bestStars',first)==3
 page.click('#nextLevel');assert page.evaluate('GoTrainer.current.level.id')==second
 page.click('#previousLevel');page.click('#startTraining');page.click('#hint')
 page.evaluate('''()=>{while(GoTrainer.mode==='training'){const t=GoTrainer,c=t.current;t.attempt(c.game.moves[c.start+t.at].p);}}''')
 assert page.evaluate('id=>GoTrainer.state.records[id].bestStars',first)==3
 assert page.evaluate('id=>GoTrainer.state.records[id].passes',first)==2
 REPORT['navigationAndGrades']='pass'
 # All controls remain to the right of board; all relevant screens fit.
 layouts=[]
 def inspect(w,h,mode):
  data=page.evaluate('''()=>{let el=document.querySelector('#board'),b=el.getBoundingClientRect();let keys=['html','body','main','#practice','.lesson-card','.lesson-actions'];return {b:{x:b.x,y:b.y,w:b.width,h:b.height,r:b.right,bot:b.bottom},sizes:keys.map(s=>{let e=document.querySelector(s);return {key:s,h:e.clientHeight,sh:e.scrollHeight,w:e.clientWidth,sw:e.scrollWidth};}),controls:[...document.querySelectorAll('#practice button,#practice input')].filter(e=>e.getClientRects().length).map(e=>{let r=e.getBoundingClientRect();return {id:e.id,x:r.x,y:r.y,r:r.right,b:r.bottom};})};}''')
  b=data['b'];assert b['x']>=0 and b['y']>=0 and b['r']<=w+1 and b['bot']<=h+1 and abs(b['w']-b['h'])<1
  for z in data['sizes']:assert z['sh']<=z['h']+2 and z['sw']<=z['w']+2,(w,h,mode,z)
  for z in data['controls']:assert z['x']>=b['r']-1 and z['r']<=w+1 and z['y']>=0 and z['b']<=h+1,(w,h,mode,z,b)
  layouts.append({'width':w,'height':h,'mode':mode,'boardSide':b['w'],'fit':True})
 for w,h in [(800,480),(960,540),(800,600),(1024,600),(1024,768),(1280,720),(1280,800),(1440,900),(1920,1200),(2048,1536)]:
  page.set_viewport_size({'width':w,'height':h});page.evaluate('id=>GoTrainer.loadLevel(id,{focus:false})',classic);page.wait_for_timeout(80);inspect(w,h,'preview')
  page.click('#startTraining');page.wait_for_timeout(40);inspect(w,h,'training')
  page.evaluate('''()=>{while(GoTrainer.mode==='training'){const t=GoTrainer,c=t.current;t.attempt(c.game.moves[c.start+t.at].p);}}''');page.wait_for_timeout(40);inspect(w,h,'complete')
  page.click('#chooseLevel');page.wait_for_timeout(80)
  assert page.evaluate('document.documentElement.scrollHeight===innerHeight && document.querySelector("#pageNext").getBoundingClientRect().bottom<=innerHeight')
  layouts.append({'width':w,'height':h,'mode':'levels','fit':True})
  a=page.locator('.level-card').first.get_attribute('data-level');page.click('#pageNext');assert page.locator('.level-card').first.get_attribute('data-level')!=a
  page.click('#pagePrev');assert page.locator('.level-card').first.get_attribute('data-level')==a
 REPORT['layout']=layouts
 page.set_viewport_size({'width':1280,'height':800});page.evaluate('id=>GoTrainer.loadLevel(id,{focus:false})',classic);page.click('#startTraining');page.evaluate('GoTrainer.attempt(GoTrainer.current.game.moves[GoTrainer.current.start].p)')
 seed=page.evaluate('mockStore');page.close();page=create(seed);assert page.evaluate('GoTrainer.at')==1 and page.evaluate('GoTrainer.mode')=='training'
 REPORT['simulatedPreviousProgressAndSessionRestore']='pass'
 page.click('[data-tab=library]');page.click('#exportBackup');backup=page.evaluate('lastExport');assert json.loads(backup['text'])['app']=='weiqi-memory-trainer'
 page.set_input_files('#sgfFiles',{'name':'老师三手棋.sgf','mimeType':'application/x-go-sgf','buffer':b'(;GM[1]SZ[13];B[cc];W[kk];B[ck])'});wait(page,'GoTrainer.levels.length===549')
 page.set_input_files('#backupFile',{'name':'progress.json','mimeType':'application/json','buffer':backup['text'].encode()});wait(page,'document.getElementById("backupStatus").textContent.includes("已合并")')
 docs=page.evaluate('JSON.parse(mockStore["native-documents"])');assert len(docs)==1
 page.evaluate('lastExport=null');page.click('#exportOffline');wait(page,'window.lastExport && lastExport.mime.startsWith("text/html")',timeout=30)
 exported=page.evaluate('lastExport.text');assert len(exported)>20000000 and 'data:audio/mpeg;base64' in exported and '<script src=' not in exported
 (OUT/'exported-test.html').write_text(exported)
 REPORT['SGFImportJSONRestoreAndSelfContainedExport']='pass'
 seed=page.evaluate('mockStore');page.close()
 # Polyfills and native backup read despite disabled browser storage.
 page=create(seed,native_voice=True,compat=True,storage_denied=True);assert page.evaluate('GoTrainer.levels.length')==549
 assert page.evaluate('Object.entries({a:1})[0][0]')=='a'
 page.click('#chooseLevel');assert page.evaluate('nativeAudio.last.endsWith(".mp3")');assert not page.evaluate('ButtonVoice.paused')
 page.click('#voiceToggle');assert page.evaluate('ButtonVoice.paused');voiceCount=page.evaluate('nativeAudio.sequence');page.click('#pageNext');assert page.evaluate('nativeAudio.sequence')==voiceCount
 page.click('#voiceToggle');page.click('#pagePrev');assert page.evaluate('nativeAudio.playing')
 REPORT['nativeMediaBridgeMockAndStorageFallback']='pass';page.close()
 # Failure injection retains existing progress and reports exact cause.
 badSeed={'native-progress':'{ broken json }'};page=create(badSeed,expect_ready=False);wait(page,'window.nativeErrors.length>0');assert page.evaluate('mockStore["native-progress"]')==badSeed['native-progress'];assert not page.evaluate('nativeReady');assert page.locator('#startupNotice').is_visible();REPORT['invalidProgressNotOverwritten']='pass';page.screenshot(path=str(OUT/'diagnostic-js-example.png'));page.close()
 failure['file']='assets/engine.js';page=create(seed,expect_ready=False);wait(page,'window.nativeErrors.length>0');assert not page.evaluate('nativeReady');assert 'engine.js' in page.evaluate('AppBoot.state().message');REPORT['missingResourceErrorVisible']='pass';page.close();failure.clear()
 # Exported offline HTML can start independently; all resources truly inline.
 page=ctx.new_page();page.evaluate(MOCK,{});before=len(requests);page.set_content(exported,wait_until='load');wait(page,'window.GoTrainer && AppBoot.state().ready');assert page.evaluate('GoTrainer.levels.length')==549;assert len(requests)==before;page.close()
 # Final screenshot from new APK assets, selected familiar board.
 page=create(seed);page.evaluate('id=>GoTrainer.loadLevel(id,{focus:false})',classic)
 for _ in range(8):page.click('#nextMove')
 page.screenshot(path=str(OUT/'repair-1280x800.png'));page.close()
 # Only intentionally injected startup errors are allowed.
 unexpected=[e for e in errors if '本地记录解析失败' not in e and 'GoEngine is not defined' not in e]
 assert not unexpected,unexpected;assert not external,external
 REPORT['unexpectedJavascriptErrors']=unexpected;REPORT['externalNetworkRequests']=external;REPORT['expectedInjectedErrors']=len(errors)-len(unexpected)
 REPORT['browserAudioLocalMP3Playback']='pass'
 (R/'repair-test-results.json').write_text(json.dumps(REPORT,ensure_ascii=False,indent=2))
 print(json.dumps({k:v for k,v in REPORT.items() if k!='layout'},ensure_ascii=False,indent=2));print('layout checks',len(layouts))
 browser.close()
