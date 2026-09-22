// Original, short acoustic-style UI feedback. Quieter than construction sounds.
export function synthUI(sampleRate=24000){
 const data=new Float32Array(Math.round(.105*sampleRate)),tau=2*Math.PI;
 for(let i=0;i<data.length;i++){
  const t=i/sampleRate,attack=1-Math.exp(-t*700),tail=Math.max(0,1-t/.105)**2;
  const phase=tau*(480*t+2*(1-Math.exp(-t*50)));
  data[i]=.24*attack*tail*Math.exp(-t*23)*(Math.sin(phase)+.16*Math.sin(phase*2.35)*Math.exp(-t*70));
 }
 data[0]=0;data[data.length-1]=0;return{sampleRate,channels:[data]};
}
