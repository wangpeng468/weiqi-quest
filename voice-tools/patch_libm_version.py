"""Development host compatibility only: retarget sqrtf/log10f to their standard
GLIBC_2.2.5 symbol versions. Never included in the Android application.
"""
from pathlib import Path
import struct, shutil
p=Path(__file__).parent/'tts/tts-matcha-icefall-zh-en/lib/libsherpa-onnx-c-api.so'
b=bytearray(p.read_bytes()); assert b[:6]==b'\x7fELF\x02\x01'
shoff=struct.unpack_from('<Q',b,40)[0];ents,n,idx=struct.unpack_from('<HHH',b,58)
sects=[struct.unpack_from('<IIQQQQIIQQ',b,shoff+i*ents) for i in range(n)]
stringsec=sects[idx];names=bytes(b[stringsec[4]:stringsec[4]+stringsec[5]])
def name(i):return names[i:names.index(0,i)].decode()
s={name(x[0]):x for x in sects};strsec=s['.dynstr'];ss=bytes(b[strsec[4]:strsec[4]+strsec[5]])
def string(i):return ss[i:ss.index(0,i)].decode()
v=s['.gnu.version_r'];pos=v[4];pairs=[]
while True:
 ver,cnt,fn,aux,nxt=struct.unpack_from('<HHIII',b,pos);off=pos+aux
 for _ in range(cnt):
  h,flags,other,ni,an=struct.unpack_from('<IHHII',b,off);pairs.append((off,string(fn),string(ni),h,ni))
  off+=an
 if not nxt:break
 pos+=nxt
old=[x for x in pairs if x[1]=='libm.so.6' and x[2]=='GLIBC_2.43']
target=next(x for x in pairs if x[1]=='libm.so.6' and x[2]=='GLIBC_2.2.5')
if old:
 shutil.copy2(p,p.with_suffix('.so.unpatched'))
 for off,*_ in old:
  struct.pack_into('<I',b,off,target[3]);struct.pack_into('<I',b,off+8,target[4])
 p.write_bytes(b)
 print('Retargeted libm compatibility requirements:',len(old))
else: print('Already compatible')
