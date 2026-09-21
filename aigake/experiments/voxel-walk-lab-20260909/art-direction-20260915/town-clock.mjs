// Local civil time; this is an art direction clock, not a solar ephemeris.
export const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export const localHour=date=>date.getHours()+date.getMinutes()/60+date.getSeconds()/3600;
export function townClock(hour){
 const h=((Number(hour)%24)+24)%24;
 const daylight=smooth(5,7.5,h)*(1-smooth(16.5,19.5,h));
 const sunset=smooth(15.5,17.8,h)*(1-smooth(18.1,19,h));
 const nightSky=1-smooth(5,6.5,h)+smooth(18.25,19.25,h);
 const dawn=smooth(4.8,6,h)*(1-smooth(6,8,h));
 const night=1-daylight,lamps=Math.max(1-smooth(5.5,7,h),smooth(17,19,h));
 const rooms=.34+.40*smooth(5.5,7,h)*(1-smooth(8,10,h))+.60*smooth(16,19,h)-.60*smooth(21,24,h);
 return{hour:h,daylight,sunset,dawn,night,nightSky,lamps,rooms,residentsOutside:h>=7&&h<19,
  label:h<5?'深夜':h<8?'朝':h<16.5?'昼':h<19?'夕方':h<22?'夜':'深夜'};
}
export function smokeActivity(kind,region,hour){
 const h=((hour%24)+24)%24,pulse=(a,b)=>smooth(a,a+.4,h)*(1-smooth(b-.4,b,h));
 if(['bakery','bakery-cafe'].includes(kind))return pulse(4.5,15);
 if(kind==='sauna')return pulse(15,23);
 if(region==='snow'||region==='alpine')return .35+.5*Math.max(pulse(6,10),pulse(16,23));
 return .65*Math.max(pulse(6.5,9.5),pulse(16.5,20.5));
}
// Each household has one short trip at each edge of its drying period. Missing
// an event never queues a chore or a reward; reopening shows the current scene.
export function laundryState(hour,offset=0,tripSeconds=12){
 const h=((hour%24)+24)%24,start=8+offset,end=16.7+offset,walk=tripSeconds/3600,work=18/3600;
 for(const [at,collect]of [[start,false],[end,true]]){
  const t=(h-at)*3600;
  if(t>=0&&t<tripSeconds*2+18){
   const phase=t<tripSeconds?'out':t<tripSeconds+18?'work':'home';
   const amount=Math.max(0,Math.min(1,(t-tripSeconds)/18));
   return{phase,collect,travel:phase==='out'?t/tripSeconds:phase==='home'?1-(t-tripSeconds-18)/tripSeconds:1,cloth:collect?1-amount:amount};
  }
 }
 return{phase:'idle',collect:false,travel:0,cloth:h>=start+walk+work&&h<end?1:0};
}
export function laundryWork(progress,collect){
 const s=collect?1:-1,keys=[[0,0],[2,.34*s],[4,.34*s],[8,0],[10,0],[14,-.34*s],[16,-.34*s],[18,0]],time=Math.max(0,Math.min(18,progress*18));
 let distance=0;
 for(let i=1;i<keys.length;i++){
  const [a,x0]=keys[i-1],[b,x1]=keys[i];
  if(time<=b){const t=smooth(a,b,time);return{x:x0+(x1-x0)*t,moving:x1!==x0,yaw:x1>x0?Math.PI/2:-Math.PI/2,distance:distance+Math.abs(x1-x0)*t};}
  distance+=Math.abs(x1-x0);
 }
}
