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

 p=new(); samples=json.loads((R/'demo-auto-games.json').read_text())
 for i,s in enumerate(samples):
  g=s['state']; raw={'version':1,'n':9,'human':s['human'],'difficulty':s['difficulty'],'phase':'judging','dead':[],'result':None,'id':'demo-game-'+str(i),'updatedAt':'2026-11-14T23:00:0'+str(i)+'.000Z','passes':g['passes'],'moves':[{'p':m['p'],'c':m['c']} for m in g['moves']]}
  p.click('[data-tab=practice]');p.evaluate('raw=>GoBattle.importProgress({battle:raw})',raw);p.click('[data-tab=battle]');wait(p,"GoBattle.phase==='finished'")
  if i==0:p.screenshot(path='/mnt/data/围棋背谱闯关_v2.8_自动结算预览.png')
 p.click('#battleOpenRecords');p.wait_for_timeout(100);p.screenshot(path='/mnt/data/围棋背谱闯关_v2.8_对战记录预览.png');browser.close()
