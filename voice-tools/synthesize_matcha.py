"""Pre-generate all application phrases with the selected audition B voice.
Only generated MP3 files are embedded into the APK, never this engine.
"""
from pathlib import Path
import os, sys, json, time, hashlib
from cffi import FFI
import numpy as np
import soundfile as sf
R=Path(__file__).resolve().parent
T=Path(os.environ.get('MATCHA_BUNDLE',str(R/'tts/tts-matcha-icefall-zh-en')))
A=T/'data/flutter_assets/assets';M=A/'matcha-icefall-zh-en'
f=FFI();f.cdef((R/'tts-c-api.cdef').read_text())
lib=f.dlopen(str(T/'lib/libsherpa-onnx-c-api.so'))
keep=[]
def st(s):
 b=f.new('char[]',str(s).encode());keep.append(b);return b
cfg=f.new('Config *');cfg.model.num_threads=1;cfg.model.provider=st('cpu');cfg.max_num_sentences=1;cfg.silence_scale=1.0
for k,filename in [('acoustic_model','model-steps-3.onnx'),('lexicon','lexicon.txt'),('tokens','tokens.txt'),('data_dir','espeak-ng-data')]:
 setattr(cfg.model.matcha,k,st(M/filename))
cfg.model.matcha.vocoder=st(A/'vocos-16khz-univ.onnx');cfg.model.matcha.noise_scale=0.667;cfg.model.matcha.length_scale=1.0
cfg.rule_fsts=st(','.join(str(M/n) for n in ['phone-zh.fst','date-zh.fst','number-zh.fst']))
t=time.time();engine=lib.SherpaOnnxCreateOfflineTts(cfg)
if engine==f.NULL:raise RuntimeError('Model initialization failed')
print('ready',round(time.time()-t,3),'speakers',lib.SherpaOnnxOfflineTtsNumSpeakers(engine),flush=True)
def synth(text,path):
 a=lib.SherpaOnnxOfflineTtsGenerate(engine,text.encode('utf-8'),0,0.96)
 if a==f.NULL:raise RuntimeError('No generated audio: '+text)
 sr=a.sample_rate;x=np.frombuffer(f.buffer(a.samples,a.n*4),dtype=np.float32).copy();lib.SherpaOnnxDestroyOfflineTtsGeneratedAudio(a)
 assert sr==16000 and len(x)>1600 and np.isfinite(x).all(),text
 peak=float(np.max(np.abs(x)));assert peak>.003,text
 # Preserve float output (occasionally >1); normalize before encoding to avoid clipping.
 sf.write(path,x,sr,subtype='FLOAT')
 return {'seconds':round(len(x)/sr,3),'peak':peak,'sourceRate':sr}
try:
 if len(sys.argv)>1 and sys.argv[1]=='--sample':
  print(synth('选一关，开始练习吧。',R/'matcha_check.wav'),flush=True)
 else:
  rows=json.loads((R/'WeiqiNaturalVoice/voice-manifest.json').read_text());rows=list({r['id']:r for r in rows}.values())
  worker=int(sys.argv[1]) if len(sys.argv)>1 else 0;workers=int(sys.argv[2]) if len(sys.argv)>2 else 1
  out=R/'generated_audio';out.mkdir(exist_ok=True);stats=[]
  for i,r in enumerate(rows):
   if i%workers!=worker:continue
   path=out/(r['id']+'.wav')
   if path.exists():continue
   t0=time.time();v=synth(r['text'],path);v.update({'id':r['id'],'text':r['text'],'model':'matcha-icefall-zh-en','sid':0,'speed':.96});stats.append(v)
   print(i+1,'/',len(rows),r['text'],v['seconds'],'sec',round(time.time()-t0,2),'elapsed',flush=True)
  (R/f'generated-{worker}.json').write_text(json.dumps(stats,ensure_ascii=False,indent=2))
finally:lib.SherpaOnnxDestroyOfflineTts(engine)
