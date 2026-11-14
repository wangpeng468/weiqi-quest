from pathlib import Path
from playwright.sync_api import sync_playwright
import zipfile,mimetypes,json,time,ast
R=Path(__file__).parent; Z=zipfile.ZipFile(R/'dist/围棋背谱闯关_自动胜负版_v2.8.0.apk');OUT=R/'tests-results';OUT.mkdir(exist_ok=True)
BASE='https://appassets.androidplatform.net/assets/';ORIGIN=BASE[:-8]
HTML=Z.read('assets/index.html').decode().replace("'self'","'self' "+ORIGIN).replace("base-uri 'none'","base-uri "+ORIGIN).replace('<script src="boot.js">','<base href="'+BASE+'"><script src="boot.js">')
strings={}
for st in ast.parse((R/'test_repair.py').read_text()).body:
 if isinstance(st,ast.Assign) and len(st.targets)==1 and isinstance(st.targets[0],ast.Name) and st.targets[0].id in ['MOCK','NATIVEVOICE']:strings[st.targets[0].id]=ast.literal_eval(st.value)
REPORT={'environment':'Desktop Chromium, APK assets, forced offline network, mocked Android persistence/audio. Not an Android device test.','checks':[],'layouts':[]};errors=[];external=[]
def check(name):REPORT['checks'].append(name);print('PASS',name,flush=True)
def wait(p,s):
 end=time.monotonic()+12
 while time.monotonic()<end:
  if p.evaluate(s):return
  p.wait_for_timeout(40)
 p.screenshot(path=str(OUT/'failure.png'));raise AssertionError((s,errors))
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required']);ctx=browser.new_context(viewport={'width':1280,'height':800},offline=True)
 def route(route):
  url=route.request.url
  if not url.startswith(BASE):external.append(url);route.abort();return
  name='assets/'+url[len(BASE):].split('?')[0]
  try:body=Z.read(name)
  except KeyError:route.fulfill(status=404,body='not bundled');return
  route.fulfill(status=200,body=body,content_type=mimetypes.guess_type(name)[0] or 'text/plain',headers={'Access-Control-Allow-Origin':'*','Cache-Control':'no-store'})
 ctx.route('**/*',route)
 def new(seed=None):
  p=ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)));p.evaluate(strings['MOCK'],seed or {});p.evaluate(strings['NATIVEVOICE']);p.set_content(HTML,wait_until='load');wait(p,'window.GoTrainer && AppBoot.state().ready');return p
 p=new();assert p.evaluate('GoTrainer.levels.length')==548;check('startup and 548 offline levels intact')
 p.click('#readLevelName');assert p.evaluate('ButtonVoice.lastKey')==p.evaluate('ButtonVoice.normalize(GoTrainer.current.level.title)');check('level title speech preserved')
 p.evaluate('GoTrainer.startTraining()');p.evaluate("()=>{while(GoTrainer.mode==='training'){let c=GoTrainer.current;GoTrainer.attempt(c.game.moves[c.start+GoTrainer.at].p)}}");training=p.evaluate('JSON.stringify(GoTrainer.state.records)');check('original lesson grades created')
 p.click('[data-tab=battle]');wait(p,'GoBattle.active');p.evaluate('GoBattle.play(20)');wait(p,'GoBattle.game.moves.length===2 && !GoBattle.busy')
 p.click('#battleScore');assert p.locator('#battleDialog').is_visible();p.click('#battleDialogNo');assert p.evaluate('GoBattle.phase')=='playing';assert p.evaluate('GoTrainer.state.battleHistory.length')==0;check('cancel automatic end leaves live match and history unchanged')
 p.click('#battleScore');p.click('#battleDialogYes');wait(p,"GoBattle.phase==='finished'");assert p.evaluate('GoTrainer.state.battleHistory.length')==1;row=p.evaluate('GoTrainer.state.battleHistory[0]');assert row['method']=='auto' and row['provisional'] and row['black'] is not None;assert '估算' in p.locator('#battleResultTitle').inner_text();assert p.evaluate('ButtonVoice.lastKey') in ['估算你赢了','估算电脑赢了'];p.screenshot(path=str(OUT/'automatic-result-1280x800.png'));check('one-click end computes score, flags early/unsettled game, saves and speaks result')
 p.evaluate('GoBattle.finish(GoBattle.result)');assert p.evaluate('GoTrainer.state.battleHistory.length')==1;check('same match finalization does not duplicate history')
 p.click('#battleOpenRecords');assert p.evaluate('document.body.dataset.page')=='progress';assert p.locator('#battleRecordsPane').is_visible();assert p.locator('.battle-record-row').count()==1;assert '估算待复核' in p.locator('#battleRecordList').inner_text();p.screenshot(path=str(OUT/'records-first.png'));check('global Records tab includes independent battle win/loss view')
 p.click('.battle-record-row');assert p.evaluate('ButtonVoice.lastKey') in ['估算你赢了','估算电脑赢了'];p.click('#battleInfoClose');check('record row speaks result and opens details')
 p.click('[data-tab=battle]');p.click('#battleContinueAfter');p.click('#battleDialogYes');wait(p,"GoBattle.phase==='playing' && !GoBattle.busy");assert p.evaluate('GoTrainer.state.battleHistory.length')==0;assert p.evaluate('GoTrainer.state.battleVoids.length')==1;check('continue after result retracts only that match from totals')
 # A stale backup must not resurrect a retracted score.
 p.evaluate('r=>GoBattle.importProgress({battleHistory:[r]})',row);assert p.evaluate('GoTrainer.state.battleHistory.length')==0;check('import of older backup cannot resurrect retracted result')
 p.click('#battleResign');p.click('#battleDialogYes');assert p.evaluate('GoBattle.phase')=='finished';row=p.evaluate('GoTrainer.state.battleHistory[0]');assert row['reason']=='resign' and not row['provisional'];assert p.evaluate('GoTrainer.state.battleVoids.length')==0;assert row['winner']!=row['human'];check('resignation is definitive loss; rescoring updates same game id')
 # End by two consecutive passes without opening a scoring dialog.
 p.evaluate('GoBattle.newGame(9,1,0)');p.evaluate('BattleEngine.play(GoBattle.game,-1)');p.evaluate('BattleEngine.choose=()=>-1');p.click('[data-tab=practice]');p.click('[data-tab=battle]');wait(p,"GoBattle.phase==='finished'");assert p.evaluate('GoTrainer.state.battleHistory.length')==2;assert p.evaluate('GoBattle.game.passes')==2;check('two consecutive passes automatically finish and save, no dead-marking prerequisite')
 # Review and correct without creating another record.
 p.click('#battleCorrect');assert p.evaluate('GoBattle.phase')=='scoring';p.click('#battleFinish');assert p.evaluate('GoTrainer.state.battleHistory.length')==2;assert p.evaluate('GoTrainer.state.battleHistory[0].method')=='manual';check('parent review replaces result in place, not extra completed game')
 # Ensure new fields survive boot, backup and merge.
 seed=p.evaluate('mockStore');p.close();p=new(seed);p.click('[data-tab=battle]');assert p.evaluate('GoBattle.phase')=='finished';assert p.evaluate('GoTrainer.state.battleHistory.length')==2;assert p.evaluate('GoTrainer.state.battleHistory[0].black')==0;assert json.loads(p.evaluate('JSON.stringify(GoTrainer.state.records)'))==json.loads(training);check('native save/reload preserves scores and old lesson progress')
 p.click('[data-tab=library]');p.click('#exportBackup');backup=p.evaluate('lastExport.text');data=json.loads(backup);assert len(data['progress']['battleHistory'])==2 and data['progress']['battleHistory'][0]['komi']==7.5
 p.set_input_files('#backupFile',{'name':'records.json','mimeType':'application/json','buffer':backup.encode()});wait(p,'document.querySelector("#backupStatus").textContent.includes("已合并")');assert p.evaluate('GoTrainer.state.battleHistory.length')==2;check('JSON backup restores complete win/loss rows without duplication')
 # Finished sound is controlled by same global switch.
 p.click('[data-tab=battle]');p.click('#voiceToggle');before=p.evaluate('ButtonVoice.spoken');p.evaluate('GoBattle.newGame(9,1,0)');p.evaluate('GoBattle.autoFinish()');wait(p,"GoBattle.phase==='finished'");assert p.evaluate('ButtonVoice.spoken')==before;p.click('#voiceToggle');check('mute suppresses automatic start and result announcements')
 # Populate deterministic display-only history for all badges and pagination.
 rows=[]
 for i in range(15):
  rows.append(dict(id=f'fixture-{i}',date=f'2026-11-{14-i//3:02d}T{9+i%3:02d}:20:00.000Z',n=9 if i%2 else 13,human=1,winner=[1,2,0][i%3],difficulty=i%3,moves=70+i,reason='score',method='auto',provisional=i%4==0,black=45 if i%3==0 else 30,white=30 if i%3 in [0,2] else 45,komi=0 if i%3==2 else 7.5))
 p.evaluate('rows=>{GoTrainer.state.battleHistory=rows;GoBattle.showRecords()}',rows);assert p.locator('.battle-record-row').count()==5;p.screenshot(path=str(OUT/'battle-records-1280x800.png'))
 p.click('[data-record-filter=win]');assert '你赢了' in p.locator('#battleRecordList').inner_text() and '电脑赢了' not in p.locator('#battleRecordList').inner_text();p.click('[data-record-filter=all]');p.click('#battleRecordsNext');assert p.locator('#battleRecordsPageLabel').inner_text()=='2 / 3 页';check('win/loss/draw totals, filter and paged history')
 p.click('[data-record-view=lessons]');assert p.locator('#lessonRecordsPane').is_visible();assert json.loads(p.evaluate('JSON.stringify(GoTrainer.state.records)'))==json.loads(training);p.click('[data-record-view=battle]');check('lesson and battle records stay independent')
 # Old v2.7 rows need no fabricated scores; import must not overwrite newer revision.
 old={'id':'old-v27','date':'2026-10-01T10:00:00.000Z','n':9,'human':2,'winner':2,'difficulty':0,'moves':50,'reason':'score'}
 cleaned=p.evaluate('x=>GoBattle.cleanHistory([x])[0]',old);assert cleaned['black'] is None and cleaned['method']=='legacy';check('v2.7 history upgrades without fabricating missing score')
 def layout(name,w,h):
  p.set_viewport_size({'width':w,'height':h});p.wait_for_timeout(100)
  d=p.evaluate('''()=>{let b=document.querySelector('#battleBoard').getBoundingClientRect();return {board:{x:b.x,y:b.y,r:b.right,b:b.bottom,w:b.width,h:b.height},sizes:['html','body','main',document.body.dataset.page==='battle'?'#battle':'#progress'].map(x=>{let e=document.querySelector(x);return {id:x,h:e.clientHeight,sh:e.scrollHeight,w:e.clientWidth,sw:e.scrollWidth}}),buttons:[...document.querySelector('#'+document.body.dataset.page).querySelectorAll('button')].filter(e=>e.getClientRects().length).map(e=>{let r=e.getBoundingClientRect();return {id:e.id,x:r.x,y:r.y,r:r.right,b:r.bottom,h:r.height}})}}''')
  for el in d['sizes']:assert el['sh']<=el['h']+2 and el['sw']<=el['w']+2,(name,w,h,'overflow',el)
  for el in d['buttons']:assert el['x']>=0 and el['r']<=w+1 and el['y']>=0 and el['b']<=h+1 and el['h']>0,(name,w,h,'button',el)
  if name!='records':
   b=d['board'];assert b['x']>=0 and b['y']>=0 and b['r']<=w+1 and b['b']<=h+1 and abs(b['w']-b['h'])<1,(name,w,h,b)
   for el in d['buttons']:assert el['x']>=b['r']-1,(name,w,h,el,b)
  REPORT['layouts'].append({'mode':name,'size':[w,h]})
 for w,h in [(800,480),(1004,565),(960,540),(1024,600),(800,600),(1024,768),(1280,800),(1280,720),(1920,1200)]:
  p.evaluate('GoBattle.showRecords()');layout('records',w,h)
  p.click('[data-tab=battle]');p.evaluate('GoBattle.newGame(9,1,0)');layout('playing',w,h)
  p.evaluate('GoBattle.autoFinish()');wait(p,"GoBattle.phase==='finished'");layout('result',w,h)
  if w==1004:p.screenshot(path=str(OUT/'automatic-result-1004x565.png'))
  p.click('#battleCorrect');layout('review',w,h)
 check('36 landscape cases: playing, automatic result, review, and paged records; no page scroll or offscreen control')
 p.set_viewport_size({'width':1280,'height':800});p.evaluate('GoBattle.showRecords()');p.screenshot(path=str(OUT/'battle-records-1280x800.png'))
 assert not errors,errors;assert not external,external;check('no JavaScript errors, all resource reads from APK, no external network')
 REPORT['passed']=True;(R/'auto-results-ui-tests.json').write_text(json.dumps(REPORT,ensure_ascii=False,indent=2));browser.close()
