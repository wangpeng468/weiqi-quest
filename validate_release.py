from pathlib import Path
from zipfile import ZipFile,ZIP_STORED
import json,hashlib,struct,zlib,re,importlib.util
R=Path(__file__).parent;apk=next((R/'dist').glob('*.apk'));b=apk.read_bytes();spec=importlib.util.spec_from_file_location('pkg',R/'package_apk.py');pkg=importlib.util.module_from_spec(spec);spec.loader.exec_module(pkg);cert=pkg.verify_v2(b)
old=Path('/mnt/data/围棋背谱闯关_普通话B版_启动修复_v2.6.1.apk');assert pkg.verify_v2(old.read_bytes())==cert
z=ZipFile(apk);oz=ZipFile(old);assert z.testzip() is None
names=z.namelist();assert not any(any(s in n.lower() for s in ['private-signing','.pem','.jks','.ttf','.otf','.woff','.onnx']) for n in names)
dex=z.read('classes.dex');assert dex[:4]==b'dex\n';assert struct.unpack_from('<I',dex,8)[0]==zlib.adler32(dex[12:])&0xffffffff;assert dex[12:32]==hashlib.sha1(dex[32:]).digest()
voice=json.loads(z.read('assets/voice-map.js').decode().split('=',1)[1].strip().rstrip(';'))
for path in voice.values():assert 'assets/'+path in names
for info in z.infolist():
 if info.filename.endswith('.mp3'):
  assert info.compress_type==ZIP_STORED
  off=info.header_offset;fn,extra=struct.unpack_from('<HH',b,off+26);assert (off+30+fn+extra)%4==0
old_audio=[n for n in oz.namelist() if n.startswith('assets/audio/')];sgf=[n for n in oz.namelist() if n.startswith('assets/sgf/')]
assert all(oz.read(n)==z.read(n) for n in old_audio+sgf)
# Parse the Android binary XML string pool/events, independently of template values.
mb=z.read('AndroidManifest.xml');pos=8;strings=[];attrs=[];tags=[]
def readlen(data,p):
 n=data[p];return (((n&127)<<8)|data[p+1],p+2) if n&128 else (n,p+1)
while pos<len(mb):
 typ,hs,size=struct.unpack_from('<HHI',mb,pos)
 if typ==1:
  count,styles,flags,start,styleStart=struct.unpack_from('<IIIII',mb,pos+8)
  for i in range(count):
   off=struct.unpack_from('<I',mb,pos+hs+4*i)[0];p=pos+start+off;_,p=readlen(mb,p);ln,p=readlen(mb,p);strings.append(mb[p:p+ln].decode())
 if typ==0x102:
  ns,name,astart,asz,acount=struct.unpack_from('<IIHHH',mb,pos+16);tag=strings[name];tags.append(tag);aa={}
  for i in range(acount):
   off=pos+16+astart+i*asz;ns,key,raw,vs,res,vtyp,val=struct.unpack_from('<IIIHBBI',mb,off);aa[strings[key]]=strings[val] if vtyp==3 else val
  attrs.append((tag,aa))
 pos+=size
manifest=next(a for tag,a in attrs if tag=='manifest');sdk=next(a for tag,a in attrs if tag=='uses-sdk');activity=next(a for tag,a in attrs if tag=='activity')
assert manifest['versionName']=='2.9.1' and manifest['versionCode']==20901 and manifest['package']=='org.weiqi.memory';assert 'uses-permission' not in tags;assert activity['screenOrientation']==6
js_paths=re.findall(r'<script src="([^"]+)"',z.read('assets/index.html').decode());assert all('assets/'+p in names for p in js_paths)
report={'version':manifest['versionName'],'versionCode':manifest['versionCode'],'package':manifest['package'],'apkBytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'v2SignatureVerified':True,'sameCertificateAs261':True,'certificateSha256':cert,'requestedPermissions':[],'sdk':sdk,'orientation':'sensorLandscape','dexChecksums':'pass','old495VoiceClipsUnchanged':True,'old420SGFUnchanged':True,'totalAudioFiles':sum(n.endswith('.mp3') for n in names),'voiceKeys':len(voice),'allLocalAudioPathsPresentAndAligned':True,'privateKeysFontsAndModelsExcluded':True,'allScriptPathsPresent':True,'htmlBytes':len(z.read('assets/index.html')),'realAndroidTested':False}
(R/'release-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False,indent=2))
