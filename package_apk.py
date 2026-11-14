"""Resource/manifest generator and APK v2 signer for the offline personal build.
Keep private-signing confidential; it is NEVER embedded in the APK.
"""
from pathlib import Path
import struct,zipfile,hashlib,datetime,json,io,os
from cryptography.hazmat.primitives.asymmetric import rsa,padding
from cryptography.hazmat.primitives import hashes,serialization
from cryptography import x509
from cryptography.x509.oid import NameOID
P=lambda *v:struct.pack('<'+'I'*len(v),*v)
H=lambda *v:struct.pack('<'+'H'*len(v),*v)
R=Path(__file__).parent
PACKAGE='org.weiqi.memory';VERSION='2.9.2';VERSION_CODE=20902
OUTPUT=R/'dist'/'围棋背谱闯关_原生音效修复版_v2.9.2.apk'
U32=0xffffffff

def chunk(t,h,p=b''):return H(t,8+len(h))+P(8+len(h)+len(p))+h+p

def strings(v):
 data=bytearray();offs=[]
 def leng(n):assert n<32768;return bytes([n]) if n<128 else bytes([0x80|(n>>8),n&255])
 for s in v:
  b=s.encode();offs.append(len(data));data.extend(leng(len(s.encode('utf-16le'))//2)+leng(len(b))+b+b'\0')
 data.extend(b'\0'*(-len(data)%4));return chunk(1,P(len(v),0,0x100,28+4*len(v),0),P(*offs)+data)

ATTR={'label':0x01010001,'icon':0x01010002,'name':0x01010003,'exported':0x01010010,'screenOrientation':0x0101001e,'configChanges':0x0101001f,'minSdkVersion':0x0101020c,'versionCode':0x0101021b,'versionName':0x0101021c,'targetSdkVersion':0x01010270,'allowBackup':0x01010280,'hardwareAccelerated':0x010102d3,'usesCleartextTraffic':0x010104ec}
NS='http://schemas.android.com/apk/res/android'
aa=lambda k,t,v:(k,t,v,NS)
node=lambda n,a=(),kids=():(n,list(a),list(kids))
tree=node('manifest',[('package',3,PACKAGE,None),aa('versionCode',16,VERSION_CODE),aa('versionName',3,VERSION)],[node('uses-sdk',[aa('minSdkVersion',16,26),aa('targetSdkVersion',16,34)]),node('application',[aa('label',3,'围棋背谱闯关'),aa('icon',1,0x7f010000),aa('allowBackup',18,0),aa('usesCleartextTraffic',18,0),aa('hardwareAccelerated',18,1)],[node('activity',[aa('name',3,'.MainActivity'),aa('screenOrientation',16,6),aa('exported',18,1),aa('configChanges',17,0xca0)],[node('intent-filter',[],[node('action',[aa('name',3,'android.intent.action.MAIN')]),node('category',[aa('name',3,'android.intent.category.LAUNCHER')])])])])])

def manifest():
 ss=sorted(ATTR,key=ATTR.get)+['android',NS]
 def add(s):
  if s not in ss:ss.append(s)
 def walk(t):
  name,at,kids=t;add(name)
  for k,typ,v,ns in at:
   add(k)
   if typ==3:add(v)
  for c in kids:walk(c)
 walk(tree);ix={s:i for i,s in enumerate(ss)};out=bytearray(strings(ss));out+=chunk(0x180,b'',P(*(ATTR[s] for s in sorted(ATTR,key=ATTR.get))));common=P(1,U32);out+=chunk(0x100,common,P(ix['android'],ix[NS]))
 def emit(t):
  name,at,kids=t;at=sorted(at,key=lambda a:ATTR.get(a[0],0) if a[3] else 0);p=P(U32,ix[name])+H(20,20,len(at),0,0,0)
  for k,typ,v,ns in at:p+=P(ix[ns] if ns else U32,ix[k],ix[v] if typ==3 else U32)+H(8)+bytes([0,typ])+P(ix[v] if typ==3 else v)
  out.extend(chunk(0x102,common,p))
  for c in kids:emit(c)
  out.extend(chunk(0x103,common,P(U32,ix[name])))
 emit(tree);out+=chunk(0x101,common,P(ix['android'],ix[NS]));return chunk(3,b'',out)

def resources():
 ss=strings(['res/drawable/icon.png']);typ=strings(['drawable']);keys=strings(['icon']);spec=chunk(0x202,bytes([1,0,0,0])+P(1),P(0x40000000));cfg=P(64)+b'\0'*60
 tc=chunk(0x201,bytes([1,0,0,0])+P(1,88)+cfg,P(0)+H(8,2)+P(0)+H(8)+bytes([0,3])+P(0))
 head=P(127)+PACKAGE.encode('utf-16le').ljust(256,b'\0')+P(288,1,288+len(typ),1,0)
 return chunk(2,P(1),ss+chunk(0x200,head,typ+keys+spec+tc))

def length(b):return P(len(b))+b

def digest_sections(parts):
 ds=[]
 for part in parts:
  for i in range(0,len(part),1048576):
   b=part[i:i+1048576];ds.append(hashlib.sha256(b'\xa5'+P(len(b))+b).digest())
 return hashlib.sha256(b'\x5a'+P(len(ds))+b''.join(ds)).digest()

def signing_key():
 folder=R/'private-signing';folder.mkdir(exist_ok=True);kp=folder/'weiqi-private.pem';cp=folder/'weiqi-certificate.der'
 if kp.exists():return serialization.load_pem_private_key(kp.read_bytes(),None),x509.load_der_x509_certificate(cp.read_bytes())
 if os.environ.get('ALLOW_NEW_SIGNING_KEY')!='1':raise RuntimeError('Original signing key missing. Restore private-signing from your prior private developer backup for an in-place upgrade. Set ALLOW_NEW_SIGNING_KEY=1 only for a deliberately separate/new signing identity.')
 k=rsa.generate_private_key(public_exponent=65537,key_size=2048);name=x509.Name([x509.NameAttribute(NameOID.COMMON_NAME,'Weiqi Memory Personal Offline Build')])
 cert=x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(k.public_key()).serial_number(x509.random_serial_number()).not_valid_before(datetime.datetime(2026,11,12,tzinfo=datetime.timezone.utc)).not_valid_after(datetime.datetime(2056,11,12,tzinfo=datetime.timezone.utc)).sign(k,hashes.SHA256())
 kp.write_bytes(k.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.PKCS8,serialization.NoEncryption()));os.chmod(kp,0o600);cp.write_bytes(cert.public_bytes(serialization.Encoding.DER));return k,cert

def sign_v2(data,k,cert):
 eo=data.rfind(b'PK\x05\x06');cd=struct.unpack_from('<I',data,eo+16)[0];assert data[cd:cd+4]==b'PK\x01\x02'
 d=digest_sections([data[:cd],data[cd:eo],data[eo:]])
 pub=k.public_key().public_bytes(serialization.Encoding.DER,serialization.PublicFormat.SubjectPublicKeyInfo)
 sd=length(length(P(0x103)+length(d)))+length(length(cert.public_bytes(serialization.Encoding.DER)))+length(b'')
 sig=k.sign(sd,padding.PKCS1v15(),hashes.SHA256());signer=length(sd)+length(length(P(0x103)+length(sig)))+length(pub)
 v2=length(length(signer));pair=struct.pack('<Q',4+len(v2))+P(0x7109871a)+v2
 block=struct.pack('<Q',len(pair)+24)+pair+struct.pack('<Q',len(pair)+24)+b'APK Sig Block 42'
 end=bytearray(data[eo:]);struct.pack_into('<I',end,16,cd+len(block));return data[:cd]+block+data[cd:eo]+end

def verify_v2(b):
 eo=b.rfind(b'PK\x05\x06');cd=struct.unpack_from('<I',b,eo+16)[0];assert b[cd-16:cd]==b'APK Sig Block 42';size=struct.unpack_from('<Q',b,cd-24)[0];start=cd-size-8;assert struct.unpack_from('<Q',b,start)[0]==size
 plen=struct.unpack_from('<Q',b,start+8)[0];assert struct.unpack_from('<I',b,start+16)[0]==0x7109871a
 def rd(v,p=0):n=struct.unpack_from('<I',v,p)[0];return v[p+4:p+4+n],p+4+n
 seq,_=rd(b[start+20:start+16+plen]);signer,_=rd(seq);sd,p=rd(signer);sigs,p=rd(signer,p);pub,p=rd(signer,p);sig,_=rd(sigs);assert struct.unpack_from('<I',sig)[0]==0x103;sig,_=rd(sig,4);serialization.load_der_public_key(pub).verify(sig,sd,padding.PKCS1v15(),hashes.SHA256())
 ds,p=rd(sd);certs,p=rd(sd,p);dg,_=rd(ds);assert struct.unpack_from('<I',dg)[0]==0x103;dg,_=rd(dg,4);cert,_=rd(certs);cert=x509.load_der_x509_certificate(cert);assert cert.public_key().public_bytes(serialization.Encoding.DER,serialization.PublicFormat.SubjectPublicKeyInfo)==pub
 end=bytearray(b[eo:]);struct.pack_into('<I',end,16,start);assert digest_sections([b[:start],b[cd:eo],bytes(end)])==dg;return cert.fingerprint(hashes.SHA256()).hex()

def icon():
 f=R/'icon.png'
 if f.exists():return f.read_bytes()
 import cairosvg
 s='<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192"><rect width="192" height="192" rx="42" fill="#205c49"/><path d="M36 56H156M36 96H156M36 136H156M56 36V156M96 36V156M136 36V156" stroke="#65977b" stroke-width="2"/><circle cx="73" cy="73" r="34" fill="#102921"/><circle cx="119" cy="120" r="34" fill="#fffbee"/><path d="M152 38Q168 48 152 60" stroke="#fffbee" stroke-width="5" fill="none"/></svg>'
 b=cairosvg.svg2png(bytestring=s.encode());f.write_bytes(b);return b

def build():
 OUTPUT.parent.mkdir(parents=True,exist_ok=True)
 if not (R/'classes.dex').exists():raise RuntimeError('Compile src with javac and D8 first; see build_native.sh')
 for sound in ('stone','capture','correct','error','pass','undo','hint','mark','finish','toggle'):
  if not (R/'assets/sfx'/(sound+'.wav')).is_file():raise RuntimeError('Missing offline sound: '+sound)
 mb=manifest();rb=resources();(R/'AndroidManifest.bin').write_bytes(mb);(R/'resources.arsc').write_bytes(rb)
 files={'AndroidManifest.xml':mb,'classes.dex':(R/'classes.dex').read_bytes(),'resources.arsc':rb,'res/drawable/icon.png':icon()}
 for f in sorted((R/'assets').rglob('*')):
  if f.is_file() and f.name not in ['index-noaudio.html','index-v2.3-original.html']:files['assets/'+str(f.relative_to(R/'assets'))]=f.read_bytes()
 buf=io.BytesIO()
 with zipfile.ZipFile(buf,'w') as z:
  for name,data in files.items():
   info=zipfile.ZipInfo(name,(2026,11,13,12,0,0));info.compress_type=zipfile.ZIP_DEFLATED if name.startswith('assets/') and not name.endswith(('.mp3','.wav')) else zipfile.ZIP_STORED
   if info.compress_type==zipfile.ZIP_STORED:
    at=buf.tell()+30+len(name.encode());pad=(-at)%4
    if pad:info.extra=H(0xd935,pad)+b'\0'*pad
   z.writestr(info,data,compresslevel=9)
 k,c=signing_key();b=sign_v2(buf.getvalue(),k,c);fp=verify_v2(b);OUTPUT.write_bytes(b)
 info={'package':PACKAGE,'version':VERSION,'versionCode':VERSION_CODE,'minSdk':26,'targetSdk':34,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'certificateSha256':fp,'signature':'APK v2','requestedPermissions':[],'totalBuiltinLevels':548,'bundledGoGameGuruRecords':420,'voiceKeys':len(json.loads((R/'assets/voice-map.js').read_text().split('=',1)[1].strip().rstrip(';'))),'voiceModel':'matcha-icefall-zh-en','voiceSpeaker':'selected-audition-B (sid 0)','voiceSpeed':0.96,'wholeSentenceAudio':True,'orientation':'sensorLandscape','immersiveFullscreen':True,'tabletViewportLayout':True,'allPracticeControlsInRightSidebar':True,'boardHasNoToolbar':True,'runtimeNetworkRequired':False,'realAndroidTested':False,'offlineBattle':{'boards':[9,13,19],'difficulties':3,'engine':'local bounded tactical heuristic, not professional rank','undo':True,'resign':True,'automaticResults':True,'automaticDeadAnalysis':'pass-alive + bounded local capture, uncertain groups retained','uncertainResultsClearlyProvisional':True,'manualReviewAvailable':True,'recordsTabWithWinLoss':True,'resultHistoryLimit':100,'resumeWithdrawsResult':True,'komi':7.5,'recordsInNativeProgress':True},'clickLevelTitleToSpeak':True,'startupFix':{'smallHtmlBytes':len(files['assets/index.html']),'audioFiles':len(list((R/'assets/audio').glob('*.mp3'))),'audioReadOnDemand':True,'audioStoredUncompressed':True,'javascriptTarget':'ES5','nativeCompiler':'Native Java rebuilt with javac --release 8 and Android D8','sameWebOriginAsPrevious':True,'nativeLoadingAndRecoveryPage':True,'nativeMediaPlayer':True}}
 (R/'build-info.json').write_text(json.dumps(info,ensure_ascii=False,indent=2));print(json.dumps(info,ensure_ascii=False,indent=2))
if __name__=='__main__':build()
