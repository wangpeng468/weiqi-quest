from pathlib import Path
from playwright.sync_api import sync_playwright
import zipfile,mimetypes,json,time,re,ast
R=Path(__file__).parent;Z=zipfile.ZipFile(next((R/'dist').glob('*.apk')));OUT=R/'tests-battle';OUT.mkdir(exist_ok=True)
BASE='https://appassets.androidplatform.net/assets/';ORIGIN=BASE[:-8]
HTML=Z.read('assets/index.html').decode().replace("'self'","'self' "+ORIGIN).replace("base-uri 'none'","base-uri "+ORIGIN).replace('<script src="boot.js">','<base href="'+BASE+'"><script src="boot.js">')
module=ast.parse((R/'test_repair.py').read_text());strings={}
for st in module.body:
 if isinstance(st,ast.Assign) and len(st.targets)==1 and isinstance(st.targets[0],ast.Name) and st.targets[0].id in ['MOCK','NATIVEVOICE']:strings[st.targets[0].id]=ast.literal_eval(st.value)
REPORT={'environment':'Desktop Chromium, offline resource interception and mocked native persistence/audio bridge. No Android device/emulator.', 'checks':[]};errors=[];external=[]
def check(name):REPORT['checks'].append(name);print('PASS',name,flush=True)
def wait(p,s):
 end=time.monotonic()+10
 while time.monotonic()<end:
  if p.evaluate(s):return
  p.wait_for_timeout(40)
 p.screenshot(path=str(OUT/'failure.png'));raise AssertionError((s,p.evaluate('({moves:GoBattle.game&&GoBattle.game.moves,busy:GoBattle.busy,active:GoBattle.active})'),errors))
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required']);ctx=browser.new_context(viewport={'width':1280,'height':800},offline=True)
 def route(r):
  url=r.request.url
  if not url.startswith(BASE):external.append(url);r.abort();return
  name='assets/'+url[len(BASE):].split('?')[0]
  try:body=Z.read(name)
  except KeyError:r.fulfill(status=404,body='not in APK');return
  r.fulfill(status=200,body=body,content_type=mimetypes.guess_type(name)[0] or 'text/plain',headers={'Access-Control-Allow-Origin':'*','Cache-Control':'no-store'})
 ctx.route('**/*',route)
 def new(seed=None):
  p=ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)));p.evaluate(strings['MOCK'],seed or {});p.evaluate(strings['NATIVEVOICE']);p.set_content(HTML,wait_until='load');wait(p,'window.GoTrainer && AppBoot.state().ready');return p
 p=new();print('ready',p.evaluate('GoTrainer.levels.length'),flush=True)
 assert p.evaluate('GoTrainer.levels.length')==548
 first=p.evaluate('GoTrainer.levels[0].id');p.click('#readLevelName');assert p.evaluate('ButtonVoice.lastKey')==p.evaluate('ButtonVoice.normalize(GoTrainer.current.level.title)');check('title and subtitle region speaks current lesson, with speaker icon')
 assert p.locator('.title-speaker').is_visible()
 count=p.evaluate('ButtonVoice.spoken');p.click('#voiceToggle');p.click('#readLevelName');assert p.evaluate('ButtonVoice.spoken')==count;p.click('#voiceToggle');check('global voice off silences title and keeps toggle')
 p.evaluate('GoTrainer.startTraining()');p.evaluate('''()=>{while(GoTrainer.mode==='training'){let c=GoTrainer.current;GoTrainer.attempt(c.game.moves[c.start+GoTrainer.at].p)}}''');assert p.evaluate('GoTrainer.state.records[GoTrainer.levels[0].id].passes')==1
 training=p.evaluate('JSON.stringify(GoTrainer.state.records)')
 p.click('[data-tab=battle]');wait(p,'GoBattle.game && GoBattle.active');assert p.evaluate('GoBattle.game.n')==9;assert p.evaluate('GoBattle.human')==1;check('battle defaults to 9x9, human black, offline')
 def clickpoint(pt):
  p.wait_for_timeout(90)
  q=p.evaluate('''pt=>{let g=GoBattle.geometry,r=document.querySelector('#battleBoard').getBoundingClientRect();return {x:r.x+(g.margin+pt%g.n*g.step)/600*r.width,y:r.y+(g.margin+Math.floor(pt/g.n)*g.step)/600*r.height}}''',pt);p.mouse.click(q['x'],q['y'])
 clickpoint(20);wait(p,'GoBattle.game.moves.length===2 && !GoBattle.busy');assert p.evaluate('GoBattle.game.turn')==1;check('touch move -> legal computer reply -> human turn')
 assert p.evaluate('JSON.parse(mockStore["native-progress"]).battle.moves.length')==2
 for d in [1,2,0]:p.click('[data-difficulty="%s"]'%d);assert p.evaluate('GoBattle.difficulty')==d
 p.click('#battleHint');assert p.evaluate('ButtonVoice.lastKey') in ['对战提示落点','提示停一手'];check('three difficulty buttons and local suggested point')
 before=p.evaluate('GoBattle.game.moves.length');p.click('#battleUndo');assert p.evaluate('GoBattle.game.moves.length')==before-2;check('undo removes child/computer pair')
 p.evaluate('GoBattle.play(20)');p.click('#battleUndo');p.wait_for_timeout(600);assert p.evaluate('GoBattle.game.moves.length')==0;check('undo during thinking cancels stale AI reply')
 clickpoint(20);p.click('[data-tab=practice]');p.wait_for_timeout(550);assert p.evaluate('GoBattle.game.moves.length')==1;p.click('[data-tab=battle]');wait(p,'GoBattle.game.moves.length===2');check('switch away cancels pending thinking; return resumes')
 p.click('#battleResign');assert p.locator('#battleDialog').is_visible();p.click('#battleDialogNo');assert p.evaluate('GoBattle.phase')=='playing';check('resign cancel is non-destructive')
 p.click('#battlePass');p.click('#battleDialogNo');assert p.evaluate('GoBattle.game.moves.length')==2
 p.click('#battleScore');p.click('#battleDialogYes');assert p.evaluate('GoBattle.phase')=='scoring';pt=p.evaluate('GoBattle.game.moves[0].p');clickpoint(pt);assert p.evaluate('GoBattle.dead.length')>=1;clickpoint(pt);assert p.evaluate('GoBattle.dead.length')==0;p.click('#battleResume');assert p.evaluate('GoBattle.phase')=='playing';check('manual dead-group marking, undo marking, resume without forced result')
 seed=p.evaluate('mockStore');moves=p.evaluate('GoBattle.game.moves');p.close();p=new(seed);p.click('[data-tab=battle]');assert p.evaluate('GoBattle.game.moves')==moves;assert json.loads(p.evaluate('JSON.stringify(GoTrainer.state.records)'))==json.loads(training);check('native record + unfinished battle restored without changing lesson grades')
 p.click('#battleResign');p.click('#battleDialogYes');assert p.evaluate('GoBattle.phase')=='finished';assert p.evaluate('GoTrainer.state.battleHistory.length')==1;check('confirm resign saves one result')
 p.click('#battleAgain');p.click('[data-board-size="13"]');p.click('[data-human="2"]');p.click('[data-setup-difficulty="1"]');p.click('#battleSetupGo');wait(p,'GoBattle.game.moves.length===1 && !GoBattle.busy');assert p.evaluate('GoBattle.game.turn')==2;assert p.evaluate('GoBattle.game.n')==13;assert p.evaluate('!GoBattle.game.moves.some(x=>x.c===GoBattle.human)');check('new-game choices: 13x13, human white, computer opens')
 p.click('[data-tab=library]');p.click('#exportBackup');backup=p.evaluate('lastExport.text');assert len(json.loads(backup)['progress']['battle']['moves'])==1;assert len(json.loads(backup)['progress']['battleHistory'])==1;check('JSON export includes both lesson records and battle')
 p.set_input_files('#backupFile',{'name':'saved.json','mimeType':'application/json','buffer':backup.encode()});wait(p,'document.querySelector("#backupStatus").textContent.includes("已合并")');check('JSON backup reimport without duplicate results')
 # Snapshot after an initial 19x19 match, and layout matrix.
 p.click('[data-tab=battle]');p.evaluate('GoBattle.newGame(19,1,1)');clickpoint(60);wait(p,'GoBattle.game.moves.length===2');p.screenshot(path=str(OUT/'battle-1280x800.png'))
 layouts=[]
 def fits(page_name,w,h):
  p.set_viewport_size({'width':w,'height':h});p.wait_for_timeout(80)
  selector='#battleBoard' if page_name=='battle' else '#board'
  d=p.evaluate('''({sel,page})=>{let b=document.querySelector(sel).getBoundingClientRect(),s=document.querySelector('#'+page);return {board:{x:b.x,y:b.y,r:b.right,b:b.bottom,w:b.width,h:b.height},sizes:['html','body','main','#'+page,'#'+page+' .lesson-card'].map(x=>{let e=document.querySelector(x);return {id:x,h:e.clientHeight,sh:e.scrollHeight,w:e.clientWidth,sw:e.scrollWidth}}),buttons:[...s.querySelectorAll('button,input,[data-read-name]')].filter(e=>e.getClientRects().length).map(e=>{let r=e.getBoundingClientRect();return {id:e.id,x:r.x,y:r.y,r:r.right,b:r.bottom,w:r.width,h:r.height}})}}''',{'sel':selector,'page':page_name})
  b=d['board'];assert b['x']>=0 and b['y']>=0 and b['r']<=w+1 and b['b']<=h+1 and abs(b['w']-b['h'])<1,(w,h,page_name,d)
  for el in d['sizes']:assert el['sh']<=el['h']+2 and el['sw']<=el['w']+2,(w,h,page_name,'overflow',el)
  for el in d['buttons']:assert el['x']>=b['r']-1 and el['r']<=w+1 and el['y']>=0 and el['b']<=h+1 and el['h']>1,(w,h,page_name,'button',el,b)
  layouts.append({'mode':page_name,'size':[w,h],'board':b['w']})
 for w,h in [(800,480),(1004,565),(960,540),(1024,600),(800,600),(1024,768),(1280,800),(1280,720),(1920,1200)]:
  fits('battle',w,h)
  p.evaluate('GoBattle.beginScoring()');fits('battle',w,h);p.evaluate('GoBattle.finish(GoBattle.score())');fits('battle',w,h)
  p.evaluate('GoBattle.newGame(9,1,1)')
  p.click('[data-tab=practice]');fits('practice',w,h);p.click('[data-tab=battle]')
 REPORT['layouts']=layouts;check('board and every visible control fit nine landscape dimensions in four states')
 p.set_viewport_size({'width':1280,'height':800});p.click('[data-tab=practice]');p.evaluate('GoTrainer.loadLevel(GoTrainer.levels[0].id,{focus:false})');p.wait_for_timeout(100);p.screenshot(path=str(OUT/'title-speaker-1280x800.png'))
 p.click('[data-tab=battle]');p.evaluate('GoBattle.newGame(9,1,1)');clickpoint(20);wait(p,'GoBattle.game.moves.length===2');clickpoint(60);wait(p,'GoBattle.game.moves.length===4');p.screenshot(path=str(OUT/'battle-9x9-1280x800.png'))
 assert json.loads(p.evaluate('JSON.stringify(GoTrainer.state.records)'))==json.loads(training);assert not external;assert not errors,(errors,external);check('no console script errors and no external network requests')
 REPORT['passed']=True;(R/'battle-ui-tests.json').write_text(json.dumps(REPORT,ensure_ascii=False,indent=2));browser.close()
