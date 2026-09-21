// Small, offline sound palette. No recordings, downloads or generated API assets.
const TAU=Math.PI*2;
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
function random(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296*2-1;};}
function finish(data,peak,loop=false){
 let mean=0;for(const v of data)mean+=v;mean/=data.length;
 let maximum=0;
 for(let i=0;i<data.length;i++){
  const edge=loop?1:smooth(i/160)*smooth((data.length-1-i)/400);
  data[i]=(data[i]-mean)*edge;maximum=Math.max(maximum,Math.abs(data[i]));
 }
 const gain=peak/Math.max(maximum,1e-9);for(let i=0;i<data.length;i++)data[i]*=gain;
 return data;
}
function note(out,sr,start,frequency,length,gain){
 const offset=Math.round(start*sr),n=Math.min(Math.round(length*sr),out.length-offset);
 for(let i=0;i<n;i++){
  const t=i/sr,envelope=smooth(t/.012)*Math.exp(-t*3.4)*smooth((length-t)/.22);
  const tone=Math.sin(TAU*frequency*t)+.22*Math.sin(TAU*frequency*2*t)*Math.exp(-t*5)+.08*Math.sin(TAU*frequency*3*t)*Math.exp(-t*9);
  out[offset+i]+=gain*envelope*tone;
 }
}
export function synthEffect(kind,variant=0,sampleRate=24000){
 const seconds=kind==='complete'?2.65:kind==='bird'?.9:kind==='insect'?1.1:.19;
 const data=new Float32Array(Math.ceil(seconds*sampleRate)),rnd=random(1807+variant*97);let noise=0;
 if(kind==='complete'){
  // A soft ascending pentatonic phrase, landing on an open C6/9 voicing.
  [[0,523.25,.20],[.22,659.25,.18],[.44,783.99,.16],[.76,1046.5,.13],[.76,261.63,.12],[.76,392,.07],[.76,440,.055]].forEach(([t,f,g])=>note(data,sampleRate,t,f,seconds-t,g));
 }else for(let i=0;i<data.length;i++){
  const t=i/sampleRate;
  if(kind==='bird'){
   const beat=t% .28,env=Math.sin(Math.PI*Math.min(1,beat/.14))**2*(beat<.14?1:0)*smooth((seconds-t)/.18);
   data[i]=.4*env*Math.sin(TAU*(1800*t+210/.28*(.28/TAU)*Math.sin(TAU*t/.28)));
  }else if(kind==='insect'){
   const envelope=(.5+.5*Math.sin(TAU*25*t))**4*smooth(t/.2)*smooth((seconds-t)/.35);
   data[i]=envelope*(Math.sin(TAU*2800*t)+.15*Math.sin(TAU*3400*t));
  }else{
   noise+=.2*(rnd()-noise);const f=440*2**(([0,2,5,7,9][variant%5])/12);
   data[i]=smooth(t/.0025)*(Math.sin(TAU*f*t)*Math.exp(-t*36)+.3*Math.sin(TAU*f*2.67*t)*Math.exp(-t*70)+.28*noise*Math.exp(-t*110));
  }
 }
 return{sampleRate,channels:[finish(data,kind==='complete'?.48:kind==='bird'?.22:kind==='insect'?.12:.32)]};
}

export function synthAmbience(kind,sampleRate=24000){
 const seconds=12,n=seconds*sampleRate;
 const channels=[0,1].map(channel=>{
  const data=new Float32Array(n),rnd=random(8301+channel*401+kind.length*117);let low=0,mid=0;
  for(let i=0;i<n;i++){
   const t=i/sampleRate,white=rnd();low+=.009*(white-low);mid+=.15*(white-mid);
   const swell=.68+.22*Math.sin(TAU*t/seconds+channel*.3)+.1*Math.sin(TAU*t*3/seconds);
   if(kind==='stream')data[i]=mid*.45+low*.6+Math.sin(TAU*(620*t+.7*Math.sin(TAU*t/seconds)))*.005*(.5+.5*Math.sin(TAU*t*7/seconds));
   else if(kind==='sea')data[i]=(mid*.28+low)*(.22+.78*(.5+.5*Math.sin(TAU*t*2/seconds))**2);
   else if(kind==='city')data[i]=(low*.8+mid*.018)*swell+Math.sin(TAU*58*t)*.007*swell;
   else data[i]=(low+mid*.028)*swell;
  }
  // Join the end to an extension of the beginning before normalizing. A seam
  // crossfade, rather than a volume dip, keeps the bed continuous on each loop.
  const seam=Math.round(.2*sampleRate),head=data.slice(0,seam);
  for(let i=0;i<seam;i++){const a=smooth(i/(seam-1));data[n-seam+i]=data[n-seam+i]*(1-a)+head[i]*a;}
  const loop=data.slice(seam);return finish(loop,kind==='stream'?.42:.48,true);
 });
 return{sampleRate,channels};
}

export function ambientScene(region='grove',hour=12){
 const night=hour>=19||hour<7;
 const water=['harbor','tropical'].includes(region)?'sea':['grove','canal','satoyama','oasis'].includes(region)?'stream':null;
 return{bed:region==='tokyo'?'city':'wind',water,waterGain:region==='grove'?.24:region==='oasis'?.3:.58,
  wildlife:region==='tokyo'||region==='snow'?null:night?['grove','meadow','satoyama','tropical','stars'].includes(region)?'insect':null:'bird',
  level:night?.65:1};
}
