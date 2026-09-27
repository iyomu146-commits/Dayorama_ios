"""Original, temporary comparison cues. Identical PCM WAVs for both engines."""
import math,random,wave,struct,hashlib,json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
sr=24000
random.seed(740)
def write(name,samples):
    for folder in (root.parent/'voxeltown-three-bench/public/story',root.parent/'voxeltown-godot-bench/story'):
        with wave.open(str(folder/name),'wb') as w:
            w.setnchannels(1);w.setsampwidth(2);w.setframerate(sr)
            w.writeframes(b''.join(struct.pack('<h',round(max(-.92,min(.92,s))*32767)) for s in samples))
# A rounded wooden pop: very short pitch glide and a softened transient.
write('place.wav',[(.27*math.sin(2*math.pi*(430*t-420*t*t))+.055*math.sin(2*math.pi*860*t))*math.exp(-34*t)*min(1,t/.004) for t in (i/sr for i in range(int(sr*.17)))])
# Quiet felt-like major-sixth arrival; original notes, no borrowed melody.
notes=[(0,523.25,.13),(.12,659.25,.11),(.24,783.99,.10),(.38,1046.5,.08),(.38,440,.045)]
s=[]
for i in range(int(sr*2.4)):
 t=i/sr;v=0
 for start,f,amp in notes:
  a=t-start
  if a>=0:v+=amp*(math.sin(2*math.pi*f*a)+.17*math.sin(2*math.pi*f*2*a))*min(1,a/.018)*math.exp(-2.9*a)
 s.append(v*min(1,(2.4-t)/.15))
write('complete.wav',s)
write('step.wav',[.038*(random.random()*2-1)*math.exp(-55*t)*min(1,t/.007) for t in (i/sr for i in range(int(sr*.11)))])
report={}
for name in ['place.wav','complete.wav','step.wav']:
 p=root.parent/'voxeltown-three-bench/public/story'/name
 report[name]={'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size,'provenance':'original deterministic synthesis for comparison; replaceable production cue'}
(root/'story/audio-manifest.json').write_text(json.dumps(report,indent=2))
print(report)
