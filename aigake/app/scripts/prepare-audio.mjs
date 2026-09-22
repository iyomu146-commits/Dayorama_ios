// Authoring utility; not needed by CI. Original user WAVs are never overwritten.
// node scripts/prepare-audio.mjs /path/to/ffmpeg
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {synthUI} from '../../walk/sound-synthesis.mjs';
const ffmpeg=process.argv[2];if(!ffmpeg)throw Error('Pass the FFmpeg executable path');
const source=fileURLToPath(new URL('../../walk/audio/',import.meta.url)),out=path.join(source,'runtime'),work=fileURLToPath(new URL('../dist/audio-work/',import.meta.url));
mkdirSync(out,{recursive:true});mkdirSync(work,{recursive:true});
function readWave(file){
 const b=readFileSync(file);let fmt,data;
 if(b.toString('ascii',0,4)!=='RIFF'||b.toString('ascii',8,12)!=='WAVE')throw Error('Expected WAV');
 for(let p=12;p+8<=b.length;){const id=b.toString('ascii',p,p+4),n=b.readUInt32LE(p+4),s=p+8;if(id==='fmt ')fmt={code:b.readUInt16LE(s),channels:b.readUInt16LE(s+2),rate:b.readUInt32LE(s+4),bits:b.readUInt16LE(s+14)};if(id==='data')data=b.subarray(s,s+n);p=s+n+n%2;}
 if(!fmt||fmt.code!==1||fmt.bits!==16||!data)throw Error('Expected PCM16 source');
 const samples=new Float32Array(data.length/2);for(let i=0;i<samples.length;i++)samples[i]=data.readInt16LE(i*2)/32768;return{...fmt,samples};
}
function wave(file,{samples,rate,channels}){
 const b=Buffer.alloc(44+samples.length*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(channels,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*channels*2,28);b.writeUInt16LE(channels*2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(samples.length*2,40);
 for(let i=0;i<samples.length;i++)b.writeInt16LE(Math.round(Math.max(-1,Math.min(.99996,samples[i]))*32768),44+i*2);writeFileSync(file,b);
}
function activeRange(a){
 const n=Math.round(a.rate*.01)*a.channels,levels=[];let max=0;
 for(let i=0;i<a.samples.length;i+=n){let sum=0;const end=Math.min(i+n,a.samples.length);for(let j=i;j<end;j++)sum+=a.samples[j]**2;const rms=Math.sqrt(sum/(end-i));levels.push(rms);max=Math.max(max,rms);}
 const threshold=Math.max(.0005,max*.015),first=levels.findIndex(v=>v>threshold);let last=levels.length-1;while(last>first&&levels[last]<=threshold)last--;return{start:Math.max(0,first*.01),end:(last+1)*.01};
}
const reports=[];
for(const [input,output,music,gain,clipSeconds]of [['bgm2.wav','bgm',true,.62,44],['bgm_night.wav','bgm-night',true,.9],['place.wav','place',false,.8],['complete.wav','complete',false,1]]){
 const a=readWave(path.join(source,input)),originalSeconds=a.samples.length/a.channels/a.rate,range=activeRange(a);
 if(clipSeconds&&originalSeconds<clipSeconds)throw Error(input+' is shorter than the requested excerpt');
 const end=clipSeconds?Math.round(clipSeconds*a.rate):Math.min(a.samples.length/a.channels,Math.ceil((range.end+(music?.25:input==='place.wav'?.045:.22))*a.rate));
 a.samples=a.samples.slice(0,end*a.channels);
 let loopDetails={};
 if(music&&clipSeconds){
  // BGM2 is approximately 85 BPM. Matching its onset/chroma sequences and
  // waveform within the 0–44s excerpt puts the repeat at 42.3555625s.
  // A fixed 2s overlap produced a 42s period, about half a beat too early.
  const frames=a.samples.length/a.channels,period=Math.round(42.3555625*a.rate),seam=frames-period,head=a.samples.slice(0,seam*a.channels);
  if(seam<=0||seam>=frames/2)throw Error('Invalid BGM2 loop alignment');
  let dot=0,tailPower=0,headPower=0;
  for(let i=0;i<head.length;i++){const x=a.samples[period*a.channels+i],y=head[i];dot+=x*y;tailPower+=x*x;headPower+=y*y;}
  const correlation=Math.max(0,Math.min(.95,dot/Math.sqrt(tailPower*headPower)||0));
  for(let f=0;f<seam;f++){
   const t=f/(seam-1),mix=t*t*(3-2*t),norm=Math.sqrt((1-mix)**2+mix**2+2*correlation*mix*(1-mix));
   const tailGain=(1-mix)/norm,headGain=mix/norm;
   for(let c=0;c<a.channels;c++){const i=(frames-seam+f)*a.channels+c;a.samples[i]=a.samples[i]*tailGain+head[f*a.channels+c]*headGain;}
  }
  a.samples=a.samples.slice(seam*a.channels);
  loopDetails={sourceStart:0,sourceEnd:clipSeconds,loopCurve:'correlation-normalized',openingConsumedByOverlap:seam/a.rate,matchedPeriod:period/a.rate,overlapCorrelation:Number(correlation.toFixed(4))};
 }else if(music){
  const frames=a.samples.length/a.channels,seam=Math.round(1.2*a.rate),head=a.samples.slice(0,seam*a.channels);
  for(let f=0;f<seam;f++){const t=f/(seam-1),mix=t*t*(3-2*t);for(let c=0;c<a.channels;c++){const i=(frames-seam+f)*a.channels+c;a.samples[i]=a.samples[i]*(1-mix)+head[f*a.channels+c]*mix;}}
  a.samples=a.samples.slice(seam*a.channels);
 }else{
  const start=Math.max(0,Math.floor((range.start-.003)*a.rate));a.samples=a.samples.slice(start*a.channels);const frames=a.samples.length/a.channels;
  for(let f=0;f<frames;f++){const edge=Math.min(1,f/(a.rate*.002),(frames-1-f)/(a.rate*.015));for(let c=0;c<a.channels;c++)a.samples[f*a.channels+c]*=Math.max(0,edge);}
 }
 for(let i=0;i<a.samples.length;i++)a.samples[i]*=gain;
 const target=music?path.join(work,output+'.wav'):path.join(out,output+'.wav');wave(target,a);
 if(music){const run=spawnSync(ffmpeg,['-hide_banner','-loglevel','error','-y','-i',target,'-ar','44100','-c:a','aac','-b:a','160k','-movflags','+faststart',...(clipSeconds?['-movie_timescale','44100']:[]),path.join(out,output+'.m4a')],{encoding:'utf8',windowsHide:true});if(run.status!==0)throw Error(run.stderr||'FFmpeg failed');}
 reports.push({source:input,output:output+(music?'.m4a':'.wav'),originalSeconds,seconds:a.samples.length/a.channels/a.rate,gain,loopCrossfade:music?(clipSeconds?loopDetails.openingConsumedByOverlap:1.2):0,...loopDetails});
}
const ui=synthUI();if(!existsSync(path.join(source,'ui.wav')))wave(path.join(source,'ui.wav'),{samples:ui.channels[0],rate:ui.sampleRate,channels:1});
writeFileSync(path.join(out,'preparation.json'),JSON.stringify(reports,null,2)+'\n');console.log(JSON.stringify(reports,null,2));
