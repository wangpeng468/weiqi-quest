"""Normalize the selected B voice; embed all finished sentences, no runtime TTS."""
from pathlib import Path
import json, subprocess, concurrent.futures, hashlib, re, base64, time
import numpy as np
import soundfile as sf
R=Path(__file__).resolve().parent;APP=R/'WeiqiNaturalVoice'
rows=json.loads((APP/'voice-manifest.json').read_text());unique=list({r['id']:r for r in rows}.values())
OUT=R/'mp3';OUT.mkdir(exist_ok=True)
def run(row):
 src=R/'generated_audio'/(row['id']+'.wav');dst=OUT/(row['id']+'.mp3')
 x,sr=sf.read(src,dtype='float32');assert sr==16000 and x.ndim==1 and len(x)>1600 and np.isfinite(x).all()
 # FLOAT WAV retains >1 source peaks. Normalize BEFORE any integer conversion.
 subprocess.run(['ffmpeg','-v','error','-nostdin','-y','-i',str(src),'-af','loudnorm=I=-18:TP=-2:LRA=11','-ac','1','-ar','24000','-c:a','libmp3lame','-b:a','128k','-map_metadata','-1','-threads','1',str(dst)],check=True)
 raw=subprocess.check_output(['ffmpeg','-v','error','-nostdin','-i',str(dst),'-f','f32le','-acodec','pcm_f32le','-ac','1','-ar','24000','-threads','1','-'])
 y=np.frombuffer(raw,dtype='<f4');peak=float(np.max(np.abs(y)));rms=float(np.sqrt(np.mean(y*y)))
 assert np.isfinite(y).all() and .01<peak<1.0 and rms>.005,(row,peak,rms)
 assert abs(len(y)/24000-len(x)/sr)<.15
 return {'id':row['id'],'text':row['text'],'sourceSeconds':round(len(x)/sr,3),'seconds':round(len(y)/24000,3),'peak':round(peak,5),'rmsDbFS':round(20*np.log10(rms),2),'bytes':dst.stat().st_size,'sha256':hashlib.sha256(dst.read_bytes()).hexdigest()}
stats=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 for v in pool.map(run,unique):
  stats.append(v)
  if len(stats)%50==0:print('Encoded and decoded',len(stats),'/',len(unique),flush=True)
clips={r['key']:base64.b64encode((OUT/(r['id']+'.mp3')).read_bytes()).decode('ascii') for r in rows}
p=APP/'assets/index.html';s=p.read_text();s,n=re.subn(r'(<script id="voiceClips" type="application/json">).*?(</script>)',lambda m:m[1]+json.dumps(clips,ensure_ascii=False,separators=(',',':'))+m[2],s,flags=re.S);assert n==1;p.write_text(s)
report={'model':'matcha-icefall-zh-en','selectedAudition':'B','speakerId':0,'speed':.96,'narrationKeys':len(rows),'uniqueWholeSentenceRecordings':len(stats),'nativeSampleRate':16000,'encodedSampleRate':24000,'mp3Bitrate':128000,'loudnessTargetLUFS':-18,'sourceClippingPreventedWithFloatWav':True,'allDecodedAndNumericallyValidated':True,'humanListeningReview':False,'realAndroidTested':False,'entries':sorted(stats,key=lambda x:x['id'])}
(APP/'audio-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print('EMBEDDED',len(clips),'keys',sum(v['bytes'] for v in stats),'unique MP3 bytes',flush=True)
# Preview consists of the actual finished, embedded clips, not separately generated audio.
keys=['选择关卡','遮住答案开始背谱','看一手提示','落子再想想','本关完成鼓励','下一关']
lookup={r['key']:r for r in rows};pieces=[]
for k in keys:
 dst=OUT/(lookup[k]['id']+'.mp3')
 raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(dst),'-f','f32le','-acodec','pcm_f32le','-ar','24000','-ac','1','-'])
 pieces.extend([np.frombuffer(raw,dtype='<f4'),np.zeros(round(24000*.55),dtype=np.float32)])
sf.write(R/'preview.wav',np.concatenate(pieces),24000,subtype='FLOAT')
subprocess.run(['ffmpeg','-v','error','-y','-i',str(R/'preview.wav'),'-ar','24000','-ac','1','-b:a','128k','-map_metadata','-1','/mnt/data/围棋背谱闯关_B音色正式版试听.mp3'],check=True)
(APP/'voice-preview-text.txt').write_text('\n'.join(lookup[k]['text'] for k in keys))
